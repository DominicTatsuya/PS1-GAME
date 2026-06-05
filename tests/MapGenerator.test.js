/**
 * MapGenerator.test.js
 * ─────────────────────
 * src/systems/MapGenerator.js の純粋関数群の単体テスト。
 *
 * テスト対象（公開 API）:
 *   - generateMaze: 同 seed の再現性 / 完全迷路の連結性 / 期待されるグリッドサイズ
 *   - generateDungeon: 同 seed の再現性 / アイテム数の妥当性 / start と exit の位置関係
 *   - gridToWorld / worldToGrid: 往復変換の一貫性
 *   - bfsFarthest: 到達可能セルの中で最遠を返すこと
 *   - checkGridCollision: 通路セル中心 / 壁セル / 閉じドアでの判定挙動
 *
 * 注意:
 *   config.js の MAZE / ITEMS などは難易度切替で書き換えられる mutable オブジェクトなので、
 *   テストを実行する前に applyDifficulty("normal") で baseline に戻している。
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  generateMaze,
  generateDungeon,
  gridToWorld,
  worldToGrid,
  bfsFarthest,
  bfsShortestPath,
  checkGridCollision,
  findDeadEnds,
  findJunctions,
} from "../src/systems/MapGenerator.js";
import { MAZE, ITEMS, applyDifficulty } from "../src/data/config.js";

beforeAll(() => {
  // 他テストで applyDifficulty が呼ばれた残留を消すため、明示的に normal に戻す
  applyDifficulty("normal");
});

// ────────────────────────────────────────────
// generateMaze
// ────────────────────────────────────────────
describe("generateMaze", () => {
  it("同じ seed なら同じグリッドを返す（再現性）", () => {
    const a = generateMaze(10, 10, 12345);
    const b = generateMaze(10, 10, 12345);
    expect(a.gridW).toBe(b.gridW);
    expect(a.gridH).toBe(b.gridH);
    expect(a.grid).toEqual(b.grid);
  });

  it("異なる seed なら別のグリッドになる（衝突確率は十分低い）", () => {
    const a = generateMaze(10, 10, 1);
    const b = generateMaze(10, 10, 2);
    // 全 21x21 セルが完全一致する確率は無視できるほど低い
    expect(a.grid).not.toEqual(b.grid);
  });

  it("グリッドサイズは (mazeW*2+1) x (mazeH*2+1)", () => {
    const m = generateMaze(7, 5, 42);
    expect(m.gridW).toBe(7 * 2 + 1);
    expect(m.gridH).toBe(5 * 2 + 1);
    expect(m.grid.length).toBe(m.gridH);
    expect(m.grid[0].length).toBe(m.gridW);
  });

  it("セル位置（奇数座標）は全て通路（0）", () => {
    const { grid, mazeW, mazeH } = generateMaze(10, 10, 99);
    for (let y = 0; y < mazeH; y++) {
      for (let x = 0; x < mazeW; x++) {
        expect(grid[y * 2 + 1][x * 2 + 1]).toBe(0);
      }
    }
  });

  it("完全迷路として連結している（任意セルに(1,1)からBFSで到達可能）", () => {
    const { grid, gridW, gridH } = generateMaze(10, 10, 777);
    // (1,1) から到達可能な通路セル数を数え、グリッド全体の通路セル数と比較する
    const visited = new Set();
    const queue = [{ x: 1, y: 1 }];
    visited.add("1,1");
    while (queue.length > 0) {
      const { x, y } = queue.shift();
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = x + dx;
        const ny = y + dy;
        const k = `${nx},${ny}`;
        if (
          nx >= 0 && nx < gridW &&
          ny >= 0 && ny < gridH &&
          grid[ny][nx] === 0 &&
          !visited.has(k)
        ) {
          visited.add(k);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    // グリッド全体の通路セル数を数える
    let totalOpen = 0;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (grid[y][x] === 0) totalOpen++;
      }
    }
    expect(visited.size).toBe(totalOpen);
  });
});

// ────────────────────────────────────────────
// gridToWorld / worldToGrid
// ────────────────────────────────────────────
describe("gridToWorld / worldToGrid", () => {
  it("セル中心への変換は worldToGrid で元のグリッド座標に戻る", () => {
    const gridW = 21, gridH = 21, cellSize = 2.0;
    for (const [gx, gy] of [[1, 1], [5, 7], [10, 10], [20, 0]]) {
      const w = gridToWorld(gx, gy, gridW, gridH, cellSize);
      const back = worldToGrid(w.x, w.z, gridW, gridH, cellSize);
      expect(back).toEqual({ gx, gy });
    }
  });

  it("グリッド中心セルの中心はワールド原点と一致する", () => {
    // 21x21 グリッドでは (10, 10) が真の中央セル。その中心はワールド原点 (0, 0)。
    // 計算: x = 10 * 2.0 - (21 * 2.0)/2 + 2.0/2 = 20 - 21 + 1 = 0
    const gridW = 21, gridH = 21, cellSize = 2.0;
    const w = gridToWorld(10, 10, gridW, gridH, cellSize);
    expect(w.x).toBeCloseTo(0, 5);
    expect(w.z).toBeCloseTo(0, 5);
  });
});

// ────────────────────────────────────────────
// bfsFarthest
// ────────────────────────────────────────────
describe("bfsFarthest", () => {
  it("自分自身からの距離はゼロより大きい（迷路に通路がある限り）", () => {
    const { grid } = generateMaze(10, 10, 5);
    const far = bfsFarthest(grid, 1, 1);
    expect(far.dist).toBeGreaterThan(0);
  });

  it("返されたセルは通路（壁ではない）", () => {
    const { grid } = generateMaze(10, 10, 5);
    const far = bfsFarthest(grid, 1, 1);
    expect(grid[far.y][far.x]).toBe(0);
  });
});

// ────────────────────────────────────────────
// bfsShortestPath
// ────────────────────────────────────────────
describe("bfsShortestPath", () => {
  it("始点と終点が同一なら長さ1の経路を返す", () => {
    const { grid } = generateMaze(10, 10, 5);
    const path = bfsShortestPath(grid, { gx: 1, gy: 1 }, { gx: 1, gy: 1 });
    expect(path).toEqual([{ gx: 1, gy: 1 }]);
  });

  it("経路の両端は指定された始点と終点に一致する", () => {
    const { grid } = generateMaze(10, 10, 5);
    const start = { gx: 1, gy: 1 };
    const farthest = bfsFarthest(grid, 1, 1);
    const goal = { gx: farthest.x, gy: farthest.y };
    const path = bfsShortestPath(grid, start, goal);
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual(start);
    expect(path[path.length - 1]).toEqual(goal);
  });
});

// ────────────────────────────────────────────
// findDeadEnds / findJunctions
// ────────────────────────────────────────────
describe("findDeadEnds / findJunctions", () => {
  it("完全迷路には行き止まりが少なくとも1つ存在する", () => {
    const { grid } = generateMaze(10, 10, 5);
    const deadEnds = findDeadEnds(grid);
    expect(deadEnds.length).toBeGreaterThan(0);
  });

  it("返されるセルはすべて通路セル（奇数座標かつ grid[y][x]===0）", () => {
    const { grid } = generateMaze(10, 10, 5);
    for (const cell of findDeadEnds(grid)) {
      expect(cell.gx % 2).toBe(1);
      expect(cell.gy % 2).toBe(1);
      expect(grid[cell.gy][cell.gx]).toBe(0);
    }
    for (const cell of findJunctions(grid)) {
      expect(cell.gx % 2).toBe(1);
      expect(cell.gy % 2).toBe(1);
      expect(grid[cell.gy][cell.gx]).toBe(0);
    }
  });
});

// ────────────────────────────────────────────
// checkGridCollision
// ────────────────────────────────────────────
describe("checkGridCollision", () => {
  it("セル中心は壁と衝突しない", () => {
    const { grid, gridW, gridH } = generateMaze(10, 10, 5);
    const cellSize = 2.0;
    // (1, 1) はスタート地点で必ず通路
    const center = gridToWorld(1, 1, gridW, gridH, cellSize);
    expect(checkGridCollision({ x: center.x, z: center.z }, grid, gridW, gridH, cellSize)).toBe(false);
  });

  it("壁セルの中心は衝突する", () => {
    const { grid, gridW, gridH } = generateMaze(10, 10, 5);
    const cellSize = 2.0;
    // (0, 0) は外周なので必ず壁
    expect(grid[0][0]).toBe(1);
    const wallCenter = gridToWorld(0, 0, gridW, gridH, cellSize);
    expect(checkGridCollision({ x: wallCenter.x, z: wallCenter.z }, grid, gridW, gridH, cellSize)).toBe(true);
  });

  it("closedDoorCells に登録された通路セルは衝突する", () => {
    const { grid, gridW, gridH } = generateMaze(10, 10, 5);
    const cellSize = 2.0;
    // (1, 1) は通路。閉じドアとして登録すると衝突するようになる
    const cell = gridToWorld(1, 1, gridW, gridH, cellSize);
    const closed = new Set(["1,1"]);
    expect(
      checkGridCollision({ x: cell.x, z: cell.z }, grid, gridW, gridH, cellSize, undefined, closed)
    ).toBe(true);
    // 登録を外せば通路扱いに戻る
    expect(
      checkGridCollision({ x: cell.x, z: cell.z }, grid, gridW, gridH, cellSize, undefined, null)
    ).toBe(false);
  });

  it("半径より遠い壁とは衝突しない", () => {
    const { grid, gridW, gridH } = generateMaze(10, 10, 5);
    const cellSize = 2.0;
    // (1,1) のセル中心は周囲の壁の最近点まで cellSize/2 = 1.0 の距離があるので、
    // 半径 0.35 のデフォルトでは余裕で当たらない
    const center = gridToWorld(1, 1, gridW, gridH, cellSize);
    expect(checkGridCollision({ x: center.x, z: center.z }, grid, gridW, gridH, cellSize, 0.35)).toBe(false);
  });
});

// ────────────────────────────────────────────
// generateDungeon
// ────────────────────────────────────────────
describe("generateDungeon", () => {
  it("同じ seed なら同じダンジョン（アイテム配置・出口・松明まで一致）", () => {
    const a = generateDungeon(424242);
    const b = generateDungeon(424242);

    expect(a.grid).toEqual(b.grid);
    expect(a.startPos).toEqual(b.startPos);
    expect(a.exitPos).toEqual(b.exitPos);
    expect(a.items.map((it) => it.id + ":" + it.position.join(","))).toEqual(
      b.items.map((it) => it.id + ":" + it.position.join(","))
    );
    expect(a.torches.length).toBe(b.torches.length);
  });

  it("normal 難易度では ITEMS.COUNT 以下のアイテムが配置される", () => {
    applyDifficulty("normal");
    const d = generateDungeon(1);
    expect(d.items.length).toBeLessThanOrEqual(ITEMS.COUNT);
  });

  it("start と exit は別セル", () => {
    const d = generateDungeon(2);
    // exit はスタートから最遠の通路セルなので必ず違うはず
    expect(d.exitGrid).not.toEqual({ gx: 1, gy: 1 });
  });

  it("迷路の幅・高さは MAZE 設定と一致する（normal）", () => {
    applyDifficulty("normal");
    const d = generateDungeon(3);
    expect(d.gridW).toBe(MAZE.WIDTH * 2 + 1);
    expect(d.gridH).toBe(MAZE.HEIGHT * 2 + 1);
  });
});

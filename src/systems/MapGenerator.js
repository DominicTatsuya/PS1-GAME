/**
 * ============================================================
 * MapGenerator.js — 迷路（ダンジョン）マップを自動生成するモジュール
 * ============================================================
 *
 * このファイルはゲームの迷路マップを手続き的に生成する関数群を提供します。
 * 主な処理の流れ:
 *   1. シード値を元に再現可能な迷路を生成（深さ優先探索アルゴリズム）
 *   2. グリッド座標 ↔ ワールド座標の変換
 *   3. 行き止まり・分岐点の検出
 *   4. BFS（幅優先探索）でスタートから最も遠い地点を見つける
 *   5. プレイヤーと壁の衝突判定
 *   6. 上記すべてを統合して完全なダンジョンデータを生成
 *
 * 用語:
 *   - グリッド座標 (gx, gy): 2D 配列上のインデックス
 *   - ワールド座標 (x, z): Three.js の 3D 空間上の位置
 *     ※ Three.js では Y 軸が上方向のため、地面は X-Z 平面
 *   - セル: 迷路の 1 マス（通路 or 壁）
 *   - 目地: 壁と壁の間の薄い壁（グリッド上で偶数座標の行/列）
 * ============================================================
 */

import { MAZE, ITEMS, TORCH, PLAYER } from "../data/config";

/**
 * mulberry32(a)
 * ─────────────
 * シード値 a を元に 0〜1 の擬似乱数を返す関数を生成する。
 *
 * 「擬似乱数生成器 (PRNG)」の一種で、同じシード値を渡せば
 * 毎回同じ乱数列が得られる（＝再現性がある）。
 * ゲームでは「同じシードなら同じマップ」を実現するために重要。
 *
 * アルゴリズムの詳細:
 *   - ビット演算（^, >>>, |）と整数乗算（Math.imul）を組み合わせて
 *     ビット列を十分に撹拌（かくはん）する
 *   - 0x6d2b79f5 は「黄金比に基づく定数」で、加算ごとに値を大きく変化させる
 *   - 最後に 4294967296（= 2^32）で割って 0〜1 に正規化する
 *
 * @param {number} a — シード値（整数）
 * @returns {Function} — 呼び出すたびに 0〜1 の乱数を返す関数
 */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);                     // 定数を加算してシードを進める
    t = Math.imul(t ^ (t >>> 15), t | 1);           // ビットを撹拌（XOR + 右シフト + 乗算）
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);      // さらに撹拌
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;    // 0〜1 の浮動小数点数に変換して返す
  };
}

/**
 * generateMaze(mazeW, mazeH, seed)
 * ─────────────────────────────────
 * 深さ優先探索（DFS）を用いて「完全迷路」を生成する関数。
 *
 * 完全迷路とは:
 *   - すべてのセルが到達可能
 *   - 任意の 2 セル間に唯一の経路が存在（ループがない）
 *
 * グリッドの構造:
 *   迷路の幅 mazeW × 高さ mazeH のセルを、壁付きのグリッドに展開する。
 *   グリッドサイズは (mazeW*2+1) × (mazeH*2+1)。
 *
 *   例: mazeW=3, mazeH=2 の場合 → gridW=7, gridH=5
 *     1 1 1 1 1 1 1    ← すべて壁（1=壁, 0=通路）
 *     1 0 1 0 1 0 1    ← 奇数座標がセル
 *     1 1 1 1 1 1 1
 *     1 0 1 0 1 0 1
 *     1 1 1 1 1 1 1
 *
 *   セル (x, y) はグリッド上では (x*2+1, y*2+1) に対応。
 *   セル間の壁を「壊す」ことで通路をつなげる。
 *
 * @param {number} mazeW — 迷路の幅（セル数）。デフォルト 10
 * @param {number} mazeH — 迷路の高さ（セル数）。デフォルト 10
 * @param {number} seed  — 乱数シード値
 * @returns {{ grid: number[][], gridW: number, gridH: number, mazeW: number, mazeH: number }}
 */
export function generateMaze(mazeW = 10, mazeH = 10, seed = Date.now()) {
  const rng = mulberry32(seed); // シードから乱数生成関数を作成

  // グリッドのサイズ: セルの間に壁を挟むので (セル数×2+1)
  const gridW = mazeW * 2 + 1;
  const gridH = mazeH * 2 + 1;

  // グリッドを全て壁（1）で初期化
  const grid = Array.from({ length: gridH }, () => Array(gridW).fill(1));

  // 各セル位置（奇数座標）を通路（0）にする
  for (let y = 0; y < mazeH; y++) {
    for (let x = 0; x < mazeW; x++) {
      grid[y * 2 + 1][x * 2 + 1] = 0;
    }
  }

  // ─── DFS（深さ優先探索）による迷路生成 ───
  // 訪問済みフラグの 2D 配列
  const visited = Array.from({ length: mazeH }, () => Array(mazeW).fill(false));
  const stack = []; // バックトラック用のスタック

  // 左上 (0,0) からスタート
  visited[0][0] = true;
  stack.push({ x: 0, y: 0 });

  // 上下左右の 4 方向
  const dirs = [
    { dx: 0, dy: -1 },  // 上
    { dx: 0, dy: 1 },   // 下
    { dx: -1, dy: 0 },  // 左
    { dx: 1, dy: 0 },   // 右
  ];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1]; // スタックの先頭（現在位置）

    // 未訪問の隣接セルを探す
    const neighbors = [];
    for (const { dx, dy } of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      // 範囲内かつ未訪問なら候補に追加
      if (nx >= 0 && nx < mazeW && ny >= 0 && ny < mazeH && !visited[ny][nx]) {
        neighbors.push({ x: nx, y: ny, dx, dy });
      }
    }

    if (neighbors.length > 0) {
      // ランダムに隣接セルを 1 つ選ぶ
      const next = neighbors[Math.floor(rng() * neighbors.length)];

      // 現在セルと選んだセルの間の壁をグリッド上で計算し、壊す（0 にする）
      const wallGx = cur.x * 2 + 1 + next.dx; // 壁の X 座標（グリッド上）
      const wallGy = cur.y * 2 + 1 + next.dy; // 壁の Y 座標（グリッド上）
      grid[wallGy][wallGx] = 0; // 壁を通路に変える

      visited[next.y][next.x] = true;
      stack.push(next); // 選んだセルに移動
    } else {
      // 未訪問の隣接セルがなければバックトラック（1 つ戻る）
      stack.pop();
    }
  }

  return { grid, gridW, gridH, mazeW, mazeH };
}

/**
 * gridToWorld(gx, gy, gridW, gridH, cellSize)
 * ─────────────────────────────────────────────
 * グリッド座標 (gx, gy) を 3D ワールド座標 (x, z) に変換する。
 *
 * 変換の仕組み:
 *   - グリッドの中心がワールド座標の原点 (0, 0) になるようにオフセットを引く
 *   - cellSize/2 を足してセルの中央を指すようにする
 *
 * @param {number} gx — グリッド X 座標
 * @param {number} gy — グリッド Y 座標
 * @param {number} gridW — グリッド幅
 * @param {number} gridH — グリッド高さ
 * @param {number} cellSize — 1 セルのワールド空間でのサイズ（単位はメートル相当）
 * @returns {{ x: number, z: number }} — ワールド座標
 */
export function gridToWorld(gx, gy, gridW, gridH, cellSize) {
  // グリッド全体の半分のサイズ（中心を原点にするためのオフセット）
  const offsetX = (gridW * cellSize) / 2;
  const offsetZ = (gridH * cellSize) / 2;
  return {
    x: gx * cellSize - offsetX + cellSize / 2,
    z: gy * cellSize - offsetZ + cellSize / 2,
  };
}

/**
 * worldToGrid(wx, wz, gridW, gridH, cellSize)
 * ─────────────────────────────────────────────
 * ワールド座標 (wx, wz) をグリッド座標 (gx, gy) に変換する。
 * gridToWorld の逆変換。
 *
 * @param {number} wx — ワールド X 座標
 * @param {number} wz — ワールド Z 座標
 * @param {number} gridW — グリッド幅
 * @param {number} gridH — グリッド高さ
 * @param {number} cellSize — 1 セルのサイズ
 * @returns {{ gx: number, gy: number }} — グリッド座標（整数に切り捨て）
 */
export function worldToGrid(wx, wz, gridW, gridH, cellSize) {
  const offsetX = (gridW * cellSize) / 2;
  const offsetZ = (gridH * cellSize) / 2;
  return {
    gx: Math.floor((wx + offsetX) / cellSize),
    gy: Math.floor((wz + offsetZ) / cellSize),
  };
}

/**
 * findDeadEnds(grid)
 * ──────────────────
 * 迷路内の「行き止まり」を全て見つけて返す関数。
 *
 * 行き止まりとは: 上下左右のうち 1 方向だけが開いているセル。
 * アイテム配置やゴール候補の探索に使われる。
 *
 * ※ セルは奇数座標 (y: 1,3,5..., x: 1,3,5...) にのみ存在する
 *
 * @param {number[][]} grid — 迷路グリッド（0=通路, 1=壁）
 * @returns {{ gx: number, gy: number }[]} — 行き止まりセルの配列
 */
export function findDeadEnds(grid) {
  const ends = [];
  // セルは奇数座標にあるので 2 ずつインクリメント
  for (let y = 1; y < grid.length - 1; y += 2) {
    for (let x = 1; x < grid[0].length - 1; x += 2) {
      if (grid[y][x] !== 0) continue; // 壁ならスキップ

      // 上下左右の通路数を数える
      let open = 0;
      if (grid[y - 1][x] === 0) open++; // 上
      if (grid[y + 1][x] === 0) open++; // 下
      if (grid[y][x - 1] === 0) open++; // 左
      if (grid[y][x + 1] === 0) open++; // 右

      // 開いている方向が 1 つだけ → 行き止まり
      if (open === 1) ends.push({ gx: x, gy: y });
    }
  }
  return ends;
}

/**
 * findJunctions(grid)
 * ────────────────────
 * 迷路内の「分岐点」を全て見つけて返す関数。
 *
 * 分岐点とは: 上下左右のうち 3 方向以上が開いているセル（T 字路や十字路）。
 * たいまつ（照明）の配置候補として使われる。
 *
 * @param {number[][]} grid — 迷路グリッド
 * @returns {{ gx: number, gy: number }[]} — 分岐点セルの配列
 */
export function findJunctions(grid) {
  const junctions = [];
  for (let y = 1; y < grid.length - 1; y += 2) {
    for (let x = 1; x < grid[0].length - 1; x += 2) {
      if (grid[y][x] !== 0) continue;

      let open = 0;
      if (grid[y - 1][x] === 0) open++;
      if (grid[y + 1][x] === 0) open++;
      if (grid[y][x - 1] === 0) open++;
      if (grid[y][x + 1] === 0) open++;

      // 開いている方向が 3 以上 → 分岐点
      if (open >= 3) junctions.push({ gx: x, gy: y });
    }
  }
  return junctions;
}

/**
 * bfsFarthest(grid, startGx, startGy)
 * ─────────────────────────────────────
 * BFS（幅優先探索）を使って、指定した開始地点から
 * 最も遠い通路セルを見つける関数。
 *
 * BFS は「近いセルから順に探索する」アルゴリズムなので、
 * 最後に見つかったセルが最も遠いセルとなる。
 *
 * 用途: ゲームの出口（ゴール）をスタートから最も遠い場所に配置する
 *
 * @param {number[][]} grid — 迷路グリッド
 * @param {number} startGx — 開始地点のグリッド X 座標
 * @param {number} startGy — 開始地点のグリッド Y 座標
 * @returns {{ x: number, y: number, dist: number }} — 最も遠いセルの座標と距離
 */
export function bfsFarthest(grid, startGx, startGy) {
  const visited = new Set(); // 訪問済みセルを記録する集合
  const queue = [{ x: startGx, y: startGy, dist: 0 }]; // キュー（先入先出）
  visited.add(`${startGx},${startGy}`);
  let farthest = queue[0]; // 暫定で最も遠いセル

  while (queue.length > 0) {
    const cur = queue.shift(); // キューの先頭を取り出す

    // 距離が今までの最大を超えたら更新
    if (cur.dist > farthest.dist) farthest = cur;

    // 上下左右の隣接セルを探索
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (
        nx >= 0 && nx < grid[0].length &&
        ny >= 0 && ny < grid.length &&
        grid[ny][nx] === 0 &&    // 通路であること
        !visited.has(key)         // 未訪問であること
      ) {
        visited.add(key);
        queue.push({ x: nx, y: ny, dist: cur.dist + 1 });
      }
    }
  }
  return farthest;
}

/**
 * bfsShortestPath(grid, start, goal)
 * ─────────────────────────────────
 * 通路グリッド上で、2 点間の最短経路（セル列）を返す。
 * 到達不能なら空配列を返す。
 *
 * ドア配置のために、スタートから出口への経路中のセルを特定するのに使う。
 *
 * @param {number[][]} grid
 * @param {{ gx: number, gy: number }} start
 * @param {{ gx: number, gy: number }} goal
 * @returns {{ gx: number, gy: number }[]} — start から goal までのセル列（両端含む）
 */
export function bfsShortestPath(grid, start, goal) {
  const key = (x, y) => `${x},${y}`;
  const parent = new Map(); // key -> parent key
  const visited = new Set();
  const startKey = key(start.gx, start.gy);
  const goalKey = key(goal.gx, goal.gy);
  visited.add(startKey);
  parent.set(startKey, null);

  const queue = [startKey];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === goalKey) break;
    const [cx, cy] = cur.split(",").map(Number);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const k = key(nx, ny);
      if (
        nx >= 0 && nx < grid[0].length &&
        ny >= 0 && ny < grid.length &&
        grid[ny][nx] === 0 &&
        !visited.has(k)
      ) {
        visited.add(k);
        parent.set(k, cur);
        queue.push(k);
      }
    }
  }

  if (!parent.has(goalKey)) return [];

  // 経路を逆順にたどって並び替える
  const path = [];
  let cur = goalKey;
  while (cur !== null) {
    const [gx, gy] = cur.split(",").map(Number);
    path.push({ gx, gy });
    cur = parent.get(cur);
  }
  path.reverse();
  return path;
}

/**
 * checkGridCollision(position, grid, gridW, gridH, cellSize, radius)
 * ───────────────────────────────────────────────────────────────────
 * プレイヤーの位置が壁と衝突しているかを判定する関数。
 *
 * アルゴリズム:
 *   1. プレイヤーのワールド座標をグリッド座標に変換
 *   2. 周囲 3×3 マスの壁セルについて衝突判定を行う
 *   3. 各壁を AABB（軸に平行な矩形）として扱い、
 *      プレイヤー位置から最も近い点を計算
 *   4. その最近点までの距離がプレイヤーの半径未満なら衝突
 *
 * ※ 円 vs 矩形の衝突判定（2D、Y 軸は無視）
 *
 * @param {{ x: number, z: number }} position — プレイヤーのワールド座標
 * @param {number[][]} grid — 迷路グリッド
 * @param {number} gridW — グリッド幅
 * @param {number} gridH — グリッド高さ
 * @param {number} cellSize — 1 セルのサイズ
 * @param {number} radius — プレイヤーの衝突半径（デフォルト: PLAYER.COLLISION_RADIUS）
 * @param {Set<string>} [closedDoorCells] — 閉じているドアのセル集合（"gx,gy" 形式）。
 *        ここに登録されたセルは通路（grid=0）でも壁として衝突する。
 * @returns {boolean} — 衝突していれば true
 */
export function checkGridCollision(position, grid, gridW, gridH, cellSize, radius = PLAYER.COLLISION_RADIUS, closedDoorCells = null) {
  // プレイヤー位置をグリッド座標（浮動小数点）に変換
  const offsetX = (gridW * cellSize) / 2;
  const offsetZ = (gridH * cellSize) / 2;
  const gx = (position.x + offsetX) / cellSize;
  const gz = (position.z + offsetZ) / cellSize;

  // プレイヤー周囲の 3×3 マス（checkR=1 → -1, 0, +1）を調べる
  const checkR = 1;
  for (let dy = -checkR; dy <= checkR; dy++) {
    for (let dx = -checkR; dx <= checkR; dx++) {
      const cx = Math.floor(gx) + dx;
      const cz = Math.floor(gz) + dy;

      // グリッド範囲外はスキップ
      if (cx < 0 || cx >= gridW || cz < 0 || cz >= gridH) continue;
      // 壁（1）でなければスキップ（ただし閉じているドアは通路でも障害物になる）
      const isWall = grid[cz][cx] === 1;
      const isClosedDoor = closedDoorCells !== null && closedDoorCells.has(`${cx},${cz}`);
      if (!isWall && !isClosedDoor) continue;

      // 壁セルのワールド座標での範囲（AABB: 最小値〜最大値）
      const wallMinX = cx * cellSize - offsetX;
      const wallMaxX = wallMinX + cellSize;
      const wallMinZ = cz * cellSize - offsetZ;
      const wallMaxZ = wallMinZ + cellSize;

      // プレイヤー位置から壁の矩形上の最近点を求める
      // Math.max(min, Math.min(pos, max)) で最近点を clamp する
      const closestX = Math.max(wallMinX, Math.min(position.x, wallMaxX));
      const closestZ = Math.max(wallMinZ, Math.min(position.z, wallMaxZ));

      // 最近点までの距離の二乗を計算（平方根を避けて高速化）
      const distX = position.x - closestX;
      const distZ = position.z - closestZ;

      // 距離の二乗 < 半径の二乗 → 衝突している
      if (distX * distX + distZ * distZ < radius * radius) {
        return true;
      }
    }
  }
  return false; // どの壁とも衝突していない
}

/**
 * generateDungeon(seed)
 * ─────────────────────
 * ダンジョン全体のデータを生成する統合関数。
 *
 * この関数 1 つを呼ぶだけで、ゲームに必要な以下のデータが揃う:
 *   - 迷路グリッド（壁と通路の 2D 配列）
 *   - スタート地点（プレイヤーの初期位置）
 *   - 出口位置（スタートから最も遠い地点）
 *   - 収集アイテムの配置（最大 5 個）
 *   - たいまつ（照明）の配置（最大 30 本）
 *   - 壁の 3D ワールド座標リスト
 *
 * @param {number} seed — 乱数シード値。同じ値なら同じダンジョンが生成される
 * @returns {Object} — ダンジョンデータ一式
 */
export function generateDungeon(seed = Date.now()) {
  // ─── 基本パラメータ（config.js の MAZE / ITEMS / TORCH を参照） ───
  const MAZE_W = MAZE.WIDTH;        // 迷路の幅（セル数）
  const MAZE_H = MAZE.HEIGHT;       // 迷路の高さ（セル数）
  const CELL_SIZE = MAZE.CELL_SIZE; // 1 セルのワールドサイズ（メートル相当）
  const WALL_HEIGHT = MAZE.WALL_HEIGHT; // 壁の高さ（メートル相当）

  // ─── 迷路を生成 ───
  const maze = generateMaze(MAZE_W, MAZE_H, seed);
  const { grid, gridW, gridH } = maze;

  // ─── スタート地点: グリッド (1, 1) = 左上のセル ───
  const startGx = 1;
  const startGy = 1;
  const startPos = gridToWorld(startGx, startGy, gridW, gridH, CELL_SIZE);

  // ─── 出口: スタートから BFS で最も遠い地点 ───
  const farthest = bfsFarthest(grid, startGx, startGy);
  const exitPos = gridToWorld(farthest.x, farthest.y, gridW, gridH, CELL_SIZE);

  // ─── 行き止まりと分岐点を検出 ───
  const deadEnds = findDeadEnds(grid);
  const junctions = findJunctions(grid);

  // ─── アイテム配置（ITEMS.COUNT 個まで） ───
  // 優先的に行き止まりに配置（スタートと出口は除外）
  const itemCandidates = deadEnds
    .filter((e) => !(e.gx === startGx && e.gy === startGy) && !(e.gx === farthest.x && e.gy === farthest.y))
    .sort(() => 0.5 - mulberry32(seed + 42)()); // シード付きでシャッフル

  const items = itemCandidates.slice(0, Math.min(ITEMS.COUNT, itemCandidates.length)).map((e, i) => {
    const pos = gridToWorld(e.gx, e.gy, gridW, gridH, CELL_SIZE);
    // position は [x, y, z] の配列。y=1.0 はアイテムの高さ（床からの距離）
    return { id: `item_${i}`, position: [pos.x, 1.0, pos.z], gx: e.gx, gy: e.gy };
  });

  // 行き止まりだけでは ITEMS.COUNT に足りない場合、通路セルからも補充
  if (items.length < ITEMS.COUNT) {
    const openCells = [];
    for (let y = 1; y < gridH - 1; y += 2) {
      for (let x = 1; x < gridW - 1; x += 2) {
        if (grid[y][x] === 0 &&
          !(x === startGx && y === startGy) &&
          !(x === farthest.x && y === farthest.y) &&
          !items.some((it) => it.gx === x && it.gy === y)) {
          openCells.push({ gx: x, gy: y });
        }
      }
    }
    const rng2 = mulberry32(seed + 99);
    openCells.sort(() => 0.5 - rng2()); // シャッフル
    while (items.length < ITEMS.COUNT && openCells.length > 0) {
      const cell = openCells.pop();
      const pos = gridToWorld(cell.gx, cell.gy, gridW, gridH, CELL_SIZE);
      items.push({ id: `item_${items.length}`, position: [pos.x, 1.0, pos.z], gx: cell.gx, gy: cell.gy });
    }
  }

  // ─── たいまつ（照明）の配置 ───
  // 通路セル（上下左右のうち 2 方向が開いている = 直線通路）を抽出
  const corridorCells = [];
  for (let y = 1; y < gridH - 1; y += 2) {
    for (let x = 1; x < gridW - 1; x += 2) {
      if (grid[y][x] !== 0) continue;
      let open = 0;
      if (grid[y - 1][x] === 0) open++;
      if (grid[y + 1][x] === 0) open++;
      if (grid[y][x - 1] === 0) open++;
      if (grid[y][x + 1] === 0) open++;
      if (open === 2) corridorCells.push({ gx: x, gy: y });
    }
  }

  const rng3 = mulberry32(seed + 77);

  const torchCandidates = [
    ...junctions,
    ...deadEnds,
    ...corridorCells.filter(() => rng3() < TORCH.CORRIDOR_CHANCE),
  ];
  torchCandidates.sort(() => 0.5 - rng3());

  // 隣接する松明を除外するため、グリッド距離3以上の間隔を確保
  const placedTorchGrids = [];
  const filteredCandidates = [];
  for (const t of torchCandidates) {
    const tooClose = placedTorchGrids.some(
      (p) => Math.abs(p.gx - t.gx) + Math.abs(p.gy - t.gy) <= 4
    );
    if (!tooClose) {
      filteredCandidates.push(t);
      placedTorchGrids.push(t);
    }
  }

  // 各松明について隣接する壁の方向を検出し、壁面に配置
  // wallDir: 松明が取り付けられる壁の方向（松明は壁から通路側に突き出す）
  const torches = filteredCandidates.slice(0, Math.min(TORCH.MAX_COUNT, filteredCandidates.length)).map((t) => {
    const pos = gridToWorld(t.gx, t.gy, gridW, gridH, CELL_SIZE);

    // 隣接セルのうち壁であるものを探す（松明を取り付ける壁面）
    const wallDirs = [];
    if (grid[t.gy - 1] && grid[t.gy - 1][t.gx] === 1) wallDirs.push({ dx: 0, dz: -1, angle: 0 });
    if (grid[t.gy + 1] && grid[t.gy + 1][t.gx] === 1) wallDirs.push({ dx: 0, dz: 1, angle: Math.PI });
    if (grid[t.gy][t.gx - 1] === 1) wallDirs.push({ dx: -1, dz: 0, angle: Math.PI / 2 });
    if (grid[t.gy][t.gx + 1] === 1) wallDirs.push({ dx: 1, dz: 0, angle: -Math.PI / 2 });

    // 壁が見つかった場合、最初の壁面に取り付け
    // 見つからない場合（中央通路など）はデフォルト方向
    const dir = wallDirs.length > 0 ? wallDirs[Math.floor(rng3() * wallDirs.length)] : { dx: 0, dz: -1, angle: 0 };

    // 壁面に密着するよう、壁方向にセルサイズの半分だけオフセット
    const wallOffset = CELL_SIZE * 0.45;
    return {
      position: [pos.x + dir.dx * wallOffset, 2.0, pos.z + dir.dz * wallOffset],
      angle: dir.angle,
    };
  });

  // ─── 壁のワールド座標リストを生成 ───
  // 3D レンダリングで壁ボックスを配置するために使う
  const wallPositions = [];
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      if (grid[y][x] === 1) { // 壁セルのみ
        const pos = gridToWorld(x, y, gridW, gridH, CELL_SIZE);
        wallPositions.push({ x: pos.x, z: pos.z });
      }
    }
  }

  // ─── ドア・鍵の配置 ───
  // スタート → 出口 の最短経路を復元し、その経路上のセルから
  // 「出口寄りかつ、既存のアイテム/スタート/出口と被らない」セルをドアとして 1 つ選ぶ。
  // 鍵は「経路から外れたデッドエンド」に置く（プレイヤーが寄り道を強いられる設計）。
  const doors = [];
  const keys = [];
  const path = bfsShortestPath(
    grid,
    { gx: startGx, gy: startGy },
    { gx: farthest.x, gy: farthest.y }
  );

  if (path.length >= 5) {
    // 出口側 1/3 あたりからドア候補を探す（スタート直後にドアがあるとすぐ詰まる）
    const doorSearchStart = Math.floor((path.length * 2) / 3);
    const occupied = new Set([
      `${startGx},${startGy}`,
      `${farthest.x},${farthest.y}`,
      ...items.map((it) => `${it.gx},${it.gy}`),
    ]);
    let doorCell = null;
    for (let i = doorSearchStart; i < path.length - 1; i++) {
      const cell = path[i];
      if (!occupied.has(`${cell.gx},${cell.gy}`)) {
        doorCell = cell;
        break;
      }
    }

    if (doorCell) {
      const pos = gridToWorld(doorCell.gx, doorCell.gy, gridW, gridH, CELL_SIZE);
      doors.push({
        id: "door_0",
        gx: doorCell.gx,
        gy: doorCell.gy,
        position: [pos.x, 0, pos.z],
        keyId: "key_0",
      });
      occupied.add(`${doorCell.gx},${doorCell.gy}`);

      // 鍵の配置: 経路外のデッドエンドを優先。無ければ経路外の通路セル。
      const pathSet = new Set(path.map((c) => `${c.gx},${c.gy}`));
      const offPathDeadEnds = deadEnds.filter(
        (e) => !pathSet.has(`${e.gx},${e.gy}`) && !occupied.has(`${e.gx},${e.gy}`)
      );
      const rngKey = mulberry32(seed + 123);
      offPathDeadEnds.sort(() => 0.5 - rngKey());
      let keyCell = offPathDeadEnds[0] || null;

      if (!keyCell) {
        // 経路外の通路セルから選ぶ
        for (let y = 1; y < gridH - 1; y += 2) {
          for (let x = 1; x < gridW - 1; x += 2) {
            if (grid[y][x] === 0 && !pathSet.has(`${x},${y}`) && !occupied.has(`${x},${y}`)) {
              keyCell = { gx: x, gy: y };
              break;
            }
          }
          if (keyCell) break;
        }
      }

      if (keyCell) {
        const keyPos = gridToWorld(keyCell.gx, keyCell.gy, gridW, gridH, CELL_SIZE);
        keys.push({
          id: "key_0",
          gx: keyCell.gx,
          gy: keyCell.gy,
          position: [keyPos.x, 1.0, keyPos.z],
          opensDoorId: "door_0",
        });
      } else {
        // 鍵の置き場所が見つからない（非常に小さい迷路など）場合は
        // ドアも無しにして一貫性を保つ
        doors.length = 0;
      }
    }
  }

  // ─── ダンジョンデータを返す ───
  return {
    grid,                // 迷路の 2D 配列（0=通路, 1=壁）
    gridW,               // グリッド幅
    gridH,               // グリッド高さ
    cellSize: CELL_SIZE, // 1 セルのワールドサイズ
    wallHeight: WALL_HEIGHT, // 壁の高さ
    startPos: { x: startPos.x, y: PLAYER.HEIGHT, z: startPos.z }, // スタート位置（y はプレイヤーの目の高さ）
    exitPos: { x: exitPos.x, y: 0, z: exitPos.z },      // 出口位置（y=0 は床の高さ）
    exitGrid: { gx: farthest.x, gy: farthest.y },       // 出口のグリッド座標
    items,               // 収集アイテムの配列
    torches,             // たいまつの座標配列
    wallPositions,       // 壁のワールド座標配列
    doors,               // ドア配列 [{id, gx, gy, position, keyId}]
    keys,                // 鍵配列 [{id, gx, gy, position, opensDoorId}]
    seed,                // 使用したシード値（再現用）
  };
}

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
 * @param {number} radius — プレイヤーの衝突半径（デフォルト: 0.35）
 * @returns {boolean} — 衝突していれば true
 */
export function checkGridCollision(position, grid, gridW, gridH, cellSize, radius = 0.35) {
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
      // 壁（1）でなければスキップ
      if (grid[cz][cx] !== 1) continue;

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
  // ─── 基本パラメータ ───
  const MAZE_W = 10;        // 迷路の幅（セル数）
  const MAZE_H = 10;        // 迷路の高さ（セル数）
  const CELL_SIZE = 2.0;    // 1 セルのワールドサイズ（メートル相当）
  const WALL_HEIGHT = 3.5;  // 壁の高さ（メートル相当）

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

  // ─── アイテム配置（最大 5 個） ───
  // 優先的に行き止まりに配置（スタートと出口は除外）
  const itemCandidates = deadEnds
    .filter((e) => !(e.gx === startGx && e.gy === startGy) && !(e.gx === farthest.x && e.gy === farthest.y))
    .sort(() => 0.5 - mulberry32(seed + 42)()); // シード付きでシャッフル

  const items = itemCandidates.slice(0, Math.min(5, itemCandidates.length)).map((e, i) => {
    const pos = gridToWorld(e.gx, e.gy, gridW, gridH, CELL_SIZE);
    // position は [x, y, z] の配列。y=1.0 はアイテムの高さ（床からの距離）
    return { id: `item_${i}`, position: [pos.x, 1.0, pos.z], gx: e.gx, gy: e.gy };
  });

  // 行き止まりだけでは 5 個に足りない場合、通路セルからも補充
  if (items.length < 5) {
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
    while (items.length < 5 && openCells.length > 0) {
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
      if (open === 2) corridorCells.push({ gx: x, gy: y }); // 直線通路
    }
  }

  const rng3 = mulberry32(seed + 77);

  // たいまつ候補: 分岐点 + 行き止まり + 通路の一部（30% の確率で選出）
  const torchCandidates = [
    ...junctions,
    ...deadEnds,
    ...corridorCells.filter(() => rng3() < 0.3),
  ];
  torchCandidates.sort(() => 0.5 - rng3()); // シャッフル

  // 最大 30 本を選び、ワールド座標に変換
  // [x+0.7, 2.2, z]: 壁際に寄せて (x+0.7)、高さ 2.2m の位置に配置
  const torches = torchCandidates.slice(0, Math.min(30, torchCandidates.length)).map((t) => {
    const pos = gridToWorld(t.gx, t.gy, gridW, gridH, CELL_SIZE);
    return [pos.x + 0.7, 2.2, pos.z];
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

  // ─── ダンジョンデータを返す ───
  return {
    grid,                // 迷路の 2D 配列（0=通路, 1=壁）
    gridW,               // グリッド幅
    gridH,               // グリッド高さ
    cellSize: CELL_SIZE, // 1 セルのワールドサイズ
    wallHeight: WALL_HEIGHT, // 壁の高さ
    startPos: { x: startPos.x, y: 1.6, z: startPos.z }, // スタート位置（y=1.6 はプレイヤーの目の高さ）
    exitPos: { x: exitPos.x, y: 0, z: exitPos.z },      // 出口位置（y=0 は床の高さ）
    exitGrid: { gx: farthest.x, gy: farthest.y },       // 出口のグリッド座標
    items,               // 収集アイテムの配列
    torches,             // たいまつの座標配列
    wallPositions,       // 壁のワールド座標配列
    seed,                // 使用したシード値（再現用）
  };
}

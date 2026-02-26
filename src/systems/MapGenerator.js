function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMaze(mazeW = 10, mazeH = 10, seed = Date.now()) {
  const rng = mulberry32(seed);
  const gridW = mazeW * 2 + 1;
  const gridH = mazeH * 2 + 1;

  const grid = Array.from({ length: gridH }, () => Array(gridW).fill(1));

  for (let y = 0; y < mazeH; y++) {
    for (let x = 0; x < mazeW; x++) {
      grid[y * 2 + 1][x * 2 + 1] = 0;
    }
  }

  const visited = Array.from({ length: mazeH }, () => Array(mazeW).fill(false));
  const stack = [];

  visited[0][0] = true;
  stack.push({ x: 0, y: 0 });

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const neighbors = [];

    for (const { dx, dy } of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx >= 0 && nx < mazeW && ny >= 0 && ny < mazeH && !visited[ny][nx]) {
        neighbors.push({ x: nx, y: ny, dx, dy });
      }
    }

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(rng() * neighbors.length)];
      const wallGx = cur.x * 2 + 1 + next.dx;
      const wallGy = cur.y * 2 + 1 + next.dy;
      grid[wallGy][wallGx] = 0;
      visited[next.y][next.x] = true;
      stack.push(next);
    } else {
      stack.pop();
    }
  }

  return { grid, gridW, gridH, mazeW, mazeH };
}

export function gridToWorld(gx, gy, gridW, gridH, cellSize) {
  const offsetX = (gridW * cellSize) / 2;
  const offsetZ = (gridH * cellSize) / 2;
  return {
    x: gx * cellSize - offsetX + cellSize / 2,
    z: gy * cellSize - offsetZ + cellSize / 2,
  };
}

export function worldToGrid(wx, wz, gridW, gridH, cellSize) {
  const offsetX = (gridW * cellSize) / 2;
  const offsetZ = (gridH * cellSize) / 2;
  return {
    gx: Math.floor((wx + offsetX) / cellSize),
    gy: Math.floor((wz + offsetZ) / cellSize),
  };
}

export function findDeadEnds(grid) {
  const ends = [];
  for (let y = 1; y < grid.length - 1; y += 2) {
    for (let x = 1; x < grid[0].length - 1; x += 2) {
      if (grid[y][x] !== 0) continue;
      let open = 0;
      if (grid[y - 1][x] === 0) open++;
      if (grid[y + 1][x] === 0) open++;
      if (grid[y][x - 1] === 0) open++;
      if (grid[y][x + 1] === 0) open++;
      if (open === 1) ends.push({ gx: x, gy: y });
    }
  }
  return ends;
}

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
      if (open >= 3) junctions.push({ gx: x, gy: y });
    }
  }
  return junctions;
}

export function bfsFarthest(grid, startGx, startGy) {
  const visited = new Set();
  const queue = [{ x: startGx, y: startGy, dist: 0 }];
  visited.add(`${startGx},${startGy}`);
  let farthest = queue[0];

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.dist > farthest.dist) farthest = cur;

    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (
        nx >= 0 && nx < grid[0].length &&
        ny >= 0 && ny < grid.length &&
        grid[ny][nx] === 0 &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({ x: nx, y: ny, dist: cur.dist + 1 });
      }
    }
  }

  return farthest;
}

export function checkGridCollision(position, grid, gridW, gridH, cellSize, radius = 0.35) {
  const offsetX = (gridW * cellSize) / 2;
  const offsetZ = (gridH * cellSize) / 2;

  const gx = (position.x + offsetX) / cellSize;
  const gz = (position.z + offsetZ) / cellSize;

  const checkR = 2;
  for (let dy = -checkR; dy <= checkR; dy++) {
    for (let dx = -checkR; dx <= checkR; dx++) {
      const cx = Math.floor(gx) + dx;
      const cz = Math.floor(gz) + dy;

      if (cx < 0 || cx >= gridW || cz < 0 || cz >= gridH) return true;
      if (grid[cz][cx] !== 1) continue;

      const wallMinX = cx * cellSize - offsetX;
      const wallMaxX = wallMinX + cellSize;
      const wallMinZ = cz * cellSize - offsetZ;
      const wallMaxZ = wallMinZ + cellSize;

      const closestX = Math.max(wallMinX, Math.min(position.x, wallMaxX));
      const closestZ = Math.max(wallMinZ, Math.min(position.z, wallMaxZ));

      const distX = position.x - closestX;
      const distZ = position.z - closestZ;

      if (distX * distX + distZ * distZ < radius * radius) {
        return true;
      }
    }
  }

  return false;
}

export function generateDungeon(seed = Date.now()) {
  const MAZE_W = 10;
  const MAZE_H = 10;
  const CELL_SIZE = 2.0;
  const WALL_HEIGHT = 3.5;

  const maze = generateMaze(MAZE_W, MAZE_H, seed);
  const { grid, gridW, gridH } = maze;

  const startGx = 1;
  const startGy = 1;
  const startPos = gridToWorld(startGx, startGy, gridW, gridH, CELL_SIZE);

  const farthest = bfsFarthest(grid, startGx, startGy);
  const exitPos = gridToWorld(farthest.x, farthest.y, gridW, gridH, CELL_SIZE);

  const deadEnds = findDeadEnds(grid);
  const junctions = findJunctions(grid);

  const itemCandidates = deadEnds
    .filter((e) => !(e.gx === startGx && e.gy === startGy) && !(e.gx === farthest.x && e.gy === farthest.y))
    .sort(() => 0.5 - mulberry32(seed + 42)());

  const items = itemCandidates.slice(0, Math.min(5, itemCandidates.length)).map((e, i) => {
    const pos = gridToWorld(e.gx, e.gy, gridW, gridH, CELL_SIZE);
    return { id: `item_${i}`, position: [pos.x, 1.0, pos.z], gx: e.gx, gy: e.gy };
  });

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
    openCells.sort(() => 0.5 - rng2());
    while (items.length < 5 && openCells.length > 0) {
      const cell = openCells.pop();
      const pos = gridToWorld(cell.gx, cell.gy, gridW, gridH, CELL_SIZE);
      items.push({ id: `item_${items.length}`, position: [pos.x, 1.0, pos.z], gx: cell.gx, gy: cell.gy });
    }
  }

  const torchCandidates = [...junctions, ...deadEnds.filter((_, i) => i % 2 === 0)];
  const rng3 = mulberry32(seed + 77);
  torchCandidates.sort(() => 0.5 - rng3());
  const torches = torchCandidates.slice(0, Math.min(15, torchCandidates.length)).map((t) => {
    const pos = gridToWorld(t.gx, t.gy, gridW, gridH, CELL_SIZE);
    return [pos.x + 0.7, 2.2, pos.z];
  });

  const wallPositions = [];
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      if (grid[y][x] === 1) {
        const pos = gridToWorld(x, y, gridW, gridH, CELL_SIZE);
        wallPositions.push({ x: pos.x, z: pos.z });
      }
    }
  }

  return {
    grid,
    gridW,
    gridH,
    cellSize: CELL_SIZE,
    wallHeight: WALL_HEIGHT,
    startPos: { x: startPos.x, y: 1.6, z: startPos.z },
    exitPos: { x: exitPos.x, y: 0, z: exitPos.z },
    exitGrid: { gx: farthest.x, gy: farthest.y },
    items,
    torches,
    wallPositions,
    seed,
  };
}

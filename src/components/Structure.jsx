import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

function generateStoneWallTexture(seed = 0) {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  let rng = seed + 7;
  const rand = () => {
    rng = (rng * 16807 + 13) % 2147483647;
    return (rng & 0x7fffffff) / 0x7fffffff;
  };

  ctx.fillStyle = "#1e1a15";
  ctx.fillRect(0, 0, S, S);

  const rows = [];
  let y = 0;
  while (y < S) {
    const h = 20 + Math.floor(rand() * 14);
    rows.push({ y, h: Math.min(h, S - y) });
    y += h + 2;
  }

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    let x = ri % 2 === 0 ? 0 : -(15 + Math.floor(rand() * 25));

    while (x < S) {
      const w = 28 + Math.floor(rand() * 38);
      const shade = Math.floor(rand() * 30) - 15;
      const r = 100 + shade;
      const g = 88 + shade - 3;
      const b = 74 + shade - 6;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + 1, row.y + 1, w - 2, row.h - 2);

      ctx.fillStyle = "rgba(200,190,170,0.1)";
      ctx.fillRect(x + 1, row.y + 1, w - 2, 1);
      ctx.fillRect(x + 1, row.y + 1, 1, row.h - 2);

      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x + 1, row.y + row.h - 2, w - 2, 1);
      ctx.fillRect(x + w - 2, row.y + 1, 1, row.h - 2);

      for (let n = 0; n < 8; n++) {
        const nx = x + 3 + rand() * (w - 6);
        const ny = row.y + 3 + rand() * (row.h - 6);
        const dark = rand() > 0.5;
        ctx.fillStyle = dark
          ? `rgba(0,0,0,${0.04 + rand() * 0.08})`
          : `rgba(180,170,150,${0.04 + rand() * 0.06})`;
        ctx.fillRect(nx, ny, 1 + rand() * 3, 1);
      }

      const stainChance = rand();
      if (stainChance > 0.7) {
        ctx.fillStyle = `rgba(50,40,30,${0.06 + rand() * 0.08})`;
        const sx = x + 2 + rand() * (w - 10);
        const sy = row.y + row.h * 0.3;
        ctx.fillRect(sx, sy, 4 + rand() * 8, row.h * 0.5);
      }

      x += w + 2;
    }
  }

  for (let i = 0; i < 25; i++) {
    const mx = rand() * S;
    const my = S * 0.3 + rand() * S * 0.7;
    const size = 2 + rand() * 7;
    const green = 55 + Math.floor(rand() * 45);
    const alpha = 0.15 + rand() * 0.35;
    ctx.fillStyle = `rgba(25,${green},18,${alpha})`;
    ctx.beginPath();
    ctx.arc(mx, my, size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 15; i++) {
    const mx = rand() * S;
    const my = rand() * S;
    const mw = 2 + rand() * 12;
    const mh = 1 + rand() * 2;
    ctx.fillStyle = `rgba(30,65,20,${0.1 + rand() * 0.2})`;
    ctx.fillRect(mx, my, mw, mh);
  }

  const numVines = 1 + Math.floor(rand() * 3);
  for (let v = 0; v < numVines; v++) {
    let vx = 10 + rand() * (S - 20);
    let vy = 0;
    ctx.strokeStyle = `rgba(20,50,12,${0.35 + rand() * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    while (vy < S) {
      vx += (rand() - 0.5) * 10;
      vy += 4 + rand() * 6;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();

    const leafCount = 4 + Math.floor(rand() * 5);
    for (let l = 0; l < leafCount; l++) {
      const lx = vx + (rand() - 0.5) * 20;
      const ly = S * 0.15 + rand() * S * 0.75;
      const ls = 2 + rand() * 4;
      const leafGreen = 45 + Math.floor(rand() * 35);
      ctx.fillStyle = `rgba(22,${leafGreen},12,${0.25 + rand() * 0.35})`;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rand() * Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 0, ls, ls * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < 8; i++) {
    const cx = rand() * S;
    const cy = S * 0.6 + rand() * S * 0.4;
    const cw = 1;
    const ch = 3 + rand() * 8;
    ctx.fillStyle = `rgba(15,10,8,${0.08 + rand() * 0.12})`;
    ctx.fillRect(cx, cy, cw, ch);
  }

  return canvas;
}

export default function DungeonWalls({ wallPositions, cellSize, wallHeight }) {
  const meshRef = useRef();
  const count = wallPositions.length;

  const colorArray = useMemo(() => {
    const colors = new Float32Array(count * 3);
    const base = new THREE.Color("#7a6e60");
    for (let i = 0; i < count; i++) {
      const variation = (Math.sin(i * 13.37) * 0.5 + 0.5) * 0.1 - 0.05;
      const c = base.clone();
      c.r += variation;
      c.g += variation * 0.8;
      c.b += variation * 0.6;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return colors;
  }, [count]);

  const texture = useMemo(() => {
    const canvas = generateStoneWallTexture(42);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, wallHeight / cellSize);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }, [cellSize, wallHeight]);

  useEffect(() => {
    if (!meshRef.current || count === 0) return;
    const dummy = new THREE.Object3D();
    wallPositions.forEach((pos, i) => {
      dummy.position.set(pos.x, wallHeight / 2, pos.z);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [wallPositions, wallHeight, count]);

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
      <boxGeometry args={[cellSize, wallHeight, cellSize]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </boxGeometry>
      <meshStandardMaterial map={texture} vertexColors flatShading roughness={0.92} metalness={0.03} />
    </instancedMesh>
  );
}

import * as THREE from "three";
import { useMemo } from "react";

function generateFlagstoneTexture() {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1a1714";
  ctx.fillRect(0, 0, S, S);

  const stones = [
    { x: 2, y: 2, w: 58, h: 58 },
    { x: 64, y: 2, w: 62, h: 40 },
    { x: 64, y: 46, w: 30, h: 34 },
    { x: 98, y: 46, w: 28, h: 34 },
    { x: 2, y: 64, w: 40, h: 62 },
    { x: 46, y: 84, w: 36, h: 42 },
    { x: 86, y: 84, w: 40, h: 42 },
    { x: 46, y: 64, w: 80, h: 16 },
  ];

  for (const stone of stones) {
    const shade = Math.floor(Math.random() * 18) - 9;
    const r = 58 + shade;
    const g = 52 + shade;
    const b = 46 + shade;

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(stone.x, stone.y, stone.w, stone.h);

    ctx.fillStyle = "rgba(180,170,155,0.08)";
    ctx.fillRect(stone.x, stone.y, stone.w, 1);
    ctx.fillRect(stone.x, stone.y, 1, stone.h);

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(stone.x, stone.y + stone.h - 1, stone.w, 1);
    ctx.fillRect(stone.x + stone.w - 1, stone.y, 1, stone.h);

    for (let n = 0; n < 12; n++) {
      const nx = stone.x + 2 + Math.random() * (stone.w - 4);
      const ny = stone.y + 2 + Math.random() * (stone.h - 4);
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "0,0,0" : "120,110,95"},${0.04 + Math.random() * 0.06})`;
      ctx.fillRect(nx, ny, 1 + Math.random() * 2, 1);
    }
  }

  for (let i = 0; i < 10; i++) {
    const mx = Math.random() * S;
    const my = Math.random() * S;
    const size = 1 + Math.random() * 4;
    ctx.fillStyle = `rgba(28,55,20,${0.1 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(mx, my, size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 6; i++) {
    const mx = Math.random() * S;
    const my = Math.random() * S;
    ctx.fillStyle = `rgba(25,50,18,${0.08 + Math.random() * 0.12})`;
    ctx.fillRect(mx, my, 2 + Math.random() * 8, 1 + Math.random());
  }

  return canvas;
}

export default function Floor({ gridW, gridH, cellSize }) {
  const width = gridW * cellSize;
  const depth = gridH * cellSize;

  const texture = useMemo(() => {
    const canvas = generateFlagstoneTexture();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(width / 2, depth / 2);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }, [width, depth]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  );
}

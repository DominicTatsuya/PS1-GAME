import * as THREE from "three";
import { useMemo } from "react";

function generateRoughStoneCeilingTexture() {
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#201c18";
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 60; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const shade = Math.floor(Math.random() * 20);
    const r = 28 + shade;
    const g = 25 + shade;
    const b = 22 + shade;
    const w = 2 + Math.random() * 6;
    const h = 2 + Math.random() * 6;
    ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + Math.random() * 0.5})`;
    ctx.fillRect(x, y, w, h);
  }

  for (let i = 0; i < 5; i++) {
    const cx = Math.random() * S;
    const cy = Math.random() * S;
    const len = 4 + Math.random() * 12;
    ctx.strokeStyle = `rgba(10,8,6,${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (Math.random() - 0.5) * len, cy + (Math.random() - 0.5) * len);
    ctx.stroke();
  }

  for (let i = 0; i < 4; i++) {
    const mx = Math.random() * S;
    const my = Math.random() * S;
    const size = 1 + Math.random() * 3;
    ctx.fillStyle = `rgba(20,40,15,${0.08 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(mx, my, size, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

export default function Ceiling({ gridW, gridH, cellSize, wallHeight }) {
  const width = gridW * cellSize;
  const depth = gridH * cellSize;

  const texture = useMemo(() => {
    const canvas = generateRoughStoneCeilingTexture();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(width / 2, depth / 2);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }, [width, depth]);

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={1} metalness={0} />
    </mesh>
  );
}

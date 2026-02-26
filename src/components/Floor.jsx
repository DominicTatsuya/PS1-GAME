import * as THREE from "three";
import { useMemo } from "react";

export default function Floor({ gridW, gridH, cellSize }) {
  const width = gridW * cellSize;
  const depth = gridH * cellSize;

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#2a2520";
    ctx.fillRect(0, 0, 64, 64);

    ctx.strokeStyle = "#1e1a16";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 62, 62);

    ctx.strokeStyle = "#342e28";
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, 58, 58);

    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      const a = 0.05 + Math.random() * 0.1;
      ctx.fillStyle = `rgba(60,50,40,${a})`;
      ctx.fillRect(x, y, 2, 2);
    }

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

import * as THREE from "three";
import { useMemo } from "react";

export default function Ceiling({ gridW, gridH, cellSize, wallHeight }) {
  const width = gridW * cellSize;
  const depth = gridH * cellSize;

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#1a1815";
    ctx.fillRect(0, 0, 32, 32);

    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 32;
      const y = Math.random() * 32;
      ctx.fillStyle = `rgba(30,25,20,${0.3 + Math.random() * 0.3})`;
      ctx.fillRect(x, y, 3, 3);
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
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={1} metalness={0} />
    </mesh>
  );
}

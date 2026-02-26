import * as THREE from "three";
import { useMemo } from "react";
import { createTiledTexture, generateCeilingTexture } from "../systems/TextureGenerator";

export default function Ceiling({ gridW, gridH, cellSize, wallHeight }) {
  const width = gridW * cellSize;
  const depth = gridH * cellSize;

  const texture = useMemo(
    () => createTiledTexture(generateCeilingTexture, width, depth),
    [width, depth]
  );

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={1} metalness={0} />
    </mesh>
  );
}

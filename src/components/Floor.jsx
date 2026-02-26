import { useMemo } from "react";
import { createTiledTexture, generateFlagstoneTexture } from "../systems/TextureGenerator";

export default function Floor({ gridW, gridH, cellSize }) {
  const width = gridW * cellSize;
  const depth = gridH * cellSize;

  const texture = useMemo(
    () => createTiledTexture(generateFlagstoneTexture, width, depth),
    [width, depth]
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  );
}

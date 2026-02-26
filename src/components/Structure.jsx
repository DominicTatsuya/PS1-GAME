import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { generateStoneWallTexture } from "../systems/TextureGenerator";

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

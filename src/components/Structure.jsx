import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

export default function DungeonWalls({ wallPositions, cellSize, wallHeight }) {
  const meshRef = useRef();

  const count = wallPositions.length;

  const colorArray = useMemo(() => {
    const colors = new Float32Array(count * 3);
    const base = new THREE.Color("#5a4a3a");
    for (let i = 0; i < count; i++) {
      const variation = (Math.sin(i * 13.37) * 0.5 + 0.5) * 0.08 - 0.04;
      const c = base.clone();
      c.r += variation;
      c.g += variation * 0.7;
      c.b += variation * 0.5;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return colors;
  }, [count]);

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
      <meshStandardMaterial vertexColors flatShading roughness={0.9} metalness={0.05} />
    </instancedMesh>
  );
}

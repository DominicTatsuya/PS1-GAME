import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function CollectibleItem({ position, onCollect, id }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const [collected, setCollected] = useState(false);
  const { camera } = useThree();

  useFrame((state) => {
    if (!meshRef.current || collected) return;

    const t = state.clock.elapsedTime;
    meshRef.current.rotation.y += 0.025;
    meshRef.current.position.y = position[1] + Math.sin(t * 2) * 0.15;

    const distance = camera.position.distanceTo(
      new THREE.Vector3(meshRef.current.position.x, camera.position.y, meshRef.current.position.z)
    );

    if (distance < 2.5) {
      const pulse = 1 + Math.sin(t * 6) * 0.25;
      meshRef.current.scale.setScalar(pulse);
    } else {
      meshRef.current.scale.setScalar(1);
    }

    if (glowRef.current) {
      glowRef.current.intensity = 1.5 + Math.sin(t * 3) * 0.5;
    }
  });

  useEffect(() => {
    if (collected) return;

    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() !== "e" || !meshRef.current) return;
      const distance = camera.position.distanceTo(
        new THREE.Vector3(meshRef.current.position.x, camera.position.y, meshRef.current.position.z)
      );
      if (distance < 2.5) {
        setCollected(true);
        onCollect(id);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [collected, camera, onCollect, id]);

  if (collected) return null;

  return (
    <group>
      <mesh ref={meshRef} position={position}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color="#ffcc00"
          emissive="#ffaa00"
          emissiveIntensity={1.2}
          flatShading
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <pointLight ref={glowRef} position={position} color="#ffaa00" intensity={1.5} distance={6} decay={2} />
    </group>
  );
}

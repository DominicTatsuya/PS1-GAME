import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export function TorchLight({ position }) {
  const lightRef = useRef();
  const flameRef = useRef();
  const offsetRef = useRef(Math.random() * 100);

  useFrame((state) => {
    const t = state.clock.elapsedTime + offsetRef.current;
    if (lightRef.current) {
      lightRef.current.intensity = 5 + Math.sin(t * 8) * 0.8 + Math.sin(t * 13.7) * 0.5 + Math.sin(t * 5.3) * 0.3;
    }
    if (flameRef.current) {
      flameRef.current.scale.y = 1 + Math.sin(t * 10) * 0.3;
      flameRef.current.scale.x = 1 + Math.sin(t * 7) * 0.15;
    }
  });

  return (
    <group position={position}>
      <pointLight ref={lightRef} color="#ff8844" intensity={5} distance={18} decay={1} />

      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.03, 0.06, 0.4, 4]} />
        <meshStandardMaterial color="#3a2510" roughness={1} />
      </mesh>

      <mesh ref={flameRef} position={[0, -0.05, 0]}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshBasicMaterial color="#ff6600" />
      </mesh>

      <mesh position={[0, 0.0, 0]}>
        <octahedronGeometry args={[0.05, 0]} />
        <meshBasicMaterial color="#ffaa22" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export default function Torches({ positions }) {
  return (
    <group>
      {positions.map((pos, i) => (
        <TorchLight key={i} position={pos} />
      ))}
    </group>
  );
}

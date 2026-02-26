import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function ExitPortal({ position, active }) {
  const ringRef = useRef();
  const innerRef = useRef();
  const lightRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (ringRef.current) {
      ringRef.current.rotation.y += active ? 0.03 : 0.005;
      ringRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    }

    if (innerRef.current) {
      innerRef.current.rotation.z += active ? 0.05 : 0.01;
      const s = active ? 1 + Math.sin(t * 3) * 0.15 : 0.6 + Math.sin(t) * 0.05;
      innerRef.current.scale.setScalar(s);
    }

    if (lightRef.current) {
      lightRef.current.intensity = active ? 3 + Math.sin(t * 4) * 1 : 0.5;
    }
  });

  const color = active ? "#00ff88" : "#444466";
  const emissiveColor = active ? "#00ff88" : "#222233";

  return (
    <group position={[position.x, 1.5, position.z]}>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.7, 0.12, 6, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={active ? 1.5 : 0.3}
          flatShading
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color={active ? "#88ffcc" : "#333344"}
          emissive={active ? "#44ffaa" : "#111122"}
          emissiveIntensity={active ? 2 : 0.2}
          flatShading
          transparent
          opacity={active ? 0.8 : 0.3}
        />
      </mesh>

      <pointLight ref={lightRef} color={active ? "#00ff88" : "#444466"} intensity={0.5} distance={active ? 12 : 4} decay={2} />

      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.45, 0]}>
          <ringGeometry args={[0.5, 1.2, 6]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
}

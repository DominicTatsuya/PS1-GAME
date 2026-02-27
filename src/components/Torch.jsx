/**
 * Torch.jsx
 * ========================================
 * ダンジョン内の松明（たいまつ）を描画するコンポーネント。
 *
 * 松明は壁面に取り付けられた状態で描画される:
 * - 壁ブラケット（取り付け金具）
 * - 斜めに突き出す柄
 * - 先端の炎（ゆらぎアニメーション付き）
 * - 点光源（周囲を照らす）
 *
 * 光の距離を抑えることで、壁を貫通して隣の通路に漏れる問題を軽減している。
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * TorchLight コンポーネント（単体の松明）
 *
 * @param {Array} position - 松明の位置 [x, y, z]（壁面の座標）
 * @param {number} angle - Y軸回りの回転角度（壁の向きに応じて松明を回転）
 */
export function TorchLight({ position, angle = 0 }) {
  const lightRef = useRef();
  const flameRef = useRef();
  const offsetRef = useRef(Math.random() * 100);

  useFrame((state) => {
    const t = state.clock.elapsedTime + offsetRef.current;
    if (lightRef.current) {
      lightRef.current.intensity = 4 + Math.sin(t * 8) * 0.6 + Math.sin(t * 13.7) * 0.4 + Math.sin(t * 5.3) * 0.2;
    }
    if (flameRef.current) {
      flameRef.current.scale.y = 1 + Math.sin(t * 10) * 0.3;
      flameRef.current.scale.x = 1 + Math.sin(t * 7) * 0.15;
    }
  });

  return (
    <group position={position} rotation={[0, angle, 0]}>
      {/* 点光源: 壁から通路側に少しオフセットして配置し、壁裏への漏れを抑制
          distance=8 で光の到達距離を制限（壁を越えにくくする） */}
      <pointLight
        ref={lightRef}
        position={[0, 0.1, 0.3]}
        color="#ff8844"
        intensity={4}
        distance={8}
        decay={1}
      />

      {/* 壁面のブラケット（取り付け金具）: 壁に密着する小さな板 */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[0.12, 0.12, 0.06]} />
        <meshStandardMaterial color="#2a1a0a" roughness={1} metalness={0.3} />
      </mesh>

      {/* ブラケットから斜め下に突き出すアーム部分 */}
      <mesh position={[0, -0.22, 0.12]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.04, 0.04, 0.2]} />
        <meshStandardMaterial color="#2a1a0a" roughness={1} metalness={0.3} />
      </mesh>

      {/* 松明の柄: 壁から斜め前方に突き出すよう配置 */}
      <mesh position={[0, -0.25, 0.25]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.045, 0.35, 4]} />
        <meshStandardMaterial color="#3a2510" roughness={1} />
      </mesh>

      {/* 炎の外側（大きい八面体） */}
      <mesh ref={flameRef} position={[0, -0.05, 0.35]}>
        <octahedronGeometry args={[0.07, 0]} />
        <meshBasicMaterial color="#ff6600" />
      </mesh>

      {/* 炎の芯（小さい八面体、黄色、半透明） */}
      <mesh position={[0, 0.0, 0.35]}>
        <octahedronGeometry args={[0.045, 0]} />
        <meshBasicMaterial color="#ffaa22" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/**
 * Torches コンポーネント（松明の一括配置）
 * 各松明は { position, angle } のオブジェクトを受け取る。
 *
 * @param {Array} positions - 松明データの配列 [{ position: [x,y,z], angle }, ...]
 */
export default function Torches({ positions }) {
  return (
    <group>
      {positions.map((torch, i) => (
        <TorchLight
          key={i}
          position={torch.position || torch}
          angle={torch.angle || 0}
        />
      ))}
    </group>
  );
}

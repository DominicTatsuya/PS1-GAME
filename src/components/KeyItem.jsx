/**
 * KeyItem.jsx — ダンジョン内に配置される「鍵」アイテム。
 *
 * CollectibleItem と似た挙動（E キーで拾う）だが、見た目と役割が異なる：
 * - 見た目: 金属質の青色キー（円柱+リング）
 * - 役割: 拾うと `opensDoorId` で指定されたドアが開く
 *
 * 既存の CollectibleItem を汎用化せずに別コンポーネントにしたのは、
 * 学習しやすさ（責務の分離）と、将来的な鍵独自挙動（音色違いなど）
 * を入れやすくするため。
 */
import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ITEMS } from "../data/config";

/**
 * @param {Array} position - [x, y, z]
 * @param {string} id - 鍵の ID（例: "key_0"）
 * @param {function} onCollect - 取得時コールバック。id を渡す
 */
export default function KeyItem({ position, id, onCollect }) {
  const groupRef = useRef();
  const glowRef = useRef();
  const [collected, setCollected] = useState(false);
  // 連打時の多重発火ガード（ISSUES #7）。詳細は CollectibleItem.jsx の同名 ref のコメント参照。
  const collectedGuardRef = useRef(false);
  const { camera } = useThree();

  useFrame((state) => {
    if (!groupRef.current || collected) return;
    const t = state.clock.elapsedTime;

    // 回転と上下浮遊（CollectibleItem より遅め）
    groupRef.current.rotation.y += 0.018;
    groupRef.current.position.y = position[1] + Math.sin(t * 1.8) * 0.12;

    // プレイヤーとの距離
    const dist = camera.position.distanceTo(
      new THREE.Vector3(
        groupRef.current.position.x,
        camera.position.y,
        groupRef.current.position.z
      )
    );

    // 近接時にスケール脈動
    if (dist < ITEMS.COLLECT_DISTANCE) {
      const pulse = 1 + Math.sin(t * 6) * 0.2;
      groupRef.current.scale.setScalar(pulse);
    } else {
      groupRef.current.scale.setScalar(1);
    }

    // グロー脈動
    if (glowRef.current) {
      glowRef.current.intensity = 1.2 + Math.sin(t * 3) * 0.4;
    }
  });

  // E キーで収集
  useEffect(() => {
    if (collected) return;
    const handleKeyPress = (e) => {
      // ref ガード: state 反映前の連打を同期的に弾く（ISSUES #7）
      if (collectedGuardRef.current) return;
      if (e.key.toLowerCase() !== "e" || !groupRef.current) return;
      const dist = camera.position.distanceTo(
        new THREE.Vector3(
          groupRef.current.position.x,
          camera.position.y,
          groupRef.current.position.z
        )
      );
      if (dist < ITEMS.COLLECT_DISTANCE) {
        collectedGuardRef.current = true; // 同期で確定
        setCollected(true);
        onCollect(id);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [collected, camera, onCollect, id]);

  if (collected) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* 鍵の軸（円柱） */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshStandardMaterial
          color="#4488cc"
          emissive="#2266aa"
          emissiveIntensity={0.8}
          flatShading
          roughness={0.3}
          metalness={0.75}
        />
      </mesh>
      {/* 鍵のリング（頭部） */}
      <mesh position={[-0.3, 0, 0]}>
        <torusGeometry args={[0.1, 0.035, 6, 12]} />
        <meshStandardMaterial
          color="#4488cc"
          emissive="#2266aa"
          emissiveIntensity={0.8}
          flatShading
          roughness={0.3}
          metalness={0.75}
        />
      </mesh>
      {/* 鍵の歯（棒状） */}
      <mesh position={[0.22, -0.06, 0]}>
        <boxGeometry args={[0.05, 0.08, 0.02]} />
        <meshStandardMaterial
          color="#4488cc"
          flatShading
          roughness={0.3}
          metalness={0.75}
        />
      </mesh>
      {/* 周囲グロー */}
      <pointLight
        ref={glowRef}
        color="#44aaff"
        intensity={1.2}
        distance={5}
        decay={2}
      />
    </group>
  );
}

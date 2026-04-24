/**
 * Trap.jsx — 床から周期的に突き出るスパイクトラップ。
 *
 * 状態のサイクル（TRAP.CYCLE_DURATION 秒）:
 *   0 ～ (cycle - active - warn) : 隠れている（安全）
 *   (cycle - active - warn) ～ (cycle - active) : 予兆（刃が少し出る / 警告音）
 *   (cycle - active) ～ cycle : 発動（刃が完全に出ている / ダメージ判定）
 *
 * プレイヤーが攻撃範囲内にいる間は App 側の onHit コールバック経由で
 * スタミナが減らされる。被弾は App 側でクールダウン管理されるので、
 * このコンポーネントは「当たっている」という信号を出すだけで良い。
 */
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TRAP } from "../data/config";
import { trapWarn } from "../systems/Audio";

/**
 * @param {Array} position - トラップ中心のワールド座標 [x, 0, z]
 * @param {number} phaseOffset - 0〜1 の位相オフセット（全罠が同期しないようにする）
 * @param {function} onHit - プレイヤー接触時に呼ばれる（id を渡す）
 * @param {string} id - トラップ ID（onHit への引数 & クールダウン管理に使う）
 */
export default function Trap({ position, phaseOffset = 0, onHit, id }) {
  // 刃メッシュ（上下動アニメーション）
  const spikesRef = useRef();
  // 直近に警告音を鳴らしたサイクル番号（重複再生防止）
  const lastWarnCycle = useRef(-1);
  const { camera } = useThree();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycle = TRAP.CYCLE_DURATION;
    const active = TRAP.ACTIVE_DURATION;
    const warn = 0.25; // 予兆フェーズの長さ（秒）

    // 位相付きの時間から 0〜cycle の範囲に正規化
    const phased = (t + phaseOffset * cycle) % cycle;

    // 各フェーズの境界
    const warnStart = cycle - active - warn;
    const activeStart = cycle - active;

    // 刃の高さ（0=完全に隠れている, 1=完全に出ている）
    let height;
    if (phased < warnStart) {
      height = 0;
    } else if (phased < activeStart) {
      // 予兆中は少し頭を出す（0 → 0.25 まで線形）
      height = ((phased - warnStart) / warn) * 0.25;
    } else {
      // 発動中は 1 近くを保つ（残り時間で少し引っ込む）
      const activeP = (phased - activeStart) / active;
      height = 0.9 + Math.sin(activeP * Math.PI) * 0.1;
    }

    if (spikesRef.current) {
      // スパイクの Y 位置: 床下 -0.5 〜 床上 0.5
      spikesRef.current.position.y = -0.5 + height * 1.0;
    }

    // 予兆開始時に 1 度だけ警告音を鳴らす
    const cycleNumber = Math.floor((t + phaseOffset * cycle) / cycle);
    const isInWarn = phased >= warnStart && phased < activeStart;
    if (isInWarn && lastWarnCycle.current !== cycleNumber) {
      // プレイヤーが近くにいる時だけ鳴らす（遠くの罠は無音）
      const dist = camera.position.distanceTo(
        new THREE.Vector3(position[0], camera.position.y, position[2])
      );
      if (dist < 6) trapWarn();
      lastWarnCycle.current = cycleNumber;
    }

    // ダメージ判定: 発動フェーズかつ、プレイヤーが範囲内
    if (phased >= activeStart && onHit) {
      const dx = camera.position.x - position[0];
      const dz = camera.position.z - position[2];
      const distSq = dx * dx + dz * dz;
      if (distSq < TRAP.DAMAGE_RADIUS * TRAP.DAMAGE_RADIUS) {
        onHit(id);
      }
    }
  });

  // マウント時に 1 度だけ位相ログ（なくても動くので省略）
  useEffect(() => {}, []);

  return (
    <group position={position}>
      {/* 床のプレート（罠の位置目印） */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[TRAP.DAMAGE_RADIUS, 12]} />
        <meshStandardMaterial
          color="#3a1a1a"
          emissive="#551010"
          emissiveIntensity={0.4}
          flatShading
          roughness={0.9}
        />
      </mesh>

      {/* スパイクの束（4 本を放射状に） */}
      <group ref={spikesRef} position={[0, -0.5, 0]}>
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2;
          const r = 0.25;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * r, 0.4, Math.sin(angle) * r]}
            >
              <coneGeometry args={[0.1, 0.8, 6]} />
              <meshStandardMaterial
                color="#aaaaaa"
                emissive="#442222"
                emissiveIntensity={0.2}
                flatShading
                roughness={0.4}
                metalness={0.7}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

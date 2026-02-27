/**
 * CollectibleItem.jsx
 * ========================================
 * 収集可能なアイテムを表示するコンポーネント。
 *
 * ダンジョン内に配置される金色の八面体アイテム。
 * プレイヤーが近づくと脈動（パルス）し、Eキーで収集できる。
 *
 * Three.js の概念:
 * - mesh: 3Dオブジェクトの基本単位。geometry（形状）と material（素材）の組み合わせ。
 * - octahedronGeometry: 八面体（ダイヤモンドのような形）のジオメトリ。
 * - meshStandardMaterial: 物理ベースの標準マテリアル。光の反射をリアルに表現する。
 *   - emissive: 自己発光色。周囲の光に関係なくオブジェクト自体が光る色。
 *   - emissiveIntensity: 自己発光の強さ。
 *   - roughness: 表面の粗さ（0=鏡面、1=完全に粗い）。
 *   - metalness: 金属感（0=非金属、1=完全な金属）。
 * - pointLight: 点光源。アイテムの周囲を照らすグロー（輝き）効果に使用。
 * - group: 複数の3Dオブジェクトをまとめるコンテナ。HTMLの<div>に似た役割。
 */
import { useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * CollectibleItem コンポーネント
 *
 * @param {Array} position - アイテムの位置 [x, y, z]
 * @param {function} onCollect - アイテム収集時に呼ばれるコールバック関数
 * @param {string} id - アイテムの一意な識別子
 */
export default function CollectibleItem({ position, onCollect, id }) {
  /**
   * useRef フック:
   * - meshRef: アイテムの3Dメッシュへの参照。回転・スケール変更に使う。
   * - glowRef: グロー用ポイントライトへの参照。明るさの脈動に使う。
   */
  const meshRef = useRef();
  const glowRef = useRef();

  /**
   * useState フック:
   * Reactの状態管理。collected が true になるとアイテムが画面から消える。
   * useState(false) で初期値を false（未収集）に設定。
   * setCollected(true) を呼ぶと collected が true に変わり、コンポーネントが再レンダリングされる。
   */
  const [collected, setCollected] = useState(false);

  /**
   * useThree フック:
   * camera を取得し、プレイヤーとの距離計算に使う。
   */
  const { camera } = useThree();

  /**
   * useFrame フック（毎フレーム実行されるアニメーション処理）:
   * - アイテムをY軸周りに回転させる（回転するアイテムの演出）
   * - sin関数で上下に浮遊させる（ふわふわ浮いている感じ）
   * - プレイヤーが近い(2.5以内)とき、脈動（パルス）アニメーションを付ける
   * - グローライトの明るさも sin 関数で脈動させる
   *
   * Math.sin(t): 時間 t に対して -1～1 の間で滑らかに振動する値を返す三角関数。
   * これを使うことで、自然な「揺れ」「脈動」のアニメーションを作れる。
   */
  useFrame((state) => {
    if (!meshRef.current || collected) return;

    const t = state.clock.elapsedTime;

    meshRef.current.rotation.y += 0.025;

    meshRef.current.position.y = position[1] + Math.sin(t * 2) * 0.15;

    /**
     * 距離判定:
     * camera.position.distanceTo() でプレイヤーとアイテムの距離を計算。
     * Y座標を camera.position.y に揃えることで、水平距離だけで判定する。
     */
    const distance = camera.position.distanceTo(new THREE.Vector3(meshRef.current.position.x, camera.position.y, meshRef.current.position.z));

    if (distance < 2.5) {
      /**
       * 脈動アニメーション:
       * sin(t * 6) で高速に -1～1 を振動 → 0.75～1.25 のスケール変化。
       * setScalar で x, y, z 全方向に同じスケールを設定する。
       */
      const pulse = 1 + Math.sin(t * 6) * 0.25;
      meshRef.current.scale.setScalar(pulse);
    }
    else { meshRef.current.scale.setScalar(1); }

    /**
     * グローライトの脈動:
     * 光の強さを 1.0～2.0 の間で変化させ、アイテムが「生きている」ような演出にする。
     */
    if (glowRef.current) { glowRef.current.intensity = 1.5 + Math.sin(t * 3) * 0.5; }
  });

  /**
   * useEffect フック（Eキーによるアイテム収集処理）:
   * キーボードの "keydown" イベントを監視し、Eキーが押されたとき、
   * プレイヤーとの距離が 2.5 以内ならアイテムを収集する。
   *
   * 依存配列 [collected, camera, onCollect, id] の値が変わるたびに
   * リスナーが再登録される。return のクリーンアップ関数で古いリスナーを解除する。
   */
  useEffect(() => {
    if (collected) return;
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() !== "e" || !meshRef.current) return;
      const distance = camera.position.distanceTo(new THREE.Vector3(meshRef.current.position.x, camera.position.y, meshRef.current.position.z));
      if (distance < 2.5) { setCollected(true); onCollect(id); }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [collected, camera, onCollect, id]);

  /**
   * 収集済みの場合は何も表示しない（null を返す）。
   * React では null を返すとコンポーネントが画面から完全に消える。
   */
  if (collected) return null;

  /**
   * アイテムの描画:
   * - <group>: mesh と pointLight をまとめるコンテナ
   * - <mesh>: 八面体の3Dオブジェクト
   *   - octahedronGeometry args={[0.25, 0]}: 半径0.25の八面体、分割数0（ローポリ）
   *   - meshStandardMaterial: 金色に光る素材
   *     - flatShading: フラットシェーディング。ポリゴンの面ごとに色が均一になるレトロな見た目。
   * - <pointLight>: アイテム周囲のグロー（輝き）効果
   *   - distance={6}: 光が届く範囲
   *   - decay={2}: 距離による光の減衰（2=物理的に正確な減衰）
   */
  return (
    <group>
      <mesh ref={meshRef} position={position}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={1.2} flatShading roughness={0.3} metalness={0.6} />
      </mesh>
      <pointLight ref={glowRef} position={position} color="#ffaa00" intensity={1.5} distance={6} decay={2} />
    </group>
  );
}

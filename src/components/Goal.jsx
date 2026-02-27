/**
 * Goal.jsx（ExitPortal コンポーネント）
 * ========================================
 * ダンジョンの出口ポータル（ゴール）を描画するコンポーネント。
 *
 * トーラス（ドーナツ型）のリングと二十面体の内部オブジェクトで構成され、
 * アイテムを全て集めると「活性化」（active = true）して緑色に輝く。
 * 非活性時はグレーで控えめに回転するだけ。
 *
 * Three.js の概念:
 * - torusGeometry: トーラス（ドーナツ型）のジオメトリ。ポータルの外枠リングに使用。
 *   args={[半径, チューブ半径, 円周方向の分割数, チューブの分割数]}
 * - icosahedronGeometry: 二十面体のジオメトリ。ポータル内部のエネルギー球体に使用。
 *   args={[半径, 分割数]} 分割数0でローポリな二十面体。
 * - ringGeometry: リング（輪）の平面ジオメトリ。床に映るグロー効果に使用。
 *   args={[内径, 外径, 辺の分割数]}
 * - meshBasicMaterial: ライティングの影響を受けないマテリアル。
 *   床のグローはライト計算不要なため BasicMaterial を使用。
 * - transparent / opacity: 半透明設定。opacity=0.15 で薄く光る床の演出。
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * ExitPortal コンポーネント
 *
 * @param {object} position - ポータルの位置 {x, z}
 * @param {boolean} active - ポータルが活性化しているかどうか
 */
export default function ExitPortal({ position, active }) {
  /**
   * useRef フック:
   * - ringRef: 外枠リング（トーラス）メッシュへの参照。回転アニメーション用。
   * - innerRef: 内部の二十面体メッシュへの参照。回転・脈動アニメーション用。
   * - lightRef: 点光源への参照。明るさの動的変更用。
   */
  const ringRef = useRef();
  const innerRef = useRef();
  const lightRef = useRef();

  /**
   * useFrame フック（毎フレームのアニメーション）:
   * active の状態に応じて、回転速度や脈動の強さが変化する。
   *
   * リング（外枠）:
   * - Y軸回転: active時は0.03/フレーム（速い）、非active時は0.005（ゆっくり）
   * - X軸の揺れ: sin(t*0.5)*0.1 で微妙に傾く
   *
   * 内部球体:
   * - Z軸回転: active時は速く、非active時はゆっくり
   * - スケール脈動:
   *   active時: 0.85～1.15 の範囲で脈動（sin(t*3)）
   *   非active時: 0.55～0.65 の小さな脈動
   *
   * 光の強さ:
   *   active時: 2.0～4.0 で大きく変動（sin(t*4)）
   *   非active時: 0.5 で一定
   */
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) { ringRef.current.rotation.y += active ? 0.03 : 0.005; ringRef.current.rotation.x = Math.sin(t * 0.5) * 0.1; }
    if (innerRef.current) { innerRef.current.rotation.z += active ? 0.05 : 0.01; const s = active ? 1 + Math.sin(t * 3) * 0.15 : 0.6 + Math.sin(t) * 0.05; innerRef.current.scale.setScalar(s); }
    if (lightRef.current) { lightRef.current.intensity = active ? 3 + Math.sin(t * 4) * 1 : 0.5; }
  });

  /**
   * 色の設定:
   * active 状態に応じてポータルの色が切り替わる。
   * - 活性化時: 緑色 (#00ff88) で明るく輝く
   * - 非活性時: 暗い青灰色 (#444466) で地味に表示
   */
  const color = active ? "#00ff88" : "#444466";
  const emissiveColor = active ? "#00ff88" : "#222233";

  /**
   * ポータルの描画:
   * - group: position の Y座標を1.5に設定し、ポータルを宙に浮かせる。
   *
   * - 1つ目の mesh（リング）: torusGeometry でドーナツ型の外枠
   *   - args={[0.7, 0.12, 6, 12]}: 半径0.7、チューブ半径0.12、6×12分割（ローポリ）
   *
   * - 2つ目の mesh（内部球体）: icosahedronGeometry で二十面体のエネルギー球
   *   - transparent + opacity: active時は0.8（やや透ける）、非active時は0.3（ほぼ透明）
   *
   * - pointLight: ポータルの光。active時は distance=12 で広範囲を照らす。
   *
   * - 条件付き mesh（床のグロー）: active 時のみ表示。
   *   - rotation={[-Math.PI/2, 0, 0]}: X軸に-90度回転 = 水平に寝かせる
   *   - ringGeometry: リング状の平面で「魔法陣」のような床の光
   *   - opacity={0.15}: 非常に薄い半透明
   */
  return (
    <group position={[position.x, 1.5, position.z]}>
      <mesh ref={ringRef}><torusGeometry args={[0.7, 0.12, 6, 12]} /><meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={active ? 1.5 : 0.3} flatShading roughness={0.4} metalness={0.5} /></mesh>
      <mesh ref={innerRef}><icosahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color={active ? "#88ffcc" : "#333344"} emissive={active ? "#44ffaa" : "#111122"} emissiveIntensity={active ? 2 : 0.2} flatShading transparent opacity={active ? 0.8 : 0.3} /></mesh>
      <pointLight ref={lightRef} color={active ? "#00ff88" : "#444466"} intensity={0.5} distance={active ? 12 : 4} decay={2} />
      {active && (<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.45, 0]}><ringGeometry args={[0.5, 1.2, 6]} /><meshBasicMaterial color="#00ff88" transparent opacity={0.15} /></mesh>)}
    </group>
  );
}

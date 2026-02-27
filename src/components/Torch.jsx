/**
 * Torch.jsx
 * ========================================
 * ダンジョン内の松明（たいまつ）を描画するコンポーネント。
 *
 * 松明は「柄」「炎」「芯」の3つのメッシュと、炎の光を表す点光源で構成される。
 * 複数の三角関数（sin）を異なる周波数で重ね合わせることで、
 * 自然な炎のゆらぎを再現している（フーリエ合成に似た手法）。
 *
 * Three.js の概念:
 * - pointLight: 点光源。松明の炎が周囲を照らす効果。
 * - cylinderGeometry: 円柱のジオメトリ。松明の柄（持ち手）部分に使用。
 *   args={[上面半径, 下面半径, 高さ, 円周の分割数]}
 * - octahedronGeometry: 八面体。炎の形をローポリで表現。
 * - meshBasicMaterial: ライティングの影響を受けないマテリアル。
 *   炎自体は光源なので、光の計算が不要＝meshBasicMaterial が適切。
 * - group: 複数のオブジェクトをまとめるコンテナ。
 *   group に position を設定すると、中の全オブジェクトがまとめて配置される。
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * TorchLight コンポーネント（単体の松明）
 *
 * @param {Array} position - 松明の位置 [x, y, z]
 */
export function TorchLight({ position }) {
  /**
   * useRef フック:
   * - lightRef: 点光源への参照（明るさの動的変更用）
   * - flameRef: 炎メッシュへの参照（スケール変更でゆらめきを表現）
   * - offsetRef: 個体ごとのランダムな時間オフセット。
   *   Math.random() * 100 で各松明の炎アニメーションの開始タイミングをずらし、
   *   全ての松明が同じタイミングで同じ動きをする不自然さを防ぐ。
   */
  const lightRef = useRef();
  const flameRef = useRef();
  const offsetRef = useRef(Math.random() * 100);

  /**
   * useFrame フック（毎フレームの炎アニメーション）:
   * 複数の sin 関数を異なる周波数で加算し、自然なゆらぎを作る。
   *
   * 光の強さ:
   *   5（基本値）+ sin(t*8)*0.8 + sin(t*13.7)*0.5 + sin(t*5.3)*0.3
   *   → 3つの異なる速さの波を重ねることで、不規則で自然な明滅になる。
   *   周波数 8, 13.7, 5.3 はわざと非整数比にすることで、周期的な繰り返しを避けている。
   *
   * 炎のスケール:
   *   Y方向（高さ）と X方向（幅）を sin でゆらすことで、炎が伸縮する動きを表現。
   */
  useFrame((state) => {
    const t = state.clock.elapsedTime + offsetRef.current;
    if (lightRef.current) { lightRef.current.intensity = 5 + Math.sin(t * 8) * 0.8 + Math.sin(t * 13.7) * 0.5 + Math.sin(t * 5.3) * 0.3; }
    if (flameRef.current) { flameRef.current.scale.y = 1 + Math.sin(t * 10) * 0.3; flameRef.current.scale.x = 1 + Math.sin(t * 7) * 0.15; }
  });

  /**
   * 松明の描画:
   * - pointLight: 炎の光源。color="#ff8844"（暖かいオレンジ色）、distance=18 で届く範囲を指定。
   * - 1つ目の mesh: 松明の柄（cylinderGeometry で細い棒を描画）
   *   - args={[0.03, 0.06, 0.4, 4]}: 上端半径0.03、下端半径0.06、高さ0.4、4角形（ローポリ）
   * - 2つ目の mesh (flameRef): 炎の外側（大きい八面体、オレンジ色）
   * - 3つ目の mesh: 炎の芯（小さい八面体、黄色、半透明）
   */
  return (
    <group position={position}>
      <pointLight ref={lightRef} color="#ff8844" intensity={5} distance={18} decay={1} />
      <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.03, 0.06, 0.4, 4]} /><meshStandardMaterial color="#3a2510" roughness={1} /></mesh>
      <mesh ref={flameRef} position={[0, -0.05, 0]}><octahedronGeometry args={[0.08, 0]} /><meshBasicMaterial color="#ff6600" /></mesh>
      <mesh position={[0, 0.0, 0]}><octahedronGeometry args={[0.05, 0]} /><meshBasicMaterial color="#ffaa22" transparent opacity={0.8} /></mesh>
    </group>
  );
}

/**
 * Torches コンポーネント（松明の一括配置）
 * 位置の配列を受け取り、各位置に TorchLight を配置する。
 *
 * @param {Array} positions - 松明の位置配列 [[x, y, z], ...]
 */
export default function Torches({ positions }) {
  return (<group>{positions.map((pos, i) => (<TorchLight key={i} position={pos} />))}</group>);
}

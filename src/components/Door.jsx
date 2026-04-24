/**
 * Door.jsx — ダンジョン内のドア（鍵でのみ開く通路ブロック）
 *
 * 閉じているときは壁と同じセルサイズのブロックで通路を塞ぎ、
 * 鍵取得後は滑らかに回転アニメーションしながら開く。
 *
 * Three.js の概念:
 * - group: 複数の3Dオブジェクトをまとめるコンテナ
 * - 回転: 蝶番を模すため、ドア本体のメッシュを group の端にオフセットして
 *   group.rotation を変えることで実現する（ドアノブを中心にせず端を軸にする）
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * @param {Array} position - ドアのワールド座標 [x, y, z]（セル中心の床レベル）
 * @param {number} cellSize - ダンジョンの 1 セルのサイズ
 * @param {number} wallHeight - 壁と同じ高さ
 * @param {boolean} open - 開いているかどうか
 */
export default function Door({ position, cellSize, wallHeight, open }) {
  // ヒンジ（蝶番）の group への参照。回転アニメーションに使う
  const hingeRef = useRef();
  // 現在の開閉度（0=閉、1=全開）。lerpで目標へ近づける
  const progress = useRef(0);

  useFrame((_, delta) => {
    if (!hingeRef.current) return;
    // 目標値は open なら 1、閉じているなら 0
    const target = open ? 1 : 0;
    // 指数関数的に目標へ近づける（フレームレート非依存）
    const speed = 4;
    progress.current += (target - progress.current) * Math.min(1, delta * speed);
    // 0 → 0 ラジアン（閉）、1 → -π/2 ラジアン（90 度左に開く）
    hingeRef.current.rotation.y = -progress.current * (Math.PI / 2);
  });

  const thickness = 0.18;             // ドアの厚み（メートル）
  const height = wallHeight * 0.9;    // 壁より少し低く
  const width = cellSize - 0.1;       // セルサイズよりわずかに小さく

  return (
    <group position={position}>
      {/* ヒンジを位置 0 に置き、その子としてドアパネルを +width/2 オフセットで配置する。
          こうすることで group の回転 = ヒンジ軸を中心とした回転になる */}
      <group ref={hingeRef} position={[-width / 2, 0, 0]}>
        {/* ドア本体（板）。位置 x = +width/2 で実ドアは元の中心に乗る */}
        <mesh position={[width / 2, height / 2, 0]} castShadow={false}>
          <boxGeometry args={[width, height, thickness]} />
          <meshStandardMaterial
            color="#5c3a1e"
            flatShading
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
        {/* ドアノブの金属装飾 */}
        <mesh position={[width - 0.2, height / 2, thickness / 2 + 0.04]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial
            color="#d4a846"
            emissive="#442200"
            emissiveIntensity={0.4}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Ceiling.jsx
 * ========================================
 * ダンジョンの天井を描画するコンポーネント。
 *
 * Floor（床）コンポーネントと対になる存在で、壁の高さ（wallHeight）の位置に
 * 水平な平面メッシュを配置する。
 * テクスチャはプロシージャルに生成された天井模様を使用。
 *
 * Three.js の概念:
 * - planeGeometry: 平面ジオメトリ。天井の板として使用。
 * - DoubleSide: マテリアルの描画面の設定。
 *   通常メッシュは「表面」だけ描画し、裏から見ると透明になる（パフォーマンス最適化）。
 *   DoubleSide にすると両面描画になり、下から見上げても天井が見える。
 * - rotation={[Math.PI/2, 0, 0]}: X軸に +90度（+π/2 ラジアン）回転。
 *   床は -π/2 で水平にしたが、天井は +π/2 で裏面が下を向くように配置。
 *   （DoubleSide を指定しているため、どちらの面も見える）
 */
import * as THREE from "three";
import { useMemo } from "react";
import { createTiledTexture, generateCeilingTexture } from "../systems/TextureGenerator";

/**
 * Ceiling コンポーネント
 *
 * @param {number} gridW - グリッドの横方向のセル数
 * @param {number} gridH - グリッドの縦方向のセル数
 * @param {number} cellSize - 1セルの大きさ（ワールド座標単位）
 * @param {number} wallHeight - 壁の高さ。天井はこの高さに配置される。
 */
export default function Ceiling({ gridW, gridH, cellSize, wallHeight }) {
  /**
   * 天井の実際のサイズを計算:
   * 床と同じく、グリッドのセル数 × セルサイズで全体の幅と奥行きを求める。
   */
  const width = gridW * cellSize;
  const depth = gridH * cellSize;

  /**
   * useMemo フック（天井テクスチャのメモ化）:
   * generateCeilingTexture で天井模様を生成し、キャッシュする。
   * 幅・奥行きが変わらない限り再生成しない。
   */
  const texture = useMemo(() => createTiledTexture(generateCeilingTexture, width, depth), [width, depth]);

  /**
   * 天井の描画:
   * - rotation={[Math.PI/2, 0, 0]}: 平面を水平にして天井として配置。
   * - position={[0, wallHeight, 0]}: 壁の高さ（wallHeight）の位置に設置。
   * - side={THREE.DoubleSide}: 両面描画。下から見上げても天井が見える。
   * - roughness={1}: 完全に粗い表面（光の反射なし）。
   * - metalness={0}: 完全に非金属。
   */
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]}>
      <planeGeometry args={[width, depth]} />
      {/* 床と同じく 4 頂点の巨大平面なので頂点スナップは適用しない（適用すると面全体が
          波打って見える）。詳細は docs/roadmap/PROJECT.md の Milestone 3.1 のメモを参照。 */}
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={1} metalness={0} />
    </mesh>
  );
}

/**
 * Floor.jsx
 * ========================================
 * ダンジョンの床を描画するコンポーネント。
 *
 * グリッドサイズに基づいて計算された幅・奥行きの平面メッシュを配置する。
 * テクスチャはプロシージャル（手続き的）に生成された石畳模様を使用。
 *
 * Three.js の概念:
 * - mesh: 3Dオブジェクトの基本単位。geometry（形状）と material（素材）を組み合わせて作る。
 * - planeGeometry: 平面のジオメトリ。args={[幅, 奥行き]} で大きさを指定。
 *   デフォルトではXY平面（垂直）に生成されるため、rotation で水平にする必要がある。
 * - meshStandardMaterial: 物理ベースの標準マテリアル。
 *   - map: テクスチャ画像を貼り付ける。ここでは石畳のテクスチャ。
 *   - roughness: 表面の粗さ（0.95 = 非常に粗い石の質感）。
 *   - metalness: 金属感（0 = 完全に非金属）。
 * - receiveShadow: このメッシュが他のオブジェクトからの影を受けるようにする設定。
 * - rotation={[-Math.PI/2, 0, 0]}: X軸に -90度（-π/2 ラジアン）回転させて水平にする。
 *   Three.js の角度はラジアン（弧度法）で指定する。180度 = π ラジアン。
 */
import { useMemo } from "react";
import { createTiledTexture, generateFlagstoneTexture } from "../systems/TextureGenerator";

/**
 * Floor コンポーネント
 *
 * @param {number} gridW - グリッドの横方向のセル数
 * @param {number} gridH - グリッドの縦方向のセル数
 * @param {number} cellSize - 1セルの大きさ（ワールド座標単位）
 */
export default function Floor({ gridW, gridH, cellSize }) {
  /**
   * 床の実際のサイズを計算:
   * グリッドのセル数 × 1セルの大きさ = ワールド座標での床全体の幅・奥行き
   */
  const width = gridW * cellSize;
  const depth = gridH * cellSize;

  /**
   * useMemo フック（テクスチャのメモ化）:
   * createTiledTexture で石畳テクスチャを生成し、結果をキャッシュする。
   * width や depth が変わらない限り、テクスチャは再生成されない。
   * generateFlagstoneTexture: 石畳模様をCanvas上にプロシージャル生成する関数。
   */
  const texture = useMemo(() => createTiledTexture(generateFlagstoneTexture, width, depth), [width, depth]);

  /**
   * 床の描画:
   * - rotation={[-Math.PI/2, 0, 0]}: planeGeometry はデフォルトで垂直（XY平面）なので、
   *   X軸に -90度 回転させて水平（XZ平面）にする。
   * - position={[0, 0, 0]}: 原点に配置。Y=0 が地面の高さ。
   * - receiveShadow: 影を受け取る設定。
   */
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  );
}

/**
 * Structure.jsx（DungeonWalls コンポーネント）
 * ========================================
 * ダンジョンの壁を効率的に描画するコンポーネント。
 *
 * 大量の壁（数百～数千個）を個別の mesh として描画すると処理が重くなるため、
 * Three.js の「InstancedMesh（インスタンスメッシュ）」を使って一括描画する。
 * InstancedMesh は同じ形状・同じ素材のオブジェクトを大量に描画する際に
 * GPUへの命令（ドローコール）を1回にまとめ、高いパフォーマンスを実現する技術。
 *
 * Three.js の概念:
 * - instancedMesh: 同じジオメトリ・マテリアルを共有しつつ、個別の位置・回転・スケールを持つメッシュの集合。
 * - boxGeometry: 直方体（箱型）のジオメトリ。壁のブロックに使用。
 * - instancedBufferAttribute: インスタンスごとに異なるデータ（ここでは色）を渡すための属性。
 * - Object3D: Three.js の基本3Dオブジェクト。ここでは位置の計算用ダミーとして使用。
 * - CanvasTexture: HTML Canvas から生成したテクスチャ。手続き的（プロシージャル）にテクスチャを作る。
 * - RepeatWrapping: テクスチャの繰り返しモード。タイル状にテクスチャを繰り返す。
 * - NearestFilter: テクスチャのフィルタリング。ピクセルをぼかさず、レトロなドット絵風の見た目にする。
 */
import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { generateStoneWallTexture } from "../systems/TextureGenerator";

/**
 * DungeonWalls コンポーネント
 *
 * @param {Array} wallPositions - 壁の位置データの配列 [{x, z}, ...]
 * @param {number} cellSize - グリッドの1セルのサイズ（壁1つの幅・奥行き）
 * @param {number} wallHeight - 壁の高さ
 */
export default function DungeonWalls({ wallPositions, cellSize, wallHeight }) {
  /**
   * useRef フック:
   * meshRef でインスタンスメッシュへの参照を保持する。
   * 各壁の位置を設定するために直接アクセスする。
   */
  const meshRef = useRef();

  const count = wallPositions.length;

  /**
   * useMemo フック（壁ごとの色のバリエーション生成）:
   * useMemo は計算コストの高い処理の結果をキャッシュ（メモ化）するフック。
   * 依存配列 [count] の値が変わらない限り、再計算されない。
   *
   *
   * ここでは各壁ブロックにわずかな色の違いを与え、単調さを解消している。
   * - Float32Array: 型付き配列。count × 3（RGB各成分）のバッファを作成。
   * - Math.sin(i * 13.37): 壁のインデックスごとに擬似ランダムな値を生成。
   *   13.37 のような「マジックナンバー」を掛けることで、規則的なパターンを避ける。
   * - variation: -0.05～+0.05 の範囲の微妙な色のゆらぎ。
   */
  const colorArray = useMemo(() => {
    const colors = new Float32Array(count * 3);
    const base = new THREE.Color("#7a6e60");
    for (let i = 0; i < count; i++) {
      const variation = (Math.sin(i * 13.37) * 0.5 + 0.5) * 0.1 - 0.05;
      const c = base.clone();
      c.r += variation; c.g += variation * 0.8; c.b += variation * 0.6;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    return colors;
  }, [count]);

  /**
   * useMemo フック（石壁テクスチャの生成）:
   * Canvas上にプロシージャル（手続き的）に石壁テクスチャを描画し、
   * Three.js の CanvasTexture に変換する。
   *
   * - wrapS / wrapT: テクスチャの水平・垂直方向の繰り返し設定。
   * - repeat.set(1, wallHeight / cellSize): 壁の高さに応じてテクスチャを縦に繰り返す。
   * - NearestFilter: 拡大・縮小時にピクセルを補間せず、ドット絵風のシャープな見た目にする。
   */
  const texture = useMemo(() => {
    const canvas = generateStoneWallTexture(42);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, wallHeight / cellSize);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    return tex;
  }, [cellSize, wallHeight]);

  /**
   * useEffect フック（各壁インスタンスの位置設定）:
   * InstancedMesh の各インスタンスにワールド座標での位置を設定する。
   *
   * Object3D のダミーオブジェクトを使って:
   * 1. 位置を設定（dummy.position.set）
   * 2. 変換行列を更新（dummy.updateMatrix）
   * 3. インスタンスの行列に代入（meshRef.setMatrixAt）
   *
   * 最後に instanceMatrix.needsUpdate = true で GPU に「データが更新された」と通知する。
   */
  useEffect(() => {
    if (!meshRef.current || count === 0) return;
    const dummy = new THREE.Object3D();
    wallPositions.forEach((pos, i) => { dummy.position.set(pos.x, wallHeight / 2, pos.z); dummy.updateMatrix(); meshRef.current.setMatrixAt(i, dummy.matrix); });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [wallPositions, wallHeight, count]);

  if (count === 0) return null;

  /**
   * 描画部分:
   * - <instancedMesh>: args={[null, null, count]} で、ジオメトリとマテリアルは子要素で指定し、
   *   インスタンス数を count に設定。frustumCulled={false} でカメラ外のカリング（非表示化）を無効化。
   * - <boxGeometry>: 壁の直方体形状。args={[cellSize, wallHeight, cellSize]} で幅・高さ・奥行きを指定。
   *   - <instancedBufferAttribute>: 各壁インスタンスに個別の色情報（colorArray）を渡す。
   * - <meshStandardMaterial>:
   *   - map={texture}: 石壁テクスチャを適用
   *   - vertexColors: 頂点カラー（instancedBufferAttribute で設定した色）を使用
   *   - flatShading: フラットシェーディングでレトロな見た目に
   *   - roughness={0.92}: 粗い表面（石の質感）
   *   - metalness={0.03}: ほぼ非金属
   */
  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
      <boxGeometry args={[cellSize, wallHeight, cellSize]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </boxGeometry>
      {/* PS1 風表現は PostFX 側のディザ + NearestFilter + Fog で出す方針。
          頂点スナップは画面ゆらぎが不快だったため不採用（PROJECT.md 3.1 参照）。 */}
      <meshStandardMaterial
        map={texture}
        vertexColors
        flatShading
        roughness={0.92}
        metalness={0.03}
      />
    </instancedMesh>
  );
}

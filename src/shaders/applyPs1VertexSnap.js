/**
 * applyPs1VertexSnap.js
 * ─────────────────────
 * 既存の Three.js マテリアル（meshStandardMaterial 等）に PS1 風の頂点スナッピングを
 * 注入するためのヘルパ。
 *
 * 既存のライティング・テクスチャ機能を温存したいので、シェーダ全体を書き換えるのではなく、
 * material.onBeforeCompile を使って Three.js の組み込みシェーダにチャンクを差し込む方針を採る。
 *
 * 使い方:
 *   const mat = new THREE.MeshStandardMaterial({ ... });
 *   applyPs1VertexSnap(mat, 96);
 *
 * R3F の宣言的マテリアルに対しては onUpdate 経由でも適用できる:
 *   <meshStandardMaterial onUpdate={(m) => applyPs1VertexSnap(m)} />
 */

// ?raw インポート（Vite 機能）で .glsl ファイルを文字列として取り込む。
// ファイル分離により GLSL のシンタックスハイライト・将来の差し替えがしやすい。
import ps1VertexChunk from "./ps1-vertex.glsl?raw";

/**
 * デフォルトのスナップ解像度。PS1 タイトルの実機解像度（256x224〜640x480）を意識した値。
 * 小さくしすぎると視認性が落ちるため、96 あたりを開始値として採用。
 */
export const PS1_SNAP_DEFAULT = 96.0;

/**
 * 既に処理済みのマテリアルを記録する WeakSet。
 * onBeforeCompile を何度も差し替えるとシェーダの再コンパイルが頻発するため、二度がけを避ける。
 */
const appliedMaterials = new WeakSet();

/**
 * マテリアルに PS1 頂点スナップを適用する。
 *
 * @param {THREE.Material} material - 対象マテリアル。meshStandardMaterial / meshBasicMaterial など
 * @param {number} [snapResolution] - スナップ解像度。0 で実質無効化
 */
export function applyPs1VertexSnap(material, snapResolution = PS1_SNAP_DEFAULT) {
  if (!material || appliedMaterials.has(material)) return;

  // ps1-vertex.glsl 内では `uniform float uPs1Snap;` 宣言とロジックが両方含まれているので、
  // 宣言部とロジック部に分けて挿入する。
  const lines = ps1VertexChunk.split("\n");
  const uniformDeclLine = lines.find((l) => l.trim().startsWith("uniform float uPs1Snap"));
  // ロジック部は uniform 宣言と空行を除いた残り
  const logicChunk = lines
    .filter((l) => !l.trim().startsWith("uniform float uPs1Snap"))
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPs1Snap = { value: snapResolution };

    // 1) 宣言を vertexShader 冒頭に挟む（#include <common> 直後）
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>\n${uniformDeclLine}`
    );

    // 2) project_vertex 後にスナップロジックを挿入
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>\n${logicChunk}`
    );
  };

  // onBeforeCompile を差し替えた直後はシェーダを再コンパイルする必要がある
  material.needsUpdate = true;
  appliedMaterials.add(material);
}

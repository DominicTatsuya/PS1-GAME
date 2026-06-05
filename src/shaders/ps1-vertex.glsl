// PS1 風頂点スナッピング用 GLSL チャンク
// =============================================
// クリップ空間で xy 座標を低解像度に量子化することで、PS1 がサブピクセル精度を
// 持っていなかったがゆえに発生していた「ポリゴンの頂点がジリジリ揺れる」効果を再現する。
//
// uPs1Snap が大きいほど高解像度（揺れが少ない）、小さいほど低解像度（揺れが激しい）。
// 経験的に 64〜128 あたりが PS1 らしい。0.0 を渡すとスナップを無効化する。
//
// このファイルは applyPs1VertexSnap.js から `?raw` インポートされ、
// onBeforeCompile で MeshStandardMaterial の `#include <project_vertex>` 直後に挿入される。

uniform float uPs1Snap;

// project_vertex 後に gl_Position が確定しているので、これを書き換える。
// NDC に正規化 → 量子化 → 元のクリップ空間 (* w) に戻す。
if (uPs1Snap > 0.0) {
    gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uPs1Snap) / uPs1Snap * gl_Position.w;
}

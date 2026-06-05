/**
 * PostFX.jsx — PS1 風ポストプロセス（Phase 3.3）
 *
 * @react-three/postprocessing の EffectComposer を使い、シーン全体に薄く効果をかける。
 * 既に `<Canvas dpr={0.65} antialias={false}>` と CSS スキャンラインで
 * PS1 感は出ているので、ポストプロセスは「ほんの少し足す」程度に留める。
 *
 * 効果の意図:
 *   - Bloom        : 松明・ランタンの淡い滲み
 *   - Noise        : 微弱なアナログ TV ノイズ
 *   - Vignette     : 画面四隅の暗化（既存のフォグと相乗）
 *
 * 切る場合: <DungeonScene> の上に PostFX を置かないだけで OK（App.jsx を編集する）。
 * `ENABLED` を false にしてもショートサーキットされる。
 */

import { EffectComposer, Bloom, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

/**
 * このコンポーネント自体を ON/OFF するスイッチ。
 * パフォーマンス低下や視覚崩れが起きたら一時的に false にする。
 */
const ENABLED = true;

export default function PostFX() {
  if (!ENABLED) return null;

  return (
    // multisampling=0 で MSAA を無効化（PS1 のジャギー感を維持するため）
    <EffectComposer multisampling={0} disableNormalPass>
      {/* Bloom: 強度を低めに。松明・ランタン・アイテムグローのにじみだけ拾う */}
      <Bloom
        intensity={0.35}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      {/* Noise: 非常に弱め。Average ブレンドで色味を変えない */}
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.12} />
      {/* Vignette: 画面四隅を軽く落とす。既存の fog と二重がけにならない範囲で */}
      <Vignette darkness={0.55} offset={0.35} eskil={false} />
    </EffectComposer>
  );
}

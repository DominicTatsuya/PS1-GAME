# PS1_REDESIGN.md — PS1 表現パイプライン再設計（複数セッション継続作業）

このドキュメントは Phase 3「PS1 表現の深化」を **実装に値する形で完遂する** ための
作業計画と引き継ぎ資料。 2026-06-08 の長セッションで複数回の失敗を経て方針を固め直し、
**複数セッションをまたいで段階的に検証していく前提** で書かれている。

---

## ⚠️ 新しいセッションを開始した Claude へ

以下を **作業前に必ず実施** してください。

1. **本ドキュメントを最後まで通読する**。失敗履歴・禁忌・現在地が他のドキュメントにない形でここに集約されている。
2. **§4 進捗ログ** で最新の Step 状態を把握する。「最後に何をした」「次に何をする」が分かる。
3. **§3 禁忌** に書かれているパターンは絶対に提案・実装しない。これらは過去のセッションで実装→却下された遺産。
4. PS1 表現に関わる新提案を出す前に **§2 のステップ計画に沿っているか** をセルフチェックする。沿っていなければ提案前に本ドキュメントを更新する。
5. Step が完了するたびに **§4 進捗ログ** に行を追加する。撤退・パラメータ変更も全て履歴として残す。

ユーザは「セッションをまたいでも同じ判断ができる」状態を望んでいる。本ドキュメントは
**Claude が PS1 関連で迷ったときの単一の真実の源 (source of truth)** として運用する。

---

## 1. 背景：なぜ再設計するのか

過去の試行は「単独の PS1 風効果」を継ぎ足しで載せる方向で進んでいたが、
以下の連続失敗でユーザに却下された:

| 試行 | 適用範囲 | 却下理由（ユーザ原文より要約） |
|---|---|---|
| 頂点スナップ + アフィン UV | 壁・床・天井 | 「テクスチャがカメラ位置が近づくにつれて波打つように縮小される。失敗だな」 |
| 頂点スナップ (Floor/Ceiling 含む) | 全コンポーネント | 「床が波打っており、カメラ移動で違和感のある挙動」 |
| 頂点スナップ (壁・小物のみ) | 壁・敵・罠・トーチ・ドア・鍵・アイテム・ゴール | 「壁がぐらぐら不安定に揺れるのは違和感の方が勝つ」「PS1 風と言えば聞こえはいいがストレス要素にも見える」 |
| Bayer 4x4 ディザ (PostFX 最終段) | 全画面 | 「ブロックノイズに近く、PS1 のグラフィック再現になっていない」「ただ画面の前面に荒い縞模様が薄く表示されているだけ」 |

### 失敗の根本原因（調査結果）

Web 調査（[romanliutikov](https://romanliutikov.com/blog/ps1-style-graphics-in-threejs) /
[David Colson](https://www.david-colson.com/2021/11/30/ps1-style-renderer.html) /
[dsoft20/psx_retroshader](https://github.com/dsoft20/psx_retroshader) /
[Codrops jitter shader](https://tympanus.net/codrops/2024/09/03/how-to-create-a-ps1-inspired-jitter-shader-with-react-three-fiber/) /
[three.js forum](https://discourse.threejs.org/t/affine-texture-mapping-in-shader-ps1-style-graphics/5945)）
の結果、 **PS1 の見た目は単独効果ではなく以下の組み合わせ全体** であることが確定:

1. **低い内部レンダー解像度** (320〜640px) → upscale
2. **メッシュのテッセレーション**（大ポリゴンは subdivide）
3. **頂点スナップ** (固定小数点の副作用)
4. **アフィンテクスチャマッピング** (遠近補正なし)
5. **強いフォグ** (描画距離隠しと空気感)
6. **カラー量子化＋ハードウェアディザ** (R5G6B5 出力)
7. **頂点ライティング (Gouraud)**

特に重要な発見:
- **`dsoft20/psx_retroshader` の README が「大ポリゴンは subdivide してから snap・affine を掛けろ」と明記している**。 前回の試行はこれを知らずに `planeGeometry(w, h)`（頂点 4 個の巨大平面）のまま snap/affine を載せたため、面全体が波打って崩壊した。
- 過去の dither は `gl_FragCoord` 4x4 mod でレンダーターゲット解像度に張り付いていたため、modern 高解像度では「目に見えない細かいノイズ」になってしまった。**PS1 native 解像度（320px 域）の RT に直接掛ける必要がある**。

ユーザは **Bloodborne PSX 的な「動的アーティファクトに頼らない静的ローファイ感」** を
求めている。 過去の試行で動的に揺れる/歪む系の効果は全て却下されたが、その原因は
**(1)(2) という土台が無いまま (3)(4)(6) を載せて浮いて見えたから** であり、土台を
整えれば snap/affine も再挑戦の余地がある（が、失敗したらまた撤退する前提で進める）。

---

## 2. 6 ステップの実装計画

各 Step の完了後に **ユーザの目視確認** をはさみ、OK なら次に進む。
NG ならまず Step 内でパラメータ調整、それでも NG なら撤退して §3 禁忌に追記する。

> 重要: 一度に複数 Step を進めない。 ユーザの目視確認をすっ飛ばすと、また「ブロックノイズに近く何の意図か分からない」のような結果になる。

### Step 1: 内部レンダー解像度を PS1 域に固定 ✅ 実装完了（目視確認待ち）

- **実装ファイル**: `src/App.jsx`
  - 定数 `PS1_TARGET_WIDTH = 480`（PS1 native 320〜640 の中間値）
  - `App` コンポーネント内 `ps1Dpr = useMemo(() => Math.min(0.65, PS1_TARGET_WIDTH / window.innerWidth), [])`
  - `<Canvas dpr={ps1Dpr}>` に切り替え（旧 `dpr={0.65}`）
- **既存依存**: `src/styles/App.css` の `image-rendering: pixelated`（既存）で NearestFilter upscale が効く
- **目的**: 画面幅問わず内部レンダー幅 ~480px に固定。 旧 dpr=0.65 は modern 解像度に依存するため PS1 風効果が浮いてしまう問題を解消する土台
- **数値の調整**:
  - `PS1_TARGET_WIDTH = 320` → より粗い（Silent Hill SD 出力相当）
  - `PS1_TARGET_WIDTH = 640` → 控えめ（PS1 高解像度モード）

### Step 2: Floor / Ceiling を per-cell に subdivide ⏸ 待機

- **修正ファイル**: `src/components/Floor.jsx` / `src/components/Ceiling.jsx`
- **変更**: `<planeGeometry args={[width, depth]} />` → `<planeGeometry args={[width, depth, gridW, gridH]} />`
  - `gridW` / `gridH` は `dungeon` から渡ってくる（既に props 経由）
- **目的**: 後段の snap/affine の歪みが各 cell 内に閉じるようにする
- **注意点**:
  - 頂点数が 4 → `(gridW+1) × (gridH+1)` になる（例: 41×41 グリッドなら 1681 頂点）
  - FPS への影響を要計測（low-res RT 上で動くので影響は限定的なはず）
  - テクスチャの UV は 0..1 のまま自動分配されるので、tile repeat 設定は据え置きで OK
- **検証ポイント**: 見た目は Step 1 直後とほぼ同じはず。 ワイヤフレーム表示で頂点が増えていることだけ確認したい場合は dev tool で

### Step 3: 頂点スナップを再導入（テッセレート済みメッシュ前提） ⏸ 待機

- **復活させるファイル**: `src/shaders/ps1-vertex.glsl` + `src/shaders/applyPs1VertexSnap.js`（過去セッションで削除済み。git 履歴から復元するか、新規再実装）
- **対象**: テッセレート済みの Floor / Ceiling / Structure（壁）
- **適用例**: 各 `<meshStandardMaterial onUpdate={(m) => applyPs1VertexSnap(m)}>` で注入
- **重要な前提**:
  - 低解像度 RT（Step 1）の上に乗るため snap 解像度（`PS1_SNAP_DEFAULT`）は控えめでも視覚的に馴染むはず
  - PS1 ハードウェアの snap も低解像度出力に対応していたから「揺れが画面解像度に対して相対的に大きい」状態が PS1 感だった
- **ヘルパは onBeforeCompile をチェイン**: 過去実装で複数効果を重ねがけできるよう既存 `onBeforeCompile` を保存して呼び出す形にしてある。 同パターンを踏襲
- **却下リスク**: ここで「壁がぐらぐら揺れて不快」と言われたら Step 1 の dpr を更に下げる（320 域）か、撤退して §3 禁忌に追記

### Step 4: アフィンテクスチャマッピングを再導入 ⏸ 待機

- **復活させるファイル**: `src/shaders/ps1-affine.glsl` + `src/shaders/applyPs1AffineTexture.js`（過去セッションで削除済み）
- **対象**: テッセレート済みメッシュ（cell 内に歪みが閉じることを期待）
- **過去実装メモ**:
  - 頂点シェーダで `vAffineMapUv = vMapUv * gl_Position.w; vAffineW = gl_Position.w;` を varying として出力
  - フラグメントシェーダで `<map_fragment>` を置換、`vAffineMapUv / vAffineW` でテクスチャをサンプル
  - vertex 上部 `#include <common>` 直後に varying 宣言、vertex `#include <project_vertex>` 直後にロジック、fragment `#include <common>` 直後に varying 宣言、fragment `#include <map_fragment>` を置換
  - 詳細は git 履歴の `src/shaders/ps1-affine.glsl` と `applyPs1AffineTexture.js`
- **却下リスク**: テッセレーションが効いていれば cell 内の歪みになるはずだが、それでも「波打って見える」と言われたら撤退

### Step 5: ディザを低解像度 RT に乗せる ⏸ 待機

- **過去の失敗**: PostFX 最終段で `gl_FragCoord` 4x4 mod → modern 解像度上で細かいブロックノイズ化
- **新方針**: Step 1 の低解像度バッファに対して直接ディザを当てる
  - 実装案 A: 専用の RenderPipeline を組み、scene → low-res RT → dither → upscale という順序
  - 実装案 B: `EffectComposer` の `multisampling` と独自パスでサンプル位置を低解像度に合わせる
  - **どちらにするかは Step 4 完了後に再調査して決める**
- **量子化レベル**: PS1 R5G6B5 を模して R=32, G=64, B=32 にするか、簡易に 16 段階一律
- **必須条件**: dither の見た目が「画面前面の格子」ではなく「テクスチャ内の縞」に見えること

### Step 6: fog 値の調整 ⏸ 待機

- **対象**: `src/App.jsx` の `<fog attach="fog" args={["#141210", 8, 32]} />`
- **候補**: BBPSX 寄り `(6, 22)` などへ濃く
- **タイミング**: 全パイプライン（Step 1〜5）が揃ってから最終調整。 途中で動かすと他 Step の評価が混ざる

---

## 3. 禁忌（絶対に再提案しない）

新しいセッションでも以下は **提案・実装してはいけない**。 全てユーザ却下済み。

| # | 禁忌パターン | 却下日 | 却下理由 |
|---|---|---|---|
| 1 | Floor/Ceiling を `planeGeometry(w, h)` のまま snap | 2026-06-08 | 4 頂点平面で面全体が波打つ |
| 2 | dpr が現状（〜0.65）の状態で snap だけ追加 | 2026-06-08 | modern 解像度上で snap だけ浮いて違和感 |
| 3 | アフィン UV を snap 抜きで単独導入 | 2026-06-08 | snap との相互作用で UV が飛ぶ→撤回したが、単独でも歪みが目立つ可能性大 |
| 4 | `gl_FragCoord` ベースの dither を EffectComposer 最終段に載せる | 2026-06-08 | 「ブロックノイズに近い」「PS1 再現になっていない」 |
| 5 | 「PS1 風」のラベルだけで根拠なく効果を提案する | 2026-06-08 | ユーザは表現の理由と効きを問う |
| 6 | 動的に揺れる / フレームごとに変化する系効果を、解像度ダウンサンプル無しで導入 | 2026-06-08 | 一貫してストレス要素として却下されてきた |

新たな失敗があれば **この表に追記** すること（次の Claude が同じ罠を踏まないため）。

---

## 4. 進捗ログ

| 日付 | Step | 状態 | 備考 |
|---|---|---|---|
| 2026-06-08 | 過去試行: vertex snap → affine → snap 段階展開 → dither | 全て撤退 | §1 失敗履歴と §3 禁忌に集約済み |
| 2026-06-08 | Step 1 | 実装完了・**目視確認待ち** | `PS1_TARGET_WIDTH=480` / `ps1Dpr` 導入。 `/verify` グリーン |
| 2026-06-09 | Step 1 | **目視確認 OK** | `develop` へマージ済み（`b9f68b4`）。 ユーザ評価「今までで一番いい状態のグラフィック」 |
| 2026-06-09 | Step 6（先行部分実施） | fog `(8, 32)` で運用中・暫定 OK | `b9f68b4` で fog 値を確定。 ユーザ評価「松明の炎がローポリ風で揺れて見える」「遠近感のあるフォグ」。 全 Step 完了後に最終調整余地あり |

新しい Step を完了させたら **必ずこの表に行を追加** すること。

---

## 5. チューニングノブ一覧

現存する PS1 表現関連のパラメータ（変更したらこの表を更新）:

| ファイル:行 | 変数 | 現在値 | 用途 |
|---|---|---|---|
| `src/App.jsx:約30` | `PS1_TARGET_WIDTH` | `480` | 内部レンダー解像度の目標横幅。 320=粗い / 480=中 / 640=控えめ |
| `src/App.jsx` `<fog ...>` | fog near / far | `8, 32` | 描画距離。 2026-06-09 に先行調整・暫定値（ユーザ評価良好）。 Step 2〜5 が揃った後に再最終調整の可能性あり |
| `src/App.jsx` `<Canvas ...>` | `gl.antialias` | `false` | アンチエイリアス無効（変更厳禁） |
| `src/styles/App.css:32` | `image-rendering: pixelated` | (有効) | NearestFilter upscale（変更厳禁） |

未実装（Step 進行に伴い追加される予定）:
- `applyPs1VertexSnap` の snap 解像度（Step 3 で復活）
- `applyPs1AffineTexture` の有効/無効（Step 4 で復活）
- ディザの levels / strength / 適用方式（Step 5 で再設計）

---

## 6. 参照（調査ソース）

- [PS1 style graphics in Three.js — Roman Liutikov](https://romanliutikov.com/blog/ps1-style-graphics-in-threejs) — three.js での実装手順を網羅
- [Building a PS1 style retro 3D renderer — David Colson](https://www.david-colson.com/2021/11/30/ps1-style-renderer.html) — PS1 ハードウェアの原理から実装まで。 GLSL コード例あり
- [How to Create a PS1-Inspired Jitter Shader — Codrops](https://tympanus.net/codrops/2024/09/03/how-to-create-a-ps1-inspired-jitter-shader-with-react-three-fiber/) — R3F 専用の jitter shader 実装
- [dsoft20/psx_retroshader — GitHub](https://github.com/dsoft20/psx_retroshader) — **「大ポリゴンは subdivide してから snap・affine」を README に明記**。 本再設計の鍵
- [Affine Texture Mapping in shader — three.js forum](https://discourse.threejs.org/t/affine-texture-mapping-in-shader-ps1-style-graphics/5945) — three.js コミュニティでのアフィン UV 議論
- [PSX-Core Shader — Minecraft](https://www.curseforge.com/minecraft/shaders/psx) — Minecraft 向け実装の参考

---

## 7. 検証プロトコル

各 Step 完了時に以下を順に実施:

1. `/verify` skill で lint + test + build がグリーンか確認
2. **ユーザに `npm run dev` での目視確認を依頼**（このとき「何を見てほしいか」を明示する。 例: 「壁テクスチャが安定しているか」「FPS が落ちていないか」）
3. ユーザ判定が OK なら次の Step へ、NG ならまず Step 内でパラメータ調整
4. パラメータ調整でも NG なら、**撤退して §3 禁忌に追記**（何故ダメだったかも残す）
5. Step 進行に応じて §4 進捗ログと §5 チューニングノブを更新

`/verify` は本リポジトリ専用 skill（`.claude/skills/verify/SKILL.md`）。 Node v20.19+ で
動作する。 Node v14 系では `Object.hasOwn` や `??=` で失敗するため、ユーザに
`nvm use 20.19.4` を依頼すること（Claude 側からは管理者権限で実行不可）。

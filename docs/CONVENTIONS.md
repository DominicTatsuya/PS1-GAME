# CONVENTIONS.md — コーディング規約

このドキュメントは、Claude Code が本リポジトリでコードを書く際に従うべき **プロジェクト固有の規約** を定めています。
一般的な「良い書き方」ではなく、**この既存コードベースと一貫させるためのルール** に絞ってあります。

---

## 1. コメント

### 1.1 言語
- **コメントはすべて日本語で記述する。**
- 既存ファイルが日本語コメントで統一されているため、英語や英日混在は避ける。
- 例外: 技術用語（`useState`, `InstancedMesh`, `BFS` など）はそのまま英語で OK。

### 1.2 コメントの量
- 既存コードは JSDoc + 段落コメントが豊富に付与されている。これは「学習用として読めるコード」という意図。
- **既存ファイルを編集する場合は、周辺と同等の密度でコメントを書く。**
- 新規ファイルでも、学習者が読んで理解できる粒度を目指す（関数ごとに JSDoc + ブロックごとに段落コメント）。
- CLAUDE.md のグローバルルールでは「コメントは最小限」とあるが、**このプロジェクトに限ってはコメントを多めに書く** のが規約。

### 1.3 コメントに書くべきこと
- なぜその実装をしたのか（WHY）
- Three.js / React の概念の説明（学習者向け）
- ハマりやすい罠（例: `useFrame` で setState しない理由）

### 1.4 コメントに書くべきでないこと
- タスク管理情報（「TODO: 後で直す」のような期限付きメモ — 代わりに `docs/roadmap/PROJECT.md` or `docs/ISSUES.md` に書く）
- PR/Issue 番号（git log を見れば分かるので）

---

## 2. 命名

### 2.1 ファイル
- React コンポーネント: PascalCase + `.jsx`（例: `PlayerController.jsx`, `CollectibleItem.jsx`）
- 非コンポーネントのモジュール: PascalCase + `.js`（例: `MapGenerator.js`, `TextureGenerator.js`）
  - ※ これは少し変則的だが既存コードの慣例。維持する。
- 設定・データファイル: camelCase + `.js`（例: `config.js`）
- スタイル: PascalCase + `.css`（例: `App.css`）

### 2.2 変数・関数
- 一般変数・関数: camelCase（`playerPosRef`, `generateDungeon`）
- React コンポーネント: PascalCase（`DungeonScene`, `GameUI`）
- 定数オブジェクト: UPPER_CASE（`MAZE`, `PLAYER`, `ITEMS`）
- ref: `〜Ref` サフィックス（`playerPosRef`, `cameraYawRef`）

### 2.3 grid / world 座標
- グリッド座標: `gx`, `gy`（例: `{ gx: 3, gy: 5 }`）
- ワールド座標: `x`, `z`（Y は上方向なので位置 x/z で表現）
- 混乱を避けるため、変換を挟む場合は必ず `gridToWorld` / `worldToGrid` を通す

---

## 3. React の使い方

### 3.1 state vs ref（最重要）
**「毎フレーム更新する値は ref、UI 表示に必要な値は state」** が鉄則。
詳細は `docs/ARCHITECTURE.md` 第 2 章。

### 3.2 useMemo / useCallback の使い方
- 重い計算（ダンジョン生成・テクスチャ生成）は必ず `useMemo`
- 子コンポーネントに props で渡すコールバックは `useCallback`
- ただし、無闇な useMemo は逆効果。React のルールに従い「本当に必要か」を毎回判断する

### 3.3 useEffect の cleanup
- `addEventListener` / `setInterval` を useEffect で使うときは **必ず cleanup 関数で解除する**
- 既存コードはこのルールを守っている。新規追加時も守ること

### 3.4 コンポーネントの責務分離
- `App.jsx`: 状態管理のハブ。描画ロジックは持たせない
- `DungeonScene`（`App.jsx` 内）: 3D シーンの組み立てのみ
- `*UI/*.jsx`: HTML UI のみ。Three.js オブジェクトを含まない
- `components/*.jsx`（Structure, Floor, ...）: Three.js オブジェクトを返す。状態更新ロジックは最小限

---

## 4. React Three Fiber

### 4.1 Canvas 外で R3F 要素を使わない
- `<ambientLight>`, `<mesh>`, `<pointLight>` などは `<Canvas>` の中でしか機能しない
- 新規追加時は `DungeonScene` 内、または `<Canvas>` 内のコンポーネントに追加する

### 4.2 useFrame 内のルール
- 重い処理を入れない（毎フレーム実行されるため）
- `new` を避ける（Issue #6 参照）
- `setState` を呼ばない
- `camera.getWorldDirection` などの Three.js API は引数に使い回しベクトルを渡す

### 4.3 Three.js オブジェクトの使い捨て
- `CanvasTexture`, `BufferGeometry`, `Material` は `useMemo` でキャッシュ
- 一度も useMemo しないで JSX の attribute として直接生成すると、毎レンダで作り直されて重い

---

## 5. ファイル構成の暗黙ルール

- `src/components/` は描画責務のコンポーネント（Three.js or React の見た目）
- `src/components/UI/` は HTML UI
- `src/systems/` は純粋関数ライブラリ（React に依存しない）
- `src/data/` は定数・設定データ
- `src/styles/` は CSS
- `src/shaders/` は GLSL（現状空。使うなら vertex/fragment shader）
- `src/assets/` は画像・アイコン等
- **`src/utils/` はまだ存在しない。** 小さなユーティリティ関数は暫定的に使う側のファイルの先頭に置いて OK。3 箇所以上で使い回すようになったら `src/utils/` を切る。

---

## 6. export ルール

### 6.1 関数の公開範囲
- `MapGenerator.js` の export 済み関数は「公開 API」。これらのシグネチャを壊さないこと（呼び出し元が複数ある）。
  - `generateDungeon`, `gridToWorld`, `worldToGrid`, `checkGridCollision`, `findDeadEnds`, `findJunctions`, `bfsFarthest`, `generateMaze`
- 内部ヘルパ（`mulberry32` など）は export しない

### 6.2 コンポーネントの export
- コンポーネントは必ず `export default`
- 同一ファイル内のサブコンポーネント（`Compass` など）は named function でファイル内に留める

---

## 7. 文字列リテラル

### 7.1 色
- **`#rrggbb` の 6 桁 16 進** で統一（既存コードは全て 6 桁）
- Three.js の色指定は `"#ffeedd"` 形式の文字列 or `new THREE.Color("#ffeedd")`
- `"red"` などの色名リテラルは使わない

### 7.2 UI テキスト
- 日本語で記述（例: `[E] アイテム取得`, `ダンジョンクリア`）
- 英語の操作名（W/A/S/D, ESC, E）はそのまま英字で OK

---

## 8. Git コミットメッセージ

README や既存コミットの雰囲気から、以下の規約：

- `type: 本文` 形式（`fix:`, `feat:`, `refactor:`, `docs:` など）
- 本文は日本語で OK（既存コミットが日本語）
- 例: `fix: 松明の配置・光源・外観を大幅改善`

### 8.1 Claude Code がコミットを作る場合
- `.claude/settings.json` の deny ルールにより、Claude は `git add` / `git commit` を**一切実行できない**（ユーザに「コミットして」と言われた場合でも）。詳細は `CLAUDE.md`「Claude とユーザの役割分担」を参照
- Claude はコミットを代行する代わりに、ユーザがそのまま実行できる具体的なコマンド（Co-Authored-By フッタを含むコミットメッセージ込み）を提示する

---

## 9. ESLint ルールの要点

`eslint.config.js` より：

- `js.configs.recommended` 準拠
- `react-hooks/recommended-latest` 準拠（useEffect の依存配列警告など）
- `react-refresh/vite` 準拠（HMR 対応）
- カスタムルール: `no-unused-vars` は `^[A-Z_]` にマッチする識別子を除外
  - → 大文字始まりのコンポーネント import や定数は未使用でも警告にならない

**作業後は必ず `npm run lint` を実行し、警告ゼロを保つ。**

---

## 10. 依存追加のポリシー

### 10.1 依存を増やす前に検討すべきこと
- 本当に必要か（標準 API や既存ライブラリで解決できないか）
- バンドルサイズへの影響（Three.js ですでに重い）
- メンテナンス状態（直近 1 年で更新があるか）

### 10.2 推奨ライブラリ
機能追加で以下は採用候補：

| 用途 | 推奨 | 備考 |
|------|------|------|
| ポストプロセス | `@react-three/postprocessing` | Bloom/CRT など |
| アニメーション | 既存の `useFrame` | 追加不要 |
| サウンド | Web Audio API 直 | ライブラリ追加不要で十分 |
| 状態管理 | React hooks のみ | Redux/Zustand は過剰 |
| テスト | `vitest` | Vite とシームレス |

### 10.3 避けたいライブラリ
- `three` の別バージョン（既に `^0.180.0` で固定。`@react-three/fiber` との互換性を崩さない）
- 重厚な UI フレームワーク（MUI, Chakra 等 — PS1 風とのトンマナが合わない）

---

## 11. ドキュメントの更新タイミング

Claude Code は以下のタイミングで `docs/` 配下を更新する：

| イベント | 更新するファイル |
|----------|------------------|
| Issue を解決した | `docs/ISSUES.md`（該当項目を削除 or 解決済みへ） |
| 新しいバグ・不整合を発見した | `docs/ISSUES.md`（追記） |
| マイルストーンを完了した | `docs/roadmap/PROJECT.md`（完了済みへ移動） |
| アーキテクチャに関わる変更をした | `docs/ARCHITECTURE.md`（該当節を更新） |
| 新しい規約が生まれた | このファイル（`CONVENTIONS.md`） |
| 意味のある区切りの作業が完了した | `docs/HANDOFF.md`（§5 セッションログに 1 行追記） |
| 上記に該当しないが重要な変更をした | `CLAUDE.md` のトップレベル（最小限に） |

**docs の更新はコード変更と同じコミットに含める。** 別コミットにすると「コードと docs が乖離している期間」が発生する。

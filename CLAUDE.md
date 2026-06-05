# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

このドキュメントは、Claude Code が本リポジトリで作業する際の入口となるガイドです。
詳細な情報は `docs/` 配下のドキュメントに分割してあるので、用途に応じて参照してください。

## 関連ドキュメント

| ファイル | 用途 |
|----------|------|
| `docs/README.md` | docs/ 全体の索引と階層構造の説明 |
| `docs/ARCHITECTURE.md` | ゲーム全体のアーキテクチャ・状態管理・データフローの詳細 |
| `docs/roadmap/PROJECT.md` | 今後の実装方針と優先度付きタスクリスト（Phase 順） |
| `docs/roadmap/CAREER.md` | 本プロジェクトを学習媒体としたキャリア習得計画（SRE 転向） |
| `docs/ISSUES.md` | 既知の不具合・壊れているコード・修正が必要な箇所 |
| `docs/CONVENTIONS.md` | コーディング規約・コメント言語・命名ルール |
| `docs/infra/` | Phase 4 以降の運用・インフラ系ドキュメント置き場（現状ほぼ空） |
| `README.md` | ユーザー向けのプロジェクト紹介・操作方法 |

**作業開始前に必ず `docs/ISSUES.md` と `docs/roadmap/PROJECT.md` を確認してください。** 既に把握されている不具合や進行中のタスクを把握してから作業することで、重複や競合を避けられます。

**AWS / IaC / SRE 関連の作業を行う場合は `docs/roadmap/PROJECT.md` の「Claude Code への作業方針（重要）」も必ず読んでください。** 一括生成を避け、段階的・レビュー可能な手順で進めるという特別な方針が設定されています。

## よく使うコマンド

リポジトリルートで実行してください。

| コマンド | 用途 |
|----------|------|
| `npm run dev` | Vite 開発サーバを起動（http://localhost:5173） |
| `npm run build` | `dist/` に本番用ビルド |
| `npm run preview` | ビルド済みバンドルをローカル配信 |
| `npm run lint` | ESLint 実行（テストランナーは未導入） |

### ビルドツールの注意点

- `package.json` の `overrides` により Vite は `rolldown-vite` にピン留めされています。特別な理由なく通常の `vite` に戻さないでください。
- `vite.config.js` の `chunkSizeWarningLimit` を 1200 に引き上げているのは、Three.js が大きく、かつ `rolldown-vite` が `manualChunks` のオブジェクト構文に未対応であるためです。
- `tsconfig.json` はエディタの型チェック補助用です（`allowJs: true` / `strict: false` / `noEmit: true`）。フロントのソースは `.jsx` / `.js` のままで、TypeScript への移行は未着手です。

### Lambda バックエンド（`lambda/`）

スコアランキング用の DynamoDB バックエンドです。`handler.ts` は POST `/scores` と GET `/scores/top` を実装済みで、`npm run typecheck` / `npm run build` ともに通る状態です。**ただしフロント側からの送信コードは未実装**のため、事実上未接続です（`docs/ISSUES.md` #15）。AWS 環境への実デプロイは `docs/roadmap/PROJECT.md` の Phase 4 で対応予定。

| コマンド | 用途 |
|----------|------|
| `cd lambda && npm run typecheck` | `tsc --noEmit` で型チェックのみ |
| `cd lambda && npm run build` | esbuild で `lambda/dist/handler.js` を生成 |
| `cd lambda && npm run build:zip` | Lambda デプロイ用 zip を生成 |

DynamoDB のテーブル設計・GSI・CLI 作成例は `lambda/DYNAMODB.md` に記述済みです。

## アーキテクチャ概要（短縮版）

詳細は `docs/ARCHITECTURE.md` を参照。ここでは最も重要な点だけを記載します。

### 1. 状態管理の基本則 — ref と state を使い分ける

`src/App.jsx` がゲーム全体の状態の一元管理者です。**毎フレーム更新される値は `useRef` に格納し、`useFrame` 内では直接 state を更新してはいけません。** React の再レンダリングが毎フレーム走ると画面が壊れます。

- `useState` — UI 表示更新が必要なもの：`score`, `itemCount`, `isLocked`, `cleared`, `elapsedTime`, `stamina`, `nearItem`, `seed`
- `useRef` — 毎フレーム読み書きされるもの：`playerPosRef`, `staminaRef`, `cameraYawRef`, `exploredRef`, `collectedItemsRef`

ref に書いた値を UI に反映する場合は `setInterval`（100ms 周期）で state にコピーする、という橋渡しを `App.jsx` の `useEffect` 内で行っています。新しい毎フレーム値を追加する時も同じパターンで実装してください。

### 2. ダンジョン生成は `seed` で決まる

`src/systems/MapGenerator.js` の `generateDungeon(seed)` が全ての元です。`seed` が同じなら迷路・アイテム位置・松明配置は完全に再現されます（`mulberry32` という擬似乱数 + recursive backtracker による迷路生成）。

- 迷路リセットは `setSeed(Date.now())` で行う。
- グリッド座標 `(gx, gy)` とワールド座標 `(x, z)` の変換は `gridToWorld` / `worldToGrid` を必ず使う。
- 壁との衝突判定は `checkGridCollision`（Circle-vs-AABB）。X 軸と Z 軸を独立判定して壁すべりを実現している。
- グリッド構造: `(mazeW*2+1) × (mazeH*2+1)`、奇数座標がセル、偶数座標が壁、`grid[y][x] === 1` で壁。

### 3. PS1 風の見た目は複数の要素で成立している

- `<Canvas>` の `dpr={0.65}`（解像度ダウン）
- `gl.antialias: false`（ジャギー感）
- `fog` の距離 8〜32（暗く狭い視界）
- 壁テクスチャは `src/systems/TextureGenerator.js` が Canvas 上で手続き生成（画像アセットなし）
- 壁は `InstancedMesh`（`src/components/Structure.jsx`）で一括描画。これを個別 Mesh に変えるとパフォーマンスが落ちるので避ける。
- CSS のスキャンライン・ビネット効果は `src/styles/App.css` の `.scanlines` クラスで付与。

### 4. 入力系

`@react-three/drei` の `PointerLockControls` がカメラを占有しています。クリックでロック → ゲーム開始、ESC で解除。`onLock` 内で `cleared` 状態なら自動的にリスタートする、というのが「クリックで再挑戦」の仕組みです。

WASD と Shift は `PlayerController.jsx` 内で `document` に直接 keydown/keyup リスナを張って処理しています。

## プロジェクト固有の規約

詳細は `docs/CONVENTIONS.md` を参照。要点のみ：

- **コメントは日本語で書く。** 既存ファイルに合わせてください。
- `src/systems/MapGenerator.js` で `export` されている関数が公開 API。`mulberry32` などの内部ヘルパはエクスポートしない。
- ESLint の `no-unused-vars` は `^[A-Z_]` にマッチする識別子（大文字始まりの定数や PascalCase インポート）を無視する設定。
- 新しい Three.js オブジェクトは `<Canvas>` 配下の `DungeonScene` に追加する（R3F の要素は Canvas 内でしか有効ではない）。

## 設計上の落とし穴（初見では気づきにくいもの）

1. **AWS バックエンドはまだ存在しない。** Lambda（`lambda/src/handler.ts`）とフロント側送信コード（`src/systems/Api.js`、`GameUI.jsx` のクリア画面）は揃っているが、API Gateway / Lambda 実体 / DynamoDB テーブルは未構築。 `VITE_API_BASE` 未設定なので `Api.js` は no-op として動き、フロントは「オフラインモード」表示になる。Phase 4.1〜4.3 で構築する。
2. **IaC・CI/CD・SRE は未着手。** `*.tf`、`.github/workflows/`、`docs/infra/INFRA.md` は未だ無い。 IaC ツールは Terraform で確定済（`docs/infra/IAC_CHOICE.md`）。 Phase 5〜7 で段階的に整備する。
3. **`src/shaders/` には頂点スナップだけが入っている。** Phase 3.1 の最小実装として `ps1-vertex.glsl` と `applyPs1VertexSnap.js` を追加し、 `Structure.jsx` の壁に適用済。 アフィンテクスチャマッピング（Phase 3.2）は未実装。
4. **`PostFX.jsx` は薄めの設定。** Bloom / Noise / Vignette を控えめに重ねている。重い・崩れる場合は `PostFX.jsx` の `ENABLED = false` または `App.jsx` の `<PostFX />` を外す。

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

このドキュメントは、Claude Code が本リポジトリで作業する際の入口となるガイドです。
詳細な情報は `docs/` 配下のドキュメントに分割してあるので、用途に応じて参照してください。

## Claude とユーザの役割分担（重要）

このプロジェクトでは、 ユーザがコミット前のすべての変更を自分でレビューしたい意向です。 そのため操作の分担を以下のように厳格に分けています。 `.claude/settings.json` の deny ルールでも強制されています。

### Claude が行うこと
- `src/` / `lambda/` / `docs/` / `tests/` 配下のファイルの編集・新規作成
- `npm run lint / test / build / dev / preview` などの開発スクリプト実行
- `npm audit` / `npm ci` の実行
- 読取系 git コマンド: `git status` / `diff` / `log` / `show` / `branch` / `fetch`
- 読取系 gh コマンド: `gh pr view` / `gh issue view` / `gh repo view`

### Claude が**やってはいけない**こと（settings.json で deny 済み）
- `git add` / `git commit`（amend 含む）
- `git push` / `git pull`
- `git merge` / `rebase` / `reset` / `revert` / `cherry-pick`
- `git checkout` / `switch` / `restore`（作業ツリー上書きの危険）
- `git stash` / `clean` / `mv` / `rm` / `tag` / `config` / `remote` / `init`
- `gh pr create / merge / close / edit / review`
- `gh issue create / close / edit`
- `gh release` 系、 `gh repo create / delete / edit`
- `npm publish`
- `rm -rf` / `rm -fr`

### ユーザが行うこと
- 変更内容の最終レビュー（IDE や git diff で確認）
- ステージング・コミット・プッシュ
- ブランチ操作（merge / rebase / checkout）
- PR の作成・マージ・close
- 依存追加時の `npm install`（Claude が `package.json` を編集 → ユーザが install）

**Claude が「commit してください」「push してください」とユーザに指示されたら**、 deny ルールに抵触するためコマンドを直接実行できません。 代わりに**実行すべき具体的なコマンドをユーザに提示してください**（例: `git add docs/ISSUES.md && git commit -m "fix: ..."`）。 ユーザが手元で実行します。

## セッション開始時の動線

新しいセッションを始めるときは、次の順で context を回収してください。

1. **このファイル（CLAUDE.md）を最後まで読む** — プロジェクト全体像と作業方針
2. **`docs/ISSUES.md` を確認** — 未解決の不具合や保留中の課題があるか
3. **`docs/roadmap/PROJECT.md` で次に着手すべき Phase / Milestone を確認** — 未チェックのチェックボックスが現在の作業候補
4. **`git log --oneline -10` で直近の commit メッセージを確認** — 進行中の流れを掴む

迷ったらユーザに `/next-task` skill を提案してください（`.claude/skills/next-task/SKILL.md`）。 ROADMAP と ISSUES を突き合わせて候補を抽出します。

### ⚠️ PS1 表現（Phase 3）に触る場合は必読

**頂点スナップ / アフィンテクスチャマッピング / dither / fog / dpr 等、見た目に関わる変更を**
**提案・実装する前に `docs/PS1_REDESIGN.md` を必ず通読してください。** 過去セッションで
複数回ユーザ却下を受けた失敗パターン（禁忌）、現在進行中の 6 ステップ計画、各 Step の
状態と次にやるべきこと、チューニングノブの一覧が集約されています。 ここを読まずに
PS1 風の効果を新規提案すると、ほぼ確実に過去の失敗を踏襲します。

## このプロジェクト専用 Skills

`.claude/skills/` 配下にプロジェクト固有のスキルがあります。

| Skill | 用途 |
|-------|------|
| `/verify` | `npm run lint && npm run test && npm run build` を順に実行して結果を要約。 コード変更後の検証に使用 |
| `/next-task` | `ISSUES.md` と `roadmap/PROJECT.md` を突き合わせて、 次の作業候補を優先度付きで提示 |
| `/add-issue` | `docs/ISSUES.md` の既存フォーマット（Priority / ファイル / 現象 / 対応方針）に従って新規エントリを追加 |

## 関連ドキュメント

| ファイル | 用途 |
|----------|------|
| `docs/README.md` | docs/ 全体の索引と階層構造の説明 |
| `docs/ARCHITECTURE.md` | ゲーム全体のアーキテクチャ・状態管理・データフローの詳細 |
| `docs/PS1_REDESIGN.md` | **PS1 表現パイプライン再設計の作業計画・失敗履歴・禁忌。 Phase 3 に触る前に必読** |
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
| `npm run lint` | ESLint 実行 |
| `npm run test` | Vitest で `tests/*.test.js` を一度実行 |
| `npm run test:watch` | Vitest の watch モード（変更検知で再実行） |

これら 3 つ（lint / test / build）を順に走らせるには `/verify` skill を使うのが便利。

### Node バージョン要件

`package.json` の `engines.node` は `>=18` だが、 transitive deps（`rolldown-vite` / `@vitejs/plugin-react` / `@oxc-project/runtime`）が **Node 20.19.0 以上 または 22.12.0 以上** を要求するため、 実用上は **Node 20.19.x LTS / 22.x LTS** を使ってください。 Node 14 や 20.12 系では EBADENGINE 警告が出ます。

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
3. **`src/shaders/` は現在空ディレクトリ（`.gitkeep` のみ）。** Phase 3.1（頂点スナップ）と 3.2（アフィンテクスチャ）は **試行後に不採用** ─ カメラ移動でテクスチャや頂点が揺れる動的アーティファクトが「ストレス要素にしか見えない」とユーザに却下された。 Bloodborne PSX 的な「**動的アーティファクトに頼らない静的ローファイ感**」を目指す方針へ転換し、 現在の PS1 表現は `<Canvas dpr={ps1Dpr}>`（内部 480px 域、 `src/App.jsx` の `PS1_TARGET_WIDTH=480`）＋ `NearestFilter`（壁テクスチャ）＋ Fog ＋ `PostFX.jsx`（控えめな Bloom / Noise / Vignette）の組み合わせで担う。 ディザは過去試行→却下されており未実装。 再挑戦の計画と禁忌は `docs/PS1_REDESIGN.md §2 Step 5` / `§3 禁忌 #4`。
4. **`PostFX.jsx` は薄めの設定。** Bloom / Noise / Vignette を控えめに重ねている。重い・崩れる場合は `PostFX.jsx` の `ENABLED = false` または `App.jsx` の `<PostFX />` を外す。

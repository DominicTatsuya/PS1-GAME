# Phase 4+ デプロイ手順まとめ ＋ docs/ 整理

## Context

ユーザから2つの依頼: (1) Phase 4 以降の AWS デプロイ手順を1つにまとめたい、(2) `docs/` 配下のドキュメントが複数セッションの編集を経て断片化・重複しているので整理したい。

2本の Explore エージェントで `docs/` 配下全11ファイル＋ `CLAUDE.md`／ルート `README.md`／`lambda/DYNAMODB.md` を全文精査し、加えて `.claude/skills/*`・`.claude/settings.json`・`src/` からの `docs/` パス参照を洗い出した。さらに Plan エージェント1体で整理方針を設計し、その後 `src/App.jsx`・`src/data/config.js`・`.env.example` など実コードと照合して事実関係を検証済み。

判明した実体は2種類:

1. **実害のある事実誤り（バグ）**: 「フロント送信コード未実装」という**古い誤情報**が `ARCHITECTURE.md` に2箇所・`CLAUDE.md` に1箇所（しかも同ファイル内で自己矛盾）残っている。`ISSUES.md` #4（解決済み）は後に却下・削除された頂点スナップ実装を「適用済み」と書いたままミスリード。`CONVENTIONS.md` §8 は「Claude が直接 commit する」という記述のままで、`CLAUDE.md` の厳格化された git deny ルール（Claude は commit 不可）と矛盾。ルート `README.md`（`docs/` 外だが最も陳腐化。fog 範囲・dpr 説明が誤り、Phase 2/3 の実装済み機能や Lambda バックエンドの記載が丸ごと欠落、却下済み/実装済み機能を「今後のアイデア」として掲載）も含めて修正する。
2. **構造的な重複**: Phase 4 以降のデプロイ「手順」を書いた実体ドキュメントが存在せず、`PROJECT.md`（Phase 4-6）・`CAREER.md`（Phase 0-2）・`SAA_ROADMAP.md`（Track A0-4）という3つの並行ナンバリングにチェックボックスだけが散在している。`docs/infra/` は空で、`PROJECT.md` 自身が既に将来ファイルとして名指ししている `docs/infra/INFRA.md` が実体化していない。ポートフォリオ・チェックリストも `CAREER.md`／`SAA_ROADMAP.md` に一字一句重複。

なお `docs/PS1_REDESIGN.md` と PS1 表現トピックは、既に別の未コミット済み整理（`.claude/plans/...hickey.md`、`docs/HANDOFF.md` 新設など）で対応済みのため、本プランでは一切触らない。`docs/roadmap/CAREER.md`・`docs/infra/IAC_CHOICE.md` は前回プランで「対象外」とされていたが、今回は新規依頼（デプロイ手順の実体化）に直接関わるため、ポインタ追加程度の小さい編集に限り対象に含める。

ドキュメントのみの変更（コード非変更）。`.claude/settings.json` に `docs/` パス限定の deny ルールはなく、編集は自由に行える（cross-reference エージェントで確認済み）。

---

## 実行順序

**Step 1（最初）**: `docs/infra/INFRA.md` を新規作成。他のほぼ全ファイルがここへのポインタを持つため先に作る。

**Step 2（並行・相互依存なし）**: `CLAUDE.md` / `docs/ARCHITECTURE.md` / `docs/ISSUES.md` / `docs/CONVENTIONS.md` / ルート `README.md` / `docs/roadmap/PROJECT.md` / `docs/roadmap/CAREER.md` / `docs/roadmap/SAA_ROADMAP.md` / `docs/README.md`

**Step 3（最後）**: `docs/HANDOFF.md` — Step1/2 が着地した状態を前提にポインタとセッションログ行を追記。

---

## Step 1: 新規ファイル `docs/infra/INFRA.md`

Phase 4（S3+CloudFront フロント配信／Lambda+API Gateway+DynamoDB バックエンド）の**手動構築手順書**。`CLAUDE.md`・`PROJECT.md` の「一括生成を避け、段階的・レビュー可能な手順を優先」方針に沿い、実行済みログではなく「これから構築する時に読む手順書」として書く（チェックボックスは未実施のまま）。

構成:

- **ヘッダ**: 対象範囲（Milestone 4.1-4.3）／`lambda/DYNAMODB.md`（テーブルスキーマは既存記載のまま、ここではポインタのみで再掲しない）／`docs/infra/IAC_CHOICE.md`（Phase 5 で Terraform 化する際の入力になる旨）との関係を明記
- **§0 前提・スコープ**: 何が既にあるか（`lambda/handler.ts`／`Api.js`／`GameUI.jsx`）と、何が欠けているか（API Gateway・Lambda 実体・DynamoDB テーブル）を整理。AWS アカウント/IAM/awscli 前提。Terraform（→Phase5）・CI/CD（→Phase7.2）は対象外と明記
- **§1 全体構成図**（テキスト/ASCII）: `Browser → CloudFront → S3(dist/)` と `Browser → API Gateway → Lambda → DynamoDB` の2系統。将来の Terraform 用にリソース命名規則を決めておく
- **§2 フロント配信（S3+CloudFront）**: バケット作成（Block Public Access）→ `npm run build` → `dist/` 同期 → CloudFront（OAC・SPA フォールバック 403/404→index.html）→ 動作確認 → 記録すべき値（バケット名・Distribution ID）
- **§3 バックエンド（Lambda+API Gateway+DynamoDB）**: DynamoDB は `lambda/DYNAMODB.md` の CLI 例へポインタ → `cd lambda && npm run build:zip` → Lambda 作成＋IAM ロール（§4 へ）→ 環境変数（`TABLE_NAME`/`GSI_NAME`、`DYNAMODB.md` の環境変数表を参照）→ API Gateway（HTTP API、POST /scores・GET /scores/top、Lambda proxy）→ CORS（CloudFront ドメインに限定、`*` にしない）→ デプロイ→invoke URL 取得 → curl での疎通確認
- **§4 IAM 最小権限**: 対象テーブル/GSI の ARN に絞った PutItem/Query のみ＋ログ書き込みのみのポリシー。`SAA_ROADMAP.md` A2 が言う「IAM ロール/ポリシーを自分で書く」の実体をここに置く
- **§5 環境変数・フロント接続**: `.env.production`（gitignore 対象）に `VITE_API_BASE` を設定 → 再ビルド・再アップロード・CloudFront invalidation → E2E 確認（スコア送信→Top10 反映）。Phase 7.2 の CI/CD がこの手動差し替えを自動化する対象になる旨を明記
- **§6 動作確認チェックリスト**: CloudFront 表示／POST 200／GET 一覧取得／ブラウザ CORS プリフライト／IAM に wildcard がないこと／機密情報を commit していないこと
- **§7 概算コストと後片付けの位置づけ**: 無料利用枠の範囲メモ。`SAA_ROADMAP.md` §4 の「使い捨てラボ（当日中に壊す）」とは異なり、ここで作るリソースは**残す**（公開 URL そのものであるため）ことを明記して混同を防ぐ
- **§8 このあとの工程**: Phase5(Terraform 化)・Phase6(SLO.md/POSTMORTEM.md での監視)・Phase7.2(CI/CD が §2/§5 の手動更新を代替) へのポインタ
- **§9 変更履歴**: `PS1_REDESIGN.md §4` / `HANDOFF.md §5` と同じ日付テーブル形式（複数セッションにまたがって実構築が進む想定のため）

---

## Step 2: 各ファイルの編集

### `CLAUDE.md`
- L115（Lambda backend セクション）: 「フロント側送信コードは未実装」という誤りを修正 → 実装済み（Issue #15）／未構築なのは AWS インフラのみ、と L173 と整合させる。`docs/infra/INFRA.md` へのポインタを追加
- L174（落とし穴 #2）: 「`docs/infra/INFRA.md` は未だ無い」という記述を、INFRA.md 新設後の状態に合わせて修正（`*.tf`／`.github/workflows/` はまだ無いが、手動構築手順は INFRA.md に整備済み、という言い方に）
- L81（doc 索引テーブルの `docs/infra/` 行）: 「現状ほぼ空」という記述を更新（INFRA.md／IAC_CHOICE.md が存在、SLO.md／POSTMORTEM.md のみ今後、に修正）

### `docs/ARCHITECTURE.md`
- L11-12（§1 冒頭）と L283（§9）: 同一の「フロント未実装」誤りを2箇所とも修正。§9 側は§1と重複するだけなので、§9 は「§1参照」の1行に短縮してよい
- L285: Phase 4-7 の説明に `docs/infra/INFRA.md`（Phase4 手順）への言及を追加

### `docs/ISSUES.md`
- Issue #4（解決済みアーカイブ、L110-112）: 削除はせず、追記訂正する。「この実装はその後のセッションでユーザ却下・削除された（禁忌化）。現在 `Structure.jsx` に頂点スナップは適用されていない」という一文と `docs/PS1_REDESIGN.md` §2 Step3／§3禁忌へのポインタを追加

### `docs/CONVENTIONS.md`
- §8.1（L142-145）: 「Claude が直接 commit する」という記述を撤回し、`CLAUDE.md` の現行方針（Claude は git add/commit を一切実行できない。ユーザに実行コマンドを提示するのみ）に合わせて書き換え。Co-Authored-By フッタの話は「ユーザが実行するコマンド文言に含める」という位置づけに変更

### ルート `README.md`（`docs/` 外だが、最も陳腐化しており、GitHub 上で公開されるポートフォリオ的性格上ここで一緒に直す）
- fog 値: 「距離2-20」→「距離 8〜32」（`src/App.jsx` L215 で確認済み）
- dpr 説明: 「dpr: 0.65」という固定値表現を、実際は `min(0.65, 480/画面幅)` による適応的な値である旨に修正（数式そのものは `ARCHITECTURE.md` 参照に留め、README 側は簡潔に）
- 松明本数: 「最大15本」の妥当性は要確認（`config.js` の `TORCH.MAX_COUNT` は Normal/Easy=30・Hard=20 だが、`ARCHITECTURE.md` L187 は「15〜25本」と別の数字を書いており、`MapGenerator.js` のマンハッタン距離フィルタ後の実配置数がどちらとも一致しない可能性がある）。実装時に `MapGenerator.js` の松明配置ロジックを確認してから確定的な数字を書く。断定を避け「難易度に応じて可変」のような表現に留めるのも選択肢
- 「今後の拡張アイデア」: 頂点スナッピング・ポストプロセス・localStorage永続化・オーディオの4項目を削除（すべて実装済み or 却下済み）。複数フロア／タイムアタックモード／TypeScript移行／utils/ ディレクトリは実際に未着手なので残す（タイムアタックは「ベストタイム保存」自体は実装済みなので文言調整）
- 機能一覧・プロジェクト構成ツリー: Door/KeyItem/Trap/Enemy（Phase2）、Storage/Audio（Phase1）、PostFX（Phase3.3）、Api.js＋オンラインスコアUI（Phase4フロント側）を追加。`lambda/` ディレクトリ全体をツリーに追加。使用技術表に `@react-three/postprocessing` を追加

### `docs/roadmap/PROJECT.md`
- Milestone 4.1/4.2/4.3: それぞれ `docs/infra/INFRA.md` の該当節へのポインタを追記（チェックボックス自体は未実施のまま変更しない）
- L151-153（doc 更新ルール）: 「例: docs/infra/INFRA.md」という未来形の書き方を、INFRA.md は存在／SLO.md・POSTMORTEM.md は今後、という現在形に修正

### `docs/roadmap/CAREER.md`
- Phase 0（L38）: 「手動構築」の後に `docs/infra/INFRA.md` へのポインタを追記
- チェックリスト（L65-70）: 現状のまま**正**とし、SAA_ROADMAP.md 側から重複を削除する形で正規化（下記）。ただし現状 CAREER.md のチェックリストに「SAA-C03 合格」自体が項目として無い（本文では Phase0 の目標として書かれているが checklist 落ちしている）ため、1項目追加しておく

### `docs/roadmap/SAA_ROADMAP.md`
- §3 A1/A2（L73-77）: `docs/infra/INFRA.md` §2／§3-5 へのポインタを追記（IAM の実体は INFRA.md §4 にあると明記）
- §8 チェックリスト（L156-163）: 独自チェックボックスを撤去し、「対応する成果物チェックリストは `CAREER.md` を参照」という1行のマッピング説明に置き換え。「（任意）Bの使い捨てラボの差分メモ（ポートフォリオ化はしない）」という自己矛盾した項目はチェックリストから削除（残すなら §4 の地文に）

### `docs/README.md`
- 階層図: `infra/` の下に `INFRA.md` を追加
- 責務表: `infra/INFRA.md` の行を追加。「`infra/` 配下（今後）」行を「SLO.md／POSTMORTEM.md のみ今後」に更新

---

## Step 3（最後）: `docs/HANDOFF.md`

- §3 Phase 4 ブロック: 「手順は `docs/infra/INFRA.md` に整理済み（2026-09-08 新設）」を追記
- §5 セッションログ: 2026-09-08 の行を追加。INFRA.md 新設／3箇所の stale 記述修正／CONVENTIONS §8 修正／ISSUES #4 訂正／README.md 更新／ロードマップ間のポインタ整理、を要約

---

## 対象外（変更しないもの）

- `docs/PS1_REDESIGN.md`（PS1 トピックは既存の別整理で対応済み）
- `docs/infra/IAC_CHOICE.md`（決定記録として良好、INFRA.md からポインタされるのみ）
- `docs/実績情報_取得マップ_確定版.md`（自己完結、重複なし）
- `lambda/DYNAMODB.md`（自己完結、良好。INFRA.md からポインタするのみで再掲しない）
- `.claude/skills/*`（`next-task`/`add-issue` が参照するファイル名・Milestone 表記はどれも変更しないため、参照は壊れない）

---

## Critical Files
- `docs/infra/INFRA.md`（新規、本タスクの中核成果物）
- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/roadmap/PROJECT.md`
- `docs/HANDOFF.md`
- ルート `README.md`

## 検証

ドキュメントのみの変更のため `npm run lint/test/build` は対象外。目視で以下を確認する:
- `docs/infra/INFRA.md` から `lambda/DYNAMODB.md`・`docs/infra/IAC_CHOICE.md` への相対リンクが実ファイルと一致
- 「フロント送信コード未実装」等の stale な文言が全ファイルから解消されていること（該当箇所を再検索して確認）
- `docs/README.md` の階層図・責務表が実際のファイル一覧と一致
- ルート `README.md` の fog/dpr/松明の数値が `src/App.jsx`・`src/data/config.js`・（必要なら）`src/systems/MapGenerator.js` の実値と一致
- `.claude/skills/next-task/SKILL.md`・`add-issue/SKILL.md` が参照するファイル名・Milestone 表記に変更がないこと（壊れていないことの確認のみ、編集はしない）

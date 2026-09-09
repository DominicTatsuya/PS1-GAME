# INFRA.md — Phase 4 AWS 手動構築 手順書

このドキュメントは `roadmap/PROJECT.md` **Milestone 4.1（フロント配信）・4.2（ランキング API）・4.3（まず手動で動かす）** の実行手順書です。「まず手動で理解する」という Milestone 4.3 の方針どおり、Terraform 等の IaC は使わずマネジメントコンソール／AWS CLI での構築を対象にします。

- **DynamoDB のテーブルスキーマ・属性設計・GSI・CLI 作成例**は `../../lambda/DYNAMODB.md` が単一の真実の源です。本ドキュメントでは再掲せず、該当ステップから参照します。
- **Terraform への移行**は Phase 5（`docs/infra/IAC_CHOICE.md` で選定済み）で行います。ここで手動構築する内容がそのまま Phase 5.2 の入力（`frontend_hosting.tf` / `api.tf` / `database.tf` / `iam.tf` の材料）になるので、§1 のリソース命名規則はそのまま Terraform 側でも使えるように決めています。
- 本ドキュメント自体はまだ**手順書**であり、実際の構築ログではありません（チェックボックスは未実施）。実際に構築したら §9 変更履歴に日付付きで記録してください。

---

## §0 前提・スコープ

**すでにあるもの**（コード側は実装済み）:
- `lambda/src/handler.ts` — POST `/scores` / GET `/scores/top` の Lambda ハンドラ（`npm run typecheck` / `npm run build` 通過済み）
- `src/systems/Api.js` — フロント側の fetch クライアント（`VITE_API_BASE` 未設定時は no-op）
- `src/components/UI/GameUI.jsx` — クリア画面のスコア送信 UI、スタート画面の Online Top10 表示

**ここで作るもの**（AWS 側の実体、これが無いため現状「オフラインモード」で動いている）:
- S3 バケット + CloudFront ディストリビューション（フロント配信）
- DynamoDB テーブル（`lambda/DYNAMODB.md` 参照）
- Lambda 関数 + IAM ロール
- API Gateway（HTTP API）

**対象外**（別 Phase）:
- Terraform 化 → Phase 5
- CI/CD による自動デプロイ → Phase 7.2
- CloudWatch 監視・SLO・ポストモーテム → Phase 6（`docs/infra/SLO.md` / `POSTMORTEM.md`、未作成）

**前提条件**:
- AWS アカウントと、これから作るリソースに対する権限を持つ IAM ユーザー/ロール
- `aws configure` 済みの AWS CLI（バージョン確認: `aws --version`）
- ローカルで `npm run build`（フロント）・`cd lambda && npm run build:zip`（バックエンド）が通ること

---

## §1 全体構成図・命名規則

```
[フロント配信]
  Browser ──HTTPS──▶ CloudFront ──OAC──▶ S3 (dist/ の静的ファイル)

[バックエンド]
  Browser ──fetch──▶ API Gateway (HTTP API) ──proxy──▶ Lambda ──SDK──▶ DynamoDB
```

Phase 5 で Terraform 化する際にそのまま使えるよう、リソース名は先に決めておきます（実際の名前は環境に合わせて置き換えて可）:

| リソース | 名前の例 | 対応する将来の `.tf` |
|---|---|---|
| S3 バケット（フロント） | `ps1-game-frontend` | `frontend_hosting.tf` |
| CloudFront ディストリビューション | （自動採番のドメインをそのまま使う、または独自ドメインを別途検討） | `frontend_hosting.tf` |
| DynamoDB テーブル | `ps1-game-scores`（`lambda/DYNAMODB.md` 記載どおり） | `database.tf` |
| Lambda 関数 | `ps1-game-scores-api` | `api.tf` |
| API Gateway（HTTP API） | `ps1-game-api` | `api.tf` |
| IAM ロール（Lambda 実行ロール） | `ps1-game-lambda-exec-role` | `iam.tf` |

---

## §2 フロント配信（S3 + CloudFront）— Milestone 4.1

1. **S3 バケット作成**（パブリックアクセスはブロックしたまま。CloudFront からのみ読ませる）
   ```bash
   aws s3api create-bucket --bucket ps1-game-frontend --region ap-northeast-1 \
     --create-bucket-configuration LocationConstraint=ap-northeast-1
   aws s3api put-public-access-block --bucket ps1-game-frontend \
     --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
   ```
2. **ビルドして同期**
   ```bash
   npm run build
   aws s3 sync dist/ s3://ps1-game-frontend --delete
   ```
3. **CloudFront ディストリビューション作成**（コンソール推奨・初回は GUI の方が迷わない）
   - オリジン: 上記 S3 バケット、**Origin Access Control (OAC)** を使い、バケットポリシーは CloudFront 経由のみ許可
   - デフォルトルートオブジェクト: `index.html`
   - **SPA フォールバック**: カスタムエラーレスポンスで `403` / `404` → `/index.html`（200 で返す）を設定（React Router 等を使わずゲーム状態で画面遷移しているため必須ではないが、直リンクや将来のルーティング導入に備えて設定しておく）
   - ビューワプロトコルポリシー: Redirect HTTP to HTTPS
4. **動作確認**: 発行された CloudFront ドメイン（`https://xxxxxxxx.cloudfront.net`）にアクセスしてゲームが表示されることを確認
5. **記録しておく値**: バケット名・CloudFront Distribution ID・CloudFront ドメイン（後述 §5 の再アップロード時と、Phase 5 Terraform 化時に必要）

---

## §3 バックエンド（Lambda + API Gateway + DynamoDB）— Milestone 4.2 / 4.3

1. **DynamoDB テーブル作成**: `../../lambda/DYNAMODB.md` の「AWS CLI でのテーブル作成例」をそのまま実行
2. **Lambda デプロイパッケージをビルド**
   ```bash
   cd lambda
   npm run build:zip   # dist/handler.js をビルドし function.zip を生成
   ```
3. **IAM ロールを作成**（ポリシーの中身は §4 を参照。ここでは信頼ポリシーのみ）
   ```bash
   aws iam create-role --role-name ps1-game-lambda-exec-role \
     --assume-role-policy-document file://trust-policy.json
   ```
4. **Lambda 関数を作成**
   ```bash
   aws lambda create-function --function-name ps1-game-scores-api \
     --runtime nodejs20.x --handler handler.handler \
     --role arn:aws:iam::<ACCOUNT_ID>:role/ps1-game-lambda-exec-role \
     --zip-file fileb://function.zip \
     --environment "Variables={TABLE_NAME=ps1-game-scores,GSI_NAME=cleartim-index}"
   ```
   環境変数の意味は `lambda/DYNAMODB.md` §環境変数の表を参照。
5. **API Gateway（HTTP API）を作成**し、Lambda プロキシ統合でルートを紐づける
   - `POST /scores` → Lambda プロキシ統合
   - `GET /scores/top` → 同じ Lambda（`handler.ts` 内でパスに応じて分岐済み）
   - ステージをデプロイし、invoke URL を取得
6. **CORS を設定**: 許可オリジンは `*` にせず、§2 で確認した CloudFront ドメイン（`https://xxxxxxxx.cloudfront.net`）に限定する
7. **疎通確認**（フロントに繋ぐ前に、まず curl で確認する）
   ```bash
   curl -X POST https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/scores \
     -H "Content-Type: application/json" \
     -d '{"user_id":"test","cleartime":123.4,"score":100}'
   curl https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/scores/top?limit=10
   ```

---

## §4 IAM 最小権限

Lambda 実行ロールに付与するポリシーは、**該当テーブル・GSI の ARN に絞った** 最小権限にします（`*` を使わない）。`docs/roadmap/SAA_ROADMAP.md` A2 が言う「IAM ロール/ポリシーを自分で書く」の実体はここです。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:Query"],
      "Resource": [
        "arn:aws:dynamodb:ap-northeast-1:<ACCOUNT_ID>:table/ps1-game-scores",
        "arn:aws:dynamodb:ap-northeast-1:<ACCOUNT_ID>:table/ps1-game-scores/index/cleartim-index"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:ap-northeast-1:<ACCOUNT_ID>:*"
    }
  ]
}
```

`PutItem` は `POST /scores`、`Query`（GSI 経由）は `GET /scores/top` に対応（`lambda/DYNAMODB.md` のアクセスパターン表と一致させる）。

---

## §5 環境変数・フロント接続

1. リポジトリ直下で `.env.example` を `.env.local` としてコピーし、§3 で取得した invoke URL を `VITE_API_BASE` に設定する（`.env.example` 自体の手順どおり。`.env.local` は `.gitignore` の `*.local` により git 管理対象外）
   ```
   VITE_API_BASE=https://<api-id>.execute-api.ap-northeast-1.amazonaws.com
   ```
2. 再ビルド・再アップロード・キャッシュ無効化
   ```bash
   npm run build
   aws s3 sync dist/ s3://ps1-game-frontend --delete
   aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
   ```
3. **E2E 確認**: CloudFront ドメインでゲームをプレイ →クリア画面でスコア送信→スタート画面の Online Top10 に反映されることを確認

Phase 7.2（CI/CD）では、この `.env.local` への手動書き込みを GitHub Actions のビルド時環境変数注入に置き換える想定です。手動構築の間はこの手順のままで問題ありません。

---

## §6 動作確認チェックリスト

- [ ] CloudFront ドメインでゲームが表示される
- [ ] `POST /scores` が 200 を返す（curl・ブラウザ両方）
- [ ] `GET /scores/top` が降順/昇順（クリアタイム昇順）でリストを返す
- [ ] ブラウザの CORS プリフライト（OPTIONS）が通る（curl だけでは検出できないので必ずブラウザでも確認）
- [ ] IAM ポリシーに `"Resource": "*"` が残っていない
- [ ] `.env.local` や AWS アカウント ID・ARN などをコミットしていない（`git status` で確認）

---

## §7 コストと後片付けについて

個人開発規模では S3 / CloudFront / Lambda / API Gateway / DynamoDB（オンデマンドキャパシティ推奨）はいずれも無料利用枠内に収まりやすい構成です。月次のコスト確認は Phase 6 Milestone 6.3 で扱います。

**注意**: `docs/roadmap/SAA_ROADMAP.md` §4 のトラック B（VPC/ALB/ASG/RDS などの使い捨てラボ）は「当日中に構築して壊す」運用ですが、本ドキュメントで構築するリソースは**壊さずに残します**（公開 URL とランキング API そのものがポートフォリオ成果物のため）。両者を混同しないこと。

---

## §8 このあとの工程

- **Phase 5**（`docs/infra/IAC_CHOICE.md`）: この手順で作った構成を Terraform（`frontend_hosting.tf` / `api.tf` / `database.tf` / `iam.tf`）でコード化
- **Phase 6**（`docs/infra/SLO.md` / `POSTMORTEM.md`、未作成）: この API に対して CloudWatch 監視・SLO・ポストモーテムを追加
- **Phase 7.2**: GitHub Actions で §2 の再ビルド・再アップロードと §5 の env 注入を自動化

---

## §9 変更履歴

| 日付 | 内容 |
|---|---|
| 2026-09-08 | 新規作成。Phase 4 の手動構築手順として、S3+CloudFront・Lambda+API Gateway+DynamoDB・IAM 最小権限・env 連携をまとめた（まだ未実施・手順書段階） |

# DynamoDB スキーマ設計

PS1-GAME のスコアランキング用 DynamoDB テーブル仕様。

## テーブル: `ps1-game-scores`

ゲームクリア時のスコア（クリアタイム）を保存し、ランキング上位を取得する。

### 属性

| 属性名 | 型 | 用途 |
|--------|-----|------|
| `user_id` | String (PK) | ユーザー識別子（クライアント側で生成した UUID や入力名） |
| `record_id` | String (SK) | 各スコア記録の一意 ID（`randomUUID()` で生成） |
| `cleartime` | Number | クリアタイム（秒単位、小数可） |
| `score` | Number | 最終スコア（アイテム収集 + クリアボーナス + タイムボーナス） |
| `timestamp` | String | ISO 8601 形式の記録時刻（例: `2026-04-24T05:12:34.567Z`） |

### キー設計

- **パーティションキー (PK)**: `user_id`
- **ソートキー (SK)**: `record_id`

同一ユーザーが複数回クリアした場合、全て別レコードとして保存される（ベストタイム判定はアプリ側 or クエリ側で行う）。

### GSI: `cleartim-index`

ランキング表示（クリアタイムの昇順 Top N）のためのグローバルセカンダリインデックス。

| キー | 属性 |
|------|------|
| パーティションキー | `gsi_partition`（固定値 `"leaderboard"`） |
| ソートキー | `cleartime`（Number） |

すべてのレコードに `gsi_partition = "leaderboard"` を書き込むことで、1 パーティションに全記録が集約される。ランキング取得時は `ScanIndexForward: true` で `cleartime` 昇順に Query する。

**注意**: 単一パーティション方式なので、大規模運用時はパーティション分割（例: `yyyy-mm` でシャーディング）を検討する必要がある。個人学習プロジェクトの範囲では問題ない。

### TTL（任意）

履歴を永続保存しないなら、`ttl` 属性（UNIX 秒）を付与して自動削除を有効化できる。現状は無効。

## アクセスパターン

| 操作 | API | エンドポイント例 |
|------|-----|------------------|
| スコア記録 | `PutItem` | `POST /scores` |
| ランキング取得（上位 N 件） | `Query` on GSI | `GET /scores/top?limit=10` |
| ユーザー別記録取得（任意） | `Query` on main table with `user_id` | 未実装 |

## 環境変数

| 名前 | デフォルト | 用途 |
|------|-----------|------|
| `TABLE_NAME` | `ps1-game-scores` | テーブル名 |
| `GSI_NAME` | `cleartim-index` | GSI 名 |

## AWS CLI でのテーブル作成例

```bash
aws dynamodb create-table \
  --table-name ps1-game-scores \
  --attribute-definitions \
    AttributeName=user_id,AttributeType=S \
    AttributeName=record_id,AttributeType=S \
    AttributeName=gsi_partition,AttributeType=S \
    AttributeName=cleartime,AttributeType=N \
  --key-schema \
    AttributeName=user_id,KeyType=HASH \
    AttributeName=record_id,KeyType=RANGE \
  --global-secondary-indexes \
    "IndexName=cleartim-index,\
KeySchema=[{AttributeName=gsi_partition,KeyType=HASH},{AttributeName=cleartime,KeyType=RANGE}],\
Projection={ProjectionType=ALL},\
ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

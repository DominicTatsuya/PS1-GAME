# PROJECT.md — プロジェクト実装ロードマップ

このドキュメントは、PS1-GAME の今後の方向性と実装すべきタスクを整理した作業計画です。
Claude Code は **Phase 順** に進めることを推奨します。緊急度と依存関係を考慮した順序です。

> **関連**: 本ロードマップは「プロジェクトとして何を作るか」に集中しています。
> 開発者本人の学習目標（AWS SAA-C03 取得・SRE 転向）は `CAREER.md` 側で扱います。
> プロジェクト実装の進捗とキャリア計画の進捗は別のリズムで動くため、ドキュメントを分けています。

---

> ## 方針転換の記録（2026-06）
>
> 本プロジェクトは「ローカル完結のゲーム」から、**AWS 上に公開・運用する実サービス**へと範囲を広げる。
> 目的は二つ：
> 1. ゲームとしての完成（PS1 表現の深化を含む）
> 2. 開発者本人の **AWS / IaC / SRE スキルの実地習得とポートフォリオ化**
>
> これに伴う主な変更：
> - フロント配信先を GitHub / Cloudflare Pages から **AWS（S3 + CloudFront）** に変更（クラウドスキルを成果物に含めるため）。
> - **IaC** と **SRE・可観測性** を独立した Phase として新設・優先（旧 Phase 4「バックエンド連携」を分解・拡張）。
> - 旧 Phase 5「品質・運用」は新 Phase 7 に繰り下げ。

> ## Claude Code への作業方針（重要）
>
> 本プロジェクトは開発者の **AWS / IaC / SRE 学習を兼ねる**。インフラ・IaC 関連タスクでは、
> - **一括生成を避け、概念の説明と段階的・レビュー可能な手順を優先**する。
> - Terraform / AWS のコードを書く際は「何を・なぜそうするか」をコメントと説明で補う（`CONVENTIONS.md` のコメント方針に準拠）。
> - 大きな構成を一度に出さず、小さく適用 → 確認できる単位に分割する。
> - 開発者が理解しないまま「動くだけ」の状態を作らない。
>
> ゲームロジック（Three.js / R3F）側は従来どおり通常の支援方針で進めてよい。

---

## 完了済み（Phase 0〜2、2026-04-24 時点）

- **Phase 0 基盤整備**：既存バグ修正、`config.js` 接続、不要ファイル整理。リント/ビルドのグリーン化のみ Node 更新待ちで保留（`../ISSUES.md` #14）。
- **Phase 1 ゲームプレイ拡張**：スコア永続化、難易度調整（Easy/Normal/Hard）、サウンド（Web Audio 手続き合成）、ミニマップ改良。
- **Phase 2 世界観**：開閉ドア／鍵、スパイクトラップ、敵 AI（BFS 追跡）。

（詳細な完了記録は git log および各 `docs/` を参照）

---

## Phase 3: PS1 表現の深化（創作トラック・並行可）

※開発者の制作上の関心の中心。スキル習得トラック（Phase 4 以降）と**並行して進めてよい**。

> **重要**: 本 Phase の作業は `docs/PS1_REDESIGN.md` の 6 ステップ計画に沿って **複数セッションをまたいで段階的に検証** する方針に切り替わっている（2026-06-08〜）。 各 Milestone 個別ではなく、再設計ドキュメントを単一の真実の源とする。 新しい提案を出す前に必ず `docs/PS1_REDESIGN.md` を通読すること（失敗履歴と禁忌が集約されている）。

### Milestone 3.1: 頂点スナッピング
- [-] **不採用**（2026-06-08 試行・撤回 → 全廃）。却下理由・実装詳細・現在の PS1 表現の構成要素は `docs/PS1_REDESIGN.md`（§1 背景・§3 禁忌 #6）に一本化してある。
### Milestone 3.2: アフィンテクスチャマッピング
- [-] **不採用**（2026-06-08 試行・撤回）。却下理由は `docs/PS1_REDESIGN.md`（§1 背景・§3 禁忌 #3）を参照。頂点スナップ再導入（同 §2 Step 3）を土台にした再挑戦を Step 4 として計画中。
### Milestone 3.3: ポストプロセス
- [x] `@react-three/postprocessing` 導入。`src/components/PostFX.jsx` に Bloom / Noise / Vignette を薄く重ねる構成で実装。CRT 湾曲は CSS スキャンライン＋ビネットで既に表現できているので postprocess 側では入れていない
- 注: 過去（2026-06-08）に Bayer 4x4 順序ディザ + 5-bit カラー量子化を `EffectComposer` 最終段に載せて試行したが、「ブロックノイズに近く PS1 再現になっていない」と却下され撤退（`PS1_REDESIGN.md §3 禁忌 #4`）。 ディザの再挑戦は同 `§2 Step 5` で **低解像度 RT に直接掛ける方針** で計画中（未実装）。

---

## Phase 4: 公開とサーバーレスバックエンド（スキル習得トラック・最優先）

**目的**: ゲームを AWS 上で公開し、各サービスの役割を実地で理解する。

### Milestone 4.1: フロントの AWS 配信
- [ ] Vite のビルド成果物（`dist`）を S3 で配信し、CloudFront 経由で HTTPS 公開
- [ ] 配信先を従来の Pages 案から AWS に変更
- 手順は `docs/infra/INFRA.md` §2 を参照（先行して手順書として整備済み、実施はこれから）

### Milestone 4.2: ランキング API（サーバーレス）
- [x] `lambda/handler.ts`（POST /scores・GET /scores/top）の Lambda 側実装（`../ISSUES.md` #1 で完了）
- [ ] API Gateway + Lambda + DynamoDB 構成、CORS 設定、環境変数（TABLE_NAME 等） — **AWS 構築待ち**（手順は `docs/infra/INFRA.md` §3〜§5）
- [x] フロント側のスコア送信コードを実装（`../ISSUES.md` #15）
  - [x] `src/systems/Api.js` を新設し、`fetch` ラッパ・5s タイムアウト・API 未設定時の no-op を備える
  - [x] クリア画面にユーザ名入力 + 送信ボタン・送信ステータス表示（`GameUI.jsx`）
  - [x] スタート画面に Online Top10 一覧を表示
  - [x] ユーザ名は `Storage.js` で永続化（連続プレイで再入力不要）
- [x] API ベース URL の管理機構を整備（`../ISSUES.md` #16）。`.env.example` を追加、`VITE_API_BASE` を `Api.js` から参照

### Milestone 4.3: まず手動で動かす（理解優先）
- [ ] マネジメントコンソール / CLI で一通り手動構築し、各サービスの役割を理解する
- [ ] 成果物：構成図と手順を `docs/` に記録（IaC 化の元ネタになる）
- 構成図・手順は `docs/infra/INFRA.md`（§1 構成図・§4 IAM 最小権限）に先行して整備済み。本チェックボックスは実際に構築したらチェックする

---

## Phase 5: インフラのコード化（IaC）

**目的**: Phase 4 の手動構成を再現可能にし、IaC を習得する。

### Milestone 5.1: ツール選定
- [x] Terraform / AWS CDK / SAM から選定し、選定理由を `infra/IAC_CHOICE.md` に記述。採用は **Terraform**（SRE 求人での転用度・マルチクラウド適用性を優先）
### Milestone 5.2: IaC 化
- [ ] S3 + CloudFront + Lambda + DynamoDB + API Gateway を一式コード化
- [ ] 環境変数・権限（IAM）も IaC で管理
- [ ] 成果物：一から `apply` で再構築できるリポジトリ + README

---

## Phase 6: SRE・可観測性（新設）

**目的**: 公開サービスを「運用できる」状態にし、SRE の実務型を身につける。

> **なぜこの Phase が重要か**: `../実績情報_取得マップ_確定版.md` の実績棚卸しにより、障害の原因切り分け・技術判断/AI 出力の監査・レガシー×モダン両刀・モジュール単独保守の継続といった資産は現職の実務ですでに証跡化できる一方、**クラウドの可観測性（メトリクス・SLO・ポストモーテム運用）は職務経歴として裏づく実績が無い**ことが確定している（`CAREER.md`「現状スキルの位置づけ」の「欠落」に対応）。したがって本 Phase の狙いは、既に実務で証跡化済みの「障害切り分け能力」自体を再証明することではなく、**その切り分け能力をクラウドの文脈（CloudWatch のメトリクス／ログから環境要因かコードバグかを見分ける）に接続し、可観測性の運用実績という欠落枠を実地で埋める**ことに置く。

### Milestone 6.1: 可観測性
- [ ] CloudWatch でメトリクス・ログ・アラームを設定
- [ ] ランキング API の **SLO**（可用性・レイテンシ）を定義し `docs/infra/SLO.md` に記録
### Milestone 6.2: ポストモーテム
- [ ] 障害（または意図的な負荷／故障試験）を 1 件、ポストモーテムとして記録。現職で証跡化済みの障害切り分け経験（環境起因かコードバグかの切り分け）を、クラウド環境向けに適用した記述にする（`docs/infra/POSTMORTEM.md`）
### Milestone 6.3: コスト
- [ ] 月次コストを確認し、最適化の余地を 1 点以上記録

> 各ユニットの成果物定義・実行順序は `roadmap/SAA_ROADMAP.md` §3 トラック A（A4）にすでに落とし込んである。本 Phase の記述はそこに委ね、ここでは「何を・なぜ」に絞る。

---

## Phase 7: 品質・運用（旧 Phase 5）

### Milestone 7.1: テスト整備
- [x] Vitest 導入、`MapGenerator` 純粋関数の単体テスト（同 seed の再現性 / 迷路の連結性 / `checkGridCollision` 境界 / `bfsFarthest` / `bfsShortestPath`）を `tests/MapGenerator.test.js` に追加。`npm run test` で実行
- [ ] `Storage.js` / `Api.js` / `applyDifficulty` のテスト追加（`../ISSUES.md` #11）
### Milestone 7.2: CI/CD
- [ ] GitHub Actions で lint + build + test
- [ ] main マージで S3 / CloudFront へ自動デプロイ（AWS 認証は長期キーでなく OIDC 連携を推奨）
### Milestone 7.3: TypeScript 移行（任意）
- [ ] `systems/` から段階的に `.ts` 化、`strict: true`
### Milestone 7.4: パフォーマンス
- [x] `PlayerController` の `useFrame` 内 alloc 削減（`../ISSUES.md` #6）。 forward / right / yawDir / tmp の 4 本を ref で持ち、`UP_VECTOR` 定数を抽出
- [ ] `stats.js` を dev 時のみ表示

---

## 任意の回り道：コンテナ（必須ではない）

静的 SPA ＋ サーバーレス構成では Docker / Kubernetes は不要。コンテナ経験を積みたい場合に限り、Lambda の代わりに **ECS / Fargate** でバックエンドを動かす別構成を実験する。優先度は Phase 7 より後。

---

## 優先度判断のガイドライン

Claude Code が作業を選ぶ際の指針：

1. **バグ修正は常に最優先**（`../ISSUES.md` の High が残っていればそちらを先に）
2. **ユーザからの個別指示が最優先**（本 ROADMAP はデフォルトの進行順）
3. **スキル習得トラック（Phase 4 → 5 → 6）を主軸**に進める
4. **創作トラック（Phase 3 PS1 表現）は開発者の関心に応じて並行**してよい
5. 同 Phase 内は Milestone 番号順、依存関係に従う

---

## ドキュメント更新（`CONVENTIONS.md` 第 11 章に準拠）

インフラ・IaC・運用に関わる変更を行った場合も、コード変更と同じコミットで `docs/` を更新する。インフラ系のドキュメントは `docs/infra/` 配下に配置する（`docs/infra/INFRA.md`（構成図・手順、Phase 4 分は整備済み）・`docs/infra/IAC_CHOICE.md`（Phase 5.1 の判断記録）は既存。`docs/infra/SLO.md`・`docs/infra/POSTMORTEM.md` は Phase 6 で追加予定）。`ARCHITECTURE.md`（アプリ設計）と責務が分離できて扱いやすい。

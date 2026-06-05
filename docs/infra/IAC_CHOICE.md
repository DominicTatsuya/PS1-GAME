# IAC_CHOICE.md — IaC ツール選定とその理由

本プロジェクト（PS1-GAME の AWS 化）で採用する IaC ツールを **Terraform** に決定するまでの判断記録です。`roadmap/PROJECT.md` Phase 5.1（ツール選定）に対応します。

> このドキュメント自体が成果物です。 `roadmap/CAREER.md` で言及している「ツール選定理由の言語化」は、転職時の対外的なポートフォリオの一部として位置づけています。

---

## 判断軸（ウェイト順）

1. **SRE / プラットフォームエンジニア求人での転用度**（最重要）
   - 本プロジェクトは学習媒体であり、ここで身につけたスキルが他社のスタックで通用するかが最優先
2. **AWS 外への適用可能性**
   - 将来 GCP / Azure / Cloudflare などを触る可能性を残したい
3. **学習リソースの豊富さ**
   - 個人開発で詰まったときに参照できる公式ドキュメント・コミュニティの厚み
4. **本プロジェクトの規模との相性**
   - S3 + CloudFront + Lambda + API Gateway + DynamoDB の小構成に対する適切なツール
5. **AI 支援開発との相性**
   - HCL / TypeScript / YAML のうち、Claude Code が安定して扱えるか

---

## 候補比較

### Terraform

- **言語**: HCL（独自宣言型 DSL）
- **適用範囲**: マルチクラウド（AWS / GCP / Azure / Cloudflare / Datadog / GitHub 等）
- **状態管理**: tfstate ファイル（ローカル or S3 バックエンド）
- **強み**:
  - SRE 求人での要求頻度が圧倒的に高い（特に複数クラウド・複数 SaaS を統合する現場）
  - リソースのライフサイクル（plan / apply / destroy）が明確
  - エコシステムが厚く、 AWS / GitHub Actions など主要プロバイダのモジュールが揃う
- **弱み**:
  - HCL は本格的なプログラミング言語ではなく、複雑な制御フローを書きにくい（for_each / dynamic で乗り切る場面が多い）
  - tfstate の管理（ロック・バージョン）を別途設計する必要がある
- **学習コスト**: HCL の構文自体は薄いが、 module / workspace / remote state など運用知識が必要

### AWS CDK

- **言語**: TypeScript / Python / Java / C# / Go（実プログラミング言語）
- **適用範囲**: AWS 専用（裏で CloudFormation を生成）
- **強み**:
  - 既存の TypeScript スキルがそのまま活きる（本プロジェクトは TypeScript Lambda を持つ）
  - 高レベル抽象化（L2/L3 コンストラクト）が豊富で、宣言が短い
  - IDE 補完・型チェックが効く
- **弱み**:
  - AWS 専用なので、転用度が低い（GCP に行ったら学び直し）
  - SRE 求人で「CDK 必須」を見かける頻度は Terraform より明確に低い
  - 内部で CloudFormation を生成するため、drift やエラー時のデバッグが二段抽象になる
- **学習コスト**: プログラミング言語側は既知、CDK 流儀（コンストラクトの粒度・props 設計）は別途習得が必要

### AWS SAM

- **言語**: YAML（CloudFormation 拡張）
- **適用範囲**: AWS のサーバーレス特化（Lambda / API Gateway / DynamoDB / Step Functions など）
- **強み**:
  - サーバーレス構成を最少行で書ける（本プロジェクトの構成と相性が良い）
  - `sam local start-api` で API Gateway + Lambda をローカルエミュレートできる
  - AWS 公式で学習リソースが整備されている
- **弱み**:
  - サーバーレス以外（S3 + CloudFront のような静的ホスティング）には不向き
  - YAML の冗長さ・型のなさが大規模化で辛い
  - SRE 求人での要求頻度は CDK よりさらに低い
- **学習コスト**: 構文は薄いが、CloudFormation の動作モデル理解が前提になる

---

## 判断

採用: **Terraform**

**理由**:

1. **SRE 転向という目的に最も直結する**。求人で要求される頻度が最も高く、複数クラウドや SaaS を統合する現場で前提となる
2. **AWS 外への横展開が効く**。GCP / Cloudflare へ将来手を出す場合も同じツール・同じ思考様式で済む
3. **本プロジェクト規模の小ささはむしろ追い風**。S3 + CloudFront + Lambda + API Gateway + DynamoDB は Terraform AWS Provider の標準モジュールでカバーできる範囲で、 HCL の制約を踏みにくい
4. **AI 支援開発とも相性が良い**。 HCL は宣言型でパターンが定型化しており、 Claude Code に小さく書かせて段階的に apply するワークフローが組みやすい

---

## 採用しなかった理由（短く）

- **CDK**: 本プロジェクトの第一目的は「転職時の汎用スキル」。 AWS 専用に閉じる選択肢を学習媒体で取ると、 SRE 求人マッチング時の差別化が弱くなる。 TypeScript で書けるという利点はあるが、本プロジェクトのフロントは別途 React/Three.js で日々書いており、 IaC 側でまで TypeScript を続ける必要性は低い
- **SAM**: 静的サイト（S3 + CloudFront）が構成に含まれるため、サーバーレス特化のツールでは収まりが悪い。ローカル実行（ `sam local` ）の利点は魅力的だが、 Terraform でも `localstack` 等で代替できる

---

## 採用後の進め方（Phase 5.2 で実施予定）

- `terraform/` ディレクトリを切り、構成要素ごとに `.tf` を分割（ `frontend_hosting.tf` / `api.tf` / `database.tf` / `iam.tf` ）
- 状態は S3 バックエンド + DynamoDB ロックで管理する（学習目的で remote state の運用までやる）
- `terraform plan` を CI で実行し、 PR ごとに差分をレビューできるようにする（Phase 7.2 と合わせて）
- 学習中の試行錯誤は `terraform destroy` でクリーンに戻せる単位で進める

---

## 参考リソース

- HashiCorp Learn (Terraform): <https://developer.hashicorp.com/terraform/tutorials>
- Terraform AWS Provider 公式: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs>
- AWS Well-Architected Framework（IaC の検証軸として）: <https://aws.amazon.com/architecture/well-architected/>

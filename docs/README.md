# docs/ — ドキュメント索引

## 各ファイルの責務

| ファイル | 用途 |
|----------|------|
| `HANDOFF.md` | 現状スナップショット（Phase 進捗・アクティブな作業・ブロッカー・セッションログ）。**新セッションはまずここ** |
| `ISSUES.md` | 既知のバグ・修正待ち項目。作業前に確認 |
| `roadmap/PROJECT.md` | Phase 順の実装ロードマップ。作業前に確認 |
| `roadmap/CAREER.md` | 本プロジェクトを学習媒体としたキャリア習得計画（SRE 転向）と成果物チェックリスト |
| `roadmap/SAA_ROADMAP.md` | AWS SAA-C03 取得計画（トラック A/B/C） |
| `ARCHITECTURE.md` | 状態管理・ダンジョン生成・描画・UI の設計詳細 |
| `CONVENTIONS.md` | コメント言語・命名・React/R3F の書き方 |
| `PS1_REDESIGN.md` | PS1 表現の再設計計画・失敗履歴・禁忌。**見た目に触る前に必読** |
| `infra/INFRA.md` | Phase 4 の AWS 手動構築手順書 |
| `infra/IAC_CHOICE.md` | IaC ツール選定（Terraform 採用）の判断記録 |
| `実績情報_取得マップ_確定版.md` | 開発者本人の実務実績の棚卸し（CAREER.md の裏づけ） |

Phase 6 で `infra/SLO.md` / `infra/POSTMORTEM.md` を追加予定（未作成）。

## 更新ルール

`CONVENTIONS.md` 第 11 章に従い、コード変更と同じコミットで該当ドキュメントを更新する。

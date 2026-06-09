# docs/ — ドキュメント索引

このディレクトリは PS1-GAME のプロジェクトドキュメントを格納しています。
作業を始める前に、まず本ファイルで全体像を掴んでから個別ドキュメントへ進んでください。

---

## 階層構造

```
docs/
├── README.md              ← 本ファイル。各ドキュメントへの索引
├── ARCHITECTURE.md        ← ゲーム本体の設計詳細（リファレンス）
├── PS1_REDESIGN.md        ← PS1 表現パイプライン再設計（複数セッション継続作業）
├── CONVENTIONS.md         ← コーディング規約・命名ルール
├── ISSUES.md              ← 既知の不具合・修正待ち項目
├── roadmap/
│   ├── PROJECT.md         ← プロジェクトの実装ロードマップ（Phase 順）
│   └── CAREER.md          ← 開発者本人のキャリア習得計画
└── infra/                 ← Phase 4 以降の運用・インフラ系ドキュメント置き場
    └── IAC_CHOICE.md      ← Phase 5.1 で実施した IaC ツール選定（Terraform 採用）の判断記録
```

---

## 各ファイルの責務

| ファイル | 用途 | 主な読者 |
|----------|------|---------|
| `ARCHITECTURE.md` | 状態管理・ダンジョン生成・描画・UI の設計詳細 | コードを書く Claude Code / 設計を理解したい開発者 |
| `PS1_REDESIGN.md` | PS1 表現パイプライン再設計の作業計画・失敗履歴・禁忌・現在地。 **Phase 3（見た目）に触る作業前に必ず通読** | コードを書く Claude Code（複数セッション継続） |
| `CONVENTIONS.md` | コメント言語・命名・React/R3F の書き方・ESLint ルール | コードを書く Claude Code |
| `ISSUES.md` | 既知のバグ・不整合・修正方針。**作業前に必ず確認** | コードを書く Claude Code |
| `roadmap/PROJECT.md` | 今後の実装方針と Phase 順タスクリスト。**作業前に必ず確認** | コードを書く Claude Code / 進捗管理 |
| `roadmap/CAREER.md` | 本プロジェクトを学習媒体としたキャリア習得計画（SRE/プラットフォームエンジニア転向） | 開発者本人 |
| `infra/IAC_CHOICE.md` | IaC ツール選定（Terraform）の判断記録。Phase 5.1 の成果物 | 開発者本人 / 今後の運用作業 |
| `infra/` 配下（今後） | AWS 構成図、SLO 定義、ポストモーテム等の運用ドキュメント置き場 | 開発者本人 / 今後の運用作業 |

---

## なぜこの階層なのか

- **`roadmap/` を分けた理由**: 「プロジェクトの実装計画（PROJECT）」と「開発者本人のキャリア計画（CAREER）」は読む目的も更新頻度も異なる。混ぜると `PROJECT.md` の純粋な作業指示性が薄まる。
- **`infra/` を先に切った理由**: 新 ROADMAP の Phase 4〜6（AWS 公開・IaC・SRE）で運用系ドキュメント（構成図・SLO・ポストモーテム）が必ず増える。フラットに増やすと `ARCHITECTURE.md` と責務が混ざるため、最初から箱を分けておく。
- **アーキテクチャ系（ARCHITECTURE / CONVENTIONS / ISSUES）はルートに残した理由**: 参照頻度が最も高く、サブフォルダに沈めるとパスが長くなって不便。

---

## 作業フロー

1. 何かを変更する前に `ISSUES.md` と `roadmap/PROJECT.md` を読む
2. コードを書くときは `ARCHITECTURE.md` と `CONVENTIONS.md` を必要に応じて参照
3. 変更が済んだら、影響範囲に応じて該当ドキュメントを更新（`CONVENTIONS.md` 第 11 章のルール）
   - Issue 解決 → `ISSUES.md` に取り消し線
   - Phase Milestone 完了 → `roadmap/PROJECT.md` の該当チェックボックスを更新
   - アーキテクチャに影響する変更 → `ARCHITECTURE.md` の該当節を更新
   - インフラ・運用系の変更 → `infra/` 配下のドキュメントを追加・更新

---
name: next-task
description: Survey docs/ISSUES.md and docs/roadmap/PROJECT.md, then propose the next 2-3 work items in priority order. Use this skill when starting a session and unsure what to tackle, or when finishing one task and looking for the next.
---

# /next-task — 次に着手すべき作業を提示する

ISSUES.md と PROJECT.md を突き合わせて、 ユーザに「次は何をやるべきか」の候補を出すスキルです。 候補は**根拠付き**で 2〜3 件出し、 ユーザに選んでもらいます。

## 実行手順

1. 以下のファイルを Read で取得:
   - `docs/ISSUES.md`
   - `docs/roadmap/PROJECT.md`
   - `docs/roadmap/CAREER.md`（補助参照）
2. `git log --oneline -5` で直近の作業文脈を確認
3. 以下の優先順位ルールで候補を抽出:
   - **最優先**: `ISSUES.md` の Priority: High（あれば）
   - **次点**: `PROJECT.md` で未チェックの最若 Phase の最若 Milestone（依存の解けているもの）
   - **並行可**: Phase 3（PS1 表現の創作トラック）の未着手 Milestone
   - **AWS 系**: Phase 4.1 / 4.3 / 5.x / 6.x は **AWS 環境構築の段取り** が必要なので、 ローカルで手が動かないことを明示
4. 候補ごとに以下を 1 ブロックで提示:
   - タイトル（出典: `ISSUES.md` #N or `PROJECT.md` Phase X.Y）
   - なぜ今これをやるべきか（1 文）
   - 概算ボリューム（5min / 30min / 1h+ / 1day+）
   - 着手前に必要な前提（例: AWS アカウント、 Node バージョン、 別タスクの完了）
   - 関連ファイル

## 出力フォーマット例

```
次の作業候補:

【1】 ISSUES #11: テストカバレッジ拡大
  - なぜ: 既に MapGenerator は covered。 Storage/Api/applyDifficulty を埋めれば
          以後のリファクタの安全網が広がる。 AWS 不要で完結
  - ボリューム: 30min
  - 前提: なし
  - 関連: tests/MapGenerator.test.js（既存パターン）

【2】 PROJECT.md Phase 3.2: アフィンテクスチャマッピング
  - なぜ: Phase 3.1 / 3.3 は済んでおり、 3.2 を埋めると PS1 表現の創作トラックが
          一段落する。 既存の applyPs1VertexSnap と同じ onBeforeCompile パターンで書ける
  - ボリューム: 1h
  - 前提: なし
  - 関連: src/shaders/applyPs1VertexSnap.js（実装パターンの参考）

【3】 PROJECT.md Phase 4.1: S3 + CloudFront 配信
  - なぜ: スキル習得トラックの本丸。 ただし AWS アカウント側で操作が必要
  - ボリューム: 半日（手順を docs に残しながら）
  - 前提: AWS アカウント、 IAM ユーザ、 CLI 設定
  - 関連: docs/infra/IAC_CHOICE.md（Terraform で IaC 化する前提の手動構築段階）

どれを進めますか？
```

## 提示時の注意

- **「全部やろう」とは言わない**。 ユーザに選んでもらう（auto mode でも、 タスクの方向性は人間の意図次第）
- 既に in_progress な作業がある場合（コミットされていない大きな差分）はそれを優先候補として出す
- ROADMAP の「Claude Code への作業方針」（Phase 4.x 以降の段階的説明方針）に該当する場合は、 候補ごとにそれを注記する
- ユーザの今のコンテキスト（ブラウザを開いているか、 Node がどのバージョンか、 直近のコミット内容）を踏まえて、 「今すぐ着手できる」候補を優先的に出す

## やらないこと

- 勝手に着手を始めない（候補提示まで）
- 全 Milestone を網羅した一覧化はしない（ユーザは PROJECT.md を読めば見える）

---
name: add-issue
description: Add a new entry to docs/ISSUES.md following the project's established format (Priority / file path / 現象 / 対応方針). Use this skill when a bug or design problem is discovered that should be tracked separately from the immediate task.
---

# /add-issue — `docs/ISSUES.md` に新規エントリを追加

新しい不具合・不整合を発見したとき、 既存のフォーマット（Priority / ファイル / 現象 / 対応方針）に従って `docs/ISSUES.md` に追記するためのスキルです。

## 既存フォーマット（必ず合わせる）

```markdown
### Issue #N — 短い 1 行サマリ

**ファイル**: `path/to/file.jsx` L行番号

説明本文。 現象を具体的に書く。 コードスニペットや再現条件がある場合は ``` ブロックで添える。

**対応方針**: 何をどう直せば解決するか。 工数感（5min / 30min / 半日）も書けると良い。
```

## 実行手順

1. **Read で `docs/ISSUES.md` を読む** — 最大の Issue 番号を把握し、 +1 で次の番号を決める
2. **Priority を選ぶ**:
   - **High**: コンパイル不可・致命的な実行時エラー・データロスの可能性
   - **Medium（動作するがバグ / 不整合）**: 機能が部分的に壊れている、 仕様と挙動の乖離
   - **Medium（環境制約）**: ローカル環境・ツールチェーンの問題
   - **Low**: ランタイム影響小の改善項目（パフォーマンス / コード品質 / 軽微なバグ）
   - **Nice-to-have**: 運用・品質向上のための提案
3. **Edit で対応 Priority セクションの末尾に追加** — `---` 区切りの前
4. **対応方針には次のいずれかを書く**:
   - 具体的な修正案（手順）
   - 「`docs/roadmap/PROJECT.md` Phase X.Y で対応予定」（ROADMAP に既に計画があれば）
   - 「要調査」（原因不明な場合）

## 注意事項

- **既存の Issue と重複しないか**を先に grep で確認する。 似た内容が既にあるなら、 そちらに加筆する形が望ましい
- **解決済み Issue（取り消し線付き）の枠は触らない**。 そこは履歴として残す
- 番号は採番後、 二度と振り直さない（後方互換のため）
- ファイル末尾の「修正時の作業フロー」セクションは編集対象ではない

## 追加後のフォロー

- 追加した Issue が**今すぐ修正可能**なら、 ユーザに「同じセッションで直しますか？」と確認
- **ROADMAP の Phase に紐づく**なら、 `PROJECT.md` 側からも `../ISSUES.md` #N と参照を貼る（既存の他 Phase の参照スタイルに合わせる）
- 追加 Issue が**新規発見の機能要求** に近い場合は、 ISSUES ではなく `PROJECT.md` の該当 Phase 配下に Milestone として追加するか提案する

## やらないこと

- ユーザ確認なしに、 issue を「解決済み」マークに勝手に移動する
- 既存の Issue 番号を入れ替える
- 取り消し線つき Issue を削除する（履歴として残す方針）

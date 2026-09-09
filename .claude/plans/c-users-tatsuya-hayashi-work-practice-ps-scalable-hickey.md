# docs/ 再整理 ＋ AI エージェント引継ぎドキュメントの新設

## Context

`docs/` 配下（README / ARCHITECTURE / CONVENTIONS / ISSUES / PS1_REDESIGN / roadmap/PROJECT / roadmap/CAREER / infra/IAC_CHOICE）を通読し、実際のコード状態（`node --version` → v14.18.0 のまま、`src/shaders/` は空、`App.jsx` の `PS1_TARGET_WIDTH=480` 等）と突き合わせて検証済み。ドキュメント自体は大筋で正確だが、下記 2 つの課題がある。

1. **同じ事実が 4〜5 ファイルに重複記述されている。** 典型例は「頂点スナップ / アフィンテクスチャは試行→ユーザ却下」という経緯で、`CLAUDE.md`（落とし穴 #3）・`ARCHITECTURE.md`（§4.2, §9）・`roadmap/PROJECT.md`（Milestone 3.1/3.2）・`PS1_REDESIGN.md`（§1, §3, §4）にほぼ同内容が別々の言い回しで存在する。直近コミット `5e5f302`（「ドキュメントの齟齬を修正」）はこの重複が原因でドキュメント間に食い違いが生じたことの証跡。`PS1_REDESIGN.md` は既に「single source of truth」を自称しているので、他ファイルはそこへのポインタに縮退させるべき。
2. **「現状を一目で把握できる」ドキュメントが存在しない。** 新セッションを始めた Claude は `CLAUDE.md` → `ISSUES.md` → `roadmap/PROJECT.md`（チェックボックス）→ `PS1_REDESIGN.md`（§4 進捗ログ）→ `git log` を横断してようやく「今どこまで進んでいるか」を再構成する必要がある。ユーザの要望（「最後にAIエージェントに引継ぎが可能なようなドキュメントを生成してもらえると現状の把握が容易になる」）は、この横断作業を 1 ファイルに集約すること。

既存の `.claude/skills/next-task/SKILL.md` は「次に何をやるか」を毎回動的に算出するスキルであり、静的ドキュメントに次アクションを列挙すると重複・陳腐化するため、新ドキュメントは「次に何をやるか」の列挙はせず `/next-task` へポインタするだけに留める。

## 変更方針

### 1. 新設: `docs/HANDOFF.md`（AI エージェント引継ぎ用の状況スナップショット）

`PS1_REDESIGN.md` の「新セッション向け冒頭指示 + 進捗ログ」パターン（既に実績あり）をプロジェクト全体に拡張する形で新設する。構成：

- 冒頭: 新セッションの Claude が最初に読む前提で、読む順序を明示（本ファイル → 必要なら個別 docs → `/next-task`）
- §1 プロジェクト概要（1 段落）
- §2 Phase 進捗マップ（Phase 0〜7 を状態付きで一覧。詳細は `roadmap/PROJECT.md` へポインタし、ここでは重複させない）
- §3 今アクティブな作業とその状態（Phase 3 PS1 表現が Step 1 完了・Step 2 以降待機である点、Phase 4 はフロント送信コードのみ実装済みでインフラ未構築である点など）
- §4 既知のブロッカー・環境制約（Node v14.18.0 のままで lint/build 不可、ユーザ側作業が必要 — `ISSUES.md` #14 へポインタ）
- §5 セッションログ（日付ごと追記式。「意味のある区切りの作業が完了したら追記する」という運用ルールを明記 — `PS1_REDESIGN.md §4` と同じ運用）
- §6 ドキュメント地図（`docs/README.md` の索引表への簡易ポインタ）

### 2. 重複記述の削減（他ファイルはポインタへ縮退）

- `CLAUDE.md` の「設計上の落とし穴」#3: 却下理由の詳細な再掲をやめ、「試行→却下済み、詳細は `docs/PS1_REDESIGN.md` 必読」の 1〜2 行に短縮
- `docs/ARCHITECTURE.md` §4.2・§9: 現在の PS1 表現構成（アーキテクチャとして正当な記述）は残しつつ、却下理由の再掲部分のみ `docs/PS1_REDESIGN.md` へのポインタに置換
- `docs/roadmap/PROJECT.md` Milestone 3.1 / 3.2: ユーザ却下コメントの逐語再掲パラグラフを 1〜2 行の状態サマリ + `PS1_REDESIGN.md §1/§3` へのポインタに短縮

### 3. 索引・動線の更新

- `docs/README.md`: 階層図・責務表・作業フローの先頭に `HANDOFF.md` を追加し、「新セッションはまずここ」と明記
- `CLAUDE.md` の「セッション開始時の動線」: ステップ 1 を「`docs/HANDOFF.md` を読む」に変更し、既存の ISSUES/PROJECT 個別確認は「詳細が必要なら」の位置づけに調整
- `docs/CONVENTIONS.md` §11（ドキュメント更新タイミング表）: 「意味のある区切りの作業が完了した」→ `docs/HANDOFF.md` の §5 セッションログに追記、という行を追加

### 変更しないもの

- `docs/ISSUES.md`（既に整理済み・現状と一致していることを確認済み）
- `docs/roadmap/CAREER.md`（個人のキャリア計画、別目的のため据え置き）
- `docs/infra/IAC_CHOICE.md`（意思決定記録、そのまま保持）
- `.claude/skills/*`（今回のドキュメント整理と役割が競合しないことを確認済み）

## 検証

- ドキュメントのみの変更のため `npm run lint/test/build` は対象外。目視で以下を確認する:
  - `docs/HANDOFF.md` から `roadmap/PROJECT.md` / `PS1_REDESIGN.md` / `ISSUES.md` へのリンク（相対パス）が実ファイルと一致している
  - 短縮した各ファイルの記述が、参照先ドキュメントの内容と矛盾しない
  - `docs/README.md` の階層図・責務表が実際のファイル一覧と一致している

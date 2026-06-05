# ISSUES.md — 既知の不具合・修正が必要な箇所

このドキュメントは、**今すぐ修正が必要なコード上の問題** を列挙しています。
新機能実装よりも前に、このファイルの Priority: High 項目から順に潰してください。

---

## Priority: High（コンパイル不可・致命的）

（現時点で未解決の High priority issue はありません）

---

## Priority: Medium（動作するがバグ / 不整合）

（現時点で未解決の Medium priority issue はありません。Issue #15 / #16 は Phase 4 でフロント側の準備が済んだので、AWS バックエンドの構築待ちに移行しました）

---

## Priority: Medium（環境制約）

### Issue #14 — ローカル環境の Node.js バージョンが古い

**現象**: `node --version` が `v14.18.0` を返す。プロジェクトは Node 18 以上が要件（`package.json` の `engines` で明示済み）。

- ESLint 9 は `Object.hasOwn` を使うため Node 16.9+ が必須
- Vite 7 / rolldown-vite は `??=` 演算子を含むため Node 15+ が必須
- その結果、ローカルで `npm run lint` / `npm run build` が一切動かない

**対応方針**:
- ユーザ側で Node.js 18 LTS 以降（推奨 20 LTS）にバージョンアップする必要あり。
- nvm-windows / fnm / volta のいずれかで管理するのが安全。
- Node を更新後、`npm ci` でクリーンインストール → `npm run lint && npm run build` を通す。

---

## Priority: Low（改善推奨 / ランタイムへの影響小）

### Issue #8 — コンパイル時の警告メッセージが未確認

**ファイル**: 全般

`npm run lint` と `npm run build` を一度も実行せずに来ている可能性がある。ESLint の `no-unused-vars` や `react-hooks/exhaustive-deps` で現状警告が出ているかもしれない。

**対応方針**: Claude Code は新規機能の PR 前に必ず `npm run lint` を実行し、警告ゼロを保つこと。

### Issue #9 — アイテム収集時の E キーが他の E キー用途と競合していないか

**ファイル**: `src/components/CollectibleItem.jsx`

E キー押下のリスナを `document` レベルで張っているなら、他所（今後追加されうるメニュー等）と競合する可能性。現状 1 箇所のみで問題なし。機能追加時に注意。

### ~~Issue #10 — ミニマップの `[M]` キーによる拡大/縮小~~（2026-04-24 解決）

`Minimap.jsx` L55-69 の `useEffect` で KeyM トグルが実装されていることを確認。ブレッドクラム機能の追加に合わせて動作検証済み。

---

## Priority: Nice-to-have（品質向上・運用）

### Issue #11 — テストカバレッジを広げる

Vitest を導入し、`MapGenerator` の純粋関数群（同 seed の再現性 / 完全迷路の連結性 / `checkGridCollision` 境界 / `bfsFarthest` / `bfsShortestPath` / `gridToWorld`-`worldToGrid` 往復 など）は `tests/MapGenerator.test.js` でカバー済み。今後追加すべきもの:

- `Storage.js` の localStorage モック越しテスト（ベスト記録の上書きロジック）
- `Api.js` の fetch モックテスト（API 未設定時の no-op / タイムアウト / エラーパス）
- `applyDifficulty` 前後で MAZE/ITEMS が baseline に戻る不変条件

### Issue #12 — `.vscode/settings.json` が TypeScript 寄りになっている

- フロントが JSX なのに TypeScript 設定が並んでいる。Lambda 側と設定が混在。
- `lambda/.vscode/settings.json` を分離するか、全体で整理する。

### ~~Issue #13 — `package.json` に `"engines"` 指定が無い~~（解決済み）

`"engines": { "node": ">=18" }` を追記した。CI 環境やバージョンミスマッチ時に警告が出るようになった。

---

## 修正時の作業フロー

1. Issue を 1 つ選ぶ（High → Medium → Low の順推奨）
2. 修正前に `npm run lint && npm run build` を通し、現状のベースラインを確認
3. 修正
4. `npm run lint && npm run build` を再度通す
5. ブラウザで `npm run dev` 起動して目視確認（特にゲーム挙動に関わる修正）
6. このファイルの該当 Issue を「解決済み」として削除 or 取り消し線
7. コミット

---

## 解決済み Issue 置き場

### ~~Issue #1 — `lambda/src/handler.ts` がコンパイルできない~~（2026-04-24 解決）

全面的に書き直し。`ValidationError` をトップレベルに定義、POST /scores と GET /scores/top の 2 エンドポイントを実装、CORS ヘッダ付与、型定義を一本化。`npm run typecheck` 通過済み。`npm run build`（esbuild）で 5.5KB の bundle 出力を確認。

### ~~Issue #2 — `src/data/config.js` の定数が反映されていない~~（2026-04-24 解決）

`MapGenerator.js`, `PlayerController.jsx`, `CollectibleItem.jsx`, `GameUI.jsx`, `App.jsx` で config 参照に統一。`checkGridCollision` のデフォルト衝突半径も `PLAYER.COLLISION_RADIUS` に変更。スタミナバーの描画幅も `STAMINA_MAX` に対する百分率計算に修正。

### ~~Issue #3 — クリア画面のスコア計算が config と一致しているか要検証~~（2026-04-24 解決）

`GameUI.jsx` の `timeBonus` 計算と `CLEAR BONUS` 表示を `SCORING` 参照に変更。

### ~~Issue #5 — `lambda/DYNAMODB.md` が空~~（2026-04-24 解決）

テーブルスキーマ・GSI 設計・CLI 作成例を記述。

### ~~Issue #4 — `src/shaders/` が空ディレクトリ~~（2026-06-05 解決）

Phase 3.1（頂点スナッピング）の最小実装として `src/shaders/ps1-vertex.glsl` と `src/shaders/applyPs1VertexSnap.js` を追加。`onBeforeCompile` で `meshStandardMaterial` に注入する形にして既存のライティングを温存。`src/components/Structure.jsx` の壁マテリアルに適用済み。

### ~~Issue #6 — `useFrame` 内で `new THREE.Vector3()` を毎フレーム生成~~（2026-06-05 解決）

`PlayerController.jsx` の `forward` / `right` / `dir` / アイテム/鍵/出口距離計算用の一時 Vector3 を `useRef` ベースの使い回しに変更。定数の上方向ベクトルは `UP_VECTOR` としてモジュールスコープへ抽出。`useFrame` 内のアロケーションがゼロに。

### ~~Issue #7 — E キーの連打でアイテムが二重に取れる可能性~~（2026-06-05 解決）

`CollectibleItem.jsx` と `KeyItem.jsx` に `collectedGuardRef` を追加。`setCollected(true)` の state 反映前に発火する連続 keydown を同期的に弾くことで、スコア二重加算を防止。当初は `PlayerController.jsx` のリスナ二重登録を疑っていたが、実機検証で E キーは別ファイルに登録されており、そちらの再入防止が本質的な修正だった。

### ~~Issue #15 — フロント側にスコア送信コードが無く Lambda が事実上未接続~~（2026-06-05 解決）

`src/systems/Api.js`（fetch ラッパ・5s タイムアウト・API 未設定時は no-op）を追加。`GameUI.jsx` のクリア画面にユーザ名入力 + 送信ボタン、スタート画面に ONLINE TOP10 一覧を実装。ユーザ名は `Storage.js` の `getSavedUserName` / `saveUserName` で永続化。AWS バックエンド構築後は `VITE_API_BASE` を設定するだけで疎通する。

### ~~Issue #16 — `.env.example` が無く API ベース URL の管理機構が未整備~~（2026-06-05 解決）

`.env.example` を新規作成。`Api.js` から `import.meta.env.VITE_API_BASE` を参照し、未設定時はクライアント側で graceful degradation（送信スキップ・Top10 非表示）。本番 URL は CI/CD（Phase 7.2）で `.env.production` 経由で注入する想定。

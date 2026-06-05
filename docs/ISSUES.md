# ISSUES.md — 既知の不具合・修正が必要な箇所

このドキュメントは、**今すぐ修正が必要なコード上の問題** を列挙しています。
新機能実装よりも前に、このファイルの Priority: High 項目から順に潰してください。

---

## Priority: High（コンパイル不可・致命的）

（現時点で未解決の High priority issue はありません）

---

## Priority: Medium（動作するがバグ / 不整合）

### Issue #15 — フロント側にスコア送信コードが無く Lambda が事実上未接続

**ファイル**: `src/App.jsx`（`handleExitReach`）、`src/components/UI/GameUI.jsx`（クリア画面）

`lambda/src/handler.ts` には POST `/scores` と GET `/scores/top` が実装済みで `npm run typecheck` / `npm run build` も通る状態だが、フロント側に対応するコードが存在しない。具体的に欠けているもの:

- クリア時のユーザ名入力ダイアログ
- クリア時の `fetch(POST /scores)` 呼び出し（タイム・スコア・seed・難易度を送信）
- スタート画面での `fetch(GET /scores/top)` 呼び出しと Top10 表示

**対応方針**: `docs/roadmap/PROJECT.md` の Phase 4.2 で実装。Issue #16（API URL 管理）と合わせて進める。

---

### Issue #4 — `src/shaders/` が空ディレクトリ

**ファイル**: `src/shaders/.gitkeep`

README には「シェーダー実装用（将来拡張）」とあるが実質使われていない。Phase 3（PS1 表現の深化）で vertex snapping / アフィンテクスチャマッピングを実装する予定なので、現状は `.gitkeep` のまま保持する。

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

### Issue #16 — `.env.example` が無く API ベース URL の管理機構が未整備

**ファイル**: リポジトリルート（`.env.example` 不在）、`src/systems/`（API クライアント不在）

Lambda へのスコア送信（Issue #15）を実装する際、API のベース URL を環境ごとに切り替える仕組みが必要になる。現状フロント側のコードベースに以下が一切無い:

- `.env.example` / `.env.local`
- `import.meta.env.VITE_API_BASE` の参照
- `src/systems/` 配下に API クライアント相当のファイル

**対応方針**: Phase 4.1〜4.2 で導入。Vite は `VITE_` プレフィックスの環境変数を自動的にクライアントへ露出するため、`VITE_API_BASE` という命名で `.env.example` を整備し、`src/systems/Api.js`（仮）から参照する形が素直。本番 URL は CloudFront/API Gateway のドメインを CI/CD（Phase 7.2）で注入する。

---

### Issue #6 — `useFrame` 内で `new THREE.Vector3()` を毎フレーム生成している

**ファイル**: `src/components/PlayerController.jsx` L175, L179, L233, L255

```js
const forward = new THREE.Vector3();      // 毎フレーム alloc
const right = new THREE.Vector3();         // 毎フレーム alloc
const dir = new THREE.Vector3();           // 毎フレーム alloc
camera.position.distanceTo(new THREE.Vector3(...))  // 毎フレーム alloc
```

60fps だと毎秒 240+ オブジェクトの生成。GC 圧力の原因。

**対応方針**: コンポーネントトップに `useRef(new THREE.Vector3())` で使い回し用のインスタンスを作り、`useFrame` 内では `.set()` で更新する。

### Issue #7 — キーボードリスナが `document` に二重登録される可能性

**ファイル**: `src/components/PlayerController.jsx` L107-116

`useEffect` で `document.addEventListener("keydown", ...)` を登録している。依存配列が `[gl]` だけなので通常は 1 回だけだが、React 19 の StrictMode 下で開発時に 2 回登録→ 1 回解除される挙動になる。E キー押下でアイテムが 2 つ取れるなど稀な競合の原因になりうる。

**対応方針**: 現状 StrictMode が有効かを `main.jsx` で確認し、必要なら `capture: true` + 同一参照での remove を厳密化する。

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

### Issue #11 — テストが一切無い

- 単体テスト（`MapGenerator` の生成結果再現性、`checkGridCollision` の境界条件など）の整備を推奨。
- Vitest を推奨（Vite とスムーズに統合）。

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

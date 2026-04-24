# ROADMAP.md — 今後の実装方針

このドキュメントは、PS1-GAME の今後の方向性と実装すべきタスクを整理した作業計画です。
Claude Code は **Phase 0 → Phase 1 → ...** の順に進めることを推奨します。
緊急度と依存関係を考慮した順序になっています。

---

## Phase 0: 基盤整備（最優先）

**目的**: 既存コードの地雷を除去し、今後の追加実装を安全に行える土台を作る。

### ~~Milestone 0.1: 既存バグの修正~~（2026-04-24 完了）
- [x] Lambda `handler.ts` の完全書き直し（Issue #1）
- [x] `lambda/DYNAMODB.md` にテーブルスキーマを記述（Issue #5）

### ~~Milestone 0.2: config の接続~~（2026-04-24 完了）
- [x] `MapGenerator.js` で `MAZE`, `ITEMS`, `TORCH`, `PLAYER` を import
- [x] `PlayerController.jsx` で `PLAYER`, `ITEMS` を import
- [x] `CollectibleItem.jsx` で `ITEMS.COLLECT_DISTANCE` を import
- [x] `GameUI.jsx` で `SCORING`, `PLAYER` を import（スコア計算・スタミナバー幅）
- [x] `App.jsx` で `ITEMS.SCORE_PER_ITEM`, `PLAYER.STAMINA_MAX` を使用
- [x] `checkGridCollision` のデフォルト半径も `PLAYER.COLLISION_RADIUS` 参照に
- [x] `package.json` に `"engines": { "node": ">=18" }` を追記

### Milestone 0.3: リント・ビルドのグリーン化（保留 — 環境制約）
- [ ] `npm run lint` の警告をゼロにする
- [ ] `npm run build` のエラー・警告をゼロにする（`chunkSizeWarningLimit` 由来の警告以外）

**備考**: ローカル環境の Node.js が v14.18.0 のため ESLint / Vite が起動不可（`docs/ISSUES.md` Issue #14）。Node 18 LTS 以上にアップグレード後に検証する必要がある。コード上の修正は完了しており、ソース目視では構文エラーは見当たらない。

### ~~Milestone 0.4: 不要ファイルの整理~~（2026-04-24 完了）
- [x] `src/shaders/` は Phase 3 で使うため `.gitkeep` のまま保持する方針に決定
- [ ] `.vscode/settings.json` の整理（Issue #12）は優先度低のため見送り

---

## Phase 1: ゲームプレイの幅を広げる

**目的**: 1 プレイ完結のゲームとしての完成度を上げる。

### ~~Milestone 1.1: スコア永続化~~（2026-04-24 完了）
- [x] `src/systems/Storage.js` を新設し、localStorage 操作を純粋関数に集約
- [x] ベストタイム・ベストスコアをキー `ps1game:bestTime:<difficulty>` / `ps1game:bestScore:<difficulty>` で保存（難易度別）
- [x] スタート画面にベスト記録を表示
- [x] クリア画面で「★ NEW BEST TIME/SCORE ★」演出

### ~~Milestone 1.2: 難易度調整~~（2026-04-24 完了）
- [x] スタート画面に Easy/Normal/Hard の3択ボタンを追加
- [x] `config.js` に `DIFFICULTY_PRESETS` を追加し、`applyDifficulty` で動的上書き
  - Easy: 迷路 7×7, アイテム 3 個, 松明多め, スタミナ 130
  - Normal: 現状維持（10×10, 5 個）
  - Hard: 迷路 13×13, アイテム 7 個, 松明少なめ, スタミナ 70 / 消費速度増
- [x] 難易度選択を `ps1game:difficulty` で永続化、起動時に復元
- [x] 難易度変更時にダンジョンを即時再生成、ベスト記録も該当難易度のものに差し替え

### ~~Milestone 1.3: サウンド~~（2026-04-24 完了）
- [x] `src/systems/Audio.js` を新設。画像同様、音声ファイルを持たず Web Audio API で手続き合成
- [x] 足音（ヘッドボブの位相に同期したノイズバースト）
- [x] アイテム取得音（上昇ビープ + キラン音）
- [x] ポータル活性化音（全アイテム取得時のうねり）
- [x] クリアファンファーレ（上昇アルペジオ）
- [x] 環境 BGM（低音ドローン 3 オシレータ、フェードイン/アウト付き）
- [x] スタート画面に音量スライダ（SFX / BGM / Mute）、`localStorage` に永続化

### ~~Milestone 1.4: ミニマップの改良~~（2026-04-24 完了）
- [x] `[M]` キーでの拡大/縮小は既存実装 L55-69 で動作することを確認（Issue #10）
- [x] プレイヤーの通過セルを `trailRef` で記録し、ミニマップ上に水色半透明でオーバーレイ表示

---

## Phase 2: ゲームの世界観を深める

**目的**: 「探索するだけ」から「考えて動く」ゲームに昇華する。

### Milestone 2.1: 動的オブジェクト
- [x] 開閉するドア（鍵アイテムと対応）（2026-04-24 完了 — first cut として 1 つの鍵・ドア対を実装）
  - `src/components/Door.jsx` / `src/components/KeyItem.jsx` を新設
  - `MapGenerator.js` に `bfsShortestPath` と鍵/ドア配置ロジック追加
  - `checkGridCollision` に `closedDoorCells` オプションを追加
  - ミニマップ・NearItemIndicator も鍵/ドア表示に対応
  - 拡張余地: 複数組の鍵/ドア、色違い、難易度によって鍵数を増減
- [ ] 回転する罠・床落下ギミック
- [ ] 単純な敵 AI（視界内のプレイヤーを追いかける・スタミナを削る）

### Milestone 2.2: 複数フロア
- [ ] 階段オブジェクトで次フロアへ
- [ ] フロア数を増やすほど迷路サイズ・敵数が増える
- [ ] フロア間遷移時のローディング演出

### Milestone 2.3: アイテムの多様化
- [ ] 種類別アイテム: 鍵 / 体力回復 / 地図（ミニマップ一時解禁）
- [ ] アイテムごとのアイコン・色分け

---

## Phase 3: PS1 表現の深化

**目的**: 「PS1 風」と呼ぶにふさわしい視覚的ディテールを加える。

### Milestone 3.1: 頂点スナッピング
- [ ] カスタム vertex shader でポリゴン座標をグリッド量子化
- [ ] `src/shaders/` に `ps1-vertex.glsl` を配置
- [ ] R3F の `<shaderMaterial>` で適用

### Milestone 3.2: アフィンテクスチャマッピング
- [ ] フラグメントシェーダで PS1 独特のテクスチャ歪みを再現

### Milestone 3.3: ポストプロセス
- [ ] `@react-three/postprocessing` を導入
- [ ] CRT 湾曲 / ノイズ / カラーバンディング
- [ ] ブルーム（松明・アイテムの発光部分）

---

## Phase 4: バックエンド連携（オンラインランキング）

**目的**: Lambda バックエンドを実装しフロントと接続する。

### Milestone 4.1: Lambda 実装
- [ ] `lambda/handler.ts` を完全実装（`docs/ISSUES.md` Issue #1）
- [ ] ローカルで `esbuild` → zip 化が通ることを確認
- [ ] DynamoDB Local などで動作確認

### Milestone 4.2: デプロイインフラ
- [ ] AWS CDK or Terraform でインフラをコード化
- [ ] API Gateway + Lambda + DynamoDB の構成
- [ ] CORS 設定
- [ ] 環境変数（TABLE_NAME, GSI_NAME）の管理

### Milestone 4.3: フロント接続
- [ ] クリア時にユーザ名入力 → スコア送信
- [ ] スタート画面にグローバルランキング（Top 10）表示
- [ ] API エンドポイントは `.env` で管理

---

## Phase 5: 品質・運用

**目的**: 長期メンテナンス可能な状態に持っていく。

### Milestone 5.1: テスト整備
- [ ] Vitest 導入
- [ ] `MapGenerator` の純粋関数群に対する単体テスト
  - 同じ seed で同じ結果が返ることの確認
  - 生成迷路の連結性（全セル到達可能）の検証
  - `checkGridCollision` の境界条件
- [ ] テスト CI 自動実行（GitHub Actions）

### Milestone 5.2: TypeScript 移行
- [ ] `.jsx` → `.tsx` への段階的移行（systems から始める）
- [ ] `tsconfig.json` の `strict: true` 化
- [ ] 型で contract を表現する（`Dungeon` 型、`Item` 型など）

### Milestone 5.3: パフォーマンス計測
- [ ] `stats.js` を dev 時のみ表示
- [ ] `PlayerController` の `useFrame` 内 alloc を削減（Issue #6）
- [ ] 低スペック環境（integrated GPU）での fps 目標設定（30fps 以上）

### Milestone 5.4: CI/CD
- [ ] GitHub Actions で lint + build
- [ ] GitHub Pages or Cloudflare Pages への自動デプロイ

---

## 優先度判断のガイドライン

Claude Code が作業を選ぶ際の指針：

1. **Phase が前のものを優先する**（Phase 0 を終わらせてから Phase 1 に進む）
2. **同 Phase 内では依存関係に従う**（Milestone X.1 → X.2 → ...）
3. **ユーザからの個別指示が最優先**（ROADMAP はデフォルトの進行順であり、ユーザが違う Phase を指示したらそちらに従う）
4. **バグ修正は常に機能追加より優先**（ROADMAP に無くても `docs/ISSUES.md` の High が残っていたらそちらを先に）

---

## 完了済みマイルストーンの置き場

（完了次第、項目をここへ移動する）

例:
- ~~Milestone 0.1: 既存バグの修正（2026-04-XX 完了）~~

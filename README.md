# PS1風 3Dダンジョン探索ゲーム (React + Three.js + WebGL)

## 🎯 プロジェクト概要

**ブラウザ上で動作するPlayStation 1風の3Dダンジョン探索ゲーム**です。
`React` と `@react-three/fiber`（Three.jsのReactバインディング）を使用し、WebGL上でPS1風のグラフィック表現と操作感を再現しています。

プレイヤーは手続き生成されたダンジョン迷路を探索し、5つのアイテムを収集した後、出口ポータルを見つけて脱出することが目標です。

---

## 🧩 実装済み機能

### プレイヤーコントローラー
- W/A/S/D による3D空間内の移動
- マウスによる第一人称視点カメラ制御（PointerLockControls）
- 上下視点角度の制限（±54度）による操作感の安定
- Shiftキーによるダッシュ（スタミナ制）
- 歩行時のヘッドボブ演出（実移動時のみ発動）
- カメラ高さ固定（1.6m）

### 迷路自動生成システム
- Recursive Backtracker アルゴリズムによる10×10迷路の自動生成
- mulberry32 シード付き乱数生成器（再現性のある迷路生成）
- BFS による最遠地点探索（出口配置）
- デッドエンド・ジャンクション検出（アイテム・松明の最適配置）
- 毎回異なるダンジョンレイアウト

### 衝突判定システム
- グリッドベースの Circle-vs-AABB 衝突判定
- X軸・Z軸の独立判定によるスムーズな壁すべり移動
- プレイヤー半径0.35mの衝突範囲

### アイテム収集 & ゴールシステム
- 5つの収集アイテム（デッドエンドに自動配置）
- 距離判定（2.5m以内）によるインタラクション
- Eキーで収集（+10ポイント/アイテム）
- 近接時のパルスアニメーション・発光エフェクト
- 全アイテム収集で出口ポータルが活性化
- 出口到達でダンジョンクリア

### レンダリング環境（PS1風表現）
- 内部レンダー解像度を PS1 域まで下げるダウンサンプル（画面幅に応じて動的計算した `dpr`、上限 0.65）
- アンチエイリアス無効化
- フラットシェーディング
- ポストプロセス（Bloom / Noise / Vignette を薄く重ねる、`@react-three/postprocessing`）
- CRTスキャンライン・ビネット効果（CSSオーバーレイ）
- フォグエフェクト（距離8〜32）
- プレイヤーランタン（カメラ追従ポイントライト）
- 松明（揺らぎアニメーション付きポイントライト、難易度により最大20〜30本）

### ダンジョンビジュアル
- **壁**: Canvas手続き生成テクスチャ — 石積みブロック・目地線・苔パッチ・ツタ（蔦）・経年劣化表現
- **床**: 石畳（フラグストーン）テクスチャ — 不揃いな石板・苔・摩耗跡
- **天井**: 粗い岩肌テクスチャ — ひび割れ・苔の痕跡
- InstancedMesh によるインスタンス描画（壁ブロック数百個を高速レンダリング）
- インスタンスごとの色バリエーション（暖色/寒色のランダムチント）

### 世界観・ゲームプレイ要素
- 開閉ドアと鍵（対応する鍵を所持していないと開かない）
- スパイクトラップ（周期的に発動、踏むとスタミナ減少）
- 敵 AI（視界内のプレイヤーを BFS 経路で追跡、攻撃範囲でスタミナ減少）
- 難易度選択（Easy / Normal / Hard、迷路サイズ・アイテム数・松明数・敵数などが変化）
- スコア・ベスト記録の `localStorage` 永続化（難易度別）
- Web Audio API による効果音・BGM（手続き合成、音声ファイル無し）

### オンラインランキング（サーバーレスバックエンド、AWS 側は未構築）
- クリア画面からのスコア送信 UI、スタート画面の Online Top10 表示は実装済み（`src/systems/Api.js` / `GameUI.jsx`）
- バックエンドは Lambda + DynamoDB（`lambda/`）としてコード実装済みだが、AWS 側のインフラ実体（API Gateway / Lambda デプロイ / DynamoDB テーブル）は未構築
- `VITE_API_BASE` が未設定の間はオフラインモードとして動作（スコア送信・Top10 表示をスキップ）
- 構築手順は `docs/infra/INFRA.md` を参照

### UIシステム
- **HUD**: スコア・アイテム数・経過タイマー
- **スタミナバー**: ダッシュ残量の視覚表示
- **ミニマップ**: Canvas描画・霧の戦場（未探索領域は非表示）・プレイヤー位置・アイテム・出口表示
- **コンパス**: N/S/E/W方位計（カメラ向きにリアルタイム連動）
- **クロスヘア**: 十字型照準
- **スタート画面**: タイトル・操作説明・ミッション概要
- **クリア画面**: タイム・アイテム数・タイムボーナス・クリアボーナス・合計スコア
- **アイテム近接インジケーター**: `[E] アイテム取得` プロンプト

---

## 🏗️ プロジェクト構成

```
PS1-GAME/
├── public/
│   └── vite.svg
├── src/
│   ├── App.jsx                     # メインアプリ（Canvas構成・ゲームステート管理）
│   ├── main.jsx                    # エントリーポイント
│   ├── styles/
│   │   ├── App.css                 # CRTスキャンライン・ビネット・ピクセル化
│   │   └── index.css               # グローバルスタイル
│   ├── data/
│   │   └── config.js               # ゲーム定数 + 難易度プリセット（applyDifficulty）
│   ├── shaders/                    # 現状空ディレクトリ（PS1シェーダー実験は試行後に不採用、docs/PS1_REDESIGN.md 参照）
│   ├── systems/
│   │   ├── MapGenerator.js         # 迷路生成・BFS・衝突判定・座標変換
│   │   ├── TextureGenerator.js     # 手続きテクスチャ生成（石壁・石畳・天井）
│   │   ├── Storage.js              # localStorage永続化（ベスト記録・難易度・ユーザ名）
│   │   ├── Audio.js                # Web Audio API 手続き合成 SE・BGM
│   │   └── Api.js                  # ランキング API クライアント（VITE_API_BASE 未設定時は no-op）
│   ├── components/
│   │   ├── PlayerController.jsx    # プレイヤー移動・ランタン・コンパス・探索追跡
│   │   ├── CollectibleItem.jsx     # 収集アイテム（発光・パルス・Eキー収集）
│   │   ├── KeyItem.jsx             # 鍵アイテム（ドアを開ける）
│   │   ├── Door.jsx                # 開閉ドア
│   │   ├── Trap.jsx                # スパイクトラップ
│   │   ├── Enemy.jsx               # 敵AI（BFS追跡）
│   │   ├── Structure.jsx           # InstancedMesh壁描画
│   │   ├── Floor.jsx               # 石畳テクスチャ床
│   │   ├── Ceiling.jsx             # 岩肌テクスチャ天井
│   │   ├── Torch.jsx               # 松明（揺らぎライト・炎メッシュ）
│   │   ├── Goal.jsx                # 出口ポータル（トーラス・活性化エフェクト）
│   │   ├── PostFX.jsx              # PS1風ポストプロセス（Bloom/Noise/Vignette）
│   │   └── UI/
│   │       ├── GameUI.jsx          # HUD・スタート画面（Online Top10）・クリア画面（スコア送信）・コンパス
│   │       ├── NearItemIndicator.jsx # アイテム接近プロンプト
│   │       └── Minimap.jsx         # ミニマップ（霧の戦場・Mキー拡大・方向矢印）
│   └── assets/
│       └── react.svg
├── lambda/                         # スコアランキング用サーバーレスバックエンド（AWS側は未構築、docs/infra/INFRA.md 参照）
│   ├── src/handler.ts              # POST /scores・GET /scores/top
│   └── DYNAMODB.md                 # テーブルスキーマ・GSI・CLI作成例
├── tests/
│   └── MapGenerator.test.js        # Vitest 単体テスト
├── index.html
├── vite.config.js                  # Vite設定（チャンクサイズ警告閾値含む）
├── eslint.config.js
├── tsconfig.json
├── .env.example                    # VITE_API_BASE 等の環境変数サンプル
├── package.json
└── README.md
```

---

## 🧠 使用技術

| 分類 | 技術 | バージョン | 用途 |
|------|------|-----------|------|
| **フロントエンド** | React | ^19.1.1 | SPA構成・UI管理 |
| **3D描画** | Three.js | ^0.180.0 | WebGL描画・3D数学 |
| **React統合** | @react-three/fiber | ^9.4.0 | Three.jsのReactバインディング |
| **3Dユーティリティ** | @react-three/drei | ^10.7.6 | PointerLockControls等 |
| **ポストプロセス** | @react-three/postprocessing | - | Bloom / Noise / Vignette |
| **ビルドツール** | Vite (rolldown-vite) | 7.1.14 | 開発サーバー・バンドル |
| **リンター** | ESLint | ^9.36.0 | コード品質チェック |
| **パッケージ管理** | npm | - | 依存関係管理 |

### 技術的詳細

- **迷路生成**: Recursive Backtracker + mulberry32シード乱数
- **衝突判定**: グリッドベース Circle-vs-AABB（X/Z軸独立判定）
- **レンダリング**: WebGL2、InstancedMesh、Canvas手続き生成テクスチャ
- **PS1表現**: 画面幅に応じた動的dpr（上限0.65）、NearestFilter、flatShading、CSSスキャンライン
- **パフォーマンス**: `high-performance` パワープリファレンス、InstancedMesh
- **フレーム更新**: `useFrame` フックによるリアルタイム更新

---

## 🎮 操作方法

| 操作 | キー |
|------|------|
| 移動 | **W / A / S / D** |
| 視点移動 | **マウス** |
| ダッシュ | **Shift**（押し続け・スタミナ消費） |
| アイテム取得 | **E**（アイテム近接時） |
| 一時停止 | **ESC** |

---

## 🚀 開発・実行方法

### 環境構築

```bash
# リポジトリのクローン
git clone [リポジトリURL]
cd PS1-GAME

# 依存関係のインストール
npm install

# 開発サーバーの起動（http://localhost:5173）
npm run dev

# ビルド（デプロイ用）
npm run build

# ビルド結果のプレビュー
npm run preview

# リンター実行
npm run lint
```

### 実行環境要件

- Node.js 18以上
- モダンブラウザ（Chrome、Firefox、Edge、Safari）
- WebGL2対応GPU

---

## 🧭 ゲームの流れ

1. **クリックして開始** — PointerLock によるカメラ制御開始
2. **ダンジョン探索** — 迷路を歩き回り、松明の光を頼りに進む
3. **アイテム収集** — 黄色く光るアイテムを5つすべて集める（Eキー）
4. **出口を目指す** — 全アイテム収集で緑色の出口ポータルが活性化
5. **ダンジョンクリア** — スコア・タイム・ボーナスが表示される
6. **再挑戦** — クリックで新しいランダムダンジョンが生成される

### スコア計算

| 項目 | ポイント |
|------|---------|
| アイテム収集 | 10 × 5 = 50 |
| タイムボーナス | max(0, 300 − 経過秒数) |
| クリアボーナス | 50 |

---

## 💡 今後の拡張アイデア

### 技術的改善
- カスタムシェーダーによるCRT風フィルター・カラーリミット（ディザリングは試行の上で一旦不採用。再挑戦の計画は `docs/PS1_REDESIGN.md` 参照）

### ゲームプレイ要素
- 複数フロア / レベルシステム
- タイムアタックモード（ベストタイムは保存済みだが、専用モードとしては未実装）

### インフラ・運用
- AWS へのランキング API 実デプロイ（手順は `docs/infra/INFRA.md`）、Terraform による IaC 化、CI/CD、監視・SLO

### リファクタリング
- TypeScriptへの移行
- `utils/` ディレクトリへのユーティリティ関数移行

---

## 📄 ライセンス

MIT License

(c) 2025 Dominic Tatsuya

自由に改変・学習・派生作品の作成が可能です。

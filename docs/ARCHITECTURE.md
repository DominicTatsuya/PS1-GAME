# ARCHITECTURE.md — アーキテクチャ詳細

このドキュメントは、PS1-GAME のアーキテクチャ・データフロー・設計方針を深く掘り下げたリファレンスです。
新機能を追加する・既存の挙動を変えるときに参照してください。

---

## 1. 全体像

本作は **React 19 + @react-three/fiber + Three.js** で構築された、一人称視点の 3D ダンジョン探索ゲームです。

- バックエンド無し（Lambda は別案件として未接続）
- SPA。ルーティング無し
- 画面遷移はゲーム状態（`isLocked` / `cleared`）で切り替わる

ざっくりしたレイヤ構成：

```
┌────────────────────────────────────────────────┐
│ App.jsx                                        │
│  └─ 状態管理のハブ（useState / useRef）         │
│  └─ Canvas を内包し DungeonScene を描画        │
│  └─ HTML UI（GameUI / Minimap / NearItem）      │
├────────────────────────────────────────────────┤
│ DungeonScene（App.jsx 内のサブコンポーネント）  │
│  └─ lights / Floor / Ceiling / DungeonWalls     │
│  └─ Torches / CollectibleItem / ExitPortal      │
│  └─ PlayerController（カメラ移動・衝突判定）    │
├────────────────────────────────────────────────┤
│ systems/                                        │
│  ├─ MapGenerator.js（迷路生成・座標変換・衝突）│
│  └─ TextureGenerator.js（Canvas 手続きテクスチャ）│
├────────────────────────────────────────────────┤
│ data/config.js（ゲーム定数・※一部未接続）       │
└────────────────────────────────────────────────┘
```

---

## 2. 状態管理の設計（最重要）

### 2.1 なぜ ref と state を分けるのか

React Three Fiber の `useFrame` は **毎フレーム（60fps）実行される** ため、この中で `setState` を呼ぶと React がフレームごとにツリーを再構築しようとして画面が破綻します。

そこで次のルールで値を分けています：

| 用途 | 格納先 | 更新頻度 | 例 |
|------|--------|----------|------|
| UI に表示が必要 | `useState` | ユーザ操作・時間経過 | `score`, `itemCount`, `cleared` |
| 毎フレーム更新する | `useRef` | 60fps | `playerPosRef`, `cameraYawRef`, `staminaRef` |
| 両方必要 | `useRef` → 一定間隔で `useState` にコピー | 60fps → 10fps | `stamina`（ref → state） |

### 2.2 `App.jsx` の責務一覧

```js
// === state（UI 駆動） ===
seed, score, itemCount, isLocked, nearItem, cleared, elapsedTime, stamina

// === ref（高頻度更新） ===
playerPosRef       // プレイヤー位置 {x, z}（ミニマップ用）
exploredRef        // 探索済みセルの Set（ミニマップの霧）
staminaRef         // 0〜100 の数値（ダッシュ計算用）
cameraYawRef       // カメラの水平回転（コンパス用）
collectedItemsRef  // 収集済みアイテム ID の Set
timerRef           // setInterval のハンドル
startTimeRef       // ゲーム開始時刻（Date.now()）
controlsRef        // PointerLockControls への参照
```

### 2.3 ref → state の橋渡し

`useEffect` 内で `setInterval` を立て、100ms ごとに `staminaRef.current` を `setStamina` に反映しています。経過時間も同様に `startTimeRef` から計算して `setElapsedTime` に流します。

**新しい毎フレーム値を追加する場合の手順**：

1. `App.jsx` で `const myValueRef = useRef(初期値)` を作る
2. 必要なコンポーネントに props で渡す
3. そのコンポーネントの `useFrame` 内で `myValueRef.current = ...` と書く
4. UI に出す必要がなければ終わり。出す必要があれば `setInterval` 内で `setMyValue(myValueRef.current)` する

---

## 3. ダンジョン生成パイプライン

`src/systems/MapGenerator.js` の `generateDungeon(seed)` が全ての起点。`App.jsx` で `useMemo(() => generateDungeon(seed), [seed])` されているので、seed が同じ限り同じダンジョンが返ります。

### 3.1 生成手順

```
seed
 │
 ▼
mulberry32(seed)  ─── 擬似乱数生成器（再現性あり）
 │
 ▼
generateMaze(MAZE_W=10, MAZE_H=10, seed)
 │
 │ Recursive Backtracker で完全迷路を生成
 │ grid[y][x]: 0=通路, 1=壁
 │ グリッドサイズ: (10*2+1) × (10*2+1) = 21×21
 │
 ▼
bfsFarthest(grid, 1, 1)  ─── スタート(1,1)から最も遠い地点を出口に
 │
 ▼
findDeadEnds(grid) / findJunctions(grid)
 │
 │ アイテム候補: 行き止まりを優先、不足したら通路セルで補充（最大5個）
 │ 松明候補: 分岐点 + 行き止まり + 直線通路の30%
 │ 松明は「互いにマンハッタン距離4以上」でフィルタ（最大25本）
 │
 ▼
返り値: { grid, gridW, gridH, cellSize, wallHeight,
          wallPositions, startPos, exitPos, items, torches, seed }
```

### 3.2 グリッド座標系

```
グリッド座標 (gx, gy)                ワールド座標 (x, z)
 ┌─────────────┐                 ┌─────────────┐
 │ 奇数 = セル │                 │ Three.js    │
 │ 偶数 = 壁   │   gridToWorld   │ の X-Z 平面 │
 │             │  ──────────▶    │ (Y が上)    │
 │ 21×21 配列  │   worldToGrid   │ 原点はグリッド│
 └─────────────┘  ◀──────────    │ の中心       │
                                  └─────────────┘
```

**セルは必ず奇数座標 `(1,1), (1,3), (3,1), ...` にある** というのが重要です。偶数座標は常に壁または目地です。

### 3.3 衝突判定（Circle-vs-AABB）

`checkGridCollision(position, grid, gridW, gridH, cellSize, radius=0.35)` が壁との重なりを判定します。

- プレイヤーを半径 0.35m の円として扱う
- 周辺のグリッドセルのうち「壁セル」の AABB（軸平行な矩形）との重なりを判定
- `PlayerController` では **X 軸と Z 軸を別々にチェック** することで、壁に対して斜めに当たっても「壁沿いに滑る」挙動を実現

```js
// 疑似コード
const newPosX = camera.position.clone();
newPosX.x += velocity.x;
if (!checkGridCollision(newPosX, ...)) camera.position.x = newPosX.x;

const newPosZ = camera.position.clone();
newPosZ.z += velocity.z;
if (!checkGridCollision(newPosZ, ...)) camera.position.z = newPosZ.z;
```

---

## 4. レンダリング（PS1 風表現）

### 4.1 Canvas の設定（`App.jsx`）

```jsx
<Canvas
  camera={{ position: [..], fov: 75, near: 0.1, far: 40 }}
  gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
  dpr={0.65}
>
```

- `dpr={0.65}`: レンダリング解像度をデバイスピクセル比の 65% に。ジャギー感のあるピクセル描画。
- `antialias: false`: アンチエイリアスを無効化してエッジをシャープに。
- `fog` は `<DungeonScene>` 内で `args={["#141210", 8, 32]}` に設定。距離 8m 先から徐々にフェード、32m で完全に見えなくなる。

### 4.2 壁の描画（`Structure.jsx` = `DungeonWalls`）

- **`InstancedMesh` で一括描画**。数百個の壁ブロックも 1 ドローコール。
- 壁ごとに少しだけ色をずらす（`instancedBufferAttribute` の `Float32Array` に RGB を詰める）。
- テクスチャは `TextureGenerator.js` の `generateStoneWallTexture(seed)` が Canvas で手続き生成。
- `NearestFilter` でテクスチャ補間を切ってレトロ感。

### 4.3 床・天井（`Floor.jsx` / `Ceiling.jsx`）

- それぞれ 1 枚の平面。
- テクスチャは `generateStoneFloorTexture` / `generateCeilingTexture` を利用。

### 4.4 松明（`Torch.jsx`）

- 各松明は壁面に貼り付く形で配置（`wallDirs` から壁方向を決定）。
- `pointLight` を持ち、`useFrame` 内で `intensity` をランダムに揺らして炎の演出。
- **最大 15〜25 本まで** に制限されているのは、WebGL の動的ライト数上限への配慮。

### 4.5 プレイヤーランタン（`PlayerController.jsx` 内）

- `pointLight` を camera 位置に追従させる。
- 色 `#ffeedd`, 強度 6, 距離 20。

### 4.6 CSS オーバーレイ（`styles/App.css`）

- `.scanlines` クラスで横縞スキャンライン + ビネット。`pointer-events: none` で操作を阻害しない。

---

## 5. UI レイヤ

`App.jsx` の `<Canvas>` の外側に HTML UI が重なっています。

| コンポーネント | 役割 | 表示条件 |
|----------------|------|---------|
| `GameUI` | スタート画面・HUD（スコア/アイテム/タイマー/スタミナ/コンパス/クロスヘア）・クリア画面 | 常に表示（中で状態分岐） |
| `NearItemIndicator` | `[E] アイテム取得` プロンプト | `isLocked && !cleared` |
| `Minimap` | Canvas 描画のミニマップ（霧の戦場） | `isLocked && !cleared` |

**コンパスの回転** は `requestAnimationFrame` で直接 DOM の `style.transform` を書き換えて React の再レンダリングを回避しています。

---

## 6. アイテム収集フロー

```
PlayerController.useFrame
  └─ 全アイテムとの距離を計算
  └─ 最も近く、かつ 2.5m 以内、かつ未収集のアイテム を closest として選定
  └─ onNearItem(closest) で App に通知
       │
       ▼
App.setNearItem(closest)
  └─ NearItemIndicator に流れ [E] プロンプト表示
  └─ CollectibleItem 自身にも id match で検知され近接エフェクト発動

ユーザが E キーを押下 → CollectibleItem 内の keydown listener が発火
  └─ onCollect(id) → App.handleItemCollect(id)
       ├─ collectedItemsRef.current.add(id)
       ├─ setScore(prev + 10)
       └─ setItemCount(prev + 1)
```

全アイテム収集で `exitActive = (itemCount >= totalItems)` が true になり、`ExitPortal` が活性化する。プレイヤーが 1.8m 以内に入ると `onExitReach` → `setCleared(true)` でクリア。

---

## 7. ライフサイクル（ゲーム開始〜リスタート）

```
[起動]
  seed = Date.now() で初期化
  isLocked = false → スタート画面表示

[クリック]
  PointerLockControls が onLock を発火
  handleLock:
    - cleared なら handleRestart を呼ぶ（seed 更新 → 新ダンジョン）
    - setIsLocked(true)
  useEffect が isLocked を検知 → タイマー開始

[プレイ中]
  useFrame でプレイヤー移動・衝突判定・アイテム判定
  setInterval で stamina と elapsedTime を UI に反映

[ESC]
  onUnlock → setIsLocked(false) → タイマー停止（useEffect の cleanup）

[全アイテム収集 → 出口到達]
  handleExitReach:
    - setCleared(true)
    - タイマー停止
  クリア画面表示

[クリックで再挑戦]
  handleLock が cleared を検知 → handleRestart → 新 seed でループ
```

---

## 8. パフォーマンス上の注意

- 壁は必ず `InstancedMesh` のまま維持する。個別 `<mesh>` に変えると数百 fps 落ちる。
- ライトは PointLight が 20 本を超えると急激に重くなる。松明上限は慎重に。
- `useFrame` 内で `new THREE.Vector3()` を毎フレーム作るのは GC 圧迫の原因。できれば ref に使い回し用のインスタンスを持たせる（現状は `PlayerController` で一部が毎フレーム new している — 改善余地あり）。
- テクスチャは `useMemo` 必須。毎レンダで CanvasTexture を作ると激重になる。

---

## 9. 既知の設計上の妥協・制限

- 敵・動的オブジェクトが存在しない（README の「今後の拡張」で言及）。
- サウンドなし。
- スコア/タイムの永続化なし（`localStorage` 未利用）。
- Lambda バックエンドとは未接続。
- 設定 UI（音量・感度等）なし。

---

## 10. 参照すべきファイル（一覧）

| ファイル | 役割 |
|---------|------|
| `src/App.jsx` | 状態管理とシーン構成のハブ |
| `src/systems/MapGenerator.js` | 迷路生成・座標変換・衝突判定 |
| `src/systems/TextureGenerator.js` | 手続きテクスチャ生成 |
| `src/components/PlayerController.jsx` | WASD 移動・衝突・ヘッドボブ・ランタン |
| `src/components/Structure.jsx` | InstancedMesh 壁描画 |
| `src/components/Floor.jsx` / `Ceiling.jsx` | 床・天井 |
| `src/components/Torch.jsx` | 松明（揺らぎライト） |
| `src/components/CollectibleItem.jsx` | 収集アイテム |
| `src/components/KeyItem.jsx` | 鍵アイテム（ドアを開ける） |
| `src/components/Door.jsx` | ドア（閉じている時は衝突判定で壁扱い） |
| `src/components/Trap.jsx` | スパイクトラップ（踏むとスタミナ減） |
| `src/components/Enemy.jsx` | 敵 AI（視界内のプレイヤーを BFS 経路で追跡） |
| `src/components/Goal.jsx` | 出口ポータル |
| `src/components/UI/GameUI.jsx` | HUD・タイトル・クリア画面 |
| `src/components/UI/Minimap.jsx` | ミニマップ（霧の戦場） |
| `src/components/UI/NearItemIndicator.jsx` | [E] プロンプト |
| `src/systems/Storage.js` | localStorage 永続化（ベスト記録・難易度・音量） |
| `src/systems/Audio.js` | Web Audio API 手続き合成 SE・BGM |
| `src/data/config.js` | ゲーム定数 + 難易度プリセット + `applyDifficulty` |
| `src/styles/App.css` | CRT スキャンライン・ビネット |

/**
 * App.jsx - ゲーム全体のエントリポイント
 *
 * このファイルはダンジョン探索ゲームのメインコンポーネントです。
 * React Three Fiber（Three.jsのReactラッパー）を使用して
 * 3Dダンジョンシーンを構築し、ゲーム全体の状態管理を行います。
 *
 * 主な役割:
 * - ダンジョンの生成とシードの管理
 * - スコア、アイテム収集、タイマーなどのゲーム状態管理
 * - 3Dシーン（Canvas）とHTML UIの統合
 * - PointerLockControls によるFPS風マウス操作の制御
 */

// ===== React フック =====
// useRef: DOMや値の参照を保持（再レンダリングを発生させない）
// useState: コンポーネントの状態を管理（値が変わると再レンダリング）
// useEffect: 副作用処理（タイマー、イベントリスナーの設定など）
// useCallback: 関数をメモ化して不要な再生成を防止
// useMemo: 計算結果をメモ化して不要な再計算を防止
import { useRef, useState, useEffect, useCallback, useMemo } from "react";

// ===== React Three Fiber =====
// Canvas: Three.jsのレンダラー・シーン・カメラを自動セットアップするコンポーネント
// HTML上に3Dシーンを描画する土台となる
import { Canvas } from "@react-three/fiber";

// ===== React Three Drei =====
// PointerLockControls: マウスカーソルをロックしてFPS風の視点操作を実現する
// クリックでロック、ESCで解除される
import { PointerLockControls } from "@react-three/drei";

// ===== ゲームシステム =====
// generateDungeon: シード値からダンジョンのマップデータを生成する関数
import { generateDungeon } from "./systems/MapGenerator";

// ===== 3Dコンポーネント群 =====
// それぞれのコンポーネントが3Dオブジェクトを描画する
import DungeonWalls from "./components/Structure";       // ダンジョンの壁
import Floor from "./components/Floor";                   // 床面
import Ceiling from "./components/Ceiling";               // 天井
import Torches from "./components/Torch";                 // 松明（たいまつ）ライト
import PlayerController from "./components/PlayerController"; // プレイヤーの移動と衝突判定
import CollectibleItem from "./components/CollectibleItem";   // 収集アイテム
import ExitPortal from "./components/Goal";               // 脱出ポータル（ゴール）

// ===== UIコンポーネント群 =====
import GameUI from "./components/UI/GameUI";               // HUD（スコア、タイマー等の表示）
import NearItemIndicator from "./components/UI/NearItemIndicator"; // アイテム近接時の[E]プロンプト
import Minimap from "./components/UI/Minimap";             // ミニマップ表示

// ===== スタイル =====
// PS1風のCRTエフェクト（スキャンライン、ビネット）を適用するCSS
import "./styles/App.css";

/**
 * DungeonScene コンポーネント
 *
 * Canvas 内に配置される3Dシーン全体を構成するコンポーネント。
 * Three.jsのライト、3Dモデル（壁・床・天井）、プレイヤーなどを含む。
 *
 * React Three Fiber では、JSXタグがそのまま Three.js のオブジェクトに変換される。
 * 例: <ambientLight> → new THREE.AmbientLight()
 *
 * @param {Object} dungeon - 生成されたダンジョンデータ（壁位置、サイズ等）
 * @param {Function} onItemCollect - アイテム収集時のコールバック
 * @param {boolean} isLocked - ポインターロック状態（ゲームプレイ中かどうか）
 * @param {Array} items - ダンジョン内のアイテム一覧
 * @param {Object} collectedItemsRef - 収集済みアイテムIDのSetを保持するref
 * @param {Function} onNearItem - 近くのアイテム情報を親に通知するコールバック
 * @param {boolean} exitActive - 全アイテム収集後に出口が有効になるフラグ
 * @param {Function} onExitReach - 出口到達時のコールバック
 * @param {Object} playerPosRef - プレイヤー位置を格納するref
 * @param {Object} exploredRef - 探索済みセルを記録するref
 * @param {Object} staminaRef - スタミナ値を格納するref
 * @param {Object} cameraYawRef - カメラのヨー角（水平回転角）を格納するref
 */
function DungeonScene({ dungeon, onItemCollect, isLocked, items, collectedItemsRef, onNearItem, exitActive, onExitReach, playerPosRef, exploredRef, staminaRef, cameraYawRef }) {
  return (
    <>
      {/* ===== ライティング設定 ===== */}

      {/* 環境光: シーン全体を均一に照らす光源。影を作らない。
          intensity=0.8 でやや明るめ、color="#ccccee" で青白い雰囲気 */}
      <ambientLight intensity={0.8} color="#ccccee" />

      {/* 半球光: 上（空）と下（地面）で色が異なるグラデーション光源。
          args=[空の色, 地面の色, 強度] で自然な環境光を演出 */}
      <hemisphereLight args={["#aa99bb", "#776655", 0.7]} />

      {/* 平行光: 太陽光のように一方向から照らす光源。
          position=[0,10,0] で真上から照射 */}
      <directionalLight position={[0, 10, 0]} intensity={0.25} color="#bbbbdd" />

      {/* ===== 3Dオブジェクト ===== */}

      {/* 床面の描画。ダンジョンのグリッドサイズに合わせて生成 */}
      <Floor gridW={dungeon.gridW} gridH={dungeon.gridH} cellSize={dungeon.cellSize} />

      {/* 天井の描画。wallHeight で天井の高さを指定 */}
      <Ceiling gridW={dungeon.gridW} gridH={dungeon.gridH} cellSize={dungeon.cellSize} wallHeight={dungeon.wallHeight} />

      {/* ダンジョンの壁を描画。wallPositions は壁のあるセルの座標配列 */}
      <DungeonWalls wallPositions={dungeon.wallPositions} cellSize={dungeon.cellSize} wallHeight={dungeon.wallHeight} />

      {/* 松明（ポイントライト）を配置して暗いダンジョンを照らす */}
      <Torches positions={dungeon.torches} />

      {/* ===== 収集アイテム =====
          items 配列を map で展開し、各アイテムを3Dオブジェクトとして配置。
          key={item.id} は React がリスト要素を効率的に管理するために必要 */}
      {items.map((item) => (
        <CollectibleItem key={`${dungeon.seed}_${item.id}`} position={item.position} id={item.id} onCollect={onItemCollect} />
      ))}

      {/* 脱出ポータル（ゴール）。active=true のとき視覚的に有効化される */}
      <ExitPortal position={dungeon.exitPos} active={exitActive} />

      {/* ===== プレイヤー制御 =====
          WASD移動、衝突判定、近接アイテム検出、スタミナ管理などを処理。
          このコンポーネント自体は何も描画しない（null を返す） */}
      <PlayerController
        isLocked={isLocked}
        dungeon={dungeon}
        onNearItem={onNearItem}
        items={items}
        collectedItemsRef={collectedItemsRef}
        onExitReach={onExitReach}
        exitActive={exitActive}
        playerPosRef={playerPosRef}
        exploredRef={exploredRef}
        staminaRef={staminaRef}
        cameraYawRef={cameraYawRef}
      />

      {/* シーンの背景色を暗い茶色に設定。attach="background" で Scene.background に紐付く */}
      <color attach="background" args={["#141210"]} />

      {/* フォグ（霧）効果。遠くのオブジェクトを徐々にフェードアウトさせて
          視認距離を制限し、ダンジョンの暗い雰囲気を演出する。
          args=[色, 開始距離, 終了距離] */}
      <fog attach="fog" args={["#141210", 8, 32]} />
    </>
  );
}

/**
 * App コンポーネント（メインコンポーネント）
 *
 * ゲーム全体のルートコンポーネント。以下を統合管理する:
 * 1. ゲーム状態（スコア、アイテム数、タイマー、スタミナ等）
 * 2. 3Dシーン（Canvas + DungeonScene）
 * 3. HTML UI（GameUI, Minimap, NearItemIndicator）
 * 4. ゲームのライフサイクル（開始、プレイ中、クリア、リスタート）
 */
export default function App() {
  // ===== ゲーム状態（useState）=====
  // useState の値が変わると、コンポーネントが再レンダリングされる

  // シード値: ダンジョン生成の種。変更するたびに新しいダンジョンが生成される
  // () => Date.now() は初期値を遅延評価する（初回のみ実行される）
  const [seed, setSeed] = useState(() => Date.now());

  // スコア: アイテム収集で加算される
  const [score, setScore] = useState(0);

  // 収集アイテム数
  const [itemCount, setItemCount] = useState(0);

  // 収集済みアイテムIDの Set（ref: リアルタイム参照用、値が変わっても再レンダリングしない）
  // useState ではなく useRef を使うことで、アイテム取得時にシーン全体の再描画を防ぐ
  const collectedItemsRef = useRef(new Set());

  // ポインターロック状態（true = ゲームプレイ中、false = メニュー/一時停止）
  const [isLocked, setIsLocked] = useState(false);

  // 近くにあるアイテムの情報（[E]プロンプト表示に使用）
  const [nearItem, setNearItem] = useState(null);

  // クリア状態
  const [cleared, setCleared] = useState(false);

  // 経過時間（秒）
  const [elapsedTime, setElapsedTime] = useState(0);

  // スタミナ（ダッシュで消費、静止で回復）
  const [stamina, setStamina] = useState(100);

  // ===== Ref（参照値）=====
  // useRef は値が変わっても再レンダリングを発生させない。
  // フレーム毎に更新される値や、子コンポーネントへの直接参照に使う。

  // プレイヤーの現在位置（x, z座標）
  const playerPosRef = useRef({ x: 0, z: 0 });

  // 探索済みグリッドセルの記録（ミニマップの霧に使用）
  const exploredRef = useRef(new Set());

  // スタミナ値のリアルタイム参照
  const staminaRef = useRef(100);

  // カメラのヨー角（水平回転角度）。コンパスとミニマップの方向表示に使用
  const cameraYawRef = useRef(0);

  // タイマーのインターバルID
  const timerRef = useRef(null);

  // ゲーム開始時刻
  const startTimeRef = useRef(null);

  // PointerLockControls の参照
  const controlsRef = useRef();

  // ===== メモ化された値（useMemo）=====
  // 依存配列の値が変わった場合のみ再計算される。
  // 重い処理（ダンジョン生成など）の無駄な再実行を防止する。

  // シード値からダンジョンデータを生成（シードが変わるまで同じ結果を返す）
  const dungeon = useMemo(() => generateDungeon(seed), [seed]);

  // ダンジョンのアイテム一覧
  const items = useMemo(() => dungeon.items, [dungeon]);

  // アイテム総数
  const totalItems = items.length;

  // 全アイテムを収集したら出口（ExitPortal）が有効になる
  const exitActive = itemCount >= totalItems;

  // ===== タイマーの副作用 =====
  // ゲーム開始（ポインターロック時）にタイマーを起動し、
  // 100ms間隔で経過時間とスタミナを更新する
  useEffect(() => {
    // ゲーム開始時に開始時刻を記録（初回のみ）
    if (isLocked && !cleared && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    // ゲームプレイ中にタイマーを起動
    if (isLocked && !cleared) {
      timerRef.current = setInterval(() => {
        // 経過時間をミリ秒から秒に変換して更新
        if (startTimeRef.current) {
          setElapsedTime((Date.now() - startTimeRef.current) / 1000);
        }
        // ref からスタミナ値を読み取って state に反映（UIに表示するため）
        setStamina(staminaRef.current);
      }, 100);
    }

    // クリーンアップ関数: コンポーネントのアンマウント時やdeps変更時にタイマーを停止
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLocked, cleared]);

  // ===== コールバック関数（useCallback）=====
  // useCallback で関数をメモ化し、依存値が変わるまで同じ関数参照を返す。
  // 子コンポーネントへの props として渡す関数に使うと不要な再レンダリングを防げる。

  /**
   * アイテム収集時のハンドラ
   * - 収集済みセットに追加
   * - スコアに10点加算
   * - 収集数を1増加
   */
  const handleItemCollect = useCallback((id) => {
    collectedItemsRef.current.add(id);
    setScore((prev) => prev + 10);
    setItemCount((prev) => prev + 1);
  }, []);

  /**
   * 出口到達時のハンドラ
   * ゲームをクリア状態にし、タイマーを停止する
   */
  const handleExitReach = useCallback(() => {
    if (!cleared) {
      setCleared(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [cleared]);

  /**
   * リスタート時のハンドラ
   * 全ての状態を初期値にリセットし、新しいシードでダンジョンを再生成する
   */
  const handleRestart = useCallback(() => {
    setSeed(Date.now());
    setScore(0);
    setItemCount(0);
    collectedItemsRef.current = new Set();
    setCleared(false);
    setElapsedTime(0);
    setStamina(100);
    staminaRef.current = 100;
    exploredRef.current = new Set();
    playerPosRef.current = { x: 0, z: 0 };
    startTimeRef.current = null;
  }, []);

  /**
   * ポインターロック時（ゲーム開始/再開時）のハンドラ
   * クリア済みの場合はリスタートしてからロック
   */
  const handleLock = useCallback(() => {
    if (cleared) {
      handleRestart();
    }
    setIsLocked(true);
  }, [cleared, handleRestart]);

  /**
   * ポインターアンロック時（ESCキー押下時）のハンドラ
   */
  const handleUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  // ===== レンダリング =====
  return (
    // ゲーム全体を包むコンテナ。CSS で 100vw x 100vh に設定
    <div className="game-container">

      {/* ===== Three.js 3Dシーン =====
          Canvas コンポーネントが Three.js の WebGLRenderer, Scene, Camera を自動生成する。
          camera: 初期カメラ位置・視野角・描画範囲を設定
          gl: WebGL レンダラーの設定（アンチエイリアスOFFでPS1風のジャギー感を演出）
          dpr: デバイスピクセル比を0.65に下げてPS1風の低解像度を再現 */}
      <Canvas
        camera={{ position: [dungeon.startPos.x, dungeon.startPos.y, dungeon.startPos.z], fov: 75, near: 0.1, far: 40 }}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
        dpr={0.65}
      >
        {/* PointerLockControls: クリックでマウスカーソルをロックし、FPS風の視点操作を有効にする。
            minPolarAngle / maxPolarAngle で上下の視点移動範囲を制限（真上・真下は見られないように） */}
        <PointerLockControls
          ref={controlsRef}
          onLock={handleLock}
          onUnlock={handleUnlock}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
        />

        {/* 3Dダンジョンシーンの描画 */}
        <DungeonScene
          dungeon={dungeon}
          onItemCollect={handleItemCollect}
          isLocked={isLocked}
          items={items}
          collectedItemsRef={collectedItemsRef}
          onNearItem={setNearItem}
          exitActive={exitActive}
          onExitReach={handleExitReach}
          playerPosRef={playerPosRef}
          exploredRef={exploredRef}
          staminaRef={staminaRef}
          cameraYawRef={cameraYawRef}
        />
      </Canvas>

      {/* ===== CRTエフェクト =====
          PS1風のスキャンライン（横縞）オーバーレイ。CSSで実装。
          pointer-events: none で3Dシーンへのクリックを妨げない */}
      <div className="scanlines" />

      {/* ===== ゲームUI（HUD）=====
          スコア、アイテム数、タイマー、スタミナ、コンパス、
          スタート画面、クリア画面などのHTML UI を表示。
          3Dシーンの上にオーバーレイとして配置される */}
      <GameUI
        score={score}
        itemCount={itemCount}
        totalItems={totalItems}
        isLocked={isLocked}
        elapsedTime={elapsedTime}
        stamina={stamina}
        cleared={cleared}
        cameraYawRef={cameraYawRef}
      />

      {/* ゲームプレイ中かつ未クリア時のみ、アイテム近接プロンプト[E]を表示 */}
      {isLocked && !cleared && <NearItemIndicator nearItem={nearItem} />}

      {/* ゲームプレイ中かつ未クリア時のみ、ミニマップを表示。
          [M]キーで拡大/縮小を切り替え可能 */}
      {isLocked && !cleared && (
        <Minimap
          dungeon={dungeon}
          playerPosRef={playerPosRef}
          exploredRef={exploredRef}
          items={items}
          collectedItemsRef={collectedItemsRef}
          exitActive={exitActive}
          cameraYawRef={cameraYawRef}
        />
      )}
    </div>
  );
}

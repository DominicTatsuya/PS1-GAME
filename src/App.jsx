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
// getBestTime / getBestScore / updateBestRecord:
// localStorage を使ったベスト記録の永続化ユーティリティ
import {
  getBestTime,
  getBestScore,
  updateBestRecord,
  getSavedDifficulty,
  saveDifficulty,
} from "./systems/Storage";
// サウンドシステム: Web Audio API 手続き合成 SE・BGM
import * as Audio from "./systems/Audio";

// ===== 3Dコンポーネント群 =====
// それぞれのコンポーネントが3Dオブジェクトを描画する
import DungeonWalls from "./components/Structure";       // ダンジョンの壁
import Floor from "./components/Floor";                   // 床面
import Ceiling from "./components/Ceiling";               // 天井
import Torches from "./components/Torch";                 // 松明（たいまつ）ライト
import PlayerController from "./components/PlayerController"; // プレイヤーの移動と衝突判定
import CollectibleItem from "./components/CollectibleItem";   // 収集アイテム
import KeyItem from "./components/KeyItem";               // 鍵アイテム
import Door from "./components/Door";                     // ドア
import Trap from "./components/Trap";                     // スパイクトラップ
import Enemy from "./components/Enemy";                   // 敵（追跡型モンスター）
import ExitPortal from "./components/Goal";               // 脱出ポータル（ゴール）

// ===== UIコンポーネント群 =====
import GameUI from "./components/UI/GameUI";               // HUD（スコア、タイマー等の表示）
import NearItemIndicator from "./components/UI/NearItemIndicator"; // アイテム近接時の[E]プロンプト
import Minimap from "./components/UI/Minimap";             // ミニマップ表示

// ===== ゲーム定数 =====
// スコア・スタミナなどの定数は config.js に集約している
// applyDifficulty は選択中の難易度に応じて MAZE / ITEMS / TORCH / PLAYER / TRAP / ENEMY を書き換える
import { ITEMS, PLAYER, SCORING, TRAP, ENEMY, applyDifficulty } from "./data/config";

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
function DungeonScene({ dungeon, onItemCollect, onKeyCollect, heldKeys, isLocked, items, collectedItemsRef, onNearItem, exitActive, onExitReach, playerPosRef, exploredRef, trailRef, staminaRef, cameraYawRef, closedDoorCellsRef, heldKeysRef, onTrapHit, onEnemyHit, enemyPositionsRef }) {
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

      {/* ===== 鍵アイテム =====
          ドアを開くための鍵。拾うと heldKeys に追加される */}
      {(dungeon.keys || []).map((k) => (
        <KeyItem key={`${dungeon.seed}_${k.id}`} position={k.position} id={k.id} onCollect={onKeyCollect} />
      ))}

      {/* ===== ドア =====
          対応する鍵を所持していれば open=true。閉じている時は衝突判定で壁扱い */}
      {(dungeon.doors || []).map((d) => (
        <Door
          key={`${dungeon.seed}_${d.id}`}
          position={d.position}
          cellSize={dungeon.cellSize}
          wallHeight={dungeon.wallHeight}
          open={heldKeys.has(d.keyId)}
        />
      ))}

      {/* ===== 罠 =====
          踏むとスタミナを減らすスパイクトラップ。onTrapHit は App 側で
          クールダウン管理されるので、ここでは毎フレーム呼んで良い */}
      {(dungeon.traps || []).map((t) => (
        <Trap
          key={`${dungeon.seed}_${t.id}`}
          id={t.id}
          position={t.position}
          phaseOffset={t.phaseOffset}
          onHit={onTrapHit}
        />
      ))}

      {/* ===== 敵 =====
          視界内のプレイヤーを BFS 経路で追跡。攻撃範囲でダメージを与える */}
      {(dungeon.enemies || []).map((e) => (
        <Enemy
          key={`${dungeon.seed}_${e.id}`}
          id={e.id}
          spawnPos={e.spawnPos}
          dungeon={dungeon}
          playerPosRef={playerPosRef}
          isLocked={isLocked}
          onHit={onEnemyHit}
          closedDoorCellsRef={closedDoorCellsRef}
          positionsRef={enemyPositionsRef}
        />
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
        trailRef={trailRef}
        staminaRef={staminaRef}
        cameraYawRef={cameraYawRef}
        closedDoorCellsRef={closedDoorCellsRef}
        heldKeysRef={heldKeysRef}
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

  // 取得済みの鍵 ID 集合。これを state にしているのは Door の open prop に
  // 即時反映させる必要があるため（PlayerController のフレーム処理では間に合わない）
  const [heldKeys, setHeldKeys] = useState(() => new Set());

  // ポインターロック状態（true = ゲームプレイ中、false = メニュー/一時停止）
  const [isLocked, setIsLocked] = useState(false);

  // 近くにあるアイテムの情報（[E]プロンプト表示に使用）
  const [nearItem, setNearItem] = useState(null);

  // クリア状態
  const [cleared, setCleared] = useState(false);

  // 経過時間（秒）
  const [elapsedTime, setElapsedTime] = useState(0);

  // スタミナ（ダッシュで消費、静止で回復）
  const [stamina, setStamina] = useState(PLAYER.STAMINA_MAX);

  // 難易度（localStorage から初期値を遅延ロード）
  // 初期化時に applyDifficulty を呼んで、config 側の値を該当難易度で上書きしておく
  const [difficulty, setDifficultyState] = useState(() => {
    const d = getSavedDifficulty();
    applyDifficulty(d);
    return d;
  });

  // ベスト記録（難易度別。localStorage から遅延ロード）
  const [bestTime, setBestTime] = useState(() => getBestTime(difficulty));
  const [bestScore, setBestScore] = useState(() => getBestScore(difficulty));

  // 新記録フラグ（クリア画面での演出用、リスタートでリセット）
  const [newBestTime, setNewBestTime] = useState(false);
  const [newBestScore, setNewBestScore] = useState(false);

  // ===== Ref（参照値）=====
  // useRef は値が変わっても再レンダリングを発生させない。
  // フレーム毎に更新される値や、子コンポーネントへの直接参照に使う。

  // プレイヤーの現在位置（x, z座標）
  const playerPosRef = useRef({ x: 0, z: 0 });

  // 探索済みグリッドセルの記録（ミニマップの霧に使用）
  const exploredRef = useRef(new Set());

  // プレイヤーの実際の通過履歴（ミニマップのブレッドクラム表示に使用）
  // exploredRef は周囲7x7を記録するのに対し、こちらは中心セルだけを記録する
  const trailRef = useRef(new Set());

  // 閉じているドアのセル座標（"gx,gy" 形式）の Set。
  // PlayerController の衝突判定に毎フレーム参照される。
  // heldKeys / dungeon の変化に応じて useEffect で中身を更新する（ref 参照は変えない）
  const closedDoorCellsRef = useRef(new Set());

  // heldKeys State を毎フレーム参照したい箇所用の ref ミラー。
  // PlayerController の近接検出で使う（鍵が取得済みかの即時判定）
  const heldKeysRef = useRef(new Set());

  // 敵の現在位置を記録する Map<enemyId, {x, z}>。Enemy コンポーネントが
  // 毎フレーム更新、Minimap が参照する（state だと毎フレーム再レンダリングで重い）
  const enemyPositionsRef = useRef(new Map());

  // スタミナ値のリアルタイム参照
  const staminaRef = useRef(PLAYER.STAMINA_MAX);

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

  // heldKeys / dungeon が変わったら closedDoorCellsRef と heldKeysRef の中身を更新する。
  // ref オブジェクト自体は差し替えないので、毎フレーム参照する PlayerController は
  // 常に最新値を見ることになる。
  useEffect(() => {
    const next = new Set();
    for (const door of dungeon.doors || []) {
      if (!heldKeys.has(door.keyId)) {
        next.add(`${door.gx},${door.gy}`);
      }
    }
    closedDoorCellsRef.current = next;
    heldKeysRef.current = heldKeys;
  }, [dungeon, heldKeys]);

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
   * - スコアに ITEMS.SCORE_PER_ITEM 点を加算
   * - 収集数を1増加
   */
  // 被ダメージのクールダウン管理用 ref。キーは罠/敵の id、値は最後に被弾した時刻（ms）
  // useRef を使うことで、値変更による再レンダリングを避ける
  const hitCooldownRef = useRef({});

  /**
   * 被ダメージ処理。罠・敵の両方から呼ばれる。
   *
   * @param {string} sourceId - ダメージ源の id（罠 id or 敵 id）
   * @param {number} damageAmount - スタミナから引く量
   * @param {number} cooldownSec - 同一ソースから連続被弾しない猶予秒数
   */
  const applyDamage = useCallback((sourceId, damageAmount, cooldownSec) => {
    // プレイ中でないときはダメージを無視（スタート画面・クリア画面で被弾しないように）
    if (!isLocked || cleared) return;

    const now = Date.now();
    const last = hitCooldownRef.current[sourceId] || 0;
    if (now - last < cooldownSec * 1000) return;
    hitCooldownRef.current[sourceId] = now;

    // staminaRef を直接減らす（毎フレーム参照される真実の値）。
    // state にも反映するが、state は 100ms 間隔の setInterval で更新されるので
    // ダメージ直後に UI に反映されないケースもある → 今回は即反映する
    staminaRef.current = Math.max(0, staminaRef.current - damageAmount);
    setStamina(staminaRef.current);
    Audio.damage();
  }, [isLocked, cleared]);

  /** 罠からのダメージ呼び出し */
  const handleTrapHit = useCallback((trapId) => {
    applyDamage(trapId, TRAP.DAMAGE_PER_HIT, TRAP.HIT_COOLDOWN);
  }, [applyDamage]);

  /** 敵からのダメージ呼び出し */
  const handleEnemyHit = useCallback((enemyId) => {
    applyDamage(enemyId, ENEMY.DAMAGE_PER_HIT, ENEMY.HIT_COOLDOWN);
  }, [applyDamage]);

  /**
   * 鍵取得時のハンドラ
   * - heldKeys に追加 → 該当する Door コンポーネントが open=true になり開く
   * - 取得音を鳴らす
   */
  const handleKeyCollect = useCallback((keyId) => {
    Audio.pickup();
    setHeldKeys((prev) => {
      const next = new Set(prev);
      next.add(keyId);
      return next;
    });
  }, []);

  const handleItemCollect = useCallback((id) => {
    collectedItemsRef.current.add(id);
    setScore((prev) => {
      const next = prev + ITEMS.SCORE_PER_ITEM;
      return next;
    });
    setItemCount((prev) => {
      const next = prev + 1;
      // 最後のアイテムを取った時点でポータル活性化音を鳴らす
      if (next >= totalItems) {
        Audio.portalActivate();
      } else {
        Audio.pickup();
      }
      return next;
    });
  }, [totalItems]);

  /**
   * 出口到達時のハンドラ
   * ゲームをクリア状態にし、タイマーを停止。
   * タイムボーナス・クリアボーナスを加えた最終スコアを計算し、
   * localStorage のベスト記録と比較して更新する。
   */
  const handleExitReach = useCallback(() => {
    if (!cleared) {
      setCleared(true);
      if (timerRef.current) clearInterval(timerRef.current);

      // BGM を止めてクリアファンファーレを鳴らす
      Audio.bgm.stop();
      Audio.clear();

      // クリア時点の経過時間を確定する
      // startTimeRef が無い稀なケースに備えて elapsedTime の state を使用する
      const finalTime =
        startTimeRef.current !== null
          ? (Date.now() - startTimeRef.current) / 1000
          : elapsedTime;

      // GameUI と同じ計算式で最終スコアを算出する
      // （将来的に共通関数に抽出する価値あり。現状は重複を許容）
      const timeBonus = Math.max(0, SCORING.TIME_BONUS_BASE - Math.floor(finalTime));
      const finalScore = score + timeBonus + SCORING.CLEAR_BONUS;

      // localStorage を更新し、更新有無を新記録フラグに反映（難易度別に保存）
      const result = updateBestRecord(finalTime, finalScore, difficulty);
      setNewBestTime(result.bestTimeUpdated);
      setNewBestScore(result.bestScoreUpdated);

      // ベスト表示値を最新に（更新があった場合は今回値、無ければ既存値を再取得）
      setBestTime(getBestTime(difficulty));
      setBestScore(getBestScore(difficulty));
    }
  }, [cleared, elapsedTime, score, difficulty]);

  /**
   * 難易度変更ハンドラ
   * - config.js のグローバル定数を該当難易度で上書き
   * - 選択を localStorage に保存
   * - ダンジョンを即座に作り直し、ベスト記録も該当難易度のものに差し替え
   *
   * ポインターロック中は変更不可（スタート画面でのみ選べる想定）
   */
  const handleDifficultyChange = useCallback((newDifficulty) => {
    if (newDifficulty === difficulty) return;
    applyDifficulty(newDifficulty);
    saveDifficulty(newDifficulty);
    setDifficultyState(newDifficulty);
    setBestTime(getBestTime(newDifficulty));
    setBestScore(getBestScore(newDifficulty));
    // seed を更新して新しい難易度のダンジョンを再生成
    setSeed(Date.now());
    setScore(0);
    setItemCount(0);
    collectedItemsRef.current = new Set();
    setHeldKeys(new Set());
    setElapsedTime(0);
    setStamina(PLAYER.STAMINA_MAX);
    staminaRef.current = PLAYER.STAMINA_MAX;
    exploredRef.current = new Set();
    trailRef.current = new Set();
    playerPosRef.current = { x: 0, z: 0 };
    startTimeRef.current = null;
    // 罠・敵の被弾クールダウンと敵位置もリセット
    hitCooldownRef.current = {};
    enemyPositionsRef.current = new Map();
  }, [difficulty]);

  /**
   * リスタート時のハンドラ
   * 全ての状態を初期値にリセットし、新しいシードでダンジョンを再生成する
   */
  const handleRestart = useCallback(() => {
    setSeed(Date.now());
    setScore(0);
    setItemCount(0);
    collectedItemsRef.current = new Set();
    setHeldKeys(new Set());
    setCleared(false);
    setElapsedTime(0);
    setStamina(PLAYER.STAMINA_MAX);
    staminaRef.current = PLAYER.STAMINA_MAX;
    exploredRef.current = new Set();
    trailRef.current = new Set();
    playerPosRef.current = { x: 0, z: 0 };
    startTimeRef.current = null;
    // 罠・敵の被弾クールダウンと敵位置もリセット
    hitCooldownRef.current = {};
    enemyPositionsRef.current = new Map();
    // 新記録フラグは前回プレイ固有のものなのでリセット
    setNewBestTime(false);
    setNewBestScore(false);
  }, []);

  /**
   * ポインターロック時（ゲーム開始/再開時）のハンドラ
   * クリア済みの場合はリスタートしてからロック。
   * ユーザジェスチャでしか開始できない AudioContext もここで起動する。
   */
  const handleLock = useCallback(() => {
    if (cleared) {
      handleRestart();
    }
    // ブラウザのオートプレイ制約をクリアするため、ゲーム開始クリックで起動
    Audio.ensureContext();
    Audio.bgm.start();
    setIsLocked(true);
  }, [cleared, handleRestart]);

  /**
   * ポインターアンロック時（ESCキー押下時）のハンドラ
   * BGM は一時停止して、戻ってきた時に重ねて再生されないようにする。
   */
  const handleUnlock = useCallback(() => {
    Audio.bgm.stop();
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
          onKeyCollect={handleKeyCollect}
          heldKeys={heldKeys}
          isLocked={isLocked}
          items={items}
          collectedItemsRef={collectedItemsRef}
          onNearItem={setNearItem}
          exitActive={exitActive}
          onExitReach={handleExitReach}
          playerPosRef={playerPosRef}
          exploredRef={exploredRef}
          trailRef={trailRef}
          staminaRef={staminaRef}
          cameraYawRef={cameraYawRef}
          closedDoorCellsRef={closedDoorCellsRef}
          heldKeysRef={heldKeysRef}
          onTrapHit={handleTrapHit}
          onEnemyHit={handleEnemyHit}
          enemyPositionsRef={enemyPositionsRef}
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
        bestTime={bestTime}
        bestScore={bestScore}
        newBestTime={newBestTime}
        newBestScore={newBestScore}
        difficulty={difficulty}
        onDifficultyChange={handleDifficultyChange}
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
          trailRef={trailRef}
          items={items}
          collectedItemsRef={collectedItemsRef}
          heldKeys={heldKeys}
          enemyPositionsRef={enemyPositionsRef}
          exitActive={exitActive}
          cameraYawRef={cameraYawRef}
        />
      )}
    </div>
  );
}

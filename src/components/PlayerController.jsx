/**
 * PlayerController.jsx
 * ========================================
 * プレイヤーの移動制御を担当するコンポーネント。
 *
 * 主な機能:
 * - WASDキーによる前後左右の移動（Shiftキーでダッシュ）
 * - カメラの向きに応じた相対的な移動方向の計算
 * - 壁との衝突判定（壁をすり抜けないようにする）
 * - 歩行時の頭の揺れ（ヘッドボブ）アニメーション
 * - ランタン（手持ちライト）の位置追従
 * - コンパス用のカメラ向き情報の更新
 * - ミニマップ用の探索済みエリアの記録
 * - 近くのアイテム検出・出口到達判定
 *
 * Three.js の概念:
 * - pointLight: 点光源。ランタンのようにある一点から全方向に光を放つライト。
 * - Vector3: 3次元空間での位置や方向を表すベクトル (x, y, z)。
 *
 * React Three Fiber の概念:
 * - useThree: Three.js の camera（カメラ）や gl（WebGLレンダラー）にアクセスするためのフック。
 * - useFrame: 毎フレーム（1秒に約60回）呼び出される処理を登録するフック。
 *   ゲームループのように、毎フレームプレイヤーの位置を更新するために使う。
 */
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { checkGridCollision, worldToGrid } from "../systems/MapGenerator";
import { PLAYER, ITEMS } from "../data/config";
import { footstep } from "../systems/Audio";

/**
 * キーコードとキー名の対応表。
 * KeyboardEvent.code（"KeyW" など）を内部で使うキー名（"w" など）に変換する。
 * 不変な定数なのでコンポーネント外に定義し、useEffect の依存配列に載せなくて済むようにしている。
 */
const CODE_TO_KEY = { KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d", ShiftLeft: "shift", ShiftRight: "shift" };

/**
 * 上方向ベクトル（Y 軸正方向）。crossVectors で「右ベクトル」を求める基準として使う。
 * 毎フレーム new するとアロケーション圧がかかるため、変更されない定数としてモジュールスコープに置く。
 */
const UP_VECTOR = new THREE.Vector3(0, 1, 0);

/**
 * PlayerController コンポーネント
 *
 * @param {boolean} isLocked - ポインターロック（マウスがゲーム画面にロックされている）状態かどうか
 * @param {object} dungeon - ダンジョンのデータ（グリッド情報、開始位置、出口位置など）
 * @param {function} onNearItem - 近くにアイテムがあるときに呼び出されるコールバック関数
 * @param {Array} items - ゲーム内のアイテム一覧
 * @param {object} collectedItemsRef - 既に収集済みのアイテムIDを保持するRef
 * @param {function} onExitReach - 出口に到達したときに呼び出されるコールバック関数
 * @param {boolean} exitActive - 出口が有効（全アイテム収集済み等）かどうか
 * @param {object} playerPosRef - プレイヤー位置を外部に伝えるためのRef（ミニマップ等で使用）
 * @param {object} exploredRef - 探索済みグリッドセルを記録するRef（ミニマップの霧を晴らす用）
 * @param {object} staminaRef - スタミナ値を保持するRef（ダッシュで消費、歩行で回復）
 * @param {object} cameraYawRef - カメラのヨー角（水平方向の向き）を保持するRef（コンパス用）
 */
export default function PlayerController({
  isLocked, dungeon, onNearItem, items, collectedItemsRef,
  onExitReach, exitActive, playerPosRef, exploredRef, trailRef, staminaRef, cameraYawRef,
  closedDoorCellsRef, heldKeysRef,
}) {
  /**
   * useThree フック:
   * React Three Fiber が管理する Three.js のオブジェクトにアクセスする。
   * - camera: シーンを映すカメラ。一人称視点ではプレイヤーの「目」にあたる。
   * - gl: WebGLレンダラー。gl.domElement はレンダリング先の canvas 要素。
   */
  const { camera, gl } = useThree();

  /**
   * useRef フック:
   * React の再レンダリングをまたいで値を保持するための仕組み。
   * useState と違い、値が変わっても再レンダリングは起こらない。
   * ゲームのようにフレームごとに高速に値を更新する場面で活躍する。
   *
   * - velocity: プレイヤーの移動速度ベクトル（どの方向にどれだけ動くか）
   * - direction: キー入力から計算された移動方向ベクトル
   * - keys: 現在押されているキーの状態を記録するオブジェクト
   * - headBob: 歩行時の頭の揺れアニメーション用カウンター
   * - initialized: カメラの初期位置設定が完了したかどうかのフラグ
   * - lanternRef: ランタン（pointLight）への参照。位置をカメラに追従させるために使う。
   */
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false });
  const headBob = useRef(0);
  const lanternRef = useRef();
  // 足音の直近再生 headBob 値（同じ周期で 2 回鳴らないようにする）
  const lastFootstepBob = useRef(0);

  /**
   * useFrame 内で毎フレーム使い回す Vector3 群。
   *
   * 旧コードは `new THREE.Vector3()` を毎フレーム生成していたため、
   * 60fps で毎秒 240+ インスタンスのアロケーションが発生し、GC 圧の原因になっていた（ISSUES #6）。
   * ref に保持して `.set()` / `.copy()` で使い回すことで、ホットパスのアロケーションをゼロにする。
   */
  const forwardVec = useRef(new THREE.Vector3());
  const rightVec = useRef(new THREE.Vector3());
  const yawDirVec = useRef(new THREE.Vector3());
  // アイテム/鍵/出口との距離計算で使う一時ベクトル（順次・排他的に使われるので 1 つで足りる）
  const tmpVec = useRef(new THREE.Vector3());

  /**
   * useEffect フック（カメラ初期位置の設定）:
   * dungeon が変わるたびにカメラを新しいスタート位置へ戻す。
   *
   * 依存配列は [dungeon, camera]。dungeon は seed 依存の useMemo なので、
   * 同じ seed の間は参照が変わらず、ゲーム中に勝手にカメラが戻ることはない。
   * リスタート・難易度変更で seed が変わると、新 dungeon → 新 startPos へ移動。
   */
  useEffect(() => {
    if (dungeon) {
      camera.position.set(dungeon.startPos.x, dungeon.startPos.y, dungeon.startPos.z);
    }
  }, [dungeon, camera]);

  /**
   * useEffect フック（キーボードイベントの登録）:
   * キーが押された/離されたときのイベントリスナーを document に登録する。
   * canvas にフォーカスを当て（tabIndex 設定）、キー入力を確実に受け取れるようにする。
   *
   * return で返す関数は「クリーンアップ関数」と呼ばれ、
   * コンポーネントがアンマウント（画面から消える）されるときにイベントリスナーを解除する。
   * これにより、不要になったリスナーが残り続けるメモリリークを防ぐ。
   */
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("tabindex", "0");
    const handleKeyDown = (e) => { const key = CODE_TO_KEY[e.code]; if (key) { keys.current[key] = true; e.preventDefault(); } };
    const handleKeyUp = (e) => { const key = CODE_TO_KEY[e.code]; if (key) { keys.current[key] = false; e.preventDefault(); } };
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    return () => { document.removeEventListener("keydown", handleKeyDown, true); document.removeEventListener("keyup", handleKeyUp, true); };
  }, [gl]);

  /**
   * useEffect フック（ポインターロック時のフォーカス）:
   * ポインターがロックされたとき、canvas にフォーカスを移す
   * これにより、キーボード入力が確実に canvas に届くようになる
   */
  useEffect(() => { if (isLocked && gl.domElement) { gl.domElement.focus(); } }, [isLocked, gl]);

  /**
   * useFrame フック（メインのゲームループ）:
   * 毎フレーム呼ばれ、プレイヤーの移動・衝突判定・各種状態更新を行う
   *
   * @param {object} state - Three.js のレンダリング状態（時刻情報など）
   * @param {number} delta - 前フレームからの経過時間（秒）
   *   移動量を delta に掛けることで、フレームレートに関係なく一定速度で動くようにする
   */
  useFrame((state, delta) => {
    if (!isLocked || !dungeon) return;

    const { grid, gridW, gridH, cellSize } = dungeon;

    /**
     * 移動方向の計算:
     * WASDキーの入力に応じて direction ベクトルを設定する
     * z軸: W（前進 +1）/ S（後退 -1）
     * x軸: A（左 -1）/ D（右 +1）
     */
    direction.current.set(0, 0, 0);
    if (keys.current.w) direction.current.z += 1;
    if (keys.current.s) direction.current.z -= 1;
    if (keys.current.a) direction.current.x -= 1;
    if (keys.current.d) direction.current.x += 1;

    /**
     * ダッシュ判定とスタミナ管理:
     * Shiftキーを押しながら移動するとダッシュ（速度1.67倍）
     * ダッシュ中はスタミナが減り、歩行中はスタミナが回復する
     */
    const sprinting = keys.current.shift && staminaRef.current > 0 && direction.current.length() > 0;
    const speed = sprinting ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;
    if (sprinting) { staminaRef.current = Math.max(0, staminaRef.current - delta * PLAYER.STAMINA_DRAIN); }
    else { staminaRef.current = Math.min(PLAYER.STAMINA_MAX, staminaRef.current + delta * PLAYER.STAMINA_REGEN); }

    let moved = false;

    if (direction.current.length() > 0) {
      /**
       * ベクトルの正規化（normalize）:
       * direction ベクトルの長さを1にする。
       * 斜め移動（W+Dなど）時に速度が√2倍にならないようにするため。
       *
       * カメラの向きに基づく移動方向の計算:
       * 1. forward: カメラが向いている前方ベクトルを取得し、Y成分を0にして水平化する。
       * 2. right: forward と上方向ベクトル(0,1,0) の外積（crossVectors）で右方向を求める。
       *    外積（クロス積）: 2つのベクトルに直交するベクトルを求める演算。
       * 3. forward × 入力のZ成分 + right × 入力のX成分 で、最終的な移動ベクトルを作る。
       */
      direction.current.normalize();
      // 使い回し用 ref ベクトルに毎フレーム値を書き込む（new はしない）
      const forward = forwardVec.current;
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = rightVec.current;
      right.crossVectors(forward, UP_VECTOR);
      // velocity = forward * z + right * x （right は in-place 乗算されるが、
      // 次フレームで crossVectors により再計算されるので問題ない）
      velocity.current.copy(forward).multiplyScalar(direction.current.z).add(right.multiplyScalar(direction.current.x)).multiplyScalar(speed * delta);

      /**
       * 衝突判定（X軸とZ軸を分離して判定）:
       * X方向とZ方向を別々に判定することで、壁に沿ってスライドする動きを実現。
       * checkGridCollision: グリッドベースの衝突判定関数。
       * 壁のあるセルに入ろうとしたら、その方向の移動をキャンセルする。
       */
      const prevX = camera.position.x;
      const prevZ = camera.position.z;
      // 閉じているドアのセル一覧（ref 経由で最新状態を参照）
      const closedDoors = closedDoorCellsRef ? closedDoorCellsRef.current : null;
      const newPosX = camera.position.clone();
      newPosX.x += velocity.current.x;
      if (!checkGridCollision(newPosX, grid, gridW, gridH, cellSize, undefined, closedDoors)) { camera.position.x = newPosX.x; }
      const newPosZ = camera.position.clone();
      newPosZ.z += velocity.current.z;
      if (!checkGridCollision(newPosZ, grid, gridW, gridH, cellSize, undefined, closedDoors)) { camera.position.z = newPosZ.z; }
      moved = camera.position.x !== prevX || camera.position.z !== prevZ;

      /**
       * ヘッドボブ（頭の揺れ）:
       * 移動中にカウンターを増加させ、sin関数で上下に揺らすことで歩行感を演出。
       * ダッシュ時は揺れが速くなる（14 vs 9）。
       *
       * 足音は headBob が π の倍数（sin が底を打つ瞬間）で再生。
       * 前回再生した位相を記録しておき、同じ周期で二重再生しないよう制御する。
       */
      if (moved) {
        headBob.current += delta * (sprinting ? 14 : 9);
        const stepPhase = Math.floor(headBob.current / Math.PI);
        if (stepPhase > lastFootstepBob.current) {
          lastFootstepBob.current = stepPhase;
          footstep();
        }
      }
    }

    /**
     * カメラ高さの設定:
     * 基本の目線高さは1.6（人間の目の高さを想定）。
     * 移動中は sin(headBob) で微妙に上下させ、歩行アニメーションを表現する。
     * Math.sin: 三角関数のサイン。-1～1の間を滑らかに振動する値を返す。
     */
    const bobAmount = moved ? Math.sin(headBob.current) * 0.04 : 0;
    camera.position.y = PLAYER.HEIGHT + bobAmount;

    /**
     * ランタンの位置更新:
     * ランタン（pointLight）をカメラに追従させ、少し下にオフセットする。
     * これにより、プレイヤーが手にランタンを持っているような演出になる。
     */
    if (lanternRef.current) { lanternRef.current.position.copy(camera.position); lanternRef.current.position.y -= 0.3; }

    /**
     * プレイヤー位置の外部通知（ミニマップ用）:
     */
    if (playerPosRef) { playerPosRef.current = { x: camera.position.x, z: camera.position.z }; }

    /**
     * カメラのヨー角（水平方向の向き）を計算（コンパス用）:
     * Math.atan2(x, z): x と z からラジアン角度を求める逆正接関数。
     * カメラが向いている方角を数値として取得し、コンパスUIに反映する。
     */
    if (cameraYawRef) {
      camera.getWorldDirection(yawDirVec.current);
      cameraYawRef.current = Math.atan2(yawDirVec.current.x, yawDirVec.current.z);
    }

    /**
     * 探索済みエリアの記録（ミニマップ用）:
     * worldToGrid: ワールド座標をグリッド座標に変換する関数。
     * プレイヤー周囲 7×7 マスを「探索済み」としてSetに追加し、
     * ミニマップの「戦場の霧」（未探索エリアの暗さ）を晴らす。
     */
    if (exploredRef) {
      const { gx, gy } = worldToGrid(camera.position.x, camera.position.z, gridW, gridH, cellSize);
      for (let dy = -3; dy <= 3; dy++) { for (let dx = -3; dx <= 3; dx++) { const ex = gx + dx; const ey = gy + dy; if (ex >= 0 && ex < gridW && ey >= 0 && ey < gridH) { exploredRef.current.add(`${ex},${ey}`); } } }
      // ブレッドクラム（軌跡）: プレイヤーが実際に立った中心セルだけを記録
      if (trailRef) {
        trailRef.current.add(`${gx},${gy}`);
      }
    }

    /**
     * 近くのアイテム/鍵の検出:
     * 両方を同じ距離判定でチェックし、最近接のものを { kind, id, position } 形式で
     * 親（App）に通知する。kind によって NearItemIndicator の表示色・文言が変わる。
     */
    if (onNearItem) {
      let closest = null;
      let minDist = Infinity;
      const collected = collectedItemsRef ? collectedItemsRef.current : null;
      const heldKeys = heldKeysRef ? heldKeysRef.current : null;

      if (items) {
        items.forEach((item) => {
          if (collected && collected.has(item.id)) return;
          // 一時 ref ベクトルに位置を書き込んでから距離を計算（new を避ける）
          tmpVec.current.set(item.position[0], camera.position.y, item.position[2]);
          const dist = camera.position.distanceTo(tmpVec.current);
          if (dist < ITEMS.COLLECT_DISTANCE && dist < minDist) {
            minDist = dist;
            closest = { kind: "item", id: item.id, position: item.position };
          }
        });
      }

      // 鍵の近接も同じ距離で判定
      (dungeon.keys || []).forEach((k) => {
        if (heldKeys && heldKeys.has(k.id)) return;
        tmpVec.current.set(k.position[0], camera.position.y, k.position[2]);
        const dist = camera.position.distanceTo(tmpVec.current);
        if (dist < ITEMS.COLLECT_DISTANCE && dist < minDist) {
          minDist = dist;
          closest = { kind: "key", id: k.id, position: k.position };
        }
      });

      onNearItem(closest);
    }

    /**
     * 出口到達判定:
     * 出口が有効で、プレイヤーが出口から1.8ユニット以内にいる場合、
     * onExitReach コールバックを呼び出してステージクリア処理を行う。
     */
    if (onExitReach && exitActive && dungeon.exitPos) {
      tmpVec.current.set(dungeon.exitPos.x, camera.position.y, dungeon.exitPos.z);
      const dist = camera.position.distanceTo(tmpVec.current);
      if (dist < 1.8) { onExitReach(); }
    }
  });

  /**
   * コンポーネントの描画部分:
   * pointLight（点光源）をランタンとして返す。
   * - color="#ffeedd": 暖かみのある電球色
   * - intensity={6}: 光の強さ
   * - distance={20}: 光が届く最大距離
   * - decay={1}: 距離による光の減衰率
   */
  return <pointLight ref={lanternRef} color="#ffeedd" intensity={6} distance={20} decay={1} />;
}

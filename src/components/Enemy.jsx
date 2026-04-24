/**
 * Enemy.jsx — 単純追跡型の敵。
 *
 * 挙動の概要:
 *   1. 毎フレーム、プレイヤーとの距離と視線（壁越しでない）をチェック。
 *   2. 視界内なら BFS でプレイヤーまでの最短経路を求め（0.25秒に1回）、
 *      経路上の次セルの方向へ等速移動する。
 *   3. 攻撃範囲内で onHit を呼んでプレイヤーにダメージ。
 *   4. 視界外では元のスポーン位置付近で待機（徘徊は未実装）。
 *
 * 見た目: 低ポリの球体 + 発光する赤い目 + 下からの赤い光。
 *
 * Three.js 的な注意:
 *   - useFrame 内で毎フレーム new Vector3() を避けるため、
 *     ref で使い回しのインスタンスを持つ。
 */
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ENEMY } from "../data/config";
import { checkGridCollision, worldToGrid, bfsShortestPath } from "../systems/MapGenerator";
import { enemyGrowl } from "../systems/Audio";

/**
 * プレイヤーまでの視線をセル単位で判定する。
 * Bresenham ではなく、線分をサンプリングして各点が通路セルか見る単純実装。
 */
function hasLineOfSight(enemyGrid, playerGrid, grid) {
  const dx = playerGrid.gx - enemyGrid.gx;
  const dy = playerGrid.gy - enemyGrid.gy;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return true;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(enemyGrid.gx + dx * t);
    const cy = Math.round(enemyGrid.gy + dy * t);
    if (cy < 0 || cy >= grid.length || cx < 0 || cx >= grid[0].length) return false;
    if (grid[cy][cx] === 1) return false;
  }
  return true;
}

/**
 * @param {Array} spawnPos - [x, 0, z]
 * @param {string} id - 敵 ID
 * @param {Object} dungeon - ダンジョン全体。grid / gridW / gridH / cellSize / doors が必要
 * @param {Object} playerPosRef - プレイヤー位置の ref（{ x, z }）
 * @param {boolean} isLocked - プレイ中フラグ。false の間は AI を停止
 * @param {function} onHit - 攻撃時のコールバック（enemy id を渡す）
 * @param {Object} closedDoorCellsRef - 閉じているドアのセル集合（敵もドアで止まる）
 * @param {Object} positionsRef - 敵位置を記録する Map<id, {x,z}>。Minimap が参照する
 */
export default function Enemy({
  spawnPos,
  id,
  dungeon,
  playerPosRef,
  isLocked,
  onHit,
  closedDoorCellsRef,
  positionsRef,
}) {
  const meshRef = useRef();
  const glowRef = useRef();
  // 敵のワールド位置を ref で保持（state だと再レンダリングしてしまう）
  const posRef = useRef({ x: spawnPos[0], z: spawnPos[2] });
  // 現在の経路（BFS で求めたセル列）と、どこまで進んだか
  const pathRef = useRef([]);
  const pathIndexRef = useRef(0);
  // 経路再計算のタイマ
  const recalcRef = useRef(0);
  // 視界内かどうかの直前フラグ（唸り音の重複防止）
  const lastSighted = useRef(false);
  // 使い回しの Vector3（毎フレーム new を避けるため）
  const tmpVec = useRef(new THREE.Vector3());

  // スポーン位置にメッシュを初期配置
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(spawnPos[0], 0.7, spawnPos[2]);
    }
    posRef.current = { x: spawnPos[0], z: spawnPos[2] };
    pathRef.current = [];
    pathIndexRef.current = 0;
  }, [spawnPos]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // 被弾音の視界内フラグを更新
    const { grid, gridW, gridH, cellSize } = dungeon;
    const playerPos = playerPosRef ? playerPosRef.current : null;

    // プレイ中でないときは静止（光だけ微妙に揺らす）
    if (!isLocked || !playerPos) {
      if (glowRef.current) glowRef.current.intensity = 1.2;
      return;
    }

    // プレイヤーとのワールド距離
    const dx = playerPos.x - posRef.current.x;
    const dz = playerPos.z - posRef.current.z;
    const distToPlayer = Math.sqrt(dx * dx + dz * dz);

    // 敵・プレイヤーのグリッド座標
    const enemyGrid = worldToGrid(posRef.current.x, posRef.current.z, gridW, gridH, cellSize);
    const playerGrid = worldToGrid(playerPos.x, playerPos.z, gridW, gridH, cellSize);

    // 視界内かどうか: 距離が視界範囲内 + 壁越しでない
    const sighted =
      distToPlayer < ENEMY.SIGHT_RANGE && hasLineOfSight(enemyGrid, playerGrid, grid);

    // 視界内に入った瞬間に唸り音
    if (sighted && !lastSighted.current) {
      enemyGrowl();
    }
    lastSighted.current = sighted;

    // 攻撃判定（視界内かつ攻撃範囲内）
    if (sighted && distToPlayer < ENEMY.ATTACK_RANGE && onHit) {
      onHit(id);
    }

    // 経路の再計算（0.25 秒に 1 回 or 再計算タイマが 0 以下）
    recalcRef.current -= delta;
    if (sighted && recalcRef.current <= 0) {
      recalcRef.current = 0.25;
      pathRef.current = bfsShortestPath(grid, enemyGrid, playerGrid);
      pathIndexRef.current = 0;
    }

    // 経路に沿って移動
    if (sighted && pathRef.current.length > pathIndexRef.current + 1) {
      // 次に向かうセル（現在セルの次）
      let target = pathRef.current[pathIndexRef.current + 1];
      // 閉じているドアには入らない（プレイヤーと同じ制約）
      if (closedDoorCellsRef && closedDoorCellsRef.current) {
        const doorKey = `${target.gx},${target.gy}`;
        if (closedDoorCellsRef.current.has(doorKey)) {
          return; // ブロックされたら停止
        }
      }
      // ターゲットセルのワールド座標中心
      const offsetX = (gridW * cellSize) / 2;
      const offsetZ = (gridH * cellSize) / 2;
      const tx = target.gx * cellSize - offsetX + cellSize / 2;
      const tz = target.gy * cellSize - offsetZ + cellSize / 2;
      // 方向ベクトル
      const mdx = tx - posRef.current.x;
      const mdz = tz - posRef.current.z;
      const mdist = Math.sqrt(mdx * mdx + mdz * mdz);
      if (mdist < 0.15) {
        // 次セル到達 → 経路を進める
        pathIndexRef.current++;
      } else {
        // 等速移動
        const step = ENEMY.SPEED * delta;
        const nx = posRef.current.x + (mdx / mdist) * step;
        const nz = posRef.current.z + (mdz / mdist) * step;
        const candidate = { x: nx, z: nz };
        // 壁衝突チェック（プレイヤーと同じ関数。ドアも考慮）
        const closedDoors = closedDoorCellsRef ? closedDoorCellsRef.current : null;
        if (!checkGridCollision(candidate, grid, gridW, gridH, cellSize, 0.3, closedDoors)) {
          posRef.current.x = nx;
          posRef.current.z = nz;
        }
      }
    }

    // メッシュに反映（少し浮遊）
    const y = 0.7 + Math.sin((_?.clock?.elapsedTime || 0) * 3) * 0.08;
    meshRef.current.position.set(posRef.current.x, y, posRef.current.z);

    // プレイヤーの方を向く
    tmpVec.current.set(playerPos.x, y, playerPos.z);
    meshRef.current.lookAt(tmpVec.current);

    // グロー位置と強度の追従
    if (glowRef.current) {
      glowRef.current.position.set(posRef.current.x, 1, posRef.current.z);
      glowRef.current.intensity = sighted ? 2.4 : 1.0;
    }

    // Minimap 表示用に位置を共有 Map に反映
    if (positionsRef) {
      positionsRef.current.set(id, { x: posRef.current.x, z: posRef.current.z });
    }
  });

  // アンマウント時に positions から削除しておく（次の難易度・リスタートで古い敵が残らないように）
  useEffect(() => {
    // cleanup クロージャで参照する ref は effect 実行時点の値をキャプチャしておく
    const map = positionsRef ? positionsRef.current : null;
    return () => {
      if (map) map.delete(id);
    };
  }, [id, positionsRef]);

  return (
    <group>
      <mesh ref={meshRef}>
        {/* 本体: ローポリ球 */}
        <icosahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial
          color="#221122"
          emissive="#440011"
          emissiveIntensity={0.5}
          flatShading
          roughness={0.7}
          metalness={0.2}
        />
        {/* 目（前方に 2 つ） */}
        <mesh position={[0.18, 0.05, 0.38]}>
          <sphereGeometry args={[0.06, 6, 5]} />
          <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={2.5} />
        </mesh>
        <mesh position={[-0.18, 0.05, 0.38]}>
          <sphereGeometry args={[0.06, 6, 5]} />
          <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={2.5} />
        </mesh>
      </mesh>

      {/* 敵周辺の赤いグローライト */}
      <pointLight
        ref={glowRef}
        position={[posRef.current.x, 1, posRef.current.z]}
        color="#ff4444"
        intensity={1.5}
        distance={6}
        decay={2}
      />
    </group>
  );
}

/**
 * Minimap.jsx - ミニマップコンポーネント
 *
 * ダンジョンの俯瞰図をCanvas 2Dで描画するミニマップ。
 * 画面右下に小さく表示され、[M]キーで拡大表示できる。
 *
 * 描画内容:
 * - 探索済みのダンジョン構造（壁と通路）
 * - 未収集アイテムの位置（黄色）
 * - 出口の位置（緑色、全アイテム収集後に表示）
 * - プレイヤーの現在位置と向き（水色の丸と白い矢印）
 *
 * 技術ポイント:
 * - requestAnimationFrame で毎フレーム再描画（60fps）
 * - useRef でDOM要素（canvas）に直接アクセス
 * - useCallback で draw 関数をメモ化
 */

import { useRef, useEffect, useCallback, useState } from "react";

/**
 * Minimap コンポーネント
 *
 * @param {Object} dungeon - ダンジョンデータ（grid, gridW, gridH, cellSize, exitGrid等）
 * @param {Object} playerPosRef - プレイヤー位置のref { x, z }
 * @param {Object} exploredRef - 探索済みセルの Set を保持するref
 * @param {Array} items - アイテム一覧
 * @param {Object} collectedItemsRef - 収集済みアイテムIDの Set を保持するref
 * @param {boolean} exitActive - 出口が有効かどうか（全アイテム収集後にtrue）
 * @param {Object} cameraYawRef - カメラのヨー角（水平回転角度）のref
 */
export default function Minimap({ dungeon, playerPosRef, exploredRef, items, collectedItemsRef, exitActive, cameraYawRef }) {
  // canvas DOM要素への参照
  const canvasRef = useRef();

  // requestAnimationFrame のIDを保持（クリーンアップ用）
  const animRef = useRef();

  // ミニマップの拡大/縮小状態
  const [expanded, setExpanded] = useState(false);

  // ===== 表示スケール =====
  // 通常時は1セル=5px、拡大時は1セル=12px
  const SCALE_SMALL = 5;
  const SCALE_LARGE = 12;
  const scale = expanded ? SCALE_LARGE : SCALE_SMALL;

  // ダンジョンデータから必要な値を分割代入で取得
  // grid: 2次元配列（0=通路, 1=壁）
  // gridW, gridH: グリッドの幅と高さ（セル数）
  // cellSize: 1セルのワールド空間でのサイズ
  const { grid, gridW, gridH, cellSize } = dungeon;

  // ===== [M]キーで拡大/縮小を切り替え =====
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === "KeyM") {
        // 前の状態を反転（トグル）
        setExpanded((prev) => !prev);
        // 他のキーイベント（例: ブラウザのメニュー）を防止
        e.preventDefault();
      }
    };
    // capture: true で他のイベントリスナーより先に処理する
    document.addEventListener("keydown", handleKey, true);

    // クリーンアップ: コンポーネント破棄時にイベントリスナーを解除
    return () => document.removeEventListener("keydown", handleKey, true);
  }, []);

  // ===== 描画関数 =====
  // useCallback でメモ化。依存値が変わると新しい関数が生成される。
  // requestAnimationFrame で毎フレームこの関数が呼ばれ、canvas を再描画する。
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas 2D コンテキストを取得（2D描画APIを使うため）
    const ctx = canvas.getContext("2d");

    // キャンバスサイズをグリッドサイズ × スケールに設定
    const w = gridW * scale;
    const h = gridH * scale;
    canvas.width = w;
    canvas.height = h;

    // 背景を暗い色で塗りつぶし（未探索エリアは黒く表示）
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    // ref から最新値を取得（useState経由だと再レンダリングが発生してしまう）
    const explored = exploredRef.current;
    const collected = collectedItemsRef ? collectedItemsRef.current : null;

    // ===== ダンジョン構造の描画 =====
    // 全セルをループし、探索済みのセルのみ描画する
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        // 未探索のセルはスキップ（黒いままにする = 戦場の霧）
        if (!explored.has(`${x},${y}`)) continue;

        // 壁セル（grid値=1）は明るめ、通路セル（grid値=0）は暗めの色
        if (grid[y][x] === 1) {
          ctx.fillStyle = "#3a3530";
        } else {
          ctx.fillStyle = "#1a1815";
        }
        // セルを四角形で描画
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    // ===== ワールド座標 → グリッド座標への変換用オフセット =====
    // ダンジョンの中心がワールド原点(0,0)になるように配置されているため、
    // グリッド座標に変換するにはオフセットを加算する必要がある
    const offsetX = (gridW * cellSize) / 2;
    const offsetZ = (gridH * cellSize) / 2;

    // ===== アイテムの描画 =====
    // 未収集のアイテムを黄色い四角で表示
    items.forEach((item) => {
      // 収集済みアイテムはスキップ
      if (collected && collected.has(item.id)) return;

      // アイテムのワールド座標をグリッド座標に変換
      const ix = Math.floor((item.position[0] + offsetX) / cellSize);
      const iy = Math.floor((item.position[2] + offsetZ) / cellSize);

      // 未探索エリアのアイテムは表示しない
      if (!explored.has(`${ix},${iy}`)) return;

      ctx.fillStyle = "#ffaa00";  // 黄色（アイテムの色）
      // 拡大表示時はセルより少し小さく描画（マージンを付ける）
      const s = expanded ? scale - 2 : scale;
      ctx.fillRect(ix * scale + (expanded ? 1 : 0), iy * scale + (expanded ? 1 : 0), s, s);
    });

    // ===== 出口の描画 =====
    // 全アイテム収集後に緑色の四角で出口を表示
    if (exitActive && dungeon.exitGrid) {
      const { gx, gy } = dungeon.exitGrid;
      // 探索済みの場合のみ表示
      if (explored.has(`${gx},${gy}`)) {
        ctx.fillStyle = "#00ff88";  // 緑色（出口の色）
        // セルより少し大きく描画して目立たせる
        ctx.fillRect(gx * scale - 1, gy * scale - 1, scale + 2, scale + 2);
      }
    }

    // ===== プレイヤーの描画 =====
    if (playerPosRef.current) {
      // プレイヤーのワールド座標をキャンバスのピクセル座標に変換
      const px = (playerPosRef.current.x + offsetX) / cellSize;
      const py = (playerPosRef.current.z + offsetZ) / cellSize;
      const cx = px * scale;  // キャンバス上のX座標
      const cy = py * scale;  // キャンバス上のY座標
      const r = expanded ? scale * 0.6 : scale * 0.8;  // 円の半径

      // プレイヤーを水色の円で描画
      ctx.fillStyle = "#00ccff";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // ===== プレイヤーの向き（方向矢印）の描画 =====
      // カメラのヨー角を使って三角形の矢印を描画する
      if (cameraYawRef && cameraYawRef.current !== undefined) {
        const yaw = cameraYawRef.current;  // ラジアン角度
        const arrowLen = expanded ? scale * 1.8 : scale * 1.4;  // 矢印の長さ
        const arrowW = expanded ? scale * 0.5 : scale * 0.4;    // 矢印の幅

        // 三角形の3頂点を計算（先端と左右の角）
        // sin/cos で角度から座標を計算する（三角関数の基本的な使い方）
        const tipX = cx + Math.sin(yaw) * arrowLen;      // 先端X
        const tipY = cy + Math.cos(yaw) * arrowLen;      // 先端Y
        const leftX = cx + Math.sin(yaw - 2.5) * arrowW;  // 左角X
        const leftY = cy + Math.cos(yaw - 2.5) * arrowW;  // 左角Y
        const rightX = cx + Math.sin(yaw + 2.5) * arrowW; // 右角X
        const rightY = cy + Math.cos(yaw + 2.5) * arrowW; // 右角Y

        // 白い三角形で方向を示す
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);      // 先端に移動
        ctx.lineTo(leftX, leftY);    // 左角へ線を引く
        ctx.lineTo(rightX, rightY);  // 右角へ線を引く
        ctx.closePath();             // パスを閉じる（自動的に先端へ戻る）
        ctx.fill();                  // 塗りつぶす
      }
    }

    // ===== 拡大時のヒントテキスト =====
    if (expanded) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "11px 'Courier New', monospace";
      ctx.fillText("[M] で閉じる", 4, h - 4);
    }

    // 次フレームでも draw を呼び出す（ループ）
    // requestAnimationFrame はブラウザの描画タイミングに合わせて実行される（通常60fps）
    animRef.current = requestAnimationFrame(draw);
  }, [dungeon, playerPosRef, exploredRef, items, exitActive, cameraYawRef, grid, gridW, gridH, cellSize, scale, expanded]);

  // ===== アニメーションループの開始と停止 =====
  useEffect(() => {
    // 描画ループを開始
    animRef.current = requestAnimationFrame(draw);

    // クリーンアップ: コンポーネント破棄時にアニメーションを停止
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  // CSS用にキャンバスサイズを計算
  const canvasW = gridW * scale;
  const canvasH = gridH * scale;

  // ===== 描画結果の表示 =====
  // canvas要素をインラインスタイルで配置。
  // 通常時は右下、拡大時は画面中央に表示。
  // imageRendering: "pixelated" でドット絵のようなくっきりした拡大表示になる。
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        // 拡大時は画面中央、通常時は右下に配置
        bottom: expanded ? "50%" : "20px",
        right: expanded ? "50%" : "20px",
        // 拡大時は translate で中心揃え
        transform: expanded ? "translate(50%, 50%)" : "none",
        // 枠線の色と透明度を拡大/縮小で変える
        border: expanded ? "2px solid #ffaa00" : "2px solid #ffaa0088",
        borderRadius: "4px",
        opacity: expanded ? 0.92 : 0.85,
        // ピクセルアートのようなシャープな拡大
        imageRendering: "pixelated",
        width: canvasW + "px",
        height: canvasH + "px",
        background: "#000",
        // 拡大時はUIの上に表示されるように z-index を高くする
        zIndex: expanded ? 50 : 10,
        // マウスクリックを透過させる（ゲーム操作を妨げない）
        pointerEvents: "none",
        // 拡大時に影を付けて強調
        boxShadow: expanded ? "0 0 40px rgba(0,0,0,0.8)" : "none",
      }}
    />
  );
}

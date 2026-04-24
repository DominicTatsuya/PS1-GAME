/**
 * NearItemIndicator.jsx - アイテム近接プロンプト
 *
 * プレイヤーが収集可能なアイテムの近くにいるとき、
 * 画面上部に「[E] アイテム取得」というプロンプトを表示するコンポーネント。
 *
 * nearItem が null でないとき（= 近くにアイテムがあるとき）のみ表示される。
 * PlayerController がフレーム毎に近くのアイテムを検出して nearItem を更新する。
 *
 * pointerEvents: "none" でゲーム操作を妨げないようにしている。
 */

/**
 * NearItemIndicator コンポーネント
 *
 * @param {Object|null} nearItem - 近くにあるアイテムの情報。null なら非表示。
 *        { kind: "item" | "key", id, position } 形式。kind によって表示を分岐する。
 * @returns {JSX.Element|null} プロンプトUI、または null
 */
export default function NearItemIndicator({ nearItem }) {
  // nearItem が null（近くにアイテムがない）場合は何もレンダリングしない
  if (!nearItem) return null;

  // 鍵と通常アイテムで表示色と文言を切り替える
  const isKey = nearItem.kind === "key";
  const label = isKey ? "[E] 鍵を取得" : "[E] アイテム取得";
  const bg = isKey ? "rgba(68, 170, 255, 0.85)" : "rgba(255, 170, 0, 0.85)";

  return (
    // 画面上部中央にバッジとして表示（色は種別で変わる）
    <div
      style={{
        position: "absolute",
        top: "50px",
        left: "50%",
        transform: "translateX(-50%)",       // 水平方向に中央揃え
        background: bg,                        // 種別に応じた色
        color: "#000",                         // 黒文字
        padding: "8px 20px",
        borderRadius: "2px",
        fontSize: "14px",
        fontWeight: "bold",
        fontFamily: "'Courier New', monospace", // レトロ感のあるフォント
        letterSpacing: "1px",
        border: "1px solid rgba(255,255,255,0.3)",
        pointerEvents: "none",                 // マウスクリックを透過
        zIndex: 10,                            // 他のUIの上に表示
        textShadow: "none",                    // 親から継承されるtext-shadowを無効化
      }}
    >
      {label}
    </div>
  );
}

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
 * @param {Object|null} nearItem - 近くにあるアイテムの情報。null の場合は何も表示しない。
 * @returns {JSX.Element|null} プロンプトUI、または null
 */
export default function NearItemIndicator({ nearItem }) {
  // nearItem が null（近くにアイテムがない）場合は何もレンダリングしない
  if (!nearItem) return null;

  return (
    // 画面上部中央にオレンジ色のバッジとして表示
    <div
      style={{
        position: "absolute",
        top: "50px",
        left: "50%",
        transform: "translateX(-50%)",       // 水平方向に中央揃え
        background: "rgba(255, 170, 0, 0.85)", // 半透明のオレンジ背景
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
      [E] アイテム取得
    </div>
  );
}

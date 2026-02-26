export default function NearItemIndicator({ nearItem }) {
  if (!nearItem) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "50px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(255, 170, 0, 0.85)",
        color: "#000",
        padding: "8px 20px",
        borderRadius: "2px",
        fontSize: "14px",
        fontWeight: "bold",
        fontFamily: "'Courier New', monospace",
        letterSpacing: "1px",
        border: "1px solid rgba(255,255,255,0.3)",
        pointerEvents: "none",
        zIndex: 10,
        textShadow: "none",
      }}
    >
      [E] アイテム取得
    </div>
  );
}

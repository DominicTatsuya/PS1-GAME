export default function GameUI({ score, itemCount, totalItems, isLocked, elapsedTime, stamina, cleared }) {
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const timeBonus = Math.max(0, 300 - Math.floor(elapsedTime));
  const finalScore = score + (cleared ? timeBonus + 50 : 0);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        fontFamily: "'Courier New', monospace",
        color: "#fff",
        textShadow: "1px 1px 2px #000, 0 0 8px rgba(0,0,0,0.5)",
      }}
    >
      {!isLocked && !cleared && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            background: "linear-gradient(180deg, rgba(10,8,6,0.95) 0%, rgba(20,16,12,0.95) 100%)",
            padding: "40px 50px",
            borderRadius: "4px",
            border: "2px solid #ffaa00",
            boxShadow: "0 0 30px rgba(255,170,0,0.15), inset 0 0 60px rgba(0,0,0,0.5)",
            maxWidth: "420px",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: "28px",
              color: "#ffaa00",
              letterSpacing: "4px",
              textShadow: "0 0 10px rgba(255,170,0,0.5)",
            }}
          >
            DUNGEON
          </h1>
          <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#887755", letterSpacing: "6px" }}>
            PS1 EXPLORATION
          </p>

          <div
            style={{
              margin: "20px 0",
              padding: "15px",
              background: "rgba(255,170,0,0.08)",
              borderRadius: "2px",
              border: "1px solid rgba(255,170,0,0.2)",
            }}
          >
            <div style={controlStyle}>
              <span style={keyStyle}>W/A/S/D</span> 移動
            </div>
            <div style={controlStyle}>
              <span style={keyStyle}>MOUSE</span> 視点操作
            </div>
            <div style={controlStyle}>
              <span style={keyStyle}>SHIFT</span> ダッシュ
            </div>
            <div style={controlStyle}>
              <span style={keyStyle}>E</span> アイテム取得
            </div>
            <div style={controlStyle}>
              <span style={keyStyle}>ESC</span> 一時停止
            </div>
          </div>

          <p style={{ margin: "15px 0 5px", fontSize: "13px", color: "#ffaa00" }}>
            ダンジョン内のアイテムを全て集め
          </p>
          <p style={{ margin: "0 0 15px", fontSize: "13px", color: "#ffaa00" }}>
            出口を見つけて脱出せよ
          </p>
          <p style={{ margin: "10px 0 0", fontSize: "16px", color: "#fff", opacity: 0.7, letterSpacing: "2px" }}>
            ▶ クリックして開始
          </p>
        </div>
      )}

      {isLocked && !cleared && (
        <>
          <div
            style={{
              position: "absolute",
              top: "15px",
              left: "15px",
              background: "rgba(0,0,0,0.75)",
              padding: "12px 16px",
              borderRadius: "2px",
              border: "1px solid rgba(255,170,0,0.4)",
              fontSize: "14px",
              lineHeight: "1.6",
              minWidth: "140px",
            }}
          >
            <div style={{ color: "#ffaa00", fontWeight: "bold", fontSize: "13px" }}>
              SCORE <span style={{ color: "#fff", marginLeft: "8px" }}>{score}</span>
            </div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              <span style={{ color: "#888" }}>ITEMS</span>{" "}
              <span style={{ color: itemCount === totalItems ? "#00ff88" : "#ffcc00" }}>
                {itemCount}/{totalItems}
              </span>
            </div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              <span style={{ color: "#888" }}>TIME</span>{" "}
              <span style={{ color: "#ccc" }}>{formatTime(elapsedTime)}</span>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "20px",
              width: "120px",
            }}
          >
            <div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>STAMINA</div>
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "rgba(0,0,0,0.6)",
                borderRadius: "2px",
                border: "1px solid rgba(255,255,255,0.15)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${stamina}%`,
                  height: "100%",
                  background: stamina > 30 ? "#44aaff" : stamina > 10 ? "#ffaa00" : "#ff4444",
                  transition: "width 0.1s",
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>

          {itemCount === totalItems && (
            <div
              style={{
                position: "absolute",
                top: "80px",
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
                color: "#00ff88",
                fontSize: "14px",
                letterSpacing: "2px",
                textShadow: "0 0 10px rgba(0,255,136,0.5)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            >
              ▶ 出口へ向かえ
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "2px",
              height: "2px",
              background: "rgba(255,255,255,0.6)",
              borderRadius: "50%",
              boxShadow: "0 0 4px rgba(255,255,255,0.3)",
            }}
          />
        </>
      )}

      {cleared && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            background: "linear-gradient(180deg, rgba(0,20,10,0.95) 0%, rgba(0,10,5,0.95) 100%)",
            padding: "40px 60px",
            borderRadius: "4px",
            border: "2px solid #00ff88",
            boxShadow: "0 0 40px rgba(0,255,136,0.2)",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px 0",
              fontSize: "32px",
              color: "#00ff88",
              letterSpacing: "4px",
              textShadow: "0 0 15px rgba(0,255,136,0.5)",
            }}
          >
            DUNGEON CLEAR
          </h2>
          <div style={{ margin: "20px 0", fontSize: "14px", lineHeight: "2", color: "#aaa" }}>
            <div>
              TIME <span style={{ color: "#fff", marginLeft: "10px" }}>{formatTime(elapsedTime)}</span>
            </div>
            <div>
              ITEMS{" "}
              <span style={{ color: "#ffcc00", marginLeft: "10px" }}>
                {itemCount}/{totalItems}
              </span>
            </div>
            <div>
              TIME BONUS <span style={{ color: "#44aaff", marginLeft: "10px" }}>{timeBonus}</span>
            </div>
            <div>
              CLEAR BONUS <span style={{ color: "#44aaff", marginLeft: "10px" }}>50</span>
            </div>
          </div>
          <div
            style={{
              margin: "20px 0 10px",
              fontSize: "24px",
              color: "#ffaa00",
              letterSpacing: "2px",
            }}
          >
            TOTAL {finalScore}
          </div>
          <p style={{ margin: "20px 0 0", fontSize: "13px", color: "#666", letterSpacing: "1px" }}>
            クリックして再挑戦
          </p>
        </div>
      )}
    </div>
  );
}

const controlStyle = {
  margin: "6px 0",
  fontSize: "12px",
  color: "#bba880",
};

const keyStyle = {
  display: "inline-block",
  minWidth: "70px",
  color: "#ffcc88",
  fontWeight: "bold",
  textAlign: "right",
  marginRight: "10px",
};

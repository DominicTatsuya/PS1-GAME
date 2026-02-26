import { useRef, useEffect, useCallback, useState } from "react";

export default function Minimap({ dungeon, playerPosRef, exploredRef, items, collectedItems, exitActive, cameraYawRef }) {
  const canvasRef = useRef();
  const animRef = useRef();
  const [expanded, setExpanded] = useState(false);

  const SCALE_SMALL = 5;
  const SCALE_LARGE = 12;
  const scale = expanded ? SCALE_LARGE : SCALE_SMALL;

  const { grid, gridW, gridH, cellSize } = dungeon;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === "KeyM") {
        setExpanded((prev) => !prev);
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const w = gridW * scale;
    const h = gridH * scale;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    const explored = exploredRef.current;
    const collected = typeof collectedItems === "object" && collectedItems !== null && "current" in collectedItems
      ? collectedItems.current
      : collectedItems;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (!explored.has(`${x},${y}`)) continue;
        if (grid[y][x] === 1) {
          ctx.fillStyle = "#3a3530";
        } else {
          ctx.fillStyle = "#1a1815";
        }
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    const offsetX = (gridW * cellSize) / 2;
    const offsetZ = (gridH * cellSize) / 2;

    items.forEach((item) => {
      if (collected && collected.has(item.id)) return;
      const ix = Math.floor((item.position[0] + offsetX) / cellSize);
      const iy = Math.floor((item.position[2] + offsetZ) / cellSize);
      if (!explored.has(`${ix},${iy}`)) return;
      ctx.fillStyle = "#ffaa00";
      const s = expanded ? scale - 2 : scale;
      ctx.fillRect(ix * scale + (expanded ? 1 : 0), iy * scale + (expanded ? 1 : 0), s, s);
    });

    if (exitActive && dungeon.exitGrid) {
      const { gx, gy } = dungeon.exitGrid;
      if (explored.has(`${gx},${gy}`)) {
        ctx.fillStyle = "#00ff88";
        ctx.fillRect(gx * scale - 1, gy * scale - 1, scale + 2, scale + 2);
      }
    }

    if (playerPosRef.current) {
      const px = (playerPosRef.current.x + offsetX) / cellSize;
      const py = (playerPosRef.current.z + offsetZ) / cellSize;
      const cx = px * scale;
      const cy = py * scale;
      const r = expanded ? scale * 0.6 : scale * 0.8;

      ctx.fillStyle = "#00ccff";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      if (cameraYawRef && cameraYawRef.current !== undefined) {
        const yaw = cameraYawRef.current;
        const arrowLen = expanded ? scale * 1.8 : scale * 1.4;
        const arrowW = expanded ? scale * 0.5 : scale * 0.4;

        const tipX = cx + Math.sin(yaw) * arrowLen;
        const tipY = cy + Math.cos(yaw) * arrowLen;
        const leftX = cx + Math.sin(yaw - 2.5) * arrowW;
        const leftY = cy + Math.cos(yaw - 2.5) * arrowW;
        const rightX = cx + Math.sin(yaw + 2.5) * arrowW;
        const rightY = cy + Math.cos(yaw + 2.5) * arrowW;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (expanded) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "11px 'Courier New', monospace";
      ctx.fillText("[M] で閉じる", 4, h - 4);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [dungeon, playerPosRef, exploredRef, items, collectedItems, exitActive, cameraYawRef, grid, gridW, gridH, cellSize, scale, expanded]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  const canvasW = gridW * scale;
  const canvasH = gridH * scale;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        bottom: expanded ? "50%" : "20px",
        right: expanded ? "50%" : "20px",
        transform: expanded ? "translate(50%, 50%)" : "none",
        border: expanded ? "2px solid #ffaa00" : "2px solid #ffaa0088",
        borderRadius: "4px",
        opacity: expanded ? 0.92 : 0.85,
        imageRendering: "pixelated",
        width: canvasW + "px",
        height: canvasH + "px",
        background: "#000",
        zIndex: expanded ? 50 : 10,
        pointerEvents: "none",
        boxShadow: expanded ? "0 0 40px rgba(0,0,0,0.8)" : "none",
      }}
    />
  );
}

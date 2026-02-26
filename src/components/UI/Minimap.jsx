import { useRef, useEffect, useCallback } from "react";

export default function Minimap({ dungeon, playerPosRef, exploredRef, items, collectedItems, exitActive }) {
  const canvasRef = useRef();
  const animRef = useRef();

  const SCALE = 4;
  const { grid, gridW, gridH, cellSize } = dungeon;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const w = gridW * SCALE;
    const h = gridH * SCALE;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);

    const explored = exploredRef.current;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (!explored.has(`${x},${y}`)) continue;
        if (grid[y][x] === 1) {
          ctx.fillStyle = "#3a3530";
        } else {
          ctx.fillStyle = "#1a1815";
        }
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      }
    }

    const offsetX = (gridW * cellSize) / 2;
    const offsetZ = (gridH * cellSize) / 2;

    items.forEach((item) => {
      if (collectedItems.has(item.id)) return;
      const ix = Math.floor((item.position[0] + offsetX) / cellSize);
      const iy = Math.floor((item.position[2] + offsetZ) / cellSize);
      if (!explored.has(`${ix},${iy}`)) return;
      ctx.fillStyle = "#ffaa00";
      ctx.fillRect(ix * SCALE, iy * SCALE, SCALE, SCALE);
    });

    if (exitActive && dungeon.exitGrid) {
      const { gx, gy } = dungeon.exitGrid;
      if (explored.has(`${gx},${gy}`)) {
        ctx.fillStyle = "#00ff88";
        ctx.fillRect(gx * SCALE - 1, gy * SCALE - 1, SCALE + 2, SCALE + 2);
      }
    }

    if (playerPosRef.current) {
      const px = Math.floor((playerPosRef.current.x + offsetX) / cellSize);
      const py = Math.floor((playerPosRef.current.z + offsetZ) / cellSize);
      ctx.fillStyle = "#00ccff";
      ctx.beginPath();
      ctx.arc(px * SCALE + SCALE / 2, py * SCALE + SCALE / 2, SCALE * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [dungeon, playerPosRef, exploredRef, items, collectedItems, exitActive, grid, gridW, gridH, cellSize]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        border: "2px solid #ffaa0088",
        borderRadius: "4px",
        opacity: 0.85,
        imageRendering: "pixelated",
        width: gridW * SCALE + "px",
        height: gridH * SCALE + "px",
        background: "#000",
        zIndex: 10,
        pointerEvents: "none",
      }}
    />
  );
}

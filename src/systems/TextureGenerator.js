import * as THREE from "three";

export function generateStoneWallTexture(seed = 0) {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  let rng = seed + 7;
  const rand = () => {
    rng = (rng * 16807 + 13) % 2147483647;
    return (rng & 0x7fffffff) / 0x7fffffff;
  };

  ctx.fillStyle = "#1e1a15";
  ctx.fillRect(0, 0, S, S);

  const rows = [];
  let y = 0;
  while (y < S) {
    const h = 20 + Math.floor(rand() * 14);
    rows.push({ y, h: Math.min(h, S - y) });
    y += h + 2;
  }

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    let x = ri % 2 === 0 ? 0 : -(15 + Math.floor(rand() * 25));
    while (x < S) {
      const w = 28 + Math.floor(rand() * 38);
      const shade = Math.floor(rand() * 30) - 15;
      ctx.fillStyle = `rgb(${100 + shade},${88 + shade - 3},${74 + shade - 6})`;
      ctx.fillRect(x + 1, row.y + 1, w - 2, row.h - 2);
      ctx.fillStyle = "rgba(200,190,170,0.1)";
      ctx.fillRect(x + 1, row.y + 1, w - 2, 1);
      ctx.fillRect(x + 1, row.y + 1, 1, row.h - 2);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x + 1, row.y + row.h - 2, w - 2, 1);
      ctx.fillRect(x + w - 2, row.y + 1, 1, row.h - 2);
      for (let n = 0; n < 8; n++) {
        const nx = x + 3 + rand() * (w - 6);
        const ny = row.y + 3 + rand() * (row.h - 6);
        ctx.fillStyle = rand() > 0.5
          ? `rgba(0,0,0,${0.04 + rand() * 0.08})`
          : `rgba(180,170,150,${0.04 + rand() * 0.06})`;
        ctx.fillRect(nx, ny, 1 + rand() * 3, 1);
      }
      if (rand() > 0.7) {
        ctx.fillStyle = `rgba(50,40,30,${0.06 + rand() * 0.08})`;
        ctx.fillRect(x + 2 + rand() * (w - 10), row.y + row.h * 0.3, 4 + rand() * 8, row.h * 0.5);
      }
      x += w + 2;
    }
  }

  for (let i = 0; i < 25; i++) {
    const mx = rand() * S;
    const my = S * 0.3 + rand() * S * 0.7;
    ctx.fillStyle = `rgba(25,${55 + Math.floor(rand() * 45)},18,${0.15 + rand() * 0.35})`;
    ctx.beginPath();
    ctx.arc(mx, my, 2 + rand() * 7, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 15; i++) {
    ctx.fillStyle = `rgba(30,65,20,${0.1 + rand() * 0.2})`;
    ctx.fillRect(rand() * S, rand() * S, 2 + rand() * 12, 1 + rand() * 2);
  }

  const numVines = 1 + Math.floor(rand() * 3);
  for (let v = 0; v < numVines; v++) {
    let vx = 10 + rand() * (S - 20);
    let vy = 0;
    ctx.strokeStyle = `rgba(20,50,12,${0.35 + rand() * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    while (vy < S) {
      vx += (rand() - 0.5) * 10;
      vy += 4 + rand() * 6;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
    for (let l = 0; l < 4 + Math.floor(rand() * 5); l++) {
      const lx = vx + (rand() - 0.5) * 20;
      const ly = S * 0.15 + rand() * S * 0.75;
      const ls = 2 + rand() * 4;
      ctx.fillStyle = `rgba(22,${45 + Math.floor(rand() * 35)},12,${0.25 + rand() * 0.35})`;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rand() * Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 0, ls, ls * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(15,10,8,${0.08 + rand() * 0.12})`;
    ctx.fillRect(rand() * S, S * 0.6 + rand() * S * 0.4, 1, 3 + rand() * 8);
  }

  return canvas;
}

export function generateFlagstoneTexture() {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1a1714";
  ctx.fillRect(0, 0, S, S);

  const stones = [
    { x: 2, y: 2, w: 58, h: 58 }, { x: 64, y: 2, w: 62, h: 40 },
    { x: 64, y: 46, w: 30, h: 34 }, { x: 98, y: 46, w: 28, h: 34 },
    { x: 2, y: 64, w: 40, h: 62 }, { x: 46, y: 84, w: 36, h: 42 },
    { x: 86, y: 84, w: 40, h: 42 }, { x: 46, y: 64, w: 80, h: 16 },
  ];

  for (const s of stones) {
    const shade = Math.floor(Math.random() * 18) - 9;
    ctx.fillStyle = `rgb(${58 + shade},${52 + shade},${46 + shade})`;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = "rgba(180,170,155,0.08)";
    ctx.fillRect(s.x, s.y, s.w, 1);
    ctx.fillRect(s.x, s.y, 1, s.h);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(s.x, s.y + s.h - 1, s.w, 1);
    ctx.fillRect(s.x + s.w - 1, s.y, 1, s.h);
    for (let n = 0; n < 12; n++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "0,0,0" : "120,110,95"},${0.04 + Math.random() * 0.06})`;
      ctx.fillRect(s.x + 2 + Math.random() * (s.w - 4), s.y + 2 + Math.random() * (s.h - 4), 1 + Math.random() * 2, 1);
    }
  }

  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(28,55,20,${0.1 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

export function generateCeilingTexture() {
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#201c18";
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < 60; i++) {
    const shade = Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgba(${28 + shade},${25 + shade},${22 + shade},${0.3 + Math.random() * 0.5})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 6, 2 + Math.random() * 6);
  }

  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(10,8,6,${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 1;
    const cx = Math.random() * S, cy = Math.random() * S, len = 4 + Math.random() * 12;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (Math.random() - 0.5) * len, cy + (Math.random() - 0.5) * len);
    ctx.stroke();
  }

  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(20,40,15,${0.08 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

export function createTiledTexture(generatorFn, width, depth, tileSize = 2) {
  const canvas = generatorFn();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(width / tileSize, depth / tileSize);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

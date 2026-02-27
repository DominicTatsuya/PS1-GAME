/**
 * ============================================================
 * TextureGenerator.js — テクスチャ（模様画像）を手続き的に生成するモジュール
 * ============================================================
 *
 * Three.js では 3D オブジェクトの表面に「テクスチャ」と呼ばれる画像を貼り付けて
 * 見た目を作ります。通常は画像ファイル(.png など)を読み込みますが、
 * このファイルでは Canvas API を使ってプログラムで画像を描き、
 * それをそのままテクスチャとして利用しています。
 *
 * メリット:
 *   - 外部画像ファイルが不要（読み込み待ちが発生しない）
 *   - シード値を変えるだけで異なるバリエーションを生成できる
 *
 * 提供する関数:
 *   1. generateStoneWallTexture — 石壁テクスチャを生成
 *   2. generateFlagstoneTexture — 敷石（床）テクスチャを生成
 *   3. generateCeilingTexture  — 天井テクスチャを生成
 *   4. createTiledTexture      — 生成したテクスチャをタイル状に繰り返す設定を行う
 * ============================================================
 */

import * as THREE from "three";

/**
 * generateStoneWallTexture(seed)
 * ─────────────────────────────
 * 石積みの壁テクスチャを Canvas に描画して返す関数。
 *
 * 処理の流れ:
 *   1. 暗い背景色で Canvas を塗りつぶす（目地＝石と石の隙間の色）
 *   2. 横方向に「石の列（row）」を積み重ねる
 *   3. 各列で石ブロックを横に並べ、ハイライト・影・ノイズを加える
 *   4. 苔（コケ）や蔦（ツタ）を描画して自然な古い壁を表現
 *   5. 水垂れの跡を追加
 *
 * @param {number} seed — 乱数のシード値。同じ値なら同じ模様が再現される
 * @returns {HTMLCanvasElement} — 描画済みの Canvas 要素
 */
export function generateStoneWallTexture(seed = 0) {
  // S = テクスチャの解像度（ピクセル）。128×128 の正方形画像を生成する
  const S = 128;

  // HTML の <canvas> 要素をメモリ上に作成し、描画コンテキストを取得
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  // ─── 擬似乱数生成器（線形合同法の簡易版） ───
  // seed を元に毎回異なるが再現可能な乱数列を生成する。
  // rng の初期値は seed + 7（衝突を避けるためのオフセット）。
  // 2147483647 = 2^31 - 1（メルセンヌ素数、剰余演算の法）。
  let rng = seed + 7;
  const rand = () => {
    rng = (rng * 16807 + 13) % 2147483647;
    return (rng & 0x7fffffff) / 0x7fffffff; // 0〜1 の浮動小数点数を返す
  };

  // ─── ステップ 1: 背景（目地色）で全面を塗りつぶす ───
  // "#1e1a15" はとても暗い茶色。石と石の隙間がこの色になる
  ctx.fillStyle = "#1e1a15";
  ctx.fillRect(0, 0, S, S);

  // ─── ステップ 2: 石の列（row）を上から下へ積み上げる ───
  // 各列の高さ h は 20〜33px のランダム。列と列の間に 2px の隙間（目地）を置く
  const rows = [];
  let y = 0;
  while (y < S) {
    const h = 20 + Math.floor(rand() * 14); // 石の高さ: 20〜33px
    rows.push({ y, h: Math.min(h, S - y) }); // Canvas からはみ出さないよう clamp
    y += h + 2; // 次の列の開始位置（+2 は目地の幅）
  }

  // ─── ステップ 3: 各列に石ブロックを描画 ───
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];

    // 偶数列は左端(x=0)から、奇数列はランダムに左にずらして開始
    // → レンガのように互い違いに石を配置する（ランニングボンド風）
    let x = ri % 2 === 0 ? 0 : -(15 + Math.floor(rand() * 25));

    while (x < S) {
      const w = 28 + Math.floor(rand() * 38); // 石の幅: 28〜65px

      // 石の基本色。shade で明るさにランダムな揺らぎを加える
      // RGB の基準は (100, 85, 68) 付近の茶色〜灰色
      const shade = Math.floor(rand() * 30) - 15; // -15〜+14 の範囲
      ctx.fillStyle = `rgb(${100 + shade},${88 + shade - 3},${74 + shade - 6})`;
      // 四辺を 1px ずつ内側にオフセットして描画（目地が残るように）
      ctx.fillRect(x + 1, row.y + 1, w - 2, row.h - 2);

      // 上辺・左辺にハイライト（光が当たっている感じ）
      ctx.fillStyle = "rgba(200,190,170,0.1)"; // 薄い明るい色
      ctx.fillRect(x + 1, row.y + 1, w - 2, 1);    // 上辺
      ctx.fillRect(x + 1, row.y + 1, 1, row.h - 2); // 左辺

      // 下辺・右辺にシャドウ（影で立体感を出す）
      ctx.fillStyle = "rgba(0,0,0,0.18)"; // 半透明の黒
      ctx.fillRect(x + 1, row.y + row.h - 2, w - 2, 1);    // 下辺
      ctx.fillRect(x + w - 2, row.y + 1, 1, row.h - 2);     // 右辺

      // 石の表面にノイズ（細かい斑点）を追加して質感を出す
      for (let n = 0; n < 8; n++) {
        const nx = x + 3 + rand() * (w - 6);       // 石の内側のランダムな X 座標
        const ny = row.y + 3 + rand() * (row.h - 6); // 石の内側のランダムな Y 座標
        // 暗い点か明るい点をランダムに選んで描画
        ctx.fillStyle = rand() > 0.5
          ? `rgba(0,0,0,${0.04 + rand() * 0.08})`          // 暗い斑点
          : `rgba(180,170,150,${0.04 + rand() * 0.06})`;    // 明るい斑点
        ctx.fillRect(nx, ny, 1 + rand() * 3, 1); // 1〜4px 幅の小さな点
      }

      // 30% の確率で石にシミ（汚れ）を追加
      if (rand() > 0.7) {
        ctx.fillStyle = `rgba(50,40,30,${0.06 + rand() * 0.08})`;
        ctx.fillRect(x + 2 + rand() * (w - 10), row.y + row.h * 0.3, 4 + rand() * 8, row.h * 0.5);
      }

      x += w + 2; // 次の石の開始位置（+2 は目地の幅）
    }
  }

  // ─── ステップ 4a: 苔（コケ）の斑点を描画 ───
  // 壁の下部 70% に緑色の小さな円を 25 個ランダム配置
  for (let i = 0; i < 25; i++) {
    const mx = rand() * S;
    const my = S * 0.3 + rand() * S * 0.7; // Y 座標は上から 30%〜100% の範囲
    ctx.fillStyle = `rgba(25,${55 + Math.floor(rand() * 45)},18,${0.15 + rand() * 0.35})`;
    ctx.beginPath();
    ctx.arc(mx, my, 2 + rand() * 7, 0, Math.PI * 2); // 半径 2〜9px の円
    ctx.fill();
  }

  // ─── ステップ 4b: 苔の横筋（細長い苔）を描画 ───
  for (let i = 0; i < 15; i++) {
    ctx.fillStyle = `rgba(30,65,20,${0.1 + rand() * 0.2})`;
    ctx.fillRect(rand() * S, rand() * S, 2 + rand() * 12, 1 + rand() * 2);
  }

  // ─── ステップ 4c: 蔦（ツタ）を描画 ───
  // 1〜3 本のツタを上から下に向かってランダムに蛇行させる
  const numVines = 1 + Math.floor(rand() * 3);
  for (let v = 0; v < numVines; v++) {
    let vx = 10 + rand() * (S - 20); // ツタの開始 X 座標（端すぎない位置）
    let vy = 0;                        // Y=0（上端）から開始
    ctx.strokeStyle = `rgba(20,50,12,${0.35 + rand() * 0.3})`; // 暗い緑色の線
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(vx, vy);

    // 上から下へ少しずつ蛇行しながら線を引く
    while (vy < S) {
      vx += (rand() - 0.5) * 10; // X 方向に -5〜+5px ランダムにずれる
      vy += 4 + rand() * 6;      // Y 方向に 4〜10px 進む
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();

    // ツタの葉っぱを 4〜8 枚ランダムに付ける
    for (let l = 0; l < 4 + Math.floor(rand() * 5); l++) {
      const lx = vx + (rand() - 0.5) * 20; // 葉の X 座標（ツタの近く）
      const ly = S * 0.15 + rand() * S * 0.75; // Y 座標は上 15%〜下 90%
      const ls = 2 + rand() * 4; // 葉のサイズ（長径）

      ctx.fillStyle = `rgba(22,${45 + Math.floor(rand() * 35)},12,${0.25 + rand() * 0.35})`;
      ctx.save();         // 現在の変換行列を保存
      ctx.translate(lx, ly); // 描画原点を葉の位置に移動
      ctx.rotate(rand() * Math.PI); // ランダムに回転させて自然な向きに
      ctx.beginPath();
      // 楕円（長径 ls、短径 ls×0.55）で葉の形を表現
      ctx.ellipse(0, 0, ls, ls * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();      // 変換行列を元に戻す
    }
  }

  // ─── ステップ 5: 水垂れの跡を描画 ───
  // 壁の下部 40% に縦長の細い暗色の線を 8 本描画
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(15,10,8,${0.08 + rand() * 0.12})`;
    ctx.fillRect(rand() * S, S * 0.6 + rand() * S * 0.4, 1, 3 + rand() * 8);
  }

  return canvas; // 描画済み Canvas を返す（Three.js のテクスチャとして使える）
}

/**
 * generateFlagstoneTexture()
 * ──────────────────────────
 * 敷石（フラッグストーン）の床テクスチャを生成する関数。
 *
 * あらかじめ定義した石の配置パターン（8 個の石）を描画し、
 * 各石にハイライト・影・ノイズを加える。
 * 最後に苔の斑点も少し加える。
 *
 * @returns {HTMLCanvasElement} — 描画済みの Canvas 要素
 */
export function generateFlagstoneTexture() {
  // テクスチャ解像度: 128×128 ピクセル
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  // 背景色（目地の色）: とても暗い茶色
  ctx.fillStyle = "#1a1714";
  ctx.fillRect(0, 0, S, S);

  // ─── 石の配置データ ───
  // 各要素は { x, y, w, h } で石の位置とサイズを表す（単位: px）
  // 手動で配置することで自然な石畳風のパターンを作っている
  const stones = [
    { x: 2, y: 2, w: 58, h: 58 }, { x: 64, y: 2, w: 62, h: 40 },
    { x: 64, y: 46, w: 30, h: 34 }, { x: 98, y: 46, w: 28, h: 34 },
    { x: 2, y: 64, w: 40, h: 62 }, { x: 46, y: 84, w: 36, h: 42 },
    { x: 86, y: 84, w: 40, h: 42 }, { x: 46, y: 64, w: 80, h: 16 },
  ];

  // 各石を描画
  for (const s of stones) {
    // shade で石ごとに微妙に色味を変える（-9〜+8）
    const shade = Math.floor(Math.random() * 18) - 9;
    // 石の基本色: (58, 52, 46) 付近の暗い灰色〜茶色
    ctx.fillStyle = `rgb(${58 + shade},${52 + shade},${46 + shade})`;
    ctx.fillRect(s.x, s.y, s.w, s.h);

    // 上辺・左辺にハイライト（光が当たる面）
    ctx.fillStyle = "rgba(180,170,155,0.08)";
    ctx.fillRect(s.x, s.y, s.w, 1);      // 上辺
    ctx.fillRect(s.x, s.y, 1, s.h);      // 左辺

    // 下辺・右辺にシャドウ（影になる面）
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(s.x, s.y + s.h - 1, s.w, 1); // 下辺
    ctx.fillRect(s.x + s.w - 1, s.y, 1, s.h); // 右辺

    // 石表面にノイズ（細かい斑点）を 12 個追加
    for (let n = 0; n < 12; n++) {
      // 黒い点か灰色の点をランダムに選択
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "0,0,0" : "120,110,95"},${0.04 + Math.random() * 0.06})`;
      ctx.fillRect(s.x + 2 + Math.random() * (s.w - 4), s.y + 2 + Math.random() * (s.h - 4), 1 + Math.random() * 2, 1);
    }
  }

  // ─── 苔の斑点を 10 個追加 ───
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(28,55,20,${0.1 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/**
 * generateCeilingTexture()
 * ────────────────────────
 * 天井テクスチャを生成する関数。
 *
 * 暗い石天井を表現するため、小さな色むらの四角形と、
 * ひび割れを模した短い線、そして少量の苔を描画する。
 *
 * @returns {HTMLCanvasElement} — 描画済みの Canvas 要素
 */
export function generateCeilingTexture() {
  // テクスチャ解像度: 64×64 ピクセル（壁や床より小さめで十分）
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  // 背景色: 非常に暗い茶色
  ctx.fillStyle = "#201c18";
  ctx.fillRect(0, 0, S, S);

  // ─── 石の色むら（ランダムな小さな四角形）を 60 個描画 ───
  for (let i = 0; i < 60; i++) {
    const shade = Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgba(${28 + shade},${25 + shade},${22 + shade},${0.3 + Math.random() * 0.5})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 6, 2 + Math.random() * 6);
  }

  // ─── ひび割れ（短い線）を 5 本描画 ───
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(10,8,6,${0.15 + Math.random() * 0.2})`;
    ctx.lineWidth = 1;
    const cx = Math.random() * S, cy = Math.random() * S, len = 4 + Math.random() * 12;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    // ランダムな方向に 4〜16px の線を引く
    ctx.lineTo(cx + (Math.random() - 0.5) * len, cy + (Math.random() - 0.5) * len);
    ctx.stroke();
  }

  // ─── 苔の斑点を 4 個追加 ───
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(20,40,15,${0.08 + Math.random() * 0.12})`;
    ctx.beginPath();
    ctx.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/**
 * createTiledTexture(generatorFn, width, depth, tileSize)
 * ───────────────────────────────────────────────────────
 * テクスチャ生成関数が返す Canvas を Three.js の CanvasTexture に変換し、
 * 指定した幅・奥行きに合わせてタイル状に繰り返す設定を行う関数。
 *
 * Three.js のテクスチャ概念:
 *   - CanvasTexture: Canvas 要素をそのままテクスチャとして使えるクラス
 *   - wrapS / wrapT: テクスチャの繰り返し方法（S=横方向, T=縦方向）
 *     → RepeatWrapping にすると、端に達したら最初に戻って繰り返す
 *   - repeat: テクスチャが何回繰り返されるかを設定する
 *   - magFilter / minFilter: テクスチャの拡大・縮小時の補間方法
 *     → NearestFilter にするとドット絵風のくっきりした見た目になる
 *
 * @param {Function} generatorFn — テクスチャを生成する関数（Canvas を返す）
 * @param {number} width   — テクスチャを貼る面の幅（ワールド座標の単位）
 * @param {number} depth   — テクスチャを貼る面の奥行き（ワールド座標の単位）
 * @param {number} tileSize — タイル 1 枚分のワールドサイズ（デフォルト: 2 単位）
 * @returns {THREE.CanvasTexture} — 設定済みのテクスチャオブジェクト
 */
export function createTiledTexture(generatorFn, width, depth, tileSize = 2) {
  const canvas = generatorFn();                   // Canvas を生成
  const tex = new THREE.CanvasTexture(canvas);    // Three.js テクスチャに変換
  tex.wrapS = THREE.RepeatWrapping;               // 横方向にリピート
  tex.wrapT = THREE.RepeatWrapping;               // 縦方向にリピート
  tex.repeat.set(width / tileSize, depth / tileSize); // 面積に応じた繰り返し回数
  tex.magFilter = THREE.NearestFilter;            // 拡大時: ドット絵風（ぼかさない）
  tex.minFilter = THREE.NearestFilter;            // 縮小時: ドット絵風（ぼかさない）
  return tex;
}

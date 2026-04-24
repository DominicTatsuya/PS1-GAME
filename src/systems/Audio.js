/**
 * ============================================================
 * Audio.js — Web Audio API による手続き合成サウンド
 * ============================================================
 *
 * 画像アセット同様、音声ファイルは持たず、OscillatorNode /
 * GainNode を組み合わせてレトロゲーム風の電子音を合成する。
 *
 * 公開する SE:
 *   - footstep()        … 足音（移動中に周期的に呼ぶ）
 *   - pickup()          … アイテム取得
 *   - portalActivate()  … 全アイテム収集時のポータル活性化
 *   - clear()           … ダンジョンクリア時のファンファーレ
 *
 * また bgm.start() / bgm.stop() で環境アンビエントを制御できる。
 *
 * 音量は SFX と BGM を別々に制御可能。localStorage に永続化する。
 *
 * ブラウザのオートプレイポリシーにより、AudioContext は
 * ユーザジェスチャ（クリックなど）後に `ensureContext()` で
 * 起動する必要がある。
 * ============================================================
 */

// ブラウザ差異を吸収
const AudioContextCtor =
  typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;

// localStorage キー
const NS = "ps1game:";
const KEY_SFX_VOLUME = NS + "sfxVolume";
const KEY_BGM_VOLUME = NS + "bgmVolume";
const KEY_MUTED = NS + "muted";

// ------------------------------------------------------------
// 内部状態
// ------------------------------------------------------------

let ctx = null;        // AudioContext 本体
let sfxGain = null;    // SFX 用マスター GainNode
let bgmGain = null;    // BGM 用マスター GainNode
let bgmNodes = null;   // 再生中の BGM ノード（stop 時に破棄する）
let sfxVolume = 0.5;   // 0〜1
let bgmVolume = 0.3;   // 0〜1（BGM は控えめが無難）
let muted = false;

// ------------------------------------------------------------
// 永続化・初期化
// ------------------------------------------------------------

function loadFromStorage() {
  try {
    const s = localStorage.getItem(KEY_SFX_VOLUME);
    if (s !== null) {
      const n = Number(s);
      if (Number.isFinite(n) && n >= 0 && n <= 1) sfxVolume = n;
    }
    const b = localStorage.getItem(KEY_BGM_VOLUME);
    if (b !== null) {
      const n = Number(b);
      if (Number.isFinite(n) && n >= 0 && n <= 1) bgmVolume = n;
    }
    const m = localStorage.getItem(KEY_MUTED);
    if (m === "1") muted = true;
  } catch {
    // localStorage 未対応の環境は既定値のまま
  }
}
loadFromStorage();

function saveToStorage() {
  try {
    localStorage.setItem(KEY_SFX_VOLUME, String(sfxVolume));
    localStorage.setItem(KEY_BGM_VOLUME, String(bgmVolume));
    localStorage.setItem(KEY_MUTED, muted ? "1" : "0");
  } catch {
    // 無視
  }
}

/**
 * AudioContext を起動する（要ユーザジェスチャ）。
 * 既に起動済みなら何もしない。
 * @returns {boolean} 起動成功なら true
 */
export function ensureContext() {
  if (!AudioContextCtor) return false;
  if (!ctx) {
    try {
      ctx = new AudioContextCtor();
      sfxGain = ctx.createGain();
      bgmGain = ctx.createGain();
      sfxGain.gain.value = muted ? 0 : sfxVolume;
      bgmGain.gain.value = muted ? 0 : bgmVolume;
      sfxGain.connect(ctx.destination);
      bgmGain.connect(ctx.destination);
    } catch {
      ctx = null;
      return false;
    }
  }
  // Safari などは suspended 状態で生まれることがある → resume する
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return true;
}

// ------------------------------------------------------------
// 音量制御
// ------------------------------------------------------------

export function getSfxVolume() { return sfxVolume; }
export function getBgmVolume() { return bgmVolume; }
export function isMuted() { return muted; }

export function setSfxVolume(v) {
  sfxVolume = Math.min(1, Math.max(0, Number(v) || 0));
  if (sfxGain) sfxGain.gain.value = muted ? 0 : sfxVolume;
  saveToStorage();
}

export function setBgmVolume(v) {
  bgmVolume = Math.min(1, Math.max(0, Number(v) || 0));
  if (bgmGain) bgmGain.gain.value = muted ? 0 : bgmVolume;
  saveToStorage();
}

export function setMuted(m) {
  muted = Boolean(m);
  if (sfxGain) sfxGain.gain.value = muted ? 0 : sfxVolume;
  if (bgmGain) bgmGain.gain.value = muted ? 0 : bgmVolume;
  saveToStorage();
}

// ------------------------------------------------------------
// SFX 合成ヘルパ
// ------------------------------------------------------------

/**
 * 単発トーンを再生する。エンベロープで耳障りなクリックノイズを抑える。
 *
 * @param {Object} opts
 * @param {number} opts.freq - 開始周波数 (Hz)
 * @param {number} [opts.endFreq] - 終了周波数（グライド）
 * @param {number} opts.duration - 長さ (秒)
 * @param {OscillatorType} [opts.type="triangle"] - 波形
 * @param {number} [opts.gain=0.3] - ピーク音量（SFX ゲイン手前で更に乗算される）
 * @param {number} [opts.attack=0.005] - アタック時間 (秒)
 * @param {number} [opts.release=0.05] - リリース時間 (秒)
 */
function playTone({ freq, endFreq, duration, type = "triangle", gain = 0.3, attack = 0.005, release = 0.05 }) {
  if (!ctx || !sfxGain) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (typeof endFreq === "number") {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
  }
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain, now + attack);
  env.gain.setValueAtTime(gain, now + Math.max(attack, duration - release));
  env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(env).connect(sfxGain);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** 短いノイズバーストを再生（低音域の「ドスッ」などに使う） */
function playNoise({ duration, gain = 0.1, lowpassHz = 400 }) {
  if (!ctx || !sfxGain) return;
  const now = ctx.currentTime;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpassHz;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, now);
  env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter).connect(env).connect(sfxGain);
  src.start(now);
  src.stop(now + duration + 0.02);
}

// ------------------------------------------------------------
// 公開 SE
// ------------------------------------------------------------

/** 足音: 低音域のノイズバースト */
export function footstep() {
  if (!ensureContext()) return;
  // 足音は 2 連の微妙なランダム化で単調さを減らす
  const basePitch = 180 + (Math.random() - 0.5) * 30;
  playNoise({ duration: 0.08, gain: 0.08, lowpassHz: basePitch });
}

/** アイテム取得: 上昇するピッチの短いビープ */
export function pickup() {
  if (!ensureContext()) return;
  playTone({ freq: 660, endFreq: 1320, duration: 0.15, type: "triangle", gain: 0.2 });
  // ちょっと遅らせて重ねると「キラン」感が出る
  setTimeout(() => playTone({ freq: 1320, endFreq: 1760, duration: 0.1, type: "sine", gain: 0.12 }), 60);
}

/** ポータル活性化: 低音 → 高音のうねり */
export function portalActivate() {
  if (!ensureContext()) return;
  playTone({ freq: 110, endFreq: 440, duration: 0.6, type: "sawtooth", gain: 0.15 });
  setTimeout(() => playTone({ freq: 220, endFreq: 880, duration: 0.5, type: "square", gain: 0.08 }), 120);
}

/** クリア: アルペジオ風の上昇ファンファーレ */
export function clear() {
  if (!ensureContext()) return;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((f, i) => {
    setTimeout(() => playTone({ freq: f, duration: 0.22, type: "triangle", gain: 0.22, release: 0.08 }), i * 130);
  });
  // 末尾に低音の厚み
  setTimeout(() => playTone({ freq: 131, duration: 0.5, type: "sine", gain: 0.18 }), notes.length * 130);
}

// ------------------------------------------------------------
// BGM（環境アンビエント）
// ------------------------------------------------------------

/**
 * BGM ループを開始する。既に鳴っていれば二重起動しない。
 * 2 つの低周波オシレータを軽くデチューンして重ねた、
 * ダンジョン風の持続音。
 */
function bgmStart() {
  if (!ensureContext()) return;
  if (bgmNodes) return;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  osc1.type = "sine";
  osc2.type = "sine";
  osc3.type = "triangle";
  osc1.frequency.value = 55;   // 低音ドローン
  osc2.frequency.value = 82.5; // 完全 5 度上
  osc3.frequency.value = 110;  // オクターブ
  // デチューンでうねりを出す
  osc2.detune.value = 7;
  osc3.detune.value = -5;

  // 低音ローパスフィルタ
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 500;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(1, now + 2.0); // ゆっくりフェードイン

  osc1.connect(filter);
  osc2.connect(filter);
  osc3.connect(filter);
  filter.connect(env).connect(bgmGain);

  osc1.start(now);
  osc2.start(now);
  osc3.start(now);

  bgmNodes = { osc1, osc2, osc3, env, filter };
}

/** BGM を短くフェードアウトして停止する */
function bgmStop() {
  if (!ctx || !bgmNodes) return;
  const now = ctx.currentTime;
  try {
    bgmNodes.env.gain.cancelScheduledValues(now);
    bgmNodes.env.gain.setValueAtTime(bgmNodes.env.gain.value, now);
    bgmNodes.env.gain.linearRampToValueAtTime(0, now + 0.3);
    bgmNodes.osc1.stop(now + 0.35);
    bgmNodes.osc2.stop(now + 0.35);
    bgmNodes.osc3.stop(now + 0.35);
  } catch {
    // 無視
  }
  bgmNodes = null;
}

export const bgm = { start: bgmStart, stop: bgmStop };

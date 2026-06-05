/**
 * ============================================================
 * Api.js — ランキング API クライアント
 * ============================================================
 *
 * Lambda + API Gateway 上のスコアランキング API を叩くためのクライアント。
 * lambda/src/handler.ts と対になる:
 *   - POST /scores       … スコア記録
 *   - GET  /scores/top   … Top N 取得
 *
 * 設計方針:
 *   - 環境変数 `VITE_API_BASE` が未設定なら全関数を no-op として扱う。
 *     これにより、AWS バックエンドが構築されていない開発環境でも
 *     フロントだけ先に実装・動作確認できる（オフラインモード）。
 *   - ネットワークエラー時は throw せず null / [] を返す。
 *     UI 側はランキング表示の有無で分岐するだけで良くなる。
 *   - 重要なエラーは console.warn でログを残し、開発時の気づきを担保する。
 *   - AbortController で 5 秒タイムアウトを設定し、UI を固めない。
 * ============================================================
 */

/**
 * Vite が公開する import.meta.env.VITE_API_BASE を読み出す。
 * 未設定なら空文字を返す（Boolean 評価で false になる）。
 *
 * 補足: import.meta.env はビルド時に静的置換されるため、
 *       実行時に値を切り替えるには再ビルドが必要。
 */
const API_BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) || "";

/** API が有効化されているか（= 環境変数が設定されているか） */
export function isApiEnabled() {
  return Boolean(API_BASE);
}

/** リクエストタイムアウト（ミリ秒）。 5s は API Gateway の標準より十分短い値。 */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * fetch にタイムアウトを付与した内部ヘルパ。
 * AbortController によりタイムアウト時はリクエストをキャンセルする。
 *
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * スコアを 1 件送信する。
 *
 * 引数の意味:
 *   - user_id: ランキング表示名（1〜64 文字）。ユーザ入力をそのまま渡す
 *   - cleartime: クリアタイム（秒）。短いほど上位
 *   - score: 最終スコア（任意）。未指定なら API 側で 0 扱い
 *
 * @param {{ user_id: string, cleartime: number, score?: number }} payload
 * @returns {Promise<{ record_id: string } | null>} 成功時はレコード ID、失敗または無効化時は null
 */
export async function postScore(payload) {
  if (!isApiEnabled()) return null;

  try {
    const res = await fetchWithTimeout(`${API_BASE}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // 4xx/5xx は本文を読まずに警告のみ（UI を止めないため）
      console.warn(`postScore: HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    // ネットワーク断・タイムアウト・CORS 失敗など
    console.warn("postScore: failed", err);
    return null;
  }
}

/**
 * Top N 件のランキングを取得する。
 *
 * @param {number} [limit=10] - 取得件数（API 側で 1〜100 にクランプされる）
 * @returns {Promise<Array<{ user_id: string, cleartime: number, score: number, timestamp: string }>>}
 *          無効化・失敗時は空配列を返す
 */
export async function getTopScores(limit = 10) {
  if (!isApiEnabled()) return [];

  try {
    const url = `${API_BASE}/scores/top?limit=${encodeURIComponent(limit)}`;
    const res = await fetchWithTimeout(url, { method: "GET" });
    if (!res.ok) {
      console.warn(`getTopScores: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.records) ? data.records : [];
  } catch (err) {
    console.warn("getTopScores: failed", err);
    return [];
  }
}

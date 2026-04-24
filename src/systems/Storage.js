/**
 * ============================================================
 * Storage.js — localStorage を使ったゲームデータの永続化
 * ============================================================
 *
 * ベストタイム・ベストスコアをブラウザの localStorage に保存する。
 * localStorage はブラウザに依存した永続化領域で、
 * ユーザが明示的にキャッシュを消さない限り保持される。
 *
 * 本モジュールは純粋に入出力用なので、React には依存しない。
 * ストレージアクセスが失敗してもゲーム本体の動作に影響しないよう、
 * 全関数で try/catch し、失敗時は安全な既定値を返す。
 * ============================================================
 */

// 名前空間プレフィックス。他のプロジェクトと競合しないようにしている
const NS = "ps1game:";

// localStorage のキー名（変更時は既存ユーザのデータ互換性に注意）
const KEY_BEST_TIME = NS + "bestTime";
const KEY_BEST_SCORE = NS + "bestScore";
const KEY_DIFFICULTY = NS + "difficulty";

// 難易度ごとに別のベスト記録を保持するため、難易度サフィックスを付ける
const bestTimeKey = (difficulty) => KEY_BEST_TIME + ":" + difficulty;
const bestScoreKey = (difficulty) => KEY_BEST_SCORE + ":" + difficulty;

/**
 * ブラウザが localStorage を利用可能か判定する。
 * プライベートブラウジング等で失敗する環境もあるため、毎回 try で守る。
 * @returns {boolean} 利用可能なら true
 */
function isAvailable() {
  try {
    const probe = NS + "__probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * ベストタイム（秒）を取得する。未記録なら null を返す。
 * @param {string} difficulty - 難易度 ID（"easy" | "normal" | "hard"）
 * @returns {number | null}
 */
export function getBestTime(difficulty = "normal") {
  if (!isAvailable()) return null;
  try {
    const raw = localStorage.getItem(bestTimeKey(difficulty));
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * ベストスコアを取得する。未記録なら null を返す。
 * @param {string} difficulty - 難易度 ID
 * @returns {number | null}
 */
export function getBestScore(difficulty = "normal") {
  if (!isAvailable()) return null;
  try {
    const raw = localStorage.getItem(bestScoreKey(difficulty));
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * 今回のタイム・スコアを現状のベストと比較し、更新が必要なら書き込む。
 * ベスト記録は難易度別に保存される。
 * @param {number} elapsedTime - 今回のクリアタイム（秒）
 * @param {number} score - 今回のスコア
 * @param {string} difficulty - 難易度 ID
 * @returns {{ bestTimeUpdated: boolean, bestScoreUpdated: boolean }}
 */
export function updateBestRecord(elapsedTime, score, difficulty = "normal") {
  const result = { bestTimeUpdated: false, bestScoreUpdated: false };
  if (!isAvailable()) return result;

  try {
    // タイム: 短いほど良い（昇順）
    const prevTime = getBestTime(difficulty);
    if (prevTime === null || elapsedTime < prevTime) {
      localStorage.setItem(bestTimeKey(difficulty), String(elapsedTime));
      result.bestTimeUpdated = true;
    }

    // スコア: 高いほど良い（降順）
    const prevScore = getBestScore(difficulty);
    if (prevScore === null || score > prevScore) {
      localStorage.setItem(bestScoreKey(difficulty), String(score));
      result.bestScoreUpdated = true;
    }
  } catch {
    // 書き込み失敗時は無視（クォータ超過など）
  }

  return result;
}

/**
 * ベスト記録を全て削除する。設定画面からのリセット用。
 * difficulty 未指定時は全難易度のベスト記録を削除する。
 * @param {string} [difficulty] - 削除対象の難易度。省略すると全削除
 */
export function clearBestRecord(difficulty) {
  if (!isAvailable()) return;
  try {
    if (difficulty) {
      localStorage.removeItem(bestTimeKey(difficulty));
      localStorage.removeItem(bestScoreKey(difficulty));
    } else {
      // 全難易度分を消す
      for (const d of ["easy", "normal", "hard"]) {
        localStorage.removeItem(bestTimeKey(d));
        localStorage.removeItem(bestScoreKey(d));
      }
      // 旧バージョン（難易度サフィックスなし）のキーも掃除
      localStorage.removeItem(KEY_BEST_TIME);
      localStorage.removeItem(KEY_BEST_SCORE);
    }
  } catch {
    // 無視
  }
}

/**
 * 最後に選択された難易度を取得する。未保存または不正値なら "normal" を返す。
 * @returns {"easy" | "normal" | "hard"}
 */
export function getSavedDifficulty() {
  if (!isAvailable()) return "normal";
  try {
    const raw = localStorage.getItem(KEY_DIFFICULTY);
    if (raw === "easy" || raw === "normal" || raw === "hard") return raw;
    return "normal";
  } catch {
    return "normal";
  }
}

/**
 * 難易度を保存する。
 * @param {"easy" | "normal" | "hard"} difficulty
 */
export function saveDifficulty(difficulty) {
  if (!isAvailable()) return;
  try {
    localStorage.setItem(KEY_DIFFICULTY, difficulty);
  } catch {
    // 無視
  }
}

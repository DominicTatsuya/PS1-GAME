/**
 * ============================================================
 * config.js — ゲーム全体の定数（設定値）をまとめたファイル
 * ============================================================
 *
 * ゲーム内で使われる数値パラメータを一箇所に集約しています。
 *
 * なぜ定数をまとめるのか？
 *   - マジックナンバー（コード中に直接書かれた数値）を避けられる
 *   - バランス調整時に 1 ファイルだけ変更すれば済む
 *   - 定数の意味がコード中で明確になる
 *
 * ─── 難易度対応 ───
 * このファイルは Normal（標準難易度）の値を export しつつ、
 * `DIFFICULTY_PRESETS` に他難易度とのオーバーライドを定義しています。
 * `applyDifficulty(difficulty)` を呼ぶと、該当難易度の値で
 * `MAZE` / `ITEMS` / `TORCH` / `PLAYER` を上書きします。
 *
 * これにより、既存コードの `import { MAZE } from "../data/config"` を
 * 書き換えずに難易度切替が機能します（同じオブジェクト参照を
 * 書き換えるため、import 側は常に最新値を見る）。
 *
 * 各セクション:
 *   MAZE    — 迷路の構造に関する定数
 *   PLAYER  — プレイヤーの動作に関する定数
 *   ITEMS   — 収集アイテムに関する定数
 *   SCORING — スコア計算に関する定数
 *   TORCH   — たいまつ（照明）に関する定数
 * ============================================================
 */

/**
 * MAZE — 迷路の構造パラメータ
 *
 * WIDTH / HEIGHT: 迷路のセル数（10×10 = 100 セル）
 * CELL_SIZE: 1 セルの 3D 空間での大きさ（2.0 メートル相当）
 * WALL_HEIGHT: 壁の高さ（3.5 メートル相当）
 */
export const MAZE = {
  WIDTH: 10,          // 迷路の横幅（セル数）
  HEIGHT: 10,         // 迷路の縦幅（セル数）
  CELL_SIZE: 2.0,     // 1 セルのサイズ（メートル相当）
  WALL_HEIGHT: 3.5,   // 壁の高さ（メートル相当）
};

/**
 * PLAYER — プレイヤー（一人称視点）のパラメータ
 *
 * HEIGHT: カメラ（目線）の高さ（メートル相当）
 * COLLISION_RADIUS: 衝突判定の半径（メートル相当）。壁にこれ以上近づけない
 * SPEED: 通常歩行の移動速度（メートル/秒）
 * SPRINT_SPEED: ダッシュ時の移動速度（メートル/秒）
 * STAMINA_MAX: スタミナの最大値（パーセント、100 = フル）
 * STAMINA_DRAIN: ダッシュ中のスタミナ消費速度（ポイント/秒）
 * STAMINA_REGEN: 歩行・停止中のスタミナ回復速度（ポイント/秒）
 */
export const PLAYER = {
  HEIGHT: 1.6,            // プレイヤーの目の高さ（メートル相当）
  COLLISION_RADIUS: 0.35, // 衝突判定の半径（メートル相当）
  SPEED: 4.5,             // 通常移動速度（メートル/秒）
  SPRINT_SPEED: 7.5,      // ダッシュ速度（メートル/秒）
  STAMINA_MAX: 100,       // スタミナ最大値
  STAMINA_DRAIN: 25,      // スタミナ消費速度（/秒）
  STAMINA_REGEN: 15,      // スタミナ回復速度（/秒）
};

/**
 * ITEMS — 収集アイテムのパラメータ
 *
 * COUNT: ダンジョン内に配置されるアイテムの数
 * COLLECT_DISTANCE: アイテムを拾える距離（メートル相当）
 * SCORE_PER_ITEM: 1 個拾うごとに加算されるスコア
 */
export const ITEMS = {
  COUNT: 5,              // アイテムの総数
  COLLECT_DISTANCE: 2.5, // アイテム取得可能距離（メートル相当）
  SCORE_PER_ITEM: 10,    // 1 個あたりのスコア（ポイント）
};

/**
 * SCORING — スコア計算のパラメータ
 *
 * CLEAR_BONUS: ダンジョンクリア時のボーナススコア
 * TIME_BONUS_BASE: 時間ボーナスの基準秒数。
 *   この秒数以内にクリアするとボーナスが加算される（早いほど高得点）
 */
export const SCORING = {
  CLEAR_BONUS: 50,       // クリアボーナス（ポイント）
  TIME_BONUS_BASE: 300,  // 時間ボーナスの基準（秒）
};

/**
 * TORCH — たいまつ（照明）のパラメータ
 *
 * MAX_COUNT: ダンジョン内に配置するたいまつの最大本数
 * CORRIDOR_CHANCE: 直線通路にたいまつを配置する確率（0.0〜1.0）
 *   0.3 = 30% の確率で配置される
 */
export const TORCH = {
  MAX_COUNT: 30,         // たいまつの最大配置数
  CORRIDOR_CHANCE: 0.3,  // 通路へのたいまつ配置確率（30%）
};

/**
 * TRAP — 罠（スパイクトラップ）のパラメータ
 *
 * COUNT: ダンジョン内に配置する罠の数
 * DAMAGE_RADIUS: 罠の攻撃範囲（メートル相当）
 * DAMAGE_PER_HIT: 1 回の被弾でスタミナを減らす量
 * CYCLE_DURATION: 「隠→予兆→発動→隠」の 1 周期の長さ（秒）
 * ACTIVE_DURATION: 1 周期中で刃が出ている時間（秒）
 * HIT_COOLDOWN: 同じ罠から連続被弾する間隔の最小値（秒）。短すぎると即ゲームオーバー
 */
export const TRAP = {
  COUNT: 3,
  DAMAGE_RADIUS: 0.8,
  DAMAGE_PER_HIT: 30,
  CYCLE_DURATION: 2.2,
  ACTIVE_DURATION: 0.8,
  HIT_COOLDOWN: 1.2,
};

/**
 * ENEMY — 敵（単純な追跡型モンスター）のパラメータ
 *
 * COUNT: ダンジョン内に配置する敵の数
 * SPEED: 敵の移動速度（メートル/秒）。PLAYER.SPEED より少し遅めに
 * SIGHT_RANGE: 敵がプレイヤーを認識する視界距離（メートル相当）
 * ATTACK_RANGE: 攻撃が届く距離
 * DAMAGE_PER_HIT: 1 回の攻撃でスタミナを減らす量
 * HIT_COOLDOWN: 同じ敵から連続被弾する間隔（秒）
 */
export const ENEMY = {
  COUNT: 1,
  SPEED: 2.5,
  SIGHT_RANGE: 7.0,
  ATTACK_RANGE: 1.2,
  DAMAGE_PER_HIT: 20,
  HIT_COOLDOWN: 1.5,
};

// ============================================================
// 難易度プリセット
// ============================================================

/** 利用可能な難易度の ID 一覧（UI の選択順にもなる） */
export const DIFFICULTIES = ["easy", "normal", "hard"];

/** UI に表示するラベル */
export const DIFFICULTY_LABELS = {
  easy: "EASY",
  normal: "NORMAL",
  hard: "HARD",
};

/**
 * 難易度ごとの上書き値。未定義のキーは基本値（上記 export 群）が使われる。
 *
 * - EASY:   迷路が小さく、松明が多い。スタミナ多め。
 * - NORMAL: 標準（= 基本値）。変更なし。
 * - HARD:   迷路が大きく、アイテム数多め、松明少なめ。スタミナ減少早め。
 */
const DIFFICULTY_PRESETS = {
  easy: {
    MAZE: { WIDTH: 7, HEIGHT: 7 },
    ITEMS: { COUNT: 3 },
    TORCH: { MAX_COUNT: 30, CORRIDOR_CHANCE: 0.5 },
    PLAYER: { STAMINA_MAX: 130, STAMINA_REGEN: 20 },
    TRAP: { COUNT: 1, DAMAGE_PER_HIT: 15 },
    ENEMY: { COUNT: 0 },
  },
  normal: {},
  hard: {
    MAZE: { WIDTH: 13, HEIGHT: 13 },
    ITEMS: { COUNT: 7 },
    TORCH: { MAX_COUNT: 20, CORRIDOR_CHANCE: 0.15 },
    PLAYER: { STAMINA_MAX: 70, STAMINA_DRAIN: 35 },
    TRAP: { COUNT: 6, DAMAGE_PER_HIT: 40 },
    ENEMY: { COUNT: 2, SPEED: 3.0 },
  },
};

// 基本値（Normal 相当）の控え。applyDifficulty で戻すときに使う。
// 難易度切替で同じオブジェクトを書き換えるため、初期値を構造コピーで保持しておく。
const BASE_SNAPSHOT = {
  MAZE: { ...MAZE },
  ITEMS: { ...ITEMS },
  TORCH: { ...TORCH },
  PLAYER: { ...PLAYER },
  TRAP: { ...TRAP },
  ENEMY: { ...ENEMY },
};

/**
 * 既存の MAZE / ITEMS / TORCH / PLAYER オブジェクトの *中身* を、
 * 指定難易度の値で書き換える（参照は変えない）。
 *
 * オブジェクト参照を保つことで、既存の import 先は書き換えなくても
 * 最新の値を読める。React 側で useMemo の依存に入れる場合は、
 * 難易度が変わった事を別途シードやリセットで伝える必要がある。
 *
 * @param {"easy" | "normal" | "hard"} difficulty
 */
export function applyDifficulty(difficulty) {
  // まず基本値に戻す（前回の難易度の残留を消す）
  Object.assign(MAZE, BASE_SNAPSHOT.MAZE);
  Object.assign(ITEMS, BASE_SNAPSHOT.ITEMS);
  Object.assign(TORCH, BASE_SNAPSHOT.TORCH);
  Object.assign(PLAYER, BASE_SNAPSHOT.PLAYER);
  Object.assign(TRAP, BASE_SNAPSHOT.TRAP);
  Object.assign(ENEMY, BASE_SNAPSHOT.ENEMY);

  const preset = DIFFICULTY_PRESETS[difficulty];
  if (!preset) return;

  if (preset.MAZE) Object.assign(MAZE, preset.MAZE);
  if (preset.ITEMS) Object.assign(ITEMS, preset.ITEMS);
  if (preset.TORCH) Object.assign(TORCH, preset.TORCH);
  if (preset.PLAYER) Object.assign(PLAYER, preset.PLAYER);
  if (preset.TRAP) Object.assign(TRAP, preset.TRAP);
  if (preset.ENEMY) Object.assign(ENEMY, preset.ENEMY);
}

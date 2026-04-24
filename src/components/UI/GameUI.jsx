/**
 * GameUI.jsx - ゲームのHUD（ヘッドアップディスプレイ）
 *
 * 3Dシーンの上に重ねて表示されるHTML UIコンポーネント。
 * ゲームの各状態に応じて異なる画面を表示する:
 *
 * 1. スタート画面（未ロック時）: タイトル、操作説明、開始プロンプト
 * 2. プレイ中HUD（ロック中）: スコア、アイテム数、タイマー、スタミナバー、コンパス、照準
 * 3. クリア画面（ゲームクリア時）: 結果表示、スコア計算、再挑戦プロンプト
 *
 * 技術ポイント:
 * - pointerEvents: "none" で3Dシーンへのクリックを透過
 * - requestAnimationFrame でコンパスの回転をリアルタイム更新
 * - CSSインラインスタイルでレトロなUI演出
 */

import { useRef, useEffect, useState } from "react";
import { SCORING, PLAYER, DIFFICULTIES, DIFFICULTY_LABELS } from "../../data/config";
import * as Audio from "../../systems/Audio";

/**
 * Compass コンポーネント（内部コンポーネント）
 *
 * カメラのヨー角（水平回転角度）に応じて回転するコンパスUI。
 * N（北）/ S（南）/ E（東）/ W（西）の文字が表示され、
 * プレイヤーの向きに合わせてリアルタイムに回転する。
 *
 * requestAnimationFrame を使用してReactの再レンダリングなしに
 * CSSのtransformを直接操作することで、高パフォーマンスな回転を実現。
 *
 * @param {Object} cameraYawRef - カメラのヨー角（ラジアン）を保持するref
 */
function Compass({ cameraYawRef }) {
  // コンパスのDOM要素への参照（style.transform を直接操作するため）
  const ref = useRef();

  useEffect(() => {
    let raf;

    // 毎フレーム実行される更新関数
    const update = () => {
      if (ref.current && cameraYawRef.current !== undefined) {
        // ラジアンを度数法に変換（CSS の rotate() は度数法を使用）
        const deg = (cameraYawRef.current * 180) / Math.PI;
        // マイナスを付けることでカメラの回転と逆方向にコンパスを回転
        // → プレイヤーが右を向くと、コンパスのNが左に回る（実際のコンパスと同じ動き）
        ref.current.style.transform = `rotate(${-deg}deg)`;
      }
      // 次のフレームで再度 update を呼び出す
      raf = requestAnimationFrame(update);
    };

    // アニメーションループを開始
    raf = requestAnimationFrame(update);

    // クリーンアップ: コンポーネント破棄時にアニメーションを停止
    return () => cancelAnimationFrame(raf);
  }, [cameraYawRef]);

  return (
    // コンパスの外枠（右上に固定配置）
    <div
      style={{
        position: "absolute",
        top: "15px",
        right: "15px",
        width: "50px",
        height: "50px",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {/* 回転する内部要素（N/S/E/Wの文字を含む円）
          ref を付与して style.transform を直接操作する */}
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          border: "2px solid rgba(255,170,0,0.4)",
          borderRadius: "50%",
          background: "rgba(0,0,0,0.6)",
        }}
      >
        {/* 北（North）: 赤色で目立つように */}
        <div
          style={{
            position: "absolute",
            top: "4px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "11px",
            fontWeight: "bold",
            color: "#ff4444",
            lineHeight: 1,
          }}
        >
          N
        </div>
        {/* 南（South） */}
        <div
          style={{
            position: "absolute",
            bottom: "4px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "9px",
            color: "#888",
            lineHeight: 1,
          }}
        >
          S
        </div>
        {/* 東（East） */}
        <div
          style={{
            position: "absolute",
            right: "5px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "9px",
            color: "#888",
            lineHeight: 1,
          }}
        >
          E
        </div>
        {/* 西（West） */}
        <div
          style={{
            position: "absolute",
            left: "5px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "9px",
            color: "#888",
            lineHeight: 1,
          }}
        >
          W
        </div>
      </div>
    </div>
  );
}

/**
 * GameUI コンポーネント（メインUIコンポーネント）
 *
 * ゲームの全状態に対応するUI表示を行う。
 *
 * @param {number} score - 現在のスコア（アイテム1つ=10点）
 * @param {number} itemCount - 収集済みアイテム数
 * @param {number} totalItems - アイテム総数
 * @param {boolean} isLocked - ポインターロック状態（ゲームプレイ中かどうか）
 * @param {number} elapsedTime - 経過時間（秒）
 * @param {number} stamina - 現在のスタミナ（0～100）
 * @param {boolean} cleared - クリア状態
 * @param {Object} cameraYawRef - カメラのヨー角のref（コンパスに渡す）
 * @param {number | null} bestTime - localStorage 保存のベストタイム（秒）。未記録なら null
 * @param {number | null} bestScore - localStorage 保存のベストスコア。未記録なら null
 * @param {boolean} newBestTime - 今回のクリアで新ベストタイムになったか
 * @param {boolean} newBestScore - 今回のクリアで新ベストスコアになったか
 * @param {"easy" | "normal" | "hard"} difficulty - 現在選択中の難易度
 * @param {Function} onDifficultyChange - 難易度選択変更時のハンドラ
 */
export default function GameUI({
  score,
  itemCount,
  totalItems,
  isLocked,
  elapsedTime,
  stamina,
  cleared,
  cameraYawRef,
  bestTime = null,
  bestScore = null,
  newBestTime = false,
  newBestScore = false,
  difficulty = "normal",
  onDifficultyChange = () => {},
}) {
  // ===== 音量設定（Audio モジュールと同期） =====
  // Audio モジュールがソース・オブ・トゥルース。UI 表示用に state にミラー。
  const [sfxVolume, setSfxVolume] = useState(() => Audio.getSfxVolume());
  const [bgmVolume, setBgmVolume] = useState(() => Audio.getBgmVolume());
  const [muted, setMuted] = useState(() => Audio.isMuted());

  const onSfxChange = (e) => {
    const v = Number(e.target.value);
    setSfxVolume(v);
    Audio.setSfxVolume(v);
  };
  const onBgmChange = (e) => {
    const v = Number(e.target.value);
    setBgmVolume(v);
    Audio.setBgmVolume(v);
  };
  const onToggleMute = () => {
    const next = !muted;
    setMuted(next);
    Audio.setMuted(next);
  };
  /**
   * 時間を "MM:SS" 形式にフォーマットする関数
   * @param {number} s - 秒数
   * @returns {string} "MM:SS" 形式の文字列（例: "02:35"）
   */
  const formatTime = (s) => {
    const m = Math.floor(s / 60);          // 分を計算
    const sec = Math.floor(s % 60);        // 秒を計算（余り）
    // padStart(2, "0") で1桁の場合に先頭に0を付ける（例: 5 → "05"）
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // ===== スコア計算（config.js の SCORING を参照） =====
  // タイムボーナス: SCORING.TIME_BONUS_BASE 秒以内にクリアすると残り秒数がボーナスに（最低0点）
  const timeBonus = Math.max(0, SCORING.TIME_BONUS_BASE - Math.floor(elapsedTime));
  // 最終スコア: 基本スコア + （クリア時のみ）タイムボーナス + SCORING.CLEAR_BONUS
  const finalScore = score + (cleared ? timeBonus + SCORING.CLEAR_BONUS : 0);

  return (
    // UI全体のコンテナ。画面全体に広がり、3Dシーンの上に重なる。
    // pointerEvents: "none" でマウスクリックを透過（3Dシーンへの操作を妨げない）
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
      {/* ========== スタート画面 ==========
          未ロック（マウスカーソル未ロック）かつ未クリア時に表示。
          タイトル、操作説明、ゲーム開始プロンプトを含む。 */}
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
          {/* ゲームタイトル */}
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
          {/* サブタイトル */}
          <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#887755", letterSpacing: "6px" }}>
            PS1 EXPLORATION
          </p>

          {/* ===== 操作説明セクション ===== */}
          <div
            style={{
              margin: "20px 0",
              padding: "15px",
              background: "rgba(255,170,0,0.08)",
              borderRadius: "2px",
              border: "1px solid rgba(255,170,0,0.2)",
            }}
          >
            {/* 各操作キーの説明 */}
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

          {/* ===== 難易度選択 ===== */}
          <div style={{ margin: "15px 0 10px" }}>
            <div style={{ fontSize: "11px", color: "#887755", marginBottom: "6px", letterSpacing: "2px" }}>
              DIFFICULTY
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "6px",
                pointerEvents: "auto",
              }}
            >
              {DIFFICULTIES.map((d) => {
                const selected = d === difficulty;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onDifficultyChange(d)}
                    style={{
                      flex: "1 1 0",
                      padding: "6px 10px",
                      fontSize: "12px",
                      fontFamily: "'Courier New', monospace",
                      letterSpacing: "1px",
                      cursor: "pointer",
                      background: selected ? "rgba(255,170,0,0.25)" : "rgba(255,255,255,0.05)",
                      color: selected ? "#ffaa00" : "#bba880",
                      border: `1px solid ${selected ? "#ffaa00" : "rgba(255,170,0,0.2)"}`,
                      borderRadius: "2px",
                    }}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===== 音量設定 =====
              Audio モジュールに書き込み、値は localStorage に自動保存される */}
          <div style={{ margin: "10px 0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
                pointerEvents: "auto",
              }}
            >
              <span style={{ fontSize: "11px", color: "#887755", letterSpacing: "2px" }}>AUDIO</span>
              <button
                type="button"
                onClick={onToggleMute}
                style={{
                  padding: "3px 8px",
                  fontSize: "10px",
                  fontFamily: "'Courier New', monospace",
                  cursor: "pointer",
                  background: muted ? "rgba(255,68,68,0.2)" : "rgba(255,255,255,0.05)",
                  color: muted ? "#ff4444" : "#bba880",
                  border: `1px solid ${muted ? "#ff4444" : "rgba(255,170,0,0.2)"}`,
                  borderRadius: "2px",
                }}
              >
                {muted ? "MUTED" : "MUTE"}
              </button>
            </div>
            <div style={volumeRowStyle}>
              <span style={volumeLabelStyle}>SFX</span>
              <input
                type="range" min="0" max="1" step="0.05" value={sfxVolume}
                onChange={onSfxChange}
                style={volumeInputStyle}
              />
            </div>
            <div style={volumeRowStyle}>
              <span style={volumeLabelStyle}>BGM</span>
              <input
                type="range" min="0" max="1" step="0.05" value={bgmVolume}
                onChange={onBgmChange}
                style={volumeInputStyle}
              />
            </div>
          </div>

          {/* ミッション説明 */}
          <p style={{ margin: "15px 0 5px", fontSize: "13px", color: "#ffaa00" }}>
            ダンジョン内のアイテムを全て集め
          </p>
          <p style={{ margin: "0 0 15px", fontSize: "13px", color: "#ffaa00" }}>
            出口を見つけて脱出せよ
          </p>

          {/* ===== ベスト記録（ベストが存在する時のみ表示） =====
              localStorage から読み取った過去最高記録をスタート画面に表示する */}
          {(bestTime !== null || bestScore !== null) && (
            <div
              style={{
                margin: "20px 0 10px",
                padding: "10px 12px",
                background: "rgba(68,170,255,0.08)",
                border: "1px solid rgba(68,170,255,0.25)",
                borderRadius: "2px",
                fontSize: "12px",
                color: "#88bbff",
                letterSpacing: "1px",
              }}
            >
              <div style={{ color: "#44aaff", marginBottom: "4px", fontSize: "11px" }}>BEST RECORD</div>
              {bestTime !== null && (
                <div>
                  TIME <span style={{ color: "#fff", marginLeft: "10px" }}>{formatTime(bestTime)}</span>
                </div>
              )}
              {bestScore !== null && (
                <div>
                  SCORE <span style={{ color: "#fff", marginLeft: "10px" }}>{bestScore}</span>
                </div>
              )}
            </div>
          )}

          {/* ゲーム開始プロンプト */}
          <p style={{ margin: "10px 0 0", fontSize: "16px", color: "#fff", opacity: 0.7, letterSpacing: "2px" }}>
            ▶ クリックして開始
          </p>
        </div>
      )}

      {/* ========== プレイ中HUD ==========
          ポインターロック中かつ未クリア時に表示。
          スコア、アイテム数、タイマー、スタミナバー、コンパス、照準を含む。 */}
      {isLocked && !cleared && (
        <>
          {/* ===== スコア・アイテム・タイマー表示（左上） ===== */}
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
            {/* スコア表示 */}
            <div style={{ color: "#ffaa00", fontWeight: "bold", fontSize: "13px" }}>
              SCORE <span style={{ color: "#fff", marginLeft: "8px" }}>{score}</span>
            </div>
            {/* アイテム数: 全部集めると緑色に変化 */}
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              <span style={{ color: "#888" }}>ITEMS</span>{" "}
              <span style={{ color: itemCount === totalItems ? "#00ff88" : "#ffcc00" }}>
                {itemCount}/{totalItems}
              </span>
            </div>
            {/* 経過時間: formatTime で "MM:SS" 形式に変換して表示 */}
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              <span style={{ color: "#888" }}>TIME</span>{" "}
              <span style={{ color: "#ccc" }}>{formatTime(elapsedTime)}</span>
            </div>
          </div>

          {/* ===== コンパス（右上）===== */}
          <Compass cameraYawRef={cameraYawRef} />

          {/* ===== スタミナバー（左下） =====
              ダッシュ（Shift）で消費、停止時に回復するスタミナをバーで表示。
              残量に応じて色が変化: 青(31%以上) → 黄(11-30%) → 赤(10%以下) */}
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "20px",
              width: "120px",
            }}
          >
            <div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>STAMINA</div>
            {/* バーの外枠 */}
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
              {/* バーの中身（現在値を STAMINA_MAX に対する百分率で動的に変化） */}
              <div
                style={{
                  width: `${(stamina / PLAYER.STAMINA_MAX) * 100}%`,
                  height: "100%",
                  // 三項演算子でスタミナ量に応じて色を分岐（STAMINA_MAX の 30% / 10% 閾値）
                  background:
                    stamina > PLAYER.STAMINA_MAX * 0.3
                      ? "#44aaff"
                      : stamina > PLAYER.STAMINA_MAX * 0.1
                      ? "#ffaa00"
                      : "#ff4444",
                  transition: "width 0.1s",
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>

          {/* ===== 出口誘導メッセージ =====
              全アイテム収集後に表示される。CSSアニメーション(pulse)で点滅する。 */}
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

          {/* ===== 照準（クロスヘア）=====
              画面中央に十字の照準を表示。FPSゲームの標準的なUI要素。
              上下左右の4本の線と中央のドットで構成される。 */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          >
            {/* 上の線 */}
            <div style={{ position: "absolute", top: "-8px", left: "-1px", width: "2px", height: "6px", background: "rgba(255,255,255,0.6)", boxShadow: "0 0 2px rgba(0,0,0,0.8)" }} />
            {/* 下の線 */}
            <div style={{ position: "absolute", bottom: "-8px", left: "-1px", width: "2px", height: "6px", background: "rgba(255,255,255,0.6)", boxShadow: "0 0 2px rgba(0,0,0,0.8)" }} />
            {/* 左の線 */}
            <div style={{ position: "absolute", left: "-8px", top: "-1px", width: "6px", height: "2px", background: "rgba(255,255,255,0.6)", boxShadow: "0 0 2px rgba(0,0,0,0.8)" }} />
            {/* 右の線 */}
            <div style={{ position: "absolute", right: "-8px", top: "-1px", width: "6px", height: "2px", background: "rgba(255,255,255,0.6)", boxShadow: "0 0 2px rgba(0,0,0,0.8)" }} />
            {/* 中央のドット */}
            <div style={{ width: "2px", height: "2px", background: "rgba(255,255,255,0.4)", borderRadius: "50%" }} />
          </div>
        </>
      )}

      {/* ========== クリア画面 ==========
          ゲームクリア時に表示。結果とスコア内訳を表示する。 */}
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
          {/* クリアタイトル */}
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

          {/* ===== スコア内訳 ===== */}
          <div style={{ margin: "20px 0", fontSize: "14px", lineHeight: "2", color: "#aaa" }}>
            {/* クリアタイム */}
            <div>
              TIME <span style={{ color: "#fff", marginLeft: "10px" }}>{formatTime(elapsedTime)}</span>
            </div>
            {/* 収集アイテム数 */}
            <div>
              ITEMS{" "}
              <span style={{ color: "#ffcc00", marginLeft: "10px" }}>
                {itemCount}/{totalItems}
              </span>
            </div>
            {/* タイムボーナス: SCORING.TIME_BONUS_BASE 秒からの残り秒数 */}
            <div>
              TIME BONUS <span style={{ color: "#44aaff", marginLeft: "10px" }}>{timeBonus}</span>
            </div>
            {/* クリアボーナス: SCORING.CLEAR_BONUS 点 */}
            <div>
              CLEAR BONUS <span style={{ color: "#44aaff", marginLeft: "10px" }}>{SCORING.CLEAR_BONUS}</span>
            </div>
          </div>

          {/* 最終スコア合計 */}
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

          {/* ===== 新記録演出 =====
              localStorage の記録が更新された場合のみ表示 */}
          {(newBestTime || newBestScore) && (
            <div
              style={{
                margin: "15px 0 5px",
                padding: "8px",
                color: "#ffee44",
                fontSize: "15px",
                letterSpacing: "3px",
                textShadow: "0 0 10px rgba(255,238,68,0.6)",
                animation: "none",
              }}
            >
              ★ NEW {newBestTime && newBestScore
                ? "BEST TIME & SCORE"
                : newBestTime
                ? "BEST TIME"
                : "BEST SCORE"} ★
            </div>
          )}

          {/* ===== ベスト記録の表示 ===== */}
          {(bestTime !== null || bestScore !== null) && (
            <div
              style={{
                margin: "10px 0",
                fontSize: "12px",
                color: "#88bbff",
                letterSpacing: "1px",
              }}
            >
              {bestTime !== null && (
                <span style={{ marginRight: "15px" }}>
                  BEST TIME <span style={{ color: "#fff", marginLeft: "6px" }}>{formatTime(bestTime)}</span>
                </span>
              )}
              {bestScore !== null && (
                <span>
                  BEST SCORE <span style={{ color: "#fff", marginLeft: "6px" }}>{bestScore}</span>
                </span>
              )}
            </div>
          )}

          {/* 再挑戦プロンプト（クリックするとhandleLock → handleRestart が実行される） */}
          <p style={{ margin: "20px 0 0", fontSize: "13px", color: "#666", letterSpacing: "1px" }}>
            クリックして再挑戦
          </p>
        </div>
      )}
    </div>
  );
}

// ===== 操作説明用の共通スタイルオブジェクト =====
// コンポーネント外に定義することで、レンダリング毎にオブジェクトが再生成されるのを防ぐ

/** 操作説明の各行のスタイル */
const controlStyle = {
  margin: "6px 0",
  fontSize: "12px",
  color: "#bba880",
};

/** キー名（W/A/S/D等）のスタイル。右寄せで統一された幅に */
const keyStyle = {
  display: "inline-block",
  minWidth: "70px",
  color: "#ffcc88",
  fontWeight: "bold",
  textAlign: "right",
  marginRight: "10px",
};

/** 音量スライダ 1 行のレイアウト */
const volumeRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  margin: "4px 0",
  pointerEvents: "auto",
};

/** 音量スライダの左側ラベル */
const volumeLabelStyle = {
  minWidth: "36px",
  fontSize: "11px",
  color: "#bba880",
  letterSpacing: "1px",
};

/** 音量スライダ入力の基本スタイル */
const volumeInputStyle = {
  flex: "1 1 0",
  accentColor: "#ffaa00",
  cursor: "pointer",
};

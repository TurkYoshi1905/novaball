import { useRef, useState, useCallback } from "react";
import { useGamePhysics } from "../hooks/useGamePhysics";
import MobileControls from "./MobileControls";
import type { Score, MobileInput } from "../types/game";
import { RANKED_DURATION_MS, createMobileInput } from "../types/game";

interface Props {
  username:     string;
  ranked?:      boolean;
  onBackToMenu: () => void;
  onMatchEnd?:  (playerGoals: number, aiGoals: number) => void;
}

const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

function formatTime(ms: number, countdown = false, limit = 0): string {
  const val   = countdown ? Math.max(0, limit - ms) : ms;
  const total = Math.floor(val / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function GameBoard({ username, ranked = false, onBackToMenu, onMatchEnd }: Props) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const mobileInputRef = useRef<MobileInput>(createMobileInput());

  const [score, setScore]         = useState<Score>({ red: 0, blue: 0 });
  const [gameTime, setGameTime]   = useState(0);
  const [goalFlash, setGoalFlash] = useState<"red"|"blue"|null>(null);

  const handleGoal = useCallback((team: "red"|"blue") => {
    setGoalFlash(team);
    setTimeout(() => setGoalFlash(null), 2600);
  }, []);

  const { resetGame } = useGamePhysics({
    username,
    canvasRef,
    onScoreChange: setScore,
    onGoal: handleGoal,
    onTimeChange: setGameTime,
    onMatchEnd,
    timeLimit: ranked ? RANKED_DURATION_MS : undefined,
    mobileInputRef,
    active: true,
  });

  const remaining = ranked ? Math.max(0, RANKED_DURATION_MS - gameTime) : 0;
  const urgent    = ranked && remaining < 15000;

  return (
    <div className="game-board-outer">
      {/* Portrait uyarısı (sadece mobil portait) */}
      <div className="portrait-overlay">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <span className="text-5xl">📱</span>
          <p className="text-white font-bold text-xl">Telefonu yatay tut</p>
          <p className="text-white/40 text-sm">NovaBall yatay ekranda daha iyi oynanır.</p>
        </div>
      </div>

      {/* ── Kompakt HUD ── */}
      <div className="game-hud">
        {/* Sol: Oyuncu */}
        <div className="hud-side hud-left">
          <div className="hud-dot hud-dot-red" />
          <span className="hud-username">{username}</span>
          {ranked && (
            <span className="hud-badge-ranked">Rekabet</span>
          )}
        </div>

        {/* Orta: Skor + Süre */}
        <div className="hud-center">
          <span className={`hud-score ${goalFlash === "red" ? "hud-score-flash-red" : "hud-score-red"}`}>
            {score.red}
          </span>
          <span className="hud-score-sep">—</span>
          <span className={`hud-score ${goalFlash === "blue" ? "hud-score-flash-blue" : "hud-score-blue"}`}>
            {score.blue}
          </span>
          <div className="hud-divider" />
          {ranked ? (
            <span className={`hud-time ${urgent ? "hud-time-urgent" : ""}`}>
              {formatTime(gameTime, true, RANKED_DURATION_MS)}
            </span>
          ) : (
            <span className="hud-time">{formatTime(gameTime)}</span>
          )}
        </div>

        {/* Sağ: AI + menu (masa üstü) */}
        <div className="hud-side hud-right">
          <div className="hud-desktop-btns">
            {!ranked && (
              <button onClick={resetGame} className="hud-ctrl-btn" title="Yeniden Başla">↺</button>
            )}
            <button onClick={onBackToMenu} className="hud-ctrl-btn" title="Ana Menü">☰</button>
          </div>
          <span className="hud-username hud-ai">AI</span>
          <div className="hud-dot hud-dot-blue" />
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="game-canvas-zone">
        <div className="game-canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={1200}
            height={675}
            className="game-canvas"
          />
          {goalFlash && (
            <div
              className="goal-flash-overlay"
              style={{
                background: goalFlash === "red"
                  ? "radial-gradient(ellipse at center,rgba(230,53,53,.15) 0%,transparent 70%)"
                  : "radial-gradient(ellipse at center,rgba(34,102,238,.15) 0%,transparent 70%)",
              }}
            />
          )}
        </div>
      </div>

      {/* ── Masaüstü kontrol ipuçları ── */}
      {!isTouchDevice && (
        <div className="keyboard-hints">
          <span><kbd className="kbd-key">W A S D</kbd> Hareket</span>
          <span><kbd className="kbd-key">SPACE/X</kbd> Şut</span>
          <span><kbd className="kbd-key">Sol ⇧</kbd> Depar</span>
        </div>
      )}

      {/* ── Mobil Kontroller ── */}
      {isTouchDevice && (
        <MobileControls
          inputRef={mobileInputRef}
          ranked={ranked}
          onMenu={onBackToMenu}
          onReset={!ranked ? resetGame : undefined}
        />
      )}
    </div>
  );
}

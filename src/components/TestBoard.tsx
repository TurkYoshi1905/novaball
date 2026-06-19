import { useRef, useState, useCallback } from "react";
import { useGamePhysics } from "../hooks/useGamePhysics";
import MobileControls from "./MobileControls";
import type { Score, MobileInput } from "../types/game";
import { createMobileInput } from "../types/game";
import { motion } from "framer-motion";
import { UserPlus, LogIn } from "lucide-react";

interface Props {
  onLogin:    () => void;
  onRegister: () => void;
  onBack:     () => void;
}

const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function TestBoard({ onLogin, onRegister, onBack }: Props) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const mobileInputRef = useRef<MobileInput>(createMobileInput());

  const [score, setScore]         = useState<Score>({ red: 0, blue: 0 });
  const [gameTime, setGameTime]   = useState(0);
  const [goalFlash, setGoalFlash] = useState<"red" | "blue" | null>(null);

  const handleGoal = useCallback((team: "red" | "blue") => {
    setGoalFlash(team);
    setTimeout(() => setGoalFlash(null), 2600);
  }, []);

  const { resetGame } = useGamePhysics({
    username:    "Misafir",
    displayName: "Misafir",
    canvasRef,
    onScoreChange: setScore,
    onGoal:        handleGoal,
    onTimeChange:  setGameTime,
    mobileInputRef,
    active: true,
  });

  return (
    <div className="game-board-outer">

      {/* Portrait uyarısı */}
      <div className="portrait-overlay">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <span className="text-5xl">📱</span>
          <p className="text-white font-bold text-xl">Telefonu yatay tut</p>
          <p className="text-white/40 text-sm">NovaBall yatay ekranda daha iyi oynanır.</p>
        </div>
      </div>

      {/* ── Üst Kayıt Banneri ── */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between px-4 py-2.5 pointer-events-auto"
          style={{
            background: "linear-gradient(90deg,rgba(7,13,22,0.97),rgba(10,18,35,0.97))",
            borderBottom: "1px solid rgba(68,170,255,0.15)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse flex-shrink-0" />
            <span className="text-white/70 text-xs font-semibold">
              Misafir modu — kayıt olmadan oynuyorsun
            </span>
            <span className="hidden sm:inline text-white/35 text-xs">
              · İstatistik ve sıralama kaydedilmiyor
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                color: "rgba(255,255,255,0.75)",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <LogIn size={11} />
              Giriş Yap
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(68,170,255,0.35)" }}
              whileTap={{ scale: 0.97 }}
              onClick={onRegister}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white transition-all"
              style={{
                background: "linear-gradient(135deg,#1a5f8a,#4af)",
                border: "1px solid rgba(68,170,255,0.4)",
              }}
            >
              <UserPlus size={11} />
              Kayıt Ol
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ── HUD ── */}
      <div className="game-hud" style={{ paddingTop: "2.8rem" }}>
        <div className="hud-side hud-left">
          <div className="hud-dot hud-dot-red" />
          <span className="hud-username">Misafir</span>
        </div>
        <div className="hud-center">
          <span className={`hud-score ${goalFlash === "red" ? "hud-score-flash-red" : "hud-score-red"}`}>
            {score.red}
          </span>
          <span className="hud-score-sep">—</span>
          <span className={`hud-score ${goalFlash === "blue" ? "hud-score-flash-blue" : "hud-score-blue"}`}>
            {score.blue}
          </span>
          <div className="hud-divider" />
          <span className="hud-time">{formatTime(gameTime)}</span>
        </div>
        <div className="hud-side hud-right">
          <div className="hud-desktop-btns">
            <button onClick={resetGame} className="hud-ctrl-btn" title="Yeniden Başla">↺</button>
            <button onClick={onBack}    className="hud-ctrl-btn" title="Geri">☰</button>
          </div>
          <span className="hud-username hud-ai">AI</span>
          <div className="hud-dot hud-dot-blue" />
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="game-canvas-zone" style={{ paddingTop: "2.8rem" }}>
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

      {/* ── Klavye ipuçları ── */}
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
          onMenu={onBack}
          onReset={resetGame}
        />
      )}
    </div>
  );
}

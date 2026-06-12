import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MatchSession } from "../types/game";

interface Props {
  match: MatchSession;
  localUsername: string;
  isRanked?: boolean;
  onMatchStart: () => void;
}

export default function MatchIntroPage({ match, localUsername, isRanked = false, onMatchStart }: Props) {
  const [countdown, setCountdown] = useState(5);
  const [phase, setPhase] = useState<"vs" | "countdown" | "go">("vs");

  useEffect(() => {
    const vsTimer = setTimeout(() => setPhase("countdown"), 1500);
    return () => clearTimeout(vsTimer);
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("go"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "go") return;
    const t = setTimeout(() => onMatchStart(), 900);
    return () => clearTimeout(t);
  }, [phase, onMatchStart]);

  const myTeam    = match.redTeam.some(m => m.username === localUsername) ? "red" : "blue";
  const redNames  = match.redTeam.map(m => m.displayName);
  const blueNames = match.blueTeam.map(m => m.displayName);

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <AnimatePresence mode="wait">
        {(phase === "vs" || phase === "countdown") && (
          <motion.div
            key="vs-panel"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-lg"
          >
            {/* Mod etiketi */}
            <div className="text-white/30 text-xs uppercase tracking-widest font-semibold">
              {match.mode} • {isRanked ? "Rekabetçi" : "Özel Maç"}
            </div>

            {/* Takımlar */}
            <div className="flex items-center justify-between w-full gap-4">
              {/* Kırmızı takım */}
              <motion.div
                initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-3 flex-1"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e63535] to-[#a01010] flex items-center justify-center shadow-[0_0_32px_#e6353560]">
                  <span className="text-white font-black text-2xl">🔴</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {redNames.map((n, i) => (
                    <span
                      key={i}
                      className={`text-sm font-bold truncate max-w-[110px] text-center ${
                        match.redTeam[i]?.username === localUsername ? "text-white" : "text-white/60"
                      }`}
                    >{n}</span>
                  ))}
                </div>
                <div className="text-[#e63535] text-xs font-semibold uppercase tracking-wider">Kırmızı</div>
              </motion.div>

              {/* VS */}
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                className="flex-shrink-0"
              >
                <span className="text-white/80 font-black text-4xl tracking-tight">VS</span>
              </motion.div>

              {/* Mavi takım */}
              <motion.div
                initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-3 flex-1"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4488ff] to-[#1144cc] flex items-center justify-center shadow-[0_0_32px_#4488ff60]">
                  <span className="text-white font-black text-2xl">🔵</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {blueNames.map((n, i) => (
                    <span
                      key={i}
                      className={`text-sm font-bold truncate max-w-[110px] text-center ${
                        match.blueTeam[i]?.username === localUsername ? "text-white" : "text-white/60"
                      }`}
                    >{n}</span>
                  ))}
                </div>
                <div className="text-[#4488ff] text-xs font-semibold uppercase tracking-wider">Mavi</div>
              </motion.div>
            </div>

            {/* Geri sayım */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col items-center gap-3"
            >
              {phase === "countdown" && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-white font-black text-6xl tabular-nums" style={{
                      textShadow: "0 0 30px #44aaff80",
                    }}>{countdown}</span>
                    <span className="text-white/40 text-sm">Maçın Başlamasına Son {countdown} Saniye!</span>
                  </motion.div>
                </AnimatePresence>
              )}
              {phase === "vs" && (
                <div className="h-[84px] flex items-center">
                  <span className="text-white/25 text-sm">Hazırlanıyor…</span>
                </div>
              )}

              {/* İlerleme çubuğu */}
              {phase === "countdown" && (
                <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#4af]"
                    animate={{ width: `${((5 - countdown) / 5) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </motion.div>

            {/* Takım bilgisi */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
              className="text-xs text-white/25 text-center"
            >
              Sen <span className="font-bold" style={{ color: myTeam === "red" ? "#e63535" : "#4488ff" }}>
                {myTeam === "red" ? "Kırmızı" : "Mavi"} Takım
              </span>'dasın
            </motion.div>
          </motion.div>
        )}

        {phase === "go" && (
          <motion.div
            key="go"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 12 }}
            className="relative z-10"
          >
            <span className="text-white font-black text-8xl tracking-tight"
              style={{ textShadow: "0 0 60px #4af, 0 0 120px #4af60" }}>
              BAŞLA!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

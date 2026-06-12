import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";
import type { MPResult } from "../types/game";
import { getRankForRP } from "../utils/rankSystem";

interface Props {
  result: MPResult;
  onMenu: () => void;
  onPlayAgain?: () => void;
}

export default function MultiplayerResult({ result, onMenu, onPlayAgain }: Props) {
  const { winnerTeam, redGoals, blueGoals, myTeam, rpGained, prevRP, newRP, playerStats, mode, isRanked } = result;
  const didWin  = winnerTeam === myTeam;
  const isDraw  = winnerTeam === "draw";
  const myRank  = getRankForRP(newRP);
  const prevRank = getRankForRP(prevRP);
  const rankUp  = myRank.fullName !== prevRank.fullName && newRP > prevRP;

  const teamColor = myTeam === "red" ? "#e63535" : "#4488ff";

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden px-5">
      <div className="pitch-glow" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm flex flex-col gap-5 py-6"
      >
        {/* Sonuç başlığı */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 250, delay: 0.1 }}
            className="text-5xl"
          >
            {isDraw ? "🤝" : didWin ? "🏆" : "💪"}
          </motion.div>
          <h2 className="text-white font-black text-3xl tracking-tight">
            {isDraw ? "Beraberlik" : didWin ? "Kazandın!" : "Kaybettin"}
          </h2>
          <span className="text-white/35 text-xs uppercase tracking-widest">{mode} • {isRanked ? "Rekabetçi" : "Özel Maç"}</span>
        </div>

        {/* Skor kartı */}
        <div className="flex items-center justify-center gap-6 px-6 py-4 rounded-2xl border border-white/10 bg-white/4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl font-black text-[#e63535]">{redGoals}</span>
            <span className="text-xs text-[#e63535]/70 font-semibold">Kırmızı</span>
          </div>
          <span className="text-white/20 text-2xl font-black">—</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl font-black text-[#4488ff]">{blueGoals}</span>
            <span className="text-xs text-[#4488ff]/70 font-semibold">Mavi</span>
          </div>
        </div>

        {/* RP (sadece ranked) */}
        {isRanked && (
          <div className="flex flex-col gap-3 px-4 py-4 rounded-2xl border border-white/10 bg-white/3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-[#4ade80]" />
                <span className="text-white/60 text-sm font-semibold">Rank Puanı</span>
              </div>
              <span className="text-[#4ade80] font-black text-sm">
                {rpGained > 0 ? `+${rpGained} RP` : "+0 RP"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40">{prevRP} RP</span>
              <span className="text-white/20">→</span>
              <span className="text-white font-bold">{newRP} RP</span>
            </div>
            {rankUp && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `${myRank.tier.color}15`, border: `1px solid ${myRank.tier.color}30` }}
              >
                <Trophy size={14} style={{ color: myRank.tier.color }} />
                <span className="text-xs font-bold" style={{ color: myRank.tier.color }}>
                  {myRank.tier.icon} {myRank.fullName} Rankına Yükseldin!
                </span>
              </motion.div>
            )}
          </div>
        )}

        {/* Oyuncu istatistikleri */}
        {playerStats.length > 1 && (
          <div className="flex flex-col gap-2">
            <span className="text-white/30 text-xs uppercase tracking-wider font-semibold">Performans</span>
            <div className="flex flex-col gap-1.5">
              {[...playerStats].sort((a, b) => b.goals - a.goals).map(p => (
                <div key={p.username} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/4 border border-white/8">
                  <span className="text-white/60 text-xs font-semibold truncate flex-1">{p.displayName}</span>
                  <span className="text-white/50 text-xs">{p.goals} gol</span>
                  {isRanked && p.rpGained > 0 && (
                    <span className="text-[#4ade80] text-xs font-bold">+{p.rpGained} RP</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex flex-col gap-2.5">
          {onPlayAgain && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={onPlayAgain}
              className="w-full py-4 rounded-2xl font-black text-base text-white"
              style={{ background: `linear-gradient(135deg, ${teamColor}88, ${teamColor})` }}
            >
              ⚽ Tekrar Oyna
            </motion.button>
          )}
          <button
            onClick={onMenu}
            className="w-full py-3.5 rounded-2xl border border-white/12 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 font-bold text-sm transition-all"
          >
            Ana Menüye Dön
          </button>
        </div>
      </motion.div>
    </div>
  );
}

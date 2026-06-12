import { motion } from "framer-motion";
import { ArrowLeft, Users } from "lucide-react";
import type { GameMode } from "../types/game";
import { MODE_TEAM_SIZE } from "../types/game";

interface Props {
  onSelectMode: (mode: GameMode) => void;
  onBack: () => void;
}

const MODES: { mode: GameMode; emoji: string; desc: string; color: string }[] = [
  { mode: "1v1", emoji: "🥊", desc: "Birebir karşılaşma",     color: "#4af" },
  { mode: "2v2", emoji: "👥", desc: "Çift kişilik takımlar",  color: "#4ade80" },
  { mode: "3v3", emoji: "⚽", desc: "Üçlü takım savaşı",     color: "#a78bfa" },
  { mode: "4v4", emoji: "🏆", desc: "Dörtlü takım mücadelesi",color: "#fb923c" },
  { mode: "5v5", emoji: "🔥", desc: "Tam kadrolu 5'e 5",      color: "#f43f5e" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden:   { opacity: 0, y: 20 },
  visible:  { opacity: 1, y: 0 },
};

export default function ModSelectPage({ onSelectMode, onBack }: Props) {
  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden px-5">
      <div className="pitch-glow" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6 py-8">
        {/* Başlık */}
        <div className="flex flex-col items-center gap-2">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <h1 className="text-white font-black text-4xl tracking-tight text-center">
              Maça <span className="text-[#4af]">Gir</span>
            </h1>
          </motion.div>
          <p className="text-white/40 text-sm text-center">Oyun modunu seç ve sıra bekle</p>
        </div>

        {/* Mod Kartları */}
        <motion.div
          className="flex flex-col gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {MODES.map(({ mode, emoji, desc, color }) => {
            const teamSize  = MODE_TEAM_SIZE[mode];
            const total     = teamSize * 2;
            return (
              <motion.button
                key={mode}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectMode(mode)}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl border transition-all text-left"
                style={{
                  background: `${color}0d`,
                  borderColor: `${color}30`,
                }}
              >
                <span className="text-3xl flex-shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-white text-xl">{mode}</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${color}20`, color }}
                    >
                      {total} oyuncu
                    </span>
                  </div>
                  <p className="text-white/40 text-xs">{desc}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" style={{ color }}>
                  <Users size={14} />
                  <span className="text-xs font-bold">{teamSize}v{teamSize}</span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Geri */}
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.4 } }}
          onClick={onBack}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-white/10 bg-white/3 hover:bg-white/7 transition-all text-white/50 hover:text-white/80 font-semibold text-sm"
        >
          <ArrowLeft size={15} />
          Ana Menüye Dön
        </motion.button>
      </div>
    </div>
  );
}

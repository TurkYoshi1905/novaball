import type { MatchResultData } from "../types/game";
import { getRankForRP, getRPProgressInRank, ALL_RANKS } from "../utils/rankSystem";

interface Props {
  result: MatchResultData;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export default function MatchResult({ result, onPlayAgain, onMenu }: Props) {
  const { won, drew, rpGained, prevRP, newRP, rankChanged, prevRankName, newRankName, playerGoals, aiGoals } = result;
  const rank = getRankForRP(newRP);
  const progress = getRPProgressInRank(newRP);
  const nextRankIdx = ALL_RANKS.indexOf(rank);
  const nextRank = nextRankIdx < ALL_RANKS.length - 1 ? ALL_RANKS[nextRankIdx + 1] : null;

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-screen bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-lg animate-fade-in">

        {/* Sonuç başlığı */}
        <div className="flex flex-col items-center gap-2">
          {won && (
            <>
              <div className="text-5xl">🏆</div>
              <h2 className="text-white font-black text-4xl tracking-tight">Zafer!</h2>
              <p className="text-white/40 text-sm">Rakibini geçmeyi başardın.</p>
            </>
          )}
          {drew && (
            <>
              <div className="text-5xl">🤝</div>
              <h2 className="text-white font-black text-4xl tracking-tight">Beraberlik</h2>
              <p className="text-white/40 text-sm">Her iki taraf eşit skorda bitti.</p>
            </>
          )}
          {!won && !drew && (
            <>
              <div className="text-5xl">😔</div>
              <h2 className="text-white font-black text-4xl tracking-tight">Yenilgi</h2>
              <p className="text-white/40 text-sm">Bir dahaki sefere daha iyi olacaksın.</p>
            </>
          )}
        </div>

        {/* Skor */}
        <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-2xl px-8 py-5 w-full justify-center">
          <div className="flex flex-col items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-[#e63535] shadow-[0_0_8px_#e63535]" />
            <span className="text-[#ff4444] font-black text-5xl tabular-nums">{playerGoals}</span>
            <span className="text-white/40 text-xs uppercase tracking-widest">Sen</span>
          </div>
          <span className="text-white/20 font-light text-3xl">—</span>
          <div className="flex flex-col items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-[#4488ff] shadow-[0_0_8px_#4488ff]" />
            <span className="text-[#4488ff] font-black text-5xl tabular-nums">{aiGoals}</span>
            <span className="text-white/40 text-xs uppercase tracking-widest">AI</span>
          </div>
        </div>

        {/* RP Kazanımı */}
        <div className={`w-full rounded-2xl border px-6 py-5 flex flex-col gap-3 ${rpGained > 0 ? "border-[#4af]/30 bg-[#4af]/5" : "border-white/10 bg-white/4"}`}>
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm uppercase tracking-widest font-semibold">Rank Puanı</span>
            {rpGained > 0
              ? <span className="text-[#4af] font-black text-xl">+{rpGained} RP</span>
              : <span className="text-white/30 font-semibold text-lg">+0 RP</span>
            }
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span style={{ color: rank.tier.color }} className="font-bold text-sm">{rank.fullName}</span>
              </div>
              <span className="text-white/30 text-xs">{newRP} RP</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress.percent * 100}%`,
                  background: `linear-gradient(90deg, ${rank.tier.color}99, ${rank.tier.color})`,
                  boxShadow: `0 0 8px ${rank.tier.glowColor}`,
                }}
              />
            </div>
            {nextRank && (
              <div className="flex justify-between mt-1">
                <span className="text-white/20 text-xs">{progress.current} / {progress.total} RP</span>
                <span className="text-white/20 text-xs">→ {nextRank.fullName}</span>
              </div>
            )}
          </div>

          {rankChanged && (
            <div className="flex items-center gap-2 pt-1 border-t border-white/10">
              <span className="text-yellow-400 text-sm">✨</span>
              <span className="text-yellow-400 font-bold text-sm">
                Rütbe Yükselişi: {prevRankName} → {newRankName}
              </span>
            </div>
          )}

          {prevRP !== newRP && !rankChanged && (
            <p className="text-white/30 text-xs">
              Önceki RP: {prevRP} → Yeni RP: {newRP}
            </p>
          )}
        </div>

        {/* Butonlar */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onPlayAgain}
            className="novaball-btn-primary flex-1 py-4 rounded-2xl text-white font-bold text-base tracking-wide active:scale-[0.98]"
          >
            Tekrar Oyna
          </button>
          <button
            onClick={onMenu}
            className="novaball-btn-secondary flex-1 py-4 rounded-2xl text-white/70 font-bold text-base tracking-wide active:scale-[0.98]"
          >
            Ana Menü
          </button>
        </div>
      </div>
    </div>
  );
}

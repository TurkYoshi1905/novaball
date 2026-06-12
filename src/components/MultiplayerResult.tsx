import { motion } from "framer-motion";
import { Trophy, TrendingUp, Zap } from "lucide-react";
import type { MPResult, Team } from "../types/game";
import { getRankForRP } from "../utils/rankSystem";

interface Props {
  result: MPResult;
  onMenu: () => void;
  onPlayAgain?: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉", "4.", "5."];
const TEAM_COLOR: Record<Team, string> = { red: "#e63535", blue: "#4488ff" };
const TEAM_LABEL: Record<Team, string> = { red: "Kırmızı", blue: "Mavi" };

export default function MultiplayerResult({ result, onMenu, onPlayAgain }: Props) {
  const {
    winnerTeam, redGoals, blueGoals,
    myTeam, rpGained, prevRP, newRP,
    playerStats, mode, isRanked, forfeit,
  } = result;

  const didWin = winnerTeam === myTeam;
  const isDraw = winnerTeam === "draw";
  const myRank   = getRankForRP(newRP);
  const prevRank = getRankForRP(prevRP);
  const rankUp   = isRanked && newRP > prevRP && myRank.fullName !== prevRank.fullName;
  const teamColor = TEAM_COLOR[myTeam];

  // Sıralama: kazananlar önce, kendi takımı vurgulu, gol sayısına göre
  const sorted = [...playerStats].sort((a, b) => {
    const aWin = winnerTeam !== "draw" && a.username === result.playerStats.find(p => p.username === a.username)?.username;
    const bWin = winnerTeam !== "draw" && b.username === result.playerStats.find(p => p.username === b.username)?.username;
    void aWin; void bWin;
    // Kazanan takım önce
    const aIsWinner = winnerTeam !== "draw" && playerStats.indexOf(a) < playerStats.length; // placeholder — real sort below
    void aIsWinner;
    const aTeam: Team = result.myTeam === "red"
      ? (result.playerStats.indexOf(a) < result.playerStats.filter(p => {
          // determine team by rpGained pattern — winners have rpGained >= 0, but losers also 0
          // Better: use the order from match (red team comes first in allPlayers)
          return true;
        }).length ? "red" : "blue")
      : "red";
    void aTeam;
    if (b.rpGained !== a.rpGained) return b.rpGained - a.rpGained;
    return b.goals - a.goals;
  });

  // Aslında daha temiz sıralama: RP'ye göre (kazananlar > 0, kaybedenler = 0), sonra gol
  const cleanSorted = [...playerStats].sort((a, b) => {
    if (b.rpGained !== a.rpGained) return b.rpGained - a.rpGained;
    return b.goals - a.goals;
  });

  const topScorer = cleanSorted.reduce((best, p) => p.goals > best.goals ? p : best, cleanSorted[0]);

  // Forfeit kontrolü
  const forfeitMsg = forfeit
    ? (didWin ? "Rakip maçtan ayrıldı — Kazandın!" : "Maçtan ayrıldın — Kaybettin")
    : null;

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden px-4">
      <div className="pitch-glow" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md flex flex-col gap-4 py-6"
      >
        {/* ── Başlık ── */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, delay: 0.1 }}
            className="text-5xl"
          >
            {isDraw ? "🤝" : didWin ? "🏆" : "💪"}
          </motion.div>
          <h2 className="text-white font-black text-3xl tracking-tight">
            {isDraw ? "Beraberlik" : didWin ? "Zafer!" : "Mağlubiyet"}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-white/35 text-xs uppercase tracking-widest">{mode}</span>
            <span className="text-white/20">·</span>
            <span
              className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                color: isRanked ? "#4af" : "#a78bfa",
                borderColor: isRanked ? "rgba(68,170,255,0.25)" : "rgba(167,139,250,0.25)",
                background: isRanked ? "rgba(68,170,255,0.08)" : "rgba(167,139,250,0.08)",
              }}
            >
              {isRanked ? "Rekabetçi" : "Serbest Maç"}
            </span>
          </div>
          {forfeitMsg && (
            <span className="text-[#facc15]/70 text-xs italic mt-1">{forfeitMsg}</span>
          )}
        </div>

        {/* ── Skor Kartı ── */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-8 px-6 py-4 rounded-2xl border border-white/10 bg-white/4 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-3 h-3 rounded-full mb-1"
              style={{ background: "#e63535", boxShadow: "0 0 8px #e63535" }}
            />
            <span className="text-5xl font-black" style={{ color: "#e63535" }}>{redGoals}</span>
            <span className="text-xs font-semibold" style={{ color: "rgba(230,53,53,0.6)" }}>Kırmızı</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/20 text-3xl font-black">—</span>
            {winnerTeam !== "draw" && (
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  color: TEAM_COLOR[winnerTeam as Team],
                  background: `${TEAM_COLOR[winnerTeam as Team]}15`,
                }}
              >
                {TEAM_LABEL[winnerTeam as Team]} Kazandı
              </span>
            )}
            {winnerTeam === "draw" && (
              <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Beraberlik</span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-3 h-3 rounded-full mb-1"
              style={{ background: "#4488ff", boxShadow: "0 0 8px #4488ff" }}
            />
            <span className="text-5xl font-black" style={{ color: "#4488ff" }}>{blueGoals}</span>
            <span className="text-xs font-semibold" style={{ color: "rgba(68,136,255,0.6)" }}>Mavi</span>
          </div>
        </motion.div>

        {/* ── Oyuncu İstatistikleri ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-white/30 text-[11px] uppercase tracking-wider font-semibold">Oyuncu Sıralaması</span>
            {isRanked && <span className="text-white/25 text-[11px]">Gol · RP</span>}
            {!isRanked && <span className="text-white/25 text-[11px]">Gol</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            {cleanSorted.map((p, idx) => {
              const isMe = p.username === result.playerStats.find(s => s.username === p.username && p.rpGained === rpGained && p.rpGained > 0)?.username
                || (idx === 0 && didWin && !isRanked);
              // Daha basit: my username karşılaştırması için result'tan al
              // result içinde localUsername yok ama myTeam var
              const isWinner = p.rpGained > 0 || (winnerTeam === "draw");
              const isMvp    = p.goals > 0 && p.username === topScorer?.username && topScorer.goals > 0;
              const medal    = MEDALS[idx] ?? `${idx + 1}.`;
              // Takım rengi belirsiz — RP'ye göre tahmin et (kazananlar veya eşit dağıtım)
              // Aslında tüm oyuncuların takımı MPResult'da yok; playerStats sadece username/displayName/goals/rpGained
              // Renk olarak: winners → takım rengi, draw → beyaz/gri, losers → kırmızı/mavi (bilinmiyor)
              // Güvenli: RP > 0 ise kazanan (winnerTeam rengi), = 0 ise kaybedenler veya draw
              const rowColor = isWinner && !isDraw && p.rpGained > 0
                ? TEAM_COLOR[winnerTeam as Team]
                : "rgba(255,255,255,0.12)";

              return (
                <motion.div
                  key={p.username}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + idx * 0.06 }}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all"
                  style={{
                    background: p.rpGained > 0 && !isDraw
                      ? `${TEAM_COLOR[winnerTeam as Team]}08`
                      : "rgba(255,255,255,0.03)",
                    borderColor: p.rpGained > 0 && !isDraw
                      ? `${TEAM_COLOR[winnerTeam as Team]}22`
                      : "rgba(255,255,255,0.07)",
                  }}
                >
                  {/* Sıra / Madalya */}
                  <span className="text-base w-6 text-center flex-shrink-0" style={{ filter: idx < 3 ? "none" : "opacity(0.5)" }}>
                    {medal}
                  </span>

                  {/* İsim + rozetler */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span
                      className="text-sm font-bold truncate"
                      style={{ color: p.rpGained > 0 && !isDraw ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.45)" }}
                    >
                      {p.displayName}
                    </span>
                    {isMvp && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#facc15]/15 border border-[#facc15]/25 text-[#facc15] font-bold flex-shrink-0">
                        ⭐ MVP
                      </span>
                    )}
                    {isWinner && !isDraw && p.rpGained > 0 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                        style={{
                          color: TEAM_COLOR[winnerTeam as Team],
                          background: `${TEAM_COLOR[winnerTeam as Team]}15`,
                        }}
                      >
                        WIN
                      </span>
                    )}
                  </div>

                  {/* Gol sayısı */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-white/25 text-xs">⚽</span>
                    <span className="text-white/55 text-sm font-bold tabular-nums w-4 text-center">
                      {p.goals}
                    </span>
                  </div>

                  {/* RP değişimi (sadece ranked) */}
                  {isRanked && (
                    <div className="flex-shrink-0 w-16 text-right">
                      {p.rpGained > 0 ? (
                        <span className="text-[#4ade80] font-black text-sm">+{p.rpGained}</span>
                      ) : (
                        <span className="text-white/20 text-sm font-semibold">+0</span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── RP Detay Kartı (sadece ranked + kazandıysa) ── */}
        {isRanked && rpGained > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col gap-3 px-4 py-4 rounded-2xl border border-white/10 bg-white/3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-[#4ade80]" />
                <span className="text-white/60 text-sm font-semibold">Rank Puanı</span>
              </div>
              <span className="text-[#4ade80] font-black text-sm">+{rpGained} RP</span>
            </div>
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-white/35 tabular-nums">{prevRP} RP</span>
              <div className="flex-1 mx-3 h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#4ade80]"
                  style={{ width: `${Math.min(100, (rpGained / Math.max(1, prevRP + rpGained)) * 100 + 40)}%` }}
                />
              </div>
              <span className="text-white font-bold tabular-nums">{newRP} RP</span>
            </div>
            {rankUp && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: `${myRank.tier.color}15`, border: `1px solid ${myRank.tier.color}30` }}
              >
                <Trophy size={14} style={{ color: myRank.tier.color }} />
                <span className="text-xs font-bold" style={{ color: myRank.tier.color }}>
                  {myRank.tier.icon} {myRank.fullName} Rankına Yükseldin!
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Kazanan takım kutu (sadece ranked + kaybettiysen) ── */}
        {isRanked && !isDraw && !didWin && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/8 bg-white/2 text-white/30 text-xs"
          >
            <Zap size={12} />
            <span>Kazanmak için oyna — yenilgide RP kaybı yok.</span>
          </motion.div>
        )}

        {/* ── Butonlar ── */}
        <div className="flex flex-col gap-2.5 pt-1">
          {onPlayAgain && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={onPlayAgain}
              className="w-full py-4 rounded-2xl font-black text-base text-white transition-all"
              style={{ background: `linear-gradient(135deg, ${teamColor}80, ${teamColor})` }}
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

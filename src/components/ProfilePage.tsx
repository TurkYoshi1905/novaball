import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Trophy, Swords, Target, ShieldOff,
  TrendingUp, Zap, Award, Radio, Star, Clock, BarChart3,
} from "lucide-react";
import { getPlayer, getMatchHistory, subscribeMatchHistory, type PlayerRow, type MatchRow } from "../lib/db";
import { getRankForRP, getRPProgressInRank, ALL_RANKS } from "../utils/rankSystem";

interface Props {
  username: string;
  isOwnProfile: boolean;
  onBack: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Az önce";
  if (m < 60) return `${m}d`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s`;
  return `${Math.floor(h / 24)}g`;
}

function StatCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-2xl p-4 relative overflow-hidden"
      style={{ background: `${color}08`, border: `1px solid ${color}22` }}
    >
      <div
        className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 blur-xl"
        style={{ background: color, transform: "translate(30%,-30%)" }}
      />
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[10px] uppercase tracking-widest font-bold opacity-75">{label}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-white font-black text-3xl leading-none">{value}</span>
        {sub && <span className="text-white/30 text-xs pb-0.5">{sub}</span>}
      </div>
    </motion.div>
  );
}

export default function ProfilePage({ username, isOwnProfile, onBack }: Props) {
  const [player,  setPlayer]  = useState<PlayerRow | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [live,    setLive]    = useState(false);
  const [tab,     setTab]     = useState<"stats" | "history">("stats");

  const fetchData = useCallback(() => {
    Promise.all([getPlayer(username), getMatchHistory(username, 50)]).then(([p, m]) => {
      setPlayer(p);
      setMatches(m);
      setLoading(false);
    });
  }, [username]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const unsub = subscribeMatchHistory(username, () => { setLive(true); fetchData(); });
    return unsub;
  }, [username, fetchData]);

  const displayName = player?.display_name || username;
  const initial     = displayName.charAt(0).toUpperCase();
  const rp          = player?.rp ?? 0;
  const rank        = getRankForRP(rp);
  const prog        = getRPProgressInRank(rp);
  const nextRank    = ALL_RANKS[ALL_RANKS.indexOf(rank) + 1] ?? null;
  const rankLabel   = player?.current_rank ?? rank.fullName;
  const winRate     = player && player.total_matches > 0
    ? Math.round((player.total_wins / player.total_matches) * 100) : 0;
  const goalDiff    = player ? player.total_goals_scored - player.total_goals_conceded : 0;

  const rankedMatches = matches.filter(m => m.ranked);

  return (
    <div
      className="novaball-screen flex flex-col min-h-[100dvh] relative overflow-auto"
      style={{ background: `radial-gradient(ellipse 120% 60% at 50% -10%, ${rank.tier.color}12 0%, #070d16 55%)` }}
    >
      {/* Arka plan efektleri */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 40% at 80% 0%, ${rank.tier.color}08 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 flex flex-col w-full max-w-xl mx-auto px-4 pb-10">

        {/* ── Üst bar ── */}
        <div className="flex items-center gap-3 py-5 sticky top-0 z-20"
          style={{ background: "rgba(7,13,22,0.85)", backdropFilter: "blur(12px)", margin: "0 -16px", padding: "12px 16px" }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors font-semibold group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm">Geri</span>
          </button>
          <span className="text-white/18 text-xs">·</span>
          <span className="text-white/40 text-sm">{isOwnProfile ? "Profilim" : "Oyuncu Profili"}</span>
          {live && (
            <div className="flex items-center gap-1.5 text-[#4ade80] text-[10px] font-bold uppercase tracking-wider ml-auto">
              <Radio size={9} className="animate-pulse" />
              <span>Canlı</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${rank.tier.color}40`, borderTopColor: rank.tier.color }}
            />
            <span className="text-white/30 text-sm">Yükleniyor…</span>
          </div>
        ) : !player ? (
          <div className="flex flex-col items-center py-32 gap-3">
            <span className="text-5xl">👤</span>
            <p className="text-white/30 text-base font-semibold">Oyuncu bulunamadı.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col gap-5 mt-2"
          >
            {/* ── Hero Kartı ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl p-5 relative overflow-hidden"
              style={{
                background: `linear-gradient(145deg, ${rank.tier.color}14 0%, rgba(255,255,255,0.03) 100%)`,
                border: `1px solid ${rank.tier.color}30`,
                boxShadow: `0 8px 40px ${rank.tier.glowColor}`,
              }}
            >
              {/* Rank arka plan watermark */}
              <div
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[80px] select-none pointer-events-none opacity-[0.06]"
              >
                {rank.tier.icon}
              </div>

              <div className="flex items-start gap-4 relative z-10">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-4xl text-white"
                    style={{
                      background: `linear-gradient(135deg, ${rank.tier.color}80, ${rank.tier.color}30)`,
                      border: `2px solid ${rank.tier.color}50`,
                      boxShadow: `0 0 32px ${rank.tier.glowColor}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                    }}
                  >
                    {initial}
                  </div>
                  {/* Rank badge */}
                  <div
                    className="absolute -bottom-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center text-sm border-2"
                    style={{
                      background: "#070d16",
                      borderColor: `${rank.tier.color}40`,
                      boxShadow: `0 0 12px ${rank.tier.glowColor}`,
                    }}
                  >
                    {rank.tier.icon}
                  </div>
                </div>

                <div className="flex flex-col min-w-0 flex-1 gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-black text-2xl truncate leading-tight">{displayName}</span>
                    {isOwnProfile && (
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 border"
                        style={{ background: "rgba(74,170,255,0.12)", color: "#4aaeff", borderColor: "rgba(74,170,255,0.25)" }}
                      >
                        Sen
                      </span>
                    )}
                  </div>
                  <span className="text-white/25 text-[11px] font-mono">@{username}</span>

                  {/* Rank chip */}
                  <div
                    className="inline-flex items-center gap-1.5 mt-0.5 px-3 py-1.5 rounded-xl self-start"
                    style={{
                      background: `${rank.tier.color}18`,
                      border: `1px solid ${rank.tier.color}38`,
                      boxShadow: `0 0 16px ${rank.tier.glowColor}`,
                    }}
                  >
                    <span className="text-sm leading-none">{rank.tier.icon}</span>
                    <span className="font-black text-[13px]" style={{ color: rank.tier.color }}>{rankLabel}</span>
                    <span className="text-white/25 text-[11px] font-mono font-bold">{rp} RP</span>
                  </div>
                </div>
              </div>

              {/* RP Progress */}
              <div className="flex flex-col gap-2 mt-4 relative z-10">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/40 font-mono font-bold">{prog.current} / {prog.total} RP</span>
                  {nextRank ? (
                    <span className="text-white/22 font-medium">→ {nextRank.fullName}</span>
                  ) : (
                    <span className="text-[#facc15]/60 font-bold text-[10px]">🏆 MAX RANK</span>
                  )}
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prog.percent * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${rank.tier.color}70, ${rank.tier.color})`,
                      boxShadow: `0 0 12px ${rank.tier.glowColor}`,
                    }}
                  />
                </div>
              </div>
            </motion.div>

            {/* ── Hızlı istatistikler (üst satır) ── */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Toplam Maç", value: player.total_matches, color: "#60a5fa", icon: <Swords size={13} /> },
                { label: "Galibiyet", value: player.total_wins, color: "#4ade80", icon: <Trophy size={13} /> },
                { label: "Galibiyet %", value: `${winRate}%`, color: "#a78bfa", icon: <Award size={13} /> },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-2xl p-3.5 flex flex-col gap-2 relative overflow-hidden"
                  style={{ background: `${s.color}08`, border: `1px solid ${s.color}22` }}
                >
                  <div
                    className="absolute -top-3 -right-3 w-12 h-12 rounded-full blur-xl opacity-20"
                    style={{ background: s.color }}
                  />
                  <div style={{ color: s.color }} className="flex items-center gap-1.5">
                    {s.icon}
                    <span className="text-[9px] uppercase tracking-widest font-bold opacity-70">{s.label}</span>
                  </div>
                  <span className="text-white font-black text-2xl">{s.value}</span>
                </motion.div>
              ))}
            </div>

            {/* ── Sekmeler ── */}
            <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["stats", "history"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={tab === t ? {
                    background: "rgba(255,255,255,0.09)",
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  } : { color: "rgba(255,255,255,0.3)" }}
                >
                  {t === "stats" ? <><BarChart3 size={13} /> İstatistikler</> : <><Clock size={13} /> Maç Geçmişi ({rankedMatches.length})</>}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {/* ── İSTATİSTİKLER sekmesi ── */}
              {tab === "stats" && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col gap-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard icon={<ShieldOff size={13} />}  label="Mağlubiyet"  value={player.total_losses}         color="#f87171" />
                    <StatCard icon={<TrendingUp size={13} />} label="Beraberlik"  value={player.total_draws}          color="#facc15" />
                    <StatCard icon={<Target size={13} />}     label="Gol Atılan"  value={player.total_goals_scored}   color="#a78bfa" />
                    <StatCard icon={<Zap size={13} />}        label="Gol Yenilen" value={player.total_goals_conceded} color="#fb923c" />
                  </div>

                  {/* Gol farkı */}
                  <div
                    className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center gap-2 text-white/40">
                      <Star size={13} />
                      <span className="text-[11px] uppercase tracking-widest font-bold">Gol Farkı</span>
                    </div>
                    <span
                      className="font-black text-xl"
                      style={{ color: goalDiff > 0 ? "#4ade80" : goalDiff < 0 ? "#f87171" : "rgba(255,255,255,0.5)" }}
                    >
                      {goalDiff > 0 ? "+" : ""}{goalDiff}
                    </span>
                  </div>

                  {/* Galibiyet oranı görsel */}
                  {player.total_matches > 0 && (
                    <div
                      className="rounded-2xl px-4 py-4"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2 text-white/40">
                          <Award size={13} />
                          <span className="text-[11px] uppercase tracking-widest font-bold">Galibiyet Oranı</span>
                        </div>
                        <span
                          className="font-black text-2xl"
                          style={{ color: winRate >= 50 ? "#4ade80" : winRate >= 30 ? "#facc15" : "#f87171" }}
                        >
                          {winRate}%
                        </span>
                      </div>

                      {/* Segmented bar */}
                      <div className="h-3 rounded-full overflow-hidden flex gap-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                        {player.total_wins > 0 && (
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${(player.total_wins / player.total_matches) * 100}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="h-full rounded-l-full"
                            style={{ background: "linear-gradient(90deg, #16a34a, #4ade80)", boxShadow: "0 0 8px rgba(74,222,128,0.4)" }}
                          />
                        )}
                        {player.total_draws > 0 && (
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${(player.total_draws / player.total_matches) * 100}%` }}
                            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                            className="h-full"
                            style={{ background: "linear-gradient(90deg, #ca8a04, #facc15)", boxShadow: "0 0 8px rgba(250,204,21,0.4)" }}
                          />
                        )}
                        {player.total_losses > 0 && (
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${(player.total_losses / player.total_matches) * 100}%` }}
                            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                            className="h-full rounded-r-full"
                            style={{ background: "linear-gradient(90deg, #dc2626, #f87171)", boxShadow: "0 0 8px rgba(248,113,113,0.4)" }}
                          />
                        )}
                      </div>

                      <div className="flex gap-4 mt-2.5">
                        {[
                          { label: "Galibiyet", val: player.total_wins,   color: "#4ade80" },
                          { label: "Beraberlik", val: player.total_draws,  color: "#facc15" },
                          { label: "Mağlubiyet", val: player.total_losses, color: "#f87171" },
                        ].map(s => (
                          <div key={s.label} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                            <span className="text-[10px] text-white/35 font-semibold">{s.label}: <span className="text-white/60 font-black">{s.val}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── MAÇ GEÇMİŞİ sekmesi ── */}
              {tab === "history" && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col gap-2"
                >
                  {rankedMatches.length === 0 ? (
                    <div
                      className="rounded-2xl px-4 py-12 text-center flex flex-col items-center gap-3"
                      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <span className="text-4xl">⚽</span>
                      <p className="text-white/28 text-sm">Henüz rekabetçi maç oynanmamış.</p>
                    </div>
                  ) : (
                    rankedMatches.map((m, idx) => {
                      const isWin  = m.result === "win";
                      const isDraw = m.result === "draw";
                      const color  = isWin ? "#4ade80" : isDraw ? "#facc15" : "#f87171";
                      const label  = isWin ? "GAL" : isDraw ? "BER" : "MAĞ";
                      const emoji  = isWin ? "🏆" : isDraw ? "🤝" : "💀";
                      const pGoals = m.player_goals;
                      const oGoals = m.opponent_goals;

                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all hover:brightness-110 cursor-default"
                          style={{
                            background: `${color}05`,
                            border: `1px solid ${color}18`,
                            borderLeft: `3px solid ${color}60`,
                          }}
                        >
                          {/* Sonuç badge */}
                          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-9 text-center">
                            <span className="text-lg leading-none">{emoji}</span>
                            <span
                              className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                              style={{ color, background: `${color}15` }}
                            >{label}</span>
                          </div>

                          {/* Maç bilgisi */}
                          <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white/25 text-[10px]">vs</span>
                              <span className="text-white/90 font-bold text-sm truncate">{m.opponent_name}</span>
                              {m.ranked && (
                                <span
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                                  style={{ background: "rgba(74,170,255,0.12)", color: "#4aaeff", border: "1px solid rgba(74,170,255,0.2)" }}
                                >R</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-mono font-black"
                                style={{ color: isWin ? "#4ade80" : isDraw ? "#facc15" : "#f87171" }}
                              >
                                {pGoals} — {oGoals}
                              </span>
                              {m.rp_gained > 0 && (
                                <span className="text-[#4ade80] text-[11px] font-black">+{m.rp_gained} RP</span>
                              )}
                            </div>
                          </div>

                          {/* Zaman */}
                          <span className="text-white/18 text-[10px] flex-shrink-0 font-mono tabular-nums">{timeAgo(m.played_at)}</span>
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

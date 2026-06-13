import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, Trophy, Swords, Target, ShieldOff,
  TrendingUp, Zap, Award, Radio,
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

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-2xl p-3.5"
      style={{ background: `${color}08`, border: `1px solid ${color}20` }}
    >
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">{label}</span>
      </div>
      <span className="text-white font-black text-2xl leading-none">{value}</span>
    </div>
  );
}

export default function ProfilePage({ username, isOwnProfile, onBack }: Props) {
  const [player,  setPlayer]  = useState<PlayerRow | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [live,    setLive]    = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([getPlayer(username), getMatchHistory(username, 30)]).then(([p, m]) => {
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

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] bg-[#070d16] relative overflow-auto">
      <div className="pitch-glow pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-5 px-4 py-5 w-full max-w-xl mx-auto">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-white/30 hover:text-white/70 transition-colors font-semibold py-1 -ml-1"
          >
            <ChevronLeft size={20} />
            <span className="text-sm">Geri</span>
          </button>
          <span className="text-white/22 text-sm">{isOwnProfile ? "Profilim" : "Oyuncu Profili"}</span>
          {live && (
            <div className="flex items-center gap-1 text-[#4ade80] text-[10px] font-bold uppercase tracking-wider ml-auto">
              <Radio size={10} className="animate-pulse" />
              <span>Canlı</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#4af]/30 border-t-[#4af] animate-spin" />
            <span className="text-white/30 text-sm">Yükleniyor…</span>
          </div>
        ) : !player ? (
          <div className="flex flex-col items-center py-24 gap-2">
            <span className="text-4xl">👤</span>
            <p className="text-white/35">Oyuncu bulunamadı.</p>
          </div>
        ) : (
          <>
            {/* ── Profil Hero ──────────────────────────────────── */}
            <div
              className="rounded-3xl p-5 flex flex-col gap-4"
              style={{
                background: `linear-gradient(135deg,${rank.tier.color}0c 0%,transparent 70%)`,
                border: `1px solid ${rank.tier.color}28`,
              }}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                  className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-3xl text-white"
                  style={{
                    background: `linear-gradient(135deg,${rank.tier.color}70,${rank.tier.color}30)`,
                    border: `2px solid ${rank.tier.color}45`,
                    boxShadow: `0 0 28px ${rank.tier.glowColor}`,
                  }}
                >
                  {initial}
                </div>

                <div className="flex flex-col min-w-0 flex-1 gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-black text-xl truncate leading-tight">{displayName}</span>
                    {isOwnProfile && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: "rgba(74,170,255,0.15)", color: "#4aaeff" }}
                      >
                        Sen
                      </span>
                    )}
                  </div>
                  <span className="text-white/28 text-[11px]">@{username}</span>

                  <div
                    className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full self-start"
                    style={{
                      background: `${rank.tier.color}18`,
                      border: `1px solid ${rank.tier.color}40`,
                      boxShadow: `0 0 14px ${rank.tier.glowColor}`,
                    }}
                  >
                    <span className="text-sm leading-none">{rank.tier.icon}</span>
                    <span className="font-black text-[13px]" style={{ color: rank.tier.color }}>{rankLabel}</span>
                  </div>
                </div>
              </div>

              {/* RP Progress */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/35">{prog.current} / {prog.total} RP</span>
                  {nextRank && <span className="text-white/25">→ {nextRank.fullName}</span>}
                </div>
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${prog.percent * 100}%`,
                      background: `linear-gradient(90deg,${rank.tier.color}70,${rank.tier.color})`,
                      boxShadow: `0 0 8px ${rank.tier.glowColor}`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ── İstatistikler ─────────────────────────────────── */}
            <div>
              <p className="text-white/28 text-[10px] uppercase tracking-widest mb-3">İstatistikler</p>
              <div className="grid grid-cols-3 gap-2">
                <StatCard icon={<Swords size={12} />}    label="Maç"         value={player.total_matches}       color="#60a5fa" />
                <StatCard icon={<Trophy size={12} />}     label="Galibiyet"   value={player.total_wins}           color="#4ade80" />
                <StatCard icon={<ShieldOff size={12} />}  label="Mağlubiyet"  value={player.total_losses}         color="#f87171" />
                <StatCard icon={<TrendingUp size={12} />} label="Beraberlik"  value={player.total_draws}          color="#facc15" />
                <StatCard icon={<Target size={12} />}     label="Gol Atılan"  value={player.total_goals_scored}   color="#a78bfa" />
                <StatCard icon={<Zap size={12} />}        label="Gol Yenilen" value={player.total_goals_conceded} color="#fb923c" />
              </div>

              {/* Win Rate */}
              {player.total_matches > 0 && (
                <div
                  className="mt-2 rounded-2xl px-4 py-3.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="flex items-center gap-1.5 text-white/45">
                      <Award size={13} />
                      <span className="text-[11px] uppercase tracking-wider font-bold">Galibiyet Oranı</span>
                    </div>
                    <span className="text-white font-black text-xl">{winRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden flex">
                    <div className="h-full bg-[#4ade80]" style={{ width: `${(player.total_wins   / player.total_matches) * 100}%` }} />
                    <div className="h-full bg-[#facc15]" style={{ width: `${(player.total_draws  / player.total_matches) * 100}%` }} />
                    <div className="h-full bg-[#f87171]" style={{ width: `${(player.total_losses / player.total_matches) * 100}%` }} />
                  </div>
                  <div className="flex gap-4 mt-2 text-[10px] text-white/30">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4ade80] inline-block" />G: {player.total_wins}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#facc15] inline-block" />B: {player.total_draws}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f87171] inline-block" />M: {player.total_losses}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Maç Geçmişi ──────────────────────────────────── */}
            <div>
              <p className="text-white/28 text-[10px] uppercase tracking-widest mb-3">Maç Geçmişi</p>

              {matches.length === 0 ? (
                <div
                  className="rounded-2xl px-4 py-10 text-center text-white/25 text-sm"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  Henüz rekabet maçı oynanmamış.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {matches.map(m => {
                    const isWin  = m.result === "win";
                    const isDraw = m.result === "draw";
                    const color  = isWin ? "#4ade80" : isDraw ? "#facc15" : "#f87171";
                    const label  = isWin ? "GAL" : isDraw ? "BER" : "MAĞ";
                    const emoji  = isWin ? "🏆" : isDraw ? "🤝" : "💀";
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-all hover:brightness-110"
                        style={{
                          background: `${color}05`,
                          border: `1px solid ${color}15`,
                          borderLeft: `3px solid ${color}70`,
                        }}
                      >
                        {/* Result badge */}
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-9 text-center">
                          <span className="text-base leading-none">{emoji}</span>
                          <span className="text-[9px] font-black" style={{ color }}>{label}</span>
                        </div>

                        {/* Match info */}
                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-white/28 text-[10px]">vs</span>
                            <span className="text-white/90 font-bold text-sm truncate">{m.opponent_name}</span>
                            {m.ranked && (
                              <span
                                className="text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ background: "rgba(74,170,255,0.15)", color: "#4aaeff" }}
                              >
                                R
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-white/45 text-xs font-mono font-bold">{m.player_goals} — {m.opponent_goals}</span>
                            {m.rp_gained > 0 && (
                              <span className="text-[#4ade80] text-[11px] font-black">+{m.rp_gained} RP</span>
                            )}
                          </div>
                        </div>

                        {/* Time */}
                        <span className="text-white/18 text-[10px] flex-shrink-0 font-mono tabular-nums">{timeAgo(m.played_at)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

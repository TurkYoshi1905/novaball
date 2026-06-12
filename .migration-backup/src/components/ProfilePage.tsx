import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft, Trophy, Swords, Target, ShieldOff,
  TrendingUp, Calendar, Zap, Award, Radio,
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
  if (m < 60) return `${m}d önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  const d = Math.floor(h / 24);
  return `${d}g önce`;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
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
    const unsub = subscribeMatchHistory(username, () => {
      setLive(true);
      fetchData();
    });
    return unsub;
  }, [username, fetchData]);

  const displayName = player?.display_name || username;
  const initial = displayName.charAt(0).toUpperCase();
  const rp = player?.rp ?? 0;
  const rank = getRankForRP(rp);
  const prog = getRPProgressInRank(rp);
  const nextRank = ALL_RANKS[ALL_RANKS.indexOf(rank) + 1] ?? null;
  const winRate = player && player.total_matches > 0
    ? Math.round((player.total_wins / player.total_matches) * 100)
    : 0;

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] bg-[#070d16] relative overflow-auto">
      <div className="pitch-glow pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-5 px-4 py-6 w-full max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-white/30 hover:text-white/70 transition-colors font-semibold py-1 -ml-1"
          >
            <ChevronLeft size={20} />
            <span className="text-sm">Geri</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white/20 text-sm">{isOwnProfile ? "Profilim" : "Oyuncu Profili"}</span>
            {live && (
              <div className="flex items-center gap-1 text-[#4ade80] text-[10px] font-bold uppercase tracking-wider">
                <Radio size={10} className="animate-pulse" />
                <span>Canlı</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#4af]/30 border-t-[#4af] animate-spin" />
            <span className="text-white/30 text-sm">Yükleniyor…</span>
          </div>
        ) : !player ? (
          <div className="flex flex-col items-center py-20 gap-2">
            <span className="text-white/30 text-4xl">👤</span>
            <p className="text-white/40">Oyuncu bulunamadı.</p>
          </div>
        ) : (
          <>
            {/* Profile Hero */}
            <div
              className="rounded-2xl border p-5 flex flex-col gap-4"
              style={{ borderColor: `${rank.tier.color}30`, background: `${rank.tier.color}08` }}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-2xl shadow-lg"
                  style={{
                    background: `linear-gradient(135deg,${rank.tier.color}80,${rank.tier.color}40)`,
                    border: `2px solid ${rank.tier.color}50`,
                    boxShadow: `0 0 24px ${rank.tier.glowColor}`,
                  }}
                >
                  {initial}
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-white font-black text-xl truncate">{displayName}</span>
                  <span className="text-white/30 text-xs mt-0.5">@{username}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg">{rank.tier.icon}</span>
                    <span className="font-bold text-sm" style={{ color: rank.tier.color }}>{rank.fullName}</span>
                  </div>
                  <span className="text-white/30 text-xs mt-0.5">{rp} RP</span>
                </div>

                {isOwnProfile && (
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-[#4af]/15 text-[#4af] flex-shrink-0">
                    Benim
                  </span>
                )}
              </div>

              {/* RP Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/40">{prog.current} / {prog.total} RP</span>
                  {nextRank && <span className="text-white/30">→ {nextRank.fullName}</span>}
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${prog.percent * 100}%`,
                      background: `linear-gradient(90deg,${rank.tier.color}70,${rank.tier.color})`,
                      boxShadow: `0 0 8px ${rank.tier.glowColor}`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div>
              <h3 className="text-white/40 text-xs uppercase tracking-widest mb-3">İstatistikler</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatCard icon={<Swords size={13} />} label="Maç" value={player.total_matches} color="#60a5fa" />
                <StatCard icon={<Trophy size={13} />} label="Galibiyet" value={player.total_wins} color="#4ade80" />
                <StatCard icon={<ShieldOff size={13} />} label="Mağlubiyet" value={player.total_losses} color="#f87171" />
                <StatCard icon={<TrendingUp size={13} />} label="Beraberlik" value={player.total_draws} color="#facc15" />
                <StatCard icon={<Target size={13} />} label="Gol Atılan" value={player.total_goals_scored} color="#a78bfa" />
                <StatCard icon={<Zap size={13} />} label="Gol Yenilen" value={player.total_goals_conceded} color="#fb923c" />
              </div>

              {/* Win Rate Bar */}
              {player.total_matches > 0 && (
                <div className="mt-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1.5 text-white/50">
                      <Award size={13} />
                      <span className="text-[11px] uppercase tracking-wider font-semibold">Galibiyet Oranı</span>
                    </div>
                    <span className="text-white font-black text-lg">{winRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
                    <div className="h-full bg-[#4ade80]" style={{ width: `${(player.total_wins / player.total_matches) * 100}%` }} />
                    <div className="h-full bg-[#facc15]" style={{ width: `${(player.total_draws / player.total_matches) * 100}%` }} />
                    <div className="h-full bg-[#f87171]" style={{ width: `${(player.total_losses / player.total_matches) * 100}%` }} />
                  </div>
                  <div className="flex gap-4 mt-1.5 text-[10px] text-white/30">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4ade80] inline-block" />G: {player.total_wins}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#facc15] inline-block" />B: {player.total_draws}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f87171] inline-block" />M: {player.total_losses}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Match History */}
            <div>
              <h3 className="text-white/40 text-xs uppercase tracking-widest mb-3">Maç Geçmişi</h3>
              {matches.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-white/2 px-4 py-8 text-center text-white/30 text-sm">
                  Henüz rekabet maçı oynanmamış.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {matches.map((m) => {
                    const isWin  = m.result === "win";
                    const isDraw = m.result === "draw";
                    const color  = isWin ? "#4ade80" : isDraw ? "#facc15" : "#f87171";
                    const label  = isWin ? "G" : isDraw ? "B" : "M";
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-white/7 bg-white/2 px-4 py-3 flex items-center gap-3"
                      >
                        {/* Result badge */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
                          style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}
                        >
                          {label}
                        </div>

                        {/* vs */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white/25 text-xs">vs</span>
                            <span className="text-white font-semibold text-sm truncate">{m.opponent_name}</span>
                            {m.ranked && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#4af]/15 text-[#4af] flex-shrink-0">
                                R
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-white/35 text-xs">{m.player_goals} — {m.opponent_goals}</span>
                            {m.rp_gained > 0 && (
                              <span className="text-[#4ade80] text-xs font-bold">+{m.rp_gained} RP</span>
                            )}
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-1 text-white/20 text-xs flex-shrink-0">
                          <Calendar size={11} />
                          <span>{timeAgo(m.played_at)}</span>
                        </div>
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

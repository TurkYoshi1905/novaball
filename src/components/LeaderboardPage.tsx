import { useEffect, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Radio, Search, Trophy, Users, Zap, Crown } from "lucide-react";
import { getLeaderboard, subscribeLeaderboard, type PlayerRow } from "../lib/db";
import { getRankForRP } from "../utils/rankSystem";

interface Props {
  currentUsername: string;
  onBack: () => void;
  onViewProfile: (username: string) => void;
}

/* ── Position badge ─────────────────────────────────────────────────── */
function PosBadge({ pos }: { pos: number }) {
  if (pos === 1) return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
      style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", boxShadow: "0 0 16px rgba(251,191,36,0.5)" }}>
      <Crown size={16} className="text-white" fill="white" />
    </div>
  );
  if (pos === 2) return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
      style={{ background: "linear-gradient(135deg,#94a3b8,#cbd5e1)", color: "#0f172a", boxShadow: "0 0 12px rgba(148,163,184,0.35)" }}>
      2
    </div>
  );
  if (pos === 3) return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
      style={{ background: "linear-gradient(135deg,#c2773e,#b5632a)", color: "#fff2e8", boxShadow: "0 0 12px rgba(194,119,62,0.35)" }}>
      3
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
      style={{
        background: pos <= 10 ? "rgba(68,170,255,0.12)" : "rgba(255,255,255,0.05)",
        color: pos <= 10 ? "rgba(68,170,255,0.8)" : "rgba(255,255,255,0.3)",
        border: pos <= 10 ? "1px solid rgba(68,170,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
      }}>
      {pos}
    </div>
  );
}

/* ── Top 3 podium card ──────────────────────────────────────────────── */
function PodiumCard({ p, pos, isMe, onClick }: {
  p: PlayerRow; pos: number; isMe: boolean; onClick: () => void;
}) {
  const rank = getRankForRP(p.rp);
  const winRate = p.total_matches > 0 ? Math.round((p.total_wins / p.total_matches) * 100) : 0;
  const isOnline = p.last_seen ? Date.now() - new Date(p.last_seen).getTime() < 5 * 60 * 1000 : false;
  const label = p.display_name || p.username;
  const initial = label.charAt(0).toUpperCase();

  const podiumColors: Record<number, { glow: string; border: string; bg: string; accent: string }> = {
    1: { glow: "rgba(251,191,36,0.35)", border: "rgba(251,191,36,0.45)", bg: "rgba(251,191,36,0.08)", accent: "#fbbf24" },
    2: { glow: "rgba(148,163,184,0.25)", border: "rgba(148,163,184,0.35)", bg: "rgba(148,163,184,0.06)", accent: "#94a3b8" },
    3: { glow: "rgba(194,119,62,0.25)", border: "rgba(194,119,62,0.35)", bg: "rgba(194,119,62,0.06)", accent: "#c2773e" },
  };
  const c = podiumColors[pos];

  return (
    <button onClick={onClick}
      className="flex-1 min-w-0 flex flex-col items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.97] text-center group relative overflow-hidden"
      style={{
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        boxShadow: `0 8px 32px ${c.glow}`,
        order: pos === 1 ? 2 : pos === 2 ? 1 : 3,
      }}>
      {/* Top shine */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${c.accent}88,transparent)` }} />

      {/* Position */}
      <PosBadge pos={pos} />

      {/* Avatar */}
      <div className="relative">
        <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-xl"
          style={{
            background: `linear-gradient(135deg,${rank.tier.color}cc,${rank.tier.color}66)`,
            border: `2.5px solid ${rank.tier.color}88`,
            boxShadow: `0 0 24px ${rank.tier.glowColor}`,
          }}>
          <span className="text-white">{initial}</span>
        </div>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#070d16]"
            style={{ background: "#4ade80", boxShadow: "0 0 8px #4ade8060" }} />
        )}
        {isMe && (
          <span className="absolute -top-1 -right-1 text-[9px] font-black px-1 py-0.5 rounded-full leading-none"
            style={{ background: "#4aaeff", color: "#fff" }}>Sen</span>
        )}
      </div>

      {/* Name */}
      <div className="flex flex-col items-center gap-1.5 min-w-0 w-full">
        <span className="text-white font-bold text-sm leading-tight truncate w-full">{label}</span>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: `${rank.tier.color}18`, border: `1px solid ${rank.tier.color}40` }}>
          <span className="text-xs leading-none">{rank.tier.icon}</span>
          <span className="text-[10px] font-bold" style={{ color: rank.tier.color }}>{rank.fullName}</span>
        </div>
      </div>

      {/* RP */}
      <div className="flex flex-col items-center">
        <span className="font-black text-2xl" style={{ color: c.accent }}>{p.rp}</span>
        <span className="text-white/40 text-[10px] font-semibold">RP</span>
      </div>

      {/* Win rate */}
      {p.total_matches > 0 && (
        <div className="w-full text-[10px] text-white/40 font-semibold">
          {winRate}% G.O. · {p.total_matches}M
        </div>
      )}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function LeaderboardPage({ currentUsername, onBack, onViewProfile }: Props) {
  const [players, setPlayers]   = useState<PlayerRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [live, setLive]         = useState(false);
  const [search, setSearch]     = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "online">("all");

  const fetchData = useCallback(() => {
    setLoading(true);
    getLeaderboard().then(data => { setPlayers(data); setLoading(false); });
  }, []);

  useEffect(() => {
    fetchData();
    const unsub = subscribeLeaderboard(() => { setLive(true); fetchData(); });
    return unsub;
  }, [fetchData]);

  const myPos = players.findIndex(p => p.username === currentUsername) + 1;
  const myPlayer = players.find(p => p.username === currentUsername);
  const onlineCount = players.filter(p =>
    p.last_seen ? Date.now() - new Date(p.last_seen).getTime() < 5 * 60 * 1000 : false
  ).length;

  const filtered = useMemo(() => {
    let list = players;
    if (activeTab === "online") list = list.filter(p =>
      p.last_seen ? Date.now() - new Date(p.last_seen).getTime() < 5 * 60 * 1000 : false
    );
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.username.toLowerCase().includes(q) || (p.display_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [players, activeTab, search]);

  const top3     = filtered.slice(0, 3);
  const restList = filtered.slice(3);

  const isShowingTop3 = !search.trim() && activeTab === "all" && players.length >= 3;

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#060f22 0%,#080f1c 50%,#06101a 100%)" }}>

      {/* ── Background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[400px]"
          style={{ background: "radial-gradient(ellipse,rgba(250,204,21,0.07) 0%,transparent 65%)" }} />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[500px] h-[300px]"
          style={{ background: "radial-gradient(ellipse,rgba(26,92,255,0.07) 0%,transparent 65%)" }} />
        <div className="orb orb-1" style={{ opacity: 0.4 }} />
        <div className="orb orb-2" style={{ opacity: 0.3 }} />
      </div>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center gap-3 px-5 sm:px-8 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)", color: "rgba(255,255,255,0.6)" }}>
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <Trophy size={20} className="text-[#facc15] flex-shrink-0" />
            <h1 className="text-white font-black text-xl sm:text-2xl leading-none">Lider Tablosu</h1>
            {live && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)" }}>
                <Radio size={10} className="text-[#4ade80] animate-pulse" />
                <span className="text-[#4ade80] text-[10px] font-bold uppercase tracking-wide">Canlı</span>
              </div>
            )}
          </div>
          <p className="text-white/35 text-[11px] uppercase tracking-widest font-semibold mt-0.5">En İyi Oyuncular</p>
        </div>

        <button onClick={fetchData} disabled={loading}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)", color: "rgba(255,255,255,0.55)" }}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {/* ── CONTENT ────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5 pb-10">

          {/* ── Stats strip ──────────────────────────────────────── */}
          {!loading && players.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: <Users size={14} />, label: "Toplam Oyuncu", value: players.length.toString(), color: "#4aaeff" },
                { icon: <Radio size={14} />, label: "Şu An Aktif", value: onlineCount.toString(), color: "#4ade80" },
                { icon: <Zap size={14} />, label: "En Yüksek RP", value: (players[0]?.rp ?? 0).toString(), color: "#facc15" },
              ].map(s => (
                <div key={s.label} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ color: s.color }}>{s.icon}</div>
                  <span className="text-white font-black text-lg leading-none">{s.value}</span>
                  <span className="text-white/40 text-[10px] font-semibold text-center leading-tight px-1">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── My rank card ─────────────────────────────────────── */}
          {myPos > 0 && !loading && myPlayer && (() => {
            const myRankInfo = getRankForRP(myPlayer.rp);
            const myWinRate  = myPlayer.total_matches > 0
              ? Math.round((myPlayer.total_wins / myPlayer.total_matches) * 100) : 0;
            return (
              <button onClick={() => onViewProfile(currentUsername)}
                className="w-full rounded-2xl px-4 py-4 flex items-center gap-4 transition-all active:scale-[0.98] text-left group relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg,${myRankInfo.tier.color}14,rgba(68,170,255,0.06))`,
                  border: `1.5px solid ${myRankInfo.tier.color}45`,
                  boxShadow: `0 4px 24px ${myRankInfo.tier.glowColor}`,
                }}>
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: `linear-gradient(90deg,transparent,${myRankInfo.tier.color}88,transparent)` }} />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-white/45 text-xs font-semibold">Senin Sıran</span>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <span className="font-black text-2xl" style={{ color: myRankInfo.tier.color }}>#{myPos}</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm leading-none">{myRankInfo.tier.icon}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-white font-bold text-sm truncate">{myPlayer.display_name || currentUsername}</span>
                      <span className="text-[11px] font-semibold" style={{ color: myRankInfo.tier.color }}>{myRankInfo.fullName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-white font-black text-lg">{myPlayer.rp} <span className="text-white/35 font-semibold text-xs">RP</span></span>
                  {myPlayer.total_matches > 0 && (
                    <span className="text-white/45 text-[11px] font-semibold">{myWinRate}% G.O.</span>
                  )}
                </div>
                <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 flex-shrink-0 transition-colors" />
              </button>
            );
          })()}

          {/* ── Tabs + Search ────────────────────────────────────── */}
          {!loading && players.length > 0 && (
            <div className="flex flex-col gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-2">
                {(["all", "online"] as const).map(tab => (
                  <button key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
                    style={activeTab === tab ? {
                      background: "rgba(68,170,255,0.15)",
                      border: "1px solid rgba(68,170,255,0.4)",
                      color: "#4aaeff",
                    } : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.45)",
                    }}>
                    {tab === "all" ? <Trophy size={13} /> : <Radio size={13} />}
                    {tab === "all" ? "Tümü" : `Aktif (${onlineCount})`}
                  </button>
                ))}
                {/* Search */}
                <div className="flex-1 relative min-w-0">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Oyuncu ara…"
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-sm font-semibold outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.85)",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Loading ──────────────────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#facc15]/20 border-t-[#facc15] animate-spin" />
              <span className="text-white/35 text-sm font-semibold">Lider tablosu yükleniyor…</span>
            </div>
          )}

          {/* ── Empty ────────────────────────────────────────────── */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.2)" }}>
                🏆
              </div>
              <div className="text-center">
                <p className="text-white/70 font-bold">
                  {search ? "Oyuncu bulunamadı" : activeTab === "online" ? "Şu an aktif oyuncu yok" : "Henüz sıralama yok"}
                </p>
                <p className="text-white/35 text-sm mt-1">
                  {search ? `"${search}" ile eşleşen oyuncu yok` : "İlk rekabet maçını oyna ve listede görün!"}
                </p>
              </div>
            </div>
          )}

          {/* ── TOP 3 PODIUM ─────────────────────────────────────── */}
          {!loading && isShowingTop3 && filtered.length >= 1 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={14} className="text-[#facc15]" />
                <span className="text-white/55 text-xs font-bold uppercase tracking-wider">Podium</span>
              </div>
              <div className="flex gap-2 items-end">
                {[...top3]
                  .sort((a, b) => {
                    const posA = players.indexOf(a) + 1;
                    const posB = players.indexOf(b) + 1;
                    // Visual order: 2nd - 1st - 3rd
                    const visualOrder: Record<number, number> = { 1: 1, 2: 0, 3: 2 };
                    return (visualOrder[posA] ?? posA) - (visualOrder[posB] ?? posB);
                  })
                  .map(p => {
                    const pos = players.indexOf(p) + 1;
                    return (
                      <PodiumCard key={p.username} p={p} pos={pos}
                        isMe={p.username === currentUsername}
                        onClick={() => onViewProfile(p.username)} />
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── REST LIST ────────────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-col gap-2">
              {(isShowingTop3 ? restList : filtered).map(p => {
                const pos      = players.indexOf(p) + 1;
                const rank     = getRankForRP(p.rp);
                const isMe     = p.username === currentUsername;
                const winRate  = p.total_matches > 0 ? Math.round((p.total_wins / p.total_matches) * 100) : 0;
                const isOnline = p.last_seen ? Date.now() - new Date(p.last_seen).getTime() < 5 * 60 * 1000 : false;
                const label    = p.display_name || p.username;

                return (
                  <button key={p.username}
                    onClick={() => onViewProfile(p.username)}
                    className="w-full text-left rounded-2xl transition-all active:scale-[0.98] flex items-center gap-3 px-4 py-3.5 group relative overflow-hidden"
                    style={{
                      background: isMe ? `${rank.tier.color}0d` : "rgba(255,255,255,0.04)",
                      border: isMe ? `1.5px solid ${rank.tier.color}45` : "1px solid rgba(255,255,255,0.09)",
                      boxShadow: isMe ? `0 4px 20px ${rank.tier.glowColor}` : "none",
                    }}>
                    {isMe && (
                      <div className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: `linear-gradient(90deg,transparent,${rank.tier.color}66,transparent)` }} />
                    )}

                    {/* Position */}
                    <div className="w-8 flex items-center justify-center flex-shrink-0">
                      <PosBadge pos={pos} />
                    </div>

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base"
                        style={{
                          background: `linear-gradient(135deg,${rank.tier.color}aa,${rank.tier.color}55)`,
                          border: `2px solid ${rank.tier.color}55`,
                          boxShadow: isMe ? `0 0 14px ${rank.tier.glowColor}` : "none",
                        }}>
                        <span className="text-white">{label.charAt(0).toUpperCase()}</span>
                      </div>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#080f1c]"
                          style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade8070" }} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm truncate ${isMe ? "text-white" : "text-white/85"}`}>
                          {label}
                        </span>
                        {isMe && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: "rgba(68,170,255,0.18)", color: "#4aaeff", border: "1px solid rgba(68,170,255,0.35)" }}>
                            SEN
                          </span>
                        )}
                        {isOnline && !isMe && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                            AKTİF
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ background: `${rank.tier.color}15`, border: `1px solid ${rank.tier.color}30` }}>
                          <span className="text-[10px] leading-none">{rank.tier.icon}</span>
                          <span className="text-[10px] font-bold" style={{ color: rank.tier.color }}>
                            {p.current_rank ?? rank.fullName}
                          </span>
                        </div>
                        {p.total_matches > 0 && (
                          <span className="text-white/35 text-[10px] font-semibold">{winRate}% G.O. · {p.total_matches}M</span>
                        )}
                      </div>

                      {/* Win rate bar */}
                      {p.total_matches > 0 && (
                        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${winRate}%`,
                              background: `linear-gradient(90deg,${rank.tier.color}60,${rank.tier.color})`,
                            }} />
                        </div>
                      )}
                    </div>

                    {/* RP */}
                    <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                      <span className="text-white font-black text-base">{p.rp}</span>
                      <span className="text-white/30 text-[10px] font-semibold">RP</span>
                    </div>

                    <ChevronRight size={14} className="text-white/20 group-hover:text-white/55 transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <p className="text-center text-white/20 text-xs pb-2">
              Profili görmek için oyuncuya tıkla · {players.length} kayıtlı oyuncu
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

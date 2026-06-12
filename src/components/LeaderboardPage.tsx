import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, RefreshCw, Medal, Radio } from "lucide-react";
import { getLeaderboard, subscribeLeaderboard, type PlayerRow } from "../lib/db";
import { getRankForRP } from "../utils/rankSystem";

interface Props {
  currentUsername: string;
  onBack: () => void;
  onViewProfile: (username: string) => void;
}

function PositionBadge({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-2xl">🥇</span>;
  if (pos === 2) return <span className="text-2xl">🥈</span>;
  if (pos === 3) return <span className="text-2xl">🥉</span>;
  return (
    <span className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/40 font-bold text-sm">
      {pos}
    </span>
  );
}

export default function LeaderboardPage({ currentUsername, onBack, onViewProfile }: Props) {
  const [players, setPlayers]   = useState<PlayerRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [live, setLive]         = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    getLeaderboard().then(data => {
      setPlayers(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchData();
    const unsub = subscribeLeaderboard(() => {
      setLive(true);
      fetchData();
    });
    return unsub;
  }, [fetchData]);

  const myRank = players.findIndex(p => p.username === currentUsername) + 1;

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
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-black text-2xl flex items-center gap-2">
              <Medal size={22} className="text-[#facc15]" />
              Lider Tablosu
            </h1>
            <p className="text-white/30 text-xs uppercase tracking-widest mt-0.5">En İyi Oyuncular</p>
          </div>
          <div className="flex items-center gap-2">
            {live && (
              <div className="flex items-center gap-1 text-[#4ade80] text-[10px] font-bold uppercase tracking-wider">
                <Radio size={11} className="animate-pulse" />
                <span>Canlı</span>
              </div>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* My rank highlight */}
        {myRank > 0 && !loading && (
          <div className="rounded-xl border border-[#4af]/25 bg-[#4af]/6 px-4 py-3 flex items-center gap-3">
            <span className="text-[#4af] text-sm font-bold">Senin Sıran</span>
            <span className="text-white font-black text-lg ml-auto">#{myRank}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#4af]/30 border-t-[#4af] animate-spin" />
            <span className="text-white/30 text-sm">Yükleniyor…</span>
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <span className="text-5xl">🏆</span>
            <p className="text-white/40 text-center text-sm">
              Henüz sıralama yok.<br />İlk rekabet maçını oyna ve listede görün!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {players.map((p, i) => {
              const pos   = i + 1;
              const rank  = getRankForRP(p.rp);
              const isMe  = p.username === currentUsername;
              const winRate = p.total_matches > 0
                ? Math.round((p.total_wins / p.total_matches) * 100)
                : 0;

              const isOnline = p.last_seen
                ? Date.now() - new Date(p.last_seen).getTime() < 5 * 60 * 1000
                : false;
              const displayLabel = p.display_name || p.username;

              return (
                <button
                  key={p.username}
                  onClick={() => onViewProfile(p.username)}
                  className="w-full text-left rounded-xl border transition-all active:scale-[0.98] flex items-center gap-3 px-4 py-3.5 group"
                  style={{
                    borderColor: isMe ? `${rank.tier.color}40` : pos <= 3 ? `${rank.tier.color}25` : "rgba(255,255,255,0.07)",
                    background:  isMe ? `${rank.tier.color}0a` : pos <= 3 ? `${rank.tier.color}05` : "rgba(255,255,255,0.02)",
                  }}
                >
                  {/* Position */}
                  <div className="w-9 flex items-center justify-center flex-shrink-0">
                    <PositionBadge pos={pos} />
                  </div>

                  {/* Avatar with online dot */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base"
                      style={{
                        background: `linear-gradient(135deg,${rank.tier.color}60,${rank.tier.color}30)`,
                        border: `1.5px solid ${rank.tier.color}40`,
                      }}
                    >
                      <span className="text-white">{displayLabel.charAt(0).toUpperCase()}</span>
                    </div>
                    {isOnline && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#070d16]"
                        style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade8080" }}
                        title="Şu an çevrimiçi"
                      />
                    )}
                  </div>

                  {/* Name + rank */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm truncate ${isMe ? "text-white" : "text-white/85"}`}>
                        {displayLabel}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#4af]/15 text-[#4af] flex-shrink-0">Sen</span>
                      )}
                      {isOnline && !isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#4ade80]/12 text-[#4ade80] flex-shrink-0">Aktif</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm">{rank.tier.icon}</span>
                      <span className="text-xs" style={{ color: rank.tier.color }}>{rank.fullName}</span>
                      {p.total_matches > 0 && (
                        <span className="text-white/25 text-xs ml-1">{winRate}% G.O.</span>
                      )}
                    </div>
                  </div>

                  {/* RP */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-white font-black text-base">{p.rp}</span>
                    <span className="text-white/30 text-xs">RP</span>
                  </div>

                  {/* Arrow */}
                  <ChevronLeft size={14} className="text-white/20 group-hover:text-white/50 transition-colors rotate-180 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        <div className="text-center text-white/15 text-xs pb-2">
          Profili görmek için oyuncuya tıkla
        </div>
      </div>
    </div>
  );
}

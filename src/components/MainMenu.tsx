import { useState } from "react";
import { Trophy, User } from "lucide-react";
import { FOUNDING_DATE } from "../types/game";
import { loadRP, getRankForRP, getRPProgressInRank, ALL_RANKS } from "../utils/rankSystem";
import CHANGELOG from "../utils/changelogData";

interface Props {
  username: string;
  onPlay: () => void;
  onPlayRanked: () => void;
  onShowRanks: () => void;
  onShowChangelog: () => void;
  onChangeUsername: () => void;
  onShowLeaderboard: () => void;
  onShowProfile: () => void;
}

export default function MainMenu({
  username, onPlay, onPlayRanked, onShowRanks,
  onShowChangelog, onChangeUsername, onShowLeaderboard, onShowProfile,
}: Props) {
  const [showHow, setShowHow] = useState(false);
  const initial = username.charAt(0).toUpperCase();

  const myRP    = loadRP();
  const myRank  = getRankForRP(myRP);
  const prog    = getRPProgressInRank(myRP);
  const nextRank = ALL_RANKS[ALL_RANKS.indexOf(myRank) + 1] ?? null;

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="relative z-10 flex flex-col items-center gap-5 px-5 w-full max-w-lg py-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-white font-black text-5xl sm:text-6xl tracking-tight">
            Nova<span className="text-[#4af]">Ball</span>
          </h1>
          <p className="text-white/30 text-xs tracking-widest uppercase">Arcade Football</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/20" />
            <span className="text-white/28 text-[10px] tracking-[.14em] uppercase font-medium">
              {FOUNDING_DATE}
            </span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/20" />
          </div>
        </div>

        {/* Oyuncu kartı — tıklanınca profil açılır */}
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={onShowProfile}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 w-full hover:bg-white/8 hover:border-white/18 transition-all active:scale-[0.99] group text-left"
          >
            <div className="flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#e63535] to-[#c02020] flex items-center justify-center shadow-[0_0_16px_rgba(230,53,53,.35)]">
                <span className="text-white font-black text-lg">{initial}</span>
              </div>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-white/40 text-[10px] uppercase tracking-widest">Oyuncu</span>
              <span className="text-white font-bold text-lg truncate">{username}</span>
            </div>
            <div className="flex items-center gap-1 text-white/25 group-hover:text-white/55 transition-colors flex-shrink-0">
              <User size={14} />
              <span className="text-xs">Profil</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onChangeUsername(); }}
              className="ml-1 text-white/25 hover:text-white/60 transition-colors text-xs uppercase tracking-wider flex-shrink-0 py-1 px-2 rounded hover:bg-white/8"
            >
              Değiştir
            </button>
          </button>

          {/* Rank rozeti */}
          <button
            onClick={onShowRanks}
            className="flex items-center gap-3 bg-white/3 border rounded-xl px-4 py-3 w-full hover:bg-white/6 transition-all active:scale-[0.99] group text-left"
            style={{ borderColor: `${myRank.tier.color}35` }}
          >
            <span className="text-xl flex-shrink-0">{myRank.tier.icon}</span>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm" style={{ color: myRank.tier.color }}>{myRank.fullName}</span>
                <span className="text-white/30 text-xs">{myRP} RP</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${prog.percent * 100}%`,
                    background: `linear-gradient(90deg,${myRank.tier.color}70,${myRank.tier.color})`,
                  }}
                />
              </div>
              {nextRank && (
                <div className="flex justify-between mt-0.5">
                  <span className="text-white/20 text-[10px]">{prog.current}/{prog.total} RP</span>
                  <span className="text-white/20 text-[10px] group-hover:text-white/35 transition-colors">
                    Rank sayfası →
                  </span>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Butonlar */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onPlayRanked}
            className="novaball-btn-ranked w-full py-[18px] sm:py-5 rounded-2xl text-white font-black text-lg sm:text-xl tracking-wide transition-all active:scale-[0.97] flex items-center justify-center gap-3"
          >
            <span>🏅</span>
            <span>Rekabet Modu</span>
            <span className="text-sm font-bold opacity-70 ml-1">90s</span>
          </button>

          <button
            onClick={onPlay}
            className="novaball-btn-primary w-full py-4 rounded-2xl text-white font-bold text-base tracking-wide transition-all active:scale-[0.97]"
          >
            ⚽ Serbest Oyun
          </button>

          {/* Lider Tablosu */}
          <button
            onClick={onShowLeaderboard}
            className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl border border-[#facc15]/20 bg-[#facc15]/5 hover:bg-[#facc15]/10 hover:border-[#facc15]/35 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2.5">
              <Trophy size={18} className="text-[#facc15]" />
              <span className="text-white/70 font-bold text-base group-hover:text-white/90 transition-colors">
                Lider Tablosu
              </span>
            </div>
            <span className="text-white/25 text-xs group-hover:text-white/50 transition-colors">Top 100 →</span>
          </button>

          <button
            onClick={() => setShowHow(!showHow)}
            className="novaball-btn-secondary w-full py-3 rounded-2xl text-white/70 font-bold text-base tracking-wide transition-all active:scale-[0.97]"
          >
            {showHow ? "✕ Kapat" : "? Nasıl Oynanır"}
          </button>

          {/* Güncelleme Notları */}
          <button
            onClick={onShowChangelog}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-white/8 bg-white/2 hover:bg-white/5 hover:border-white/15 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">📋</span>
              <span className="text-white/55 font-semibold text-sm group-hover:text-white/80 transition-colors">
                Güncelleme Notları
              </span>
            </div>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-[#4ade80]/12 text-[#4ade80] tracking-wide">
              v{CHANGELOG[0].version}
            </span>
          </button>
        </div>

        {/* Nasıl oynanır paneli */}
        {showHow && (
          <div className="how-to-panel w-full rounded-2xl border border-white/10 bg-white/4 p-5 text-sm flex flex-col gap-4 animate-fade-in">
            <h3 className="text-white font-bold text-base">Kontroller</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ControlRow label="Hareket" keys={["W","A","S","D"]} />
              <ControlRow label="Şut" keys={["SPACE","X"]} />
              <ControlRow label="Depar" keys={["Sol ⇧"]} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/45 text-xs leading-relaxed border-t border-white/8 pt-3">
              <p>🔴 <strong className="text-white/65">Kırmızı (Sen)</strong> — Mavi kaleye (sağ) gol at.</p>
              <p>🔵 <strong className="text-white/65">Mavi (AI)</strong> — Kırmızı kaleyi (sol) hedefliyor.</p>
              <p>📱 <strong className="text-white/65">Mobil:</strong> Sol joystick hareket, sağ butonlar şut/depar.</p>
              <p>🏅 <strong className="text-white/65">Rekabet:</strong> 90 saniye, kazanırsan RP kazan.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ControlRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-white/40 text-[10px] uppercase tracking-wider">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {keys.map(k => (
          <span
            key={k}
            className="inline-flex items-center justify-center bg-white/10 border border-white/20 rounded text-white/80 text-xs font-mono font-bold px-2 py-1 min-w-8"
          >{k}</span>
        ))}
      </div>
    </div>
  );
}

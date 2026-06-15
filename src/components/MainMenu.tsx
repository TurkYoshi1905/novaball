import { useState } from "react";
import { Trophy, LogOut, Users, Zap, Star, Settings, Swords, Home } from "lucide-react";
import { FOUNDING_DATE } from "../types/game";
import { loadRP, getRankForRP, getRPProgressInRank, ALL_RANKS } from "../utils/rankSystem";
import CHANGELOG from "../utils/changelogData";
import HowToPlayModal from "./HowToPlayModal";

interface Props {
  username: string;
  displayName: string;
  onPlay: () => void;
  onMatchmaking: () => void;
  onCustomRooms: () => void;
  onShowRanks: () => void;
  onShowChangelog: () => void;
  onLogout: () => void;
  onShowLeaderboard: () => void;
  onShowProfile: () => void;
  onShowSettings: () => void;
}

export default function MainMenu({
  username, displayName, onPlay, onMatchmaking, onCustomRooms,
  onShowRanks, onShowChangelog, onLogout, onShowLeaderboard, onShowProfile, onShowSettings,
}: Props) {
  const [showHowTo,  setShowHowTo]  = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const initial = (displayName || username).charAt(0).toUpperCase();

  const myRP     = loadRP();
  const myRank   = getRankForRP(myRP);
  const prog     = getRPProgressInRank(myRP);
  const nextRank = ALL_RANKS[ALL_RANKS.indexOf(myRank) + 1] ?? null;
  const rankColor = myRank.tier.color;

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#040c1a 0%,#070d16 50%,#060b14 100%)" }}>

      {/* ── Background layers ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Field center circle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border"
          style={{ borderColor: "rgba(255,255,255,0.025)", opacity: 0.8 }} />
        {/* Field center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
          style={{ background: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.025) 30%,rgba(255,255,255,0.025) 70%,transparent)" }} />
        {/* Ambient glow center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(ellipse,rgba(26,92,255,0.07) 0%,transparent 70%)" }} />
        {/* Bottom green pitch glow */}
        <div className="absolute bottom-0 left-0 right-0 h-40"
          style={{ background: "linear-gradient(to top,rgba(34,197,94,0.04),transparent)" }} />
        {/* Top blue ambient */}
        <div className="absolute top-0 left-0 right-0 h-48"
          style={{ background: "linear-gradient(to bottom,rgba(26,92,255,0.06),transparent)" }} />
        {/* Orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      {/* ── TOP HEADER ────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-5 pb-3 flex-shrink-0">
        {/* Logo */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-0.5">
            <span className="text-white font-black text-2xl sm:text-3xl tracking-tight leading-none">Nova</span>
            <span className="font-black text-2xl sm:text-3xl tracking-tight leading-none" style={{ color: "#4aaeff" }}>Ball</span>
          </div>
          <span className="text-white/22 text-[8px] tracking-[.25em] uppercase font-bold mt-0.5 ml-0.5">Arcade Football</span>
        </div>

        {/* Player profile chip */}
        <div className="flex items-center gap-2">
          <button onClick={onShowProfile}
            className="flex items-center gap-2.5 pl-2 pr-3.5 py-2 rounded-2xl transition-all hover:bg-white/6 group"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
              style={{
                background: `linear-gradient(135deg,${rankColor}99,${rankColor}55)`,
                border: `1.5px solid ${rankColor}55`,
                boxShadow: `0 0 14px ${myRank.tier.glowColor}`,
              }}>
              {initial}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-white/90 font-bold text-[13px] leading-tight truncate max-w-[100px]">{displayName || username}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] leading-none">{myRank.tier.icon}</span>
                <span className="text-[10px] font-bold leading-none" style={{ color: rankColor }}>{myRank.fullName}</span>
              </div>
            </div>
          </button>
          <button onClick={onShowSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/38 hover:text-white/70 hover:bg-white/8 transition-all"
            title="Ayarlar">
            <Settings size={14} />
            <span className="text-xs font-bold hidden sm:inline">Ayarlar</span>
          </button>
          <button onClick={() => setShowLogout(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/28 hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all"
            title="Çıkış Yap">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 sm:px-10 pb-5 gap-5">

        {/* ── RANK PROGRESS STRIP ──────────────────────────── */}
        <button onClick={onShowRanks}
          className="w-full max-w-xl rounded-2xl px-5 py-3.5 flex items-center gap-4 transition-all hover:bg-white/3 group"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-2xl leading-none">{myRank.tier.icon}</span>
            <div>
              <p className="font-black text-sm leading-tight" style={{ color: rankColor }}>{myRank.fullName}</p>
              <p className="text-white/35 text-[11px]">{myRP} RP</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${prog.percent * 100}%`,
                  background: `linear-gradient(90deg,${rankColor}60,${rankColor})`,
                  boxShadow: `0 0 8px ${myRank.tier.glowColor}`,
                }} />
            </div>
            {nextRank ? (
              <div className="flex justify-between">
                <span className="text-white/25 text-[10px]">{prog.current} / {prog.total} RP</span>
                <span className="text-white/25 text-[10px] group-hover:text-white/45 transition-colors">{nextRank.fullName} →</span>
              </div>
            ) : (
              <p className="text-white/25 text-[10px]">Maksimum rank</p>
            )}
          </div>
        </button>

        {/* ── HERO CTA: MAÇA GİR ───────────────────────────── */}
        <button onClick={onMatchmaking}
          className="w-full max-w-xl relative overflow-hidden rounded-3xl text-white font-black transition-all active:scale-[0.98] group"
          style={{
            padding: "28px 32px",
            background: "linear-gradient(135deg,#1450e8 0%,#0a35b8 40%,#1144dd 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.12) inset, 0 16px 50px rgba(20,80,232,0.55), 0 4px 12px rgba(0,0,0,0.4)",
          }}>
          {/* Animated top shine */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)" }} />
          {/* Hover shimmer */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.1) 0%,transparent 60%)" }} />
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ boxShadow: "0 0 0 3px rgba(68,140,255,0.35)" }} />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <Swords size={22} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[22px] sm:text-[26px] font-black leading-tight tracking-wide">Maça Gir</p>
                <p className="text-blue-200/60 text-sm font-semibold">Ranked · 1v1 — 5v5</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.12)" }}>
                <Zap size={13} className="text-[#7dd3fc]" fill="#7dd3fc" />
                <span className="text-white/80 text-xs font-bold">RANKED</span>
              </div>
            </div>
          </div>
        </button>

        {/* ── GAME MODE CARDS ─────────────────────────────────── */}
        <div className="w-full max-w-xl grid grid-cols-2 gap-3">

          {/* Özel Oda */}
          <button onClick={onCustomRooms}
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 transition-all active:scale-[0.97] group text-left"
            style={{
              background: "linear-gradient(135deg,rgba(139,92,246,0.15) 0%,rgba(109,60,220,0.07) 100%)",
              border: "1px solid rgba(139,92,246,0.3)",
              boxShadow: "0 4px 20px rgba(139,92,246,0.1)",
            }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(167,139,250,0.4),transparent)" }} />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.08),transparent)" }} />
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)" }}>
              🏟️
            </div>
            <div className="relative">
              <p className="text-white font-black text-base leading-tight">Özel Oda</p>
              <p className="text-[#b09fff]/70 text-[11px] font-medium mt-0.5">Arkadaşlarınla</p>
            </div>
          </button>

          {/* Serbest Oyun */}
          <button onClick={onPlay}
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 transition-all active:scale-[0.97] group text-left"
            style={{
              background: "linear-gradient(135deg,rgba(34,197,94,0.1) 0%,rgba(16,185,129,0.05) 100%)",
              border: "1px solid rgba(34,197,94,0.22)",
              boxShadow: "0 4px 20px rgba(34,197,94,0.07)",
            }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(74,222,128,0.4),transparent)" }} />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.07),transparent)" }} />
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
              ⚽
            </div>
            <div className="relative">
              <p className="text-white font-black text-base leading-tight">Serbest Oyun</p>
              <p className="text-[#4ade80]/60 text-[11px] font-medium mt-0.5">AI ile pratik</p>
            </div>
          </button>
        </div>

        {/* ── LEADERBOARD BANNER ─────────────────────────────── */}
        <button onClick={onShowLeaderboard}
          className="w-full max-w-xl relative overflow-hidden rounded-2xl px-5 py-4 flex items-center gap-4 transition-all active:scale-[0.98] group"
          style={{
            background: "linear-gradient(135deg,rgba(250,204,21,0.1) 0%,rgba(234,179,8,0.04) 100%)",
            border: "1px solid rgba(250,204,21,0.22)",
            boxShadow: "0 4px 20px rgba(250,204,21,0.07)",
          }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(250,204,21,0.45),transparent)" }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "linear-gradient(135deg,rgba(250,204,21,0.06),transparent)" }} />
          <div className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)" }}>
            <Trophy size={20} className="text-[#facc15]" />
          </div>
          <div className="relative flex flex-col flex-1 text-left min-w-0">
            <p className="text-white/90 font-black text-base group-hover:text-white transition-colors">Lider Tablosu</p>
            <p className="text-white/35 text-[11px] font-medium">En iyi oyuncuları gör</p>
          </div>
          <div className="relative flex items-center gap-1.5 flex-shrink-0">
            <Star size={12} fill="#facc15" className="text-[#facc15]" />
            <Star size={12} fill="#facc15" className="text-[#facc15]" />
            <Star size={12} fill="#facc15" className="text-[#facc15]" />
            <span className="text-white/30 text-[11px] font-bold ml-1 group-hover:text-white/55 transition-colors">Top 100 →</span>
          </div>
        </button>

        {/* ── FOOTER ROW ─────────────────────────────────────── */}
        <div className="w-full max-w-xl flex items-center gap-2">
          <button onClick={() => setShowHowTo(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white/45 font-bold text-sm transition-all hover:text-white/70 hover:bg-white/5 active:scale-[0.97]"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-base">❓</span>
            <span>Nasıl Oynanır</span>
          </button>

          <button onClick={onShowChangelog}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl transition-all hover:bg-white/5 active:scale-[0.98]"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <Home size={13} className="text-white/30" />
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
              style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}>
              v{CHANGELOG[0].version}
            </span>
          </button>

          <div className="flex flex-col items-end">
            <span className="text-white/14 text-[9px] tracking-wider uppercase">{FOUNDING_DATE}</span>
          </div>
        </div>

      </main>

      {/* ── HOW TO PLAY MODAL ─────────────────────────────── */}
      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}

      {/* ── LOGOUT CONFIRM MODAL ──────────────────────────── */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5"
          style={{ backdropFilter: "blur(14px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowLogout(false); }}>
          <div className="w-full max-w-xs rounded-3xl p-6 flex flex-col gap-5"
            style={{
              background: "linear-gradient(160deg,rgba(15,25,50,0.98),rgba(7,13,22,0.99))",
              border: "1px solid rgba(248,113,113,0.18)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
            }}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-1"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                👋
              </div>
              <h3 className="text-white font-black text-xl">Çıkış Yap</h3>
              <p className="text-white/45 text-sm leading-relaxed">Hesabından çıkmak istediğine emin misin?</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setShowLogout(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white/55 hover:text-white/80 transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
                İptal
              </button>
              <button onClick={() => { setShowLogout(false); onLogout(); }}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-[#f87171] transition-all hover:bg-[#f87171]/15"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}>
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

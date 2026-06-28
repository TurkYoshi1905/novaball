import { useState } from "react";
import { Trophy, LogOut, Users, Zap, Star, Settings, Swords, HelpCircle, ScrollText, MessageSquarePlus } from "lucide-react";
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
  onShowReviews: () => void;
}

export default function MainMenu({
  username, displayName, onPlay, onMatchmaking, onCustomRooms,
  onShowRanks, onShowChangelog, onLogout, onShowLeaderboard, onShowProfile, onShowSettings, onShowReviews,
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
      style={{ background: "linear-gradient(160deg,#071628 0%,#0a1424 50%,#071620 100%)" }}>

      {/* ── Background ──────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Bright center glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[560px] rounded-full"
          style={{ background: "radial-gradient(ellipse,rgba(26,92,255,0.22) 0%,transparent 65%)" }} />
        {/* Field circle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full border"
          style={{ borderColor: "rgba(68,150,255,0.14)" }} />
        {/* Field center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
          style={{ background: "linear-gradient(to bottom,transparent,rgba(68,150,255,0.12) 25%,rgba(68,150,255,0.12) 75%,transparent)" }} />
        {/* Green pitch bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-56"
          style={{ background: "linear-gradient(to top,rgba(34,197,94,0.1),transparent)" }} />
        {/* Blue top ambient */}
        <div className="absolute top-0 left-0 right-0 h-64"
          style={{ background: "linear-gradient(to bottom,rgba(26,92,255,0.15),transparent)" }} />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-10 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Logo */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-0.5">
            <span className="text-white font-black text-2xl sm:text-3xl tracking-tight leading-none">Nova</span>
            <span className="font-black text-2xl sm:text-3xl tracking-tight leading-none" style={{ color: "#4aaeff" }}>Ball</span>
          </div>
          <span className="text-[#4af]/50 text-[9px] tracking-[.22em] uppercase font-bold mt-0.5 ml-0.5">Arcade Football</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {/* Profile chip */}
          <button onClick={onShowProfile}
            className="flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-2xl transition-all group"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
              style={{
                background: `linear-gradient(135deg,${rankColor}cc,${rankColor}66)`,
                border: `2px solid ${rankColor}88`,
                boxShadow: `0 0 16px ${myRank.tier.glowColor}`,
              }}>
              {initial}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-white font-bold text-[13px] leading-tight truncate max-w-[110px]">{displayName || username}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] leading-none">{myRank.tier.icon}</span>
                <span className="text-[11px] font-bold leading-none" style={{ color: rankColor }}>{myRank.fullName}</span>
              </div>
            </div>
          </button>

          {/* Settings */}
          <button onClick={onShowSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-bold text-xs"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)", color: "rgba(255,255,255,0.65)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.95)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}>
            <Settings size={14} />
            <span className="hidden sm:inline">Ayarlar</span>
          </button>

          {/* Logout */}
          <button onClick={() => setShowLogout(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.12)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            title="Çıkış Yap">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 sm:px-10 pb-5 gap-4">

        {/* ── RANK STRIP ──────────────────────────────────────── */}
        <button onClick={onShowRanks}
          className="w-full max-w-xl rounded-2xl px-5 py-4 flex items-center gap-4 transition-all group"
          style={{
            background: "rgba(255,255,255,0.09)",
            border: "1px solid rgba(255,255,255,0.20)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}>

          {/* Rank badge */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
              style={{
                background: `${rankColor}20`,
                border: `1.5px solid ${rankColor}55`,
                boxShadow: `0 0 16px ${myRank.tier.glowColor}`,
              }}>
              {myRank.tier.icon}
            </div>
            <div>
              <p className="font-black text-sm leading-tight" style={{ color: rankColor }}>{myRank.fullName}</p>
              <p className="text-white/55 text-[11px] font-semibold">{myRP} RP</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${prog.percent * 100}%`,
                  background: `linear-gradient(90deg,${rankColor}70,${rankColor})`,
                  boxShadow: `0 0 10px ${myRank.tier.glowColor}`,
                }} />
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 text-[10px] font-semibold">{prog.current} / {prog.total} RP</span>
              {nextRank
                ? <span className="text-white/45 text-[10px] font-semibold group-hover:text-white/70 transition-colors">{nextRank.fullName} →</span>
                : <span className="text-white/45 text-[10px]">Maksimum rank</span>
              }
            </div>
          </div>
        </button>

        {/* ── MAÇA GİR HERO ─────────────────────────────────── */}
        <button onClick={onMatchmaking}
          className="w-full max-w-xl relative overflow-hidden rounded-3xl text-white font-black transition-all active:scale-[0.98] group"
          style={{
            padding: "26px 28px",
            background: "linear-gradient(135deg,#1a5cff 0%,#0a38d4 45%,#1248e8 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.15) inset, 0 18px 60px rgba(26,92,255,0.65), 0 6px 20px rgba(0,0,0,0.4)",
          }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)" }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.12) 0%,transparent 55%)" }} />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.28)" }}>
                <Swords size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[24px] sm:text-[28px] font-black leading-tight tracking-wide">Maça Gir</p>
                <p className="text-blue-100/75 text-sm font-semibold mt-0.5">Ranked · 1v1 — 5v5</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.22)" }}>
                <Zap size={13} className="text-[#93c5fd]" fill="#93c5fd" />
                <span className="text-white font-black text-xs">RANKED</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <Users size={11} className="text-blue-200/80" />
                <span className="text-blue-100/80 font-bold text-xs">1v1–5v5</span>
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
              background: "linear-gradient(135deg,rgba(139,92,246,0.28) 0%,rgba(109,60,220,0.16) 100%)",
              border: "1.5px solid rgba(139,92,246,0.55)",
              boxShadow: "0 4px 28px rgba(139,92,246,0.25)",
            }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(167,139,250,0.6),transparent)" }} />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.12),transparent)" }} />
            <div className="relative w-11 h-11 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "rgba(139,92,246,0.28)", border: "1.5px solid rgba(139,92,246,0.5)" }}>
              🏟️
            </div>
            <div className="relative">
              <p className="text-white font-black text-[15px] leading-tight">Özel Oda</p>
              <p className="text-[#c4b5fd] text-[12px] font-semibold mt-0.5">Arkadaşlarınla oyna</p>
            </div>
          </button>

          {/* Serbest Oyun */}
          <button onClick={onPlay}
            className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 transition-all active:scale-[0.97] group text-left"
            style={{
              background: "linear-gradient(135deg,rgba(34,197,94,0.22) 0%,rgba(16,185,129,0.12) 100%)",
              border: "1.5px solid rgba(34,197,94,0.50)",
              boxShadow: "0 4px 28px rgba(34,197,94,0.18)",
            }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(74,222,128,0.6),transparent)" }} />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.1),transparent)" }} />
            <div className="relative w-11 h-11 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "rgba(34,197,94,0.22)", border: "1.5px solid rgba(74,222,128,0.45)" }}>
              ⚽
            </div>
            <div className="relative">
              <p className="text-white font-black text-[15px] leading-tight">Serbest Oyun</p>
              <p className="text-[#86efac] text-[12px] font-semibold mt-0.5">AI ile pratik yap</p>
            </div>
          </button>
        </div>

        {/* ── LEADERBOARD ─────────────────────────────────────── */}
        <button onClick={onShowLeaderboard}
          className="w-full max-w-xl relative overflow-hidden rounded-2xl px-5 py-4 flex items-center gap-4 transition-all active:scale-[0.98] group"
          style={{
            background: "linear-gradient(135deg,rgba(250,204,21,0.20) 0%,rgba(234,179,8,0.10) 100%)",
            border: "1.5px solid rgba(250,204,21,0.48)",
            boxShadow: "0 4px 28px rgba(250,204,21,0.18)",
          }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(250,204,21,0.65),transparent)" }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "linear-gradient(135deg,rgba(250,204,21,0.08),transparent)" }} />
          <div className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(250,204,21,0.2)", border: "1.5px solid rgba(250,204,21,0.42)" }}>
            <Trophy size={20} className="text-[#facc15]" />
          </div>
          <div className="relative flex flex-col flex-1 text-left min-w-0">
            <p className="text-white font-black text-[15px] group-hover:text-white transition-colors">Lider Tablosu</p>
            <p className="text-white/70 text-[12px] font-semibold">En iyi oyuncuları gör</p>
          </div>
          <div className="relative flex items-center gap-1.5 flex-shrink-0">
            <Star size={12} fill="#facc15" className="text-[#facc15]" />
            <Star size={12} fill="#facc15" className="text-[#facc15]" />
            <Star size={12} fill="#facc15" className="text-[#facc15]" />
            <span className="text-white/55 text-[11px] font-bold ml-1 group-hover:text-white/80 transition-colors">Top 100 →</span>
          </div>
        </button>

        {/* ── Yorum & Değerlendirme ──────────────────────────── */}
        <button
          onClick={onShowReviews}
          className="group relative w-full max-w-xl flex items-center gap-4 px-5 py-4 rounded-2xl transition-all active:scale-[0.98] text-left overflow-hidden"
          style={{
            background: "linear-gradient(135deg,rgba(167,139,250,0.14),rgba(139,92,246,0.08))",
            border: "1px solid rgba(167,139,250,0.32)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(167,139,250,0.55)"; (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(167,139,250,0.20),rgba(139,92,246,0.13))"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(167,139,250,0.32)"; (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(167,139,250,0.14),rgba(139,92,246,0.08))"; }}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "linear-gradient(135deg,rgba(167,139,250,0.06),transparent)" }} />
          <div className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(167,139,250,0.18)", border: "1.5px solid rgba(167,139,250,0.38)" }}>
            <MessageSquarePlus size={20} className="text-[#a78bfa]" />
          </div>
          <div className="relative flex flex-col flex-1 text-left min-w-0">
            <p className="text-white font-black text-[15px] group-hover:text-white transition-colors">Yorum Yap & Değerlendir</p>
            <p className="text-white/70 text-[12px] font-semibold">Toplulukla görüşlerini paylaş</p>
          </div>
          <div className="relative flex items-center gap-1 flex-shrink-0">
            {[1,2,3,4,5].map(i => (
              <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="#a78bfa" className="opacity-70"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ))}
            <span className="text-white/40 text-[11px] font-bold ml-1 group-hover:text-white/70 transition-colors">→</span>
          </div>
        </button>

        {/* ── FOOTER ROW ──────────────────────────────────────── */}
        <div className="w-full max-w-xl flex items-center gap-2">
          <button onClick={() => setShowHowTo(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]"
            style={{
              color: "rgba(255,255,255,0.65)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}>
            <HelpCircle size={15} />
            <span>Nasıl Oynanır</span>
          </button>

          <button onClick={onShowChangelog}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}>
            <ScrollText size={13} className="text-white/50" />
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
              style={{ background: "rgba(74,222,128,0.18)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
              v{CHANGELOG[0].version}
            </span>
          </button>

          <div className="px-2">
            <span className="text-white/28 text-[9px] tracking-wider uppercase font-semibold">{FOUNDING_DATE}</span>
          </div>
        </div>

      </main>

      {/* ── HOW TO PLAY MODAL ─────────────────────────────── */}
      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}

      {/* ── LOGOUT MODAL ──────────────────────────────────── */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-5"
          style={{ backdropFilter: "blur(16px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowLogout(false); }}>
          <div className="w-full max-w-xs rounded-3xl p-6 flex flex-col gap-5"
            style={{
              background: "linear-gradient(160deg,rgba(15,25,52,0.99),rgba(8,14,26,0.99))",
              border: "1px solid rgba(248,113,113,0.22)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset",
            }}>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-1"
                style={{ background: "rgba(248,113,113,0.14)", border: "1.5px solid rgba(248,113,113,0.28)" }}>
                👋
              </div>
              <h3 className="text-white font-black text-xl">Çıkış Yap</h3>
              <p className="text-white/55 text-sm leading-relaxed">Hesabından çıkmak istediğine emin misin?</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setShowLogout(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white/65 hover:text-white/90 transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)" }}>
                İptal
              </button>
              <button onClick={() => { setShowLogout(false); onLogout(); }}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-[#fca5a5] transition-all hover:bg-[#f87171]/18"
                style={{ background: "rgba(248,113,113,0.12)", border: "1.5px solid rgba(248,113,113,0.35)" }}>
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

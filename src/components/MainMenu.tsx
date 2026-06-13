import { useState } from "react";
import { Trophy, LogOut, Users, Zap, Star } from "lucide-react";
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
}

export default function MainMenu({
  username, displayName, onPlay, onMatchmaking, onCustomRooms,
  onShowRanks, onShowChangelog, onLogout, onShowLeaderboard, onShowProfile,
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
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      {/* Background ambient */}
      <div className="pitch-glow" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Football field ambient lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.028]">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white transform -translate-x-1/2" />
        <div className="absolute left-1/2 top-1/2 w-32 h-32 rounded-full border border-white transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 px-4 w-full max-w-[420px] py-6">

        {/* ── Logo ──────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-0.5 mb-1">
          <div className="flex items-center gap-0">
            <span className="text-white font-black text-5xl sm:text-6xl tracking-tight leading-none">Nova</span>
            <span className="font-black text-5xl sm:text-6xl tracking-tight leading-none" style={{ color: "#4aaeff" }}>Ball</span>
          </div>
          <p className="text-white/28 text-[10px] tracking-[.22em] uppercase font-semibold">Arcade Football</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-white/15" />
            <span className="text-white/20 text-[9px] tracking-[.12em] uppercase">{FOUNDING_DATE}</span>
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-white/15" />
          </div>
        </div>

        {/* ── Oyuncu Kartı ──────────────────────────────────────── */}
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Üst: Avatar + isim + çıkış */}
          <button
            onClick={onShowProfile}
            className="w-full flex items-center gap-3 px-4 pt-4 pb-3 hover:bg-white/3 transition-all text-left group"
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-black text-lg text-white"
              style={{
                background: `linear-gradient(135deg,${rankColor}90,${rankColor}40)`,
                border: `1.5px solid ${rankColor}55`,
                boxShadow: `0 0 20px ${myRank.tier.glowColor}`,
              }}
            >
              {initial}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-white font-bold text-[15px] leading-tight truncate">{displayName || username}</span>
              <span className="text-white/30 text-[11px]">@{username}</span>
            </div>
            <span className="text-white/20 text-[11px] group-hover:text-white/45 transition-colors mr-1">Profil →</span>
            <button
              onClick={e => { e.stopPropagation(); setShowLogout(true); }}
              className="p-1.5 rounded-lg text-white/18 hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all flex-shrink-0"
              title="Çıkış Yap"
            >
              <LogOut size={13} />
            </button>
          </button>

          {/* Alt: Rank bilgisi */}
          <button
            onClick={onShowRanks}
            className="w-full px-4 pb-4 flex flex-col gap-2 hover:bg-white/2 transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{myRank.tier.icon}</span>
                <span className="font-black text-sm" style={{ color: rankColor }}>{myRank.fullName}</span>
              </div>
              <span className="text-white/28 text-xs">{myRP} RP</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${prog.percent * 100}%`,
                  background: `linear-gradient(90deg,${rankColor}60,${rankColor})`,
                  boxShadow: `0 0 6px ${myRank.tier.glowColor}`,
                }}
              />
            </div>
            {nextRank && (
              <div className="flex justify-between">
                <span className="text-white/18 text-[10px]">{prog.current}/{prog.total} RP</span>
                <span className="text-white/18 text-[10px] group-hover:text-white/35 transition-colors">Rank sayfası →</span>
              </div>
            )}
          </button>
        </div>

        {/* ── Ana CTA: Maça Gir ─────────────────────────────────── */}
        <button
          onClick={onMatchmaking}
          className="w-full relative overflow-hidden rounded-2xl text-white font-black text-lg tracking-wide transition-all active:scale-[0.97] group"
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg,#1a5cff 0%,#0d3ccc 50%,#1144ee 100%)",
            boxShadow: "0 8px 32px rgba(26,92,255,0.40), 0 0 0 1px rgba(255,255,255,0.10) inset",
          }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/12 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-center gap-3">
            <Zap size={20} className="text-[#7dd3fc]" fill="#7dd3fc" />
            <span className="text-[18px]">Maça Gir</span>
            <div className="flex items-center gap-1.5 ml-1">
              <Users size={14} className="text-blue-300/70" />
              <span className="text-sm font-bold text-blue-200/60">1v1–5v5</span>
            </div>
          </div>
        </button>

        {/* ── İkincil Butonlar ──────────────────────────────────── */}
        <div className="w-full grid grid-cols-2 gap-2.5">
          <button
            onClick={onCustomRooms}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-bold transition-all active:scale-[0.97] group"
            style={{
              background: "rgba(167,139,250,0.08)",
              border: "1px solid rgba(167,139,250,0.22)",
            }}
          >
            <span className="text-xl">🏟️</span>
            <span className="text-[#b09fff] text-sm font-bold">Özel Oda</span>
            <span className="text-white/20 text-[10px]">Arkadaşlarınla</span>
          </button>

          <button
            onClick={onPlay}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl font-bold transition-all active:scale-[0.97] group"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <span className="text-xl">⚽</span>
            <span className="text-white/65 text-sm font-bold">Serbest Oyun</span>
            <span className="text-white/20 text-[10px]">AI ile pratik</span>
          </button>
        </div>

        {/* ── Lider Tablosu ─────────────────────────────────────── */}
        <button
          onClick={onShowLeaderboard}
          className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all active:scale-[0.98] group"
          style={{
            background: "rgba(250,204,21,0.05)",
            border: "1px solid rgba(250,204,21,0.18)",
          }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(250,204,21,0.12)" }}>
            <Trophy size={16} className="text-[#facc15]" />
          </div>
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <span className="text-white/80 font-bold text-sm group-hover:text-white/95 transition-colors">Lider Tablosu</span>
            <span className="text-white/28 text-[10px]">En iyi oyuncular</span>
          </div>
          <div className="flex items-center gap-1">
            <Star size={11} className="text-[#facc15]/60" fill="#facc15" style={{ opacity: 0.5 }} />
            <span className="text-white/22 text-[11px] group-hover:text-white/45 transition-colors">Top 100 →</span>
          </div>
        </button>

        {/* ── Alt butonlar: Nasıl Oynanır + Güncelleme ────────── */}
        <div className="w-full flex gap-2">
          <button
            onClick={() => setShowHowTo(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white/55 font-bold text-sm transition-all active:scale-[0.97] hover:text-white/80 hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="text-base">❓</span>
            <span>Nasıl Oynanır</span>
          </button>

          <button
            onClick={onShowChangelog}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl transition-all active:scale-[0.98] hover:bg-white/4 group"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="text-base">📋</span>
            <span
              className="text-[11px] font-black px-2 py-0.5 rounded-full"
              style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80" }}
            >
              v{CHANGELOG[0].version}
            </span>
          </button>
        </div>

      </div>

      {/* ── Nasıl Oynanır Modalı ──────────────────────────────── */}
      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}

      {/* ── Çıkış Onay Modalı ─────────────────────────────────── */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" style={{ backdropFilter: "blur(10px)" }}>
          <div
            className="w-full max-w-xs rounded-2xl p-6 flex flex-col gap-4 animate-fade-in"
            style={{
              background: "linear-gradient(160deg,#0d1828,#070d16)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            }}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-1" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                👋
              </div>
              <h3 className="text-white font-black text-xl">Çıkış Yap</h3>
              <p className="text-white/38 text-sm">Hesabından çıkmak istediğine emin misin?</p>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white/55 hover:text-white/80 transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}
              >
                İptal
              </button>
              <button
                onClick={() => { setShowLogout(false); onLogout(); }}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-[#f87171] hover:bg-[#f87171]/20 transition-all"
                style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)" }}
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

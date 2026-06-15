import { useState } from "react";
import {
  ChevronLeft, Shield, Zap, TrendingUp, Trophy, Target,
  ArrowUp, CheckCircle2, Swords, Crown, BarChart3, Star,
  Lock, ChevronRight, Flame, Award, Info,
} from "lucide-react";
import { ALL_RANKS, RANK_TIERS, getRankForRP, getRPProgressInRank, loadRP } from "../utils/rankSystem";

interface Props {
  onBack: () => void;
}

const RP_TABLE = [
  { goals: 1, rp: 10 },
  { goals: 2, rp: 14 },
  { goals: 3, rp: 18 },
  { goals: 4, rp: 22 },
  { goals: 5, rp: 25, plus: true },
];

const RULES = [
  {
    icon: <Zap size={18} />,
    title: "RP Kazan",
    desc: "Maçı kazanırsan gol sayına göre +10 ile +25 RP arasında puan alırsın.",
    color: "#4aaeff",
    bg: "rgba(68,170,255,0.1)",
    border: "rgba(68,170,255,0.28)",
  },
  {
    icon: <Shield size={18} />,
    title: "Yenilgide Kayıp Yok",
    desc: "Kaybetsen bile RP düşmez. Sadece kazanarak yükselirsin.",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.28)",
  },
  {
    icon: <ArrowUp size={18} />,
    title: "Rank Atla",
    desc: "Yeterli RP topladığında otomatik olarak bir üst ranka çıkarsın.",
    color: "#facc15",
    bg: "rgba(250,204,21,0.1)",
    border: "rgba(250,204,21,0.28)",
  },
];

/* Tier'e özel lucide ikon */
function TierIcon({ tierId, size = 18 }: { tierId: string; size?: number }) {
  const map: Record<string, React.ReactNode> = {
    demir:  <Shield size={size} />,
    bronz:  <Award size={size} />,
    gumus:  <Star size={size} />,
    altin:  <Trophy size={size} />,
    platin: <Flame size={size} />,
    elmas:  <Zap size={size} />,
    usta:   <Crown size={size} />,
  };
  return <>{map[tierId] ?? <Target size={size} />}</>;
}

export default function RankPage({ onBack }: Props) {
  const myRP    = loadRP();
  const myRank  = getRankForRP(myRP);
  const prog    = getRPProgressInRank(myRP);
  const nextRank = ALL_RANKS[ALL_RANKS.indexOf(myRank) + 1] ?? null;
  const [expandedTier, setExpandedTier] = useState<string | null>(myRank.tier.id);

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#060f22 0%,#080f1c 50%,#06101a 100%)" }}>

      {/* ── Background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[450px]"
          style={{ background: `radial-gradient(ellipse,${myRank.tier.glowColor.replace("0.4","0.12")} 0%,transparent 65%)` }} />
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
            <BarChart3 size={20} className="text-[#4aaeff] flex-shrink-0" />
            <h1 className="text-white font-black text-xl sm:text-2xl leading-none">Rank Sistemi</h1>
          </div>
          <p className="text-white/35 text-[11px] uppercase tracking-widest font-semibold mt-0.5">NovaBall Rekabet Modu</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: "rgba(68,170,255,0.1)", border: "1px solid rgba(68,170,255,0.25)" }}>
          <Swords size={13} className="text-[#4aaeff]" />
          <span className="text-[#4aaeff] text-xs font-bold">RANKED</span>
        </div>
      </header>

      {/* ── SCROLL AREA ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-6 pb-12">

          {/* ── MY RANK HERO ──────────────────────────────────────── */}
          <div className="rounded-3xl overflow-hidden relative"
            style={{
              background: `linear-gradient(135deg,${myRank.tier.color}18,${myRank.tier.color}08)`,
              border: `1.5px solid ${myRank.tier.color}50`,
              boxShadow: `0 8px 40px ${myRank.tier.glowColor}`,
            }}>
            {/* Top shine */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg,transparent,${myRank.tier.color}cc,transparent)` }} />
            {/* Glow spot */}
            <div className="absolute right-0 top-0 w-48 h-48 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at top right,${myRank.tier.color}18,transparent 70%)` }} />

            <div className="p-5 sm:p-6 flex flex-col gap-5">
              {/* Top row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Big icon */}
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg,${myRank.tier.color}40,${myRank.tier.color}18)`,
                      border: `2px solid ${myRank.tier.color}60`,
                      boxShadow: `0 0 28px ${myRank.tier.glowColor}`,
                    }}>
                    <span className="text-3xl leading-none">{myRank.tier.icon}</span>
                  </div>
                  <div>
                    <p className="text-white/45 text-xs uppercase tracking-widest font-semibold mb-0.5">Mevcut Rankın</p>
                    <p className="font-black text-2xl sm:text-3xl leading-tight" style={{ color: myRank.tier.color }}>
                      {myRank.fullName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <TierIcon tierId={myRank.tier.id} size={12} />
                      <span className="text-white/40 text-xs font-semibold">{myRank.tier.name} kademesi</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white/35 text-xs uppercase tracking-wider font-semibold">Toplam RP</p>
                  <p className="text-white font-black text-3xl sm:text-4xl leading-tight">{myRP}</p>
                  <p className="text-white/30 text-xs font-semibold">puan</p>
                </div>
              </div>

              {/* Progress */}
              <div className="flex flex-col gap-2">
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${prog.percent * 100}%`,
                      background: `linear-gradient(90deg,${myRank.tier.color}70,${myRank.tier.color})`,
                      boxShadow: `0 0 12px ${myRank.tier.glowColor}`,
                    }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/45 text-xs font-semibold">{prog.current} / {prog.total} RP</span>
                  {nextRank ? (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-white/35" />
                      <span className="text-white/45 text-xs font-semibold">Sonraki: {nextRank.fullName}</span>
                      <span className="text-xs font-bold" style={{ color: myRank.tier.color }}>
                        ({nextRank.minRP - myRP} RP kaldı)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Crown size={12} className="text-[#facc15]" />
                      <span className="text-[#facc15] text-xs font-bold">Maksimum Rank</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── KURALLAR ──────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info size={14} className="text-white/40" />
              <span className="text-white/45 text-xs font-bold uppercase tracking-wider">Sistem Kuralları</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {RULES.map(r => (
                <div key={r.title}
                  className="flex flex-col gap-3 p-4 rounded-2xl relative overflow-hidden"
                  style={{ background: r.bg, border: `1px solid ${r.border}` }}>
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg,transparent,${r.color}80,transparent)` }} />
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${r.color}18`, border: `1px solid ${r.border}`, color: r.color }}>
                    {r.icon}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: r.color }}>{r.title}</p>
                    <p className="text-white/55 text-xs leading-relaxed mt-0.5">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RP KAZANMA TABLOSU ────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-[#4aaeff]" />
              <span className="text-white/45 text-xs font-bold uppercase tracking-wider">Kazanma Bonusu</span>
              <span className="text-white/25 text-xs font-semibold ml-auto">Sadece kazanınca geçerli</span>
            </div>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {RP_TABLE.map((row, i) => {
                const barWidth = (row.rp / 25) * 100;
                const isLast = i === RP_TABLE.length - 1;
                return (
                  <div key={row.goals}
                    className="flex items-center gap-4 px-4 sm:px-5 py-3.5"
                    style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                    {/* Goal count */}
                    <div className="flex items-center gap-2 w-20 sm:w-24 flex-shrink-0">
                      <span className="text-base leading-none">⚽</span>
                      <span className="text-white/65 font-semibold text-sm">
                        {row.goals}{row.plus ? "+" : ""} Gol
                      </span>
                    </div>
                    {/* Bar */}
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${barWidth}%`,
                          background: `linear-gradient(90deg,rgba(68,170,255,0.6),#4aaeff)`,
                          boxShadow: "0 0 8px rgba(68,170,255,0.4)",
                        }} />
                    </div>
                    {/* RP badge */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-black text-base" style={{ color: "#4aaeff" }}>+{row.rp}</span>
                      <span className="text-white/35 text-xs font-semibold">RP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RANK TIER LİSTESİ ─────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-white/40" />
              <span className="text-white/45 text-xs font-bold uppercase tracking-wider">Rank Kademeleri</span>
              <span className="text-white/25 text-xs font-semibold ml-auto">7 kademe · 19 seviye</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {RANK_TIERS.map((tier, tIdx) => {
                const tierRanks  = ALL_RANKS.filter(r => r.tier.id === tier.id);
                const isMyTier   = myRank.tier.id === tier.id;
                const isExpanded = expandedTier === tier.id;
                const isLocked   = tierRanks[0].minRP > myRP;

                return (
                  <div key={tier.id}
                    className="rounded-2xl overflow-hidden transition-all"
                    style={{
                      background: isMyTier ? `${tier.color}10` : "rgba(255,255,255,0.04)",
                      border: isMyTier ? `1.5px solid ${tier.color}50` : "1px solid rgba(255,255,255,0.09)",
                      boxShadow: isMyTier ? `0 4px 28px ${tier.glowColor}` : "none",
                    }}>

                    {/* ── Tier header (clickable) ── */}
                    <button className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all group"
                      onClick={() => setExpandedTier(isExpanded ? null : tier.id)}>

                      {/* Icon circle */}
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                        style={isMyTier ? {
                          background: `linear-gradient(135deg,${tier.color}40,${tier.color}18)`,
                          border: `2px solid ${tier.color}55`,
                          boxShadow: `0 0 18px ${tier.glowColor}`,
                        } : {
                          background: `${tier.color}14`,
                          border: `1px solid ${tier.color}30`,
                        }}>
                        {tier.icon}
                      </div>

                      {/* Name + sub-info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-base sm:text-lg" style={{ color: tier.color }}>
                            {tier.name}
                          </span>
                          {isMyTier && (
                            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: `${tier.color}22`, color: tier.color, border: `1px solid ${tier.color}40` }}>
                              <Target size={9} /> Mevcut Rank
                            </span>
                          )}
                          {isLocked && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                              <Lock size={9} /> Kilitli
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span style={{ color: `${tier.color}80` }}>
                            <TierIcon tierId={tier.id} size={11} />
                          </span>
                          <span className="text-white/35 text-xs font-semibold">
                            {tierRanks[0].minRP}
                            {tierRanks[tierRanks.length - 1].maxRP !== null
                              ? ` – ${tierRanks[tierRanks.length - 1].maxRP}`
                              : "+"} RP
                          </span>
                          <span className="text-white/20 text-xs">·</span>
                          <span className="text-white/30 text-xs">{tierRanks.length === 1 ? "1 seviye" : `${tierRanks.length} seviye`}</span>
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight size={16}
                        className="flex-shrink-0 transition-transform duration-200"
                        style={{ color: "rgba(255,255,255,0.25)", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }} />
                    </button>

                    {/* ── Expanded detail ── */}
                    {isExpanded && (
                      <div className="px-5 pb-5 flex flex-col gap-4"
                        style={{ borderTop: `1px solid ${tier.color}18` }}>

                        {/* Description + benefit */}
                        <div className="flex flex-col gap-2 pt-4">
                          <p className="text-white/65 text-sm leading-relaxed">{tier.description}</p>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: tier.color }} />
                            <p className="text-white/45 text-xs leading-relaxed">{tier.benefit}</p>
                          </div>
                        </div>

                        {/* Sub-rank pills */}
                        <div className="flex gap-2 flex-wrap">
                          {tierRanks.map(r => {
                            const isMe = r.id === myRank.id;
                            return (
                              <div key={r.id}
                                className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border relative overflow-hidden"
                                style={isMe ? {
                                  background: `${tier.color}20`,
                                  border: `1.5px solid ${tier.color}65`,
                                  boxShadow: `0 0 14px ${tier.glowColor}`,
                                } : {
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                }}>
                                {isMe && (
                                  <div className="absolute top-0 left-0 right-0 h-px"
                                    style={{ background: `linear-gradient(90deg,transparent,${tier.color}cc,transparent)` }} />
                                )}
                                <span className="font-bold text-sm" style={{ color: isMe ? tier.color : "rgba(255,255,255,0.65)" }}>
                                  {r.fullName}
                                </span>
                                <span className="text-white/30 text-[10px] font-semibold">
                                  {r.minRP}{r.maxRP !== null ? `–${r.maxRP}` : "+"} RP
                                </span>
                                {isMe && (
                                  <span className="flex items-center gap-0.5 text-[9px] font-black" style={{ color: tier.color }}>
                                    <Star size={8} fill={tier.color} /> Sen
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Tier index progress */}
                        <div className="flex items-center gap-2">
                          {RANK_TIERS.map((t, i) => (
                            <div key={t.id} className="flex-1 h-1 rounded-full transition-all"
                              style={{
                                background: i <= tIdx
                                  ? `linear-gradient(90deg,${t.color}80,${t.color})`
                                  : "rgba(255,255,255,0.07)",
                                boxShadow: i === tIdx ? `0 0 8px ${t.glowColor}` : "none",
                              }} />
                          ))}
                        </div>
                        <p className="text-white/25 text-[10px] font-semibold text-center">
                          {tIdx + 1} / {RANK_TIERS.length} kademe
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── FOOTER CTA ────────────────────────────────────────── */}
          <div className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(68,170,255,0.12)", border: "1px solid rgba(68,170,255,0.25)" }}>
              <Swords size={18} className="text-[#4aaeff]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Ranked Maca Gir</p>
              <p className="text-white/40 text-xs">Maça girerek RP kazan ve rank atla</p>
            </div>
            <div className="flex items-center gap-1 text-white/35">
              <ChevronRight size={16} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

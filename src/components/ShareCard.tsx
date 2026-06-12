import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, X, Loader2, Copy, Check } from "lucide-react";
import type { MatchResultData } from "../types/game";
import { getRankForRP, getRPProgressInRank, ALL_RANKS } from "../utils/rankSystem";

interface Props {
  result: MatchResultData;
  username: string;
  displayName: string;
  onClose: () => void;
}

function CardFace({
  result, username, displayName, innerRef,
}: {
  result: MatchResultData; username: string; displayName: string;
  innerRef: React.RefObject<HTMLDivElement>;
}) {
  const { won, drew, rpGained, newRP, playerGoals, aiGoals, rankChanged, prevRankName, newRankName } = result;
  const rank    = getRankForRP(newRP);
  const prog    = getRPProgressInRank(newRP);
  const nextIdx = ALL_RANKS.indexOf(rank);
  const nextRank = nextIdx < ALL_RANKS.length - 1 ? ALL_RANKS[nextIdx + 1] : null;

  const resultText  = won ? "GALİBİYET" : drew ? "BERABERLİK" : "MAĞLUBIYET";
  const resultEmoji = won ? "🏆" : drew ? "🤝" : "😔";
  const resultColor = won ? "#4ade80" : drew ? "#facc15" : "#f87171";
  const resultGlow  = won ? "#4ade8040" : drew ? "#facc1540" : "#f8717140";

  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div
      ref={innerRef}
      style={{
        width: 540,
        height: 540,
        background: "linear-gradient(145deg, #070d16 0%, #0c1827 50%, #070d16 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Rank glow background */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${rank.tier.color}18 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Top border glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${rank.tier.color}80, transparent)`,
      }} />

      {/* Corner decoration */}
      <div style={{
        position: "absolute", top: 20, right: 20, width: 60, height: 60,
        background: `radial-gradient(circle, ${rank.tier.color}15 0%, transparent 70%)`,
        borderRadius: "50%",
      }} />

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", padding: "28px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${rank.tier.color}40, ${rank.tier.color}15)`,
              border: `1px solid ${rank.tier.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>⚽</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>
                Nova<span style={{ color: "#44aaff" }}>Ball</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
                Arcade Football
              </div>
            </div>
          </div>
          {/* Rank badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 20,
            background: `${rank.tier.color}15`,
            border: `1px solid ${rank.tier.color}35`,
          }}>
            <span style={{ fontSize: 14 }}>{rank.tier.icon}</span>
            <span style={{ color: rank.tier.color, fontWeight: 700, fontSize: 11 }}>{rank.fullName}</span>
          </div>
        </div>

        {/* Result */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>{resultEmoji}</div>
          <div style={{
            color: resultColor, fontWeight: 900, fontSize: 32, letterSpacing: 3,
            textTransform: "uppercase",
            textShadow: `0 0 30px ${resultGlow}`,
          }}>
            {resultText}
          </div>
          {rankChanged && (
            <div style={{
              color: "#facc15", fontSize: 12, fontWeight: 700,
              background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.25)",
              padding: "4px 12px", borderRadius: 20,
            }}>
              ✨ {prevRankName} → {newRankName}
            </div>
          )}
        </div>

        {/* Score */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 24,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: "16px 32px", marginBottom: 20,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#e63535", boxShadow: "0 0 8px #e63535" }} />
            <div style={{ color: "#ff4444", fontWeight: 900, fontSize: 52, lineHeight: 1 }}>{playerGoals}</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, letterSpacing: 2 }}>SEN</div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 28, fontWeight: 300 }}>—</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#4488ff", boxShadow: "0 0 8px #4488ff" }} />
            <div style={{ color: "#4488ff", fontWeight: 900, fontSize: 52, lineHeight: 1 }}>{aiGoals}</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, letterSpacing: 2 }}>AI</div>
          </div>
        </div>

        {/* RP & Progress */}
        <div style={{
          background: rpGained > 0 ? "rgba(68,170,255,0.06)" : "rgba(255,255,255,0.03)",
          border: rpGained > 0 ? "1px solid rgba(68,170,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: "12px 16px", marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
              Rank Puanı
            </span>
            <span style={{
              color: rpGained > 0 ? "#44aaff" : "rgba(255,255,255,0.3)",
              fontWeight: 900, fontSize: 18,
            }}>
              {rpGained > 0 ? `+${rpGained} RP` : "+0 RP"}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 3,
              width: `${prog.percent * 100}%`,
              background: `linear-gradient(90deg, ${rank.tier.color}80, ${rank.tier.color})`,
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>{prog.current}/{prog.total} RP</span>
            {nextRank && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>→ {nextRank.fullName}</span>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 13 }}>{displayName}</div>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>@{username}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>novaball.vercel.app</div>
            <div style={{ color: "rgba(255,255,255,0.18)", fontSize: 10 }}>{today}</div>
          </div>
        </div>
      </div>

      {/* Bottom border glow */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${rank.tier.color}50, transparent)`,
      }} />
    </div>
  );
}

export default function ShareCard({ result, username, displayName, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null!);
  const [loading,  setLoading]  = useState(false);
  const [copied,   setCopied]   = useState(false);

  const rank = getRankForRP(result.newRP);

  async function getImage(): Promise<string> {
    return toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const url = await getImage();
      const a = document.createElement("a");
      a.href = url;
      a.download = `novaball-${username}-${Date.now()}.png`;
      a.click();
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    setLoading(true);
    try {
      const url = await getImage();
      const res  = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "novaball-result.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "NovaBall Maç Sonucu" });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    setLoading(true);
    try {
      const url   = await getImage();
      const res   = await fetch(url);
      const blob  = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div
        className="relative w-full max-w-[92vw] sm:max-w-lg flex flex-col items-center gap-5 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Kapat */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
        >
          <X size={14} />
        </button>

        {/* Card preview */}
        <div
          className="overflow-hidden rounded-2xl shadow-2xl"
          style={{ boxShadow: `0 0 60px ${rank.tier.color}30` }}
        >
          <div className="scale-[0.7] sm:scale-[0.85] origin-top-left" style={{ width: 540, height: 540 }}>
            <CardFace
              result={result}
              username={username}
              displayName={displayName}
              innerRef={cardRef}
            />
          </div>
        </div>

        {/* Label */}
        <p className="text-white/30 text-xs text-center -mt-1">
          Kartı indir veya paylaş
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={handleShare}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#4af]/80 to-[#4af] text-white font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
          >
            {loading
              ? <Loader2 size={16} className="animate-spin" />
              : <Share2 size={16} />
            }
            Paylaş
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-white/15 bg-white/8 text-white/70 font-bold text-sm hover:bg-white/12 hover:text-white transition-all active:scale-[0.97] disabled:opacity-40"
          >
            <Download size={16} />
            İndir
          </button>
          <button
            onClick={handleCopy}
            disabled={loading}
            className="w-12 flex items-center justify-center py-3.5 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all active:scale-[0.97] disabled:opacity-40"
          >
            {copied ? <Check size={16} className="text-[#4ade80]" /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

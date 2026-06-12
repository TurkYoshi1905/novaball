import { ALL_RANKS, RANK_TIERS, getRankForRP, getRPProgressInRank, loadRP } from "../utils/rankSystem";

interface Props {
  onBack: () => void;
}

export default function RankPage({ onBack }: Props) {
  const myRP   = loadRP();
  const myRank = getRankForRP(myRP);
  const prog   = getRPProgressInRank(myRP);

  return (
    <div className="novaball-screen flex flex-col min-h-screen bg-[#070d16] relative overflow-auto">
      <div className="pitch-glow pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6 px-6 py-8 w-full max-w-2xl mx-auto">

        {/* Başlık */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-white/30 hover:text-white/70 transition-colors text-lg font-semibold px-2 py-1"
          >
            ← Geri
          </button>
          <div>
            <h1 className="text-white font-black text-3xl">Rank Sistemi</h1>
            <p className="text-white/30 text-xs uppercase tracking-widest">NovaBall Rekabet Modu</p>
          </div>
        </div>

        {/* Mevcut rank kartı */}
        <div
          className="rounded-2xl border p-5 flex flex-col gap-3"
          style={{ borderColor: `${myRank.tier.color}40`, background: `${myRank.tier.color}0d` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{myRank.tier.icon}</span>
              <div>
                <div className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Mevcut Rankın</div>
                <div className="font-black text-2xl" style={{ color: myRank.tier.color }}>{myRank.fullName}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white/40 text-xs uppercase tracking-widest">Toplam RP</div>
              <div className="text-white font-black text-2xl">{myRP}</div>
            </div>
          </div>

          <div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${prog.percent * 100}%`,
                  background: `linear-gradient(90deg, ${myRank.tier.color}80, ${myRank.tier.color})`,
                  boxShadow: `0 0 10px ${myRank.tier.glowColor}`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-white/30 text-xs">{prog.current} / {prog.total} RP</span>
              {ALL_RANKS.indexOf(myRank) < ALL_RANKS.length - 1 && (
                <span className="text-white/30 text-xs">
                  Sonraki: {ALL_RANKS[ALL_RANKS.indexOf(myRank)+1].fullName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RP kazanma bilgisi */}
        <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-4 flex flex-col gap-2">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1">Rekabet Modu RP Tablosu</h3>
          <div className="grid grid-cols-5 gap-2">
            {[1,2,3,4,5].map(goals => {
              const rp = goals < 5 ? [10,14,18,22,25][goals-1] : 25;
              return (
                <div key={goals} className="flex flex-col items-center gap-1 bg-white/5 rounded-lg p-2">
                  <span className="text-white/50 text-xs">{goals}{goals===5?"+":""} Gol</span>
                  <span className="text-[#4af] font-black text-base">+{rp}</span>
                  <span className="text-white/30 text-xs">RP</span>
                </div>
              );
            })}
          </div>
          <p className="text-white/25 text-xs mt-1">* RP sadece maçı kazanınca verilir. Yenilgide RP kaybı yoktur.</p>
        </div>

        {/* Rank listesi */}
        <div className="flex flex-col gap-4">
          {RANK_TIERS.map(tier => {
            const tierRanks = ALL_RANKS.filter(r => r.tier.id === tier.id);
            const isMyTier = myRank.tier.id === tier.id;
            return (
              <div
                key={tier.id}
                className="rounded-2xl border p-5 flex flex-col gap-3"
                style={{
                  borderColor: isMyTier ? `${tier.color}50` : "rgba(255,255,255,0.08)",
                  background: isMyTier ? `${tier.color}0a` : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{tier.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-lg" style={{ color: tier.color }}>{tier.name}</span>
                      {isMyTier && (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${tier.color}25`, color: tier.color }}
                        >
                          Mevcut Rank
                        </span>
                      )}
                    </div>
                    <p className="text-white/45 text-sm mt-1 leading-relaxed">{tier.description}</p>
                    <p className="text-white/30 text-xs mt-1">✓ {tier.benefit}</p>
                  </div>
                </div>

                {/* Sub-ranklar */}
                <div className="flex gap-2 flex-wrap">
                  {tierRanks.map(r => {
                    const isMe = r.id === myRank.id;
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border text-xs"
                        style={{
                          borderColor: isMe ? `${tier.color}70` : "rgba(255,255,255,0.08)",
                          background: isMe ? `${tier.color}18` : "rgba(255,255,255,0.03)",
                        }}
                      >
                        <span className="font-bold" style={{ color: isMe ? tier.color : "rgba(255,255,255,0.6)" }}>
                          {r.fullName}
                        </span>
                        <span className="text-white/30">
                          {r.minRP}{r.maxRP !== null ? `–${r.maxRP}` : "+"} RP
                        </span>
                        {isMe && <span style={{ color: tier.color }} className="text-xs">◀ Sen</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pb-4" />
      </div>
    </div>
  );
}

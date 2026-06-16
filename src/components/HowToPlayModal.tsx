import { useState } from "react";
import { X, Keyboard, Gamepad2, Smartphone, Zap, Shield, Trophy, Target, TrendingDown, AlertTriangle } from "lucide-react";

interface Props {
  onClose: () => void;
}

type Tab = "controls" | "mechanics" | "ranked" | "mobile";

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[36px] h-9 px-2.5 rounded-lg bg-white/8 border border-white/18 text-white/90 text-xs font-mono font-bold shadow-sm">
      {children}
    </span>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg,transparent,${color}40)` }} />
        <span className="text-[11px] font-black uppercase tracking-[.18em]" style={{ color }}>{title}</span>
        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg,${color}40,transparent)` }} />
      </div>
      {children}
    </div>
  );
}

export default function HowToPlayModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("controls");

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "controls", icon: <Keyboard size={15} />,  label: "Kontroller" },
    { id: "mechanics", icon: <Gamepad2 size={15} />, label: "Mekanikler" },
    { id: "ranked",   icon: <Trophy size={15} />,    label: "Ranked" },
    { id: "mobile",   icon: <Smartphone size={15} />, label: "Mobil" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,16,0.88)", backdropFilter: "blur(12px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg flex flex-col rounded-3xl overflow-hidden animate-fade-in"
        style={{
          background: "linear-gradient(160deg,#0b1525 0%,#070d16 60%,#080f1e 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04) inset",
          maxHeight: "90dvh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/7 flex-shrink-0">
          <div>
            <h2 className="text-white font-black text-xl tracking-tight">Nasıl Oynanır?</h2>
            <p className="text-white/35 text-xs mt-0.5">NovaBall — Arcade Futbol</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4 pb-2 flex-shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={tab === t.id ? {
                background: "rgba(74,170,255,0.15)",
                border: "1px solid rgba(74,170,255,0.35)",
                color: "#4aaeff",
              } : {
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.40)",
              }}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 pb-6 pt-2 flex flex-col gap-5">

          {/* ── Kontroller ── */}
          {tab === "controls" && (
            <>
              <Section title="Hareket" color="#4af">
                <div className="rounded-2xl border border-white/7 bg-white/3 p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-white/80 font-bold text-sm">Hareket Et</span>
                      <span className="text-white/35 text-xs">8 yönlü — çapraz hareket de desteklenir</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <div /><KeyBadge>W</KeyBadge><div />
                      <KeyBadge>A</KeyBadge><KeyBadge>S</KeyBadge><KeyBadge>D</KeyBadge>
                    </div>
                  </div>
                  <div className="border-t border-white/6 pt-3 flex items-center justify-between">
                    <span className="text-white/40 text-xs">Ok tuşları da çalışır</span>
                    <div className="flex gap-1">
                      <KeyBadge>↑</KeyBadge><KeyBadge>←</KeyBadge>
                      <KeyBadge>↓</KeyBadge><KeyBadge>→</KeyBadge>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Şut & Depar" color="#4ade80">
                <div className="flex flex-col gap-2">
                  <div className="rounded-2xl border border-[#4ade80]/15 bg-[#4ade80]/5 p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white/85 font-bold text-sm">Şut / Güç Barı</span>
                      <span className="text-white/35 text-xs">Basılı tut → doldur → bırak → ateş et</span>
                    </div>
                    <div className="flex gap-1.5">
                      <KeyBadge>SPACE</KeyBadge>
                      <KeyBadge>X</KeyBadge>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#facc15]/15 bg-[#facc15]/5 p-4 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white/85 font-bold text-sm">Depar (Sprint)</span>
                      <span className="text-white/35 text-xs">Stamina tüketir — dikkatli kullan</span>
                    </div>
                    <KeyBadge>⇧ Shift</KeyBadge>
                  </div>
                </div>
              </Section>

              <Section title="Saha Düzeni" color="#a78bfa">
                <div className="rounded-2xl border border-white/7 bg-white/3 p-4 grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#e63535]/20 border-2 border-[#e63535]/50 flex items-center justify-center text-[#e63535] font-black">SEN</div>
                    <span className="text-white/40">Kırmızı Takım</span>
                    <span className="text-white/25 text-[10px]">Sağ kaleyi hedefle</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 self-center">
                    <div className="text-white/20 text-lg">⚡</div>
                    <span className="text-white/20 font-black">VS</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#2266ee]/20 border-2 border-[#2266ee]/50 flex items-center justify-center text-[#4488ff] font-black">RAK</div>
                    <span className="text-white/40">Mavi Takım</span>
                    <span className="text-white/25 text-[10px]">Sol kaleyi hedefle</span>
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* ── Mekanikler ── */}
          {tab === "mechanics" && (
            <>
              <Section title="Güç Barı Şut Sistemi" color="#4ade80">
                <div className="rounded-2xl border border-[#4ade80]/15 bg-[#4ade80]/5 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <Zap size={18} className="text-[#4ade80] mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="text-white/85 font-bold text-sm">Şarjlı Şut</span>
                      <span className="text-white/45 text-xs leading-relaxed">
                        SPACE/X tuşunu <strong className="text-white/70">basılı tut</strong> — çevrendeki renkli yay dolar.
                        Yeşil=zayıf, kırmızı=maksimum güç. Bırakınca top fırlar.
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/6 pt-2">
                    <div className="text-white/35">Min güç (kısa dokunuş): <span className="text-white/65 font-bold">5</span></div>
                    <div className="text-white/35">Max güç (tam şarj): <span className="text-white/65 font-bold">15</span></div>
                  </div>
                </div>
              </Section>

              <Section title="Stamina & Depar" color="#facc15">
                <div className="rounded-2xl border border-[#facc15]/15 bg-[#facc15]/5 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <Shield size={18} className="text-[#facc15] mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="text-white/85 font-bold text-sm">Stamina Sistemi</span>
                      <span className="text-white/45 text-xs leading-relaxed">
                        Shift ile koşarken stamina barı (oyuncunun altında) hızla düşer.
                        Stamina bitince depar yapılamaz — yavaşça yenilenir.
                        <strong className="text-white/65"> Yapay zekânın da stamina barı vardır!</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1 border-t border-white/6">
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-[#4ade80]/12 text-[#4ade80] font-semibold">🟢 Yüksek</span>
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-[#facc15]/12 text-[#facc15] font-semibold">🟡 Düşük</span>
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-[#f87171]/12 text-[#f87171] font-semibold">🔴 Kritik</span>
                  </div>
                </div>
              </Section>

              <Section title="Top Hakimiyeti" color="#a78bfa">
                <div className="rounded-2xl border border-[#a78bfa]/15 bg-[#a78bfa]/5 p-4 flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <Target size={18} className="text-[#a78bfa] mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="text-white/85 font-bold text-sm">Possession Sistemi</span>
                      <span className="text-white/45 text-xs leading-relaxed">
                        Yavaş topa yaklaştığında otomatik hakimiyet alırsın — top sana yapışır.
                        Rakip <strong className="text-white/70">depar yaparak</strong> topu senden çalabilir.
                      </span>
                    </div>
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* ── Ranked ── */}
          {tab === "ranked" && (
            <>
              <Section title="RP Kazanma" color="#4ade80">
                <div className="rounded-2xl border border-[#4ade80]/15 bg-[#4ade80]/5 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <Trophy size={18} className="text-[#4ade80] mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="text-white/85 font-bold text-sm">Maç Kazanınca</span>
                      <span className="text-white/45 text-xs leading-relaxed">
                        Eşleştirme (Maça Gir) ile oynadığında RP kazanırsın.
                        Gol sayısı arttıkça daha fazla RP alırsın.
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] border-t border-white/6 pt-2">
                    {([[1,10],[2,14],[3,18],[5,25]] as [number,number][]).map(([g,r]) => (
                      <div key={g} className="flex flex-col gap-0.5 rounded-xl bg-[#4ade80]/8 py-2">
                        <span className="text-white/50 font-bold">{g}{g===5 ? "+" : ""} gol</span>
                        <span className="text-[#4ade80] font-black text-base">+{r}</span>
                        <span className="text-[#4ade80]/60 text-[9px]">RP</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="RP Kaybı" color="#f87171">
                <div className="rounded-2xl border border-[#f87171]/15 bg-[#f87171]/5 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <TrendingDown size={18} className="text-[#f87171] mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="text-white/85 font-bold text-sm">Maç Kaybedince</span>
                      <span className="text-white/45 text-xs leading-relaxed">
                        Yenilince <strong className="text-[#f87171]">10–20 RP</strong> rastgele kaybedersin.
                        Takım maçlarında (2v2–5v5) kaybeden takımdaki <strong className="text-white/70">tüm oyuncular</strong> aynı miktarı kaybeder.
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-white/6 pt-2">
                    <div className="flex flex-col items-center gap-1 rounded-xl bg-white/4 py-3">
                      <span className="text-[#4ade80] font-black text-lg">+10 – +25</span>
                      <span className="text-white/40 text-[10px]">Kazanınca RP</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-xl bg-white/4 py-3">
                      <span className="text-[#f87171] font-black text-lg">−10 – −20</span>
                      <span className="text-white/40 text-[10px]">Kaybedince RP</span>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Rank Yükseliş / Düşüş" color="#f59e0b">
                <div className="rounded-2xl border border-[#f59e0b]/15 bg-[#f59e0b]/5 p-4 flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <Trophy size={18} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="text-white/85 font-bold text-sm">Otomatik Rank Değişimi</span>
                      <span className="text-white/45 text-xs leading-relaxed">
                        RP eşiğini geçince rank otomatik <strong className="text-[#4ade80]">yükselir</strong>.
                        RP bir alt eşiğin altına düşerse rank <strong className="text-[#f87171]">düşer</strong> — sonuç ekranında bildirim gösterilir.
                        RP hiçbir zaman 0'ın altına inmez.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-white/6 pt-2">
                    <span className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 bg-[#4ade80]/8 text-[#4ade80] text-xs font-bold">↑ Rank Yükseldi!</span>
                    <span className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 bg-[#f87171]/8 text-[#f87171] text-xs font-bold">↓ Rank Düştü!</span>
                  </div>
                </div>
              </Section>

              <Section title="Maçtan Ayrılma (Forfeit)" color="#f87171">
                <div className="rounded-2xl border border-[#f87171]/15 bg-[#f87171]/5 p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-[#f87171] mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="text-white/85 font-bold text-sm">Forfeit Cezası</span>
                      <span className="text-white/45 text-xs leading-relaxed">
                        Ranked maçtan erken ayrılmak <strong className="text-[#f87171]">−15 RP</strong> cezası getirir.
                        Rakibin maçta kalması hâlinde <strong className="text-[#4ade80]">+10 RP</strong> kazanır.
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/6 pt-2">
                    <div className="rounded-xl bg-white/4 p-2.5 flex flex-col gap-1">
                      <span className="text-white/50 text-[10px]">1v1 Ranked</span>
                      <span className="text-[#f87171] font-bold">−15 RP ceza</span>
                      <span className="text-white/30 text-[10px]">Forfeit izinli</span>
                    </div>
                    <div className="rounded-xl bg-white/4 p-2.5 flex flex-col gap-1">
                      <span className="text-white/50 text-[10px]">2v2 – 5v5 Ranked</span>
                      <span className="text-[#facc15] font-bold">Engellendi</span>
                      <span className="text-white/30 text-[10px]">Takım maçı çıkamaz</span>
                    </div>
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* ── Mobil ── */}
          {tab === "mobile" && (
            <>
              <Section title="Dokunmatik Kontroller" color="#4af">
                <div className="rounded-2xl border border-[#4af]/15 bg-[#4af]/5 p-4 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full border-2 border-white/20 bg-white/5 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white/30" />
                      </div>
                      <span className="text-white/60 text-xs font-semibold text-center">Sol Joystick</span>
                      <span className="text-white/30 text-[10px] text-center">Analog hareket — 8 yön</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 rounded-full bg-[#4ade80]/20 border-2 border-[#4ade80]/40 flex items-center justify-center text-lg">⚽</div>
                        <div className="w-10 h-10 rounded-full bg-[#facc15]/20 border-2 border-[#facc15]/40 flex items-center justify-center text-sm">💨</div>
                      </div>
                      <span className="text-white/60 text-xs font-semibold text-center">Sağ Butonlar</span>
                      <span className="text-white/30 text-[10px] text-center">⚽ Şut · 💨 Depar</span>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Mobil Güç Barı" color="#4ade80">
                <div className="rounded-2xl border border-[#4ade80]/15 bg-[#4ade80]/5 p-4 flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⚽</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-white/85 font-bold text-sm">Şarj Halkası</span>
                    <span className="text-white/45 text-xs leading-relaxed">
                      Şut butonunu basılı tutunca çevresinde renkli bir halka dolar.
                      Yeşilden kırmızıya döndüğünde tam güce ulaşılmıştır.
                      Parmağını kaldırınca şut atılır.
                    </span>
                  </div>
                </div>
              </Section>

              <Section title="Ekran Yönü" color="#f87171">
                <div className="rounded-2xl border border-[#f87171]/15 bg-[#f87171]/5 p-4 flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">📱</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-white/85 font-bold text-sm">Yatay Ekran Zorunlu</span>
                    <span className="text-white/45 text-xs leading-relaxed">
                      NovaBall yalnızca yatay (landscape) modda oynanır.
                      Cihazını yan çevir — oyun otomatik başlayacak.
                    </span>
                  </div>
                </div>
              </Section>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/6 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-bold text-sm text-white/70 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            Anladım, Oynayalım! ⚽
          </button>
        </div>
      </div>
    </div>
  );
}

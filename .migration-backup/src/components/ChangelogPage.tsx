import {
  Zap,
  Wrench,
  TrendingUp,
  Gauge,
  Palette,
  Tag,
  Calendar,
  ChevronLeft,
  Star,
  Rocket,
} from "lucide-react";
import CHANGELOG, { type ChangeType, type ChangelogEntry } from "../utils/changelogData";

interface Props {
  onBack: () => void;
}

/* ── Değişiklik tipi metadata ──────────────────────────────────── */
const TYPE_META: Record<ChangeType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  feature: {
    icon: <Zap size={13} strokeWidth={2.5} />,
    label: "Yeni Özellik",
    color: "#4ade80",
    bg: "rgba(74,222,128,.12)",
  },
  fix: {
    icon: <Wrench size={13} strokeWidth={2.5} />,
    label: "Düzeltme",
    color: "#fb923c",
    bg: "rgba(251,146,60,.12)",
  },
  improvement: {
    icon: <TrendingUp size={13} strokeWidth={2.5} />,
    label: "İyileştirme",
    color: "#60a5fa",
    bg: "rgba(96,165,250,.12)",
  },
  performance: {
    icon: <Gauge size={13} strokeWidth={2.5} />,
    label: "Performans",
    color: "#a78bfa",
    bg: "rgba(167,139,250,.12)",
  },
  design: {
    icon: <Palette size={13} strokeWidth={2.5} />,
    label: "Tasarım",
    color: "#f472b6",
    bg: "rgba(244,114,182,.12)",
  },
};

const LABEL_META: Record<ChangelogEntry["label"], { text: string; color: string; bg: string }> = {
  major:  { text: "Büyük Güncelleme", color: "#f59e0b", bg: "rgba(245,158,11,.15)" },
  minor:  { text: "Küçük Güncelleme", color: "#60a5fa", bg: "rgba(96,165,250,.15)" },
  patch:  { text: "Yama",             color: "#94a3b8", bg: "rgba(148,163,184,.12)" },
  alpha:  { text: "Alfa",             color: "#f472b6", bg: "rgba(244,114,182,.15)" },
  beta:   { text: "Beta",             color: "#a78bfa", bg: "rgba(167,139,250,.15)" },
};

/* ── Gruplandırma ──────────────────────────────────────────────── */
function groupByType(changes: ChangelogEntry["changes"]) {
  const order: ChangeType[] = ["feature", "improvement", "performance", "design", "fix"];
  const map = new Map<ChangeType, string[]>();
  for (const c of changes) {
    if (!map.has(c.type)) map.set(c.type, []);
    map.get(c.type)!.push(c.text);
  }
  return order.filter(t => map.has(t)).map(t => ({ type: t, items: map.get(t)! }));
}

/* ── Sürüm Kartı ───────────────────────────────────────────────── */
function VersionCard({ entry, isLatest }: { entry: ChangelogEntry; isLatest: boolean }) {
  const label = LABEL_META[entry.label];
  const groups = groupByType(entry.changes);
  const totalChanges = entry.changes.length;

  return (
    <div
      className="rounded-2xl border flex flex-col gap-0 overflow-hidden"
      style={{
        borderColor: isLatest ? "rgba(74,222,128,.25)" : "rgba(255,255,255,.07)",
        background: isLatest ? "rgba(74,222,128,.04)" : "rgba(255,255,255,.02)",
      }}
    >
      {/* Kart başlığı */}
      <div className="px-5 py-4 flex flex-col gap-3 border-b border-white/6">
        {/* Versiyon + etiket + tarih */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sürüm numarası */}
          <div className="flex items-center gap-1.5">
            {isLatest && <Star size={14} className="text-[#4ade80]" fill="#4ade80" />}
            <span
              className="font-black text-xl tracking-tight"
              style={{ color: isLatest ? "#4ade80" : "rgba(255,255,255,.75)" }}
            >
              v{entry.version}
            </span>
          </div>

          {/* Etiket (alfa/beta/major…) */}
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: label.color, background: label.bg }}
          >
            <Tag size={10} strokeWidth={2.5} />
            {label.text}
          </span>

          {isLatest && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80]">
              <Rocket size={10} strokeWidth={2.5} />
              En Son
            </span>
          )}

          {/* Tarih */}
          <span className="ml-auto flex items-center gap-1 text-white/30 text-xs">
            <Calendar size={12} />
            {entry.date}
          </span>
        </div>

        {/* Başlık + açıklama */}
        <div>
          <h2 className="text-white font-black text-lg leading-snug">{entry.title}</h2>
          <p className="text-white/45 text-sm mt-1 leading-relaxed">{entry.description}</p>
        </div>

        {/* Özet sayaçlar */}
        <div className="flex flex-wrap gap-2">
          {(["feature","improvement","performance","design","fix"] as ChangeType[]).map(t => {
            const count = entry.changes.filter(c => c.type === t).length;
            if (count === 0) return null;
            const m = TYPE_META[t];
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg"
                style={{ color: m.color, background: m.bg }}
              >
                {m.icon}
                <span>{count} {m.label}</span>
              </span>
            );
          })}
          <span className="ml-auto text-white/20 text-xs self-center">{totalChanges} değişiklik</span>
        </div>
      </div>

      {/* Değişiklik listesi */}
      <div className="flex flex-col divide-y divide-white/4">
        {groups.map(group => {
          const meta = TYPE_META[group.type];
          return (
            <div key={group.type} className="px-5 py-3.5 flex flex-col gap-2.5">
              {/* Grup başlığı */}
              <div
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: meta.color }}
              >
                {meta.icon}
                {meta.label}
              </div>

              {/* Maddeler */}
              <ul className="flex flex-col gap-2">
                {group.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="mt-[5px] flex-shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}80` }}
                    />
                    <span className="text-white/65 text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Ana Sayfa ─────────────────────────────────────────────────── */
export default function ChangelogPage({ onBack }: Props) {
  return (
    <div className="novaball-screen flex flex-col min-h-screen bg-[#070d16] relative overflow-auto">
      <div className="pitch-glow pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6 px-5 py-8 w-full max-w-2xl mx-auto">

        {/* Üst başlık */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-white/30 hover:text-white/70 transition-colors font-semibold py-1 px-1 -ml-1"
          >
            <ChevronLeft size={20} />
            <span className="text-sm">Geri</span>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-white font-black text-2xl sm:text-3xl flex items-center gap-2">
              Güncelleme Notları
            </h1>
            <p className="text-white/30 text-xs uppercase tracking-widest mt-0.5">NovaBall Sürüm Geçmişi</p>
          </div>
        </div>

        {/* Versiyon etiket açıklaması */}
        <div className="rounded-xl border border-white/6 bg-white/2 px-4 py-3 flex flex-wrap gap-x-4 gap-y-2">
          <span className="text-white/25 text-xs uppercase tracking-wider self-center w-full sm:w-auto mb-1 sm:mb-0">
            Etiket Açıklamaları
          </span>
          {(Object.entries(LABEL_META) as [ChangelogEntry["label"], typeof LABEL_META[keyof typeof LABEL_META]][]).map(([key, m]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: m.color, background: m.bg }}
            >
              <Tag size={9} strokeWidth={2.5} />
              {m.text}
            </span>
          ))}
        </div>

        {/* Sürüm kartları */}
        <div className="flex flex-col gap-5">
          {CHANGELOG.map((entry, i) => (
            <VersionCard key={entry.version} entry={entry} isLatest={i === 0} />
          ))}
        </div>

        {/* Alt not */}
        <div className="text-center text-white/18 text-xs pb-4 leading-relaxed">
          NovaBall · Kuruluş: 11 Haziran 2026 · Tüm sürümler burada listelenir
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Zap, Users, Trophy, Smartphone, Shield, Globe, ChevronDown,
  Star, Mail, MessageCircle, ArrowRight, Play, Crown, ChevronRight,
} from "lucide-react";

interface Props {
  onLogin:     () => void;
  onRegister:  () => void;
  onTryGuest?: () => void;
}

// ─── Rank verileri ────────────────────────────────────────────────────────────
const RANKS = [
  { name: "Demir",  icon: "⚙️",  color: "#8B96A0", rp: "0 – 299",    desc: "Başlangıç" },
  { name: "Bronz",  icon: "🥉",  color: "#CD7F32", rp: "300 – 749",  desc: "Gelişiyor" },
  { name: "Gümüş",  icon: "🥈",  color: "#C0C0C0", rp: "750 – 1499", desc: "Orta seviye" },
  { name: "Altın",  icon: "🥇",  color: "#FFD700", rp: "1500 – 2399",desc: "İyi oyuncu" },
  { name: "Platin", icon: "💠",  color: "#00CED1", rp: "2400 – 3599",desc: "Üst seviye" },
  { name: "Elmas",  icon: "💎",  color: "#5BE9FF", rp: "3600 – 5199",desc: "Elit" },
  { name: "Usta",   icon: "🏆",  color: "#FF6B35", rp: "5200+",       desc: "Zirve" },
];

const MODES = [
  { mode: "1v1", players: 2,  emoji: "⚡", desc: "Birebir düello, saf beceri" },
  { mode: "2v2", players: 4,  emoji: "🤝", desc: "Takım koordinasyonu" },
  { mode: "3v3", players: 6,  emoji: "🎯", desc: "Klasik futbol hissi" },
  { mode: "4v4", players: 8,  emoji: "🔥", desc: "Kaotik ve eğlenceli" },
  { mode: "5v5", players: 10, emoji: "🏟️", desc: "Tam kadro deneyimi" },
];

const FEATURES = [
  {
    icon: <Zap size={22} />,
    title: "Gerçek Zamanlı Çok Oyunculu",
    desc: "Supabase Realtime ile düşük gecikmeli eşleşmeler. Dünyanın her yerinden oyuncularla oyna.",
    color: "#4af",
  },
  {
    icon: <Trophy size={22} />,
    title: "Rekabetçi Rank Sistemi",
    desc: "7 kademe, 19 seviye. Kazan +10–+25 RP kazan, kaybet −10–20 RP kay. Rank çık ya da düş.",
    color: "#FFD700",
  },
  {
    icon: <Users size={22} />,
    title: "Özel Odalar",
    desc: "HaxBall tarzı özel odalar, 1v1'den 5v5'e. Oda açık kalmaya devam eder — maça gir, çık, geri dön.",
    color: "#a78bfa",
  },
  {
    icon: <Smartphone size={22} />,
    title: "Mobil Uyumlu",
    desc: "Dokunmatik joystick ve aksiyon butonlarıyla telefonda da tam oyun deneyimi.",
    color: "#4ade80",
  },
  {
    icon: <Shield size={22} />,
    title: "AI Rakip",
    desc: "Çevrimiçi olmak istemiyorsan? Yerel AI modunda tek başına antrenman yap.",
    color: "#f97316",
  },
  {
    icon: <Globe size={22} />,
    title: "Tarayıcı Tabanlı",
    desc: "Hiç kurulum yok. Hesap aç, oyna. Chrome, Firefox, Safari — hepsi çalışır.",
    color: "#38bdf8",
  },
];

const STEPS = [
  { step: "01", title: "Hesap Oluştur",        desc: "Ücretsiz kayıt ol, kullanıcı adını seç." },
  { step: "02", title: "Mod Seç",              desc: "Ranked maç, özel oda veya AI antrenmanı." },
  { step: "03", title: "Oyna & RP Kazan",      desc: "Maç kazan +RP al; kaybet −RP öde. Risk var, zevk var." },
  { step: "04", title: "Rank'ını Geliştir",    desc: "Demir'den Usta'ya çık — ya da bir hata ile düş." },
];

const FAQ = [
  { q: "NovaBall ücretsiz mi?",             a: "Evet, tamamen ücretsiz. Hesap aç ve hemen oyna." },
  { q: "Mobilde çalışıyor mu?",             a: "Evet. Yatay ekranda dokunmatik joystick ve butonlarla tam oyun deneyimi sunar." },
  { q: "Rank puanı nasıl kazanılır?",       a: "Ranked maçları kazanarak RP kazanırsın. Kaybetmek RP düşürmez." },
  { q: "Özel oda maçları puanı etkiliyor mu?", a: "Hayır. Özel oda maçları serbest moddur, RP verilmez." },
  { q: "Yavaş internet bağlantısında oynanabilir mi?", a: "Evet. Supabase fallback ile düşük bant genişliğinde bile çalışır." },
];

// ─── Floating Ball ────────────────────────────────────────────────────────────
function FloatingBall() {
  return (
    <div className="relative w-40 h-40 mx-auto select-none pointer-events-none">
      <motion.div
        animate={{ y: [-12, 12, -12], rotate: [0, 360] }}
        transition={{ y: { duration: 3, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 8, repeat: Infinity, ease: "linear" } }}
        className="w-40 h-40 rounded-full flex items-center justify-center text-8xl shadow-[0_0_60px_rgba(68,170,255,0.3),0_0_120px_rgba(68,170,255,0.15)]"
        style={{ background: "radial-gradient(circle at 38% 38%, #fff 0%, #e0e8ff 35%, #8ab4f8 60%, #1a3a5c 100%)" }}
      >
      </motion.div>
      <motion.div
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(68,170,255,0.25) 0%, transparent 70%)" }}
      />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative z-10 w-full max-w-5xl mx-auto px-5 md:px-10 ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ tag, title, accent, sub }: { tag: string; title: string; accent?: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center mb-10 md:mb-14">
      <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border"
        style={{ color: "#4af", borderColor: "rgba(68,170,255,0.25)", background: "rgba(68,170,255,0.08)" }}>
        {tag}
      </span>
      <h2 className="text-white font-black text-3xl md:text-4xl leading-tight">
        {title}{accent && <> <span style={{ color: "#4af" }}>{accent}</span></>}
      </h2>
      {sub && <p className="text-white/40 text-base max-w-xl">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage({ onLogin, onRegister, onTryGuest }: Props) {
  const [faqOpen,    setFaqOpen]   = useState<number | null>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY       = useTransform(scrollY, [0, 400], [0, -80]);

  useEffect(() => {
    const unsub = scrollY.on("change", v => setNavScrolled(v > 40));
    return unsub;
  }, [scrollY]);

  return (
    <div className="min-h-[100dvh] bg-[#070d16] overflow-x-hidden relative font-sans">

      {/* ── Arka plan efektleri ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #1a4a1a 0%, transparent 70%)" }} />
        <div className="absolute top-[10%] right-[-10%] w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #4af 0%, transparent 70%)" }} />
        <div className="absolute bottom-[20%] left-[-5%] w-80 h-80 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
      </div>

      {/* ── Navbar ── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-10 py-3.5 transition-all duration-300"
        style={{
          backdropFilter: navScrolled ? "blur(20px)" : "none",
          background: navScrolled ? "rgba(7,13,22,0.85)" : "transparent",
          borderBottom: navScrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg,rgba(68,170,255,0.25),rgba(68,170,255,0.08))", border: "1px solid rgba(68,170,255,0.2)" }}>
            ⚽
          </div>
          <span className="text-white font-black text-xl tracking-tight">
            Nova<span style={{ color: "#4af" }}>Ball</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-white/40">
          {[["Özellikler","#features"],["Modlar","#modes"],["Ranklar","#ranks"],["Destek","#support"]].map(([label, href]) => (
            <a key={href} href={href}
              className="hover:text-white/80 transition-colors"
              onClick={e => { e.preventDefault(); document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }); }}>
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <motion.a
            href="https://discord.gg/JS5cwujrBE"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white/70 hover:text-white transition-all"
            style={{ background: "rgba(88,101,242,0.18)", border: "1px solid rgba(88,101,242,0.35)", color: "#818cf8" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Discord
          </motion.a>
          <button onClick={onLogin}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white/60 hover:text-white border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all">
            Giriş Yap
          </button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={onRegister}
            className="px-4 py-2 rounded-xl text-sm font-black text-white transition-all"
            style={{ background: "linear-gradient(135deg,#1d6fa4,#4af)", border: "1px solid rgba(68,170,255,0.3)" }}>
            Kayıt Ol
          </motion.button>
        </div>
      </motion.nav>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO                                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <motion.div ref={heroRef} style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-5 pt-20 pb-10 text-center">

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 text-xs font-black uppercase tracking-widest"
          style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
          Beta · Haziran 2026
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="mb-8">
          <FloatingBall />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="text-white font-black text-5xl md:text-7xl tracking-tight leading-none mb-4">
          Nova<span style={{ color: "#4af", textShadow: "0 0 40px rgba(68,170,255,0.5)" }}>Ball</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="text-white/50 text-lg md:text-xl max-w-xl leading-relaxed mb-2">
          Tarayıcıda oynanan hızlı, rekabetçi 2D futbol.
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className="text-white/25 text-sm mb-10">
          Haxball ve Mamoball'dan ilham alan modern arcade deneyimi
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <motion.button whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(68,170,255,0.4)" }} whileTap={{ scale: 0.97 }}
            onClick={onRegister}
            className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-black text-white w-full sm:w-auto"
            style={{ background: "linear-gradient(135deg,#1a5f8a,#4af)", border: "1px solid rgba(68,170,255,0.4)" }}>
            <Play size={16} fill="white" /> Hemen Oyna
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onLogin}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white/60 hover:text-white/90 border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all w-full sm:w-auto">
            Giriş Yap <ArrowRight size={15} />
          </motion.button>
          {onTryGuest && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={onTryGuest}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold border transition-all w-full sm:w-auto"
              style={{ color: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
              Kayıt Olmadan Dene
            </motion.button>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="flex items-center gap-8 mt-14 text-white/25 text-sm">
          {[["1v1–5v5","Oyun Modu"],["7","Rank Kademesi"],["100%","Ücretsiz"]].map(([val, lbl]) => (
            <div key={lbl} className="flex flex-col items-center gap-0.5">
              <span className="text-white font-black text-xl">{val}</span>
              <span className="text-[11px]">{lbl}</span>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20">
          <span className="text-[11px] uppercase tracking-widest">Keşfet</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronDown size={16} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ÖZELLİKLER                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section id="features" className="py-20 md:py-28">
        <SectionTitle tag="Özellikler" title="Her Şey Burada" accent="Hazır"
          sub="Tarayıcı tabanlı oyunun sınırlarını zorlayan, modern bir arcade futbol deneyimi." />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="flex flex-col gap-4 p-5 rounded-2xl transition-all group"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                style={{ background: `${f.color}15`, border: `1px solid ${f.color}25`, color: f.color }}>
                {f.icon}
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-white font-black text-base">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* OYUN MODLARI                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section id="modes" className="py-20 md:py-28">
        <SectionTitle tag="Oyun Modları" title="1v1'den" accent="5v5'e"
          sub="Her format farklı bir strateji gerektirir. Hangisi senin oyunun?" />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {MODES.map((m, i) => (
            <motion.div key={m.mode}
              initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.04, y: -4 }}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl cursor-default transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
              <span className="text-4xl">{m.emoji}</span>
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-white font-black text-xl">{m.mode}</span>
                <span className="text-white/25 text-[11px]">{m.players} oyuncu</span>
                <span className="text-white/40 text-xs leading-snug mt-0.5">{m.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-6 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
          <span className="text-2xl">🏠</span>
          <div>
            <p className="text-white font-bold text-sm">Özel Odalar</p>
            <p className="text-white/40 text-xs">Arkadaşlarınla özel oda aç. Oda açık kalır — maç başladıktan sonra bile yeni oyuncular katılabilir.</p>
          </div>
        </motion.div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RANK SİSTEMİ                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section id="ranks" className="py-20 md:py-28">
        <SectionTitle tag="Rank Sistemi" title="Demir'den" accent="Usta'ya"
          sub="7 kademe, 19 seviye. Her maç kazandığında RP kazan, rakiplerini geride bırak." />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {RANKS.map((r, i) => (
            <motion.div key={r.name}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -6, scale: 1.04 }}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl cursor-default transition-all"
              style={{
                background: `${r.color}08`,
                border: `1px solid ${r.color}25`,
                boxShadow: `0 0 20px ${r.color}10`,
              }}>
              <span className="text-3xl">{r.icon}</span>
              <div className="flex flex-col items-center gap-0.5 text-center">
                <span className="font-black text-sm" style={{ color: r.color }}>{r.name}</span>
                <span className="text-white/25 text-[10px]">{r.rp} RP</span>
                <span className="text-white/40 text-[10px]">{r.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: <Star size={16} />, label: "RP Kazan", val: "Her kazanılan maçta 10–25 RP", color: "#FFD700" },
            { icon: <Crown size={16} />, label: "Rank Atla", val: "Bir üst kademedeki oyuncularla eşleş", color: "#a78bfa" },
            { icon: <Shield size={16} />, label: "Kayıp Yok", val: "Kaybetmek RP düşürmez", color: "#4ade80" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: `${item.color}08`, border: `1px solid ${item.color}20` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}15`, color: item.color }}>
                {item.icon}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{item.label}</p>
                <p className="text-white/35 text-xs">{item.val}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* NASIL OYNANIR                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section className="py-20 md:py-28">
        <SectionTitle tag="Nasıl Oynanır" title="4 Adımda" accent="Başla" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <motion.div key={s.step}
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative flex flex-col gap-3 p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-4xl font-black"
                style={{ color: "rgba(68,170,255,0.15)", fontVariantNumeric: "tabular-nums" }}>
                {s.step}
              </span>
              <div>
                <h3 className="text-white font-black text-base mb-1">{s.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-2.5 -translate-y-1/2 z-10">
                  <ChevronRight size={16} className="text-white/15" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CTA (Kayıt / Giriş orta bant)                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section className="py-16">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="flex flex-col items-center gap-6 p-8 md:p-12 rounded-3xl text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,rgba(68,170,255,0.08),rgba(167,139,250,0.06))",
            border: "1px solid rgba(68,170,255,0.18)",
          }}>
          <div className="absolute inset-0 pointer-events-none rounded-3xl"
            style={{ background: "radial-gradient(ellipse at 50% -20%,rgba(68,170,255,0.12) 0%,transparent 60%)" }} />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <span className="text-5xl">⚽</span>
            <h2 className="text-white font-black text-3xl md:text-4xl leading-tight">
              Oynamaya Hazır mısın?
            </h2>
            <p className="text-white/40 text-base max-w-md">
              Ücretsiz kayıt ol. Bir dakika içinde sahada ol.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full sm:w-auto justify-center">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                onClick={onRegister}
                className="px-8 py-4 rounded-2xl text-base font-black text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#1a5f8a,#4af)", border: "1px solid rgba(68,170,255,0.4)" }}>
                <Play size={15} fill="white" /> Ücretsiz Kayıt Ol
              </motion.button>
              <button onClick={onLogin}
                className="px-8 py-4 rounded-2xl text-base font-bold text-white/50 hover:text-white border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all">
                Giriş Yap
              </button>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DESTEK / SSS                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section id="support" className="py-20 md:py-28">
        <SectionTitle tag="Destek" title="Yardıma mı" accent="İhtiyacın Var?"
          sub="Soruların için bize ulaş veya sık sorulan sorulara göz at." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* E-posta kartı */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="flex flex-col gap-4 p-6 rounded-2xl"
            style={{ background: "rgba(68,170,255,0.05)", border: "1px solid rgba(68,170,255,0.15)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(68,170,255,0.12)", border: "1px solid rgba(68,170,255,0.2)", color: "#4af" }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-white font-black text-lg mb-1">E-Posta</h3>
              <p className="text-white/40 text-sm mb-3">Her türlü sorun, öneri veya geri bildirim için bize yaz.</p>
              <a href="mailto:support.novaballofficial@gmail.com"
                className="inline-flex items-center gap-2 text-[#4af] font-bold text-sm hover:underline">
                support.novaballofficial@gmail.com <ArrowRight size={13} />
              </a>
            </div>
          </motion.div>

          {/* Discord / Topluluk */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="flex flex-col gap-4 p-6 rounded-2xl"
            style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}>
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="text-white font-black text-lg mb-1">Topluluk</h3>
              <p className="text-white/40 text-sm mb-3">Diğer oyuncularla tanış, turnuvalar ve duyurular.</p>
              <span className="inline-flex items-center gap-2 text-white/25 text-sm">
                Yakında…
              </span>
            </div>
          </motion.div>
        </div>

        {/* SSS */}
        <h3 className="text-white font-black text-xl mb-4">Sık Sorulan Sorular</h3>
        <div className="flex flex-col gap-2">
          {FAQ.map((item, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left transition-all hover:bg-white/3"
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              >
                <span className="text-white font-semibold text-sm pr-4">{item.q}</span>
                <motion.div animate={{ rotate: faqOpen === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={15} className="text-white/30 flex-shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence>
                {faqOpen === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    transition={{ duration: 0.2 }} className="overflow-hidden">
                    <p className="px-5 pb-4 text-white/40 text-sm leading-relaxed">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/6 mt-8">
        <div className="w-full max-w-5xl mx-auto px-5 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                style={{ background: "rgba(68,170,255,0.12)", border: "1px solid rgba(68,170,255,0.18)" }}>⚽</div>
              <span className="text-white font-black text-lg">Nova<span style={{ color: "#4af" }}>Ball</span></span>
            </div>
            <p className="text-white/20 text-xs">© 2026 NovaBall · Tüm hakları saklıdır.</p>
            <p className="text-white/15 text-xs">Kuruldu: 11 Haziran 2026</p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 justify-center text-sm text-white/30">
            {[
              ["Kayıt Ol", onRegister],
              ["Giriş Yap", onLogin],
            ].map(([label, handler]) => (
              <button key={label as string} onClick={handler as () => void}
                className="hover:text-white/60 transition-colors font-semibold">
                {label as string}
              </button>
            ))}
            <a href="mailto:support.novaballofficial@gmail.com" className="hover:text-white/60 transition-colors font-semibold">
              support.novaballofficial@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

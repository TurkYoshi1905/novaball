import { useState, useEffect, useRef } from "react";
import { Mail, RefreshCw, CheckCircle, LogIn, ShieldCheck } from "lucide-react";
import { resendVerification, signOut } from "../../lib/auth";

interface Props {
  email: string;
  onGoLogin: () => void;
}

const COOLDOWN_SECS = 60;

export default function EmailVerifyPage({ email, onGoLogin }: Props) {
  const [resending, setResending]   = useState(false);
  const [resent,    setResent]      = useState(false);
  const [error,     setError]       = useState("");
  const [cooldown,  setCooldown]    = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown() {
    setCooldown(COOLDOWN_SECS);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    setResent(false);
    try {
      const { error: e } = await resendVerification(email);
      if (e) {
        setError(e.message);
      } else {
        setResent(true);
        startCooldown();
      }
    } finally {
      setResending(false);
    }
  }

  async function handleBackToLogin() {
    await signOut();
    onGoLogin();
  }

  const btnDisabled = resending || cooldown > 0;

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden px-5">
      <div className="pitch-glow pointer-events-none" />
      <div className="orb orb-1 pointer-events-none" />
      <div className="orb orb-2 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6 animate-fade-in text-center">

        {/* İkon */}
        <div className="w-20 h-20 rounded-3xl bg-[#4af]/10 border border-[#4af]/25 flex items-center justify-center shadow-[0_0_40px_rgba(68,170,255,0.15)]">
          <Mail size={36} className="text-[#4af]" />
        </div>

        {/* Başlık */}
        <div className="flex flex-col gap-2">
          <h2 className="text-white font-black text-3xl">E-postanı Doğrula</h2>
          <p className="text-white/40 text-sm leading-relaxed">
            Hesabına erişmek için önce e-postanı doğrulamalısın.
          </p>
          <div className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5">
            <span className="text-white font-semibold text-sm break-all">{email}</span>
          </div>
        </div>

        {/* Zorunluluk uyarısı */}
        <div className="w-full flex items-start gap-2.5 rounded-xl border border-[#4af]/20 bg-[#4af]/6 px-4 py-3 text-left">
          <ShieldCheck size={16} className="text-[#4af] flex-shrink-0 mt-0.5" />
          <p className="text-[#4af]/80 text-xs leading-relaxed">
            E-posta doğrulaması zorunludur. Doğrulamadan oyuna giriş yapamazsın.
          </p>
        </div>

        {/* Adımlar */}
        <div className="w-full flex flex-col gap-2.5 text-left">
          {[
            { num: "1", text: "Gelen kutunu aç (spam klasörüne de bak)" },
            { num: "2", text: "\"NovaBall — E-posta Doğrulama\" konulu e-postayı bul" },
            { num: "3", text: "\"Doğrula\" bağlantısına tıkla — otomatik giriş yapılır" },
          ].map(s => (
            <div key={s.num} className="flex items-start gap-3 bg-white/3 border border-white/7 rounded-xl px-4 py-3">
              <span className="w-6 h-6 rounded-full bg-[#4af]/20 text-[#4af] flex items-center justify-center text-xs font-black flex-shrink-0 mt-px">
                {s.num}
              </span>
              <span className="text-white/60 text-sm leading-relaxed">{s.text}</span>
            </div>
          ))}
        </div>

        {resent && (
          <div className="w-full flex items-center gap-2 rounded-xl border border-[#4ade80]/30 bg-[#4ade80]/8 px-4 py-3">
            <CheckCircle size={16} className="text-[#4ade80] flex-shrink-0" />
            <span className="text-[#4ade80] text-sm">Doğrulama e-postası tekrar gönderildi!</span>
          </div>
        )}

        {error && (
          <div className="w-full rounded-xl border border-[#f87171]/30 bg-[#f87171]/8 px-4 py-3 text-[#f87171] text-sm">
            {error}
          </div>
        )}

        {/* Butonlar */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={handleResend}
            disabled={btnDisabled}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-white/12 bg-white/5 text-white/70 font-semibold text-sm hover:bg-white/8 hover:text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={resending ? "animate-spin" : ""} />
            {resending
              ? "Gönderiliyor…"
              : cooldown > 0
                ? `Tekrar Gönder (${cooldown}s)`
                : "Tekrar Gönder"
            }
          </button>

          <button
            onClick={handleBackToLogin}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-white/8 bg-transparent text-white/40 font-semibold text-sm hover:text-white/60 transition-all active:scale-[0.98]"
          >
            <LogIn size={15} />
            Farklı hesapla giriş yap
          </button>
        </div>

        <p className="text-white/20 text-xs leading-relaxed max-w-xs">
          Bağlantıya tıkladıktan sonra bu sayfa otomatik olarak güncellenir.
        </p>
      </div>
    </div>
  );
}

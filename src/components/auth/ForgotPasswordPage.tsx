import { useState } from "react";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { resetPassword } from "../../lib/auth";

interface Props {
  onBack: () => void;
}

export default function ForgotPasswordPage({ onBack }: Props) {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Geçerli bir e-posta adresi gir.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await resetPassword(email);
      if (err) {
        setError(err.message);
      } else {
        setSent(true);
      }
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-auto py-8 px-5">
      <div className="pitch-glow pointer-events-none" />
      <div className="orb orb-1 pointer-events-none" />
      <div className="orb orb-2 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6 animate-fade-in">

        {/* Geri butonu */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm w-fit"
        >
          <ArrowLeft size={16} />
          Giriş Yap'a Dön
        </button>

        {/* Logo + Başlık */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4af]/20 to-[#4af]/5 border border-[#4af]/20 flex items-center justify-center shadow-[0_0_32px_rgba(68,170,255,0.15)]">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-white font-black text-3xl tracking-tight">
            Şifremi <span className="text-[#4af]">Unuttum</span>
          </h1>
          <p className="text-white/35 text-sm text-center max-w-xs">
            E-posta adresini gir, şifre sıfırlama bağlantısını gönderelim.
          </p>
        </div>

        {sent ? (
          /* ─── Başarı ekranı ─── */
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-16 h-16 rounded-full bg-[#4af]/10 border border-[#4af]/30 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-[#4af]" />
            </div>
            <div className="text-center flex flex-col gap-2">
              <p className="text-white font-bold text-lg">E-posta Gönderildi!</p>
              <p className="text-white/45 text-sm leading-relaxed max-w-[260px]">
                <span className="text-[#4af] font-semibold">{email}</span> adresine şifre sıfırlama bağlantısı gönderdik.
              </p>
              <p className="text-white/30 text-xs mt-1">Gelen kutunu kontrol et. Spam klasörüne de bakabilirsin.</p>
            </div>

            <div className="w-full bg-white/[.04] border border-white/8 rounded-2xl px-5 py-4 flex flex-col gap-1.5">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Sonraki adım</p>
              <p className="text-white/65 text-sm leading-relaxed">
                E-postadaki bağlantıya tıkla → uygulamaya dön → yeni şifreni belirle.
              </p>
            </div>

            <button
              onClick={onBack}
              className="w-full py-3.5 rounded-2xl bg-white/6 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
            >
              Giriş Yap'a Dön
            </button>
          </div>
        ) : (
          /* ─── Form ─── */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">
                E-Posta Adresi
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  autoComplete="email"
                  className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3.5 text-white placeholder-white/20 text-sm outline-none
                    focus:border-[#4af]/40 focus:bg-white/8 transition-all
                    ${error ? "border-[#f87171]/50 bg-[#f87171]/5" : "border-white/10"}`}
                />
              </div>
              {error && <p className="text-[#f87171] text-xs">{error}</p>}
            </div>

            {/* Bilgi kutusu */}
            <div className="bg-white/[.03] border border-white/8 rounded-xl px-4 py-3 flex gap-3 items-start">
              <span className="text-[#4af] text-base mt-0.5 flex-shrink-0">ℹ️</span>
              <p className="text-white/40 text-xs leading-relaxed">
                Supabase aracılığıyla şifre sıfırlama e-postası gönderilir. Bağlantı <strong className="text-white/60">1 saat</strong> geçerlidir.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="novaball-btn-ranked w-full py-4 rounded-2xl text-white font-black text-base tracking-wide transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Gönderiliyor…</>
                : <><span>Sıfırlama Bağlantısı Gönder</span></>
              }
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

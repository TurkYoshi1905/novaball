import { useState } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { updatePassword } from "../../lib/auth";

interface Props {
  onDone: () => void;
}

export default function ResetPasswordPage({ onDone }: Props) {
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");

  const strength = password.length === 0 ? 0
    : password.length < 6   ? 1
    : password.length < 10  ? 2
    : /[^a-zA-Z0-9]/.test(password) ? 4 : 3;

  const strengthLabel = ["", "Çok Zayıf", "Zayıf", "İyi", "Güçlü"][strength];
  const strengthColor = ["", "#f87171", "#fbbf24", "#4ade80", "#22c55e"][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Şifre en az 6 karakter olmalı."); return; }
    if (password !== confirm)  { setError("Şifreler eşleşmiyor."); return; }

    setLoading(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) { setError(err.message); }
      else      { setDone(true); }
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

        {/* Logo + Başlık */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4af]/20 to-[#4af]/5 border border-[#4af]/20 flex items-center justify-center shadow-[0_0_32px_rgba(68,170,255,0.15)]">
            <ShieldCheck size={26} className="text-[#4af]" />
          </div>
          <h1 className="text-white font-black text-3xl tracking-tight">
            Yeni <span className="text-[#4af]">Şifre</span>
          </h1>
          <p className="text-white/35 text-sm text-center">
            Hesabın için güçlü bir şifre belirle.
          </p>
        </div>

        {done ? (
          /* ─── Başarı ─── */
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-[#22c55e]" />
            </div>
            <div className="text-center flex flex-col gap-2">
              <p className="text-white font-bold text-lg">Şifre Güncellendi! 🎉</p>
              <p className="text-white/45 text-sm">Yeni şifrenle giriş yapabilirsin.</p>
            </div>
            <button
              onClick={onDone}
              className="novaball-btn-ranked w-full py-4 rounded-2xl text-white font-black text-base tracking-wide transition-all active:scale-[0.97]"
            >
              Ana Menüye Git
            </button>
          </div>
        ) : (
          /* ─── Form ─── */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Yeni Şifre */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">
                Yeni Şifre
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  autoComplete="new-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm outline-none focus:border-[#4af]/40 focus:bg-white/8 transition-all pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {/* Güç göstergesi */}
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4].map(i => (
                      <div key={i}
                        className="h-1 flex-1 rounded-full transition-all"
                        style={{ background: i <= strength ? strengthColor : "rgba(255,255,255,0.08)" }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Şifre Tekrar */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">
                Şifre Tekrar
              </label>
              <div className="relative">
                <input
                  type={showConf ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Şifreni tekrar gir"
                  autoComplete="new-password"
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm outline-none transition-all pr-10
                    ${confirm && confirm !== password ? "border-[#f87171]/50" : "border-white/10 focus:border-[#4af]/40 focus:bg-white/8"}`}
                />
                <button type="button" onClick={() => setShowConf(!showConf)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {confirm && confirm !== password && (
                <p className="text-[#f87171] text-xs">Şifreler eşleşmiyor</p>
              )}
              {confirm && confirm === password && password.length >= 6 && (
                <p className="text-[#22c55e] text-xs flex items-center gap-1">
                  <CheckCircle2 size={12} /> Şifreler eşleşiyor
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-[#f87171]/30 bg-[#f87171]/8 px-4 py-3 text-[#f87171] text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="novaball-btn-ranked w-full py-4 rounded-2xl text-white font-black text-base tracking-wide transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Güncelleniyor…</>
                : "Şifreyi Güncelle"
              }
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

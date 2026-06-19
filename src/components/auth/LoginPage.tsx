import { useState } from "react";
import { Eye, EyeOff, Loader2, ChevronRight } from "lucide-react";
import { signIn } from "../../lib/auth";
import { verifyUsernameEmail } from "../../lib/db";

interface Props {
  onGoRegister: () => void;
  onGoForgot:   () => void;
}

export default function LoginPage({ onGoRegister, onGoForgot }: Props) {
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [globalErr, setGlobalErr] = useState("");

  const usernameClean = username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);

  function validate() {
    const e: Record<string, string> = {};
    if (usernameClean.length < 3) e.username = "En az 3 karakter";
    if (!/\S+@\S+\.\S+/.test(email)) e.email = "Geçerli bir e-posta gir";
    if (!password) e.password = "Şifre gerekli";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalErr("");
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      // Kullanıcı adı + e-posta eşleşmesini sunucu tarafında doğrula (e-posta istemciye gönderilmez)
      const matched = await verifyUsernameEmail(usernameClean, email);
      if (!matched) {
        setGlobalErr("Kullanıcı adı veya e-posta hatalı.");
        return;
      }

      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login")) {
          setGlobalErr("E-posta veya şifre hatalı.");
        } else if (error.message.includes("Email not confirmed")) {
          setGlobalErr("E-postanı henüz doğrulamadın. Gelen kutunu kontrol et.");
        } else {
          setGlobalErr(error.message);
        }
      }
    } catch (err: unknown) {
      setGlobalErr(err instanceof Error ? err.message : "Bir hata oluştu");
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
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4af]/20 to-[#4af]/5 border border-[#4af]/20 flex items-center justify-center shadow-[0_0_32px_rgba(68,170,255,0.15)]">
            <span className="text-2xl">⚽</span>
          </div>
          <h1 className="text-white font-black text-4xl tracking-tight">
            Nova<span className="text-[#4af]">Ball</span>
          </h1>
          <h2 className="text-white font-bold text-2xl mt-1">Hoşgeldin! 👋</h2>
          <p className="text-white/30 text-sm">Hesabına giriş yap</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Kullanıcı Adı */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Kullanıcı Adı</label>
            <input
              type="text"
              value={usernameClean}
              onChange={e => setUsername(e.target.value)}
              placeholder="kullanici_adin"
              maxLength={15}
              autoComplete="username"
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none
                focus:border-white/25 focus:bg-white/8 transition-all
                ${errors.username ? "border-[#f87171]/50 bg-[#f87171]/5" : "border-white/10"}`}
            />
            {errors.username && <p className="text-[#f87171] text-xs">{errors.username}</p>}
          </div>

          {/* E-Posta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">E-Posta</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              autoComplete="email"
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none
                focus:border-white/25 focus:bg-white/8 transition-all
                ${errors.email ? "border-[#f87171]/50 bg-[#f87171]/5" : "border-white/10"}`}
            />
            {errors.email && <p className="text-[#f87171] text-xs">{errors.email}</p>}
          </div>

          {/* Şifre */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Şifre</label>
              <button
                type="button"
                onClick={onGoForgot}
                className="text-[#4af]/70 text-xs hover:text-[#4af] transition-colors"
              >
                Şifremi Unuttum
              </button>
            </div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none
                  focus:border-white/25 focus:bg-white/8 transition-all pr-10
                  ${errors.password ? "border-[#f87171]/50 bg-[#f87171]/5" : "border-white/10"}`}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && <p className="text-[#f87171] text-xs">{errors.password}</p>}
          </div>

          {globalErr && (
            <div className="rounded-xl border border-[#f87171]/30 bg-[#f87171]/8 px-4 py-3 text-[#f87171] text-sm">
              {globalErr}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="novaball-btn-ranked w-full py-4 rounded-2xl text-white font-black text-base tracking-wide transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Giriş yapılıyor…</>
              : <><span>Giriş Yap</span><ChevronRight size={18} /></>
            }
          </button>
        </form>

        <div className="text-center">
          <span className="text-white/30 text-sm">Hesabın yok mu? </span>
          <button onClick={onGoRegister} className="text-[#4af] font-bold text-sm hover:text-white transition-colors">
            Kayıt Ol
          </button>
        </div>
      </div>
    </div>
  );
}

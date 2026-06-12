import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Check, X, Loader2, ChevronRight } from "lucide-react";
import { signUp } from "../../lib/auth";
import { isUsernameAvailable, createPlayer } from "../../lib/db";

interface Props {
  onSuccess: (email: string) => void;
  onGoLogin: () => void;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "En az 8 karakter", ok: password.length >= 8 },
    { label: "Büyük harf", ok: /[A-Z]/.test(password) },
    { label: "Rakam", ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["bg-white/10", "bg-[#f87171]", "bg-[#facc15]", "bg-[#4ade80]"];
  const labels = ["", "Zayıf", "Orta", "Güçlü"];
  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex gap-1">
        {[1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-white/10"}`} />
        ))}
        {score > 0 && <span className="text-[11px] text-white/40 ml-1">{labels[score]}</span>}
      </div>
    </div>
  );
}

function Field({
  label, type, value, onChange, placeholder, error, hint,
  rightEl, autoComplete,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  error?: string; hint?: React.ReactNode; rightEl?: React.ReactNode;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none
            focus:border-white/25 focus:bg-white/8 transition-all pr-10
            ${error ? "border-[#f87171]/50 bg-[#f87171]/5" : "border-white/10"}`}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
      {error && <p className="text-[#f87171] text-xs">{error}</p>}
      {hint && !error && hint}
    </div>
  );
}

export default function RegisterPage({ onSuccess, onGoLogin }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [username,    setUsername]    = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(false);
  const [globalErr, setGlobalErr] = useState("");

  const [usernameStatus, setUsernameStatus] = useState<"idle"|"checking"|"available"|"taken">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!username) { setUsernameStatus("idle"); return; }
    const clean = username.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.length < 3) { setUsernameStatus("idle"); return; }

    setUsernameStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const ok = await isUsernameAvailable(clean);
      setUsernameStatus(ok ? "available" : "taken");
    }, 600);
  }, [username]);

  const usernameClean = username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);

  function validate() {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = "Görünen ad gerekli";
    if (displayName.trim().length > 32) e.displayName = "En fazla 32 karakter";
    if (usernameClean.length < 3) e.username = "En az 3 karakter";
    if (usernameStatus === "taken") e.username = "Bu kullanıcı adı alınmış";
    if (!/\S+@\S+\.\S+/.test(email)) e.email = "Geçerli bir e-posta gir";
    if (password.length < 8) e.password = "En az 8 karakter";
    if (password !== confirm) e.confirm = "Şifreler eşleşmiyor";
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
      const { data, error } = await signUp(email, password, usernameClean, displayName.trim());
      if (error) { setGlobalErr(error.message); return; }
      if (data.user) {
        await createPlayer(usernameClean, displayName.trim(), email, data.user.id);
      }
      onSuccess(email);
    } catch (err: unknown) {
      setGlobalErr(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  const statusIcon = usernameStatus === "checking" ? (
    <Loader2 size={14} className="animate-spin text-white/30" />
  ) : usernameStatus === "available" ? (
    <Check size={14} className="text-[#4ade80]" />
  ) : usernameStatus === "taken" ? (
    <X size={14} className="text-[#f87171]" />
  ) : null;

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-auto py-8 px-5">
      <div className="pitch-glow pointer-events-none" />
      <div className="orb orb-1 pointer-events-none" />
      <div className="orb orb-2 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6 animate-fade-in">

        {/* Logo */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <h1 className="text-white font-black text-4xl tracking-tight">
            Nova<span className="text-[#4af]">Ball</span>
          </h1>
          <p className="text-white/30 text-xs tracking-widest uppercase">Hesap Oluştur</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Görünen Ad */}
          <Field
            label="Görünen Ad"
            type="text"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Nasıl görünmek istiyorsun?"
            error={errors.displayName}
            autoComplete="name"
          />

          {/* Kullanıcı Adı */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Kullanıcı Adı</label>
            <div className="relative">
              <input
                type="text"
                value={usernameClean}
                onChange={e => setUsername(e.target.value)}
                placeholder="yalnizca_kucuk_harf"
                maxLength={15}
                autoComplete="username"
                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none
                  focus:border-white/25 focus:bg-white/8 transition-all pr-10
                  ${errors.username ? "border-[#f87171]/50 bg-[#f87171]/5" : "border-white/10"}`}
              />
              {statusIcon && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">{statusIcon}</div>
              )}
            </div>
            {errors.username
              ? <p className="text-[#f87171] text-xs">{errors.username}</p>
              : <p className="text-white/25 text-xs">Küçük harf ve rakam, maks 15 karakter · {usernameClean.length}/15</p>
            }
            {usernameStatus === "available" && !errors.username && (
              <p className="text-[#4ade80] text-xs">✓ Kullanılabilir</p>
            )}
          </div>

          {/* E-Posta */}
          <Field
            label="E-Posta"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="ornek@mail.com"
            error={errors.email}
            autoComplete="email"
          />

          {/* Şifre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Şifre</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="En az 8 karakter"
                autoComplete="new-password"
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
            {password && <PasswordStrength password={password} />}
          </div>

          {/* Şifre Onayla */}
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs font-semibold uppercase tracking-widest">Şifre Tekrar</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Şifreni tekrar gir"
                autoComplete="new-password"
                className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none
                  focus:border-white/25 focus:bg-white/8 transition-all pr-10
                  ${errors.confirm ? "border-[#f87171]/50 bg-[#f87171]/5" : confirm && confirm === password ? "border-[#4ade80]/30" : "border-white/10"}`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.confirm && <p className="text-[#f87171] text-xs">{errors.confirm}</p>}
            {confirm && confirm === password && !errors.confirm && (
              <p className="text-[#4ade80] text-xs flex items-center gap-1"><Check size={11} /> Şifreler eşleşiyor</p>
            )}
          </div>

          {globalErr && (
            <div className="rounded-xl border border-[#f87171]/30 bg-[#f87171]/8 px-4 py-3 text-[#f87171] text-sm">
              {globalErr}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || usernameStatus === "checking" || usernameStatus === "taken"}
            className="novaball-btn-ranked w-full py-4 rounded-2xl text-white font-black text-base tracking-wide transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Oluşturuluyor…</>
              : <><span>Hesap Oluştur</span><ChevronRight size={18} /></>
            }
          </button>
        </form>

        <div className="text-center">
          <span className="text-white/30 text-sm">Zaten hesabın var mı? </span>
          <button onClick={onGoLogin} className="text-[#4af] font-bold text-sm hover:text-white transition-colors">
            Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
}

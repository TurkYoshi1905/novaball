import { useState, useEffect, type FormEvent } from "react";

interface Props {
  onContinue: (username: string) => void;
}

const STORAGE_KEY = "novaball_username";

export default function UsernameScreen({ onContinue }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setValue(saved);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setError("Kullanıcı adı en az 2 karakter olmalı.");
      setShake(true); setTimeout(() => setShake(false), 500); return;
    }
    if (trimmed.length > 16) {
      setError("Kullanıcı adı en fazla 16 karakter olabilir.");
      setShake(true); setTimeout(() => setShake(false), 500); return;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    onContinue(trimmed);
  }

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="relative z-10 flex flex-col items-center gap-7 px-5 w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="logo-ring">
            <div className="logo-inner">
              <span className="text-white font-black text-3xl tracking-tight">N</span>
            </div>
          </div>
          <h1 className="text-white font-black text-5xl tracking-tight">
            Nova<span className="text-[#4af]">Ball</span>
          </h1>
          <p className="text-white/40 text-sm tracking-widest uppercase">Arcade Football</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={`w-full flex flex-col gap-4 ${shake ? "animate-shake" : ""}`}
        >
          <div className="flex flex-col gap-2">
            <label className="text-white/60 text-xs uppercase tracking-widest font-semibold pl-1">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={16}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(""); }}
              placeholder="Adınızı girin…"
              className="novaball-input w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-lg font-semibold outline-none focus:border-[#4af]/60 focus:bg-white/8 transition-all"
              style={{ fontSize: "16px" }}
            />
            {error && (
              <p className="text-red-400 text-xs pl-1 animate-fade-in">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="novaball-btn w-full py-4 rounded-xl text-white font-bold text-lg tracking-wide transition-all active:scale-[0.97]"
          >
            Devam Et →
          </button>
        </form>

        <p className="text-white/20 text-xs text-center leading-relaxed">
          Adınız cihazınızda hatırlanır.<br />İstediğiniz zaman değiştirebilirsiniz.
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  ChevronLeft, Settings, User, Lock,
  Info, Eye, EyeOff, Check, X, AlertCircle, RefreshCw, Mail, Shield, Edit2
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { isUsernameAvailable } from "../lib/db";
import {
  loadKeybindings, saveKeybindings, DEFAULT_KEYBINDINGS,
  KEY_LABEL, BINDING_LABELS, ALT_KEYS, type Keybindings,
} from "../utils/keybindings";
import { FOUNDING_DATE } from "../types/game";

interface Props {
  username:             string;
  displayName:          string;
  onBack:               () => void;
  onUsernameChange:     (v: string) => void;
  onDisplayNameChange:  (v: string) => void;
}

type Tab    = "account" | "controls" | "about";
type Modal  = null | "username" | "displayname" | "password";

export default function SettingsPage({
  username, displayName, onBack, onUsernameChange, onDisplayNameChange,
}: Props) {
  const [tab,   setTab]   = useState<Tab>("account");
  const [modal, setModal] = useState<Modal>(null);

  // Username modal
  const [newUsername,       setNewUsername]       = useState("");
  const [usernameAvail,     setUsernameAvail]     = useState<boolean | null>(null);
  const [usernameChecking,  setUsernameChecking]  = useState(false);

  // Display name modal
  const [newDisplayName, setNewDisplayName] = useState(displayName);

  // Password modal
  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw,    setShowPw]    = useState(false);

  // Feedback
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  // Keybindings
  const [bindings,  setBindings]  = useState<Keybindings>(loadKeybindings);
  const [rebinding, setRebinding] = useState<keyof Keybindings | null>(null);

  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Username availability debounce
  useEffect(() => {
    if (!newUsername || newUsername === username) {
      setUsernameAvail(null); setUsernameChecking(false); return;
    }
    if (!isValidUn(newUsername)) { setUsernameAvail(false); return; }
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    setUsernameChecking(true);
    checkTimerRef.current = setTimeout(async () => {
      const avail = await isUsernameAvailable(newUsername);
      setUsernameAvail(avail); setUsernameChecking(false);
    }, 600);
    return () => { if (checkTimerRef.current) clearTimeout(checkTimerRef.current); };
  }, [newUsername, username]);

  // Key rebind listener
  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const BLOCKED = ["Escape","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"];
      if (BLOCKED.includes(e.code)) { setRebinding(null); return; }
      const nb = { ...bindings, [rebinding]: e.code };
      setBindings(nb); saveKeybindings(nb); setRebinding(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rebinding, bindings]);

  function isValidUn(u: string) { return /^[a-z0-9_]{3,15}$/.test(u); }

  function openModal(m: Modal) {
    setModal(m); setError(""); setSuccess(""); setLoading(false);
    setNewUsername(""); setUsernameAvail(null); setUsernameChecking(false);
    setNewDisplayName(displayName);
    setCurrentPw(""); setNewPw(""); setConfirmPw(""); setShowPw(false);
  }

  function closeModal() {
    setModal(null); setLoading(false); setError(""); setSuccess("");
  }

  async function handleUsernameChange() {
    if (!newUsername || usernameAvail !== true || loading) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase.rpc("change_username", {
        p_old_username: username, p_new_username: newUsername,
      });
      if (err) {
        setError(
          err.message.includes("username_taken")    ? "Bu kullanıcı adı zaten alınmış."  :
          err.message.includes("username_invalid")  ? "Geçersiz kullanıcı adı."          :
          "Bir hata oluştu. Tekrar dene."
        ); return;
      }
      setSuccess("Kullanıcı adı başarıyla değiştirildi!");
      onUsernameChange(newUsername);
      setTimeout(closeModal, 1800);
    } catch { setError("Bağlantı hatası."); }
    finally { setLoading(false); }
  }

  async function handleDisplayNameChange() {
    const trimmed = newDisplayName.trim();
    if (!trimmed || trimmed.length > 32 || loading) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase.rpc("change_display_name", {
        p_username: username, p_new_display_name: trimmed,
      });
      if (err) { setError("Bir hata oluştu."); return; }
      setSuccess("Görünen ad başarıyla değiştirildi!");
      onDisplayNameChange(trimmed);
      setTimeout(closeModal, 1800);
    } catch { setError("Bağlantı hatası."); }
    finally { setLoading(false); }
  }

  async function handlePasswordChange() {
    if (!currentPw || !newPw || newPw !== confirmPw || loading) return;
    if (newPw.length < 6) { setError("Yeni şifre en az 6 karakter olmalı."); return; }
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setError("Oturum bilgisi alınamadı."); return; }
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email, password: currentPw,
      });
      if (signInErr) { setError("Mevcut şifre yanlış."); return; }
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) { setError("Şifre güncellenemedi."); return; }
      setSuccess("Şifre başarıyla değiştirildi!");
      setTimeout(closeModal, 1800);
    } catch { setError("Bağlantı hatası."); }
    finally { setLoading(false); }
  }

  const tabCls = (t: Tab) =>
    `flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
      tab === t ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"
    }`;

  const actionKeys = Object.keys(DEFAULT_KEYBINDINGS) as (keyof Keybindings)[];

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] bg-[#070d16] text-white overflow-hidden">
      {/* Portrait overlay */}
      <div className="portrait-overlay">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <span className="text-5xl">📱</span>
          <p className="text-white font-bold text-xl">Telefonu yatay tut</p>
          <p className="text-white/40 text-sm">NovaBall yatay ekranda daha iyi oynanır.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-8 py-4 border-b border-white/8 flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all">
          <ChevronLeft size={22} />
        </button>
        <Settings size={18} className="text-white/40" />
        <h1 className="text-white font-black text-xl">Ayarlar</h1>
        <span className="ml-auto text-white/20 text-xs font-mono bg-white/5 px-2 py-0.5 rounded-lg">v0.0.7</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 sm:px-8 pt-4 pb-2 flex-shrink-0">
        <div className="flex gap-1 rounded-2xl p-1 w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <button className={tabCls("account")}  onClick={() => setTab("account")}>👤 Hesap</button>
          <button className={tabCls("controls")} onClick={() => setTab("controls")}>🎮 Kontroller</button>
          <button className={tabCls("about")}    onClick={() => setTab("about")}>ℹ️ Hakkında</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">

        {/* ── Hesap ──────────────────────────────────────────────── */}
        {tab === "account" && (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            <p className="text-white/25 text-xs uppercase tracking-widest px-1 mb-1">Hesap Bilgileri</p>

            <SCard icon={<User size={15} />}  label="Kullanıcı Adı" value={`@${username}`}  onClick={() => openModal("username")} />
            <SCard icon={<Edit2 size={15} />} label="Görünen Ad"    value={displayName}      onClick={() => openModal("displayname")} />
            <SCard icon={<Lock size={15} />}  label="Şifre"         value="••••••••"         onClick={() => openModal("password")} />

            <p className="text-white/20 text-[11px] px-1 mt-1 leading-relaxed">
              Kullanıcı adı değiştirildiğinde tüm maç geçmişi otomatik olarak güncellenir.
              Görünen ad oyun içi canvas'ta ve sohbette gösterilir.
            </p>
          </div>
        )}

        {/* ── Kontroller ──────────────────────────────────────────── */}
        {tab === "controls" && (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-white/25 text-xs uppercase tracking-widest">Tuş Atamaları</p>
              <button
                onClick={() => { setBindings({ ...DEFAULT_KEYBINDINGS }); saveKeybindings({ ...DEFAULT_KEYBINDINGS }); }}
                className="flex items-center gap-1.5 text-white/28 hover:text-white/65 text-xs transition-colors"
              >
                <RefreshCw size={11} /> Varsayılana sıfırla
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {actionKeys.map((action, idx) => {
                const isLast  = idx === actionKeys.length - 1;
                const isRb    = rebinding === action;
                const altKey  = ALT_KEYS[action];
                return (
                  <div key={action} className={`flex items-center gap-3 px-4 py-3 ${!isLast ? "border-b border-white/5" : ""}`}>
                    <span className="text-white/55 text-sm flex-1">{BINDING_LABELS[action]}</span>
                    <div className="flex items-center gap-2">
                      {altKey && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-white/28"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {KEY_LABEL(altKey)}
                        </span>
                      )}
                      <button
                        onClick={() => setRebinding(isRb ? null : action)}
                        className={`px-3 py-1 rounded-lg text-[12px] font-mono font-bold transition-all min-w-[64px] text-center ${
                          isRb
                            ? "text-[#4af] border border-[#4af]/50 animate-pulse"
                            : "text-white/85 border border-white/15 hover:bg-white/10"
                        }`}
                        style={isRb ? { background: "rgba(74,170,255,0.12)" } : { background: "rgba(255,255,255,0.07)" }}
                      >
                        {isRb ? "tuşa bas…" : KEY_LABEL(bindings[action])}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl px-4 py-3 flex items-start gap-2.5"
              style={{ background: "rgba(74,170,255,0.06)", border: "1px solid rgba(74,170,255,0.14)" }}>
              <Info size={13} className="text-[#4af] mt-0.5 flex-shrink-0" />
              <p className="text-white/45 text-[12px] leading-relaxed">
                Tuşu yeniden atamak için ilgili butona tıkla, ardından istediğin tuşa bas.
                Soluk renkli tuşlar alternatif (değiştirilemez) tuşlardır.
                Değişiklikler sonraki maç başlangıcında aktif olur.
              </p>
            </div>
          </div>
        )}

        {/* ── Hakkında ──────────────────────────────────────────── */}
        {tab === "about" && (
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            <p className="text-white/25 text-xs uppercase tracking-widest px-1 mb-1">Uygulama Bilgisi</p>

            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {[
                { label: "Sürüm",    value: "v0.0.7" },
                { label: "Kuruluş", value: FOUNDING_DATE },
                { label: "Motor",   value: "HTML5 Canvas + React 19" },
                { label: "Platform",value: "Tarayıcı (PWA)" },
              ].map(({ label, value }, i, a) => (
                <div key={label} className={`flex items-center justify-between px-4 py-3.5 ${i < a.length - 1 ? "border-b border-white/5" : ""}`}>
                  <span className="text-white/40 text-sm">{label}</span>
                  <span className="text-white/80 text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>

            <p className="text-white/25 text-xs uppercase tracking-widest px-1 mt-2 mb-1">Destek</p>
            <div className="rounded-2xl px-4 py-4 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Mail size={18} className="text-[#4af] flex-shrink-0" />
              <div>
                <p className="text-white/70 text-sm font-semibold">E-posta Desteği</p>
                <p className="text-white/35 text-xs mt-0.5 font-mono">support.novaballofficial@gmail.com</p>
              </div>
            </div>

            <p className="text-white/25 text-xs uppercase tracking-widest px-1 mt-2 mb-1">Yasal</p>
            <div className="rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Shield size={15} className="text-white/25 mt-0.5 flex-shrink-0" />
              <p className="text-white/32 text-[12px] leading-relaxed">
                NovaBall, Haxball ve Mamoball'dan ilham alınarak oluşturulmuş bağımsız bir fan projesidir.
                Oyun verileri Supabase üzerinde güvenli şekilde saklanır.{" "}
                <span className="text-white/20">© 2026 NovaBall.</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Overlay ──────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(7,13,22,0.93)", backdropFilter: "blur(14px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) closeModal(); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5"
            style={{
              background: "linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))",
              border: "1px solid rgba(255,255,255,0.13)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Username modal */}
            {modal === "username" && (
              <>
                <MHeader title="Kullanıcı Adını Değiştir" onClose={closeModal} disabled={loading} />
                <div className="flex flex-col gap-2">
                  <label className="text-white/38 text-xs">Yeni Kullanıcı Adı</label>
                  <div className="relative">
                    <input
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder={username}
                      maxLength={15}
                      className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white placeholder-white/18 text-sm outline-none focus:border-[#4af]/55 transition-colors pr-10"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameChecking && <div className="w-4 h-4 border-2 border-white/18 border-t-white/60 rounded-full animate-spin" />}
                      {!usernameChecking && usernameAvail === true  && <Check size={16} className="text-green-400" />}
                      {!usernameChecking && usernameAvail === false && <X    size={16} className="text-red-400" />}
                    </div>
                  </div>
                  <p className="text-white/20 text-[11px]">3–15 karakter · küçük harf, rakam veya alt çizgi</p>
                  {newUsername.length > 0 && !isValidUn(newUsername) && (
                    <p className="text-red-400/80 text-xs flex items-center gap-1"><AlertCircle size={12} /> Geçersiz format</p>
                  )}
                  {isValidUn(newUsername) && usernameAvail === false && (
                    <p className="text-red-400/80 text-xs flex items-center gap-1"><AlertCircle size={12} /> Bu kullanıcı adı alınmış</p>
                  )}
                  {isValidUn(newUsername) && usernameAvail === true && (
                    <p className="text-green-400/80 text-xs flex items-center gap-1"><Check size={12} /> Kullanılabilir</p>
                  )}
                </div>
                <Feedback success={success} error={error} />
                <PrimaryBtn label={loading ? "Değiştiriliyor…" : "Değiştir"}
                  disabled={loading || usernameAvail !== true} onClick={handleUsernameChange} />
              </>
            )}

            {/* Display name modal */}
            {modal === "displayname" && (
              <>
                <MHeader title="Görünen Adını Değiştir" onClose={closeModal} disabled={loading} />
                <div className="flex flex-col gap-2">
                  <label className="text-white/38 text-xs">Yeni Görünen Ad</label>
                  <input
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value.slice(0, 32))}
                    placeholder={displayName}
                    maxLength={32}
                    className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white placeholder-white/18 text-sm outline-none focus:border-[#4af]/55 transition-colors"
                    autoFocus
                  />
                  <p className="text-white/20 text-[11px]">Maksimum 32 karakter. Canvas ve sohbette görünür.</p>
                </div>
                <Feedback success={success} error={error} />
                <PrimaryBtn label={loading ? "Kaydediliyor…" : "Kaydet"}
                  disabled={loading || !newDisplayName.trim() || newDisplayName.trim() === displayName}
                  onClick={handleDisplayNameChange} />
              </>
            )}

            {/* Password modal */}
            {modal === "password" && (
              <>
                <MHeader title="Şifreni Değiştir" onClose={closeModal} disabled={loading} />
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/38 text-xs">Mevcut Şifre</label>
                    <PwInput value={currentPw} onChange={setCurrentPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="Mevcut şifren" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/38 text-xs">Yeni Şifre</label>
                    <PwInput value={newPw} onChange={setNewPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="En az 6 karakter" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/38 text-xs">Yeni Şifre (Tekrar)</label>
                    <PwInput value={confirmPw} onChange={setConfirmPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="Tekrar gir" />
                    {confirmPw && confirmPw !== newPw && (
                      <p className="text-red-400/80 text-xs flex items-center gap-1"><AlertCircle size={12} /> Şifreler eşleşmiyor</p>
                    )}
                  </div>
                </div>
                <Feedback success={success} error={error} />
                <PrimaryBtn label={loading ? "Değiştiriliyor…" : "Şifreyi Değiştir"}
                  disabled={loading || !currentPw || !newPw || newPw !== confirmPw}
                  onClick={handlePasswordChange} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SCard({ icon, label, value, onClick }: {
  icon: ReactNode; label: string; value: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all hover:bg-white/5 text-left group"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <span className="text-white/38 group-hover:text-white/60 transition-colors">{icon}</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-white/38 text-xs">{label}</span>
        <span className="text-white/85 text-sm font-semibold truncate">{value}</span>
      </div>
      <span className="text-white/18 group-hover:text-white/45 text-sm transition-colors">→</span>
    </button>
  );
}

function MHeader({ title, onClose, disabled }: { title: string; onClose: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-white font-black text-lg">{title}</h2>
      <button onClick={onClose} disabled={disabled}
        className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition-all disabled:opacity-40">
        <X size={18} />
      </button>
    </div>
  );
}

function Feedback({ success, error }: { success: string; error: string }) {
  if (!success && !error) return null;
  const isOk = !!success;
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${
      isOk ? "bg-green-500/10 border border-green-500/22 text-green-300"
           : "bg-red-500/10 border border-red-500/22 text-red-300"
    }`}>
      {isOk ? <Check size={14} /> : <AlertCircle size={14} />}
      {success || error}
    </div>
  );
}

function PrimaryBtn({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white"
      style={{ background: "linear-gradient(135deg,#1a5cff,#0d3ccc)" }}>
      {label}
    </button>
  );
}

function PwInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string;
}) {
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white placeholder-white/18 text-sm outline-none focus:border-[#4af]/55 transition-colors pr-11" />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/28 hover:text-white/60 transition-colors">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

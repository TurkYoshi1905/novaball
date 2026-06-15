import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  ChevronLeft, Settings, User, Lock,
  Info, Eye, EyeOff, Check, X, AlertCircle, RefreshCw, Mail, Shield, Edit2,
  Gamepad2, Keyboard, Info as InfoIcon,
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

  const [newUsername,       setNewUsername]       = useState("");
  const [usernameAvail,     setUsernameAvail]     = useState<boolean | null>(null);
  const [usernameChecking,  setUsernameChecking]  = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(displayName);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");
  const [bindings,  setBindings]  = useState<Keybindings>(loadKeybindings);
  const [rebinding, setRebinding] = useState<keyof Keybindings | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const actionKeys = Object.keys(DEFAULT_KEYBINDINGS) as (keyof Keybindings)[];

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "account",  label: "Hesap",      icon: <User size={14} /> },
    { id: "controls", label: "Kontroller", icon: <Gamepad2 size={14} /> },
    { id: "about",    label: "Hakkında",   icon: <InfoIcon size={14} /> },
  ];

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] text-white overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0a1628 0%, #070d16 60%, #0d0f1a 100%)" }}>

      {/* Portrait overlay */}
      <div className="portrait-overlay">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <span className="text-5xl">📱</span>
          <p className="text-white font-bold text-xl">Telefonu yatay tut</p>
          <p className="text-white/50 text-sm">NovaBall yatay ekranda daha iyi oynanır.</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-8 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(68,170,255,0.15)", background: "rgba(10,22,40,0.6)", backdropFilter: "blur(12px)" }}>
        <button onClick={onBack}
          className="p-2 rounded-xl transition-all hover:bg-white/10 text-white/60 hover:text-white">
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(68,170,255,0.25),rgba(68,170,255,0.1))", border: "1px solid rgba(68,170,255,0.3)" }}>
            <Settings size={16} className="text-[#4af]" />
          </div>
          <h1 className="text-white font-black text-xl tracking-tight">Ayarlar</h1>
        </div>
        <span className="ml-auto text-[#4af]/60 text-xs font-mono font-bold px-2.5 py-1 rounded-lg"
          style={{ background: "rgba(68,170,255,0.1)", border: "1px solid rgba(68,170,255,0.2)" }}>
          v0.0.7
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 sm:px-8 pt-5 pb-3 flex-shrink-0">
        <div className="flex gap-1.5 rounded-2xl p-1.5 w-full"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {TABS.map(({ id, label, icon }) => (
            <button key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${
                tab === id
                  ? "text-white shadow-lg"
                  : "text-white/45 hover:text-white/70"
              }`}
              style={tab === id ? {
                background: "linear-gradient(135deg,rgba(68,170,255,0.22),rgba(68,170,255,0.08))",
                border: "1px solid rgba(68,170,255,0.35)",
                boxShadow: "0 0 20px rgba(68,170,255,0.12)",
              } : {}}
            >
              <span className={tab === id ? "text-[#4af]" : ""}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-2 pb-8">

        {/* ── Hesap ──────────────────────────────────────────────────── */}
        {tab === "account" && (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">
            <SectionHeader icon={<User size={13} />} label="Hesap Bilgileri" />

            {/* User info preview */}
            <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ background: "linear-gradient(135deg,rgba(68,170,255,0.1),rgba(68,170,255,0.04))", border: "1px solid rgba(68,170,255,0.2)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#1a5cff,#0d3ccc)", border: "2px solid rgba(68,170,255,0.4)" }}>
                {(displayName || username).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-base truncate">{displayName || username}</p>
                <p className="text-[#4af]/70 text-sm font-mono truncate">@{username}</p>
              </div>
            </div>

            <SCard icon={<User size={15} />}  label="Kullanıcı Adı" value={`@${username}`}  onClick={() => openModal("username")} accent="blue" />
            <SCard icon={<Edit2 size={15} />} label="Görünen Ad"    value={displayName}      onClick={() => openModal("displayname")} accent="blue" />
            <SCard icon={<Lock size={15} />}  label="Şifre"         value="••••••••"         onClick={() => openModal("password")} accent="blue" />

            <div className="rounded-xl px-4 py-3 flex items-start gap-2.5 mt-1"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <InfoIcon size={13} className="text-white/40 mt-0.5 flex-shrink-0" />
              <p className="text-white/50 text-[12px] leading-relaxed">
                Kullanıcı adı değiştirildiğinde tüm maç geçmişi otomatik olarak güncellenir.
                Görünen ad oyun içi canvas'ta ve sohbette gösterilir.
              </p>
            </div>
          </div>
        )}

        {/* ── Kontroller ─────────────────────────────────────────────── */}
        {tab === "controls" && (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <SectionHeader icon={<Keyboard size={13} />} label="Tuş Atamaları" />
              <button
                onClick={() => { setBindings({ ...DEFAULT_KEYBINDINGS }); saveKeybindings({ ...DEFAULT_KEYBINDINGS }); }}
                className="flex items-center gap-1.5 text-white/50 hover:text-[#4af] text-xs font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-[#4af]/8"
              >
                <RefreshCw size={11} /> Sıfırla
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
              {actionKeys.map((action, idx) => {
                const isLast  = idx === actionKeys.length - 1;
                const isRb    = rebinding === action;
                const altKey  = ALT_KEYS[action];
                return (
                  <div key={action}
                    className={`flex items-center gap-3 px-5 py-3.5 ${!isLast ? "border-b" : ""} transition-colors ${isRb ? "" : "hover:bg-white/3"}`}
                    style={!isLast ? { borderBottomColor: "rgba(255,255,255,0.07)" } : {}}>
                    <span className="text-white/75 text-sm font-medium flex-1">{BINDING_LABELS[action]}</span>
                    <div className="flex items-center gap-2">
                      {altKey && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-white/40 font-semibold"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          {KEY_LABEL(altKey)}
                        </span>
                      )}
                      <button
                        onClick={() => setRebinding(isRb ? null : action)}
                        className={`px-3.5 py-1.5 rounded-lg text-[12px] font-mono font-bold transition-all min-w-[72px] text-center ${
                          isRb
                            ? "text-[#4af] animate-pulse"
                            : "text-white/85 hover:text-white"
                        }`}
                        style={isRb
                          ? { background: "rgba(68,170,255,0.15)", border: "1.5px solid rgba(68,170,255,0.55)", boxShadow: "0 0 12px rgba(68,170,255,0.2)" }
                          : { background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.18)" }}
                      >
                        {isRb ? "tuşa bas…" : KEY_LABEL(bindings[action])}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl px-4 py-3.5 flex items-start gap-3"
              style={{ background: "rgba(68,170,255,0.07)", border: "1px solid rgba(68,170,255,0.18)" }}>
              <Info size={14} className="text-[#4af] mt-0.5 flex-shrink-0" />
              <p className="text-white/60 text-[12px] leading-relaxed">
                Tuşu yeniden atamak için butona tıkla, ardından istediğin tuşa bas.
                Soluk renkli tuşlar alternatif (değiştirilemez) tuşlardır.
                Değişiklikler sonraki maç başlangıcında aktif olur.
              </p>
            </div>
          </div>
        )}

        {/* ── Hakkında ───────────────────────────────────────────────── */}
        {tab === "about" && (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">
            <SectionHeader icon={<InfoIcon size={13} />} label="Uygulama Bilgisi" />

            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
              {[
                { label: "Sürüm",    value: "v0.0.7",                    accent: true },
                { label: "Kuruluş", value: FOUNDING_DATE,               accent: false },
                { label: "Motor",   value: "HTML5 Canvas + React 19",   accent: false },
                { label: "Platform",value: "Tarayıcı (PWA)",            accent: false },
              ].map(({ label, value, accent }, i, a) => (
                <div key={label}
                  className={`flex items-center justify-between px-5 py-4 ${i < a.length - 1 ? "border-b" : ""}`}
                  style={i < a.length - 1 ? { borderBottomColor: "rgba(255,255,255,0.07)" } : {}}>
                  <span className="text-white/55 text-sm font-medium">{label}</span>
                  <span className={`text-sm font-bold ${accent ? "text-[#4af]" : "text-white/85"}`}>{value}</span>
                </div>
              ))}
            </div>

            <SectionHeader icon={<Mail size={13} />} label="Destek" />
            <div className="rounded-2xl px-5 py-4 flex items-center gap-4 transition-all hover:bg-[#4af]/5"
              style={{ background: "rgba(68,170,255,0.07)", border: "1px solid rgba(68,170,255,0.2)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(68,170,255,0.15)", border: "1px solid rgba(68,170,255,0.3)" }}>
                <Mail size={18} className="text-[#4af]" />
              </div>
              <div>
                <p className="text-white/85 text-sm font-bold">E-posta Desteği</p>
                <p className="text-[#4af]/70 text-xs mt-0.5 font-mono">support.novaballofficial@gmail.com</p>
              </div>
            </div>

            <SectionHeader icon={<Shield size={13} />} label="Yasal" />
            <div className="rounded-2xl px-5 py-4 flex items-start gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Shield size={15} className="text-white/35 mt-0.5 flex-shrink-0" />
              <p className="text-white/55 text-[12px] leading-relaxed">
                NovaBall, Haxball ve Mamoball'dan ilham alınarak oluşturulmuş bağımsız bir fan projesidir.
                Oyun verileri Supabase üzerinde güvenli şekilde saklanır.{" "}
                <span className="text-white/35">© 2026 NovaBall. Tüm hakları saklıdır.</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Overlay ──────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(7,13,22,0.92)", backdropFilter: "blur(16px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) closeModal(); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5"
            style={{
              background: "linear-gradient(160deg,rgba(20,35,65,0.95),rgba(10,16,32,0.98))",
              border: "1px solid rgba(68,170,255,0.2)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(68,170,255,0.08)",
            }}
          >
            {/* Username modal */}
            {modal === "username" && (
              <>
                <MHeader title="Kullanıcı Adını Değiştir" onClose={closeModal} disabled={loading} />
                <div className="flex flex-col gap-2">
                  <label className="text-white/60 text-xs font-semibold">Yeni Kullanıcı Adı</label>
                  <div className="relative">
                    <input
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder={username}
                      maxLength={15}
                      className="w-full rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none transition-all pr-10"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(68,170,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(68,170,255,0.12)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameChecking && <div className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />}
                      {!usernameChecking && usernameAvail === true  && <Check size={16} className="text-green-400" />}
                      {!usernameChecking && usernameAvail === false && <X    size={16} className="text-red-400" />}
                    </div>
                  </div>
                  <p className="text-white/35 text-[11px]">3–15 karakter · küçük harf, rakam veya alt çizgi</p>
                  {newUsername.length > 0 && !isValidUn(newUsername) && (
                    <p className="text-red-400/90 text-xs flex items-center gap-1"><AlertCircle size={12} /> Geçersiz format</p>
                  )}
                  {isValidUn(newUsername) && usernameAvail === false && (
                    <p className="text-red-400/90 text-xs flex items-center gap-1"><AlertCircle size={12} /> Bu kullanıcı adı alınmış</p>
                  )}
                  {isValidUn(newUsername) && usernameAvail === true && (
                    <p className="text-green-400/90 text-xs flex items-center gap-1"><Check size={12} /> Kullanılabilir</p>
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
                  <label className="text-white/60 text-xs font-semibold">Yeni Görünen Ad</label>
                  <input
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value.slice(0, 32))}
                    placeholder={displayName}
                    maxLength={32}
                    className="w-full rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(68,170,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(68,170,255,0.12)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
                    autoFocus
                  />
                  <p className="text-white/35 text-[11px]">Maksimum 32 karakter. Canvas ve sohbette görünür.</p>
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
                    <label className="text-white/60 text-xs font-semibold">Mevcut Şifre</label>
                    <PwInput value={currentPw} onChange={setCurrentPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="Mevcut şifren" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/60 text-xs font-semibold">Yeni Şifre</label>
                    <PwInput value={newPw} onChange={setNewPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="En az 6 karakter" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/60 text-xs font-semibold">Yeni Şifre (Tekrar)</label>
                    <PwInput value={confirmPw} onChange={setConfirmPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="Tekrar gir" />
                    {confirmPw && confirmPw !== newPw && (
                      <p className="text-red-400/90 text-xs flex items-center gap-1"><AlertCircle size={12} /> Şifreler eşleşmiyor</p>
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-1">
      <span className="text-[#4af]/70">{icon}</span>
      <p className="text-[#4af]/80 text-xs font-black uppercase tracking-widest">{label}</p>
      <div className="flex-1 h-px ml-1" style={{ background: "linear-gradient(to right, rgba(68,170,255,0.2), transparent)" }} />
    </div>
  );
}

function SCard({ icon, label, value, onClick, accent }: {
  icon: ReactNode; label: string; value: string; onClick: () => void; accent?: string;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-left group hover:scale-[1.01]"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(68,170,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(68,170,255,0.07)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
    >
      <span className={`transition-colors ${accent === "blue" ? "text-[#4af]/70 group-hover:text-[#4af]" : "text-white/45 group-hover:text-white/70"}`}>{icon}</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-white/45 text-xs font-semibold">{label}</span>
        <span className="text-white/90 text-sm font-bold truncate mt-0.5">{value}</span>
      </div>
      <span className="text-white/30 group-hover:text-[#4af]/60 text-lg transition-all group-hover:translate-x-0.5">→</span>
    </button>
  );
}

function MHeader({ title, onClose, disabled }: { title: string; onClose: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-white font-black text-lg tracking-tight">{title}</h2>
      <button onClick={onClose} disabled={disabled}
        className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40">
        <X size={18} />
      </button>
    </div>
  );
}

function Feedback({ success, error }: { success: string; error: string }) {
  if (!success && !error) return null;
  const isOk = !!success;
  return (
    <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
      isOk ? "text-green-300" : "text-red-300"
    }`}
      style={isOk
        ? { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" }
        : { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
      {isOk ? <Check size={14} /> : <AlertCircle size={14} />}
      {success || error}
    </div>
  );
}

function PrimaryBtn({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white tracking-wide"
      style={{
        background: "linear-gradient(135deg,#1a5cff,#0d3ccc)",
        border: "1px solid rgba(68,170,255,0.35)",
        boxShadow: "0 0 30px rgba(26,92,255,0.25)",
      }}>
      {label}
    </button>
  );
}

function PwInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none transition-all pr-10"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
        onFocus={e => { e.currentTarget.style.borderColor = "rgba(68,170,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(68,170,255,0.12)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
      />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

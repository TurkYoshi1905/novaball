import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  ChevronLeft, Settings, User, Lock,
  Eye, EyeOff, Check, X, AlertCircle, RefreshCw, Mail,
  Shield, Edit2, Gamepad2, Keyboard, Info,
  Cpu, Zap, Globe, Hash, Key, ChevronRight,
  Sparkles, Clock, Star,
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
  const [newDisplayName,    setNewDisplayName]    = useState(displayName);
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState("");
  const [error,      setError]      = useState("");
  const [bindings,   setBindings]   = useState<Keybindings>(loadKeybindings);
  const [rebinding,  setRebinding]  = useState<keyof Keybindings | null>(null);
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

  function closeModal() { setModal(null); setLoading(false); setError(""); setSuccess(""); }

  async function handleUsernameChange() {
    if (!newUsername || usernameAvail !== true || loading) return;
    setLoading(true); setError("");
    try {
      const { error: err } = await supabase.rpc("change_username", {
        p_old_username: username, p_new_username: newUsername,
      });
      if (err) {
        setError(
          err.message.includes("username_taken")   ? "Bu kullanıcı adı zaten alınmış." :
          err.message.includes("username_invalid") ? "Geçersiz kullanıcı adı."         :
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
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
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
    { id: "account",  label: "Hesap",      icon: <User size={15} /> },
    { id: "controls", label: "Kontroller", icon: <Gamepad2 size={15} /> },
    { id: "about",    label: "Hakkında",   icon: <Info size={15} /> },
  ];

  const initial = (displayName || username).charAt(0).toUpperCase();

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] text-white overflow-hidden"
      style={{ background: "linear-gradient(160deg,#060f22 0%,#080f1c 55%,#06101a 100%)" }}>

      {/* Arkaplan dekorasyonu */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[350px]"
          style={{ background: "radial-gradient(ellipse,rgba(68,170,255,0.09) 0%,transparent 65%)" }} />
        <div className="orb orb-1" style={{ opacity: 0.25 }} />
        <div className="orb orb-2" style={{ opacity: 0.2  }} />
      </div>

      {/* Portrait overlay */}
      <div className="portrait-overlay">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <span className="text-5xl">📱</span>
          <p className="text-white font-bold text-xl">Telefonu yatay tut</p>
          <p className="text-white/50 text-sm">NovaBall yatay ekranda daha iyi görünür.</p>
        </div>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center gap-3 px-4 sm:px-8 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(6,15,34,0.6)", backdropFilter: "blur(14px)" }}>

        <button onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(68,170,255,0.25),rgba(68,170,255,0.08))", border: "1px solid rgba(68,170,255,0.3)" }}>
            <Settings size={16} className="text-[#4aaeff]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-black text-lg sm:text-xl leading-none tracking-tight">Ayarlar</h1>
            <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Hesap & Oyun Tercihleri</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: "rgba(68,170,255,0.1)", border: "1px solid rgba(68,170,255,0.22)" }}>
          <Sparkles size={11} className="text-[#4aaeff]" />
          <span className="text-[#4aaeff] font-black text-xs">v0.0.9</span>
        </div>
      </header>

      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-shrink-0 px-4 sm:px-8 pt-5 pb-3">
        <div className="flex gap-1.5 rounded-2xl p-1.5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
          {TABS.map(({ id, label, icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all"
                style={active ? {
                  background: "linear-gradient(135deg,rgba(68,170,255,0.22),rgba(68,170,255,0.08))",
                  border: "1px solid rgba(68,170,255,0.35)",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(68,170,255,0.1)",
                } : { color: "rgba(255,255,255,0.4)" }}
              >
                <span className={active ? "text-[#4aaeff]" : ""}>{icon}</span>
                <span className="hidden xs:inline sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-8 pb-10">

        {/* ═══ HESAP ═══════════════════════════════════════════════════════ */}
        {tab === "account" && (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">

            {/* Avatar + isim kartı */}
            <div className="rounded-3xl p-5 flex items-center gap-4 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,rgba(68,170,255,0.1),rgba(68,170,255,0.04))", border: "1px solid rgba(68,170,255,0.22)" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(68,170,255,0.5),transparent)" }} />
              {/* Avatar circle */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 relative"
                style={{ background: "linear-gradient(135deg,#1a5cff,#0d3ccc)", border: "2px solid rgba(68,170,255,0.45)", boxShadow: "0 0 24px rgba(68,170,255,0.25)" }}>
                {initial}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center"
                  style={{ background: "#4aaeff", border: "2px solid #060f22" }}>
                  <Star size={9} fill="white" color="white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-black text-lg leading-tight truncate">{displayName || username}</p>
                <p className="text-[#4aaeff]/70 text-sm font-mono mt-0.5 truncate">@{username}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-green-400/80 text-[11px] font-semibold">Aktif</span>
                </div>
              </div>
            </div>

            {/* Hesap işlemleri */}
            <SectionLabel icon={<Hash size={12} />} label="Kimlik Bilgileri" />
            <div className="flex flex-col gap-2">
              <AccountRow
                icon={<User size={15} />}
                label="Kullanıcı Adı"
                value={`@${username}`}
                desc="Benzersiz tanımlayıcı"
                onClick={() => openModal("username")}
                accent="#4aaeff"
              />
              <AccountRow
                icon={<Edit2 size={15} />}
                label="Görünen Ad"
                value={displayName}
                desc="Canvas ve lobide görünür"
                onClick={() => openModal("displayname")}
                accent="#a78bfa"
              />
            </div>

            <SectionLabel icon={<Lock size={12} />} label="Güvenlik" />
            <AccountRow
              icon={<Key size={15} />}
              label="Şifre"
              value="••••••••"
              desc="Son değişiklik: bilinmiyor"
              onClick={() => openModal("password")}
              accent="#fb923c"
            />

            {/* Bilgi notu */}
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Info size={13} className="text-white/35 mt-0.5 flex-shrink-0" />
              <p className="text-white/45 text-[11px] leading-relaxed">
                Kullanıcı adı değiştirildiğinde tüm maç geçmişi otomatik güncellenir.
                Görünen ad oyun içi canvas'ta ve lobi ekranında gösterilir.
              </p>
            </div>
          </div>
        )}

        {/* ═══ KONTROLLER ══════════════════════════════════════════════════ */}
        {tab === "controls" && (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">

            {/* Platform bilgisi */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl"
                style={{ background: "rgba(68,170,255,0.07)", border: "1px solid rgba(68,170,255,0.18)" }}>
                <Keyboard size={16} className="text-[#4aaeff] flex-shrink-0" />
                <div>
                  <p className="text-[#4aaeff] font-bold text-xs">Klavye</p>
                  <p className="text-white/40 text-[10px]">WASD + Space + Shift</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl"
                style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.18)" }}>
                <Gamepad2 size={16} style={{ color: "#a78bfa", flexShrink: 0 }} />
                <div>
                  <p style={{ color: "#a78bfa" }} className="font-bold text-xs">Mobil</p>
                  <p className="text-white/40 text-[10px]">Joystick + butonlar</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <SectionLabel icon={<Keyboard size={12} />} label="Tuş Atamaları" />
              <button
                onClick={() => { setBindings({ ...DEFAULT_KEYBINDINGS }); saveKeybindings({ ...DEFAULT_KEYBINDINGS }); }}
                className="flex items-center gap-1.5 text-white/45 hover:text-[#4aaeff] text-xs font-semibold transition-colors px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <RefreshCw size={11} /> Varsayılana Sıfırla
              </button>
            </div>

            {/* Tuş tablosu */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {actionKeys.map((action, idx) => {
                const isLast  = idx === actionKeys.length - 1;
                const isRb    = rebinding === action;
                const altKey  = ALT_KEYS[action];
                return (
                  <div key={action}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors"
                    style={{
                      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)",
                      background: isRb ? "rgba(68,170,255,0.05)" : undefined,
                    }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-semibold">{BINDING_LABELS[action]}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {altKey && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-white/35 font-semibold"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                          {KEY_LABEL(altKey)}
                        </span>
                      )}
                      <button
                        onClick={() => setRebinding(isRb ? null : action)}
                        className="px-3.5 py-1.5 rounded-xl text-[12px] font-mono font-bold transition-all min-w-[76px] text-center"
                        style={isRb ? {
                          background: "rgba(68,170,255,0.15)",
                          border: "1.5px solid rgba(68,170,255,0.55)",
                          color: "#4aaeff",
                          boxShadow: "0 0 14px rgba(68,170,255,0.2)",
                          animation: "pulse 1.5s infinite",
                        } : {
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.16)",
                          color: "rgba(255,255,255,0.85)",
                        }}
                      >
                        {isRb ? "tuşa bas…" : KEY_LABEL(bindings[action])}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl"
              style={{ background: "rgba(68,170,255,0.06)", border: "1px solid rgba(68,170,255,0.15)" }}>
              <Info size={13} className="text-[#4aaeff] mt-0.5 flex-shrink-0" />
              <p className="text-white/55 text-[11px] leading-relaxed">
                Tuşu yeniden atamak için butona tıkla, ardından istediğin tuşa bas.
                Soluk renkli tuşlar <span className="text-white/70 font-semibold">alternatif (değiştirilemez)</span> tuşlardır.
                Değişiklikler sonraki maç başlangıcında aktif olur.
              </p>
            </div>
          </div>
        )}

        {/* ═══ HAKKINDA ════════════════════════════════════════════════════ */}
        {tab === "about" && (
          <div className="flex flex-col gap-4 max-w-lg mx-auto">

            {/* App hero kartı */}
            <div className="rounded-3xl p-5 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,rgba(68,170,255,0.12),rgba(68,170,255,0.04))", border: "1px solid rgba(68,170,255,0.25)" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(68,170,255,0.6),transparent)" }} />
              <div className="absolute right-4 top-4 w-24 h-24 rounded-3xl flex items-center justify-center text-4xl opacity-15"
                style={{ background: "rgba(68,170,255,0.15)", border: "1px solid rgba(68,170,255,0.2)" }}>
                ⚽
              </div>
              <p className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1">NovaBall</p>
              <p className="text-white font-black text-2xl leading-tight">v0.0.9</p>
              <p className="text-[#4aaeff]/70 text-xs font-semibold mt-1">16 Haziran 2026</p>
              <p className="text-white/40 text-xs mt-3 leading-relaxed max-w-[220px]">
                Haxball & Mamoball'dan ilham alınan tarayıcı tabanlı 2D arcade futbol.
              </p>
            </div>

            {/* Teknik bilgiler */}
            <SectionLabel icon={<Cpu size={12} />} label="Teknik Bilgiler" />
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {[
                { icon: <Zap size={13} />,   label: "Sürüm",     value: "v0.0.9",                  accent: "#4aaeff"  },
                { icon: <Clock size={13} />,  label: "Kuruluş",   value: FOUNDING_DATE,              accent: ""        },
                { icon: <Cpu size={13} />,    label: "Motor",     value: "HTML5 Canvas + React 19",  accent: ""        },
                { icon: <Globe size={13} />,  label: "Platform",  value: "Tarayıcı (PWA)",          accent: ""        },
              ].map(({ icon, label, value, accent }, i, a) => (
                <div key={label}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: i < a.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", color: accent || "rgba(255,255,255,0.35)" }}>
                    {icon}
                  </div>
                  <span className="text-white/55 text-sm flex-1">{label}</span>
                  <span className={`text-sm font-bold`} style={{ color: accent || "rgba(255,255,255,0.85)" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Destek */}
            <SectionLabel icon={<Mail size={12} />} label="Destek" />
            <div className="rounded-2xl px-4 py-4 flex items-center gap-4"
              style={{ background: "rgba(68,170,255,0.07)", border: "1px solid rgba(68,170,255,0.2)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(68,170,255,0.15)", border: "1px solid rgba(68,170,255,0.3)" }}>
                <Mail size={18} className="text-[#4aaeff]" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">E-posta Desteği</p>
                <p className="text-[#4aaeff]/65 text-xs mt-0.5 font-mono truncate">support.novaballofficial@gmail.com</p>
              </div>
              <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
            </div>

            {/* Yasal */}
            <SectionLabel icon={<Shield size={12} />} label="Yasal" />
            <div className="rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <Shield size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
              <p className="text-white/45 text-[11px] leading-relaxed">
                NovaBall, Haxball ve Mamoball'dan ilham alınarak oluşturulmuş bağımsız bir fan projesidir.
                Oyun verileri Supabase üzerinde güvenli şekilde saklanır.{" "}
                <span className="text-white/25">© 2026 NovaBall. Tüm hakları saklıdır.</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Overlay ──────────────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(6,15,34,0.92)", backdropFilter: "blur(18px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) closeModal(); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg,rgba(15,28,58,0.98),rgba(8,15,28,0.99))",
              border: "1px solid rgba(68,170,255,0.22)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(68,170,255,0.07)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(68,170,255,0.5),transparent)" }} />

            {/* Username modal */}
            {modal === "username" && (
              <>
                <ModalHeader title="Kullanıcı Adını Değiştir" icon={<User size={16} className="text-[#4aaeff]" />} onClose={closeModal} disabled={loading} />
                <div className="flex flex-col gap-2">
                  <label className="text-white/55 text-xs font-bold uppercase tracking-wider">Yeni Kullanıcı Adı</label>
                  <div className="relative">
                    <input
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder={username}
                      maxLength={15}
                      className="w-full rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none transition-all pr-10"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(68,170,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(68,170,255,0.1)"; }}
                      onBlur={e =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.boxShadow = "none"; }}
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameChecking && <div className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />}
                      {!usernameChecking && usernameAvail === true  && <Check size={16} className="text-green-400" />}
                      {!usernameChecking && usernameAvail === false && <X    size={16} className="text-red-400" />}
                    </div>
                  </div>
                  <p className="text-white/30 text-[11px]">3–15 karakter · küçük harf, rakam veya alt çizgi</p>
                  {newUsername.length > 0 && !isValidUn(newUsername) && (
                    <FeedbackLine type="error" text="Geçersiz format" />
                  )}
                  {isValidUn(newUsername) && usernameAvail === false && (
                    <FeedbackLine type="error" text="Bu kullanıcı adı alınmış" />
                  )}
                  {isValidUn(newUsername) && usernameAvail === true && (
                    <FeedbackLine type="success" text="Kullanılabilir" />
                  )}
                </div>
                <Feedback success={success} error={error} />
                <PrimaryBtn label={loading ? "Değiştiriliyor…" : "Değiştir"} disabled={loading || usernameAvail !== true} onClick={handleUsernameChange} />
              </>
            )}

            {/* Display name modal */}
            {modal === "displayname" && (
              <>
                <ModalHeader title="Görünen Adını Değiştir" icon={<Edit2 size={16} style={{ color: "#a78bfa" }} />} onClose={closeModal} disabled={loading} />
                <div className="flex flex-col gap-2">
                  <label className="text-white/55 text-xs font-bold uppercase tracking-wider">Yeni Görünen Ad</label>
                  <input
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value.slice(0, 32))}
                    placeholder={displayName}
                    maxLength={32}
                    className="w-full rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.1)"; }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.boxShadow = "none"; }}
                    autoFocus
                  />
                  <p className="text-white/30 text-[11px]">Maksimum 32 karakter. Canvas ve sohbette görünür.</p>
                </div>
                <Feedback success={success} error={error} />
                <PrimaryBtn
                  label={loading ? "Kaydediliyor…" : "Kaydet"}
                  disabled={loading || !newDisplayName.trim() || newDisplayName.trim() === displayName}
                  onClick={handleDisplayNameChange}
                  accent="#a78bfa"
                />
              </>
            )}

            {/* Password modal */}
            {modal === "password" && (
              <>
                <ModalHeader title="Şifreni Değiştir" icon={<Key size={16} style={{ color: "#fb923c" }} />} onClose={closeModal} disabled={loading} />
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/55 text-xs font-bold uppercase tracking-wider">Mevcut Şifre</label>
                    <PwInput value={currentPw} onChange={setCurrentPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="Mevcut şifren" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/55 text-xs font-bold uppercase tracking-wider">Yeni Şifre</label>
                    <PwInput value={newPw} onChange={setNewPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="En az 6 karakter" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/55 text-xs font-bold uppercase tracking-wider">Şifre Tekrar</label>
                    <PwInput value={confirmPw} onChange={setConfirmPw} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="Aynı şifreyi gir" />
                  </div>
                  {confirmPw && newPw !== confirmPw && (
                    <FeedbackLine type="error" text="Şifreler eşleşmiyor" />
                  )}
                </div>
                <Feedback success={success} error={error} />
                <PrimaryBtn
                  label={loading ? "Değiştiriliyor…" : "Şifreyi Değiştir"}
                  disabled={loading || !currentPw || !newPw || newPw !== confirmPw}
                  onClick={handlePasswordChange}
                  accent="#fb923c"
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Küçük yardımcı bileşenler ─────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mt-1 mb-0.5">
      <span className="text-white/30">{icon}</span>
      <span className="text-white/35 text-[11px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

function AccountRow({
  icon, label, value, desc, onClick, accent = "#4aaeff",
}: { icon: ReactNode; label: string; value: string; desc: string; onClick: () => void; accent?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all text-left group"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}30`; (e.currentTarget as HTMLButtonElement).style.background = `${accent}0a`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18`, border: `1px solid ${accent}28`, color: accent }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-sm font-semibold">{label}</p>
        <p className="text-white/35 text-xs mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-white/50 text-sm font-mono truncate max-w-[100px]">{value}</span>
        <ChevronRight size={14} className="text-white/25 group-hover:text-white/45 transition-colors" />
      </div>
    </button>
  );
}

function ModalHeader({ title, icon, onClose, disabled }: { title: string; icon: ReactNode; onClose: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
        {icon}
      </div>
      <h2 className="text-white font-black text-base flex-1">{title}</h2>
      <button
        onClick={onClose} disabled={disabled}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all text-white/40 hover:text-white hover:bg-white/10"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function FeedbackLine({ type, text }: { type: "error" | "success"; text: string }) {
  const isErr = type === "error";
  return (
    <p className={`text-xs flex items-center gap-1.5 ${isErr ? "text-red-400/90" : "text-green-400/90"}`}>
      {isErr ? <AlertCircle size={12} /> : <Check size={12} />}
      {text}
    </p>
  );
}

function Feedback({ success, error }: { success: string; error: string }) {
  if (!success && !error) return null;
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${success ? "text-green-400" : "text-red-400"}`}
      style={{ background: success ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${success ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}` }}>
      {success ? <Check size={14} /> : <AlertCircle size={14} />}
      <span className="font-semibold text-xs">{success || error}</span>
    </div>
  );
}

function PwInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; placeholder: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 pr-10 text-white placeholder-white/20 text-sm outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}
        onFocus={e => { e.currentTarget.style.borderColor = "rgba(251,146,60,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(251,146,60,0.1)"; }}
        onBlur={e =>  { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.boxShadow = "none"; }}
      />
      <button onClick={onToggle} type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function PrimaryBtn({ label, disabled, onClick, accent = "#4aaeff" }: {
  label: string; disabled: boolean; onClick: () => void; accent?: string;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="w-full py-3 rounded-2xl font-black text-sm transition-all"
      style={disabled ? {
        background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)",
        border: "1px solid rgba(255,255,255,0.1)", cursor: "not-allowed",
      } : {
        background: `linear-gradient(135deg,${accent},${accent}cc)`,
        color: "#fff",
        boxShadow: `0 4px 24px ${accent}55`,
      }}
    >
      {label}
    </button>
  );
}

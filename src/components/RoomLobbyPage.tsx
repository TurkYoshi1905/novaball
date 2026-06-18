import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MessageCircle, X, Play, Users, Crown, Shield, Zap } from "lucide-react";
import type { CustomRoom, ChatMessage, MatchSession, TeamMember } from "../types/game";
import { modeFromMaxPlayers } from "../types/game";
import { subscribeToRoom, joinRoomTeam, leaveRoom, startRoom } from "../lib/matchmaking";
import { createGameChannel, broadcastChat, onChat } from "../lib/realtime";

interface Props {
  room: CustomRoom;
  username: string;
  displayName: string;
  onStartMatch: (match: MatchSession) => void;
  onLeave: () => void;
}

export default function RoomLobbyPage({ room: initialRoom, username, displayName, onStartMatch, onLeave }: Props) {
  const [room, setRoom]           = useState<CustomRoom>(initialRoom);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen]   = useState(false);
  const [inputText, setInputText] = useState("");
  const [switching, setSwitching] = useState(false);
  const [kicked, setKicked]       = useState(false);
  const [midMatchPicking, setMidMatchPicking] = useState(
    // Maç başlamışsa ve oyuncu hiçbir takımda değilse takım seç ekranını göster
    initialRoom.status === "playing" &&
    !initialRoom.redTeam.some(m => m.username === username) &&
    !initialRoom.blueTeam.some(m => m.username === username)
  );

  const channelRef      = useRef<ReturnType<typeof createGameChannel> | null>(null);
  const subRef          = useRef<ReturnType<typeof subscribeToRoom> | null>(null);
  const chatEndRef      = useRef<HTMLDivElement>(null);
  const matchStartedRef = useRef(false);

  const isHost     = initialRoom.hostUsername === username;
  const myTeam     = room.redTeam.some(m => m.username === username) ? "red"
                   : room.blueTeam.some(m => m.username === username) ? "blue"
                   : null;
  const maxPerTeam  = Math.floor(room.maxPlayers / 2);
  const totalPlayers = room.redTeam.length + room.blueTeam.length;
  const mode         = modeFromMaxPlayers(room.maxPlayers);

  const buildMatch = (r: CustomRoom): MatchSession => ({
    id: r.id, mode: modeFromMaxPlayers(r.maxPlayers), channelId: r.channelId,
    hostUsername: r.hostUsername, redTeam: r.redTeam, blueTeam: r.blueTeam,
    status: "starting", createdAt: r.createdAt, ranked: false,
  });

  // Maç başlamışsa ve oyuncu kendi takımındaysa direkt maça gönder
  useEffect(() => {
    if (
      initialRoom.status === "playing" &&
      (initialRoom.redTeam.some(m => m.username === username) ||
       initialRoom.blueTeam.some(m => m.username === username))
    ) {
      matchStartedRef.current = true;
      onStartMatch(buildMatch(initialRoom));
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    subRef.current = subscribeToRoom(initialRoom.id, updated => {
      if (!updated) {
        if (!matchStartedRef.current) {
          setKicked(true);
          setTimeout(() => onLeave(), 2500);
        }
        return;
      }
      setRoom(updated);
      // Maç başladı — lobi oyuncusunu yönlendir
      if (updated.status === "playing" && !isHost && !matchStartedRef.current) {
        const inTeam = updated.redTeam.some(m => m.username === username) ||
                       updated.blueTeam.some(m => m.username === username);
        if (inTeam) {
          matchStartedRef.current = true;
          onStartMatch(buildMatch(updated));
        } else {
          // Maç başladı ama oyuncu takımda değil — takım seçim ekranını göster
          setMidMatchPicking(true);
        }
      }
    });

    const ch = createGameChannel(initialRoom.channelId);
    channelRef.current = ch;
    const joinMsg: ChatMessage = {
      id: crypto.randomUUID(), username: "system", displayName: "Sistem",
      text: `${displayName} odaya katıldı.`, type: "system", ts: Date.now(),
    };
    onChat(ch, msg => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    // Oyuncu odadan ayrıldı — anında takım listesini güncelle (postgres_changes güvenilirliğine bağımsız)
    ch.on("broadcast", { event: "player_left_lobby" }, ({ payload }) => {
      const { username: leftUser } = payload as { username: string; displayName: string };
      setRoom(prev => ({
        ...prev,
        redTeam:  prev.redTeam.filter(m => m.username !== leftUser),
        blueTeam: prev.blueTeam.filter(m => m.username !== leftUser),
      }));
    });
    ch.subscribe(status => {
      if (status === "SUBSCRIBED") { broadcastChat(ch, joinMsg); setMessages([joinMsg]); }
    });
    return () => { subRef.current?.unsubscribe(); ch.unsubscribe(); };
  }, []); // eslint-disable-line

  const sendMessage = () => {
    if (!inputText.trim() || !channelRef.current) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(), username, displayName, text: inputText.trim(), type: "user", ts: Date.now(),
    };
    broadcastChat(channelRef.current, msg);
    setMessages(prev => [...prev, msg]);
    setInputText("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleSwitchTeam = async (team: "red" | "blue") => {
    if (team === myTeam || switching) return;
    const targetTeam = team === "red" ? room.redTeam : room.blueTeam;
    if (targetTeam.length >= maxPerTeam) return;
    setSwitching(true);
    const { room: updated } = await joinRoomTeam(room.id, { username, displayName }, team);
    setSwitching(false);
    if (updated) setRoom(updated);
  };

  // Maç sırasında takım seçip direkt oyuna gir
  const handleMidMatchJoin = async (team: "red" | "blue") => {
    setSwitching(true);
    const { room: updated, error: err } = await joinRoomTeam(room.id, { username, displayName }, team);
    setSwitching(false);
    if (err || !updated) return;
    setMidMatchPicking(false);
    matchStartedRef.current = true;
    onStartMatch(buildMatch(updated));
  };

  const handleLeave = async () => {
    if (channelRef.current) {
      // 1) Broadcast: tüm istemciler anında takım listesini günceller (postgres_changes'tan bağımsız)
      channelRef.current.send({
        type: "broadcast",
        event: "player_left_lobby",
        payload: { username, displayName },
      });
      // 2) Sohbete sistem mesajı
      broadcastChat(channelRef.current, {
        id: crypto.randomUUID(), username: "system", displayName: "Sistem",
        text: `${displayName} odadan ayrıldı.`, type: "system", ts: Date.now(),
      });
    }
    // 3) Supabase RPC: kalıcı veri güncelleme (postgres_changes → subscribeToRoom)
    await leaveRoom(room.id, username);
    onLeave();
  };

  const handleStartMatch = async () => {
    if (matchStartedRef.current) return;
    matchStartedRef.current = true;
    await startRoom(room.id, username);
    onStartMatch(buildMatch(room));
  };

  // ── Atıldı ekranı ──────────────────────────────────────────────────────────
  if (kicked) {
    return (
      <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] px-5 gap-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 text-center">
          <span className="text-5xl">🚪</span>
          <h2 className="text-white font-black text-2xl">Oda Kapandı</h2>
          <p className="text-white/40 text-sm">Oda sahibi odadan ayrıldı.<br />Ana lobiye yönlendiriliyorsunuz…</p>
        </motion.div>
      </div>
    );
  }

  // ── Maç oynanırken takım seçimi (mid-match join) ───────────────────────────
  if (midMatchPicking) {
    const redFull  = room.redTeam.length  >= maxPerTeam;
    const blueFull = room.blueTeam.length >= maxPerTeam;
    return (
      <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden px-5">
        <div className="pitch-glow pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-sm flex flex-col gap-6"
        >
          {/* Başlık */}
          <div className="text-center flex flex-col gap-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap size={18} className="text-[#a78bfa]" />
              <span
                className="text-xs font-black px-3 py-1 rounded-full"
                style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}
              >
                MAÇ DEVAM EDİYOR
              </span>
            </div>
            <h2 className="text-white font-black text-2xl">{room.name}</h2>
            <p className="text-white/40 text-sm">Hangi takıma katılmak istiyorsun?</p>
          </div>

          {/* Takım seçimi */}
          <div className="flex gap-3">
            {/* Kırmızı */}
            <motion.button
              whileHover={!redFull ? { scale: 1.03 } : {}}
              whileTap={!redFull ? { scale: 0.97 } : {}}
              onClick={() => !redFull && !switching && handleMidMatchJoin("red")}
              disabled={redFull || switching}
              className="flex-1 flex flex-col items-center gap-3 py-5 rounded-2xl transition-all"
              style={{
                background: redFull ? "rgba(255,255,255,0.04)" : "rgba(230,53,53,0.12)",
                border: redFull ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(230,53,53,0.35)",
                opacity: redFull ? 0.4 : 1,
              }}
            >
              <span className="text-3xl">🔴</span>
              <div className="text-center">
                <div className="text-white font-black text-base">Kırmızı</div>
                <div className="text-white/40 text-xs">{room.redTeam.length}/{maxPerTeam} oyuncu</div>
              </div>
              {!redFull && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{ background: "rgba(230,53,53,0.2)", color: "#e63535" }}>
                  {switching ? "…" : "Katıl →"}
                </span>
              )}
              {redFull && <span className="text-[11px] text-white/25">Dolu</span>}
            </motion.button>

            {/* Mavi */}
            <motion.button
              whileHover={!blueFull ? { scale: 1.03 } : {}}
              whileTap={!blueFull ? { scale: 0.97 } : {}}
              onClick={() => !blueFull && !switching && handleMidMatchJoin("blue")}
              disabled={blueFull || switching}
              className="flex-1 flex flex-col items-center gap-3 py-5 rounded-2xl transition-all"
              style={{
                background: blueFull ? "rgba(255,255,255,0.04)" : "rgba(68,136,255,0.12)",
                border: blueFull ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(68,136,255,0.35)",
                opacity: blueFull ? 0.4 : 1,
              }}
            >
              <span className="text-3xl">🔵</span>
              <div className="text-center">
                <div className="text-white font-black text-base">Mavi</div>
                <div className="text-white/40 text-xs">{room.blueTeam.length}/{maxPerTeam} oyuncu</div>
              </div>
              {!blueFull && (
                <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{ background: "rgba(68,136,255,0.2)", color: "#4488ff" }}>
                  {switching ? "…" : "Katıl →"}
                </span>
              )}
              {blueFull && <span className="text-[11px] text-white/25">Dolu</span>}
            </motion.button>
          </div>

          {/* Mevcut oyuncular */}
          <div
            className="flex flex-col gap-2 px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-white/30 text-xs uppercase tracking-wider font-semibold">Şu an oynuyor</p>
            <div className="flex gap-4">
              <div className="flex-1">
                {room.redTeam.length === 0
                  ? <p className="text-white/20 text-xs italic">Boş</p>
                  : room.redTeam.map(m => (
                    <p key={m.username} className="text-[#e63535]/80 text-xs font-semibold truncate">🔴 {m.displayName}</p>
                  ))
                }
              </div>
              <div className="flex-1">
                {room.blueTeam.length === 0
                  ? <p className="text-white/20 text-xs italic">Boş</p>
                  : room.blueTeam.map(m => (
                    <p key={m.username} className="text-[#4488ff]/80 text-xs font-semibold truncate">🔵 {m.displayName}</p>
                  ))
                }
              </div>
            </div>
          </div>

          <button
            onClick={handleLeave}
            className="text-white/30 hover:text-white/60 text-sm font-semibold transition-colors text-center"
          >
            ← Geri Dön
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Slot render helper ─────────────────────────────────────────────────────
  const renderSlots = (team: "red" | "blue") => {
    const members = team === "red" ? room.redTeam : room.blueTeam;
    const color   = team === "red" ? "#e63535" : "#4488ff";
    const slots: React.JSX.Element[] = [];

    for (let i = 0; i < maxPerTeam; i++) {
      const m = members[i];
      if (m) {
        slots.push(
          <motion.div key={m.username} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
            style={{ background: `${color}12`, border: `1px solid ${color}25` }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0"
              style={{ background: `${color}40`, border: `1px solid ${color}50` }}>
              {m.displayName.charAt(0).toUpperCase()}
            </div>
            <span className={`text-xs font-semibold truncate flex-1 ${m.username === username ? "text-white" : "text-white/65"}`}>
              {m.displayName}
            </span>
            {m.username === room.hostUsername && <Crown size={11} className="flex-shrink-0" style={{ color: "#facc15" }} />}
          </motion.div>
        );
      } else {
        slots.push(
          <div key={`empty-${i}`} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
            style={{ border: `1px dashed ${color}18` }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}06`, border: `1px dashed ${color}20` }}>
              <span className="text-white/20 text-xs">+</span>
            </div>
            <span className="text-white/18 text-xs italic">Boş slot</span>
          </div>
        );
      }
    }
    return slots;
  };

  // ── TeamCard ───────────────────────────────────────────────────────────────
  const TeamCard = ({ team }: { team: "red" | "blue" }) => {
    const members  = team === "red" ? room.redTeam : room.blueTeam;
    const color    = team === "red" ? "#e63535" : "#4488ff";
    const label    = team === "red" ? "Kırmızı" : "Mavi";
    const emoji    = team === "red" ? "🔴" : "🔵";
    const isMine   = myTeam === team;
    const isFull   = members.length >= maxPerTeam;
    const canJoin  = !isMine && !isFull && !switching;

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col gap-2 rounded-2xl p-3 relative overflow-hidden"
        style={{
          background: isMine ? `${color}10` : `${color}05`,
          border: `1px solid ${color}${isMine ? "35" : "18"}`,
          boxShadow: isMine ? `0 0 20px ${color}15` : "none",
        }}
      >
        {isMine && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}10 0%, transparent 70%)` }} />
        )}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">{emoji}</span>
            <span className="font-black text-sm" style={{ color }}>{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/25 text-xs">{members.length}</span>
            <span className="text-white/15 text-xs">/</span>
            <span className="text-white/40 text-xs">{maxPerTeam}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 relative z-10">{renderSlots(team)}</div>
        <motion.button
          whileHover={canJoin ? { scale: 1.02 } : {}}
          whileTap={canJoin ? { scale: 0.97 } : {}}
          onClick={() => canJoin && handleSwitchTeam(team)}
          disabled={!canJoin}
          className="mt-auto py-2.5 rounded-xl text-xs font-black transition-all relative z-10"
          style={
            isMine  ? { background: `${color}20`, color, border: `1px solid ${color}35`, cursor: "default" }
            : isFull ? { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.08)", cursor: "not-allowed" }
            : { background: `${color}18`, color, border: `1px solid ${color}35`, cursor: "pointer" }
          }
        >
          {isMine ? `✓ Bu Takımdasın` : isFull ? "Takım Dolu" : switching ? "…" : `${label}'ya Katıl`}
        </motion.button>
      </motion.div>
    );
  };

  // Host tek başına başlatabilir (minimum oyuncu şartı yok)
  const canStart = isHost;
  const isPlaying = room.status === "playing";

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow pointer-events-none" />

      <div className="relative z-10 flex flex-col w-full max-w-lg mx-auto px-4 py-5 gap-4 h-full min-h-[100dvh]">
        {/* ── Üst bar ── */}
        <div className="flex items-start justify-between">
          <button onClick={handleLeave}
            className="flex items-center gap-1.5 text-[#f87171]/60 hover:text-[#f87171] transition-colors text-sm font-semibold">
            <ArrowLeft size={14} /> Ayrıl
          </button>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-white font-black text-base truncate max-w-[180px] leading-tight">{room.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
                {mode}
              </span>
              {isPlaying
                ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                    ● CANLI
                  </span>
                : <span className="text-white/25 text-[11px]">Serbest Maç</span>
              }
            </div>
          </div>
        </div>

        {/* ── Oyuncu sayacı ── */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2 text-white/40">
            <Users size={13} />
            <span className="text-xs font-semibold">Oyuncular</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-black text-sm">{totalPlayers}</span>
            <span className="text-white/25 text-xs">/ {room.maxPlayers}</span>
            <div className="w-16 h-1.5 rounded-full overflow-hidden ml-1" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(totalPlayers / room.maxPlayers) * 100}%`,
                  background: totalPlayers === room.maxPlayers ? "#4ade80" : "rgba(167,139,250,0.7)",
                }} />
            </div>
          </div>
        </div>

        {/* ── Takım kartları ── */}
        <div className="flex gap-3 flex-1">
          <TeamCard team="red" />
          <TeamCard team="blue" />
        </div>

        {/* ── Başlat / Bekle / Maç Devam Ediyor ── */}
        {isPlaying ? (
          // Maç devam ediyor — host için maça geri dön butonu
          isHost ? (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => { matchStartedRef.current = true; onStartMatch(buildMatch(room)); }}
              className="w-full py-4 rounded-2xl font-black text-base text-white transition-all flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#166534,#4ade80)" }}
            >
              <Zap size={16} /> Maça Geri Dön
            </motion.button>
          ) : null
        ) : isHost ? (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleStartMatch}
            disabled={!canStart}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            style={{ background: canStart ? "linear-gradient(135deg,#6d28d9,#a78bfa)" : "rgba(255,255,255,0.06)" }}
          >
            <Play size={16} />
            Maçı Başlat
          </motion.button>
        ) : (
          <div className="w-full py-3.5 rounded-2xl text-center text-sm border"
            style={{ color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
            <Shield size={13} className="inline mr-1.5 opacity-50" />
            Oda sahibinin maçı başlatması bekleniyor…
          </div>
        )}

        {/* ── Sohbet ── */}
        <div className="flex flex-col">
          <button onClick={() => setChatOpen(o => !o)}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 transition-all">
            <div className="flex items-center gap-2 text-white/50 text-sm font-semibold">
              <MessageCircle size={13} />
              <span>Sohbet</span>
              {messages.filter(m => m.type === "user").length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                  {messages.filter(m => m.type === "user").length}
                </span>
              )}
            </div>
            {chatOpen ? <X size={13} className="text-white/25" /> : <span className="text-white/20 text-xs">Aç →</span>}
          </button>

          <AnimatePresence>
            {chatOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="flex flex-col border border-t-0 rounded-b-xl"
                  style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.25)" }}>
                  <div className="flex flex-col gap-1 p-3 max-h-32 overflow-y-auto">
                    {messages.map(msg => (
                      <div key={msg.id} className={`text-xs ${msg.type === "system" ? "text-[#facc15]/55 italic" : ""}`}>
                        {msg.type === "user" && (
                          <span className={`font-bold mr-1 ${msg.username === username ? "text-[#4af]" : "text-white/55"}`}>
                            {msg.displayName}:
                          </span>
                        )}
                        <span className={msg.type === "user" ? "text-white/70" : ""}>{msg.text}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2 p-2 border-t border-white/6">
                    <input type="text" value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      placeholder="Mesaj yaz…" maxLength={100}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/20 outline-none focus:border-[#a78bfa]/40 transition-all"
                    />
                    <button onClick={sendMessage}
                      className="px-3 py-1.5 rounded-lg bg-[#a78bfa]/12 border border-[#a78bfa]/22 text-[#a78bfa] hover:bg-[#a78bfa]/22 transition-all">
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

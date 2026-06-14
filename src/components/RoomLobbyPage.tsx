import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MessageCircle, X, Play } from "lucide-react";
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

  const channelRef      = useRef<ReturnType<typeof createGameChannel> | null>(null);
  const subRef          = useRef<ReturnType<typeof subscribeToRoom> | null>(null);
  const chatEndRef      = useRef<HTMLDivElement>(null);
  const matchStartedRef = useRef(false);

  const isHost = initialRoom.hostUsername === username;
  const myTeam = room.redTeam.some(m => m.username === username) ? "red"
               : room.blueTeam.some(m => m.username === username) ? "blue"
               : null;

  const buildMatch = (r: CustomRoom): MatchSession => ({
    id: r.id, mode: modeFromMaxPlayers(r.maxPlayers), channelId: r.channelId,
    hostUsername: r.hostUsername, redTeam: r.redTeam, blueTeam: r.blueTeam,
    status: "starting", createdAt: r.createdAt, ranked: false,
  });

  useEffect(() => {
    subRef.current = subscribeToRoom(initialRoom.id, updated => {
      if (!updated) {
        // Oda silindi — host ayrılmış olabilir
        if (!isHost && !matchStartedRef.current) {
          setKicked(true);
          setTimeout(() => onLeave(), 2500);
        }
        return;
      }
      setRoom(updated);
      if (updated.status === "playing" && !isHost && !matchStartedRef.current) {
        matchStartedRef.current = true;
        onStartMatch(buildMatch(updated));
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
    if (team === myTeam) return;
    setSwitching(true);
    const { room: updated } = await joinRoomTeam(room.id, { username, displayName }, team);
    setSwitching(false);
    if (updated) setRoom(updated);
  };

  const handleLeave = async () => {
    if (channelRef.current) {
      broadcastChat(channelRef.current, {
        id: crypto.randomUUID(), username: "system", displayName: "Sistem",
        text: `${displayName} odadan ayrıldı.`, type: "system", ts: Date.now(),
      });
    }
    await leaveRoom(room.id, username);
    onLeave();
  };

  const handleStartMatch = async () => {
    if (matchStartedRef.current) return;
    matchStartedRef.current = true;
    await startRoom(room.id, username);
    onStartMatch(buildMatch(room));
  };

  // Atıldı ekranı
  if (kicked) {
    return (
      <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] px-5 gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <span className="text-5xl">🚪</span>
          <h2 className="text-white font-black text-2xl">Oda Kapandı</h2>
          <p className="text-white/40 text-sm">Oda sahibi odadan ayrıldı.<br />Ana lobiye yönlendiriliyorsunuz…</p>
        </motion.div>
      </div>
    );
  }

  const TeamColumn = ({ team, members }: { team: "red" | "blue"; members: TeamMember[] }) => {
    const color  = team === "red" ? "#e63535" : "#4488ff";
    const label  = team === "red" ? "🔴 Kırmızı" : "🔵 Mavi";
    const isMine = myTeam === team;
    return (
      <div
        className="flex-1 flex flex-col gap-3 p-4 rounded-2xl border transition-all"
        style={{ borderColor: `${color}${isMine ? "55" : "22"}`, background: `${color}${isMine ? "10" : "05"}` }}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm" style={{ color }}>{label}</span>
          <span className="text-white/30 text-xs">{members.length}</span>
        </div>
        <div className="flex flex-col gap-1.5 min-h-[60px]">
          {members.map((m, i) => (
            <div key={m.username} className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                style={{ background: color }}
              >{i + 1}</span>
              <span className={`text-xs truncate ${m.username === username ? "text-white font-bold" : "text-white/60"}`}>
                {m.displayName}{m.username === room.hostUsername && " 👑"}
              </span>
            </div>
          ))}
          {members.length === 0 && <span className="text-white/20 text-xs">Boş</span>}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => handleSwitchTeam(team)}
          disabled={isMine || switching}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          style={{ background: `${color}${isMine ? "25" : "10"}`, border: `1px solid ${color}${isMine ? "40" : "22"}`, color }}
        >
          {isMine ? "✓ Bu Takımdasın" : "Katıl"}
        </motion.button>
      </div>
    );
  };

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow" />
      <div className="relative z-10 flex flex-col w-full max-w-lg mx-auto px-4 py-6 gap-4 h-full">

        {/* Üst bar */}
        <div className="flex items-center justify-between">
          <button onClick={handleLeave}
            className="flex items-center gap-1.5 text-[#f87171]/70 hover:text-[#f87171] transition-colors text-sm font-semibold">
            <ArrowLeft size={14} /> Odadan Ayrıl
          </button>
          <div className="flex flex-col items-end">
            <span className="text-white font-bold text-sm truncate max-w-[160px]">{room.name}</span>
            <span className="text-white/30 text-xs">
              {room.redTeam.length + room.blueTeam.length}/{room.maxPlayers} oyuncu · Serbest Maç
            </span>
          </div>
        </div>

        {/* Takımlar */}
        <div className="flex gap-3">
          <TeamColumn team="red"  members={room.redTeam}  />
          <TeamColumn team="blue" members={room.blueTeam} />
        </div>

        {/* Başlat / Bekle */}
        {isHost ? (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleStartMatch}
            disabled={room.redTeam.length === 0 || room.blueTeam.length === 0}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#6d28d9,#a78bfa)" }}
          >
            <Play size={16} /> Maçı Başlat
          </motion.button>
        ) : (
          <div className="w-full py-3 rounded-2xl text-center text-white/30 text-sm border border-white/8 bg-white/3">
            👑 Oda sahibinin maçı başlatması bekleniyor…
          </div>
        )}

        {/* Sohbet */}
        <div className="flex flex-col">
          <button
            onClick={() => setChatOpen(o => !o)}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 transition-all"
          >
            <div className="flex items-center gap-2 text-white/60 text-sm font-semibold">
              <MessageCircle size={14} /> Sohbet
            </div>
            {chatOpen ? <X size={14} className="text-white/30" /> : <span className="text-white/30 text-xs">Aç →</span>}
          </button>

          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border border-t-0 border-white/10 rounded-b-xl bg-black/20 flex flex-col">
                  <div className="flex flex-col gap-1 p-3 max-h-36 overflow-y-auto">
                    {messages.map(msg => (
                      <div key={msg.id} className={`text-xs ${msg.type === "system" ? "text-[#facc15]/60 italic" : ""}`}>
                        {msg.type === "user" && (
                          <span className={`font-bold mr-1 ${msg.username === username ? "text-[#4af]" : "text-white/60"}`}>
                            {msg.displayName}:
                          </span>
                        )}
                        <span className={msg.type === "user" ? "text-white/75" : ""}>{msg.text}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2 p-2 border-t border-white/8">
                    <input
                      type="text" value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      placeholder="Mesaj yaz…" maxLength={100}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/25 outline-none focus:border-[#a78bfa]/40 transition-all"
                    />
                    <button onClick={sendMessage}
                      className="px-3 py-1.5 rounded-lg bg-[#a78bfa]/15 border border-[#a78bfa]/25 text-[#a78bfa] hover:bg-[#a78bfa]/25 transition-all">
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

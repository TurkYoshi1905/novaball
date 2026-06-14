import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Users, Wifi, Zap } from "lucide-react";
import type { CustomRoom } from "../types/game";
import { modeFromMaxPlayers } from "../types/game";
import { listRooms, subscribeToRooms } from "../lib/matchmaking";

interface Props {
  username: string;
  displayName: string;
  onCreateRoom: () => void;
  onJoinRoom: (room: CustomRoom) => void;
  onBack: () => void;
}

export default function CustomRoomsPage({ username, displayName: _displayName, onCreateRoom, onJoinRoom, onBack }: Props) {
  const [rooms,   setRooms]   = useState<CustomRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    listRooms().then(r => { setRooms(r); setLoading(false); });
    const ch = subscribeToRooms(r => setRooms(r));
    return () => { ch.unsubscribe(); };
  }, []);

  const handleJoin = (room: CustomRoom) => {
    setError("");
    // Tüm odalarda (waiting veya playing) direkt lobiye gönder — lobi takım seçimini halleder
    onJoinRoom(room);
  };

  const waitingRooms = rooms.filter(r => r.status === "waiting");
  const playingRooms = rooms.filter(r => r.status === "playing");

  const containerVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0 },
  };

  const RoomCard = ({ room }: { room: CustomRoom }) => {
    const total    = room.redTeam.length + room.blueTeam.length;
    const isFull   = total >= room.maxPlayers;
    const isInRoom = room.redTeam.some(m => m.username === username) ||
                     room.blueTeam.some(m => m.username === username);
    const isPlaying = room.status === "playing";
    const mode = modeFromMaxPlayers(room.maxPlayers);

    const buttonLabel = isInRoom ? "Gir" : isPlaying ? "Katıl" : isFull ? "Dolu" : "Katıl";
    const buttonDisabled = !isInRoom && isFull && !isPlaying;

    return (
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border bg-white/3 transition-all"
        style={{
          borderColor: isPlaying ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.1)",
          background: isPlaying ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.03)",
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white font-bold text-sm truncate">{room.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
              style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
              {mode}
            </span>
            {isPlaying && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1"
                style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                <Zap size={8} /> CANLI
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-white/35 text-xs">
            <Users size={11} />
            <span>{total}/{room.maxPlayers}</span>
            <span className="mx-1 text-white/15">•</span>
            <span className="text-red-400/60">🔴{room.redTeam.length}</span>
            <span className="text-blue-400/60">🔵{room.blueTeam.length}</span>
            <span className="mx-1 text-white/15">•</span>
            <span className="text-white/25 truncate">@{room.hostUsername}</span>
          </div>
        </div>

        <button
          disabled={buttonDisabled}
          onClick={() => handleJoin(room)}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            isInRoom
              ? { background: "#4ade8015", border: "1px solid #4ade8030", color: "#4ade80" }
              : isPlaying
              ? { background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }
              : isFull
              ? { background: "#ffffff08", border: "1px solid #ffffff15", color: "#ffffff30" }
              : { background: "#44aaff18", border: "1px solid #44aaff35", color: "#44aaff" }
          }
        >
          {buttonLabel}
        </button>
      </motion.div>
    );
  };

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow" />
      <div className="orb orb-1" />

      <div className="relative z-10 flex flex-col w-full max-w-lg mx-auto px-5 py-8 gap-5">
        {/* Üst bar */}
        <div className="flex items-center justify-between">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-sm font-semibold">
            <ArrowLeft size={15} /> Geri
          </button>
          <h1 className="text-white font-black text-xl">
            Özel <span className="text-[#4af]">Odalar</span>
          </h1>
          <div className="flex items-center gap-1 text-[#4ade80] text-xs font-semibold">
            <Wifi size={12} /> Canlı
          </div>
        </div>

        {/* Oda oluştur */}
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onCreateRoom}
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl border border-[#4af]/30 bg-[#4af]/8 text-[#4af] font-bold text-base hover:bg-[#4af]/15 transition-all"
        >
          <Plus size={18} /> Özel Oda Oluştur
        </motion.button>

        {error && (
          <div className="px-4 py-2 rounded-xl bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] text-sm text-center">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#4af]" />
          </div>
        )}

        {!loading && rooms.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-4xl">🏟️</span>
            <p className="text-white/30 text-sm">Henüz açık oda yok.</p>
            <p className="text-white/20 text-xs">İlk odayı sen aç!</p>
          </div>
        )}

        {/* Aktif maçlar */}
        {!loading && playingRooms.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Zap size={11} className="text-[#4ade80]" />
              <span className="text-[#4ade80]/70 text-xs uppercase tracking-wider font-semibold">Devam Eden Maçlar</span>
              <span className="text-[#4ade80]/40 text-xs">{playingRooms.length}</span>
            </div>
            <motion.div className="flex flex-col gap-2" variants={containerVariants} initial="hidden" animate="visible">
              {playingRooms.map(room => <RoomCard key={room.id} room={room} />)}
            </motion.div>
          </div>
        )}

        {/* Bekleme odaları */}
        {!loading && waitingRooms.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">Açık Odalar</span>
              <span className="text-white/30 text-xs">{waitingRooms.length} oda</span>
            </div>
            <motion.div className="flex flex-col gap-2" variants={containerVariants} initial="hidden" animate="visible">
              {waitingRooms.map(room => <RoomCard key={room.id} room={room} />)}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Users, Wifi } from "lucide-react";
import type { CustomRoom } from "../types/game";
import { listRooms, subscribeToRooms, joinRoomTeam } from "../lib/matchmaking";

interface Props {
  username: string;
  displayName: string;
  onCreateRoom: () => void;
  onJoinRoom: (room: CustomRoom) => void;
  onBack: () => void;
}

export default function CustomRoomsPage({ username, displayName, onCreateRoom, onJoinRoom, onBack }: Props) {
  const [rooms, setRooms]       = useState<CustomRoom[]>([]);
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState<string | null>(null);
  const [error, setError]       = useState("");

  useEffect(() => {
    listRooms().then(r => { setRooms(r); setLoading(false); });
    const ch = subscribeToRooms(r => setRooms(r));
    return () => { ch.unsubscribe(); };
  }, []);

  const handleJoin = async (room: CustomRoom) => {
    setJoining(room.id);
    setError("");
    const team = room.redTeam.length <= room.blueTeam.length ? "red" : "blue";
    const { room: updated, error: err } = await joinRoomTeam(room.id, { username, displayName }, team);
    if (err || !updated) { setError(err ?? "Katılım başarısız"); setJoining(null); return; }
    setJoining(null);
    onJoinRoom(updated);
  };

  const containerVariants = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow" />
      <div className="orb orb-1" />

      <div className="relative z-10 flex flex-col w-full max-w-lg mx-auto px-5 py-8 gap-5">
        {/* Üst bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-sm font-semibold"
          >
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

        {/* Oda listesi */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">Açık Odalar</span>
            <span className="text-white/30 text-xs">{rooms.length} oda</span>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#4af]"
              />
            </div>
          )}

          {!loading && rooms.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-4xl">🏟️</span>
              <p className="text-white/30 text-sm">Henüz açık oda yok.</p>
              <p className="text-white/20 text-xs">İlk odayı sen aç!</p>
            </div>
          )}

          <motion.div
            className="flex flex-col gap-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {rooms.map(room => {
              const total    = room.redTeam.length + room.blueTeam.length;
              const isFull   = total >= room.maxPlayers;
              const isInRoom = room.redTeam.some(m => m.username === username) ||
                               room.blueTeam.some(m => m.username === username);
              return (
                <motion.div
                  key={room.id}
                  variants={itemVariants}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-white/10 bg-white/3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-bold text-sm truncate">{room.name}</span>
                      {room.hostUsername === room.hostUsername && (
                        <span className="text-[10px] text-[#facc15]/70 bg-[#facc15]/10 border border-[#facc15]/20 px-1.5 rounded-full">
                          @{room.hostUsername}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-white/35 text-xs">
                      <Users size={11} />
                      <span>{total}/{room.maxPlayers} oyuncu</span>
                      <span className="mx-1 text-white/15">•</span>
                      <span className="text-red-400/60">●{room.redTeam.length}</span>
                      <span className="text-blue-400/60">●{room.blueTeam.length}</span>
                    </div>
                  </div>

                  <button
                    disabled={isFull || joining === room.id}
                    onClick={() => isInRoom ? onJoinRoom(room) : handleJoin(room)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={
                      isInRoom
                        ? { background: "#4ade8015", border: "1px solid #4ade8030", color: "#4ade80" }
                        : isFull
                        ? { background: "#ffffff08", border: "1px solid #ffffff15", color: "#ffffff30" }
                        : { background: "#44aaff18", border: "1px solid #44aaff35", color: "#44aaff" }
                    }
                  >
                    {joining === room.id ? "…" : isInRoom ? "Gir" : isFull ? "Dolu" : "Katıl"}
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

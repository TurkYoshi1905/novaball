import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Users, Zap, Eye, Search, RefreshCw } from "lucide-react";
import type { CustomRoom } from "../types/game";
import { modeFromMaxPlayers } from "../types/game";
import { listRooms, subscribeToRooms } from "../lib/matchmaking";

interface Props {
  username: string;
  displayName: string;
  onCreateRoom: () => void;
  onJoinRoom: (room: CustomRoom) => void;
  onWatchRoom: (room: CustomRoom) => void;
  onBack: () => void;
}

export default function CustomRoomsPage({
  username, displayName: _dn, onCreateRoom, onJoinRoom, onWatchRoom, onBack,
}: Props) {
  const [rooms,   setRooms]   = useState<CustomRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setLoading(true);
    listRooms().then(r => { setRooms(r); setLoading(false); });
  };

  useEffect(() => {
    load();
    const ch = subscribeToRooms(r => setRooms(r));
    return () => { ch.unsubscribe(); };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    listRooms().then(r => { setRooms(r); setRefreshing(false); });
  };

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.hostUsername.toLowerCase().includes(search.toLowerCase())
  );
  const waitingRooms = filtered.filter(r => r.status === "waiting");
  const playingRooms = filtered.filter(r => r.status === "playing");

  const RoomCard = ({ room }: { room: CustomRoom }) => {
    const total     = room.redTeam.length + room.blueTeam.length;
    const isFull    = total >= room.maxPlayers;
    const isInRoom  = room.redTeam.some(m => m.username === username) ||
                      room.blueTeam.some(m => m.username === username);
    const isPlaying = room.status === "playing";
    const mode      = modeFromMaxPlayers(room.maxPlayers);
    const fillPct   = total / room.maxPlayers;

    const canJoin   = isInRoom || !isFull || isPlaying;
    const canWatch  = isPlaying;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        whileHover={{ scale: 1.01 }}
        style={{
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          border: `1px solid ${isPlaying ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.09)"}`,
          background: isPlaying
            ? "linear-gradient(135deg,rgba(74,222,128,0.06),rgba(74,222,128,0.02))"
            : "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))",
          backdropFilter: "blur(12px)",
          padding: "16px 18px",
          cursor: "default",
        }}
      >
        {/* Live pulse */}
        {isPlaying && (
          <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 5 }}>
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }}
            />
            <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>CANLI</span>
          </div>
        )}

        {/* Room name + mode badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingRight: isPlaying ? 60 : 0 }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {room.name}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
            background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa",
          }}>{mode}</span>
        </div>

        {/* Host */}
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 12 }}>
          @{room.hostUsername}
        </div>

        {/* Teams */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {/* Red team */}
          <div style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, padding: "8px 10px" }}>
            <div style={{ color: "#f87171", fontSize: 10, fontWeight: 700, marginBottom: 4, letterSpacing: "0.05em" }}>KIRMIZI</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Array.from({ length: room.maxPlayers / 2 }).map((_, i) => {
                const member = room.redTeam[i];
                return (
                  <div key={i} title={member?.displayName}
                    style={{
                      width: 24, height: 24, borderRadius: "50%", fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: member ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${member ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                      color: member ? "#fca5a5" : "rgba(255,255,255,0.15)",
                    }}>
                    {member ? member.displayName.slice(0, 1).toUpperCase() : "·"}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Blue team */}
          <div style={{ flex: 1, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 12, padding: "8px 10px" }}>
            <div style={{ color: "#60a5fa", fontSize: 10, fontWeight: 700, marginBottom: 4, letterSpacing: "0.05em" }}>MAVİ</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Array.from({ length: room.maxPlayers / 2 }).map((_, i) => {
                const member = room.blueTeam[i];
                return (
                  <div key={i} title={member?.displayName}
                    style={{
                      width: 24, height: 24, borderRadius: "50%", fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: member ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${member ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                      color: member ? "#93c5fd" : "rgba(255,255,255,0.15)",
                    }}>
                    {member ? member.displayName.slice(0, 1).toUpperCase() : "·"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          {/* Players + fill bar */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <Users size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }}>
                {total}/{room.maxPlayers}
              </span>
              {room.spectatorCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: 4, color: "rgba(167,139,250,0.7)", fontSize: 11 }}>
                  <Eye size={9} /> {room.spectatorCount}
                </span>
              )}
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${fillPct * 100}%`, borderRadius: 4, background: isFull ? "#f87171" : isPlaying ? "#4ade80" : "#60a5fa", transition: "width 0.4s" }} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {canWatch && (
              <button onClick={() => onWatchRoom(room)}
                style={{
                  padding: "7px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa",
                  display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
                }}>
                <Eye size={11} /> İzle
              </button>
            )}
            {(canJoin || !isPlaying) && (
              <button
                disabled={!isInRoom && isFull && !isPlaying}
                onClick={() => onJoinRoom(room)}
                style={{
                  padding: "7px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                  cursor: !isInRoom && isFull && !isPlaying ? "not-allowed" : "pointer",
                  opacity: !isInRoom && isFull && !isPlaying ? 0.35 : 1,
                  background: isInRoom
                    ? "rgba(74,222,128,0.12)"
                    : isPlaying
                      ? "rgba(74,222,128,0.1)"
                      : isFull
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(68,170,255,0.14)",
                  border: `1px solid ${isInRoom ? "rgba(74,222,128,0.3)" : isPlaying ? "rgba(74,222,128,0.25)" : isFull ? "rgba(255,255,255,0.1)" : "rgba(68,170,255,0.3)"}`,
                  color: isInRoom ? "#4ade80" : isPlaying ? "#4ade80" : isFull ? "rgba(255,255,255,0.25)" : "#44aaff",
                  transition: "all 0.2s",
                }}>
                {isInRoom ? "Geri Dön" : isPlaying ? "Katıl" : isFull ? "Dolu" : "Katıl"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow" />
      <div className="orb orb-1" />

      <div className="relative z-10 flex flex-col w-full max-w-lg mx-auto px-4 py-6 gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-sm font-semibold">
            <ArrowLeft size={15} /> Geri
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-white font-black text-xl">
              Özel <span style={{ color: "#44aaff" }}>Odalar</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              <span className="text-[#4ade80]/70 text-[10px] font-semibold tracking-widest uppercase">Canlı</span>
            </div>
          </div>
          <button onClick={handleRefresh}
            className="text-white/35 hover:text-white/70 transition-colors p-2">
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.7, ease: "linear" }}>
              <RefreshCw size={14} />
            </motion.div>
          </button>
        </div>

        {/* Create room CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onCreateRoom}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "14px", borderRadius: 18,
            background: "linear-gradient(135deg,rgba(68,170,255,0.15),rgba(68,170,255,0.05))",
            border: "1px solid rgba(68,170,255,0.3)", color: "#44aaff",
            fontWeight: 800, fontSize: 14, cursor: "pointer",
          }}>
          <Plus size={18} />
          <span>Özel Oda Oluştur</span>
        </motion.button>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Oda veya host ara..."
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "10px 12px 10px 34px", color: "#fff", fontSize: 13, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#44aaff]" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-center">
            <div style={{ fontSize: 48 }}>🏟️</div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, fontWeight: 600 }}>
              {search ? "Aramanızla eşleşen oda yok." : "Henüz açık oda yok."}
            </p>
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
              {search ? "Farklı bir arama deneyin." : "İlk odayı sen oluştur!"}
            </p>
          </motion.div>
        )}

        {/* Playing rooms */}
        {!loading && playingRooms.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Zap size={12} style={{ color: "#4ade80" }} />
              <span style={{ color: "rgba(74,222,128,0.7)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Devam Eden Maçlar
              </span>
              <span style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "1px 7px", color: "#4ade80", fontSize: 10, fontWeight: 700 }}>
                {playingRooms.length}
              </span>
            </div>
            <AnimatePresence>
              {playingRooms.map(room => <RoomCard key={room.id} room={room} />)}
            </AnimatePresence>
          </div>
        )}

        {/* Waiting rooms */}
        {!loading && waitingRooms.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Bekleme Odaları
              </span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{waitingRooms.length} oda</span>
            </div>
            <AnimatePresence>
              {waitingRooms.map(room => <RoomCard key={room.id} room={room} />)}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

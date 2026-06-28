import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Users, Zap, Eye, Search, RefreshCw, Trophy, Wifi } from "lucide-react";
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
  const [rooms,      setRooms]      = useState<CustomRoom[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<"all" | "live" | "waiting">("all");

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

  const bySearch = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.hostUsername.toLowerCase().includes(search.toLowerCase())
  );
  const liveRooms    = bySearch.filter(r => r.status === "playing");
  const waitingRooms = bySearch.filter(r => r.status === "waiting");
  const filtered = tab === "live" ? liveRooms : tab === "waiting" ? waitingRooms : bySearch;
  const totalPlayers = rooms.reduce((s, r) => s + r.redTeam.length + r.blueTeam.length, 0);

  const RoomCard = ({ room }: { room: CustomRoom }) => {
    const total     = room.redTeam.length + room.blueTeam.length;
    const isFull    = total >= room.maxPlayers;
    const isInRoom  = room.redTeam.some(m => m.username === username) ||
                      room.blueTeam.some(m => m.username === username);
    const isPlaying = room.status === "playing";
    const mode      = modeFromMaxPlayers(room.maxPlayers);
    const fillPct   = total / room.maxPlayers;
    const slots     = room.maxPlayers / 2;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "relative",
          borderRadius: 22,
          overflow: "hidden",
          border: isPlaying
            ? "1px solid rgba(74,222,128,0.3)"
            : "1px solid rgba(255,255,255,0.09)",
          background: isPlaying
            ? "linear-gradient(135deg,rgba(10,30,12,0.95),rgba(7,13,22,0.95))"
            : "linear-gradient(135deg,rgba(15,20,35,0.97),rgba(7,13,22,0.97))",
          backdropFilter: "blur(20px)",
          boxShadow: isPlaying
            ? "0 8px 40px rgba(74,222,128,0.08), inset 0 1px 0 rgba(74,222,128,0.1)"
            : "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Top accent line */}
        <div style={{
          height: 2,
          background: isPlaying
            ? "linear-gradient(90deg,transparent,#4ade80,transparent)"
            : "linear-gradient(90deg,transparent,rgba(68,170,255,0.3),transparent)",
        }} />

        <div style={{ padding: "16px 18px 18px" }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {isPlaying && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 20, padding: "2px 8px 2px 6px" }}>
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }}
                    />
                    <span style={{ color: "#4ade80", fontSize: 9, fontWeight: 900, letterSpacing: "0.08em" }}>CANLI</span>
                  </div>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                  background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa",
                }}>{mode}</span>
              </div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {room.name}
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2 }}>
                host: <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>@{room.hostUsername}</span>
              </div>
            </div>

            {/* Spectator badge */}
            {(room.spectatorCount ?? 0) > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 20, padding: "4px 10px", flexShrink: 0 }}>
                <Eye size={10} style={{ color: "#a78bfa" }} />
                <span style={{ color: "#a78bfa", fontSize: 10, fontWeight: 700 }}>{room.spectatorCount}</span>
              </div>
            )}
          </div>

          {/* Teams */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {/* Red team */}
            <div style={{ flex: 1, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 14, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#f87171", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em" }}>KIRMIZI</span>
                <span style={{ color: "rgba(239,68,68,0.5)", fontSize: 9, fontWeight: 600 }}>{room.redTeam.length}/{slots}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {Array.from({ length: slots }).map((_, i) => {
                  const m = room.redTeam[i];
                  return (
                    <div key={i} title={m?.displayName}
                      style={{
                        width: 28, height: 28, borderRadius: "50%",
                        fontSize: 10, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: m ? "linear-gradient(135deg,rgba(239,68,68,0.5),rgba(185,28,28,0.4))" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${m ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.07)"}`,
                        color: m ? "#fca5a5" : "rgba(255,255,255,0.12)",
                        boxShadow: m ? "0 2px 8px rgba(239,68,68,0.2)" : "none",
                      }}>
                      {m ? m.displayName.slice(0, 1).toUpperCase() : ""}
                    </div>
                  );
                })}
              </div>
              {room.redTeam.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {room.redTeam.slice(0, 2).map(m => (
                    <div key={m.username} style={{ color: "rgba(252,165,165,0.65)", fontSize: 9, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.displayName}
                    </div>
                  ))}
                  {room.redTeam.length > 2 && (
                    <div style={{ color: "rgba(239,68,68,0.4)", fontSize: 9 }}>+{room.redTeam.length - 2} daha</div>
                  )}
                </div>
              )}
            </div>

            {/* VS divider */}
            <div style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.15)", fontSize: 10, fontWeight: 900, paddingTop: 14 }}>VS</div>

            {/* Blue team */}
            <div style={{ flex: 1, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.14)", borderRadius: 14, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#60a5fa", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em" }}>MAVİ</span>
                <span style={{ color: "rgba(59,130,246,0.5)", fontSize: 9, fontWeight: 600 }}>{room.blueTeam.length}/{slots}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {Array.from({ length: slots }).map((_, i) => {
                  const m = room.blueTeam[i];
                  return (
                    <div key={i} title={m?.displayName}
                      style={{
                        width: 28, height: 28, borderRadius: "50%",
                        fontSize: 10, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: m ? "linear-gradient(135deg,rgba(59,130,246,0.5),rgba(29,78,216,0.4))" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${m ? "rgba(59,130,246,0.45)" : "rgba(255,255,255,0.07)"}`,
                        color: m ? "#93c5fd" : "rgba(255,255,255,0.12)",
                        boxShadow: m ? "0 2px 8px rgba(59,130,246,0.2)" : "none",
                      }}>
                      {m ? m.displayName.slice(0, 1).toUpperCase() : ""}
                    </div>
                  );
                })}
              </div>
              {room.blueTeam.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {room.blueTeam.slice(0, 2).map(m => (
                    <div key={m.username} style={{ color: "rgba(147,197,253,0.65)", fontSize: 9, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.displayName}
                    </div>
                  ))}
                  {room.blueTeam.length > 2 && (
                    <div style={{ color: "rgba(59,130,246,0.4)", fontSize: 9 }}>+{room.blueTeam.length - 2} daha</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer: fill bar + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                <Users size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 600 }}>{total}/{room.maxPlayers}</span>
                {isFull && <span style={{ color: "#f87171", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em" }}>• DOLU</span>}
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fillPct * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ height: "100%", borderRadius: 4,
                    background: isFull ? "linear-gradient(90deg,#ef4444,#f87171)" : isPlaying ? "linear-gradient(90deg,#16a34a,#4ade80)" : "linear-gradient(90deg,#1d4ed8,#60a5fa)",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {isPlaying && (
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => onWatchRoom(room)}
                  style={{
                    padding: "8px 14px", borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                  <Eye size={12} /> İzle
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                disabled={!isInRoom && isFull && !isPlaying}
                onClick={() => onJoinRoom(room)}
                style={{
                  padding: "8px 16px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                  cursor: !isInRoom && isFull && !isPlaying ? "not-allowed" : "pointer",
                  opacity: !isInRoom && isFull && !isPlaying ? 0.3 : 1,
                  background: isInRoom
                    ? "linear-gradient(135deg,rgba(74,222,128,0.2),rgba(74,222,128,0.08))"
                    : isPlaying
                      ? "linear-gradient(135deg,rgba(74,222,128,0.15),rgba(74,222,128,0.06))"
                      : isFull
                        ? "rgba(255,255,255,0.04)"
                        : "linear-gradient(135deg,rgba(68,170,255,0.2),rgba(68,170,255,0.08))",
                  border: isInRoom
                    ? "1px solid rgba(74,222,128,0.35)"
                    : isPlaying
                      ? "1px solid rgba(74,222,128,0.25)"
                      : isFull
                        ? "1px solid rgba(255,255,255,0.08)"
                        : "1px solid rgba(68,170,255,0.35)",
                  color: isInRoom ? "#4ade80" : isPlaying ? "#4ade80" : isFull ? "rgba(255,255,255,0.2)" : "#44aaff",
                }}>
                {isInRoom ? "Geri Dön" : isPlaying ? "Katıl" : isFull ? "Dolu" : "Katıl"}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] bg-[#070d16] relative overflow-hidden">
      <div className="pitch-glow" />
      <div className="orb orb-1" />

      {/* Decorative mesh gradient */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 50% at 20% 20%, rgba(68,170,255,0.04) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(167,139,250,0.04) 0%, transparent 70%)",
      }} />

      <div className="relative z-10 flex flex-col w-full max-w-lg mx-auto px-4 py-5 gap-4">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-sm font-semibold">
            <ArrowLeft size={15} /> Geri
          </button>

          <div className="flex flex-col items-center gap-1">
            <h1 className="text-white font-black text-xl tracking-tight">
              Özel <span style={{ color: "#44aaff" }}>Odalar</span>
            </h1>
            <div className="flex items-center gap-3">
              {rooms.length > 0 && (
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 600 }}>
                  {rooms.length} oda · {totalPlayers} oyuncu
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                <span className="text-[#4ade80]/70 text-[10px] font-semibold tracking-widest uppercase">Canlı</span>
              </div>
            </div>
          </div>

          <button onClick={handleRefresh}
            className="text-white/35 hover:text-white/70 transition-colors p-2 rounded-xl hover:bg-white/5">
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.6, ease: "linear" }}>
              <RefreshCw size={14} />
            </motion.div>
          </button>
        </div>

        {/* ── Create Room CTA ─────────────────────────────────────── */}
        <motion.button
          whileHover={{ scale: 1.015, boxShadow: "0 8px 40px rgba(68,170,255,0.18)" }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreateRoom}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "15px", borderRadius: 20,
            background: "linear-gradient(135deg,rgba(68,170,255,0.16),rgba(68,170,255,0.06))",
            border: "1px solid rgba(68,170,255,0.32)", color: "#44aaff",
            fontWeight: 800, fontSize: 14, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(68,170,255,0.08), inset 0 1px 0 rgba(68,170,255,0.12)",
          }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(68,170,255,0.15)", border: "1px solid rgba(68,170,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={18} />
          </div>
          <span>Özel Oda Oluştur</span>
        </motion.button>

        {/* ── Search ──────────────────────────────────────────────── */}
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Oda veya host ara..."
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "11px 14px 11px 36px", color: "#fff", fontSize: 13, outline: "none",
              boxSizing: "border-box", transition: "border-color 0.2s",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(68,170,255,0.3)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
          />
        </div>

        {/* ── Tab filter ──────────────────────────────────────────── */}
        {rooms.length > 0 && (
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "all",     label: "Tümü",   count: bySearch.length },
              { key: "live",    label: "Canlı",  count: liveRooms.length,    color: "#4ade80" },
              { key: "waiting", label: "Bekliyor", count: waitingRooms.length },
            ].map(({ key, label, count, color }) => (
              <button key={key}
                onClick={() => setTab(key as typeof tab)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  background: tab === key ? (color ? `${color}18` : "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.04)",
                  border: tab === key ? `1px solid ${color ? `${color}40` : "rgba(255,255,255,0.2)"}` : "1px solid rgba(255,255,255,0.07)",
                  color: tab === key ? (color ?? "#fff") : "rgba(255,255,255,0.35)",
                  display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                }}>
                {label}
                {count > 0 && (
                  <span style={{ background: tab === key ? (color ? `${color}25` : "rgba(255,255,255,0.15)") : "rgba(255,255,255,0.06)", borderRadius: 20, padding: "1px 6px", fontSize: 10 }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────── */}
        {loading && (
          <div className="flex justify-center py-16">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#44aaff" }} />
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Odalar yükleniyor…</span>
            </div>
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────── */}
        {!loading && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏟️</div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, margin: 0 }}>
              {search ? "Aramanızla eşleşen oda bulunamadı." : tab === "live" ? "Devam eden maç yok." : tab === "waiting" ? "Bekleyen oda yok." : "Henüz açık oda yok."}
            </p>
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, margin: 0 }}>
              {search ? "Farklı bir arama deneyin." : "İlk odayı sen oluştur!"}
            </p>
          </motion.div>
        )}

        {/* ── Live rooms section ──────────────────────────────────── */}
        {!loading && tab !== "waiting" && liveRooms.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 20, padding: "4px 12px" }}>
                <Wifi size={10} style={{ color: "#4ade80" }} />
                <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Devam Eden Maçlar</span>
                <span style={{ background: "rgba(74,222,128,0.15)", borderRadius: 20, padding: "0 6px", color: "#4ade80", fontSize: 10, fontWeight: 800 }}>{liveRooms.length}</span>
              </div>
            </div>
            <AnimatePresence mode="popLayout">
              {liveRooms.map(room => <RoomCard key={room.id} room={room} />)}
            </AnimatePresence>
          </div>
        )}

        {/* ── Waiting rooms section ───────────────────────────────── */}
        {!loading && tab !== "live" && waitingRooms.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Bekleme Odaları</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>{waitingRooms.length} oda</span>
            </div>
            <AnimatePresence mode="popLayout">
              {waitingRooms.map(room => <RoomCard key={room.id} room={room} />)}
            </AnimatePresence>
          </div>
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

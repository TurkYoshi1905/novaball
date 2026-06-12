import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, Users } from "lucide-react";
import type { CustomRoom } from "../types/game";
import { createRoom } from "../lib/matchmaking";

interface Props {
  username: string;
  displayName: string;
  onRoomCreated: (room: CustomRoom) => void;
  onBack: () => void;
}

export default function CreateRoomPage({ username, displayName, onRoomCreated, onBack }: Props) {
  const [name, setName]           = useState("");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const handleCreate = async () => {
    if (!name.trim()) { setError("Oda adı boş olamaz."); return; }
    if (name.trim().length > 40) { setError("Oda adı 40 karakterden uzun olamaz."); return; }
    setLoading(true);
    setError("");
    const { room, error: err } = await createRoom(name.trim(), username, displayName, maxPlayers);
    setLoading(false);
    if (err || !room) { setError(err ?? "Oda oluşturulamadı"); return; }
    onRoomCreated(room);
  };

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden px-5">
      <div className="pitch-glow" />
      <div className="orb orb-2" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm flex flex-col gap-6 py-8"
      >
        {/* Başlık */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-white font-black text-3xl tracking-tight">
            Özel Oda <span className="text-[#4af]">Oluştur</span>
          </h1>
          <p className="text-white/35 text-sm">Odanı kur, arkadaşlarını bekle</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-white/50 text-xs uppercase tracking-wider font-semibold">Oda Adı</label>
            <div className="relative">
              <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                placeholder="Örn: Arkadaş Maçı"
                maxLength={40}
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/12 text-white placeholder-white/25 text-sm outline-none focus:border-[#4af]/50 focus:bg-white/8 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-white/50 text-xs uppercase tracking-wider font-semibold">Maksimum Oyuncu</label>
              <div className="flex items-center gap-2">
                <Users size={13} className="text-[#4af]" />
                <span className="text-[#4af] font-black text-lg">{maxPlayers}</span>
              </div>
            </div>
            <input
              type="range"
              min={2} max={10} step={2}
              value={maxPlayers}
              onChange={e => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-[#44aaff] h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-white/20 text-xs px-0.5">
              {[2, 4, 6, 8, 10].map(n => (
                <span
                  key={n}
                  className={`cursor-pointer transition-colors ${n === maxPlayers ? "text-[#4af] font-bold" : ""}`}
                  onClick={() => setMaxPlayers(n)}
                >{n}</span>
              ))}
            </div>
            <p className="text-white/25 text-xs text-center">
              {maxPlayers / 2}v{maxPlayers / 2} formatında oynayabilirsiniz
            </p>
          </div>

          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Butonlar */}
        <div className="flex flex-col gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1a6aff, #44aaff)" }}
          >
            {loading ? "Oluşturuluyor…" : "✚ Odayı Oluştur"}
          </motion.button>

          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-white/10 bg-white/3 hover:bg-white/7 text-white/50 hover:text-white/80 font-semibold text-sm transition-all"
          >
            <ArrowLeft size={14} /> Geri Dön
          </button>
        </div>
      </motion.div>
    </div>
  );
}

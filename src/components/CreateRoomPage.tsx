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

const SIZES = [2, 4, 6, 8, 10];
const FORMAT: Record<number, string> = {
  2: "1v1", 4: "2v2", 6: "3v3", 8: "4v4", 10: "5v5",
};

export default function CreateRoomPage({ username, displayName, onRoomCreated, onBack }: Props) {
  const [name,       setName]       = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

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

  const perTeam = maxPlayers / 2;

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
            Özel Oda <span className="text-[#a78bfa]">Oluştur</span>
          </h1>
          <p className="text-white/35 text-sm">Odanı kur, arkadaşlarını bekle</p>
          <span className="mt-1 text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/35">
            🎮 Serbest mod — RP kazanılmaz
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {/* Oda adı */}
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
                autoFocus
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/12 text-white placeholder-white/25 text-sm outline-none focus:border-[#a78bfa]/50 focus:bg-white/8 transition-all"
              />
            </div>
          </div>

          {/* Oyuncu sınırı */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-white/50 text-xs uppercase tracking-wider font-semibold">Maks Oyuncu</label>
              <div className="flex items-center gap-2">
                <Users size={13} className="text-[#a78bfa]" />
                <span className="text-[#a78bfa] font-black text-lg">{maxPlayers}</span>
              </div>
            </div>

            {/* Hızlı seçim butonları */}
            <div className="grid grid-cols-5 gap-1.5">
              {SIZES.map(n => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className="py-2 rounded-xl text-sm font-black transition-all"
                  style={
                    n === maxPlayers
                      ? { background: "linear-gradient(135deg,#6d28d9,#a78bfa)", color: "#fff" }
                      : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }
                  }
                >
                  {FORMAT[n]}
                </button>
              ))}
            </div>

            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.18)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🔴</span>
                <span className="text-white/60 text-sm font-semibold">Kırmızı Takım</span>
              </div>
              <span className="text-[#a78bfa] font-black text-sm">maks {perTeam} oyuncu</span>
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm font-semibold">Mavi Takım</span>
                <span className="text-base">🔵</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-[#f87171]/10 border border-[#f87171]/20 text-[#f87171] text-sm text-center">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #6d28d9, #a78bfa)" }}
          >
            {loading ? "Oluşturuluyor…" : `✚ ${FORMAT[maxPlayers]} Odası Oluştur`}
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

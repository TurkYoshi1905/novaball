import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Wifi, Clock } from "lucide-react";
import type { GameMode, MatchSession } from "../types/game";
import { MODE_TOTAL, MATCHMAKING_TIMEOUT_MS } from "../types/game";
import {
  joinQueue, leaveQueue, getQueueEntries, QueueEntry,
  subscribeToQueue, createMatch, markQueueMatched, getMatch, getMyQueueEntry,
} from "../lib/matchmaking";

interface Props {
  mode: GameMode;
  username: string;
  displayName: string;
  onMatchFound: (match: MatchSession) => void;
  onCancel: () => void;
}

const DOTS = [".", "..", "..."];

function fmtSecs(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function MatchmakingPage({ mode, username, displayName, onMatchFound, onCancel }: Props) {
  const [queueCount, setQueueCount] = useState(0);
  const [matchFound, setMatchFound] = useState(false);
  const [dotIdx, setDotIdx]         = useState(0);
  const [error, setError]           = useState("");
  const [timeLeft, setTimeLeft]     = useState(MATCHMAKING_TIMEOUT_MS);
  const [timedOut, setTimedOut]     = useState(false);

  const needed       = MODE_TOTAL(mode);
  const channelRef   = useRef<ReturnType<typeof subscribeToQueue> | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchingRef  = useRef(false);
  const foundRef     = useRef(false);
  const startTimeRef = useRef(Date.now());

  const tryCreateMatch = useCallback(async (entries: QueueEntry[]) => {
    if (matchingRef.current || foundRef.current) return;
    if (entries.length < needed) return;
    if (entries[0].username !== username) return; // only first-joiner creates
    matchingRef.current = true;

    const teamSize     = Math.ceil(needed / 2);
    const selected     = entries.slice(0, needed);
    const redTeam      = selected.slice(0, teamSize).map(e => ({ username: e.username, displayName: e.display_name }));
    const blueTeam     = selected.slice(teamSize, needed).map(e => ({ username: e.username, displayName: e.display_name }));

    const { match, error: err } = await createMatch(mode, username, redTeam, blueTeam, true);
    if (err || !match) { matchingRef.current = false; setError("Eşleşme oluşturulamadı"); return; }

    await markQueueMatched(selected.map(e => e.username), match.id);

    // Misafirlere anında broadcast ile haber ver — postgres_changes gecikmesine gerek yok
    channelRef.current?.send({
      type: "broadcast",
      event: "match_ready",
      payload: { match },
    });

    foundRef.current = true;
    setMatchFound(true);
    setTimeout(() => onMatchFound(match), 1200);
  }, [mode, needed, username, onMatchFound]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { error: err } = await joinQueue(username, displayName, mode);
      if (err) { setError(err); return; }
      startTimeRef.current = Date.now();

      // Maç bulundu mu diye kendi entry'mizi kontrol eden yardımcı
      const checkMyEntry = async () => {
        if (!alive || foundRef.current) return;
        const mine = await getMyQueueEntry(username);
        if (mine?.match_id && !foundRef.current) {
          const m = await getMatch(mine.match_id);
          if (m && alive) {
            foundRef.current = true;
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            setMatchFound(true);
            setTimeout(() => onMatchFound(m), 1200);
          }
        }
      };

      const initial = await getQueueEntries(mode);
      if (alive) setQueueCount(Math.min(initial.length, needed));
      // return YOK — her durumda subscription + polling kurulsun
      if (initial.length >= needed) tryCreateMatch(initial);

      channelRef.current = subscribeToQueue(mode, async (updated) => {
        if (!alive || foundRef.current) return;
        setQueueCount(Math.min(updated.length, needed));
        if (updated.length >= needed) tryCreateMatch(updated);
        // Her zaman kendi entry'mizi kontrol et (postgres_changes gecikmesine karşı)
        await checkMyEntry();
      }, (match) => {
        // Host'un match_ready broadcast'i — misafir anında maça yönlendirilir
        if (!alive || foundRef.current) return;
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        foundRef.current = true;
        setMatchFound(true);
        setTimeout(() => onMatchFound(match), 1200);
      });

      // Güvenilir polling yedek: postgres_changes kaçırılırsa polling yakalar (her 1.5s)
      pollRef.current = setInterval(checkMyEntry, 1500);
      // İlk yükleme: mevcut entry'yi hemen kontrol et
      await checkMyEntry();
    })();

    const dotTimer = setInterval(() => setDotIdx(i => (i + 1) % 3), 600);

    // ─── 90 saniyelik sayaç ──────────────────────────────────────────────────
    const countdownTimer = setInterval(() => {
      if (!alive || foundRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = MATCHMAKING_TIMEOUT_MS - elapsed;
      setTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        setTimedOut(true);
      }
    }, 250);

    return () => {
      alive = false;
      clearInterval(dotTimer);
      clearInterval(countdownTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      channelRef.current?.unsubscribe();
      if (!foundRef.current) leaveQueue(username).catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Zaman dolunca otomatik iptal
  useEffect(() => {
    if (!timedOut || foundRef.current) return;
    foundRef.current = true; // cleanup'ı tetiklemeden çık
    channelRef.current?.unsubscribe();
    leaveQueue(username).catch(() => {}).finally(() => onCancel());
  }, [timedOut, username, onCancel]);

  const handleCancel = async () => {
    foundRef.current = true;
    channelRef.current?.unsubscribe();
    await leaveQueue(username);
    onCancel();
  };

  const urgentTime = timeLeft < 20_000;

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden px-5">
      <div className="pitch-glow" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8 py-8">
        <AnimatePresence mode="wait">
          {!matchFound ? (
            <motion.div key="searching" className="flex flex-col items-center gap-8 w-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }}>

              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 rounded-full border-4 border-white/10 border-t-[#4af]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wifi size={28} className="text-[#4af]" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <h2 className="text-white font-black text-2xl tracking-tight">
                  {timedOut ? "Süre Doldu" : `Oyuncu Aranıyor${DOTS[dotIdx]}`}
                </h2>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-sm font-semibold px-4 py-1.5 rounded-full border"
                    style={{ color: "#4af", borderColor: "#44aaff40", background: "#44aaff10" }}>
                    Mod: <strong>{mode}</strong>
                  </div>
                  <p className="text-white/40 text-sm mt-1">
                    Oyuncular Bekleniyor…{" "}
                    <span className="text-white/70 font-bold">({queueCount}/{needed})</span>
                  </p>
                </div>

                {/* İlerleme çubuğu */}
                <div className="w-full max-w-xs">
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#4af]"
                      animate={{ width: `${(queueCount / needed) * 100}%` }}
                      transition={{ type: "spring", stiffness: 100 }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    {Array.from({ length: needed }).map((_, i) => (
                      <span key={i} className={`text-xs ${i < queueCount ? "text-[#4af]" : "text-white/20"}`}>●</span>
                    ))}
                  </div>
                </div>

                {/* 90 saniyelik sayaç */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                  urgentTime
                    ? "border-[#f87171]/40 bg-[#f87171]/10 text-[#f87171]"
                    : "border-white/12 bg-white/4 text-white/45"
                }`}>
                  <Clock size={12} />
                  <span className="text-xs font-bold tabular-nums">{fmtSecs(timeLeft)}</span>
                  <span className="text-xs opacity-60">kaldı</span>
                </div>
              </div>

              {error && <p className="text-[#f87171] text-sm text-center">{error}</p>}

              {timedOut && (
                <p className="text-[#facc15]/80 text-sm text-center">
                  Eşleşme bulunamadı. Ana menüye yönlendiriliyorsunuz…
                </p>
              )}

              {!timedOut && (
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-[#f87171]/30 bg-[#f87171]/8 text-[#f87171] font-bold text-sm hover:bg-[#f87171]/18 transition-all"
                >
                  <ArrowLeft size={15} /> İptal Et
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div key="found" className="flex flex-col items-center gap-6"
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}>
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.6, repeat: 2 }} className="text-6xl">⚽</motion.div>
              <div className="text-center">
                <h2 className="text-[#4ade80] font-black text-3xl">Oyuncu Bulundu!</h2>
                <p className="text-white/50 text-sm mt-1">({needed}/{needed}) Maç başlıyor…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Wifi, Clock, Users, Zap, CheckCircle2, Radio } from "lucide-react";
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
    if (entries[0].username !== username) return;
    matchingRef.current = true;

    const teamSize = Math.ceil(needed / 2);
    const selected = entries.slice(0, needed);
    const redTeam  = selected.slice(0, teamSize).map(e => ({ username: e.username, displayName: e.display_name }));
    const blueTeam = selected.slice(teamSize, needed).map(e => ({ username: e.username, displayName: e.display_name }));

    const { match, error: err } = await createMatch(mode, username, redTeam, blueTeam, true);
    if (err || !match) { matchingRef.current = false; setError("Eşleşme oluşturulamadı."); return; }

    await markQueueMatched(selected.map(e => e.username), match.id);
    channelRef.current?.send({ type: "broadcast", event: "match_ready", payload: { match } });

    foundRef.current = true;
    setMatchFound(true);
    setTimeout(() => onMatchFound(match), 1400);
  }, [mode, needed, username, onMatchFound]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { error: err } = await joinQueue(username, displayName, mode);
      if (err) { setError(err); return; }
      startTimeRef.current = Date.now();

      const checkMyEntry = async () => {
        if (!alive || foundRef.current) return;
        const mine = await getMyQueueEntry(username);
        if (mine?.match_id && !foundRef.current) {
          const m = await getMatch(mine.match_id);
          if (m && alive) {
            foundRef.current = true;
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            setMatchFound(true);
            setTimeout(() => onMatchFound(m), 1400);
          }
        }
      };

      const initial = await getQueueEntries(mode);
      if (alive) setQueueCount(Math.min(initial.length, needed));
      if (initial.length >= needed) tryCreateMatch(initial);

      channelRef.current = subscribeToQueue(mode, async (updated) => {
        if (!alive || foundRef.current) return;
        setQueueCount(Math.min(updated.length, needed));
        if (updated.length >= needed) tryCreateMatch(updated);
        await checkMyEntry();
      }, (match) => {
        if (!alive || foundRef.current) return;
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        foundRef.current = true;
        setMatchFound(true);
        setTimeout(() => onMatchFound(match), 1400);
      });

      pollRef.current = setInterval(checkMyEntry, 1500);
      await checkMyEntry();
    })();

    const dotTimer = setInterval(() => setDotIdx(i => (i + 1) % 3), 600);

    const countdownTimer = setInterval(() => {
      if (!alive || foundRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = MATCHMAKING_TIMEOUT_MS - elapsed;
      setTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) { clearInterval(countdownTimer); setTimedOut(true); }
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

  useEffect(() => {
    if (!timedOut || foundRef.current) return;
    foundRef.current = true;
    channelRef.current?.unsubscribe();
    leaveQueue(username).catch(() => {}).finally(() => onCancel());
  }, [timedOut, username, onCancel]);

  const handleCancel = async () => {
    foundRef.current = true;
    channelRef.current?.unsubscribe();
    await leaveQueue(username);
    onCancel();
  };

  const urgentTime  = timeLeft < 20_000;
  const timePercent = timeLeft / MATCHMAKING_TIMEOUT_MS;
  const fillPercent = needed > 0 ? queueCount / needed : 0;

  // Circumference for the SVG ring timer
  const RADIUS   = 54;
  const CIRC     = 2 * Math.PI * RADIUS;
  const dashOff  = CIRC * (1 - timePercent);

  return (
    <div className="novaball-screen flex flex-col min-h-[100dvh] relative overflow-hidden"
      style={{ background: "linear-gradient(160deg,#040c1a 0%,#070d16 55%,#060b14 100%)" }}>

      {/* ── Background ──────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(ellipse,rgba(26,92,255,0.09) 0%,transparent 70%)" }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full border"
          style={{ borderColor: "rgba(255,255,255,0.025)" }} />
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
          style={{ background: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.022) 30%,rgba(255,255,255,0.022) 70%,transparent)" }} />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center gap-3 px-5 sm:px-8 pt-5 pb-3 flex-shrink-0">
        <button onClick={handleCancel}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/35 hover:text-white/65 hover:bg-white/8 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-white/20 text-sm font-black tracking-widest uppercase">Eşleştirme</span>
          <span className="text-white/12">·</span>
          <span className="text-[#4af]/60 text-sm font-bold">{mode}</span>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-8 gap-0">
        <AnimatePresence mode="wait">

          {/* ── SEARCHING STATE ─────────────────────────────── */}
          {!matchFound ? (
            <motion.div key="searching"
              className="flex flex-col items-center gap-8 w-full max-w-sm"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}>

              {/* ── Radar / Ring Timer ──────────────────────── */}
              <div className="relative flex items-center justify-center">
                {/* Outer pulse rings */}
                {!timedOut && (
                  <>
                    <motion.div className="absolute rounded-full border"
                      style={{ width: 148, height: 148, borderColor: "rgba(68,170,255,0.12)" }}
                      animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }} />
                    <motion.div className="absolute rounded-full border"
                      style={{ width: 148, height: 148, borderColor: "rgba(68,170,255,0.08)" }}
                      animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.6 }} />
                  </>
                )}

                {/* SVG countdown ring */}
                <svg width="148" height="148" className="absolute" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="74" cy="74" r={RADIUS} fill="none"
                    stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                  <motion.circle cx="74" cy="74" r={RADIUS} fill="none"
                    stroke={urgentTime ? "#f87171" : "#4aaeff"}
                    strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={CIRC}
                    animate={{ strokeDashoffset: dashOff }}
                    transition={{ duration: 0.3 }}
                    style={{ filter: `drop-shadow(0 0 6px ${urgentTime ? "#f87171" : "#4aaeff"})` }} />
                </svg>

                {/* Inner icon circle */}
                <div className="relative w-[148px] h-[148px] rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg,rgba(68,170,255,0.12),rgba(68,170,255,0.04))",
                    border: "1px solid rgba(68,170,255,0.2)",
                  }}>
                  {timedOut ? (
                    <Clock size={36} className="text-[#facc15]" />
                  ) : (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
                      <Radio size={36} className="text-[#4af]" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* ── Title & Mode ──────────────────────────────── */}
              <div className="flex flex-col items-center gap-3 text-center">
                <h1 className="text-white font-black text-2xl sm:text-3xl tracking-tight leading-tight">
                  {timedOut ? "Süre Doldu" : `Oyuncu Aranıyor${DOTS[dotIdx]}`}
                </h1>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl"
                    style={{ background: "rgba(68,170,255,0.1)", border: "1px solid rgba(68,170,255,0.25)" }}>
                    <Zap size={13} className="text-[#4af]" />
                    <span className="text-[#4af] font-bold text-sm">RANKED</span>
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <Users size={13} className="text-white/50" />
                    <span className="text-white/65 font-bold text-sm">{mode}</span>
                  </div>
                </div>
              </div>

              {/* ── Player Slots ──────────────────────────────── */}
              <div className="w-full rounded-2xl px-5 py-4 flex flex-col gap-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/45 text-xs font-semibold uppercase tracking-wider">Oyuncular</span>
                  <span className="font-black text-sm" style={{ color: queueCount >= needed ? "#4ade80" : "#4aaeff" }}>
                    {queueCount} / {needed}
                  </span>
                </div>

                {/* Slot dots */}
                <div className="flex items-center gap-2 flex-wrap">
                  {Array.from({ length: needed }).map((_, i) => (
                    <motion.div key={i}
                      className="flex-1 min-w-[28px] h-8 rounded-lg flex items-center justify-center"
                      animate={i < queueCount ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.3 }}
                      style={i < queueCount ? {
                        background: "rgba(68,170,255,0.18)",
                        border: "1.5px solid rgba(68,170,255,0.5)",
                        boxShadow: "0 0 10px rgba(68,170,255,0.2)",
                      } : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1.5px dashed rgba(255,255,255,0.12)",
                      }}>
                      {i < queueCount ? (
                        <Wifi size={13} className="text-[#4af]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/15 block" />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Fill progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <motion.div className="h-full rounded-full"
                    animate={{ width: `${fillPercent * 100}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    style={{
                      background: fillPercent >= 1
                        ? "linear-gradient(90deg,#4ade80,#22c55e)"
                        : "linear-gradient(90deg,#4aaeff80,#4aaeff)",
                      boxShadow: fillPercent >= 1 ? "0 0 8px #4ade8060" : "0 0 8px #4aaeff60",
                    }} />
                </div>
              </div>

              {/* ── Timer ────────────────────────────────────── */}
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all ${
                urgentTime
                  ? "text-[#f87171]"
                  : "text-white/50"
              }`}
                style={urgentTime ? {
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  boxShadow: "0 0 20px rgba(248,113,113,0.1)",
                } : {
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                <Clock size={15} className={urgentTime ? "text-[#f87171]" : "text-white/35"} />
                <span className="font-black text-base tabular-nums">{fmtSecs(timeLeft)}</span>
                <span className="text-sm opacity-60 font-medium">kaldı</span>
              </div>

              {/* ── Error / Timeout Message ────────────────── */}
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-center text-[#f87171] font-semibold"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  {error}
                </div>
              )}

              {timedOut && (
                <div className="px-4 py-3 rounded-xl text-sm text-center text-[#facc15]/80 font-semibold"
                  style={{ background: "rgba(250,204,21,0.07)", border: "1px solid rgba(250,204,21,0.18)" }}>
                  Eşleşme bulunamadı. Ana menüye yönlendiriliyorsunuz…
                </div>
              )}

              {/* ── Cancel Button ─────────────────────────── */}
              {!timedOut && (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleCancel}
                  className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-sm transition-all"
                  style={{
                    color: "#f87171",
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.25)",
                  }}>
                  <ArrowLeft size={16} />
                  <span>İptal Et</span>
                </motion.button>
              )}
            </motion.div>

          ) : (
            /* ── MATCH FOUND STATE ──────────────────────────── */
            <motion.div key="found"
              className="flex flex-col items-center gap-6"
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}>

              {/* Icon */}
              <motion.div
                animate={{ scale: [1, 1.18, 1] }}
                transition={{ duration: 0.55, repeat: 2 }}
                className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,rgba(74,222,128,0.25),rgba(34,197,94,0.12))",
                  border: "2px solid rgba(74,222,128,0.5)",
                  boxShadow: "0 0 50px rgba(74,222,128,0.3)",
                }}>
                <CheckCircle2 size={48} className="text-[#4ade80]" />
              </motion.div>

              {/* Text */}
              <div className="flex flex-col items-center gap-2 text-center">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[#4ade80] font-black text-4xl tracking-tight">
                  Oyuncu Bulundu!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="text-white/45 text-base font-semibold">
                  ({needed}/{needed}) — Maç başlıyor…
                </motion.p>
              </div>

              {/* Animated dots */}
              <div className="flex items-center gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    className="w-2 h-2 rounded-full bg-[#4ade80]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

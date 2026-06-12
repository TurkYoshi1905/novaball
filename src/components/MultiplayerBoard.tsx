import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, LogOut } from "lucide-react";
import type { MatchSession, Score, ChatMessage, Team, MPResult } from "../types/game";
import { CANVAS_WIDTH, CANVAS_HEIGHT, RANKED_DURATION_MS } from "../types/game";
import { createGameChannel, broadcastChat, onChat } from "../lib/realtime";
import { useMultiplayerPhysics } from "../hooks/useMultiplayerPhysics";
import MobileControls from "./MobileControls";
import { createMobileInput } from "../types/game";
import { loadRP, saveRP, getRankForRP, calcRPForWin } from "../utils/rankSystem";
import { getRankForRP as getrank } from "../utils/rankSystem";

interface Props {
  match: MatchSession;
  localUsername: string;
  localDisplayName: string;
  isHost: boolean;
  ranked: boolean;
  onMatchEnd: (result: MPResult) => void;
  onLeave: () => void;
}

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function calcMPRP(
  winnerTeam: Team | "draw",
  redGoals: number,
  blueGoals: number,
  myTeam: Team,
  allPlayers: Array<{ username: string; displayName: string; team: Team }>,
  goalCounts: Record<string, number>
): Array<{ username: string; displayName: string; goals: number; rpGained: number }> {
  if (winnerTeam === "draw" || winnerTeam !== myTeam) {
    return allPlayers.map(p => ({ username: p.username, displayName: p.displayName, goals: goalCounts[p.username] ?? 0, rpGained: 0 }));
  }
  const totalGoals = winnerTeam === "red" ? redGoals : blueGoals;
  const totalRP    = calcRPForWin(totalGoals);
  const winners    = allPlayers.filter(p => p.team === winnerTeam);
  const winnerGoals = winners.map(p => goalCounts[p.username] ?? 0);
  const sumGoals   = winnerGoals.reduce((a, b) => a + b, 0);
  const distRP     = winners.map((p, i) => {
    const g = winnerGoals[i];
    const share = sumGoals > 0 ? g / sumGoals : 1 / winners.length;
    return { username: p.username, displayName: p.displayName, goals: g, rpGained: Math.round(totalRP * share) };
  });
  const losers = allPlayers.filter(p => p.team !== winnerTeam);
  return [
    ...distRP,
    ...losers.map(p => ({ username: p.username, displayName: p.displayName, goals: goalCounts[p.username] ?? 0, rpGained: 0 })),
  ];
}

export default function MultiplayerBoard({ match, localUsername, localDisplayName, isHost, ranked, onMatchEnd, onLeave }: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const mobileInputRef = useRef(createMobileInput());
  const [chatOpen, setChatOpen]   = useState(false);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const chatEndRef    = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<ReturnType<typeof createGameChannel> | null>(null);
  const endHandledRef  = useRef(false);

  const myTeam: Team = match.redTeam.some(m => m.username === localUsername) ? "red" : "blue";
  const allPlayers   = [
    ...match.redTeam.map(m => ({ ...m, team: "red" as Team })),
    ...match.blueTeam.map(m => ({ ...m, team: "blue" as Team })),
  ];

  // Setup chat channel
  useState(() => {
    const ch = createGameChannel(`${match.channelId}-chat`);
    chatChannelRef.current = ch;
    onChat(ch, msg => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    ch.subscribe();
  });

  const handleGameEnd = useCallback((score: Score, goalCounts: Record<string, number>) => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    chatChannelRef.current?.unsubscribe();

    const winnerTeam: Team | "draw" =
      score.red > score.blue ? "red" :
      score.blue > score.red ? "blue" : "draw";
    const didWin = winnerTeam === myTeam;
    const prevRP = loadRP();
    const playerStats = calcMPRP(winnerTeam, score.red, score.blue, myTeam, allPlayers, goalCounts);
    const me      = playerStats.find(p => p.username === localUsername);
    const rpGained = ranked && didWin ? (me?.rpGained ?? 0) : 0;
    const newRP   = prevRP + rpGained;
    if (rpGained > 0) saveRP(newRP);

    const result: MPResult = {
      mode: match.mode,
      isRanked: ranked,
      winnerTeam,
      redGoals: score.red, blueGoals: score.blue,
      myTeam,
      rpGained,
      prevRP, newRP,
      rankChanged: getrank(newRP).fullName !== getrank(prevRP).fullName,
      prevRankName: getrank(prevRP).fullName,
      newRankName:  getrank(newRP).fullName,
      playerStats,
    };
    onMatchEnd(result);
  }, [myTeam, ranked, localUsername, onMatchEnd, allPlayers, match.mode]);

  const { score, gameTimeMs, phase } = useMultiplayerPhysics({
    canvasRef, match, localUsername, isHost, ranked,
    mobileInputRef, onGameEnd: handleGameEnd,
  });

  const sendMessage = () => {
    if (!inputText.trim() || !chatChannelRef.current) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(), username: localUsername, displayName: localDisplayName,
      text: inputText.trim(), type: "user", ts: Date.now(),
    };
    broadcastChat(chatChannelRef.current, msg);
    setMessages(prev => [...prev, msg]);
    setInputText("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const timeLeft   = ranked ? gameTimeMs : null;
  const teamColor  = myTeam === "red" ? "#e63535" : "#4488ff";

  return (
    <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16] relative overflow-hidden landscape-only">
      {/* Portrait warning */}
      <div className="portrait-warning fixed inset-0 z-50 flex-col items-center justify-center bg-[#070d16] hidden">
        <span className="text-5xl">📱</span>
        <p className="text-white font-bold text-lg mt-4 text-center px-8">Yatay moda geç</p>
      </div>

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onLeave}
          className="flex items-center gap-1 text-white/30 hover:text-white/70 transition-colors text-xs font-semibold">
          <LogOut size={12} /> Ayrıl
        </button>

        {/* Skor */}
        <div className="flex items-center gap-3">
          <span className="text-[#e63535] font-black text-2xl tabular-nums">{score.red}</span>
          <div className="flex flex-col items-center">
            <span className="text-white/40 text-lg font-black">—</span>
            {timeLeft !== null && (
              <span className={`text-xs font-bold tabular-nums ${timeLeft < 30000 ? "text-[#f87171]" : "text-white/50"}`}>
                {fmtTime(timeLeft)}
              </span>
            )}
          </div>
          <span className="text-[#4488ff] font-black text-2xl tabular-nums">{score.blue}</span>
        </div>

        {/* Mod + sohbet */}
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-semibold">{match.mode}</span>
          <button
            onClick={() => setChatOpen(o => !o)}
            className={`p-1.5 rounded-lg transition-all ${chatOpen ? "bg-[#4af]/20 text-[#4af]" : "text-white/30 hover:text-white/60"}`}
          >
            <MessageCircle size={14} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block max-w-full"
          style={{ maxHeight: "calc(100dvh - 80px)", aspectRatio: "16/9" }}
        />

        {/* Goal flash */}
        <AnimatePresence>
          {phase === "goal_pause" && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-white font-black text-6xl"
                style={{ textShadow: "0 0 40px #fff" }}
              >GOL! ⚽</motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sohbet paneli */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-30 w-64 flex flex-col bg-[#0a1525]/95 border-l border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="text-white font-bold text-sm">Sohbet</span>
              <button onClick={() => setChatOpen(false)} className="text-white/30 hover:text-white/70 transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
              {messages.map(msg => (
                <div key={msg.id} className={`text-xs ${msg.type === "system" ? "text-[#facc15]/60 italic text-center" : ""}`}>
                  {msg.type === "user" && (
                    <span className={`font-bold mr-1 ${msg.username === localUsername ? "text-[#4af]" : "text-white/55"}`}>
                      {msg.displayName}:
                    </span>
                  )}
                  <span className={msg.type === "user" ? "text-white/70" : ""}>{msg.text}</span>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-white/20 text-xs text-center mt-4">Henüz mesaj yok.</p>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2 p-3 border-t border-white/8">
              <input
                type="text" value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Mesaj yaz…" maxLength={100}
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/25 outline-none focus:border-[#4af]/40 transition-all"
              />
              <button onClick={sendMessage}
                className="px-2.5 py-1.5 rounded-lg bg-[#4af]/15 border border-[#4af]/25 text-[#4af] hover:bg-[#4af]/25 transition-all">
                <Send size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobil kontroller */}
      <MobileControls inputRef={mobileInputRef} onMenu={onLeave} />

      {/* Takım rengi göstergesi (sol alt) */}
      <div className="absolute bottom-16 left-4 z-20 flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full" style={{ background: teamColor }} />
        <span className="text-xs font-semibold" style={{ color: `${teamColor}b0` }}>
          {myTeam === "red" ? "Kırmızı" : "Mavi"} Takım
        </span>
      </div>
    </div>
  );
}

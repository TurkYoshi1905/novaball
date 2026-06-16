import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import type { MatchSession, Score, ChatMessage, Team, MPResult } from "../types/game";
import { CANVAS_WIDTH, CANVAS_HEIGHT, RANKED_DURATION_MS } from "../types/game";
import { useMultiplayerPhysics } from "../hooks/useMultiplayerPhysics";
import MobileControls from "./MobileControls";
import { createMobileInput } from "../types/game";
import { loadRP, saveRP, getRankForRP, calcRPForWin, calcRPLoss } from "../utils/rankSystem";

interface Props {
  match:             MatchSession;
  localUsername:     string;
  localDisplayName:  string;
  isHost:            boolean;
  ranked:            boolean;
  isCustomRoom?:     boolean;
  onMatchEnd:        (result: MPResult) => void;
  onLeave:           () => void;
}

const isTouchDevice = typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function fmtCountup(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function calcMPRP(
  winnerTeam: Team | "draw",
  myTeam: Team,
  allPlayers: Array<{ username: string; displayName: string; team: Team }>,
  goalCounts: Record<string, number>,
  score: Score
): Array<{ username: string; displayName: string; goals: number; rpGained: number; rpLost: number; team: Team }> {
  const loserTeam = winnerTeam === "red" ? "blue" : winnerTeam === "blue" ? "red" : null;
  // Kaybeden takım için ortak RP kaybı (10–20 arası, herkese aynı değer)
  const sharedLoss = (winnerTeam !== "draw" && loserTeam) ? calcRPLoss() : 0;

  if (winnerTeam === "draw") {
    return allPlayers.map(p => ({
      username: p.username, displayName: p.displayName,
      goals: goalCounts[p.username] ?? 0, rpGained: 0, rpLost: 0, team: p.team,
    }));
  }

  if (winnerTeam !== myTeam) {
    // Lokal oyuncu kaybetti — sadece kaybeden takım rpLost alır
    return allPlayers.map(p => ({
      username: p.username, displayName: p.displayName,
      goals: goalCounts[p.username] ?? 0,
      rpGained: 0,
      rpLost: p.team === loserTeam ? sharedLoss : 0,
      team: p.team,
    }));
  }

  const totalGoals  = winnerTeam === "red" ? score.red : score.blue;
  const totalRP     = calcRPForWin(totalGoals);
  const winners     = allPlayers.filter(p => p.team === winnerTeam);
  const losers      = allPlayers.filter(p => p.team !== winnerTeam);
  const winnerGoals = winners.map(p => goalCounts[p.username] ?? 0);
  const sumGoals    = winnerGoals.reduce((a, b) => a + b, 0);
  const distRP = winners.map((p, i) => {
    const g = winnerGoals[i];
    const share = sumGoals > 0 ? g / sumGoals : 1 / winners.length;
    return { username: p.username, displayName: p.displayName, goals: g, rpGained: Math.round(totalRP * share), rpLost: 0, team: p.team };
  });
  return [
    ...distRP,
    ...losers.map(p => ({ username: p.username, displayName: p.displayName, goals: goalCounts[p.username] ?? 0, rpGained: 0, rpLost: sharedLoss, team: p.team })),
  ];
}

export default function MultiplayerBoard({
  match, localUsername, localDisplayName, isHost, ranked, isCustomRoom, onMatchEnd, onLeave,
}: Props) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const mobileInputRef = useRef(createMobileInput());
  const [chatOpen,   setChatOpen]   = useState(false);
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [inputText,  setInputText]  = useState("");
  const [goalFlash,  setGoalFlash]  = useState<Team | null>(null);
  const chatEndRef      = useRef<HTMLDivElement>(null);
  const endHandledRef   = useRef(false);

  const myTeam: Team   = match.redTeam.some(m => m.username === localUsername) ? "red" : "blue";
  const oppTeam: Team  = myTeam === "red" ? "blue" : "red";
  const opponents      = oppTeam === "red" ? match.redTeam : match.blueTeam;
  const oppName        = opponents[0]?.displayName || opponents[0]?.username || "Rakip";
  const allPlayers     = [
    ...match.redTeam.map(m => ({ ...m, team: "red" as Team })),
    ...match.blueTeam.map(m => ({ ...m, team: "blue" as Team })),
  ];

  // Sohbet mesajı geldiğinde
  const handleChatReceived = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [chatEndRef]);

  // ─── Maç sonu ─────────────────────────────────────────────────────────────
  const finishGame = useCallback((
    score: Score,
    goalCounts: Record<string, number>,
    forfeit = false,
    forfeitLeaverTeam?: Team
  ) => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;

    let winnerTeam: Team | "draw";
    if (forfeit && forfeitLeaverTeam) {
      winnerTeam = forfeitLeaverTeam === "red" ? "blue" : "red";
    } else {
      winnerTeam = score.red > score.blue ? "red" : score.blue > score.red ? "blue" : "draw";
    }

    const didWin  = winnerTeam === myTeam;
    const isDraw  = winnerTeam === "draw";
    const prevRP  = loadRP();
    const stats   = calcMPRP(winnerTeam, myTeam, allPlayers, goalCounts, score);
    const me      = stats.find(p => p.username === localUsername);

    let rpGained = 0;
    let rpLost   = 0;
    if (ranked && !isDraw) {
      if (didWin) {
        rpGained = forfeit ? 10 : (me?.rpGained ?? 0);
      } else {
        rpLost = forfeit ? 15 : (me?.rpLost ?? calcRPLoss());
      }
    }
    const newRP = Math.max(0, prevRP + rpGained - rpLost);
    if (rpGained > 0 || rpLost > 0) saveRP(newRP);

    onMatchEnd({
      mode: match.mode, isRanked: ranked,
      winnerTeam, redGoals: score.red, blueGoals: score.blue,
      myTeam, rpGained, rpLost, prevRP, newRP,
      rankChanged:  getRankForRP(newRP).fullName !== getRankForRP(prevRP).fullName,
      prevRankName: getRankForRP(prevRP).fullName,
      newRankName:  getRankForRP(newRP).fullName,
      playerStats: stats, forfeit,
      localUsername,
      opponentUsername: opponents[0]?.username ?? "",
    });
  }, [myTeam, ranked, localUsername, onMatchEnd, allPlayers, match.mode]); // eslint-disable-line

  const handleOpponentForfeit = useCallback((leaverTeam: Team, currentScore: Score) => {
    finishGame(currentScore, {}, true, leaverTeam);
  }, [finishGame]);

  const { score, gameTimeMs, phase, lastGoalTeam, scoreRef, sendForfeit, sendChat } = useMultiplayerPhysics({
    canvasRef, match, localUsername, localDisplayName, isHost, ranked,
    mobileInputRef, onGameEnd: finishGame, onOpponentForfeit: handleOpponentForfeit,
    onChatReceived: handleChatReceived,
  });

  // Gol flash — phase "goal_pause" olunca tetikle, "playing"'e dönnce temizle
  useEffect(() => {
    if (phase === "goal_pause" && lastGoalTeam) {
      setGoalFlash(lastGoalTeam);
    } else if (phase === "playing") {
      setGoalFlash(null);
    }
  }, [phase, lastGoalTeam]);

  // ─── Sohbet ───────────────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!inputText.trim()) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(), username: localUsername, displayName: localDisplayName,
      text: inputText.trim(), type: "user", ts: Date.now(),
    };
    sendChat(msg);
    setMessages(prev => [...prev, msg]);
    setInputText("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // ─── Ayrıl: forfeit yayınla + sonuç ekranı göster (her iki oyuncuya da) ───
  const handleLeave = useCallback(() => {
    // Özel oda maçları: forfeit gönderme — oda açık kalır, diğer oyuncular devam eder
    if (isCustomRoom) {
      onLeave();
      return;
    }
    // Maç zaten bitti ya da işlendi — sadece menüye dön
    if (endHandledRef.current) {
      onLeave();
      return;
    }
    // Rakibe forfeit bildir — mevcut WS bağlantısı üzerinden (hemen gönderilir, async değil)
    sendForfeit(myTeam);
    // Kendi sonuç ekranımızı göster (kaybeden olarak)
    finishGame(scoreRef.current, {}, true, myTeam);
  }, [sendForfeit, myTeam, finishGame, scoreRef, onLeave, isCustomRoom]);

  const timeDisplay = ranked ? fmtCountdown(gameTimeMs) : fmtCountup(gameTimeMs);
  const urgent      = ranked && gameTimeMs < 15_000;

  return (
    <div className="game-board-outer">

      {/* Portrait uyarısı */}
      <div className="portrait-overlay">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <span className="text-5xl">📱</span>
          <p className="text-white font-bold text-xl">Telefonu yatay tut</p>
          <p className="text-white/40 text-sm">NovaBall yatay ekranda daha iyi oynanır.</p>
        </div>
      </div>

      {/* ── HUD ── */}
      <div className="game-hud">

        {/* Sol: lokal oyuncu */}
        <div className="hud-side">
          <div className={`hud-dot hud-dot-${myTeam}`} />
          <span className="hud-username">{localDisplayName}</span>
          {ranked && <span className="hud-badge-ranked">Rekabet</span>}
        </div>

        {/* Orta: skor + süre */}
        <div className="hud-center">
          <span className={`hud-score ${goalFlash === "red" ? "hud-score-flash-red" : "hud-score-red"}`}>
            {score.red}
          </span>
          <span className="hud-score-sep">—</span>
          <span className={`hud-score ${goalFlash === "blue" ? "hud-score-flash-blue" : "hud-score-blue"}`}>
            {score.blue}
          </span>
          <div className="hud-divider" />
          <span className={`hud-time ${urgent ? "hud-time-urgent" : ""}`}>
            {timeDisplay}
          </span>
        </div>

        {/* Sağ: rakip + kontroller */}
        <div className="hud-side hud-right">
          <div className="hud-desktop-btns">
            <button
              onClick={() => setChatOpen(o => !o)}
              className={`hud-ctrl-btn ${chatOpen ? "!bg-[#4af]/20 !text-[#4af] !border-[#4af]/30" : ""}`}
              title="Sohbet"
            >
              <MessageCircle size={13} />
            </button>
            <button onClick={handleLeave} className="hud-ctrl-btn" title="Ayrıl">✕</button>
          </div>
          <span className="hud-username hud-ai">{oppName}</span>
          <div className={`hud-dot hud-dot-${oppTeam}`} />
        </div>
      </div>

      {/* ── Canvas alanı ── */}
      <div className="game-canvas-zone">
        <div className="game-canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="game-canvas"
          />

          {/* Gol flash overlay */}
          {goalFlash && (
            <div
              className="goal-flash-overlay"
              style={{
                background: goalFlash === "red"
                  ? "radial-gradient(ellipse at center,rgba(230,53,53,.18) 0%,transparent 70%)"
                  : "radial-gradient(ellipse at center,rgba(34,102,238,.18) 0%,transparent 70%)",
              }}
            />
          )}

          {/* GOL! yazısı */}
          <AnimatePresence>
            {phase === "goal_pause" && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-white font-black text-7xl"
                  style={{ textShadow: "0 0 50px #fff, 0 0 20px rgba(255,255,255,0.5)" }}
                >
                  GOL! ⚽
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Klavye ipuçları (masaüstü) ── */}
      {!isTouchDevice && (
        <div className="keyboard-hints">
          <span><kbd className="kbd-key">W A S D</kbd> Hareket</span>
          <span><kbd className="kbd-key">SPACE/X</kbd> Şut (basılı tut = güçlü)</span>
          <span><kbd className="kbd-key">Sol ⇧</kbd> Depar</span>
        </div>
      )}

      {/* ── Mobil kontroller ── */}
      {isTouchDevice && (
        <MobileControls inputRef={mobileInputRef} onMenu={handleLeave} />
      )}

      {/* ── Sohbet paneli ── */}
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
    </div>
  );
}

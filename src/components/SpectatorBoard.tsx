import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Eye, MessageCircle, Send } from "lucide-react";
import type { CustomRoom, MPGameState, ChatMessage, Team } from "../types/game";
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  FIELD_LEFT, FIELD_RIGHT, FIELD_TOP, FIELD_BOTTOM,
  GOAL_HEIGHT, GOAL_TOP, GOAL_BOTTOM, GOAL_DEPTH, POST_RADIUS,
  PLAYER_RADIUS, BALL_RADIUS,
} from "../types/game";
import {
  createGameChannel, onGameState, onChat, broadcastChat,
  broadcastSpectator, onSpectatorEvent,
} from "../lib/realtime";
import { joinAsSpectator, leaveAsSpectator, subscribeToRoom } from "../lib/matchmaking";

interface Props {
  room: CustomRoom;
  username: string;
  displayName: string;
  onLeave: () => void;
}

interface LerpPos { x: number; y: number; }
interface Camera  { x: number; y: number; zoom: number; }

const CW = CANVAS_WIDTH;
const CH = CANVAS_HEIGHT;
const FRAME_MS = 16.667;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp  = (a: number, b: number, t: number)   => a + (b - a) * t;

function clampCam(cam: Camera): Camera {
  const hw = CW / cam.zoom / 2;
  const hh = CH / cam.zoom / 2;
  return { x: clamp(cam.x, hw, CW - hw), y: clamp(cam.y, hh, CH - hh), zoom: cam.zoom };
}

// ─── Field drawing ────────────────────────────────────────────────────────────

function drawField(ctx: CanvasRenderingContext2D) {
  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, "#0a1f0a");
  bg.addColorStop(1, "#061406");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  // Pitch lines
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;

  // Outer boundary
  ctx.beginPath();
  ctx.rect(FIELD_LEFT, FIELD_TOP, FIELD_RIGHT - FIELD_LEFT, FIELD_BOTTOM - FIELD_TOP);
  ctx.stroke();

  // Centre line
  ctx.beginPath();
  ctx.moveTo(CW / 2, FIELD_TOP);
  ctx.lineTo(CW / 2, FIELD_BOTTOM);
  ctx.stroke();

  // Centre circle
  ctx.beginPath();
  ctx.arc(CW / 2, CH / 2, 90, 0, Math.PI * 2);
  ctx.stroke();

  // Centre dot
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(CW / 2, CH / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Penalty areas
  const penW = 160, penH = 270;
  ctx.beginPath();
  ctx.rect(FIELD_LEFT, CH / 2 - penH / 2, penW, penH);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(FIELD_RIGHT - penW, CH / 2 - penH / 2, penW, penH);
  ctx.stroke();

  ctx.restore();

  // Goals (behind the lines)
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  // Left goal
  ctx.beginPath();
  ctx.rect(FIELD_LEFT - GOAL_DEPTH, GOAL_TOP, GOAL_DEPTH, GOAL_HEIGHT);
  ctx.fill(); ctx.stroke();
  // Right goal
  ctx.beginPath();
  ctx.rect(FIELD_RIGHT, GOAL_TOP, GOAL_DEPTH, GOAL_HEIGHT);
  ctx.fill(); ctx.stroke();
  ctx.restore();

  // Goal posts
  ctx.save();
  ctx.fillStyle = "#fff";
  const posts: [number, number][] = [
    [FIELD_LEFT, GOAL_TOP], [FIELD_LEFT, GOAL_BOTTOM],
    [FIELD_RIGHT, GOAL_TOP], [FIELD_RIGHT, GOAL_BOTTOM],
  ];
  for (const [px, py] of posts) {
    ctx.beginPath();
    ctx.arc(px, py, POST_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Player drawing ───────────────────────────────────────────────────────────

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  username: string,
  displayName: string,
  team: Team,
  teamIndex: number,
  hasBall: boolean,
  isFollowed: boolean,
  stamina: number,
  kickCharge: number,
) {
  const isRed  = team === "red";
  const baseClr = isRed ? "#ef4444" : "#3b82f6";
  const glowClr = isRed ? "rgba(239,68,68,0.6)" : "rgba(59,130,246,0.6)";

  ctx.save();

  // Followed highlight ring
  if (isFollowed) {
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_RADIUS + 8, 0, Math.PI * 2);
    const hlGrad = ctx.createRadialGradient(x, y, PLAYER_RADIUS + 2, x, y, PLAYER_RADIUS + 12);
    hlGrad.addColorStop(0, "rgba(255,255,255,0.35)");
    hlGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hlGrad;
    ctx.fill();
  }

  // Possession aura
  if (hasBall) {
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_RADIUS + 10, 0, Math.PI * 2);
    const aura = ctx.createRadialGradient(x, y, PLAYER_RADIUS, x, y, PLAYER_RADIUS + 12);
    aura.addColorStop(0, isRed ? "rgba(239,68,68,0.45)" : "rgba(59,130,246,0.45)");
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.fill();
  }

  // Kick charge arc
  if (kickCharge > 0.01) {
    const arcRad = PLAYER_RADIUS + 5;
    const end = -Math.PI / 2 + kickCharge * Math.PI * 2;
    const chargeClr = kickCharge < 0.4 ? "#4ade80" : kickCharge < 0.75 ? "#fbbf24" : "#f87171";
    ctx.beginPath();
    ctx.arc(x, y, arcRad, -Math.PI / 2, end);
    ctx.strokeStyle = chargeClr;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Player circle
  const grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, PLAYER_RADIUS);
  grad.addColorStop(0, isRed ? "#f87171" : "#60a5fa");
  grad.addColorStop(1, isRed ? "#b91c1c" : "#1d4ed8");
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Border glow
  ctx.strokeStyle = glowClr;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Team number
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${PLAYER_RADIUS * 0.85}px 'Inter', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 3;
  ctx.fillText(String(teamIndex), x, y);
  ctx.shadowBlur = 0;

  // Display name
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `600 10px 'Inter', sans-serif`;
  ctx.fillText(displayName.length > 8 ? displayName.slice(0, 7) + "…" : displayName, x, y + PLAYER_RADIUS + 10);

  // Stamina bar
  const barW = PLAYER_RADIUS * 2;
  const barH = 3;
  const bx = x - PLAYER_RADIUS;
  const by = y + PLAYER_RADIUS + 4;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.roundRect(bx, by, barW, barH, 2);
  ctx.fill();
  const stFill = stamina < 25 ? "#f87171" : stamina < 55 ? "#fbbf24" : "#4ade80";
  ctx.fillStyle = stFill;
  ctx.beginPath();
  ctx.roundRect(bx, by, barW * (stamina / 100), barH, 2);
  ctx.fill();

  ctx.restore();
}

// ─── Ball drawing ─────────────────────────────────────────────────────────────

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  owner: Team | null,
  vx: number, vy: number,
) {
  ctx.save();
  const speed = Math.hypot(vx, vy);

  if (speed > 4 && !owner) {
    const sGrad = ctx.createRadialGradient(x, y, 0, x, y, BALL_RADIUS + 6);
    sGrad.addColorStop(0, "rgba(255,255,255,0.15)");
    sGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS + 6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (owner) {
    const tClr = owner === "red" ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.5)";
    const oGrad = ctx.createRadialGradient(x, y, 0, x, y, BALL_RADIUS + 8);
    oGrad.addColorStop(0, tClr);
    oGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = oGrad;
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS + 8, 0, Math.PI * 2);
    ctx.fill();
  }

  const bGrad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, BALL_RADIUS);
  bGrad.addColorStop(0, "#ffffff");
  bGrad.addColorStop(0.6, "#e0e0e0");
  bGrad.addColorStop(1, "#aaaaaa");
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpectatorBoard({ room, username, displayName, onLeave }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const gsRef      = useRef<MPGameState | null>(null);
  const camRef     = useRef<Camera>({ x: CW / 2, y: CH / 2, zoom: 1.35 });
  const posRef     = useRef<Record<string, LerpPos>>({});
  const ballRef    = useRef<LerpPos>({ x: CW / 2, y: CH / 2 });
  const followRef  = useRef<string | null>(null);
  const rafRef     = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof createGameChannel> | null>(null);
  const chatFocusRef = useRef(false);

  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [chatOpen,  setChatOpen]  = useState(false);
  const [inputText, setInputText] = useState("");
  const [unread,    setUnread]    = useState(0);
  const [spectatorCount, setSpectatorCount] = useState(room.spectatorCount ?? 0);
  const [followedPlayer, setFollowedPlayer] = useState<string | null>(null);
  const [playerList, setPlayerList] = useState(() => [
    ...room.redTeam.map((m, i) => ({ ...m, team: "red" as Team, teamIndex: i + 1 })),
    ...room.blueTeam.map((m, i) => ({ ...m, team: "blue" as Team, teamIndex: i + 1 })),
  ]);
  const [score, setScore]   = useState({ red: 0, blue: 0 });
  const [timeMs, setTimeMs] = useState(0);
  const [phase, setPhase]   = useState<MPGameState["phase"]>("playing");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── WS channel setup ──
  useEffect(() => {
    const ch = createGameChannel(room.channelId);

    onGameState(ch, (gs) => {
      gsRef.current = gs;
      setScore(gs.score);
      setTimeMs(gs.gameTimeMs);
      setPhase(gs.phase);
      setPlayerList(gs.players.map((p, i) => ({
        username: p.username,
        displayName: p.displayName,
        team: p.team,
        teamIndex: p.teamIndex ?? (i + 1),
      })));
    });

    onChat(ch, (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!chatOpen) setUnread(u => u + 1);
    });

    onSpectatorEvent(ch, (ev) => {
      if (ev.action === "join")  setSpectatorCount(c => c + 1);
      if (ev.action === "leave") setSpectatorCount(c => Math.max(0, c - 1));
    });

    ch.subscribe();
    channelRef.current = ch;

    // DB spectator join
    joinAsSpectator(room.id).catch(() => {});
    broadcastSpectator(ch, { username, displayName, action: "join" });

    // Room updates (for spectator_count from DB)
    const sub = subscribeToRoom(room.id, updated => {
      if (updated) setSpectatorCount(updated.spectatorCount ?? 0);
    });

    return () => {
      leaveAsSpectator(room.id).catch(() => {});
      if (channelRef.current) {
        broadcastSpectator(channelRef.current, { username, displayName, action: "leave" });
        channelRef.current.unsubscribe();
      }
      sub.unsubscribe();
    };
  }, []); // eslint-disable-line

  // ── Canvas RAF draw loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTs = 0;

    function draw(ts: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (ts - lastTs < FRAME_MS - 2) return;
      lastTs = ts;

      const gs  = gsRef.current;
      const cam = camRef.current;

      // Determine camera target
      let tgX = CW / 2, tgY = CH / 2, tgZoom = 1.35;
      const fol = followRef.current;
      if (fol && gs) {
        const fp = gs.players.find(p => p.username === fol);
        if (fp) { tgX = fp.x; tgY = fp.y; tgZoom = 1.6; }
        else    { followRef.current = null; setFollowedPlayer(null); }
      } else if (gs) {
        tgX = gs.ball.x; tgY = gs.ball.y; tgZoom = 1.35;
      }

      // Smooth camera
      camRef.current = clampCam({
        x:    lerp(cam.x,    tgX,    0.035),
        y:    lerp(cam.y,    tgY,    0.035),
        zoom: lerp(cam.zoom, tgZoom, 0.025),
      });

      // Lerp game object positions
      if (gs) {
        const b = ballRef.current;
        b.x = lerp(b.x, gs.ball.x, 0.22);
        b.y = lerp(b.y, gs.ball.y, 0.22);
        for (const p of gs.players) {
          const prev = posRef.current[p.username] ?? { x: p.x, y: p.y };
          posRef.current[p.username] = {
            x: lerp(prev.x, p.x, 0.3),
            y: lerp(prev.y, p.y, 0.3),
          };
        }
      }

      // Clear
      ctx!.clearRect(0, 0, CW, CH);

      // Camera transform
      ctx!.save();
      ctx!.translate(CW / 2, CH / 2);
      ctx!.scale(camRef.current.zoom, camRef.current.zoom);
      ctx!.translate(-camRef.current.x, -camRef.current.y);

      drawField(ctx!);

      if (gs) {
        for (const p of gs.players) {
          const lp = posRef.current[p.username] ?? p;
          drawPlayer(
            ctx!, lp.x, lp.y,
            p.username, p.displayName, p.team, p.teamIndex ?? 1,
            gs.hasBallUsername === p.username,
            followRef.current === p.username,
            p.stamina, p.kickCharge,
          );
        }
        const b = ballRef.current;
        const ownerTeam = gs.hasBallUsername
          ? (gs.players.find(p => p.username === gs.hasBallUsername)?.team ?? null)
          : null;
        drawBall(ctx!, b.x, b.y, ownerTeam, gs.ball.vx, gs.ball.vy);
      }

      ctx!.restore();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line

  // Chat scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleFollowPlayer = useCallback((uname: string | null) => {
    followRef.current = uname;
    setFollowedPlayer(uname);
  }, []);

  const sendChat = useCallback(() => {
    const text = inputText.trim();
    if (!text || !channelRef.current) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(), username, displayName,
      text, type: "user", ts: Date.now(),
    };
    broadcastChat(channelRef.current, msg);
    setMessages(prev => [...prev, msg]);
    setInputText("");
  }, [inputText, username, displayName]);

  const fmtTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const isUrgent = phase === "playing" && timeMs < 15_000;

  return (
    <div style={{ background: "#070d16", width: "100%", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

      {/* ── Top HUD ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
        padding: "10px 16px 20px",
        background: "linear-gradient(180deg,rgba(7,13,22,0.97) 0%,rgba(7,13,22,0) 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ pointerEvents: "all", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            onClick={onLeave}>
            <ArrowLeft size={13} /> Çık
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 20, padding: "5px 12px" }}>
            <Eye size={11} style={{ color: "#a78bfa" }} />
            <span style={{ color: "#a78bfa", fontWeight: 800, fontSize: 12 }}>{spectatorCount}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>izleyici</span>
          </div>
        </div>

        {/* Score */}
        <div style={{ pointerEvents: "all", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#ff6b6b", fontWeight: 900, fontSize: 32, lineHeight: 1, textShadow: "0 0 25px rgba(255,107,107,0.6)" }}>{score.red}</div>
            <div style={{ color: "rgba(239,68,68,0.5)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>KIRMIZI</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{
              color: isUrgent ? "#f87171" : "rgba(255,255,255,0.9)",
              fontWeight: 900, fontSize: 16, fontVariantNumeric: "tabular-nums",
              textShadow: isUrgent ? "0 0 12px rgba(248,113,113,0.7)" : "none",
              transition: "color 0.3s",
            }}>
              {phase === "countdown" ? "⏱" : phase === "goal_pause" ? "⚽ GOL!" : phase === "finished" ? "BİTTİ" : fmtTime(timeMs)}
            </div>
            <div style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 8, padding: "2px 8px", color: "#a78bfa", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em" }}>
              👁 İZLİYORSUN
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#60a5fa", fontWeight: 900, fontSize: 32, lineHeight: 1, textShadow: "0 0 25px rgba(96,165,250,0.6)" }}>{score.blue}</div>
            <div style={{ color: "rgba(59,130,246,0.5)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>MAVİ</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</span>
        </div>
      </div>

      {/* ── Canvas ── */}
      <canvas ref={canvasRef} width={CW} height={CH}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />

      {/* ── Bottom: player list + chat toggle ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
        background: "linear-gradient(0deg,rgba(7,13,22,0.98) 70%,rgba(7,13,22,0) 100%)",
        padding: "16px 16px 10px",
      }}>
        {/* Player chips */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
            <button onClick={() => handleFollowPlayer(null)}
              style={{ padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid", transition: "all 0.2s",
                background: followedPlayer === null ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                borderColor: followedPlayer === null ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)",
                color: followedPlayer === null ? "#fff" : "rgba(255,255,255,0.4)",
              }}>⚽ Top</button>
            {playerList.map(p => (
              <button key={p.username}
                onClick={() => handleFollowPlayer(followedPlayer === p.username ? null : p.username)}
                style={{ padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid", transition: "all 0.2s",
                  background: followedPlayer === p.username ? (p.team === "red" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)") : "rgba(255,255,255,0.04)",
                  borderColor: followedPlayer === p.username ? (p.team === "red" ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.5)") : "rgba(255,255,255,0.08)",
                  color: followedPlayer === p.username ? (p.team === "red" ? "#ff6b6b" : "#60a5fa") : "rgba(255,255,255,0.45)",
                }}>
                <span style={{ color: p.team === "red" ? "#ff6b6b" : "#60a5fa", marginRight: 4 }}>●</span>{p.displayName}
              </button>
            ))}
          </div>
          {/* Chat toggle */}
          <button onClick={() => { setChatOpen(o => !o); if (!chatOpen) setUnread(0); }}
            style={{ position: "relative", background: chatOpen ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${chatOpen ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "8px 14px", color: chatOpen ? "#a78bfa" : "rgba(255,255,255,0.55)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <MessageCircle size={14} />
            {unread > 0 && !chatOpen && (
              <span style={{ position: "absolute", top: -5, right: -5, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 17, height: 17, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>
            )}
          </button>
        </div>

        {/* Chat panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 160 }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, marginTop: 10 }}>
              <div style={{ height: 120, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                {messages.length === 0 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, fontStyle: "italic" }}>Henüz mesaj yok.</span>}
                {messages.map(m => (
                  <div key={m.id} style={{ fontSize: 12 }}>
                    {m.type === "system"
                      ? <span style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>{m.text}</span>
                      : <span>
                          <span style={{ color: m.username === username ? "#a78bfa" : "#60a5fa", fontWeight: 700 }}>{m.displayName}:</span>
                          {" "}<span style={{ color: "rgba(255,255,255,0.75)" }}>{m.text}</span>
                        </span>
                    }
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "6px 10px", gap: 6 }}>
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendChat(); } }}
                  onFocus={() => { chatFocusRef.current = true; }}
                  onBlur={() => { chatFocusRef.current = false; }}
                  placeholder="Mesaj yaz (izleyici)..."
                  style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 12, outline: "none" }}
                />
                <button onClick={sendChat}
                  style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, padding: "5px 10px", color: "#a78bfa", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <Send size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

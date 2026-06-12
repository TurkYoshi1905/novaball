import { useState, useEffect, useRef, useCallback } from "react";
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  FIELD_LEFT, FIELD_RIGHT, FIELD_TOP, FIELD_BOTTOM,
  GOAL_HEIGHT, GOAL_DEPTH, GOAL_TOP, GOAL_BOTTOM, POST_RADIUS,
  PLAYER_RADIUS, BALL_RADIUS,
  PLAYER_ACCEL, PLAYER_MAX_SPEED, PLAYER_FRICTION,
  BALL_FRICTION, BALL_RESTITUTION,
  KICK_RANGE, MIN_KICK_POWER, MAX_KICK_POWER, CHARGE_RATE,
  SPRINT_SPEED_MULT, SPRINT_ACCEL_MULT, STAMINA_MAX,
  STAMINA_DRAIN, STAMINA_RECOVER, STAMINA_SPRINT_MIN,
  GOAL_RESET_DELAY, RANKED_DURATION_MS,
  Team, Score, MobileInput,
} from "../types/game";
import type { MPPlayer, MPGameState, PlayerInput, MatchSession } from "../types/game";
import {
  createGameChannel, broadcastGameState, onGameState,
  broadcastInput, onPlayerInput,
} from "../lib/realtime";

// ─── Constants ────────────────────────────────────────────────────────────────
const FRAME_MS   = 1000 / 60;
const SYNC_MS    = 50;   // 20 fps state broadcast (host)
const INPUT_MS   = 33;   // 30 fps input broadcast (client)
const GOAL_LEFT_X  = FIELD_LEFT  - GOAL_DEPTH;
const GOAL_RIGHT_X = FIELD_RIGHT + GOAL_DEPTH;

// ─── Math helpers ─────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist2  = (ax: number, ay: number, bx: number, by: number) =>
  Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
const safe   = (v: number, fb = 0) => (isFinite(v) ? v : fb);

function resolveCircle(
  ax: number, ay: number, avx: number, avy: number, ar: number,
  bx: number, by: number, bvx: number, bvy: number, br: number
): { avx: number; avy: number; bvx: number; bvy: number; ax: number; ay: number; bx: number; by: number } {
  const dx = ax - bx, dy = ay - by;
  const d  = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
  const nx = dx / d, ny = dy / d;
  const overlap = (ar + br - d) / 2;
  const dvx = avx - bvx, dvy = avy - bvy;
  const dot  = dvx * nx + dvy * ny;
  const imp  = dot * 0.9;
  return {
    avx: safe(avx - imp * nx), avy: safe(avy - imp * ny),
    bvx: safe(bvx + imp * nx), bvy: safe(bvy + imp * ny),
    ax: safe(ax + overlap * nx, ax), ay: safe(ay + overlap * ny, ay),
    bx: safe(bx - overlap * nx, bx), by: safe(by - overlap * ny, by),
  };
}

// ─── Spawn positions ──────────────────────────────────────────────────────────
function spawnX(team: Team): number {
  return team === "red" ? 300 : 900;
}
function spawnY(count: number, index: number): number {
  return FIELD_TOP + (FIELD_BOTTOM - FIELD_TOP) * (index + 1) / (count + 1);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Input { dx: number; dy: number; shoot: boolean; sprint: boolean; }

interface GR {
  players:      MPPlayer[];
  ball:         { x: number; y: number; vx: number; vy: number };
  score:        Score;
  gameTimeMs:   number;
  phase:        "playing" | "goal_pause" | "finished";
  goalPauseEnd: number;
  goalCounts:   Record<string, number>;
  inputs:       Record<string, Input>;
  charges:      Record<string, number>;
  cooldowns:    Record<string, number>;
  lastTs:       number;
  lastSync:     number;
  lastInputBc:  number;
}

interface Options {
  canvasRef:       React.RefObject<HTMLCanvasElement | null>;
  match:           MatchSession;
  localUsername:   string;
  isHost:          boolean;
  ranked:          boolean;
  mobileInputRef?: React.RefObject<MobileInput | null>;
  onGameEnd?:      (score: Score, goalCounts: Record<string, number>) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMultiplayerPhysics({
  canvasRef, match, localUsername, isHost, ranked, mobileInputRef, onGameEnd,
}: Options) {
  const [hudScore, setHudScore]   = useState<Score>({ red: 0, blue: 0 });
  const [hudTime,  setHudTime]    = useState(RANKED_DURATION_MS);
  const [hudPhase, setHudPhase]   = useState<"playing" | "goal_pause" | "finished">("playing");

  const grRef      = useRef<GR | null>(null);
  const keysRef    = useRef<Set<string>>(new Set());
  const rafRef     = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof createGameChannel> | null>(null);
  const endFiredRef = useRef(false);

  // ─── Build initial GR ────────────────────────────────────────────────────
  const buildGR = useCallback((): GR => {
    const redCount  = match.redTeam.length;
    const blueCount = match.blueTeam.length;

    const players: MPPlayer[] = [
      ...match.redTeam.map((m, i) => ({
        username: m.username, displayName: m.displayName,
        team: "red" as Team, teamIndex: i + 1,
        x: spawnX("red"), y: spawnY(redCount, i),
        vx: 0, vy: 0, stamina: STAMINA_MAX, kickCharge: 0,
      })),
      ...match.blueTeam.map((m, i) => ({
        username: m.username, displayName: m.displayName,
        team: "blue" as Team, teamIndex: i + 1,
        x: spawnX("blue"), y: spawnY(blueCount, i),
        vx: 0, vy: 0, stamina: STAMINA_MAX, kickCharge: 0,
      })),
    ];

    const inputs: Record<string, Input> = {};
    const charges: Record<string, number> = {};
    const cooldowns: Record<string, number> = {};
    const goalCounts: Record<string, number> = {};
    for (const p of players) {
      inputs[p.username] = { dx: 0, dy: 0, shoot: false, sprint: false };
      charges[p.username]   = 0;
      cooldowns[p.username] = 0;
      goalCounts[p.username] = 0;
    }

    return {
      players,
      ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0 },
      score: { red: 0, blue: 0 },
      gameTimeMs: ranked ? RANKED_DURATION_MS : 0,
      phase: "playing",
      goalPauseEnd: 0,
      goalCounts,
      inputs,
      charges,
      cooldowns,
      lastTs: 0,
      lastSync: 0,
      lastInputBc: 0,
    };
  }, [match, ranked]);

  // ─── Canvas drawing ───────────────────────────────────────────────────────
  const draw = useCallback((gr: GR, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = "#070d16";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Field
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(100,200,100,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(FIELD_LEFT, FIELD_TOP, FIELD_RIGHT - FIELD_LEFT, FIELD_BOTTOM - FIELD_TOP);

    // Center line + circle
    const cx = CANVAS_WIDTH / 2, cy = CANVAS_HEIGHT / 2;
    ctx.beginPath(); ctx.moveTo(cx, FIELD_TOP); ctx.lineTo(cx, FIELD_BOTTOM);
    ctx.strokeStyle = "rgba(100,200,100,0.15)"; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(100,200,100,0.15)"; ctx.stroke();
    ctx.restore();

    // Goals
    const drawGoal = (side: "left" | "right") => {
      const x = side === "left" ? FIELD_LEFT - GOAL_DEPTH : FIELD_RIGHT;
      ctx.fillStyle   = side === "left" ? "rgba(68,136,255,0.08)" : "rgba(230,53,53,0.08)";
      ctx.fillRect(x, GOAL_TOP, GOAL_DEPTH, GOAL_HEIGHT);
      ctx.strokeStyle = side === "left" ? "rgba(68,136,255,0.35)" : "rgba(230,53,53,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, GOAL_TOP, GOAL_DEPTH, GOAL_HEIGHT);
    };
    drawGoal("left");
    drawGoal("right");

    // Goal posts
    const posts = [
      { x: FIELD_LEFT,  y: GOAL_TOP    },
      { x: FIELD_LEFT,  y: GOAL_BOTTOM },
      { x: FIELD_RIGHT, y: GOAL_TOP    },
      { x: FIELD_RIGHT, y: GOAL_BOTTOM },
    ];
    for (const p of posts) {
      ctx.beginPath(); ctx.arc(p.x, p.y, POST_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();
    }

    // Players
    for (const p of gr.players) {
      const isLocal = p.username === localUsername;
      const color   = p.team === "red" ? "#e63535" : "#4488ff";
      const glow    = p.team === "red" ? "#e6353570" : "#4488ff70";

      ctx.save();

      // Stamina bar (below player)
      const barW = PLAYER_RADIUS * 2;
      const barX = p.x - PLAYER_RADIUS;
      const barY = p.y + PLAYER_RADIUS + 5;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(barX, barY, barW, 3);
      ctx.fillStyle = p.stamina > 50 ? "#4ade80" : p.stamina > 25 ? "#facc15" : "#f87171";
      ctx.fillRect(barX, barY, barW * (p.stamina / STAMINA_MAX), 3);

      // Kick charge arc (local player)
      if (isLocal && p.kickCharge > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, PLAYER_RADIUS + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.kickCharge);
        ctx.strokeStyle = `hsl(${120 - p.kickCharge * 120},90%,60%)`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Player circle with glow
      ctx.shadowBlur  = isLocal ? 20 : 12;
      ctx.shadowColor = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle   = color;
      ctx.fill();
      ctx.strokeStyle = isLocal ? "#fff" : "rgba(255,255,255,0.3)";
      ctx.lineWidth   = isLocal ? 2.5 : 1.5;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Jersey number inside circle
      ctx.fillStyle   = "#fff";
      ctx.font        = `bold ${PLAYER_RADIUS}px Inter,sans-serif`;
      ctx.textAlign   = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(p.teamIndex), p.x, p.y);

      // Display name below
      ctx.fillStyle   = isLocal ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)";
      ctx.font        = "bold 11px Inter,sans-serif";
      ctx.textBaseline = "top";
      const maxNameW = 70;
      let name = p.displayName;
      while (ctx.measureText(name).width > maxNameW && name.length > 1) name = name.slice(0, -1);
      if (name !== p.displayName) name += "…";
      ctx.fillText(name, p.x, p.y + PLAYER_RADIUS + 10);

      ctx.restore();
    }

    // Ball
    const { ball } = gr;
    ctx.save();
    ctx.shadowBlur  = 16;
    ctx.shadowColor = "#ffffff60";
    ctx.beginPath();
    ctx.arc(safe(ball.x), safe(ball.y), BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Goal flash overlay
    if (gr.phase === "goal_pause") {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }, [localUsername]);

  // ─── Reset ball & players after goal ─────────────────────────────────────
  const resetPositions = useCallback((gr: GR) => {
    gr.ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 0, vy: 0 };
    const redCount  = match.redTeam.length;
    const blueCount = match.blueTeam.length;
    for (const p of gr.players) {
      const idx = p.teamIndex - 1;
      p.x   = spawnX(p.team);
      p.y   = spawnY(p.team === "red" ? redCount : blueCount, idx);
      p.vx  = 0;
      p.vy  = 0;
    }
  }, [match]);

  // ─── Physics step (host only) ──────────────────────────────────────────────
  const physicsStep = useCallback((gr: GR, dt: number) => {
    if (gr.phase === "goal_pause") {
      if (Date.now() >= gr.goalPauseEnd) {
        gr.phase = "playing";
        resetPositions(gr);
      }
      return;
    }
    if (gr.phase === "finished") return;

    // Timer
    if (ranked) {
      gr.gameTimeMs = Math.max(0, gr.gameTimeMs - dt);
      if (gr.gameTimeMs <= 0) { gr.phase = "finished"; return; }
    }

    for (let i = 0; i < gr.players.length; i++) {
      const p   = gr.players[i];
      const inp = gr.inputs[p.username] ?? { dx: 0, dy: 0, shoot: false, sprint: false };

      // Stamina
      const sprinting = inp.sprint && p.stamina > STAMINA_SPRINT_MIN;
      p.stamina = clamp(p.stamina + (sprinting ? -STAMINA_DRAIN : STAMINA_RECOVER), 0, STAMINA_MAX);

      const speedMult  = sprinting ? SPRINT_SPEED_MULT : 1;
      const accelMult  = sprinting ? SPRINT_ACCEL_MULT : 1;
      const maxSpeed   = PLAYER_MAX_SPEED * speedMult;

      // Movement
      p.vx += inp.dx * PLAYER_ACCEL * accelMult;
      p.vy += inp.dy * PLAYER_ACCEL * accelMult;
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > maxSpeed) { p.vx = p.vx / spd * maxSpeed; p.vy = p.vy / spd * maxSpeed; }
      p.vx *= PLAYER_FRICTION;
      p.vy *= PLAYER_FRICTION;
      p.x = clamp(safe(p.x + p.vx), FIELD_LEFT + PLAYER_RADIUS, FIELD_RIGHT - PLAYER_RADIUS);
      p.y = clamp(safe(p.y + p.vy), FIELD_TOP  + PLAYER_RADIUS, FIELD_BOTTOM - PLAYER_RADIUS);

      // Kick charge
      const cd = gr.cooldowns[p.username] ?? 0;
      if (inp.shoot) {
        gr.charges[p.username] = Math.min(1, (gr.charges[p.username] ?? 0) + CHARGE_RATE);
      } else if ((gr.charges[p.username] ?? 0) > 0 && cd <= 0) {
        const charge = gr.charges[p.username] ?? 0;
        const power  = MIN_KICK_POWER + (MAX_KICK_POWER - MIN_KICK_POWER) * charge;
        const dx     = gr.ball.x - p.x;
        const dy     = gr.ball.y - p.y;
        const d      = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
        if (d < KICK_RANGE) {
          gr.ball.vx += (dx / d) * power;
          gr.ball.vy += (dy / d) * power;
          gr.cooldowns[p.username] = 18;
          const scorer = p.username;
          const teamScoring = p.team;
          void teamScoring; void scorer;
        }
        gr.charges[p.username] = 0;
      }
      if (cd > 0) gr.cooldowns[p.username] = cd - 1;
      p.kickCharge = gr.charges[p.username] ?? 0;
    }

    // Player-player collisions
    for (let i = 0; i < gr.players.length; i++) {
      for (let j = i + 1; j < gr.players.length; j++) {
        const a = gr.players[i], b = gr.players[j];
        if (dist2(a.x, a.y, b.x, b.y) < PLAYER_RADIUS * 2) {
          const r = resolveCircle(a.x, a.y, a.vx, a.vy, PLAYER_RADIUS, b.x, b.y, b.vx, b.vy, PLAYER_RADIUS);
          a.x = r.ax; a.y = r.ay; a.vx = r.avx; a.vy = r.avy;
          b.x = r.bx; b.y = r.by; b.vx = r.bvx; b.vy = r.bvy;
        }
      }
    }

    // Player-ball collisions
    for (const p of gr.players) {
      if (dist2(p.x, p.y, gr.ball.x, gr.ball.y) < PLAYER_RADIUS + BALL_RADIUS) {
        const r = resolveCircle(p.x, p.y, p.vx, p.vy, PLAYER_RADIUS, gr.ball.x, gr.ball.y, gr.ball.vx, gr.ball.vy, BALL_RADIUS);
        p.x = r.ax; p.y = r.ay; p.vx = r.avx; p.vy = r.avy;
        gr.ball.x = r.bx; gr.ball.y = r.by;
        gr.ball.vx = r.bvx * 1.05; gr.ball.vy = r.bvy * 1.05;
      }
    }

    // Ball wall collisions
    const ball = gr.ball;
    // Top/bottom
    if (ball.y - BALL_RADIUS < FIELD_TOP) {
      ball.y = FIELD_TOP + BALL_RADIUS; ball.vy = Math.abs(ball.vy) * BALL_RESTITUTION;
    }
    if (ball.y + BALL_RADIUS > FIELD_BOTTOM) {
      ball.y = FIELD_BOTTOM - BALL_RADIUS; ball.vy = -Math.abs(ball.vy) * BALL_RESTITUTION;
    }

    // Left wall (goal entrance)
    if (ball.x - BALL_RADIUS < FIELD_LEFT) {
      if (ball.y >= GOAL_TOP && ball.y <= GOAL_BOTTOM) {
        // Ball in left goal zone — check scored
        if (ball.x < GOAL_LEFT_X) {
          gr.score.blue++;
          // Find last red-team kicker (simplified: no attribution in this event)
          gr.phase = "goal_pause";
          gr.goalPauseEnd = Date.now() + GOAL_RESET_DELAY;
          return;
        }
      } else {
        ball.x = FIELD_LEFT + BALL_RADIUS; ball.vx = Math.abs(ball.vx) * BALL_RESTITUTION;
      }
    }

    // Right wall (goal entrance)
    if (ball.x + BALL_RADIUS > FIELD_RIGHT) {
      if (ball.y >= GOAL_TOP && ball.y <= GOAL_BOTTOM) {
        if (ball.x > GOAL_RIGHT_X) {
          gr.score.red++;
          gr.phase = "goal_pause";
          gr.goalPauseEnd = Date.now() + GOAL_RESET_DELAY;
          return;
        }
      } else {
        ball.x = FIELD_RIGHT - BALL_RADIUS; ball.vx = -Math.abs(ball.vx) * BALL_RESTITUTION;
      }
    }

    // Goal back walls
    if (ball.x < GOAL_LEFT_X) { ball.x = GOAL_LEFT_X + BALL_RADIUS; ball.vx = Math.abs(ball.vx) * BALL_RESTITUTION; }
    if (ball.x > GOAL_RIGHT_X) { ball.x = GOAL_RIGHT_X - BALL_RADIUS; ball.vx = -Math.abs(ball.vx) * BALL_RESTITUTION; }

    // Ball friction
    ball.vx *= BALL_FRICTION;
    ball.vy *= BALL_FRICTION;
    ball.x = safe(ball.x + ball.vx);
    ball.y = safe(ball.y + ball.vy);
  }, [ranked, resetPositions]);

  // ─── Main loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gr = buildGR();
    grRef.current = gr;
    endFiredRef.current = false;

    // Keyboard
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (down) keysRef.current.add(e.code);
      else keysRef.current.delete(e.code);
    };
    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup",   e => onKey(e, false));

    // Realtime channel
    const ch = createGameChannel(match.channelId);
    channelRef.current = ch;

    if (isHost) {
      // Host: receive remote inputs
      onPlayerInput(ch, (inp) => {
        if (!grRef.current) return;
        grRef.current.inputs[inp.username] = { dx: inp.dx, dy: inp.dy, shoot: inp.shoot, sprint: inp.sprint };
      });
    } else {
      // Client: receive game state
      onGameState(ch, (state) => {
        if (!grRef.current) return;
        grRef.current.ball   = { ...state.ball };
        grRef.current.score  = { ...state.score };
        grRef.current.gameTimeMs = state.gameTimeMs;
        if (state.phase === "finished" && grRef.current.phase !== "finished") {
          grRef.current.phase = "finished";
          setHudPhase("finished");
        } else if (grRef.current.phase !== "finished") {
          grRef.current.phase = state.phase === "goal_pause" ? "goal_pause" : "playing";
        }
        // Update remote players
        for (const sp of state.players) {
          const local = grRef.current.players.find(p => p.username === sp.username);
          if (local && sp.username !== localUsername) {
            local.x = sp.x; local.y = sp.y;
            local.vx = sp.vx; local.vy = sp.vy;
            local.stamina = sp.stamina;
            local.kickCharge = sp.kickCharge;
          }
        }
      });
    }

    ch.subscribe();

    // Animation loop
    let lastTs = 0;
    const loop = (ts: number) => {
      const g = grRef.current;
      if (!g) { rafRef.current = requestAnimationFrame(loop); return; }
      if (lastTs === 0) lastTs = ts;
      const dt = ts - lastTs;
      if (dt < FRAME_MS - 2) { rafRef.current = requestAnimationFrame(loop); return; }
      lastTs = ts;

      // Build local input
      const keys = keysRef.current;
      const mob  = mobileInputRef?.current;
      const dx = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0)
               - (keys.has("KeyA") || keys.has("ArrowLeft")  ? 1 : 0)
               + (mob?.dx ?? 0);
      const dy = (keys.has("KeyS") || keys.has("ArrowDown")  ? 1 : 0)
               - (keys.has("KeyW") || keys.has("ArrowUp")    ? 1 : 0)
               + (mob?.dy ?? 0);
      const shoot  = keys.has("Space") || keys.has("KeyX") || (mob?.shoot ?? false);
      const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") || (mob?.sprint ?? false);

      g.inputs[localUsername] = { dx: clamp(dx, -1, 1), dy: clamp(dy, -1, 1), shoot, sprint };

      // Local player charge update
      const localP = g.players.find(p => p.username === localUsername);
      if (localP) localP.kickCharge = g.charges[localUsername] ?? 0;

      if (isHost) {
        physicsStep(g, dt);

        // Broadcast state at 20fps
        const now = Date.now();
        if (now - g.lastSync >= SYNC_MS) {
          g.lastSync = now;
          const state: MPGameState = {
            players: g.players.map(p => ({ ...p })),
            ball: { ...g.ball },
            score: { ...g.score },
            gameTimeMs: g.gameTimeMs,
            phase: g.phase,
          };
          broadcastGameState(ch, state);
        }
      } else {
        // Client: broadcast own input
        const now = Date.now();
        if (now - g.lastInputBc >= INPUT_MS) {
          g.lastInputBc = now;
          const inp: PlayerInput = {
            username: localUsername,
            dx: g.inputs[localUsername]?.dx ?? 0,
            dy: g.inputs[localUsername]?.dy ?? 0,
            shoot, sprint, ts: now,
          };
          broadcastInput(ch, inp);
        }
      }

      // Update HUD
      setHudScore({ ...g.score });
      setHudTime(g.gameTimeMs);
      if (g.phase === "finished") setHudPhase("finished");
      else if (g.phase === "goal_pause") setHudPhase("goal_pause");
      else setHudPhase("playing");

      // Fire game end
      if (g.phase === "finished" && !endFiredRef.current) {
        endFiredRef.current = true;
        onGameEnd?.(g.score, g.goalCounts);
      }

      draw(g, canvas);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup",   e => onKey(e, false));
      ch.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { score: hudScore, gameTimeMs: hudTime, phase: hudPhase };
}

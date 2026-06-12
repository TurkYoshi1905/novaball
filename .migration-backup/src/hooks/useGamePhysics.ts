import { useEffect, useRef, useCallback } from "react";
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  FIELD_LEFT, FIELD_RIGHT, FIELD_TOP, FIELD_BOTTOM,
  GOAL_DEPTH, GOAL_TOP, GOAL_BOTTOM, POST_RADIUS,
  PLAYER_RADIUS, BALL_RADIUS,
  PLAYER_ACCEL, PLAYER_MAX_SPEED, PLAYER_FRICTION,
  BALL_FRICTION, BALL_RESTITUTION, KICK_POWER, KICK_RANGE,
  AI_ACCEL, AI_MAX_SPEED, AI_KICK_RANGE, AI_KICK_POWER,
  GOAL_RESET_DELAY,
  SPRINT_SPEED_MULT, SPRINT_ACCEL_MULT,
  STAMINA_MAX, STAMINA_DRAIN, STAMINA_RECOVER, STAMINA_SPRINT_MIN,
  POSSESS_DIST, POSSESS_OFFSET, STEAL_DIST,
  CHARGE_RATE, MIN_KICK_POWER, MAX_KICK_POWER,
  type PlayerState, type BallState, type Score, type ShootEffect, type BallOwner,
  type MobileInput,
} from "../types/game";

const FRAME_MS = 1000 / 60; // 60 FPS hedef kare süresi (16.667ms)

const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;
const MOB_T    = 0.22; // joystick direction threshold

function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }
function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy);
}
function safe(n: number, fallback = 0) { return isFinite(n) ? n : fallback; }

function resolveCircleCollision(
  ax: number, ay: number, ar: number, avx: number, avy: number,
  bx: number, by: number, br: number, bvx: number, bvy: number,
  rest = 0.9,
) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d >= ar + br || d < 1e-6) return null;
  const nx = dx / d, ny = dy / d;
  const overlap = ar + br - d;
  const dot = (avx - bvx) * nx + (avy - bvy) * ny;
  if (dot <= 0) return null;
  const imp = (1 + rest) * dot * 0.5;
  return { overlap, nx, ny, impAx: -imp * nx, impAy: -imp * ny, impBx: imp * nx, impBy: imp * ny };
}

function mkPlayer(name: string, team: "red" | "blue"): PlayerState {
  const fw = FIELD_RIGHT - FIELD_LEFT;
  return {
    x: team === "red" ? FIELD_LEFT + fw * 0.28 : FIELD_LEFT + fw * 0.72,
    y: CENTER_Y, vx: 0, vy: 0, radius: PLAYER_RADIUS, name, team,
  };
}
function mkBall(): BallState { return { x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0, radius: BALL_RADIUS }; }

interface GR {
  player: PlayerState; aiPlayer: PlayerState; ball: BallState;
  score: Score; gameTime: number; lastTs: number;
  keys: Set<string>;
  shootFx: ShootEffect; aiShootFx: ShootEffect;
  goalState: { team: "red" | "blue"; timer: number } | null;
  kickCd: number; aiKickCd: number;
  stamina: number; isSprinting: boolean;
  hasBall: BallOwner;
  playerFacingX: number; playerFacingY: number;
  aiFacingX: number; aiFacingY: number;
  aiStamina: number; aiSprinting: boolean;
  matchEnded: boolean;
  kickCharge: number;      // 0..1 şut şarj seviyesi
  prevShootHeld: boolean;  // bir önceki frame'de şut basılı mıydı
}

interface Options {
  username: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onScoreChange: (s: Score) => void;
  onGoal: (t: "red" | "blue") => void;
  onTimeChange: (ms: number) => void;
  onMatchEnd?: (playerGoals: number, aiGoals: number) => void;
  timeLimit?: number;
  mobileInputRef?: React.RefObject<MobileInput>;
  active: boolean;
}

export function useGamePhysics({ username, canvasRef, onScoreChange, onGoal, onTimeChange, onMatchEnd, timeLimit, mobileInputRef, active }: Options) {
  const rafRef = useRef<number | null>(null);
  const sr = useRef<GR>({
    player: mkPlayer(username, "red"), aiPlayer: mkPlayer("AI", "blue"), ball: mkBall(),
    score: { red: 0, blue: 0 }, gameTime: 0, lastTs: 0, keys: new Set(),
    shootFx: { active: false, alpha: 0, ring: 0 }, aiShootFx: { active: false, alpha: 0, ring: 0 },
    goalState: null, kickCd: 0, aiKickCd: 0,
    stamina: STAMINA_MAX, isSprinting: false, hasBall: null,
    playerFacingX: 1, playerFacingY: 0, aiFacingX: -1, aiFacingY: 0,
    aiStamina: STAMINA_MAX, aiSprinting: false, matchEnded: false,
    kickCharge: 0, prevShootHeld: false,
  });

  const resetPos = useCallback(() => {
    const s = sr.current;
    s.player = mkPlayer(username, "red"); s.aiPlayer = mkPlayer("AI", "blue"); s.ball = mkBall();
    s.shootFx = { active: false, alpha: 0, ring: 0 }; s.aiShootFx = { active: false, alpha: 0, ring: 0 };
    s.kickCd = 0; s.aiKickCd = 0; s.hasBall = null;
    s.stamina = STAMINA_MAX; s.isSprinting = false;
    s.aiStamina = STAMINA_MAX; s.aiSprinting = false;
    s.playerFacingX = 1; s.playerFacingY = 0; s.aiFacingX = -1; s.aiFacingY = 0;
    s.kickCharge = 0; s.prevShootHeld = false;
  }, [username]);

  const resetGame = useCallback(() => {
    const s = sr.current;
    s.score = { red: 0, blue: 0 }; s.gameTime = 0; s.goalState = null; s.matchEnded = false;
    resetPos(); onScoreChange({ red: 0, blue: 0 }); onTimeChange(0);
  }, [resetPos, onScoreChange, onTimeChange]);

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      sr.current.keys.add(e.code);
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => sr.current.keys.delete(e.code);
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    if (!active) { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); return; }
    resetGame();

    const tick = (ts: number) => {
      const s   = sr.current;

      // ── 60 FPS kilidi: 120/90Hz ekranlarda fazla frame atla ─────────────────
      if (s.lastTs > 0 && ts - s.lastTs < FRAME_MS - 2) {
        rafRef.current = requestAnimationFrame(tick); return;
      }

      const cvs = canvasRef.current;
      if (!cvs) { rafRef.current = requestAnimationFrame(tick); return; }
      const ctx = cvs.getContext("2d");
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

      const dt  = s.lastTs === 0 ? FRAME_MS : Math.min(ts - s.lastTs, FRAME_MS * 2);
      s.lastTs  = ts;
      const dtF = dt / FRAME_MS; // 60fps'de her zaman ~1.0

      if (!s.goalState && !s.matchEnded) {
        s.gameTime += dt;
        if (Math.round(s.gameTime / 1000) !== Math.round((s.gameTime - dt) / 1000)) onTimeChange(s.gameTime);
        if (timeLimit && s.gameTime >= timeLimit && !s.matchEnded) {
          s.matchEnded = true;
          onTimeChange(timeLimit);
          drawGame(ctx, s);
          onMatchEnd?.(s.score.red, s.score.blue);
          return;
        }
      }

      if (s.goalState) {
        s.goalState.timer -= dt;
        if (s.goalState.timer <= 0) { s.goalState = null; resetPos(); }
      } else if (!s.matchEnded) {
        const mob = mobileInputRef?.current ?? null;
        updatePhysics(s, dtF, mob);
        const goal = checkGoal(s.ball);
        if (goal) {
          s.hasBall = null;
          if (goal === "red") s.score.red++; else s.score.blue++;
          s.goalState = { team: goal, timer: GOAL_RESET_DELAY };
          onScoreChange({ ...s.score }); onGoal(goal);
        }
      }

      drawGame(ctx, s);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); sr.current.lastTs = 0; };
  }, [active, canvasRef, resetGame, resetPos, onScoreChange, onGoal, onTimeChange, onMatchEnd, timeLimit, mobileInputRef]);

  return { resetGame };
}

// ─── Fizik ───────────────────────────────────────────────────────────────────

function updatePhysics(s: GR, dtF: number, mob: MobileInput | null) {
  const { keys } = s;

  // Depar — klavye veya mobil sprint butonu
  const wantSprint = keys.has("ShiftLeft") || (mob?.sprint ?? false);
  if (wantSprint && s.stamina >= STAMINA_SPRINT_MIN) {
    s.isSprinting = true; s.stamina = Math.max(0, s.stamina - STAMINA_DRAIN * dtF);
  } else {
    s.isSprinting = false;
    if (!wantSprint) s.stamina = Math.min(STAMINA_MAX, s.stamina + STAMINA_RECOVER * dtF);
  }
  if (s.stamina <= 0) s.isSprinting = false;

  const spd = s.isSprinting ? PLAYER_MAX_SPEED * SPRINT_SPEED_MULT : PLAYER_MAX_SPEED;
  const acc = s.isSprinting ? PLAYER_ACCEL    * SPRINT_ACCEL_MULT  : PLAYER_ACCEL;

  // Yön — joystick aktifse analog kullan, değilse klavye (asla ikisini birlikte toplama)
  let ax = 0, ay = 0;
  const mobActive = mob !== null && (Math.abs(mob.dx) > 0.04 || Math.abs(mob.dy) > 0.04);

  if (mobActive && mob) {
    // Saf analog: -1…1 aralığından doğrudan ivme. Çarpraz harekette büyüklük zaten kısıtlı.
    ax = mob.dx * acc;
    ay = mob.dy * acc;
  } else {
    // Dijital klavye
    if (keys.has("KeyW") || keys.has("ArrowUp"))    ay -= acc;
    if (keys.has("KeyS") || keys.has("ArrowDown"))  ay += acc;
    if (keys.has("KeyA") || keys.has("ArrowLeft"))  ax -= acc;
    if (keys.has("KeyD") || keys.has("ArrowRight")) ax += acc;
    if (ax !== 0 && ay !== 0) { ax *= 0.707; ay *= 0.707; }
  }

  s.player.vx = clamp((s.player.vx + ax * dtF) * PLAYER_FRICTION, -spd, spd);
  s.player.vy = clamp((s.player.vy + ay * dtF) * PLAYER_FRICTION, -spd, spd);

  const pSpd = Math.sqrt(s.player.vx ** 2 + s.player.vy ** 2);
  if (pSpd > 0.3) { s.playerFacingX = s.player.vx / pSpd; s.playerFacingY = s.player.vy / pSpd; }

  // ── Güç barı: basılı tut → şarj, bırak → ateşle ─────────────────────────
  if (s.kickCd > 0) s.kickCd -= dtF;
  const shootHeld = keys.has("Space") || keys.has("KeyX") || (mob?.shoot ?? false);

  if (s.kickCd <= 0) {
    if (shootHeld) {
      // Tuş basılı → şarj doldurmaya devam
      s.kickCharge = Math.min(1, s.kickCharge + CHARGE_RATE * dtF);
    } else if (s.prevShootHeld && s.kickCharge > 0.02) {
      // Tuş bırakıldı → şarj miktarına göre ateşle
      const power = MIN_KICK_POWER + (MAX_KICK_POWER - MIN_KICK_POWER) * s.kickCharge;
      if (s.hasBall === "player") {
        releaseKick(s.player, s.ball, s.shootFx, power, s.playerFacingX, s.playerFacingY);
        s.hasBall = null;
      } else {
        tryKick(s.player, s.ball, s.shootFx, power);
      }
      s.kickCharge = 0;
      s.kickCd = 18;
    } else if (!shootHeld) {
      s.kickCharge = 0;
    }
  }
  s.prevShootHeld = shootHeld;

  if (s.hasBall === "player") {
    attachBall(s.player, s.ball, s.playerFacingX, s.playerFacingY);
    s.player.x += s.player.vx * dtF; s.player.y += s.player.vy * dtF;
    clampField(s.player); attachBall(s.player, s.ball, s.playerFacingX, s.playerFacingY);
    checkAISteal(s);
  } else {
    s.player.x += s.player.vx * dtF; s.player.y += s.player.vy * dtF;
    clampField(s.player);
    if (s.hasBall === null && dist2(s.player.x, s.player.y, s.ball.x, s.ball.y) <= POSSESS_DIST) {
      if (Math.sqrt(s.ball.vx ** 2 + s.ball.vy ** 2) < 8) {
        s.hasBall = "player"; attachBall(s.player, s.ball, s.playerFacingX, s.playerFacingY);
      }
    }
  }

  updateAI(s, dtF);

  if (s.hasBall === null) {
    s.ball.vx *= Math.pow(BALL_FRICTION, dtF); s.ball.vy *= Math.pow(BALL_FRICTION, dtF);
    if (Math.abs(s.ball.vx) < 0.02) s.ball.vx = 0;
    if (Math.abs(s.ball.vy) < 0.02) s.ball.vy = 0;
    s.ball.x += s.ball.vx * dtF; s.ball.y += s.ball.vy * dtF;
    bounceBall(s.ball);

    const c = resolveCircleCollision(
      s.player.x, s.player.y, s.player.radius, s.player.vx, s.player.vy,
      s.ball.x,   s.ball.y,   s.ball.radius,   s.ball.vx,   s.ball.vy, 0.85);
    if (c) {
      s.player.x -= c.nx*c.overlap*.5; s.player.y -= c.ny*c.overlap*.5;
      s.ball.x   += c.nx*c.overlap*.5; s.ball.y   += c.ny*c.overlap*.5;
      s.player.vx += c.impAx; s.player.vy += c.impAy;
      s.ball.vx   += c.impBx; s.ball.vy   += c.impBy;
      clampField(s.player);
    }
    if (s.hasBall !== "ai") {
      const ca = resolveCircleCollision(
        s.aiPlayer.x, s.aiPlayer.y, s.aiPlayer.radius, s.aiPlayer.vx, s.aiPlayer.vy,
        s.ball.x,     s.ball.y,     s.ball.radius,     s.ball.vx,     s.ball.vy,   0.85);
      if (ca) {
        s.aiPlayer.x -= ca.nx*ca.overlap*.5; s.aiPlayer.y -= ca.ny*ca.overlap*.5;
        s.ball.x     += ca.nx*ca.overlap*.5; s.ball.y     += ca.ny*ca.overlap*.5;
        s.aiPlayer.vx += ca.impAx; s.aiPlayer.vy += ca.impAy;
        s.ball.vx     += ca.impBx; s.ball.vy     += ca.impBy;
        clampField(s.aiPlayer);
      }
    }
  }

  const pa = resolveCircleCollision(
    s.player.x, s.player.y, s.player.radius, s.player.vx, s.player.vy,
    s.aiPlayer.x, s.aiPlayer.y, s.aiPlayer.radius, s.aiPlayer.vx, s.aiPlayer.vy, 0.75);
  if (pa) {
    s.player.x  -= pa.nx*pa.overlap*.5; s.player.y  -= pa.ny*pa.overlap*.5;
    s.aiPlayer.x += pa.nx*pa.overlap*.5; s.aiPlayer.y += pa.ny*pa.overlap*.5;
    s.player.vx  += pa.impAx*.6; s.player.vy  += pa.impAy*.6;
    s.aiPlayer.vx += pa.impBx*.6; s.aiPlayer.vy += pa.impBy*.6;
    clampField(s.player); clampField(s.aiPlayer);
    if (s.hasBall === "player" && dist2(s.aiPlayer.x, s.aiPlayer.y, s.player.x, s.player.y) < STEAL_DIST)
      stealBall(s, "ai");
    else if (s.hasBall === "ai" && s.isSprinting && dist2(s.player.x, s.player.y, s.aiPlayer.x, s.aiPlayer.y) < STEAL_DIST)
      stealBall(s, "player");
  }

  updateFx(s.shootFx, dtF); updateFx(s.aiShootFx, dtF);
}

function updateAI(s: GR, dtF: number) {
  const { ball, aiPlayer } = s;
  const playerClose = dist2(s.player.x, s.player.y, aiPlayer.x, aiPlayer.y) < PLAYER_RADIUS * 3.5;
  const wantAISprint = s.hasBall === "player" && playerClose;
  if (wantAISprint && s.aiStamina >= STAMINA_SPRINT_MIN) {
    s.aiSprinting = true; s.aiStamina = Math.max(0, s.aiStamina - STAMINA_DRAIN*.8*dtF);
  } else {
    s.aiSprinting = false; s.aiStamina = Math.min(STAMINA_MAX, s.aiStamina + STAMINA_RECOVER*dtF);
  }
  if (s.aiStamina <= 0) s.aiSprinting = false;
  const aiSpd = s.aiSprinting ? AI_MAX_SPEED*SPRINT_SPEED_MULT*.9 : AI_MAX_SPEED;
  const aiAcc = s.aiSprinting ? AI_ACCEL*SPRINT_ACCEL_MULT : AI_ACCEL;

  const targetX = s.hasBall === "ai" ? FIELD_LEFT + 20 : ball.x + (s.hasBall === "player" ? 10 : 30);
  const targetY = s.hasBall === "ai" ? CENTER_Y : ball.y;
  const dx = targetX - aiPlayer.x, dy = targetY - aiPlayer.y;
  const d  = Math.sqrt(dx*dx + dy*dy);

  if (d > 4) {
    const nx = dx/d, ny = dy/d;
    aiPlayer.vx = clamp((aiPlayer.vx + nx*aiAcc*dtF)*PLAYER_FRICTION, -aiSpd, aiSpd);
    aiPlayer.vy = clamp((aiPlayer.vy + ny*aiAcc*dtF)*PLAYER_FRICTION, -aiSpd, aiSpd);
    const aiS = Math.sqrt(aiPlayer.vx**2 + aiPlayer.vy**2);
    if (aiS > 0.3) { s.aiFacingX = aiPlayer.vx/aiS; s.aiFacingY = aiPlayer.vy/aiS; }
  } else { aiPlayer.vx *= PLAYER_FRICTION; aiPlayer.vy *= PLAYER_FRICTION; }

  if (s.hasBall === "ai") {
    attachBall(aiPlayer, s.ball, s.aiFacingX, s.aiFacingY);
    aiPlayer.x += aiPlayer.vx*dtF; aiPlayer.y += aiPlayer.vy*dtF;
    clampField(aiPlayer); attachBall(aiPlayer, s.ball, s.aiFacingX, s.aiFacingY);
    if (s.isSprinting && dist2(s.player.x, s.player.y, aiPlayer.x, aiPlayer.y) < STEAL_DIST)
      stealBall(s, "player");
  } else {
    aiPlayer.x += aiPlayer.vx*dtF; aiPlayer.y += aiPlayer.vy*dtF;
    clampField(aiPlayer);
    if (s.hasBall === null && dist2(aiPlayer.x, aiPlayer.y, ball.x, ball.y) <= POSSESS_DIST) {
      if (Math.sqrt(ball.vx**2 + ball.vy**2) < 9) {
        s.hasBall = "ai"; attachBall(aiPlayer, s.ball, s.aiFacingX, s.aiFacingY);
      }
    }
  }

  if (s.aiKickCd > 0) s.aiKickCd -= dtF;
  if (s.aiKickCd <= 0) {
    if (s.hasBall === "ai") {
      const distGoal = dist2(aiPlayer.x, aiPlayer.y, FIELD_LEFT, CENTER_Y);
      if (distGoal < 260 || Math.random() < 0.004) {
        releaseKick(aiPlayer, s.ball, s.aiShootFx, AI_KICK_POWER, s.aiFacingX, s.aiFacingY);
        s.hasBall = null; s.aiKickCd = 25;
      }
    } else if (s.hasBall === null && dist2(aiPlayer.x, aiPlayer.y, ball.x, ball.y) < AI_KICK_RANGE) {
      tryKick(aiPlayer, ball, s.aiShootFx, AI_KICK_POWER); s.aiKickCd = 28;
    }
  }
}

function attachBall(p: PlayerState, ball: BallState, fx: number, fy: number) {
  const len = Math.sqrt(fx*fx + fy*fy);
  const nx  = len > 0.01 ? fx/len : 1, ny = len > 0.01 ? fy/len : 0;
  ball.x = safe(p.x + nx * POSSESS_OFFSET, p.x);
  ball.y = safe(p.y + ny * POSSESS_OFFSET, p.y);
  ball.vx = p.vx; ball.vy = p.vy;
}

function stealBall(s: GR, newOwner: "player" | "ai") {
  const prev = s.hasBall;
  s.hasBall  = newOwner;
  const taker = newOwner === "player" ? s.player : s.aiPlayer;
  const giver = prev    === "player" ? s.player : s.aiPlayer;
  const dx = taker.x - giver.x, dy = taker.y - giver.y;
  const d  = Math.sqrt(dx*dx + dy*dy) || 1;
  const sp = Math.sqrt(taker.vx**2 + taker.vy**2) || 2;
  s.ball.vx = (dx/d)*sp*.8; s.ball.vy = (dy/d)*sp*.8;
}

function releaseKick(p: PlayerState, ball: BallState, fx: ShootEffect, power: number, facX: number, facY: number) {
  const len = Math.sqrt(facX**2 + facY**2) || 1;
  ball.vx = (facX/len)*power; ball.vy = (facY/len)*power;
  fx.active = true; fx.alpha = 1; fx.ring = p.radius + 2;
}

function tryKick(p: PlayerState, ball: BallState, fx: ShootEffect, power: number) {
  const dx = ball.x - p.x, dy = ball.y - p.y;
  const d  = Math.sqrt(dx*dx + dy*dy);
  if (d < KICK_RANGE && d > 0) {
    const nx = dx/d, ny = dy/d;
    let dirX = p.vx, dirY = p.vy;
    const sp = Math.sqrt(dirX**2 + dirY**2);
    if (sp < 0.5) { dirX = nx; dirY = ny; } else { dirX /= sp; dirY /= sp; }
    const bx = nx*.6 + dirX*.4, by = ny*.6 + dirY*.4;
    const bl = Math.sqrt(bx*bx + by*by) || 1;
    ball.vx = (bx/bl)*power; ball.vy = (by/bl)*power;
  }
  fx.active = true; fx.alpha = 1; fx.ring = p.radius + 2;
}

function updateFx(fx: ShootEffect, dtF: number) {
  if (!fx.active) return;
  fx.ring += 2.2*dtF; fx.alpha -= 0.08*dtF;
  if (fx.alpha <= 0) { fx.active = false; fx.alpha = 0; fx.ring = 0; }
}

function clampField(p: PlayerState) {
  const r = p.radius;
  if (p.x - r < FIELD_LEFT)   { p.x = FIELD_LEFT + r;   if (p.vx < 0) p.vx = 0; }
  if (p.x + r > FIELD_RIGHT)  { p.x = FIELD_RIGHT - r;  if (p.vx > 0) p.vx = 0; }
  if (p.y - r < FIELD_TOP)    { p.y = FIELD_TOP + r;    if (p.vy < 0) p.vy = 0; }
  if (p.y + r > FIELD_BOTTOM) { p.y = FIELD_BOTTOM - r; if (p.vy > 0) p.vy = 0; }
}

function bounceBall(ball: BallState) {
  const r = ball.radius;
  if (ball.y - r < FIELD_TOP)    { ball.y = FIELD_TOP + r;    ball.vy =  Math.abs(ball.vy)*BALL_RESTITUTION; }
  if (ball.y + r > FIELD_BOTTOM) { ball.y = FIELD_BOTTOM - r; ball.vy = -Math.abs(ball.vy)*BALL_RESTITUTION; }
  const inGoalY = ball.y > GOAL_TOP && ball.y < GOAL_BOTTOM;
  if (ball.x - r < FIELD_LEFT) {
    if (inGoalY) { const bk = FIELD_LEFT - GOAL_DEPTH; if (ball.x - r < bk) { ball.x = bk+r; ball.vx = Math.abs(ball.vx)*BALL_RESTITUTION; } }
    else { ball.x = FIELD_LEFT+r; ball.vx = Math.abs(ball.vx)*BALL_RESTITUTION; }
  }
  if (ball.x + r > FIELD_RIGHT) {
    if (inGoalY) { const bk = FIELD_RIGHT + GOAL_DEPTH; if (ball.x + r > bk) { ball.x = bk-r; ball.vx = -Math.abs(ball.vx)*BALL_RESTITUTION; } }
    else { ball.x = FIELD_RIGHT-r; ball.vx = -Math.abs(ball.vx)*BALL_RESTITUTION; }
  }
  for (const [px, py] of [[FIELD_LEFT,GOAL_TOP],[FIELD_LEFT,GOAL_BOTTOM],[FIELD_RIGHT,GOAL_TOP],[FIELD_RIGHT,GOAL_BOTTOM]] as [number,number][]) {
    const dx = ball.x-px, dy = ball.y-py, d = Math.sqrt(dx*dx+dy*dy), mn = r+POST_RADIUS;
    if (d < mn && d > 0) {
      const nx = dx/d, ny = dy/d;
      ball.x = px+nx*mn; ball.y = py+ny*mn;
      const dot = ball.vx*nx + ball.vy*ny;
      if (dot < 0) { ball.vx -= 2*dot*nx*BALL_RESTITUTION; ball.vy -= 2*dot*ny*BALL_RESTITUTION; }
    }
  }
}

function checkAISteal(s: GR) {
  if (s.hasBall !== "player") return;
  if (dist2(s.aiPlayer.x, s.aiPlayer.y, s.player.x, s.player.y) < STEAL_DIST) stealBall(s, "ai");
}

function checkGoal(ball: BallState): "red"|"blue"|null {
  if (!isFinite(ball.x) || !isFinite(ball.y)) return null;
  const inY = ball.y > GOAL_TOP + ball.radius && ball.y < GOAL_BOTTOM - ball.radius;
  if (!inY) return null;
  if (ball.x - ball.radius < FIELD_LEFT  - GOAL_DEPTH + 4) return "blue";
  if (ball.x + ball.radius > FIELD_RIGHT + GOAL_DEPTH - 4) return "red";
  return null;
}

// ─── Çizim ───────────────────────────────────────────────────────────────────

function drawGame(ctx: CanvasRenderingContext2D, s: GR) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bg.addColorStop(0, "#070d16"); bg.addColorStop(1, "#0b1520");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawField(ctx); drawGoals(ctx); drawFieldLines(ctx);
  if (s.shootFx.active)   drawShootRing(ctx, s.player,   s.shootFx,   "rgba(255,220,50,");
  if (s.aiShootFx.active) drawShootRing(ctx, s.aiPlayer, s.aiShootFx, "rgba(100,180,255,");
  if (s.hasBall === "player") drawPossAura(ctx, s.player,   "#e63535");
  if (s.hasBall === "ai")     drawPossAura(ctx, s.aiPlayer, "#4488ff");
  drawBall(ctx, s.ball, s.hasBall);
  drawPlayer(ctx, s.player,   s.hasBall === "player");
  drawPlayer(ctx, s.aiPlayer, s.hasBall === "ai");
  drawStaminaBar(ctx, s.player, s.stamina, s.isSprinting);
  if (s.kickCharge > 0.01) drawChargeBar(ctx, s.player, s.kickCharge);
  if (s.goalState) drawGoalCelebration(ctx, s.goalState.team, s.goalState.timer);
}

function drawField(ctx: CanvasRenderingContext2D) {
  const fw = FIELD_RIGHT - FIELD_LEFT, fh = FIELD_BOTTOM - FIELD_TOP;
  const g = ctx.createLinearGradient(FIELD_LEFT, FIELD_TOP, FIELD_LEFT, FIELD_BOTTOM);
  g.addColorStop(0,"#0f2d1a"); g.addColorStop(.5,"#122e1b"); g.addColorStop(1,"#0e2a18");
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(FIELD_LEFT, FIELD_TOP, fw, fh, 4); ctx.fill();
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i%2===0 ? "rgba(255,255,255,0.017)" : "rgba(0,0,0,0.015)";
    ctx.fillRect(FIELD_LEFT, FIELD_TOP+(fh/8)*i, fw, fh/8);
  }
}

function drawGoals(ctx: CanvasRenderingContext2D) {
  const gh = GOAL_BOTTOM - GOAL_TOP;
  ctx.fillStyle="rgba(255,50,50,.08)"; ctx.strokeStyle="#ff4444"; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.rect(FIELD_LEFT-GOAL_DEPTH,GOAL_TOP,GOAL_DEPTH,gh); ctx.fill(); ctx.stroke();
  ctx.fillStyle="rgba(50,120,255,.08)"; ctx.strokeStyle="#4488ff"; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.rect(FIELD_RIGHT,GOAL_TOP,GOAL_DEPTH,gh); ctx.fill(); ctx.stroke();
  for (const [px,py,col] of [[FIELD_LEFT,GOAL_TOP,"#ff4444"],[FIELD_LEFT,GOAL_BOTTOM,"#ff4444"],[FIELD_RIGHT,GOAL_TOP,"#4488ff"],[FIELD_RIGHT,GOAL_BOTTOM,"#4488ff"]] as [number,number,string][]) {
    ctx.beginPath(); ctx.arc(px,py,POST_RADIUS,0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
  }
  const nc=6, nr=5;
  for (let i=0;i<=nc;i++) {
    ctx.strokeStyle="rgba(255,70,70,.14)"; ctx.lineWidth=.5;
    ctx.beginPath(); ctx.moveTo(FIELD_LEFT-GOAL_DEPTH+(GOAL_DEPTH/nc)*i,GOAL_TOP); ctx.lineTo(FIELD_LEFT-GOAL_DEPTH+(GOAL_DEPTH/nc)*i,GOAL_BOTTOM); ctx.stroke();
    ctx.strokeStyle="rgba(70,120,255,.14)";
    ctx.beginPath(); ctx.moveTo(FIELD_RIGHT+(GOAL_DEPTH/nc)*i,GOAL_TOP); ctx.lineTo(FIELD_RIGHT+(GOAL_DEPTH/nc)*i,GOAL_BOTTOM); ctx.stroke();
  }
  for (let i=0;i<=nr;i++) {
    const ny=GOAL_TOP+(gh/nr)*i;
    ctx.strokeStyle="rgba(255,70,70,.14)"; ctx.lineWidth=.5;
    ctx.beginPath(); ctx.moveTo(FIELD_LEFT-GOAL_DEPTH,ny); ctx.lineTo(FIELD_LEFT,ny); ctx.stroke();
    ctx.strokeStyle="rgba(70,120,255,.14)";
    ctx.beginPath(); ctx.moveTo(FIELD_RIGHT,ny); ctx.lineTo(FIELD_RIGHT+GOAL_DEPTH,ny); ctx.stroke();
  }
}

function drawFieldLines(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle="rgba(255,255,255,.55)"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.rect(FIELD_LEFT,FIELD_TOP,FIELD_RIGHT-FIELD_LEFT,FIELD_BOTTOM-FIELD_TOP); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CENTER_X,FIELD_TOP); ctx.lineTo(CENTER_X,FIELD_BOTTOM); ctx.stroke();
  ctx.beginPath(); ctx.arc(CENTER_X,CENTER_Y,65,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(CENTER_X,CENTER_Y,4,0,Math.PI*2); ctx.fillStyle="rgba(255,255,255,.55)"; ctx.fill();
  const pw=120, ph=200;
  ctx.beginPath(); ctx.rect(FIELD_LEFT,CENTER_Y-ph/2,pw,ph); ctx.stroke();
  ctx.beginPath(); ctx.rect(FIELD_RIGHT-pw,CENTER_Y-ph/2,pw,ph); ctx.stroke();
  ctx.strokeStyle="rgba(255,255,255,.28)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.rect(FIELD_LEFT,CENTER_Y-45,50,90); ctx.stroke();
  ctx.beginPath(); ctx.rect(FIELD_RIGHT-50,CENTER_Y-45,50,90); ctx.stroke();
  ctx.beginPath(); ctx.arc(FIELD_LEFT+pw,CENTER_Y,ph*.35,-Math.PI*.5,Math.PI*.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(FIELD_RIGHT-pw,CENTER_Y,ph*.35,Math.PI*.5,Math.PI*1.5); ctx.stroke();
  for (const [cx,cy,sa] of [[FIELD_LEFT,FIELD_TOP,0],[FIELD_RIGHT,FIELD_TOP,Math.PI*.5],[FIELD_RIGHT,FIELD_BOTTOM,Math.PI],[FIELD_LEFT,FIELD_BOTTOM,Math.PI*1.5]] as [number,number,number][]) {
    ctx.strokeStyle="rgba(255,255,255,.4)"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(cx,cy,12,sa,sa+Math.PI*.5); ctx.stroke();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, ball: BallState, owner: BallOwner) {
  if (!isFinite(ball.x) || !isFinite(ball.y) || !isFinite(ball.radius)) return;
  if (owner) {
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.radius+5,0,Math.PI*2);
    ctx.fillStyle = owner==="player" ? "rgba(255,180,50,.22)" : "rgba(80,160,255,.22)"; ctx.fill();
  } else {
    const sp = Math.sqrt(ball.vx**2+ball.vy**2);
    if (sp > 1) { ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.radius+5,0,Math.PI*2); ctx.fillStyle=`rgba(200,220,255,${Math.min(.45,sp/22)})`; ctx.fill(); }
  }
  const g = ctx.createRadialGradient(ball.x-ball.radius*.3,ball.y-ball.radius*.3,1,ball.x,ball.y,ball.radius);
  g.addColorStop(0,"#ffffff"); g.addColorStop(.5,"#d8e8ff"); g.addColorStop(1,"#8899bb");
  ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.radius,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,.3)"; ctx.lineWidth=1; ctx.stroke();
  ctx.beginPath(); ctx.arc(ball.x-ball.radius*.25,ball.y-ball.radius*.3,ball.radius*.28,0,Math.PI*2);
  ctx.fillStyle="rgba(255,255,255,.5)"; ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, hasBall: boolean) {
  if (!isFinite(p.x) || !isFinite(p.y)) return;
  const isRed = p.team === "red";
  const base = isRed ? "#e63535" : "#2266ee";
  const rim  = isRed ? "#ff6666" : "#66aaff";
  const sha  = isRed ? "rgba(230,53,53,.35)" : "rgba(34,102,238,.35)";
  ctx.beginPath(); ctx.arc(p.x,p.y,p.radius+5,0,Math.PI*2); ctx.fillStyle=sha; ctx.fill();
  const g = ctx.createRadialGradient(p.x-p.radius*.3,p.y-p.radius*.3,2,p.x,p.y,p.radius);
  g.addColorStop(0,rim); g.addColorStop(1,base);
  ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  ctx.strokeStyle = hasBall ? "rgba(255,220,80,.75)" : "rgba(255,255,255,.4)";
  ctx.lineWidth = hasBall ? 2.5 : 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(p.x-p.radius*.3,p.y-p.radius*.35,p.radius*.3,0,Math.PI*2);
  ctx.fillStyle="rgba(255,255,255,.22)"; ctx.fill();
  const name     = p.name;
  const fontSize = name.length > 12 ? 8 : name.length > 9 ? 9 : name.length > 6 ? 10 : 11;
  ctx.font = `bold ${fontSize}px 'Inter',sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.fillText(name.length > 16 ? name.slice(0,15)+"…" : name, p.x, p.y);
  const tag = name.length > 16 ? name.slice(0,15)+"…" : name;
  ctx.font = "bold 10px 'Inter',sans-serif";
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.fillText(tag, p.x, p.y + p.radius + 10);
}

function drawStaminaBar(ctx: CanvasRenderingContext2D, p: PlayerState, stamina: number, sprinting: boolean) {
  if (!isFinite(p.x) || !isFinite(p.y)) return;
  const bW = p.radius*2.8, bH = 5;
  const bX = p.x - bW/2, bY = p.y + p.radius + 22;
  const ratio = stamina / STAMINA_MAX;
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.beginPath(); ctx.roundRect(bX-1,bY-1,bW+2,bH+2,3); ctx.fill();
  if (ratio > 0) {
    const hue = ratio > .5 ? 110 : ratio > .25 ? 50 : 0;
    ctx.fillStyle = sprinting ? `hsla(${hue},100%,65%,.95)` : `hsla(${hue},85%,55%,.75)`;
    ctx.beginPath(); ctx.roundRect(bX, bY, bW*ratio, bH, 2.5); ctx.fill();
  }
  if (sprinting) {
    ctx.font = "bold 9px 'Inter',sans-serif"; ctx.textAlign="center";
    ctx.fillStyle = "rgba(255,220,80,.85)"; ctx.fillText("DEPAR", p.x, bY+bH+10);
  }
}

function drawPossAura(ctx: CanvasRenderingContext2D, p: PlayerState, color: string) {
  const hex = color.replace("#","");
  const r=parseInt(hex.slice(0,2),16), g=parseInt(hex.slice(2,4),16), b=parseInt(hex.slice(4,6),16);
  const grad = ctx.createRadialGradient(p.x,p.y,p.radius,p.x,p.y,p.radius+14);
  grad.addColorStop(0,`rgba(${r},${g},${b},.35)`); grad.addColorStop(1,`rgba(${r},${g},${b},0)`);
  ctx.beginPath(); ctx.arc(p.x,p.y,p.radius+14,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
}

function drawShootRing(ctx: CanvasRenderingContext2D, p: PlayerState, fx: ShootEffect, cp: string) {
  ctx.beginPath(); ctx.arc(p.x,p.y,fx.ring,0,Math.PI*2);
  ctx.strokeStyle=`${cp}${fx.alpha.toFixed(2)})`; ctx.lineWidth=2.5; ctx.stroke();
}

function drawChargeBar(ctx: CanvasRenderingContext2D, p: PlayerState, charge: number) {
  if (!isFinite(p.x) || !isFinite(p.y)) return;

  // ── Ark şeklinde şarj göstergesi: oyuncunun etrafında dolup taşıyor ──────
  const r         = p.radius + 9;
  const startAngle = -Math.PI / 2;                       // tepeden başlar
  const endAngle   = startAngle + charge * Math.PI * 2;  // saat yönünde dolar
  const hue        = Math.round(120 - charge * 120);     // yeşil→sarı→kırmızı
  const glow       = Math.round(charge * 180);
  const alpha      = 0.55 + charge * 0.4;

  // Arka plan halkası (soluk)
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth   = 4;
  ctx.stroke();

  // Dolum arkı
  ctx.beginPath(); ctx.arc(p.x, p.y, r, startAngle, endAngle);
  ctx.strokeStyle = `hsla(${hue},100%,62%,${alpha.toFixed(2)})`;
  ctx.lineWidth   = 4;
  ctx.lineCap     = "round";
  ctx.shadowColor = `hsla(${hue},100%,65%,0.8)`;
  ctx.shadowBlur  = 8 + glow / 20;
  ctx.stroke();
  ctx.shadowBlur  = 0; ctx.lineCap = "butt";

  // Tam şarjda titreme efekti (≥0.95): köşelerde parlama noktacıkları
  if (charge >= 0.95) {
    ctx.beginPath(); ctx.arc(p.x, p.y - r, 4, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(0,100%,70%,${(charge - 0.95) * 20})`;
    ctx.shadowColor = "rgba(255,80,80,0.9)"; ctx.shadowBlur = 10;
    ctx.fill(); ctx.shadowBlur = 0;
  }

  // Metin: güç yüzdesi
  if (charge > 0.1) {
    const pct = Math.round(charge * 100);
    ctx.font = `bold 11px 'Inter',sans-serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle    = `hsla(${hue},100%,80%,0.85)`;
    ctx.fillText(`${pct}%`, p.x, p.y - r - 10);
  }
}

function drawGoalCelebration(ctx: CanvasRenderingContext2D, team: "red"|"blue", timer: number) {
  const p  = timer / GOAL_RESET_DELAY;
  const al = Math.min(p*2,1) * Math.min((1-p)*4,1);
  ctx.fillStyle=`rgba(0,0,0,${al*.55})`; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
  const sc = 1 + Math.sin((1-p)*Math.PI*4)*.04;
  const col = team==="red" ? "#ff4444" : "#4488ff";
  const lbl = team==="red" ? "KIRMIZI GOL!" : "MAVİ GOL!";
  ctx.save(); ctx.translate(CENTER_X,CENTER_Y-30); ctx.scale(sc,sc);
  ctx.font="bold 88px 'Inter',sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle=`rgba(255,255,255,${al*.12})`; ctx.fillText("GOL!",3,3);
  const alHex=Math.round(al*255).toString(16).padStart(2,"0");
  ctx.fillStyle=col.slice(0,7)+alHex; ctx.fillText("GOL!",0,0);
  ctx.font="bold 26px 'Inter',sans-serif";
  ctx.fillStyle=`rgba(255,255,255,${al*.88})`; ctx.fillText(lbl,0,70);
  ctx.restore();
}

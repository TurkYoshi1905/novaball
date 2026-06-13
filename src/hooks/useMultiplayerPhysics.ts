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
  POSSESS_DIST, POSSESS_OFFSET, STEAL_DIST,
  GOAL_RESET_DELAY, RANKED_DURATION_MS,
  Team, Score, MobileInput,
} from "../types/game";
import type { MPPlayer, MPGameState, PlayerInput, MatchSession } from "../types/game";
import {
  createGameChannel, broadcastGameState, onGameState,
  broadcastInput, onPlayerInput, onForfeit,
} from "../lib/realtime";

const FRAME_MS      = 1000 / 60;
const SYNC_MS       = 80;   // Host ~12fps durum yayını (429 önleme)
const INPUT_MS      = 50;   // Client ~20fps girdi yayını (429 önleme)
const INPUT_HBEAT   = 200;  // Delta değişmese bile 5fps heartbeat gönder

const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;
const GOAL_LEFT_X  = FIELD_LEFT  - GOAL_DEPTH;
const GOAL_RIGHT_X = FIELD_RIGHT + GOAL_DEPTH;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist2 = (ax: number, ay: number, bx: number, by: number) =>
  Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
const safe = (v: number, fb = 0) => (isFinite(v) ? v : fb);

// ─── Basit impuls çarpışma çözümleyici ───────────────────────────────────────
function resolveCircle(
  ax: number, ay: number, avx: number, avy: number, ar: number,
  bx: number, by: number, bvx: number, bvy: number, br: number,
  rest = 0.88,
) {
  const dx = ax - bx, dy = ay - by;
  const d  = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
  if (d >= ar + br) return null;
  const nx = dx / d, ny = dy / d;
  const overlap = (ar + br - d) / 2;
  const dvx = avx - bvx, dvy = avy - bvy;
  const dot = dvx * nx + dvy * ny;
  if (dot >= 0) return null;
  const imp = (1 + rest) * dot * 0.5;
  return {
    avx: safe(avx - imp * nx), avy: safe(avy - imp * ny),
    bvx: safe(bvx + imp * nx), bvy: safe(bvy + imp * ny),
    ax: safe(ax + overlap * nx, ax), ay: safe(ay + overlap * ny, ay),
    bx: safe(bx - overlap * nx, bx), by: safe(by - overlap * ny, by),
  };
}

function spawnX(team: Team): number { return team === "red" ? 300 : 900; }
function spawnY(count: number, index: number): number {
  return FIELD_TOP + (FIELD_BOTTOM - FIELD_TOP) * (index + 1) / (count + 1);
}

interface Input { dx: number; dy: number; shoot: boolean; sprint: boolean; }

interface GR {
  players:      MPPlayer[];
  ball:         { x: number; y: number; vx: number; vy: number };
  score:        Score;
  gameTimeMs:   number;
  phase:        "playing" | "goal_pause" | "finished";
  goalPauseEnd: number;
  goalCounts:   Record<string, number>;
  lastGoalTeam: Team | null;
  // Top sahipliği (possession) sistemi
  hasBall:      string | null;         // possession sahibinin username'i
  facingX:      Record<string, number>; // bakış yönü
  facingY:      Record<string, number>;
  kickCharge:   Record<string, number>; // 0..1 şarj seviyesi
  kickCd:       Record<string, number>; // frame bazlı soğuma
  prevShoot:    Record<string, boolean>;// önceki frame'de şut basılı mıydı
  inputs:       Record<string, Input>;
  lastInput:    Input;               // delta: son gönderilen girdi
  lastSync:     number;
  lastInputBc:  number;
}

interface Options {
  canvasRef:          React.RefObject<HTMLCanvasElement | null>;
  match:              MatchSession;
  localUsername:      string;
  isHost:             boolean;
  ranked:             boolean;
  mobileInputRef?:    React.RefObject<MobileInput | null>;
  onGameEnd?:         (score: Score, goalCounts: Record<string, number>, forfeit?: boolean, leaverTeam?: Team) => void;
  onOpponentForfeit?: (leaverTeam: Team, score: Score) => void;
}

// ─── Top iliştirme: oyuncunun önüne yapıştır ─────────────────────────────────
function attachBall(
  px: number, py: number, pvx: number, pvy: number,
  facX: number, facY: number,
  ball: { x: number; y: number; vx: number; vy: number },
) {
  const len = Math.sqrt(facX ** 2 + facY ** 2) || 1;
  ball.x  = safe(px + (facX / len) * POSSESS_OFFSET, px);
  ball.y  = safe(py + (facY / len) * POSSESS_OFFSET, py);
  ball.vx = pvx; ball.vy = pvy;
}

// ─── Şut: top sahipken yüz yönüne bırak ─────────────────────────────────────
function releaseKick(
  facX: number, facY: number,
  ball: { x: number; y: number; vx: number; vy: number },
  power: number,
) {
  const len = Math.sqrt(facX ** 2 + facY ** 2) || 1;
  ball.vx = (facX / len) * power;
  ball.vy = (facY / len) * power;
}

// ─── Şut: top serbest — topa doğru vur ──────────────────────────────────────
function tryKick(
  px: number, py: number, pvx: number, pvy: number,
  ball: { x: number; y: number; vx: number; vy: number },
  power: number,
) {
  const dx = ball.x - px, dy = ball.y - py;
  const d  = Math.sqrt(dx * dx + dy * dy);
  if (d < KICK_RANGE && d > 0) {
    const nx = dx / d, ny = dy / d;
    let dirX = pvx, dirY = pvy;
    const sp = Math.sqrt(dirX ** 2 + dirY ** 2);
    if (sp < 0.5) { dirX = nx; dirY = ny; } else { dirX /= sp; dirY /= sp; }
    const bx = nx * 0.6 + dirX * 0.4, by = ny * 0.6 + dirY * 0.4;
    const bl = Math.sqrt(bx * bx + by * by) || 1;
    ball.vx = (bx / bl) * power;
    ball.vy = (by / bl) * power;
  }
}

export function useMultiplayerPhysics({
  canvasRef, match, localUsername, isHost, ranked, mobileInputRef, onGameEnd, onOpponentForfeit,
}: Options) {
  const [hudScore,        setHudScore]        = useState<Score>({ red: 0, blue: 0 });
  const [hudTime,         setHudTime]         = useState(ranked ? RANKED_DURATION_MS : 0);
  const [hudPhase,        setHudPhase]        = useState<"playing" | "goal_pause" | "finished">("playing");
  const [hudLastGoalTeam, setHudLastGoalTeam] = useState<Team | null>(null);

  const grRef       = useRef<GR | null>(null);
  const keysRef     = useRef<Set<string>>(new Set());
  const rafRef      = useRef<number>(0);
  const channelRef  = useRef<ReturnType<typeof createGameChannel> | null>(null);
  const endFiredRef = useRef(false);
  const scoreRef    = useRef<Score>({ red: 0, blue: 0 });

  const buildGR = useCallback((): GR => {
    const redC  = match.redTeam.length;
    const blueC = match.blueTeam.length;
    const players: MPPlayer[] = [
      ...match.redTeam.map((m, i) => ({
        username: m.username, displayName: m.displayName,
        team: "red" as Team, teamIndex: i + 1,
        x: spawnX("red"), y: spawnY(redC, i),
        vx: 0, vy: 0, stamina: STAMINA_MAX, kickCharge: 0,
      })),
      ...match.blueTeam.map((m, i) => ({
        username: m.username, displayName: m.displayName,
        team: "blue" as Team, teamIndex: i + 1,
        x: spawnX("blue"), y: spawnY(blueC, i),
        vx: 0, vy: 0, stamina: STAMINA_MAX, kickCharge: 0,
      })),
    ];
    const inputs: Record<string, Input>    = {};
    const facingX: Record<string, number>  = {};
    const facingY: Record<string, number>  = {};
    const kickCharge: Record<string, number> = {};
    const kickCd: Record<string, number>   = {};
    const prevShoot: Record<string, boolean> = {};
    const goalCounts: Record<string, number> = {};
    for (const p of players) {
      inputs[p.username]     = { dx: 0, dy: 0, shoot: false, sprint: false };
      facingX[p.username]    = p.team === "red" ? 1 : -1;
      facingY[p.username]    = 0;
      kickCharge[p.username] = 0;
      kickCd[p.username]     = 0;
      prevShoot[p.username]  = false;
      goalCounts[p.username] = 0;
    }
    return {
      players, ball: { x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0 },
      score: { red: 0, blue: 0 },
      gameTimeMs: ranked ? RANKED_DURATION_MS : 0,
      phase: "playing", goalPauseEnd: 0, goalCounts,
      lastGoalTeam: null, hasBall: null,
      facingX, facingY, kickCharge, kickCd, prevShoot, inputs,
      lastSync: 0, lastInputBc: 0,
      lastInput: { dx: 0, dy: 0, shoot: false, sprint: false },
    };
  }, [match, ranked]);

  // ─── Konum sıfırla ────────────────────────────────────────────────────────
  const resetPositions = useCallback((gr: GR) => {
    gr.ball = { x: CENTER_X, y: CENTER_Y, vx: 0, vy: 0 };
    gr.hasBall = null;
    const redC = match.redTeam.length, blueC = match.blueTeam.length;
    for (const p of gr.players) {
      p.x = spawnX(p.team); p.y = spawnY(p.team === "red" ? redC : blueC, p.teamIndex - 1);
      p.vx = 0; p.vy = 0;
      gr.kickCharge[p.username] = 0;
      gr.kickCd[p.username] = 0;
      gr.prevShoot[p.username] = false;
    }
  }, [match]);

  // ─── Fizik adımı (yalnızca host çalıştırır) ───────────────────────────────
  const physicsStep = useCallback((gr: GR, dt: number) => {
    if (gr.phase === "goal_pause") {
      if (Date.now() >= gr.goalPauseEnd) { gr.phase = "playing"; resetPositions(gr); }
      return;
    }
    if (gr.phase === "finished") return;

    // Zamanlayıcı
    if (ranked) {
      gr.gameTimeMs = Math.max(0, gr.gameTimeMs - dt);
      if (gr.gameTimeMs <= 0) { gr.phase = "finished"; return; }
    } else {
      gr.gameTimeMs += dt;
    }

    // ── Her oyuncu için hareket + şut şarjı ──────────────────────────────
    for (const p of gr.players) {
      const inp = gr.inputs[p.username] ?? { dx: 0, dy: 0, shoot: false, sprint: false };
      const sprinting = inp.sprint && p.stamina > STAMINA_SPRINT_MIN;
      p.stamina = clamp(p.stamina + (sprinting ? -STAMINA_DRAIN : STAMINA_RECOVER), 0, STAMINA_MAX);
      const maxSpeed = PLAYER_MAX_SPEED * (sprinting ? SPRINT_SPEED_MULT : 1);
      const accel    = PLAYER_ACCEL    * (sprinting ? SPRINT_ACCEL_MULT : 1);

      p.vx += inp.dx * accel; p.vy += inp.dy * accel;
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > maxSpeed) { p.vx = p.vx / spd * maxSpeed; p.vy = p.vy / spd * maxSpeed; }
      p.vx *= PLAYER_FRICTION; p.vy *= PLAYER_FRICTION;

      // Yön güncelle (hareket ediyorsa)
      const mv = Math.sqrt(p.vx ** 2 + p.vy ** 2);
      if (mv > 0.3) { gr.facingX[p.username] = p.vx / mv; gr.facingY[p.username] = p.vy / mv; }

      // Saha sınırlarına sabitle (kale bölgesi hariç — top var orada)
      p.x = clamp(safe(p.x + p.vx), FIELD_LEFT + PLAYER_RADIUS, FIELD_RIGHT - PLAYER_RADIUS);
      p.y = clamp(safe(p.y + p.vy), FIELD_TOP  + PLAYER_RADIUS, FIELD_BOTTOM - PLAYER_RADIUS);

      // ── Şut şarjı ──────────────────────────────────────────────────────
      const cd = gr.kickCd[p.username] ?? 0;
      if (cd > 0) gr.kickCd[p.username] = cd - 1;

      if ((gr.kickCd[p.username] ?? 0) <= 0) {
        if (inp.shoot) {
          gr.kickCharge[p.username] = Math.min(1, (gr.kickCharge[p.username] ?? 0) + CHARGE_RATE);
        } else if (gr.prevShoot[p.username] && (gr.kickCharge[p.username] ?? 0) > 0.02) {
          const power = MIN_KICK_POWER + (MAX_KICK_POWER - MIN_KICK_POWER) * (gr.kickCharge[p.username] ?? 0);
          if (gr.hasBall === p.username) {
            // Sahip olarak bırakarak şut
            releaseKick(gr.facingX[p.username], gr.facingY[p.username], gr.ball, power);
            gr.hasBall = null;
          } else {
            // Serbest topa vur
            tryKick(p.x, p.y, p.vx, p.vy, gr.ball, power);
          }
          gr.kickCharge[p.username] = 0;
          gr.kickCd[p.username] = 18;
        } else if (!inp.shoot) {
          gr.kickCharge[p.username] = 0;
        }
      }
      gr.prevShoot[p.username] = inp.shoot;
      p.kickCharge = gr.kickCharge[p.username] ?? 0;
    }

    // ── Top sahipliği: sahip hareketi ve çalma ────────────────────────────
    for (const p of gr.players) {
      const inp      = gr.inputs[p.username] ?? { dx: 0, dy: 0, shoot: false, sprint: false };
      const sprinting = inp.sprint && p.stamina > STAMINA_SPRINT_MIN;

      if (gr.hasBall === p.username) {
        // Sahip topa yapıştırılır
        attachBall(p.x, p.y, p.vx, p.vy, gr.facingX[p.username], gr.facingY[p.username], gr.ball);

        // Rakip çalabilir mi? (depar + menzil + farklı takım)
        for (const opp of gr.players) {
          if (opp.team === p.team) continue;
          const oppInp = gr.inputs[opp.username] ?? { dx: 0, dy: 0, shoot: false, sprint: false };
          const oppSprinting = oppInp.sprint && opp.stamina > STAMINA_SPRINT_MIN;
          if (oppSprinting && dist2(opp.x, opp.y, p.x, p.y) < STEAL_DIST) {
            // Çalındı!
            gr.hasBall = opp.username;
            const dx = opp.x - p.x, dy = opp.y - p.y, d = Math.sqrt(dx*dx + dy*dy) || 1;
            gr.ball.vx = (dx/d) * 3.5; gr.ball.vy = (dy/d) * 3.5;
            break;
          }
        }
      } else if (!gr.hasBall) {
        // Serbest top — yakındaki yavaş topa sahip ol
        const ballSpd = Math.sqrt(gr.ball.vx ** 2 + gr.ball.vy ** 2);
        if (ballSpd < 9 && dist2(p.x, p.y, gr.ball.x, gr.ball.y) <= POSSESS_DIST) {
          gr.hasBall = p.username;
          attachBall(p.x, p.y, p.vx, p.vy, gr.facingX[p.username], gr.facingY[p.username], gr.ball);
        }
      }
    }

    // ── Oyuncu-oyuncu çarpışmaları ────────────────────────────────────────
    for (let i = 0; i < gr.players.length; i++) {
      for (let j = i + 1; j < gr.players.length; j++) {
        const a = gr.players[i], b = gr.players[j];
        const r = resolveCircle(a.x, a.y, a.vx, a.vy, PLAYER_RADIUS, b.x, b.y, b.vx, b.vy, PLAYER_RADIUS, 0.65);
        if (r) {
          a.x = r.ax; a.y = r.ay; a.vx = r.avx; a.vy = r.avy;
          b.x = r.bx; b.y = r.by; b.vx = r.bvx; b.vy = r.bvy;
        }
      }
    }

    // ── Serbest top fiziği ────────────────────────────────────────────────
    if (!gr.hasBall) {
      // Oyuncu-top çarpışmaları
      for (const p of gr.players) {
        const r = resolveCircle(p.x, p.y, p.vx, p.vy, PLAYER_RADIUS, gr.ball.x, gr.ball.y, gr.ball.vx, gr.ball.vy, BALL_RADIUS, 0.85);
        if (r) {
          p.x = r.ax; p.y = r.ay; p.vx = r.avx; p.vy = r.avy;
          gr.ball.x = r.bx; gr.ball.y = r.by; gr.ball.vx = r.bvx * 1.05; gr.ball.vy = r.bvy * 1.05;
        }
      }

      // Top sürtünmesi
      gr.ball.vx *= BALL_FRICTION; gr.ball.vy *= BALL_FRICTION;
      if (Math.abs(gr.ball.vx) < 0.02) gr.ball.vx = 0;
      if (Math.abs(gr.ball.vy) < 0.02) gr.ball.vy = 0;
      gr.ball.x = safe(gr.ball.x + gr.ball.vx);
      gr.ball.y = safe(gr.ball.y + gr.ball.vy);

      // Duvar sektirmeleri
      if (gr.ball.y - BALL_RADIUS < FIELD_TOP)    { gr.ball.y = FIELD_TOP + BALL_RADIUS;    gr.ball.vy =  Math.abs(gr.ball.vy) * BALL_RESTITUTION; }
      if (gr.ball.y + BALL_RADIUS > FIELD_BOTTOM)  { gr.ball.y = FIELD_BOTTOM - BALL_RADIUS; gr.ball.vy = -Math.abs(gr.ball.vy) * BALL_RESTITUTION; }

      // Kale direk çarpışmaları
      for (const [postX, postY] of [[FIELD_LEFT, GOAL_TOP], [FIELD_LEFT, GOAL_BOTTOM], [FIELD_RIGHT, GOAL_TOP], [FIELD_RIGHT, GOAL_BOTTOM]] as [number, number][]) {
        const dx = gr.ball.x - postX, dy = gr.ball.y - postY;
        const d  = Math.sqrt(dx*dx + dy*dy), mn = BALL_RADIUS + POST_RADIUS;
        if (d < mn && d > 0) {
          const nx = dx/d, ny = dy/d;
          gr.ball.x = postX + nx*mn; gr.ball.y = postY + ny*mn;
          const dot = gr.ball.vx*nx + gr.ball.vy*ny;
          if (dot < 0) { gr.ball.vx -= 2*dot*nx*BALL_RESTITUTION; gr.ball.vy -= 2*dot*ny*BALL_RESTITUTION; }
        }
      }

      // Sol kale (mavi atar)
      if (gr.ball.x - BALL_RADIUS < FIELD_LEFT) {
        if (gr.ball.y >= GOAL_TOP && gr.ball.y <= GOAL_BOTTOM) {
          if (gr.ball.x < GOAL_LEFT_X) {
            gr.score.blue++; gr.lastGoalTeam = "blue";
            if (gr.hasBall) gr.goalCounts[gr.hasBall] = (gr.goalCounts[gr.hasBall] ?? 0) + 1;
            gr.phase = "goal_pause"; gr.goalPauseEnd = Date.now() + GOAL_RESET_DELAY; return;
          }
        } else {
          gr.ball.x = FIELD_LEFT + BALL_RADIUS; gr.ball.vx = Math.abs(gr.ball.vx) * BALL_RESTITUTION;
        }
      }

      // Sağ kale (kırmızı atar)
      if (gr.ball.x + BALL_RADIUS > FIELD_RIGHT) {
        if (gr.ball.y >= GOAL_TOP && gr.ball.y <= GOAL_BOTTOM) {
          if (gr.ball.x > GOAL_RIGHT_X) {
            gr.score.red++; gr.lastGoalTeam = "red";
            if (gr.hasBall) gr.goalCounts[gr.hasBall] = (gr.goalCounts[gr.hasBall] ?? 0) + 1;
            gr.phase = "goal_pause"; gr.goalPauseEnd = Date.now() + GOAL_RESET_DELAY; return;
          }
        } else {
          gr.ball.x = FIELD_RIGHT - BALL_RADIUS; gr.ball.vx = -Math.abs(gr.ball.vx) * BALL_RESTITUTION;
        }
      }

      // Kale içi arka duvar
      if (gr.ball.x < GOAL_LEFT_X)  { gr.ball.x = GOAL_LEFT_X  + BALL_RADIUS; gr.ball.vx =  Math.abs(gr.ball.vx) * BALL_RESTITUTION; }
      if (gr.ball.x > GOAL_RIGHT_X) { gr.ball.x = GOAL_RIGHT_X - BALL_RADIUS; gr.ball.vx = -Math.abs(gr.ball.vx) * BALL_RESTITUTION; }
    }
  }, [ranked, resetPositions]);

  // ─── Canvas çizimi ────────────────────────────────────────────────────────
  const draw = useCallback((gr: GR, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Arka plan
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bg.addColorStop(0, "#070d16"); bg.addColorStop(1, "#0b1520");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // ── Saha ─────────────────────────────────────────────────────────────
    const fw = FIELD_RIGHT - FIELD_LEFT, fh = FIELD_BOTTOM - FIELD_TOP;
    const fieldG = ctx.createLinearGradient(FIELD_LEFT, FIELD_TOP, FIELD_LEFT, FIELD_BOTTOM);
    fieldG.addColorStop(0, "#0f2d1a"); fieldG.addColorStop(0.5, "#122e1b"); fieldG.addColorStop(1, "#0e2a18");
    ctx.fillStyle = fieldG;
    ctx.beginPath(); ctx.roundRect?.(FIELD_LEFT, FIELD_TOP, fw, fh, 4) ?? ctx.rect(FIELD_LEFT, FIELD_TOP, fw, fh); ctx.fill();
    // Çizgili zemin
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,.017)" : "rgba(0,0,0,.015)";
      ctx.fillRect(FIELD_LEFT, FIELD_TOP + (fh / 8) * i, fw, fh / 8);
    }

    // ── Saha çizgileri ────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(FIELD_LEFT, FIELD_TOP, fw, fh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CENTER_X, FIELD_TOP); ctx.lineTo(CENTER_X, FIELD_BOTTOM); ctx.stroke();
    ctx.beginPath(); ctx.arc(CENTER_X, CENTER_Y, 65, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(CENTER_X, CENTER_Y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fill();
    const pw = 120, ph = 200;
    ctx.beginPath(); ctx.rect(FIELD_LEFT, CENTER_Y - ph/2, pw, ph); ctx.stroke();
    ctx.beginPath(); ctx.rect(FIELD_RIGHT - pw, CENTER_Y - ph/2, pw, ph); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(FIELD_LEFT, CENTER_Y - 45, 50, 90); ctx.stroke();
    ctx.beginPath(); ctx.rect(FIELD_RIGHT - 50, CENTER_Y - 45, 50, 90); ctx.stroke();
    ctx.beginPath(); ctx.arc(FIELD_LEFT + pw, CENTER_Y, ph * .35, -Math.PI * .5, Math.PI * .5); ctx.stroke();
    ctx.beginPath(); ctx.arc(FIELD_RIGHT - pw, CENTER_Y, ph * .35, Math.PI * .5, Math.PI * 1.5); ctx.stroke();
    for (const [cx, cy, sa] of [[FIELD_LEFT, FIELD_TOP, 0], [FIELD_RIGHT, FIELD_TOP, Math.PI * .5], [FIELD_RIGHT, FIELD_BOTTOM, Math.PI], [FIELD_LEFT, FIELD_BOTTOM, Math.PI * 1.5]] as [number, number, number][]) {
      ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 12, sa, sa + Math.PI * .5); ctx.stroke();
    }

    // ── Kaleler ────────────────────────────────────────────────────────────
    const gh = GOAL_BOTTOM - GOAL_TOP;
    // Sol kale (mavi → kırmızı takımın kalesi)
    ctx.fillStyle = "rgba(255,50,50,.08)"; ctx.strokeStyle = "#ff4444"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.rect(FIELD_LEFT - GOAL_DEPTH, GOAL_TOP, GOAL_DEPTH, gh); ctx.fill(); ctx.stroke();
    // Sağ kale (kırmızı → mavi takımın kalesi)
    ctx.fillStyle = "rgba(50,120,255,.08)"; ctx.strokeStyle = "#4488ff"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.rect(FIELD_RIGHT, GOAL_TOP, GOAL_DEPTH, gh); ctx.fill(); ctx.stroke();
    // Kale ızgaraları
    const nc = 6, nr = 5;
    for (let i = 0; i <= nc; i++) {
      ctx.strokeStyle = "rgba(255,70,70,.14)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(FIELD_LEFT - GOAL_DEPTH + (GOAL_DEPTH/nc)*i, GOAL_TOP); ctx.lineTo(FIELD_LEFT - GOAL_DEPTH + (GOAL_DEPTH/nc)*i, GOAL_BOTTOM); ctx.stroke();
      ctx.strokeStyle = "rgba(70,120,255,.14)";
      ctx.beginPath(); ctx.moveTo(FIELD_RIGHT + (GOAL_DEPTH/nc)*i, GOAL_TOP); ctx.lineTo(FIELD_RIGHT + (GOAL_DEPTH/nc)*i, GOAL_BOTTOM); ctx.stroke();
    }
    for (let i = 0; i <= nr; i++) {
      const ny = GOAL_TOP + (gh/nr)*i;
      ctx.strokeStyle = "rgba(255,70,70,.14)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(FIELD_LEFT - GOAL_DEPTH, ny); ctx.lineTo(FIELD_LEFT, ny); ctx.stroke();
      ctx.strokeStyle = "rgba(70,120,255,.14)";
      ctx.beginPath(); ctx.moveTo(FIELD_RIGHT, ny); ctx.lineTo(FIELD_RIGHT + GOAL_DEPTH, ny); ctx.stroke();
    }
    // Direkler
    for (const [postX, postY, col] of [[FIELD_LEFT, GOAL_TOP, "#ff4444"], [FIELD_LEFT, GOAL_BOTTOM, "#ff4444"], [FIELD_RIGHT, GOAL_TOP, "#4488ff"], [FIELD_RIGHT, GOAL_BOTTOM, "#4488ff"]] as [number, number, string][]) {
      ctx.beginPath(); ctx.arc(postX, postY, POST_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // ── Top sahibinin aura'sı ──────────────────────────────────────────────
    if (gr.hasBall) {
      const holder = gr.players.find(p => p.username === gr.hasBall);
      if (holder) {
        const hc = holder.team === "red" ? "#e63535" : "#4488ff";
        const hex = hc.replace("#","");
        const r = parseInt(hex.slice(0,2),16), g2 = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
        const grad = ctx.createRadialGradient(holder.x, holder.y, PLAYER_RADIUS, holder.x, holder.y, PLAYER_RADIUS + 16);
        grad.addColorStop(0, `rgba(${r},${g2},${b},.40)`); grad.addColorStop(1, `rgba(${r},${g2},${b},0)`);
        ctx.beginPath(); ctx.arc(holder.x, holder.y, PLAYER_RADIUS + 16, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
      }
    }

    // ── Top ───────────────────────────────────────────────────────────────
    const { ball } = gr;
    if (isFinite(ball.x) && isFinite(ball.y)) {
      const holderTeam = gr.hasBall ? gr.players.find(p => p.username === gr.hasBall)?.team ?? null : null;
      if (holderTeam) {
        // Sahip rengiyle parlar
        ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_RADIUS + 5, 0, Math.PI * 2);
        ctx.fillStyle = holderTeam === "red" ? "rgba(255,180,50,.22)" : "rgba(80,160,255,.22)"; ctx.fill();
      } else {
        // Hız ışıltısı
        const ballSpd = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        if (ballSpd > 1) {
          ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_RADIUS + 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,220,255,${Math.min(.45, ballSpd / 22)})`; ctx.fill();
        }
      }
      const ballG = ctx.createRadialGradient(ball.x - BALL_RADIUS*.3, ball.y - BALL_RADIUS*.3, 1, ball.x, ball.y, BALL_RADIUS);
      ballG.addColorStop(0, "#ffffff"); ballG.addColorStop(.5, "#d8e8ff"); ballG.addColorStop(1, "#8899bb");
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ballG; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 1; ctx.stroke();
      // Parlama
      ctx.beginPath(); ctx.arc(ball.x - BALL_RADIUS*.25, ball.y - BALL_RADIUS*.3, BALL_RADIUS*.28, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.fill();
    }

    // ── Oyuncular ─────────────────────────────────────────────────────────
    for (const p of gr.players) {
      if (!isFinite(p.x) || !isFinite(p.y)) continue;
      const isLocal  = p.username === localUsername;
      const hasBall  = gr.hasBall === p.username;
      const isRed    = p.team === "red";
      const base     = isRed ? "#e63535" : "#2266ee";
      const rim      = isRed ? "#ff6666" : "#66aaff";
      const sha      = isRed ? "rgba(230,53,53,.35)" : "rgba(34,102,238,.35)";

      // Gölge halka
      ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_RADIUS + 5, 0, Math.PI * 2);
      ctx.fillStyle = sha; ctx.fill();

      // Oyuncu dairesi (radial gradient)
      const pg = ctx.createRadialGradient(p.x - PLAYER_RADIUS*.3, p.y - PLAYER_RADIUS*.3, 2, p.x, p.y, PLAYER_RADIUS);
      pg.addColorStop(0, rim); pg.addColorStop(1, base);
      ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = pg; ctx.fill();
      // Kenarlık: top varsa altın, lokal oyuncuysa beyaz, diğerleri yarı saydam
      ctx.strokeStyle = hasBall ? "rgba(255,220,80,.80)" : isLocal ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.35)";
      ctx.lineWidth   = hasBall || isLocal ? 2.5 : 1.5; ctx.stroke();
      // İç parlama
      ctx.beginPath(); ctx.arc(p.x - PLAYER_RADIUS*.3, p.y - PLAYER_RADIUS*.35, PLAYER_RADIUS*.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fill();
      // Takım numarası (daire içinde)
      ctx.font = `bold ${PLAYER_RADIUS}px Inter,sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.fillText(String(p.teamIndex), p.x, p.y);
      // Oyuncu adı (dairenin altında)
      const tag = p.displayName.length > 12 ? p.displayName.slice(0, 11) + "…" : p.displayName;
      ctx.font = "bold 10px Inter,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillStyle = isLocal ? "rgba(255,255,255,.90)" : "rgba(255,255,255,.65)";
      ctx.fillText(tag, p.x, p.y + PLAYER_RADIUS + 5);

      // ── Stamina barı ───────────────────────────────────────────────────
      const bW = PLAYER_RADIUS * 2.8, bH = 5;
      const bX = p.x - bW/2, bY = p.y + PLAYER_RADIUS + 18;
      const ratio = p.stamina / STAMINA_MAX;
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.beginPath(); ctx.roundRect?.(bX-1, bY-1, bW+2, bH+2, 3) ?? ctx.rect(bX-1, bY-1, bW+2, bH+2); ctx.fill();
      if (ratio > 0) {
        const hue = ratio > .5 ? 110 : ratio > .25 ? 50 : 0;
        const inp = gr.inputs[p.username] ?? {};
        const isSprinting = (inp as Input).sprint && p.stamina > STAMINA_SPRINT_MIN;
        ctx.fillStyle = isSprinting ? `hsla(${hue},100%,65%,.95)` : `hsla(${hue},85%,55%,.75)`;
        ctx.beginPath(); ctx.roundRect?.(bX, bY, bW*ratio, bH, 2.5) ?? ctx.rect(bX, bY, bW*ratio, bH); ctx.fill();
        if (isSprinting && isLocal) {
          ctx.font = "bold 9px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillStyle = "rgba(255,220,80,.85)"; ctx.fillText("DEPAR", p.x, bY + bH + 3);
        }
      }

      // ── Şut şarj arkı (sadece local veya host ise tüm oyuncular) ──────
      const charge = gr.kickCharge[p.username] ?? 0;
      if (charge > 0.01 && (isLocal || isHost)) {
        const r2      = PLAYER_RADIUS + 9;
        const startA  = -Math.PI / 2;
        const endA    = startA + charge * Math.PI * 2;
        const hue2    = Math.round(120 - charge * 120);
        const alpha   = 0.55 + charge * 0.4;
        // Arka halka
        ctx.beginPath(); ctx.arc(p.x, p.y, r2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 4; ctx.stroke();
        // Dolum arkı
        ctx.beginPath(); ctx.arc(p.x, p.y, r2, startA, endA);
        ctx.strokeStyle = `hsla(${hue2},100%,62%,${alpha.toFixed(2)})`;
        ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.shadowColor = `hsla(${hue2},100%,65%,0.8)`; ctx.shadowBlur = 8 + Math.round(charge * 9);
        ctx.stroke(); ctx.shadowBlur = 0; ctx.lineCap = "butt";
        // Güç yüzdesi metni
        if (charge > 0.1) {
          const pct = Math.round(charge * 100);
          ctx.font = "bold 11px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = `hsla(${hue2},100%,80%,0.85)`;
          ctx.fillText(`${pct}%`, p.x, p.y - r2 - 10);
        }
      }
    }
  }, [localUsername, isHost]);

  // ─── Ana döngü ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gr = buildGR();
    grRef.current = gr;
    endFiredRef.current = false;

    const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.code);
    const onKeyUp   = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);

    const ch = createGameChannel(match.channelId);
    channelRef.current = ch;

    if (isHost) {
      onPlayerInput(ch, inp => {
        if (grRef.current) {
          grRef.current.inputs[inp.username] = {
            dx: inp.dx, dy: inp.dy, shoot: inp.shoot, sprint: inp.sprint,
          };
        }
      });
    } else {
      // Client: host'tan gelen yetkili durumu tüm oyuncular için uygula (lokal dahil).
      // Bu, misafir oyuncunun host ekranında görünmemesi sorununu çözer.
      onGameState(ch, state => {
        const g = grRef.current; if (!g) return;
        g.ball       = { ...state.ball };
        g.score      = { ...state.score };
        g.gameTimeMs = state.gameTimeMs;
        g.hasBall    = state.hasBallUsername ?? null;
        if (state.lastGoalTeam) g.lastGoalTeam = state.lastGoalTeam;
        if (state.goalCounts) g.goalCounts = { ...state.goalCounts };
        if (state.phase === "finished" && g.phase !== "finished") {
          g.phase = "finished"; setHudPhase("finished");
        } else if (g.phase !== "finished") {
          g.phase = state.phase === "goal_pause" ? "goal_pause" : "playing";
        }
        // Tüm oyuncuları güncelle — lokal oyuncu dahil (host yetkili kaynaktır).
        for (const sp of state.players) {
          const lp = g.players.find(p => p.username === sp.username);
          if (lp) {
            lp.x = sp.x; lp.y = sp.y; lp.vx = sp.vx; lp.vy = sp.vy;
            lp.stamina = sp.stamina; lp.kickCharge = sp.kickCharge;
            g.kickCharge[sp.username] = sp.kickCharge;
          }
        }
      });
    }

    onForfeit(ch, payload => {
      if (endFiredRef.current) return;
      if (payload.leaverUsername === localUsername) return;
      onOpponentForfeit?.(payload.leaverTeam, payload.currentScore);
    });

    ch.subscribe();

    let lastTs = 0;
    const loop = (ts: number) => {
      const g = grRef.current;
      if (!g) { rafRef.current = requestAnimationFrame(loop); return; }
      if (lastTs === 0) lastTs = ts;
      const dt = ts - lastTs;
      if (dt < FRAME_MS - 2) { rafRef.current = requestAnimationFrame(loop); return; }
      lastTs = ts;

      // Lokal girdi oku
      const keys = keysRef.current;
      const mob  = mobileInputRef?.current;
      const dx     = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + (mob?.dx ?? 0);
      const dy     = (keys.has("KeyS") || keys.has("ArrowDown")  ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp")   ? 1 : 0) + (mob?.dy ?? 0);
      const shoot  = keys.has("Space") || keys.has("KeyX") || (mob?.shoot ?? false);
      const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") || (mob?.sprint ?? false);
      g.inputs[localUsername] = { dx: clamp(dx, -1, 1), dy: clamp(dy, -1, 1), shoot, sprint };

      if (isHost) {
        // Host: fiziği çalıştır ve durumu yayınla
        physicsStep(g, dt);
        const now = Date.now();
        if (now - g.lastSync >= SYNC_MS) {
          g.lastSync = now;
          const state: MPGameState = {
            players:         g.players.map(p => ({ ...p })),
            ball:            { ...g.ball },
            score:           { ...g.score },
            gameTimeMs:      g.gameTimeMs,
            phase:           g.phase,
            lastGoalTeam:    g.lastGoalTeam ?? undefined,
            hasBallUsername: g.hasBall,
            goalCounts:      { ...g.goalCounts },
          };
          broadcastGameState(ch, state);
        }
      } else {
        // Client: istemci-tarafı tahmin — yerel girdiyi anında uygula (60 FPS akıcı hareket).
        // Host durumu geldiğinde tüm konumlar üzerine yazılır (reconciliation).
        physicsStep(g, dt);
        const now = Date.now();
        const curDx = clamp(g.inputs[localUsername]?.dx ?? 0, -1, 1);
        const curDy = clamp(g.inputs[localUsername]?.dy ?? 0, -1, 1);
        const last  = g.lastInput;
        // Delta encoding: girdi değiştiyse hemen gönder, yoksa INPUT_HBEAT (200ms) heartbeat
        const inputChanged = last.dx !== curDx || last.dy !== curDy ||
                             last.shoot !== shoot || last.sprint !== sprint;
        const heartbeat    = now - g.lastInputBc >= INPUT_HBEAT;
        if ((inputChanged && now - g.lastInputBc >= INPUT_MS) || heartbeat) {
          g.lastInputBc = now;
          g.lastInput   = { dx: curDx, dy: curDy, shoot, sprint };
          const inp: PlayerInput = {
            username: localUsername, dx: curDx, dy: curDy,
            shoot, sprint, ts: now,
          };
          broadcastInput(ch, inp);
        }
      }

      // HUD güncelle
      setHudScore({ ...g.score });
      scoreRef.current = g.score;
      setHudTime(g.gameTimeMs);
      if      (g.phase === "finished")   setHudPhase("finished");
      else if (g.phase === "goal_pause") setHudPhase("goal_pause");
      else                               setHudPhase("playing");
      setHudLastGoalTeam(g.lastGoalTeam);

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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
      ch.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    score:        hudScore,
    gameTimeMs:   hudTime,
    phase:        hudPhase,
    lastGoalTeam: hudLastGoalTeam,
    scoreRef,
  };
}

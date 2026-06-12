export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 675;

export const FIELD_LEFT = 65;
export const FIELD_RIGHT = 1135;
export const FIELD_TOP = 45;
export const FIELD_BOTTOM = 630;

export const GOAL_HEIGHT = 150;
export const GOAL_DEPTH = 50;
export const GOAL_TOP = (CANVAS_HEIGHT - GOAL_HEIGHT) / 2;
export const GOAL_BOTTOM = GOAL_TOP + GOAL_HEIGHT;
export const POST_RADIUS = 7;

export const PLAYER_RADIUS = 22;
export const BALL_RADIUS = 13;

export const PLAYER_ACCEL = 0.58;
export const PLAYER_MAX_SPEED = 4.8;
export const PLAYER_FRICTION = 0.86;

export const BALL_FRICTION = 0.980;
export const BALL_RESTITUTION = 0.72;
export const KICK_POWER = 14;          // AI ve direkt çarpışma için
export const KICK_RANGE = 58;

// Güç barı: basılı tut → şarj → bırak → şut
export const CHARGE_RATE     = 0.022;  // frame başına dolma (45 frame = ~0.75s tam dolu)
export const MIN_KICK_POWER  = 5;      // minimum şut gücü (hafif dokunuş)
export const MAX_KICK_POWER  = 15;     // maksimum şut gücü (tam şarj)

export const AI_ACCEL = 0.38;
export const AI_MAX_SPEED = 3.0;
export const AI_KICK_RANGE = 52;
export const AI_KICK_POWER = 11;

export const GOAL_RESET_DELAY = 2500;

export const SPRINT_SPEED_MULT   = 1.75;
export const SPRINT_ACCEL_MULT   = 1.55;
export const STAMINA_MAX         = 100;
export const STAMINA_DRAIN       = 0.62;
export const STAMINA_RECOVER     = 0.28;
export const STAMINA_SPRINT_MIN  = 15;

export const POSSESS_DIST        = PLAYER_RADIUS + BALL_RADIUS + 4;
export const POSSESS_OFFSET      = PLAYER_RADIUS + BALL_RADIUS - 1;
export const STEAL_DIST          = PLAYER_RADIUS * 2 + BALL_RADIUS + 6;

export const RANKED_DURATION_MS  = 90_000;

export const FOUNDING_DATE = "11 Haziran 2026";

export interface Vector2 {
  x: number;
  y: number;
}

export interface EntityState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export type Team = "red" | "blue";

export interface PlayerState extends EntityState {
  name: string;
  team: Team;
}

export interface BallState extends EntityState {}

export interface ShootEffect {
  active: boolean;
  alpha: number;
  ring: number;
}

export interface Score {
  red: number;
  blue: number;
}

export interface MatchResultData {
  playerGoals: number;
  aiGoals: number;
  won: boolean;
  drew: boolean;
  rpGained: number;
  prevRP: number;
  newRP: number;
  rankChanged: boolean;
  prevRankName: string;
  newRankName: string;
}

export type AppScreen =
  | "login"
  | "register"
  | "email-verify"
  | "menu"
  | "rankpage"
  | "changelog"
  | "playing"
  | "ranked"
  | "result"
  | "leaderboard"
  | "profile";

export type BallOwner = "player" | "ai" | null;

export interface MobileInput {
  dx: number;
  dy: number;
  shoot: boolean;
  sprint: boolean;
}

export function createMobileInput(): MobileInput {
  return { dx: 0, dy: 0, shoot: false, sprint: false };
}

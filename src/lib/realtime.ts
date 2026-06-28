import { supabase } from "./supabase";
import type { MPGameState, PlayerInput, ChatMessage, Team } from "../types/game";

type RealtimeChannel = ReturnType<typeof supabase.channel>;

// ─── Channel Factory ──────────────────────────────────────────────────────────

export function createGameChannel(channelId: string): RealtimeChannel {
  return supabase.channel(channelId, {
    config: { broadcast: { self: false }, presence: { key: "" } },
  });
}

// ─── Game State Broadcast ─────────────────────────────────────────────────────

export function broadcastGameState(
  channel: RealtimeChannel,
  state: MPGameState
): void {
  channel.send({ type: "broadcast", event: "game_state", payload: state });
}

export function onGameState(
  channel: RealtimeChannel,
  cb: (state: MPGameState) => void
): RealtimeChannel {
  return channel.on("broadcast", { event: "game_state" }, ({ payload }) => {
    cb(payload as MPGameState);
  });
}

// ─── Player Input Broadcast ───────────────────────────────────────────────────

export function broadcastInput(
  channel: RealtimeChannel,
  input: PlayerInput
): void {
  channel.send({ type: "broadcast", event: "player_input", payload: input });
}

export function onPlayerInput(
  channel: RealtimeChannel,
  cb: (input: PlayerInput) => void
): RealtimeChannel {
  return channel.on("broadcast", { event: "player_input" }, ({ payload }) => {
    cb(payload as PlayerInput);
  });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export function broadcastChat(
  channel: RealtimeChannel,
  msg: ChatMessage
): void {
  channel.send({ type: "broadcast", event: "chat", payload: msg });
}

export function onChat(
  channel: RealtimeChannel,
  cb: (msg: ChatMessage) => void
): RealtimeChannel {
  return channel.on("broadcast", { event: "chat" }, ({ payload }) => {
    cb(payload as ChatMessage);
  });
}

// ─── Forfeit (Maçı Terk) ──────────────────────────────────────────────────────

export interface ForfeitPayload {
  leaverUsername: string;
  leaverTeam: Team;
  currentScore: { red: number; blue: number };
}

export function broadcastForfeit(
  channel: RealtimeChannel,
  payload: ForfeitPayload
): void {
  channel.send({ type: "broadcast", event: "player_forfeit", payload });
}

export function onForfeit(
  channel: RealtimeChannel,
  cb: (payload: ForfeitPayload) => void
): RealtimeChannel {
  return channel.on("broadcast", { event: "player_forfeit" }, ({ payload }) => {
    cb(payload as ForfeitPayload);
  });
}

// ─── System Events ────────────────────────────────────────────────────────────

export function broadcastSystemEvent(
  channel: RealtimeChannel,
  event: "match_start" | "match_end" | "goal",
  payload: Record<string, unknown>
): void {
  channel.send({ type: "broadcast", event, payload });
}

export function onSystemEvent(
  channel: RealtimeChannel,
  event: "match_start" | "match_end" | "goal",
  cb: (payload: Record<string, unknown>) => void
): RealtimeChannel {
  return channel.on("broadcast", { event }, ({ payload }) => {
    cb(payload as Record<string, unknown>);
  });
}

// ─── Spectator Events ─────────────────────────────────────────────────────────

export interface SpectatorPayload {
  username:    string;
  displayName: string;
  action:      "join" | "leave";
}

export function broadcastSpectator(
  channel: RealtimeChannel,
  payload: SpectatorPayload
): void {
  channel.send({ type: "broadcast", event: "spectator_event", payload });
}

export function onSpectatorEvent(
  channel: RealtimeChannel,
  cb: (payload: SpectatorPayload) => void
): RealtimeChannel {
  return channel.on("broadcast", { event: "spectator_event" }, ({ payload }) => {
    cb(payload as SpectatorPayload);
  });
}

// ─── Presence (oyuncu sayısı) ─────────────────────────────────────────────────

export function trackPresence(
  channel: RealtimeChannel,
  username: string,
  displayName: string,
  team: "red" | "blue"
): void {
  channel.track({ username, displayName, team, online_at: new Date().toISOString() });
}

export function onPresenceSync(
  channel: RealtimeChannel,
  cb: (users: Array<{ username: string; displayName: string; team: string }>) => void
): RealtimeChannel {
  return channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState<{ username: string; displayName: string; team: string }>();
    const users = Object.values(state).flat();
    cb(users);
  });
}

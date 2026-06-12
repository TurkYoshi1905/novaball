import { supabase } from "./supabase";

export interface PlayerRow {
  username: string;
  display_name: string;
  email?: string;
  rp: number;
  total_matches: number;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  total_goals_scored: number;
  total_goals_conceded: number;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface MatchRow {
  id: string;
  player_username: string;
  opponent_name: string;
  player_goals: number;
  opponent_goals: number;
  result: "win" | "loss" | "draw";
  rp_gained: number;
  rp_before: number;
  rp_after: number;
  ranked: boolean;
  played_at: string;
}

const PUBLIC_COLS =
  "username,display_name,rp,total_matches,total_wins,total_losses,total_draws,total_goals_scored,total_goals_conceded,last_seen,created_at,updated_at";

// ─── Auth helpers ──────────────────────────────────────────────────────────────

export async function ensureAuth(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
    const { data } = await supabase.auth.signInAnonymously();
    return data.user?.id ?? null;
  } catch { return null; }
}

// ─── Username / player lookup ──────────────────────────────────────────────────

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase
    .from("players")
    .select("username")
    .eq("username", username)
    .maybeSingle();
  return !data;
}

/**
 * Returns the email stored for a given username (used for username-based login).
 */
export async function findEmailByUsername(username: string): Promise<string | null> {
  const { data } = await supabase
    .rpc("get_email_by_username", { p_username: username });
  return (data as string | null) ?? null;
}

export async function getPlayerByAuthId(authId: string): Promise<PlayerRow | null> {
  const { data } = await supabase
    .from("players")
    .select(PUBLIC_COLS)
    .eq("auth_id", authId)
    .maybeSingle();
  return data as PlayerRow | null;
}

// ─── Create / init ─────────────────────────────────────────────────────────────

export async function createPlayer(
  username: string,
  displayName: string,
  email: string,
  authId: string,
): Promise<void> {
  await supabase.from("players").insert({
    username,
    display_name: displayName,
    email,
    auth_id: authId,
    rp: 0,
    total_matches: 0,
    total_wins: 0,
    total_losses: 0,
    total_draws: 0,
    total_goals_scored: 0,
    total_goals_conceded: 0,
  });
}

/** Legacy: anonymous login migration. Creates player if missing. */
export async function initPlayer(username: string, localRP: number): Promise<number> {
  const authId = await ensureAuth();
  const { data } = await supabase
    .from("players")
    .select("rp, auth_id")
    .eq("username", username)
    .maybeSingle();

  if (!data) {
    await supabase.from("players").insert({
      username, display_name: username, auth_id: authId,
      rp: localRP, total_matches: 0, total_wins: 0,
      total_losses: 0, total_draws: 0,
      total_goals_scored: 0, total_goals_conceded: 0,
    });
    return localRP;
  }
  const serverRP = data.rp as number;
  if (!data.auth_id && authId) {
    await supabase.from("players").update({ auth_id: authId, rp: Math.max(localRP, serverRP) }).eq("username", username).is("auth_id", null);
  } else if (localRP > serverRP) {
    await supabase.from("players").update({ rp: localRP }).eq("username", username);
    return localRP;
  }
  return Math.max(localRP, serverRP);
}

// ─── Last seen ─────────────────────────────────────────────────────────────────

export async function updateLastSeen(username: string): Promise<void> {
  await supabase.from("players").update({ last_seen: new Date().toISOString() }).eq("username", username);
}

// ─── Match ─────────────────────────────────────────────────────────────────────

export async function saveMatch(params: {
  username: string;
  opponentName: string;
  playerGoals: number;
  opponentGoals: number;
  result: "win" | "loss" | "draw";
  rpGained: number;
  rpBefore: number;
  rpAfter: number;
  ranked: boolean;
}): Promise<void> {
  const { username, opponentName, playerGoals, opponentGoals, result, rpGained, rpBefore, rpAfter, ranked } = params;

  await supabase.from("match_history").insert({
    player_username: username, opponent_name: opponentName,
    player_goals: playerGoals, opponent_goals: opponentGoals,
    result, rp_gained: rpGained, rp_before: rpBefore, rp_after: rpAfter, ranked,
  });

  const { data: cur } = await supabase
    .from("players")
    .select("total_matches,total_wins,total_losses,total_draws,total_goals_scored,total_goals_conceded")
    .eq("username", username).maybeSingle();

  if (cur) {
    await supabase.from("players").update({
      rp: rpAfter,
      total_matches:        cur.total_matches + 1,
      total_wins:           cur.total_wins    + (result === "win"  ? 1 : 0),
      total_losses:         cur.total_losses  + (result === "loss" ? 1 : 0),
      total_draws:          cur.total_draws   + (result === "draw" ? 1 : 0),
      total_goals_scored:   cur.total_goals_scored   + playerGoals,
      total_goals_conceded: cur.total_goals_conceded + opponentGoals,
    }).eq("username", username);
  }
}

// ─── Queries ───────────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<PlayerRow[]> {
  const { data } = await supabase
    .from("players")
    .select(PUBLIC_COLS)
    .order("rp", { ascending: false })
    .limit(100);
  return (data ?? []) as PlayerRow[];
}

export async function getPlayer(username: string): Promise<PlayerRow | null> {
  const { data } = await supabase
    .from("players")
    .select(PUBLIC_COLS)
    .eq("username", username)
    .maybeSingle();
  return data as PlayerRow | null;
}

export async function getMatchHistory(username: string, limit = 30): Promise<MatchRow[]> {
  const { data } = await supabase
    .from("match_history")
    .select("*")
    .eq("player_username", username)
    .order("played_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as MatchRow[];
}

// ─── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeLeaderboard(onUpdate: () => void): () => void {
  const channel = supabase
    .channel("leaderboard-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "players" }, onUpdate)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeMatchHistory(username: string, onUpdate: () => void): () => void {
  const channel = supabase
    .channel(`match-history-${username}`)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "match_history",
      filter: `player_username=eq.${username}`,
    }, onUpdate)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

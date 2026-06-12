import { supabase } from "./supabase";

export interface PlayerRow {
  username: string;
  rp: number;
  total_matches: number;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  total_goals_scored: number;
  total_goals_conceded: number;
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

export async function initPlayer(username: string, localRP: number): Promise<number> {
  const { data } = await supabase
    .from("players")
    .select("rp")
    .eq("username", username)
    .maybeSingle();

  if (!data) {
    await supabase.from("players").insert({
      username,
      rp: localRP,
      total_matches: 0,
      total_wins: 0,
      total_losses: 0,
      total_draws: 0,
      total_goals_scored: 0,
      total_goals_conceded: 0,
    });
    return localRP;
  }
  const serverRP = data.rp as number;
  if (localRP > serverRP) {
    await supabase.from("players").update({ rp: localRP }).eq("username", username);
    return localRP;
  }
  return serverRP;
}

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
    player_username: username,
    opponent_name: opponentName,
    player_goals: playerGoals,
    opponent_goals: opponentGoals,
    result,
    rp_gained: rpGained,
    rp_before: rpBefore,
    rp_after: rpAfter,
    ranked,
  });

  const { data: cur } = await supabase
    .from("players")
    .select("total_matches,total_wins,total_losses,total_draws,total_goals_scored,total_goals_conceded")
    .eq("username", username)
    .maybeSingle();

  if (cur) {
    await supabase.from("players").update({
      rp: rpAfter,
      total_matches:       cur.total_matches + 1,
      total_wins:          cur.total_wins    + (result === "win"  ? 1 : 0),
      total_losses:        cur.total_losses  + (result === "loss" ? 1 : 0),
      total_draws:         cur.total_draws   + (result === "draw" ? 1 : 0),
      total_goals_scored:  cur.total_goals_scored  + playerGoals,
      total_goals_conceded:cur.total_goals_conceded + opponentGoals,
    }).eq("username", username);
  }
}

export async function getLeaderboard(): Promise<PlayerRow[]> {
  const { data } = await supabase
    .from("players")
    .select("*")
    .order("rp", { ascending: false })
    .limit(100);
  return (data ?? []) as PlayerRow[];
}

export async function getPlayer(username: string): Promise<PlayerRow | null> {
  const { data } = await supabase
    .from("players")
    .select("*")
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

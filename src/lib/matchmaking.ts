import { supabase } from "./supabase";
import type { GameMode, TeamMember, MatchSession, CustomRoom, RoomStatus, modeFromMaxPlayers } from "../types/game";
import { modeFromMaxPlayers as modeFromMax } from "../types/game";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uuid(): string {
  return crypto.randomUUID();
}

// ─── Matchmaking Queue ────────────────────────────────────────────────────────

export async function joinQueue(
  username: string,
  displayName: string,
  mode: GameMode
): Promise<{ error: string | null }> {
  await supabase
    .from("matchmaking_queue")
    .delete()
    .eq("username", username);

  const { error } = await supabase.from("matchmaking_queue").insert({
    username,
    display_name: displayName,
    game_mode: mode,
    status: "searching",
  });
  return { error: error?.message ?? null };
}

export async function leaveQueue(username: string): Promise<void> {
  await supabase.from("matchmaking_queue").delete().eq("username", username);
}

export interface QueueEntry {
  username: string;
  display_name: string;
  game_mode: GameMode;
  joined_at: string;
  match_id: string | null;
  status: string;
}

export async function getQueueEntries(mode: GameMode): Promise<QueueEntry[]> {
  const { data } = await supabase
    .from("matchmaking_queue")
    .select("*")
    .eq("game_mode", mode)
    .eq("status", "searching")
    .order("joined_at", { ascending: true });
  return (data ?? []) as QueueEntry[];
}

export async function getMyQueueEntry(username: string): Promise<QueueEntry | null> {
  const { data } = await supabase
    .from("matchmaking_queue")
    .select("*")
    .eq("username", username)
    .single();
  return (data as QueueEntry) ?? null;
}

// ─── Active Matches ────────────────────────────────────────────────────────────

export async function createMatch(
  mode: GameMode,
  hostUsername: string,
  redTeam: TeamMember[],
  blueTeam: TeamMember[],
  ranked = true
): Promise<{ match: MatchSession | null; error: string | null }> {
  const id = uuid();
  const channelId = `match-${id}`;

  const { data, error } = await supabase
    .from("active_matches")
    .insert({
      id,
      mode,
      host_username: hostUsername,
      red_team: redTeam,
      blue_team: blueTeam,
      status: "starting",
      channel_id: channelId,
      ranked,
    })
    .select()
    .single();

  if (error || !data) return { match: null, error: error?.message ?? "Bilinmeyen hata" };

  const match: MatchSession = {
    id: data.id,
    mode: data.mode,
    channelId: data.channel_id,
    hostUsername: data.host_username,
    redTeam: data.red_team,
    blueTeam: data.blue_team,
    status: data.status,
    createdAt: data.created_at,
    ranked: data.ranked ?? ranked,
  };
  return { match, error: null };
}

export async function markQueueMatched(usernames: string[], matchId: string): Promise<void> {
  await supabase
    .from("matchmaking_queue")
    .update({ status: "matched", match_id: matchId })
    .in("username", usernames);
}

export async function getMatch(matchId: string): Promise<MatchSession | null> {
  const { data } = await supabase
    .from("active_matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    mode: data.mode,
    channelId: data.channel_id,
    hostUsername: data.host_username,
    redTeam: data.red_team,
    blueTeam: data.blue_team,
    status: data.status,
    createdAt: data.created_at,
    ranked: data.ranked ?? true,
  };
}

export async function updateMatchStatus(matchId: string, status: RoomStatus): Promise<void> {
  await supabase.from("active_matches").update({ status }).eq("id", matchId);
}

// ─── Custom Rooms ─────────────────────────────────────────────────────────────

function rowToRoom(data: Record<string, unknown>): CustomRoom {
  return {
    id:           data.id as string,
    name:         data.name as string,
    hostUsername: data.host_username as string,
    maxPlayers:   data.max_players as number,
    redTeam:      (data.red_team as TeamMember[]) ?? [],
    blueTeam:     (data.blue_team as TeamMember[]) ?? [],
    status:       data.status as RoomStatus,
    channelId:    data.channel_id as string,
    createdAt:    data.created_at as string,
    ranked:       false,
  };
}

export async function createRoom(
  name: string,
  hostUsername: string,
  hostDisplayName: string,
  maxPlayers: number
): Promise<{ room: CustomRoom | null; error: string | null }> {
  const id = uuid();
  const { data, error } = await supabase
    .from("custom_rooms")
    .insert({
      id,
      name,
      host_username: hostUsername,
      max_players: maxPlayers,
      red_team:  [{ username: hostUsername, displayName: hostDisplayName }],
      blue_team: [],
      status: "waiting",
      channel_id: `room-${id}`,
    })
    .select()
    .single();

  if (error || !data) return { room: null, error: error?.message ?? "Oda oluşturulamadı" };
  return { room: rowToRoom(data as Record<string, unknown>), error: null };
}

export async function listRooms(): Promise<CustomRoom[]> {
  const { data } = await supabase
    .from("custom_rooms")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map(rowToRoom);
}

export async function getRoom(roomId: string): Promise<CustomRoom | null> {
  const { data } = await supabase
    .from("custom_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  return data ? rowToRoom(data as Record<string, unknown>) : null;
}

export async function joinRoomTeam(
  roomId: string,
  member: TeamMember,
  team: "red" | "blue"
): Promise<{ room: CustomRoom | null; error: string | null }> {
  // SECURITY DEFINER RPC — doğrudan tablo UPDATE yerine sunucu tarafı doğrulama
  const { data, error } = await supabase.rpc("room_join_team", {
    p_room_id:      roomId,
    p_username:     member.username,
    p_display_name: member.displayName,
    p_team:         team,
  });
  if (error) return { room: null, error: error.message };
  // RPC güncel takımları döndürür; tam oda verisini yeniden çek
  const room = await getRoom(roomId);
  if (!room) return { room: null, error: "Oda bulunamadı" };
  // RPC'den dönen değerle takımları eşitle
  const updated: CustomRoom = {
    ...room,
    redTeam:  (data?.red_team  as TeamMember[]) ?? room.redTeam,
    blueTeam: (data?.blue_team as TeamMember[]) ?? room.blueTeam,
  };
  return { room: updated, error: null };
}

export async function leaveRoom(roomId: string, username: string): Promise<void> {
  // SECURITY DEFINER RPC — host ayrılırsa oda silinir, değilse takımdan çıkarılır
  await supabase.rpc("room_leave", {
    p_room_id:  roomId,
    p_username: username,
  });
}

export async function startRoom(roomId: string, hostUsername: string): Promise<void> {
  // SECURITY DEFINER RPC — yalnızca host başlatabilir
  await supabase.rpc("room_start", {
    p_room_id:  roomId,
    p_username: hostUsername,
  });
}

export function subscribeToRooms(
  onUpdate: (rooms: CustomRoom[]) => void
) {
  return supabase
    .channel("custom_rooms_realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "custom_rooms" }, async () => {
      const rooms = await listRooms();
      onUpdate(rooms);
    })
    .subscribe();
}

export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: CustomRoom | null) => void
) {
  return supabase
    .channel(`room_detail_${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "custom_rooms", filter: `id=eq.${roomId}` },
      async () => {
        const room = await getRoom(roomId);
        onUpdate(room);
      }
    )
    .subscribe();
}

export function subscribeToQueue(
  mode: GameMode,
  onUpdate: (entries: QueueEntry[]) => void,
  onMatchReady?: (match: MatchSession) => void
) {
  const ch = supabase.channel(`queue_${mode}`);
  ch.on("postgres_changes", { event: "*", schema: "public", table: "matchmaking_queue" }, async () => {
    const entries = await getQueueEntries(mode);
    onUpdate(entries);
  });
  if (onMatchReady) {
    ch.on("broadcast", { event: "match_ready" }, ({ payload }) => {
      onMatchReady(payload.match as MatchSession);
    });
  }
  ch.subscribe();
  return ch;
}

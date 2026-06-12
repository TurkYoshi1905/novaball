import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { signOut } from "./lib/auth";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import EmailVerifyPage from "./components/auth/EmailVerifyPage";
import MainMenu from "./components/MainMenu";
import GameBoard from "./components/GameBoard";
import RankPage from "./components/RankPage";
import ChangelogPage from "./components/ChangelogPage";
import MatchResult from "./components/MatchResult";
import ProfilePage from "./components/ProfilePage";
import LeaderboardPage from "./components/LeaderboardPage";
import ModSelectPage from "./components/ModSelectPage";
import MatchmakingPage from "./components/MatchmakingPage";
import CustomRoomsPage from "./components/CustomRoomsPage";
import CreateRoomPage from "./components/CreateRoomPage";
import RoomLobbyPage from "./components/RoomLobbyPage";
import MatchIntroPage from "./components/MatchIntroPage";
import MultiplayerBoard from "./components/MultiplayerBoard";
import MultiplayerResult from "./components/MultiplayerResult";
import type { AppScreen, MatchResultData, GameMode, MatchSession, CustomRoom, MPResult } from "./types/game";
import { loadRP, saveRP, getRankForRP, calcRPForWin } from "./utils/rankSystem";
import { getPlayerByAuthId, updateLastSeen, saveMatch } from "./lib/db";

export default function App() {
  const [screen,        setScreen]       = useState<AppScreen>("login");
  const [username,      setUsername]     = useState("");
  const [displayName,   setDisplayName]  = useState("");
  const [pendingEmail,  setPendingEmail] = useState("");
  const [matchResult,   setMatchResult]  = useState<MatchResultData | null>(null);
  const [mpResult,      setMpResult]     = useState<MPResult | null>(null);
  const [viewingUser,   setViewingUser]  = useState("");
  const [prevScreen,    setPrevScreen]   = useState<AppScreen>("menu");
  const [selectedMode,  setSelectedMode] = useState<GameMode>("1v1");
  const [currentMatch,  setCurrentMatch] = useState<MatchSession | null>(null);
  const [currentRoom,   setCurrentRoom]  = useState<CustomRoom | null>(null);
  const [isHost,        setIsHost]       = useState(false);
  const lastSeenTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load player after successful auth ────────────────────────────────────
  const loadPlayer = useCallback(async (authId: string) => {
    const player = await getPlayerByAuthId(authId);
    if (!player) return;
    const serverRP = player.rp;
    const localRP  = loadRP();
    if (serverRP > localRP) saveRP(serverRP);
    setUsername(player.username);
    setDisplayName(player.display_name || player.username);
    updateLastSeen(player.username).catch(() => {});
    setScreen("menu");
  }, []);

  // ─── Auth state machine ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setScreen("login"); return; }
      if (!session.user.email_confirmed_at) {
        setPendingEmail(session.user.email ?? "");
        setScreen("email-verify");
        return;
      }
      loadPlayer(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) { setScreen("login"); return; }
      if (!session.user.email_confirmed_at) {
        setPendingEmail(session.user.email ?? "");
        setScreen("email-verify");
        return;
      }
      await loadPlayer(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [loadPlayer]);

  // ─── Periodic last_seen ────────────────────────────────────────────────────
  useEffect(() => {
    if (!username) return;
    if (lastSeenTimer.current) clearInterval(lastSeenTimer.current);
    lastSeenTimer.current = setInterval(() => {
      updateLastSeen(username).catch(() => {});
    }, 2 * 60 * 1000);
    return () => { if (lastSeenTimer.current) clearInterval(lastSeenTimer.current); };
  }, [username]);

  // ─── Single-player match end ───────────────────────────────────────────────
  const handleMatchEnd = useCallback(async (playerGoals: number, aiGoals: number) => {
    const won      = playerGoals > aiGoals;
    const drew     = playerGoals === aiGoals;
    const prevRP   = loadRP();
    const rpGained = won ? calcRPForWin(playerGoals) : 0;
    const newRP    = prevRP + rpGained;
    const prevRankName = getRankForRP(prevRP).fullName;
    const newRankName  = getRankForRP(newRP).fullName;
    if (rpGained > 0) saveRP(newRP);
    setMatchResult({
      playerGoals, aiGoals, won, drew,
      rpGained, prevRP, newRP,
      rankChanged: prevRankName !== newRankName,
      prevRankName, newRankName,
    });
    setScreen("result");
    const result: "win" | "loss" | "draw" = won ? "win" : drew ? "draw" : "loss";
    saveMatch({
      username, opponentName: "AI", playerGoals, opponentGoals: aiGoals,
      result, rpGained, rpBefore: prevRP, rpAfter: newRP, ranked: true,
    }).catch(() => {});
  }, [username]);

  const handleLogout = useCallback(async () => {
    if (lastSeenTimer.current) clearInterval(lastSeenTimer.current);
    await signOut();
    setUsername("");
    setDisplayName("");
  }, []);

  const handleViewProfile = useCallback((uname: string) => {
    setViewingUser(uname);
    setPrevScreen(screen);
    setScreen("profile");
  }, [screen]);

  // ─── Multiplayer helpers ───────────────────────────────────────────────────
  const goToMatchIntro = useCallback((match: MatchSession, host: boolean) => {
    setCurrentMatch(match);
    setIsHost(host);
    setScreen("match-intro");
  }, []);

  const handleMpMatchEnd = useCallback((result: MPResult) => {
    setMpResult(result);
    setCurrentMatch(null);
    setCurrentRoom(null);
    setScreen("mp-result");
  }, []);

  // ─── Screen render ─────────────────────────────────────────────────────────

  if (screen === "login")        return <LoginPage onGoRegister={() => setScreen("register")} />;
  if (screen === "register")     return (
    <RegisterPage
      onSuccess={(email) => { setPendingEmail(email); setScreen("email-verify"); }}
      onGoLogin={() => setScreen("login")}
    />
  );
  if (screen === "email-verify") return <EmailVerifyPage email={pendingEmail} onGoLogin={() => setScreen("login")} />;

  if (screen === "menu") {
    return (
      <MainMenu
        username={username}
        displayName={displayName}
        onPlay={() => setScreen("playing")}
        onPlayRanked={() => setScreen("ranked")}
        onMatchmaking={() => setScreen("mod-select")}
        onCustomRooms={() => setScreen("custom-rooms")}
        onShowRanks={() => setScreen("rankpage")}
        onShowChangelog={() => setScreen("changelog")}
        onLogout={handleLogout}
        onShowLeaderboard={() => setScreen("leaderboard")}
        onShowProfile={() => { setViewingUser(username); setPrevScreen("menu"); setScreen("profile"); }}
      />
    );
  }

  if (screen === "rankpage")  return <RankPage onBack={() => setScreen("menu")} />;
  if (screen === "changelog") return <ChangelogPage onBack={() => setScreen("menu")} />;

  if (screen === "playing") return <GameBoard username={username} onBackToMenu={() => setScreen("menu")} />;
  if (screen === "ranked")  return (
    <GameBoard username={username} ranked onBackToMenu={() => setScreen("menu")} onMatchEnd={handleMatchEnd} />
  );
  if (screen === "result" && matchResult) {
    return (
      <MatchResult
        result={matchResult} username={username} displayName={displayName}
        onPlayAgain={() => setScreen("ranked")}
        onMenu={() => setScreen("menu")}
      />
    );
  }

  if (screen === "leaderboard") {
    return (
      <LeaderboardPage
        currentUsername={username}
        onBack={() => setScreen("menu")}
        onViewProfile={handleViewProfile}
      />
    );
  }
  if (screen === "profile") {
    return (
      <ProfilePage
        username={viewingUser || username}
        isOwnProfile={(viewingUser || username) === username}
        onBack={() => setScreen(prevScreen)}
      />
    );
  }

  // ─── Multiplayer screens ───────────────────────────────────────────────────

  if (screen === "mod-select") {
    return (
      <ModSelectPage
        onSelectMode={(mode) => { setSelectedMode(mode); setScreen("matchmaking"); }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "matchmaking") {
    return (
      <MatchmakingPage
        mode={selectedMode}
        username={username}
        displayName={displayName}
        onMatchFound={(match) => goToMatchIntro(match, match.hostUsername === username)}
        onCancel={() => setScreen("mod-select")}
      />
    );
  }

  if (screen === "custom-rooms") {
    return (
      <CustomRoomsPage
        username={username}
        displayName={displayName}
        onCreateRoom={() => setScreen("create-room")}
        onJoinRoom={(room) => { setCurrentRoom(room); setScreen("room-lobby"); }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "create-room") {
    return (
      <CreateRoomPage
        username={username}
        displayName={displayName}
        onRoomCreated={(room) => { setCurrentRoom(room); setScreen("room-lobby"); }}
        onBack={() => setScreen("custom-rooms")}
      />
    );
  }

  if (screen === "room-lobby" && currentRoom) {
    return (
      <RoomLobbyPage
        room={currentRoom}
        username={username}
        displayName={displayName}
        onStartMatch={(match) => goToMatchIntro(match, match.hostUsername === username)}
        onLeave={() => { setCurrentRoom(null); setScreen("custom-rooms"); }}
      />
    );
  }

  if (screen === "match-intro" && currentMatch) {
    return (
      <MatchIntroPage
        match={currentMatch}
        localUsername={username}
        isRanked={isHost}
        onMatchStart={() => setScreen("multiplayer")}
      />
    );
  }

  if (screen === "multiplayer" && currentMatch) {
    return (
      <MultiplayerBoard
        match={currentMatch}
        localUsername={username}
        localDisplayName={displayName}
        isHost={isHost}
        ranked={false}
        onMatchEnd={handleMpMatchEnd}
        onLeave={() => { setCurrentMatch(null); setScreen("menu"); }}
      />
    );
  }

  if (screen === "mp-result" && mpResult) {
    return (
      <MultiplayerResult
        result={mpResult}
        onMenu={() => setScreen("menu")}
        onPlayAgain={currentMatch ? () => setScreen("match-intro") : undefined}
      />
    );
  }

  return null;
}

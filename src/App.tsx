import { useState, useCallback } from "react";
import UsernameScreen from "./components/UsernameScreen";
import MainMenu from "./components/MainMenu";
import GameBoard from "./components/GameBoard";
import RankPage from "./components/RankPage";
import ChangelogPage from "./components/ChangelogPage";
import MatchResult from "./components/MatchResult";
import ProfilePage from "./components/ProfilePage";
import LeaderboardPage from "./components/LeaderboardPage";
import type { AppScreen, MatchResultData } from "./types/game";
import { loadRP, saveRP, getRankForRP, calcRPForWin } from "./utils/rankSystem";
import { initPlayer, saveMatch } from "./lib/db";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>(() =>
    localStorage.getItem("novaball_username") ? "menu" : "username"
  );
  const [username, setUsername] = useState<string>(
    () => localStorage.getItem("novaball_username") ?? ""
  );
  const [matchResult, setMatchResult] = useState<MatchResultData | null>(null);
  const [viewingUsername, setViewingUsername] = useState<string>("");
  const [prevScreen, setPrevScreen] = useState<AppScreen>("menu");

  const handleUsername = useCallback(async (name: string) => {
    setUsername(name);
    setScreen("menu");
    const localRP = loadRP();
    try {
      const serverRP = await initPlayer(name, localRP);
      if (serverRP > localRP) {
        saveRP(serverRP);
      }
    } catch (e) {
      console.warn("Supabase init failed, using local RP", e);
    }
  }, []);

  const handleMatchEnd = useCallback(async (playerGoals: number, aiGoals: number) => {
    const won      = playerGoals > aiGoals;
    const drew     = playerGoals === aiGoals;
    const lost     = aiGoals > playerGoals;
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

    // Persist to Supabase in background
    try {
      const result: "win" | "loss" | "draw" = won ? "win" : drew ? "draw" : "loss";
      await saveMatch({
        username,
        opponentName: "AI",
        playerGoals,
        opponentGoals: aiGoals,
        result,
        rpGained,
        rpBefore: prevRP,
        rpAfter: newRP,
        ranked: true,
      });
    } catch (e) {
      console.warn("Supabase saveMatch failed", e);
    }
  }, [username]);

  const handleViewProfile = useCallback((uname: string) => {
    setViewingUsername(uname);
    setPrevScreen(screen);
    setScreen("profile");
  }, [screen]);

  if (screen === "username") {
    return <UsernameScreen onContinue={handleUsername} />;
  }

  if (screen === "menu") {
    return (
      <MainMenu
        username={username}
        onPlay={() => setScreen("playing")}
        onPlayRanked={() => setScreen("ranked")}
        onShowRanks={() => setScreen("rankpage")}
        onShowChangelog={() => setScreen("changelog")}
        onChangeUsername={() => setScreen("username")}
        onShowLeaderboard={() => setScreen("leaderboard")}
        onShowProfile={() => {
          setViewingUsername(username);
          setPrevScreen("menu");
          setScreen("profile");
        }}
      />
    );
  }

  if (screen === "rankpage") {
    return <RankPage onBack={() => setScreen("menu")} />;
  }

  if (screen === "changelog") {
    return <ChangelogPage onBack={() => setScreen("menu")} />;
  }

  if (screen === "playing") {
    return (
      <GameBoard
        username={username}
        onBackToMenu={() => setScreen("menu")}
      />
    );
  }

  if (screen === "ranked") {
    return (
      <GameBoard
        username={username}
        ranked
        onBackToMenu={() => setScreen("menu")}
        onMatchEnd={handleMatchEnd}
      />
    );
  }

  if (screen === "result" && matchResult) {
    return (
      <MatchResult
        result={matchResult}
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
        username={viewingUsername || username}
        isOwnProfile={(viewingUsername || username) === username}
        onBack={() => setScreen(prevScreen)}
      />
    );
  }

  return null;
}

import { useState, useCallback } from "react";
import UsernameScreen from "./components/UsernameScreen";
import MainMenu from "./components/MainMenu";
import GameBoard from "./components/GameBoard";
import RankPage from "./components/RankPage";
import ChangelogPage from "./components/ChangelogPage";
import MatchResult from "./components/MatchResult";
import type { AppScreen, MatchResultData } from "./types/game";
import { loadRP, saveRP, getRankForRP, calcRPForWin } from "./utils/rankSystem";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>(() =>
    localStorage.getItem("novaball_username") ? "menu" : "username"
  );
  const [username, setUsername] = useState<string>(
    () => localStorage.getItem("novaball_username") ?? ""
  );
  const [matchResult, setMatchResult] = useState<MatchResultData | null>(null);

  const handleUsername = (name: string) => {
    setUsername(name);
    setScreen("menu");
  };

  const handleMatchEnd = useCallback((playerGoals: number, aiGoals: number) => {
    const won   = playerGoals > aiGoals;
    const drew  = playerGoals === aiGoals;
    const prevRP = loadRP();
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
  }, []);

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

  return null;
}

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { signOut } from "./lib/auth";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import EmailVerifyPage from "./components/auth/EmailVerifyPage";
import ForgotPasswordPage from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";
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
import SettingsPage from "./components/SettingsPage";
import TestBoard from "./components/TestBoard";
import ReviewPage from "./components/ReviewPage";
import type { AppScreen, MatchResultData, GameMode, MatchSession, CustomRoom, MPResult } from "./types/game";
import { loadRP, saveRP, getRankForRP, calcRPForWin, calcRPLoss } from "./utils/rankSystem";
import { getPlayerByAuthId, createPlayer, updateLastSeen, saveMatch } from "./lib/db";
import { leaveRoom } from "./lib/matchmaking";

export default function App() {
  const [screen,        setScreen]       = useState<AppScreen>("landing");
  const [isLoading,     setIsLoading]    = useState(true);
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
  const [isCustomRoom,  setIsCustomRoom] = useState(false);
  const lastSeenTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenRef       = useRef<AppScreen>("landing");
  // isRecoveryRef: şifre sıfırlama linkine tıklanınca true olur.
  // loadPlayer'ın setScreen("menu") çağırmasını engeller.
  const isRecoveryRef   = useRef(false);

  // screenRef her zaman güncel ekranı yansıtır (loadPlayer closure stale sorununu önler)
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // ─── Load player after successful auth ────────────────────────────────────
  const loadPlayer = useCallback(async (authId: string) => {
    let player = await getPlayerByAuthId(authId);

    if (!player) {
      const { data: { session } } = await supabase.auth.getSession();
      const meta  = session?.user?.user_metadata as Record<string, string> | undefined;
      const uname = meta?.username;
      const dname = meta?.display_name || uname;
      const email = session?.user?.email;
      if (uname && email) {
        try {
          await createPlayer(uname, dname ?? uname, authId);
          player = await getPlayerByAuthId(authId);
        } catch { /* sessizce geç */ }
      }
      if (!player) return;
    }

    const serverRP = player.rp;
    const localRP  = loadRP();
    if (serverRP > localRP) saveRP(serverRP);
    setUsername(player.username);
    setDisplayName(player.display_name || player.username);
    updateLastSeen(player.username).catch(() => {});

    // "reset-password" HARİÇ auth giriş ekranlarından menüye yönlendir.
    // reset-password: kullanıcı şifresini belirlemeli, menüye atılmamalı.
    // TOKEN_REFRESHED/oyun ekranları: zaten başka guard tarafından ele alınıyor.
    const ENTRY_SCREENS: AppScreen[] = ["landing", "login", "register", "email-verify", "forgot-password"];
    if (ENTRY_SCREENS.includes(screenRef.current)) {
      setScreen("menu");
    }
  }, []);

  // ─── Auth state machine ────────────────────────────────────────────────────
  useEffect(() => {
    // ── Güvenlik ağı: max 6 saniye bekle, sonra landing'e düş ──────────────
    // Supabase cold-start ya da ağ gecikmesinde spinner'da takılmayı önler.
    const loadingGuard = setTimeout(() => {
      setIsLoading(false);
      setScreen("landing");
    }, 6000);

    // ── Şifre sıfırlama linki tespiti ──────────────────────────────────────
    // Supabase recovery URL'si: https://app.com/#access_token=...&type=recovery
    // window.location.hash'i getSession() çağrılmadan önce okuyoruz.
    const rawHash = window.location.hash;
    if (rawHash.includes("type=recovery") || rawHash.includes("type%3Drecovery")) {
      isRecoveryRef.current = true;
      // Hash'i temizle — sayfayı yenileyince tekrar tetiklenmesin.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(loadingGuard);
      if (!session) { setScreen("landing"); setIsLoading(false); return; }

      // Şifre sıfırlama akışı: loadPlayer çağırma, doğrudan reset-password'a git.
      // PASSWORD_RECOVERY event'i da aynı ekranı set edecek — ikisi tutarlı.
      if (isRecoveryRef.current) {
        setScreen("reset-password");
        setIsLoading(false);
        return;
      }

      if (!session.user.email_confirmed_at) {
        setPendingEmail(session.user.email ?? "");
        setScreen("email-verify");
        setIsLoading(false);
        return;
      }
      loadPlayer(session.user.id).finally(() => setIsLoading(false));
    });

    // ENTRY_SCREENS: TOKEN_REFRESHED gelince "zaten bu ekrandayız, atlama" kontrolü için
    const ENTRY_SCREENS: AppScreen[] = ["landing", "login", "register", "email-verify", "forgot-password"];

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Recovery link'e tıklandığında Supabase bu event'i atar.
        isRecoveryRef.current = true;
        setScreen("reset-password");
        return;
      }
      if (event === "SIGNED_OUT" || !session) {
        isRecoveryRef.current = false;
        setScreen("landing");
        return;
      }
      // Recovery modundayken SIGNED_IN event'i gelirse atla —
      // PASSWORD_RECOVERY zaten ekranı ayarladı, loadPlayer çağırma.
      if (event === "SIGNED_IN" && isRecoveryRef.current) return;
      // TOKEN_REFRESHED (sekme geri dönüşü): giriş ekranlarındaysa devam et, değilse atla.
      if (event === "TOKEN_REFRESHED" && !ENTRY_SCREENS.includes(screenRef.current)) return;
      if (!session.user.email_confirmed_at) {
        setPendingEmail(session.user.email ?? "");
        setScreen("email-verify");
        return;
      }
      await loadPlayer(session.user.id);
    });

    return () => {
      clearTimeout(loadingGuard);
      subscription.unsubscribe();
    };
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
    const rpLost   = (!won && !drew) ? calcRPLoss() : 0;
    const newRP    = Math.max(0, prevRP + rpGained - rpLost);
    const prevRankName = getRankForRP(prevRP).fullName;
    const newRankName  = getRankForRP(newRP).fullName;
    if (rpGained > 0 || rpLost > 0) saveRP(newRP);
    setMatchResult({
      playerGoals, aiGoals, won, drew,
      rpGained, rpLost, prevRP, newRP,
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
    // Özel oda maçları: sonuç ekranı gösterme, kaydetme, custom-rooms'a dön
    if (isCustomRoom) {
      const roomId = currentRoom?.id;
      setCurrentMatch(null);
      setCurrentRoom(null);
      setIsCustomRoom(false);
      setScreen("custom-rooms");
      // Odayı Supabase'den sil (maç bitti veya biri ayrıldı)
      if (roomId) {
        const usr = result.localUsername;
        leaveRoom(roomId, usr).catch(() => {});
      }
      return;
    }

    setMpResult(result);
    setCurrentMatch(null);
    setCurrentRoom(null);
    setScreen("mp-result");

    // Sadece ranked maçları Supabase'e kaydet
    if (!result.isRanked) return;

    const { winnerTeam, myTeam, redGoals, blueGoals, rpGained, rpLost,
            prevRP, newRP, localUsername: lUser, opponentUsername, playerStats } = result;
    const myGoals  = myTeam === "red" ? redGoals  : blueGoals;
    const oppGoals = myTeam === "red" ? blueGoals : redGoals;
    const outcome: "win" | "loss" | "draw" =
      winnerTeam === "draw" ? "draw" : winnerTeam === myTeam ? "win" : "loss";
    const oppDisplay = playerStats.find(p => p.username !== lUser)?.displayName
      || opponentUsername || "Rakip";
    void rpLost; // kullanılıyor (saveMatch'e eklenebilir)
    saveMatch({
      username: lUser, opponentName: oppDisplay,
      playerGoals: myGoals, opponentGoals: oppGoals,
      result: outcome, rpGained, rpBefore: prevRP, rpAfter: newRP,
      ranked: true,
    }).catch(() => {});
  }, [isCustomRoom]);

  // ─── Screen render ─────────────────────────────────────────────────────────

  // Oturum kontrolü tamamlanana kadar yükleniyor ekranı — böylece giriş yapmış
  // kullanıcı login/kayıt sayfasına hiç düşmez.
  if (isLoading) {
    return (
      <div className="novaball-screen flex flex-col items-center justify-center min-h-[100dvh] bg-[#070d16]">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-white font-black text-4xl tracking-tight">
            Nova<span className="text-[#4af]">Ball</span>
          </h1>
          <div className="w-8 h-8 border-2 border-[#4af]/30 border-t-[#4af] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (screen === "landing") return <LandingPage onLogin={() => setScreen("login")} onRegister={() => setScreen("register")} onTryGuest={() => setScreen("test-board")} />;
  if (screen === "test-board") return <TestBoard onLogin={() => setScreen("login")} onRegister={() => setScreen("register")} onBack={() => setScreen("landing")} />;
  if (screen === "login")        return <LoginPage onGoRegister={() => setScreen("register")} onGoForgot={() => setScreen("forgot-password")} />;
  if (screen === "register")     return (
    <RegisterPage
      onSuccess={(email) => { setPendingEmail(email); setScreen("email-verify"); }}
      onGoLogin={() => setScreen("login")}
    />
  );
  if (screen === "email-verify")   return <EmailVerifyPage email={pendingEmail} onGoLogin={() => setScreen("login")} />;
  if (screen === "forgot-password") return <ForgotPasswordPage onBack={() => setScreen("login")} />;
  if (screen === "reset-password")  return <ResetPasswordPage onDone={() => setScreen("menu")} />;

  if (screen === "menu") {
    return (
      <MainMenu
        username={username}
        displayName={displayName}
        onPlay={() => setScreen("playing")}
        onMatchmaking={() => setScreen("mod-select")}
        onCustomRooms={() => setScreen("custom-rooms")}
        onShowRanks={() => setScreen("rankpage")}
        onShowChangelog={() => setScreen("changelog")}
        onLogout={handleLogout}
        onShowLeaderboard={() => setScreen("leaderboard")}
        onShowProfile={() => { setViewingUser(username); setPrevScreen("menu"); setScreen("profile"); }}
        onShowSettings={() => setScreen("settings")}
        onShowReviews={() => setScreen("reviews")}
      />
    );
  }

  if (screen === "reviews") {
    return (
      <ReviewPage
        username={username}
        displayName={displayName}
        onBack={() => setScreen("menu")}
        onViewProfile={(u) => { setViewingUser(u); setPrevScreen("reviews"); setScreen("profile"); }}
      />
    );
  }

  if (screen === "rankpage")  return <RankPage onBack={() => setScreen("menu")} />;
  if (screen === "changelog") return <ChangelogPage onBack={() => setScreen("menu")} />;
  if (screen === "settings")  return (
    <SettingsPage
      username={username}
      displayName={displayName}
      onBack={() => setScreen("menu")}
      onUsernameChange={setUsername}
      onDisplayNameChange={setDisplayName}
    />
  );

  if (screen === "playing") return <GameBoard username={username} displayName={displayName} onBackToMenu={() => setScreen("menu")} />;
  if (screen === "ranked")  return <GameBoard username={username} displayName={displayName} ranked onMatchEnd={handleMatchEnd} onBackToMenu={() => setScreen("menu")} />;

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
        onJoinRoom={(room) => { setCurrentRoom(room); setIsCustomRoom(true); setScreen("room-lobby"); }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "create-room") {
    return (
      <CreateRoomPage
        username={username}
        displayName={displayName}
        onRoomCreated={(room) => { setCurrentRoom(room); setIsCustomRoom(true); setScreen("room-lobby"); }}
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
        isRanked={currentMatch.ranked}
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
        ranked={currentMatch.ranked}
        isCustomRoom={isCustomRoom}
        onMatchEnd={handleMpMatchEnd}
        onLeave={() => {
          const roomId = currentRoom?.id;
          setCurrentMatch(null);
          if (isCustomRoom) {
            setCurrentRoom(null);
            setIsCustomRoom(false);
            setScreen("custom-rooms");
            // Odayı Supabase'den sil — rakip subscribeToRoom null aldığında lobiye döner
            if (roomId) leaveRoom(roomId, username).catch(() => {});
          } else {
            setScreen("menu");
          }
        }}
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

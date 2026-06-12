# NovaBall

**NovaBall**, Haxball ve Mamoball'dan ilham alan modern bir 2D tepeden görünümlü arcade futbol oyunudur. React 19.2, TypeScript ve HTML5 Canvas üzerine inşa edilmiş, tamamen tarayıcı tabanlı bir oyundur. Supabase ile kimlik doğrulama, PostgreSQL verisi ve gerçek zamanlı çok oyunculu destek sunar.

## Kurulum ve Çalıştırma

```bash
pnpm --filter @workspace/novaball run dev       # oyunu başlat
pnpm --filter @workspace/api-server run dev      # API sunucusunu başlat (opsiyonel)
pnpm --filter @workspace/novaball run typecheck  # tip kontrolü
pnpm run typecheck                               # tüm paketleri kontrol et
pnpm run build                                   # tip kontrolü + derleme
```

Gerekli sırlar: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Replit Secrets'a ekle)

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Monorepo | pnpm workspaces, Node.js 24 |
| Dil | TypeScript 5.9 (strict) |
| Frontend | React 19.2 + Vite + Tailwind CSS v4 |
| Oyun döngüsü | HTML5 Canvas + requestAnimationFrame |
| Fizik (AI) | `useGamePhysics.ts` — impuls tabanlı motor |
| Fizik (MP) | `useMultiplayerPhysics.ts` — aynı motor, host senkronize |
| Backend | Supabase (auth, PostgreSQL, Realtime channels) |
| API | Express 5 (scaffold, henüz kullanılmıyor) |
| Mobil | Dokunmatik sanal joystick + aksiyon butonları |

## Proje Yapısı

```
artifacts/novaball/src/
├── types/
│   └── game.ts               # Tüm sabitler, arayüzler (Player, Ball, Score, MobileInput…)
├── utils/
│   └── rankSystem.ts         # Rank kademeleri, RP hesaplama, localStorage yardımcıları
├── hooks/
│   ├── useGamePhysics.ts     # Tek oyunculu fizik motoru + AI + canvas çizimi
│   └── useMultiplayerPhysics.ts  # Çok oyunculu fizik motoru + Realtime sync
├── lib/
│   ├── supabase.ts           # Supabase istemcisi
│   ├── auth.ts               # Kimlik doğrulama yardımcıları
│   ├── db.ts                 # Supabase sorguları (players, match_history)
│   ├── matchmaking.ts        # Matchmaking queue + custom rooms
│   └── realtime.ts           # Supabase Realtime broadcast yardımcıları
├── components/
│   ├── auth/                 # LoginPage, RegisterPage, EmailVerifyPage
│   ├── MainMenu.tsx          # Ana menü
│   ├── GameBoard.tsx         # AI oyun canvas + HUD
│   ├── MultiplayerBoard.tsx  # Gerçek zamanlı oyun canvas + HUD
│   ├── MatchmakingPage.tsx   # Eşleşme bekleme (90s sayaç, otomatik iptal)
│   ├── ModSelectPage.tsx     # Oyun modu seçimi (1v1–5v5)
│   ├── CustomRoomsPage.tsx   # Özel oda listesi
│   ├── CreateRoomPage.tsx    # Özel oda oluşturma (ranked toggle dahil)
│   ├── RoomLobbyPage.tsx     # Oda lobi (host maç başlatınca guest otomatik geçer)
│   ├── MatchIntroPage.tsx    # Maç geri sayımı (VS ekranı)
│   ├── MatchResult.tsx       # AI maç sonucu ekranı
│   ├── MultiplayerResult.tsx # Çok oyunculu maç sonucu ekranı
│   ├── LeaderboardPage.tsx   # Lider tablosu
│   ├── ProfilePage.tsx       # Oyuncu profili
│   ├── RankPage.tsx          # Rank sistemi bilgi sayfası
│   └── ChangelogPage.tsx     # Güncelleme notları
├── App.tsx                   # Ekran durum makinesi (screen router)
└── index.css                 # Tailwind v4 + tüm özel stiller
```

## Ekran Akışı

```
Login/Register → EmailVerify → MainMenu
MainMenu → GameBoard (Serbest/AI)
MainMenu → ModSelect → Matchmaking (ranked) → MatchIntro → MultiplayerBoard → MultiplayerResult
MainMenu → CustomRooms → CreateRoom / RoomLobby → MatchIntro → MultiplayerBoard → MultiplayerResult
```

## Mimari Kararlar

### Oyun Fiziği
- **Tüm değişken oyun durumu `useRef` içinde tutar** — her frame'de React re-render tetiklemez.
- Yalnızca skor, süre ve faz için `useState` kullanılır (HUD'a yansıtılır).
- İmpuls tabanlı daire çarpışma çözümleme.
- 60 FPS kilidi: `if (ts - lastTs < FRAME_MS - 2) return`.

### Çok Oyunculu (Multiplayer)
- **Host**, fiziği çalıştırır ve durumu ~20 FPS ile yayınlar.
- **Client**, kendi girişini ~30 FPS ile yayınlar ve host'un gönderdiği durumu alır.
- Supabase Realtime broadcast kanalları kullanılır (WebSocket üzerinde).
- **Forfeit sistemi**: Maçı terk eden oyuncu, "player_forfeit" eventi yayınlar. Kalan oyuncu otomatik kazanır ve RP alır.

### Matchmaking
- Tüm eşleşme maçları **ranked** (RP verilir).
- İlk kuyruğa giren oyuncu host olur ve maçı oluşturur.
- Diğer oyuncular `getMyQueueEntry()` ile kendi matched durumlarını kontrol eder.
- **90 saniyelik sayaç**: Eşleşme bulunamazsa otomatik iptal.

### Rank Sistemi
- 7 kademe × 3 alt rank: toplam 19 rank seviyesi (Demir → Usta).
- RP localStorage + Supabase `players` tablosunda (dual storage).
- Yenilgide RP kaybı yok (kazanmak için RP verilir).

### Veritabanı
- Tüm oyun verisi Supabase'de yaşar (`players`, `match_history`, `matchmaking_queue`, `active_matches`, `custom_rooms`).
- Yerel PostgreSQL + Drizzle kurulumu sadece scaffold, oyunda kullanılmıyor.
- `active_matches.ranked` ve `custom_rooms.ranked` kolonları gerçek zamanlı ranked modunu kontrol eder.

## Oyun Sabitleri

| Sabit | Değer | Açıklama |
|-------|-------|---------|
| `CANVAS_WIDTH/HEIGHT` | 1200×675 | Oyun alanı çözünürlüğü (16:9) |
| `RANKED_DURATION_MS` | 90 000 ms | Rekabet maçı süresi |
| `PLAYER_MAX_SPEED` | 4.8 | Normal maksimum hız |
| `PLAYER_ACCEL` | 0.58 | İvme |
| `SPRINT_SPEED_MULT` | 1.75 | Depar hız çarpanı |
| `STAMINA_MAX` | 100 | Maksimum stamina |
| `FOUNDING_DATE` | "11 Haziran 2026" | Oyun kuruluş tarihi |

## Kullanıcı Tercihleri

- **Dil**: Türkçe UI, Türkçe değişken yorumları kabul edilir
- **Marka**: NovaBall, neon-spor karanlık tema (`#070d16` arka plan, neon yeşil saha)
- **Mobil**: Yatay ekran zorunlu; portrait modda döndürme talimatı
- **Tasarım**: Premium, minimal, cam efektli UI
- **Yeni ekranlar**: Her ekran hem masaüstü hem mobil yatay uyumlu olmalı

## Gotchas

- Supabase sırları (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) Replit Secrets'a eklenmeli
- Oyun verisi Supabase'de yaşar, yerel PostgreSQL değil
- Matchmaking join bug FIX: `subscribeToQueue` sadece "searching" girişleri döner; `getMyQueueEntry()` ile kendi durumumuzu ayrıca kontrol ediyoruz
- Custom room start bug FIX: `subscribeToRoom` callback'inde status "playing" olunca guest otomatik navigate olur

## Pointers

- `pnpm-workspace` skill: workspace yapısı, TypeScript kurulumu
- `supabase/` klasörü: SQL migration dosyaları (Supabase SQL Editor'da çalıştır)

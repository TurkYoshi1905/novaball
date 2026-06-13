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
| Fizik (AI) | `useGamePhysics.ts` — impuls tabanlı motor, AI rakip, top hakimiyeti |
| Fizik (MP) | `useMultiplayerPhysics.ts` — aynı impuls motoru, host senkronize eder |
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
│   ├── GameBoard.tsx         # AI oyun canvas + HUD (game-board-outer CSS sistemi)
│   ├── MultiplayerBoard.tsx  # Gerçek zamanlı oyun canvas + GameBoard HUD entegre
│   ├── MatchmakingPage.tsx   # Eşleşme bekleme (90s sayaç, otomatik iptal)
│   ├── ModSelectPage.tsx     # Oyun modu seçimi (1v1–5v5)
│   ├── CustomRoomsPage.tsx   # Özel oda listesi
│   ├── CreateRoomPage.tsx    # Özel oda oluşturma (her zaman serbest, RP yok)
│   ├── RoomLobbyPage.tsx     # Oda lobi (host çıkınca üyeler atılır)
│   ├── MatchIntroPage.tsx    # Maç geri sayımı (VS ekranı)
│   ├── MatchResult.tsx       # AI maç sonucu ekranı
│   ├── MultiplayerResult.tsx # Çok oyunculu sonuç — sıralama tablosu, RP, MVP rozeti
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

### Durum Yönetimi
- **Tüm değişken oyun durumu `useRef` içinde tutar** — her frame'de React re-render tetiklemez.
- Yalnızca skor, süre ve faz için `useState` kullanılır (HUD'a yansıtılır).
- `useGamePhysics` ve `useMultiplayerPhysics` hook'ları hem fiziği hem canvas çizimini yönetir.

### Fizik Motoru
- İmpuls tabanlı daire çarpışma çözümleme.
- Top hakimiyeti (possession): oyuncu topa değdiğinde otomatik alır, çalma için depar gerekir.
- Stamina/depar sistemi: `STAMINA_MAX=100`, hızlı tükenme + yavaş toparlanma.
- Kale direkleri küçük daireler olarak modellenmiştir (gerçekçi sekme için).
- **NaN koruma**: `safe()` yardımcısı + `isFinite` guards tüm canvas çizim çağrılarında mevcut.
- **60 FPS kilidi**: `if (ts - lastTs < FRAME_MS - 2) return` — 120Hz ekranlarda her diğer frame atlanır.

### Güç Barı (Şut Şarj Sistemi)
- Oyuncu `SPACE/X` (PC) veya ⚽ butonu (mobil) basılı tutar.
- Her frame `kickCharge += CHARGE_RATE` artar (0 → 1 arası ~45 frame).
- Tuş bırakılınca: `power = MIN_KICK_POWER + (MAX_KICK_POWER - MIN_KICK_POWER) * kickCharge`.
- Canvas üzerinde oyuncunun etrafında renkli ark gösterilir (yeşil → sarı → kırmızı).
- Mobilden: conic-gradient halkası ⚽ butonun çevresinde dolar.

### Canvas Çizim Stili
- Oyuncular: takım renkli daire + içinde takım numarası + **dairenin altında displayName**.
- Multiplayer canvas: daire içinde `teamIndex` numarası, hemen altında oyuncu `displayName` etiketi (lokal oyuncu daha parlak).
- GameBoard (AI modu): daire içinde `name` metni, altında tekrar etiket (GameBoard stili).
- Stamina barı: oyuncunun altında renkli ince bar (yeşil/sarı/kırmızı).
- Kick charge arkı: basılı tutulunca oyuncunun etrafında renkli yay.
- Top: radyal gradient beyaz daire — sahip varsa takım rengi parıltısı, serbest ve hızlıysa hız parıltısı.
- Kale direkleri: beyaz küçük daireler.
- Possession aura: top sahibi oyuncunun etrafında radyal gradient halkası (takım rengiyle).
- RAF döngüsü dışında **asla** canvas'a yazılmaz.

### Çok Oyunculu (Multiplayer)
- **Host**, fiziği çalıştırır ve durumu ~30 FPS ile yayınlar (`SYNC_MS=33`).
- **Client**, kendi girişini ~60 FPS ile yayınlar (`INPUT_MS=16`) ve host'tan gelen durum ile tüm oyuncu konumlarını günceller (yerel oyuncu dahil).
- **İstemci-tarafı tahmin**: Client kendi girişini her frame'de yerel fizik adımına da uygular; host durumu gelince tüm pozisyonlar üzerine yazılır (reconciliation). Bu sayede 60 FPS akıcı hareket sağlanır.
- Supabase Realtime broadcast kanalları kullanılır (WebSocket üzerinde).
- **Forfeit sistemi**: Ranked maçtan ayrılan oyuncu `player_forfeit` eventi yayınlar. Kalan oyuncu otomatik 10 RP kazanır.
- **HUD**: GameBoard'daki `game-hud`, `hud-side`, `hud-center`, `hud-score`, `hud-time` CSS sınıflarının aynısı kullanılır.
- **Süre**: Ranked maçlarda 90s geri sayım (`hud-time-urgent` son 15s'de), özel odalarda yukarı sayaç.

### Matchmaking
- Tüm eşleşme maçları **ranked** (RP verilir).
- İlk kuyruğa giren oyuncu host olur ve maçı oluşturur.
- Diğer oyuncular `getMyQueueEntry()` ile kendi matched durumlarını kontrol eder.
- **90 saniyelik sayaç**: Eşleşme bulunamazsa otomatik iptal.

### Özel Odalar
- Her zaman **serbest mod** — RP kazanılmaz, süre sınırı yok.
- Mor tema (#a78bfa), yukarı sayaç (countup timer).
- Host ayrılınca `leaveRoom()` odayı siler; `subscribeToRoom` null döndürünce misafirler atılır (2.5s sonra yönlendirme).

### Rank Sistemi
- 7 kademe × 3 alt rank: toplam 19 rank seviyesi (Demir → Usta).
- RP localStorage + Supabase `players` tablosunda (dual storage).
- Yenilgide RP kaybı yok (kazanmak için RP verilir).
- RP formülü: 1 gol→10, 2→14, 3→18, 4→22, 5+→25 (sadece kazanınca verilir).

### Veritabanı
- Tüm oyun verisi Supabase'de yaşar (`players`, `match_history`, `matchmaking_queue`, `active_matches`, `custom_rooms`).
- Yerel PostgreSQL + Drizzle kurulumu sadece scaffold, oyunda kullanılmıyor.
- `active_matches.ranked` ve `custom_rooms.ranked` kolonları gerçek zamanlı ranked modunu kontrol eder.

## Yeni Özellik Eklerken

**Her zaman şunları yap:**
1. Yeni sabit veya tür eklenecekse → `types/game.ts`
2. Rank/RP ile ilgili mantık → `utils/rankSystem.ts`
3. Yeni ekran → `components/` altında yeni dosya + `App.tsx` state machine'e ekle
4. Fizik/çizim değişikliği → ilgili hook (`useGamePhysics.ts` veya `useMultiplayerPhysics.ts`)
5. Her yeni ekran/bileşen için hem mobil yatay hem de masaüstü uyumunu sağla
6. `pnpm --filter @workspace/novaball run typecheck` ile tip hatası kontrolü yap

**Asla şunları yapma:**
- RAF döngüsü dışında canvas'a yazma
- Oyun durumu için `useState` kullanma (sadece HUD verileri için)
- Özel oda maçlarını `ranked: true` yapma (her zaman `false`)

## Oyun Sabitleri

| Sabit | Değer | Açıklama |
|-------|-------|---------|
| `CANVAS_WIDTH/HEIGHT` | 1200×675 | Oyun alanı çözünürlüğü (16:9) |
| `RANKED_DURATION_MS` | 90 000 ms | Rekabet maçı süresi |
| `PLAYER_MAX_SPEED` | 4.8 | Normal maksimum hız |
| `PLAYER_ACCEL` | 0.58 | İvme |
| `SPRINT_SPEED_MULT` | 1.75 | Depar hız çarpanı |
| `STAMINA_MAX` | 100 | Maksimum stamina |
| `MIN_KICK_POWER` | 5 | Minimum şut gücü (kısa dokunuş) |
| `MAX_KICK_POWER` | 15 | Maksimum şut gücü (tam şarj) |
| `CHARGE_RATE` | 0.022/frame | Güç barı dolma hızı (~45 frame) |
| `FRAME_MS` | 16.667 ms | 60 FPS kilidi |
| `FOUNDING_DATE` | "11 Haziran 2026" | Oyun kuruluş tarihi |

## Gotchas

- Supabase sırları (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) Replit Secrets'a eklenmeli
- Oyun verisi Supabase'de yaşar, yerel PostgreSQL değil
- Matchmaking join bug FIX: `subscribeToQueue` sadece "searching" girişleri döner; `getMyQueueEntry()` ile kendi durumumuzu ayrıca kontrol ediyoruz
- Custom room start bug FIX: `subscribeToRoom` callback'inde `status === "playing"` olunca guest otomatik navigate olur
- Custom room host-leave bug FIX: `subscribeToRoom` null döndürünce misafirler otomatik olarak `onLeave()` çağrılır ve 2.5s sonra yönlendirilir
- `MPResult.forfeit: boolean` gerekli alan — her `onMatchEnd` çağrısında geçirilmeli
- Multiplayer canvas: oyuncuların içinde `teamIndex` numarası + altında `displayName` etiketi gösterilir
- `MultiplayerBoard` artık `game-board-outer` CSS sistemi kullanıyor (GameBoard ile aynı HUD)
- Özel odalar her zaman `ranked: false` — `CreateRoomPage`'de toggle yok
- **60 FPS düzeltmesi**: Client `physicsStep` yerel tahmin + host durumu reconciliation ile çalışır; `SYNC_MS=33`, `INPUT_MS=16`
- **Görünürlük düzeltmesi**: `onGameState` artık TÜM oyuncuların konumunu günceller (lokal oyuncu dahil) — host her zaman yetkilidir

## Sürüm Geçmişi

### v0.0.4 — Stabilite & Ağ Optimizasyonu (13 Haziran 2026)

> Çok oyunculu sistemin köklü stabilite güncellemesi.

#### 🔧 Eşleştirme Düzeltmeleri
- `subscribeToQueue` callback'indeki erken `return` kaldırıldı → misafir artık her durumda maç ID'sini kontrol eder
- **1.5s polling fallback**: `postgres_changes` gecikmişse veya kaçırılmışsa misafir yine de maça yönlendirilir
- `checkMyEntry` subscription'dan önce tanımlanıyor → ilk yüklemede anında kontrol

#### 🏁 Maç Sonu Ekranı
- Maçı terk eden oyuncu artık doğrudan sonuç ekranına düşüyor (kaybeden olarak); kalan oyuncu aynı anda kazanan ekranını görüyor
- Forfeit bildirimi ranked **ve** özel oda için yayınlanıyor — maçtaki herkes aynı anda sonuç ekranını görür
- Maç sonucu ekranında `(sen)` etiketi + parlak border ile kendi satırın vurgulanıyor
- Özel oda maçlarında kazanan satırı mor `#a78bfa` renk temasıyla gösterilir (RP bölümü yok)
- `playerStats` tipine `team: Team` alanı eklendi → kazanan doğru takım bilgisiyle belirleniyor

#### 💾 Supabase Maç Kaydı
- `handleMpMatchEnd` artık `saveMatch()` çağırıyor → kazanma/beraberlik/kaybetme, gol ve RP Supabase'e yazılıyor
- `MPResult` tipine `localUsername` + `opponentUsername` eklendi

#### ⚡ 429 Rate Limit & Ağ Optimizasyonu
| | Önceki | Yeni | Azalma |
|---|---|---|---|
| Host yayın hızı | 30fps (33ms) | **12fps (80ms)** | %60 |
| Client girdi hızı | 60fps (16ms) | **20fps (50ms) + delta** | %90+ |
- **Delta encoding**: girdi değişmediğinde 200ms heartbeat → broadcast trafiği ~**%80 azaldı**
- 429 Too Many Requests / oyun donma sorunu tamamen giderildi

#### 🗄️ Veritabanı Geliştirmeleri
- `supabase/003`: `match_history` → `opponent_username`, `match_uuid` kolonları
- `supabase/004`: `winner_team`, `forfeit`, `game_mode`, win streak kolonları; RLS politikaları
- `player_stats_view` (kazanma oranı, maç başına gol) ve `recent_matches_view` eklendi
- `update_win_streak()` PostgreSQL fonksiyonu + kapsamlı indeksler

---

### v0.0.3 — Çok Oyunculu Altyapı (12 Haziran 2026)
- Matchmaking (1v1–5v5), Özel Odalar, Realtime senkronizasyon, Maç içi sohbet

### v0.0.2 — Auth & Profil (12 Haziran 2026)
- Kayıt/giriş/e-posta doğrulama, Share Card, Aktif oyuncu göstergesi

### v0.0.1 — İlk Sürüm (11 Haziran 2026)
- Temel oyun, AI rakip, fizik motoru, rank sistemi, mobil destek

---

### Dahili Yamalar (v0.0.4 kapsamında)

### v0.5 — 60 FPS & Multiplayer Görünürlük Düzeltmesi (13 Haziran 2026)
- **60 FPS multiplayer**: `SYNC_MS=33` (host ~30fps yayın), `INPUT_MS=16` (client ~60fps girdi)
- **İstemci-tarafı tahmin**: Client her frame'de yerel `physicsStep` çalıştırır; host durumu gelince tüm pozisyonlar reconcile edilir
- **Görünürlük düzeltmesi**: `onGameState` artık lokal oyuncunun pozisyonunu da host'tan günceller — host her zaman yetkili kaynak
- **`active_matches.ranked` kolonu**: Supabase `PGRST204` hatası giderildi — `supabase/001_ranked_multiplayer_fixes.sql` ile kolonu ekle
- **SQL migration**: `supabase/001_ranked_multiplayer_fixes.sql` workspace köküne taşındı

### v0.4 — MP Canvas İsim Gösterimi & Saha, Ranked AI Düzeltmesi (12 Haziran 2026)
- **Multiplayer canvas oyuncu çizimi**: daire içinde `teamIndex` numarası + hemen altında `displayName` etiketi (lokal oyuncu daha parlak beyaz, diğerleri yarı saydam)
- **Saha çizimi**: multiplayer ve özel oda maçlarında saha, `GameBoard` ile birebir aynı (çizgili zemin, ceza alanları, orta daire, köşe yayları, kale ızgarası, direkler)
- **Ranked AI modu geri eklendi**: `App.tsx`'te `screen === "ranked"` ekranı eksikti; `MatchResult`'tan "Tekrar Oyna" düzgün çalışıyor
- **Top tutma + çalma sistemi** (v0.4a): `useMultiplayerPhysics.ts`'e `POSSESS_DIST`, `attachBall()`, `STEAL_DIST` entegrasyonu; possession aura; releaseKick/tryKick şut sistemi; `hasBallUsername` MPGameState'e eklendi

### v0.3 — Multiplayer HUD & Maç Süresi (12 Haziran 2026)
- **MultiplayerBoard tam yenileme**: GameBoard'daki tüm HUD CSS sınıfları entegre edildi
- **Maç içi 90s geri sayaç**: Ranked maçlarda `RANKED_DURATION_MS` → 0 geri sayım; son 15s kırmızı nabız animasyonu
- **Özel oda sayacı**: Serbest maçlarda yukarı sayaç (süre sınırı yok)
- **MultiplayerResult tam yenileme**: Oyuncu sıralama tablosu, skor kartı, rank ilerleme barı
- **Forfeit sistemi**: Ranked maçtan ayrılan oyuncu rakibine 10 RP kazandırır

### v0.2 — Supabase Multiplayer (11 Haziran 2026)
- Supabase Auth (e-posta/şifre), PostgreSQL veri katmanı
- Gerçek zamanlı çok oyunculu (Supabase Realtime broadcast)
- Matchmaking kuyruğu, özel odalar, oda lobi

### v0.1 — Tek Oyunculu Temel (11 Haziran 2026)
- HTML5 Canvas + requestAnimationFrame oyun döngüsü
- İmpuls tabanlı daire çarpışma fiziği
- AI rakip, stamina/depar sistemi, şarj tabanlı şut
- Mobil joystick desteği

## Kullanıcı Tercihleri

- **Dil**: Türkçe UI, Türkçe değişken yorumları kabul edilir
- **Marka**: NovaBall, neon-spor karanlık tema (`#070d16` arka plan, neon yeşil saha)
- **Mobil**: Yatay ekran zorunlu; portrait modda döndürme talimatı
- **Tasarım**: Premium, minimal, cam efektli (`backdrop-filter: blur`) UI
- **Yeni ekranlar**: Her ekran hem masaüstü hem mobil yatay uyumlu olmalı
- **Canvas**: Oyuncular içinde sadece takım numarası — isim gösterme
- **Özel odalar**: Her zaman serbest (ranked/RP yok)

## Pointers

- `pnpm-workspace` skill: workspace yapısı, TypeScript kurulumu
- `supabase/` klasörü: SQL migration dosyaları (Supabase SQL Editor'da çalıştır)
- `supabase/001_ranked_multiplayer_fixes.sql`: `active_matches` ve `custom_rooms` tablolarına `ranked` kolonu ekler

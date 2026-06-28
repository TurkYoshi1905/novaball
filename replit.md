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
│   ├── CreateRoomPage.tsx    # Özel oda oluşturma (1v1–5v5, serbest mod)
│   ├── RoomLobbyPage.tsx     # Oda lobi (HaxBall tarzı premium takım seçimi)
│   ├── MatchIntroPage.tsx    # Maç geri sayımı (VS ekranı)
│   ├── MatchResult.tsx       # AI maç sonucu ekranı
│   ├── MultiplayerResult.tsx # Çok oyunculu sonuç — sıralama tablosu, RP, MVP rozeti
│   ├── LeaderboardPage.tsx   # Lider tablosu
│   ├── ProfilePage.tsx       # Oyuncu profili (rank hero, tabbed istatistikler)
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
MainMenu → CustomRooms → CreateRoom / RoomLobby → MatchIntro → MultiplayerBoard → custom-rooms
MainMenu → CustomRooms → (CANLI oda) → SpectatorBoard (izleyici modu)
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
- **Multiplayer'da diğer oyuncuların kick charge barı da görünür** — host, `kickCharge` bilgisini her oyuncu için game_state içinde yayınlar.

### Canvas Çizim Stili
- Oyuncular: takım renkli daire + içinde takım numarası + **dairenin altında displayName**.
- Multiplayer canvas: daire içinde `teamIndex` numarası, hemen altında oyuncu `displayName` etiketi (lokal oyuncu daha parlak).
- GameBoard (AI modu): daire içinde `name` metni, altında tekrar etiket (GameBoard stili).
- Stamina barı: oyuncunun altında renkli ince bar (yeşil/sarı/kırmızı).
- Kick charge arkı: basılı tutulunca oyuncunun etrafında renkli yay — **tüm oyunculara görünür**.
- Top: radyal gradient beyaz daire — sahip varsa takım rengi parıltısı, serbest ve hızlıysa hız parıltısı.
- Kale direkleri: beyaz küçük daireler.
- Possession aura: top sahibi oyuncunun etrafında radyal gradient halkası (takım rengiyle).
- RAF döngüsü dışında **asla** canvas'a yazılmaz.

### Çok Oyunculu (Multiplayer)
- **Host**, fiziği çalıştırır ve durumu yayınlar.
  - WebSocket aktifse: `SYNC_MS=25` (~40fps)
  - Supabase fallback'te: `SYNC_MS=50` (~20fps, rate limit koruması)
- **Client**, girdi değişince anında yayınlar; heartbeat `INPUT_HBEAT=200ms`.
  - WebSocket aktifse: `INPUT_MS=16` (~60fps)
  - Supabase fallback'te: `INPUT_MS=30` (~33fps)
- **İstemci-tarafı tahmin + Lerp reconciliation**:
  - Client kendi girişini her frame'de yerel fizik adımına uygular (60fps akıcı).
  - **Misafir modunda `physicsStep` yalnızca lokal oyuncu için çalışır** — uzak oyuncular yalnızca lerp ile hareket eder; çift-fizik titremesi yoktur.
  - Host durumu gelince: lokal oyuncu için hata büyüklüğüne göre yumuşak düzeltme (lerp 0.06), uzak oyuncular için her zaman lerp (0.32).
  - **Top da lerp ile yumuşatılır** — `ballTarget` aracılığıyla 0.22 faktörüyle kademeli yaklaşma.
  - Bu sayede jitter ve titreme ortadan kalkar.
- **Güç barı**: Host, her oyuncunun `kickCharge` değerini `game_state`'e dahil eder; tüm istemciler tüm oyuncuların şarj barını görür.
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
- Format: 1v1 (2), 2v2 (4), 3v3 (6), 4v4 (8), 5v5 (10) — HaxBall gibi oyuncu sınırı seçimi.
- Her takım maks `maxPlayers / 2` oyuncu alır.
- Mor tema (#a78bfa), yukarı sayaç (countup timer).
- Host veya herhangi bir oyuncu maçtan çıkınca oda Supabase'den silinir.
- `subscribeToRoom` null döndürünce misafirler atılır (2.5s sonra yönlendirme).
- Özel maç sonucu ekranı gösterilmez — direkt custom-rooms'a dönülür.
- Özel maçlar match_history'ye kaydedilmez, oyuncu istatistiklerini etkilemez.

### Rank Sistemi
- 7 kademe × 3 alt rank: toplam 19 rank seviyesi (Demir → Usta).
- RP localStorage + Supabase `players` tablosunda (dual storage).
- **Kazanınca RP kazan**: 1 gol→+10, 2→+14, 3→+18, 4→+22, 5+→+25 RP.
- **Kaybedince RP kaybet**: rastgele 10–20 RP düşer (`calcRPLoss()` utils/rankSystem.ts).
- **Takım maçlarında** (2v2–5v5) kaybeden takımdaki tüm oyuncular aynı rastgele RP miktarını kaybeder.
- **Forfeit cezası**: maçtan ayrılan 15 RP kaybeder, kalan oyuncu 10 RP kazanır.
- RP 0'ın altına düşemez (`Math.max(0, ...)`).
- Rank düşüşü: RP eşiğin altına düşünce otomatik alt ranka iner; sonuç ekranında bildirim gösterilir.

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
- **60 FPS + Lerp reconciliation**: Client tahmini + host durumu lerp ile birleştirilir; jitter yoktur
- **shouldMove guard**: Misafir modunda `physicsStep`, uzak oyuncuların hareketini atlar — sadece lokal oyuncu fiziği çalışır; uzak oyuncular saf lerp ile güncellenir (v0.1.8)
- **Player leave canvas fix**: `player_left` handler artık `g.players`, `g.remoteTargets`, `g.inputs`'tan siler; `game_state` handler da state'te olmayan oyuncuları kaldırır (v0.1.8)
- **Top lerp**: `ballTarget` aracılığıyla 0.22 faktörüyle kademeli güncellenir (eski: 0.18)
- **Adaptif sync hızı**: WebSocket'te 25ms/16ms, Supabase'de 50ms/30ms (eski WS: 33ms)
- **Uzak oyuncu lerp**: 0.32 faktör + hız tabanlı extrapolasyon (eski: 0.28)
- **Kick charge görünürlüğü**: Tüm oyuncuların güç barı herkese görünür (koşul `charge > 0.01`, transport fark etmez)
- **Gol tespiti**: Top kale çizgisini (FIELD_LEFT/FIELD_RIGHT) geçince gol sayılır
- **Sahipli top gol**: `hasBall` ayarlıyken top kale çizgisini geçerse gol sayılır (ayrı kontrol bloğu)
- **Özel oda maçı çıkışı**: Oyuncu maçtan çıkınca `room_leave` RPC → oda Supabase'den silinir; rakip otomatik lobiye döner
- **createRoom maxPlayers**: 1v1=2, 2v2=4, 3v3=6, 4v4=8, 5v5=10 — her takım maks `maxPlayers/2` oyuncu
- **Lobi ayrılma yayını**: Guest ayrılınca `player_left_lobby` broadcast → diğer oyuncular takım listesini anında günceller
- **Yazıyor göstergesi**: Canvas üzerinde konuşan oyuncunun başında animasyonlu speech bubble gösterilir

## GitHub Yayınlama

```bash
GITHUB_PAT=<token> bash github-sync.sh push "commit mesajı"
```

`GITHUB_PAT` Replit Secrets'a eklenmişse:
```bash
bash github-sync.sh push "NovaBall: güncelleme"
```

## Sürüm Geçmişi

### v0.1.9 — İzleyici Modu, Premium Özel Odalar & Stabilite (28 Haziran 2026)

> Özel oda maçları izleyici olarak takip edilebilir. Otomatik kamera, oyuncu kilitleme, gerçek zamanlı izleyici sayısı. Özel Odalar sayfası yeniden tasarlandı. Site yükleme süresi kısaltıldı.

#### ✨ Yeni Özellikler
- **İzleyici Modu**: CANLI odalarda "İzle" → `SpectatorBoard`. Kamera topu takip eder (1.35× zoom), oyuncu seçilince 1.6× zoom.
- **İzleyici sayacı**: Oda kartlarında ve SpectatorBoard HUD'unda gerçek zamanlı izleyici sayısı.
- **İzleyici sohbet**: İzleyiciler sohbete katılabilir; mesajlar oyunculara görünür.
- **Özel Odalar sayfası yeniden tasarlandı**: Takım avatar halkaları, fill bar, arama kutusu, canlı pulse, "İzle" / "Katıl" butonları.
- Site yükleme guard 6s → 3s; `supabase.ts` eksik env var için konsol uyarısı; Ayarlar `v0.1.9`.
- SQL: `custom_rooms.spectator_count`, `spectator_join` / `spectator_leave` RPC'leri → `20260628_009_spectator_mode.sql`

---

### v0.1.8 — Ghost Player Düzeltmesi, Guest Titreme Giderme, MainMenu Parlaklık & Landing Güncelleme (28 Haziran 2026)

> Maçtan ayrılan oyuncu artık canvas'ta kalmıyor. Guest oyuncuların titreme/kasma sorunu köklü fizik mimarisi değişikliğiyle giderildi. Ana menü daha parlak ve okunabilir. Landing Page FAQ hataları düzeltildi.

#### 🐛 Hata Düzeltmeleri
- **Ghost player düzeltildi**: `player_left` handler artık oyuncuyu `g.players`, `g.remoteTargets`, `g.inputs`'tan kaldırır; top sahipliğini temizler. `game_state` handler'ına da temizlik eklendi — beklenmedik disconnect'te de kaybolur.
- **Guest titreme/kasma kökten giderildi**: `physicsStep`'e `shouldMove` guard eklendi — misafir modunda yalnızca lokal oyuncunun fiziği çalışır; uzak oyuncular yanlış input tabanlı fizik yerine saf lerp ile hareket eder. Çift-fizik jitter'ı tamamen ortadan kalktı.

#### 🌐 Ağ / Performans
- Host WebSocket sync hızı: 33ms → 25ms (~30fps → ~40fps)
- Uzak oyuncu lerp faktörü: 0.28 → 0.32
- Top lerp faktörü: 0.18 → 0.22

#### 🎨 Arayüz
- **MainMenu parlaklık**: Arka plan gradient aydınlatıldı, tüm kart border/bg opacity artırıldı (Özel Oda, Serbest Oyun, Leaderboard, Reviews), alt metin kontrast iyileştirildi.
- **LandingPage FAQ düzeltildi**: "Kaybetmek RP düşürmez" yanlış bilgisi düzeltildi — kaybedince −10–20 RP, maçtan kaçınca −15 RP. Güvenlik FAQ sorusu eklendi. Özellikler: "AI Rakip" → "Güvenli Altyapı".

---

### v0.1.4 — Gol & Misafir Kasma Düzeltmeleri, Discord İkonu, Replit Geçişi (19 Haziran 2026)

> Çok oyunculu gol sayılmaması ve misafir kasma sorunları kökten çözüldü. Discord ikonu PNG ile güncellendi. Proje Replit pnpm workspace'e taşındı.

#### 🐛 Hata Düzeltmeleri
- **Gol sayılmıyor düzeltildi**: Sert clamp (`GOAL_LEFT_X + BALL_RADIUS`) topun kale çizgisine ulaşmasını engelliyordu. Gol tespiti artık `FIELD_LEFT`/`FIELD_RIGHT` kale çizgisi geçişinde tetikleniyor.
- **Sahipli top golü**: `hasBall` ayarlıyken top kale çizgisini geçerse gol sayılır — önceden bu durum hiç işlenmiyordu.
- **Misafir kasma düzeltildi**: Top konumu artık `ballTarget` aracılığıyla 0.3 lerp faktörüyle yumuşatılıyor; host güncellemelerinin 33ms'de bir snap yapması görünmez hale getirildi.

#### 🎨 Arayüz
- Discord navbar ikonu inline SVG'den PNG resmine güncellendi.

---

### v0.1.3 — Misafir Oynama, Kick-Off Mekaniği, Sohbet İyileştirmeleri & İncelemeler (19 Haziran 2026)

> Landing Page'e kayıtsız oyun dene butonu eklendi. Gol sonrası kick-off pozisyonu uygulandı. Çok oyunculu sohbet klavyeyi artık bloklamaması düzeltildi + okunmamış mesaj badge. İnceleme sayfası eklendi (puan, yorum, beğeni, yanıt).

#### 🎮 Misafir Oynama
- Landing Page'e **"Kayıt Olmadan Dene"** butonu eklendi
- `TestBoard.tsx`: hesap oluşturmadan AI'ya karşı oynanan misafir deney tahtası
- Üstte Kayıt Ol / Giriş Yap yönlendirme banner'ı

#### ⚽ Kick-Off Mekaniği
- Gol sonrasında resetPos'ta top, kick-off alacak takımın yarısına hafifçe fırlatılır
- `kickoffBlockTeam`: gol atan takım orta çizgiyi rakip topa değene kadar geçemez
- AI modu (`useGamePhysics`) ve çok oyunculu mod (`useMultiplayerPhysics`) her ikisinde de aktif

#### 💬 Sohbet İyileştirmeleri (Multiplayer)
- Sohbet input'u odaklandığında klavye tuşları oyun hareket kontrollerini engellemez (`chatFocusedRef`)
- Sohbet kapalıyken gelen yeni mesajlarda kırmızı **okunmamış mesaj sayacı** badge görünür
- Sohbet açılınca sayaç sıfırlanır

#### ⭐ İnceleme Sayfası
- `ReviewPage.tsx`: oyunculara yıldız puanı (1–5) verme, yorum yazma imkânı
- Yorumlara beğeni ve yanıt desteği
- `game_reviews`, `game_comments`, `comment_votes` Supabase tabloları
- SQL migration: `supabase/migrations/20260619_005_reviews_comments.sql`

---

### v0.1.2 — Yapay Zeka Gerçekçiliği, Depar Titreşme Düzeltmesi & Premium Podium (18 Haziran 2026)

> AI depar titreşmesi ve merkez donma sorunu giderildi. Dribble sırasında sinüs tabanlı lateral salınım eklendi. Lider tablosu podium'u gerçek basamak yükseklikleriyle premium şekilde yeniden tasarlandı.

#### 🤖 Yapay Zeka
- **Depar titreşmesi düzeltildi**: sprint histerezis — başlama eşiği 42, durdurma 10 (her ikisi için 15 kullanılıyordu)
- **Merkez çizgisi donması düzeltildi**: CENTER_X ±40px ölü bölgesi — savunma/hücum mod titreşmesi önlendi
- **Serbest top sprint eşiği** 100px → 180px: AI topa yakınken gereksiz sprint yapmıyor
- **Oyuncu kovalama**: stamina > 35 olmadan sprint yapmaz, daha dengeli stamina yönetimi
- **Gerçekçi dribble**: sinüs tabanlı lateral salınım (±34px, ~140 frame periyot) — AI artık düz değil, sola-sağa savurarak ilerliyor
- **Dinamik şut mesafesi**: ~8s döngüyle 190px veya 310px — tahmin edilmesi zor, çeşitli pozisyonlardan atış

#### 🏆 Arayüz
- **Podium yeniden tasarlandı**: gerçek basamak kaidesı — 1. sıra 72px, 2. sıra 44px, 3. sıra 20px
- 1. sıra kartı daha büyük avatar (64px), daha büyük RP (text-3xl), üst kenarda altın çizgi
- Her kaidenin içinde 🥇🥈🥉 emoji, renk kodlu kenar ve glow efektleri

#### 🏠 Lobi Gerçek Zamanlılık (önceki patch)
- `player_left_lobby` broadcast: ayrılan oyuncu anında takım listesinden siliniyor (postgres_changes bağımsız)
- `room_leave` RPC JSONB düzeltmesi (`20260618_004_room_leave_fix.sql`)

---

### v0.1.1 — Yazıyor Göstergesi, Sistem Mesajları & Extrapolasyon Lerp (18 Haziran 2026)

> Canvas üzerinde yazıyor balonu, oyuncu giriş/çıkış sistem mesajları ve hız tabanlı extrapolasyon lerp ile uzak oyuncu hareketi daha pürüzsüz.

#### 💬 Yazıyor Göstergesi
- Canvas üzerinde konuşan oyuncunun başında animasyonlu speech bubble gösterilir
- `typing_start` broadcast eventi: metin yazılınca tetiklenir, 2s sonra otomatik söner

#### 📢 Sistem Mesajları
- Oyuncu odaya katılınca / ayrılınca sohbette sistem mesajı gösterilir (`player_joined`, `player_left`)
- `room_closed` broadcast: host maçı bitirince tüm clientlar bilgilendirilir

#### 🌐 Ağ / Performans
- Hız tabanlı extrapolasyon lerp: `receivedAt` timestamp + `0.28` lerp faktörü — host 30fps güncelleme gönderse bile uzak oyuncu hareketi görsel 60fps akıcılığında

---

### v0.1.0 — Misafir Kasma Düzeltmesi, Gelişmiş Yapay Zeka & Daha Geniş Kaleler (18 Haziran 2026)

> Çok oyunculu misafir kasması kökten çözüldü (60fps lerp). AI savunma ve hücum yönleri düzeltildi. Tüm modlarda kaleler dikey olarak büyütüldü.

#### 🌐 Ağ / Performans
- Misafir kasma sorunu giderildi: uzak oyuncular için per-frame `0.20` lerp interpolasyon sistemi — host 30fps güncelleme gönderse bile görsel hareket 60fps akıcılığında
- Guest RAF döngüsüne uzak oyuncu lerp bloğu eklendi; 30fps snaplama kayboldu

#### 🤖 Yapay Zeka
- **Savunma yönü düzeltildi**: AI artık sağ kaleyi koruyor (eskiden sol kaleye savunma yapıyordu)
- **Hücum kesme düzeltildi**: oyuncu topa sahipken AI sağ kalenin önünü kesiyor (eskiden yanlış yöne gidiyordu)
- **Sprint koşulları güncellendi**: top sağa doğru hızlıyken + toptan uzak olunca sprint

#### ⚽ Kale
- `GOAL_HEIGHT`: 150 → 180 piksel (tüm modlarda geçerli)

---

### v0.0.9 — Rekabetçi RP Kaybı, Rank Düşüşü & Arayüz Güncellemeleri (16 Haziran 2026)

> Yenilgi artık 10–20 rastgele RP kaybına, olası rank düşüşüne yol açıyor. Rank Sistemi sayfası premium yeniden tasarım, RP Nedir açıklaması. Lider Tablosu podium + arama + sekmeler. Landing Page rank düşüş bilgisi.

#### ⚔️ RP Kaybı & Rank Düşüşü
- Kaybeden oyuncu rastgele **10–20 RP** kaybeder (`calcRPLoss()`)
- 2v2–5v5: kaybeden takımdaki **tüm oyuncular aynı** RP miktarını kaybeder
- Forfeit: ayrılan 15 RP kaybeder, kalan 10 RP kazanır
- RP 0'ın altına düşemez
- Rank eşiğin altına düşünce sonuç ekranında "Rank Düştün!" bildirimi

#### 🎨 Arayüz
- Rank Sistemi sayfası: hero kart, RP Nedir? kutusu, accordion tier listesi, lucide ikonlar
- Lider Tablosu: podium, arama, Tümü/Aktif sekmeleri, G.O. barları
- Sonuç ekranları: yeşil +RP / kırmızı −RP kartları, rank yükseliş/düşüş bildirimleri

---

### v0.0.7 — Ayarlar, Özelleştirilebilir Tuşlar & Kendi Kalesine Atma Önlemi (15 Haziran 2026)

> Premium Ayarlar sayfası (hesap/kontroller/hakkında), tuş atama özelleştirme, multiplayer çift-şarj hatası düzeltmesi ve kendi kalesine atma önlemi.

#### ⚙️ Ayarlar Sayfası
- **Hesap sekmesi**: Kullanıcı adı değiştirme (debounced uygunluk kontrolü), görünen ad güncelleme, şifre değiştirme modali
- **Kontroller sekmesi**: WASD / Space / Shift tuşları oyun içinde özelleştirilebilir; ayarlar localStorage'a kaydedilir; "Varsayılana sıfırla" butonu
- **Hakkında sekmesi**: Sürüm bilgisi, kuruluş tarihi, destek e-postası, yasal metin
- Ana menüdeki oyuncu kartına ⚙️ Settings butonu eklendi (LogOut'un yanına)
- `change_username` ve `change_display_name` Supabase SECURITY DEFINER RPC'leri

#### 🎯 Tuş Atamaları
- `utils/keybindings.ts`: `Keybindings` arayüzü, `DEFAULT_KEYBINDINGS`, `ALT_KEYS`, `KEY_LABEL`, `loadKeybindings`, `saveKeybindings`
- Hem `useGamePhysics` hem `useMultiplayerPhysics` hook'u keybindings sistemi kullanıyor
- Alt tuşlar (ArrowKeys + KeyX + ShiftRight) her zaman aktif; yalnızca birincil tuşlar özelleştirilebilir

#### 🐛 Hata Düzeltmeleri
- **Multiplayer çift-şarj**: `physicsStep` artık `localPlayer` parametresi alıyor
- **Kendi kalesine atma önlemi**: Sol kaleye kırmızı, sağ kaleye mavi oyuncu attığında gol sayılmaz

---

### v0.0.6 — Premium Landing Page, Maça Katılım & HaxBall Özel Odalar (14 Haziran 2026)
### v0.0.5 — 60 FPS Akıcılık & Kick Charge Görünürlüğü (13 Haziran 2026)
### v0.0.4 — Stabilite & Ağ Optimizasyonu (13 Haziran 2026)
### v0.0.3 — Çok Oyunculu Altyapı (12 Haziran 2026)
### v0.0.2 — Auth & Profil (12 Haziran 2026)
### v0.0.1 — İlk Sürüm (11 Haziran 2026)

## User preferences

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
- `supabase/migrations/20260614_001_novaball_schema.sql`: Tam şema (tüm tablolar, RLS, RPC'ler) — **ilk kurulumda çalıştır**
- `supabase/migrations/20260618_003_room_cleanup.sql`: `room_leave` RPC (host çıkışı + stale oda temizliği) — v0.1.1 ile eklendi; `cleanup_stale_rooms()` için `DROP FUNCTION IF EXISTS` eklendi (return type çakışması düzeltildi)
- `supabase/migrations/20260618_004_room_leave_fix.sql`: `room_leave` RPC JSONB düzeltmesi (guest lobi çıkışı) — v0.1.2 ile eklendi; **mutlaka çalıştır**
- `supabase/migrations/20260619_005_reviews_comments.sql`: Yorum & değerlendirme tabloları (`game_reviews`, `game_comments`, `comment_votes`) + RLS — v0.1.3 ile eklendi
- `supabase/migrations/20260619_006_reviews_rls_fix.sql`: Review/yorum RLS `auth.users` izin hatası düzeltmesi — `auth.jwt()` ile yeniden yazıldı; **yıldız değiştirince 42501 hatası alıyorsan çalıştır**

### SQL Çalıştırma Sırası (Supabase SQL Editor)

| Sıra | Dosya | Açıklama |
|------|-------|---------|
| 1 | `20260614_001_novaball_schema.sql` | Tam şema — ilk kurulum |
| 2 | `20260618_003_room_cleanup.sql` | room_leave v2 + stale temizlik |
| 3 | `20260618_004_room_leave_fix.sql` | room_leave JSONB düzeltmesi |
| 4 | `20260619_005_reviews_comments.sql` | Yorum & değerlendirme tabloları |
| 5 | `20260619_006_reviews_rls_fix.sql` | RLS `auth.users` → `auth.jwt()` düzeltmesi |
| 6 | `20260619_007_security_hardening.sql` | Güvenlik sertleştirme: get_email_by_username kaldırma, verify_username_email ekleme, hatalı RLS politikaları temizleme |
| 7 | `20260619_008_drop_players_email.sql` | **KRİTİK**: players.email kolonu kaldırıldı; verify_username_email artık auth.users'dan okur; create_player yeni imza |

> **Not**: İlk kez kuruyorsan 1 → 7 sırasıyla çalıştır. Sadece güvenlik düzeltmelerini uygulamak istiyorsan **6 → 7** sırasıyla çalıştır.

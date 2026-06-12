# NovaBall

**NovaBall**, Haxball ve Mamoball'dan ilham alan modern bir 2D tepeden görünümlü arcade futbol oyunudur. React 19, TypeScript ve Vite üzerine inşa edilmiş, Supabase destekli tam hesap sistemiyle çalışan tarayıcı tabanlı bir oyundur. Hem masaüstü (klavye) hem de mobil yatay ekran (dokunmatik joystick) desteklenmektedir.

## Kurulum ve Çalıştırma

```bash
npm run dev        # geliştirme sunucusu (port 5000)
npm run build      # üretim derlemesi → dist/
npm run typecheck  # TypeScript tip kontrolü
```

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Dil | TypeScript 5.9 (strict) |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 |
| Oyun döngüsü | HTML5 Canvas + requestAnimationFrame |
| Fizik | `useGamePhysics.ts` — özel impuls tabanlı motor |
| Auth & Veri | Supabase (Email Auth + PostgreSQL + Realtime) |
| Görsel paylaşım | html-to-image (maç sonuç kartı PNG üretimi) |
| Mobil | Dokunmatik sanal joystick + aksiyon butonları |

## Proje Yapısı

```
src/
├── types/
│   └── game.ts                 # Sabitler, arayüzler (Player, Ball, AppScreen, MatchResultData…)
├── utils/
│   ├── rankSystem.ts           # Rank kademeleri, RP hesaplama, localStorage yardımcıları
│   └── changelogData.ts        # Sürüm geçmişi verileri (ChangelogEntry[])
├── hooks/
│   └── useGamePhysics.ts       # 60 FPS fizik motoru, AI, canvas çizimi
├── lib/
│   ├── supabase.ts             # Supabase istemcisi
│   ├── db.ts                   # DB yardımcıları: profil, maç, lider tablosu, RP sync
│   ├── auth.ts                 # Auth sarmalayıcıları: signIn, signUp, signOut, resend
│   └── utils.ts                # cn() ve genel yardımcılar
├── components/
│   ├── auth/
│   │   ├── LoginPage.tsx       # Giriş: kullanıcı adı + e-posta + şifre, "Hoşgeldin! 👋"
│   │   ├── RegisterPage.tsx    # Kayıt: görünen ad, kullanıcı adı, e-posta, şifre + güç göstergesi
│   │   └── EmailVerifyPage.tsx # E-posta doğrulama bekleme + tekrar gönderme
│   ├── ui/                     # Shadcn-benzeri temel UI bileşenleri
│   ├── GameBoard.tsx           # Canvas sarmalayıcı + HUD + mobil kontroller
│   ├── MainMenu.tsx            # Ana menü — rank rozeti, oyun modları, navigasyon
│   ├── MatchResult.tsx         # Maç sonu: RP, rank ilerleme, paylaşım butonu
│   ├── ShareCard.tsx           # 540×540 PNG paylaşım kartı (html-to-image)
│   ├── LeaderboardPage.tsx     # Lider tablosu — Realtime, aktif oyuncu göstergesi
│   ├── ProfilePage.tsx         # Oyuncu profili ve maç geçmişi
│   ├── MobileControls.tsx      # Dokunmatik joystick + şut/depar butonları
│   ├── RankPage.tsx            # Tüm rank kademelerinin detay sayfası
│   └── ChangelogPage.tsx       # Sürüm geçmişi sayfası (changelogData.ts'den beslenur)
├── App.tsx                     # Ekran durum makinesi
└── index.css                   # Tailwind v4 direktifleri + özel stiller
supabase/
└── schema.sql                  # Şema v3.1.0 — players, match_history, RLS, RPC fonksiyonları
.migration-backup/
└── replit.md                   # Sürüm geçmişi ve değişiklik notları
github-sync.sh                  # GitHub push/pull otomasyon scripti
```

## Ekran Akışı

```
LoginPage ──→ RegisterPage ──→ EmailVerifyPage
    │                               │ (doğrulama bağlantısına tıklayınca)
    └───────────────────────────────┘
                    ↓
                MainMenu ──→ GameBoard (Serbest Oyun)
                    │    ──→ GameBoard (Rekabet) ──→ MatchResult ──→ MainMenu
                    │    ──→ LeaderboardPage
                    │    ──→ ProfilePage
                    └──→ RankPage / ChangelogPage
```

`AppScreen` union type: `"login" | "register" | "email-verify" | "menu" | "playing" | "ranked" | "result" | "leaderboard" | "profile" | "rankpage" | "changelog"`

## Mimari Kararlar

### Auth & Kayıt
- **Supabase Email+Password Auth** — e-posta doğrulama zorunlu.
- **Kayıt**: `signUp()` → `createPlayer()` → `EmailVerifyPage`.
- **Giriş**: `get_email_by_username()` RPC ile kullanıcı adı → e-posta bulunur → `signIn(email, password)`.
- **E-posta doğrulama**: Supabase `onAuthStateChange` ile `EMAIL_CONFIRMED` eventi → otomatik ana menü.
- Kullanıcı adı kısıtlaması: `^[a-z0-9]{3,15}$` — DB constraint + frontend doğrulama.

### Veri & Senkronizasyon
- **RP ikili yazma**: `localStorage` (anlık) + Supabase (kalıcı). Sunucu değeri > yerel ise sunucu esas alınır.
- **Lider tablosu**: Supabase Realtime subscription ile anlık güncelleme; `last_seen < 5dk` → "Aktif" rozeti.
- **Periyodik last_seen**: Oturum açık iken her 2 dakikada bir güncellenir.

### Share Card
- `MatchResult` → "Sonuç Kartını Paylaş" → `ShareCard` modal.
- `html-to-image toPng()` ile `CardFace` div'i 540×540, 2× piksel yoğunluklu PNG'ye dönüştürülür.
- Web Share API (mobil) / İndirme (`<a download>`) / `navigator.clipboard.write()` desteği.
- Rank tier rengine göre dinamik glow, gradient ve progress bar.

### Fizik Motoru
- Tüm değişken oyun durumu `useRef` — her frame React re-render tetiklenmez.
- Yalnızca HUD verisi (`score`, `gameTime`, `goalFlash`) için `useState`.
- 60 FPS kilidi: `ts - lastTs < FRAME_MS - 2` koşuluyla 120Hz'de çift frame atlanır.
- Şarj şutu: `kickCharge` 0→1 arası dolar (~0.75s), bırakınca `MIN_KICK_POWER + delta * kickCharge`.

## Oyun Sabitleri

| Sabit | Değer | Açıklama |
|-------|-------|---------|
| `CANVAS_WIDTH/HEIGHT` | 1200×675 | Oyun alanı (16:9) |
| `RANKED_DURATION_MS` | 90 000 ms | Rekabet maçı süresi |
| `PLAYER_MAX_SPEED` | 4.8 | Normal maksimum hız |
| `SPRINT_SPEED_MULT` | 1.75 | Depar hız çarpanı |
| `STAMINA_MAX` | 100 | Maksimum stamina |
| `MIN_KICK_POWER` | 5 | Minimum şut gücü |
| `MAX_KICK_POWER` | 15 | Maksimum şut gücü |
| `CHARGE_RATE` | 0.022/frame | Güç barı dolma hızı |
| `FRAME_MS` | 16.667 ms | 60 FPS kilidi |
| `FOUNDING_DATE` | "11 Haziran 2026" | Oyun kuruluş tarihi |

## Rank Sistemi

- **19 seviye**: Demir I-III → Bronz I-III → Gümüş I-III → Altın I-III → Platin I-III → Elmas I-III → Usta
- RP `localStorage`'da `novaball_rp` anahtarıyla saklanır; Supabase ile senkronize edilir.
- Yenilgide RP kaybı yoktur.
- RP formülü (kazanınca): 1 gol→+10, 2→+14, 3→+18, 4→+22, 5+→+25

## Veritabanı Şeması (v3.1.0)

### `players` tablosu
| Kolon | Tip | Açıklama |
|-------|-----|---------|
| `username` | TEXT PK | `^[a-z0-9]{3,15}$` |
| `display_name` | TEXT | Profil/lider tablosunda görünen ad (max 32) |
| `email` | TEXT UNIQUE | Supabase Auth e-postası |
| `auth_id` | UUID | Supabase Auth kullanıcı ID'si |
| `rp` | INTEGER | Rank Puanı (≥0) |
| `total_matches/wins/losses/draws` | INTEGER | Maç istatistikleri |
| `total_goals_scored/conceded` | INTEGER | Gol istatistikleri |
| `last_seen` | TIMESTAMPTZ | Aktif oyuncu göstergesi için |

### RPC Fonksiyonları
| Fonksiyon | Açıklama |
|-----------|---------|
| `get_email_by_username(username)` | Kullanıcı adından e-posta döner (giriş için) |
| `is_username_available(username)` | Kullanıcı adı müsaitliği kontrol eder |
| `get_leaderboard(limit)` | `is_active` alanıyla sıralı oyuncu listesi |

### RLS Politikaları
- `players`: okuma herkese açık; INSERT/UPDATE/DELETE yalnızca `auth_id = auth.uid()`.
- `match_history`: okuma herkese açık; INSERT yalnızca kendi kullanıcı adına.

## GitHub Senkronizasyonu

```bash
# GitHub'a gönder
GITHUB_PAT=<token> bash github-sync.sh push "commit mesajı"

# GitHub'dan çek
GITHUB_PAT=<token> bash github-sync.sh pull
```

`GITHUB_PAT` Replit Secret olarak eklenmelidir.

## User Preferences

- **Dil**: Türkçe UI, Türkçe değişken yorumları kabul edilir.
- **Marka**: NovaBall — neon-spor karanlık tema (`#070d16`, neon mavi `#44aaff` aksan).
- **Mobil**: Yatay ekran zorunlu; portrait modda döndürme talimatı gösterilir.
- **Tasarım**: Premium, minimal, glassmorphism UI (`backdrop-filter: blur`).
- **Yeni ekranlar**: Hem masaüstü (max-w-sm/lg, merkez) hem mobil yatay uyumlu olmalı.

## Gotchas

- `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` → Replit Secrets (env var değil).
- `html-to-image` paketi orijinal repoda eksikti — `npm install html-to-image` ile eklendi.
- Vite config: `host: "0.0.0.0"`, `port: 5000`, `allowedHosts: true` — Replit proxy zorunluluğu.
- Supabase Dashboard → Authentication → Confirm email: **ON** olmalı.
- `github-sync.sh` flat kök yapısını (src/ doğrudan workspace altında) kullanır.

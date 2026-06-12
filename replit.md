# NovaBall

**NovaBall**, Haxball ve Mamoball'dan ilham alan modern bir 2D tepeden görünümlü arcade futbol oyunudur. React 19, TypeScript ve Vite üzerine inşa edilmiş, Supabase destekli tam hesap sistemiyle çalışan tarayıcı tabanlı bir oyundur. Hem masaüstü (klavye) hem de mobil yatay ekran (dokunmatik joystick) desteklenmektedir.

## Kurulum ve Çalıştırma

```bash
npm run dev        # oyunu başlat (port 5000)
npm run build      # üretim derlemesi (dist/)
npm run typecheck  # TypeScript tip kontrolü
```

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Dil | TypeScript 5.9 (strict) |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 |
| Oyun döngüsü | HTML5 Canvas + requestAnimationFrame |
| Fizik | `useGamePhysics.ts` içinde özel impuls tabanlı motor |
| Auth & Veri | Supabase (Email Auth + PostgreSQL + Realtime) |
| Görsel paylaşım | html-to-image (maç sonuç kartı oluşturma) |
| Mobil | Dokunmatik sanal joystick + aksiyon butonları |

## Proje Yapısı

```
src/
├── types/
│   └── game.ts               # Tüm sabitler, arayüzler (Player, Ball, Score, MobileInput…)
├── utils/
│   ├── rankSystem.ts         # Rank kademeleri, RP hesaplama, localStorage yardımcıları
│   └── changelogData.ts      # Değişiklik günlüğü verileri
├── hooks/
│   └── useGamePhysics.ts     # Fizik motoru, AI, oyun döngüsü, canvas çizimi
├── lib/
│   ├── supabase.ts           # Supabase istemcisi (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
│   ├── db.ts                 # DB yardımcıları (profil, maç geçmişi, lider tablosu, RP senkronizasyonu)
│   ├── auth.ts               # Supabase Auth sarmalayıcıları (signIn, signUp, signOut)
│   └── utils.ts              # Genel yardımcı fonksiyonlar
├── components/
│   ├── auth/
│   │   ├── LoginPage.tsx      # Giriş ekranı (kullanıcı adı + e-posta + şifre)
│   │   ├── RegisterPage.tsx   # Kayıt ekranı (görünen ad, kullanıcı adı, e-posta, şifre)
│   │   └── EmailVerifyPage.tsx # E-posta doğrulama bekleme ekranı
│   ├── GameBoard.tsx          # Canvas wrapper + HUD + MobileControls entegrasyonu
│   ├── MainMenu.tsx           # Ana menü (rank rozeti, oyun modları)
│   ├── MatchResult.tsx        # Rekabet maçı sonuç ekranı (RP, rank ilerleme, paylaşım)
│   ├── ShareCard.tsx          # Sosyal medya paylaşım kartı (html-to-image ile PNG üretimi)
│   ├── LeaderboardPage.tsx    # Lider tablosu (canlı Realtime, aktif oyuncu göstergesi)
│   ├── ProfilePage.tsx        # Oyuncu profili ve maç geçmişi
│   ├── MobileControls.tsx     # Dokunmatik joystick + şut/depar butonları
│   ├── RankPage.tsx           # Tüm rank kademelerini gösteren bilgi sayfası
│   └── ChangelogPage.tsx      # Güncelleme notları sayfası
├── App.tsx                    # Ekran durum makinesi (screen router)
└── index.css                  # Tailwind v4 + tüm özel stiller
supabase/
└── schema.sql                 # DB şeması (players, match_history, RLS, RPC)
```

## Ekran Akışı

```
LoginPage  →  RegisterPage  →  EmailVerifyPage
    │                                │
    └──────── (doğrulandı) ──────────┘
                    │
                 MainMenu  →  GameBoard (Serbest Oyun)
                    │      →  GameBoard (Rekabet) → MatchResult → MainMenu
                    │      →  LeaderboardPage
                    │      →  ProfilePage
                    └──────→  RankPage / ChangelogPage
```

## Mimari Kararlar

### Auth & Veri
- **Supabase Email+Password Auth** — tam hesap sistemi, e-posta doğrulama zorunlu.
- **RP ikili yazma** — hem `localStorage` (anlık geri bildirim) hem Supabase'e (kalıcılık).
- **Lider tablosu Realtime** — Supabase Realtime subscription ile canlı güncelleme.
- **Aktif oyuncu göstergesi** — `last_seen` < 5 dakika ise yeşil nokta + "Aktif" rozeti.

### Kayıt Sistemi
- Görünen Ad (profil & lider tablosunda görünen isim)
- Kullanıcı Adı — yalnızca küçük harf + rakam, 3-15 karakter, gerçek zamanlı müsaitlik kontrolü
- E-posta ve şifre (güç göstergesi dahil)
- Kayıt sonrası e-posta doğrulama bağlantısı gönderilir

### Giriş Sistemi
- Kullanıcı adı + e-posta + şifre kombinasyonu doğrulanır
- `get_email_by_username` RPC ile kullanıcı adı → e-posta eşleşmesi kontrol edilir
- E-posta doğrulanmamışsa `EmailVerifyPage`'e yönlendirilir

### Share Card (Paylaşım Kartı)
- Maç sonrasında `MatchResult`'tan tetiklenir
- `html-to-image` ile 540×540 PNG oluşturulur
- Web Share API / İndirme / Panoya Kopyalama desteklenir
- Rank rengine göre dinamik tasarım

### Fizik Motoru
- İmpuls tabanlı daire çarpışma çözümleme
- Top hakimiyeti (possession) + şarj tabanlı şut sistemi
- Stamina/depar sistemi: STAMINA_MAX=100
- 60 FPS kilidi (120Hz ekranlarda çift kare atlanır)
- AI: topa yaklaşma, gol savunma, rastgele atış

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
| `FRAME_MS` | 16.667ms | 60 FPS kilidi |
| `FOUNDING_DATE` | "11 Haziran 2026" | Oyun kuruluş tarihi |

## Rank Sistemi

- 7 kademe × 3 alt rank (Usta hariç): toplam 19 seviye
- Kademeler: Demir → Bronz → Gümüş → Altın → Platin → Elmas → Usta
- RP localStorage'da `novaball_rp` anahtarıyla saklanır
- Yenilgide RP kaybı yoktur (yeni başlayanlar için)
- RP formülü: 1 gol→10, 2→14, 3→18, 4→22, 5+→25

## User preferences

- **Dil**: Türkçe UI
- **Marka**: NovaBall, neon-spor karanlık tema (`#070d16` arka plan, neon mavi aksanlar)
- **Mobil**: Yatay ekran zorunlu; portrait modda döndürme talimatı gösterilir
- **Tasarım**: Premium, minimal, cam efektli (`backdrop-filter: blur`) UI öğeleri
- **Yeni ekranlar**: Hem masaüstü hem mobil yatay uyumlu olmalı

## Gotchas

- `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` Replit Secrets olarak ayarlanmalı.
- `html-to-image` paketi `package.json`'a manuel eklenmiştir (orijinal repoda eksikti).
- Vite dev server `host: "0.0.0.0"`, `port: 5000`, `allowedHosts: true` gerektiriyor.
- `github-sync.sh` push için `GITHUB_PAT` Replit Secret gerektirir.

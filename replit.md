# NovaBall

**NovaBall**, Haxball ve Mamoball'dan ilham alan modern bir 2D tepeden görünümlü arcade futbol oyunudur. React 19.2, TypeScript ve HTML5 Canvas üzerine inşa edilmiş, tamamen tarayıcı tabanlı ve sunucu gerektirmeyen bir oyundur. Hem masaüstü (klavye) hem de mobil yatay ekran (dokunmatik joystick) desteklenmektedir.

## Kurulum ve Çalıştırma

```bash
pnpm --filter @workspace/novaball run dev       # oyunu başlat
pnpm --filter @workspace/novaball run typecheck  # tip kontrolü
pnpm run typecheck                               # tüm paketleri kontrol et
pnpm run build                                   # tip kontrolü + derleme
```

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Monorepo | pnpm workspaces, Node.js 24 |
| Dil | TypeScript 5.9 (strict) |
| Frontend | React 19.2 + Vite + Tailwind CSS v4 |
| Oyun döngüsü | HTML5 Canvas + requestAnimationFrame |
| Fizik | `useGamePhysics.ts` içinde özel impuls tabanlı motor |
| Veri saklama | Yalnızca localStorage (sunucu yok, veritabanı yok) |
| Mobil | Dokunmatik sanal joystick + aksiyon butonları |

## Proje Yapısı

```
artifacts/novaball/src/
├── types/
│   └── game.ts               # Tüm sabitler, arayüzler (Player, Ball, Score, MobileInput…)
├── utils/
│   └── rankSystem.ts         # Rank kademeleri, RP hesaplama, localStorage yardımcıları
├── hooks/
│   └── useGamePhysics.ts     # Fizik motoru, AI, oyun döngüsü, canvas çizimi (HEPSİ BURADA)
├── components/
│   ├── UsernameScreen.tsx    # İlk açılış ekranı (kullanıcı adı girişi)
│   ├── MainMenu.tsx          # Ana menü (rank rozeti, oyun modları, nasıl oynanır)
│   ├── GameBoard.tsx         # Canvas wrapper + HUD + MobileControls entegrasyonu
│   ├── MobileControls.tsx    # Dokunmatik joystick + şut/depar butonları
│   ├── MatchResult.tsx       # Rekabet maçı sonuç ekranı (RP, rank ilerleme)
│   └── RankPage.tsx          # Tüm rank kademelerini gösteren bilgi sayfası
├── App.tsx                   # Ekran durum makinesi (screen router)
└── index.css                 # Tailwind v4 + tüm özel stiller (oyun HUD, mobil kontroller…)
```

## Ekran Akışı

```
UsernameScreen  →  MainMenu  →  GameBoard (Serbest Oyun)
                     │       ↘  GameBoard (Rekabet Modu) → MatchResult → MainMenu
                     └──────→  RankPage
```

`App.tsx` içindeki `AppScreen` tipi:
`"username" | "menu" | "rankpage" | "playing" | "ranked" | "result"`

## Mimari Kararlar

### Durum Yönetimi
- **Tüm değişken oyun durumu `useRef` içinde tutar** — her frame'de React re-render tetiklemez.
- Yalnızca `score`, `gameTime`, `goalFlash` için `useState` kullanılır (bunlar HUD'a yansıtılır).
- `useGamePhysics` hook'u hem fiziği hem canvas çizimini yönetir (tek sorumluluk noktası).

### Fizik Motoru (`useGamePhysics.ts`)
- İmpuls tabanlı daire çarpışma çözümleme.
- Top hakimiyeti (possession): oyuncu topa değdiğinde otomatik alır, çalma için depar gerekir.
- Stamina/depar sistemi: `STAMINA_MAX=100`, hızlı tükenme + yavaş toparlanma.
- Kale direkleri küçük daireler olarak modellenmiştir (gerçekçi sekme için).
- **NaN koruma**: `safe()` yardımcısı + `isFinite` guards tüm canvas çizim çağrılarında mevcut.
- Mobil joystick girişi: `MobileInput` ref'i her frame'de klavye durumuna eklenir (birleşik kontrol).

### Mobil Destek
- `MobileInput` arayüzü: `{ dx, dy, shoot, sprint }` — fizik motoru her iki girişi de işler.
- `MobileControls.tsx`: sanal joystick (sol) + şut/depar butonları (sağ).
- `isTouchDevice` sabit (window.ontouchstart veya maxTouchPoints) ile donanım algılaması.
- Portait modda `portrait-overlay` devreye girer ve ekranı döndürme talimatı gösterir.
- **Canvas responsive**: `aspect-ratio: 16/9` + `width: 100%` ile tüm ekran boyutlarına uyum sağlar.

### Rank Sistemi (`rankSystem.ts`)
- 7 kademe × 3 alt rank (Usta hariç tek): toplam 19 rank seviyesi.
- Kademeler: Demir → Bronz → Gümüş → Altın → Platin → Elmas → Usta.
- RP localStorage'da `novaball_rp` anahtarıyla saklanır.
- Yenilgide RP kaybı **yoktur** (yeni başlayanlar için bariyersiz deneyim).
- RP formülü: 1 gol→10, 2→14, 3→18, 4→22, 5+→25 (sadece kazanınca verilir).

### Canvas Çizimi
- Tüm çizimler `requestAnimationFrame` geri çağrısında yapılır.
- RAF döngüsü dışında **asla** canvas'a yazılmaz.
- `useGamePhysics` `active` prop'u ile başlatılıp durdurulur (bellek sızıntısı önleme).

## Yeni Özellik Eklerken

**Her zaman şunları yap:**
1. Yeni sabit veya tür eklenecekse → `types/game.ts`
2. Rank/RP ile ilgili mantık → `utils/rankSystem.ts`
3. Yeni ekran → `components/` altında yeni dosya + `App.tsx` state machine'e ekle
4. Fizik değişikliği → `useGamePhysics.ts` (fizik ve çizimi birlikte tut)
5. Her yeni ekran/bileşen için hem mobil yatay hem de masaüstü uyumunu test et
6. `pnpm --filter @workspace/novaball run typecheck` ile tip hatası kontrolü yap

**Asla şunları yapma:**
- Veritabanı veya backend ekleme — tamamen istemci taraflı oyun
- `useGamePhysics` dışında canvas'a yazma
- Oyun durumu için `useState` kullanma (sadece HUD verileri için)
- `useGamePhysics` hook'unu `active=false` olmadan bırakma (RAF sızıntısı)
- `console.log` sunucu koduna ekleme (bu projede sunucu yok, ama genel kural)

## Oyun Sabitleri (önemli değerler)

| Sabit | Değer | Açıklama |
|-------|-------|---------|
| `CANVAS_WIDTH/HEIGHT` | 1200×675 | Oyun alanı çözünürlüğü (16:9) |
| `RANKED_DURATION_MS` | 90 000 ms | Rekabet maçı süresi |
| `PLAYER_MAX_SPEED` | 4.8 | Normal maksimum hız (düşürüldü) |
| `PLAYER_ACCEL` | 0.58 | İvme (düşürüldü, daha kontrollü) |
| `SPRINT_SPEED_MULT` | 1.75 | Depar hız çarpanı |
| `STAMINA_MAX` | 100 | Maksimum stamina |
| `MIN_KICK_POWER` | 5 | Minimum şut gücü (kısa dokunuş) |
| `MAX_KICK_POWER` | 15 | Maksimum şut gücü (tam şarj) |
| `CHARGE_RATE` | 0.022/frame | Güç barı dolma hızı (~45 frame = 0.75s) |
| `FRAME_MS` | 16.667ms | 60 FPS kilidi (120Hz'de extra frame atlanır) |
| `FOUNDING_DATE` | "11 Haziran 2026" | Oyun kuruluş tarihi (branding) |

## Güç Barı Sistemi

Şut artık "anında ateş" yerine **şarj tabanlı** çalışır:

1. Oyuncu `SPACE/X` (PC) veya ⚽ butonu (mobil) basılı tutar
2. Her frame `kickCharge += CHARGE_RATE * dtF` artar (0 → 1 arası ~0.75 saniye)
3. Tuş bırakılınca: `power = MIN_KICK_POWER + (MAX_KICK_POWER - MIN_KICK_POWER) * kickCharge`
4. Canvas üzerinde oyuncunun etrafında renkli ark gösterilir (yeşil→sarı→kırmızı)
5. Mobilden: `conic-gradient` halkası ⚽ butonun çevresinde dolar

**`GR` state'e eklenen alanlar:** `kickCharge: number`, `prevShootHeld: boolean`

## 60 FPS Kilidi

RAF döngüsünün başında:
```typescript
if (s.lastTs > 0 && ts - s.lastTs < FRAME_MS - 2) {
  rafRef.current = requestAnimationFrame(tick); return;
}
```
120Hz ekranlarda her diğer frame atlanır → her cihazda sabit 60 adım/saniye.

## Kullanıcı Tercihleri

- **Dil**: Türkçe UI, Türkçe değişken yorumları kabul edilir
- **Marka**: NovaBall, neon-spor karanlık tema (`#070d16` arka plan, neon yeşil saha)
- **Mobil**: Yatay ekran zorunlu; portait modda döndürme talimatı gösterilir
- **Tasarım**: Premium, minimal, cam efektli (`backdrop-filter: blur`) UI öğeleri
- **Yeni ekranlar**: Her ekran hem masaüstü (max-w-lg merkez) hem mobil yatay uyumlu olmalı

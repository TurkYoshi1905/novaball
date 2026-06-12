<p align="center">
  <img src="artifacts/novaball/public/favicon.svg" width="72" alt="NovaBall Logo" />
</p>

<h1 align="center">NovaBall</h1>
<p align="center">
  <strong>Modern 2D Arcade Football — Haxball & Mamoball İlhamlı</strong><br/>
  Tamamen tarayıcı tabanlı, sunucu gerektirmeyen, mobil ve masaüstü uyumlu
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/60_FPS-Canvas-4af?logo=html5&logoColor=white" />
</p>

---

## 🎮 Oyun Hakkında

**NovaBall**, Haxball ve Mamoball'dan ilham alan, React + HTML5 Canvas üzerine inşa edilmiş modern bir 2D tepeden görünümlü arcade futbol oyunudur. Hem masaüstü hem de mobil cihazlarda sorunsuz çalışır — kurulum, hesap veya sunucu gerekmez.

### ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| ⚽ **Güç Barı Şut Sistemi** | Şut tuşunu basılı tut → şarj dolar → bırak → güce göre ateş |
| 🤖 **AI Rakip** | Savunma ve atak yapan akıllı rakip |
| 🏅 **19 Seviyeli Rank Sistemi** | Demir → Usta arası 7 kademe × 3 alt rank |
| 🕹️ **Mobil Joystick** | Sanal analog joystick + şut/depar butonları |
| 📊 **HUD** | Anlık skor, süre sayacı, stamina barı |
| 🎯 **Rekabet Modu** | 90 saniyelik maçlar, RP kazanma sistemi |
| 🔒 **60 FPS Kilidi** | 120Hz ekranlarda da sabit ve tutarlı oyun hızı |
| 💾 **localStorage** | Kullanıcı adı ve RP otomatik kaydedilir |
| 📱 **Portrait Uyarısı** | Mobilde portait modda döndürme talimatı |

---

## 🕹️ Nasıl Oynanır

### Masaüstü (Klavye)

| Tuş | Eylem |
|-----|-------|
| `W A S D` | Hareket |
| `SPACE` veya `X` basılı tut | Şarj → bırak → şut |
| `Sol Shift` basılı tut | Depar (hızlanma) |

### Mobil

| Kontrol | Eylem |
|---------|-------|
| Sol Joystick | Hareket (analog) |
| ⚽ Şut butonu (basılı tut) | Güç barı doldur → bırak → şut |
| ⚡ Depar butonu (basılı tut) | Stamina azalana kadar hızlan |

### Güç Barı
- Şut tuşunu **kısa bastır → bırak** → zayıf ama isabetli şut (min güç: 5)
- Şut tuşunu **0.75s basılı tut → bırak** → tam güçlü şut (max güç: 15)
- Oyuncunun etrafındaki **renkli ark** dolu olduğu gösterir: 🟢→🟡→🔴

---

## 🏅 Rank Sistemi

| Kademe | Alt Ranklar | RP Aralığı |
|--------|-------------|------------|
| 🪨 Demir | I · II · III | 0 – 299 |
| 🥉 Bronz | I · II · III | 300 – 599 |
| 🥈 Gümüş | I · II · III | 600 – 999 |
| 🥇 Altın | I · II · III | 1000 – 1499 |
| 💎 Platin | I · II · III | 1500 – 1999 |
| 🔷 Elmas | I · II · III | 2000 – 2999 |
| 👑 Usta | — | 3000+ |

**RP Formülü:** (Sadece kazanınca)
- 1 gol → +10 RP
- 2 gol → +14 RP
- 3 gol → +18 RP
- 4 gol → +22 RP
- 5+ gol → +25 RP

---

## 🛠️ Teknoloji Yığını

```
React 19.2       — UI katmanı (yalnızca HUD ve menüler)
TypeScript 5.9   — Strict tip güvenliği
HTML5 Canvas     — Tüm oyun çizimi (requestAnimationFrame)
Tailwind CSS v4  — Stil sistemi
Vite 7.x         — Build aracı
localStorage     — Veri saklama (sunucu yok)
```

---

## 🏗️ Mimari

```
src/
├── types/game.ts            # Sabitler + tüm TypeScript arayüzleri
├── utils/rankSystem.ts      # Rank hesaplama + localStorage
├── hooks/useGamePhysics.ts  # Tüm fizik + AI + canvas çizimi
├── components/
│   ├── UsernameScreen.tsx   # Kullanıcı adı girişi
│   ├── MainMenu.tsx         # Ana menü + rank rozeti
│   ├── GameBoard.tsx        # Oyun alanı + HUD
│   ├── MobileControls.tsx   # Joystick + aksiyon butonları
│   ├── MatchResult.tsx      # Maç sonu ekranı
│   └── RankPage.tsx         # Rank tablosu sayfası
└── App.tsx                  # Ekran yönlendirici (state machine)
```

### Temel Mimari Kararlar

- **Sıfır re-render** — Tüm oyun durumu `useRef` içinde; sadece HUD verileri `useState`
- **60 FPS kilidi** — 120Hz ekranlarda ekstra frameler atlanır
- **Güç barı** — `kickCharge: 0..1`, her frame'de `CHARGE_RATE = 0.022` artışıyla dolar
- **Mobil girişi** — `MobileInput` ref'i fizik motoruyla birleştirilir; asla klavyeyle toplanmaz

---

## 🚀 Yerel Geliştirme

### Gereksinimler
- Node.js 20+
- npm veya pnpm

### Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Üretim derlemesi
npm run build

# Tip kontrolü
npm run typecheck
```

Tarayıcıda aç: `http://localhost:5173`

---

## 📦 Dağıtım (Vercel)

Repo'yu doğrudan Vercel'e bağlayabilirsiniz:

1. [vercel.com](https://vercel.com) → **New Project** → Bu repo'yu seç
2. Framework: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. **Deploy** 🚀

`vercel.json` zaten yapılandırılmış durumda — ekstra ayar gerekmez.

---

## 🎨 Tema & Tasarım

- **Arka plan:** `#070d16` (derin lacivert-siyah)
- **Aksent:** `#44aaff` (neon mavi)
- **Saha:** Neon yeşil çizgilerle koyu futbol sahası
- **Cam efekti:** `backdrop-filter: blur(12px)` — premium glassmorphism UI
- **Font:** Inter (UI) + JetBrains Mono (skor/süre)

---

## 📝 Lisans

Bu proje eğitim ve kişisel kullanım amaçlıdır.

---

<p align="center">
  <strong>NovaBall</strong> — Kuruluş: 11 Haziran 2026 · Made with ❤️ on Replit
</p>

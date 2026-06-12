export type ChangeType = "feature" | "fix" | "improvement" | "performance" | "design";

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  label: "major" | "minor" | "patch" | "alpha" | "beta";
  title: string;
  description: string;
  changes: ChangeItem[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.0.1",
    date: "11 Haziran 2026",
    label: "alpha",
    title: "İlk Sürüm — Temel Oyun",
    description:
      "NovaBall'ın ilk alfa sürümü. Haxball ve Mamoball'dan ilham alınan 2D top-down arcade futbol oyunu. Tarayıcıda, kurulum ve sunucu gerektirmeden oynanabilir.",
    changes: [
      { type: "feature", text: "HTML5 Canvas üzerine inşa edilmiş 2D top-down oyun alanı (1200×675, 16:9)" },
      { type: "feature", text: "İmpuls tabanlı fizik motoru: daire çarpışma çözümleme, top hakimiyeti ve çalma sistemi" },
      { type: "feature", text: "Şarj tabanlı güç barı şut sistemi — SPACE/X tuşunu basılı tut, renkli ark dolar, bırak ateş et" },
      { type: "feature", text: "Stamina/depar sistemi — Sol Shift ile hızlanma, kademeli toparlanma" },
      { type: "feature", text: "60 FPS kilidi — 120Hz/144Hz ekranlarda extra frame atlanarak sabit oyun hızı" },
      { type: "feature", text: "Yapay zeka rakip: savunma, atak, şut, kale koruması davranışları" },
      { type: "feature", text: "Rekabet modu: 90 saniyelik maçlar ve RP kazanma sistemi" },
      { type: "feature", text: "Serbest oyun modu: süresiz, RP etkisiz pratik" },
      { type: "feature", text: "19 seviyeli rank sistemi: Demir I'den Usta'ya 7 kademe" },
      { type: "feature", text: "localStorage ile kullanıcı adı ve RP kalıcı kaydı (sunucu yok)" },
      { type: "feature", text: "Mobil sanal joystick: analog hareket + şut/depar dokunmatik butonları" },
      { type: "feature", text: "Mobil güç barı: ⚽ butonu çevresinde conic-gradient şarj halkası" },
      { type: "feature", text: "Portrait mod koruması: yatay ekran zorunlu, dikey ekranda döndürme uyarısı" },
      { type: "feature", text: "Kale direkleri gerçekçi sekme fizikli küçük daireler olarak modellendi" },
      { type: "design", text: "Neon-spor karanlık tema: #070d16 zemin, neon yeşil saha, cam efektli (glassmorphism) UI" },
      { type: "design", text: "Oyuncu renkleri: Kırmızı (insan) — Mavi (AI) renk kodlaması" },
      { type: "design", text: "HUD: canlı skor, kalan süre sayacı, stamina ve güç barı" },
      { type: "design", text: "Rank rozeti ve RP ilerleme barı ana menüde görünür" },
      { type: "design", text: "Maç sonu ekranı: RP kazanımı, rank değişimi animasyonu" },
      { type: "performance", text: "Tüm oyun durumu useRef içinde — her frame'de React re-render tetiklenmez" },
      { type: "performance", text: "NaN koruma: safe() yardımcısı + isFinite guards tüm canvas çizim çağrılarında" },
      { type: "improvement", text: "Oyuncu hızı dengelendi: PLAYER_MAX_SPEED 6.5→4.8, daha kontrollü oynanış" },
      { type: "improvement", text: "AI hızı dengelendi: AI_MAX_SPEED 4.0→3.0, adil rekabet" },
      { type: "improvement", text: "Mobil analog giriş sabitlendi: joystick ve klavye girişi artık toplanmıyor" },
    ],
  },
];

export default CHANGELOG;

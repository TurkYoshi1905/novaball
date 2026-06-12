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
    version: "0.0.2",
    date: "12 Haziran 2026",
    label: "alpha",
    title: "Auth Sistemi + Share Card + Aktif Oyuncu Göstergesi",
    description:
      "Tam hesap sistemi (kayıt, giriş, e-posta doğrulama), sosyal medya paylaşım kartı ve lider tablosunda aktif oyuncu göstergesi eklendi. Supabase entegrasyonu derinleştirildi, veritabanı şeması v3.1.0'a güncellendi.",
    changes: [
      // Auth
      { type: "feature", text: "Kayıt ekranı: Görünen Ad, Kullanıcı Adı (küçük harf+rakam, maks 15 karakter), E-posta, Şifre + onay alanları" },
      { type: "feature", text: "Gerçek zamanlı kullanıcı adı müsaitlik kontrolü — 600ms debounce ile Supabase sorgusu, yeşil/kırmızı anlık geri bildirim" },
      { type: "feature", text: "Şifre güç göstergesi — Zayıf / Orta / Güçlü renk çubuğu (8 karakter, büyük harf, rakam kontrolleri)" },
      { type: "feature", text: "Giriş ekranı: Kullanıcı Adı + E-posta + Şifre kombinasyonu doğrulaması, 'Hoşgeldin! 👋' başlığı" },
      { type: "feature", text: "Kullanıcı adı bazlı giriş: get_email_by_username() RPC ile kullanıcı adı → e-posta eşleşmesi sunucu tarafında doğrulanır" },
      { type: "feature", text: "E-posta doğrulama sayfası: 3 adımlı talimat, tekrar gönderme butonu, spam klasörü hatırlatması" },
      { type: "feature", text: "E-posta doğrulandıktan sonra Supabase onAuthStateChange ile otomatik ana menüye yönlendirme" },
      { type: "feature", text: "Görünen Ad ve kullanıcı adı; profil sayfasında, lider tablosunda ve maç sonuç kartında gösteriliyor" },
      // Share Card
      { type: "feature", text: "Maç sonucu paylaşım kartı (ShareCard): html-to-image ile 540×540, 2× piksel yoğunluklu PNG üretimi" },
      { type: "feature", text: "Share Card içeriği: maç skoru, RP kazanımı, rank rozeti, rank ilerleme çubuğu, tarih, NovaBall markası" },
      { type: "feature", text: "Share Card tasarımı rank rengine göre dinamik — her kademenin neon rengiyle glow + gradient arka plan" },
      { type: "feature", text: "Web Share API desteği (mobil paylaş butonu), PNG indirme ve panoya kopyalama" },
      { type: "feature", text: "Maç sonuç ekranında 'Sonuç Kartını Paylaş' butonu — rank rengiyle dinamik renklendirme" },
      // Leaderboard
      { type: "feature", text: "Lider tablosunda aktif oyuncu göstergesi: last_seen < 5 dakika → yeşil nokta + 'Aktif' rozeti" },
      { type: "feature", text: "Supabase Realtime subscription ile lider tablosu anlık güncelleme — 'Canlı' badge göstergesi" },
      { type: "feature", text: "Lider tablosunda oyuncu sıralamasına tıklayarak profil sayfasına geçiş" },
      // DB & Backend
      { type: "feature", text: "is_username_available() RPC fonksiyonu: kayıt sırasında kullanıcı adı müsaitliği sunucu tarafında kontrol edilir" },
      { type: "feature", text: "get_leaderboard() RPC: is_active alanı sunucu tarafında hesaplanır (last_seen < 5 dakika)" },
      { type: "improvement", text: "Supabase şeması v3.1.0: display_name max 32 karakter kısıtlaması, email index, players_own_delete politikası eklendi" },
      { type: "improvement", text: "match_history tablosuna result index eklendi — profil sayfası maç geçmişi sorguları hızlandırıldı" },
      { type: "improvement", text: "Periyodik last_seen güncelleme: giriş yapan oyuncu her 2 dakikada bir aktif sayılır" },
      // Technical
      { type: "fix", text: "html-to-image paketi package.json'a eklendi (orijinal repoda eksikti, ShareCard derleme hatasına yol açıyordu)" },
      { type: "improvement", text: "Vite dev server config: host 0.0.0.0, port 5000, allowedHosts: true — Replit proxy iframe uyumluluğu" },
      { type: "improvement", text: "github-sync.sh monorepo yollarından flat (kök dizin) yapısına güncellendi; .migration-backup/ ve vercel.json desteği eklendi" },
      { type: "improvement", text: "package.json sürümü 0.0.2'ye güncellendi, html-to-image bağımlılığı eklendi" },
      { type: "design", text: "Auth ekranları tam mobil ve masaüstü uyumlu: max-w-sm merkez, overflow-auto, min-h-[100dvh]" },
      { type: "design", text: "Hata mesajları tutarlı kırmızı banner (#f87171), başarı mesajları yeşil banner (#4ade80)" },
    ],
  },
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

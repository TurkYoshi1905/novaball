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
    version: "0.0.3",
    date: "12 Haziran 2026",
    label: "alpha",
    title: "Çok Oyunculu Sistem — Eşleştirme, Özel Odalar & Gerçek Zamanlı Senkronizasyon",
    description:
      "NovaBall v0.0.3 tam çok oyunculu altyapıyı hayata geçiriyor: 1v1'den 5v5'e kadar eşleştirme kuyruğu, özel odalar, Supabase Broadcast üzerinden anlık oyun durumu senkronizasyonu, maç içi sohbet, geri sayım karşılama ekranı, formasyon numaralandırması ve gelişmiş performansa dayalı RP dağıtım algoritması.",
    changes: [
      // Temel Altyapı
      { type: "feature", text: "framer-motion paketi eklendi — maç arama, geri sayım ve ekranlar arası premium geçiş animasyonları" },
      { type: "feature", text: "Supabase: matchmaking_queue, active_matches, custom_rooms tabloları + RLS politikaları + Realtime yayın desteği" },
      { type: "feature", text: "src/lib/matchmaking.ts: kuyruk, oda ve maç yönetimi için tam DB yardımcı kütüphanesi" },
      { type: "feature", text: "src/lib/realtime.ts: Supabase Broadcast üzerinden oyun durumu, oyuncu girişi ve sohbet senkronizasyonu yardımcıları" },
      // Eşleştirme Sistemi
      { type: "feature", text: "Mod Seçim Ekranı: 1v1, 2v2, 3v3, 4v4, 5v5 seçenekleri — oyuncu sayısı ve mod açıklamasıyla kart tasarımı" },
      { type: "feature", text: "Eşleştirme Bekleme Ekranı: gerçek zamanlı oyuncu sayacı (X/Y), animasyonlu döngü, anında 'Oyuncu Bulundu!' geçişi" },
      { type: "feature", text: "Kuyruk sistemi: supabase_realtime ile anlık güncellenme, kuyruktan ilk giren oyuncu maçı oluşturur (host)" },
      { type: "feature", text: "İptal Butonu: basınca oyuncu kuyruktan çıkar ve mod seçim ekranına döner" },
      // Özel Odalar
      { type: "feature", text: "Özel Odalar listesi: Realtime ile anlık oda güncelleme, oda adı / oyuncu sayısı / Katıl butonu" },
      { type: "feature", text: "Özel Oda Oluşturma: oda adı + maksimum oyuncu sayısı (2–10) slider/input, anında oturum aç" },
      { type: "feature", text: "Oda Lobisi: Kırmızı / Mavi Takım seçim butonları, anlık takım güncellemesi, oda sahibi Maçı Başlat butonu" },
      { type: "feature", text: "Özel Maçtan Ayrıl: ayrılma butonu, diğer oyunculara sistem mesajı gönderilir, oda sahibi ayrılırsa oda silinir" },
      // Maç Giriş Ekranı
      { type: "feature", text: "Maç Karşılama Ekranı: A Kullanıcısı VS B Kullanıcısı paneli (takım modlarında tüm oyuncular listelenir)" },
      { type: "feature", text: "5 saniyelik geri sayım zamanlayıcısı — süre bitince büyük 'BAŞLA!' efekti, ardından oyun başlar" },
      { type: "feature", text: "Yerel oyuncu hangi takımda olduğu ekranda renk ile gösterilir" },
      // Çok Oyunculu Oyun Mekaniği
      { type: "feature", text: "useMultiplayerPhysics: host tam fizik çalıştırır + 20fps durum yayınlar; istemci girişini 30fps yayınlar + alınan durumu işler" },
      { type: "feature", text: "N oyunculu fizik motoru: N oyuncu–top ve N oyuncu–oyuncu çarpışmaları, takım rengine göre doğru fizik uygulanır" },
      { type: "feature", text: "Oyuncu topu içinde formasyon numarası: 1v1'de her oyuncu '1', 2v2'de '1'–'2', 5v5'de '1'–'5' (takım içi sıra)" },
      { type: "feature", text: "Oyuncu görünen adı (Display Name) topun altında her zaman gösterilmeye devam eder" },
      { type: "feature", text: "Stamina barı her oyuncu için ayrı ayrı çizilir; yerel oyuncu için güç barı yayı (kick charge arc) gösterilir" },
      // Maç İçi Sohbet
      { type: "feature", text: "Maç içi sohbet paneli: sağdan kayarak açılan/kapanan yan panel, lucide-react MessageCircle/Send ikonları" },
      { type: "feature", text: "Sistem mesajları: oyuncu odaya katıldığında/ayrıldığında sarı italik bildirim" },
      { type: "feature", text: "Sohbet mesajları Supabase Broadcast üzerinden anlık iletilir; Enter ile gönderme desteği" },
      // RP Algoritması
      { type: "feature", text: "Performansa dayalı RP dağıtımı: kazanan takım içinde gol sayısına orantılı RP paylaşımı" },
      { type: "feature", text: "Özel odalarda (serbest maçlarda) RP kazanılmaz veya kaybedilmez — yalnızca Eşleştirme modunda RP aktif" },
      { type: "feature", text: "Maç sonucu ekranında oyuncu başına gol ve RP dökümü tablosu gösterilir" },
      // Ana Menü
      { type: "design", text: "Ana Menüye 'Maça Gir' (1v1–5v5 eşleştirme) ve 'Özel Odalar' (özel oda listesi) butonları eklendi" },
      { type: "design", text: "Mevcut 'Rekabet Modu (AI)' ve 'Serbest Oyun' butonları yan yana kompakt şekilde yerleştirildi" },
      // DB & Teknik
      { type: "improvement", text: "Tüm yeni AppScreen değerleri: mod-select, matchmaking, custom-rooms, create-room, room-lobby, match-intro, multiplayer, mp-result" },
      { type: "improvement", text: "Supabase şeması v4.0.0 — matchmaking_queue, active_matches, custom_rooms tabloları ve Realtime yayın eklemeleri" },
    ],
  },
  {
    version: "0.0.2",
    date: "12 Haziran 2026",
    label: "alpha",
    title: "Auth Sistemi + Share Card + Aktif Oyuncu Göstergesi",
    description:
      "Tam hesap sistemi (kayıt, giriş, e-posta doğrulama), sosyal medya paylaşım kartı ve lider tablosunda aktif oyuncu göstergesi eklendi. Supabase entegrasyonu derinleştirildi, veritabanı şeması v3.1.0'a güncellendi.",
    changes: [
      { type: "feature", text: "Kayıt ekranı: Görünen Ad, Kullanıcı Adı (küçük harf+rakam, maks 15 karakter), E-posta, Şifre + onay alanları" },
      { type: "feature", text: "Gerçek zamanlı kullanıcı adı müsaitlik kontrolü — 600ms debounce ile Supabase sorgusu, yeşil/kırmızı anlık geri bildirim" },
      { type: "feature", text: "Şifre güç göstergesi — Zayıf / Orta / Güçlü renk çubuğu (8 karakter, büyük harf, rakam kontrolleri)" },
      { type: "feature", text: "Giriş ekranı: Kullanıcı Adı + E-posta + Şifre kombinasyonu doğrulaması, 'Hoşgeldin! 👋' başlığı" },
      { type: "feature", text: "Kullanıcı adı bazlı giriş: get_email_by_username() RPC ile kullanıcı adı → e-posta eşleşmesi sunucu tarafında doğrulanır" },
      { type: "feature", text: "E-posta doğrulama sayfası: 3 adımlı talimat, tekrar gönderme butonu, spam klasörü hatırlatması" },
      { type: "feature", text: "E-posta doğrulandıktan sonra Supabase onAuthStateChange ile otomatik ana menüye yönlendirme" },
      { type: "feature", text: "Görünen Ad ve kullanıcı adı; profil sayfasında, lider tablosunda ve maç sonuç kartında gösteriliyor" },
      { type: "feature", text: "Maç sonucu paylaşım kartı (ShareCard): html-to-image ile 540×540, 2× piksel yoğunluklu PNG üretimi" },
      { type: "feature", text: "Share Card içeriği: maç skoru, RP kazanımı, rank rozeti, rank ilerleme çubuğu, tarih, NovaBall markası" },
      { type: "feature", text: "Share Card tasarımı rank rengine göre dinamik — her kademenin neon rengiyle glow + gradient arka plan" },
      { type: "feature", text: "Web Share API desteği (mobil paylaş butonu), PNG indirme ve panoya kopyalama" },
      { type: "feature", text: "Maç sonuç ekranında 'Sonuç Kartını Paylaş' butonu — rank rengiyle dinamik renklendirme" },
      { type: "feature", text: "Lider tablosunda aktif oyuncu göstergesi: last_seen < 5 dakika → yeşil nokta + 'Aktif' rozeti" },
      { type: "feature", text: "Supabase Realtime subscription ile lider tablosu anlık güncelleme — 'Canlı' badge göstergesi" },
      { type: "feature", text: "is_username_available() RPC: kayıt sırasında kullanıcı adı müsaitliği sunucu tarafında kontrol edilir" },
      { type: "feature", text: "get_leaderboard() RPC: is_active alanı sunucu tarafında hesaplanır (last_seen < 5 dakika)" },
      { type: "improvement", text: "Supabase şeması v3.1.0: display_name max 32 karakter kısıtlaması, email index, players_own_delete politikası eklendi" },
      { type: "fix", text: "html-to-image paketi package.json'a eklendi (orijinal repoda eksikti, ShareCard derleme hatasına yol açıyordu)" },
      { type: "improvement", text: "github-sync.sh monorepo yollarından flat (kök dizin) yapısına güncellendi" },
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

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
    version: "0.1.0",
    date: "18 Haziran 2026",
    label: "minor",
    title: "Misafir Kasma Düzeltmesi, Gelişmiş Yapay Zeka & Daha Geniş Kaleler",
    description:
      "NovaBall v0.1.0; çok oyunculu maçlarda misafir oyuncuların yaşadığı kasma/donma sorununu kökten çözen 60fps lerp sistemi, yeniden yazılan yapay zeka davranışı (savunma ve hücum artık doğru yönde) ve tüm modlarda hafifçe genişletilmiş kale boyutunu içeriyor.",
    changes: [
      {
        type: "fix",
        text: "Misafir kasma sorunu çözüldü: uzak oyuncular için per-frame lerp interpolasyon sistemi eklendi. Host durumu 30fps gelirken uzak oyuncular artık 60fps akıcılıkla hareket eder — 'snapma' ve titreme tamamen ortadan kalktı.",
      },
      {
        type: "performance",
        text: "Guest tarafı ağ mimarisi iyileştirildi: physicsStep lokal oyuncuya odaklanırken, uzak oyuncular için RAF döngüsünde her kare 0.20 lerp faktörüyle hedeflere yumuşak yaklaşım uygulanır.",
      },
      {
        type: "fix",
        text: "Yapay zeka savunma yönü düzeltildi: AI artık doğru kaleyi (sağ kale) koruyor. Eskiden sol kaleye savunma yaparken şimdi sağ kalesine gelen topa göğüs geriyor.",
      },
      {
        type: "fix",
        text: "Yapay zeka hücum kesme mantığı düzeltildi: oyuncu topa sahipken AI artık sağ kalenin önündeki geçiş hattını kesiyor (eskiden yanlış yöne — sol kaleye — gidiyordu).",
      },
      {
        type: "fix",
        text: "Yapay zeka sprint koşulları güncellendi: top sağ yarıya doğru hızlıyken AI kaleye koşuyor; ayrıca toptan uzak olduğunda yönden bağımsız olarak sprint yapıyor.",
      },
      {
        type: "improvement",
        text: "Kale yüksekliği artırıldı: GOAL_HEIGHT 150 → 180 piksel (+%20). Hem özel oda, rekabet maçı hem de serbest oyun (AI) modunda kaleler biraz daha geniş — gol atmak artık daha erişilebilir.",
      },
      {
        type: "fix",
        text: "Yapay zeka takip düzeltmesi: oyuncu solda veya sağda topa sahipken AI artık her zaman sprint yaparak üzerine gelir. Eskiden sadece çok yakındayken sprint tetikleniyordu; uzakta olan AI yürüyerek yetişemiyordu.",
      },
    ],
  },
  {
    version: "0.0.9",
    date: "16 Haziran 2026",
    label: "minor",
    title: "Rekabetçi RP Kaybı, Rank Düşüşü & Arayüz Güncellemeleri",
    description:
      "NovaBall v0.0.9; rekabetçi maçlarda yenilgi artık RP kaybına ve olası rank düşüşüne yol açıyor. Rank Sistemi sayfası tamamen yeniden tasarlandı, RP'nin ne olduğu ve nasıl çalıştığı açıkça anlatıldı. Lider Tablosu premium tasarımına kavuştu.",
    changes: [
      { type: "feature", text: "Yenilgi cezası eklendi: rekabetçi maçlarda kaybeden oyuncu(lar) rastgele 10–20 RP kaybeder. 1v1'de yalnızca kaybeden, 2v2–5v5'te kaybeden takımdaki tüm oyuncular aynı RP miktarını kaybeder." },
      { type: "feature", text: "Rank düşüşü sistemi aktif: yeteli RP kaybı yaşandığında oyuncu bir alt ranka iner; sonuç ekranında 'Rank Düştün!' bildirimi gösterilir." },
      { type: "feature", text: "Forfeit cezası güncellendi: maçtan ayrılan oyuncu 15 RP kaybeder (rakip 10 RP kazanır)." },
      { type: "improvement", text: "Maç sonucu ekranı güncellendi: kazanınca yeşil +RP kartı, kaybedince kırmızı −RP kartı, beraberlikte nötr ±0 gösterimi. Hem AI hem çok oyunculu modda geçerli." },
      { type: "improvement", text: "Oyuncu sıralaması tablosunda kaybeden oyuncular için kırmızı '−X RP' etiketi gösterilir." },
      { type: "design", text: "Rank Sistemi sayfası premium olarak yeniden tasarlandı: hero kart, RP Nedir? bilgi kutusu, kurallar bölümü, accordion tier listesi ve lucide ikonları." },
      { type: "design", text: "Lider Tablosu yeniden tasarlandı: ilk 3 için özel podium kartları, arama kutusu, Tümü/Aktif sekmeleri, kazanma oranı görsel barları." },
      { type: "improvement", text: "Landing Page ve Rank Sistemi sayfasında RP kazanç/kayıp bilgileri ve rank düşüş mekanizması açıkça belirtildi." },
    ],
  },
  {
    version: "0.0.8",
    date: "15 Haziran 2026",
    label: "minor",
    title: "Premium Arayüz Güncellemesi — Ana Menü, Eşleştirme & Ayarlar",
    description:
      "NovaBall v0.0.8; ana menüden eşleştirme ekranına kadar tüm temel sayfalar premium kalitede yeniden tasarlandı. Tam ekran düzenler, gelişmiş animasyonlar, arttırılmış renk kontrastı ve mobil ile masaüstü uyumluluğu ön planda tutuldu.",
    changes: [
      { type: "design", text: "Ana menü tam ekran premium düzene yükseltildi: üst başlık çubuğu (logo + oyuncu profil chip'i), dramatik 'Maça Gir' hero butonu, renkli oyun modu kartları (Özel Oda, Serbest Oyun) ve altın Lider Tablosu banner'ı" },
      { type: "design", text: "Ayarlar butonu güncellendi: simgenin yanına 'Ayarlar' metni eklendi; geniş ekranlarda metin görünür, dar ekranlarda yalnızca simge kalır" },
      { type: "design", text: "Eşleştirme sayfası tamamen yeniden tasarlandı: SVG halka sayacı (kalan süreyi görsel olarak gösterir), radar animasyonlu tarama efekti, oyuncu slot kartları (dolup boşalan), urgency efekti (son 20 saniyede kırmızıya döner)" },
      { type: "design", text: "Eşleştirme 'Oyuncu Bulundu!' ekranı güçlendirildi: büyük yeşil onay simgesi, pulsing animasyon, ardışık yükleme noktaları" },
      { type: "improvement", text: "Ayarlar sayfası renk kontrastı iyileştirildi: bölüm başlıkları neon mavi renk ve gradient çizgi ayırıcıyla belirginleştirildi; kart arka planları ve kenarlıklar daha görünür hale getirildi" },
      { type: "improvement", text: "Hesap bilgileri kartına oyuncu önizleme alanı (avatar + isim + @kullanıcıadı) eklendi" },
      { type: "design", text: "Logo (favicon) güncellendi: turuncu SVG ikonun yerine neon yeşil NovaBall logosu (PNG) kullanılmaya başlandı; favicon.svg kaldırıldı" },
      { type: "improvement", text: "replit.md dosyası .migration-backup/replit.md'deki tam mimari belgeleme ile güncellendi" },
    ],
  },
  {
    version: "0.0.7",
    date: "15 Haziran 2026",
    label: "minor",
    title: "Ayarlar, Özelleştirilebilir Tuşlar & Kendi Kalesine Atma Önlemi",
    description:
      "NovaBall v0.0.7; hesap yönetimi için premium Ayarlar sayfası, oyun içi tuş atamalarını özelleştirme, multiplayer'da çift-şarj hatasının düzeltilmesi ve kendi kalesine atma önlemi içeriyor.",
    changes: [
      { type: "feature", text: "Ayarlar sayfası (ana menüden ⚙️ ile erişim): Hesap, Kontroller ve Hakkında sekmeleri" },
      { type: "feature", text: "Hesap yönetimi: kullanıcı adı değiştirme (uygunluk kontrolü ile), görünen ad güncelleme, şifre değiştirme" },
      { type: "feature", text: "Tuş atamaları: WASD / Space / Shift tuşları oyun içinde özelleştirilebilir; değişiklikler localStorage'a kaydedilir" },
      { type: "fix",     text: "Multiplayer çift şarj hatası: client tarafında yalnızca kendi kick charge işlenir (remote oyuncuların şarjı ghost charge yaratmıyordu)" },
      { type: "fix",     text: "Kendi kalesine atma önlemi: kırmızı takım sol kaleye, mavi takım sağ kaleye attığında gol sayılmaz — top geri sektirilerek yeniden oyuna girer" },
      { type: "improvement", text: "change_username RPC: players + match_history tabloları atomik güncellenir; auth metadata senkronize edilir" },
      { type: "improvement", text: "change_display_name RPC: görünen ad güvenli SECURITY DEFINER ile güncellenir" },
    ],
  },
  {
    version: "0.0.6",
    date: "14 Haziran 2026",
    label: "minor",
    title: "Premium Karşılama Sayfası, HaxBall Tarzı Özel Odalar & Maça Katılım",
    description:
      "NovaBall v0.0.6; yeni kullanıcılar için tam ekran premium landing page, HaxBall'a özgü format seçimi ve lüks lobi arayüzüyle yeniden tasarlanan özel oda sistemi, oyun devam ederken odaya katılım desteği ve host'un tek başına maç başlatabilmesini içeriyor. Supabase RLS güvenlik açıkları kapatıldı ve tüm şema SECURITY DEFINER RPC'lerle sağlamlaştırıldı.",
    changes: [
      // Landing Page
      { type: "feature", text: "Premium karşılama sayfası (LandingPage): animasyonlu hero bölümü, yüzen top efekti, scroll-aware cam navbar ve büyük CTA butonları" },
      { type: "feature", text: "Özellikler bölümü: 6 kart — Gerçek Zamanlı Çok Oyunculu, Rank Sistemi, Özel Odalar, Mobil Destek, AI Modu, Tarayıcı Tabanlı" },
      { type: "feature", text: "Oyun modları bölümü: 1v1'den 5v5'e emoji kartları + Özel Oda tanıtım bandı" },
      { type: "feature", text: "Rank sistemi bölümü: 7 kademe (⚙️→🏆), RP aralıkları ve kural kartları (RP Kazan / Rank Atla / Kayıp Yok)" },
      { type: "feature", text: "Destek bölümü: support.novaballofficial@gmail.com e-posta kartı + 5 madde SSS accordion" },
      { type: "feature", text: "'Nasıl Oynanır' bölümü: 4 adımlı animasyonlu kılavuz kartları" },
      { type: "design", text: "Giriş Yap / Kayıt Ol CTA butonları hem navbar'da hem hero'da hem footer'da — yeni kullanıcı akışı optimize edildi" },
      { type: "improvement", text: "Oturumsuz kullanıcı artık doğrudan login yerine landing page ile karşılanır; giriş/çıkış akışı güncellendi" },
      // Özel Odalar — Format Seçimi & Lobi Yenileme
      { type: "feature", text: "Format seçimi: Oda oluştururken 1v1 / 2v2 / 3v3 / 4v4 / 5v5 butonuyla oynayacak kişi sayısı seçimi (HaxBall standardı)" },
      { type: "design", text: "Premium lobi arayüzü: iki takım kolonu (Kırmızı / Mavi), oyuncu slotları (dolu/boş), takım değiştirme butonu ve animasyonlu oyuncu kartları" },
      { type: "improvement", text: "Oyuncu sayacı çubuğu: anlık toplam / maksimum gösterge ile doluluk barı" },
      { type: "feature", text: "Sohbet paneli lobi içine entegre edildi — collapsible açılır/kapanır, mesaj sayacı rozeti" },
      // Maça Katılım Sistemi
      { type: "feature", text: "Host tek başına maç başlatabilir — minimum takım doluluğu şartı kaldırıldı; solo maç pratiği destekleniyor" },
      { type: "feature", text: "Oynan devam ederken odalar listede '⚡ CANLI' etiketiyle ayrı bölümde gösterilir" },
      { type: "feature", text: "Mid-match join: devam eden bir odaya giren oyuncu takım seçim ekranıyla karşılanır (Kırmızı / Mavi)" },
      { type: "feature", text: "Takım seçimi yapıldıktan sonra oyuncu direkt maça (MultiplayerBoard) yönlendirilir — lobi bekleme yok" },
      { type: "fix", text: "room_join_team RPC: 'waiting' durumuna ek olarak 'playing' durumundaki odaya da katılım desteklendi" },
      // Oda Yönetimi
      { type: "fix", text: "Guest çıkışında oda açık kalır: room_leave RPC — HOST ayrılırsa oda silinir, GUEST ayrılırsa sadece slot boşalır" },
      { type: "improvement", text: "Her iki takım da tamamen boşaldığında oda otomatik silinir (temizlik mekanizması)" },
      { type: "fix", text: "Host 'Maça Geri Dön' butonu: playing durumdaki odada host'a MultiplayerBoard'a doğrudan erişim" },
      // Güvenlik & Veritabanı
      { type: "fix", text: "custom_rooms UPDATE RLS politikası düzeltildi: USING true → host_username doğrulaması" },
      { type: "improvement", text: "SECURITY DEFINER RPC'ler: room_join_team, room_leave, room_start — tüm kritik oda işlemleri RLS bypass ile güvenli şekilde yürütülüyor" },
      { type: "improvement", text: "Master şema (001): CREATE OR REPLACE / IF NOT EXISTS ile her zaman güvenle yeniden çalıştırılabilen idempotent migration" },
      { type: "improvement", text: "custom_rooms tablosundan ranked kolonu kaldırıldı — özel odalar her zaman serbest maç olarak sabitlendi" },
      { type: "improvement", text: "validate_room_teams trigger: her takım için max_players/2 sınırını INSERT/UPDATE anında veritabanı seviyesinde denetler" },
    ],
  },
  {
    version: "0.0.5",
    date: "13 Haziran 2026",
    label: "alpha",
    title: "60 FPS Akıcılık, Premium UI & Kick Charge Görünürlüğü",
    description:
      "NovaBall v0.0.5; multiplayer kasma sorununu çözen lerp reconciliation, tüm oyunculara görünür güç barı, adaptif ağ senkronizasyonu (Supabase 50ms/30ms), tamamen yenilenen premium ana menü tasarımı, 'Nasıl Oynanır' modalı ve geliştirilmiş profil sayfası içeriyor.",
    changes: [
      // 60 FPS
      { type: "performance", text: "Lerp reconciliation: host durumu gelince pozisyonlar hard-snap yerine yumuşak lerp ile düzeltilir — jitter tamamen giderildi" },
      { type: "performance", text: "Lokal tahmin koruması: hata < 6px → yoksay, 6–60px → %15 yumuşak düzeltme, > 60px → snap" },
      { type: "performance", text: "Uzak oyuncu interpolasyonu: diğer oyuncular %30 lerp ile güncellenir — hareketler pürüzsüz görünür" },
      { type: "performance", text: "Adaptif sync hızı: WebSocket 33ms/16ms; Supabase fallback 50ms/30ms — rate limit koruması" },
      // Kick charge
      { type: "feature", text: "Tüm oyuncuların güç barı (kick charge arc) artık herkese görünür — host, kickCharge değerlerini game_state içinde yayınlar" },
      // Fizik
      { type: "improvement", text: "BALL_FRICTION: 0.980 → 0.983 (top daha uzun yuvarlanır)" },
      { type: "improvement", text: "BALL_RESTITUTION: 0.72 → 0.76 (duvardan daha canlı sekme)" },
      { type: "improvement", text: "PLAYER_FRICTION: 0.86 → 0.84 (daha hızlı durma, hassas hareket)" },
      // UI
      { type: "design", text: "Ana menü tamamen yenilendi: futbol sahası ambient efektleri, büyük 'Maça Gir' CTA butonu, premium kart tasarımı, daha iyi buton hiyerarşisi" },
      { type: "feature", text: "'Nasıl Oynanır' modalı eklendi: Kontroller / Mekanikler / Mobil sekmeli, anahtar grafikleri ve oyun mekaniği açıklamalarıyla premium tam ekran modal" },
      { type: "design", text: "Profil sayfası geliştirildi: gradient stat kartları, sol kenarlıklı maç geçmişi (GAL/BER/MAĞ), daha iyi avatar ve rank hero" },
      { type: "improvement", text: "RoomConnection.isWebSocket getter eklendi — transport tipine göre dinamik sync hızı seçimi" },
    ],
  },
  {
    version: "0.0.4",
    date: "13 Haziran 2026",
    label: "alpha",
    title: "Stabilite & Ağ Optimizasyonu — Maç Sonu, Rate Limit & Senkronizasyon",
    description:
      "NovaBall v0.0.4, çok oyunculu sistemin köklü stabilite güncellemesidir. Eşleştirmede misafirin bekleme ekranında kalması sorunu çözüldü, maçı terk eden oyuncu artık herkesle aynı anda sonuç ekranını görüyor, Supabase rate limit (429) aşılmasını önleyen delta encoding ile broadcast trafiği ~%80 azaltıldı ve veritabanı şeması gelişmiş istatistiklerle genişletildi.",
    changes: [
      // Eşleştirme
      { type: "fix", text: "Eşleştirme misafir sorunu: subscribeToQueue callback'indeki erken return kaldırıldı — misafir artık her durumda kendi maç ID'sini kontrol eder" },
      { type: "fix", text: "1.5 saniyelik polling fallback eklendi — Supabase postgres_changes olayı gecikmişse veya kaçırılmışsa misafir yine de maça yönlendirilir" },
      { type: "improvement", text: "checkMyEntry fonksiyonu subscription kurulmadan önce tanımlanıyor — ilk yüklemede de anında kontrol yapılır" },
      // Maç Sonu Ekranı
      { type: "feature", text: "Maçı terk eden oyuncu artık menüye değil MultiplayerResult sonuç ekranına yönlendiriliyor (kaybeden olarak)" },
      { type: "feature", text: "Forfeit bildirimi ranked ve özel oda maçlarının her ikisinde de yayınlanıyor — tüm oyuncular aynı anda sonuç ekranını görür" },
      { type: "feature", text: "Maç sonuç ekranında '(sen)' etiketi ve parlak border ile kendi satırın vurgulanıyor" },
      { type: "feature", text: "Özel oda maçlarında kazanan satırı mor (#a78bfa) renk temasıyla gösterilir — RP bölümü yok, sadece Zafer/Mağlubiyet" },
      { type: "improvement", text: "playerStats tipine team alanı eklendi — kazanan artık rpGained yerine takım bilgisiyle doğru belirleniyor" },
      // Supabase Maç Kaydı
      { type: "feature", text: "Çok oyunculu maç sonucu artık Supabase'e kaydediliyor: kazanma/beraberlik/kaybetme, gol sayısı, RP değişimi match_history tablosuna yazılır" },
      { type: "improvement", text: "MPResult tipine localUsername ve opponentUsername alanları eklendi — maç sonucu doğru kişiye atanır" },
      // 429 / Ağ Optimizasyonu
      { type: "performance", text: "Host durum yayını: SYNC_MS 33ms → 80ms (~30fps → ~12fps) — Supabase rate limit aşılması önlendi" },
      { type: "performance", text: "Client girdi yayını: INPUT_MS 16ms → 50ms (~60fps → ~20fps) — toplam broadcast trafiği dramatik biçimde azaldı" },
      { type: "performance", text: "Girdi delta encoding: girdi değişmediğinde 200ms heartbeat gönderilir — duran oyuncu saniyede 60 yerine 5 paket gönderiyor" },
      { type: "fix", text: "429 Too Many Requests / oyun donma sorunu: toplam broadcast trafiği ~%80 azaltılarak Supabase ücretsiz katman limitleri içinde kalındı" },
      // Veritabanı
      { type: "improvement", text: "supabase/003: match_history tablosuna opponent_username (TEXT) ve match_uuid (UUID) kolonları eklendi" },
      { type: "improvement", text: "supabase/004: match_history'ye winner_team, forfeit, game_mode, duration_seconds; players'a total_forfeits ve win streak kolonları" },
      { type: "feature", text: "player_stats_view: kazanma oranı ve maç başına gol içeren hazır istatistik görünümü" },
      { type: "feature", text: "recent_matches_view ve update_win_streak() PostgreSQL fonksiyonu eklendi" },
      { type: "improvement", text: "Kapsamlı Row Level Security (RLS) politikaları match_history ve players tablolarına uygulandı" },
      { type: "improvement", text: "İndeksler: player_username, opponent_username, match_uuid, result ve rp sütunları için sorgu hızı optimizasyonu" },
    ],
  },
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

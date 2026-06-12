# NovaBall — Sürüm Geçmişi & Değişiklik Notları

---

## v0.0.2 — 12 Haziran 2026

### Yeni Özellikler

#### 🔐 Auth Sistemi (Tam Hesap)
- **Kayıt sayfası** (`RegisterPage.tsx`): Görünen Ad, Kullanıcı Adı (yalnızca küçük harf + rakam, 3-15 karakter, gerçek zamanlı müsaitlik kontrolü), E-Posta, Şifre (güç göstergesi) + Şifre Tekrar
- **Giriş sayfası** (`LoginPage.tsx`): "Hoşgeldin! 👋" başlığı, Kullanıcı Adı + E-Posta + Şifre kombinasyonu doğrulaması, `get_email_by_username` RPC ile eşleşme kontrolü
- **E-posta doğrulama sayfası** (`EmailVerifyPage.tsx`): Kayıt sonrası adım adım talimat, yeniden gönderme butonu, otomatik yönlendirme (doğrulama bağlantısına tıklayınca)
- E-posta doğrulandıktan sonra otomatik olarak ana sayfaya (`MainMenu`) yönlendirme
- Kullanıcı adı ve Görünen Ad profilde ve lider tablosunda gösteriliyor

#### 🏆 Lider Tablosu Aktif Kullanıcı Göstergesi
- `last_seen` < 5 dakika olan oyunculara yeşil nokta (avatar köşesi) + **"Aktif"** rozeti eklendi
- Canlı Realtime subscription ile anlık güncelleme

#### 📤 Share Card (Paylaşım Kartı)
- Maç sonucu ekranında "Sonuç Kartını Paylaş" butonu
- `html-to-image` ile 540×540 PNG oluşturma (2× piksel yoğunluğu)
- Rank rengine göre dinamik tasarım (glow, gradient, progress bar)
- Web Share API (mobil) / İndirme / Panoya Kopyalama desteği
- Maç skoru, RP kazanımı, rank rozeti, rank ilerleme çubuğu, tarih gösterimi

#### 📊 Veritabanı (schema v3.0.0)
- `players` tablosu: `username` (PK, küçük harf+rakam 3-15), `display_name`, `email`, `auth_id`, `rp`, istatistikler, `last_seen`
- `match_history` tablosu: tüm rekabet maçı kayıtları
- RLS politikaları: okuma herkese açık, yazma yalnızca sahip kullanıcı
- `get_email_by_username` RPC: kullanıcı adı bazlı giriş için e-posta döner
- Supabase Realtime: `players` + `match_history` tabloları yayına dahil

### Düzeltmeler & İyileştirmeler
- `html-to-image` paketi `package.json`'a eklendi (orijinal repoda eksikti)
- Vite config `host: 0.0.0.0`, `port: 5000`, `allowedHosts: true` — Replit proxy uyumluluğu
- `github-sync.sh` yolları düz proje yapısına (flat root) göre güncellendi
- `package.json` sürümü `0.0.2`'ye güncellendi

### Dosya Değişiklikleri
| Dosya | Değişiklik |
|-------|-----------|
| `src/components/auth/LoginPage.tsx` | Yeni — Giriş ekranı |
| `src/components/auth/RegisterPage.tsx` | Yeni — Kayıt ekranı |
| `src/components/auth/EmailVerifyPage.tsx` | Yeni — E-posta doğrulama |
| `src/components/ShareCard.tsx` | Yeni — Paylaşım kartı |
| `src/components/LeaderboardPage.tsx` | Aktif kullanıcı göstergesi eklendi |
| `src/App.tsx` | Auth state machine (login→register→email-verify→menu) |
| `src/lib/auth.ts` | Yeni — Supabase Auth sarmalayıcıları |
| `src/lib/db.ts` | createPlayer, findEmailByUsername, subscribeLeaderboard eklendi |
| `supabase/schema.sql` | v3.0.0 — players, match_history, RLS, RPC |
| `vite.config.ts` | Replit proxy için server config eklendi |
| `github-sync.sh` | Flat yapıya güncellendi, .migration-backup desteği eklendi |
| `replit.md` | Türkçe kapsamlı proje belgesi |
| `.migration-backup/replit.md` | Bu dosya — sürüm geçmişi |

---

## v0.0.1 — 11 Haziran 2026

### İlk Sürüm (NovaBall v3 baseline)
- React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- 60 FPS fizik motoru (`useGamePhysics.ts`) — impuls tabanlı daire çarpışmaları
- Şarj bazlı şut sistemi (güç barı, conic-gradient halka)
- Stamina/depar sistemi
- AI rakip (top takibi, gol savunma, rastgele atış)
- Rank sistemi: 7 kademe × 3 alt rank = 19 seviye (Demir → Usta)
- Supabase bağlantısı (URL + Anon Key)
- Mobil dokunmatik kontroller (sanal joystick + butonlar)
- Portrait mod koruması (döndürme talimatı)
- Canvas responsive (16:9 aspect-ratio)

---

## Planlanan (v0.0.3+)

- Çok oyunculu (multiplayer) — WebSocket veya Supabase Realtime
- Turnuva modu
- Özelleştirilebilir karakterler / renkler
- Ses efektleri ve müzik
- Mobil PWA desteği (offline önbellek)

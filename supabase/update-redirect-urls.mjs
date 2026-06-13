#!/usr/bin/env node
/**
 * NovaBall — Supabase Redirect URL Güncelleyici
 * Şifre sıfırlama e-postasının doğru URL'ye yönlendirmesi için
 * Supabase projesinin izin verilen redirect URL listesini günceller.
 *
 * Kullanım:
 *   SUPABASE_ACCESS_TOKEN=<token> VITE_SUPABASE_URL=<url> node supabase/update-redirect-urls.mjs
 *
 * Access Token almak için:
 *   https://supabase.com/dashboard/account/tokens
 */

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;

if (!ACCESS_TOKEN) {
  console.error("❌  SUPABASE_ACCESS_TOKEN tanımlı değil.");
  console.error("    https://supabase.com/dashboard/account/tokens adresinden oluştur.");
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error("❌  VITE_SUPABASE_URL tanımlı değil.");
  process.exit(1);
}

const PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0];
const API_URL     = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

console.log("╔══════════════════════════════════════════════════╗");
console.log("║  NovaBall — Supabase Redirect URL Güncelleyici  ║");
console.log("╚══════════════════════════════════════════════════╝");
console.log(`\n📡  Proje: ${PROJECT_REF}`);

// ── Mevcut konfigürasyonu al ────────────────────────────────────────────────
const getRes = await fetch(API_URL, {
  headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
});

if (!getRes.ok) {
  console.error(`\n❌  Mevcut config alınamadı: ${getRes.status} ${getRes.statusText}`);
  const txt = await getRes.text();
  console.error(txt);
  process.exit(1);
}

const config = await getRes.json();
const existing = config.uri_allow_list ?? "";

console.log(`\n📋  Mevcut redirect URL'leri:\n    ${existing || "(boş)"}`);

// ── Yeni URL'leri ekle ──────────────────────────────────────────────────────
const newUrls = [
  "https://*.replit.app/**",
  "https://*.repl.co/**",
  "http://localhost:*/**",
];

const existingList = existing ? existing.split(",").map(u => u.trim()).filter(Boolean) : [];
const toAdd = newUrls.filter(u => !existingList.includes(u));

if (toAdd.length === 0) {
  console.log("\n✅  Tüm redirect URL'leri zaten ekli. Güncelleme gerekmez.");
  process.exit(0);
}

const merged = [...existingList, ...toAdd].join(",");

console.log(`\n➕  Eklenecek URL'ler:`);
toAdd.forEach(u => console.log(`    • ${u}`));

// ── PATCH isteği gönder ─────────────────────────────────────────────────────
const patchRes = await fetch(API_URL, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ uri_allow_list: merged }),
});

if (!patchRes.ok) {
  const txt = await patchRes.text();
  console.error(`\n❌  Güncelleme başarısız: ${patchRes.status} ${patchRes.statusText}`);
  console.error(txt);
  process.exit(1);
}

console.log(`
══════════════════════════════════════════════════
  ✅  Redirect URL'leri başarıyla güncellendi!
  🔗  https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration
══════════════════════════════════════════════════
`);

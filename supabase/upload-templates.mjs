#!/usr/bin/env node
/**
 * NovaBall — Supabase Email Şablonu Yükleyici
 * Kullanım: node supabase/upload-templates.mjs
 *
 * Gerekli çevre değişkenleri:
 *   SUPABASE_ACCESS_TOKEN  — supabase.com/dashboard > Account > Access Tokens
 *   VITE_SUPABASE_URL      — projenin Supabase URL'i
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dir, "email-templates");

// ── Çevre değişkenleri ─────────────────────────────────────────────────────
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;

if (!ACCESS_TOKEN) {
  console.error("❌  SUPABASE_ACCESS_TOKEN tanımlı değil.");
  console.error("    supabase.com/dashboard → Account → Access Tokens");
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error("❌  VITE_SUPABASE_URL tanımlı değil.");
  process.exit(1);
}

// Project ref: https://abcdefghij.supabase.co → abcdefghij
const PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0];
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

// ── Şablon → API alan eşlemesi ─────────────────────────────────────────────
function read(filename) {
  return readFileSync(join(TEMPLATES_DIR, filename), "utf8");
}

const payload = {
  // Authentication şablonları
  mailer_subjects_confirmation: "⚽ NovaBall — E-posta adresini onayla",
  mailer_templates_confirmation_content: read("confirm-signup.html"),

  mailer_subjects_invite: "⚽ NovaBall — Davet edildin!",
  mailer_templates_invite_content: read("invite-user.html"),

  mailer_subjects_magic_link: "⚽ NovaBall — Giriş bağlantın",
  mailer_templates_magic_link_content: read("magic-link-otp.html"),

  mailer_subjects_email_change: "⚽ NovaBall — Yeni e-postanı onayla",
  mailer_templates_email_change_content: read("change-email.html"),

  mailer_subjects_recovery: "⚽ NovaBall — Şifreni sıfırla",
  mailer_templates_recovery_content: read("reset-password.html"),

  mailer_subjects_reauthentication: "⚽ NovaBall — Kimliğini doğrula",
  mailer_templates_reauthentication_content: read("reauthentication.html"),

  // Güvenlik bildirimleri
  mailer_subjects_password_change:
    "⚽ NovaBall — Şifren değiştirildi",
  mailer_templates_password_change_content: read(
    "security-password-changed.html"
  ),

  mailer_subjects_email_address_change:
    "⚽ NovaBall — E-posta adresin değiştirildi",
  mailer_templates_email_address_change_content: read(
    "security-email-changed.html"
  ),

  mailer_subjects_phone_change:
    "⚽ NovaBall — Telefon numaran değiştirildi",
  mailer_templates_phone_change_content: read(
    "security-phone-changed.html"
  ),

  mailer_subjects_signup_method_linked:
    "⚽ NovaBall — Yeni giriş yöntemi eklendi",
  mailer_templates_signup_method_linked_content: read(
    "security-signin-linked.html"
  ),

  mailer_subjects_signup_method_removed:
    "⚽ NovaBall — Giriş yöntemi kaldırıldı",
  mailer_templates_signup_method_removed_content: read(
    "security-signin-removed.html"
  ),

  mailer_subjects_mfa_factor_linked:
    "⚽ NovaBall — İki faktörlü doğrulama eklendi",
  mailer_templates_mfa_factor_linked_content: read(
    "security-mfa-added.html"
  ),

  mailer_subjects_mfa_factor_removed:
    "⚽ NovaBall — İki faktörlü doğrulama kaldırıldı",
  mailer_templates_mfa_factor_removed_content: read(
    "security-mfa-removed.html"
  ),
};

// ── API isteği ──────────────────────────────────────────────────────────────
console.log("╔══════════════════════════════════════════════════╗");
console.log("║   NovaBall — Supabase Email Şablonu Yükleyici   ║");
console.log("╚══════════════════════════════════════════════════╝");
console.log(`\n📡  Proje: ${PROJECT_REF}`);
console.log(`🔗  URL  : ${API_URL}\n`);

const templateNames = [
  "confirm-signup",
  "invite-user",
  "magic-link-otp",
  "change-email",
  "reset-password",
  "reauthentication",
  "security-password-changed",
  "security-email-changed",
  "security-phone-changed",
  "security-signin-linked",
  "security-signin-removed",
  "security-mfa-added",
  "security-mfa-removed",
];

console.log("▶ [1/2] Yükleniyor...");
templateNames.forEach((n) => console.log(`  • ${n}.html`));

const res = await fetch(API_URL, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`\n❌  Hata ${res.status}: ${res.statusText}`);
  console.error(text);
  process.exit(1);
}

console.log(`
══════════════════════════════════════════════════
  ✅  13 şablon başarıyla yüklendi!
  🔗  https://supabase.com/dashboard/project/${PROJECT_REF}/auth/email-templates
══════════════════════════════════════════════════
`);

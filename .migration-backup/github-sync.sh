#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  NovaBall — GitHub Sync Script
#
#  Kullanım:
#    bash github-sync.sh push ["commit mesajı"]   → GitHub'a gönder
#    bash github-sync.sh pull                     → GitHub'dan çek
#
#  Nasıl çalışır (push):
#    1) Repo /tmp altına klonlanır.
#    2) İçi temizlenir (git rm -rf .).
#    3) Flat proje kökünden kaynak dosyalar kopyalanır.
#    4) vercel.json, README.md, replit.md, github-sync.sh eklenir.
#    5) Commit + push → GitHub güncellenir.
#
#  NOT: Yalnızca gerçek uygulama dosyaları (standalone Vite SPA) gönderilir.
# ─────────────────────────────────────────────────────────────────────────────

set -e

MODE="${1:-push}"
COMMIT_MSG="${2:-NovaBall: güncelleme}"
BRANCH="main"
WORKSPACE="/home/runner/workspace"
DEPLOY_TMP="/tmp/novaball-deploy-$$"

# GITHUB_PAT zorunlu
if [ -z "$GITHUB_PAT" ]; then
  echo "❌ GITHUB_PAT çevre değişkeni tanımlı değil."
  echo "   Replit Secrets'a GITHUB_PAT ekleyin ve tekrar deneyin."
  exit 1
fi

REPO_URL="https://TurkYoshi1905:${GITHUB_PAT}@github.com/TurkYoshi1905/novaball.git"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        NovaBall — GitHub Sync                        ║"
echo "║  Mod  : $MODE                                        ║"
echo "║  Dal  : $BRANCH                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── PUSH ────────────────────────────────────────────────────────────────────
if [ "$MODE" = "push" ]; then

  echo "▶ [1/6] GitHub deposu klonlanıyor..."
  rm -rf "$DEPLOY_TMP"
  git clone "$REPO_URL" "$DEPLOY_TMP" --quiet 2>/dev/null || {
    mkdir -p "$DEPLOY_TMP"
    cd "$DEPLOY_TMP"
    git init --quiet
    git remote add origin "$REPO_URL"
    git checkout -b "$BRANCH" 2>/dev/null || true
    cd "$WORKSPACE"
  }
  cd "$DEPLOY_TMP"
  git config user.name "TurkYoshi1905"
  git config user.email "165286969+TurkYoshi1905@users.noreply.github.com"
  echo "  ✓ Klonlandı."

  echo ""
  echo "▶ [2/6] Eski dosyalar temizleniyor..."
  git rm -rf . --quiet 2>/dev/null || true
  echo "  ✓ Temizlendi."

  echo ""
  echo "▶ [3/6] Kaynak dosyalar kopyalanıyor..."

  # src/ — tüm React + TypeScript kaynak kodu
  cp -r "$WORKSPACE/artifacts/novaball/src" "$DEPLOY_TMP/src"
  SRC_COUNT=$(find "$DEPLOY_TMP/src" -name "*.ts" -o -name "*.tsx" | wc -l | tr -d ' ')
  echo "  ✓ src/ kopyalandı ($SRC_COUNT TypeScript/TSX dosyası)."

  # public/ (varsa)
  if [ -d "$WORKSPACE/artifacts/novaball/public" ]; then
    cp -r "$WORKSPACE/artifacts/novaball/public" "$DEPLOY_TMP/public"
    PUB_COUNT=$(ls "$WORKSPACE/artifacts/novaball/public/" 2>/dev/null | wc -l | tr -d ' ')
    echo "  ✓ public/ kopyalandı ($PUB_COUNT dosya)."
  fi

  # index.html
  if [ -f "$WORKSPACE/artifacts/novaball/index.html" ]; then
    cp "$WORKSPACE/artifacts/novaball/index.html" "$DEPLOY_TMP/index.html"
    echo "  ✓ index.html kopyalandı."
  fi

  # supabase/ — SQL şema dosyaları
  if [ -d "$WORKSPACE/.migration-backup/supabase" ]; then
    cp -r "$WORKSPACE/.migration-backup/supabase" "$DEPLOY_TMP/supabase"
    SQL_COUNT=$(find "$WORKSPACE/.migration-backup/supabase" -name "*.sql" | wc -l | tr -d ' ')
    echo "  ✓ supabase/ kopyalandı ($SQL_COUNT SQL dosyası)."
  fi

  # .migration-backup/ (versiyon geçmiş notları)
  if [ -d "$WORKSPACE/.migration-backup" ]; then
    cp -r "$WORKSPACE/.migration-backup" "$DEPLOY_TMP/.migration-backup"
    echo "  ✓ .migration-backup/ kopyalandı."
  fi

  echo ""
  echo "▶ [4/6] Bağımlılık ve yapılandırma dosyaları oluşturuluyor..."

  # package.json (html-to-image dahil)
  cat > "$DEPLOY_TMP/package.json" << 'PKGJSON'
{
  "name": "novaball",
  "version": "0.0.2",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.50.0",
    "html-to-image": "^1.11.13"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@types/node": "^25.3.3",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.0.4",
    "framer-motion": "^12.18.1",
    "lucide-react": "^0.513.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "tailwindcss": "^4.1.14",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5.9.0",
    "vite": "^7.3.3"
  }
}
PKGJSON
  echo "  ✓ package.json yazıldı (v0.0.2, html-to-image dahil)."

  # vite.config.ts (Vercel uyumlu)
  cat > "$DEPLOY_TMP/vite.config.ts" << 'VITECFG'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
VITECFG
  echo "  ✓ vite.config.ts yazıldı."

  # tsconfig.json
  cat > "$DEPLOY_TMP/tsconfig.json" << 'TSCFG'
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["esnext", "dom", "dom.iterable"],
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
TSCFG
  echo "  ✓ tsconfig.json yazıldı."

  echo ""
  echo "▶ [5/6] Proje dosyaları ekleniyor..."

  # vercel.json
  if [ -f "$WORKSPACE/vercel.json" ]; then
    cp "$WORKSPACE/vercel.json" "$DEPLOY_TMP/vercel.json"
    echo "  ✓ vercel.json eklendi."
  else
    cat > "$DEPLOY_TMP/vercel.json" << 'VERCEL'
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
VERCEL
    echo "  ✓ vercel.json oluşturuldu (SPA rewrites)."
  fi

  # README.md
  if [ -f "$WORKSPACE/README.md" ]; then
    cp "$WORKSPACE/README.md" "$DEPLOY_TMP/README.md"
    echo "  ✓ README.md eklendi."
  fi

  # replit.md
  if [ -f "$WORKSPACE/replit.md" ]; then
    cp "$WORKSPACE/replit.md" "$DEPLOY_TMP/replit.md"
    echo "  ✓ replit.md eklendi."
  fi

  # github-sync.sh (bu scriptin kendisi)
  cp "$WORKSPACE/.migration-backup/github-sync.sh" "$DEPLOY_TMP/github-sync.sh"
  chmod +x "$DEPLOY_TMP/github-sync.sh"
  echo "  ✓ github-sync.sh eklendi."

  # .gitignore
  cat > "$DEPLOY_TMP/.gitignore" << 'GITIGNORE'
node_modules/
dist/
.DS_Store
*.local
.env
.env.*
!.env.example
.tsbuildinfo
GITIGNORE
  echo "  ✓ .gitignore oluşturuldu."

  echo ""
  echo "▶ [6/6] Commit & Push yapılıyor..."
  cd "$DEPLOY_TMP"
  git add -A

  CHANGED=$(git status --porcelain | wc -l | tr -d ' ')
  if [ "$CHANGED" -eq 0 ]; then
    echo "  ✓ Gönderilecek değişiklik yok — her şey güncel."
  else
    echo "  → $CHANGED dosya değişti/eklendi."
    git commit -m "$COMMIT_MSG"
    git push origin "$BRANCH" 2>/dev/null || git push --set-upstream origin "$BRANCH"
    echo ""
    echo "══════════════════════════════════════════════════════"
    echo "  ✅ Başarılı! GitHub güncellendi."
    echo "  🔗 https://github.com/TurkYoshi1905/novaball"
    echo "══════════════════════════════════════════════════════"
  fi

  cd "$WORKSPACE"
  rm -rf "$DEPLOY_TMP"
  echo "  ✓ Geçici dosyalar temizlendi."

# ─── PULL ────────────────────────────────────────────────────────────────────
elif [ "$MODE" = "pull" ]; then

  echo "▶ [1/2] GitHub deposu çekiliyor..."
  rm -rf "$DEPLOY_TMP"
  git clone --depth=1 "$REPO_URL" "$DEPLOY_TMP" --quiet
  echo "  ✓ Klonlandı."

  echo ""
  echo "▶ [2/2] src/ ve public/ aktarılıyor..."
  [ -d "$DEPLOY_TMP/src" ]    && rm -rf "$WORKSPACE/artifacts/novaball/src"    && cp -r "$DEPLOY_TMP/src"    "$WORKSPACE/artifacts/novaball/src"
  [ -d "$DEPLOY_TMP/public" ] && rm -rf "$WORKSPACE/artifacts/novaball/public" && cp -r "$DEPLOY_TMP/public" "$WORKSPACE/artifacts/novaball/public"
  [ -f "$DEPLOY_TMP/index.html" ] && cp "$DEPLOY_TMP/index.html" "$WORKSPACE/artifacts/novaball/index.html"

  cd "$WORKSPACE"
  rm -rf "$DEPLOY_TMP"

  echo ""
  echo "══════════════════════════════════════════════════════"
  echo "  ✅ GitHub'tan başarıyla çekildi."
  echo "══════════════════════════════════════════════════════"

else
  echo "Kullanım:"
  echo "  bash github-sync.sh push [\"commit mesajı\"]"
  echo "  bash github-sync.sh pull"
  exit 1
fi

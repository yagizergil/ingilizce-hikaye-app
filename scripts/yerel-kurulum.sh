#!/usr/bin/env bash
# macOS'ta yerel geliştirme ve denetim ortamını hazırlar. Tekrar çalıştırmak güvenlidir.
# Kullanım: bash scripts/yerel-kurulum.sh
set -euo pipefail

cd "$(dirname "$0")/.."

ok() { printf "  [tamam] %s\n" "$1"; }
eksik() { printf "  [EKSİK] %s\n" "$1"; MISSING=1; }
MISSING=0

echo "1) Araçlar kontrol ediliyor"
command -v node >/dev/null && ok "node $(node -v)" || eksik "Node.js 20+ (https://nodejs.org ya da: brew install node)"
command -v xcodebuild >/dev/null && ok "$(xcodebuild -version | head -1)" || eksik "Xcode (App Store'dan kur, sonra bir kez aç)"
xcrun simctl list devices available >/dev/null 2>&1 && ok "iOS simülatörleri" || eksik "iOS simülatörü (Xcode > Settings > Components)"
command -v pod >/dev/null && ok "CocoaPods" || eksik "CocoaPods (brew install cocoapods)"
command -v claude >/dev/null && ok "Claude Code $(claude --version 2>/dev/null | head -1)" || eksik "Claude Code (npm install -g @anthropic-ai/claude-code)"

if [ "$MISSING" = 1 ]; then
  echo
  echo "Eksikleri kurup bu script'i yeniden çalıştır."
  exit 1
fi

echo "2) .env"
if [ -f .env ]; then
  ok ".env var"
else
  cp .env.example .env
  echo "  [YAPILACAK] .env oluşturuldu. İçine Supabase URL, anon key ve RevenueCat iOS key'ini yaz."
  echo "             (Değerler: Supabase > Project Settings > API, RevenueCat > Project > API keys)"
fi

echo "3) Bağımlılıklar (npm ci)"
npm ci

echo "4) Hızlı sağlık kontrolü"
npm run typecheck || echo "  [UYARI] typecheck hata verdi; ayrıntılar denetimde ele alınacak"

cat <<'EOF'

Kurulum bitti. Sıradaki adımlar:
  claude                      # bu klasörde Claude Code'u başlat
  /mcp                        # 'supabase' sunucusunu seç ve tarayıcıda giriş yap (ilk seferde)
  /donusum-denetimi           # 5 ajanlı denetimi başlat

Simülatörü elle açmak istersen:
  npx expo run:ios
EOF

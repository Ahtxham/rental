#!/bin/sh
# Copy the generated Musafir Fleet files into the app repo. Run from anywhere.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="${1:-$HOME/Documents/invo/mydriver}"
cp "$HERE/web/icon.png" "$HERE/web/apple-icon.png" "$APP/web/src/app/"
cp "$HERE/web/icon-192.png" "$HERE/web/icon-512.png" "$APP/web/public/"
mkdir -p "$APP/web/src/components/brand"
cp "$HERE/web/logo-art.ts" "$APP/web/src/components/brand/logo-art.ts"
for f in "$HERE"/mobile/*.png; do cp "$f" "$APP/mobile/assets/"; done
echo "Copied. Now regenerate the iOS launch screens: cd $APP/web && npm run splash"

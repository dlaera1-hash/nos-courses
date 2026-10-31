#!/bin/sh
# Donne un nouveau numéro de version aux fichiers de l'appli, pour que les téléphones
# ne mélangent jamais une page récente avec un script ancien resté en cache.
# À lancer avant chaque commit qui change l'appli : sh scripts/version.sh
set -e
cd "$(dirname "$0")/.."
V=$(date +%Y%m%d%H%M%S)
sed -i '' -E "s/(style\.css|app\.js)(\?v=[0-9]+)?\"/\1?v=$V\"/g" index.html
sed -i '' -E "s#\./(logic|config)\.js(\?v=[0-9]+)?\"#./\1.js?v=$V\"#g" app.js
echo "version $V"

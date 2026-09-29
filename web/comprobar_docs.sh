#!/bin/sh
# ¿docs/index.html es exactamente lo que sale de los datos actuales? Detecta datos sin instalar y ediciones a mano.
# Uso: sh web/comprobar_docs.sh   (antes de git commit)
cd "$(dirname "$0")"
H=$(python3 -c "import re,json;s=open('../docs/index.html',encoding='utf-8').read();print(json.loads(re.search(r'<script id=\"datos\" type=\"application/json\">(.*?)</script>',s,re.S).group(1))['fuente']['construido'])") || { echo "docs/index.html no tiene bloque de datos legible: se editó a mano. Ejecuta sh web/instalar.sh."; exit 1; }
T=$(mktemp)
if ! python3 build.py --hoy "$H" --salida "$T" > /dev/null 2>&1; then
  rm -f "$T"; echo "Los datos actuales no construyen: ejecuta sh web/instalar.sh y corrige el error."; exit 1
fi
if cmp -s "$T" ../docs/index.html; then
  rm -f "$T"; echo "docs/index.html coincide con los datos actuales (construida el $H)."; exit 0
fi
rm -f "$T"
echo "docs/index.html NO coincide con lo que sale de los datos actuales (construida el $H): hay datos sin instalar o se editó a mano. Ejecuta sh web/instalar.sh."
exit 1

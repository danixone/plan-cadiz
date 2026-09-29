#!/bin/sh
# Construye la web desde datos/plan.json, datos/historial.json y web/datos/web.json,
# la valida y la copia a docs/index.html (lo que publica GitHub Pages).
# Uso: sh web/instalar.sh          (desde la raíz del proyecto o desde web/)
# Se para sin tocar docs/ si la construcción o la validación dan errores.
set -e
cd "$(dirname "$0")"
INFORME=$(mktemp)
if ! python3 build.py > "$INFORME" 2>&1; then
  grep -v "^AVISO" "$INFORME" | tail -20
  echo "La construcción ha fallado: docs/index.html NO se ha tocado."
  rm -f "$INFORME"
  exit 1
fi
grep "sin comprimir" "$INFORME" || true
if ! python3 herramientas/validar_web.py > "$INFORME" 2>&1; then
  sed -n '/^ERRORES/,/^AVISOS/p' "$INFORME" | grep -v '^AVISOS' | head -25
  echo "La validación ha fallado: docs/index.html NO se ha tocado."
  rm -f "$INFORME"
  exit 1
fi
grep -E "^(ERRORES|AVISOS)" "$INFORME" | tr '\n' ' '; echo "· los avisos: python3 web/herramientas/validar_web.py"
rm -f "$INFORME"
cp out/index.html ../docs/index.html
echo "docs/index.html actualizado. Falta revisarla en el navegador y publicar con git."

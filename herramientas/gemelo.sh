#!/bin/sh
# gemelo.sh · enlaza esta copia del proyecto con la carpeta privada que comparten los dos usuarios del Mac.
#
# Desde el 17-11-2026 hay dos copias gemelas del proyecto, una en el usuario de Daniel y otra en el de Cristina, y las
# dos publican en GitHub. Lo que va en GitHub se sincroniza con git. Lo que NO va (salud de Cristina, archivos de los
# relojes, modelo de vídeo y la memoria de Claude) vive en UNA sola carpeta, /Users/Shared/plan-cadiz-privado, y cada
# copia la enlaza con este script. Así las dos sesiones ven lo mismo y nada se duplica.
#
# Uso, desde la raíz de la copia:   sh herramientas/gemelo.sh
# Se puede repetir: lo que ya está enlazado lo deja; lo que falta lo enlaza; si algo existe de verdad (no enlace) y la
# carpeta compartida ya lo tiene, se para sin tocar nada y avisa.
set -eu

COMP=/Users/Shared/plan-cadiz-privado
RAIZ=$(cd "$(dirname "$0")/.." && pwd -P)
cd "$RAIZ"

[ -d "$COMP" ] || { echo "ERROR: no existe $COMP (se crea una vez desde la copia de Daniel)"; exit 1; }
[ -w "$COMP" ] || { echo "ERROR: $COMP no se puede escribir desde este usuario: revisa los permisos (ls -le $COMP)"; exit 1; }

enlazar() {   # enlazar <ruta en la copia> <ruta en la carpeta compartida>
  local_=$1; comp=$2
  if [ -L "$local_" ]; then
    if [ "$(readlink "$local_")" = "$comp" ]; then echo "ok        $local_"; return; fi
    echo "ERROR: $local_ es un enlace a otro sitio ($(readlink "$local_"))"; exit 1
  fi
  if [ -e "$local_" ]; then
    if [ -e "$comp" ]; then echo "ERROR: $local_ existe aquí y en $comp: no se toca. Compara los dos y deja uno."; exit 1; fi
    mkdir -p "$(dirname "$comp")"
    mv "$local_" "$comp"
    echo "movido    $local_ → $comp"
  fi
  [ -e "$comp" ] || { echo "aviso     $comp no existe todavía: el enlace queda colgando hasta que exista"; }
  mkdir -p "$(dirname "$local_")"
  ln -s "$comp" "$local_"
  echo "enlazado  $local_ → $comp"
}

enlazar datos/cristina/privado.json "$COMP/cristina/privado.json"
enlazar datos/cristina/privado "$COMP/cristina/privado"
enlazar archivos-garmin "$COMP/archivos-garmin"
enlazar herramientas/modelos "$COMP/modelos"
enlazar web/herramientas/centinelas.local.json "$COMP/centinelas.local.json"

# memoria de Claude Code: ~/.claude/projects/<ruta de esta copia con todo lo que no es letra o número cambiado por «-»>/memory
MEM="$HOME/.claude/projects/$(printf '%s' "$RAIZ" | sed 's/[^A-Za-z0-9]/-/g')/memory"
enlazar "$MEM" "$COMP/memoria"

# lo que la copia no tiene que subir nunca
for p in datos/cristina/privado.json datos/cristina/privado archivos-garmin herramientas/modelos web/herramientas/centinelas.local.json; do
  git check-ignore -q "$p" || { echo "ERROR: git no ignora $p: revisa .gitignore antes de hacer commit"; exit 1; }
done
echo "Listo: esta copia ve la carpeta compartida. Comprueba con: python3 web/cristina/construir.py"

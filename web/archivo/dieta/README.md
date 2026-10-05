# Pestaña Dieta · archivo (5-10-2026)

El 5-10-2026, a petición de Daniel («en la web guarda una copia sobre cómo hacer el apartado dieta y elimínala de la web para ahorrar espacio»), la pestaña **Dieta** salió de la web. Aquí está todo lo necesario para volver a ponerla tal como estaba.

- `build.py` solo lee `web/src/`, `web/datos/` y `web/herramientas/`: **esta carpeta no entra en la web**. La QA (`qa.py`, criterio 12) solo recorre `web/src/`, así que tampoco la revisa.
- **La referencia de paridad es `docs/anterior/index.html`** (la web antigua del 29-9, que también tiene la dieta). No se ha tocado y no se borra: sin ella no se puede comprobar que el código trasladado sigue siendo el de la nutricionista. También está en la etiqueta de git `web-v1-2026-09-29`.
- La dieta es la pauta de la nutricionista: se muestra, no se modifica. Lo que hay aquí es su app trasladada con la lista cerrada de cambios de `web/doc/especificacion.md` §9.1.
- Lo que ahorró: la web pasó de 867,5 KB sin comprimir y 238,8 KB con gzip a 784,7 KB y 214,5 KB (incluida la compresión del HTML fijo que se añadió el mismo día en `build.py`). Volver a ponerla suma unos 24 KB con gzip: con el límite de 240 KB queda muy justa.

## Qué hay aquí y dónde iba cada cosa

| Archivo del archivo | Dónde iba | Qué es |
|---|---|---|
| `src/js/60_dieta.js` | `web/src/js/60_dieta.js` | El módulo: observador de la comida que toca por la hora, la app de la nutricionista (bloque trasladado de la web antigua) y los bloques nuevos `#di-entreno` y `#di-calidad`. Registra la vista con `PC.vista('dieta', …)` |
| `src/css/60_dieta.css` | `web/src/css/60_dieta.css` | Estilos. Por el prefijo 60, `build.py` los mete en la capa `@layer dieta` |
| `src/views/dieta.html` | `web/src/views/dieta.html` | La vista (macros, días, modos, registro, PDF, intercambio, `#dieta-body`, pie D13) |
| `qa/paridad_dieta.py` | `web/qa/paridad_dieta.py` | Prueba de paridad contra `docs/anterior/index.html`. Calcula sus rutas desde su carpeta (`IMPL` = la carpeta de arriba): solo funciona otra vez en `web/qa/` |
| `fragmentos/shell_boton_barra_arriba.html` | `web/src/20_shell.html`, dentro de `<nav class="ab-tabs">`, detrás del botón `ab-tecnica` | Botón de la barra de escritorio |
| `fragmentos/shell_seccion_v-dieta.html` | `web/src/20_shell.html`, detrás de la `<section id="v-tecnica">` y antes de `</main>` | La sección con la cabecera «Dieta» (`data-inv="D1"`), la marca `<!--__VISTA:dieta-->` y el pie |
| `fragmentos/shell_boton_barra_abajo.html` | `web/src/20_shell.html`, dentro de `<nav class="tabbar">`, detrás del botón `t-tecnica` | Botón de la barra de abajo (móvil) |
| `fragmentos/shell_simbolo_i-dieta.html` | **Sigue en** `web/src/20_shell.html` (línea 8) | Icono `i-dieta`. No se quitó: la tarjeta «Suplementos» de Técnica lo usa |
| `fragmentos/inventario_y_frases.json` | `web/qa/inventario_ids.json` y `web/qa/frases_clave.json` | Las entradas D1-D14, R3, R4 y R5 tal como estaban (antes de marcarlas `eliminado`) y sus frases clave |
| `fragmentos/campos_usa_M7.json` | `web/herramientas/campos.json` → `publico` | Las tres rutas que llevaban «M7» (Dieta) en `usa`. Sin «M7», `plan.atleta.pesoKg` se queda sin módulo y deja de publicarse |
| `fragmentos/qa_py_lineas_dieta.txt` | `web/qa/qa.py` | La línea de ESTADOS, `RUTAS_ABIERTAS`, el criterio `13_paridad_dieta` y el bloque que ejecutaba la paridad |
| `fragmentos/rutas_html_lineas_dieta.txt` | `web/qa/rutas.html` | La lista de vistas que rellena la prueba de rutas y el paso por `#dieta` |
| `fragmentos/otras_lineas_dieta.txt` | `build.py`, `src/js/00_core.js`, `herramientas/validar_web.py`, `src/css/10_sistema.css` | Las líneas con «dieta» de cada uno y la rejilla de 5 columnas de la barra de abajo |

## Cómo se reintegra, paso a paso

Desde la raíz del proyecto (`plan-cadiz/`).

1. **Módulo, estilos, vista y paridad.** Copiar de vuelta:
   ```sh
   cp web/archivo/dieta/src/js/60_dieta.js   web/src/js/
   cp web/archivo/dieta/src/css/60_dieta.css web/src/css/
   cp web/archivo/dieta/src/views/dieta.html web/src/views/
   cp web/archivo/dieta/qa/paridad_dieta.py  web/qa/
   ```
   Los estilos van solos a la capa `dieta`: `build.py` añade «, dieta» a `@layer sistema, modulos` en cuanto hay un CSS con prefijo 60 o más.
2. **Pestaña en la barra.** En `web/src/20_shell.html`, pegar los tres fragmentos `shell_*.html` (menos el del símbolo, que no se quitó) en su sitio de la tabla de arriba.
3. **Barra de abajo a cinco columnas.** En `web/src/css/10_sistema.css`, `.tabbar{… grid-template-columns:repeat(4,1fr)}` vuelve a `repeat(5,1fr)`.
4. **Enrutador.** En `web/src/js/00_core.js`: `var VISTAS = ['hoy', 'plan', 'marcas', 'tecnica', 'dieta'];` y, en el mapa de prefijos de la QA, `tecnica: 'te-', dieta: 'di-' }`.
5. **Constructor y validador.** Añadir `'dieta'` a `VISTAS` en `web/build.py` y en `web/herramientas/validar_web.py`.
6. **Datos publicados.** En `web/herramientas/campos.json`, devolver «M7» a `usa` en las tres rutas de `fragmentos/campos_usa_M7.json` (si no, `plan.atleta.pesoKg` no llega a la página y la proteína por kilo se calcula sin peso).
7. **Inventario y frases.** En `web/qa/inventario_ids.json`, D1-D14, R3, R4 y R5 vuelven a `eliminado: false` con su `tratamiento` original; en `web/qa/frases_clave.json`, se vuelven a poner sus frases (todo está en `fragmentos/inventario_y_frases.json`).
8. **QA.** En `web/qa/qa.py`: la fila `('dieta', 'dieta', {}, False, False),` en ESTADOS, `'dieta'` en `RUTAS_ABIERTAS`, el criterio `C['13_paridad_dieta']` y el bloque que ejecuta `paridad_dieta.py` (literal en `fragmentos/qa_py_lineas_dieta.txt`). En `web/qa/rutas.html`, `'dieta'` en la lista de vistas y el paso `W.location.hash = '#dieta';` (hoy dice `'#marcas'`).
9. **Instalar y comprobar.**
   ```sh
   sh web/instalar.sh                      # ERRORES (0) y vigilar el tamaño: límite 240 KB con gzip
   python3 web/qa/paridad_dieta.py         # contra docs/anterior/index.html
   python3 web/herramientas/validar_web.py --render
   python3 web/qa/qa.py --rapido --paralelo 6
   sh web/comprobar_docs.sh
   ```
   La paridad terminaba en «RESULTADO: FALLA» **a propósito**, solo en las comprobaciones 1, 4 y 6, porque la web antigua enseñaba mal «Media mañana». Cualquier otra comprobación que falle es un fallo real.
10. Volver a poner en `CLAUDE.md` la pestaña Dieta, la regla de `60_dieta.js` y lo esperado de `13_paridad_dieta`, y quitar las notas de «retirada» de `web/doc/especificacion.md` §5.5 y §9.1.

## Lo que no se tocó

- `docs/anterior/index.html`: la web antigua, con la dieta completa. Es la referencia de paridad.
- La pauta de la nutricionista y `plan.contextoDelUsuario.dieta` en `datos/plan.json` (ya no se publicaba).
- La tarjeta «Suplementos» de Técnica y el texto de la B12 de `web/datos/web.json`: son de Técnica, no de la pestaña Dieta.
- Las capturas antiguas `web/capturas/dieta_*.png` (del 29-9 y del 5-10, antes de quitarla).

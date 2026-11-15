# Integrar el estudio de Cristina en su página de preparación física

Escrito el 15-11-2026 por la sesión de Claude Code que lleva la preparación física (carpeta `/Users/Daniel/Documents/plan-cadiz`). Va dirigido a la sesión que va a llevar el planning de estudio de Cristina.

Lo más importante, antes de nada:

- **No es un Artifact de claude.ai.** Es una página estática en GitHub Pages, generada por un programa en Python.
- **El repositorio y la página son públicos.** Un calendario de estudio sería un dato personal nuevo, que hoy no está publicado. Antes del primer `git push` con él, hace falta el sí expreso de Daniel y de Cristina.
- **La página está casi en su límite de tamaño:** 236,9 KB con gzip de 240 KB. Ver 5.4.
- **Las dos sesiones publican en el mismo repositorio,** cada una desde su propio clon. Ver 5.5 antes de subir nada.

---

## 1. La página

| | |
|---|---|
| **Enlace** | https://danixone.github.io/plan-cadiz/cristina/ (la de Daniel es https://danixone.github.io/plan-cadiz/; las dos responden 200, comprobado el 15-11-2026) |
| **Qué es** | GitHub Pages, repositorio público `github.com/danixone/plan-cadiz`, rama `main`, carpeta `docs/`. **No hay enlace `claude.ai/...artifact/...`**: no es un Artifact ni se publica desde esta cuenta de Claude |
| **Archivo HTML** | `/Users/Daniel/Documents/plan-cadiz/docs/cristina/index.html`. **Se genera: no se edita a mano**, porque la siguiente construcción lo machaca |
| **Quién lo genera** | `python3 web/cristina/construir.py`, desde la raíz del repositorio |
| **De qué lo genera** | `datos/cristina/plan.json` y `datos/cristina/historial.json`; la plantilla, el CSS y el JS de la página de Daniel (`web/src/**`, compartidos); y lo propio de Cristina (`web/cristina/src/js/*.js` y `web/cristina/src/css/*.css`) |
| **Capacidades** | Ninguna de servidor: no tiene base de datos de Artifact, ni backend, ni API. Solo almacenamiento del navegador: `localStorage` (prefijo `cr-`) y `sessionStorage` para los temporizadores |
| **Recursos externos** | Solo Google Fonts (Barlow). Es un único archivo HTML autónomo, sin librerías JS externas |
| **Publicar** | `git push` a `main`. GitHub Pages tarda alrededor de un minuto |

---

## 2. Cómo se guardan los datos

### 2.1 Lo que marca Cristina en la página: solo en su móvil

Todo lo que toca en la página se queda en el `localStorage` de su navegador. **No llega al repositorio ni a mí.**

Su página y la de Daniel comparten origen (`danixone.github.io`). Por eso el constructor cambia el prefijo del núcleo: `pc-` en la de Daniel y `cr-` en la de Cristina. Así no se mezclan.

| Clave | Qué guarda |
|---|---|
| `cr-consejo-AAAA-MM-DD` | «Cómo llegas hoy» (módulo `web/cristina/src/js/60_consejo.js`) |
| `cr-sem-AAAA-MM-DD` | La noche y el estado de la tarjeta de Hoy (núcleo compartido, `PC.sem`) |
| `cr-ses-AAAA-MM-DD` | «Cómo fue» (lo que apunta tras entrenar) |
| `cr-cond-AAAA-MM-DD` | La opción elegida en un día con condición (por ejemplo, el domingo CrossFit o correr) |
| `cr-pend` | Pendientes marcados |
| `cr-tema`, `cr-sonido`, `cr-sol`, `cr-graf`, `cr-reparto`… | Ajustes de la página |
| `cr-timer` (`sessionStorage`) | Temporizadores, para no perderlos al recargar |

Ejemplo de `cr-consejo-AAAA-MM-DD`. La forma es la real; los valores son inventados:

```json
{"dolor": 2, "zona": "gemelo", "comp": "igual", "rigidez": "no", "piernas": "cargadas",
 "sueno": "bien", "estres": "mucho", "energia": "floja", "ayer": "si",
 "alarmas": {"hueso": false, "pata": false, "reposo": false, "enferma": false}}
```

Valores posibles:
- `zona`: gemelo, talon, aquiles, espinilla, rodilla, cadera, otra.
- `piernas`: frescas, normales, cargadas, muy.
- `sueno`: bien (7 h o más), regular (6–7 h), mal (menos de 6 h).
- `estres`: poco, normal, mucho.
- `energia`: bien, floja.
- `comp`: mejor, igual, peor.
- `rigidez` y `ayer`: si, no.

Cristina me lo hace llegar de dos formas: con el botón «Copiar para el entrenador», que copia un texto al portapapeles, o escribiéndome.

### 2.2 Lo que leo y escribo yo: JSON en el repositorio

**`datos/cristina/plan.json`** (público):
- `calendario[]`: semanas `{n, desde, fase, descarga, dias[]}`.
- Cada día: `{fecha, dia, tipo, titulo, min?, detalle?, objetivo?, barra?[], circuito?{}, opciones?[]}`.
  - `tipo` es uno de estos: `suave`, `calidad`, `control`, `prueba` u `otro`.
  - En la barra, el CrossFit y el descanso, `tipo` es `otro`.
- `reglas[]`: `{id, titulo, texto, origen?}`.
- `pendientes[]`, `ritmosEstimados`, `pulso`, `pruebasMujeres` (baremos), `guias` (cómo se hace cada ejercicio), `objetivo` (`fechaSupuesta: "2027-10-09"`), `circuitoKit` (`disponible: false` hasta que llegue el kit de vallas).

**`datos/cristina/historial.json`** (público):
- `carrera[]`, de más nuevo a más viejo.
- `controles[]`: los 1.000 m medidos.

Ejemplo de una entrada de `carrera`, recortada:

```json
{"fecha": "2026-11-09", "sesion": "28 min suave (el del miércoles, cambiado con el 6 × 200)", "hecho": true,
 "resumen": "28 min seguidos · 10:04 /km · 2,78 km · pulso 124 de media · con el perro",
 "resultado": {"duracion": "28:00 corriendo (de 21:12 a 21:40) y 12 min andando después", "km": 2.78, "ritmo": "10:04/km",
   "bloques5min": {"ritmos": ["11:19", "10:02", "9:33", "9:41", "9:55", "10:06"], "fc": [110, 118, 129, 131, 129, 132]},
   "fcMedia": 124, "fcMax": 149, "fcPrimeros10min": 114, "porEncimaDe150": "0 %", "deriva": "…", "nota": "…", "fuente": "…"},
 "valoracion": "…"}
```

Una sesión que no se hizo lleva `"hecho": false` y un `motivo`.

**`datos/cristina/privado.json`** (en `.gitignore`, nunca se publica):
- Claves: `nota`, `perfil`, `pulso`, `molestias`, `vigilar` y `sesiones`.
- Ahí van su edad, su altura, su peso, su sueño, sus molestias, su salud y su horario de trabajo.
- `vigilar` es una lista de textos. Si alguno aparece en la página, el constructor se para.
- **Este archivo no se lee ni se copia para el estudio.** Si te hace falta su disponibilidad, pregúntasela a ella.

**Cómo leo yo los datos:**
1. Lo que Cristina me escribe.
2. La exportación de Salud del Apple Watch (`exportación-N.zip`), que leo en local desde el zip, sin extraerla ni copiarla al proyecto.
3. Lo registro en `historial.json` y, si toca, cambio `plan.json`.

---

## 3. El plan de entrenamiento, día a día

**Es una foto de `plan.json` del 15-11-2026.** La fuente de verdad es `datos/cristina/plan.json` → `calendario`, y cambia casi cada semana: el 9-11 y el 11-11 ya se movieron sesiones. Este JSON sirve para planificar el estudio fuera de la página.

**En la página no se copia:** el módulo de estudio lee el calendario en el momento, con `PC.CR.dia('AAAA-MM-DD')` o `PC.cal.dia(...)` y `PC.cal.semana(...)`. Cada dato vive en un solo sitio.

**Para regenerarlo:**

```bash
python3 web/cristina/doc/plan_dias.py 2026-11-15 web/cristina/doc/plan-cristina-dias.json
```

### 3.1 Campos

| Campo | Qué es |
|---|---|
| `fecha`, `dia` | AAAA-MM-DD y día de la semana |
| `hora` | Siempre `null`. **El plan no fija horas.** Su disponibilidad es privada y la sabe ella |
| `tipo` | Categoría (rodaje suave, series, barra A, test de barra, control de 1.000 m, CrossFit…) |
| `sesion` | Título literal del plan |
| `duracion_min` | Duración total aproximada de la sesión, redondeada a 5 min. `0` si es descanso y `null` si no está fijada |
| `duracion` | `plan` (escrita en el plan), `estimada` (calculada con los supuestos de abajo) o `sin fijar` |
| `intensidad` | `descanso`, `suave`, `media` o `dura`, según la correspondencia de abajo |
| `notas` | Objetivo del día o primera frase del detalle, literales del plan |

**Las condiciones de cada día no están en `notas`.** Frases como «solo si estás bien del todo; si no, 25 min suaves y 4 rectas» (16-11) o «si ese día no estás bien del todo, no hay test» (17-11) están en el `detalle` o el `objetivo` de ese día en `plan.json`. La página las enseña; este JSON no.

**Cómo se estima la duración.** Se suman los temporizadores de cada paso de la tarjeta del día y, donde no hay temporizador, estos supuestos:
- Calentamiento «15 min suave + movilidad + 4 rectas»: 25 min.
- 200 m andando de recuperación: 150 s.
- Cada recta: 60 s.
- Cada cuesta: su tiempo más 60 s de bajada.
- «Anda 3-5 min para acabar»: 4 min.
- Elevaciones de talón: 5 min.
- 1.000 m del control: 313 s, el tiempo de su control del 26-10.
- Barra o circuito dentro del simulacro: 15 min cada uno.
- Cada repetición dura el tiempo de su ritmo, que viene escrito en el paso.
- La barra trae su duración escrita en el plan: «(20 min)», «(15 min)».
- Un test de barra: unos 10 min (estimado).
- El CrossFit y la prueba: sin fijar.

**Cómo se asigna la intensidad:**
- Descanso → `descanso`.
- Rodaje suave, también con rectas o cuestas → `suave`.
- Rodaje con tramos a ritmo K o «alegres» → `media`.
- Barra A y B, CrossFit y domingo a elegir → `media`.
- Series, intervalos, umbral, test de barra, control, simulacro y prueba → `dura`.

**El circuito todavía no está:** hasta que llegue el kit de vallas, los martes y jueves solo llevan la barra. Cuando llegue, se sumarán unos 25 min de circuito antes de la barra; las `notas` de esos días lo dicen.

### 3.2 Tests y pruebas

| Qué | Fechas |
|---|---|
| Control de 1.000 m | 23-11-2026 (el 1.º fue el 26-10), 21-12, 18-1-2027, 15-2, 15-3, 12-4, 10-5, 7-6, 5-7, 2-8 y 30-8. Todos en lunes, en la pista de Arucas |
| Test de barra | 17-11-2026, 15-12, 12-1-2027, 9-2, 9-3, 6-4, 4-5, 1-6, 29-6, 27-7 y 24-8. Martes de la semana de descarga |
| Test de circuito (solo con el kit) | 19-11-2026, 17-12, 14-1-2027, 11-2, 11-3, 8-4, 6-5, 3-6, 1-7, 29-7 y 26-8. Jueves de la semana de descarga |
| Simulacro (circuito, barra y 1.000 m) | Lunes 27-9-2027 |
| **Pruebas físicas** | **Sábado 9-10-2027, fecha supuesta:** la convocatoria de 2027 (44.ª promoción) no ha salido. El plan se recoloca cuando salga |

### 3.3 El JSON (330 días, del 15-11-2026 al 10-10-2027)

También está aparte, en `web/cristina/doc/plan-cristina-dias.json`.

```json
[
{"fecha": "2026-11-15", "dia": "Dom", "hora": null, "tipo": "CrossFit", "sesion": "CrossFit, sin piernas pesadas ni saltos (el lunes toca la calidad)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "CrossFit, sin piernas pesadas ni saltos (el lunes toca la calidad). La duración de la clase no está en el plan."},
{"fecha": "2026-11-16", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "6 × 200 m a ritmo K, rec. 200 m andando", "duracion_min": 55, "duracion": "estimada", "intensidad": "dura", "notas": "Los seis entre 1:01,5 y 1:03,5: aprender el ritmo."},
{"fecha": "2026-11-17", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Si ese día no estás bien del todo, no hay test: avisas y se mueve. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2026-11-18", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2026-11-19", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2026-11-20", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2026-11-21", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "20 min suave", "duracion_min": 35, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2026-11-22", "dia": "Dom", "hora": null, "tipo": "CrossFit", "sesion": "CrossFit sin piernas ni saltos (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "CrossFit sin piernas ni saltos (mañana, el control). La duración de la clase no está en el plan."},
{"fecha": "2026-11-23", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (2.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el del 26-10 se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2026-11-24", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2026-11-25", "dia": "Mié", "hora": null, "tipo": "rodaje suave + cuestas", "sesion": "32 min suave + 6 cuestas de 15 s", "duracion_min": 55, "duracion": "estimada", "intensidad": "suave", "notas": "Suave y, al final, 6 cuestas: en una subida del 5 al 8 %, 15 s subiendo fuerte sin llegar a tope; bajas andando."},
{"fecha": "2026-11-26", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2026-11-27", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2026-11-28", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "40 min suave", "duracion_min": 55, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2026-11-29", "dia": "Dom", "hora": null, "tipo": "CrossFit", "sesion": "CrossFit, sin piernas pesadas ni saltos (el lunes toca la calidad)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "CrossFit, sin piernas pesadas ni saltos (el lunes toca la calidad). La duración de la clase no está en el plan."},
{"fecha": "2026-11-30", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "6 × 400 m a ritmo K + 4, rec. 2 min", "duracion_min": 60, "duracion": "estimada", "intensidad": "dura", "notas": "Las seis dentro de 3 s del objetivo."},
{"fecha": "2026-12-01", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2026-12-02", "dia": "Mié", "hora": null, "tipo": "rodaje suave + cuestas", "sesion": "35 min suave + 8 cuestas de 15 s", "duracion_min": 60, "duracion": "estimada", "intensidad": "suave", "notas": "Suave y, al final, 8 cuestas: en una subida del 5 al 8 %, 15 s subiendo fuerte sin llegar a tope; bajas andando."},
{"fecha": "2026-12-03", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2026-12-04", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2026-12-05", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "44 min suave", "duracion_min": 60, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2026-12-06", "dia": "Dom", "hora": null, "tipo": "CrossFit", "sesion": "CrossFit, sin piernas pesadas ni saltos (el lunes toca la calidad)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "CrossFit, sin piernas pesadas ni saltos (el lunes toca la calidad). La duración de la clase no está en el plan."},
{"fecha": "2026-12-07", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 600 m a ritmo K + 4, rec. 3 min", "duracion_min": 55, "duracion": "estimada", "intensidad": "dura", "notas": "Las cuatro dentro de 3 s del objetivo."},
{"fecha": "2026-12-08", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2026-12-09", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "35 min suave + 6 rectas", "duracion_min": 55, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2026-12-10", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2026-12-11", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2026-12-12", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "48 min suave", "duracion_min": 60, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2026-12-13", "dia": "Dom", "hora": null, "tipo": "CrossFit", "sesion": "CrossFit, sin piernas pesadas ni saltos (el lunes toca la calidad)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "CrossFit, sin piernas pesadas ni saltos (el lunes toca la calidad). La duración de la clase no está en el plan."},
{"fecha": "2026-12-14", "dia": "Lun", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "25 min suave + 4 rectas", "duracion_min": 40, "duracion": "estimada", "intensidad": "suave", "notas": "Semana de descarga."},
{"fecha": "2026-12-15", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2026-12-16", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2026-12-17", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2026-12-18", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2026-12-19", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "30 min suave", "duracion_min": 45, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2026-12-20", "dia": "Dom", "hora": null, "tipo": "CrossFit", "sesion": "CrossFit sin piernas ni saltos (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "CrossFit sin piernas ni saltos (mañana, el control). La duración de la clase no está en el plan."},
{"fecha": "2026-12-21", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (3.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2026-12-22", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2026-12-23", "dia": "Mié", "hora": null, "tipo": "rodaje suave", "sesion": "30 min suave", "duracion_min": 45, "duracion": "estimada", "intensidad": "suave", "notas": "Suave: puedes hablar con frases enteras."},
{"fecha": "2026-12-24", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2026-12-25", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2026-12-26", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "48 min suave", "duracion_min": 60, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2026-12-27", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2026-12-28", "dia": "Lun", "hora": null, "tipo": "umbral", "sesion": "4 × 5 min a umbral, rec. 1 min", "duracion_min": 60, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2026-12-29", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2026-12-30", "dia": "Mié", "hora": null, "tipo": "rodaje suave + cuestas", "sesion": "35 min suave + 8 cuestas de 20 s", "duracion_min": 60, "duracion": "estimada", "intensidad": "suave", "notas": "Suave y, al final, 8 cuestas: en una subida del 5 al 8 %, 20 s subiendo fuerte sin llegar a tope; bajas andando."},
{"fecha": "2026-12-31", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-01-01", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-01-02", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "52 min suave", "duracion_min": 65, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-01-03", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-01-04", "dia": "Lun", "hora": null, "tipo": "intervalos", "sesion": "8 × 2 min a ritmo K + 10, rec. 2 min", "duracion_min": 65, "duracion": "estimada", "intensidad": "dura", "notas": "Todas al mismo ritmo, dentro de 3 s por 400 del objetivo; la primera, no más rápida."},
{"fecha": "2027-01-05", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-01-06", "dia": "Mié", "hora": null, "tipo": "rodaje suave", "sesion": "38 min suave + 6 × 200 m a ritmo K", "duracion_min": 70, "duracion": "estimada", "intensidad": "media", "notas": "Suave y, al final, 6 × 200 m a ritmo K con 200 m andando entre cada uno."},
{"fecha": "2027-01-07", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-01-08", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-01-09", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "55 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-01-10", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-01-11", "dia": "Lun", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "25 min suave + 4 rectas", "duracion_min": 40, "duracion": "estimada", "intensidad": "suave", "notas": "Semana de descarga."},
{"fecha": "2027-01-12", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2027-01-13", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2027-01-14", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2027-01-15", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-01-16", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "35 min suave", "duracion_min": 50, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2027-01-17", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-01-18", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (4.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2027-01-19", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-01-20", "dia": "Mié", "hora": null, "tipo": "rodaje suave + cuestas", "sesion": "40 min suave + 8 cuestas de 20 s", "duracion_min": 65, "duracion": "estimada", "intensidad": "suave", "notas": "Suave y, al final, 8 cuestas: en una subida del 5 al 8 %, 20 s subiendo fuerte sin llegar a tope; bajas andando."},
{"fecha": "2027-01-21", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-01-22", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-01-23", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "58 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-01-24", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-01-25", "dia": "Lun", "hora": null, "tipo": "umbral", "sesion": "3 × 8 min a umbral, rec. 2 min", "duracion_min": 65, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-01-26", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-01-27", "dia": "Mié", "hora": null, "tipo": "rodaje suave", "sesion": "40 min suave + 6 × 200 m a ritmo K", "duracion_min": 75, "duracion": "estimada", "intensidad": "media", "notas": "Suave y, al final, 6 × 200 m a ritmo K con 200 m andando entre cada uno."},
{"fecha": "2027-01-28", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-01-29", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-01-30", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "60 min suave", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-01-31", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-02-01", "dia": "Lun", "hora": null, "tipo": "intervalos", "sesion": "6 × 3 min a ritmo K + 10, rec. 2 min 30 s", "duracion_min": 65, "duracion": "estimada", "intensidad": "dura", "notas": "Todas al mismo ritmo, dentro de 3 s por 400 del objetivo; la primera, no más rápida."},
{"fecha": "2027-02-02", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-02-03", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "40 min suave + 6 rectas", "duracion_min": 60, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-02-04", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-02-05", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-02-06", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "60 min suave", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-02-07", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-02-08", "dia": "Lun", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "25 min suave + 4 rectas", "duracion_min": 40, "duracion": "estimada", "intensidad": "suave", "notas": "Semana de descarga."},
{"fecha": "2027-02-09", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2027-02-10", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2027-02-11", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2027-02-12", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-02-13", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "35 min suave", "duracion_min": 50, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2027-02-14", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-02-15", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (5.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2027-02-16", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-02-17", "dia": "Mié", "hora": null, "tipo": "rodaje suave", "sesion": "45 min suave + 6 × 200 m a ritmo K", "duracion_min": 80, "duracion": "estimada", "intensidad": "media", "notas": "Suave y, al final, 6 × 200 m a ritmo K con 200 m andando entre cada uno."},
{"fecha": "2027-02-18", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-02-19", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-02-20", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "60 min suave", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-02-21", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-02-22", "dia": "Lun", "hora": null, "tipo": "umbral", "sesion": "2 × 12 min a umbral, rec. 2 min", "duracion_min": 60, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-02-23", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-02-24", "dia": "Mié", "hora": null, "tipo": "rodaje suave + cuestas", "sesion": "45 min suave + 8 cuestas de 20 s", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Suave y, al final, 8 cuestas: en una subida del 5 al 8 %, 20 s subiendo fuerte sin llegar a tope; bajas andando."},
{"fecha": "2027-02-25", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-02-26", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-02-27", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "62 min suave", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-02-28", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-03-01", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 600 m a ritmo K, rec. 3 min", "duracion_min": 55, "duracion": "estimada", "intensidad": "dura", "notas": "Las cuatro dentro de 3 s del objetivo."},
{"fecha": "2027-03-02", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-03-03", "dia": "Mié", "hora": null, "tipo": "rodaje suave", "sesion": "45 min suave + 6 × 200 m a ritmo K", "duracion_min": 80, "duracion": "estimada", "intensidad": "media", "notas": "Suave y, al final, 6 × 200 m a ritmo K con 200 m andando entre cada uno."},
{"fecha": "2027-03-04", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-03-05", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-03-06", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "65 min suave", "duracion_min": 80, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-03-07", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-03-08", "dia": "Lun", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "25 min suave + 4 rectas", "duracion_min": 40, "duracion": "estimada", "intensidad": "suave", "notas": "Semana de descarga."},
{"fecha": "2027-03-09", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2027-03-10", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2027-03-11", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2027-03-12", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-03-13", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "40 min suave", "duracion_min": 55, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2027-03-14", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-03-15", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (6.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2027-03-16", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-03-17", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "50 min suave + 6 rectas", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-03-18", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-03-19", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-03-20", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "65 min suave", "duracion_min": 80, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-03-21", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-03-22", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 600 m a ritmo K, rec. 3 min", "duracion_min": 55, "duracion": "estimada", "intensidad": "dura", "notas": "Las cuatro dentro de 3 s del objetivo."},
{"fecha": "2027-03-23", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-03-24", "dia": "Mié", "hora": null, "tipo": "umbral", "sesion": "2 × 8 min a umbral + 15 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-03-25", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-03-26", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-03-27", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "65 min suave", "duracion_min": 80, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-03-28", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-03-29", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "3 × 800 m a ritmo K + 10, rec. 3 min", "duracion_min": 55, "duracion": "estimada", "intensidad": "dura", "notas": "Las tres dentro de 4 s del objetivo."},
{"fecha": "2027-03-30", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-03-31", "dia": "Mié", "hora": null, "tipo": "rodaje suave + cuestas", "sesion": "50 min suave + 8 cuestas de 20 s", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "Suave y, al final, 8 cuestas: en una subida del 5 al 8 %, 20 s subiendo fuerte sin llegar a tope; bajas andando."},
{"fecha": "2027-04-01", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-04-02", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-04-03", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "65 min: suave y los 10 últimos alegres", "duracion_min": 80, "duracion": "estimada", "intensidad": "media", "notas": "La larga: suave y los últimos 10 min a ritmo alegre (respiras fuerte pero controlas)."},
{"fecha": "2027-04-04", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-04-05", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 400 m a ritmo K, rec. 2 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-04-06", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2027-04-07", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2027-04-08", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2027-04-09", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-04-10", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "40 min suave", "duracion_min": 55, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2027-04-11", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-04-12", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (7.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2027-04-13", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-04-14", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "50 min suave + 6 rectas", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-04-15", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-04-16", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-04-17", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "65 min suave", "duracion_min": 80, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-04-18", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-04-19", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 600 m a ritmo K, rec. 2 min 30 s", "duracion_min": 55, "duracion": "estimada", "intensidad": "dura", "notas": "Las cuatro dentro de 3 s del objetivo: 2.400 m a ritmo K, el tope por sesión."},
{"fecha": "2027-04-20", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-04-21", "dia": "Mié", "hora": null, "tipo": "umbral", "sesion": "2 × 8 min a umbral + 15 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-04-22", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-04-23", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-04-24", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "68 min suave", "duracion_min": 80, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-04-25", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-04-26", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 800 m a ritmo K + 10, rec. 3 min", "duracion_min": 60, "duracion": "estimada", "intensidad": "dura", "notas": "Las cuatro dentro de 4 s del objetivo."},
{"fecha": "2027-04-27", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-04-28", "dia": "Mié", "hora": null, "tipo": "rodaje suave + cuestas", "sesion": "50 min suave + 8 cuestas de 20 s", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "Suave y, al final, 8 cuestas: en una subida del 5 al 8 %, 20 s subiendo fuerte sin llegar a tope; bajas andando."},
{"fecha": "2027-04-29", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-04-30", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-05-01", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "70 min: suave y los 10 últimos alegres", "duracion_min": 85, "duracion": "estimada", "intensidad": "media", "notas": "La larga: suave y los últimos 10 min a ritmo alegre (respiras fuerte pero controlas)."},
{"fecha": "2027-05-02", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-05-03", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 400 m a ritmo K, rec. 2 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-05-04", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2027-05-05", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2027-05-06", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2027-05-07", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-05-08", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "40 min suave", "duracion_min": 55, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2027-05-09", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-05-10", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (8.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2027-05-11", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-05-12", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "50 min suave + 6 rectas", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-05-13", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-05-14", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-05-15", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "65 min suave", "duracion_min": 80, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-05-16", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-05-17", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "6 × 400 m a ritmo K, rec. 1 min 30 s", "duracion_min": 55, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-05-18", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-05-19", "dia": "Mié", "hora": null, "tipo": "umbral", "sesion": "2 × 10 min a umbral + 15 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-05-20", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-05-21", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-05-22", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "68 min suave", "duracion_min": 80, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-05-23", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-05-24", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 600 m a ritmo K, rec. 2 min 30 s", "duracion_min": 55, "duracion": "estimada", "intensidad": "dura", "notas": "Las cuatro dentro de 3 s del objetivo: 2.400 m a ritmo K, el tope por sesión."},
{"fecha": "2027-05-25", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-05-26", "dia": "Mié", "hora": null, "tipo": "rodaje suave + cuestas", "sesion": "50 min suave + 8 cuestas de 20 s", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "Suave y, al final, 8 cuestas: en una subida del 5 al 8 %, 20 s subiendo fuerte sin llegar a tope; bajas andando."},
{"fecha": "2027-05-27", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-05-28", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-05-29", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "70 min: suave y los 10 últimos alegres", "duracion_min": 85, "duracion": "estimada", "intensidad": "media", "notas": "La larga: suave y los últimos 10 min a ritmo alegre (respiras fuerte pero controlas)."},
{"fecha": "2027-05-30", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-05-31", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 400 m a ritmo K, rec. 2 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-06-01", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2027-06-02", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2027-06-03", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2027-06-04", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-06-05", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "40 min suave", "duracion_min": 55, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2027-06-06", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-06-07", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (9.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2027-06-08", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-06-09", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "50 min suave + 6 rectas", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-06-10", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-06-11", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-06-12", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "60 min suave", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-06-13", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-06-14", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "3 × 600 m a ritmo O, rec. 3 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Las tres dentro de 3 s del objetivo."},
{"fecha": "2027-06-15", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-06-16", "dia": "Mié", "hora": null, "tipo": "series", "sesion": "8 × 200 m rápidos, rec. 200 m andando", "duracion_min": 65, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-06-17", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-06-18", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-06-19", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "60 min suave", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-06-20", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-06-21", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "2 × (600 + 400 m) a ritmo O: 1 min entre el 600 y el 400, 5 min entre las dos", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-06-22", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-06-23", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "50 min suave + 6 rectas", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-06-24", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-06-25", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-06-26", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "60 min suave", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-06-27", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-06-28", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 400 m a ritmo O, rec. 2 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-06-29", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2027-06-30", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2027-07-01", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2027-07-02", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-07-03", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "35 min suave", "duracion_min": 50, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2027-07-04", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-07-05", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (10.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2027-07-06", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-07-07", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "50 min suave + 6 rectas", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-07-08", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-07-09", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-07-10", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "60 min suave", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-07-11", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-07-12", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "3 × 600 m a ritmo O, rec. 2 min 30 s + 2 × 200 m rápidos", "duracion_min": 60, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-07-13", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-07-14", "dia": "Mié", "hora": null, "tipo": "series", "sesion": "8 × 200 m rápidos, rec. 200 m andando", "duracion_min": 65, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-07-15", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-07-16", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-07-17", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "60 min suave", "duracion_min": 75, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-07-18", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-07-19", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "2 × (600 + 400 m) a ritmo O: 1 min y 4 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-07-20", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-07-21", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "50 min suave + 6 rectas", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-07-22", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-07-23", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-07-24", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "55 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-07-25", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-07-26", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 400 m a ritmo O, rec. 2 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-07-27", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2027-07-28", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2027-07-29", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2027-07-30", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-07-31", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "35 min suave", "duracion_min": 50, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2027-08-01", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-08-02", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (11.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2027-08-03", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-08-04", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "50 min suave + 6 rectas", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-08-05", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-08-06", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-08-07", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "55 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-08-08", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-08-09", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "2 × 600 m a ritmo O, rec. 3 min + 3 × 200 m rápidos", "duracion_min": 60, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-08-10", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-08-11", "dia": "Mié", "hora": null, "tipo": "series", "sesion": "8 × 200 m rápidos, rec. 200 m andando", "duracion_min": 65, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-08-12", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-08-13", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-08-14", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "55 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-08-15", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-08-16", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "2 × (600 + 400 m) a ritmo O: 1 min y 3 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-08-17", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-08-18", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "50 min suave + 6 rectas", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-08-19", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 4 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-08-20", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-08-21", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "55 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-08-22", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-08-23", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 400 m a ritmo O, rec. 2 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-08-24", "dia": "Mar", "hora": null, "tipo": "test de barra", "sesion": "Test de barra", "duracion_min": 10, "duracion": "estimada", "intensidad": "dura", "notas": "Test de barra: hombros 5 min y una sola suspensión a tope con las reglas del BOE, cronometrada por otra persona y grabada de lado. Ese día, nada más de barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito suave."},
{"fecha": "2027-08-25", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 3 rectas", "duracion_min": 30, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 3 rectas."},
{"fecha": "2027-08-26", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen) + test de circuito (con el kit)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad del test del martes, 2 min entre series. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, test de circuito."},
{"fecha": "2027-08-27", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-08-28", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "35 min suave", "duracion_min": 50, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el control en Arucas."},
{"fecha": "2027-08-29", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el control)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-08-30", "dia": "Lun", "hora": null, "tipo": "control de 1.000 m", "sesion": "Control de 1.000 m (12.º)", "duracion_min": 40, "duracion": "estimada", "intensidad": "dura", "notas": "Con este control y el anterior se fija el ritmo K del bloque siguiente (el mejor de los dos)."},
{"fecha": "2027-08-31", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-09-01", "dia": "Mié", "hora": null, "tipo": "series", "sesion": "8 × 200 m rápidos, rec. 200 m andando", "duracion_min": 65, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-09-02", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si las cinco salen limpias, la semana siguiente 2 s más · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-09-03", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-09-04", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "55 min suave", "duracion_min": 70, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-09-05", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-09-06", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "3 × 600 m a ritmo O, rec. 3 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-09-07", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A (fuerza)", "duracion_min": 20, "duracion": "plan", "intensidad": "media", "notas": "Barra A, fuerza (20 min): hombros 5 min · bajadas lentas de 5 s, de 4 × 4 a 5 × 4 (con 5 × 4 limpias, bajas en 6 s; cuando hagas una dominada supina entera, la primera serie son 3 × 1 dominadas) · 3 × 15 s colgada con los codos en ángulo recto · 3 × 10 remo invertido, 1 min entre series. Nunca al fallo; codo u hombro con dolor de 3 o más, sin barra. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica) (25 min más)."},
{"fecha": "2027-09-08", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "45 min suave + 6 rectas", "duracion_min": 65, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-09-09", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 5 series de la mitad de tu último test más 2 s en la postura del examen (agarre supino, barbilla por encima de la barra, cuerpo recto y quieto), 2 min entre series; si la semana pasada alguna se rompió, repites el tiempo de la semana pasada · 2 × 30 s colgada con los brazos estirados, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-09-10", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-09-11", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "50 min suave", "duracion_min": 65, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-09-12", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-09-13", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "2 × (600 + 400 m) a ritmo O: 1 min y 4 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-09-14", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A suave", "duracion_min": 10, "duracion": "plan", "intensidad": "media", "notas": "Barra A suave (10 min): hombros · 3 × 3 bajadas lentas · 2 × 15 s colgada con los codos en ángulo recto, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica)."},
{"fecha": "2027-09-15", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "45 min suave + 6 rectas", "duracion_min": 65, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 6 rectas."},
{"fecha": "2027-09-16", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 3 series de la mitad de tu último test, 2 min entre series. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-09-17", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-09-18", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "50 min suave", "duracion_min": 65, "duracion": "estimada", "intensidad": "suave", "notas": "La larga: suave de principio a fin."},
{"fecha": "2027-09-19", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-09-20", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "4 × 400 m a ritmo O, rec. 2 min", "duracion_min": 50, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-09-21", "dia": "Mar", "hora": null, "tipo": "barra A (fuerza)", "sesion": "Barra A suave", "duracion_min": 10, "duracion": "plan", "intensidad": "media", "notas": "Barra A suave (10 min): hombros · 3 × 3 bajadas lentas · 2 × 15 s colgada con los codos en ángulo recto, 1 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica)."},
{"fecha": "2027-09-22", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "25 min suave + 4 rectas", "duracion_min": 40, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 4 rectas."},
{"fecha": "2027-09-23", "dia": "Jue", "hora": null, "tipo": "barra B (la del examen)", "sesion": "Barra B (la del examen)", "duracion_min": 15, "duracion": "plan", "intensidad": "media", "notas": "Barra B, la del examen (15 min): hombros 5 min · 2 series de la mitad de tu último test, 2 min entre las dos. El lunes, el simulacro. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-09-24", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-09-25", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "30 min suave", "duracion_min": 45, "duracion": "estimada", "intensidad": "suave", "notas": "Suave de principio a fin, más corta que la larga de la semana pasada: el lunes, el simulacro en Arucas."},
{"fecha": "2027-09-26", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit sin piernas o 15-20 min muy suaves (mañana, el simulacro)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 15-20 min (víspera del simulacro)."},
{"fecha": "2027-09-27", "dia": "Lun", "hora": null, "tipo": "simulacro (circuito, barra y 1.000 m)", "sesion": "SIMULACRO: circuito, barra y 1.000 m", "duracion_min": 70, "duracion": "estimada", "intensidad": "dura", "notas": "El último dato antes de la prueba. Decide el ritmo de la última semana."},
{"fecha": "2027-09-28", "dia": "Mar", "hora": null, "tipo": "barra", "sesion": "Barra", "duracion_min": 10, "duracion": "plan", "intensidad": "media", "notas": "Barra (10 min): hombros y 2 series de la mitad de tu último test, 2 min entre las dos. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica)."},
{"fecha": "2027-09-29", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "30 min suave + 4 rectas", "duracion_min": 45, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 4 rectas."},
{"fecha": "2027-09-30", "dia": "Jue", "hora": null, "tipo": "barra", "sesion": "Barra", "duracion_min": 10, "duracion": "plan", "intensidad": "media", "notas": "Barra (10 min): hombros y 2 × 15 s en la postura del examen, 2 min entre las dos. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (rápido)."},
{"fecha": "2027-10-01", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-10-02", "dia": "Sáb", "hora": null, "tipo": "rodaje suave", "sesion": "40 min suave", "duracion_min": 50, "duracion": "estimada", "intensidad": "suave", "notas": "Suave, sin nada más."},
{"fecha": "2027-10-03", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."},
{"fecha": "2027-10-04", "dia": "Lun", "hora": null, "tipo": "series", "sesion": "3 × 300 m a ritmo O, rec. 2 min", "duracion_min": 45, "duracion": "estimada", "intensidad": "dura", "notas": "Calentamiento: 15 min suave + movilidad + 4 rectas."},
{"fecha": "2027-10-05", "dia": "Mar", "hora": null, "tipo": "barra", "sesion": "Barra", "duracion_min": 10, "duracion": "plan", "intensidad": "media", "notas": "Barra (10 min): hombros y 2 × 15 s en la postura del examen, 2 min entre las dos. Nada más. Cuando llegue el kit del circuito (aún no): antes de la barra, circuito (técnica)."},
{"fecha": "2027-10-06", "dia": "Mié", "hora": null, "tipo": "rodaje suave + rectas", "sesion": "20 min suave + 4 rectas", "duracion_min": 35, "duracion": "estimada", "intensidad": "suave", "notas": "Al final, 4 rectas."},
{"fecha": "2027-10-07", "dia": "Jue", "hora": null, "tipo": "descanso", "sesion": "Sin barra ni circuito", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": "Sin barra: el sábado, la prueba."},
{"fecha": "2027-10-08", "dia": "Vie", "hora": null, "tipo": "descanso", "sesion": "Descanso", "duracion_min": 0, "duracion": "plan", "intensidad": "descanso", "notas": ""},
{"fecha": "2027-10-09", "dia": "Sáb", "hora": null, "tipo": "PRUEBAS FÍSICAS (fecha supuesta)", "sesion": "Prueba (fecha por confirmar)", "duracion_min": null, "duracion": "sin fijar", "intensidad": "dura", "notas": "La fecha real la fija la convocatoria de 2027."},
{"fecha": "2027-10-10", "dia": "Dom", "hora": null, "tipo": "elige CrossFit o rodaje", "sesion": "Eliges: CrossFit o 25-30 min suaves", "duracion_min": null, "duracion": "sin fijar", "intensidad": "media", "notas": "Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. Rodaje de 25-30 min."}
]
```

---

## 4. Cómo informa Cristina y cómo adapto el plan

### 4.1 Cómo me llega lo que ha hecho

- **Me escribe en esta sesión,** empezando por «soy cristina». Me dice qué ha hecho, qué no y cómo se ha sentido.
- **Me manda la exportación de Salud del Apple Watch** (`/Users/Daniel/Downloads/exportación-N.zip`). De ella saco el entreno: tiempos, ritmos y pulso. Contiene todos sus datos de salud, así que se lee en local, desde el zip, y nunca se copia ni se sube.
- **Usa «Copiar para el entrenador»** en la página (en «Cómo llegas hoy» y en «Cómo fue») y me pega el texto.

### 4.2 Qué hago con cada envío

1. Analizo.
2. Registro en `historial.json`. Si no lo hizo, va `hecho: false` con el `motivo`. Lo de salud va **solo** a `privado.json`.
3. Decido si cambia el plan, y lo digo aunque no cambie nada.
4. Cambio `plan.json` si toca.
5. Reconstruyo con `construir.py` y lo pruebo con `probar.py`.
6. Hago commit.
7. **Publico solo cuando ella o Daniel me lo piden.**

### 4.3 Las reglas con las que adapto (todas en `plan.json` → `reglas`)

- **«Si no te da tiempo»** (`sin-tiempo`):
  - Dormir lo suficiente va antes que cualquier sesión.
  - Si la semana no da para todo, este es el orden: 1) la serie del lunes y la larga del sábado; 2) la barra B; 3) el suave del miércoles; 4) la barra A.
  - Lo que se cae no se recupera otro día.
  - La semana siguiente repite los números que no hizo antes de subir.
  - **Para el estudio:** si una tarde hace falta para estudiar, lo primero que se cae es la barra A y después el suave del miércoles. Nunca se quita sueño.
- **Cambiar el orden dentro de la semana sí vale,** si no suma carga. El 9-11 hizo el rodaje del miércoles en lugar de la serie del lunes, y se intercambiaron los dos días.
- **«Cómo llegas hoy»** (`como-llegas`):
  - Cada día marca dolor, piernas, sueño, estrés, energía y alarmas.
  - Según lo que sume, la sesión va tal cual, con frenos, más suave y corta, sin carrera o al médico.
  - El miércoles es lo primero que se toca.
- **«Dolor»** (`dolor`) y **«Comer y descansar»** (`energia`): con mareo, náuseas o temblores, se para aunque no haya terminado.
- **CrossFit, solo el domingo** (`descanso`): sin piernas pesadas ni saltos, porque el lunes toca la calidad. El viernes, descanso.
- **Ejemplos recientes:**
  - 3-11: barra A quitada, llegó cargada.
  - 9-11: cambio de orden con el miércoles.
  - 11-11: CrossFit en lugar de la serie. Cuenta como entreno, no como la serie. El 6 × 200 pasa al lunes 16, en lugar de las rectas.

---

## 5. Reglas de convivencia

### 5.1 Lo que no se toca (es de la preparación física)

- `docs/cristina/index.html` y `docs/index.html`. Se generan; **nunca a mano**.
- `datos/cristina/plan.json`, `historial.json` y `privado.json`. Si necesitas algo de ellos, se lee; si hay que cambiarlo, me lo pides.
- `web/src/**`: plantilla, CSS y JS **compartidos con la página de Daniel.** Cualquier cambio ahí cambia las dos páginas y tiene que pasar `sh web/instalar.sh` y `sh web/comprobar_docs.sh` de Daniel. Eso incluye la barra de pestañas (`20_shell.html`): la pestaña «Estudio» de Cristina va en tu bloque `pestana_estudio` de `construir.py`, no ahí.
- `web/cristina/construir.py`, salvo el bloque `pestana_estudio`, que es tuyo; `web/cristina/src/js/10_cristina.js`, `60_consejo.js` y `web/cristina/src/css/90_cristina.css`.
- `CLAUDE.md`, `.gitignore` y los archivos de la preparación de Daniel (`datos/plan.json`, `datos/historial.json`, `web/datos/`, `herramientas/`).

### 5.2 Lo que sería tuyo (propuesta)

| Archivo | Para qué |
|---|---|
| `datos/cristina/estudio.json` | El plan de estudio (público, ver 5.6) |
| `web/cristina/src/js/70_estudio.js` | Tu módulo |
| `web/cristina/src/css/91_estudio.css` | Tu CSS |
| El bloque `pestana_estudio` de `web/cristina/construir.py` | La pestaña de estudio |

Lo que ya hace el constructor, sin tocarlo:
- **JS:** mete cualquier `.js` de `web/cristina/src/js/`, ordenado por nombre, detrás de los módulos de Daniel y delante de `99_arranque.js`.
- **CSS:** mete cualquier `.css` de `web/cristina/src/css/` dentro de `@layer cristina{…}`. **Tu CSS no puede llevar `@layer` ni `@import`:** la construcción se para.

**`estudio.json` ya entra en la página (gancho añadido el 15-11-2026, a petición de Daniel).**
- Si existe `datos/cristina/estudio.json`, `construir.py` lo mete tal cual en `PC.D.estudio`.
- Si no existe, `PC.D.estudio` no está: tu módulo tiene que aguantarlo y no pintar nada.
- Si no es un JSON válido, la construcción se para con un error.
- Pasa por la misma comprobación de privacidad (`vigilar`) que el resto de los datos.
- La estructura de `estudio.json` la decides tú. `construir.py` sigue siendo mío: si necesitas que calcule algo, pídemelo.

Convenciones:
- Clases e ids con prefijo `es-`.
- Almacenamiento con `PC.store.get/set('estudio-…')`, que queda como `cr-estudio-…`.
- Para pintar una tarjeta en Hoy o en Plan sin tocar `web/src/`, copia el patrón de `60_consejo.js`:
  - crea una `section.card` y la inserta después de `#hoy-ses`;
  - escucha el evento `pc:vista`;
  - y si el hash trae otra fecha (`#hoy/AAAA-MM-DD`), la esconde.
- Fechas con `PC.hoyIso()` (admite `?hoy=AAAA-MM-DD` para probar).

### 5.3 Pruebas antes de dar algo por bueno

```bash
python3 web/cristina/construir.py
```

```bash
python3 web/cristina/herramientas/probar.py --ruta hoy --hoy 2026-11-16
```

- `construir.py` tiene que acabar sin `ERROR`.
- `probar.py` tiene que dar «errores JS (0)» en `hoy`, `plan`, `marcas` y `tecnica`, sin desbordar a 390 px de ancho. Para ver la página, añade `--captura <archivo.png>`.
- **Ojo:** `plan` ya da `scrollWidth 444` antes de cualquier cambio tuyo. Es un fallo previo, no tuyo.
- Si tocas `web/src/` (hablado antes conmigo), también `sh web/instalar.sh` y `sh web/comprobar_docs.sh`.

### 5.4 El límite de tamaño (bloqueante)

- `construir.py` tiene `LIMITE_GZIP = 240 * 1024` y la página pesa ya **236,9 KB con gzip**. Quedan unos 3 KB para tu módulo y un año de datos de estudio.
- Pasarse no para la construcción: solo imprime «(PASA DEL LÍMITE)». Pero el límite es una decisión.
- **Subirlo lo decide Daniel.** Para su página lo subió de 240 a 270 KB el 23-10.
- Cargar `estudio.json` como archivo aparte también rompería otra regla de la especificación: la página es un único archivo autónomo. También lo decide Daniel.

### 5.5 Git y publicación (acordado el 15-11-2026)

La sesión del estudio trabaja en **otro usuario del Mac, con su propio clon** de `danixone/plan-cadiz` y su propia clave de despliegue, y publica ella misma. No compartimos carpeta: el riesgo ya no es llevarse el trabajo a medias del otro, sino chocar en `main`. Reglas:

1. **Antes de subir, `git fetch`;** si `main` ha avanzado, `git pull --rebase`.
2. **`docs/cristina/index.html` no se fusiona a mano.** Si choca, se reconstruye con `construir.py`, se prueba y se añade.
3. **Nunca `--force` ni `git add -A`.** Commits con rutas explícitas.
4. **Cada una toca solo lo suyo.**
   - La del estudio: `70_estudio.js`, `91_estudio.css`, `datos/cristina/estudio.json` y el bloque `pestana_estudio` de `construir.py`.
   - La de la preparación física: todo lo demás (5.1).
5. **Si una subida lleva commits de la otra sesión, se avisa.**

Cómo publica cada una:
- **La del estudio** publica el plan de estudio actualizado cada vez que lo rehace, y avisa antes de cualquier cambio de código en la página.
- **La de la preparación física** publica cuando lo piden Daniel o Cristina, como hasta ahora.

**Ojo con la comprobación de privacidad:** `vigilar` solo funciona en el clon que tiene `datos/cristina/privado.json`, que es el de la preparación física. En el clon del estudio no se comprueba nada, así que `estudio.json` no puede llevar nada personal (ver 5.6). Cada vez que yo reconstruyo la página, `vigilar` también revisa `estudio.json`.

### 5.6 Privacidad

- **Todo lo que entra en `datos/cristina/*.json` (salvo `privado.json`) y en la página se publica.**
- Un calendario de estudio sería nuevo en la web: hace falta el sí expreso de Daniel y de Cristina antes del primer push.
- **Nada de su horario de trabajo, sueño, salud ni lugares.**
- Si algo tiene que quedarse en su Mac, va en `datos/cristina/privado/` (en `.gitignore`) y no se mete en la página.
- Si quieres que el constructor vigile una palabra (que se pare si aparece en la página), pídemelo y la añado a `vigilar`.

---

## 6. Diseño y estilo de la página

La especificación completa está en `web/doc/especificacion.md`, sobre todo §2 (principios), §3.4 (contenido), §4.3-4.7 (tipografía, espacios, tamaño táctil y tono). Los tokens están en `web/src/css/10_sistema.css`.

### 6.1 Principios (los que más se rompen)

1. **Hoy primero, en tres segundos.** Al abrir el móvil se ve qué toca, sin desplazarse. Lo del estudio va **debajo** de la sesión de entrenamiento y de «Cómo llegas hoy», no encima.
2. **Una casa por dato.** Cada cifra vive en un solo sitio. Si el estudio necesita el entreno del día, lo lee de `PC.CR.dia()`, no lo copia.
3. **Herramienta antes que párrafo.** Si un texto sirve para decidir, se convierte en un control.
4. **Conclusión visible, razón plegada.**
   - Cada bloque se abre con una línea que ya es la conclusión, el dato y la acción, en 40 palabras como mucho.
   - El porqué va en `<details class="acc why">`.
   - Como mucho una negrita por bloque.
5. **Medido, supuesto y autoinformado no se confunden.** Lo no verificado lleva `<span class="chip sup">supuesto</span>` (o «sin verificar», «estimado») y, en gráficas, trazo discontinuo.
6. **Orden fijo.** Nada se reordena solo según la hora o el estado.
7. **Ninguna cifra inventada.** Toda cifra sale de los datos o de una cuenta explícita.

### 6.2 Tipografía

- Una sola familia: **Barlow 400/600/700** (`var(--font)`).
- Cifras en columna con la clase `.num` (cifras tabulares).
- Escala, sin inventar tamaños:
  - `--fs-xs` 12 px (nada por debajo);
  - `--fs-sm` 14;
  - `--fs-md` 16 (cuerpo);
  - `--fs-lg` 18 (título de tarjeta);
  - `--fs-xl` 22 (título de vista);
  - `--fs-2xl` 28 (cifra de tarjeta).
- `--fs-3xl` (44) es una por vista y ya está usada. `--fs-4xl` (72) es solo para el modo pista.
- Interlineado: 1,15 en cifras, 1,3 en títulos y 1,5 en cuerpo. Pesos: 400 cuerpo, 600 títulos y chips, 700 cifras.

### 6.3 Color

- **Solo tokens, nunca colores escritos a mano:** así funciona el modo oscuro sin hacer nada.
  - Superficies: `--bg`, `--surface`, `--surface-2`, `--border`.
  - Texto: `--text`, `--text-2`, `--text-3`.
  - Marca: `--primary`, `--primary-soft`.
  - Estado: `--ok`/`--ok-soft`, `--warn`/`--warn-soft`, `--bad`/`--bad-soft`.
- Series de color: `--s1` carrera, `--s2` barra/fuerza y `--s3` circuito. **Para el estudio no hay color asignado.** No reutilices `--s1/s2/s3`, porque cambiarías lo que significan: pídeme un token nuevo y lo añadimos a los dos modos.

### 6.4 Espacios, radios y maqueta

- Espacios en base 4: `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24 · `--sp-8` 32 px.
- Margen lateral `--gutter` 16 px. 16 px entre tarjetas en el móvil.
- Radios: `--r-sm` 10 (botones y campos), `--r-md` 14 (tarjetas) y `--r-pill` (chips).
- Pensada para móvil de 390 px, sin desplazamiento horizontal. Una columna hasta 767 px.
- **Todo lo tocable mide 44 × 44 px como mínimo** (`--tap`).
- Movimiento: `--dur-1/2/3` y `--ease`. Todo se anula con `prefers-reduced-motion`.

### 6.5 Componentes que ya existen (úsalos, no los copies)

| Componente | Para qué |
|---|---|
| `.card` + `.card-h` | La tarjeta base |
| `.btn` (`.sec`, `.ghost`) | Botones |
| `.chip` (`.sup`) | Chips y supuestos |
| `.aviso` (`.warn`) | Avisos |
| `details.acc.why` | Plegables |
| `.stat` / `.stats` | Cifras con etiqueta |
| `.seg` | Selector segmentado |
| `.kv` | Pares de clave y valor |
| `.week` | Fila de la semana |
| `.timer` | Temporizador |
| `.muted` | Texto secundario |
| `.section-t` | Título de sección |
| `.tscroll` | Tablas anchas |
| `PC.icon('nombre')` | Iconos |

Para ver cómo se combinan, mira las tarjetas de Hoy y «Cómo llegas hoy».

### 6.6 Tono y formatos

- **Castellano de España, de tú, frases cortas, mayúscula solo al principio.**
- **Sin emoji, sin exclamaciones y sin frases de ánimo.** El plan informa, no anima.
- Decimales con coma: `4,67`, `9,9 s`.
- Tiempos: `3:34`, `0:43,5`. Duraciones: `6h30`.
- Rangos con raya: `5h00–6h29`. Multiplicación con espacios: `6 × 400`.
- Fechas: corta `mar 29-9` y larga `martes 29 de septiembre`. Horas en 24 h (`18:00`).
- Unidades siempre: `min`, `h`, `s`, `m`, `km`, `ppm`, `pts`.
- **Los títulos son conclusiones:** «Hoy toca el tema 7, una hora», no «Plan de estudio».
- **Comillas latinas «» para citar una regla,** como en el resto de la página.

# Inventario completo de `docs/index.html` · lente «ruido y contenido»

Fecha del análisis: 29-9-2026. Archivo leído entero por partes (308.253 caracteres, 311.473 bytes): cabecera, CSS, las siete vistas, el script principal (gráficas, calculadora, dieta) y el segundo script (fechas, FIG, FOTOS, FICHAS, DET, DIADET). Contrastado con `datos/plan.json` (secciones actualizadas hasta el 28-9) y `datos/historial.json`. No se ha tocado ningún archivo del proyecto.

Copia para volver atrás: ya existe `docs/anterior/index.html`, idéntica byte a byte a la actual (comprobado con `cmp`). Está sin seguimiento en git (`?? docs/anterior/`): hasta que se haga commit, solo vive en este Mac. Ojo: si se publica dentro de `docs/`, quedará accesible en `/anterior/` de GitHub Pages.

## Leyenda

| Etiqueta | Qué significa | Qué se hace en el rediseño |
|---|---|---|
| **ESENCIAL** | Lo usa para entrenar o decidir. Tiene que verse sin buscar | Visible, arriba, en componente |
| **SECUNDARIO** | Útil, pero no para decidir hoy | Se conserva plegado o resumido en una línea |
| **HISTÓRICO** | Ya pasó; sirve de contexto o de registro | Va al archivo o historial plegado de Progreso |
| **OBSOLETO** | Contradice el plan vigente o ya no aplica | Se corrige con el dato de `plan.json` o se retira (se indica el choque) |

## Cifras de partida

| Pestaña | Palabras visibles | Altura a 390 px | Pantallas de 844 px | Cajas `.box` | Tablas | Negritas |
|---|---|---|---|---|---|---|
| Hoy | 1.267 (6.811 con el detalle oculto de cada día) | ≈ 5.150 px | ≈ 6 | 7 | 3 | 36 |
| Nota | 244 | ≈ 1.780 px | ≈ 2 | 1 | 2 | 13 |
| Plan | 1.777 | ≈ 6.900 px | ≈ 8 | 5 | 3 | 55 |
| Ejercicios | 1.816 | ≈ 9.450 px | ≈ 11 | 8 | 9 | 118 |
| Progreso | 963 (2.907 con los desplegables) | ≈ 5.550 px | ≈ 6,5 | 8 | 8 | 100 |
| Dieta | 851 | ≈ 4.410 px | ≈ 5 | 4 | 0 | 9 |
| Reglas | 1.058 | ≈ 4.420 px | ≈ 5 | 5 | 1 | 23 |

- La cabecera oscura ocupa unos 335 px en móvil (el 40 % de la primera pantalla) y se repite en cada pestaña.
- En 390 px la barra de pestañas corta «Dieta» y deja «Reglas» fuera de la vista, sin ninguna pista de que hay más.
- En el HTML hay 19 elementos con `hidden` en Hoy (16 días del 12 al 27-9 y 3 cajas) y 24 fichas de día en `DIADET` (del 11-9 al 4-10). No hay detalle de día para nada posterior al 4-10.
- El icono va dos veces en base64 (`apple-touch-icon` e `icon`), unos 32 KB: el 10 % del archivo.

---

## 0. Elementos comunes

| # | Elemento | Contenido | Etiqueta | Choque o nota | Destino |
|---|---|---|---|---|---|
| C1 | Cabecera · eyebrow y título | «Policía Nacional · Escala Básica · Cádiz» / «1.000 metros, dominadas y circuito» | SECUNDARIO | Correcto. Ocupa dos líneas grandes en cada pestaña | Cabecera compacta de una línea |
| C2 | Cabecera · cuenta atrás | 27 «días hasta el 26 oct» · 11 «hasta el simulacro» (10-10) · 9 «hasta el circuito del simulacro» (8-10). Calculadas al cargar | ESENCIAL | El 26-10 es `fechaReferencia`, no la fecha confirmada («última semana de octubre»): debería leerse «≈ 27 días · fecha sin confirmar» | Pista de progreso hacia Cádiz con hitos (ilustración) |
| C3 | Cabecera · escala del 1.000 | Barra de colores 2:54 → 3:49+, marca «tú: 3:34», «3:30 objetivo · 4 pts», «3:49 elimina» | ESENCIAL (el 3:49 debe verse) | Solo cuenta el kilómetro: no aparecen dominadas, circuito ni la media, que es lo que decide el apto | Indicador de nota con las tres pruebas + la media frente al 5,00, con el 3:49 marcado |
| C4 | Pestañas | 7 botones en tira horizontal con scroll oculto | ESENCIAL | En 390 px «Reglas» no se ve. `pc-tab` se guarda en localStorage pero nunca se lee | Navegación inferior en móvil |
| C5 | Pie | «actualizado el <fecha de hoy>» | OBSOLETO (engañoso) | Lo rellena `new Date()`: siempre muestra el día en que se abre, no el de la última actualización | Fecha real escrita al publicar |
| C6 | `<head>` | Título, metas de app, icono base64 duplicado, Google Fonts (Barlow, IBM Plex Mono) | SECUNDARIO | Icono duplicado, 32 KB | Un solo icono |
| C7 | Impresión (`@media print`) | Oculta pestañas, muestra todas las vistas | SECUNDARIO | — | Conservar |

---

## 1. Pestaña Hoy

| # | Bloque | Contenido | Etiqueta | Choque o nota | Destino |
|---|---|---|---|---|---|
| H1 | Título y entradilla | «Esta semana» · «Bloque A, primera semana con trabajo de 7:30 a 14:30 y pista nueva en Arucas. Cada mañana, antes de nada, el semáforo. Toca cualquier día…» | SECUNDARIO | La instrucción «toca cualquier día» es necesaria porque nada parece pulsable | Desaparece: la tarjeta de hoy ya está abierta |
| H2 | Filas de la semana 28-9 a 4-10 (7 `.day`) | Sesión en una línea + detalle en monoespaciada (ritmos, horas, reglas) | ESENCIAL | Estáticas en el HTML: la semana del 5-10 no existe en Hoy y a partir del 5-10 la pestaña principal queda caducada hasta que alguien la edite. «Lun 28 hecho» sale en verde aunque la sesión no fue válida (2h14 de sueño) | Tira de 7 días + tarjeta de hoy, generadas desde `plan.json` por fecha |
| H3 | Fila «Mié 30» | «…acabar antes de las 20:30» | ESENCIAL | El calendario de Plan (y `plan.json` 30-9 `hora`) dice «acabar antes de las 21:00 y cama antes de las 23:00», que choca con la luz a las 22:15 de `reglas.dormir`. Hay que unificar (decisión del entrenador) | Tarjeta de día |
| H4 | Detalle desplegable de cada día (`DIADET`) | Sesión completa: calentamiento, dominadas, parte principal, semáforo, «Hecho» del día | ESENCIAL | Solo existe hasta el 4-10. Ver §8 | Tarjeta de hoy con pasos |
| H5 | Caja «El semáforo de cada mañana» | Qué mirar (sueño, VFC 7 días, codo/hombro, talón/cintillo) + tabla Verde/Ámbar/Rojo + «dos noches < 5 h = 48 h en rojo» + «los cortes son convenciones» | ESENCIAL | 177 palabras; celdas de hasta 35 palabras. Duplicado en Reglas («Las tres que se ganaron el sitio») y en cada `DIADET` | Componente interactivo de semáforo (ver reescritura R1) |
| H6 | Caja «Dominadas: más barra, pero poca y sin lastre» | Por qué no hay segundo día de fuerza, sábados 3 y 17-10, las reglas del BOE que faltaban, «te lo había dicho mal», rango 9–13 (centro 11–12), condiciones para el 14 | Reglas ESENCIAL · razonamiento SECUNDARIO/HISTÓRICO | 209 palabras. Mezcla acta de la revisión del 28-9 («revisado con cuatro enfoques y sus escépticos») con instrucciones. Las nueve reglas se repiten en Ejercicios y en `DOMI` | Técnica › Dominadas (reglas); Plan › Decisiones vigentes (una línea); por qué, plegado |
| H7 | Caja «Control del 19: 3:34 en el kilómetro» | Banda 3:30–3:38, 3 puntos, estimación de 3:52 fallida, parciales 40·42·46·46·41, pista sin homologar | HISTÓRICO | Tiene 10 días. «Antes del 10 de octubre hay que medirlo con rueda o llevar el control a una pista homologada» ha quedado superado por Arucas (`contextoDelUsuario.pista`, calendario 10-10 `lugar`). Es el 7.º sitio donde se cuenta el control del 19 | Progreso › ficha del control |
| H8 | Caja «Con las marcas de hoy no apruebas: 4,67» | 3 + 5 + 6; el 9,9 no es medición seria | ESENCIAL (el dato) | Duplicado en Nota (calculadora, preset «Hoy») y Progreso (tarjetas) | Tarjeta «Tu nota» única (reescritura R2) |
| H9 | Caja «El escenario realista: 5,67 y apto» | Tabla 3:34/12/9,0 → 3/6/8 · «Se sostiene» · «No estás estancado en dominadas» | ESENCIAL (cifras) · SECUNDARIO (argumento) | El argumento de estancamiento es del 19-9 | Nota: escenario marcado en la calculadora; argumento plegado |
| H10 | Caja «Cuánto aguanta ese escenario» | Tabla circuito 9,0/9,4/9,8/10,2 → media; peor caso 4,33; «el riesgo es que te las cuenten» | SECUNDARIO | Es `sensibilidad` de `plan.json`; en tabla no se ve dónde está el punto de rotura | Nota: gráfica de sensibilidad (tira apto/no apto) |
| H11 | Caja «Todo esto descansa sobre un número que no existe» | El circuito del 24 no se hizo; el jueves 1 decide: 9,0 relaja, 9,6 obliga a bajar el km | ESENCIAL (hasta el jueves 1) | Correcto. Caduca el 1-10 | Aviso fechado en la tarjeta de nota |
| H12 | Caja oculta «El control es en San Cristóbal, no en Telde» | Pista de 400 m, calibración con cuatro vueltas | OBSOLETO | Choca con la prohibición de la calibración de cuatro vueltas (calendario 10-10 `protocolo`) y con la pista de Arucas | Retirar del HTML |
| H13 | Caja oculta «Reparto del control» | 0:45 / 1:31 / 2:16 / 3:02 / 3:50 | OBSOLETO | Reparto de 3:50 anterior al control del 19 | Retirar |
| H14 | Caja oculta «No te vengas arriba mañana» | Predisposición 91 | HISTÓRICO | — | Retirar |
| H15 | 16 días ocultos (12-9 a 27-9) | Sesiones pasadas | HISTÓRICO | Duplican el calendario de Plan | Retirar; el historial vive en Plan/Progreso |
| H16 | «Pendiente» (6 puntos) | Confirmar 400 m en Arucas · reloj ya configurado (201/46) · circuito del jueves 1 · luz 22:15 · zapatilla a ICOT · fecha de las pruebas | ESENCIAL | «Luz apagada a las 22:15» es una regla, no un pendiente. Choca con Plan › Zonas («Pendiente: reconfigurar el reloj, que sigue con máxima 195»), que es lo obsoleto. `plan.json` no tiene lista de pendientes: no hay fuente única | Lista de pendientes con casilla, fuente única |

---

## 2. Pestaña Nota

| # | Bloque | Contenido | Etiqueta | Choque o nota | Destino |
|---|---|---|---|---|---|
| N1 | Calculadora (3 deslizadores) | 1.000 (2:45–4:25), dominadas (0–22), circuito (7,8–12,5 s); puntos por prueba; media; APTO/NO APTO/ELIMINADO | ESENCIAL | Funciona y cuadra con el baremo. La media sale con un decimal («4,7») mientras el resto de la web usa dos («4,67», «5,67») | Se queda como herramienta central de Nota, con dos decimales |
| N2 | Presets | Hoy (3:34/11/9,9) · Realista (3:34/12/9,0) · Objetivo 3:30 (3:29/12/9,0) · Con el km bajado (3:28/12/9,0) · Bueno (3:35/17/9,0) | ESENCIAL (los cuatro primeros) | «Bueno» (7,0) no existe en `plan.json.escenariosNota`; el escenario «Objetivo» del plan (3:30/15/9,3 = 6,67) no está. «Objetivo 3:30» y «Con el km bajado» dan lo mismo (6,00) | Presets = `escenariosNota` tal cual |
| N3 | Caja «Dónde está cada punto» | Circuito: tramos de 3–5 décimas; km: 6 s por punto; dominadas: 11→12 = +1, 12→13 = 0, siguiente en 14 | ESENCIAL | Duplica `sensibilidad.cuestaCadaPunto`. En texto; es una gráfica | «Coste de cada punto»: tres reglas con escalones |
| N4 | «Cómo funciona» | Orden circuito → barra → 1.000; media ≥ 5; un 0 elimina; segundo intento del circuito solo si nulo; no suman a la nota final | ESENCIAL | Correcto | Tres chips con iconos + una línea |
| N5 | Desplegable «Baremo completo, hombres» | Tabla de 11 tramos × 3 pruebas + fuente BOE verificada el 19-9 + nota de erratas corregidas | ESENCIAL (tabla) · HISTÓRICO (nota de erratas) | Correcto | Tabla plegada; la errata, al archivo |
| N6 | Desplegable «Cádiz: dos cosas a tu favor» | Nivel del mar frente a Ávila; «templado y húmedo, condiciones casi idénticas» | SECUNDARIO | El clima se presenta como hecho y no hay ningún dato verificado de temperatura en Cádiz (`planDeCarrera.examen.pendiente`). Marcar como supuesto | Plegado, con etiqueta «supuesto» |
| N7 | Desplegable «Plan de carrera para el examen» | Tabla 0:42/1:24/2:06/2:48/3:29–3:30; calle 1; primeros 200 son la trampa; regla del 600 en 2:05; desde el 800 todo; fila en meta; tartán, sin clavos | ESENCIAL | «Tu primer 200 va en 0:43» choca con la tabla de arriba y con `planDeCarrera.examen.reglaDeSalida` («el primer 200 va en 0:42»). «Tartán, sin clavos» no está en `plan.json` (verificar en BOE) | Gráfica «carrera fantasma» (reparto) + 5 consignas |

---

## 3. Pestaña Plan

| # | Bloque | Contenido | Etiqueta | Choque o nota | Destino |
|---|---|---|---|---|---|
| P1 | Entradilla | «Tres días de carrera, un día de fuerza, un día de circuito» | SECUNDARIO | La barra de los sábados 3 y 17 no aparece | Una línea bajo la semana tipo |
| P2 | Tabla semana tipo | Lunes series · martes Arsenal · miércoles calidad 2 · jueves circuito 21:30 · viernes y domingo descanso · sábado rodaje largo | ESENCIAL | Coincide con `estructuraSemanal`. Falta la hora del martes (18:00–19:30) y la barra del sábado 3 y 17 | Semana tipo visual (7 columnas con icono de tipo) |
| P3 | Caja «Cuando pase el examen del 26… muévelos a las 17:00 o 18:00… acostarte antes de las 00:30» | Consejo de horario | OBSOLETO | El examen pasó; desde el 28-9 las sesiones son a las 18:00 (`atleta.horario`) y la luz a las 22:15 (`reglas.dormir`: «sustituye a acostarse antes de las 00:30») | Retirar |
| P4 | Zonas · texto | FC máx 202 medida el 19-9, reposo 45; el 195 venía de sesión no válida; ruta de menús del reloj para % FCR | ESENCIAL (zonas) · HISTÓRICO (el 195) | FC máx vigente: ≥ 203 (28-9, `atleta.fcMaxima`); las zonas se mueven menos de 1 ppm (171–187 / 187–203). La ruta de menús no está verificada | Tabla de zonas plegable con el techo 145 destacado |
| P5 | Zonas · tabla | Z1 124–139 recuperación · Z2 139–155 rodajes, techo 145 · Z3 tierra de nadie · Z4 171–186 umbral 166–172 · Z5 186–202 controles | ESENCIAL | Cifras Z4/Z5 a actualizar a 187/203 | Barra de zonas con el 145 y el 140 (primeros 10 min) marcados |
| P6 | Caja «Las zonas suben, el techo no» + «Pendiente: reconfigurar el reloj, que sigue con máxima 195 y reposo 46» | Explicación del techo 145 y del umbral; pendiente del reloj | ESENCIAL (el techo) · OBSOLETO (el pendiente) | Choca con `atleta.relojConfigurado` («desde el 22-9… no hace falta reconfigurarlo») y con Hoy › Pendiente. (`plan.json.zonasFC.accionPendiente` también está atrasado: incoherencia interna de `plan.json`) | Una línea: «techo 145 y umbral 166–172 no suben»; por qué, plegado |
| P7 | Caja «Dos termómetros» | Ritmo a 145 (7:40–8:00; alarma > 8:30); deriva < 5 % (90 s/km, 0, 38 s/km); pulso a 6:00 no verificado | ESENCIAL | Falta la deriva por mitades desde el minuto 15, que es el método nuevo; los valores son del 12–16 sep (el 23 fue 44 s/km) | Gráfica de deriva en Progreso; aquí, las dos alarmas |
| P8 | Ritmos · texto | Recalibrados el 19-9 sobre 3:34 | HISTÓRICO | — | Plegado |
| P9 | Ritmos · tabla | RS ≤145 · TR 6:00–6:30 · A 3:38 (0:43,5/1:05/1:27/2:11) · B 3:34 (0:43/1:04/1:26/2:08) · C 3:32 (0:42,5/1:04/1:25/2:07) · Velocidad 3:20–3:25 (0:40/1:01/1:21) | ESENCIAL | Falta el escalón condicionado del C (→ 1:24 / 2:06 si el 10-10 da ≤ 3:33, `ritmos[C].condicion`) y la regla del primer 200 por reloj. Velocidad 200 «0:40» frente a 0:40–0:41 y el criterio del 12-10 (0:41–0:43) | Escalera de ritmos A → B → C con compuertas y fechas |
| P10 | Caja «Mide las distancias con el reloj» | Por distancia, sin Auto Lap; los 41 s del 24-8 eran 175 m | ESENCIAL (regla) | La justificación habla de «tu pista del parque» (San Cristóbal); desde el 28-9 la pista es Arucas | Regla de una línea en Reglas/Técnica › reloj |
| P11 | Caja «Revisión del 23 de septiembre: no se sube la intensidad» | 4 párrafos: seis análisis, qué cambia de forma, objetivo 3:30 y actualización del 28-9, qué decide lo que falta | ESENCIAL (decisiones) · HISTÓRICO (proceso) | 424 palabras. «el circuito de mañana 24» es OBSOLETO (no se hizo; decide el jueves 1) | «Decisiones vigentes» (reescritura R3) |
| P12 | Calendario · 14–20 sept | 7 días con «Hecho» | HISTÓRICO | Días sin `data-d`: no se pueden abrir | Archivo del calendario |
| P13 | Calendario · 21–27 sept | Nota de carga reducida + 7 días; 24 y 27 «NO HECHO» | HISTÓRICO | — | Archivo |
| P14 | Calendario · 28 sept–4 oct (abierto) | Nota de la revisión del 28-9 + días con objetivos largos (29-9: 90 palabras en monoespaciada) | ESENCIAL | Duplica Hoy. 30-9 «acabar antes de las 21:00 y cama antes de las 23:00» (ver H3) | Timeline; el detalle abre la tarjeta del día |
| P15 | Calendario · 5–11 oct | Lun 5 × 400 a 1:26 · Mar 15/12,5 kg según el 29 · Mié 3 × 600 a 2:08 · Jue 8 circuito del simulacro (un intento) · Sáb 10 simulacro | ESENCIAL | Correcto. Sin detalle desplegable (no hay `DIADET`) | Timeline + tarjeta de día generada |
| P16 | Calendario · 12–18 oct | 8 × 200 (0:41–0:43), martes 4 × 3, 2 × 600 + 2 × 200, jueves 15, sábado 17 barra + rodaje 45 | ESENCIAL | Correcto | Idem |
| P17 | Calendario · 19–25 oct | 4 × 400, descarga 3 × 2, 600 + 400, jueves 22 un intento, sábado 24 en dos versiones | ESENCIAL | Correcto | Idem |
| P18 | Calendario · 26 oct–1 nov | Dos versiones según la fecha (26–27 / 28–30), sesión «−2 días», prueba | ESENCIAL | Correcto; depende del llamamiento | Selector de versión («la prueba es el…») |

---

## 4. Pestaña Ejercicios

| # | Bloque | Contenido | Etiqueta | Choque o nota | Destino |
|---|---|---|---|---|---|
| E1 | Martes · título y tabla A–I | «~70 min»; A 5 × 3 **10 kg**; B 4 × 6 **40–45 kg**; C 4 × 8 20 kg; D 4 × 6 barra vacía; E 3 × 8 20–25; F 3 × 6–8; G 3 × 12 **5–7 kg**; H abducción + monster walk + plancha; I piernas colgado + plancha | ESENCIAL (la sesión) · OBSOLETO (las cifras) | Choca con `sesionesTipo.martesFuerza` y con `DET.fuerza`, que sí están al día: 1h23 con superseries; A 12,5 kg si la noche es verde (10 ámbar, 4 × 3 rojo); B 4 × 8 con 38 kg; G 5 kg; H = plancha lateral con elevación → elevación de pierna tumbado → pasos laterales con banda en tobillos, en circuito. Faltan las superseries B+D, C+F, E+G | Sesión del martes como tarjetas con temporizador (reescritura R4) |
| E2 | Martes · nota | «Si falta tiempo: A, B, D, H y a casa» | OBSOLETO | `martesFuerza.prioridad`: «A, H, B, D y a casa» (H justo después de A) | Corregido en la tarjeta |
| E3 | Lunes y miércoles · tabla | Lunes series por tiempo; miércoles calidad 2 por ritmo del bloque | ESENCIAL | — | Semana tipo |
| E4 | Caja «Por qué el miércoles va por pulso y el lunes por tiempo» | Bloques continuos de 8 min, se autocorrige | OBSOLETO | El miércoles ya no es umbral (`estructuraSemanal`: «no hay ninguna sesión de umbral programada») y la tabla de encima dice «ritmo del bloque» | Retirar |
| E5 | Caja «Las dominadas van dentro del calentamiento» | 3 × 5, 3 min, +12 min, antes de correr por el orden del examen, 3–4 en reserva | ESENCIAL | Duplicado en `DOMI` y en `protocoloDominadas` | Paso del calentamiento en la tarjeta de hoy |
| E6 | Nota «En la pestaña Hoy… figuras de cada ejercicio» | Instrucción de uso | OBSOLETO | Las figuras se eliminan | Retirar |
| E7 | Jueves · tabla | Calentamiento 20 min; circuito **3–4 intentos, cuenta el mejor**; vuelta a la calma; core opcional | ESENCIAL (sesión) · OBSOLETO (protocolo) | `juevesCircuito`: 3 intentos como el BOE, **el primero es el comparable**, el mejor es el techo; bloque técnico solo si ≥ 9,8 y siempre después; «solo el circuito y fresco» (sin core) | Tarjeta del jueves con 3 casillas de tiempo |
| E8 | Caja «Sí, el jueves es corto» | Nada de piernas por la mañana | ESENCIAL (regla) | 70 palabras para una regla de una línea | Una línea |
| E9 | Sábado · tabla | Talón 3 × 15 · **saltos de tobillo (pogo) 3 × 15** · saltos verticales 3 × 5 · plancha lateral 3 × 30 s | ESENCIAL | `sabadoComplemento` dice «saltos al cajón 3 × 5» y `DIADET` 3-10 también («saltos al cajón 3 × 5 solo si hay calidad»). Web y `plan.json` no coinciden: decisión del entrenador | Tarjeta del sábado |
| E10 | Caja «Cero material» | Bordillo o escalón; sábados 3 y 17 barra | SECUNDARIO | — | Nota bajo la tarjeta |
| E11 | Dominadas · caja «La técnica del BOE, entera» | Agarre ligeramente > hombros («aquí ponía igual… estaba mal»), 9 reglas, nula si incumple, solo cuentan las del vídeo | ESENCIAL (reglas) · HISTÓRICO (la errata) | Es el 5.º sitio con las reglas BOE | Diagrama de la barra con las 9 reglas + checklist de vídeo |
| E12 | Dominadas · tabla semanal | Lunes y miércoles 3 × 5 · martes 5 × 3 lastradas · sábados 3 y 17 · resto nada | ESENCIAL | Correcto | Semana tipo (filtro «barra») |
| E13 | Desplegable «Progresión del lastre y reglas» · tabla | 15-9 → 20-10 | ESENCIAL (29-9 en adelante) · HISTÓRICO (15 y 22-9) | Correcto con `protocoloDominadas.progresion` | Escalera de lastre con compuertas (2 en reserva) |
| E14 | Idem · 7 reglas | 3 min; reserva 3–4; subir con 2 en reserva; nunca al fallo; test máximo solo 10-10 y prueba; mala noche; dolor 0–10 | ESENCIAL | Resumen fiel de `protocoloDominadas.reglas` (faltan: solo cuentan las válidas; sesión extra solo sábados 3 y 17) | Tarjetas de regla |
| E15 | Idem · «De dónde sale el 10 kg» | Escalera del 10-9 | HISTÓRICO | El lastre vigente es 12,5 kg | Archivo |
| E16 | Técnica · Calentamiento estándar | Tabla de 6 pasos (trote por pulso, movilidad, dominadas, técnica, 5 progresivos, pausa) + «versión corta para umbral» + vuelta a la calma | ESENCIAL (pasos) · OBSOLETO (versión corta) | No hay umbral en el calendario. La nota «antes decía 5:45–6:15» es HISTÓRICO | Pasos del calentamiento en la tarjeta de hoy |
| E17 | Técnica · Dominadas lastradas | 6 consignas (agarre, hombro activo, omóplatos, codos a costillas, bajada 2 s, sin balanceo) | ESENCIAL | Mezcla con E11; la barra al tercio inferior del cuello no está aquí | Diagrama técnico único |
| E18 | Técnica · Jalón al pecho | 5 consignas | SECUNDARIO | — | «Cómo» plegado en la tarjeta B |
| E19 | Técnica · Remo con barra | 5 consignas | SECUNDARIO | — | Idem C |
| E20 | Técnica · Sentadilla y peso muerto rumano | 2 párrafos | SECUNDARIO | Falta el aviso de Garmin «Sentadilla con barra, no frontal» (sí está en `DET.fuerza`) | Idem D y E |
| E21 | Técnica · Glúteo medio, fondos, pájaros y core | Abducción tumbado, monster walk (goma sobre rodillas), fondos, pájaros, piernas colgado, plancha | SECUNDARIO · OBSOLETO (glúteo medio) | Los ejercicios de H no son estos (ver E1) | Idem H, F, G, I |
| E22 | Técnica · Elevación de talón y saltos | Talón con pausa; pogo; saltos verticales | ESENCIAL (talón) | Ver E9 | Tarjeta del sábado |
| E23 | Técnica · Correr | Progresivos (16–18 s/80 m), series cortas, series largas, **umbral**, kilómetro partido, regla de las dos repeticiones | ESENCIAL · OBSOLETO (umbral) | Series cortas «recuperación al trote, nunca parado» choca con `DET.series` (28-9: «andar es correcto»). Falta el aviso de ritmo 3:20–3:50 en progresivos (regla del 23-9) | Consignas en cada tarjeta de carrera |
| E24 | Fotos de posición (FOTOS, 11 ejercicios, 22 JPG externos) | Alternancia inicio/final tipo gif + botón ⇄ | Se ELIMINA (pedido de Daniel) | No enseñan los criterios que anulan una dominada (pausa, tercio inferior del cuello, agarre); dependen de raw.githubusercontent.com | Diagramas SVG propios con cotas |
| E25 | Monigotes (FIG, 17 figuras animadas) | En técnica y en `DIADET` | Se ELIMINA | Idem | Idem |
| E26 | Enlaces «Ver en vídeo» (8 búsquedas de YouTube) | Búsqueda afinada | SECUNDARIO | Correcto por diseño | Un enlace por ejercicio, discreto |
| E27 | Caja «Sobre las ilustraciones» | 132 palabras explicando fotos, monigotes y vídeo | OBSOLETO | Desaparece con ellos | Retirar |
| E28 | Garmin · crear sesiones en el móvil | Ruta de menús en Connect y en el reloj | ESENCIAL | Rutas no verificadas en esta revisión | Guía plegable con pasos numerados |
| E29 | Garmin · «Tus cuatro sesiones» | Rodaje 40 min máx 145 · **Umbral 4 × 8 min 166–172** · **Series cortas 10 × 200 a 4:25–4:35 /km** · **Series largas 5 × 400 a 3:35–3:45** | OBSOLETO (peligroso si se programa) | 4:25–4:35 /km en 200 m son 53–55 s, 10 s más lento que 0:43; el aviso vigente es 3:30–3:40 (`ritmos.avisoReloj`); no hay umbral; el rodaje no lleva los 10 primeros minutos a 140; faltan 6 × 400 y kilómetro partido | Tabla regenerada desde `ritmos` y el calendario |
| E30 | Garmin · caja «Dos cosas que importan» | Intervalos por distancia; pulso en rodaje/umbral, ritmo en series | ESENCIAL (menos «umbral») | Duplica P10 | Una regla |
| E31 | Desplegable «Alternativa rápida desde el reloj» | Ruta de intervalos | SECUNDARIO | Sin verificar | Plegado |
| E32 | Desplegable «Las alertas» | Rodaje máx 145; umbral 166–172; no poner alerta de ritmo en rodajes; «si no vibra» | SECUNDARIO · OBSOLETO (umbral) | — | Plegado |
| E33 | Material · caja «Sin segunda zapatilla» | 5 pasos: no doblar plantilla, ICOT/fisio, talón innegociable, alarma de talón matutino, Decathlon 50–60 € | ESENCIAL (alarma de talón, talón innegociable) · SECUNDARIO (resto) | 250 palabras; la visita a ICOT se repite en Hoy y en Reglas | Reglas › Pies (una tarjeta) |
| E34 | Material · tabla | Zapatilla aplazada · banda HRM 200 («estrenarla el miércoles 16») · cinturón de lastre · cronómetro del instructor · **pista San Cristóbal** · exportar original | SECUNDARIO · HISTÓRICO (estreno de la banda) · OBSOLETO (pista) | La pista vigente es Arucas, homologación sin confirmar (`contextoDelUsuario.pista`) | Lista de material con estado |

---

## 5. Pestaña Progreso

| # | Bloque | Contenido | Etiqueta | Choque o nota | Destino |
|---|---|---|---|---|---|
| G1 | Tarjetas | 1.000 3:34 (3 pts, objetivo < 3:30) · Dominadas 11 autoinformado (5) · Circuito 9,9 s al 60 %, «se mide el jueves 24» | ESENCIAL | «se mide el jueves 24» es OBSOLETO: no se hizo; se mide el jueves 1. Duplican Nota y Hoy | Tarjeta «Tu nota» única (enlazada) |
| G2 | Caja «El diagnóstico, en una frase» | Velocidad sobra, falta sostenerla; termómetro a 140 ppm min 5 vs 30; lo que cambió el 19-9; aeróbica baja 182 frente a 736 | ESENCIAL (diagnóstico) · OBSOLETO (cifras de carga) | «una frase» son 184 palabras. Carga del 28-9: baja 214, alta 597 (`CARGA['28 sept']`). El termómetro nuevo del 23-9 es la deriva por mitades desde el minuto 15, no citado | Frase de 1 línea + gráfica de foco de carga actual |
| G3 | Gráfica «Evolución del 1.000 m» (MIL) | 4 estimaciones + 1 medición, bandas del baremo, línea del 3:49 | ESENCIAL | Banda «5 pts» pinta 3:14–3:24, que mezcla 6 y 5 puntos (baremo: 6 = 3:13–3:18); falta la línea del objetivo 3:30 y del suelo 3:36; `aria-label` dice «la estimación vigente es 3 minutos 52». Texto de ejes ≈ 5 px en móvil | Rehacer con bandas exactas, 3:30/3:36/3:49 y marcadores del 10-10 y Cádiz |
| G4 | Gráfica «Tu sueño, noche a noche» (SUENO, 17 noches) | Barras de horas, línea «necesitas 8h50», tooltip con puntuación y FC | ESENCIAL | Colores con corte en 5,5 h; el semáforo usa 5h00 y 6h30. Pie «septiembre: tres noches por encima de 6h30» y `aria-label` «hasta el 11 de septiembre», caducados. Etiquetas de fecha solapadas en móvil | Barras coloreadas con el semáforo; líneas 6h30 y 5h00 |
| G5 | Gráfica «Pulso trotando suave» (7 puntos) | FC a ritmos de 6:01 a 7:55; banda «zona normal 130–140»; «Once pulsaciones menos…» | OBSOLETO | `zonasFC.termometros`: el pulso a 6:00 está «NO VERIFICADO» y «la banda 130-140 no tiene respaldo»; Plan › Dos termómetros dice lo mismo. Además compara ritmos distintos en un eje | Sustituir por «deriva por mitades» y «ritmo a 145» (los dos termómetros vigentes) |
| G6 | Gráfica «Dominadas» (DOM, 10 sesiones) | Volumen por sesión y «mejor serie» | ESENCIAL (el dato) · OBSOLETO (la lectura) | «Mejor serie 14» el 10-9 eran 14 repeticiones totales con lastre en escalera; el máximo registrado es 10 (`marcasActuales.dominadas.maximoRegistrado`). Mezcla series lastradas (3) con peso corporal. `aria-label` hasta el 10-9 | Tres series separadas: máximos (10, 11, 10-10), lastre por semana (10 → 12,5 → …), volumen |
| G7 | Gráfica «Foco de carga» (CARGA, 9 fechas) | Tres barras con «óptimo aprox.» y selector de fecha | SECUNDARIO | Pie «cómo empeoró el desequilibrio» y notas fijas («muy por encima», «necesita varios cientos») caducadas: desde el 23-9 el reloj dice «Equilibrado». Los óptimos «aprox.» no tienen fuente | Evolución de las tres cargas en el tiempo, con el estado del reloj por fecha; óptimos marcados como supuesto o retirados |
| G8 | Desplegable «Control a control» · tabla | 31-8 (600 en 2:12), 19-9 (3:34), 10-10, 24-10 | ESENCIAL | 10-10: «1.000 ≤ 3:36 · circuito ≤ 9,5 s» OBSOLETO (calendario: ≤ 3:33 con reparto plano; circuito el jueves 8, un intento; ≥ 12 válidas). 24-10: «600 en 2:07» depende ya de la fecha (2:06/2:07 o sin 600) | Línea de controles (hitos) con objetivo y resultado |
| G9 | Idem · caja «Lo que hace comparables dos controles» | Misma hora, pista medida, vídeo | ESENCIAL | Correcto | Nota bajo la línea de controles |
| G10 | Desplegable «Diagnóstico del control del 19» | Tabla de 5 tramos (tiempo, W, contacto, cadencia, FC) + 3 cajas (la salida, por qué te sentiste débil, recuperación) | HISTÓRICO (valioso) | Es el análisis que justifica el objetivo 3:30 (tramos 400–800) | Ficha del control con gráfica de tramos |
| G11 | Desplegable «Cómo ha cambiado la estimación» | 5 filas | HISTÓRICO | Duplica G3 | Tooltip de G3 |
| G12 | Desplegable «Historial de carrera» (14 filas) | Resultado + valoración | HISTÓRICO | Orden roto (21-8 → 11-9 y luego 28, 23, 19, 16, 14, 12-9); «14 sesiones» frente a 15 en `historial.json` (falta el 27-9 no hecho); la fila del 11-9 es una lectura del Garmin, no una carrera | Registro filtrable y ordenado |
| G13 | Desplegable «Historial de dominadas y circuito» (11 filas) | Idem | HISTÓRICO | Desordenado (22-9 antes que 19-9; 10-9 al final); falta el 28-9 (sin dominadas, parque vallado); la fila del 10-9 conserva «13–15 a peso corporal», retirado en `marcasActuales.dominadas.aviso` | Idem |
| G14 | Desplegable «Cuerpo» | Caja «no se toca», tabla Tanita 3 fechas, tabla de 9 valores, simetría, aviso de dos básculas | SECUNDARIO | Correcto; respeta «no sugerir perder peso» | Minigráfica de músculo/grasa (Tanita) + valores plegados |

---

## 6. Pestaña Dieta (la pauta no se toca; se inventaría la herramienta)

| # | Bloque | Contenido | Etiqueta | Choque o nota | Destino |
|---|---|---|---|---|---|
| D1 | Entradilla | «Tu pauta con la nutricionista…» | SECUNDARIO | — | — |
| D2 | Panel de macros fijo (sticky) | kcal, HC, P, G; barra de reparto; g de proteína por kg; «tu nutricionista trabaja con 130–145 g» | ESENCIAL | Proteína por kg calculada con **67,4 kg** (la otra báscula); la serie válida es 66,5 kg (Tanita 23-9). Verde con 130–150 y el texto dice 130–145 | Conservar; corregir el peso y el rango |
| D3 | Chips de día (Lun–Dom) | Elige el día de la pauta | ESENCIAL | Arranca siempre en lunes, aunque hoy sea martes | Arrancar en el día de hoy |
| D4 | Modos | «Día de calidad · gofio a 40 g» · «Añadir post-entreno» | ESENCIAL | Se activan a mano; el calendario ya sabe qué días son de calidad | Activar solo según el tipo de sesión del día (con opción de quitarlo) |
| D5 | Restablecer cantidades | Botón | ESENCIAL | — | — |
| D6 | Registro de días (localStorage `pc-reg`) | Marcar día como hecho, contador, generar PDF (3/7/14/todos), vaciar | ESENCIAL | El PDF carga jsPDF desde cdnjs (dependencia externa) | Conservar |
| D7 | Intercambio de comida y cena entre días | 2 selectores + aviso de compatibilidad | ESENCIAL | Con la pauta del lunes tal cual, avisa «Ese día repite arroz. Tu nutricionista alterna las fuentes: prueba otra cena»: la herramienta le sugiere cambiar la pauta de la propia nutricionista | Quitar el aviso cuando es la combinación original |
| D8 | Comidas (5–6 desplegables abiertos) | Ingredientes con gramos editables, kcal, quitar (×), deshacer | ESENCIAL | 5 desplegables abiertos a la vez: mucha altura | Comida actual abierta; el resto plegado |
| D9 | Selectores de proteína e hidrato | Recomendadas / repiten; aviso si repite fuente | ESENCIAL | — | Conservar |
| D10 | «Podrías añadir» (sugerencias) | Hasta 3 por plato según proteína, verdura, aliño, fruta | SECUNDARIO | Criterios propios de la web, no de la nutricionista | Plegado o más discreto |
| D11 | «+ añadir algo que hayas comido» | Búsqueda local + Open Food Facts + alta manual + selector de ración | ESENCIAL | — | Conservar |
| D12 | «Cómo se cocina» | Recetas con línea de tiempo, zonas de inducción y temporizadores; truco | SECUNDARIO | — | Conservar plegado |
| D13 | Caja «Cómo leer esto» | Valores aproximados, pesos en crudo, la pauta no se modifica | ESENCIAL (el aviso) | — | Una línea al pie |
| D14 | Caja «Lo único que te pido sobre la dieta» | Gofio a 40 g los días de **series o umbral**; café no antes de **los entrenamientos de las 21:00** | ESENCIAL (gofio) · OBSOLETO (umbral, 21:00) | Las sesiones son a las 18:00; `reglas.dormir`: sin cafeína después de las 14:00 los días de entreno por la tarde. Duplicado en Reglas › Comer y › Café | Se integra en D4; el café va a Reglas |

---

## 7. Pestaña Reglas

| # | Bloque | Contenido | Etiqueta | Choque o nota | Destino |
|---|---|---|---|---|---|
| R1 | Dormir | Luz 22:15, cena 2 h antes, fin de semana ±1 h, cafeína hasta las 14:00, siesta tras ámbar/rojo antes de las 16:30, jueves del circuito a la cama | ESENCIAL | Correcto (`reglas.dormir`) | Tarjeta de regla (norma en una línea + detalle) |
| R2 | Dormir · historia | Agosto 4h14 frente a 8h50; «no hace falta llegar a nueve horas» | HISTÓRICO | — | Plegado |
| R3 | Comer | 3–4 h antes 80–100 g HC; 60–90 min antes algo ligero | ESENCIAL | Para el 1.000 de control y prueba, `planDeCarrera.comida` dice tentempié a 45–60 min | Tarjeta; excepción del control señalada |
| R4 | Caja «Tu merienda está bien…» | Gofio 40 g días de **series o umbral**; relato del 21 y 31-8 | ESENCIAL · OBSOLETO (umbral) | Duplica D14 | Una línea |
| R5 | Caja «El café» | Antes de un esfuerzo máximo ayuda; **no antes de los entrenamientos de las 21:00** | OBSOLETO (21:00) | Choca con R1 (14:00) | Una línea en R1 |
| R6 | Creatina | 5 g/día, constancia, en el queso batido; retiene agua, **«ya están dentro de los 67,4»** | ESENCIAL · OBSOLETO (67,4) | Peso de la serie válida: 66,5 | Tarjeta |
| R7 | Tabla del resto de suplementos | Magnesio, D3 («entrenas de noche»), omega 3, B12, Q10 | SECUNDARIO | «entrenas de noche» ya no es cierto (18:00) | Plegado |
| R8 | Caja «Dopaje» | Certificación externa en HSN; nada es tu limitante | SECUNDARIO | — | Plegado |
| R9 | Cintillo | No se cambia ninguna sesión; **«las sesiones de los miércoles son en el umbral, 166–172 ppm»**; glúteo medio los martes, «cinco minutos»; regla de parada; plantilla a ICOT | ESENCIAL (regla de parada) · OBSOLETO (miércoles umbral, 5 min) | Miércoles = calidad 2 a ritmo; H son 3 rondas de 8–9 min (mínimo 2) | Tarjeta con la regla de parada destacada |
| R10 | Regla del cuello | Por encima/por debajo; antigripales | ESENCIAL | Correcto | Tarjeta |
| R11 | Descanso significa descanso | Teror | ESENCIAL | — | Tarjeta |
| R12 | Día torcido / semáforo | Versión del 28-9 | ESENCIAL | Duplica H5 | Enlace al semáforo |
| R13 | No testees de más | «19 de septiembre, 10 y 24 de octubre, y el examen» | OBSOLETO (24-10) | El 24-10 ya no lleva máximo (`protocoloDominadas.reglas`, calendario 24-10: «acabar con sensación de sobra»). `plan.json.reglas[no-testear]` también está atrasado | Tarjeta con «10-10 y la prueba» |
| R14 | (Ausentes en Reglas) | Regla de las dos repeticiones (solo en Ejercicios y `DET`), medir distancias (en Plan), pies planos y alarma de talón (en Material) | — | Reglas no es la lista completa de reglas | Reunir aquí todas las reglas duras |

---

## 8. Contenido generado por el segundo script

| # | Elemento | Contenido | Etiqueta | Choque o nota | Destino |
|---|---|---|---|---|---|
| S1 | Fechas dinámicas | Cuenta atrás, clase `hoy`/`pasado` en `.day[data-d]`, pie | ESENCIAL | Pie engañoso (C5) | Conservar la lógica; ampliar a toda la semana |
| S2 | `CAL_LARGO` | Calentamiento de 30 min en 6 pasos + 4 figuras | ESENCIAL (pasos) | Figuras se eliminan | Pasos de la tarjeta de hoy |
| S3 | `CAL_CORTO` | «Trote suave 10 min **a 6:00 /km**» | OBSOLETO | Error corregido el 19-9: el trote va por pulso, techo 145 | Retirar |
| S4 | `DOMI` | 3 × 5 con el estándar BOE completo | ESENCIAL | Al día; 4.ª copia de las reglas | Paso del calentamiento, enlazado al diagrama BOE |
| S5 | `CALMA` | 10 min + 3 estiramientos 30 s | ESENCIAL | — | Paso final |
| S6 | `SABCOMP` | Talón, pogo, verticales, plancha | ESENCIAL | Ver E9 (cajón o pogo) | Tarjeta del sábado |
| S7 | `DET.rodaje` | Sin calentamiento; media 135–140, techo 145; «los primeros 5 minutos, más flojo» | ESENCIAL · OBSOLETO (5 min) | Regla vigente: los 10 primeros minutos con techo 140 (`ritmos[RS].reglaDeSalida`) | Tarjeta de rodaje |
| S8 | `DET.series` | Salida de pie, recuperación andando o al trote, mitades iguales, dos repeticiones | ESENCIAL | Contradice a E23 («nunca parado») | Tarjeta de series |
| S9 | `DET.umbral` | 166–172, prueba del habla, «ritmo a 170: 4:25–4:45» | OBSOLETO | Sin uso hasta Cádiz | Retirar |
| S10 | `DET.fuerza` | Sesión completa y al día: 1h23, superseries, orden A → H → B+D → C+F → E+G → I | ESENCIAL | Es la versión buena; E1 la contradice | Base de la tarjeta del martes |
| S11 | `DET.circuito` | «3–4 intentos… cuenta el mejor»; core opcional | OBSOLETO (protocolo) | Ver E7. En 24-9 y 1-10 se le pega detrás el protocolo correcto: el mismo desplegable dice las dos cosas | Tarjeta del jueves |
| S12 | `DET.control` | Control en San Cristóbal: calibración con cuatro vueltas, «técnica de examen: anchura de hombros», pantalla con 0:45/1:31/2:16, reparto 0:42/1:24/2:06 con el texto «el 600 va 4 s más lento que el 31-8», plátano 60–90 min antes | OBSOLETO (varios puntos) | Calendario 10-10 `protocolo`: sin calibración de cuatro vueltas, pista medida u homologada; agarre ligeramente superior; tentempié a 45–60 min (`planDeCarrera.comida`). Si se reutiliza para el 10-10 lleva a error | Plantilla nueva de simulacro desde el calendario 10-10 |
| S13 | `DET.descanso`, `DET.hombro` | Descanso; mantenimiento de hombro | SECUNDARIO · OBSOLETO (hombro, sin uso) | — | Descanso como estado de la tarjeta |
| S14 | `DIADET` 11-9 a 27-9 (17 fichas) | Sesiones pasadas con «Hecho» | HISTÓRICO | La del 22-9 lleva a la vez «el 29 subes a 12,5 kg» y «No se sube peso» | Archivo |
| S15 | `DIADET` 28-9 a 4-10 (7 fichas) | Sesión completa con semáforo y registro | ESENCIAL | Al día. No hay nada después del 4-10 | Tarjeta de hoy, generada |
| S16 | `FIG` (17), `FOTOS` (11), `FICHAS` (8) | Figuras, fotos y vídeos | Se ELIMINAN (salvo el enlace de vídeo) | — | Diagramas SVG técnicos |

---

## 9. Mapa de duplicados (el origen principal del ruido)

| Tema | Dónde aparece | Veces | Dónde debe quedar |
|---|---|---|---|
| Control del 19-9 | Hoy (caja), Progreso (tarjeta, diagnóstico, control a control, diagnóstico del control, estimación, historial, gráfica MIL), `DIADET` 19-9 | 7–9 | Progreso › ficha del control |
| Reglas del BOE de la dominada | Hoy (Dominadas, Cuánto aguanta), Ejercicios (caja BOE, técnica), `DOMI`, `DET.fuerza`, `DIADET` 29-9 | 5–7 | Técnica › diagrama BOE (y enlaces) |
| Semáforo | Hoy (caja), Reglas (las tres), `DIADET` 29-9 y 30-9, calendario 28-9 a 4-10 | 4+ | Componente semáforo en Hoy |
| Escenarios de nota | Hoy (4 cajas), Nota (calculadora, «dónde está cada punto»), Progreso (tarjetas) | 3 pestañas | Nota |
| Gofio 40 g / café | Dieta (caja), Reglas (merienda, café), modo «día de calidad» | 3 | Dieta (modo automático) + Reglas › Dormir |
| Zapatilla, plantilla, ICOT | Hoy (pendiente), Ejercicios (material), Reglas (cintillo) | 3 | Pendientes + Reglas › Pies |
| Medir distancias con el reloj | Plan (caja), Ejercicios (Garmin) | 2 | Reglas |
| Sesión del martes | Ejercicios (tabla, obsoleta), `DET.fuerza` (buena), calendario | 3 | Tarjeta del martes |
| Protocolo del jueves | Ejercicios (tabla, obsoleta), `DET.circuito` (obsoleto), `DIADET` 1-10 (bueno), calendario | 4 | Tarjeta del jueves |
| Calentamiento | Ejercicios (tabla), `CAL_LARGO`, `CAL_CORTO`, `plan.json` | 3 | Pasos de la tarjeta |

---

## 10. Lista consolidada de OBSOLETOS (qué dice, con qué choca)

1. **Pie «actualizado el …»** muestra siempre la fecha de hoy (C5).
2. **Plan · caja 17:00/18:00 y «acostarte antes de las 00:30»** → `atleta.horario` (18:00 desde el 28-9) y `reglas.dormir` (22:15).
3. **Plan · «Pendiente: reconfigurar el reloj, que sigue con máxima 195»** → `atleta.relojConfigurado` (201/46/181 desde el 22-9; no hace falta) y Hoy › Pendiente.
4. **Plan · FC máx 202 y zonas 186/202** → 203 desde el 28-9 (171–187 / 187–203; cambio < 1 ppm).
5. **Plan · Revisión 23-9 «el circuito de mañana 24»** → el 24 no se hizo; decide el jueves 1.
6. **Plan · ritmos: bloque C sin escalón condicionado; velocidad «0:40»** → `ritmos[C].condicion`; `ritmos[VEL]` 0:40–0:41 y criterio 0:41–0:43 el 12-10.
7. **Plan/Ejercicios · «tu pista del parque» y material «San Cristóbal»** → pista de Arucas desde el 28-9.
8. **Nota · «Tu primer 200 va en 0:43»** → 0:42 (`planDeCarrera`) y la propia tabla.
9. **Nota · preset «Bueno» (3:35/17/9,0)** → no está en `escenariosNota`; falta «Objetivo» (3:30/15/9,3 = 6,67).
10. **Ejercicios · martes «~70 min», 10 kg, jalón 4 × 6 40–45 kg, G 5–7 kg, glúteo medio antiguo, «A, B, D, H»** → `martesFuerza` y `DET.fuerza`.
11. **Ejercicios · «el miércoles va por pulso» (bloques de 8 min)** → el miércoles es calidad 2 a ritmo.
12. **Ejercicios y `DET.circuito` · «3–4 intentos, cuenta el mejor», core opcional** → 3 intentos como el BOE, el primero comparable; solo circuito.
13. **Ejercicios · calentamiento «versión corta para umbral»; `CAL_CORTO` a 6:00 /km** → sin umbral; trote por pulso con techo 145.
14. **Ejercicios · técnica de glúteo medio (abducción, monster walk con goma sobre rodillas)** → H del plan.
15. **Ejercicios · umbral en técnica, Garmin y alertas** → no hay umbral hasta Cádiz.
16. **Ejercicios · Garmin «series cortas 4:25–4:35 /km», «series largas 3:35–3:45»** → aviso de ritmo 3:30–3:40.
17. **Ejercicios · «En la pestaña Hoy… figuras» y caja «Sobre las ilustraciones»** → fotos y monigotes se eliminan.
18. **Ejercicios · material «estrenarla el miércoles 16»** → histórico.
19. **Progreso · tarjeta del circuito «se mide el jueves 24»** → jueves 1.
20. **Progreso · diagnóstico «aeróbica baja 182 frente a 736»** → 214 / 597 el 28-9.
21. **Progreso · MIL: banda «5 pts» mal delimitada, sin 3:30 ni 3:36, `aria-label` «3:52 vigente»**.
22. **Progreso · sueño con corte en 5,5 h; pies y `aria-label` caducados** → semáforo 6h30 / 5h00.
23. **Progreso · «Pulso trotando suave» con «zona normal 130–140»** → `zonasFC.termometros`: no verificado, sin respaldo.
24. **Progreso · dominadas «mejor serie 14» el 10-9** → máximo registrado 10; eran 14 repeticiones lastradas en escalera.
25. **Progreso · foco de carga «cómo empeoró el desequilibrio»** → «Equilibrado» desde el 23-9.
26. **Progreso · control 10-10 «≤ 3:36, circuito ≤ 9,5 s»; 24-10 «600 en 2:07»** → calendario 10-10 y 24-10.
27. **Progreso · historial: orden, recuento (14/15), fila Garmin como carrera, «13–15 a peso corporal»** → `historial.json` y `marcasActuales.dominadas.aviso`.
28. **Dieta · proteína por kg con 67,4** → 66,5 (Tanita).
29. **Dieta · aviso «repite arroz» sobre la pauta original del lunes** → la pauta no se modifica.
30. **Dieta y Reglas · «series o umbral», «entrenamientos de las 21:00»** → sesiones a las 18:00; cafeína hasta las 14:00.
31. **Reglas · creatina «dentro de los 67,4»** → 66,5.
32. **Reglas · cintillo «miércoles en el umbral», «cinco minutos»** → calidad 2; H 8–9 min.
33. **Reglas · «No testees: 19-9, 10 y 24-10»** → 24-10 sin máximo.
34. **Reglas · D3 «entrenas de noche»** → 18:00.
35. **`DET.rodaje` «los primeros 5 minutos»** → 10 minutos con techo 140.
36. **`DET.umbral`, `DET.hombro`** → sin uso.
37. **`DET.control` entero** (San Cristóbal, calibración de cuatro vueltas, anchura de hombros, 0:45/1:31/2:16, «4 s más lento que el 31-8», plátano 60–90 min) → calendario 10-10 y `planDeCarrera`.
38. **Hoy · cajas ocultas (Telde, reparto 3:50) y 16 días ocultos** → retirar del HTML.
39. **Hoy · «Control del 19»: medir con rueda o pista homologada antes del 10** → Arucas si sus marcas confirman 400 m.
40. **Cabecera · «días hasta el 26 oct»** presentado como fecha cierta → fecha de referencia sin confirmar.

## 11. Incoherencias dentro de `datos/plan.json` (para el entrenador; no las he tocado)

- `zonasFC.accionPendiente` («reconfigurar el reloj, que sigue con máxima 195») frente a `atleta.relojConfigurado` («no hace falta reconfigurarlo»). También `zonasFC.metodo` y `zonas` siguen en 202.
- Calendario 30-9 `hora`: «acabar antes de las 21:00 y cama antes de las 23:00» frente a `reglas.dormir` (luz 22:15) y `juevesCircuito.regla` («el miércoles acaba antes de las 20:30»).
- Calendario 10-10 `protocolo`: «reparto del examen 0:43 / 1:26 / 2:09 / 2:52» y «primer 200 entre 0:42 y 0:45», frente al `objetivo` del mismo día (0:42 / 1:24 / 2:06 / 2:48).
- `sabadoComplemento`: «saltos al cajón 3 × 5» y «sin dominadas los sábados» (la web dice pogo + verticales, y la barra de los sábados 3 y 17 está en `protocoloDominadas`).
- `reglas[no-testear]`: sigue con el 24 de octubre.
- `ejercicios[simulacro]`: «la mejor opción es hacerlo un jueves en el gimnasio…» frente a la regla vigente (circuito el jueves anterior; dominadas y 1.000 el sábado).

## 12. Recuento

- ESENCIAL: ≈ 70 elementos (con los que hay que corregir).
- SECUNDARIO: ≈ 30.
- HISTÓRICO: ≈ 25.
- OBSOLETO: 40 puntos concretos (lista §10), repartidos en todas las pestañas; Ejercicios concentra 10 y Progreso 9.
- Se eliminan por decisión de Daniel: 17 monigotes, 11 fotos (22 imágenes externas) y la caja que los explica.

## 13. Reescrituras de ejemplo (antes → después)

### R1 · Hoy › «El semáforo de cada mañana» (177 palabras, tabla de 3 columnas)

**Antes:** caja con párrafo de qué mirar, tabla Color/Cuándo/Qué haces con celdas de hasta 35 palabras y un párrafo final sobre las dos noches y las convenciones.

**Después:** componente «¿Cómo amaneces?» encima de la tarjeta de hoy.
- Tres botones grandes: **Verde** · 6h30 o más · **Ámbar** · 5h00–6h29 · **Rojo** · menos de 5h00, VFC desequilibrada o «Sobrecarga».
- Al pulsar, la tarjeta de hoy muestra solo la versión de ese color (el texto ya existe en `plan.json.calendario[…].objetivo` y en `reglas[dia-torcido]`).
- Visible debajo, una línea por color: Verde, la sesión entera y la única que mide · Ámbar, ⅔ de las repeticiones al mismo ritmo + 15–20 min suaves; fuerza sin estrenar peso · Rojo, rodaje de 30–40 min con techo 145; fuerza 4 × 3 sin pierna; la calidad se pierde, no se mueve.
- Plegado «Letra pequeña»: 200 ppm corta la serie; dos noches seguidas < 5 h = 48 h en rojo; tabla de recortes (6 × 400 → 4…); los cortes son convenciones del plan.
- La elección se recuerda ese día en el navegador (comodidad; no es dato del plan).

### R2 · Hoy › cuatro cajas de nota (375 palabras)

**Antes:** «Con las marcas de hoy no apruebas: 4,67» + «El escenario realista: 5,67» (tabla) + «Cuánto aguanta ese escenario» (tabla) + «Todo esto descansa sobre un número que no existe».

**Después:** una tarjeta «Tu nota» de cuatro líneas y una barra.
- 1.000 m **3:34 → 3** · Dominadas **11\* → 5** · Circuito **9,9\* → 6** · Media **4,67 · no apto**. (\* sin medir en serio)
- Barra de la media con la línea del 5,00 y dos marcas fantasma: realista 5,67 · objetivo 6,00.
- Aviso fechado: «Lo decide el jueves 1: 9,0 relaja el plan; 9,6 obliga a bajar el kilómetro».
- Botón «Probar escenarios» → Nota. La tabla de sensibilidad pasa a Nota como gráfica; «no estás estancado» y «el riesgo es que te las cuenten» pasan plegados a Nota y a la técnica BOE.

### R3 · Plan › «Revisión del 23 de septiembre» (424 palabras)

**Antes:** cuatro párrafos con el proceso (seis análisis, escépticos), las razones, lo que cambia de forma, el objetivo 3:30, la actualización del 28-9 y lo que decide lo que falta (con el «circuito de mañana 24» ya caducado).

**Después:** bloque «Decisiones vigentes», una línea por decisión con su fecha:
1. La intensidad no sube hasta Cádiz (23-9).
2. Objetivo del 1.000: bajar de 3:30 con el reparto 0:42 / 1:24 / 2:06 / 2:48 (23-9).
3. Bloque B: 1:26 / 2:08 (28-9; el lunes 28 no valió).
4. Bloque C: 1:24 / 2:06 solo si el 10-10 da ≤ 3:33 en distancia verificada con los tramos 400–800 en 43; entre 3:34 y 3:36, 1:25 / 2:07; peor, se revisan todos los ritmos.
5. Un 3:30 solo cuenta en pista de 400 m confirmada (Arucas si sus marcas lo confirman).
6. Lo que queda por decidir: jueves 1 (circuito) y sábado 10 (bloque C).

Plegados: «Por qué» (las tres razones) y «Qué cambió de forma» (la lista de ocho). El proceso («seis lentes, 43 agentes») va al archivo.

### R4 · Ejercicios › «Martes · el día de fuerza» (tabla obsoleta + nota)

**Antes:** tabla de 5 columnas con 10 kg, jalón 4 × 6 40–45 kg, «~70 min», glúteo medio antiguo y «si falta tiempo: A, B, D, H».

**Después:** «Martes · Arsenal · 1h23» como lista de tarjetas en el orden vigente, cada una con su temporizador de descanso (se reutiliza el temporizador de las recetas):
1. **Prep-hombro** · 2 × 20 s colgado + 2 × 8 retracciones.
2. **A · Lastradas 5 × 3** · 12,5 kg si verde · 10 kg si ámbar · 4 × 3 con 10 kg si rojo · 3 min · pausa abajo, barra al tercio inferior del cuello · vídeo de la 1.ª y la 5.ª.
3. **H · Glúteo medio en circuito** · plancha lateral con elevación 10/lado → pierna tumbado 15/lado → pasos laterales con banda 12/sentido · 45–60 s al final de la ronda · 3 rondas (mínimo 2).
4. **B + D** · jalón 4 × 8 con 38 kg + sentadilla 4 × 6 con 20 kg · 2 min al final del par.
5. **C + F** · remo 4 × 8 con 20 kg + fondos 3 × 6–8 · 2 min.
6. **E + G** · rumano 3 × 8 con 20 kg + pájaros 3 × 12 con 5 kg · 2 min.
7. **I · Core en circuito** · piernas colgado 10 + plancha 45 s · 3 rondas.

Pie: «Si vas justo: A, H, B, D y a casa». En cada tarjeta, «Cómo» plegado con el diagrama técnico y el enlace de vídeo.

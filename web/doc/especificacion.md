# Rediseño de la web del plan · Especificación definitiva

Versión 2 · 29-9-2026 · diseñador jefe, segunda pasada. Base: seis lentes (arquitectura, inventario, interactividad, visual, ilustración, mantenimiento), `inventario.md`, `mascota.svg`, `datos/plan.json`, `datos/historial.json`, `docs/index.html` (308.253 caracteres) y la crítica `critica.md`, cuyas correcciones están ya integradas aquí. Este documento es **autocontenido**: quien implemente no necesita leer la crítica ni la versión 1 (guardada en `_v2/spec_v1.md` solo como archivo).

Este documento lo implementan otros agentes, pestaña a pestaña, sin poder preguntar. Si algo no está aquí, se aplica la regla más conservadora: **no inventar, no decidir por el entrenador, mostrar lo que dice `plan.json` y dejar el conflicto listado y visible**.

---

## 0. Reglas de oro para quien implemente

1. **No se toca nada del proyecto.** Ni `docs/index.html`, ni `docs/anterior/`, ni `datos/`, ni `herramientas/`, ni `CLAUDE.md`, ni git. Todo se escribe en `/private/tmp/claude-502/-Users-Daniel-Documents-plan-cadiz/65ccee0f-c3d5-4077-a6ca-0683a0398360/scratchpad/rediseno/impl/` (estructura en §10.2). Los materiales de las lentes (`visual/`, `interactividad/`, `ilustracion/`, `mantenimiento/`, `arquitectura/`) se leen y se copian, pero no se modifican. Los datos del proyecto se **leen**, nunca se escriben.
2. **Fuente de verdad:** `datos/plan.json` y `datos/historial.json`. Hay otra fuente, más débil y congelada: los textos de la web antigua que no están en los JSON y no son obsoletos (suplementos, material, rutas del Garmin, diagnóstico del control del 19). Se copian literales a `impl/datos/web.json` con `"fuente": "html:<id del inventario>"` y se comprueban contra la copia congelada `impl/datos/corpus_web_antigua.html` (§8.6).
3. **Ninguna cifra nueva.** Toda cifra que se vea tiene que estar en una fuente o salir de una cuenta explícita sobre ellas: puntos por el baremo, medias, días que faltan, diferencias de tiempo, metros de ventaja. El validador lo comprueba (§8.6).
4. **Nada de frases motivacionales ni de emoji.** El plan informa, no anima. El agente dibujado solo celebra si un dato **real** lo dice (media ≥ 5 sin ceros con las marcas registradas, o marca real ≤ 3:30). Con valores simulados nunca celebra.
5. **El 3:49 elimina y se ve siempre** en toda gráfica, escala, simulación, entrada de tiempo o reparto del 1.000 m, con `data-umbral="229"` en el elemento que lo dibuja. La lista cerrada de sitios está en §6.1.7.
6. **Nunca se elige en silencio.** Si `plan.json` se contradice dentro de un mismo día, la web enseña las dos versiones literales en un aviso visible y el conflicto va al Anexo D (§3.4.6).
7. **Orden fijo.** Ninguna vista se reordena sola según la hora o el estado. Lo que cambia con la hora aparece en un sitio fijo (una franja), no mueve lo demás.
8. **La dieta es de su nutricionista.** Su código se mueve tal cual. Solo se admiten los ajustes enumerados en §9.1.
9. **Web pública.** No se añade ningún dato personal que no esté ya publicado. Lista blanca en §8.3.
10. **Un único archivo autónomo** (`out/index.html`): sin librerías JS externas ni compilación en el navegador. Excepciones que ya existen hoy: Google Fonts (solo CSS) y jsPDF, que se carga desde cdnjs solo al pulsar «PDF» en Dieta.
11. **Fechas dinámicas.** «Hoy» se calcula al cargar con la fecha local del dispositivo. Para pruebas se admite `?hoy=AAAA-MM-DD`. Ninguna plantilla lleva una fecha fija de «hoy».
12. **Cada bloque lleva `data-inv="…"`** con los identificadores del inventario que cubre (por ejemplo `data-inv="H5,R12"`). La cobertura se comprueba por etiqueta **y** por frases literales (§10.6).

---

## 1. Diagnóstico para Daniel: por qué la web actual no es intuitiva

Tienes razón: no lo es. No es cuestión de aspecto. La página hace de todo a la vez: te dice lo que hay que hacer hoy, te explica por qué se decidió y te cuenta lo que ya pasó, y lo pone todo al mismo nivel, copiado en varios sitios que ya no coinciden.

1. **En la primera pantalla del móvil no está lo que buscas.** La cabecera oscura ocupa 335 de 844 px (el 40 %) en las siete pestañas. La sesión de hoy aparece hacia y = 671 como un resumen de tres líneas, y el detalle solo sale al tocar un «+» gris. El semáforo, que el propio texto pide mirar «antes de nada», empieza en y = 1.468. Tu nota (4,67) está en y = 3.273. La pestaña Hoy mide unas 6 pantallas.
2. **La misma información está escrita tres o cuatro veces, y las copias se contradicen.** La sesión de cada día está en la fila de Hoy, en el detalle `DIADET` y en el calendario de Plan. El miércoles 30 dice «acabar antes de las 20:30» en Hoy y «antes de las 21:00» en Plan. El reloj «ya está bien configurado» en Hoy, pero en Plan sigue «pendiente de reconfigurar». El circuito «cuenta el mejor tiempo» en Ejercicios y «el primero es el comparable» en Hoy, y a veces las dos frases salen dentro del mismo desplegable.
3. **Hay contenido que te llevaría a entrenar mal si le hicieras caso.** La tabla del martes en Ejercicios sigue con 10 kg, jalón 4 × 6 con 40–45 kg y «~70 min», cuando la sesión real es 12,5 kg con noche verde, 4 × 8 con 38 kg y 1 h 23. Las sesiones para programar en el Garmin llevan series de 200 a «4:25–4:35 /km», unos 10 s más lentas que 0:43, y una sesión de umbral que no existe en el calendario. En total he contado 40 puntos obsoletos.
4. **Lo que ya pasó no se retira, y eso es el ruido que notas.** En Hoy sigue la caja del control del 19. En el HTML hay 19 bloques ocultos. En Plan se lee «el circuito de mañana 24», en Progreso «se mide el jueves 24», en Material «estrenarla el miércoles 16» y la pista de San Cristóbal. El pie dice «actualizado el» con la fecha del día en que abres la página, así que siempre parece recién actualizada.
5. **Las reglas se repiten entre 4 y 10 veces con palabras distintas.** «Tercio inferior del cuello» sale 7 veces. El control del 19 se cuenta en 7 a 9 sitios. El semáforo, en 4. Hay 262 negritas: cuando todo está resaltado, nada destaca.
6. **Las decisiones están en prosa, no en herramientas.** El semáforo es una tabla de 177 palabras que tienes que cruzar cada mañana. Las versiones verde, ámbar y roja de cada sesión están escondidas en párrafos o en mayúsculas dentro de una línea gris. No hay temporizador de descanso, ni forma rápida de marcar cómo salió cada serie, ni aviso de la regla de las dos repeticiones, ni forma de contar las dominadas válidas al revisar el vídeo.
7. **En el móvil hay cosas rotas.** La barra de pestañas corta «Dieta» y deja «Reglas» fuera de la pantalla sin ninguna pista de que se puede desplazar. Los desplegables recortan tablas (se pierde justo «si la noche es verde» en la progresión del lastre). En Ejercicios la página entera se desplaza en horizontal. Las gráficas tienen el texto de los ejes a unos 5 px y las fechas del sueño montadas unas encima de otras.
8. **Algunas gráficas dicen cosas que el plan ya no sostiene.** El sueño se colorea con un corte en 5 h 30 y el semáforo usa 5 h 00. El «pulso trotando» dibuja una «zona normal 130–140» que el propio plan dice que no tiene respaldo. En dominadas, el 10-9 aparece como «mejor serie 14» (eran 14 repeticiones lastradas en escalera), y a los óptimos del foco de carga no les he encontrado fuente.
9. **Los gifs y los monigotes no enseñan la técnica.** Coincido contigo. Las fotos de la dominada están tomadas de espaldas y en máquina, así que no se ve la barra respecto al cuello, la pausa ni el agarre, que son justo lo que anula una repetición ante el tribunal. Además dependen de un servidor externo (unos 1,2 MB). Los 17 monigotes son palotes sin ángulos.
10. **La nota está repartida y la cabecera solo mira una prueba.** La escala de la cabecera es solo del 1.000. La media que decide el apto está en Hoy (cuatro cajas), en Nota (calculadora) y en Progreso (tarjetas). La calculadora pone la etiqueta «elimina» en el centro de la barra y no en su sitio, y en dominadas «mejor» va hacia el otro lado.
11. **Hay 7 pestañas sin un orden de uso.** Nota y Progreso responden a lo mismo («cómo voy») y están separadas. Las reglas duras no están en Reglas: las dos repeticiones están en Ejercicios, medir distancias en Plan y la alarma de talón en Material. No se puede enlazar a una pestaña ni a un día.
12. **Mantenerla cuesta y por eso se desfasa.** Después de cada sesión hay que tocar 12 sitios a mano (el commit del 28 cambió el HTML en 22 trozos). Los historiales ya no cuadran con `historial.json`: la tabla dice «14 sesiones» y hay 15, el orden está mezclado y una lectura del Garmin aparece como una carrera. A partir del 5-10 la pestaña Hoy se habría quedado vacía hasta que alguien la editara.

**La propuesta, en una frase:** cinco pestañas en la barra inferior (Hoy, Plan, Marcas, Técnica y Dieta). Hoy abre con una sola tarjeta: tocas el color de tu noche y la tarjeta te dice qué haces y con qué números; en la pista, un toque por serie. Todo se genera desde `plan.json` e `historial.json`, así que nada caduca. Cada regla vive en un solo sitio. Hay gráficas legibles, herramientas en lugar de párrafos, láminas técnicas dibujadas que enseñan lo que mira el tribunal y un agente dibujado que solo se mueve cuando un dato lo mueve.

---

## 2. Principios de diseño

1. **Hoy primero, en tres segundos.** Al abrir el móvil se ve qué toca, en qué versión y con qué números, sin desplazarse. La única entrada obligatoria del día es **un toque** (el color de la noche).
2. **Una casa por dato.** Cada cifra, regla o decisión vive en un solo sitio. En los demás se enlaza («Técnica de la dominada →») o se usa como comportamiento: el semáforo cambia la sesión y la regla de las dos repeticiones salta sola en el modo pista. La tabla de §5.7 es la ley.
3. **Herramienta antes que párrafo.** Si un texto sirve para decidir algo, se convierte en un control que da la respuesta: semáforo, simulador de nota, reparto, contador de válidas, registro del jueves o condición del día.
4. **Conclusión visible, razón plegada.** Cada bloque se abre con una línea que ya es la conclusión, el dato y la acción, en 40 palabras como mucho. El «por qué» y el «origen» van plegados. Lo pasado va al registro, no a la vista.
5. **Medido, supuesto y autoinformado no se confunden.** Lo medido va relleno. Lo supuesto, autoinformado, estimado o simulado va hueco o con línea discontinua y lleva su chip. La convención es la misma en toda la web, también en el agente (contorno = no es real).
6. **Se genera, no se copia.** La web es una plantilla más un bloque de datos. Lo que depende de la fecha se oculta solo cuando caduca. Lo que el constructor puede calcular no se escribe a mano.
7. **Ilustración con dato.** El agente, las escenas y las láminas técnicas son SVG propio. Solo aparecen donde cuentan algo (tu marca frente al 3:49, la media frente al 5,00, la barra respecto al cuello, la espalda en el peso muerto) y nunca como adorno.
8. **Orden fijo y memoria espacial.** Cada cosa está siempre en el mismo sitio. Cada vista recuerda dónde la dejaste. Tocar la pestaña activa vuelve arriba.
9. **Hecho para la pista.** En modo pista y gimnasio: botones de 56–64 px, un toque por serie, sin teclado, cifras de 72 px, temporizadores que suenan y destellan (no solo vibran) y que no se pierden si bloqueas el móvil.

---

## 3. Arquitectura

### 3.1 Cinco destinos

| # | Pestaña | Pregunta que responde | Sustituye a |
|---|---|---|---|
| 1 | **Hoy** | ¿Qué hago hoy, en qué versión, y cómo lo apunto? | Hoy + las sesiones tipo de Ejercicios + `DIADET` + semáforo de Reglas |
| 2 | **Plan** | ¿Qué viene, con qué ritmos, con qué reglas y por qué? | Plan (calendario, semana tipo, ritmos, zonas y revisión) + Reglas |
| 3 | **Marcas** | ¿Cómo voy y qué nota saco? | Nota + Progreso + las cajas de nota de Hoy |
| 4 | **Técnica** | ¿Cómo se hace bien cada prueba y cada ejercicio? | Ejercicios (técnica, reloj, material) + las partes de Nota sobre las pruebas |
| 5 | **Dieta** | ¿Qué como hoy? | Dieta, más «comer antes de entrenar» y el café de Reglas |

Orden fijo: Hoy · Plan · Marcas · Técnica · Dieta. Iconos del sprite (§4.9): `hoy`, `plan`, `marcas`, `tecnica`, `dieta`.

**Por qué «Técnica» y no «Guía».** El 80 % de lo que hay en esa pestaña es cómo se hace bien (lámina de la dominada, reparto del 1.000, circuito, fichas del gimnasio, reloj). Un nombre genérico obliga a adivinar. Las reglas del plan (semáforo, cuello, dos repeticiones, dormir, descanso) pasan a **Plan › Reglas**, que es donde se buscan «las reglas del plan», y además actúan como comportamiento en Hoy.

### 3.2 Navegación

- **Móvil y tableta (< 1024 px):**
  - **No hay barra superior.** Cada vista empieza con su cabecera, que se desplaza con el contenido: en Hoy, la cabecera es el bloque H-0; en las demás, `h1.vt` (22 px) con la línea de contexto debajo.
  - Barra inferior fija `.tabbar` con los 5 destinos, icono de 24 px y rótulo de 12 px. No se desplaza.
  - En Plan, Marcas y Técnica, la `.subnav` se pega arriba (`top: env(safe-area-inset-top)`).
  - Una franja fija `.sb-fondo` de alto `env(safe-area-inset-top)` con fondo `--bg` (z-index 35) tapa el contenido bajo la barra de estado de iOS, porque la web usa `apple-mobile-web-app-status-bar-style="black-translucent"`.
  - Lo fijo suma, como mucho, la `.subnav` (unos 60 px) y la `.tabbar` (64 px más la zona segura): menos del 20 % de una pantalla de 844.
- **Escritorio (≥ 1024 px):** barra superior `.appbar` pegada (`sticky`, 56 px) con, de izquierda a derecha: la marca (icono de la app, el cronómetro de §4.9, y «Plan Cádiz»), las cinco pestañas centradas con subrayado de 2 px en la activa, el chip de nota (`4,67 · no apto`, enlaza a `#marcas`) y el botón de tema. La `.tabbar` inferior no existe. La `.subnav` se pega bajo la barra.
- **Tema:** en móvil, el conmutador de tema (Sistema · Claro · Oscuro) va en el pie de cada vista. En escritorio, además, el botón de la barra.
- **Rutas por `location.hash`** (se pueden enlazar, sirven para el entrenador y para la QA):

| Ruta | Efecto |
|---|---|
| `#hoy` (y vacío) | Hoy con la fecha de hoy |
| `#hoy/2026-10-01` | Hoy mostrando la tarjeta de ese día, con el chip «Volver a hoy» |
| `#plan` · `#plan/calendario` · `#plan/semana` · `#plan/ritmos` · `#plan/zonas` · `#plan/reglas` · `#plan/decisiones` | Plan y desplazamiento al ancla |
| `#plan/2026-10-10` | Plan con la hoja de ese día abierta |
| `#marcas` · `#marcas/nota` · `#marcas/controles` · `#marcas/graficas` · `#marcas/registro` · `#marcas/cuerpo` | Marcas y ancla. `#marcas/simulador` es alias de `#marcas/nota` |
| `#marcas/graficas/sueno` (y `series`, `barra`, `circuito`, `pulso`, `carga`) | Gráficas con esa gráfica elegida |
| `#tecnica` · `#tecnica/dominada` · `#tecnica/mil` · `#tecnica/circuito` · `#tecnica/gimnasio` · `#tecnica/carrera` · `#tecnica/reloj` · `#tecnica/material` | Técnica y ancla |
| `#tecnica/ej/<id>` | Ficha del ejercicio `<id>` de `plan.ejercicios[].id` (por ejemplo `#tecnica/ej/sentadilla`) |
| `#dieta` | Dieta |

- La web **abre siempre en Hoy** salvo que la URL traiga otra ruta. Se elimina `pc-tab`: se guardaba y nunca se leía. Al arrancar se borra con `localStorage.removeItem('pc-tab')`.
- **Memoria de posición:** cada vista guarda su `scrollY` al salir (en memoria, no en `localStorage`) y la recupera al volver. **Tocar la pestaña activa** lleva la vista arriba con desplazamiento suave (instantáneo con `prefers-reduced-motion`).
- En la web no queda ningún «ve a la pestaña X»: siempre enlaces directos (`<a href="#tecnica/dominada">Técnica de la dominada →</a>`).

### 3.3 Flujo de uso real

| Momento | Dónde cae | Qué hace | Toques |
|---|---|---|---|
| 6:00, al levantarse | Hoy › tarjeta de hoy, fila del semáforo (abierta porque aún no se ha rellenado) | Toca Verde, Ámbar o Rojo según las horas del Garmin. Si algo no es normal (reloj, síntomas, dolor), «Cambiar» | 1 (2–5 si algo cambia) |
| 17:30, antes de salir | Hoy › la misma tarjeta, con el semáforo ya en una línea | Mira los números del día y, plegado, «Configura el reloj» | 0–1 |
| 18:10, en la pista o el Arsenal | Modo pista / Modo gimnasio (pantalla completa) | Por repetición, un toque: Dentro · Lenta · Rápida. El descanso cuenta solo, pita y destella. Las dos repeticiones saltan solas | 1 por serie |
| 19:15, al terminar | Hoy › franja al pie de la tarjeta «¿Ya has terminado? Apunta cómo fue →» | Se abre la hoja «Cómo fue» con lo del modo pista ya puesto; «Copiar para el entrenador» | 2–4 |
| Noche | Hoy › «Esta noche» | Cena terminada a las 20:15 · luz a las 22:15 | 0 |
| Jueves 21:30 | Hoy › tarjeta del circuito con el registro de los intentos | Tiempo de cada intento en décimas, nulo y motivo | 4–8 |
| Fin de semana | Marcas (nota, simulador, gráficas) y Plan (semana siguiente) | Consulta | libre |
| Revisión del vídeo de dominadas | Técnica › Dominada › Contador de válidas | Válida o Nula (con la regla) por repetición | 1 por repetición |

### 3.4 Reglas de contenido que valen para toda la web

1. **Caducidad.** Lo que tiene fecha vive en `web.json` con `desde` y `hasta` y se oculta solo. Los días pasados salen de Hoy. En el calendario se quedan atenuados y con su estado real sacado del historial.
2. **Una casa por dato.** El mapa completo está en §5.7. Si un texto necesita una regla de otra casa, pone un enlace.
3. **Formato de un bloque:** título que ya es la conclusión, dato y acción visibles, en 40 palabras como mucho. Debajo, `details.acc.why` «Por qué» u «Origen». Como mucho una negrita por bloque, y solo para la cifra o la decisión.
4. **Supuestos.** Todo lo que no está verificado lleva `.chip.sup` con el texto «supuesto», «sin verificar», «autoinformado», «al 60 %» o «simulado». En las gráficas se dibuja con trazo discontinuo o marcador hueco; el agente, en contorno.
5. **Conflictos del plan entre campos o fechas distintas.** La web muestra el campo más específico del día, o el más reciente si está fechado, y el conflicto va a la lista de decisiones pendientes (Anexo D).
6. **Conflictos dentro de un mismo día.** Si dos campos del mismo día dan cifras distintas para lo mismo (hoy: el reparto del 10-10, K5), la tarjeta del día y el modo pista enseñan arriba un `.aviso.warn` con los dos textos literales y la frase fija «El plan de este día no coincide consigo mismo. Pregúntalo antes de la sesión». **Nunca se elige uno en silencio.**
7. **El `semaforo` propio del día manda.** Si un día tiene su propio campo `semaforo` (hoy, el 10-10), ese texto manda sobre `web.semaforo.generico` y sobre la línea «Solo la versión verde mide»: se pinta literal junto al color que haya salido. Vale para cualquier día futuro con ese campo.
8. **Descansos con texto propio.** En un día de descanso se muestra primero la `sesion` literal del día (el 4-10 trae una opción, el 9-10 «Sin barra», el 11-10 «No añadir rodaje…») y, debajo y plegada, la regla general `reglas[descanso]`.

---

## 4. Sistema de diseño

### 4.1 Base

M0 copia `visual/sistema.css` (lente visual, contrastes validados) a `impl/src/css/10_sistema.css` y le aplica **exactamente** los cambios de este apartado. Lo que no se cambia aquí se queda como está en ese archivo.

### 4.2 Color: tokens

**Claro (`:root`):**

```css
--bg:#F3F5F8; --surface:#FFFFFF; --surface-2:#EDF1F5; --surface-3:#E3E9EF;
--border:#D9E0E8; --border-strong:#B8C3CF;
--text:#0F1822; --text-2:#3E4C5B; --text-3:#5B6B7C;           /* 17,9 · 8,8 · 5,5 : 1 */
--primary:#1E4F91; --primary-strong:#163C70; --primary-soft:#E7EEF8; --on-primary:#FFFFFF;
--ok:#11734F;  --ok-soft:#E2F3EA;  --warn:#8F5A00; --warn-soft:#FCEFD6; --bad:#B42318; --bad-soft:#FCE8E4;
--st-good:#0CA30C; --st-warn:#FAB219; --st-crit:#D03B3B;      /* lámparas del semáforo: siempre con texto */
--s1:#2A78D6; --s2:#EB6834; --s3:#1BAF7A;                     /* carrera · barra/fuerza · circuito */
--p1:#86B6EF; --p2:#5598E7; --p3:#2A78D6; --p4:#1C5CAB; --p5:#104281; /* puntos del baremo 1-2 · 3-4 · 5-6 · 7-8 · 9-10 */
--elim:#D03B3B; --grid:#E6EBF0;
```

**Oscuro:** se definen los mismos tokens con los valores de `sistema.css` (`--bg:#0B1117; --surface:#131B24; --surface-2:#1B2530; --surface-3:#243140; --border:#2B3745; --border-strong:#3A4859; --text:#E9EEF3; --text-2:#B4C0CC; --text-3:#8E9DAD; --primary:#8DB8F2; --primary-strong:#B5D1F7; --primary-soft:#172A42; --on-primary:#0B1117; --ok:#4FC48C; --ok-soft:#11271D; --warn:#F0B545; --warn-soft:#2B210D; --bad:#FF8A73; --bad-soft:#33170F; --s1:#3987E5; --s2:#D95926; --s3:#199E70; --p1:#184F95; --p2:#256ABF; --p3:#3987E5; --p4:#6DA7EC; --p5:#9EC5F4; --grid:#223040`). Van en dos sitios:

```css
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ color-scheme:dark; …tokens oscuros… } }
:root[data-theme="dark"]{ color-scheme:dark; …los mismos tokens oscuros… }
html,body{background:var(--bg)}
```

En oscuro, las sombras pasan a borde: `--sh-1:0 0 0 1px var(--border); --sh-2:0 0 0 1px var(--border-strong); --sh-bar:0 -1px 0 var(--border)`.

**Paleta de ilustración.** Sustituye el bloque `--ill-*` de `sistema.css`. Las escenas usan `style="fill:var(--ill-…)"` (nunca el atributo `fill=` con `var()`) para que funcione el modo oscuro.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--ill-camiseta` | #1F3D63 | #3A5E93 | polo |
| `--ill-camiseta-2` | #16304F | #2E4D7A | sombra lateral del polo |
| `--ill-pantalon` | #142840 | #22344F | pantalón |
| `--ill-gorra` | #13243B | #2A4166 | gorra |
| `--ill-visera` | #0C1828 | #1B2B44 | visera y número del dorsal |
| `--ill-vivo` | #7FB2E5 | #9EC5F4 | vivo de la gorra (único acento) |
| `--ill-piel` | #EDBB98 | #EDBB98 | piel, lado cercano |
| `--ill-piel-2` | #D49A76 | #C98F6C | piel, lado lejano |
| `--ill-pelo` | #2B2420 | #2B2420 | pelo y rasgos de la cara |
| `--ill-zapa` | #2A6FB0 | #3987E5 | zapatillas |
| `--ill-zapa-2` | #1F5A92 | #2A6FB0 | zapatilla del lado lejano |
| `--ill-suela` | #F4F7FA | #E9EEF3 | suela |
| `--ill-dorsal` | #FFFFFF | #E9EEF3 | dorsal |
| `--ill-mani` | #9AA7B4 | #6F7F90 | figura «maniquí» de las láminas |
| `--ill-mani-2` | #C3CCD5 | #4A5868 | lado lejano del maniquí |
| `--ill-pista` | #E8EEF4 | #1B2530 | pista y suelo |
| `--ill-pista-elim` | #F7DED8 | #3A1D17 | tramo que elimina en la pista |
| `--ill-ciudad` | #E9EFF5 | #18222D | silueta de fondo |
| `--ill-estela` | #C9D4DE | #3A4859 | estelas de velocidad |
| `--ill-sombra` | rgba(22,32,43,.10) | rgba(0,0,0,.35) | sombra en el suelo |
| `--ill-elim` | #BE2C16 | #BE2C16 | poste y banderín «ELIMINA 3:49» (lleva texto blanco: 5,9:1) |
| `--ill-meta` | #12775A | #12775A | poste y banderín «META», cinta del 5,00, corredor en contorno del 3:30 (lleva texto blanco: 5,5:1). **Igual en los dos temas**: con el verde claro del oscuro, el texto blanco no se leería |
| `--ill-flag-txt` | #FFFFFF | #FFFFFF | texto de los banderines |

Las marcas de las láminas usan `--text` (número negro, regla BOE), `--primary` (letra azul, consejo del plan), `--bad` (✕, nula) y `--ok` (cota o referencia correcta).

**Usos semánticos fijos:**

- Rojo (`--elim` / `--bad` / `--ill-elim`) **solo** para lo que elimina o anula: 3:49 o más, 4 dominadas o menos, 11,7 s o más, ELIMINADO, repetición nula, «más de 3 s lenta» en el modo pista (dispara la regla de las dos repeticiones) y la parada por la regla del cuello.
- Lo que está por debajo de lo necesario sin eliminar (4,67 frente a 5,00, circuito sin medir, NO APTO sin ceros) va en ámbar (`--warn`) con icono y texto.
- Las distancias y márgenes neutros («15 s de margen») van en `--text-2`, nunca en rojo.
- Semáforo: `--st-good`, `--st-warn` y `--st-crit` en la lámpara; el texto va en `--ok`, `--warn` o `--bad` sobre su `-soft`.
- Series de gráficas: carrera `--s1`, barra y fuerza `--s2`, circuito `--s3`.
- Nunca el color solo: siempre va con icono o texto.

### 4.3 Tipografía

- **Una sola familia:** Barlow 400/600/700 desde Google Fonts, con `display=swap` y la pila de respaldo `system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`. **Se elimina IBM Plex Mono**, también dentro de los SVG. Las cifras en columnas, ejes, cronos y globos llevan `font-variant-numeric:tabular-nums` (clase `.num`).
- **Escala de 7 tamaños más uno exclusivo del modo pista:**

| Token | px | Uso |
|---|---|---|
| `--fs-xs` | 12 | ejes, pies, metadatos, rótulo de pestaña. Nada por debajo |
| `--fs-sm` | 14 | secundario, chips, tablas |
| `--fs-md` | 16 | cuerpo |
| `--fs-lg` | 18 | título de tarjeta |
| `--fs-xl` | 22 | título de vista (`h1.vt`) |
| `--fs-2xl` | 28 | cifra de tarjeta (`.stat b`) |
| `--fs-3xl` | 44 | cifra héroe, **una por vista y solo donde hay una cifra que manda** (la media en Marcas). Hoy no lleva héroe: sus tres números van a 28 px |
| `--fs-4xl` | 72 | **solo** `.focus .big` (modo pista y gimnasio) |

- Interlineado: 1,15 en cifras, 1,3 en títulos y 1,5 en cuerpo. Pesos: 400 cuerpo, 600 títulos y chips, 700 cifras y h1.
- **Texto en SVG: 12 px de pantalla como mínimo.** Las gráficas se dibujan al ancho real (§6.1). Las escenas se dibujan en su caja de referencia y cada texto lleva `font-size = max(tamañoDeReferencia, 12 × anchoDeReferencia / anchoPintado)`, recalculado con `PC.alRedimensionar`. Única excepción: el número del dorsal «43», que es dibujo y va dentro de un grupo `[data-deco]` con `aria-hidden="true"`; la QA de letra ignora `[data-deco]`.

### 4.4 Espacios, radios, sombras, movimiento y capas

- Espacios (base 4): `--sp-1:4px --sp-2:8px --sp-3:12px --sp-4:16px --sp-5:20px --sp-6:24px --sp-8:32px --sp-10:40px --sp-14:56px`. Margen lateral `--gutter:16px`. Separación entre tarjetas: 16 px en móvil y 24 px a partir de 1024 px.
- Radios: `--r-xs:6px` (interior), `--r-sm:10px` (botones, campos, segmentado), `--r-md:14px` (tarjetas), `--r-lg:20px` (hojas) y `--r-pill:999px` (chips).
- Sombras: `--sh-1`, `--sh-2` y `--sh-bar` como en `sistema.css`.
- Movimiento: `--dur-1:120ms --dur-2:200ms --dur-3:400ms`, `--ease:cubic-bezier(.2,.8,.2,1)`. La entrada de vista dura 200 ms (opacidad y 8 px); la pulsación, escala 0,97; los medidores tardan 400 ms; el agente se desplaza en 600 ms con `transform`. Todo se anula con `prefers-reduced-motion: reduce`.
- Profundidad (z-index): `.subnav` 20 · `.sb-fondo` 35 · `.appbar` 30 · `.tabbar` 40 · `.sheet-bg` 60 · `.sheet` 61 · `.focus` 80 · `.destello` 85 · `.toast` 90.
- **Capas de CSS.** El CSS ensamblado empieza con `@layer sistema, modulos, dieta;`. `10_sistema.css` va entero dentro de `@layer sistema{…}`; el CSS de Hoy, Plan, Marcas, Técnica e ilustración, dentro de `@layer modulos{…}`; `60_dieta.css`, dentro de `@layer dieta{…}`. **No queda CSS sin capa** (el CSS sin capa ganaría a todas). Así, lo de Dieta gana siempre dentro de `#v-dieta` sin pelear por especificidad (§9.1).

### 4.5 Rejilla y puntos de corte

| Ancho | Cambios |
|---|---|
| < 360 | `.week` baja a 44 px por celda. Las barras `.umb` pasan a columna |
| 360–599 | Una columna. Las tablas de texto (`table.stack`) pasan a tarjetas y las matrices numéricas van en `.tscroll`. Las barras `.umb` en columna |
| 600–767 | Una columna; las tablas vuelven a ser tablas; `.umb` en fila |
| 768–1023 | `.grid-2` en dos columnas (fichas). Marcas › Gráficas enseña todas las gráficas en dos columnas, sin selector. Hoy sigue en una columna |
| ≥ 1024 | `.appbar` arriba con las pestañas; sin `.tabbar`. Contenedor de 1.120 px como máximo. Hoy: H-0 a todo el ancho y debajo rejilla de 12 columnas (7 + 5). Gráficas en `.grid-2` con 640 px como máximo cada una. La hoja de día pasa a panel lateral de 440 px |

Relleno del `body` en móvil: arriba `env(safe-area-inset-top)`; abajo `calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--sp-6))`. En `<meta name="viewport">`, `viewport-fit=cover`.

### 4.6 Tamaño táctil

Todo lo tocable mide **44 × 44 px como mínimo**: botones, chips interactivos, `summary`, celdas de semana, días del calendario, entradas, selectores, **botones de `.seg` (sube de 40 a 44 en `sistema.css`)** y **`.timer` (sube de 36 a 44)**. En el modo pista y gimnasio, 56 px (lámparas, válida/nula) y 64 px (botones de repetición). Los chips informativos pueden medir 28 px. Los enlaces dentro de un párrafo están exentos. El foco visible es un contorno de 2 px en `--primary` con 2 px de separación.

### 4.7 Tono y formatos de texto

- Castellano de España, de tú, frases cortas, mayúscula solo al principio. Sin signos de exclamación, sin emoji, sin frases de ánimo («¡vamos!», «tú puedes», «gran trabajo»: prohibidas).
- Decimales con coma (4,67 · 9,9 s · 12,5 kg). La media siempre con dos decimales.
- Tiempos: `3:34`, `0:43,5` y `1:26,9`. Sueño: `6h30`. Rangos con raya corta: `5h00–6h29`, `9,0–9,3 s`. Multiplicación con espacios: `6 × 400`.
- Fechas: corta `mar 29-9`, larga `martes 29 de septiembre`. Horas en 24 h (`18:00`).
- Unidades siempre: `s`, `kg`, `ppm`, `pts`, `min`, `m`.
- Los títulos de bloque son conclusiones: «Con las marcas de hoy no apruebas: 4,67», no «Nota actual».

### 4.8 Componentes: catálogo

Clases exactas. El CSS de `tabbar`, `card`, `chip`, `seg`, `meter`, `acc`, `tscroll`/`table.t`/`table.stack`, `ex`/`timer`, `week`, `chart`/`legend` y `view` es el de `sistema.css` con los cambios de §4.6. Lo nuevo va escrito aquí y se añade a `10_sistema.css`.

**Cabecera de vista (móvil y escritorio)**

```html
<header class="vh"><h1 class="vt">Marcas</h1><p class="vt-sub">Datos hasta lun 28-9</p></header>
```
```css
.vh{padding:var(--sp-4) 0 var(--sp-2)} .vt{font:var(--fw-bold) var(--fs-xl)/1.2 var(--font);margin:0}
.vt-sub{margin:2px 0 0;color:var(--text-3);font-size:var(--fs-sm)}
```

Hoy no lleva `.vh`: su cabecera es H-0 (§5.1).

**Barra superior (solo ≥ 1024 px)**

```html
<header class="appbar"><div class="container">
  <a class="brand" href="#hoy"><svg class="icon app" aria-hidden="true"><use href="#i-app"/></svg><span class="brand-t">Plan Cádiz</span></a>
  <nav class="ab-tabs" role="tablist" aria-label="Secciones">…los cinco botones de pestaña…</nav>
  <a class="chip nota warn" href="#marcas" id="ab-nota">4,67 · no apto</a>
  <button class="icon-btn" id="ab-tema" aria-label="Cambiar tema"><svg class="icon"><use href="#i-luna"/></svg></button>
</div></header>
```
```css
.appbar{display:none}
@media (min-width:1024px){
  .appbar{display:block;position:sticky;top:0;z-index:30;height:56px;background:var(--surface);box-shadow:var(--sh-bar)}
  .appbar .container{display:flex;align-items:center;gap:var(--sp-4);height:100%}
  .appbar>.container>*{flex:none}
  .appbar .ab-tabs{flex:1 1 auto;display:flex;justify-content:center;gap:var(--sp-2)}
  .tabbar{display:none}
}
a.brand{display:inline-flex;align-items:center;gap:8px;color:inherit;text-decoration:none;font-weight:var(--fw-bold)}
.icon.app{width:28px;height:28px}
.appbar a.chip{text-decoration:none;height:32px}
```

**Chip de nota** (barra de escritorio y cabecera H-0 de Hoy): clase `warn` si el resultado es NO APTO sin ceros, `ok` si es APTO y `bad` **solo** si es ELIMINADO. Texto: «4,67 · no apto», «5,33 · apto», «eliminado · dominadas».

**Pestañas (móvil)**

```html
<nav class="tabbar" role="tablist" aria-label="Secciones">
  <button role="tab" id="t-hoy" aria-controls="v-hoy" aria-selected="true" data-v="hoy"><span class="pill"><svg class="icon"><use href="#i-hoy"/></svg></span>Hoy</button>
  … plan · marcas · tecnica · dieta …
</nav>
```

Un clic hace `location.hash = '#' + data-v`; si la pestaña ya estaba activa, sube al principio de la vista (§3.2). Las flechas izquierda y derecha mueven el foco y cambian de pestaña. Los botones de pestaña del escritorio (`.ab-tabs`) usan el mismo marcado y el mismo comportamiento.

**Vista**

```html
<section class="view" id="v-plan" role="tabpanel" aria-labelledby="t-plan" hidden>
  <div class="container"><header class="vh">…</header> … 
    <footer class="pie" data-inv="C5">Datos hasta <span data-pc="datosHasta"></span> · construido <span data-pc="construido"></span>
      <div class="seg tema" role="group" aria-label="Tema"><button data-tema="">Sistema</button><button data-tema="light">Claro</button><button data-tema="dark">Oscuro</button></div>
    </footer></div>
</section>
```

**Tarjeta.** Es `.card` con `.card-h` (icono de 40 px sobre `--primary-soft`, `.t` con título h2 de 18 px y `small` de metadatos, `.end` para un chip o botón). Variantes nuevas:

```css
.card.hi{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary),var(--sh-1)}   /* tarjeta de hoy */
.card.flat{box-shadow:none;background:var(--surface-2);border-color:transparent}
.card>.card-f{margin:var(--sp-4) calc(-1*var(--sp-4)) calc(-1*var(--sp-4));padding:var(--sp-3) var(--sp-4);border-top:1px solid var(--border);display:flex;gap:var(--sp-2);flex-wrap:wrap}
.card>.franja{margin:var(--sp-3) calc(-1*var(--sp-4)) calc(-1*var(--sp-4));padding:0 var(--sp-4);min-height:52px;display:flex;align-items:center;justify-content:space-between;background:var(--primary-soft);color:var(--primary);font-weight:var(--fw-semi);border-radius:0 0 var(--r-md) var(--r-md);text-decoration:none}
```

**Chips.** `.chip` más `ok|warn|bad|pri`. Los interactivos son `button.chip` (44 px) con `aria-pressed`. Nuevo:

```css
.chip.sup{background:transparent;border:1px dashed var(--border-strong);color:var(--text-2)}
.chip.sup::before{content:'';width:8px;height:8px;border-radius:50%;border:1.5px dashed currentColor}
.chips{display:flex;gap:var(--sp-2);flex-wrap:wrap}
button.chip[aria-disabled="true"]{color:var(--text-3);border-style:dashed}
```

**Botones**

```css
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:var(--tap);padding:0 var(--sp-4);border-radius:var(--r-sm);border:1px solid transparent;font:var(--fw-semi) var(--fs-md)/1.1 var(--font);cursor:pointer;text-decoration:none;color:inherit;background:none}
.btn.pri{background:var(--primary);color:var(--on-primary)}
.btn.sec{background:var(--surface);color:var(--text);border-color:var(--border-strong)}
.btn.ghost{color:var(--primary);padding:0 var(--sp-2)}
.btn.block{display:flex;width:100%} .btn.lg{min-height:56px;font-size:var(--fs-lg)}
.btn[disabled]{opacity:1;color:var(--text-3);border-color:var(--border);cursor:not-allowed}
```

**Lámparas del semáforo** (la única entrada obligatoria del día)

```html
<div class="lamps" role="radiogroup" aria-label="Horas de sueño de esta noche según el Garmin">
  <button role="radio" aria-checked="false" data-banda="verde"><i class="lamp g"></i><b>Verde</b><small>6h30 o más</small></button>
  <button role="radio" aria-checked="false" data-banda="ambar"><i class="lamp a"></i><b>Ámbar</b><small>5h00–6h29</small></button>
  <button role="radio" aria-checked="false" data-banda="rojo"><i class="lamp r"></i><b>Rojo</b><small>menos de 5h00</small></button>
</div>
```
```css
.lamps{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-2)}
.lamps button{min-height:56px;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:8px;align-items:center;text-align:left;padding:6px 10px;border:1px solid var(--border-strong);border-radius:var(--r-sm);background:var(--surface);color:var(--text);cursor:pointer}
.lamps .lamp{grid-row:1/3;width:14px;height:14px;border-radius:50%} .lamp.g{background:var(--st-good)} .lamp.a{background:var(--st-warn)} .lamp.r{background:var(--st-crit)}
.lamps b{font-size:var(--fs-md)} .lamps small{font-size:var(--fs-xs);color:var(--text-3)}
.lamps button[aria-checked="true"]{border-width:2px;border-color:var(--text);background:var(--surface-2)}
```

**Deslizador de sueño** (opcional, bajo «Cambiar»): `input type=range` de 180 a 600 min en pasos de 5, con la pista pintada en tres bandas (`--bad-soft` hasta 299, `--warn-soft` de 300 a 389, `--ok-soft` desde 390), la cifra en `output.num` («6h05») y `aria-valuetext` «6 horas 5 minutos, ámbar». Al moverlo, la lámpara se elige sola por la banda. Si se toca una lámpara después, el minuto exacto se borra.

**Stepper** (codo y hombro de 0 a 10, reserva de la 5.ª, tiempo exacto ±0,5 s en el modo pista y ±0,1 s en el circuito)

```html
<div class="stepper" role="group" aria-label="Dolor de codo"><button type="button" data-d="-1" aria-label="Menos">−</button><output class="num">0</output><button type="button" data-d="1" aria-label="Más">+</button></div>
```
```css
.stepper{display:inline-grid;grid-template-columns:var(--tap) minmax(76px,auto) var(--tap);align-items:center;border:1px solid var(--border-strong);border-radius:var(--r-sm);background:var(--surface)}
.stepper button{height:var(--tap);border:0;background:none;color:var(--text);font:var(--fw-semi) var(--fs-lg)/1 var(--font);cursor:pointer}
.stepper output{text-align:center;font:var(--fw-bold) var(--fs-lg)/1 var(--font)}
.focus .stepper{grid-template-columns:64px minmax(120px,auto) 64px} .focus .stepper button{height:64px}
```

**Segmentado.** Es `.seg` con botones `aria-pressed` de 44 px.

**Cifras**

```html
<div class="stats"><div class="stat"><b>5 × 3</b><span>lastradas</span></div><div class="stat"><b>12,5 kg</b><span>lastre · verde</span></div><div class="stat"><b>3:00</b><span>descanso</span></div></div>
```
```css
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:var(--sp-3)}
.stat b{display:block;font:var(--fw-bold) var(--fs-2xl)/var(--lh-tight) var(--font);font-variant-numeric:tabular-nums}
.stat span{display:block;font-size:var(--fs-sm);color:var(--text-3)}
.stat.hero b{font-size:var(--fs-3xl)}
```

**Aviso.** Como mucho uno por vista fuera de las tarjetas. Los demás van dentro de su tarjeta.

```html
<div class="aviso warn" role="note"><svg class="icon"><use href="#i-alerta"/></svg><div><b>«título»</b> «texto literal»<small>hasta el 1-10</small></div></div>
```
```css
.aviso{display:flex;gap:var(--sp-3);align-items:flex-start;padding:var(--sp-3) var(--sp-4);border-radius:var(--r-sm);border-left:4px solid var(--border-strong);background:var(--surface-2);margin-bottom:var(--sp-4)}
.aviso.ok{background:var(--ok-soft);border-left-color:var(--st-good)} .aviso.warn{background:var(--warn-soft);border-left-color:var(--st-warn)}
.aviso.bad{background:var(--bad-soft);border-left-color:var(--st-crit)} .aviso.info{background:var(--primary-soft);border-left-color:var(--primary)}
.aviso small{display:block;color:var(--text-3);font-size:var(--fs-xs);margin-top:2px}
.aviso .dos{display:grid;gap:var(--sp-2);margin-top:var(--sp-2)} .aviso .dos q{display:block;font-size:var(--fs-sm);quotes:"«" "»"}
```

`.aviso .dos` es la forma del aviso de conflicto de un día (§3.4.6): dos `q` con el campo de origen en `small` («objetivo del día», «protocolo del día»).

**Acordeón de «por qué».** Es `details.acc` más `.why` con `summary` de 52 px y chevrón.

```html
<details class="acc why"><summary><svg class="icon sm"><use href="#i-info"/></svg>Por qué<svg class="icon sm chev"><use href="#i-chev"/></svg></summary><div class="in">…</div></details>
```

Se borra `overflow:hidden` de `.acc`, que es la causa de los recortes de hoy.

**Umbrales de decisión** (`.umb`: «Lo que decide lo siguiente», decisión del 10-10, circuito)

```html
<div class="umb-w">
  <div class="umb" role="img" aria-label="Primer intento: 9,0 a 9,3 s nada cambia; 9,4 a 9,7 s jueves con técnica; 9,8 s o más bloque técnico">
    <button class="ok" style="--w:4" aria-pressed="false"><b>9,0–9,3 s</b>Nada cambia</button>
    <button class="warn" style="--w:4" aria-pressed="false"><b>9,4–9,7 s</b>Jueves con técnica</button>
    <button class="bad" style="--w:5" aria-pressed="false"><b>9,8 s o más</b>Bloque técnico</button>
  </div>
  <p class="umb-t">«texto completo y literal del tramo elegido o del tramo en el que cae tu dato»</p>
</div>
```
```css
.umb{display:flex;gap:2px;border-radius:var(--r-sm);overflow:hidden}
.umb>*{flex:var(--w,1) 1 0;min-width:0;min-height:56px;padding:8px 10px;border:0;font:inherit;font-size:var(--fs-xs);line-height:1.3;display:flex;flex-direction:column;justify-content:center;text-align:left;cursor:pointer}
.umb b{font-size:var(--fs-sm);font-variant-numeric:tabular-nums}
.umb .ok{background:var(--ok-soft);color:var(--ok)} .umb .warn{background:var(--warn-soft);color:var(--warn)} .umb .bad{background:var(--bad-soft);color:var(--bad)}
.umb .elim{background:var(--elim);color:var(--ill-flag-txt);--w:2}
.umb>.tu{outline:2px solid var(--text);outline-offset:-2px}   /* tramo en el que cae tu dato */
.umb>[aria-pressed="true"]{box-shadow:inset 0 -3px 0 currentColor}
.umb-t{margin:var(--sp-2) 0 0;font-size:var(--fs-sm);color:var(--text-2)}
@media (max-width:599px){.umb{flex-direction:column}.umb>*{min-height:48px}}
```

Reglas de la barra `.umb`:

- **Dentro de cada tramo**, solo el rango (`b`) y una subcadena literal del efecto de **6 palabras como mucho**. El texto completo del tramo `.tu` (o del tramo tocado) va en la línea `.umb-t` de debajo. Por defecto, `.umb-t` enseña el tramo `.tu` o, si no hay dato, el primero.
- **Una barra, una variable.** Si la decisión tiene una regla de otra naturaleza (en el 10-10, «diferencia de 2 o más entre contadas y válidas»), va como línea aparte debajo de la barra, no como un tramo.
- **Toda barra de tiempos del 1.000** lleva un último tramo `.elim` estrecho: «3:49 o más · elimina», con `data-umbral="229"`.

**Lista con casillas y temporizador.** Es `.ex` y `.timer` de `sistema.css` (con `.timer` a 44 px). Cada fila: `button.ck` (44 px), `.nm` (nombre y `small`), `.tags` (chips de series, peso y reps) y `button.timer` (duración de descanso). Al tocar, el temporizador arranca con `PC.timer` (§10.3): cuenta con la hora de fin, no con pasos; a falta de 10 s y al llegar a 0 pita (`PC.audio`), destella y vibra si el dispositivo puede. Otro toque lo reinicia.

**Tira de la semana.** Es `.week` con 7 `button` (`aria-current="date"` en hoy), dentro de H-0. Cada botón lleva letra del día, número, icono de tipo (`carrera`, `fuerza`, `circuito`, `descanso`, `control`, `examen`, `prueba`) y clase de estado:

| Clase | Estado | Estilo |
|---|---|---|
| `.today` | hoy | fondo `--primary` |
| `.done` | hecho y válido | fondo `--ok-soft` |
| `.nomide` | hecho, no mide (`valida:false`) | fondo `--warn-soft`, punto ámbar |
| `.miss` | no hecho | borde `--bad` discontinuo, número tachado |
| `.noreg` | pasado sin registro | borde discontinuo gris |
| `.rest` | descanso | texto `--text-3` |
| `.key` | día clave | punto de 6 px en `--s2` |
| `[aria-pressed=true]` | día seleccionado | contorno de 2 px `--primary` |

La leyenda es un `details` de una línea («Qué significa cada color») y no está abierta por defecto.

**Gráfica**

```html
<figure class="chart" id="g-sueno" data-inv="G4" role="group" aria-labelledby="g-sueno-t">
  <figcaption class="chart-h"><h3 id="g-sueno-t">Sueño, noche a noche</h3><small>Fondo con los cortes del semáforo. Toca una barra.</small></figcaption>
  <div class="chart-c"><!-- svg al ancho real, role="img", aria-label calculado --></div>
  <div class="legend">…</div>
  <div class="pick" aria-live="polite">…ficha de la marca seleccionada…</div>
  <details class="acc datos"><summary>Ver datos<svg class="icon sm chev"><use href="#i-chev"/></svg></summary><div class="in"><div class="tscroll"><table class="t">…</table></div></div></details>
</figure>
```
```css
.chart{margin:0}
.chart-h{margin-bottom:var(--sp-2)} .chart-h small{display:block;color:var(--text-3);font-size:var(--fs-sm)}
.chart-c{position:relative;min-height:160px}
.pick{margin-top:var(--sp-2);padding:var(--sp-3);border-radius:var(--r-sm);background:var(--surface-2);font-size:var(--fs-sm);min-height:52px}
.pick b{font-variant-numeric:tabular-nums}
.chart svg .sel{stroke:var(--text);stroke-width:2}
.chart svg .dim{opacity:.35}
```

El tooltip flotante `.tip` **no se usa** en gráficas: se sustituye por la ficha fija `.pick`.

**Selector de gráfica** (Marcas › Gráficas, < 768 px): fila `.chips` con `button.chip` y `aria-pressed`; debajo, una sola `figure.chart`. Una gráfica sin datos no se pinta: su chip lleva `aria-disabled="true"` y, al tocarlo, `PC.toast` con el motivo («Aún no hay datos estructurados de ritmo a 145»). `title` no sirve en pantallas táctiles.

**Hoja** (detalle de un día en Plan, «Cómo fue» en Hoy; en escritorio, panel lateral)

```html
<div class="sheet-bg" hidden></div>
<aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-t" hidden><div class="grab"></div><button class="icon-btn sh-x" aria-label="Cerrar"><svg class="icon"><use href="#i-x"/></svg></button><h2 id="sh-t">…</h2>…</aside>
```
```css
.sheet-bg{position:fixed;inset:0;background:rgba(11,17,23,.45);z-index:60}
.sheet{position:fixed;left:0;right:0;bottom:0;max-height:88vh;overflow:auto;z-index:61;background:var(--surface);border-radius:var(--r-lg) var(--r-lg) 0 0;padding:var(--sp-2) var(--gutter) calc(var(--sp-6) + env(safe-area-inset-bottom));box-shadow:var(--sh-2);animation:sheet-in var(--dur-2) var(--ease)}
.sheet .grab{width:40px;height:4px;border-radius:2px;background:var(--border-strong);margin:0 auto var(--sp-3)}
.sheet .sh-x{position:absolute;right:8px;top:8px}
@media (min-width:1024px){.sheet{left:auto;top:0;width:440px;max-height:none;border-radius:0}}
@keyframes sheet-in{from{transform:translateY(24px);opacity:0}}
```

Se cierra con Esc, con un toque en el fondo o con el botón. El foco se queda atrapado dentro mientras está abierta.

**Modo pista y modo gimnasio**

```html
<div class="focus" id="focus" role="dialog" aria-modal="true" aria-label="Modo pista" hidden>
  <header class="focus-h"><button class="btn ghost" data-act="cerrar">Salir</button><span class="focus-t">6 × 400 · bloque A · verde</span><button class="btn ghost" data-act="sol">Contraste</button></header>
  <p class="focus-nota">En iPhone no vibra: sube el volumen.</p>
  <div class="focus-b"> <p class="focus-k">Repetición 3 de 6</p> <p class="big num">1:27</p> … </div>
</div>
<div class="destello" hidden></div>
```
```css
.focus{position:fixed;inset:0;z-index:80;background:var(--bg);display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 8px) var(--gutter) calc(env(safe-area-inset-bottom) + 16px);overflow:auto}
.focus-h{display:flex;align-items:center;justify-content:space-between;min-height:var(--tap)}
.focus-nota{margin:0;font-size:var(--fs-xs);color:var(--text-3)}
.focus .big{font:var(--fw-bold) var(--fs-4xl)/1 var(--font);letter-spacing:-.02em;margin:var(--sp-2) 0}
.focus-k{font:var(--fw-semi) var(--fs-lg)/1.2 var(--font);color:var(--text-2)}
.focus.sol{--bg:#FFFFFF;--surface:#FFFFFF;--surface-2:#F0F0F0;--text:#000000;--text-2:#1A1A1A;--text-3:#333333;--border:#000000;--primary:#003A8C}
.rep-btns{display:grid;gap:var(--sp-2)} .rep-btns button{min-height:64px;border-radius:var(--r-sm);border:2px solid transparent;font:var(--fw-bold) var(--fs-lg)/1.1 var(--font);display:flex;flex-direction:column;align-items:center;justify-content:center}
.rep-btns small{font:var(--fw-semi) var(--fs-sm)/1.2 var(--font)}
.rep-btns .ok{background:var(--ok-soft);color:var(--ok)} .rep-btns .warn{background:var(--warn-soft);color:var(--warn)} .rep-btns .bad{background:var(--bad-soft);color:var(--bad)}
.destello{position:fixed;inset:0;z-index:85;background:var(--text);opacity:0;pointer-events:none;animation:destello .6s ease-out 2}
@keyframes destello{0%{opacity:.85}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.destello{animation:destello .3s steps(1) 2}}
```

La línea `.focus-nota` solo aparece si `navigator.vibrate` no existe.

**Subnavegación**

```html
<nav class="subnav" aria-label="En esta pestaña"><a href="#marcas/nota" aria-current="true">Nota</a><a href="#marcas/controles">Controles</a>…</nav>
```
```css
.subnav{position:sticky;top:env(safe-area-inset-top);z-index:20;display:flex;gap:var(--sp-2);overflow-x:auto;scrollbar-width:none;padding:var(--sp-2) var(--gutter);margin:0 calc(-1*var(--gutter)) var(--sp-4);background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent)}
.subnav::-webkit-scrollbar{display:none}
.subnav a{flex:none;display:inline-flex;align-items:center;min-height:var(--tap);padding:0 14px;border-radius:var(--r-pill);background:var(--surface);border:1px solid var(--border);color:var(--text-2);font:var(--fw-semi) var(--fs-sm)/1 var(--font);text-decoration:none}
.subnav a[aria-current="true"]{background:var(--primary-soft);border-color:transparent;color:var(--primary)}
@media (min-width:1024px){.subnav{top:56px;flex-wrap:wrap;-webkit-mask-image:none}}
.sb-fondo{position:fixed;left:0;right:0;top:0;height:env(safe-area-inset-top);background:var(--bg);z-index:35}
@media (min-width:1024px){.sb-fondo{display:none}}
```

`aria-current` se actualiza con un `IntersectionObserver` sobre las secciones `[data-ancla]`.

**Línea temporal**

```html
<ol class="tl"><li class="hecho"><span class="dot"></span><b>sáb 19-9 · control</b><p>1.000 m en 3:34 · 11 dominadas (autoinformadas)</p></li><li class="futuro">…</li></ol>
```
```css
.tl{list-style:none;margin:0;padding:0}
.tl li{position:relative;padding:0 0 var(--sp-5) 28px}
.tl li::before{content:'';position:absolute;left:7px;top:18px;bottom:0;width:2px;background:var(--border)}
.tl li:last-child::before{display:none}
.tl .dot{position:absolute;left:0;top:3px;width:16px;height:16px;border-radius:50%;background:var(--surface);border:2px solid var(--primary)}
.tl li.hecho .dot{background:var(--primary)} .tl li.futuro .dot{border-style:dashed;border-color:var(--text-3)}
.tl li.hoy .dot{box-shadow:0 0 0 4px var(--primary-soft)}
```

**Lista clave-valor**, **notificación** y **estado vacío**

```css
.kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:var(--fs-sm);margin:0} .kv dt{color:var(--text-3)} .kv dd{margin:0;font-variant-numeric:tabular-nums}
.toast{position:fixed;left:50%;bottom:calc(var(--tabbar-h) + 16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;background:var(--text);color:var(--surface);padding:10px 16px;border-radius:var(--r-pill);font-size:var(--fs-sm);box-shadow:var(--sh-2)}
@media (min-width:1024px){.toast{bottom:24px}}
.empty{padding:var(--sp-6) var(--sp-4);text-align:center;color:var(--text-3);font-size:var(--fs-sm)}
```

**Regla** (Plan › Reglas)

```html
<article class="rule" id="r-dos-repeticiones" data-inv="R14"><h3>Dos repeticiones seguidas a más de 3 s: a casa</h3><p>Si pasa dos semanas seguidas, se bajan los ritmos.</p><details class="acc why"><summary>Origen…</summary><div class="in">…</div></details></article>
```
```css
.rule{padding:var(--sp-4) 0;border-top:1px solid var(--border)} .rule:first-child{border-top:0}
.rule h3{font-size:var(--fs-md);font-weight:var(--fw-bold)} .rule p{color:var(--text-2);margin:var(--sp-1) 0 var(--sp-2)}
```

**Entrada de tiempo** (solo el registro del circuito y el tiempo final del control; nunca en las repeticiones del modo pista)

```html
<label class="tin"><span>Intento 1</span><input inputmode="decimal" autocomplete="off" placeholder="9,4" aria-label="Tiempo del intento 1"><em class="dv ok">8 pts</em></label>
```
```css
.tin{display:grid;grid-template-columns:72px 1fr 72px;align-items:center;gap:var(--sp-2);min-height:var(--tap)}
.tin input{height:var(--tap);font:var(--fw-bold) var(--fs-lg)/1 var(--font);font-variant-numeric:tabular-nums;padding:0 12px;border:1px solid var(--border-strong);border-radius:var(--r-sm);background:var(--surface);color:var(--text);width:100%}
.tin .dv{font-style:normal;font-weight:var(--fw-semi);text-align:right} .dv.ok{color:var(--ok)} .dv.warn{color:var(--warn)} .dv.bad{color:var(--bad)}
```

Formatos que acepta `PC.fmt.parseT()`: `87,5`, `87.5`, `1:27`, `1:27,5`, `1.27.5`, `1,27,5`, `127,5` (tres cifras antes de la coma: minutos y segundos), `3:34`, `334` y `9,4` (circuito). En iOS el teclado decimal no tiene «:», por eso se aceptan las formas con coma y sin separador.

### 4.9 Iconos

Sprite propio incrustado una sola vez al principio del `body` (`<svg hidden><symbol id="i-…" viewBox="0 0 24 24">…`). Rejilla de 24, trazo de 1,75, extremos redondeados y `currentColor`. Sin emoji ni emblemas. La lista es cerrada:

`app` (cronómetro: el mismo dibujo que el icono actual de la app, extraído en `rediseno/icono_actual.png`) · `hoy` (sol con horizonte) · `plan` (calendario) · `marcas` (podio de tres barras) · `tecnica` (barra con dos manos) · `dieta` (cuenco) · `carrera` (cronómetro pequeño) · `fuerza` (mancuerna) · `circuito` (valla con travesaño y dos patas) · `descanso` (luna) · `control` (diana) · `prueba` (bandera de meta) · `examen` (lápiz) · `sueno` (cama) · `reloj` (reloj de muñeca) · `check` · `x` · `chev` · `mas` · `menos` · `play` · `pausa` · `temporizador` · `copiar` · `info` · `alerta` · `sol` · `luna` · `video` · `editar` · `flecha` · `lista`.

Favicon: el cronómetro `app` como SVG en data URI (menos de 2 KB), blanco y verde sobre `#16202B` como el icono actual. `apple-touch-icon`: el PNG actual, **una sola copia** (hoy va dos veces en base64 y son 32 KB). **El agente no se usa como icono**: a 28 px o menos es una mancha.

---

## 5. Pestaña por pestaña

Notación: `#id` es el contenedor, **[T1]** una herramienta de §6.2 y **[G3]** una gráfica de §6.3. Los datos se leen con las funciones de `PC` (§10.3). `web.json` es el archivo de datos propio de la web (§8.4).

### 5.0 Esqueleto común (M0)

- `<head>`: `lang="es"`, `<title>Plan Cádiz</title>`, `meta description` («Plan de preparación física para las pruebas de la Escala Básica: 1.000 m, dominadas y circuito»), viewport con `viewport-fit=cover`, dos `theme-color` con `media` (#F3F5F8 y #0B1117), las metas de app que ya existen (incluida `apple-mobile-web-app-status-bar-style` = `black-translucent`), favicon SVG, un `apple-touch-icon`, `preconnect` y Barlow 400;600;700, y el CSS en línea.
- Primer `<script>` del `<head>`, en línea y de menos de 1 KB: crea `window.__errores=[]` con los escuchadores `error` y `unhandledrejection`, y aplica `data-theme` desde `?tema=` o `pc-tema` antes de pintar, para que no haya destello.
- `<body>`: sprite de iconos → `.sb-fondo` → `.appbar` (solo se ve en escritorio) → `<main>` con las cinco `section.view` → `.tabbar` → `.sheet-bg` + `.sheet` → `#focus` → `.destello` → `#toast` → `<script id="datos" type="application/json">` → scripts de los módulos.
- Pie de cada vista (`data-inv="C5"`): «Datos hasta lun 28-9 · construido 29-9» y el conmutador de tema. La primera fecha es `D.derivados.datosHasta`, la última fecha de cualquier array del historial; la segunda, `D.fuente.construido`. Si la última sesión del plan anterior a hoy no tiene registro, se añade «· falta registrar mié 30-9».
- Impresión (`data-inv="C7"`): se muestran todas las vistas, sin barras, sin `.focus` ni `.sheet`, con los `details` abiertos (`details:not([open])>*:not(summary){display:block}` solo en impresión).

### 5.1 Hoy (M2)

**Qué responde:** qué toca hoy, en qué versión y cómo se apunta. **El orden es fijo** a cualquier hora (§0.7).

**Móvil, de arriba abajo:**

| # | Bloque | Contenido | Interacción | Datos | `data-inv` |
|---|---|---|---|---|---|
| H-0 | `#hoy-cab` Cabecera y camino | **Fila 1:** `h1` «martes 29 de septiembre» y, debajo en `small`, «bloque A · Trabajo específico» (título de la semana); a la derecha, el chip de nota «4,67 · no apto» (§4.8, enlaza a `#marcas`). **Fila 2:** el camino **[G11]**, 56 px: línea del 14-9 al 30-10 con los bloques A, B y C como segmentos finos con su letra, los días clave como puntos y el agente en carrera (24 px) en la fecha de hoy; al final, el banderín «Cádiz · ≥ 27 días» con `title` «fecha sin confirmar: última semana de octubre». **Fila 3:** la tira `.week` de lunes a domingo, con botones ‹ y › (44 px) para cambiar de semana, y la leyenda plegada en una línea | Tocar el camino → `#plan/calendario`. Tocar un día → H-1 enseña ese día (`#hoy/AAAA-MM-DD`) con el chip «Volver a hoy» | `derivados.bloques`, `derivados.hitos`, `PC.cal.semana`, `derivados.marcas` | C2, C3, H2, H8 |
| H-1 | `#hoy-ses` Tarjeta del día (`.card.hi`) | Ver la composición fija justo debajo | Lámparas, condición, casillas, temporizadores, modo pista o gimnasio, «Cómo fue» | `PC.cal.dia`, `web.dias[f]`, `sesionesTipo`, `ritmos`, `reglas` | H2, H3, H4, H5, R12, E1, E2, E5, E7, E8, E9, E10, S2, S4, S5, S6, S7, S10, S13, S14, S15 |
| H-2 | `#hoy-decide` «Lo que decide lo siguiente» | Si no queda ninguna decisión por delante, el bloque no se pinta. Si queda, la siguiente entrada de `web.decide` con fecha igual o posterior a hoy: título («Jue 1-10 · circuito, primer intento cronometrado como el BOE») y una o varias barras `.umb`. Si ese día ya hay dato registrado en este móvil, el tramo en el que cae lleva `.tu`. En las barras del 1.000, el tramo «3:49 o más · elimina». Debajo, el aviso fechado de `web.avisos` con `donde:"hoy"` | Tocar un tramo → su texto completo en `.umb-t`. Enlace a Técnica › Circuito o a la hoja del día en Plan | `web.decide`, `web.avisos` | H11 |
| H-3 | `#hoy-noche` Esta noche | Una línea. Entre semana: «Cena terminada antes de las 20:15 · luz apagada a las 22:15». La hora de la cena se calcula restando 2 h a `atleta.horaApagarLuz`. Jueves: «Del circuito a la cama». Viernes y sábado: «El fin de semana, como mucho 1 h de diferencia» | — | `plan.reglas[dormir]`, `atleta.horaApagarLuz` | R1 |
| H-4 | `#hoy-pend` Pendientes | Una sola línea, solo si hay alguno sin marcar: «3 pendientes →», que abre `#plan/decisiones` | Enlace | `web.pendientes`, `pc-pend` | H16 |

**Composición fija de la tarjeta H-1** (de arriba abajo; lo que no aplica ese día no se pinta y no deja hueco):

1. **Cabecera** `.card-h`: icono del tipo, título (`web.dias[f].titulo` o, si falta, el primer tramo de `sesion`, sin la hora inicial «21:30 », hasta «:», «(», «+» o «·», con mayúscula solo al principio), `small` «hoy · 18:00–19:30 · Arsenal · bloque A» y, al final, el chip de versión («Verde», «Ámbar», «Rojo», «No se entrena» o `.chip.sup` «semáforo sin rellenar»).
2. **Aviso de conflicto del día** (§3.4.6), si el día lo tiene. Hoy solo el 10-10 (K5).
3. **Fila del semáforo [T1]**, solo en la tarjeta de hoy:
   - **abierta** mientras no hay semáforo guardado hoy: rótulo «¿Cómo has dormido? (Garmin, sin la siesta)», las tres lámparas y una línea «Reloj normal · sin síntomas · sin dolor» con el botón «Cambiar», que despliega el resto (§6.2 T1). Alto máximo: 200 px con «Cambiar» cerrado;
   - **cerrada** en cuanto se toca una lámpara: una línea con la lámpara, «Verde · 7h05» (o solo «Verde» si no hay minutos), la consecuencia en una frase («Sesión como está escrita. Es la única que mide.») y «Cambiar». Si el día tiene su propio `semaforo`, la frase es ese texto literal (§3.4.7).
   - Mientras está abierta, la tarjeta ya enseña la versión verde con el chip «semáforo sin rellenar».
4. **Fila de condición [T11]**, si el día tiene `condicion` (a 29-9: 3-10, 5-10, 6-10, 12-10, 14-10, 15-10, 17-10, 19-10, 21-10 y 24-10; lista completa en §6.2 T11) o está entre el 21 y el 30-10 con `pc-prueba` vacío.
5. **Números del día** (`.stats`, 3 como mucho, del color y de la opción de condición elegidos).
6. **«Hoy haces:»** y la variante literal del color, recortada a 3 líneas con «más» (`-webkit-line-clamp`).
7. **Chips** de la sesión: primer 200, freno y aviso del reloj (series); «UN intento» o «3 intentos» (circuito).
8. **Pasos** (`.ex`) con casilla, temporizador y enlace «Técnica →». Los jueves, el registro del circuito **[T8]** va aquí, dentro de la tarjeta.
9. **Plegados:** «Configura el reloj» y «Por qué» (`porQue`, `regla`, `nota`, `protocolo`, `medir`, `decide` y `registro` del día, literales, cada uno con su rótulo).
10. **Pie** `.card-f`: `.btn.pri.lg` **Modo pista** (carrera, control o prueba) o **Modo gimnasio** (fuerza) **[T2/T3]**, y `.btn.sec` «Cómo fue» **[T4]**.
11. **Franja** `.franja` desde la hora de fin de la sesión (`PC.cal.horaFin`, §10.3) hasta las 23:59: «¿Ya has terminado? Apunta cómo fue →», que abre la hoja «Cómo fue». Si ya hay «Cómo fue» guardado hoy: «Apuntado · Copiar otra vez». Si no hay hora de fin calculable, la franja no aparece (el botón del pie sigue).

**Variantes de la tarjeta:**

- **Descanso:** `.card.flat`. Título «Descanso», la `sesion` literal del día (§3.4.8), `reglas[descanso]` plegada y «Mañana: <tipo> · <sesión>». Sin botones de modo. La fila del semáforo aparece cerrada con «Anotar la noche (opcional)».
- **Examen:** la `sesion` del día, literal.
- **Día pasado** elegido en la tira: «Registrado» (resumen, validez y valoración de `historial`) en lugar de los pasos, sin semáforo ni modo pista. Si no hay registro pero hay línea en `web.hechosAntiguos[fecha]`, esa línea con el chip «de la web antigua». Si no hay nada: «Sin registrar».
- **Día futuro:** la versión verde con el chip «futuro», sin semáforo ni botones de modo.
- **Del 21 al 30-10** con `pc-prueba` vacío: la fila de condición pregunta «¿Cuándo es la prueba? 26–27 · 28–30», y elige la versión de `derivados.final`.
- **Sin sesión en el plan:** `.empty` «El plan no tiene sesión para hoy» y la siguiente sesión.

**Escritorio (≥ 1024):** H-0 a todo el ancho. Debajo, `grid-template-columns: 7fr 5fr`: a la izquierda H-1; a la derecha H-2, H-3 y H-4.

**Cómo se componen los pasos de H-1** (`PC.sesion.pasos(dia, color, opcion)`, M2). Si `web.dias[f].pasos` existe, **manda** y no se compone nada. Si no, se elige la plantilla: `web.dias[f].plantilla` si está; si no, `carrera` con `principal` (derivado o escrito) → `series`; `carrera` sin `principal` cuya `sesion` nombra «rodaje» → `rodaje`; el resto, por su `tipo`. El número de repeticiones en ámbar sale de `web.semaforo.recortes`; el texto de la versión, de la variante del día si la trae y, si no, de la genérica:

| Plantilla (tipo del día) | Pasos |
|---|---|
| `series`: carrera con `principal` (derivado o de `web.dias[f]`) | 1) Calentamiento estándar con los 6 pasos de `sesionesTipo.calentamientoEstandar.pasos`. El paso 3 solo si la sesión nombra «dominadas» (entonces duración `duracionConDominadasMin`, si no `duracionMin`). Lleva la nota `obligatorio` del prep-hombro y el enlace a `#tecnica/dominada`. 2) Parte principal: una fila por repetición según `principal`, con el temporizador de recuperación. 3) Vuelta a la calma: `vueltaALaCalma.detalle`. **Ámbar:** la parte principal pasa a las repeticiones de `web.semaforo.recortes` y se añade un paso «15-20 min con techo 145». **Rojo:** un único paso con el texto `web.semaforo.generico.carrera.rojo` |
| `rodaje` | Sábados 3 y 17-10, primero la «Barra corta» (`protocoloDominadas.cuando[Sábado].prescripcion` y el `objetivo` del día). Después, el rodaje con la duración de la `sesion`, techo 145 y los diez primeros minutos a 140 (`ritmos[RS].reglaDeSalida`). Si la sesión nombra progresivos, un paso con su número y distancia. Los sábados, el complemento de `sesionesTipo.sabadoComplemento.bloques`. **Rojo:** «30-40 min con techo 145» si la sesión era más larga |
| `fuerza` | `martesFuerza.calentamiento` → `aproximacion` → A → H → B+D → C+F → E+G → I (orden de `superseries.pares`). Series, repeticiones, peso y descanso de `bloques[]`, cambiados por `web.dias[f].fuerza[color]` y, si hay condición, por `condicion.opciones[elegida].fuerza`. Al pie, la última frase de `martesFuerza.prioridad`, literal: «Si falta tiempo: A, H, B, D y a casa.» El resto de `prioridad` va en «Por qué» |
| `circuito` | `juevesCircuito.bloques` en orden. El número de intentos sale de la `sesion` del día («3 intentos» o «UN intento»). Arriba, la línea `juevesCircuito.regla`. El bloque técnico solo aparece con su condición literal. El registro [T8] va dentro |
| `control`, `prueba` | Solo `web.dias[f].pasos`, que M1 escribe para el 10-10 y el 24-10 a partir de `sesion`, `protocolo` y `objetivo`. En la prueba, la `sesion` de la versión elegida |
| `descanso`, `examen` | Sin pasos |

**«Configura el reloj»** (`PC.sesion.reloj(dia)`) se genera así, y la misma función sirve para Técnica › Reloj:

| Tipo | Líneas | Fuente |
|---|---|---|
| Series y kilómetro partido | «Pasos por distancia, sin Auto Lap» · «Rango de ritmo 3:30-3:40 /km en cada paso de series» · «Primer 200 por reloj: 0:43,5» (el del bloque del día) · «Freno: si un 400 baja de 1:24, la siguiente sale más lenta» (la cifra del freno sale del `objetivo` del día o de `ritmos[bloque].avisoReloj`) · «Perfil Pista, calle 1» si el `lugar` lo dice | `reglas[medir-distancias]`, `ritmos[bloque].avisoReloj`, `ritmos[bloque].primer200`, `objetivo`, `lugar` |
| Rodaje | «Alerta de FC máxima 145 ppm; los diez primeros minutos, 140» · «Sin alerta de ritmo en rodajes» · con progresivos: «Paso de 100 m con objetivo de ritmo 3:20-3:50 /km» | `ritmos[RS]`, texto E32, `ejercicios[progresivos].tecnica[4]` |
| Control del 10-10 | Las frases del `protocolo` del día sobre el botón de vuelta y el aviso de ritmo, literales, **debajo del aviso de conflicto K5** | `calendario[10-10].protocolo` |
| Fuerza | La frase de Garmin sobre la sentadilla (`web.textos.S10garmin`) | HTML S10 |
| Circuito | No se muestra el bloque | — |

### 5.2 Plan (M3)

Cabecera `.vh`: «Plan» y la línea generada «Bloque A hasta el dom 4-10 · después, bloque B a 1:26 / 2:08». Subnavegación: Calendario · Semana · Ritmos · Zonas · Reglas · Decisiones.

| # | Bloque | Contenido | Interacción | Datos | `data-inv` |
|---|---|---|---|---|---|
| P-1 | `#pl-cal` Calendario (`data-ancla="calendario"`) | **[T9]** rejilla L–D desde el lunes 14-9 hasta el domingo 1-11. Es también la línea temporal del plan: antes de cada semana, una fila `.cal-sem` con rango, título, chip del bloque («A · 1:27 / 2:11») y una banda de color a la izquierda del bloque; su `nota` va plegada. Los días clave llevan punto; desde 600 px, además, su rótulo corto. La ventana 26–30 va rayada con el icono de prueba y «la fecha llega con el llamamiento». Las semanas anteriores a la actual quedan plegadas en «Semanas pasadas (2)». Encima de la última semana, `.seg` «La prueba es: sin confirmar · 26–27 · 28–30» | Tocar un día → `.sheet` con la tarjeta del día en modo lectura (el mismo componente que H-1) y «Abrir en Hoy» | `derivados.dias`, `derivados.bloques`, `derivados.hitos`, `derivados.final`, `pc-prueba` | P12–P18, P9, S14 |
| P-2 | `#pl-semana` Semana tipo | Siete filas en móvil (siete columnas desde 768 px): icono, día, `contenido` y `hora`. Icono de barra en los días con dominadas (lunes y miércoles 3 × 5, martes lastradas, sábados 3 y 17). Encima: «Tres días de carrera, uno de fuerza y uno de circuito». Es la única casa de «cuándo hay barra»: Técnica › Dominada enlaza aquí | — | `estructuraSemanal`, `protocoloDominadas.cuando` | P1, P2, E3, E12 |
| P-3 | `#pl-ritmos` Ritmos | **[G14]** escalera A → B → C: tres tarjetas en fila (en columna en móvil) con `cuando`, 200/400/600 y ritmo de 1.000. La del bloque actual va en `.card.hi`. Entre B y C, una «compuerta»: chip «decide el sáb 10-10» con la `condicion` de C literal. En B, su `condicion` plegada. **Debajo de la escalera, una escala del ritmo de 1.000 de cada bloque** (3:38 · 3:34 · 3:32 → 3:30) sobre un eje de 3:25 a 3:52 con la línea «3:30 objetivo» y la línea roja «3:49 elimina» (`data-umbral="229"`). Después, una tabla `.tscroll` con RS, TR y VEL (clave, ritmo o pulso, regla de salida o criterio del 12-10) y dos líneas: primer 200 por bloque (`primer200`) y aviso y freno (`avisoReloj`). Cada `porQue`, plegado | Tocar una tarjeta → sus porqués | `ritmos[]`, `derivados.bloques` | P8, P9 |
| P-4 | `#pl-zonas` Zonas y termómetros | Cabecera: «FC máx ≥ 203 (28-9) · reposo 45 · zonas por FCR». **[G13]** barra de zonas Z1–Z5 con su `uso`, las marcas 140 y 145 y la banda 166–172 rotulada «umbral · sin sesiones hasta Cádiz». Línea «El techo 145 y el umbral 166–172 no suben», con el porqué plegado (`porQueNoSubeElTecho`). Los tres termómetros en `.kv`: normal, alarma y estado; el tercero lleva `.chip.sup` «no verificado». Enlace «Ver los termómetros en Marcas →» | — | `zonasFC`, `atleta.fcMaxima`, `atleta.fcMaximaNota` | P4, P5, P6, P7 |
| P-5 | `#pl-reglas` Reglas (`data-ancla="reglas"`) | Cuatro grupos de `.rule`. **Por la mañana:** semáforo (título, una línea y el texto completo de `dia-torcido` plegado, con «Hacerlo ahora →» a `#hoy`), regla del cuello y alarma de talón (`lesiones.pies`, última frase). **Durante:** dos repeticiones, prep-hombro obligatorio (solo título y «Técnica de la dominada →»), parada del cintillo (solo la frase «Regla de parada…» de `lesiones.cintillo`) y medir distancias. **Por la noche:** dormir (con su origen plegado). **La semana:** descanso y no testear de más (solo título y enlace a `#tecnica/dominada`, donde vive `protocoloDominadas.reglas[6]`). Cada regla: título, primera frase visible, resto y `origen` en «Por qué» | Plegados | `plan.reglas[]`, `lesiones`, `protocoloDominadas.reglas` | R1, R2, R9, R10, R11, R12, R13, R14, P10, H5 |
| P-6 | `#pl-decisiones` Decisiones y pendientes | Lista `.tl` compacta de `web.decisiones`: fecha, una línea y «Por qué» plegado. Debajo, «Pendientes» con casilla (`web.pendientes`, se marcan en `pc-pend`; al pie, «Se marcan en este móvil»). Plegado, «Pendiente de decidir por el entrenador (n)» con el Anexo D | Casillas y plegados | `web.decisiones`, `web.pendientes`, `web.pendientesEntrenador` | P11, H6, H16 |
| P-7 | `#pl-porque` «Por qué el plan es así» (plegado) | Revisión del 23-9: `veredicto`, `razones` y `loQueSiCambia`. Revisión del 28-9: `pregunta`, `veredictoDominadas`, `palancaPrincipal`, `expectativa` (chip «supuesto»), `sueno` y `loQueNoCambia`. Objetivo nuevo del 23-9: `comoSePersigue`, `condiciones`, `riesgo` y `actualizacion28sep`. Cada grupo con su fecha. **No se muestran** los campos `metodo` ni `queDecideLoQueFalta` (caducado; su contenido vivo está en `web.decide`) | Plegado | `revision23sep`, `revision28sep`, `objetivo.objetivoNuevo23sep` | P11 |

No hay una línea temporal aparte en Plan: el calendario ya lleva los bloques, los hitos y la ventana de la prueba. El camino con el agente vive solo en Hoy.

### 5.3 Marcas (M4)

Cabecera `.vh`: «Marcas» y la línea «Datos hasta lun 28-9». Subnavegación: Nota · Controles · Gráficas · Registro · Cuerpo.

| # | Bloque | Contenido | Interacción | Datos | `data-inv` |
|---|---|---|---|---|---|
| M-1 | `#mc-nota` Tu nota y simulador (`data-ancla="nota"`) | **Una sola tarjeta**: la nota **es** el simulador en el estado «Hoy». Composición en la lista de debajo | Chips de escenario, deslizadores, «Detalle» por prueba y plegados | `derivados.marcas`, `escenariosNota`, `baremo`, `sensibilidad`, `diagnostico`, `marcasActuales`, `objetivo.reglaDeNota` | H8, H9, H10, N1, N2, N3, N5, G1, G2, C3 |
| — | Aviso fechado | `web.avisos` con `donde:"marcas"`: el texto literal de la caja H11 («Todo esto descansa sobre un número que no existe…»), hasta el 1-10, justo debajo de la fila del circuito | — | `web.avisos` | H11 |
| M-2 | `#mc-controles` Controles (`data-ancla="controles"`) | **Cabecera: [G3]** evolución del 1.000. Debajo, `.tl` con los controles de `derivados.controles` (31-8, 19-9, 10-10, 24-10 y la prueba). Los hechos muestran 3 cifras, una tira de parciales de 200 (cada celda con el tiempo y su diferencia con 42,0; fondo `--warn-soft` si es más lenta y `--ok-soft` si es igual o más rápida; al final de la tira, la referencia «ritmo del 3:49 · 45,8 s», con `data-umbral="229"`) y «Qué cambió» en una línea. Los futuros muestran el `objetivo` literal del calendario (en el 10-10, con el aviso K5) y «Qué decide» (enlace a H-2 o a la hoja). Conmutador «Superponer perfiles» → **[G3b]**. En el 19-9, plegado «Diagnóstico del control»: **[G12]** y los textos `web.textos.diag19` («La salida», «Por qué te sentiste débil», «Recuperación»). Una línea: «Lo que hace comparables dos controles: misma hora, pista medida y vídeo» (texto G9) | Conmutador y plegados | `derivados.controles`, `historial.carrera` (31-8 y 19-9), `historial.evolucionEstimacion`, `calendario` | H7, G3, G8, G9, G10, G11 |
| M-3 | `#mc-graficas` Gráficas (`data-ancla="graficas"`) | **Por debajo de 768 px, una gráfica cada vez**: fila de chips «Series · Sueño · Barra · Circuito · Pulso · Carga» (§4.8) y debajo la gráfica elegida: **[G5]**, **[G4]**, **[G6]**, **[G7]**, **[G8]** o **[G9]**. Se recuerda la última elegida en `pc-graf`; la primera vez, «Series». **Desde 768 px**, todas en `.grid-2`, sin chips; las que no tienen datos no se pintan y una línea al pie las nombra con su motivo | Chips, selección fija y ficha `.pick` | historial | G4, G6, G7, P7 |
| M-4 | `#mc-registro` Registro (`data-ancla="registro"`) | **[T10]** | Filtros y desplegar | `historial.*` | G12, G13, E15 |
| M-5 | `#mc-cuerpo` Cuerpo (`data-ancla="cuerpo"`, plegado) | Una línea: «Composición con la Tanita del dietista, 23-9: 66,5 kg · 11,0 % de grasa · grasa visceral 1». **[G16]** peso, músculo y grasa en tres minigráficas (solo la serie del dietista: `composicion[].serie=="dietista"`). `.kv` con los valores del 23-9. Segmentales plegados. Aviso literal `atleta.composicion.avisoBasculas`. **Ninguna recomendación de peso** | Plegado | `historial.composicion`, `atleta.composicion` | G14 |

**Composición de M-1** (de arriba abajo, fija):

1. **Título-conclusión** calculado **siempre con las marcas reales**, aunque se esté simulando: «Con las marcas de hoy no apruebas: 4,67»; con apto, «Con las marcas de hoy apruebas: 5,33»; con un cero, «Con las marcas de hoy quedas eliminado por las dominadas».
2. **Estado y media:** rótulo del estado («Marcas de hoy», el nombre corto del escenario elegido o «Simulado» con `.chip.sup`), `.stat.hero` con la media de ese estado, el chip del resultado (`warn` NO APTO, `ok` APTO, `bad` ELIMINADO) y la regla en una línea: `objetivo.reglaDeNota`. En estado simulado, el botón «Volver a hoy».
3. **[G1]** pista de la nota (§6.3), **una sola vez en toda la web**.
4. **Chips de escenario**, los 5 de `escenariosNota` en su orden. Rótulo del chip: el `nombre` cortado antes del primer « (» o «:» («Marcas de hoy», «Realista», «Objetivo nuevo», «Con el kilómetro bajado», «Objetivo»). Debajo, el `nombre` completo y su `nota` o `razon` en una línea; el resto (`porQueNoEsEstancamiento`), plegado.
5. **Tres filas, en el orden de la prueba** (circuito → dominadas → 1.000 m). Cada fila:
   - rótulo, valor grande (`9,9 s` · `11` · `3:34`), chip de puntos y chip de fiabilidad (1.000 «medido» relleno; dominadas «autoinformado» y circuito «al 60 %» con `.chip.sup`);
   - el deslizador **[T5]** con la pista del baremo **[G2]** (mejor a la derecha, tramo que elimina en rojo a la izquierda con su rótulo anclado, raya en la marca real);
   - la **marca de corte viva [G10]**: una raya discontinua sobre la pista en la peor marca que todavía da un 5,00 con los valores actuales de las otras dos filas, rotulada «para el 5,00: 9,7 s o menos» (con las marcas de hoy: 3:34 y 11 dan 8 puntos y el circuito tiene que dar 7; en dominadas, «12 o más»; en el 1.000, «3:30 o menos»). Si ninguna marca llega, «con estas dos no llega»; si cualquiera vale, «cualquier marca que no elimine»;
   - una línea «siguiente punto: 9,7 s (−0,2 s)»;
   - un `details` «Detalle» con la escena de esa prueba (**[I4]** valla, **[I3]** barra, **[I2]** pista del 1.000), que sigue al valor del deslizador, y los textos literales de `marcasActuales.*` (`base`, `margen`, `margenALaEliminacion`, `supera`, `aviso`, `protocolo`, `condiciones`, `urgente`).
6. **Cuánto aguanta el escenario realista** (plegado): `sensibilidad.nota`; las filas de `sensibilidad.circuito` y `sensibilidad.dominadas` como `.kv` («9,0 s → 5,67», «10,2 s → 4,67 · punto de rotura»); visible fuera del plegado, la línea `peorCasoQueTumba`; dentro, `riesgoRealDeLasDominadas` con el enlace «Contar válidas →» (`#tecnica/dominada`) y `cuestaCadaPunto` en tres líneas.
7. **El diagnóstico**: la primera frase de `diagnostico.resumen` visible y el resto plegado.
8. **Baremo completo, hombres** (plegado): `table.t` de 11 tramos × 3 pruebas en `.tscroll`, con `.chip` «BOE-A-2026-15055 · verificado el 19-9». **No se muestra** `baremo.erroresCorregidos`.

No hay otra tarjeta de sensibilidad ni otra pista de la nota: la gráfica G10 de la versión anterior se convierte en la marca de corte viva, que vale para cualquier combinación y no solo para el escenario realista.

### 5.4 Técnica (M5)

Cabecera `.vh`: «Técnica» y, como línea de contexto, **las tres pruebas en orden** (`#te-pruebas`, `data-inv="N4"`): «El día de la prueba: circuito → dominadas → 1.000 m» con los tres iconos, cada uno enlazado a su sección, y debajo la línea literal de intentos (texto N4: un intento en dominadas, segundo intento del circuito solo si nulo, «no suman a la nota final»). Subnavegación: **Dominada · 1.000 · Circuito** · Gimnasio · Carrera · Reloj · Material (lo que se consulta en la pista va primero).

| # | Bloque | Contenido | Interacción | Datos | `data-inv` |
|---|---|---|---|---|---|
| TE-1 | `#te-dominada` Dominada (`data-ancla="dominada"`) | **[I5]** lámina técnica: 4 paneles, carrusel deslizable en móvil (`scroll-snap`) y 2 × 2 en escritorio, titulada «Qué mira el tribunal en tu vídeo». **La leyenda de la lámina es la lista**: una sola `ol` con las 9 reglas literales del BOE, más la posición inicial (PI-1, PI-2 y PI-3) y «nula»; tocar un número resalta su marca en el dibujo y al revés. La frase literal de `planDeCarrera.examen.dominadas` («Hacer 13 por tu cuenta para que el tribunal cuente 12…»). **[T7]** Contador de válidas. Escalera del lastre **[G15]** con la semana actual resaltada y las pasadas en gris. «Reglas de la barra»: las 11 de `protocoloDominadas.reglas` como `.rule` (esta es su única casa; aquí vive «No testear de más», `reglas[6]`). Prep-hombro: `ejercicios[prep-hombro].tecnica` y `porQueAntesDeCorrer` plegado. Plegado: `revision28sep.expectativa` y `objetivoDaniel28sep` con el chip «supuesto». Una línea: «Cuándo hay barra: Semana tipo →» (`#plan/semana`) | Lámina, contador y plegados | `protocoloDominadas`, `planDeCarrera`, `ejercicios` | E5, E11, E12, E13, E14, H6, S4 |
| TE-2 | `#te-mil` 1.000 m (`data-ancla="mil"`) | **[T6]** Reparto con carrera fantasma. Los 4 `consejos` como lista. `reglaDeSalida` literal. «Suelo 3:36 · 3:49 elimina · margen previsto» (`suelo`, `elimina`, `margenPrevisto`). La comida del día de la prueba (`planDeCarrera.examen.comida`). «Superficie de tartán. Prohibido correr descalzo o con clavos.» (texto N7) con `.chip.sup` «sin verificar». Plegado «Cádiz»: la frase del nivel del mar (texto N6) y la del clima con `.chip.sup` «supuesto», más `planDeCarrera.examen.pendiente` | Herramienta | `planDeCarrera.examen`, `historial.carrera[19-9]` | N6, N7 |
| TE-3 | `#te-circuito` Circuito (`data-ancla="circuito"`) | **[I4]** escena de la valla: cronómetro hueco «¿? sin medir» hasta que haya un primer intento válido en `historial.circuito` o en este móvil; después, la cifra. Líneas: **cómo se cronometra**, literal de `juevesCircuito.bloques[1].detalle` («Cronometrar como el examen: voz de «ya» hasta el pie en el suelo tras la última valla…»); el primero es el comparable y el mejor el techo; «Solo el circuito y fresco. Nada de piernas por la mañana». `.umb` con `decisionSegunEl24`. **El último registro del jueves, en lectura** (intentos, nulos y puntos, de `historial.circuito` o de `pc-cir-*`), con «Se registra el jueves en Hoy →». Enlace al texto oficial: «Recorrido y normas: BOE-A-2026-15055 →» (`https://www.boe.es/buscar/doc.php?id=BOE-A-2026-15055`). **No se dibuja recorrido, ni conos, ni picas, ni se pone ningún chip de «pendiente»**: el recorrido se dibujará cuando alguien haya leído el gráfico del anexo del BOE (Anexo D, K17) | Enlace | `sesionesTipo.juevesCircuito`, `historial.circuito`, `pc-cir-*` | E7, E8 |
| TE-4 | `#te-gimnasio` Gimnasio (`data-ancla="gimnasio"`) | Entradilla: «Martes · Arsenal · unos 85 min con superseries» (`martesFuerza.duracionMin`, `hora`). Una ficha `.card` por ejercicio, en el orden del martes: prep-hombro, dominadas lastradas (enlace a la lámina), jalón, remo, sentadilla, peso muerto rumano, fondos, pájaros, elevación de piernas y plancha, y glúteo medio (con los tres ejercicios de `martesFuerza.bloques[H].detalle` y su `formato`). Después, «Sábados»: elevación de talón y saltos. Cada ficha: nombre, chips de material, **lámina [I6] «Qué mirar en tu vídeo»** (obligatoria en sentadilla, peso muerto rumano, remo y elevación de talón; en el resto, si está hecha), las 3 primeras líneas de `tecnica` en `ol` y el resto tras «Más». En la sentadilla, la frase literal `web.textos.S10garmin` («En Garmin es «Sentadilla con barra», NO «Sentadilla frontal»: esa lleva la barra delante y es otro ejercicio»). Enlace secundario «Vídeo» (búsqueda de YouTube con la consulta de `web.videos`; si no existe, «<nombre> técnica»). Ancla por ficha: `#tecnica/ej/<id>` | Plegados y leyenda de lámina | `ejercicios[]`, `sesionesTipo.martesFuerza`, `web.videos` | E1, E17, E18, E19, E20, E21, E22, E26 |
| TE-5 | `#te-carrera` Carrera (`data-ancla="carrera"`) | Calentamiento estándar como línea temporal (`.tl`) con los 6 pasos y su `obligatorio` · vuelta a la calma · progresivos · técnica de carrera · series cortas · series largas · kilómetro partido (fichas desde `ejercicios[]`) · enlace a la regla de las dos repeticiones (`#plan/reglas`). **No se muestran** `ejercicios[umbral]` ni `ejercicios[simulacro]` (Anexo D) | Plegados | `sesionesTipo`, `ejercicios[]` | E16, E23, S2, S5, S6, S7, S8 |
| TE-6 | `#te-reloj` Reloj (`data-ancla="reloj"`) | Configuración: `atleta.relojConfigurado` y `fcMaximaNota`, literales. «Qué programar en cada sesión»: tabla generada con `PC.sesion.reloj()` para series, kilómetro partido, rodaje, rodaje con progresivos y control. «Crear una sesión en Garmin Connect» (texto E28), con el chip «ruta sin verificar». Plegados: alternativa rápida desde el reloj (E31) y alertas (E32, sin las de umbral). «Exportar el archivo original» (texto E34) | Plegados | `atleta`, `ritmos`, `web.textos` | E28, E30, E31, E32, P4, P10, H16 |
| TE-7 | `#te-material` Material y salud (`data-ancla="material"`) | Lista `.kv` con estado. Zapatilla (`atleta.zapatillas`; plantillas de ICOT, con el enlace al pendiente). Banda (`atleta.banda`). Lastre (`protocoloDominadas.lastre`, `atleta.lastreDisponible`). Pista (`contextoDelUsuario.pista`, chip «homologación sin confirmar»). Barra de Arucas (`contextoDelUsuario.barraArucas`). Cronómetro para el circuito (texto E34). **Salud:** pies (`lesiones.pies` y los 5 pasos de E33), cintillo (`lesiones.cintillo` sin la frase del umbral de los miércoles) y suplementos (textos R6–R8 con las correcciones de §5.8; tabla plegada; dopaje plegado) | Plegados | `atleta`, `contextoDelUsuario`, `lesiones`, `web.textos` | E33, E34, R6, R7, R8, R9 |

### 5.5 Dieta (M7)

La lógica se conserva (§9.1). Maqueta:

1. Cabecera `.vh` «Dieta» y la línea «Tu pauta con la nutricionista. Aquí no se modifica.» (`data-inv="D1"`).
2. `#di-entreno` (`data-inv="R3,R5,D14"`), `.aviso.info` «Alrededor del entreno». Solo los días con sesión a una hora conocida. Ejemplo: «Hoy entrenas a las 18:00. Comida principal entre las 14:00 y las 15:00 (3–4 h antes, 80–100 g de hidratos más proteína); algo ligero entre las 16:30 y las 17:00 (60–90 min antes). Sin cafeína después de las 14:00». Las horas se restan a la de inicio de `PC.cal.horaIni(dia)`; los textos son de `reglas[comer]` y `reglas[dormir]`. El 10-10 y el día de la prueba, además, `planDeCarrera.examen.comida`.
3. `#di-calidad` (`data-inv="R4,D14"`), `button.chip.pri` (solo si `web.dias[hoy].calidad === true`): «Hoy hay series: gofio de la merienda a 40 g». Al tocarlo se pulsa el botón «Día de calidad» de `#lg-modo`. **Nunca se activa solo**.
4. La app tal cual (`data-inv="D2,D3,D4,D5,D6,D7,D8,D9,D10,D11,D12"`): panel de macros fijo (en móvil `top: env(safe-area-inset-top)`, en escritorio `top: 56px`), días (`#lg-dia`, empezando en el día de hoy), modos (`#lg-modo`), restablecer, registro, PDF, intercambio y comidas.
5. Pie de una línea (`data-inv="D13"`): «Valores aproximados. Pesos en crudo. La pauta es de tu nutricionista: si quieres cambiar algo, háblalo con ella.»

---

### 5.6 Reglas de reparto aplicadas

- Lo **ESENCIAL** va visible en un componente.
- Lo **SECUNDARIO**, plegado o en una línea.
- Lo **HISTÓRICO** va a Marcas › Registro o Controles, o a Plan › «Por qué el plan es así», siempre con fecha.
- Lo **OBSOLETO** se corrige con el dato vigente o se elimina (§5.8).

### 5.7 Reparto completo del inventario

La tabla es la ley de «una casa por dato». La genera `_v2/gen_inventario.py`, que escribe también `inventario_ids.json` (140 ID, 18 eliminados); la QA la usa (§10.6). Los identificadores (C, H, N, P, E, G, D, R, S) son los de `inventario.md`.

| ID | Destino | Tratamiento |
|---|---|---|
| C1 | `<title>` y barra superior de escritorio (marca «Plan Cádiz») | La línea «1.000 metros, dominadas y circuito» desaparece |
| C2 | Hoy H-0 (banderín «Cádiz · ≥ 27 días» al final del camino) | Con «fecha sin confirmar». Del 26 al 30-10, «semana de la prueba»; después, se oculta |
| C3 | Marcas M-1 (fila del 1.000: pista del baremo con el 3:49 y escena I2); chip de nota en Hoy H-0 y en la barra de escritorio | La escala de la cabecera se elimina |
| C4 | `.tabbar` (móvil) y `.ab-tabs` (escritorio), 5 destinos, y rutas | Se elimina `pc-tab` |
| C5 | Pie de cada vista | «Datos hasta…» calculado; conmutador de tema |
| C6 | `<head>` | Un icono, Barlow en 3 pesos, sin Plex Mono |
| C7 | `@media print` | Se conserva |
| D1 | Dieta | §9.1 |
| D2 | Dieta | §9.1 |
| D3 | Dieta | §9.1 |
| D4 | Dieta | §9.1 |
| D5 | Dieta | §9.1 |
| D6 | Dieta | §9.1 |
| D7 | Dieta | §9.1 |
| D8 | Dieta | §9.1 |
| D9 | Dieta | §9.1 |
| D10 | Dieta | §9.1 |
| D11 | Dieta | §9.1 |
| D12 | Dieta | §9.1 |
| D13 | Dieta | §9.1 |
| D14 | Dieta `#di-entreno` y `#di-calidad` | La caja se elimina |
| E1 | Hoy H-1 y [T3] desde `martesFuerza`; técnica en Técnica TE-4 | Cifras obsoletas eliminadas |
| E2 | Pie de la tarjeta del martes | «Si falta tiempo: A, H, B, D y a casa.» (`martesFuerza.prioridad`) |
| E3 | Plan P-2 | — |
| E4 | — | Eliminado |
| E5 | Paso 3 del calentamiento; `porQueAntesDeCorrer` plegado en TE-1 | — |
| E6 | — | Eliminado |
| E7 | Tarjeta del jueves (H-1, con [T8] dentro); Técnica TE-3 en lectura | «Cuenta el mejor» corregido: el primero es el comparable |
| E8 | Tarjeta del jueves (H-1, con [T8] dentro); Técnica TE-3 en lectura | «Cuenta el mejor» corregido: el primero es el comparable |
| E9 | Tarjeta del sábado (`sabadoComplemento`) | Cajón o pogo: conflicto K4. Se muestra `plan.json` |
| E10 | Tarjeta del sábado (`sabadoComplemento`) | Cajón o pogo: conflicto K4. Se muestra `plan.json` |
| E11 | Técnica TE-1 [I5] y [T7] | Errata eliminada |
| E12 | Plan P-2 (única casa); TE-1 enlaza con «Cuándo hay barra: Semana tipo →» | Sin copia en Técnica |
| E13 | Técnica TE-1 [G15] | Semanas pasadas en gris; derivada de `progresion` |
| E14 | Técnica TE-1 (las 11 reglas de la barra) | Completas; única casa |
| E15 | Marcas M-4 (registro del 10-9) | Retirado de Técnica |
| E16 | Técnica TE-5; pasos de H-1 | «Versión corta para umbral» y «antes decía…» eliminados |
| E17 | Técnica TE-4 | Fuente única: `ejercicios[].tecnica`; láminas [I6] |
| E18 | Técnica TE-4 | Fuente única: `ejercicios[].tecnica`; láminas [I6] |
| E19 | Técnica TE-4 | Fuente única: `ejercicios[].tecnica`; láminas [I6] |
| E20 | Técnica TE-4 | Fuente única: `ejercicios[].tecnica`; láminas [I6] |
| E21 | Técnica TE-4 | Fuente única: `ejercicios[].tecnica`; láminas [I6] |
| E22 | Técnica TE-4 | Fuente única: `ejercicios[].tecnica`; láminas [I6] |
| E23 | Técnica TE-5 | Umbral eliminado. «Nunca parado»: conflicto K9 |
| E24 | — | Eliminados. Los sustituyen [I5] e [I6] |
| E25 | — | Eliminados. Los sustituyen [I5] e [I6] |
| E26 | Enlace «Vídeo» en cada ficha de TE-4 | Búsquedas de YouTube, nunca vídeos concretos |
| E27 | — | Eliminado |
| E28 | Técnica TE-6 | Sin umbral |
| E29 | — | Eliminado. Lo sustituye `PC.sesion.reloj()` |
| E30 | Técnica TE-6 | Sin umbral |
| E31 | Técnica TE-6 | Sin umbral |
| E32 | Técnica TE-6 | Sin umbral |
| E33 | Técnica TE-7 | Sin «estrenarla el 16» ni San Cristóbal |
| E34 | Técnica TE-7 | Sin «estrenarla el 16» ni San Cristóbal |
| G1 | Marcas M-1 | Cifras de carga vivas solo en [G9] |
| G2 | Marcas M-1 (diagnóstico: primera frase visible, resto plegado) | Cifras de carga vivas solo en [G9] |
| G3 | Marcas M-2 (cabecera [G3]) | Rehecha. Las estimaciones van como puntos huecos con conmutador |
| G4 | Marcas M-3 [G4] (chip «Sueño») | Rehecha |
| G5 | — | Eliminada. La sustituye [G8] |
| G6 | Marcas M-3 [G6] (chip «Barra») | Rehecha |
| G7 | Marcas M-3 [G9] (chip «Carga») | Rehecha, sin óptimos sin fuente |
| G8 | Marcas M-2 | Objetivos de `plan.json` |
| G9 | Marcas M-2 | Una línea |
| G10 | Marcas M-2 (plegado del 19-9, [G12] con «Ver datos» completo) | Contacto, cadencia, zancada y respiración en la tabla |
| G11 | Marcas M-2 (ficha de [G3]) | Rehecha. Las estimaciones van como puntos huecos con conmutador |
| G12 | Marcas M-4 [T10] | Orden descendente, recuento calculado |
| G13 | Marcas M-4 [T10] | Orden descendente, recuento calculado |
| G14 | Marcas M-5 | — |
| H1 | — | Eliminado (la tarjeta abierta lo hace innecesario) |
| H2 | Hoy H-0 (tira de la semana) y H-1 | Generado desde `plan.json` |
| H3 | Hoy H-1 (la `hora` del 30-9, literal) | Conflicto K3 |
| H4 | Hoy H-1 y la hoja «Cómo fue» [T4] | `DIADET` eliminado |
| H5 | Hoy H-1 (fila del semáforo [T1]); Plan P-5 (texto completo plegado) | — |
| H6 | Reglas BOE en Técnica TE-1; decisión en Plan P-6; rango 9–13 en TE-1 plegado con «supuesto» | «Te lo había dicho mal» y el proceso de revisión, eliminados |
| H7 | Marcas M-2 (19-9) | — |
| H8 | Marcas M-1; chip de nota en Hoy H-0 | — |
| H9 | Marcas M-1 (chip de escenario «Realista») y su «por qué» plegado | — |
| H10 | Marcas M-1 (marca de corte viva [G10] y «Cuánto aguanta el escenario realista» plegado) | — |
| H11 | `web.avisos` (hasta el 1-10): Hoy H-2 y Marcas M-1 | — |
| H12 | — | Eliminados |
| H13 | — | Eliminados |
| H14 | — | Eliminados |
| H15 | — | Eliminados |
| H16 | Plan P-6 (pendientes con casilla); Hoy H-4 (una línea) | «Luz 22:15» pasa a H-3 y P-5. «Reloj configurado» pasa a TE-6 |
| N1 | Marcas M-1 [T5] | Media con dos decimales |
| N2 | Marcas M-1: chips de escenario = `escenariosNota` (5) | «Bueno» eliminado. Entra «Objetivo» |
| N3 | Marcas M-1: «siguiente punto» calculado | — |
| N4 | Técnica, cabecera `#te-pruebas` | — |
| N5 | Marcas M-1 (baremo plegado) | La nota de erratas no se muestra |
| N6 | Técnica TE-2, plegado | Clima con «supuesto» |
| N7 | Técnica TE-2 [T6] | «0:43» pasa a 0:42. «Superficie de tartán. Prohibido correr descalzo o con clavos.» se conserva literal, con `.chip.sup` «sin verificar» (no está en `plan.json`) |
| P1 | Plan P-2 | Se añaden las horas y la barra de los sábados 3 y 17 |
| P2 | Plan P-2 | Se añaden las horas y la barra de los sábados 3 y 17 |
| P3 | — | Eliminado |
| P4 | Plan P-4; ruta de menús en TE-6 con «sin verificar» | FC máx ≥ 203. El «195» se elimina |
| P5 | Plan P-4 [G13] | — |
| P6 | Plan P-4 | El pendiente del reloj se elimina (manda `atleta.relojConfigurado`, conflicto K1) |
| P7 | Plan P-4; Marcas M-3 [G8] (chip «Pulso») | — |
| P8 | Plan P-3 [G14] | Se añade la compuerta del C y la escala con el 3:49 |
| P9 | Plan P-3 [G14] y bandas de bloque del calendario P-1 | Se añade la compuerta del C |
| P10 | Plan P-5 (medir distancias) y Técnica TE-6 | Sin «la pista del parque» (§5.8) |
| P11 | Plan P-6 y P-7 | Sin el `metodo` |
| P12 | Plan P-1 [T9] y hoja del día; Hoy H-1 | Semanas pasadas plegadas. Conmutador de versión |
| P13 | Plan P-1 [T9] y hoja del día; Hoy H-1 | Semanas pasadas plegadas. Conmutador de versión |
| P14 | Plan P-1 [T9] y hoja del día; Hoy H-1 | Semanas pasadas plegadas. Conmutador de versión |
| P15 | Plan P-1 [T9] y hoja del día; Hoy H-1 | Semanas pasadas plegadas. Conmutador de versión |
| P16 | Plan P-1 [T9] y hoja del día; Hoy H-1 | Semanas pasadas plegadas. Conmutador de versión |
| P17 | Plan P-1 [T9] y hoja del día; Hoy H-1 | Semanas pasadas plegadas. Conmutador de versión |
| P18 | Plan P-1 [T9] y hoja del día; Hoy H-1 | Semanas pasadas plegadas. Conmutador de versión |
| R1 | Plan P-5 (Dormir); Hoy H-3 | — |
| R2 | Plan P-5 («Por qué» de Dormir) | — |
| R3 | Dieta `#di-entreno` | Café a las 14:00 |
| R4 | Dieta `#di-calidad` | Sin «umbral» |
| R5 | Dieta `#di-entreno` | Café a las 14:00 |
| R6 | Técnica TE-7 | Sin «67,4» |
| R7 | Técnica TE-7 | Sin «entrenas de noche» |
| R8 | Técnica TE-7 | — |
| R9 | Plan P-5 (parada) y Técnica TE-7 | Sin «miércoles en el umbral» ni «cinco minutos» |
| R10 | Plan P-5 | — |
| R11 | Plan P-5 | — |
| R12 | Plan P-5, con «Hacerlo ahora →» a Hoy | — |
| R13 | Plan P-5 (título y enlace); texto en Técnica TE-1 (`protocoloDominadas.reglas[6]`) | Sin el 24-10 (conflicto K6) |
| R14 | Plan P-5 | Reúne todas las reglas duras |
| S1 | `PC.hoy()` (núcleo) | — |
| S2 | Pasos de H-1; Técnica TE-5 | Sin figuras. Rodaje con 10 min a 140 |
| S3 | — | Eliminado |
| S4 | Paso 3 del calentamiento, con enlace a TE-1 | — |
| S5 | Pasos de H-1; Técnica TE-5 | Sin figuras |
| S6 | Pasos de H-1 (sábado); Técnica TE-5 | Sin figuras. Cajón o pogo: K4 |
| S7 | Pasos de H-1; Técnica TE-5 | Sin figuras. Rodaje con 10 min a 140 |
| S8 | Técnica TE-5 (series) | — |
| S9 | — | Eliminado |
| S10 | Tarjeta del martes (vía `sesionesTipo`) y frase de Garmin en TE-4 | — |
| S11 | — | Eliminado |
| S12 | — | Eliminado |
| S13 | Tarjeta de descanso (la parte «hombro» se elimina) | Primero la `sesion` literal del día (§3.4.8) |
| S14 | Día pasado en Hoy H-1 y hoja del día en Plan P-1: líneas «Hecho» de `web.hechosAntiguos`, con el chip «de la web antigua» | La ficha entera se elimina; solo se conserva la línea «Hecho» de los días sin registro en `historial` |
| S15 | Hoy H-1 (vía `web.dias`) | — |
| S16 | — | Eliminados (salvo las consultas de vídeo, que pasan a `web.videos`) |

### 5.8 Los 40 obsoletos: qué se hace con cada uno

| # | Qué pasa en la web nueva |
|---|---|
| 1 | El pie calcula «Datos hasta…» |
| 2 | Eliminado |
| 3 | Técnica TE-6 muestra `relojConfigurado`. El pendiente desaparece (conflicto K1) |
| 4 | Plan P-4 muestra «FC máx ≥ 203 (28-9)» y las zonas tal como están en `plan.json` (conflicto K2) |
| 5 | Plan P-7 no muestra `queDecideLoQueFalta`; lo vigente está en `web.decide` |
| 6 | Plan P-3 muestra la compuerta del C y VEL «0:40-0:41» con el criterio del 12-10 |
| 7 | La pista es `contextoDelUsuario.pista` (conflicto K8) |
| 8 | Técnica TE-2: 0:42 (`reglaDeSalida`) |
| 9 | Chips de escenario = `escenariosNota` |
| 10 | La tarjeta del martes sale de `martesFuerza` |
| 11 | Eliminado |
| 12 | Tarjeta del jueves y Técnica TE-3: el primero es el comparable |
| 13 | Eliminado. El trote va por pulso |
| 14 | Glúteo medio sale de `bloques[H].detalle` |
| 15 | Umbral eliminado de Técnica TE-5 y TE-6 |
| 16 | Tabla eliminada. `PC.sesion.reloj()` usa 3:30-3:40 |
| 17 | Eliminado |
| 18 | Eliminado |
| 19 | Marcas M-1: «al 60 %, sin medir en serio». La fecha la da `web.decide` |
| 20 | Las cifras de carga solo aparecen en [G9], sacadas de `historial.garmin` |
| 21 | [G3] rehecha con los tramos exactos, 3:30, 3:36 y 3:49 |
| 22 | [G4] con cortes a 6h30 y 5h00 |
| 23 | [G5 antigua] eliminada |
| 24 | [G6] separa los máximos del lastre |
| 25 | [G9] sin pie fijo |
| 26 | Marcas M-2 con los objetivos literales del calendario |
| 27 | [T10] generado |
| 28 | Dieta con `atleta.pesoKg` (66,5) |
| 29 | Aviso suprimido con la combinación original (§9.1) |
| 30 | Textos de Dieta nuevos (sin «umbral» ni «21:00») |
| 31 | «Esos kilos ya están dentro de los 67,4» se elimina: la frase se corta antes |
| 32 | Frase eliminada |
| 33 | Técnica TE-1 muestra `protocoloDominadas.reglas[6]` como texto de «No testear de más»; Plan P-5 lleva solo el título y el enlace (conflicto K6) |
| 34 | «Entrenas de noche» se elimina de la fila D3 del inventario (Dieta) |
| 35 | Diez minutos a 140 (`ritmos[RS]`) |
| 36 | Eliminados |
| 37 | Eliminado. El 10-10 sale del calendario |
| 38 | Eliminados |
| 39 | «Arucas si sus marcas confirman los 400 m» (`calendario[10-10].lugar`) |
| 40 | «≥ 27 días · fecha sin confirmar» |

**Recortes de texto permitidos:** quitar una frase o una cláusula caducada de un texto literal, sin añadir nada. Cada recorte se anota en `web.recortes[]` con `{fuente, quitado, motivo}` para que el entrenador lo lleve después a `plan.json`: `reglas[medir-distancias]` (frase de la pista del parque), `lesiones.cintillo` (frase del umbral de los miércoles), R6 (67,4), R7 («entrenas de noche»), R9 («cinco minutos»). Cortar el `nombre` de un escenario antes de « (» o «:» para el rótulo del chip también es un recorte permitido (el nombre completo se muestra debajo).

### 5.9 Código y recursos que desaparecen

`FIG`, `figs()`, `FOTOS`, `FOTO_BASE`, `fotos()`, `bindFotos()`, `FICHAS` (salvo las consultas de vídeo, que se copian a `web.videos`), `CAL_LARGO`, `CAL_CORTO`, `DOMI`, `CALMA`, `SABCOMP`, `DET`, `DIADET`, las filas `.day` escritas a mano, los 19 `[hidden]`, las cuentas atrás fijas (`cd1`–`cd3`), `pc-tab`, las gráficas `drawSueno`, `drawCarga`, `drawTrote`, `drawMil` y `drawDom` y sus arrays (`SUENO`, `CARGA`, `MIL`, `DOM` y los puntos del trote), la calculadora antigua (`s-mil`, `s-dom`, `s-cir`, `.presets`), `.tip`, `bindHit`, el CSS de `.figs`/`.fg`/`.fotos`/`.anim`/`.hero`/`.scale`/`.day`/`.box`, IBM Plex Mono (también dentro de los SVG) y el segundo icono base64. Las peticiones a `raw.githubusercontent.com` pasan a ser cero. De la versión 1 de esta especificación desaparecen además: la barra superior en móvil, el agente como icono, la escena del sueño (I7), la línea temporal grande de Plan y la tarjeta de sensibilidad separada.

---

## 6. Gráficas y herramientas interactivas

### 6.1 Reglas comunes de las gráficas (valen para todas)

1. **Se dibujan al ancho real.** `w = host.clientWidth` y `<svg width=w height=h viewBox="0 0 w h">`. Se redibujan con `PC.alRedimensionar()`, un `ResizeObserver` con espera de 120 ms. **Nunca** un viewBox fijo escalado. El texto mide 12 px (`.chart svg text`) y los rótulos importantes llevan `.lab` en seminegrita.
2. **Colores con variables**, por clase o con `style="fill:var(--s1)"`, nunca con hexadecimales. Así, cambiar de tema no obliga a redibujar.
3. **Márgenes por defecto:** arriba 12, derecha 12, abajo 28 y izquierda 40 px. En el eje Y, entre 3 y 5 marcas. En los ejes de fecha, **fechas reales**: solo los lunes, con rótulo `14-9`. Los días sin dato dejan hueco, y si el hueco importa (el sueño), se marca «sin dato».
4. **Marcas visuales:** líneas de 2 px; marcadores de 8 px de diámetro con anillo de 2 px del color de la superficie; barras con 2 px de radio arriba; rejilla de 1 px en `--grid`. Se rotula directamente el último punto y los umbrales. La leyenda solo aparece cuando hay más de una serie.
5. **Selección fija, no tooltip.** Tocar o hacer clic busca el punto más cercano en X (zona de toque de 40 px como mínimo). Ese punto recibe `.sel`, los demás `.dim`, y la ficha `.pick` se rellena. Con el teclado: `tabindex="0"` y las flechas izquierda y derecha. Por defecto queda seleccionada **la medición más reciente**.
6. **Accesibilidad:** el `svg` lleva `role="img"` y un `aria-label` calculado a partir de los datos, del tipo «Sueño del 25-8 al 28-9: 17 noches, 9 por encima de 6h30, la última 2h14». Al pie, «Ver datos» con la tabla.
7. **3:49:** se dibuja la línea, banda o tramo del 3:49 con `data-umbral="229"` y el rótulo directo «3:49 elimina», siempre dentro del área visible, **en todos estos sitios y en cualquiera nuevo que pinte un tiempo de 1.000**: Marcas M-1 (pista del deslizador y escena I2), M-2 ([G3], [G3b] y la tira de parciales de cada control), Plan P-3 ([G14]), Hoy H-2 (la barra del 10-10), la tarjeta y el modo pista de todo día que pinte un reparto o un tiempo de 1.000 (hoy, el 10-10), la hoja «Cómo fue» de un control con 1.000 (entrada del tiempo) y Técnica TE-2 ([T6]). En lo que va por 200 m se usa su equivalente, 45,8 s por 200, con el rótulo «ritmo del 3:49».
8. **Supuestos:** lo estimado, autoinformado, simulado o «al 60 %» se dibuja con marcador hueco o trazo discontinuo. La leyenda lo explica en una línea.
9. **Pocos datos:** con un solo punto se dibuja ese punto y la frase «Un solo dato: …». **Con cero puntos no hay gráfica**: en Marcas › Gráficas su chip sale con `aria-disabled` y el motivo (§4.8); en cualquier otro sitio, el bloque no se pinta.
10. **Nada de pies fijos con cifras.** Todo texto con cifras se calcula de los datos.

### 6.2 Herramientas (T)

Prioridad: **P1** imprescindible para la primera versión · **P2** muy útil · **P3** mejora.

**Temporizadores y avisos (valen para T2, T3 y los `.timer` de la tarjeta)**

- `PC.timer` calcula el tiempo restante con `Date.now()` frente a una **hora de fin guardada** (`pc-timer` en memoria y en `sessionStorage`), nunca contando pasos de `setInterval`. Al volver de segundo plano (`visibilitychange`) se recalcula. Si terminó mientras la pantalla estaba apagada, al volver se ve «Terminó hace 0:12» con destello.
- **Aviso sonoro** con `PC.audio`: un `AudioContext` que se desbloquea en el primer toque dentro del modo pista o gimnasio (buffer silencioso). Pitido corto de 880 Hz y 120 ms a falta de 10 s; tres pitidos al llegar a 0. Conmutador «Sonido» en la cabecera del modo (`pc-sonido`, activado por defecto).
- **Aviso visual:** `.destello` a pantalla completa al llegar a 0.
- **Vibración** solo si `navigator.vibrate` existe (`[100]` a falta de 10 s y `[300,150,300]` al llegar a 0). Si no existe (Safari de iOS), la línea fija `.focus-nota`: «En iPhone no vibra: sube el volumen y quita el modo silencio.»
- **Pantalla encendida:** al abrir el modo, `navigator.wakeLock.request('screen')`, que se repite en `visibilitychange` y se libera al salir. Si falla o no existe, una línea: «Ajusta el móvil para que la pantalla no se apague». Su comportamiento en la app de pantalla de inicio de iOS no está verificado: es prueba manual obligatoria (§10.6).

**T1 · Semáforo de la mañana (P1, M2, dentro de la tarjeta H-1)**

- **Entrada obligatoria: una lámpara** (`.lamps`, §4.8): Verde · 6h30 o más / Ámbar · 5h00–6h29 / Rojo · menos de 5h00. Es la banda de sueño de la noche según el Garmin, sin la siesta.
- **Entradas opcionales**, tras «Cambiar», todas con su valor por defecto ya puesto (la línea plegada las resume: «Reloj normal · sin síntomas · sin dolor»):

| Campo | Control | Valores | Visible |
|---|---|---|---|
| Horas exactas | deslizador de sueño (§4.8) de 3h00 a 10h00 en pasos de 5 min | vacío; al moverlo elige la lámpara | siempre |
| Reloj | `.seg` | Normal · VFC de 7 días desequilibrada o baja · Sobrecarga | siempre |
| Síntomas | `.seg` | Ninguno · Encima del cuello · Debajo del cuello | siempre |
| Codo u hombro, el que más duela (0–10) | `.stepper` de 1 en 1 | 0 | días con barra: tipo fuerza o `sesion` que nombra «dominadas» o «barra» |
| Talón al dar los primeros pasos | `.seg` | Nada · Duele | siempre |
| Cintillo (rodilla izquierda) | `.seg` | Nada · Lo noto · Molesta al correr | días de carrera, control, circuito o prueba |
| Agujetas (0–10) | `.stepper` | 0 | solo si el `objetivo` del día nombra «agujetas» (el 30-9: «ÁMBAR (5h00-6h29 o agujetas 3-4)») |
| ¿Anoche también por debajo de 5h00? | `.seg` No · Sí | se deduce sola de `pc-sem-<ayer>.banda` o de `historial.sueno` de ayer; solo se pregunta si hoy es rojo y no se sabe | condicional, **fuera** de «Cambiar» |

- `historial.sueno` **no** se usa como valor por defecto de hoy: lo rellena el entrenador cuando llega el CSV, a veces días después. Solo se usa para deducir «ayer».
- **Lógica** (`PC.sem.calcular(entrada)`, pura y con pruebas en §10.6). Los cortes son las convenciones del plan:

```
color = banda                                   // verde | ambar | rojo (de la lámpara o de min: ≥390 verde, ≥300 ámbar)
si reloj ∈ {vfc, sobrecarga}            → color = 'rojo'            motivo: dia-torcido
si banda == 'rojo' y ayerRojo            → color = 'rojo', racha=true motivo: «dos noches seguidas por debajo de 5h00 son 48 h en rojo»
si pc-sem-<ayer>.racha == true          → color = 'rojo'            (segundo día de las 48 h; mismo motivo)
si sintomas == 'debajo'                  → color = 'parada'          motivo: regla del cuello, «no se entrena»
si agujetas 3–4 y color == 'verde'      → color = 'ambar'           motivo: el objetivo del día, literal
si agujetas ≥ 5                         → aviso «el plan no fija qué hacer con agujetas de 5 o más: pregúntale al entrenador» (color sin cambio)
mide = (color == 'verde')
```

- **Avisos, que no cambian el color** (textos literales):
  - encima del cuello → «Síntomas por encima del cuello (mocos, garganta, estornudos): se puede entrenar suave», con `.chip.sup` «el plan no fija el color» (Anexo D, K10);
  - codo u hombro de 3 a 4 → la frase «3-4/10…» de `protocoloDominadas.reglas[10]`; de 5 o más → la frase «5/10 o más…»;
  - talón «Duele» → «Señal de alarma: dolor de talón en los primeros pasos de la mañana»;
  - cintillo «Molesta al correr» → la regla de parada de `lesiones.cintillo`;
  - con ámbar o rojo en cualquier día → la frase de la siesta de `reglas[dormir]`.
- **Salida, dentro de la tarjeta:** la línea cerrada (lámpara, «Verde · 7h05» o «Verde», consecuencia) y, debajo, los motivos y avisos en `small` con enlace a Plan › Reglas. La consecuencia es:
  - si el día tiene su propio `semaforo`, **ese texto literal** (§3.4.7);
  - si no, «Sesión como está escrita. Es la única que mide.» en verde; en ámbar o rojo, «Solo la versión verde mide.»; con `parada`, «No se entrena: regla del cuello».
  - La tarjeta cambia al momento: chip de versión, números, «Hoy haces:» (`dia.variantes[color]` o, si falta, `web.semaforo.generico[tipo][color]`, con el recorte aplicado en ámbar) y pasos.
- **Guardado:** `pc-sem-AAAA-MM-DD = {banda, min|null, reloj, sintomas, codo, talon, cintillo, agujetas, ayerRojo, color, racha, t}`. Tocar una lámpara ya guarda y pliega la fila; «Cambiar» la vuelve a abrir.
- **Día de descanso:** se puede rellenar («Anotar la noche (opcional)»); la salida dice «Hoy es descanso» más los avisos.
- **Racha semanal (P3):** si entre el 28-9 y el 4-10 hay tres o más `pc-sem` por debajo de 360 min, aviso literal de `dia-torcido`: «lo que se cambia es el horario, no las sesiones». Cuentan las noches rojas y las que tienen minutos por debajo de 360; una noche ámbar sin minutos no cuenta y el aviso lo dice («2 noches seguro; 1 ámbar sin minutos»).

**T2 · Modo pista (P1, M2)**

- **Se abre** desde H-1 en los días de tipo carrera, control o prueba. Pantalla completa `.focus`. Temporizadores, sonido, destello, vibración y pantalla encendida según el bloque común de arriba.
- **Cabecera:** «Salir», el título («6 × 400 · bloque A · verde»), «Sonido» y «Contraste», que activa `.focus.sol` y se guarda en `pc-sol`. Si el día tiene condición (bloque C), su `.seg` va aquí, compartido con la tarjeta.
- **Series** (`principal.tipo = "series"` o `"compuesta"`):
  1. «Repetición k de n». El objetivo en `.big`. Una línea con «primer 200 en 0:43,5 · freno 1:24».
  2. **Un toque por repetición** (`.rep-btns`, 64 px), con sus límites calculados debajo de cada rótulo:
     - «Dentro» `ok` · «1:24–1:30» (objetivo ± 3 s; con objetivo en rango `a-b`, de `a − 3` a `b + 3`);
     - «Lenta» `bad` · «más de 1:30» (más de 3 s por encima: es lo que cuenta la regla de las dos repeticiones);
     - «Rápida» `warn` · «menos de 1:24» (más de 3 s por debajo: es el freno).
     Exactamente 3,0 s cuenta como «Dentro», porque la regla dice «por más de 3 s».
  3. **Tiempo exacto, opcional:** «Poner el tiempo» abre un `.stepper` que parte del objetivo con −0,5 / +0,5 s (y tocar la cifra deja escribirla con `PC.fmt.parseT`). Si se pone, la categoría se calcula sola. **Los tiempos definitivos salen del FIT**, como hasta ahora: el modo pista no compite con el reloj.
  4. Justo después del toque arranca solo el temporizador de recuperación (`rec`) en `.big`, con «+15 s», «Saltar» y «Pausa».
  5. **Freno:** tras «Rápida», `.aviso.warn` con la frase literal de `avisoReloj`: «la siguiente sale más lenta, no se abandona».
  6. **Regla de las dos repeticiones:** dos «Lenta» seguidas → `.aviso.bad` a pantalla completa con el texto literal de `reglas[dos-repeticiones]` y los botones «Terminar» y «Seguir (se anotará)».
  7. **Ámbar:** `n` es el del recorte, con el recordatorio literal «si una repetición llega a 200 ppm antes de la última, esa es la última» y el botón «Llegué a 200 ppm: esta es la última».
  8. **Criterio propio** (el 8 × 200 del 12-10: «las 8 entre 0:41 y 0:43, ninguna por debajo de 0:40, corte a 0:44»): los tres botones se sustituyen por cinco tramos en columna (56 px cada uno): «menos de 0:40» `warn` («ninguna por debajo de 0:40»), «0:40–0:41» `warn` («fuera del criterio»), «0:41–0:43» `ok`, «0:43–0:44» `warn` («fuera del criterio») y «0:44 o más» `bad`, que muestra el criterio literal («corte a 0:44») con «Terminar» y «Seguir (se anotará)».
  9. **Objetivos con alternativa** («1:25; 1:24 si el 10 respaldó el C»): mandan la condición `bloqueC` de T11.
- **Kilómetro partido:** secuencia 600 → pausa de 45 s (temporizador) → 400 → recuperación de 6 min, y así `n` veces. Cada parte con sus tres botones frente a su objetivo (2:11 y 1:27 en el bloque A). Los criterios literales (los tres 200 del 600 dentro de 1 s; el segundo 400 a 2 s o menos del primero) se muestran como recordatorio y no se calculan.
- **Rodaje:** crono grande con «Empezar». Al minuto 10 pita y muestra «Desde aquí, techo 145». Al llegar a la duración, «Tiempo cumplido» y tres pitidos.
- **Control del 10-10:** arriba, el aviso de conflicto K5 si sigue sin resolver. Pasos como tarjetas grandes: «Dominadas al máximo en vídeo» (enlace a [T7]) → temporizador de 20 min → «1.000». En la pantalla del 1.000, una tabla de pasos por 200 con **tres columnas**: «objetivo del día» (0:42 / 1:24 / 2:06 / 2:48), «protocolo del día» (0:43 / 1:26 / 2:09 / 2:52) y «ritmo del 3:49» (0:45,8 / 1:31,6 / 2:17,4 / 3:03,2, `data-umbral="229"`, en rojo). Si K5 está resuelto (`web.resueltos` contiene `K5`), la columna descartada desaparece. Después: el tiempo final (`.tin`) y los 5 parciales de 200, opcionales.
- **Guardado:** `pc-ses-<fecha>.reps = [{cat:'dentro'|'lenta'|'rapida'|tramo, t:null|seg}]`, `.aviso2 = bool`, `.ultima200 = k|null`. Al salir con datos, la hoja «Cómo fue» se abre.

**T3 · Modo gimnasio (P1, M2)**

- **Estructura:** bloques en el orden del martes. Cada tarjeta lleva el título («A · Dominadas lastradas»), chips con series, repeticiones, peso del color (y de la condición del día, si la hay) y descanso, y un círculo de 44 px por serie.
- **Superseries:** los círculos se alternan (B1 D1 B2 D2…) y el descanso arranca después de cada D. En H e I, un círculo por ronda y descanso al final de la ronda (45 s por defecto, con «+15 s»).
- **Al tocar un círculo** se marca la serie y arranca el temporizador del bloque (`PC.timer`): A 3:00, pares 2:00, G 1:00, H 0:45 e I 0:45.
- **Recordatorios en la serie 1 y la 5 de A:** «Vídeo lateral y frontal de la 1.ª y la 5.ª» y la frase de la reserva de la quinta, literales del `objetivo` del día.
- Tras la quinta serie de A, `.seg` «Reserva de la 5.ª: 0 · 1 · 2 · 3 · 4». Con 1 o menos, la frase literal «Si la quinta deja 1 en reserva o menos, es la última serie».
- **Al final:** codo y hombro de 0 a 10, dos `.stepper`. El pie lleva la última frase de `martesFuerza.prioridad`: «Si falta tiempo: A, H, B, D y a casa.»
- **Guardado:** `pc-ses-<fecha>.gym = {series:{A:[…]}, lastre, reserva5, codo, hombro, bloques:[…]}`. Todo esto pasa a «Cómo fue». La reserva de la 5.ª del 29-9 rellena la condición del 6-10 (T11).

**T4 · Cómo fue (P1, M2; hoja `.sheet` que se abre desde la tarjeta)**

| Tipo | Campos (con los valores del modo pista o gimnasio y del semáforo ya puestos) |
|---|---|
| series / km partido | categoría (y tiempo, si se puso) de cada repetición · si saltó la regla de las dos repeticiones (calculado) · talón y cintillo · nota (2 líneas) |
| rodaje | minutos reales · nota |
| fuerza | repeticiones por serie de A · lastre (kg) · reserva de la 5.ª · codo y hombro de 0 a 10 al terminar · bloques hechos · nota |
| circuito | el resumen de [T8] (que se rellena en la tarjeta) · nota |
| control | dominadas contadas y válidas ([T7]) · tiempo del 1.000 (`.tin`) **con una pista mini del baremo del 1.000 debajo que marca dónde cae y enseña el tramo «3:49 elimina»** (`data-umbral="229"`) · 5 parciales de 200 · nota |

- Si el día lleva `registro` (texto del plan), se muestra encima como instrucción.
- «Copiar para el entrenador» genera un texto plano de 3 a 6 líneas, sin adornos. Ejemplo:

```
mar 29-9 · Arsenal · semáforo verde (7h05, reloj normal)
A: 3-3-3-3-3 con 12,5 kg · reserva de la 5.ª: 2
Codo 1/10 · hombro 0/10 al terminar
Hecho: A, H, B+D, C+F, E+G, I
Nota: …
```

  Y en series: `lun 5-10 · 6 × 400 a 1:26 · dentro 5 · lenta 1 · rápida 0 · dos repeticiones: no`.
- Al pie: «Se guarda en este móvil. Lo que cuenta es lo que le mandes al entrenador».

**T5 · Simulador de nota (P1, M4, dentro de Marcas M-1)**

- **Estados:** «Marcas de hoy» (por defecto, = `derivados.marcas`), uno de los 5 escenarios de `escenariosNota` (chips) o «Simulado» (en cuanto un deslizador no coincide con el estado elegido). «Volver a hoy» regresa al primero.
- **Tres reglas,** una por prueba y en el orden de la prueba (circuito → dominadas → 1.000): rótulo, valor (`9,9 s` · `11` · `3:34`), chip de puntos y un `input type=range` cuya pista es el baremo pintado ([G2]).
  - **Mejor siempre a la derecha.** En el circuito, `v ∈ [0,47]` y segundos = 12,5 − v/10. En dominadas, de 0 a 22. En el 1.000, `v ∈ [0,100]` y segundos = 265 − v, es decir, de 4:25 a 2:45.
  - `aria-valuetext` del tipo «3:34, 3 puntos».
  - El rótulo de eliminación va **anclado a su tramo**: «11,7 s o más elimina», «4 o menos elimina», «3:49 o más elimina» (este, con `data-umbral="229"`).
  - Raya fija en la marca real, que no se mueve al simular.
- **Marca de corte viva [G10]** en cada pista: para cada prueba, fijando las otras dos, `ptsNecesarios = 15 − p1 − p2`. Si es mayor que 10, «con estas dos no llega». Si es 1 o menos, «cualquier marca que no elimine». Si no, la peor marca que da esos puntos (en dominadas, el menor número de repeticiones), dibujada como raya discontinua con el rótulo «para el 5,00: 9,7 s o menos». Con el escenario realista (3:34 y 12) la marca de corte del circuito es 10,1 s, el final del tramo de 6 puntos (9,8–10,1), y reproduce `sensibilidad`: 9,8 → 5,00 «apto justo» y 10,2 → 4,67 «punto de rotura». La QA lo comprueba.
- **Siguiente punto,** calculado con el baremo y mostrado bajo cada regla: «siguiente punto: 9,7 s (−0,2 s)» · «12 (+1)» · «3:30 (−4 s)».
- **Media** con dos decimales en el `.stat.hero` de M-1 y chip APTO, NO APTO o ELIMINADO. La regla: `ELIMINADO` si algún punto es 0; `APTO` si la suma es 15 o más; si no, `NO APTO`.
- **Agente:** en «Marcas de hoy», relleno; en un escenario o simulado, **en contorno** (el mismo trazado que los fantasmas de T6) y sin cambiar de pose. La pose `celebra` solo aparece con las marcas reales y resultado APTO. Las escenas de «Detalle» siguen la misma regla.
- **Validación en la construcción:** los puntos calculados de cada escenario coinciden con los escritos (§8.6).

**T6 · Reparto del 1.000 con carrera fantasma (P1 el cálculo, P2 la animación; M5, Técnica TE-2)**

- **Presets:**
  - «Examen · 3:30 plano», de `planDeCarrera.examen.reparto`: 42,0 × 5;
  - «Control 19-9», de `historial.carrera[19-9].resultado.parciales200.tramosS`: 40 · 42 · 46 · 46 · 41;
  - «19-9 con los 46 en 43», que aplica `objetivoNuevo23sep.comoSePersigue`: 40 · 42 · 43 · 43 · 41;
  - «3:34 plano», con 42,8 por 200, cifra de `ritmos[A].porQue`.
- **Cinco tramos editables** con − y + de 0,5 s (tocar la cifra deja escribirla). Se guardan en `pc-reparto`.
- **Salidas:**
  - pasos acumulados por el 200, 400, 600 y 800 y la meta, al lado del reparto del examen y del ritmo del 3:49 (45,8 por 200);
  - puntos de la meta según el baremo;
  - margen al 3:49 en segundos y en metros, con `m = 1000 − meta × 1000 / 229` (distancia que lleva recorrida el ritmo del 3:49 cuando tú cruzas la meta).
- **Avisos literales:**
  - el paso por el 600 antes de 125 s → «Si pasas el 600 por delante de 2:05, has salido demasiado rápido»;
  - el primer 200 por debajo de 42,0 → «El primer 200 va en 0:42»;
  - los tramos 400–600 y 600–800 a 43 o menos → chip `ok` «tramos centrales en 43: condición del bloque C»; si no, `warn`.
- **Carrera fantasma (P2):** SVG de pista recta de 0 a 1.000 m, dibujada al ancho real, con dos calles:
  - «Tú», con el agente en carrera (relleno si el reparto es el del control real; en contorno si es un preset o editado);
  - «3:30», con un agente en contorno `--ill-meta`.
  - El 3:49 **no es un corredor**: es una raya roja vertical con `data-umbral="229"` en la posición que lleva su ritmo cuando tú cruzas la meta, rotulada con el cálculo de arriba («3:49 · 83 m detrás» con el preset del examen; «66 m» con 3:34).
  - **En reposo** se ven las posiciones en el instante en que cruzas la meta. «Correr» anima 8 s (la escala de tiempo es tu meta dividida entre 8), con posición lineal a trozos entre tramos. Con `prefers-reduced-motion` no hay animación.

**T7 · Contador de dominadas válidas (P1, M5, Técnica TE-1; enlazado desde el 3-10, el 10-10 y el 17-10)**

- **Botones grandes** de 56 px: «Válida» (`--ok`) y «Nula…» (`--bad`). «Nula» despliega las reglas 1 a 7 del BOE como botones con su texto corto; al tocar una, la repetición cuenta como nula con ese motivo. «Deshacer» quita la última y «Empezar otra» borra, con confirmación.
- **Cifras:** contadas (todas las pulsaciones), válidas, puntos de las válidas según el baremo y la regla que más anula.
- **Decisión del 10-10:** se muestra si la fecha de hoy es el 10-10 o si se elige «Simulacro del 10-10». Con el texto de `calendario[10-10].decide`: 12 o más válidas → «no se añade nada»; 11 o menos → «asegurar 12 (técnica)»; y, **como línea aparte**, una diferencia de 2 o más entre contadas y válidas → «la prioridad es la técnica».
- **Guardado:** `pc-dom-<fecha>`. «Copiar» genera: «Dominadas 10-10: contadas 12 · válidas 10 (5 pts) · nulas: regla 6 ×2». Las válidas del 10-10 alimentan el cálculo del 17-10 (T11).

**T8 · Registro del circuito (P1, M5; se pinta dentro de la tarjeta de Hoy los días de circuito)**

- **Campos:**
  - tres entradas `.tin` en décimas, con −0,1 / +0,1 al lado: «Intento 1 · el comparable», «Intento 2», «Intento 3». Los días 8-10 y 22-10 hay un solo intento, más «segundo solo si nulo»;
  - por intento, una casilla «nulo» con su motivo;
  - «Quién cronometra y con qué»;
  - el sueño de anoche, tomado del semáforo (T1) de hoy.
- **Salidas:**
  - puntos del primer intento válido (comparable) y del mejor (techo);
  - `.umb` con `decisionSegunEl24` y `.tu` en el tramo del primer intento;
  - si la banda de sueño no es verde (menos de 6h30), `.chip.warn` «con asterisco»;
  - «Copiar».
- **Guardado:** `pc-cir-<fecha>`. **Solo se registra en Hoy.** Técnica TE-3 enseña el último registro en lectura con «Se registra el jueves en Hoy →».

**T9 · Calendario en rejilla (P2, M3, Plan P-1)**

- **Rejilla** de 7 columnas (L–D). Celda `button.cal-d` de 56 px de alto como mínimo, con el número, el icono del tipo y la clase de estado (las mismas de `.week`). Desde 600 px, además, el rótulo corto de `web.dias[f].titulo` (o el derivado) con puntos suspensivos.
- **Filas de semana** `.cal-sem`, que ocupan las 7 columnas: rango, título, chip del bloque con sus ritmos, una banda de 4 px a la izquierda del color del bloque (A `--p2`, B `--p3`, C `--p5`) y `nota` plegada. Así el calendario es a la vez la línea temporal del plan.
- **Hoy** va con anillo `--primary`. Los días clave (`derivados.hitos`) llevan punto `--s2` y, desde 600 px, su rótulo. La ventana 26–30 va rayada (`repeating-linear-gradient` con `--warn-soft`), con el icono de prueba y «la fecha llega con el llamamiento».
- **Conmutador de versión** de la última semana (`pc-prueba`): cambia el contenido de las celdas del 21 al 30 según `derivados.final.versiones`.
- **Al tocar una celda** se abre la `.sheet` con la tarjeta del día en modo lectura y «Abrir en Hoy».

**T10 · Registro filtrable (P2, M4, Marcas M-4)**

- **Filtros** `button.chip` con recuento: Todo · Carrera · Barra y fuerza · Circuito · Sueño · Reloj · Cuerpo. «Carrera» incluye también las estimaciones del 1.000.
- **Una fila por entrada** (`button.reg-row`, `aria-expanded`, `data-src="<array>:<fecha>"`) con fecha corta, icono, `sesion` en una línea y chip de estado (`valida:false` → «no mide»; `hecho:false` → «no hecho»). Orden descendente.
- **Al desplegar:** `objetivo`, `resultado` (pintado de forma genérica con `.kv`: las claves camelCase pasan a palabras, las listas se unen con « · », con profundidad 2 como mucho) y `valoracion`.
- **Encima,** el recuento: «15 de carrera · 10 de barra · 2 de circuito · 17 noches · 11 lecturas del reloj · 4 de composición». Se calcula; nunca se escribe.

**T11 · Condición del día (P1, M2; fila de la tarjeta H-1 y de la hoja del día)**

- **Qué resuelve:** los días cuya prescripción depende de algo anterior. La lista de hoy, sacada de los «si …» de `sesion` y `objetivo` en `plan.json`:
  - 3-10: «si hubo dolor de talón por la mañana esa semana, 45 min» (en vez de 55);
  - 5-10: «1:27 si el 30 saltó la regla de las dos repeticiones» (en vez de 1:26);
  - 6-10: lastre según cómo salió el 29-9;
  - 12-10: 8 × 200, o rodaje de 40 min por reloj o mala noche, o rodaje porque el simulacro pasó al 11;
  - 14-10, 19-10, 21-10 y el 600 del 24-10 (versión 28–30): si el 10 respaldó el bloque C (condición compartida `bloqueC`);
  - 15-10: «bloque técnico solo si se acordó tras el 24-9»;
  - 17-10: la serie técnica de «válidas del 10-10 − 4», como mucho 8 (cálculo), y «solo si codo y hombro han estado en 2/10 o menos las dos semanas anteriores; si no, solo la serie técnica» (opción);
  - la semana final: la fecha de la prueba (`pc-prueba`) y, el lunes 26 de la versión 28–30, «si la prueba es el 29 o el 30» o «si es el 28».
  M1 recorre todos los días futuros y crea una `condicion` para cada «si …» que cambia **qué se hace**. Los que solo añaden una nota («Segundo vídeo si el del 29 falló», «si la 6.ª sale lenta, se para ahí», el asterisco del 8-10, que ya pone T8) se quedan como texto. El validador lista como aviso cada «si » de un día futuro sin `condicion`, para revisarlo.
- **Forma:** `.seg` con la `pregunta` y las `opciones` de `web.dias[f].condicion` (o de una condición compartida, `web.condiciones.bloqueC`). **Cada texto de opción es una subcadena literal del `objetivo` o la `sesion` del día**, y el validador lo comprueba. Siempre se añade la opción fija «Ninguna de estas» → «El plan no lo fija: pregúntale al entrenador».
- **Efecto:** la opción elegida cambia los números, la fuerza (`opciones[i].fuerza`) o el `principal` de la tarjeta y del modo pista. Sin opción elegida, la tarjeta enseña la versión `base` con el chip «elige arriba».
- **Relleno automático, solo cuando no hay que interpretar nada:**
  - 3-10: «45 min» si algún `pc-sem` del 28-9 al 3-10 tiene talón «Duele»;
  - 5-10: «1:27» si `pc-ses-2026-09-30.aviso2 == true`; «1:26» si la sesión del 30 está apuntada y no saltó;
  - 6-10: de `pc-sem-2026-09-29.color` y `pc-ses-2026-09-29.gym.reserva5` (verde + reserva ≥ 2 → 15 kg; verde + reserva 1 → 12,5 kg; ámbar o rojo → estreno de los 12,5; verde + reserva 0 → «Ninguna de estas»);
  - 17-10 (codo y hombro): «solo la serie técnica» si algún registro de codo u hombro de las dos semanas anteriores pasa de 2; si no hay registros, no se rellena;
  - 12-10: solo la opción «el simulacro pasó al domingo 11», si `pc-sem-2026-10-10.banda == 'rojo'` (menos de 5h00, regla del propio día). «Mala noche» y «el reloj no cerró la recuperación» no se deducen: se eligen;
  - bloque C: no se rellena (la «distancia verificada» no se sabe en el móvil); se enseña al lado lo apuntado el 10-10 («Tu 10-10 aquí: 3:32 · tramos 43 y 44») como ayuda.
  - Lo relleno lleva `small` «rellenado con lo que apuntaste el 29-9» y se puede cambiar.
- **Cálculo (17-10):** no es una opción, es una cifra: `min(válidas del 10-10 − 4, 8)` desde `pc-dom-2026-10-10`, o «falta el número de válidas del 10-10 (cuéntalas en Técnica →)» si no está.
- **Guardado:** `pc-cond-<fecha>` o la clave compartida (`pc-bloqueC`, `pc-prueba`).

### 6.3 Gráficas (G)

| G | Prioridad | Dónde | Qué dibuja | Datos | Comportamiento y reglas |
|---|---|---|---|---|---|
| G1 | P1 | Marcas M-1 (solo ahí) | Pista de la nota de 0 a 10: cinta en 5,00 («5,00 apto»), agente en la media del estado actual, raya sólida pequeña «hoy 4,67» con la media real, marcadores huecos en los escenarios vigentes, rótulo «faltan 0,33» o «0,67 de margen» | `derivados.marcas.media`, estado de T5, `escenariosNota` | El agente se desliza en 600 ms. Relleno con marcas reales; en contorno con escenario o simulado. Celebra (pose de frente) solo con marcas reales y APTO. Con un cero, la pose es «de pie» y el rótulo, «eliminado por …» |
| G2 | P1 | M-1 (pista de cada deslizador) y T4 de un control (pista mini del 1.000) | Tramos del baremo como bloques: 0 en `--elim`, puntos 1–2 `--p1`, 3–4 `--p2`, 5–6 `--p3`, 7–8 `--p4`, 9–10 `--p5`. Mejor a la derecha. Raya en tu marca | `baremo.*` | En el 1.000, el tramo 0 lleva `data-umbral="229"`. Los rótulos «elimina» van anclados al tramo 0 |
| G3 | P1 | Marcas M-2 (cabecera de Controles) | Evolución del 1.000: eje de fechas del 21-8 a la prueba; eje Y de 3:10 a 4:25 invertido (arriba, más rápido); tramos del baremo como bandas tenues con sus puntos a la derecha; líneas 3:30 «objetivo» (`--ok`, discontinua), 3:36 «suelo» (`--text-3`, discontinua) y 3:49 «elimina» (`--elim`, 2 px, `data-umbral`); el 19-9 relleno con barra de la banda 3:30–3:38; el 10-10 y el 24-10 huecos con «simulacro» y «control» | `historial.evolucionEstimacion` (el `medido`), `marcasActuales.mil_metros.banda`, `calendario` | Conmutador «Ver estimaciones»: los cuatro puntos de agosto, huecos y grises, con su rango (`"3:48-3:56"` → barra; `"≈4:00"` → punto). La ficha muestra fecha, valor y `motivo` |
| G3b | P2 | Marcas M-2 | Perfil por 200 m: X de tramo 1 a 5, Y en s/200 de 38 a 48. Línea del 19-9 (5 tramos), línea del 31-8 (3 tramos del 600) y la del 10-10 cuando exista. Línea de objetivo 42,0 y línea «ritmo del 3:49 · 45,8 s» (`data-umbral`) | `derivados.perfiles` | Conmutador de perfiles |
| G4 | P1 | Marcas M-3 (chip «Sueño») | Sueño: barras por noche en eje de fechas reales; fondo con bandas `--bad-soft` (< 5h00), `--warn-soft` (5h00–6h29) y `--ok-soft` (≥ 6h30); barra del color de la lámpara; línea «8h50 según el reloj»; noches sin CSV como marca rayada baja «sin dato». Eje Y solo en 5h00, 6h30 y 8h50 | `derivados.noches`, `historial.necesidadSueno` | Ficha: fecha, duración, puntuación, calidad, FC en reposo, VFC, VFC de 7 días y nota (sin `causa`) |
| G5 | P1 | Marcas M-3 (chip «Series»); vista previa en la hoja «Cómo fue» con lo apuntado | Series de una sesión: una fila por repetición, con franja del objetivo ± 3 s (`--ok-soft`), línea del objetivo, un punto por tiempo con su desviación, columna «200 + 200» y FC máxima. En la vista previa sin tiempos, las categorías (dentro, lenta, rápida) como puntos huecos en su franja | `derivados.series[]` | Selector de sesión. Chip «no mide: 2h14 de sueño» si la sesión no es válida (el motivo sale de la validez y de su valoración) |
| G6 | P2 | Marcas M-3 (chip «Barra») | Dominadas en dos paneles. (a) Test máximo: eje Y de 0 a 17 con las bandas del baremo (0–4 «elimina»); huecos = contadas por ti (24-8: 10; 19-9: 11), rellenos = válidas en vídeo (desde el 10-10). (b) Lastre en 5 × 3: escalones en kg por fecha, con la reserva de la quinta como rótulo | `historial.dominadas` | No se mezclan las series lastradas con el peso corporal. El volumen de habituación va en la ficha, no en el eje |
| G7 | P2 | Marcas M-3 (chip «Circuito») | Circuito de los jueves: eje Y de 8,0 a 12,5 s invertido, bandas del baremo, línea «11,7 elimina»; primer intento relleno (`--s3`) y el mejor como anillo; 10-9 «al 60 %» hueco y discontinuo; los jueves no hechos como marca «no hecho» | `historial.circuito`, `marcasActuales.circuito` | Con un solo punto, «Un solo dato: …» |
| G8 | P2 | Marcas M-3 (chip «Pulso») | Termómetros: (a) deriva de cada rodaje (`resultado.deriva.pct`) con líneas del 5 % «base asentada» y del 10 % «alarma en llano», y el método rotulado según el dato; (b) ritmo a 145: banda 7:40–8:00 «normal» y línea 8:30 «alarma», con puntos solo si existe `metricas.ritmoA145` | `historial.carrera[].resultado.deriva`, `zonasFC.termometros` | Si (b) no tiene puntos, no se pinta y una línea lo dice. Si (a) tampoco, el chip «Pulso» sale desactivado. Si falta la deriva por mitades, la ficha lo dice |
| G9 | P3 | Marcas M-3 (chip «Carga») | Foco de carga: tres líneas (anaeróbica `--s2`, aeróbica alta `--s1`, aeróbica baja `--s3`) en las fechas con valores; chip con el estado de la última lectura («Equilibrado · 28-9») | `historial.garmin` | Ficha: `ventanaFocoCarga`, `focoCarga` y `mensajeGarmin`. **Sin rangos óptimos** (no hay fuente) |
| G10 | P1 | Marcas M-1 (dentro de las pistas de T5) | Marca de corte viva: la peor marca de cada prueba que todavía da un 5,00 con las otras dos (§6.2 T5). No es una gráfica aparte | `baremo`, estado de T5 | Con el escenario realista, 10,1 s en el circuito, coherente con `sensibilidad` (QA) |
| G11 | P1 | Hoy H-0 (56 px; solo ahí) | Camino a Cádiz del 14-9 al 30-10: segmentos A, B y C, puntos de los días clave, agente en hoy, ventana 26–30 rayada y banderín «Cádiz · ≥ 27 días» al final | `derivados.bloques`, `derivados.hitos` | Por debajo de 600 px no se rotula ningún hito (los rótulos están en el calendario). Del 26 al 30-10, el banderín dice «semana de la prueba»; después del 30-10, el camino se oculta |
| G12 | P3 | Marcas M-2 (plegado del 19-9) | Tramos del control: barras de tiempo por 200 frente a 42,0; debajo, dos filas de puntos: FC por tramo y potencia por tramo | `historial.carrera[19-9].resultado` | Sin doble eje: filas separadas. «Ver datos» lleva **todas** las series por tramo que hay en el resultado: tiempo, FC, potencia, contacto con el suelo, cadencia, zancada y respiración, más la recuperación de FC a 30/60/90/120/180 s |
| G13 | P2 | Plan P-4 | Barra de ppm de 120 a 205 con Z1–Z5, marcas 140 y 145 y la banda rayada 166–172 «umbral · sin sesiones» | `zonasFC.zonas`, `ritmos[RS]` | — |
| G14 | P2 | Plan P-3 | Escalera de ritmos A → B → C: tres tarjetas unidas por una flecha, con 200/400/600/1.000 en `.stats`; entre B y C, la compuerta («decide el sáb 10-10» y la `condicion` literal). Debajo, la escala del ritmo de 1.000 de cada bloque de 3:25 a 3:52 con «3:30 objetivo» y «3:49 elimina» (`data-umbral`) | `ritmos[]`, `derivados.bloques` | La tarjeta del bloque actual va en `.card.hi`; en C se muestran los dos valores («1:25 → 1:24») |
| G15 | P2 | Técnica TE-1 | Escalera del lastre (lista vertical en escalones, no gráfica de ejes): semana · peso · condición · estado (hecho, esta semana, por venir) | `derivados.lastre` (de `progresion` más `historial.dominadas`) | La semana actual va resaltada |
| G16 | P3 | Marcas M-5 | Composición: tres minigráficas (peso, músculo y grasa en kg) con los 3 puntos de la Tanita | `historial.composicion` (`serie:"dietista"`) | — |

---

## 7. Ilustraciones

### 7.1 La mascota: el agente

- **Quién es:** un agente genérico, adulto y atlético, de 7,7 cabezas (ni infantil ni cabezón). Lleva polo azul marino, pantalón corto oscuro, gorra con visera y un vivo azul claro (el único acento), zapatillas azules y un dorsal blanco «43» (el número de la promoción). **Sin escudo, placa, bandera, galones ni la palabra POLICÍA**: el azul marino y la gorra bastan para evocarla sin que parezca una web oficial. A 24–40 px se lee como «corredor con gorra»; es aceptable y no se le añaden insignias para «arreglarlo».
- **Estilo:** plano y sin contornos. La profundidad sale del tono: el lado cercano va en `--ill-piel` y `--ill-camiseta`, el lejano en `--ill-piel-2` y `--ill-camiseta-2`. Las extremidades son cápsulas; mangas y perneras, de dobladillo recto. Sombra en el suelo con `--ill-sombra` y estelas de velocidad con `--ill-estela`.
- **Relleno o contorno.** Relleno = dato real. **Contorno** (`fill:none; stroke:var(--text-2); stroke-width:1.5`, o `--ill-meta` en el fantasma del 3:30) = escenario, simulación o referencia. Es la misma convención que hueco/discontinuo en las gráficas.
- **Esqueleto:** `ilustracion/rig.py` (IK de dos huesos; muslo 40, pierna 38, brazo 27, antebrazo 25, tronco 46; cuello alargado 3 unidades para que se vea la regla 5 del BOE). Todas las poses salen de ahí.
- **Poses que exporta M6:**

| Pose | Vista | Dónde |
|---|---|---|
| `corre` | perfil, a la derecha | pista del 1.000, pista de la nota, camino a Cádiz, carrera fantasma |
| `celebra` | frente, brazos arriba | solo si un dato real lo pide: media ≥ 5 sin ceros con las marcas registradas, o marca real ≤ 3:30 |
| `dePie` | frente, gesto de esfuerzo | nota real que no llega, eliminado |
| `arriba` | perfil, dominada arriba | escena de la barra |
| `valla` | perfil, franqueo | escena del circuito |
| `mani-*` | la misma figura en gris maniquí | láminas técnicas |

- **Expresiones mínimas:** concentrado (un guion) al correr, neutro, esfuerzo en la barra y contento **solo** en `celebra`. **Sin frases ni bocadillos de ánimo.** Los globos solo llevan datos («3:34»).
- **Movimiento:** el agente solo se mueve cuando cambia un dato, deslizándose a su nueva `x` con `transform` en 600 ms. No hay bucles. Con `prefers-reduced-motion`, salta directamente. La carrera fantasma es la única animación larga, y solo arranca con «Correr».
- **Uso:** una escena como mucho por tarjeta, y nunca de adorno. **El agente no es el icono de la app** (§4.9).

### 7.2 Escenas (I) y dónde van

| I | Escena | Dónde | Qué dato cuenta | Base |
|---|---|---|---|---|
| I1 | Icono de la app | Barra de escritorio y favicon | — (identidad) | El cronómetro del icono actual, redibujado como `#i-app`. **No es el agente** |
| I2 | Pista del 1.000 | Marcas M-1, «Detalle» de la fila del 1.000 | Tu marca entre el poste rojo «ELIMINA 3:49» (`data-umbral="229"`) y el poste verde «META 3:30»; cotas «15 s de margen» y «faltan 4 s». **Sin banda de puntos** (ya la da la pista del deslizador) | `mascota.svg` (versión 2, revisada) con la geometría de abajo |
| I3 | Barra | Marcas M-1, «Detalle» de la fila de dominadas | Agente arriba de la dominada con la barra al tercio inferior del cuello. Contador de 17 píldoras con zonas: 0–4 rojas, «tú 11 · 5 pts», 12 y 15 en verde. Píldoras huecas y discontinuas mientras el máximo sea autoinformado; rellenas cuando haya válidas en vídeo. **El marcador de «tú» es un triángulo dibujado con `path`, no el carácter ▶** (es un pictograma y lo bloquea el validador) | `ilustracion/escena_barra.svg` |
| I4 | Valla | Marcas M-1, «Detalle» de la fila del circuito, y Técnica TE-3 | Franqueo de **una valla dibujada como valla**: travesaño horizontal entre dos patas, cada una con su pie, en vista de tres cuartos (la de `escena_valla.svg` parece un bolardo y se rehace). Cronómetro hueco «¿? sin medir» hasta el primer intento válido; después, la cifra. Escala **con lo mejor a la derecha**, igual que las pistas del simulador: de 12,0 s a la izquierda (con el tramo «11,7 elimina» en rojo) a 8,0 s a la derecha, «objetivo 9,3» marcado y tu marca hueca mientras sea «al 60 %». **Sin recorrido, conos ni picas** | `ilustracion/escena_valla.svg`, rehecha |
| I5 | Lámina de la dominada | Técnica TE-1 | 4 paneles: abajo (reglas 1, 2, 6 y 7, consejo «a»), arriba (4 y 5, consejo «b»), agarre de frente (PI-1 palmas al frente, PI-2 agarre algo más ancho que los hombros, PI-3 piernas: se permite cruzarlas; y regla 8) y nulas (3, 1, 4 y 9). Correcciones obligatorias sobre `tecnica_dominada_1..4.svg`: **en las vistas de perfil (paneles 1 y 4) la barra es un círculo de sección**, con la mano rodeándolo, no una cápsula en diagonal que parece un tubo; y **en el panel 3 las tres marcas de posición inicial van numeradas PI-1, PI-2 y PI-3**, no las tres «PI» | `ilustracion/tecnica_dominada_1..4.svg`, con los textos literales de `protocoloDominadas.tecnicaExamen` |
| I6 | Otras láminas | Técnica TE-4, en su ficha | Solo lo que dice `ejercicios[].tecnica`: 2 o 3 marcas por lámina (letra azul, consejo del plan) y un panel «✕ lo que no» solo si `tecnica` nombra el error. Un ángulo lleva número solo si el plan lo da (fondos ~90°, remo 45° o menos, sentadilla con el muslo paralelo). Título de cada lámina: «Qué mirar en tu vídeo». **Prioridad P1: sentadilla, peso muerto rumano, remo y elevación de talón.** P3: plancha y plancha lateral, fondos, jalón y glúteo medio. Si una P3 no está hecha, la ficha va sin imagen, nunca con un marcador vacío | `rig.py` + `tecnica.py` |
| I8 | Pista de la nota | [G1] en Marcas M-1 | Agente en la media; cinta en 5,00; relleno o contorno según el estado | pose `corre` / `celebra` / `dePie` |
| I9 | Corredores de la carrera fantasma | [T6] | Tú (relleno o contorno) y 3:30 (contorno `--ill-meta`). El 3:49 es una raya roja con su rótulo, no un corredor | pose `corre` en contorno: mismo trazado, `fill:none; stroke` |
| I10 | Camino a Cádiz | [G11] en Hoy H-0 | Agente de 24 px en la fecha de hoy | pose `corre` |

La escena «Apto» con pedestales (`escena_apto.svg`) y la del sueño (`escena_sueno*.svg`) **no se usan**: la primera repite [G1] y la segunda repite el color que ya da la lámpara. `mascota_ancha.svg`, `mascota_pasa_meta.svg` y `mascota_cerca_3-49.svg` tampoco: los estados salen de la geometría de I2. La silueta de ciudad de `mascota.svg` se queda como fondo tenue (`--ill-ciudad`) solo en I2; es genérica y no pretende ser la catedral.

**Geometría de I2** (la de `mascota.svg`, comprobada al renderizar a 390 px, a 800 px y en oscuro):

- Caja de referencia 400 × 262; se pinta al 100 % del ancho de su contenedor, como mucho a 560 px, centrada. **Sin fondo propio**.
- Una sola escala para todo: `x(s) = xElim + (229 − s) × k`, con `xElim = 60` y `k = 12` px por segundo. Así, el 3:49 cae en x = 60, el 3:30 (poste de meta) en x = 288 y 3:34 en x = 240. Dominio visible: de 234 s (borde izquierdo) a unos 201 s (borde derecho).
- **Ancla del corredor:** la punta del pie adelantado va en `x(tu marca)`. En la pose `corre` a escala 0,64, el pie está a 24,8 px del origen de la figura: origen = `x(s) − 24,8`.
- **Cotas con la misma `k`:** «N s de margen» de `xElim` a `x(s)` (N = 229 − s), en `--text-2` con raya discontinua `--border-strong`; «faltan N s» de `x(s)` a `x(210)` (N = s − 210), en `--ok` con flecha. Si s ≤ 210, la segunda cota se convierte en «N s por debajo de 3:30» y el corredor pasa la meta (pose `celebra` solo si la marca es real). Si s ≥ 229, no hay cota de margen, el corredor se dibuja en `x(233)`, detrás del poste rojo, y la escena dice «elimina». Si las dos cotas se acercan (menos de 90 px), los rótulos pasan a «N s».
- **Globo** con la marca sobre la cabeza (origen + 9,8 px), en Barlow 700 con `tabular-nums`, fondo `--text` y letra `--surface`.
- **Texto:** 14 unidades en la caja de referencia (12,5 px a 358 px de ancho); por debajo de 390 px de pantalla, `font-size = max(14, 12 × 400 / anchoPintado)` y los banderines se ensanchan con el texto (`getComputedTextLength() + 16`); si el banderín de META no cabe a la derecha de su poste, se dibuja a la izquierda.
- **Colores:** solo variables (§4.2): pista `--ill-pista`, tramo que elimina `--ill-pista-elim`, postes y banderines `--ill-elim` y `--ill-meta` con texto `--ill-flag-txt`, cuadros de meta `--text`.

### 7.3 Láminas técnicas: convención

- **La figura va en gris maniquí** (`--ill-mani`, `--ill-mani-2`) para que solo destaquen las marcas.
- **Marcas:**
  - número negro en círculo = regla del BOE, con su número;
  - letra azul en círculo (`--primary`) = consejo del plan;
  - PI-1, PI-2… = posición inicial del BOE;
  - ✕ rojo = nula o «lo que no»;
  - verde = cota, ángulo o referencia correcta.
- **La leyenda es la lista, en HTML accesible** (no dentro del SVG), con los mismos números. Tocar un número de la leyenda añade `.on` a `[data-n="5"]` en el SVG: la marca se agranda y el resto de marcas baja a `opacity:.35`. Tocar la marca en el dibujo hace lo mismo. No hay una segunda lista con las mismas reglas en la misma sección.
- **Vista de perfil = la barra se ve de sección** (un círculo). La vista frontal enseña la barra entera.
- **Paneles de 360 × 330.** En móvil, carrusel `scroll-snap-type:x mandatory` con puntos de página. En escritorio, rejilla 2 × 2.
- **Sin fotos.** El enlace «Vídeo» (búsqueda de YouTube) queda como botón secundario debajo.

### 7.4 Cómo se integra (M6)

1. M6 copia `rig.py`, `escenas.py` y `tecnica.py` a `impl/herramientas/ilus/` y escribe `impl/herramientas/ilus/exportar.py`. Este script produce `impl/src/js/15_ilus_datos.js`, con `PC.ill._poses = {corre:'<g>…</g>', …}` y `PC.ill._laminas = {dominada:['<svg>…','…','…','…'], sentadilla:[…], …}`.
2. **Colores con variables.** El exportador sustituye cada hexadecimal de `PAL` y `MANI` por su variable:

   | Color de `PAL` | Variable |
   |---|---|
   | `navy` | `--ill-camiseta` |
   | `navyD` | `--ill-camiseta-2` |
   | `navyS` | `--ill-pantalon` |
   | `cap` | `--ill-gorra` |
   | `visor` | `--ill-visera` |
   | `skin` | `--ill-piel` |
   | `skinD` | `--ill-piel-2` |
   | `hair` | `--ill-pelo` |
   | `shoe` | `--ill-zapa` |
   | `shoeD` | `--ill-zapa-2` |
   | `sole` | `--ill-suela` |
   | `accent` | `--ill-vivo` |
   | `ink` | `--text` |
   | `muted` | `--text-3` |
   | `paper` | `--surface` |

   Siempre como `style="fill:var(--…)"` o `style="stroke:var(--…)"`. En `MANI`, los grises pasan a `--ill-mani` y `--ill-mani-2`. Un hexadecimal solo se admite como respaldo dentro de `var()` (`var(--ill-pista,#E8EEF4)`), como en `mascota.svg`, para que el archivo se pueda ver suelto; la QA de M6 rechaza cualquier otro.
3. **Ids únicos por escena.** Cada `id` interno (`title`, `desc`, `clipPath`, `marker`) lleva el prefijo de la escena y un contador (`i2-1-t`), para que dos escenas en la misma página no choquen.
4. **Escenas en JS.** `impl/src/js/16_ilustracion.js`, escrito a mano, monta las escenas como texto SVG a partir de los datos (API en §10.3). El texto dentro del SVG usa Barlow con `tabular-nums`; **nada de Plex Mono**. El dorsal «43» va en `[data-deco]` con `aria-hidden`.
5. **Tamaño:** entre 5 y 9 KB por escena, unos 35 KB para las cuatro láminas de la dominada y unos 8 KB por cada lámina de I6. Presupuesto total de ilustración: 120 KB sin comprimir como mucho (el presupuesto que manda es el de §8.6.9, comprimido).
6. **Sin fechas fijas en los dibujos:** todas las cifras llegan por parámetro.

---

## 8. Datos y mantenimiento

### 8.1 Arquitectura

```
datos/plan.json ──────────┐
datos/historial.json ─────┼─► herramientas/construir_web.py ──► docs/index.html
datos/web.json (nuevo) ───┤      (lista blanca · derivados ·      (plantilla + <script id="datos" type="application/json">)
herramientas/campos.json ─┤       validación · ensamblado)
datos/corpus_web_antigua.html (congelado, solo para validar literalidad)
web/src/** (plantilla: head, css, vistas, js) ─────────────┘
```

En esta fase todo vive en `impl/`: `impl/datos/web.json`, `impl/datos/corpus_web_antigua.html`, `impl/herramientas/{construir_web.py, campos.json, validar_web.py}`, `impl/src/**` y `impl/out/index.html`. Los dos JSON del proyecto se **leen** desde `/Users/Daniel/Documents/plan-cadiz/datos/`. `corpus_web_antigua.html` es una copia byte a byte de `/Users/Daniel/Documents/plan-cadiz/docs/anterior/index.html` (idéntica a la web actual); M1 la copia una vez y anota su sha256 en `web.json` (`corpusSha256`).

### 8.2 Bloque de datos

`<script id="datos" type="application/json">` con `{version, fuente, plan, historial, web, derivados}`, sin espacios y con `</` escapado como `<\/`. Forma completa y ejemplo en el Anexo A. `PC.D` es el objeto ya leído. **Ningún módulo lee `plan`, `historial` o `web` directamente para los días**: los días y los datos derivados se leen con `PC.cal.*` y `PC.D.derivados.*`. Los textos de referencia (`plan.ejercicios`, `plan.reglas`, `plan.sesionesTipo`…) se leen de `PC.D.plan`.

- `derivados.dias` guarda **referencias** (`ref: [índiceSemana, índiceDía]` dentro de `plan.calendario`) y los campos calculados, **no copias** de `sesion` ni `objetivo`. `PC.cal.dia()` compone el objeto `Dia` al vuelo.
- **Lista blanca por consumidor:** en `campos.json`, cada campo de `plan` que sale al bloque lleva `usa: ["M2", …]`. Un campo público que ningún módulo usa **no** se incluye. El constructor imprime los campos descartados.

### 8.3 Lista blanca (`campos.json`)

Base: `mantenimiento/prototipo/campos.json`, que ya está probado. Cambios:

- `plan.atleta.nombre` pasa de `sensible` a **`interno`**: no sale en el bloque, pero «Daniel» ya aparece en el generador de PDF de la dieta y no debe hacer fallar la construcción. Se quita de los centinelas.
- Se añade `web.*` como `publico`: el archivo es propio de la web y se valida aparte (§8.6).
- `revisar` sigue reteniendo `historial.sueno[].causa`, `historial.carrera[].relato` e `historial.dominadas[].relato`.
- Centinelas extra: en `web/herramientas/centinelas.local.json` (archivo local, no se sube al repositorio).
- Los campos nuevos que aparezcan en el historial **paran la construcción** con «campo sin clasificar».
- Cada campo `publico` de `plan` lleva `usa` (§8.2).

### 8.4 `web.json`: solo lo que no está en `plan.json` y no se puede calcular

Lo escribe **M1** para esta fase. Con el tiempo pasa a ser `datos/web.json` del proyecto, y lo mantiene el entrenador. Esquema completo y ejemplos en el Anexo B. Reglas:

1. **Solo texto literal** de `plan.json`, `historial.json` o de la web antigua congelada, o estructura (cortar un texto en campos). Cada entrada lleva `fuente` o `fuentes`.
2. **Cifras como texto** tal cual aparecen en la fuente («1:27», «12,5 kg»). Nunca en segundos ni con otro redondeo.
3. **Derivar antes que copiar.** No van en `web.json` los hitos, la escalera del lastre, la lista de controles, las variantes que el constructor sabe extraer ni el `principal` de las series simples: los calcula el constructor (§8.5). En `web.json` solo quedan las **anulaciones** con motivo (`anula: {…, motivo}`) y lo que la gramática no alcanza.
4. **Firma por día.** Cada `web.dias[f]` lleva `firma`: los 12 primeros caracteres del sha1 del objeto de `plan.calendario` de ese día, serializado con claves ordenadas, sin espacios y con `ensure_ascii=False`. Si el día cambia en `plan.json`, la firma deja de coincidir y la construcción se para (§8.6.2). Lo mismo para `web.decide[i].firma` (sobre el día o el bloque de `plan.json` del que sale) y `web.condiciones.*.firma`.
5. **Estructura con su origen.** Cada campo estructurado lleva `desde`: la subcadena literal de la que sale (por ejemplo `"quitar":["E"], "desde":"sin rumano"`). La QA enseña juntos el campo y su `desde` para que un humano lo revise.
6. **Días (`dias`):** entrada solo para los días con sesión del 28-9 al 25-10 (y los de las dos versiones de la última semana: claves `v1:Mié 21`, `v2:Lun 26`…) que necesitan algo que el constructor no saca solo: un `titulo` corto cuando el derivado no sirve («Depende de la fecha de la prueba» no es un rótulo), números por color, `fuerza` por color, `condicion`, `principal` compuesto (kilómetro partido, 600 + 400, criterio del 12-10, objetivo con alternativa), `pasos` de control, `calidad` o `registroCampos` distintos de los de su tipo. El validador avisa de cada día futuro con series que no tiene `principal` derivable ni entrada.
7. **Caducidad:** `avisos[]` lleva `desde` y `hasta`; `pendientes[]`, `desde`.
8. Lo que se escribía a mano en el HTML y no es obsoleto pasa a `textos` (N4, N6, N7, E28, E31, E32, E33, E34, G9, R6, R7, R8, la frase de Garmin de S10 y `diag19`), a `videos` (las consultas de `FICHAS`) y a `hechosAntiguos` (la línea «Hecho» de cada ficha de `DIADET` del 11 al 27-9 cuyo día no tiene entrada en `historial`, con `fuente:"html:S14"`).
9. `resueltos`: lista de conflictos del Anexo D ya resueltos por el entrenador (por ejemplo `"K5"`). Mientras un conflicto no esté ahí, la web lo sigue enseñando.

### 8.5 Lo que calcula el constructor (`derivados`)

| Campo | Cálculo |
|---|---|
| `dias[]` | Una entrada por día con `fecha` de `plan.calendario[].dias`: `ref` (índices), `semana`, `bloque` (A, B o C según `bloques`), `hist` (las entradas del historial de esa fecha, `[{src:"carrera:2026-09-28", valida, hecho, resumen}]`), `estado`, `variantes` y `principal`. **Ojo:** `registro` ya es un campo del plan (la instrucción de qué apuntar) y no se pisa. **`variantes`:** primero `web.dias[f].variantes`; si falta, el constructor las extrae del `objetivo`: marcas en mayúsculas VERDE, ÁMBAR o ROJO con o sin dos puntos (el 29-9 usa «VERDE:» y el 30-9 «VERDE × 2»); cada tramo acaba en la marca siguiente o en el primer «. », y lo que queda después va a `comun`. **`principal`:** primero `web.dias[f].principal`; si falta y la `sesion` casa con la gramática `(\d+) × (\d+) m(?:, rec\. ([^+·()]+))?` y el `objetivo` empieza por un tiempo (`\d:\d{2}(,\d)?`) sin alternativa («si …»), `{tipo:"series", n, dist, rec, obj}` con `primer200` de `ritmos[bloque]`; si el `objetivo` no da tiempo, `obj` sale de `ritmos[bloque].m<dist>` |
| `final` | `{semana, titulo, nota, versiones:[{clave:"26-27" o "28-30", nombre, dias:[{dia, fecha, tipo, sesion, clave}]}]}`. «Mié 21» se convierte en 2026-10-21 y «Prueba» en `fecha:null` |
| `bloques` | `[{clave, desde, hasta, m200, m400, m600, objetivo1000, condicion}]` a partir de `ritmos[].cuando`: A del 21-9 al 4-10, B del 5 al 18-10, C del 19-10 al 30-10 (el C incluye «el día de la prueba») |
| `hitos` | Los días con `clave:true` (pasados y futuros), los días de `web.decide` y la ventana de la prueba (`objetivo.pruebasFisicas`), con `etiqueta` = `web.dias[f].titulo` o el primer tramo de la `sesion` (la misma regla que el título de la tarjeta: sin la hora inicial, hasta «:», «(», «+» o «·», mayúscula solo al principio). `web.anula.hitos` puede quitar o renombrar uno, con motivo |
| `lastre` | Una fila por `protocoloDominadas.progresion[i]` (`semana`, `habituacion`, `fuerza`, `sabado`, `porQue`, literales) con `estado`: `hecho` si `historial.dominadas` tiene una sesión con lastre esa semana, `sin registro` si la semana ya pasó y no la tiene, `esta semana` o `por venir` |
| `controles` | Los días `tipo:"control"` del calendario (con su `hist` si ya pasaron) más `web.controlesExtra` (el 600 m del 31-8, que no está en el calendario) y la ventana de la prueba |
| `noches` | `historial.sueno` sin la entrada de rango (`2026-08-25/31`), ordenado de más antiguo a más reciente, con `min` y `color` (verde, ámbar o rojo con los cortes 390 y 300) |
| `marcas` | `{mil:{txt:"3:34", s:214, pts:3, fiab:"medido", banda:["3:30","3:38"]}, dom:{reps:11, pts:5, fiab:"autoinformado"}, cir:{s:9.9, pts:6, fiab:"al 60 %"}, media:4.67, resultado:"NO APTO"}`, calculado con el baremo y comprobado contra `marcasActuales.*.puntos` |
| `series[]` | Sesiones con `tiemposS`, `tiempos` o `parciales200`, normalizadas a `{fecha, sesion, valida, objetivo:"1:27" o null, tiemposS:[…], parciales:[[a,b]…] o null, fcMax:[…] o null}`. El objetivo sale del `objetivo` del día en `historial` con la misma gramática, o de `web.series[fecha].objetivo` |
| `perfiles[]` | Tramos de 200 en segundos: 19-9 (`parciales200.tramosS`), 31-8 (`["43,0","43,9","45,0"]` → números) y los futuros cuando existan |
| `datosHasta` | La fecha máxima de todos los arrays del historial |
| `faltanNoches` | Noches sin CSV desde la primera medida (no se publica; se imprime al construir) |

`fuente = {hash (sha256 de plan + historial + web, 16 caracteres), construido (AAAA-MM-DD), indice:[…src…]}`.

### 8.6 Validación (`validar_web.py`; `--render` añade Chrome sin cabecera)

**ERRORES** (bloquean la publicación):

1. **Sello:** el `hash` no coincide con los JSON actuales (la web no está reconstruida).
2. **Firmas:** algún `web.dias[f].firma`, `web.decide[i].firma` o `web.condiciones.*.firma` no coincide con `plan.json`. Mensaje: «El 2026-10-05 cambió en plan.json: revisa web.dias».
3. **Cobertura:** falta en el bloque alguna entrada de `carrera`, `dominadas`, `circuito`, `sueno` (salvo el rango), `garmin`, `composicion` o `evolucionEstimacion`. Con `--render`: falta un elemento `[data-src="<array>:<fecha>"]` pintado en Marcas › Registro.
4. **Privacidad:** aparece en el HTML algún valor `sensible`, centinela o `revisar`.
5. **Sintaxis:** cualquier `<script>` que no sea JSON falla con `node -e "new Function(src)"`, o el bloque de datos no se puede leer.
6. **Literalidad**, con un **corpus fijo**: `plan.json` + `historial.json` + `corpus_web_antigua.html` (comprobado por su sha256). **Nunca** el `docs/index.html` generado, que contiene `web.json` y haría la prueba circular. Se comprueba:
   - toda cifra (`\d+(?:[,.:]\d+)*`) de cualquier texto de `web.json` aparece en el corpus; se permiten los números de regla del BOE (1 a 9) y los ordinales de serie;
   - cada `web.dias[f].variantes.*` es subcadena literal del `objetivo` del día o del texto de `reglas[dia-torcido]`; cada texto de `web.semaforo`, subcadena de `reglas[dia-torcido]`;
   - cada `condicion.opciones[].txt` y cada `desde` es subcadena literal del `objetivo` o la `sesion` de su día (o del campo que nombre su `fuente`).
7. **Baremo:** falta el tramo que elimina en 3:49; los puntos o la media de un escenario no cuadran; `marcasActuales.*.puntos` no cuadra; la marca de corte viva no reproduce `sensibilidad` con el escenario realista.
8. **Calendario:** un día fuera de su semana, un día de la semana que no corresponde a la fecha, o una fecha repetida.
9. **Tamaño:** `out/index.html` **comprimido con gzip** pasa de 190 KB. Hoy la web pesa 94 KB comprimida (308 KB sin comprimir); se imprime también el tamaño sin comprimir.
10. **Plantilla:** hay emoji (Unicode `\p{Extended_Pictographic}`) literal en `src/`. Los datos no se revisan. El código de Dieta no lleva ninguno después del cambio 9 de §9.1.
11. **Conflicto K5 sin resolver desde el 3-10:** si `construido ≥ 2026-10-03` y `K5` no está en `web.resueltos`, error «El reparto del 10-10 sigue sin decidir (K5): pregúntalo antes del sábado». Se puede construir igualmente con `--aceptar-conflicto K5`, que lo deja como aviso y lo imprime en rojo: así no impide publicar el registro de otras sesiones.
12. **Render (`--render`):**
    - `window.__errores` no está vacío en alguna de las cinco rutas;
    - hay menos de 1 `[data-umbral="229"]` visible en alguno de los sitios de §6.1.7 que la QA recorre (§10.6.6);
    - la pestaña Hoy no pinta la tarjeta de sesión de la fecha `?hoy=` en los días de prueba de §10.6;
    - hay texto de «pc-tab», «FIG», «FOTOS» o «DIADET» en el HTML, o alguna petición a `raw.githubusercontent.com`.

**AVISOS** (se listan, no bloquean):

- los conflictos K1–K18 del Anexo D que no estén en `web.resueltos`, detectados cada uno con su regla;
- avisos caducados (`hasta` anterior a `construido`);
- días futuros con series sin `principal` derivable ni entrada en `web.dias`;
- noches sin CSV;
- rodajes sin la deriva por mitades desde el 23-9;
- arrays del historial que no están en orden descendente;
- días pasados con sesión y sin registro (hoy saltan el 17-9 y el 24-9).

### 8.7 Qué se genera y qué se escribe a mano

- **Se genera** (nunca a mano): semana y tarjeta de Hoy, calendario con bloques e hitos, camino, todas las gráficas, tablas de historial y recuentos, marcas y puntos, escalas del baremo, escenarios del simulador, zonas y ritmos, escalera del lastre, lista de controles, «Configura el reloj», cuenta atrás, sello «Datos hasta…», semáforo de cada noche en la gráfica, la escala del 1.000 y el `principal` de las series simples.
- **Se escribe a mano** (el entrenador):
  - en `historial.json`, cada sesión con `resumen`, `valida` y `valoracion`, más las métricas;
  - en `plan.json`, los cambios de calendario, marcas, estimaciones y reglas;
  - en `web.json`, **solo** lo que la gramática no alcanza (números por color, fuerza por color, condiciones, principal compuesto, pasos de control), los avisos con fecha, los pendientes, las decisiones y los conflictos resueltos. Si cambia un día en `plan.json`, la construcción avisa por la firma de qué entrada hay que revisar.
- **Solo se toca al rediseñar:** la plantilla (`web/src`).

### 8.8 Nueva tabla del Paso 5 (propuesta para el `CLAUDE.md`; la decide Daniel)

| Llega | Se escribe en | Sale solo en la web |
|---|---|---|
| Sesión de carrera (FIT) | `historial.carrera` (resumen, valida, valoracion, métricas) | Hoy (estado del día), Plan (celda), Marcas: registro, [G3], [G5], [G8] |
| Fuerza o dominadas | `historial.dominadas` (series como lista, lastreKg, reserva) | Marcas [G6], registro, Técnica [G15], Hoy |
| Circuito | `historial.circuito` (intentosS, comparable, nulos) | Marcas M-1 y [G7], Técnica TE-3, `.umb` de Hoy |
| CSV de sueño | `historial.sueno` | [G4] y el «ayer» del semáforo |
| Captura del Garmin | `historial.garmin` | [G9] |
| Marca o estimación nueva | `historial.*` y `plan.marcasActuales` | Chip de nota, M-1, [G3], simulador |
| Cambio de plan | `plan.calendario` y, **solo si la construcción lo pide por la firma o por falta de `principal`**, `web.dias[f]` | Hoy, Plan, Técnica › Reloj |
| Aviso con fecha, pendiente, decisión o conflicto resuelto | `web.avisos`, `web.pendientes`, `web.decisiones`, `web.resueltos` | Hoy, Marcas y Plan (se oculta solo) |
| Composición | `historial.composicion` | Marcas M-5 |
| Dieta | nada (la pauta es de la nutricionista) | — |

**Siempre después:** `python3 herramientas/construir_web.py && python3 herramientas/validar_web.py --render`, abrir la página y publicar **solo** cuando Daniel lo pida. `docs/index.html` no se edita nunca a mano; el validador lo detecta por el sello. `herramientas/calendario_web.py` se retira: su lógica pasa al constructor y al JS.

### 8.9 Paso a producción y vuelta atrás (fuera de esta fase; lo decide Daniel)

0. **Copia para volver atrás:** `docs/anterior/index.html` ya existe y es idéntica byte a byte a la versión actual, pero no está en git (`?? docs/anterior/`): hasta que se haga commit, solo vive en este Mac. Antes de publicar la nueva hay que decidir dos cosas. Una, crear `git tag web-v1-antes-rediseno` sobre el commit actual. Dos, si `docs/anterior/` se versiona: dentro de `docs/`, GitHub Pages la publicaría en `/plan-cadiz/anterior/`, con el mismo origen y, por tanto, el mismo `localStorage` (`pc-reg` se comparte, que es bueno). Si no se quiere pública, se mueve fuera de `docs/`. Para volver atrás: `git checkout web-v1-antes-rediseno -- docs/index.html`, o copiar `docs/anterior/index.html` encima de `docs/index.html`.
1. Copiar `impl/src` a `web/src`, `impl/herramientas/*` a `herramientas/`, `impl/datos/web.json` a `datos/web.json` e `impl/datos/corpus_web_antigua.html` a `datos/corpus_web_antigua.html`.
2. Resolver con el entrenador las decisiones del Anexo D (o dejarlas como avisos).
3. Construir, validar con `--render`, hacer las pruebas manuales de §10.6 en el iPhone y publicar cuando Daniel lo diga.
4. Reescribir la tabla del Paso 5 del `CLAUDE.md` (§8.8), también con permiso de Daniel.

---

## 9. Qué se conserva intacto por dentro y cómo se reestiliza

### 9.1 La app de Dieta (M7)

- **Qué se mueve.** El código de `docs/index.html` (primer `<script>`) desde la declaración `var F` (primera aparición, en el carácter 187.100) hasta justo antes de `['s-mil','s-dom','s-cir'].forEach` (carácter 264.033, el final del IIFE principal): 76.933 caracteres. Se copia **tal cual** a `impl/src/js/60_dieta.js`, dentro de su propio IIFE.

  Dentro de ese bloque viven `F`, `FIJAS`, `DIAS`, `REC`, `MET`, `RAC`, `PROT`, `CARB`, `EXTRAS`, `CUSTOM`, el buscador de Open Food Facts, el registro (`REG` / `pc-reg`), el PDF (`cargaJsPDF`, `generaPDF`), el intercambio, las sugerencias, las recetas y `bindTimers`. Nada de esto cambia.
- **Dependencias.** El bloque llama a dos cosas de fuera: `legend()` y el objeto `C` (tres usos). `legend()` se copia literal del principio del mismo script. `el()` **no se llama** (las 63 apariciones de «el» son el artículo dentro de textos), pero se copia también, por si acaso. `C` se redefine con variables:

  ```js
  var C = {ink:'var(--text)', muted:'var(--text-2)', faint:'var(--text-3)', rule:'var(--border)', alert:'var(--bad)', ok:'var(--ok)', warn:'var(--warn)', blue:'var(--s1)', band:'var(--surface-2)'};
  ```

  Si alguno de los 3 usos de `C.` acaba en un atributo de presentación SVG (`fill=`, `stroke=`), esa llamada concreta pasa a `style`.
- **Identificadores del DOM que se conservan** (el código depende de ellos): `m-kcal`, `m-hc`, `m-pr`, `m-gr`, `m-bars`, `lg-dia`, `lg-modo`, `btn-reset`, `reg-box`, `pdf-opts`, `swap`, `dieta-body`, `sel-c`, `sel-n`, `reg-t`, `reg-pdf` y `reg-clr`. Se conservan también todas las clases que genera el JS (`acc`, `addbtn`, `addrow`, `btn`, `conf`, `del`, `done`, `eq`, `exrow`, `gl`, `gsel`, `gt`, `hd`, `hot`, `in`, `lb`, `libre`, `ln`, `man`, `mg`, `mh`, `mk`, `mm`, `mn`, `mp`, `num`, `ok`, `ok2`, `po`, `protsel`, `pw`, `q`, `rc`, `rec`, `regb`, `res`, `resrow`, `rn`, `row`, `rs`, `run`, `st`, `step`, `sug`, `sugb`, `tm`, `tx`, `warn`, `when`, `zn`).
- **Cambios permitidos** (lista cerrada):
  1. Envolverlo en un IIFE con los apoyos anteriores.
  2. Arranque en el día de hoy: `diaSel = selC = selN = (PC.hoy().getDay()+6)%7`, y `aria-pressed` inicial con `i === diaSel` en lugar de `i === 0`.
  3. `67.4` pasa a `PC.D.plan.atleta.pesoKg` (66,5, la serie Tanita).
  4. El verde de la proteína pasa de `pr >= 130 && pr <= 150` a `<= 145`, que es lo que dice el propio texto.
  5. El aviso de compatibilidad («Ese día repite…») no sale cuando `selC === diaSel && selN === diaSel`, es decir, con la combinación original de la nutricionista.
  6. En los estilos en línea que genera el JS: `font-size` por debajo de `.75rem` sube a `.75rem`, y los colores hexadecimales pasan a sus variables (`#…` → `var(--…)`) para el modo oscuro.
  7. Del HTML de la vista se quitan las cajas «Cómo leer esto» (queda la línea del pie) y «Lo único que te pido».
  8. (P3, opcional) Un `MutationObserver`, **fuera** del IIFE, cierra en el primer pintado las comidas que no tocan por la hora (antes de las 10:00 desayuno, antes de las 12:30 media mañana, antes de las 16:00 comida, antes de las 19:00 merienda, y cena después). Solo si `pintaDieta` pinta `details`; si no, no se hace.
  9. **Los dos «▶ » de los botones de temporizador de las recetas** (en el texto inicial del botón y en el que se repone al pararlo) pasan a la secuencia de escape `'▶︎ '`. En el archivo fuente no queda ningún pictograma literal (el validador de §8.6.10 pasa) y en pantalla se ve el mismo triángulo en presentación de texto, nunca como emoji.
- **Se mantienen:** la clave `pc-reg` y su formato (el registro de comidas de Daniel sobrevive al cambio), jsPDF desde cdnjs bajo demanda y el texto «Daniel ·» del PDF.
- **Reestilo** (`impl/src/css/60_dieta.css`, todo dentro de `@layer dieta{…}` y bajo `#v-dieta`). **Decisión: Dieta conserva su propio aspecto para sus clases** (su `.acc`, su `.btn`, su `.legend`…), pasado a los tokens nuevos; no usa las de `10_sistema.css`. Para que las dos no se mezclen:
  - la primera regla de la capa es un reinicio **sin especificidad añadida** para las clases que chocan: `#v-dieta :where(.acc, .acc>summary, .acc>.in, .btn, .legend, .legend>button, .in, .num, .ok, .warn){all:revert}`. `revert` (no `revert-layer`, que devolvería los valores de la capa del sistema) las lleva a los valores del navegador, y `:where()` hace que cualquier regla copiada después (`#v-dieta .acc{…}`) gane sin pelear;
  - las reglas del CSS antiguo para `.reg`, `.pdfopts`, `.swap`, `.rec`, `.sug`, `.legend`, `.calc`, `.acc` y el resto de clases de la lista se copian detrás, con `#v-dieta` delante, y se adaptan;
  - alias de variables antiguas: `#v-dieta{--muted:var(--text-2);--faint:var(--text-3);--rule:var(--border);--rule2:var(--border-strong);--paper:var(--surface);--panel:var(--surface-2);--ink:var(--text);--alert:var(--bad);--alert-bg:var(--bad-soft);--ok-bg:var(--ok-soft);--warn-bg:var(--warn-soft);--band:var(--surface-2);--blue:var(--s1)}`;
  - panel de macros fijo en `top: env(safe-area-inset-top)` en móvil y `top: 56px` desde 1024 px;
  - botones de `#lg-dia` y `#lg-modo` a 44 px;
  - cada comida como tarjeta (borde, radio `--r-md`, sombra `--sh-1`);
  - números con `tabular-nums`.
- **Prueba de paridad** (`impl/qa/paridad_dieta.py`, M7). Carga la versión antigua (`docs/anterior/index.html`) y la nueva en Chrome sin cabecera y comprueba, sin ningún error en `__errores`:
  1. para cada día de lunes a domingo y cada modo (normal, calidad y post), `m-kcal`, `m-hc`, `m-pr` y `m-gr` idénticos; la única diferencia admitida es la línea de gramos de proteína por kg, que cambia por el 66,5;
  2. alta manual de un alimento y cambio de gramos: los macros cambian igual en las dos;
  3. quitar con × y deshacer;
  4. intercambio de comida y cena: el aviso aparece en una combinación cambiada y **no** en la original;
  5. cambio de proteína y de hidrato;
  6. marcar un día en el registro y comprobar que `pc-reg` sobrevive a recargar la página;
  7. el botón PDF intenta cargar jsPDF (con red) o, sin red, no lanza ningún error;
  8. el temporizador de una receta arranca, cambia de texto y se para.

### 9.2 Fechas dinámicas

- Se mantiene el principio: «hoy» es `new Date()` local a las 00:00, calculado al cargar. El código antiguo (`cd1`–`cd3`, `.day[data-d]`, `hoy-txt`) se va y lo sustituye `PC.hoy()`.
- Para pruebas se admiten `?hoy=AAAA-MM-DD` y `?hora=HH:MM`.
- Si la página sigue abierta al cambiar de día (se comprueba en `visibilitychange` y cada 10 min), se vuelven a pintar las vistas ya iniciadas.
- Ninguna plantilla, CSS ni JS escribe una fecha de «hoy». Las fechas del plan solo llegan por datos.

### 9.3 Se conserva también

- Los enlaces de vídeo como **búsquedas** de YouTube (nunca vídeos concretos).
- `@media print`.
- Las metas de app para añadir a la pantalla de inicio.
- El orden de las pruebas y el baremo exactos.
- La web sigue siendo un solo archivo en `docs/` para GitHub Pages.

---

## 10. Plan de implementación

### 10.1 Módulos

| Módulo | Qué hace | Archivos propios (dentro de `impl/`) | Depende de | Fase |
|---|---|---|---|---|
| **M0 · Núcleo y sistema** | Esqueleto, sistema de diseño con capas, sprite de iconos (con `app` y `tecnica`), API `PC` (salvo lo marcado para otros), enrutador con memoria de posición, `PC.timer`, `PC.audio`, ensamblado y banco de QA | `build.py`, `src/00_head.html`, `src/20_shell.html`, `src/css/10_sistema.css`, `src/js/00_core.js`, `src/js/99_arranque.js`, `datos/muestra.json`, `qa/marco.html`, `qa/qa.py`, `qa/sem_casos.json`, `qa/baremo_casos.json`, `qa/parse_casos.json` | — | 0 |
| **M1 · Datos** | Constructor (derivados, gramática del `principal`, hitos, lastre, controles), lista blanca por consumidor, validador (firmas, corpus fijo, K5), `web.json` completo, copia congelada del corpus y frases clave | `herramientas/construir_web.py`, `herramientas/campos.json`, `herramientas/validar_web.py`, `datos/web.json`, `datos/corpus_web_antigua.html`, `qa/frases_clave.json` | — | 0 (en paralelo con M0) |
| **M6 · Ilustración** | Exportador de poses, escenas I2–I4 e I8–I10, láminas I5 (corregida) e I6 (cuatro en P1) y API `PC.ill` | `herramientas/ilus/*`, `src/js/15_ilus_datos.js` (generado), `src/js/16_ilustracion.js`, `src/css/16_ilus.css` | M0 (tokens) | 0–1 |
| **M2 · Hoy** | Vista Hoy, [G11], T1, T2, T3, T4, T11, `PC.sem`, `PC.sesion` y `PC.cond` | `src/views/hoy.html`, `src/css/20_hoy.css`, `src/js/20_hoy.js` | M0, M1; usa M4 (`PC.graf.series`), M5 (`PC.herr.circuito`) y M6 si existen | 1 |
| **M3 · Plan** | Vista Plan, T9 (calendario con bloques e hitos), G13, G14, las reglas y la hoja de día | `src/views/plan.html`, `src/css/30_plan.css`, `src/js/30_plan.js` | M0, M1; usa `PC.sesion.tarjeta` (M2) | 1 |
| **M4 · Marcas** | Vista Marcas, T5 dentro de M-1, T10, G1–G10, G12 y G16 | `src/views/marcas.html`, `src/css/40_marcas.css`, `src/js/40_marcas.js` | M0, M1, M6 | 1 |
| **M5 · Técnica** | Vista Técnica, T6, T7, T8, G15, fichas, reloj y material | `src/views/tecnica.html`, `src/css/50_tecnica.css`, `src/js/50_tecnica.js` | M0, M1, M6; usa `PC.sesion.reloj` (M2) | 1 |
| **M7 · Dieta** | Traslado, reestilo con capa propia, ajustes de §9.1 y prueba de paridad ampliada | `src/views/dieta.html`, `src/css/60_dieta.css`, `src/js/60_dieta.js`, `qa/paridad_dieta.py` | M0 | 1 |
| **M8 · Integración y QA** | Construir, pasar toda la QA de §10.6, corregir fallos de integración (anotando cada cambio al final de su respuesta), capturas finales y lista de pruebas manuales para el iPhone | cualquiera, solo para integrar; `capturas/` | todos | 2 |

**Orden.** Fase 0: M0, M1 y M6 en paralelo. M0 publica primero `00_core.js`, el esqueleto y `build.py` con `datos/muestra.json`. Fase 1: M2, M3, M4, M5 y M7 en paralelo, construyendo con `build.py` sobre los datos reales de M1 en cuanto existan (si no, sobre la muestra). Fase 2: M8.

**Reglas para todos:**

- Ningún módulo edita archivos de otro.
- Si necesita una función de otro módulo que aún no existe, comprueba que existe (`if (PC.herr && PC.herr.circuito)`) y, si no, pinta un enlace a donde vivirá. No la reimplementa.
- Si necesita un componente genérico que no está en §4.8, lo crea con el prefijo de su módulo (`hoy-`, `pl-`/`cal-`, `mc-`, `te-`, `di-`, `ill-`). M8 puede subirlo después al sistema.
- Todo el CSS de un módulo va con el prefijo de su clase o bajo `#v-<vista>`, dentro de su capa (§4.4).

### 10.2 Ensamblado

`python3 impl/build.py [--hoy AAAA-MM-DD] [--muestra] [--aceptar-conflicto K5]`:

1. Importa `impl/herramientas/construir_web.py` y llama a `construir(plan, historial, web, campos) → (datos, errores, avisos)`. Con errores, se para.
2. Lee `src/00_head.html` y sustituye `/*__CSS__*/` por `@layer sistema, modulos, dieta;` seguido de todos los `src/css/*.css` por orden de nombre, cada uno envuelto en su capa: `10_*` → `sistema`; `16_*`, `20_*`, `30_*`, `40_*`, `50_*` → `modulos`; `60_*` → `dieta`.
3. Lee `src/20_shell.html` y sustituye cada `<!--__VISTA:hoy-->` (y las demás) por `src/views/<vista>.html`, `<!--__DATOS__-->` por el bloque de datos y `<!--__JS__-->` por **un `<script>` por archivo** de `src/js/*.js`, por orden de nombre. Así, un error en un módulo no tumba a los demás.
4. Escribe `out/index.html` e imprime el tamaño sin comprimir y comprimido con gzip.

`src/20_shell.html` contiene `.sb-fondo`, la `.appbar` de escritorio, las cinco `section.view` con su `.container`, su `.vh` (salvo Hoy) y el hueco de la vista, la `.tabbar`, la hoja, el `#focus`, `.destello` y `#toast`.

### 10.3 Interfaz común `PC` (la implementa M0 salvo lo indicado)

```text
PC.D                                   datos del bloque (Anexo A)
PC.hoy() → Date (00:00 local; ?hoy=)   PC.hoyIso() → 'AAAA-MM-DD'   PC.ahoraMin() → minutos (acepta ?hora=HH:MM)
PC.iso(date) · PC.fecha(iso) → Date · PC.dias(isoA, isoB) → entero (b − a)
PC.fmt.dia(iso, 'corta'|'larga'|'dow') → 'mar 29-9' | 'martes 29 de septiembre' | 'Mar'
PC.fmt.t(seg, dec=0) → '3:34' | '1:26,9'     PC.fmt.s(seg, dec=1) → '9,9 s'     PC.fmt.num(v, dec) → '4,67'
PC.fmt.parseT(txt) → seg|null  ('1:27' '1:27,5' '87,5' '87.5' '1.27.5' '1,27,5' '127,5' '0:43,5' '9,4' '334' '3:34')
                                       regla: con «:» o dos separadores → m:s[,d]; con un solo separador y 3+ cifras delante → mss,d;
                                       si no, segundos con decimales
PC.fmt.sueno(min) → '6h30'     PC.fmt.parseSueno('7h01') → 421
PC.baremo.pts(prueba, valor) → 0..10         prueba ∈ {'mil' (s), 'dom' (reps), 'cir' (s)}
                                       1.000 y circuito: primer tramo cuyo límite superior ≥ valor, sin redondear
                                       (3:30,4 da 3 pts: criterio conservador); dominadas: enteros
PC.baremo.tramos(prueba) → [{pts, min, max}] (números; max null = abierto)
PC.baremo.siguiente(prueba, valor) → {pts, objetivo, diferencia} | null
PC.baremo.corte(prueba, ptsNecesarios) → peor marca que da esos puntos | null      (marca de corte viva, G10)
PC.baremo.resultado([p1,p2,p3]) → {media, txt:'APTO'|'NO APTO'|'ELIMINADO'}
PC.cal.dia(iso) → Dia|null     PC.cal.semana(iso) → [Dia|null ×7] (lun..dom)
PC.cal.estado(dia) → 'hoy'|'hecho'|'nomide'|'miss'|'noreg'|'futuro'|'rest'
PC.cal.bloque(iso) → 'A'|'B'|'C'|null   PC.cal.hitos() → [hito]   PC.cal.proximo(iso) → hito|null
PC.cal.version() → '26-27'|'28-30'|null (pc-prueba)   PC.cal.final() → derivados.final
PC.cal.horaIni(dia) · PC.cal.horaFin(dia) → minutos|null
        de 'hora' ('18:00-19:30' → 1080 / 1170); si no hay 'hora': la hora con la que EMPIEZA 'sesion'
        (/^(\d{1,2}):(\d{2})\b/, «21:30 circuito…» → 1290) o, en circuito, sesionesTipo.juevesCircuito.hora;
        horaFin = horaIni + 60 cuando no hay segunda hora; si no hay ninguna, null.
        (Nunca se busca una hora en medio de 'sesion': «rec. 2:30» o «1:27» no son horas.)
PC.web.avisos(donde) → activos hoy   PC.web.pendientes() → sin marcar primero   PC.web.resuelto(id) → bool
PC.store.get(k, def) · set(k, v) · del(k)    (prefijo 'pc-' automático; JSON; try/catch; sin almacenamiento no falla)
PC.vista(nombre, {init(root), show(sub), resize()})    PC.ir('#marcas/nota')    PC.ruta() → {vista, sub}
        guarda y recupera scrollY por vista; tocar la pestaña activa sube arriba
PC.alRedimensionar(el, fn)            ResizeObserver con espera de 120 ms
PC.el(tag, attrs, html) → Element · PC.svg(tag, attrs, parent) → SVGElement · PC.esc(txt)
PC.icon(nombre, cls) → '<svg class="icon cls"><use href="#i-nombre"/></svg>'
PC.copiar(texto) → Promise (+ toast «Copiado») · PC.toast(txt, ms=1800)
PC.vibrar(patron) → no hace nada si navigator.vibrate no existe
PC.audio.desbloquear() · PC.audio.pitido(n=1) · PC.audio.activo() → bool (pc-sonido)
PC.timer.crear({seg, avisoSeg:10, alAviso, alCero}) → {empezar(), pausa(), sumar(s), saltar(), parar(), restante()}
        calcula con Date.now() y una hora de fin; se recupera en visibilitychange; al cero: pitido ×3, .destello, vibrar
PC.sheet.abrir(titulo, nodo|html) · PC.sheet.cerrar()
PC.focus.abrir({titulo, nodo}) · PC.focus.cerrar() · PC.wake.pedir() · PC.wake.soltar()
PC.chart.base(figure, {h, m:{t,r,b,l}}) → {svg, w, h, iw, ih, g}   (limpia .chart-c; svg role=img)
PC.chart.lineal(d0, d1, r0, r1) → f (f.inv)    PC.chart.tiempo(iso0, iso1, r0, r1) → f(iso)
PC.chart.ejeY(ctx, f, valores, fmt) · PC.chart.ejeFechas(ctx, f, iso0, iso1)   (solo lunes)
PC.chart.seleccion(ctx, puntos[{x, y, nodo, html}], iPorDefecto)   → rellena .pick, .sel/.dim, teclado
PC.chart.umbral1000(ctx, {y|x, orient:'h'|'v', etiqueta:'3:49 elimina'})   (data-umbral="229")
PC.chart.tabla(figure, cabeceras, filas)                               ("Ver datos")
— M2: PC.sem.calcular(entrada) → salida · PC.sem.hoy() → salida guardada|null
       PC.sesion.pasos(dia, color, opcion) · PC.sesion.reloj(dia) → [líneas] · PC.sesion.tarjeta(dia, {modo:'hoy'|'hoja'}) → Element
       PC.cond.de(dia) → {tipo:'opciones'|'calculo', …}|null · PC.cond.valor(dia) → opción elegida|cifra|null
       PC.graf.camino(host)                                              (G11)
— M4: PC.graf.series(host, sesion|{fecha, reps, objetivo}) · PC.graf.notaPista(host, {media, real, resultado, escenarios})
— M5: PC.herr.reparto(host) · PC.herr.contador(host, {fecha}) · PC.herr.circuito(host, {fecha, intentos:1|3, lectura:bool})
— M6: PC.ill.corredor(pose, {h, contorno}) → '<g>' · PC.ill.pista1000(host, {s, real})
       PC.ill.barra(host, {reps, validado, real}) · PC.ill.valla(host, {t|null, real}) · PC.ill.lamina(host, id) (leyenda HTML incluida)
```

**Tipo `Dia`**, lo que devuelve `PC.cal.dia`:

```text
{fecha, dia:'Mar', semana, semanaTitulo, semanaNota,
 tipo:'carrera'|'fuerza'|'circuito'|'control'|'descanso'|'examen'|'prueba',
 sesion, objetivo, hora, lugar, clave, regla, protocolo, decide, semaforo, medir, nota, porQue, registro, hecho,
 hist:[{src, valida, hecho, resumen}], bloque:'A'|'B'|'C'|null, estado,
 variantes:{base?, verde?, ambar?, rojo?, comun?}, principal|null,
 condicion|null, conflictos:[{id, a:{campo, texto}, b:{campo, texto}}], hechoAntiguo|null,
 extra: web.dias[fecha] | null}
```

**Arranque** (`99_arranque.js`): se pinta el chip de nota, se inicia el enrutador, se borra `pc-tab`, se muestra la ruta y `init` de cada vista se llama **solo la primera vez que se muestra**. Con `?qa=1` se activa el modo de QA (§10.6).

### 10.4 Almacenamiento local (solo comodidad; la web funciona sin él)

| Clave | Contenido | Módulo |
|---|---|---|
| `pc-tema` | 'light' \| 'dark' (sin valor = sistema) | M0 |
| `pc-sonido` | true \| false (por defecto, true) | M0 |
| `pc-timer` | hora de fin del temporizador activo (en `sessionStorage`) | M0 |
| `pc-sem-AAAA-MM-DD` | entradas y salida del semáforo (§6.2 T1) | M2 |
| `pc-ses-AAAA-MM-DD` | casillas, categorías y tiempos, gimnasio y «cómo fue» | M2 |
| `pc-cond-AAAA-MM-DD` | opción elegida en la condición de ese día | M2 |
| `pc-bloqueC` | 'si' \| 'no' (condición compartida del bloque C) | M2 |
| `pc-sol` | contraste alto del modo pista | M2 |
| `pc-pend` | ids de pendientes marcados | M3 (lo lee M2) |
| `pc-prueba` | '26-27' \| '28-30' | M3 (lo leen M2 y M0) |
| `pc-graf` | última gráfica elegida en Marcas | M4 |
| `pc-reparto` | los 5 tramos | M5 |
| `pc-dom-AAAA-MM-DD` | contador de válidas | M5 |
| `pc-cir-AAAA-MM-DD` | registro del jueves | M5 |
| `pc-reg` | registro de comidas (**intacto**) | M7 |
| `pc-tab` | **se borra** al arrancar | M0 |

### 10.5 Criterios de aceptación por módulo

- **M0:**
  - `build.py` produce `out/index.html` con la muestra, con el CSS en tres capas y ningún CSS fuera de capa;
  - enrutador con las 5 vistas y las rutas de §3.2 (con anclas y alias), memoria de posición y «tocar la activa sube arriba»;
  - sin barra superior por debajo de 1024 px; `.sb-fondo` presente; `.appbar` con pestañas desde 1024 px;
  - tema claro y oscuro sin destello, con el conmutador del pie;
  - `PC.baremo` pasa `qa/baremo_casos.json`: en el 1.000, 3:30 → 4, 3:31 → 3, 3:48 → 1 y 3:49 → 0; en dominadas, 4 → 0, 5 → 1, 11 → 5, 12 → 6, 13 → 6 y 17 → 10; en el circuito, 8,2 → 10, 9,3 → 8, 9,4 → 7, 11,6 → 1 y 11,7 → 0; los 5 escenarios de `escenariosNota`; y `PC.baremo.corte('cir', 6)` = 10,1 s (con 3:34 y 12 hacen falta 6 puntos de circuito);
  - `PC.fmt.parseT` pasa `qa/parse_casos.json` (todas las formas de §4.8 y §10.3);
  - `PC.timer` sigue bien tras simular 30 s en segundo plano (la QA adelanta `Date.now`); `PC.audio` y `PC.vibrar` no lanzan errores con `navigator.vibrate` borrado;
  - modo QA operativo.
- **M1:**
  - `construir_web.py` sin errores sobre los datos reales;
  - `web.json` con firma en cada día, `desde` en cada campo estructurado y solo lo que la gramática no alcanza; `derivados.hitos`, `lastre` y `controles` calculados;
  - `validar_web.py` detecta, con casos de laboratorio en archivos temporales: un campo sin clasificar, una cifra inventada, un centinela, una firma que no coincide (cambiando «6 × 400» por «5 × 400» en una copia de `plan.json`) y una opción de condición que no es literal;
  - el corpus de literalidad es el congelado, y el validador falla si su sha256 cambia;
  - `qa/frases_clave.json` con 2 o 3 frases literales por cada ID no eliminado (por ejemplo, «Si falta tiempo: A, H, B, D y a casa», «tercio inferior del cuello», «22:15», «el primero es el comparable», «Sentadilla con barra», «Superficie de tartán»);
  - lista de avisos K1–K18 impresa.
- **M2:**
  - `PC.sem.calcular` pasa `qa/sem_casos.json`, 16 casos: lámpara verde → verde; ámbar → ámbar; rojo → rojo; min 390 → verde; 389 → ámbar; 300 → ámbar; 299 → rojo; verde + VFC → rojo; verde + sobrecarga → rojo; rojo con ayer rojo → rojo con racha; debajo del cuello → parada; encima → mismo color y aviso; codo 3 → aviso 3-4; codo 5 → aviso 5+; cintillo «molesta» → aviso; agujetas 3 el 30-9 con verde → ámbar;
  - el 10-10 enseña el texto literal de su `semaforo` junto al color y no la frase genérica;
  - con `?hoy=` en 2026-09-29, 2026-09-30, 2026-10-01, 2026-10-03, 2026-10-04, 2026-10-06, 2026-10-10, 2026-10-12, 2026-10-17 y 2026-10-27 la tarjeta enseña el día correcto con sus números; el domingo sale como descanso con su `sesion` literal; el 5-10 y el 6-10 enseñan su condición con sus opciones más «Ninguna de estas» (en el 6-10, tres); el 17-10 enseña el cálculo o «falta el número de válidas»; el 10-10 enseña el aviso K5 en la tarjeta y en el modo pista;
  - el orden de los bloques de Hoy es el mismo con `?hora=08:00` y con `?hora=21:00`; a las 21:00 del 1-10 no sale la franja «¿Ya has terminado?» (el circuito empieza a las 21:30) y a las 22:40 sí;
  - el modo pista aplica ± 3 s (3,0 exacto es «Dentro»), el freno, las dos repeticiones, el criterio del 12-10 y la tabla de tres columnas del 10-10 con el ritmo del 3:49;
  - «Copiar» produce el texto de §6.2 (T4).
- **M3:**
  - la rejilla del 14-9 al 1-11 con los estados del historial: 24-9 «no hecho», 28-9 «no mide», 22-9 «hecho»; bandas de bloque en las filas de semana e hitos en los días clave;
  - la hoja se abre y se cierra con el teclado;
  - el conmutador de versión cambia las celdas del 21 al 30;
  - la escalera de ritmos resalta el bloque de `PC.cal.bloque(hoy)` y su escala enseña el 3:49;
  - Plan › Reglas tiene los cuatro grupos y ninguna regla aparece dos veces en la web.
- **M4:**
  - M-1 da «Con las marcas de hoy no apruebas: 4,67» y el chip `warn` «NO APTO» con los datos del 29-9;
  - los chips reproducen los 5 escenarios; al mover un deslizador el estado pasa a «Simulado» y el agente a contorno, y el título no cambia;
  - la marca de corte del circuito es 9,7 s con las marcas de hoy y 10,1 s con el escenario realista;
  - hay `[data-umbral="229"]` en la pista del 1.000, en I2, en [G3], en [G3b] y en la tira de parciales de cada control;
  - en móvil se ve una sola gráfica a la vez; los chips sin datos llevan `aria-disabled` y su motivo;
  - el registro pinta el 100 % del historial con `data-src` y los recuentos cuadran con los JSON;
  - no aparece ningún óptimo de carga.
- **M5:**
  - la lámina de la dominada, con la barra de sección en los perfiles, PI-1 a PI-3 y la leyenda única que resalta;
  - el contador y la decisión del 10-10 (con la diferencia como línea aparte);
  - el reparto: presets, 83 m con 3:30 frente a 3:49, avisos, `data-umbral`, animación solo al pulsar;
  - el circuito: el registro solo se escribe en Hoy; aquí, lectura con el enlace; el enlace al BOE; ningún chip de «pendiente»;
  - las fichas salen de `ejercicios[].tecnica`, las cuatro láminas P1 están, y no aparece nada de umbral.
- **M6:**
  - poses y escenas sin hexadecimales fuera de los respaldos de `var()`;
  - I2 con la geometría de §7.2 (la QA mide que la punta del pie esté en `x(s)` con ±1 px y que la cota de margen mida `(229 − s) × k`);
  - I4 con valla de travesaño y dos patas y lo mejor a la derecha;
  - legibles a 390 y 1280 y en modo oscuro; ningún texto por debajo de 12 px fuera de `[data-deco]`;
  - sin colisión de ids con dos escenas en la misma página;
  - ninguna palabra «POLICÍA», ningún escudo ni ninguna placa.
- **M7:** la paridad ampliada de §9.1, la lista cerrada de cambios y cero pictogramas literales en `60_dieta.js`.

### 10.6 QA común (la monta M0 y la pasa M8)

**Modo `?qa=1`** en `00_core.js`. 1,5 s después de mostrar la ruta:

- si `&abrir=1`, abre todos los `details` de la vista;
- calcula `window.__qa = {ruta, ancho, errores: __errores, scrollW, clientW, desbordan:[selector y bbox de los elementos cuyo borde derecho supera clientWidth], toques:[controles visibles de menos de 44 px de alto], letra:[textos visibles de menos de 12 px, HTML y SVG, fuera de [data-deco]], umbral1000: nº de [data-umbral="229"] visibles, inv:[todos los data-inv], src:[todos los data-src], texto: innerText de la vista, orden:[ids de los bloques de la vista en orden], primeraPantalla:{…bbox de los elementos clave…}, pitidos: nº de llamadas a PC.audio.pitido, msArranque}`.

**`qa/marco.html?w=390&h=844&ruta=hoy&hoy=2026-09-29&tema=light&abrir=1`** carga `../out/index.html?qa=1&hoy=…&tema=…&abrir=…#ruta` en un iframe del ancho pedido. Copia `iframe.contentWindow.__qa` a un `<pre id="res">` para leerlo con `--dump-dom`. Chrome necesita `--allow-file-access-from-files`. La ventana sin cabecera no baja de 500 px, así que las capturas se hacen con la ventana a max(500, w) y se recortan a `w`, como en `visual/shoot.sh`.

**Parámetros de URL** que entiende el núcleo (solo para QA y enlaces): `hoy=AAAA-MM-DD`, `hora=HH:MM`, `tema=light|dark` (manda sobre `pc-tema`), `prueba=26-27|28-30` (manda sobre `pc-prueba`), `qa=1`, `abrir=1` (todos los `details`), `abrir=focus` (abre el modo pista o gimnasio del día), `abrir=fue` (abre la hoja «Cómo fue»), `sem=verde|ambar|rojo` (rellena el semáforo de hoy) y `sinvibrar=1` (borra `navigator.vibrate` antes de arrancar, para imitar iOS).

**`qa/qa.py`** recorre la matriz y escribe `qa/resultado.json` y `capturas/<ruta>_<ancho>_<tema>_<fecha>.png`:

- rutas `hoy`, `plan`, `marcas`, `tecnica` y `dieta`, más los estados:
  - `hoy` con el semáforo abierto (sin `sem`) y cerrado (`sem=verde`);
  - `hoy` con el modo pista (`&abrir=focus`) y con `sinvibrar=1`;
  - `hoy` con la hoja «Cómo fue» (`&abrir=fue`);
  - `plan/2026-10-10` (hoja);
  - `marcas/nota`, `marcas/controles` y `marcas/graficas/sueno`;
  - `tecnica/dominada`, `tecnica/mil` y `tecnica/circuito`;
- anchos 320, 360, 375, 390, 768 y 1280;
- temas claro y oscuro;
- fechas 2026-09-29, 2026-10-01, 2026-10-06, 2026-10-10, 2026-10-12, 2026-10-17, 2026-10-24 y 2026-10-27 (esta, con `pc-prueba` vacío y con «28-30»);
- horas: sin `hora`, `08:00` y `22:40`.

**Criterios globales de aceptación** (todos verificables):

1. `build.py` y `validar_web.py --render` sin errores.
2. **Cero errores de consola** (`__errores` vacío) en toda la matriz, también con `sinvibrar=1`.
3. **Sin desbordamiento horizontal:** `scrollW ≤ clientW` y `desbordan` vacío en 320–390, con todo abierto.
4. **Táctil y letra:** `toques` vacío (salvo enlaces dentro de texto y chips informativos; los `.seg` y `.timer` cuentan) y `letra` vacío.
5. **Inventario completo:** la unión de `inv` de las cinco vistas contiene todos los ID con `eliminado:false` de `/private/tmp/claude-502/-Users-Daniel-Documents-plan-cadiz/65ccee0f-c3d5-4077-a6ca-0683a0398360/scratchpad/rediseno/inventario_ids.json` (generado desde §5.7: 140 ID, 18 eliminados) y ninguno de los eliminados; **y** cada frase de `qa/frases_clave.json` aparece en el `texto` de alguna vista con `abrir=1` (error por cada frase que falte). El HTML no contiene ningún identificador de §5.9.
6. **3:49:** `umbral1000 ≥ 1`, con el rótulo visible, en: `marcas/nota` (con todo abierto), `marcas/controles`, `plan/ritmos`, `tecnica/mil`, `hoy` con `hoy=2026-10-10` (y con `hoy=2026-10-09`, cuando H-2 enseña la barra del 10-10), `hoy&abrir=focus` con `hoy=2026-10-10` y `hoy&abrir=fue` con `hoy=2026-10-10`.
7. **Historial completo:** `src` contiene el 100 % de las entradas del historial.
8. **Orden fijo:** `orden` de `hoy` es idéntico en las tres horas de la matriz.
9. **Primera pantalla de Hoy** a 390 × 844 (la zona útil entre la zona segura de arriba y la `.tabbar`), el 29-9 y en cualquier día sin aviso de conflicto ni condición: **con el semáforo abierto**, se ven sin desplazarse la fila de la fecha, las tres lámparas, el título de la sesión y sus números (`primeraPantalla` lo mide con los bbox). Con el semáforo cerrado, además, «Hoy haces:».
10. **Capturas revisadas a la vista** (con `Read`) a 390 y 1280, en claro y oscuro, de las cinco vistas y los estados de la matriz. Sin textos montados, cortados o ilegibles.
11. **Tamaño:** 190 KB **comprimido con gzip** como mucho; ninguna petición a `raw.githubusercontent.com`; jsPDF solo al pulsar «PDF».
12. **Tono:** `grep -E '¡|vamos|ánimo|tú puedes|genial|enhorabuena|a por ello'` en `src/` sin resultados, y ningún pictograma literal en `src/`.
13. **Paridad de Dieta** (§9.1, las ocho comprobaciones).
14. **Arranque rápido:** `msArranque < 200` en escritorio (sin contar fuentes).

**Pruebas manuales en el iPhone de Daniel** (no se pueden automatizar; M8 las deja escritas en una lista para hacerlas antes de publicar, con la app añadida a la pantalla de inicio):

- el temporizador de recuperación sigue bien tras bloquear la pantalla 30 s y volver;
- suena el pitido con el volumen alto; se anota si suena o no con el modo silencio puesto;
- la pantalla no se apaga durante el modo pista (`wakeLock`); si se apaga, se anota;
- el teclado decimal acepta «9,4» en el registro del circuito;
- la zona segura de arriba no tapa la cabecera y la `.subnav` pegada no deja ver el texto por debajo de la barra de estado.

M8 termina con un resumen: la tabla de la matriz (pasa o falla), las capturas clave, la lista de cambios de integración y la lista de pruebas manuales.

---

## Anexo A · Bloque de datos (forma y ejemplo recortado)

```json
{
  "version": 2,
  "fuente": {"hash": "3f9a1c0b2d4e5f60", "construido": "2026-09-29", "indice": ["carrera:2026-09-28", "sueno:2026-09-28", "…"]},
  "plan": { "…solo los campos públicos que algún módulo usa (campos.json → usa)…": "" },
  "historial": { "…lista blanca de historial.json…": "" },
  "web": { "…datos/web.json completo (Anexo B)…": "" },
  "derivados": {
    "datosHasta": "2026-09-28",
    "dias": [
      {"fecha": "2026-09-28", "ref": [2, 0], "semana": "2026-09-28/2026-10-04", "bloque": "A", "estado": "nomide",
       "hist": [{"src": "carrera:2026-09-28", "valida": false, "hecho": true, "resumen": "6 × 400 m, rec. 90 s · pista de atletismo de Arucas (complejo Tonono)"}],
       "variantes": {}, "principal": {"tipo": "series", "n": 6, "dist": 400, "rec": "90 s", "obj": "1:27", "primer200": "0:43,5", "origen": "gramática"}},
      {"fecha": "2026-09-29", "ref": [2, 1], "semana": "2026-09-28/2026-10-04", "bloque": "A", "estado": "hoy", "hist": [],
       "variantes": {"verde": "lastradas 5 × 3 con 12,5 kg, 180 s, estándar BOE (pausa abajo, barra al tercio inferior del cuello) · …", "ambar": "5 × 3 con 10 kg y los 12,5 pasan al 6-10; B, C y F a 3 series; sin rumano", "rojo": "4 × 3 con 10 kg, sin sentadilla ni rumano, G, H e I", "comun": "Si la quinta deja 1 en reserva o menos, es la última serie", "origen": "extraídas del objetivo"},
       "principal": null}
    ],
    "final": {"semana": "2026-10-26/2026-11-01", "titulo": "Afinamiento y prueba · dos versiones según la fecha", "nota": "…",
              "versiones": [{"clave": "26-27", "nombre": "Si la prueba es el lunes 26 o el martes 27", "dias": [{"dia": "Mié 21", "fecha": "2026-10-21", "tipo": "carrera", "sesion": "…"}, {"dia": "Prueba", "fecha": null, "tipo": "prueba", "sesion": "…", "clave": true}]},
                            {"clave": "28-30", "nombre": "Si la prueba es el miércoles 28, el jueves 29 o el viernes 30", "dias": ["…"]}]},
    "bloques": [{"clave": "A", "desde": "2026-09-21", "hasta": "2026-10-04", "m200": "0:43,5", "m400": "1:27", "m600": "2:11", "objetivo1000": "3:38"},
                {"clave": "B", "desde": "2026-10-05", "hasta": "2026-10-18", "m200": "0:43", "m400": "1:26", "m600": "2:08", "objetivo1000": "3:34", "condicion": "DECIDIDO el 28-9: …"},
                {"clave": "C", "desde": "2026-10-19", "hasta": "2026-10-30", "m200": "0:42,5 → 0:42", "m400": "1:25 → 1:24", "m600": "2:07 → 2:06", "objetivo1000": "3:32 → 3:30 si el simulacro del 10 lo respalda", "condicion": "El escalón (segundo valor) solo si …"}],
    "hitos": [{"fecha": "2026-09-19", "etiqueta": "Control", "tipo": "control"},
              {"fecha": "2026-09-26", "etiqueta": "Examen escrito", "tipo": "examen"},
              {"fecha": "2026-09-30", "etiqueta": "Kilómetro partido × 2", "tipo": "carrera"},
              {"fecha": "2026-10-01", "etiqueta": "Circuito · primera medición seria", "tipo": "circuito"},
              {"fecha": "2026-10-08", "etiqueta": "Circuito del simulacro", "tipo": "circuito"},
              {"fecha": "2026-10-10", "etiqueta": "Simulacro", "tipo": "control"},
              {"fecha": "2026-10-24", "etiqueta": "Control (dos versiones)", "tipo": "control"},
              {"fecha": "2026-10-26", "hasta": "2026-10-30", "etiqueta": "Prueba · última semana de octubre", "tipo": "prueba"}],
    "lastre": [{"semana": "2026-09-22", "habituacion": "3 × 5", "fuerza": "5 × 3 con 10 kg", "porQue": "NO sube: …", "estado": "hecho"},
               {"semana": "2026-09-29", "habituacion": "3 × 5", "fuerza": "5 × 3 con 12,5 kg SI la noche es verde (6h30 o más). Ámbar: …", "sabado": "3-10: …", "estado": "esta semana"},
               {"semana": "2026-10-06", "fuerza": "Si el 29 fue verde: 15 kg si …", "estado": "por venir"}],
    "controles": [{"fecha": "2026-08-31", "titulo": "600 m a tope", "hist": "carrera:2026-08-31", "extra": true},
                  {"fecha": "2026-09-19", "hist": "carrera:2026-09-19", "histDom": "dominadas:2026-09-19"},
                  {"fecha": "2026-10-10"}, {"fecha": "2026-10-24"},
                  {"fecha": "2026-10-26", "hasta": "2026-10-30", "prueba": true}],
    "noches": [{"fecha": "2026-09-28", "min": 134, "color": "rojo", "puntuacion": 31, "calidad": "Deficiente", "fcReposo": 47, "vfc": 61, "vfc7dias": "Equilibrado (61 ms; …)", "nota": "…"}],
    "marcas": {"mil": {"txt": "3:34", "s": 214, "pts": 3, "fiab": "medido", "banda": ["3:30", "3:38"]},
               "dom": {"reps": 11, "pts": 5, "fiab": "autoinformado"},
               "cir": {"s": 9.9, "pts": 6, "fiab": "al 60 %"},
               "media": 4.67, "resultado": "NO APTO"},
    "series": [{"fecha": "2026-09-28", "sesion": "6 × 400 m, rec. 90 s · …", "valida": false, "objetivo": "1:27",
                "tiemposS": [84.3, 89.7, 86.8, 87.5, 86.0, 86.8], "parciales": [[40.6, 43.7], [46.5, 43.2], [44.8, 42.0], [43.6, 43.9], [43.9, 42.2], [45.4, 41.3]],
                "fcMax": [191, 193, 198, 201, 203, 203]}],
    "perfiles": [{"fecha": "2026-09-19", "etiqueta": "Control 19-9", "tramosS": [40.0, 42.0, 46.0, 46.0, 41.0]},
                 {"fecha": "2026-08-31", "etiqueta": "600 del 31-8", "tramosS": [43.0, 43.9, 45.0]}]
  }
}
```

`derivados.dias[].numeros`, cuando `web.dias[f]` no los trae: series → `[n × dist, obj, rec]`; circuito → `[intentos, hora]` (intentos de la `sesion`: «3 intentos» o «UN intento»); rodaje → `[duración, «techo 145»]`; descanso y examen → ninguno. Fuerza siempre los necesita de `web.dias[f]` (dependen del color).

---

## Anexo B · `web.json`: esquema y ejemplos

Todo el texto es literal de la `fuente`. Las cifras van como texto. Donde pone `«literal de X»`, M1 copia el texto exacto: **no se redacta**. Los textos de pregunta de una condición («¿Cómo salió el martes 29?») y las opciones «Sí», «No» y «Ninguna de estas» son textos fijos de interfaz (Anexo C), no datos. Las firmas de los ejemplos son de muestra; M1 las calcula.

```json
{
  "_nota": "Datos de la web que no están en plan.json y no se pueden calcular. Solo texto literal o estructura. Cada entrada con su fuente.",
  "version": 2,
  "corpusSha256": "«sha256 de datos/corpus_web_antigua.html»",
  "resueltos": [],

  "dias": {
    "2026-09-29": {
      "firma": "a1b2c3d4e5f6",
      "titulo": "Arsenal · fuerza completa",
      "numeros": {
        "verde": [{"v": "5 × 3", "l": "lastradas", "desde": "lastradas 5 × 3"}, {"v": "12,5 kg", "l": "lastre", "desde": "con 12,5 kg"}, {"v": "180 s", "l": "descanso", "desde": "180 s"}],
        "ambar": [{"v": "5 × 3", "l": "lastradas", "desde": "5 × 3 con 10 kg"}, {"v": "10 kg", "l": "lastre", "desde": "5 × 3 con 10 kg"}],
        "rojo":  [{"v": "4 × 3", "l": "lastradas", "desde": "4 × 3 con 10 kg"}, {"v": "10 kg", "l": "lastre", "desde": "4 × 3 con 10 kg"}]
      },
      "fuerza": {
        "verde": {"A": {"series": 5, "reps": 3, "peso": "12,5 kg"}, "D": {"peso": "20 kg"}, "E": {"peso": "20 kg"}, "H": {"series": 2}, "desde": "sentadilla y rumano con los mismos 20 kg"},
        "ambar": {"A": {"series": 5, "reps": 3, "peso": "10 kg"}, "B": {"series": 3}, "C": {"series": 3}, "F": {"series": 3}, "quitar": ["E"], "desde": "B, C y F a 3 series; sin rumano"},
        "rojo":  {"A": {"series": 4, "reps": 3, "peso": "10 kg"}, "solo": ["A", "G", "H", "I"], "desde": "4 × 3 con 10 kg, sin sentadilla ni rumano, G, H e I"}
      },
      "calidad": false,
      "registroCampos": ["repsA", "lastre", "reserva5", "codoHombro", "bloques", "nota"],
      "fuentes": ["plan.calendario[2026-09-29].objetivo", "plan.sesionesTipo.martesFuerza"]
    },

    "2026-09-30": {
      "firma": "b2c3d4e5f6a1",
      "titulo": "Kilómetro partido × 2",
      "numeros": {
        "verde": [{"v": "600 en 2:11", "l": "primera parte", "desde": "600 en 2:11"}, {"v": "400 en 1:27", "l": "tras 45 s", "desde": "400 en 1:27"}, {"v": "6 min", "l": "entre series", "desde": "rec. 6 min"}],
        "ambar": [{"v": "× 1", "l": "kilómetro partido", "desde": "× 1"}, {"v": "600 en 2:11", "l": "primera parte", "desde": "600 en 2:11"}, {"v": "400 en 1:27", "l": "tras 45 s", "desde": "400 en 1:27"}]
      },
      "variantes": {
        "verde": "VERDE × 2",
        "ambar": "(5h00-6h29 o agujetas 3-4) × 1 + 15-20 min con techo 145",
        "rojo": "35-40 min con techo 145 y el kilómetro partido se pierde",
        "comun": "Series a ritmo, no a tope"
      },
      "principal": {"tipo": "km-partido", "n": {"verde": 2, "ambar": 1},
                    "partes": [{"dist": 600, "obj": "2:11"}, {"pausa": "45 s"}, {"dist": 400, "obj": "1:27"}],
                    "rec": "6 min", "primer200": "0:43,5",
                    "criterios": ["los tres 200 del 600 dentro de 1 s", "segundo 400 a 2 s o menos del primero"],
                    "desde": "kilómetro partido × 2: 600 m + 45 s + 400 m, rec. 6 min"},
      "calidad": true,
      "registroCampos": ["reps", "talonCintillo", "nota"],
      "fuentes": ["plan.calendario[2026-09-30].sesion", "plan.calendario[2026-09-30].objetivo"]
    },

    "2026-10-01": {"firma": "c3d4e5f6a1b2", "titulo": "Circuito · primera medición seria", "fuentes": ["plan.calendario[2026-10-01].sesion"]},

    "2026-10-05": {
      "firma": "d4e5f6a1b2c3",
      "condicion": {"pregunta": "¿Saltó el 30 la regla de las dos repeticiones?",
        "opciones": [
          {"id": "no", "txt": "1:26 con 2 min", "principal": {"obj": "1:26"}},
          {"id": "si", "txt": "1:27 si el 30 saltó la regla de las dos repeticiones", "principal": {"obj": "1:27"}}],
        "prellenar": {"clave": "pc-ses-2026-09-30", "campo": "aviso2", "si": true, "no": false}},
      "fuentes": ["plan.calendario[2026-10-05].objetivo"]
    },

    "2026-10-06": {
      "firma": "e5f6a1b2c3d4",
      "condicion": {"pregunta": "¿Cómo salió el martes 29?",
        "opciones": [
          {"id": "15", "txt": "Si el 29 fue verde: 15 kg si la quinta dejó 2 o más en reserva con la pausa del BOE", "numeros": [{"v": "15 kg", "l": "lastre"}], "fuerza": {"A": {"peso": "15 kg"}}},
          {"id": "12,5", "txt": "12,5 si dejó 1", "numeros": [{"v": "12,5 kg", "l": "lastre"}], "fuerza": {"A": {"peso": "12,5 kg"}}},
          {"id": "estreno", "txt": "Si el 29 fue ámbar o rojo: estreno de los 12,5 kg, solo con noche verde", "numeros": [{"v": "12,5 kg", "l": "lastre · solo con noche verde"}], "fuerza": {"A": {"peso": "12,5 kg"}}}],
        "prellenar": {"sem": "pc-sem-2026-09-29", "gym": "pc-ses-2026-09-29",
                      "reglas": [{"color": "verde", "reserva5": ">=2", "opcion": "15"}, {"color": "verde", "reserva5": "1", "opcion": "12,5"}, {"color": ["ambar", "rojo"], "opcion": "estreno"}, {"color": "verde", "reserva5": "0", "opcion": "ninguna"}]},
        "comun": "Nunca un salto de 5 kg"},
      "fuentes": ["plan.calendario[2026-10-06].objetivo"]
    },

    "2026-10-10": {
      "firma": "f6a1b2c3d4e5",
      "titulo": "Simulacro",
      "numeros": [{"v": "≤ 3:33", "l": "1.000 con reparto plano", "desde": "1.000 ≤ 3:33 con reparto plano"}, {"v": "≥ 12", "l": "dominadas válidas", "desde": "objetivo ≥ 12 válidas"}, {"v": "20 min", "l": "entre barra y 1.000", "desde": "→ 20 min →"}],
      "pasos": [
        {"t": "Dominadas al máximo en vídeo", "d": "prep-hombro obligatorio, vídeo lateral y frontal", "enlace": "#tecnica/dominada"},
        {"t": "20 min", "timer": "20:00"},
        {"t": "1.000 m en pista medida", "d": "los tramos 400-600 y 600-800 en 43", "enlace": "#tecnica/mil"}
      ],
      "principal": {"tipo": "control1000", "obj": "3:33",
                    "repartos": {"objetivo": ["0:42", "1:24", "2:06", "2:48"], "protocolo": ["0:43", "1:26", "2:09", "2:52"]}},
      "conflictos": [{"id": "K5",
        "a": {"campo": "objetivo", "texto": "1.000 ≤ 3:33 con reparto plano (0:42 / 1:24 / 2:06 / 2:48)"},
        "b": {"campo": "protocolo", "texto": "Reparto del examen 0:43 / 1:26 / 2:09 / 2:52 con botón de vuelta al pasar por la salida (≈400 y ≈800: 1:26 ±2, 2:52 ±3) y aviso de ritmo 3:25-3:40. Primer 200 entre 0:42 y 0:45"}}],
      "registroCampos": ["dominadas", "mil", "parciales", "nota"],
      "fuentes": ["plan.calendario[2026-10-10].sesion", "plan.calendario[2026-10-10].objetivo", "plan.calendario[2026-10-10].protocolo"]
    },

    "2026-10-12": {
      "firma": "a1b2c3d4e5f7",
      "principal": {"tipo": "series", "n": 8, "dist": 200, "rec": "2 min", "obj": "0:41-0:42",
                    "criterio": {"ok": ["0:41", "0:43"], "min": "0:40", "corte": "0:44"},
                    "desde": "las 8 entre 0:41 y 0:43, ninguna por debajo de 0:40, corte a 0:44"},
      "condicion": {"pregunta": "¿Qué toca hoy?",
        "opciones": [
          {"id": "base", "txt": "3 × 5 dominadas + 8 × 200 m, rec. 2 min", "fuente": "sesion"},
          {"id": "rodaje", "txt": "si el reloj no cerró la recuperación o hubo mala noche, 40 min de rodaje", "principal": {"tipo": "rodaje", "min": "40"}},
          {"id": "domingo", "txt": "si el simulacro pasó al domingo 11, rodaje de 40 min con techo 145 y el 8 × 200 se pierde", "principal": {"tipo": "rodaje", "min": "40"}}],
        "prellenar": {"clave": "pc-sem-2026-10-10", "campo": "banda", "igual": "rojo", "opcion": "domingo"}},
      "fuentes": ["plan.calendario[2026-10-12].sesion", "plan.calendario[2026-10-12].objetivo"]
    },

    "2026-10-14": {"firma": "b2c3d4e5f6a2", "condicion": {"compartida": "bloqueC", "base": {"obj": "2:07"}, "si": {"obj": "2:06"}, "desde": "600 en 2:07, o 2:06 si el 10 respaldó el bloque C a 3:30"}, "fuentes": ["plan.calendario[2026-10-14].objetivo"]},

    "2026-10-17": {
      "firma": "c3d4e5f6a1b3",
      "condicion": {
        "calculo": {"de": "pc-dom-2026-10-10", "campo": "validas", "resta": 4, "max": 8, "desde": "serie técnica de (válidas del 10-10 − 4), como mucho 8"},
        "pregunta": "¿Codo y hombro en 2/10 o menos las dos semanas anteriores?",
        "opciones": [
          {"id": "completa", "txt": "solo si codo y hombro han estado en 2/10 o menos las dos semanas anteriores"},
          {"id": "solo", "txt": "si no, solo la serie técnica"}],
        "prellenar": {"regla": "algún codo u hombro > 2 entre el 3-10 y el 16-10 → solo; sin registros → nada"}},
      "fuentes": ["plan.calendario[2026-10-17].objetivo"]
    },

    "v2:Sáb 24": {"firma": "d4e5f6a1b2c4", "titulo": "Simulacro ligero", "condicion": {"compartida": "bloqueC", "base": {"obj": "2:07"}, "si": {"obj": "2:06"}, "desde": "600 a 2:06 (o 2:07)"}, "fuentes": ["plan.calendario[versiones][1].dias[Sáb 24].sesion"]}
  },

  "condiciones": {
    "bloqueC": {"firma": "e5f6a1b2c3d5", "pregunta": "¿El 10-10 respaldó el bloque C a 3:30?", "guardar": "pc-bloqueC",
                "fuente": "plan.calendario[2026-10-10].decide", "decide": "«literal de calendario[2026-10-10].decide, primera frase»"}
  },

  "series": {"2026-09-28": {"objetivo": "1:27", "fuente": "historial.carrera[2026-09-28].objetivo"}},

  "semaforo": {
    "fuente": "plan.reglas[dia-torcido].texto",
    "verde": "la sesión como está escrita; es la única que mide y decide escalones, subidas de lastre y escenarios",
    "generico": {
      "carrera":  {"ambar": "carrera con dos tercios de las repeticiones redondeando hacia abajo, al mismo ritmo y con la misma recuperación, más 15-20 min con techo 145",
                   "rojo": "rodaje de 30-40 min con techo 145 y los diez primeros a 140"},
      "fuerza":   {"ambar": "fuerza con el peso ya dominado, sin estrenar peso, sin peso muerto rumano si al día siguiente hay calidad, H siempre",
                   "rojo": "A en 4 × 3 con el peso dominado, sin sentadilla ni peso muerto rumano, con G, H e I (unos 45 min)"},
      "circuito": {"ambar": "circuito con sus 3 intentos, con asterisco", "rojo": "solo técnica, sin cronómetro"}
    },
    "recortes": [["6 × 400", "4"], ["5 × 400", "3"], ["4 × 400", "2"], ["3 × 600", "2"], ["8 × 200", "5"], ["2 × 600 + 2 × 200", "1 + 1"], ["kilómetro partido × 2", "× 1"], ["600 + 400", "solo el 600"]],
    "extras": ["si una repetición llega a 200 ppm antes de la última, esa es la última", "Una calidad que cae en rojo no se mueve: se pierde.", "Ninguna sesión hecha en ámbar o en rojo mide nada"]
  },

  "decide": [
    {"fecha": "2026-10-01", "firma": "f6a1b2c3d4e6", "titulo": "Jue 1-10 · circuito", "que": "primer intento, cronometrado como el BOE",
     "barras": [{"prueba": "cir", "tramos": [
        {"txt": "9,0-9,3", "gte": "9,0", "lte": "9,3", "corto": "Nada cambia.", "efecto": "8 puntos. Nada cambia.", "tono": "ok"},
        {"txt": "9,4-9,7", "gte": "9,4", "lte": "9,7", "corto": "Jueves completo con técnica.", "efecto": "7 puntos. Jueves completo con técnica.", "tono": "warn"},
        {"txt": "9,8 o más", "gte": "9,8", "corto": "hablar con el preparador", "efecto": "6 puntos o menos: hablar con el preparador de meter el bloque técnico los jueves 1 y 15 y reescribir los escenarios de nota.", "tono": "bad"}]}],
     "nota": "Anotar las horas de sueño de la noche anterior: con menos de 6h30, el intento va con asterisco",
     "fuente": "plan.sesionesTipo.juevesCircuito.decisionSegunEl24 · plan.calendario[2026-10-01].objetivo"},
    {"fecha": "2026-10-10", "firma": "a1b2c3d4e5f8", "titulo": "Sáb 10-10 · simulacro",
     "barras": [
       {"prueba": "mil", "etiqueta": "1.000 en distancia verificada", "tramos": [
          {"txt": "≤ 3:33", "lte": "3:33", "corto": "C a 1:24 / 2:06", "efecto": "C a 1:24 / 2:06 (ritmo 3:30)", "tono": "ok"},
          {"txt": "3:34-3:36", "gte": "3:34", "lte": "3:36", "corto": "C a 1:25 / 2:07", "efecto": "C a 1:25 / 2:07", "tono": "warn"},
          {"txt": "peor de 3:36", "gt": "3:36", "corto": "se revisan todos los ritmos", "efecto": "se revisan todos los ritmos", "tono": "bad"}],
        "elimina": true},
       {"prueba": "dom", "etiqueta": "Dominadas válidas en vídeo", "tramos": [
          {"txt": "12 o más", "corto": "no se añade nada", "efecto": "no se añade nada", "tono": "ok"},
          {"txt": "11 o menos", "corto": "asegurar 12 (técnica)", "efecto": "asegurar 12 (técnica)", "tono": "warn"}],
        "aparte": "diferencia de 2 o más entre las contadas y las válidas → la prioridad es la técnica"}],
     "nota": "«literal de calendario[2026-10-10].semaforo»",
     "fuente": "plan.calendario[2026-10-10].decide"}
  ],

  "avisos": [
    {"id": "circuito-sin-medir", "texto": "«literal de la caja H11»", "tono": "warn", "donde": ["hoy", "marcas"], "desde": "2026-09-28", "hasta": "2026-10-01", "fuente": "html:H11"}
  ],

  "pendientes": [
    {"id": "pista-400", "texto": "«literal de H16: confirmar los 400 m de Arucas»", "desde": "2026-09-28", "fuente": "html:H16"},
    {"id": "icot", "texto": "«literal de H16: zapatilla a ICOT»", "desde": "2026-09-28", "fuente": "html:H16"},
    {"id": "fecha-prueba", "texto": "«literal de planDeCarrera.examen.pendiente»", "desde": "2026-09-28", "fuente": "plan.planDeCarrera.examen.pendiente"},
    {"id": "12-oct", "texto": "Comprobar si trabaja el 12-10 (Fiesta Nacional).", "desde": "2026-09-28", "fuente": "plan.calendario[2026-10-12].nota"}
  ],

  "decisiones": [
    {"fecha": "2026-09-23", "texto": "«literal de revision23sep.veredicto»", "porQue": "«literal de revision23sep.razones»", "fuente": "plan.revision23sep"},
    {"fecha": "2026-09-23", "texto": "«literal de objetivoNuevo23sep.mil» · reparto 0:42 / 1:24 / 2:06 / 2:48", "fuente": "plan.objetivo.objetivoNuevo23sep.mil · plan.planDeCarrera.examen.reparto"},
    {"fecha": "2026-09-28", "texto": "El bloque B va a 1:26 / 2:08.", "porQue": "«literal de ritmos[B].condicion»", "fuente": "plan.ritmos[B].condicion"},
    {"fecha": "2026-09-28", "texto": "«literal de ritmos[C].condicion»", "fuente": "plan.ritmos[C].condicion"},
    {"fecha": "2026-09-28", "texto": "«literal de calendario[2026-10-10].lugar»", "fuente": "plan.calendario[2026-10-10].lugar"},
    {"fecha": "2026-09-28", "texto": "«literal de revision28sep.veredictoDominadas»", "fuente": "plan.revision28sep.veredictoDominadas"},
    {"fecha": "2026-09-28", "texto": "«literal de revision28sep.sueno»", "fuente": "plan.revision28sep.sueno"},
    {"fecha": "2026-09-28", "texto": "«literal de protocoloDominadas.reglas[6]»", "fuente": "plan.protocoloDominadas.reglas[6]"}
  ],

  "controlesExtra": [
    {"fecha": "2026-08-31", "titulo": "600 m a tope", "hist": "carrera:2026-08-31", "queCambio": "«literal de evolucionEstimacion[2026-08-31].motivo»", "fuente": "historial.carrera[2026-08-31]"}
  ],

  "anula": {"hitos": []},

  "hechosAntiguos": {
    "2026-09-17": {"texto": "«literal de la línea «Hecho» de DIADET del 17-9»", "fuente": "html:S14"}
  },

  "textos": {
    "N4": "«literal»", "N6": {"mar": "«frase del nivel del mar»", "clima": "«frase del clima» (va con el chip supuesto)"},
    "N7": "Superficie de tartán. Prohibido correr descalzo o con clavos.",
    "E28": ["«pasos literales»"], "E31": "«literal»", "E32": ["«alertas literales, sin las de umbral»"],
    "E33": ["«5 pasos literales»"], "E34": [{"cosa": "Cronómetro para el circuito", "texto": "«literal»"}, {"cosa": "Exportar original", "texto": "«literal»"}],
    "G9": "«literal»", "R6": "«literal, cortado antes de la cláusula de los 67,4»", "R7": [["Magnesio", "«literal»"], ["…", "…"]], "R8": "«literal»",
    "S10garmin": "«literal de DET.fuerza: En Garmin es «Sentadilla con barra», NO «Sentadilla frontal»…»",
    "diag19": {"salida": "«literal»", "debil": "«literal»", "recuperacion": "«literal»"}
  },

  "videos": {"dominadas-lastradas": "«consulta de FICHAS»", "sentadilla": "«consulta de FICHAS»"},

  "recortes": [
    {"fuente": "plan.reglas[medir-distancias].texto", "quitado": "La pista del parque tiene rectas largas y curvas cortas, sin marcas fiables.", "motivo": "pista de Arucas desde el 28-9"},
    {"fuente": "plan.lesiones.cintillo", "quitado": "«frase del umbral de los miércoles»", "motivo": "el miércoles es calidad 2"},
    {"fuente": "html:R6", "quitado": "«cláusula de los 67,4»", "motivo": "serie Tanita, 66,5"},
    {"fuente": "html:R7", "quitado": "«entrenas de noche»", "motivo": "sesiones a las 18:00"},
    {"fuente": "html:R9", "quitado": "«cinco minutos»", "motivo": "H son 3 rondas (mínimo 2)"}
  ],

  "pendientesEntrenador": ["Anexo D: K1 … K18, cada uno {id, texto, fuentes}"]
}
```

**Estructura de `principal`** (en `web.dias[f]` solo cuando la gramática de §8.5 no llega):

- `tipo`: `series`, `compuesta`, `km-partido`, `control1000` o `rodaje`;
- `n` (número, u objeto por color);
- `dist`;
- `obj` (texto), o `repartos` en `control1000`;
- `rec`, `primer200` y `freno` (texto);
- `criterio` (el 12-10: `{"ok": ["0:41", "0:43"], "min": "0:40", "corte": "0:44"}`);
- `partes` (en `km-partido` y `compuesta`);
- `criterios` (lista de textos que se muestran y no se calculan);
- `desde` (subcadena literal de la que sale).

**Estructura de `condicion`:** `{pregunta, opciones:[{id, txt, numeros?, fuerza?, principal?}], prellenar?, comun?}`, o `{calculo:{de, campo, resta, max, desde}}`, o `{compartida:"bloqueC", base, si, desde}`. Si el color del semáforo no es verde, los números de la opción no se muestran: manda la variante del color (por ejemplo, la genérica de fuerza en ámbar: «fuerza con el peso ya dominado, sin estrenar peso…»).

---

## Anexo C · Textos fijos de la interfaz

- **Pestañas:** Hoy · Plan · Marcas · Técnica · Dieta.
- **Semáforo:** «¿Cómo has dormido? (Garmin, sin la siesta)». Lámparas: «Verde · 6h30 o más», «Ámbar · 5h00–6h29», «Rojo · menos de 5h00». Estados: «No se entrena», «semáforo sin rellenar». Línea por defecto: «Reloj normal · sin síntomas · sin dolor». Botones: «Cambiar», «Anotar la noche (opcional)». Consecuencias: «Sesión como está escrita. Es la única que mide.», «Solo la versión verde mide.», «No se entrena: regla del cuello», «Hoy es descanso».
- **Sesión:** «Hoy haces:», «más», «Configura el reloj», «Por qué», «Modo pista», «Modo gimnasio», «Cómo fue», «¿Ya has terminado? Apunta cómo fue →», «Apuntado · Copiar otra vez», «Copiar para el entrenador», «Volver a hoy», «Registrado», «Sin registrar», «de la web antigua», «futuro», «Técnica →», «Mañana: …».
- **Condición del día:** «Ninguna de estas» → «El plan no lo fija: pregúntale al entrenador»; «elige arriba»; «rellenado con lo que apuntaste el …»; «¿El 10-10 respaldó el bloque C a 3:30?»; «¿Cuándo es la prueba?»; «¿Cómo salió el martes 29?»; «¿Saltó el 30 la regla de las dos repeticiones?»; «¿Qué toca hoy?»; «¿Codo y hombro en 2/10 o menos las dos semanas anteriores?»; «falta el número de válidas del 10-10 (cuéntalas en Técnica →)»; «Sí»; «No».
- **Conflicto de un día:** «El plan de este día no coincide consigo mismo. Pregúntalo antes de la sesión», con los rótulos «objetivo del día» y «protocolo del día».
- **Modo pista y gimnasio:** «Salir», «Sonido», «Contraste», «Repetición k de n», «Dentro», «Lenta», «Rápida», «Poner el tiempo», «+15 s», «Saltar», «Pausa», «Llegué a 200 ppm: esta es la última», «Terminar», «Seguir (se anotará)», «Empezar», «Desde aquí, techo 145», «Tiempo cumplido», «Terminó hace …», «En iPhone no vibra: sube el volumen y quita el modo silencio.», «Ajusta el móvil para que la pantalla no se apague», «Reserva de la 5.ª», columnas «objetivo del día», «protocolo del día» y «ritmo del 3:49».
- **Marcas:** «Marcas de hoy», «Simulado», «Volver a hoy», «para el 5,00: …», «con estas dos no llega», «cualquier marca que no elimine», «siguiente punto: …», «Detalle», «Cuánto aguanta el escenario realista», «Baremo completo, hombres», «Superponer perfiles», «Ver estimaciones», «Ver datos», «Diagnóstico del control».
- **Técnica:** «El día de la prueba: circuito → dominadas → 1.000 m», «Qué mira el tribunal en tu vídeo», «Qué mirar en tu vídeo», «Cuándo hay barra: Semana tipo →», «Se registra el jueves en Hoy →», «Recorrido y normas: BOE-A-2026-15055 →», «Vídeo», «Más», «Correr».
- **Estados:** «hecho», «no mide», «no hecho», «sin registrar», «descanso», «clave».
- **Fiabilidad:** «medido», «autoinformado», «al 60 %», «supuesto», «sin verificar», «estimado», «simulado».
- **Vacíos:** «El plan no tiene sesión para hoy», «Un solo dato: …», «Aún no hay datos estructurados de …».
- **Pie:** «Datos hasta {fecha} · construido {fecha}», «· falta registrar {fecha}», tema «Sistema · Claro · Oscuro».
- **Notificación:** «Copiado».
- **Guardado local:** «Se guarda en este móvil. Lo que cuenta es lo que le mandes al entrenador», «Se marcan en este móvil».

---

## Anexo D · Decisiones pendientes del entrenador (la web no las resuelve)

Se numeran con **K** (de «choque») para no confundirlas con los elementos D1–D14 del inventario, que son de Dieta. Cada una se detecta con su regla y sale como aviso de la construcción hasta que su `id` esté en `web.resueltos`.

| ID | Choque | Qué muestra la web mientras tanto |
|---|---|---|
| K1 | `atleta.relojConfigurado` («no hace falta reconfigurarlo») frente a `zonasFC.accionPendiente` («reconfigurar… sigue con máxima 195») y el PENDIENTE del `CLAUDE.md` | `relojConfigurado` |
| K2 | `atleta.fcMaxima` 203 (28-9) frente a `zonasFC.metodo` «≥202» y la zona 5 hasta 202 | «FC máx ≥ 203» y las zonas tal cual |
| K3 | Mié 30: `hora` «acabar antes de las 21:00 y cama antes de las 23:00» frente a `juevesCircuito.regla` («el miércoles acaba antes de las 20:30») y la luz a las 22:15 | La `hora` del día |
| K4 | `sabadoComplemento`: «saltos al cajón 3 × 5» y «Sin dominadas los sábados», frente a la web antigua (pogo y saltos verticales) y la barra de los sábados 3 y 17 | Los bloques de `sabadoComplemento`, sin su `nota` |
| K5 | **10-10:** `objetivo` (0:42 / 1:24 / 2:06 / 2:48) frente a `protocolo` (0:43 / 1:26 / 2:09 / 2:52 y primer 200 entre 0:42 y 0:45). Es el día que decide el bloque C | Los dos, literales, en el aviso de conflicto de la tarjeta y del modo pista, y las dos columnas en la tabla de pasos. **Desde el 3-10 es error de construcción** salvo `--aceptar-conflicto K5` (§8.6.11) |
| K6 | `reglas[no-testear]` sigue con el 24-10 frente a `protocoloDominadas.reglas[6]` | El texto de `reglas[6]` |
| K7 | `ejercicios[simulacro]` («un jueves en el gimnasio») frente al circuito del jueves anterior | La ficha no se muestra |
| K8 | `atleta.pista` (San Cristóbal) frente a `contextoDelUsuario.pista` (Arucas) | `contextoDelUsuario.pista` |
| K9 | `ejercicios[series-cortas]` («nunca parado») frente a `DET.series` del 28-9 («andar es correcto») | `plan.json` |
| K10 | Síntomas por encima del cuello: el semáforo no tiene color para ese caso | Aviso literal, sin cambiar el color |
| K11 | `CARGA['12 sept']` (111 / 759) de la web antigua, sin fuente en `historial.garmin` | No se muestra |
| K12 | `relato` y `causa`: ¿se publican? | Retenidos |
| K13 | El bloque A empieza el 21-9 según `ritmos[A].cuando` y el 28-9 según el `CLAUDE.md` | `plan.json` |
| K14 | La deriva por mitades desde el minuto 15 no está guardada en `historial` (el 23-9: −2,7 % según el `CLAUDE.md`) | Solo la deriva guardada |
| K15 | `ejercicios[umbral]` y `ritmos[UMB]` siguen en `plan.json` sin sesiones programadas | Solo la banda de zonas, rotulada «sin sesiones» |
| K16 | `plan.json` no tiene lista de pendientes; `web.pendientes` pasa a ser la fuente | `web.pendientes` |
| K17 | **Recorrido del circuito:** para dibujarlo hay que leer el gráfico del anexo del BOE-A-2026-15055. Descargarlo necesita el permiso de Daniel | Ningún dibujo de recorrido; la frase literal de cómo se cronometra y el enlace al BOE. Sin chip de «pendiente» en la web |
| K18 | 12-10: «mala noche» no está definida (¿ámbar?, ¿rojo?) ni «el reloj no cerró la recuperación» (¿qué pantalla del Garmin?) | La condición se elige a mano; solo se rellena sola la opción «el simulacro pasó al domingo 11» |

---

## Registro de cambios respecto a la versión 1

1. **Hoy:** orden fijo; el semáforo pasa a ser la primera fila de la tarjeta con tres lámparas (un toque) y el resto tras «Cambiar»; la tira de la semana sube a la cabecera junto al camino; «Cómo fue» abre en una hoja y aparece como franja al pie desde la hora de fin; los pendientes, en una línea; sin «Próximo» duplicado.
2. **Navegación:** sin barra superior en móvil; `.sb-fondo` para la barra de estado de iOS; memoria de posición; «Guía» pasa a **Técnica** y las reglas a **Plan › Reglas**.
3. **Marcas:** nota y simulador fundidos en una tarjeta; la pista de la nota una sola vez; la sensibilidad pasa a marca de corte viva; Controles encabezado por [G3]; una gráfica cada vez en móvil.
4. **Modo pista:** un toque por repetición (Dentro · Lenta · Rápida), tiempo exacto opcional sin teclado, temporizadores por hora de fin, pitido y destello además de vibración.
5. **El 3:49** en la lista cerrada de §6.1.7, con QA en todas esas rutas.
6. **Conflictos de un día a la vista** (K5) y el `semaforo` propio del día manda; condiciones del día resueltas en la tarjeta (T11).
7. **Datos:** firmas por día, corpus de literalidad congelado, hitos, lastre y controles derivados, gramática del `principal`, presupuesto en gzip, lista blanca por consumidor, `hechosAntiguos`, `resueltos`.
8. **Ilustración:** I2 rehecha (sin banda de puntos, escala única anclada al pie, 12 px, Barlow, sin fondo, tokens), I4 con valla de verdad y lo mejor a la derecha, I5 con la barra de sección y PI-1 a PI-3, cuatro láminas P1 más, sin escena del sueño, el agente ya no es el icono, contorno para lo simulado.
9. **Dieta:** capas CSS con reinicio `:where()` + `all:revert`, escape del ▶ y paridad ampliada a ocho comprobaciones.
10. **QA:** frases clave, orden fijo, primera pantalla con el semáforo abierto, `sinvibrar=1`, más fechas y horas, pruebas manuales en el iPhone.

---

## Objeciones no aplicadas

Todas las objeciones de la crítica están integradas, algunas con otra solución. Estas son las que no se aplican como se proponían, y por qué:

1. **M9 · «En móvil, la barra superior lleva solo el chip de nota y el botón de tema».** Se va más allá: **en móvil no hay barra superior**. Una barra de 56 px para un chip y un botón de tema sigue costando espacio en cada vista, y el problema de fondo (31 % de la pantalla fija) solo se resuelve quitándola. El chip de nota va en la cabecera de Hoy (H-0), que es donde se mira; el tema, en el pie de cada vista (se cambia muy de vez en cuando). En escritorio la barra se queda, con pestañas.
2. **M1 · «Si no hay `hora`, buscar `\d{1,2}:\d{2}` en `sesion`».** Se aplica **solo al principio de `sesion`** (y, en circuito, `juevesCircuito.hora`). Buscar en cualquier punto confundiría con horas los tiempos y recuperaciones del propio texto («4 × 400 m, rec. 2:30» del 19-10 daría las 2:30; «1:27» también encaja).
3. **M2 · «Pintar los cuatro puntos de G10 como marcas fijas en la regla del circuito».** Esos cuatro puntos solo son ciertos con 3:34 y 12 dominadas; en cuanto se mueve otro deslizador, mienten. Se sustituyen por una **marca de corte viva** que calcula la peor marca que da el 5,00 con los valores actuales, y que con el escenario realista reproduce `sensibilidad` (la QA lo comprueba). Los datos literales de `sensibilidad` siguen en su plegado.
4. **M4 · «Chip desactivado con `title` y el motivo».** `title` no se ve en una pantalla táctil. El chip lleva `aria-disabled` y al tocarlo sale el motivo en una notificación. Además, el chip «1.000» no está en el selector: la evolución del 1.000 ([G3]) vive en Controles, como pedía la propia crítica en M2; tenerla también en Gráficas sería el mismo duplicado.
5. **G3.3 · «Ascender D5 a aviso bloqueante del validador desde el 3-10»** (aquí, K5). Se aplica como error, pero con salida explícita `--aceptar-conflicto K5`. Un bloqueo total impediría publicar el registro de las sesiones del 3 al 9-10 si el entrenador tarda en decidir, y eso castiga a Daniel por un conflicto del plan. El aviso sigue visible en la web todo el tiempo.
6. **G6 · Botón «Lenta (+3 s o más)».** La regla literal dice «por más de 3 s». Se rotula «Lenta · más de …» y exactamente 3,0 s cuenta como «Dentro». Lo mismo con «Rápida» y el freno.
7. **G2 · «QA de `umbral1000` en `hoy` con `?hoy=2026-10-24`».** Ese día no pinta ningún tiempo de 1.000 (serie técnica de dominadas y un 600 o una sesión «−2 días»), así que exigir ahí el 3:49 obligaría a inventar un elemento. Se comprueba en el 10-10 y en el 9-10 (cuando «Lo que decide lo siguiente» enseña la barra del 10-10), y la regla general de §6.1.7 obliga a ponerlo en cualquier día futuro que sí pinte un tiempo de 1.000.
8. **M8.1 · «Exceptuar `60_dieta.js` del control de emoji, o `▶︎` literal, o un icono del sprite».** Ni excepción (abriría la puerta a otros pictogramas en ese archivo) ni icono (cambiaría el HTML que genera la app de la nutricionista). Se usa la secuencia de escape `'▶︎ '`: el fuente queda limpio, el validador no necesita excepciones y en pantalla sale el mismo triángulo en modo texto.
9. **M8.3 · `all:revert-layer` para el reinicio de Dieta.** `revert-layer` dentro de la capa `dieta` devolvería los valores de la capa `sistema`, que es justo lo que se quiere evitar. Se usa `all:revert` dentro de `:where()`, que lleva a los valores del navegador sin añadir especificidad, y la decisión es que Dieta conserva su propio aspecto para sus clases.
10. **M3 · Lista de días condicionados.** Estaba incompleta. Además del 6, 12, 14, 17, 19 y 21-10, `plan.json` tiene condiciones que cambian la sesión el 3-10 (45 min si hubo dolor de talón), el 5-10 (1:27 si el 30 saltó la regla), el 15-10 (bloque técnico solo si se acordó), el 17-10 (codo y hombro), el 600 del 24-10 y el lunes 26 de la versión 28–30. Todas entran en T11, y el validador avisa de cualquier «si …» futuro sin condición.
11. **M12 · Presupuesto de ilustración de 90 KB.** Se sube a 120 KB sin comprimir porque M5 pide cuatro láminas más en P1. El límite que manda es el de gzip (190 KB para toda la página).
12. **L6 · «Si se mantiene "Guía", la subnavegación empieza por Dominada, 1.000 y Circuito».** No se mantiene «Guía»: la pestaña se llama **Técnica**, y las reglas, que eran lo único que no era técnica, pasan a Plan. La subnavegación empieza igualmente por Dominada, 1.000 y Circuito.

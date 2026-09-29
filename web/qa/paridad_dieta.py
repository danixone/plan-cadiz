#!/usr/bin/env python3
"""Prueba de paridad de la app de Dieta (M7 · especificación §9.1 y §10.5).

    python3 qa/paridad_dieta.py [--nueva out/index.html] [--antigua /Users/Daniel/Documents/plan-cadiz/docs/anterior/index.html]
                                [--construir] [--sin-red] [--estricto] [--json salida.json]
    PARIDAD_SOLO_CAMBIOS=1 python3 qa/paridad_dieta.py      (solo la comprobación 0, sin navegador)

Las dos webs se sirven desde un servidor local propio (mismo origen, así comparten localStorage como en GitHub
Pages) y se cargan en un Chrome sin cabecera con perfil temporal. Open Food Facts, Google Fonts y
raw.githubusercontent.com se bloquean; cdnjs solo se usa en la comprobación 7 con red. Las comprobaciones 1-8
arrancan la nueva con ?hoy=2026-10-05 (lunes), como la antigua, porque la app arrastra estado de un día a otro
(ver «defecto heredado» al final del informe). Los errores de otros módulos se enseñan aparte y solo hacen
fallar con --estricto (los mide el criterio 2 de §10.6).

Qué comprueba:
  0. Lista cerrada: el bloque trasladado de src/js/60_dieta.js es EXACTAMENTE el de la web antigua
     (desde «var F» hasta antes de «['s-mil','s-dom','s-cir'].forEach») con los cambios de CAMBIOS aplicados,
     y nada más. Cero pictogramas literales en 60_dieta.js.
  1-8. Las ocho comprobaciones de §9.1, cargando la web antigua y la nueva en Chrome sin cabecera
     (protocolo DevTools, conducido con node, sin dependencias):
     1. cada día de lunes a domingo × modo (normal, calidad, post y calidad+post): m-kcal, m-hc, m-pr y m-gr
        idénticos; la única diferencia admitida en la línea de m-bars es la cifra de g de proteína por kg (66,5);
     2. alta manual de un alimento y cambio de gramos: los macros cambian igual;
     3. quitar con × y deshacer;
     4. intercambio de comida y cena: el aviso sale en una combinación cambiada y NO en la original;
     5. cambio de proteína y de hidrato (y «Restablecer cantidades»);
     6. marcar un día en el registro: pc-reg sobrevive a recargar, tiene el mismo formato en las dos y
        lo que apuntó la web antigua se lee en la nueva;
     7. el botón PDF intenta cargar jsPDF: sin red (red cortada con DevTools) no lanza ningún error y
        enseña el aviso; con red (si la hay) carga el script de cdnjs;
     8. el temporizador de una receta arranca, cambia de texto y se para.
     Sin ningún error en __errores (nueva) ni excepción de página (las dos).
  Además: arranque en el día de hoy (?hoy=2026-09-29 → «Mar»), cierre por la hora en el primer pintado
  (§9.1.8) y los bloques nuevos #di-entreno y #di-calidad.

Sale con código 0 solo si pasa todo.
"""
import argparse, json, os, re, shutil, socket, subprocess, sys, tempfile, time

AQUI = os.path.dirname(os.path.abspath(__file__))
IMPL = os.path.dirname(AQUI)
ANTIGUA = os.path.join(os.path.dirname(IMPL), 'docs', 'anterior', 'index.html')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
JS_DIETA = os.path.join(IMPL, 'src', 'js', '60_dieta.js')
INICIO_BLOQUE = 'var F = {'
FIN_BLOQUE = "['s-mil','s-dom','s-cir'].forEach"
MARCA_INI = '/* ==== BLOQUE TRASLADADO: inicio (web antigua, var F … pintaDieta();) ==== */'
MARCA_FIN = '/* ==== BLOQUE TRASLADADO: fin ==== */'

# ------------------------------------------------------------------------------------------------
# Lista cerrada de cambios (§9.1). Cada uno: (número de §9.1, qué, viejo, nuevo, veces)
# 're:' delante de «viejo» = expresión regular. Nada más puede cambiar dentro del bloque.
CAMBIOS = [
    ('2', 'arranque en el día de hoy (diaSel = selC = selN = día de la semana de PC.hoy())',
     "  var diaSel = 0, modo = { calidad:false, post:false };\n  var selC = 0, selN = 0;",
     "  var diaSel = (PC.hoy().getDay() + 6) % 7, modo = { calidad:false, post:false };\n  var selC = diaSel, selN = diaSel;", 1),
    ('2', 'aria-pressed inicial de los días con i === diaSel',
     "document.querySelectorAll('#lg-dia button').forEach(function (b, i) { b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false'); });",
     "document.querySelectorAll('#lg-dia button').forEach(function (b, i) { b.setAttribute('aria-pressed', i === diaSel ? 'true' : 'false'); });", 1),
    ('3', 'g de proteína por kg con plan.atleta.pesoKg (66,5, serie Tanita) en vez de 67.4',
     '(t[2] / 67.4)', '(t[2] / PC.D.plan.atleta.pesoKg)', 1),
    ('4', 'verde de la proteína hasta 145 g, lo que dice el propio texto',
     'pr >= 130 && pr <= 150', 'pr >= 130 && pr <= 145', 1),
    ('5', 'sin aviso de compatibilidad con la combinación original de la nutricionista',
     "        ? '<div class=\"warn\">Ese día ' + m.join(' y ') + '. Tu nutricionista alterna las fuentes: prueba otra cena.</div>'",
     "        ? (selC === diaSel && selN === diaSel ? '' : '<div class=\"warn\">Ese día ' + m.join(' y ') + '. Tu nutricionista alterna las fuentes: prueba otra cena.</div>')", 1),
    ('6', 'font-size en línea por debajo de .75rem sube a .75rem',
     r're:font-size:\.7[0-4]?rem', 'font-size:.75rem', 6),
    ('6', 'colores hexadecimales en línea a sus variables (azul)', "'#2A6FB0'", "'var(--blue)'", 2),
    ('6', 'colores hexadecimales en línea a sus variables (verde)', "'#12775A'", "'var(--ok)'", 2),
    ('6', 'colores hexadecimales en línea a sus variables (ámbar)', "'#9C6B00'", "'var(--warn)'", 2),
    ('6', 'colores hexadecimales en línea a sus variables (gris)', "'#647688'", "'var(--muted)'", 1),
    ('6', 'colores hexadecimales en línea a sus variables (rojo)', "'#BE2C16'", "'var(--alert)'", 1),
    ('6', 'colores hexadecimales en línea a sus variables (fondo de la fila cambiada)', 'background:#EDF3F9', 'background:var(--primary-soft)', 1),
    ('6', 'IBM Plex Mono en línea (se elimina en toda la web, §4.3 y §5.9) → cifras tabulares',
     "font-family:\\'IBM Plex Mono\\',monospace;", 'font-variant-numeric:tabular-nums;', 2),
    ('10', 'fallo heredado: los gramos de «Media mañana» se guardaban sin el día y el primero que se pintaba contaminaba los demás (29-9, aprobado por el entrenador)',
     "    var k = sec + '|' + i + '|' + (srcIdx(sec) === null ? 'x' : srcIdx(sec));",
     "    var k = sec + '|' + i + '|' + (srcIdx(sec) === null ? (sec === 'media' ? 'd' + diaSel : 'x') : srcIdx(sec));", 1),
    ('10', 'el mismo arreglo al guardar los gramos',
     "    EDIT[sec + '|' + i + '|' + (srcIdx(sec) === null ? 'x' : srcIdx(sec))] = v;",
     "    EDIT[sec + '|' + i + '|' + (srcIdx(sec) === null ? (sec === 'media' ? 'd' + diaSel : 'x') : srcIdx(sec))] = v;", 1),
    ('9', 'los dos «▶ » de los temporizadores de receta, como secuencia de escape con VS15 (texto, no emoji)',
     '▶ ', '\\u25B6\\uFE0E ', 2),
]


def bloque_antiguo(ruta=ANTIGUA):
    h = open(ruta, encoding='utf-8').read()
    i = h.find(INICIO_BLOQUE)
    j = h.find(FIN_BLOQUE)
    if i < 0 or j < 0 or j < i:
        raise SystemExit('No encuentro el bloque de Dieta en %s' % ruta)
    return h[i:j]


def aplicar_cambios(txt):
    """Aplica CAMBIOS en orden. Devuelve (texto, informe). Falla si un cambio no casa las veces previstas."""
    inf = []
    for num, que, viejo, nuevo, veces in CAMBIOS:
        if viejo.startswith('re:'):
            pat = re.compile(viejo[3:])
            n = len(pat.findall(txt))
            txt = pat.sub(nuevo, txt)
        else:
            n = txt.count(viejo)
            txt = txt.replace(viejo, nuevo)
        inf.append({'cambio': num, 'que': que, 'veces': n, 'previstas': veces, 'ok': n == veces})
    return txt, inf


def bloque_nuevo(ruta=JS_DIETA):
    t = open(ruta, encoding='utf-8').read()
    i = t.find(MARCA_INI)
    j = t.find(MARCA_FIN)
    if i < 0 or j < 0:
        raise SystemExit('60_dieta.js no tiene las marcas del bloque trasladado')
    return t[i + len(MARCA_INI):j]


def comprobar_lista_cerrada():
    viejo = bloque_antiguo()
    esperado, inf = aplicar_cambios(viejo)
    real = bloque_nuevo()
    norm = lambda s: s.strip()
    ok = all(x['ok'] for x in inf) and norm(esperado) == norm(real)
    det = {'cambios': inf}
    if norm(esperado) != norm(real):
        a, b = norm(esperado), norm(real)
        k = next((i for i in range(min(len(a), len(b))) if a[i] != b[i]), min(len(a), len(b)))
        det['primera_diferencia'] = {'pos': k, 'esperado': a[max(0, k - 80):k + 80], 'real': b[max(0, k - 80):k + 80]}
    # pictogramas literales en todo 60_dieta.js
    js = ("const t=require('fs').readFileSync(process.argv[1],'utf8');const m=t.match(/\\p{Extended_Pictographic}/gu)||[];"
          "console.log(JSON.stringify(m))")
    r = subprocess.run(['node', '-e', js, JS_DIETA], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    pic = json.loads(r.stdout.decode() or '[]') if r.returncode == 0 else ['node falló']
    det['pictogramas'] = pic
    det['longitud'] = {'antiguo': len(viejo), 'nuevo': len(real)}
    return ok and not pic, det




# ------------------------------------------------------------------------------------------------
# Conductor del navegador (node, protocolo DevTools por WebSocket; node ≥ 22 trae WebSocket de serie).
# Recibe: URL del WebSocket del navegador, URL base del servidor local, «1» si hay red hacia cdnjs.
# Devuelve por stdout un JSON {comprobaciones:{…}, errores:{antigua:[…], nueva:[…]}}.
DRIVER_JS = r"""
'use strict';
const [, , WSURL, BASE, CONRED] = process.argv;
const ANT = BASE + '/antigua/index.html';
const NUE = BASE + '/nueva/index.html';
/* Las comprobaciones 1-8 arrancan las dos webs en lunes (la antigua siempre empieza en lunes; la nueva, en el día de
   ?hoy=), para que el estado interno que arrastra la app de un día a otro sea el mismo en las dos (ver defecto_media). */
const HOY = '2026-10-05';
let NAV = 0;
const BLOQUEADAS = ['*fonts.googleapis.com*', '*fonts.gstatic.com*', '*raw.githubusercontent.com*', '*openfoodfacts.org*'];

const ws = new WebSocket(WSURL);
let nid = 0;
const pend = new Map(), oyentes = new Set();
function send(method, params, sessionId) {
  return new Promise((ok, ko) => {
    const id = ++nid;
    pend.set(id, { ok, ko, method });
    const m = { id, method, params: params || {} };
    if (sessionId) m.sessionId = sessionId;
    ws.send(JSON.stringify(m));
  });
}
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    const p = pend.get(m.id); pend.delete(m.id);
    if (m.error) p.ko(new Error(p.method + ': ' + m.error.message)); else p.ok(m.result);
    return;
  }
  for (const f of oyentes) f(m);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function esperaEvento(s, method, ms) {
  return new Promise((ok, ko) => {
    const f = (m) => { if (m.sessionId === s && m.method === method) { clearTimeout(t); oyentes.delete(f); ok(m.params); } };
    const t = setTimeout(() => { oyentes.delete(f); ko(new Error('tiempo agotado esperando ' + method)); }, ms);
    oyentes.add(f);
  });
}

/* ayudas dentro de la página: mismas acciones y misma lectura en las dos webs */
const AYUDAS = `window.__P = (function () {
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
  var N = function (t) { return String(t || '').replace(/\\uFE0E/g, '').replace(/\\s+/g, ' ').trim(); };
  var H = function (s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36) + ':' + s.length; };
  function estado(conCuerpo) {
    var ult = $('#m-bars > div:last-child');
    var e = { kcal: $('#m-kcal').textContent, hc: $('#m-hc').textContent, pr: $('#m-pr').textContent, gr: $('#m-gr').textContent,
      bars: N($('#m-bars').textContent), prStyle: ult ? ult.getAttribute('style') : '',
      swap: N($('#swap').textContent),
      inputs: $$('#dieta-body input, #dieta-body select').map(function (i) { return i.value; }).join('|'),
      dia: $$('#lg-dia button').findIndex(function (b) { return b.getAttribute('aria-pressed') === 'true'; }),
      modos: $$('#lg-modo button').map(function (b) { return b.getAttribute('aria-pressed'); }).join(','),
      reset: N($('#btn-reset').textContent), reg: N($('#reg-box').textContent) };
    var cuerpo = N($('#dieta-body').textContent);
    e.cuerpo = conCuerpo ? cuerpo : H(cuerpo);
    return e;
  }
  function dia(i) { $$('#lg-dia button')[i].click(); }
  function modo(cal, post) {
    var bs = $$('#lg-modo button');
    [cal, post].forEach(function (v, k) { if ((bs[k].getAttribute('aria-pressed') === 'true') !== v) bs[k].click(); });
  }
  function elige(sel, v) { var s = $(sel); if (!s) return false; s.value = String(v); s.dispatchEvent(new Event('change', { bubbles: true })); return true; }
  function teclea(el, v) { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }
  function cambia(el) { el.dispatchEvent(new Event('change', { bubbles: true })); }
  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function hasta(fn, ms) { var t0 = Date.now(); while (Date.now() - t0 < ms) { var v = fn(); if (v) return v; await espera(100); } return fn(); }
  return { $: $, $$: $$, N: N, H: H, estado: estado, dia: dia, modo: modo, elige: elige, teclea: teclea, cambia: cambia, espera: espera, hasta: hasta };
})(); true`;

async function pestana(nombre) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const P = { nombre, s: sessionId, errores: [] };
  oyentes.add((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      P.errores.push('excepción: ' + String((d.exception && d.exception.description) || d.text).split('\n')[0] +
        ' @' + String(d.url || '').split('/').pop().split('?')[0] + ':' + ((d.lineNumber || 0) + 1));
    }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'assert')) {
      P.errores.push('consola: ' + m.params.args.map((a) => (a.value !== undefined ? a.value : a.description)).join(' '));
    }
  });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Network.enable', {}, sessionId);
  await send('Network.setBlockedURLs', { urls: BLOQUEADAS }, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false }, sessionId);
  return P;
}
async function ev(P, expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, P.s);
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error(P.nombre + ': ' + String((d.exception && d.exception.description) || d.text).split('\n')[0]);
  }
  return r.result.value;
}
async function ir(P, url) {
  /* un parámetro distinto en cada carga: navegar a la misma URL con ancla no recarga la página */
  const h = url.indexOf('#'), base = h < 0 ? url : url.slice(0, h), ancla = h < 0 ? '' : url.slice(h);
  url = base + (base.indexOf('?') < 0 ? '?' : '&') + '_n=' + (++NAV) + ancla;
  const e = esperaEvento(P.s, 'Page.loadEventFired', 30000);
  await send('Page.navigate', { url }, P.s);
  await e;
  await sleep(500);
  await ev(P, AYUDAS);
}
const nueva = (q) => NUE + '?hoy=' + HOY + (q || '') + '#dieta';
/* errores propios de la web nueva (window.__errores, §10.6) */
async function erroresNueva(P) { return ev(P, 'JSON.stringify(window.__errores || [])').then(JSON.parse); }

function igual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function difs(a, b, pref) {
  const out = [];
  Object.keys(Object.assign({}, a, b)).forEach((k) => { if (!igual(a[k], b[k])) out.push({ en: pref, campo: k, antigua: a[k], nueva: b[k] }); });
  return out;
}
const GKG = /(\d+,\d) g de proteína por kg/;
const sinGkg = (t) => t.replace(GKG, '# g de proteína por kg');
const AVISO_SWAP = /Ese día [^.]*\. Tu nutricionista alterna las fuentes: prueba otra cena\./;
const r1 = (x) => Math.round(x * 10) / 10;
/* para comparar estados: g/kg fuera (lo mide la 1), color fuera (lo mide la 1) y, con la combinación original,
   la frase «Ese día repite…» fuera de la antigua (§9.1.5; la 1 y la 4 comprueban que la nueva no la enseña) */
const norm = (x) => Object.assign({}, x, { bars: sinGkg(x.bars || ''), prStyle: '', swap: String(x.swap || '').replace(AVISO_SWAP, '').replace(/\s+/g, ' ').trim() });
const sinAviso = (lista) => lista.every((y) => !AVISO_SWAP.test(y.swap || ''));

/* ---------------------------------------------------------------- comprobaciones */
const C = {};

async function comp1(A, Nu, peso) {
  const prog = `(async function () { var P = __P, out = [];
    for (var d = 0; d < 7; d++) for (var m = 0; m < 4; m++) {
      P.dia(d); P.modo(m === 1 || m === 3, m === 2 || m === 3);
      var e = P.estado(false); e.d = d; e.m = m; out.push(e);
    }
    P.modo(false, false); P.dia(0); return out; })()`;
  const a = await ev(A, prog), n = await ev(Nu, prog);
  const fallos = [], MODOS = ['normal', 'calidad', 'post', 'calidad+post'];
  let avisoOriginalAntigua = 0;
  a.forEach((x, i) => {
    const y = n[i], donde = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][x.d] + ' · ' + MODOS[x.m];
    ['kcal', 'hc', 'pr', 'gr', 'cuerpo', 'inputs', 'dia', 'modos', 'reset'].forEach((k) => {
      if (x[k] !== y[k]) fallos.push({ donde, campo: k, antigua: x[k], nueva: y[k] });
    });
    if (sinGkg(x.bars) !== sinGkg(y.bars)) fallos.push({ donde, campo: 'm-bars (sin g/kg)', antigua: x.bars, nueva: y.bars });
    /* g/kg: la antigua divide por 67,4 y la nueva por plan.atleta.pesoKg; se comprueba contra la proteína redondeada ±0,5 g */
    const pr = parseInt(y.pr, 10), ga = GKG.exec(x.bars), gn = GKG.exec(y.bars);
    const dentro = (g, kg) => g && (+g[1].replace(',', '.') >= r1((pr - 0.5) / kg) - 0.05) && (+g[1].replace(',', '.') <= r1((pr + 0.5) / kg) + 0.05);
    if (!dentro(ga, 67.4)) fallos.push({ donde, campo: 'g/kg antigua (67,4)', valor: ga && ga[1], pr });
    if (!dentro(gn, peso)) fallos.push({ donde, campo: 'g/kg nueva (' + peso + ')', valor: gn && gn[1], pr });
    /* §9.1.4: verde de la proteína de 130 a 145 g */
    const verde = pr >= 130 && pr <= 145;
    if ((y.prStyle.indexOf('var(--ok)') >= 0) !== verde || (y.prStyle.indexOf('var(--warn)') >= 0) === verde)
      fallos.push({ donde, campo: 'color de la proteína (130–145 verde)', pr, estilo: y.prStyle });
    /* §9.1.5: con la combinación original la nueva nunca enseña «Ese día repite…» */
    if (AVISO_SWAP.test(x.swap)) avisoOriginalAntigua++;
    if (AVISO_SWAP.test(y.swap)) fallos.push({ donde, campo: 'aviso de intercambio en la combinación original', nueva: y.swap });
    if (x.swap.replace(AVISO_SWAP, '').replace(/\s+/g, ' ').trim() !== y.swap) fallos.push({ donde, campo: 'swap', antigua: x.swap, nueva: y.swap });
  });
  const gkgDistinto = a.filter((x, i) => (GKG.exec(x.bars) || [])[1] !== (GKG.exec(n[i].bars) || [])[1]).length;
  C['1'] = { ok: !fallos.length && a.length === 28, que: '7 días × 4 modos: m-kcal, m-hc, m-pr, m-gr, el cuerpo entero, gramos y m-bars idénticos salvo g/kg',
    casos: a.length, gkg_distinto_en: gkgDistinto, aviso_original_en_la_antigua: avisoOriginalAntigua, fallos: fallos.slice(0, 12), n_fallos: fallos.length };
}

async function comp2(A, Nu) {
  const prog = `(async function () { var P = __P, r = {};
    P.dia(2); P.modo(false, false); P.$('#btn-reset').click();
    r.base = P.estado(false);
    P.$('[data-add="comida"]').click();
    var f = P.$('[data-form="comida"]');
    f.querySelector('.mn').value = 'Alimento de prueba'; f.querySelector('.mk').value = '250';
    f.querySelector('.mh').value = '30'; f.querySelector('.mp').value = '10'; f.querySelector('.mg').value = '8';
    f.querySelector('.conf').click();
    r.gsel = P.N((f.querySelector('.gsel') || {}).textContent);
    f.querySelector('.gsel button.rec').click();
    r.alta = P.estado(false);
    var inp = P.$('#dieta-body input[data-ex="comida"]');
    P.teclea(inp, 175); r.tecleado = P.estado(false);
    P.cambia(inp); r.cambiado = P.estado(false);
    var fijo = P.$('#dieta-body input[data-s="cena"]');
    P.teclea(fijo, +fijo.value + 15); r.fijo = P.estado(false);
    P.$('[data-add="cena"]').click();
    var g = P.$('[data-form="cena"]'), q = g.querySelector('.q');
    P.teclea(q, 'pollo'); r.local = P.N(g.querySelector('.res').textContent);
    await P.hasta(function () { return /no han cargado|no responde/.test(g.textContent); }, 6000);
    r.sinRed = P.N(g.querySelector('.res').textContent);
    var fila = g.querySelector('.resrow');
    if (fila) { fila.click(); r.gsel2 = P.N((g.querySelector('.gsel') || {}).textContent); var rb = g.querySelector('.gsel button.rec'); if (rb) rb.click(); }
    r.buscado = P.estado(false);
    var dl, n = 0; while ((dl = P.$('#dieta-body .del[data-del]')) && n++ < 10) dl.click();
    r.quitados = P.estado(false);
    P.$('#btn-reset').click(); r.reset = P.estado(false);
    return r; })()`;
  const a = await ev(A, prog), n = await ev(Nu, prog);
  let fallos = [];
  Object.keys(a).forEach((k) => {
    if (typeof a[k] === 'string') { if (a[k] !== n[k]) fallos.push({ paso: k, antigua: a[k], nueva: n[k] }); }
    else fallos = fallos.concat(difs(norm(a[k]), norm(n[k]), k));
  });
  if (!sinAviso(Object.values(n).filter((x) => typeof x === 'object'))) fallos.push({ campo: 'aviso de intercambio en la combinación original (nueva)' });
  const cambia = n.alta.kcal !== n.base.kcal && n.cambiado.kcal !== n.alta.kcal && n.tecleado.kcal === n.cambiado.kcal && n.fijo.kcal !== n.cambiado.kcal;
  const vuelve = n.reset.kcal === n.base.kcal && n.reset.cuerpo === n.base.cuerpo;
  C['2'] = { ok: !fallos.length && cambia && vuelve && /Alimento de prueba/.test(n.gsel) && !!n.gsel2,
    que: 'alta manual (valores de etiqueta), ración, cambio de gramos del añadido y de uno de la pauta, buscador local sin Open Food Facts, quitar los añadidos y restablecer',
    kcal: { base: n.base.kcal, alta: n.alta.kcal, gramos175: n.cambiado.kcal, cenaMas15: n.fijo.kcal, buscado: n.buscado.kcal, quitados: n.quitados.kcal, reset: n.reset.kcal },
    buscador_sin_red: n.sinRed.slice(0, 160), fallos: fallos.slice(0, 10), n_fallos: fallos.length };
}

async function comp3(A, Nu) {
  const prog = `(async function () { var P = __P, r = {};
    P.dia(0); P.modo(false, false); r.base = P.estado(true);
    P.$('#dieta-body .del[data-q="comida"]').click(); r.quitaComida = P.estado(true);
    P.$('#dieta-body .del[data-q="cena"]').click(); r.quitaCena = P.estado(true);
    P.$('#dieta-body [data-undo="comida"]').click(); r.deshazComida = P.estado(true);
    P.$('#dieta-body [data-undo="cena"]').click(); r.deshazCena = P.estado(true);
    return r; })()`;
  const a = await ev(A, prog), n = await ev(Nu, prog);
  let fallos = [];
  Object.keys(a).forEach((k) => { fallos = fallos.concat(difs(norm(a[k]), norm(n[k]), k)); });
  if (!sinAviso(Object.values(n))) fallos.push({ campo: 'aviso de intercambio en la combinación original (nueva)' });
  const quita = /Has quitado/.test(n.quitaComida.cuerpo) && n.quitaComida.kcal !== n.base.kcal;
  const vuelve = n.deshazCena.kcal === n.base.kcal && n.deshazCena.cuerpo === n.base.cuerpo;
  C['3'] = { ok: !fallos.length && quita && vuelve, que: 'quitar con × en comida y cena, «Has quitado…» y deshacer hasta la pauta',
    kcal: { base: n.base.kcal, sinComida: n.quitaComida.kcal, sinCena: n.quitaCena.kcal, deshecho: n.deshazCena.kcal }, fallos: fallos.slice(0, 10), n_fallos: fallos.length };
}

async function comp4(A, Nu) {
  const prog = `(async function () { var P = __P, out = [];
    for (var d = 0; d < 7; d++) { P.dia(d);
      for (var c = 0; c < 7; c++) { P.elige('#sel-c', c);
        /* al elegir la comida, la cena pasa a la que venía con ella */
        var e0 = P.estado(false);
        out.push({ d: d, c: c, n: 'auto', selN: P.$('#sel-n').value, swap: e0.swap, kcal: e0.kcal, hc: e0.hc, pr: e0.pr, gr: e0.gr, cuerpo: e0.cuerpo,
          aviso: P.$$('#swap .warn').some(function (w) { return /^Ese día/.test(w.textContent); }) });
        for (var m = 0; m < 7; m++) { P.elige('#sel-n', m);
          var e = P.estado(false);
          out.push({ d: d, c: c, n: m, swap: e.swap, kcal: e.kcal, hc: e.hc, pr: e.pr, gr: e.gr, cuerpo: e.cuerpo,
            aviso: P.$$('#swap .warn').some(function (w) { return /^Ese día/.test(w.textContent); }) });
        } } }
    P.dia(0); return out; })()`;
  const a = await ev(A, prog), n = await ev(Nu, prog);
  const fallos = [];
  let originales = 0, originalesConAvisoAntigua = 0, cambiadasConAviso = 0;
  a.forEach((x, i) => {
    const y = n[i], donde = x.d + ':' + x.c + '/' + x.n, orig = x.c === x.d && (x.n === x.d || (x.n === 'auto' && x.selN === String(x.d)));
    ['kcal', 'hc', 'pr', 'gr', 'cuerpo', 'selN'].forEach((k) => { if (x[k] !== y[k]) fallos.push({ donde, campo: k, antigua: x[k], nueva: y[k] }); });
    if (orig) {
      originales++;
      if (x.aviso) originalesConAvisoAntigua++;
      if (y.aviso) fallos.push({ donde, campo: 'aviso en la combinación original', nueva: y.swap });
      if (x.swap.replace(AVISO_SWAP, '').replace(/\s+/g, ' ').trim() !== y.swap) fallos.push({ donde, campo: 'swap', antigua: x.swap, nueva: y.swap });
    } else {
      if (x.aviso !== y.aviso || x.swap !== y.swap) fallos.push({ donde, campo: 'swap', antigua: x.swap, nueva: y.swap });
      if (y.aviso) cambiadasConAviso++;
    }
  });
  C['4'] = { ok: !fallos.length && a.length === 392 && cambiadasConAviso > 0 && originales === 14,
    que: 'intercambio de comida y cena: las 49 combinaciones de cada uno de los 7 días; el aviso sale igual en las cambiadas y nunca en la original',
    combinaciones: a.length, cambiadas_con_aviso: cambiadasConAviso, originales_con_aviso_en_la_antigua: originalesConAvisoAntigua,
    fallos: fallos.slice(0, 10), n_fallos: fallos.length };
}

async function comp5(A, Nu) {
  const prog = `(async function () { var P = __P, out = [];
    for (var d = 0; d < 7; d++) {
      P.dia(d); P.$('#btn-reset').click(); var base = P.estado(false); base.paso = d + ' base'; out.push(base);
      ['comida', 'cena'].forEach(function (sec) {
        ['prot', 'carb'].forEach(function (t) {
          var sel = '#dieta-body select[data-' + t + '="' + sec + '"]', s = P.$(sel);
          if (!s) return;
          [].slice.call(s.options).map(function (o) { return o.value; }).forEach(function (v) {
            P.elige(sel, v); var e = P.estado(false); e.paso = d + ' ' + sec + ' ' + t + '=' + v; out.push(e);
          });
        });
      });
      /* «Restablecer» solo se activa cuando unos gramos no son los de la pauta: se cambian unos gramos y se pulsa */
      var gi = P.$('#dieta-body input[data-s="comida"]'); P.teclea(gi, +gi.value + 15);
      var act = !P.$('#btn-reset').disabled; P.$('#btn-reset').click(); var r = P.estado(false); r.paso = d + ' reset'; r.activo = act; r.igualBase = r.cuerpo === base.cuerpo && r.kcal === base.kcal && r.inputs === base.inputs; out.push(r);
    }
    P.dia(0); return out; })()`;
  const a = await ev(A, prog), n = await ev(Nu, prog);
  let fallos = [];
  if (a.length !== n.length) fallos.push({ campo: 'número de pasos', antigua: a.length, nueva: n.length });
  a.forEach((x, i) => { const y = n[i] || {}; fallos = fallos.concat(difs(norm(x), norm(y), x.paso)); });
  if (!sinAviso(n)) fallos.push({ campo: 'aviso de intercambio en la combinación original (nueva)' });
  const resets = n.filter((x) => / reset$/.test(x.paso));
  const prot = n.filter((x) => / prot=/.test(x.paso)).length, carb = n.filter((x) => / carb=/.test(x.paso)).length;
  C['5'] = { ok: !fallos.length && prot > 0 && carb > 0 && resets.length === 7 && resets.every((x) => x.igualBase && x.activo),
    que: 'cada opción de proteína y de hidrato de comida y cena de los 7 días, y «Restablecer cantidades» vuelve a la pauta',
    opciones_proteina: prot, opciones_hidrato: carb, fallos: fallos.slice(0, 10), n_fallos: fallos.length };
}

async function comp6y7(A, Nu) {
  const d = 3;   /* un jueves de la pauta; la clave del registro sale de la fecha real y del día elegido, igual en las dos */
  await ev(A, 'localStorage.clear(); true');
  await ir(A, ANT);
  const regA = await ev(A, `(function () { var P = __P; P.dia(${d}); P.$('#reg-t').click(); return { reg: P.estado(false).reg, ls: localStorage.getItem('pc-reg') }; })()`);
  await ir(A, ANT);
  const trasRecargarA = await ev(A, `(function () { var P = __P; P.dia(${d}); return P.estado(false).reg; })()`);
  await ir(Nu, nueva());
  const leeNueva = await ev(Nu, `(function () { var P = __P; P.dia(${d}); return P.estado(false).reg; })()`);
  const regN = await ev(Nu, `(function () { var P = __P; P.$('#reg-t').click(); var borrado = localStorage.getItem('pc-reg');
      P.$('#reg-t').click(); return { borrado: borrado, reg: P.estado(false).reg, ls: localStorage.getItem('pc-reg') }; })()`);
  await ir(Nu, nueva());
  const trasRecargarN = await ev(Nu, `(function () { var P = __P; P.dia(${d}); return P.estado(false).reg; })()`);
  const ja = JSON.parse(regA.ls || '{}'), jn = JSON.parse(regN.ls || '{}');
  const claves = Object.keys(ja);
  const formato = claves.length === 1 && igual(ja, jn) && ['dia', 'fecha', 'kcal', 'hc', 'pr', 'gr', 'c'].every((k) => k in ja[claves[0]]);
  C['6'] = { ok: formato && /Día registrado/.test(regA.reg) && /Día registrado/.test(trasRecargarA) && /Día registrado/.test(leeNueva) &&
      regN.borrado === '{}' && /Día registrado/.test(regN.reg) && /Día registrado/.test(trasRecargarN) && /1 día guardado/.test(trasRecargarN),
    que: 'marcar un día: pc-reg con el mismo formato en las dos, sobrevive a recargar y lo que apuntó la antigua se lee en la nueva',
    clave: claves[0], registro_antigua: regA.reg, tras_recargar_antigua: trasRecargarA, la_nueva_lee_lo_de_la_antigua: leeNueva,
    tras_recargar_nueva: trasRecargarN, mismo_json: igual(ja, jn), campos: claves.length ? Object.keys(ja[claves[0]]) : [] };

  /* 7 · PDF: primero las dos sin red (red cortada con DevTools y sin caché, para que jsPDF no salga de la caché)
     y después, si hay red, las dos cargando jsPDF de cdnjs */
  const pdf = { antigua: {}, nueva: {} };
  const PARES = [[A, ANT, 'antigua'], [Nu, nueva(), 'nueva']];
  for (const [P] of PARES) await send('Network.setCacheDisabled', { cacheDisabled: true }, P.s);
  for (const [P, url, nom] of PARES) {
    await ir(P, url);
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, P.s);
    pdf[nom].sinRed = await ev(P, `(async function () { var P = __P;
      if (!P.$('#reg-pdf')) return { error: 'no hay botón PDF' };
      P.$('#reg-pdf').click(); var ops = P.N(P.$('#pdf-opts').textContent);
      var b = P.$$('#pdf-opts [data-n]').filter(function (x) { return x.dataset.n !== '0'; })[0]; b.click();
      var txt = await P.hasta(function () { var t = P.$('#pdf-opts').textContent; return /No he podido|Listo|Se ha abierto/.test(t) ? t : ''; }, 8000);
      return { opciones: ops, aviso: P.N(txt), script: !!document.querySelector('script[src*="cdnjs.cloudflare.com/ajax/libs/jspdf"]'), jspdf: !!window.jspdf }; })()`);
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, P.s);
  }
  for (const [P, url, nom] of PARES) {
    pdf[nom].conRed = null;
    if (CONRED !== '1') continue;
    await ir(P, url);
    pdf[nom].conRed = await ev(P, `(async function () { var P = __P;
      P.$('#reg-pdf').click(); var b = P.$$('#pdf-opts [data-n]').filter(function (x) { return x.dataset.n !== '0'; })[0]; b.click();
      var txt = await P.hasta(function () { var t = P.$('#pdf-opts').textContent; return /Listo|Se ha abierto|No he podido/.test(t) ? t : ''; }, 25000);
      return { aviso: P.N(txt), jspdf: !!(window.jspdf && window.jspdf.jsPDF), script: !!document.querySelector('script[src*="cdnjs.cloudflare.com/ajax/libs/jspdf"]') }; })()`);
  }
  for (const [P] of PARES) await send('Network.setCacheDisabled', { cacheDisabled: false }, P.s);
  const sr = (x) => x.sinRed && x.sinRed.script && /No he podido cargar el generador de PDF/.test(x.sinRed.aviso || '') && !x.sinRed.jspdf;
  const cr = (x) => CONRED !== '1' || (x.conRed && x.conRed.jspdf && /Listo|Se ha abierto/.test(x.conRed.aviso));
  C['7'] = { ok: sr(pdf.nueva) && cr(pdf.nueva) && igual(pdf.antigua.sinRed, pdf.nueva.sinRed) && (CONRED !== '1' || igual(pdf.antigua.conRed, pdf.nueva.conRed)),
    que: 'PDF: sin red añade el script de cdnjs, avisa y no lanza errores; con red carga jsPDF y genera (descarga denegada en la prueba)',
    con_red_probado: CONRED === '1', antigua: pdf.antigua, nueva: pdf.nueva };
}

async function comp8(A, Nu) {
  const prog = `(async function () { var P = __P, r = {};
    P.dia(0); var b = P.$('#dieta-body .tm');
    if (!b) return { error: 'no hay temporizador' };
    r.fe0 = b.textContent.indexOf('\\uFE0E') >= 0; r.t0 = P.N(b.textContent); r.c0 = b.className;
    b.click(); r.t1 = P.N(b.textContent); r.c1 = b.className;
    await P.espera(1300); r.t2 = P.N(b.textContent);
    b.click(); r.fe3 = b.textContent.indexOf('\\uFE0E') >= 0; r.t3 = P.N(b.textContent); r.c3 = b.className;
    return r; })()`;
  const a = await ev(A, prog), n = await ev(Nu, prog);
  const iguales = ['t0', 't1', 't2', 't3', 'c0', 'c1', 'c3'].every((k) => a[k] === n[k]);
  const va = n.t1 !== n.t0 && n.t2 !== n.t1 && n.c1 === 'tm run' && n.t3 === n.t0 && n.c3 === 'tm';
  C['8'] = { ok: iguales && va && n.fe0 && n.fe3, que: 'temporizador de receta: arranca, cuenta, se para y vuelve al texto inicial (▶ con U+FE0E en la nueva)',
    antigua: a, nueva: n };
}

/* solo en la nueva: arranque en el día de hoy, cierre por la hora (§9.1.8) y los bloques de §5.5 */
async function extras(Nu) {
  const X = {};
  const arr = {};
  for (const [f, esp] of [['2026-09-29', 1], ['2026-10-04', 6], ['2026-10-05', 0]]) {
    await ir(Nu, NUE + '?hoy=' + f + '#dieta');
    const e = await ev(Nu, `(function () { var P = __P; return { dia: P.estado(false).dia, selC: P.$('#sel-c').value, selN: P.$('#sel-n').value,
      etiqueta: P.N(P.$$('#lg-dia button')[P.estado(false).dia].textContent) }; })()`);
    arr[f] = Object.assign(e, { ok: e.dia === esp && e.selC === String(esp) && e.selN === String(esp) });
  }
  X.arranque_en_hoy = { ok: Object.values(arr).every((x) => x.ok), detalle: arr };

  const horas = { '08:00': 'Desayuno', '11:00': 'Media mañana', '13:00': 'Comida', '17:00': 'Merienda', '21:00': 'Cena' }, cierre = {};
  for (const h of Object.keys(horas)) {
    await ir(Nu, nueva('&hora=' + h));
    cierre[h] = await ev(Nu, `(function () { var P = __P;
      var ab = P.$$('#dieta-body > details').filter(function (d) { return d.open; }).map(function (d) { return P.N(d.querySelector('summary > span > span').textContent); });
      P.dia(2); var tras = P.$$('#dieta-body > details').filter(function (d) { return !d.open; }).length;
      return { abiertas: ab, cerradasTrasCambiarDeDia: tras }; })()`);
    cierre[h].ok = igual(cierre[h].abiertas, [horas[h]]) && cierre[h].cerradasTrasCambiarDeDia === 0;
  }
  X.cierre_por_hora = { ok: Object.values(cierre).every((x) => x.ok), detalle: cierre };

  const ent = {};
  for (const f of ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11']) {
    await ir(Nu, NUE + '?hoy=' + f + '#dieta');
    ent[f] = await ev(Nu, `(function () { var P = __P, c = P.$('#di-entreno'), dia = PC.cal.dia(PC.hoyIso());
      return { visible: !!c && !c.hidden && c.offsetHeight > 0, texto: P.N(c && c.textContent), tipo: dia && dia.tipo,
        ini: dia ? PC.cal.horaIni(dia) : null, calidad: !P.$('#di-calidad').hidden, chip: P.$('#di-calidad button').getAttribute('aria-pressed'),
        modo: P.$$('#lg-modo button')[0].getAttribute('aria-pressed'), extraCalidad: !!(dia && dia.extra && dia.extra.calidad === true) }; })()`);
    const x = ent[f], hm = (m) => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
    let ok = x.calidad === x.extraCalidad && x.chip === 'false' && x.modo === 'false';
    if (x.visible) {
      ok = ok && x.ini !== null && x.texto.indexOf('Hoy entrenas a las ' + hm(x.ini) + '.') >= 0;
      const m = /Comida principal entre las (\d+):(\d+) y las (\d+):(\d+) \((\d+)–(\d+) h antes/.exec(x.texto);
      if (m) ok = ok && (+m[1] * 60 + +m[2]) === x.ini - (+m[6]) * 60 && (+m[3] * 60 + +m[4]) === x.ini - (+m[5]) * 60;
      const l = /entre las (\d+):(\d+) y las (\d+):(\d+) \((\d+)–(\d+) min antes/.exec(x.texto);
      if (l) ok = ok && (+l[1] * 60 + +l[2]) === x.ini - (+l[6]) && (+l[3] * 60 + +l[4]) === x.ini - (+l[5]);
      x.cuentas = { comida: !!m, ligero: !!l };
    } else ok = ok && (x.ini === null || x.tipo === 'descanso' || x.tipo === 'examen');
    x.ok = ok;
  }
  X.alrededor_del_entreno_y_calidad = { ok: Object.values(ent).every((x) => x.ok), detalle: ent };

  /* el chip de calidad pulsa el botón de #lg-modo: mismo resultado que pulsarlo a mano */
  await ir(Nu, NUE + '?hoy=2026-09-30#dieta');
  const chip = await ev(Nu, `(function () { var P = __P; var antes = P.estado(false); P.$('#di-calidad button').click();
    var tras = P.estado(false); return { antes: antes.modos, tras: tras.modos, chip: P.$('#di-calidad button').getAttribute('aria-pressed'), e: tras }; })()`);
  await ir(Nu, NUE + '?hoy=2026-09-30#dieta');
  const mano = await ev(Nu, `(function () { var P = __P; P.$$('#lg-modo button')[0].click(); return P.estado(false); })()`);
  X.chip_calidad = { ok: chip.antes === 'false,false' && chip.tras === 'true,false' && chip.chip === 'true' && igual(chip.e, mano),
    antes: chip.antes, tras: chip.tras, chip: chip.chip, mismo_estado_que_a_mano: igual(chip.e, mano) };
  return X;
}

/* Defecto de la web antigua (corregido en la nueva el 29-9, cambio 10): los gramos de «Media mañana» se guardan con la
   clave 'media|i|x', sin el día, así que el primer día pintado deja sus gramos por posición a los demás días.
   Se mide en las dos webs recién abiertas, recorriendo lunes a domingo: lo que se ve frente a la pauta (lo que
   enseña «Restablecer cantidades» en ese día). Informativo: no cuenta para pasar o fallar. */
async function defectoMedia(P, url) {
  await ir(P, url);
  return ev(P, `(async function () { var P = __P, vis = [], out = [];
    var arranque = P.estado(false).dia;
    function filas() { return P.$$('#dieta-body input[data-s="media"]').map(function (i) {
      return { g: +i.value, nom: P.N(i.parentNode.querySelector('span').textContent) }; }); }
    for (var d = 0; d < 7; d++) { P.dia(d); vis.push(filas()); }
    for (var d2 = 0; d2 < 7; d2++) { P.dia(d2); P.$('#btn-reset').click(); var pa = filas();
      pa.forEach(function (f, i) { var v = vis[d2][i]; if (v && v.g !== f.g) out.push({ dia: P.N(P.$$('#lg-dia button')[d2].textContent), alimento: f.nom, se_ve: v.g, pauta: f.g }); }); }
    P.dia(arranque); P.$('#btn-reset').click();
    return { arranca_en: P.N(P.$$('#lg-dia button')[arranque].textContent), distintos: out }; })()`);
}

(async function () {
  await new Promise((ok, ko) => { ws.addEventListener('open', ok); ws.addEventListener('error', () => ko(new Error('no conecto con Chrome'))); });
  await send('Browser.setDownloadBehavior', { behavior: 'deny' });
  const A = await pestana('antigua'), Nu = await pestana('nueva');
  const salida = { comprobaciones: C };
  try {
    await ev(A, '1'); await ir(A, ANT); await ev(A, 'localStorage.clear(); true');
    await ir(A, ANT); await ir(Nu, nueva());
    const peso = await ev(Nu, 'PC.D.plan.atleta.pesoKg');
    salida.pesoKg = peso;
    const pasos = [['1', () => comp1(A, Nu, peso)], ['2', () => comp2(A, Nu)], ['3', () => comp3(A, Nu)], ['4', () => comp4(A, Nu)],
      ['5', () => comp5(A, Nu)], ['6', () => comp6y7(A, Nu)], ['8', () => comp8(A, Nu)]];
    for (const [k, fn] of pasos) {
      if (k === '2' || k === '3' || k === '4' || k === '5' || k === '8') { await ir(A, ANT); await ir(Nu, nueva()); }
      try { await fn(); } catch (e) { C[k] = { ok: false, error: String(e && e.message || e) }; if (k === '6') C['7'] = { ok: false, error: 'no se llegó: ' + e.message }; }
      salida['errores_nueva_tras_' + k] = await erroresNueva(Nu).catch(() => ['no se pudo leer __errores']);
    }
    try { salida.extras = await extras(Nu); } catch (e) { salida.extras = { error: String(e && e.message || e) }; }
    try {
      salida.defecto_media = { antigua: await defectoMedia(A, ANT), nueva: await defectoMedia(Nu, NUE + '?hoy=2026-09-29#dieta') };
    } catch (e) { salida.defecto_media = { error: String(e && e.message || e) }; }
    salida.errores_nueva_final = await erroresNueva(Nu).catch(() => ['no se pudo leer __errores']);
  } catch (e) {
    salida.error = String(e && e.stack || e);
  }
  salida.errores = { antigua: A.errores, nueva: Nu.errores };
  await ev(A, 'localStorage.clear(); true').catch(() => {});
  process.stdout.write(JSON.stringify(salida));
  ws.close();
  process.exit(0);
})().catch((e) => { process.stdout.write(JSON.stringify({ error: String(e && e.stack || e) })); process.exit(1); });
"""


# ------------------------------------------------------------------------------------------------
NOMBRES = {
    '0': 'Lista cerrada de cambios (§9.1) y cero pictogramas en 60_dieta.js',
    '1': 'Días × modos: macros idénticos (salvo g/kg)',
    '2': 'Alta manual y cambio de gramos',
    '3': 'Quitar con × y deshacer',
    '4': 'Intercambio de comida y cena (aviso)',
    '5': 'Cambio de proteína y de hidrato',
    '6': 'Registro pc-reg: formato y recarga',
    '7': 'Botón PDF: jsPDF bajo demanda',
    '8': 'Temporizador de receta',
}


class _Silencioso(__import__('http.server').server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def servidor(raiz):
    import functools, http.server, threading
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(_Silencioso, directory=raiz))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://127.0.0.1:%d' % srv.server_address[1]


def lanzar_chrome(perfil):
    os.makedirs(perfil, exist_ok=True)
    p = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
                          '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=0',
                          '--user-data-dir=' + perfil, '--window-size=1280,900', 'about:blank'],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    fich = os.path.join(perfil, 'DevToolsActivePort')
    for _ in range(300):
        if os.path.exists(fich):
            l = open(fich).read().split('\n')
            if len(l) >= 2 and l[0].strip() and l[1].strip():
                return p, 'ws://127.0.0.1:%s%s' % (l[0].strip(), l[1].strip())
        time.sleep(0.1)
    p.kill()
    raise SystemExit('Chrome no abrió el puerto de depuración')


def hay_red(host='cdnjs.cloudflare.com'):
    try:
        socket.create_connection((host, 443), 3).close()
        return True
    except OSError:
        return False


def modulo_de_linea(html):
    """Devuelve f(línea) → nombre del archivo de src/js que ocupa esa línea de out/index.html (build.py pone
    un <script data-mod="…"> por archivo), o '' si la línea no está dentro de ninguno."""
    inicios = []
    for n, l in enumerate(html.split('\n'), 1):
        m = re.match(r'<script data-mod="([^"]+)"', l)
        if m:
            inicios.append((n, m.group(1)))
        elif l.startswith('</script>') and inicios and inicios[-1][1] != '':
            inicios.append((n + 1, ''))

    def f(linea):
        mod = ''
        for n, nom in inicios:
            if n <= linea:
                mod = nom
        return mod
    return f


def reparte_errores(errores, html):
    """Separa los errores de la web nueva en propios (60_dieta.js o sin línea reconocible) y ajenos (otro módulo)."""
    f = modulo_de_linea(html)
    propios, ajenos = [], []
    for e in errores:
        m = re.search(r':(\d+)$', e)
        mod = f(int(m.group(1))) if m else ''
        (ajenos if mod and mod != '60_dieta.js' else propios).append(e + ('  [' + mod + ']' if mod else ''))
    return propios, ajenos


def lleva_dieta_actual(html):
    """M8: build.py minifica el JS, así que el bloque ya no aparece literal. Vale si el <script data-mod="60_dieta.js">
    lleva data-sha igual al sha256 (12 cifras) del 60_dieta.js actual, o, sin minificar, si el bloque está literal."""
    import hashlib
    sha = hashlib.sha256(open(JS_DIETA, encoding='utf-8').read().encode('utf-8')).hexdigest()[:12]
    m = re.search(r'<script data-mod="60_dieta\.js" data-sha="([0-9a-f]+)">', html)
    if m:
        return m.group(1) == sha
    return bloque_nuevo().strip() in html


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--nueva', default=os.path.join(IMPL, 'out', 'index.html'))
    ap.add_argument('--antigua', default=ANTIGUA)
    ap.add_argument('--construir', action='store_true', help='ejecuta build.py antes (por defecto usa out/index.html tal cual)')
    ap.add_argument('--sin-red', action='store_true', help='no prueba la carga real de jsPDF aunque haya red')
    ap.add_argument('--json', help='escribe aquí el resultado completo')
    ap.add_argument('--laboratorio', action='store_true', help=argparse.SUPPRESS)   # no exige que --nueva lleve el 60_dieta.js actual
    ap.add_argument('--estricto', action='store_true',
                    help='también falla con errores de otros módulos (por defecto se enseñan aparte: los mide el criterio 2 de §10.6)')
    a = ap.parse_args()
    t0 = time.time()
    res = {'comprobaciones': {}}

    ok0, det0 = comprobar_lista_cerrada()
    res['comprobaciones']['0'] = dict(det0, ok=ok0)
    if os.environ.get('PARIDAD_SOLO_CAMBIOS') == '1':
        print(json.dumps(det0, ensure_ascii=False, indent=1))
        sys.exit(0 if ok0 else 1)

    if a.construir:
        subprocess.run([sys.executable, os.path.join(IMPL, 'build.py')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not os.path.exists(a.nueva):
        sys.exit('No existe %s: construye primero (python3 build.py)' % a.nueva)
    nueva_html = open(a.nueva, encoding='utf-8').read()
    if not a.laboratorio and not lleva_dieta_actual(nueva_html):
        sys.exit('%s no lleva el 60_dieta.js actual: vuelve a construir (python3 build.py o --construir)' % a.nueva)

    tmp = tempfile.mkdtemp(prefix='paridad_dieta_')
    chrome = None
    srv = None
    try:
        for nom, ruta in (('antigua', a.antigua), ('nueva', a.nueva)):
            os.makedirs(os.path.join(tmp, 'web', nom))
            shutil.copy(ruta, os.path.join(tmp, 'web', nom, 'index.html'))
        srv, base = servidor(os.path.join(tmp, 'web'))
        chrome, wsurl = lanzar_chrome(os.path.join(tmp, 'perfil'))
        red = (not a.sin_red) and hay_red()
        drv = os.path.join(tmp, 'conductor.js')
        open(drv, 'w', encoding='utf-8').write(DRIVER_JS)
        r = subprocess.run(['node', drv, wsurl, base, '1' if red else '0'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600)
        try:
            out = json.loads(r.stdout.decode('utf-8', 'replace') or '{}')
        except ValueError:
            out = {'error': 'salida ilegible del conductor', 'stdout': r.stdout.decode('utf-8', 'replace')[-2000:]}
        if r.stderr:
            out['stderr'] = r.stderr.decode('utf-8', 'replace')[-2000:]
    finally:
        if chrome:
            chrome.kill()
            chrome.wait()
        if srv:
            srv.shutdown()
        shutil.rmtree(tmp, ignore_errors=True)

    res['comprobaciones'].update(out.get('comprobaciones', {}))
    for k in ('pesoKg', 'extras', 'defecto_media', 'errores', 'error', 'stderr', 'stdout', 'errores_nueva_final'):
        if k in out:
            res[k] = out[k]
    errores_nueva = sorted(set(sum((v for k, v in out.items() if k.startswith('errores_nueva')), [])))
    errs = (out.get('errores') or {})
    propios, ajenos = reparte_errores(sorted(set(errores_nueva + list(errs.get('nueva', [])))), nueva_html)
    res['errores_nueva'] = {'propios': propios, 'ajenos': ajenos}
    res['errores_antigua'] = errs.get('antigua', [])
    sin_errores = not propios and not res['errores_antigua'] and 'error' not in out and (not a.estricto or not ajenos)
    ex = out.get('extras') or {}
    extras_ok = bool(ex) and 'error' not in ex and all(v.get('ok') for v in ex.values() if isinstance(v, dict))
    todas = all(res['comprobaciones'].get(k, {}).get('ok') for k in NOMBRES)
    res['ok'] = todas and sin_errores and extras_ok

    print('Paridad de Dieta (§9.1) · antigua: %s · nueva: %s · %.0f s' % (a.antigua, os.path.relpath(a.nueva, IMPL), time.time() - t0))
    for k, nom in NOMBRES.items():
        c = res['comprobaciones'].get(k, {})
        extra = ''
        if k == '0':
            extra = ' · %d cambios, pictogramas %d' % (len(c.get('cambios', [])), len(c.get('pictogramas', [])))
        elif c.get('n_fallos'):
            extra = ' · %d diferencias' % c['n_fallos']
        elif c.get('error'):
            extra = ' · ' + c['error']
        print('  %s %-48s %s%s' % (k, nom, 'PASA ' if c.get('ok') else 'FALLA', extra))
    for k, v in ex.items():
        if isinstance(v, dict):
            print('  + %-48s %s' % (k.replace('_', ' '), 'PASA ' if v.get('ok') else 'FALLA'))
    if ex.get('error'):
        print('  + extras: FALLA · ' + ex['error'])
    print('  errores de Dieta en la nueva (__errores y excepciones): %d · excepciones en la antigua: %d%s' % (
        len(propios), len(res['errores_antigua']), (' · ' + out['error'][:300]) if out.get('error') else ''))
    for e in propios + res['errores_antigua']:
        print('    ' + e)
    if ajenos:
        print('  errores de otros módulos en la nueva (no son de Dieta; los mide el criterio 2 de §10.6%s): %d' % (
            ', y con --estricto también este' if not a.estricto else '', len(ajenos)))
        for e in ajenos[:8]:
            print('    ' + e)
    dm = out.get('defecto_media') or {}
    if dm and 'error' not in dm:
        print('  Defecto de la web antigua, corregido en la nueva el 29-9: los gramos de «Media mañana» del primer día pintado se quedaban en los demás días.')
        for nom in ('antigua', 'nueva'):
            x = dm.get(nom) or {}
            print('    %s (arranca en %s): %d filas distintas de la pauta · %s' % (
                nom, x.get('arranca_en'), len(x.get('distintos', [])),
                '; '.join('%s %s %s g (pauta %s)' % (d['dia'], d['alimento'], d['se_ve'], d['pauta']) for d in x.get('distintos', [])[:6])))
    elif dm.get('error'):
        print('  defecto_media: no se pudo medir · ' + dm['error'])
    print('  jsPDF con red: %s' % ('probado' if res['comprobaciones'].get('7', {}).get('con_red_probado') else 'no probado (sin red o --sin-red)'))
    if a.json:
        json.dump(res, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('RESULTADO: %s' % ('PASA' if res['ok'] else 'FALLA'))
    sys.exit(0 if res['ok'] else 1)


if __name__ == '__main__':
    main()

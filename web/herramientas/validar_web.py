#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""validar_web.py · M1 · comprueba la web construida ANTES de publicar (especificación §8.6).

    python3 herramientas/validar_web.py [out/index.html] [--render] [--solo-datos]
                                        [--hoy AAAA-MM-DD] [--aceptar-conflicto K5]
                                        [--plan …] [--historial …] [--web …] [--campos …]
                                        [--corpus …] [--src …] [--frases …] [--json informe.json]

Sin --render comprueba los datos y el HTML construido: sello, firmas, cobertura, privacidad,
sintaxis, literalidad contra el corpus congelado (plan.json + historial.json +
corpus_web_antigua.html, comprobado por su sha256), baremo, calendario, tamaño con gzip,
pictogramas en src/ y el conflicto K5. Con --render abre la página en Chrome sin cabecera y
comprueba errores de consola, el 3:49 (data-umbral="229") en las rutas de §10.6.6, la tarjeta
de Hoy en los días de prueba, el registro completo en Marcas › Registro, las frases clave y
que no haya peticiones a raw.githubusercontent.com.
--solo-datos se salta todo lo que necesita out/index.html (útil mientras no hay plantilla).
Sale con 1 si hay ERRORES; los AVISOS no paran.
"""
import argparse
import datetime as dt
import gzip
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
IMPL = os.path.dirname(AQUI)
sys.path.insert(0, AQUI)
import construir_web as cw  # noqa: E402

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
LIMITE_GZIP = 240 * 1024
VISTAS = ('hoy', 'plan', 'marcas', 'tecnica', 'dieta')
# claves de web.json que no son texto de contenido: no se buscan cifras en ellas
CLAVES_ESTRUCTURA = {'firma', 'firmaDe', 'fuente', 'fuentes', 'corpusSha256', 'prellenar', 'guardar', 'enlace',
                     'de', 'clave', 'id', 'resueltos', 'registroCampos', 'versiones', 'compartida', 'tipo',
                     'tono', 'donde', 'prueba', 'campo', 'quitar', 'solo', '_nota', '_resueltos', '_pendientes'}
# rutas de §10.6.6 donde tiene que verse el 3:49
RUTAS_UMBRAL = [
    ('marcas/nota', {'abrir': '1'}), ('marcas/controles', {}), ('plan/ritmos', {}), ('tecnica/mil', {}),
    ('hoy', {'hoy': '2026-10-10'}), ('hoy', {'hoy': '2026-10-09'}),
    ('hoy', {'hoy': '2026-10-10', 'abrir': 'focus'}), ('hoy', {'hoy': '2026-10-10', 'abrir': 'fue'}),
]
# días en que Hoy tiene que pintar la tarjeta de la fecha (§10.5 M2 y fechas de la matriz de §10.6)
FECHAS_HOY = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-03', '2026-10-04', '2026-10-06',
              '2026-10-10', '2026-10-12', '2026-10-17', '2026-10-24', '2026-10-27']
IDS_59 = ['figs(', 'FOTO_BASE', 'fotos(', 'bindFotos', 'FICHAS', 'CAL_LARGO', 'CAL_CORTO', 'SABCOMP',
          'drawSueno', 'drawCarga', 'drawTrote', 'drawMil', 'drawDom', 'bindHit', 'IBM Plex Mono', "'s-mil'", "'s-dom'", "'s-cir'"]


class Informe:
    def __init__(self):
        self.errores, self.avisos, self.ok = [], [], []

    def e(self, x):
        self.errores.append(x)

    def a(self, x):
        self.avisos.append(x)

    def bien(self, x):
        self.ok.append(x)


# ---------------------------------------------------------------------------- corpus fijo
def cargar_corpus(ruta_plan, ruta_hist, ruta_corpus, web):
    crudo_plan = open(ruta_plan, encoding='utf-8').read()
    crudo_hist = open(ruta_hist, encoding='utf-8').read()
    html = open(ruta_corpus, encoding='utf-8').read()
    sha = hashlib.sha256(open(ruta_corpus, 'rb').read()).hexdigest()
    ta, tb = cw.texto_de_html(html)
    # la web antigua con los recortes anotados aplicados (para comprobar textos ya recortados)
    ra, rb = ta, tb
    for r in web.get('recortes') or []:
        if str(r.get('fuente', '')).startswith('html:') and r.get('quitado'):
            q = cw.norm(r['quitado'])
            ra, rb = ra.replace(q, ''), rb.replace(q, '')
    ra, rb = re.sub(r'\s{2,}', ' ', ra), re.sub(r'\s{2,}', ' ', rb)
    cif = set(cw.cifras(crudo_plan)) | set(cw.cifras(crudo_hist)) | set(cw.cifras(html))
    return {'sha': sha, 'html': [ta, tb, ra, rb], 'cifras': cif}


def frases_de(t):
    """Trozos que se comprueban uno a uno: frases (tras «. », «? », «! ») y piezas unidas por « · »."""
    out = []
    for f in re.split(r'(?<=[.!?])\s+', t or ''):
        for p in re.split(r'\s*·\s*', f):
            p = p.strip().rstrip('.').strip()
            if p:
                out.append(p)
    return out


def literal_en(t, fuentes):
    fs = [cw.norm(x) for x in fuentes if x]
    return all(any(cw.norm(p) in f for f in fs) for p in frases_de(t))


# ---------------------------------------------------------------------------- literalidad de web.json
def recorrer(o, ruta=''):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in CLAVES_ESTRUCTURA:
                continue
            yield from recorrer(v, '%s.%s' % (ruta, k) if ruta else k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from recorrer(v, '%s[%d]' % (ruta, i))
    elif isinstance(o, str):
        yield ruta, o


def textos_dia(dia):
    return [v for v in dia.values() if isinstance(v, str)] if dia else []


def comprobar_literalidad(inf, plan, hist, web, corpus):
    raices = {'plan': plan, 'historial': hist, 'web': web}
    dia_torcido = (cw.por_id(plan.get('reglas'), 'dia-torcido') or {}).get('texto') or ''
    n_cif = n_txt = 0

    # 1 · toda cifra de un texto de web.json está en el corpus (se admiten 1 a 9: reglas del BOE y ordinales)
    for ruta, s in recorrer(web):
        if cw.es_iso(s):
            continue
        for c in cw.cifras(s):
            n_cif += 1
            if c in corpus['cifras'] or re.fullmatch(r'[1-9]', c):
                continue
            inf.e('cifra sin fuente «%s» en web.%s («%s»)' % (c, ruta, s[:60]))

    def fuentes_de(e, dia):
        out = textos_dia(dia)
        for f in (e.get('fuentes') or []) + ([e['fuente']] if isinstance(e.get('fuente'), str) else []):
            for parte in f.split(' · '):
                parte = parte.strip()
                if parte.startswith('html:'):
                    out += corpus['html']
                else:
                    v = cw.resolver(raices, parte)
                    out += cw.textos_de(v) if v is not None else []
        return out

    def desdes(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == 'desde' and not cw.es_iso(v):
                    yield from ([v] if isinstance(v, str) else [x for x in v if isinstance(x, str)])
                elif k != 'desde':
                    yield from desdes(v)
        elif isinstance(o, list):
            for x in o:
                yield from desdes(x)

    # 2 · días: variantes, «desde» y opciones de condición
    for clave, e in (web.get('dias') or {}).items():
        if clave.startswith('_'):
            continue
        dia = cw.dia_plan(plan, clave)
        if dia is None:
            inf.e('web.dias[%s]: ese día no existe en plan.json' % clave)
            continue
        base = fuentes_de(e, dia)
        for k, v in (e.get('variantes') or {}).items():
            if k == 'origen':
                continue
            n_txt += 1
            if not cw.es_literal(v, [dia.get('objetivo') or '', dia_torcido]):
                inf.e('web.dias[%s].variantes.%s no es literal del objetivo ni de reglas[dia-torcido]: «%s»' % (clave, k, v[:70]))
        for sub in ('numeros', 'fuerza', 'principal', 'pasos', 'condicion'):
            if sub not in e:
                continue
            nodo = e[sub]
            items = nodo if isinstance(nodo, list) else [nodo]
            if isinstance(nodo, dict) and sub in ('numeros', 'fuerza'):
                items = list(nodo.values())
            for it in items:
                for x in (it if isinstance(it, list) else [it]):
                    if not isinstance(x, dict):
                        continue
                    extra = fuentes_de(x, None) if x.get('fuente') else []
                    for d in desdes(x):
                        n_txt += 1
                        if not cw.es_literal(d, base + extra):
                            inf.e('web.dias[%s].%s: «desde» no literal: «%s»' % (clave, sub, d[:70]))
        for op in ((e.get('condicion') or {}).get('opciones') or []):
            n_txt += 1
            f = op.get('fuente')
            fuentes = [dia.get('objetivo') or '', dia.get('sesion') or '']
            if f and f not in ('sesion', 'objetivo'):
                v = cw.resolver(raices, f)
                fuentes += cw.textos_de(v) if v is not None else []
            if not cw.es_literal(op.get('txt') or '', fuentes):
                inf.e('web.dias[%s].condicion: la opción «%s» no es literal del objetivo ni de la sesión de su día' % (clave, (op.get('txt') or '')[:70]))
        c = e.get('condicion') or {}
        if c.get('comun'):
            n_txt += 1
            if not cw.es_literal(c['comun'], base):
                inf.e('web.dias[%s].condicion.comun no literal: «%s»' % (clave, c['comun'][:70]))

    # 3 · semáforo: todo sale de reglas[dia-torcido]
    S = web.get('semaforo') or {}
    trozos = [S.get('verde'), S.get('racha'), S.get('horario')] + list((S.get('cuello') or {}).get(k) for k in ('encima', 'debajo'))
    for t in (S.get('generico') or {}).values():
        trozos += list(t.values())
    trozos += S.get('extras') or []
    trozos += ['%s → %s' % tuple(r) for r in S.get('recortes') or []]
    trozos += list((S.get('cortes') or {}).values())
    for t in trozos:
        if not t:
            continue
        n_txt += 1
        if cw.norm(t).rstrip('.') not in cw.norm(dia_torcido):
            inf.e('web.semaforo: «%s» no es subcadena de reglas[dia-torcido]' % t[:70])

    # 4 · decisiones del día siguiente, decisiones, avisos, controles, condiciones compartidas
    def contra_fuente(etq, texto, e, extra=()):
        nonlocal n_txt
        if not texto:
            return
        n_txt += 1
        fs = fuentes_de(e, None) + list(extra)
        if not fs:
            inf.a('%s: sin fuente que comprobar' % etq)
        elif not literal_en(texto, fs):
            inf.e('%s no es literal de su fuente: «%s»' % (etq, texto[:80]))

    for i, e in enumerate(web.get('decide') or []):
        dia = cw.dia_plan(plan, e.get('fecha')) or {}
        contra_fuente('web.decide[%d].nota' % i, e.get('nota'), e, textos_dia(dia))
        contra_fuente('web.decide[%d].que' % i, e.get('que'), e, textos_dia(dia))
        for b in e.get('barras') or []:
            contra_fuente('web.decide[%d].aparte' % i, b.get('aparte'), e, textos_dia(dia))
            for t in b.get('tramos') or []:
                for k in ('corto', 'efecto', 'condicion'):
                    contra_fuente('web.decide[%d].%s' % (i, k), t.get(k), e, textos_dia(dia))
    for i, e in enumerate(web.get('decisiones') or []):
        contra_fuente('web.decisiones[%d].texto' % i, e.get('texto'), e)
        pq = e.get('porQue')
        for p in (pq if isinstance(pq, list) else [pq] if pq else []):
            contra_fuente('web.decisiones[%d].porQue' % i, p, e, cw.textos_de(plan))
    for i, e in enumerate(web.get('avisos') or []):
        for k in ('titulo', 'texto'):
            contra_fuente('web.avisos[%d].%s' % (i, k), e.get(k), e)
    for i, e in enumerate(web.get('controlesExtra') or []):
        contra_fuente('web.controlesExtra[%d].queCambio' % i, e.get('queCambio'), e)
    for k, e in (web.get('condiciones') or {}).items():
        if isinstance(e, dict):
            for kk in ('decide', 'condicion'):
                contra_fuente('web.condiciones.%s.%s' % (k, kk), e.get(kk), e)

    # 5 · textos y vídeos de la web antigua: literales del HTML congelado (con los recortes anotados)
    for ruta, s in recorrer(web.get('textos') or {}, 'textos'):
        n_txt += 1
        if not literal_en(s, corpus['html']):
            inf.e('web.%s no es literal de la web antigua: «%s»' % (ruta, s[:70]))
    for k, s in (web.get('videos') or {}).items():
        if k.startswith('_'):
            continue
        n_txt += 1
        if not any(cw.norm(s) in h for h in corpus['html']):
            inf.e('web.videos.%s: la consulta «%s» no está en la web antigua' % (k, s))
    # 6 · recortes: la frase quitada existe en su fuente
    for r in web.get('recortes') or []:
        f = r.get('fuente') or ''
        q = r.get('quitado') or ''
        if f.startswith('html:'):
            ok = any(cw.norm(q) in h for h in corpus['html'][:2])
        else:
            v = cw.resolver(raices, f)
            ok = isinstance(v, str) and q in v
        if not ok:
            inf.e('web.recortes: «%s» no está en %s' % (q[:60], f))
    inf.bien('literalidad: %d cifras y %d textos de web.json comprobados contra el corpus fijo' % (n_cif, n_txt))


# ---------------------------------------------------------------------------- HTML construido
def scripts_de(html):
    return [(m.group(1), m.group(2)) for m in re.finditer(r'<script([^>]*)>(.*?)</script>', html, re.S)]


def comprobar_html(inf, html, plan, hist, web, campos):
    m = re.search(r'<script id="datos" type="application/json">(.*?)</script>', html, re.S)
    if not m:
        inf.e('no hay bloque <script id="datos">: ¿se editó el HTML a mano?')
        return None
    try:
        D = json.loads(m.group(1))
    except Exception as ex:
        inf.e('el bloque de datos no se puede leer: %s' % ex)
        return None
    s = cw.sello(plan, hist, web)
    h = (D.get('fuente') or {}).get('hash')
    if h == s:
        inf.bien('sello de datos %s: la web está construida con los JSON actuales' % s)
    else:
        inf.e('sello: la web lleva %s y los datos actuales dan %s (hay que reconstruir)' % (h, s))
    esperado = {'%s:%s' % (a, e['fecha']) for a in cw.ARRAYS_HIST for e in hist.get(a) or [] if '/' not in e.get('fecha', '')}
    embebido = {'%s:%s' % (a, e.get('fecha')) for a in cw.ARRAYS_HIST for e in (D.get('historial') or {}).get(a) or []}
    falta = sorted(esperado - embebido)
    if falta:
        inf.e('cobertura del bloque: faltan %s' % ', '.join(falta))
    else:
        inf.bien('cobertura del bloque: %d de %d entradas del historial' % (len(esperado & embebido), len(esperado)))
    vig = cw.vigilados(plan, hist, campos)
    fugas = [t for t in vig if t and t in html]
    for t in fugas:
        inf.e('privacidad: aparece en el HTML «%s»' % t)
    if not fugas:
        inf.bien('privacidad: %d textos vigilados, ninguno aparece' % len(vig))
    # sintaxis
    ejecutables = [c for a, c in scripts_de(html) if 'application/json' not in a and c.strip()]
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as t:
        json.dump(ejecutables, t)
    r = subprocess.run(['node', '-e', "const s=require(process.argv[1]);let e=0;s.forEach((x,i)=>{try{new Function(x)}catch(err){e++;console.log('script '+i+': '+err.message)}});process.exit(e?1:0)", t.name],
                       capture_output=True, text=True)
    os.unlink(t.name)
    if r.returncode == 0:
        inf.bien('sintaxis: %d scripts sin errores' % len(ejecutables))
    else:
        inf.e('sintaxis: ' + (r.stdout.strip() or r.stderr.strip()))
    # tamaño
    crudo = len(html.encode('utf-8'))
    comp = len(gzip.compress(html.encode('utf-8'), 9))
    (inf.bien if comp <= LIMITE_GZIP else inf.e)('tamaño: %.1f KB sin comprimir · %.1f KB con gzip (límite 240 KB)' % (crudo / 1024, comp / 1024))
    # restos de la web antigua (§5.9 y §8.6.12)
    codigo = '\n'.join(c for a, c in scripts_de(html) if 'application/json' not in a)
    fuera = re.sub(r'<script id="datos"[^>]*>.*?</script>', '', html, flags=re.S)
    n_tab = fuera.count('pc-tab') - len(re.findall(r"removeItem\(\s*['\"]pc-tab['\"]\s*\)", fuera))
    if n_tab > 0:
        inf.e('queda texto «pc-tab» fuera del borrado al arrancar')
    for w in ('FIG', 'FOTOS', 'DIADET'):
        if re.search(r'\b%s\b' % w, fuera):
            inf.e('queda «%s» de la web antigua en el HTML' % w)
    if 'raw.githubusercontent.com' in fuera:
        inf.e('el HTML pide recursos a raw.githubusercontent.com')
    for w in IDS_59:
        if w in codigo:
            inf.a('queda «%s» (identificador de §5.9) en el código' % w)
    return D


def comprobar_src(inf, src):
    if not os.path.isdir(src):
        inf.a('no hay carpeta src/: no se revisan pictogramas ni tono')
        return
    archivos = []
    for base, _, fs in os.walk(src):
        for f in fs:
            if f.endswith(('.html', '.css', '.js')):
                archivos.append(os.path.join(base, f))
    r = subprocess.run(['node', '-e', r"""
const fs=require('fs');let malos=[];
for (const f of process.argv.slice(1)) { const t=fs.readFileSync(f,'utf8'); const l=t.split('\n');
  l.forEach((x,i)=>{ const m=x.match(/\p{Extended_Pictographic}/gu); if(m) malos.push(f+':'+(i+1)+' '+m.join('')); }); }
console.log(JSON.stringify(malos));""", *archivos], capture_output=True, text=True)
    try:
        malos = json.loads(r.stdout or '[]')
    except Exception:
        malos = ['no se pudo revisar: ' + r.stderr.strip()]
    for x in malos:
        inf.e('pictograma literal en src/: %s' % os.path.relpath(x, IMPL))
    if not malos:
        inf.bien('plantilla: %d archivos de src/ sin pictogramas literales' % len(archivos))
    tono = re.compile(r'¡|\bvamos\b|ánimo|tú puedes|genial|enhorabuena|a por ello', re.I)
    for f in archivos:
        for i, l in enumerate(open(f, encoding='utf-8'), 1):
            if tono.search(l):
                inf.a('tono: %s:%d «%s»' % (os.path.relpath(f, IMPL), i, l.strip()[:60]))


# ---------------------------------------------------------------------------- render con Chrome sin cabecera
MARCO = r"""<!doctype html><html><head><meta charset="utf-8"></head><body><pre id="res">pendiente</pre>
<script>
var CASOS = __CASOS__, out = {}, pend = CASOS.length;
function vis(e) { var b = e.getBoundingClientRect(); return b.width > 0 || b.height > 0; }
function recoger(c, fr) {
  var r = { id: c.id };
  try {
    var w = fr.contentWindow, d = w.document;
    r.errores = (w.__errores || []).slice();
    var v = d.getElementById('v-' + c.vista) || d.body;
    r.texto = v ? v.innerText : '';
    r.umbral = Array.prototype.filter.call(d.querySelectorAll('[data-umbral="229"]'), vis).length;
    r.src = Array.prototype.map.call(d.querySelectorAll('[data-src]'), function (e) { return e.getAttribute('data-src'); });
    var card = d.getElementById('hoy-ses');
    r.tarjeta = card ? card.innerText : null;
    r.recursos = (w.performance.getEntriesByType('resource') || []).map(function (e) { return e.name; });
    if (w.__qa) { r.qa = { umbral1000: w.__qa.umbral1000, errores: w.__qa.errores }; }
  } catch (e) { r.fallo = String(e && e.message || e); }
  out[c.id] = r;
  if (--pend === 0) document.getElementById('res').textContent = JSON.stringify(out);
}
CASOS.forEach(function (c) {
  var fr = document.createElement('iframe');
  fr.style.width = c.w + 'px'; fr.style.height = c.h + 'px';
  fr.onload = function () { setTimeout(function () { recoger(c, fr); }, 2800); };
  fr.src = c.url;
  document.body.appendChild(fr);
});
</script></body></html>"""


def render(inf, ruta_html, D, frases, hoy):
    if not os.path.exists(CHROME):
        inf.e('--render: no encuentro Chrome en %s' % CHROME)
        return
    base = 'file://' + os.path.abspath(ruta_html)
    casos = []

    def caso(id_, ruta, params, w=1280, h=900):
        q = {'qa': '1', 'hoy': hoy}
        q.update(params)
        url = base + '?' + '&'.join('%s=%s' % kv for kv in q.items()) + '#' + ruta
        casos.append({'id': id_, 'url': url, 'vista': ruta.split('/')[0], 'w': w, 'h': h})
    for v in VISTAS:
        caso('vista:' + v, v, {'abrir': '1'})
    for i, (r, p) in enumerate(RUTAS_UMBRAL):
        caso('umbral:%d' % i, r, p)
    for f in FECHAS_HOY:
        caso('hoy:' + f, 'hoy', {'hoy': f}, 390, 844)
    caso('registro', 'marcas/registro', {})
    tmp = tempfile.mkdtemp(prefix='validar_web_')
    marco = os.path.join(tmp, 'marco.html')
    with open(marco, 'w', encoding='utf-8') as f:
        f.write(MARCO.replace('__CASOS__', json.dumps(casos, ensure_ascii=False)))
    try:
        dom = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
                              '--window-size=1400,1000', '--virtual-time-budget=40000', '--dump-dom', 'file://' + marco],
                             capture_output=True, text=True, timeout=240).stdout
    except subprocess.TimeoutExpired:
        inf.e('--render: Chrome no terminó en 240 s')
        return
    m = re.search(r'<pre id="res">(.*?)</pre>', dom, re.S)
    try:
        import html as H
        res = json.loads(H.unescape(m.group(1))) if m else None
    except Exception:
        res = None
    if not res:
        inf.e('--render: el marco no devolvió resultados (¿falta --allow-file-access-from-files o la página no carga?)')
        return
    # errores de consola en las cinco vistas (y en el resto de casos)
    for id_, r in sorted(res.items()):
        if r.get('fallo'):
            inf.e('--render %s: no se pudo leer la página (%s)' % (id_, r['fallo']))
        errs = r.get('errores') or []
        if errs:
            (inf.e if id_.startswith('vista:') else inf.a)('--render %s: __errores = %s' % (id_, '; '.join(errs)[:300]))
        for u in r.get('recursos') or []:
            if 'raw.githubusercontent.com' in u:
                inf.e('--render %s: petición a %s' % (id_, u))
    # 3:49
    for i, (ruta, p) in enumerate(RUTAS_UMBRAL):
        r = res.get('umbral:%d' % i) or {}
        n = r.get('umbral', 0)
        etq = '#%s%s' % (ruta, ''.join(' %s=%s' % kv for kv in p.items()))
        if n < 1:
            inf.e('--render %s: no se ve ningún [data-umbral="229"] (el 3:49 tiene que verse)' % etq)
        else:
            inf.bien('--render %s: %d elementos con el 3:49' % (etq, n))
    # tarjeta de Hoy en los días de prueba
    titulos = {d['fecha']: d.get('titulo') for d in (D or {}).get('derivados', {}).get('dias', [])}
    for f in FECHAS_HOY:
        r = res.get('hoy:' + f) or {}
        t = r.get('tarjeta')
        if not t or not t.strip():
            inf.e('--render hoy=%s: la pestaña Hoy no pinta la tarjeta de sesión (#hoy-ses)' % f)
        elif titulos.get(f) and cw.norm(titulos[f]) not in cw.norm(t):
            inf.a('--render hoy=%s: la tarjeta no enseña el título del día «%s»' % (f, titulos[f]))
    # registro completo en Marcas › Registro
    r = res.get('registro') or {}
    pintado = set(r.get('src') or [])
    esperado = {'%s:%s' % (a, e['fecha']) for a in cw.ARRAYS_HIST for e in ((D or {}).get('historial') or {}).get(a) or []
                if '/' not in e.get('fecha', '')}
    falta = sorted(esperado - pintado)
    if falta:
        inf.e('--render Marcas › Registro: sin pintar %d de %d entradas (%s%s)' % (len(falta), len(esperado), ', '.join(falta[:8]), '…' if len(falta) > 8 else ''))
    else:
        inf.bien('--render Marcas › Registro: pintadas las %d entradas del historial' % len(esperado))
    # frases clave (texto de las cinco vistas con abrir=1)
    textos = ' \n '.join(cw.norm((res.get('vista:' + v) or {}).get('texto') or '') for v in VISTAS)
    faltan = 0
    for idinv, lista in frases.items():
        for fr in lista:
            if cw.norm(fr) not in textos:
                faltan += 1
                inf.e('--render frase clave de %s sin pintar: «%s»' % (idinv, fr))
    total = sum(len(v) for v in frases.values())
    if not faltan:
        inf.bien('--render frases clave: las %d aparecen' % total)


# ---------------------------------------------------------------------------- principal
def main(argv=None):
    rd = cw.rutas_defecto()
    ap = argparse.ArgumentParser(description='Valida la web construida antes de publicar.')
    ap.add_argument('web_html', nargs='?', default=os.path.join(IMPL, 'out', 'index.html'))
    ap.add_argument('--render', action='store_true')
    ap.add_argument('--solo-datos', action='store_true')
    ap.add_argument('--hoy', default=dt.date.today().isoformat())
    ap.add_argument('--aceptar-conflicto', action='append', default=[], metavar='K5')
    for k in ('plan', 'historial', 'web', 'campos', 'corpus'):
        ap.add_argument('--' + k, default=rd[k])
    ap.add_argument('--src', default=os.path.join(IMPL, 'src'))
    ap.add_argument('--frases', default=os.path.join(IMPL, 'qa', 'frases_clave.json'))
    ap.add_argument('--json', help='escribe el informe en esta ruta')
    a = ap.parse_args(argv)
    inf = Informe()

    plan, hist, web, campos = (cw.leer_json(getattr(a, k)) for k in ('plan', 'historial', 'web', 'campos'))

    # corpus fijo, comprobado por su sha256
    corpus = cargar_corpus(a.plan, a.historial, a.corpus, web)
    if corpus['sha'] != web.get('corpusSha256'):
        inf.e('el corpus de literalidad cambió: sha256 %s y web.json espera %s' % (corpus['sha'][:16], str(web.get('corpusSha256'))[:16]))
    else:
        inf.bien('corpus congelado: sha256 %s… coincide' % corpus['sha'][:16])

    # constructor: lista blanca, firmas, calendario, baremo, privacidad del bloque, K5
    datos, errs, avisos = cw.construir(plan, hist, web, campos, hoy=a.hoy, aceptar=a.aceptar_conflicto)
    for x in errs:
        inf.e(x)
    for x in avisos:
        inf.a(x)
    if not errs:
        inf.bien('constructor: sin errores (lista blanca, firmas, calendario, baremo, privacidad del bloque)')
    comprobar_literalidad(inf, plan, hist, web, corpus)

    # frases clave: formato
    frases = {}
    if os.path.exists(a.frases):
        fj = cw.leer_json(a.frases)
        frases = {k: v for k, v in fj.items() if not k.startswith('_') and isinstance(v, list)}
        p_inv = os.path.join(IMPL, 'qa', 'inventario_ids.json')
        ids = cw.leer_json(p_inv).get('ids', {}) if os.path.exists(p_inv) else {}
        if not ids:
            inf.a('no hay qa/inventario_ids.json: no se comprueba que frases_clave.json cubra todos los ID')
        vivos = {k for k, v in ids.items() if not v.get('eliminado')}
        muertos = {k for k, v in ids.items() if v.get('eliminado')}
        for k in sorted(vivos - set(frases)):
            inf.e('frases_clave.json: falta el ID %s' % k)
        for k in sorted(set(frases) & muertos):
            inf.e('frases_clave.json: %s está eliminado y no debe tener frases' % k)
    else:
        inf.a('no hay %s' % a.frases)

    D = None
    if not a.solo_datos:
        if not os.path.exists(a.web_html):
            inf.e('no existe %s: construye con build.py (o usa --solo-datos)' % a.web_html)
        else:
            html = open(a.web_html, encoding='utf-8').read()
            D = comprobar_html(inf, html, plan, hist, web, campos)
            if frases:
                txt = cw.norm(re.sub(r'<[^>]+>', ' ', html)) + ' ' + cw.norm(html)
                for k, lista in frases.items():
                    for fr in lista:
                        if cw.norm(fr) not in txt:
                            inf.a('frase clave de %s que no está en ningún sitio del HTML (tampoco en los datos): «%s»' % (k, fr))
        comprobar_src(inf, a.src)
        if a.render and D is not None:
            render(inf, a.web_html, D, frases, a.hoy)

    for x in inf.ok:
        print('  ok  ' + x)
    print('\nERRORES (%d)' % len(inf.errores))
    for x in inf.errores:
        print('  x  ' + x)
    print('\nAVISOS (%d)' % len(inf.avisos))
    for x in inf.avisos:
        print('  -  ' + x)
    if a.json:
        with open(a.json, 'w', encoding='utf-8') as f:
            json.dump({'errores': inf.errores, 'avisos': inf.avisos, 'ok': inf.ok}, f, ensure_ascii=False, indent=1)
    return 1 if inf.errores else 0


if __name__ == '__main__':
    sys.exit(main())

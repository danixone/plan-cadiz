#!/usr/bin/env python3
"""Banco de QA común (M0 · especificación §10.6). Lo monta M0 y lo pasa M8.

    python3 qa/qa.py [--construir] [--rapido] [--paralelo 6] [--sin-capturas] [--alto 844]
                     [--rutas hoy,plan/ritmos] [--anchos 390,1280] [--temas light,dark]
                     [--fechas 2026-09-29,...] [--horas ,08:00,22:40] [--solo-casos]

Recorre la matriz (rutas y estados × anchos × temas × fechas × horas) cargando cada caso en
qa/marco.html con Chrome sin cabecera (--dump-dom), guarda qa/resultado.json y, salvo
--sin-capturas, capturas/<ruta>_<ancho>_<tema>_<fecha>[_<hora>].png (ventana a max(500, ancho),
recortada al ancho). Después evalúa los 14 criterios globales de §10.6 y los imprime.

Cada caso usa un perfil temporal de Chrome: nada de localStorage se arrastra de un caso a otro.
"""
import argparse, concurrent.futures as cf, gzip, html as htmlmod, json, os, re, shutil, subprocess, sys, tempfile, time

AQUI = os.path.dirname(os.path.abspath(__file__))
IMPL = os.path.dirname(AQUI)
REDISENO = os.path.dirname(IMPL)
RAIZ_PROYECTO = os.environ.get('PLAN_RAIZ', REDISENO)  # la carpeta que contiene web/
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
OUT = os.path.join(IMPL, 'out', 'index.html')
CAPTURAS = os.path.join(IMPL, 'capturas')

ANCHOS = [320, 360, 375, 390, 768, 1280]
TEMAS = ['light', 'dark']
FECHAS = ['2026-09-29', '2026-10-01', '2026-10-06', '2026-10-10', '2026-10-12', '2026-10-17', '2026-10-24', '2026-10-27']
HORAS = ['', '08:00', '22:40']
ANCHOS_CAPTURA = (390, 1280)          # §10.6.10: capturas revisadas a 390 y 1280

# (nombre del estado, ruta, parámetros extra, ¿depende de la fecha?, ¿depende de la hora?)
ESTADOS = [
    ('hoy', 'hoy', {}, True, True),                                   # semáforo abierto
    ('hoy-sem', 'hoy', {'sem': 'verde'}, True, False),                  # semáforo cerrado
    ('hoy-focus', 'hoy', {'abrir': 'focus'}, True, False),
    ('hoy-focus-sinvibrar', 'hoy', {'abrir': 'focus', 'sinvibrar': '1'}, True, False),
    ('hoy-fue', 'hoy', {'abrir': 'fue'}, True, False),
    ('plan', 'plan', {}, False, False),
    ('plan-ritmos', 'plan/ritmos', {}, False, False),
    ('plan-2026-10-10', 'plan/2026-10-10', {}, False, False),
    ('marcas', 'marcas', {}, False, False),
    ('marcas-nota', 'marcas/nota', {}, False, False),
    ('marcas-controles', 'marcas/controles', {}, False, False),
    ('marcas-graficas-sueno', 'marcas/graficas/sueno', {}, False, False),
    ('tecnica', 'tecnica', {}, False, False),
    ('tecnica-dominada', 'tecnica/dominada', {}, False, False),
    ('tecnica-mil', 'tecnica/mil', {}, False, False),
    ('tecnica-circuito', 'tecnica/circuito', {}, False, False),
    ('dieta', 'dieta', {}, False, False),
]
# pasada «todo abierto» (abrir=1): desbordamiento en 320-390 y frases clave
RUTAS_ABIERTAS = ['hoy', 'plan', 'marcas', 'tecnica', 'dieta', 'marcas/nota', 'marcas/registro', 'tecnica/dominada']
# §6.1.7 / criterio 6: dónde tiene que verse el 3:49
UMBRAL = [
    ('marcas/nota', {'abrir': '1'}, '2026-09-29'), ('marcas/controles', {}, '2026-09-29'), ('plan/ritmos', {}, '2026-09-29'),
    ('tecnica/mil', {}, '2026-09-29'), ('hoy', {}, '2026-10-10'), ('hoy', {}, '2026-10-09'),
    ('hoy', {'abrir': 'focus'}, '2026-10-10'), ('hoy', {'abrir': 'fue'}, '2026-10-10'),
]
# §5.9: identificadores que no pueden quedar en el HTML (fuera del bloque de datos)
PROHIBIDOS = [r'\bFIG\b', r'\bfigs\(', r'\bFOTOS\b', r'\bFOTO_BASE\b', r'\bbindFotos\b', r'\bFICHAS\b', r'\bCAL_LARGO\b', r'\bCAL_CORTO\b',
              r'\bDOMI\b', r'\bSABCOMP\b', r'\bDIADET\b', r'\bpc-tab\b', r'\bdrawSueno\b', r'\bdrawCarga\b', r'\bdrawTrote\b', r'\bdrawMil\b',
              r'\bdrawDom\b', r'\bbindHit\b', r'IBM Plex Mono', r'IBM\+Plex\+Mono', r'raw\.githubusercontent\.com', r'id="s-mil"', r'id="s-dom"',
              r'id="s-cir"', r'class="presets"', r'\.tip\{', r'id="cd[123]"']
TONO = re.compile(r'¡|\bvamos\b|ánimo|tú puedes|\bgenial\b|enhorabuena|a por ello', re.I)


def chrome(args, timeout=60):
    """Chrome sin cabecera (modo nuevo): cada llamada usa un perfil temporal propio, así que
    nada de localStorage pasa de un caso a otro. No se pasa --user-data-dir: con un perfil
    nuevo explícito, --dump-dom no termina."""
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--mute-audio'] + args
    try:
        r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=timeout)
        return r.stdout.decode('utf-8', 'replace')
    except subprocess.TimeoutExpired:
        return ''


def url_marco(ruta, w, h, tema, hoy, extra, hora=''):
    q = {'w': w, 'h': h, 'ruta': ruta, 'tema': tema, 'hoy': hoy}
    if hora:
        q['hora'] = hora
    q.update(extra or {})
    return 'file://' + os.path.join(AQUI, 'marco.html') + '?' + '&'.join('%s=%s' % (k, v) for k, v in q.items())


def leer_res(dom):
    m = re.findall(r'<pre id="res">(.*?)</pre>', dom, re.S)
    if not m or not m[-1].strip():
        return {'error': 'sin resultado del marco'}
    try:
        return json.loads(htmlmod.unescape(m[-1]))
    except Exception as e:
        return {'error': 'JSON ilegible: %s' % e}


def caso(c, capturas, alto):
    w, h = c['ancho'], alto
    u = url_marco(c['ruta'], w, h, c['tema'], c['fecha'], c['extra'], c['hora'])
    dom = chrome(['--virtual-time-budget=20000', '--window-size=%d,%d' % (max(500, w), h), '--dump-dom', u])
    r = leer_res(dom)
    c = dict(c)
    c['res'] = r.get('qa', r)
    if 'casos' in r:
        c['casos'] = r['casos']
    if capturas and not c['hora'] and w in ANCHOS_CAPTURA:
        nombre = '%s_%d_%s_%s%s.png' % (c['estado'], w, c['tema'], c['fecha'], '_abierto' if c['extra'].get('abrir') == '1' else '')
        destino = os.path.join(CAPTURAS, nombre)
        chrome(['--virtual-time-budget=6000', '--window-size=%d,%d' % (max(500, w), h), '--screenshot=' + destino, u])
        try:
            from PIL import Image
            im = Image.open(destino)
            im.crop((0, 0, w, im.height)).save(destino)
            c['captura'] = os.path.relpath(destino, IMPL)
        except Exception as e:
            c['captura_error'] = str(e)
    return c


def matriz(a):
    anchos = [int(x) for x in a.anchos.split(',')] if a.anchos else ANCHOS
    temas = a.temas.split(',') if a.temas else TEMAS
    fechas = a.fechas.split(',') if a.fechas else FECHAS
    horas = a.horas.split(',') if a.horas is not None else HORAS
    rutas = set(a.rutas.split(',')) if a.rutas else None
    if a.rapido:
        anchos, temas, fechas, horas = [390, 1280], temas, ['2026-09-29', '2026-10-10'], ['']
    casos = []
    for (est, ruta, extra, porFecha, porHora) in ESTADOS:
        if rutas and ruta not in rutas and est not in rutas:
            continue
        fs = fechas if porFecha else ['2026-09-29']
        hs = horas if porHora else ['']
        for f in fs:
            for hora in hs:
                for w in anchos:
                    for t in temas:
                        casos.append({'estado': est, 'ruta': ruta, 'extra': dict(extra), 'fecha': f, 'hora': hora, 'ancho': w, 'tema': t})
                        if f == '2026-10-27' and porFecha:
                            casos.append({'estado': est + '-28-30', 'ruta': ruta, 'extra': dict(extra, prueba='28-30'), 'fecha': f, 'hora': hora, 'ancho': w, 'tema': t})
    # pasada con todo abierto
    for ruta in RUTAS_ABIERTAS:
        if rutas and ruta not in rutas:
            continue
        for w in sorted(set([x for x in anchos if x <= 390] + [1280])):   # 320-390: desbordamiento · 1280: frases clave (el calendario rotula los días)
            casos.append({'estado': ruta.replace('/', '-'), 'ruta': ruta, 'extra': {'abrir': '1'}, 'fecha': '2026-09-29', 'hora': '', 'ancho': w, 'tema': temas[0]})
    # rutas del 3:49
    for (ruta, extra, f) in UMBRAL:
        if rutas and ruta not in rutas:
            continue
        casos.append({'estado': 'umbral-' + ruta.replace('/', '-') + ('-' + extra.get('abrir') if extra.get('abrir') else ''), 'ruta': ruta, 'extra': dict(extra),
                      'fecha': f, 'hora': '', 'ancho': 390, 'tema': 'light', 'umbral': True})
    # quitar duplicados exactos
    vistos, out = set(), []
    for c in casos:
        k = json.dumps([c['ruta'], c['extra'], c['fecha'], c['hora'], c['ancho'], c['tema']], sort_keys=True)
        if k in vistos:
            if c.get('umbral'):
                for o in out:
                    if json.dumps([o['ruta'], o['extra'], o['fecha'], o['hora'], o['ancho'], o['tema']], sort_keys=True) == k:
                        o['umbral'] = True
            continue
        vistos.add(k)
        out.append(c)
    return out


def esperado_src():
    hist = json.load(open(os.path.join(RAIZ_PROYECTO, 'datos', 'historial.json'), encoding='utf-8'))
    out = set()
    for a in ('carrera', 'dominadas', 'circuito', 'sueno', 'garmin', 'composicion', 'evolucionEstimacion'):
        for e in hist.get(a, []):
            f = e.get('fecha', '')
            if '/' in f:
                continue
            out.add('%s:%s' % (a, f))
    return out


def pictogramas(rutas):
    """Pictogramas literales (\\p{Extended_Pictographic}) en src/, con node."""
    js = r"""
const fs=require('fs');const out=[];
for(const f of process.argv.slice(1)){const t=fs.readFileSync(f,'utf8');const re=/\p{Extended_Pictographic}/gu;let m;
 while((m=re.exec(t))){const l=t.slice(0,m.index).split('\n').length;out.push({archivo:f,linea:l,car:m[0],cp:m[0].codePointAt(0).toString(16)});if(out.length>200)break;}}
console.log(JSON.stringify(out));"""
    try:
        r = subprocess.run(['node', '-e', js] + rutas, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        return json.loads(r.stdout.decode() or '[]')
    except Exception as e:
        return [{'error': 'node no disponible: %s' % e}]


def archivos_src():
    out = []
    for raiz, _, fs in os.walk(os.path.join(IMPL, 'src')):
        for f in fs:
            if f.endswith(('.js', '.css', '.html')):
                out.append(os.path.join(raiz, f))
    return sorted(out)


def evaluar(resultados, a, extra):
    C = {}
    R = [r for r in resultados if isinstance(r.get('res'), dict)]
    sin = [r for r in resultados if not isinstance(r.get('res'), dict) or r['res'].get('error')]

    def nom(r):
        return '%s %d %s %s%s' % (r['estado'], r['ancho'], r['tema'], r['fecha'], (' ' + r['hora']) if r['hora'] else '')
    C['1_construccion'] = extra.get('construccion', {'ok': None, 'detalle': 'sin --construir'})
    errs = [{'caso': nom(r), 'errores': r['res'].get('errores')} for r in R if r['res'].get('errores')]
    C['2_errores'] = {'ok': not errs and not sin, 'detalle': errs[:30], 'sin_resultado': [nom(r) + ': ' + str(r.get('res', {}).get('error')) for r in sin][:30]}
    des = [{'caso': nom(r), 'scrollW': r['res'].get('scrollW'), 'clientW': r['res'].get('clientW'), 'desbordan': r['res'].get('desbordan', [])[:5]}
           for r in R if r['ancho'] <= 390 and r['extra'].get('abrir') == '1' and (r['res'].get('scrollW', 0) > r['res'].get('clientW', 0) or r['res'].get('desbordan'))]
    des2 = [{'caso': nom(r), 'scrollW': r['res'].get('scrollW'), 'clientW': r['res'].get('clientW')} for r in R if r['res'].get('scrollW', 0) > r['res'].get('clientW', 1e9)]
    C['3_desbordamiento'] = {'ok': not des and not des2, 'detalle': des[:20], 'otros_anchos': des2[:20]}
    toq = {}
    let = {}
    for r in R:
        for t in r['res'].get('toques', []):
            toq.setdefault(t['sel'], {'ejemplo': nom(r), 'caja': t['caja'], 'txt': t.get('txt')})
        for t in r['res'].get('letra', []):
            let.setdefault(t['sel'], {'ejemplo': nom(r), 'px': t['px'], 'txt': t.get('txt')})
    C['4_tactil_y_letra'] = {'ok': not toq and not let, 'toques': toq, 'letra': let}
    ids = json.load(open(os.path.join(AQUI, 'inventario_ids.json'), encoding='utf-8'))['ids']
    inv = set()
    for r in R:
        inv.update(r['res'].get('inv', []))
    faltan = sorted(k for k, v in ids.items() if not v.get('eliminado') and k not in inv)
    sobran = sorted(k for k, v in ids.items() if v.get('eliminado') and k in inv)
    frases_p = os.path.join(AQUI, 'frases_clave.json')
    def norm(t):
        return re.sub(r'\s+', ' ', (t or '').replace('\u00a0', ' ').replace('\u202f', ' ')).strip().lower()
    textos_n = norm(' '.join(r['res'].get('texto', '') for r in R if r['extra'].get('abrir') == '1'))
    faltan_frases = []
    if os.path.exists(frases_p):
        fr = json.load(open(frases_p, encoding='utf-8'))
        fr = fr.get('frases', fr) if isinstance(fr, dict) else fr
        items = fr.items() if isinstance(fr, dict) else [(x.get('id'), x.get('frases', [x.get('frase')])) for x in fr]
        for k, lista in items:
            if k and k.startswith('_'):
                continue
            for f in (lista if isinstance(lista, list) else [lista]):
                if f and norm(f) not in textos_n:
                    faltan_frases.append({'id': k, 'frase': f})
    html = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
    sin_datos = re.sub(r'<script id="datos" type="application/json">.*?</script>', '', html, flags=re.S)
    prohib = [p for p in PROHIBIDOS if re.search(p, sin_datos)]
    C['5_inventario'] = {'ok': not faltan and not sobran and not faltan_frases and not prohib and os.path.exists(frases_p),
                         'faltan_ids': faltan, 'eliminados_presentes': sobran, 'faltan_frases': faltan_frases[:60],
                         'frases_clave': 'qa/frases_clave.json' if os.path.exists(frases_p) else 'FALTA qa/frases_clave.json (M1)', 'identificadores_5_9': prohib}
    um = [{'caso': nom(r), 'umbral1000': r['res'].get('umbral1000')} for r in R if r.get('umbral')]
    C['6_umbral_349'] = {'ok': bool(um) and all((x['umbral1000'] or 0) >= 1 for x in um), 'detalle': um}
    src = set()
    for r in R:
        src.update(r['res'].get('src', []))
    esp = esperado_src()
    falta_src = sorted(esp - src)
    C['7_historial'] = {'ok': not falta_src, 'esperadas': len(esp), 'pintadas': len(esp & src), 'faltan': falta_src[:60]}
    grupos = {}
    for r in R:
        if r['estado'] == 'hoy' and not r['extra']:
            grupos.setdefault((r['fecha'], r['ancho'], r['tema']), {})[r['hora']] = r['res'].get('orden')
    dif = [{'caso': '%s %d %s' % k, 'ordenes': v} for k, v in grupos.items() if len(v) > 1 and len(set(json.dumps(x) for x in v.values())) > 1]
    hay = any(len(v) > 1 for v in grupos.values())
    C['8_orden_fijo'] = {'ok': (not dif) if hay else None, 'detalle': dif[:10] if hay else 'la matriz no tiene varias horas (usa --horas ,08:00,22:40)', 'grupos': len(grupos)}
    pp = []
    for r in R:
        if r['ruta'] == 'hoy' and r['ancho'] == 390 and r['fecha'] == '2026-09-29' and not r['hora'] and r['extra'] in ({}, {'sem': 'verde'}):
            P = r['res'].get('primeraPantalla') or {}
            claves = ['fecha', 'lamparas', 'titulo', 'numeros'] if not r['extra'] else ['fecha', 'titulo', 'numeros', 'hoyhaces']
            mal = [k for k in claves if not (P.get(k) and P[k].get('visible'))]
            pp.append({'caso': nom(r), 'no_visibles': mal})
    C['9_primera_pantalla'] = {'ok': bool(pp) and all(not x['no_visibles'] for x in pp), 'detalle': pp}
    C['10_capturas'] = {'ok': None, 'detalle': 'revisión a la vista: capturas/ (%d archivos)' % len([r for r in resultados if r.get('captura')])}
    comp = len(gzip.compress(html.encode('utf-8'), 9)) if html else 0
    jspdf_src = re.search(r'<script[^>]+src="[^"]*jspdf', html, re.I)
    C['11_tamano'] = {'ok': bool(html) and comp <= 240 * 1024 and 'raw.githubusercontent.com' not in html and not jspdf_src,
                      'gzip_kb': round(comp / 1024, 1), 'crudo_kb': round(len(html.encode('utf-8')) / 1024, 1),
                      'raw_github': 'raw.githubusercontent.com' in html, 'jspdf_en_script_src': bool(jspdf_src)}
    tono = []
    for f in archivos_src():
        for i, l in enumerate(open(f, encoding='utf-8').read().split('\n'), 1):
            if TONO.search(l):
                tono.append('%s:%d: %s' % (os.path.relpath(f, IMPL), i, l.strip()[:100]))
    pic = pictogramas(archivos_src())
    C['12_tono'] = {'ok': not tono and not pic, 'tono': tono[:30], 'pictogramas': pic[:30]}
    C['13_paridad_dieta'] = extra.get('paridad', {'ok': None, 'detalle': 'qa/paridad_dieta.py no existe todavía (M7)'})
    ms = extra.get('arranque') or []
    C['14_arranque'] = {'ok': (sorted(ms)[len(ms) // 2] < 200) if ms else None, 'medidas_ms': ms, 'mediana_ms': sorted(ms)[len(ms) // 2] if ms else None,
                        'nota': 'tres cargas seguidas de #hoy a 1280 px, sin otras cargas en paralelo (sin contar fuentes); confírmalo en un navegador real'}
    return C


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--construir', action='store_true', help='ejecuta build.py (y validar_web.py si existe) antes')
    ap.add_argument('--muestra', action='store_true', help='con --construir, construye con datos/muestra.json')
    ap.add_argument('--rapido', action='store_true', help='390 y 1280, 29-9 y 10-10, sin horas')
    ap.add_argument('--paralelo', type=int, default=6)
    ap.add_argument('--sin-capturas', action='store_true')
    ap.add_argument('--alto', type=int, default=844)
    ap.add_argument('--rutas'); ap.add_argument('--anchos'); ap.add_argument('--temas'); ap.add_argument('--fechas')
    ap.add_argument('--horas', default=None, help='lista separada por comas; vacío = sin hora')
    ap.add_argument('--solo-casos', action='store_true', help='solo los casos de baremo, formatos, calendario y semáforo')
    a = ap.parse_args()
    extra = {}
    if a.construir:
        r = subprocess.run([sys.executable, os.path.join(IMPL, 'build.py')] + (['--muestra'] if a.muestra else []), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        salida = r.stdout.decode('utf-8', 'replace')
        print(salida.strip())
        ok = r.returncode == 0
        det = {'build': salida.strip().split('\n')[-5:]}
        val = os.path.join(IMPL, 'herramientas', 'validar_web.py')
        if os.path.exists(val):
            v = subprocess.run([sys.executable, val, '--render'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=IMPL)
            det['validar'] = v.stdout.decode('utf-8', 'replace').strip().split('\n')[-15:]
            ok = ok and v.returncode == 0
        else:
            det['validar'] = 'herramientas/validar_web.py no existe todavía (M1)'
        extra['construccion'] = {'ok': ok, 'detalle': det}
        if r.returncode not in (0, 3):          # 3: out/index.html escrito, solo falla el tamaño (criterio 11)
            sys.exit('build.py falló')
    par = os.path.join(AQUI, 'paridad_dieta.py')
    if os.path.exists(par) and not a.solo_casos:
        p = subprocess.run([sys.executable, par], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd=IMPL)
        extra['paridad'] = {'ok': p.returncode == 0, 'detalle': p.stdout.decode('utf-8', 'replace').strip().split('\n')[-15:]}
    os.makedirs(CAPTURAS, exist_ok=True)
    # casos de las funciones (una sola carga)
    base = caso({'estado': 'casos', 'ruta': 'hoy', 'extra': {'casos': '1', 'pruebas': '1', 'sinvibrar': '1'}, 'fecha': '2026-09-29', 'hora': '', 'ancho': 390, 'tema': 'light'}, False, a.alto)
    casos = base.get('casos', {})
    casos['nucleo'] = (base.get('res') or {}).get('pruebas')
    for w in (390, 1280):
        dom = chrome(['--virtual-time-budget=30000', '--force-prefers-reduced-motion', '--window-size=%d,%d' % (max(500, w), a.alto),
                      '--dump-dom', 'file://' + os.path.join(AQUI, 'rutas.html') + '?w=%d&h=%d' % (w, a.alto)])
        rr = leer_res(dom)
        casos['rutas_%d' % w] = {'ok': bool(rr.get('ok')), 'fallos': [p for p in rr.get('pasos', []) if not p.get('ok')] or ([rr['error']] if rr.get('error') else []),
                                 'pasos': len(rr.get('pasos', []))}
    print('casos:', json.dumps({k: (v.get('ok') if isinstance(v, dict) and 'ok' in v else v) for k, v in casos.items()}, ensure_ascii=False))
    for k, v in casos.items():
        if isinstance(v, dict) and v.get('fallos'):
            for f in v['fallos'][:10]:
                print('  FALLO %s: %s' % (k, json.dumps(f, ensure_ascii=False)))
    medidas = []
    for _ in range(3):
        r1 = caso({'estado': 'arranque', 'ruta': 'hoy', 'extra': {}, 'fecha': '2026-09-29', 'hora': '', 'ancho': 1280, 'tema': 'light'}, False, a.alto)
        v = (r1.get('res') or {}).get('msArranque')
        if v is not None:
            medidas.append(v)
    extra['arranque'] = medidas
    print('arranque a 1280 (ms):', medidas)
    if a.solo_casos:
        json.dump({'casos': casos}, open(os.path.join(AQUI, 'resultado.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        return
    M = matriz(a)
    print('matriz: %d cargas (%s capturas) · %d en paralelo' % (len(M), 'sin' if a.sin_capturas else 'con', a.paralelo))
    t0 = time.time()
    res = []
    with cf.ThreadPoolExecutor(max_workers=a.paralelo) as ex:
        fut = [ex.submit(caso, c, not a.sin_capturas, a.alto) for c in M]
        for i, f in enumerate(cf.as_completed(fut), 1):
            res.append(f.result())
            if i % 25 == 0 or i == len(fut):
                print('  %d/%d · %.0f s' % (i, len(fut), time.time() - t0))
    # M8: con 8 Chrome en paralelo, alguna carga pesada (Técnica con las láminas) agota los 60 s y vuelve «sin resultado
    # del marco» sin ningún error de la página. Esas cargas se repiten de una en una (hasta dos veces) antes de evaluar;
    # si siguen sin resultado, cuentan como fallo del criterio 2, igual que antes.
    for i, r in enumerate(res):
        if 'error' not in (r.get('res') or {}):
            continue
        base_c = {k: v for k, v in r.items() if k not in ('res', 'casos', 'captura', 'captura_error')}
        for _ in range(2):
            r2 = caso(base_c, not a.sin_capturas, a.alto)
            if 'error' not in (r2.get('res') or {}):
                print('  repetida sola y con resultado: %s %s %s %s' % (r['estado'], r['ancho'], r['tema'], r['fecha']))
                res[i] = r2
                break
    res.sort(key=lambda r: (r['estado'], r['fecha'], r['hora'], r['ancho'], r['tema']))
    C = evaluar(res, a, extra)
    C['casos'] = {'ok': all((v or {}).get('ok', True) for k, v in casos.items() if isinstance(v, dict) and 'ok' in v) and bool((casos.get('nucleo') or {}).get('timer', {}).get('ok')),
                  'detalle': casos}
    ligero = []
    for r in res:
        q = dict(r.get('res') or {})
        q.pop('texto', None)
        ligero.append({k: v for k, v in r.items() if k != 'res'} | {'res': q} if sys.version_info >= (3, 9) else r)
    json.dump({'criterios': C, 'matriz': ligero}, open(os.path.join(AQUI, 'resultado.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\nCriterios globales (§10.6):')
    for k, v in C.items():
        estado = 'PASA' if v.get('ok') is True else ('FALLA' if v.get('ok') is False else 'MANUAL/PENDIENTE')
        print('  %-22s %s' % (k, estado))
    print('\nDetalle en qa/resultado.json · capturas en capturas/')


if __name__ == '__main__':
    main()

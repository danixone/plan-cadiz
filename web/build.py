#!/usr/bin/env python3
"""Ensamblado de la web del plan (M0 · especificación §10.2).

    python3 build.py [--hoy AAAA-MM-DD] [--muestra] [--aceptar-conflicto K5] [--salida out/index.html]
    python3 build.py --hacer-muestra        # regenera datos/muestra.json desde los JSON del proyecto

1. Datos: importa herramientas/construir_web.py (M1) y llama a
   construir(plan, historial, web, campos) -> (datos, errores, avisos). Con errores, se para.
   Con --muestra, o si el constructor de M1 aún no existe, usa datos/muestra.json.
2. CSS: src/00_head.html con /*__CSS__*/ -> «@layer sistema, modulos, dieta;» + cada src/css/*.css
   envuelto en su capa (10-15 sistema · 16-59 modulos · 60+ dieta). Ningún CSS queda fuera de capa.
3. src/20_shell.html: <!--__VISTA:x--> -> src/views/x.html · <!--__DATOS__--> -> bloque de datos ·
   <!--__JS__--> -> un <script> por archivo de src/js/*.js, por orden de nombre.
4. Escribe out/index.html e imprime el tamaño sin comprimir y comprimido con gzip.

M8 (integración): por defecto el CSS y el JS se minifican al ensamblar (herramientas/minificar.py:
fuera comentarios y espacios, con comprobación de tokens; herramientas/acortar_nombres.js: nombres
locales cortos con el acorn que trae Node, con comprobación del árbol). Los fuentes de src/ no se
tocan. --sin-minificar ensambla los fuentes tal cual (para depurar). Cada <script data-mod> lleva
data-sha con el sha256 (12 cifras) del fuente, que es lo que comprueba qa/paridad_dieta.py.
Si solo falla el tamaño, out/index.html se escribe igual y la salida es 3 (no 1).

Los JSON del proyecto se LEEN; nunca se escriben.
"""
import argparse, datetime, gzip, hashlib, importlib.util, inspect, json, os, re, shutil, subprocess, sys, tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ_PROYECTO = os.environ.get('PLAN_RAIZ', os.path.dirname(AQUI))  # la carpeta que contiene web/
SRC = os.path.join(AQUI, 'src')
VISTAS = ['hoy', 'plan', 'marcas', 'tecnica', 'dieta']
LIMITE_GZIP = 240 * 1024  # subido de 190 a 240 el 29-9 por el entrenador: 225 KB con gzip cargan bien en el móvil


def leer(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def leer_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def capa_de(nombre):
    m = re.match(r'^(\d+)_', nombre)
    n = int(m.group(1)) if m else 50
    if n < 16:
        return 'sistema'
    if n < 60:
        return 'modulos'
    return 'dieta'


# ---------------------------------------------------------------------------------------------- datos
def datos_de_m1(args):
    ruta = os.path.join(AQUI, 'herramientas', 'construir_web.py')
    if not os.path.exists(ruta):
        return None
    spec = importlib.util.spec_from_file_location('construir_web', ruta)
    mod = importlib.util.module_from_spec(spec)
    sys.path.insert(0, os.path.dirname(ruta))
    spec.loader.exec_module(mod)
    if not hasattr(mod, 'construir'):
        print('AVISO: herramientas/construir_web.py no tiene construir(); se usa la muestra')
        return None
    plan = leer_json(os.path.join(RAIZ_PROYECTO, 'datos', 'plan.json'))
    hist = leer_json(os.path.join(RAIZ_PROYECTO, 'datos', 'historial.json'))
    pweb = os.path.join(AQUI, 'datos', 'web.json')
    web = leer_json(pweb) if os.path.exists(pweb) else {}
    pcampos = os.path.join(AQUI, 'herramientas', 'campos.json')
    campos = leer_json(pcampos) if os.path.exists(pcampos) else {}
    kw = {}
    try:
        params = inspect.signature(mod.construir).parameters
    except (TypeError, ValueError):
        params = {}
    if 'hoy' in params and args.hoy:
        kw['hoy'] = args.hoy
    for nombre in ('aceptar_conflicto', 'aceptar', 'aceptar_conflictos'):
        if nombre in params and args.aceptar_conflicto:
            kw[nombre] = args.aceptar_conflicto
            break
    res = mod.construir(plan, hist, web, campos, **kw)
    datos, errores, avisos = res[0], res[1], res[2]
    for a in avisos or []:
        print('AVISO:', a)
    if errores:
        for e in errores:
            print('ERROR:', e)
        sys.exit('La construcción se para: %d errores de datos (M1).' % len(errores))
    return datos


def css_fuera_de_capa(css):
    """Devuelve el primer trozo de CSS que queda a profundidad 0 fuera de un @layer (debe ser '')."""
    t = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    t = re.sub(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'', '""', t)
    i, n, fuera = 0, len(t), []
    while i < n:
        m = re.compile(r'\s*@layer\s+[\w\s,-]+;').match(t, i)
        if m:
            i = m.end(); continue
        m = re.compile(r'\s*@layer\s+[\w-]+\s*\{').match(t, i)
        if m:
            prof, j = 1, m.end()
            while j < n and prof:
                prof += {'{': 1, '}': -1}.get(t[j], 0); j += 1
            i = j; continue
        if t[i:].strip():
            return t[i:].strip()
        break
    return ''


# M8: orden de las claves de primer y segundo nivel del bloque de datos. Ningún módulo recorre esas claves
# (se leen por nombre), y juntar lo que se repite (calendario, días derivados, días de web.json) ahorra
# unos 5 KB con gzip. Las claves que no están aquí van detrás, en su orden. Más abajo no se toca nada:
# el registro de Marcas pinta los campos de cada entrada en su orden.
ORDEN_DATOS = {
    '': ['historial', 'plan', 'web', 'version', 'derivados', 'fuente'],
    'plan': ['atleta', 'zonasFC', 'contextoDelUsuario', 'marcasActuales', 'ejercicios', 'diagnostico', 'sesionesTipo',
             'escenariosNota', 'objetivo', 'baremo', 'sensibilidad', 'protocoloDominadas', 'estructuraSemanal', 'planDeCarrera',
             'calendario', 'revision28sep', 'reglas', 'revision23sep', 'pendientes', 'ritmos', 'lesiones', 'resueltos29sep'],
    'historial': ['sueno', 'garmin', 'carrera', 'dominadas', 'circuito', 'necesidadSueno', 'evolucionEstimacion', 'composicion'],
    'web': ['hechosAntiguos', 'controlesExtra', '_nota', 'version', 'corpusSha256', 'resueltos', 'series', 'decide', 'avisos',
            '_pendientes', 'decisiones', '_resueltos', 'anula', 'textos', 'recortes', 'semaforo', 'videos', 'dias', 'condiciones',
            'pendientesEntrenador'],
    'derivados': ['bloques', 'datosHasta', 'dias', 'final', 'condiciones', 'hitos', 'controles', 'lastre', 'baremo', 'marcas',
                  'series', 'perfiles', 'recortados', 'conflictosK', 'noches', 'ventanaPrueba', 'cortesSueno'],
}


def _ordenar(obj, orden):
    if not isinstance(obj, dict):
        return obj
    claves = [k for k in orden if k in obj] + [k for k in obj if k not in orden]
    return {k: obj[k] for k in claves}


# M8: metadatos de validación de web.json que ningún módulo lee (las firmas y fuentes las comprueba
# validar_web.py sobre datos/web.json, no sobre el HTML). Se quitan del bloque embebido: 1,3 KB con gzip.
QUITAR_DE_WEB = {'firma', 'fuentes', 'firmaDe', 'corpusSha256'}


def _sin_metadatos(o):
    if isinstance(o, dict):
        return {k: _sin_metadatos(v) for k, v in o.items() if k not in QUITAR_DE_WEB and not k.startswith('_')}
    if isinstance(o, list):
        return [_sin_metadatos(x) for x in o]
    return o


def ordenar_datos(datos):
    if not MINIFICAR or not isinstance(datos, dict):
        return datos
    d = _ordenar(datos, ORDEN_DATOS[''])
    if isinstance(d.get('web'), dict):
        d['web'] = _sin_metadatos(d['web'])
    for k, orden in ORDEN_DATOS.items():
        if k and k in d:
            d[k] = _ordenar(d[k], orden)
    return d


def bloque_datos(datos):
    txt = json.dumps(ordenar_datos(datos), ensure_ascii=False, separators=(',', ':'))
    txt = txt.replace('</', '<\\/').replace('<!--', '\\u003c!--')
    return '<script id="datos" type="application/json">' + txt + '</script>'


# ---------------------------------------------------------------------------------------------- ensamblado
MINIFICAR = True
_MIN_INFO = []


def _minificador():
    sys.path.insert(0, os.path.join(AQUI, 'herramientas'))
    import minificar
    return minificar


def min_css(cuerpo, nombre):
    if not MINIFICAR:
        return cuerpo.strip()
    return _minificador().css(cuerpo)


def min_js(cuerpo, nombre):
    """Acorta nombres locales (Node + acorn interno) y quita comentarios y espacios. Si Node no está o el
    acortador no puede garantizar el mismo árbol, se queda solo con lo segundo y lo avisa."""
    if not MINIFICAR:
        return cuerpo.strip()
    m = _minificador()
    codigo = cuerpo
    node = shutil.which('node')
    if node:
        d = tempfile.mkdtemp(prefix='min_')
        try:
            a, b = os.path.join(d, 'a.js'), os.path.join(d, 'b.js')
            with open(a, 'w', encoding='utf-8') as f:
                f.write(cuerpo)
            r = subprocess.run([node, '--expose-internals', os.path.join(AQUI, 'herramientas', 'acortar_nombres.js'), a, b],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
            if r.returncode == 0:
                codigo = open(b, encoding='utf-8').read()
            else:
                _MIN_INFO.append('AVISO: %s sin acortar nombres: %s' % (nombre, r.stderr.decode('utf-8', 'replace').strip().split('\n')[0][:200]))
        finally:
            shutil.rmtree(d, ignore_errors=True)
    else:
        _MIN_INFO.append('AVISO: sin node: %s solo pierde comentarios y espacios' % nombre)
    try:
        return m.js(codigo).strip()
    except m.ErrorMin as e:
        _MIN_INFO.append('AVISO: %s sin minificar: %s' % (nombre, e))
        return cuerpo.strip()


def sha12(txt):
    return hashlib.sha256(txt.encode('utf-8')).hexdigest()[:12]


def ensamblar(datos):
    head = leer(os.path.join(SRC, '00_head.html'))
    shell = leer(os.path.join(SRC, '20_shell.html'))
    dcss = os.path.join(SRC, 'css')
    css_archivos = sorted(f for f in os.listdir(dcss) if f.endswith('.css')) if os.path.isdir(dcss) else []
    partes = ['@layer sistema, modulos, dieta;']
    for f in css_archivos:
        cuerpo = leer(os.path.join(dcss, f))
        sin_coment = re.sub(r'/\*.*?\*/', '', cuerpo, flags=re.S)
        if re.search(r'@import\b', sin_coment):
            sys.exit('ERROR: %s usa @import (no se permite: todo va en línea y dentro de su capa)' % f)
        if re.search(r'@layer\b', sin_coment):
            sys.exit('ERROR: %s declara @layer por su cuenta; build.py ya lo envuelve en «%s»' % (f, capa_de(f)))
        partes.append(('/* ===== %s ===== */\n' % f if not MINIFICAR else '') + '@layer %s{\n%s\n}' % (capa_de(f), min_css(cuerpo, f)))
    css = '\n'.join(partes)
    fuera = css_fuera_de_capa(css)
    if fuera:
        sys.exit('ERROR: CSS fuera de capa: %s' % fuera[:120])
    if '/*__CSS__*/' not in head:
        sys.exit('ERROR: src/00_head.html no tiene /*__CSS__*/')
    head = head.replace('/*__CSS__*/', css)

    for v in VISTAS:
        marca = '<!--__VISTA:%s-->' % v
        if marca not in shell:
            sys.exit('ERROR: src/20_shell.html no tiene %s' % marca)
        pv = os.path.join(SRC, 'views', v + '.html')
        shell = shell.replace(marca, leer(pv).strip() if os.path.exists(pv) else '')

    djs = os.path.join(SRC, 'js')
    js_archivos = sorted(f for f in os.listdir(djs) if f.endswith('.js')) if os.path.isdir(djs) else []
    scripts = []
    for f in js_archivos:
        cuerpo = leer(os.path.join(djs, f))
        if re.search(r'</script', cuerpo, re.I):
            sys.exit('ERROR: %s contiene «</script»; escríbelo como «<\\/script»' % f)
        salida = min_js(cuerpo, f)
        if re.search(r'</script', salida, re.I):
            sys.exit('ERROR: la salida minificada de %s contiene «</script»' % f)
        scripts.append('<script data-mod="%s" data-sha="%s">\n%s\n</script>' % (f, sha12(cuerpo), salida))
    shell = shell.replace('<!--__DATOS__-->', bloque_datos(datos))
    shell = shell.replace('<!--__JS__-->', '\n'.join(scripts))
    return head + shell, css_archivos, js_archivos


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--hoy', help='fecha de construcción para el constructor (AAAA-MM-DD)')
    ap.add_argument('--muestra', action='store_true', help='construir con datos/muestra.json')
    ap.add_argument('--aceptar-conflicto', action='append', default=[], metavar='K', help='deja un conflicto como aviso (p. ej. K5)')
    ap.add_argument('--salida', default=os.path.join(AQUI, 'out', 'index.html'))
    ap.add_argument('--hacer-muestra', action='store_true', help='regenera datos/muestra.json y sale')
    ap.add_argument('--catalogo', action='store_true', help='escribe también out/catalogo.html (componentes del sistema, solo para revisar)')
    ap.add_argument('--sin-minificar', action='store_true', help='ensambla los fuentes tal cual (para depurar)')
    args = ap.parse_args()
    global MINIFICAR
    MINIFICAR = not args.sin_minificar

    if args.hacer_muestra:
        hacer_muestra(args.hoy)
        return

    datos = None
    origen = 'muestra'
    if not args.muestra:
        datos = datos_de_m1(args)
        if datos is not None:
            origen = 'M1 (herramientas/construir_web.py)'
        else:
            print('AVISO: no hay constructor de M1; se construye con datos/muestra.json')
    if datos is None:
        pm = os.path.join(AQUI, 'datos', 'muestra.json')
        if not os.path.exists(pm):
            hacer_muestra(args.hoy)
        datos = leer_json(pm)

    html, css, js = ensamblar(datos)
    os.makedirs(os.path.dirname(os.path.abspath(args.salida)), exist_ok=True)
    with open(args.salida, 'w', encoding='utf-8') as f:
        f.write(html)
    crudo = len(html.encode('utf-8'))
    comp = len(gzip.compress(html.encode('utf-8'), 9))
    print('datos: %s · construido %s' % (origen, (datos.get('fuente') or {}).get('construido', '?')))
    print('css: %s' % ', '.join('%s→%s' % (c, capa_de(c)) for c in css))
    print('js: %s%s' % (', '.join(js), ' · minificado' if MINIFICAR else ' · sin minificar'))
    for x in _MIN_INFO:
        print(x)
    print('vistas: %s' % ', '.join('%s%s' % (v, '' if os.path.exists(os.path.join(SRC, 'views', v + '.html')) else ' (vacía)') for v in VISTAS))
    print('%s · %.1f KB sin comprimir · %.1f KB con gzip (límite 240 KB)%s' % (
        os.path.relpath(args.salida, AQUI), crudo / 1024, comp / 1024, '' if comp <= LIMITE_GZIP else '  ERROR: pasa del límite'))
    if args.catalogo:
        escribir_catalogo(datos)
    if comp > LIMITE_GZIP:
        sys.exit(3)


def escribir_catalogo(datos):
    """out/catalogo.html: head con el CSS en capas + sprite + qa/catalogo.html + hoja, modo pista y toast + núcleo."""
    html, _, _ = ensamblar(datos)
    cab = html[:html.index('<body>')]
    shell = leer(os.path.join(SRC, '20_shell.html'))
    sprite = shell[shell.index('<svg'):shell.index('</svg>') + len('</svg>')]
    capas = shell[shell.index('<div class="sheet-bg"'):shell.index('<!--__DATOS__-->')]
    frag = leer(os.path.join(AQUI, 'qa', 'catalogo.html'))
    nucleo = leer(os.path.join(SRC, 'js', '00_core.js'))
    cuerpo = ('<body>\n' + sprite + '\n<div class="sb-fondo" aria-hidden="true"></div>\n' + frag + '\n' + capas +
              bloque_datos(datos) + '\n<script>\n' + nucleo + '\n</script>\n')
    # el script del catálogo va después del núcleo
    i = cuerpo.index('<script>\n(function () {\n  var PC = window.PC;')
    j = cuerpo.index('</script>', i) + len('</script>')
    guion = cuerpo[i:j]
    cuerpo = cuerpo[:i] + cuerpo[j:] + guion + '\n</body>\n</html>\n'
    dest = os.path.join(AQUI, 'out', 'catalogo.html')
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(cab + cuerpo)
    print('out/catalogo.html escrito (solo para revisar el sistema)')


# ---------------------------------------------------------------------------------------------- muestra
"""Muestra para construir sin M1. Es una proyección de los JSON reales con la lista blanca
de mantenimiento/prototipo/campos.json (más plan.pendientes y plan.resueltos29sep) y unos
derivados mínimos con la forma del Anexo A. No sustituye al constructor de M1."""

MUESTRA_PUBLICO_EXTRA = ['plan.pendientes[].*', 'plan.resueltos29sep']


def _campos_prototipo():
    p = os.path.join(os.path.dirname(AQUI), 'mantenimiento', 'prototipo', 'campos.json')
    c = leer_json(p) if os.path.exists(p) else {'publico': [], 'interno': [], 'sensible': [], 'revisar': []}
    c['publico'] = list(c.get('publico', [])) + MUESTRA_PUBLICO_EXTRA
    c['interno'] = [x for x in c.get('interno', [])] + ['plan.atleta.nombre']
    c['sensible'] = [x for x in c.get('sensible', []) if x != 'plan.atleta.nombre']
    return c


def _proyectar(plan, hist):
    C = _campos_prototipo()

    def patron(p):
        return (p[:-2], True) if p.endswith('.*') else (p, False)
    R = {k: [patron(p) for p in C.get(k, [])] for k in ('publico', 'interno', 'sensible', 'revisar')}

    def clase(ruta):
        for k in ('sensible', 'revisar', 'interno', 'publico'):
            for base, com in R[k]:
                if ruta == base or (com and (ruta.startswith(base + '.') or ruta.startswith(base + '[]'))):
                    return k
        return None

    def proy(n, ruta, her):
        if isinstance(n, dict):
            o = {}
            for k, v in n.items():
                r = ruta + '.' + k
                c = clase(r)
                if c in ('sensible', 'revisar', 'interno'):
                    continue
                if c == 'publico' or her:
                    o[k] = proy(v, r, True)
                elif isinstance(v, (dict, list)):
                    s = proy(v, r, False)
                    if s not in ({}, []):
                        o[k] = s
            return o
        if isinstance(n, list):
            return [proy(x, ruta + '[]', her) for x in n]
        return n
    return proy(plan, 'plan', False), proy(hist, 'historial', False), C


MESES = {'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12}


def _cuando(txt, anio=2026):
    """«28 sep - 4 oct» · «5 - 18 oct» · «19-25 oct y día de la prueba» -> (desde, hasta)"""
    m = re.match(r'\s*(\d{1,2})\s*([a-z]{3})?\s*[-–]\s*(\d{1,2})\s*([a-z]{3})', txt or '')
    if not m:
        return None
    d1, m1, d2, m2 = int(m.group(1)), m.group(2), int(m.group(3)), m.group(4)
    mes2 = MESES[m2]
    mes1 = MESES[m1] if m1 else mes2
    return '%d-%02d-%02d' % (anio, mes1, d1), '%d-%02d-%02d' % (anio, mes2, d2)


def _seg(t):
    m = re.match(r'^(\d+):(\d{2})(?:[.,](\d+))?$', str(t).strip())
    return int(m.group(1)) * 60 + int(m.group(2)) + (float('0.' + m.group(3)) if m.group(3) else 0) if m else None


def _pts(baremo, prueba, v):
    if prueba == 'mil':
        for t in sorted(baremo['mil_metros'], key=lambda x: -x['puntos']):
            if t.get('hasta') and v <= _seg(t['hasta']) + 1e-9:
                return t['puntos']
        return 0
    if prueba == 'cir':
        for t in sorted(baremo['circuito_agilidad'], key=lambda x: -x['puntos']):
            s = t['seg']
            m = re.search(r'([\d,]+)\s*$', s.replace(' o menos', '').replace(' o más', ''))
            if 'o más' in s:
                continue
            tope = float(m.group(1).replace(',', '.'))
            if v <= tope + 1e-9:
                return t['puntos']
        return 0
    for t in baremo['dominadas']:
        r = t['reps']
        if 'o más' in r:
            if v >= int(r.split()[0]):
                return t['puntos']
            continue
        a, _, b = r.partition('-')
        if int(a) <= v <= int(b or a):
            return t['puntos']
    return 0


def hacer_muestra(hoy=None):
    plan = leer_json(os.path.join(RAIZ_PROYECTO, 'datos', 'plan.json'))
    hist = leer_json(os.path.join(RAIZ_PROYECTO, 'datos', 'historial.json'))
    P, H, C = _proyectar(plan, hist)
    construido = hoy or datetime.date.today().isoformat()

    # historial por fecha (para hist de cada día)
    arrays = ['carrera', 'dominadas', 'circuito', 'sueno', 'garmin', 'composicion', 'evolucionEstimacion']
    por_fecha = {}
    indice = []
    for a in arrays:
        for e in hist.get(a, []):
            f = e.get('fecha', '')
            if '/' in f:
                continue
            indice.append('%s:%s' % (a, f))
            if a in ('carrera', 'dominadas', 'circuito'):
                por_fecha.setdefault(f, []).append({
                    'src': '%s:%s' % (a, f), 'valida': e.get('valida', True) if 'valida' in e else None,
                    'hecho': e.get('hecho', True) if 'hecho' in e else True,
                    'resumen': e.get('sesion') or e.get('resumen') or a})
    # bloques
    bloques = []
    for r in plan.get('ritmos', []):
        if r.get('clave') in ('A', 'B', 'C'):
            c = _cuando(r.get('cuando', ''))
            if not c:
                continue
            desde, hasta = c
            if r['clave'] == 'C' and 'prueba' in (r.get('cuando') or ''):
                hasta = '2026-10-30'
            b = {'clave': r['clave'], 'desde': desde, 'hasta': hasta}
            for k in ('m200', 'm400', 'm600', 'objetivo1000', 'condicion', 'primer200'):
                if r.get(k):
                    b[k] = r[k]
            bloques.append(b)

    def bloque_de(f):
        for b in bloques:
            if b['desde'] <= f <= b['hasta']:
                return b['clave']
        return None
    gram = re.compile(r'(\d+) × (\d+) m(?:, rec\. ([^+·()]+))?')
    dias, hitos = [], []
    for i, s in enumerate(plan.get('calendario', [])):
        for j, d in enumerate(s.get('dias', [])):
            f = d['fecha']
            h = por_fecha.get(f, [])
            principal = None
            m = gram.search(d.get('sesion', ''))
            obj = re.match(r'^(\d:\d{2}(?:,\d)?)', d.get('objetivo', '') or '')
            if d.get('tipo') == 'carrera' and m and obj and ' si ' not in (d.get('objetivo') or '').split('·')[0]:
                rb = next((r for r in plan['ritmos'] if r.get('clave') == bloque_de(f)), {})
                principal = {'tipo': 'series', 'n': int(m.group(1)), 'dist': int(m.group(2)), 'rec': (m.group(3) or '').strip() or None,
                             'obj': obj.group(1), 'primer200': rb.get('m200'), 'origen': 'gramática (muestra)'}
            dias.append({'fecha': f, 'ref': [i, j], 'semana': s.get('semana'), 'bloque': bloque_de(f),
                         'hist': h, 'variantes': {}, 'principal': principal})
            if d.get('clave'):
                et = re.sub(r'^\d{1,2}:\d{2}\s+', '', d.get('sesion', ''))
                et = re.split(r'[:(+·]', et)[0].strip()
                et = et[:1].upper() + et[1:].lower() if et else d.get('tipo')
                hitos.append({'fecha': f, 'etiqueta': et, 'tipo': d.get('tipo')})
    ult = plan['calendario'][-1]
    versiones = []
    for k, v in enumerate(ult.get('versiones', [])):
        clave = '26-27' if k == 0 else '28-30'
        ds = []
        for e in v.get('dias', []):
            mm = re.match(r'^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom) (\d{1,2})$', e.get('dia', ''))
            fe = '2026-10-%02d' % int(mm.group(2)) if mm else None
            x = {'dia': e.get('dia'), 'fecha': fe, 'tipo': e.get('tipo'), 'sesion': e.get('sesion')}
            if e.get('clave'):
                x['clave'] = True
            ds.append(x)
        versiones.append({'clave': clave, 'nombre': v.get('nombre'), 'dias': ds})
    final = {'semana': ult.get('semana'), 'titulo': ult.get('titulo'), 'nota': ult.get('nota'), 'versiones': versiones}
    hitos.append({'fecha': '2026-10-26', 'hasta': '2026-10-30', 'etiqueta': 'Prueba · última semana de octubre', 'tipo': 'prueba'})
    # marcas
    B = plan['baremo']
    MA = plan['marcasActuales']
    mil_s = _seg(MA['mil_metros']['marca'])
    dom = int(re.match(r'\d+', MA['dominadas']['marca']).group(0))
    cir = float(MA['circuito']['marca'].split()[0].replace(',', '.'))
    p = [_pts(B, 'mil', mil_s), _pts(B, 'dom', dom), _pts(B, 'cir', cir)]
    suma = sum(p)
    marcas = {'mil': {'txt': MA['mil_metros']['marca'], 's': mil_s, 'pts': p[0], 'fiab': 'medido', 'banda': MA['mil_metros'].get('banda')},
              'dom': {'reps': dom, 'pts': p[1], 'fiab': 'autoinformado'},
              'cir': {'s': cir, 'pts': p[2], 'fiab': 'al 60 %'},
              'media': round(suma / 3, 2), 'resultado': 'ELIMINADO' if 0 in p else ('APTO' if suma >= 15 else 'NO APTO')}
    # noches
    noches = []
    for n in hist.get('sueno', []):
        if '/' in n['fecha']:
            continue
        mm = re.search(r'(\d+)h(\d+)', n.get('duracion', ''))
        mi = int(mm.group(1)) * 60 + int(mm.group(2)) if mm else None
        noches.append({'fecha': n['fecha'], 'min': mi, 'color': None if mi is None else ('verde' if mi >= 390 else 'ambar' if mi >= 300 else 'rojo'),
                       'puntuacion': n.get('puntuacion'), 'calidad': n.get('calidad'), 'fcReposo': n.get('fcReposo'), 'vfc': n.get('vfc'),
                       'vfc7dias': n.get('vfc7dias'), 'nota': n.get('nota')})
    noches.sort(key=lambda x: x['fecha'])
    # series y perfiles
    series = []
    for c in hist.get('carrera', []):
        r = c.get('resultado') or {}
        if isinstance(r, dict) and r.get('tiemposS'):
            obj = re.match(r'^(\d:\d{2}(?:,\d)?)', c.get('objetivo') or '')
            series.append({'fecha': c['fecha'], 'sesion': c.get('sesion'), 'valida': c.get('valida'), 'objetivo': obj.group(1) if obj else None,
                           'tiemposS': r['tiemposS'], 'parciales': r.get('parciales200') if isinstance(r.get('parciales200'), list) else None,
                           'fcMax': r.get('fcMaxPorSerie')})
    perfiles = []
    for c in hist.get('carrera', []):
        r = c.get('resultado') or {}
        p2 = r.get('parciales200') if isinstance(r, dict) else None
        if isinstance(p2, dict) and p2.get('tramosS'):
            perfiles.append({'fecha': c['fecha'], 'etiqueta': 'Control ' + '%d-%d' % (int(c['fecha'][8:]), int(c['fecha'][5:7])), 'tramosS': p2['tramosS']})
    fechas = [e.get('fecha', '') for a in arrays for e in hist.get(a, []) if '/' not in e.get('fecha', '')]
    resueltos = sorted(set(re.findall(r'\bK\d{1,2}\b', plan.get('resueltos29sep', ''))), key=lambda x: int(x[1:]))
    web = {'version': 2, '_nota': 'MUESTRA de M0 para construir sin M1. El web.json de verdad lo escribe M1.',
           'resueltos': resueltos, 'dias': {}, 'avisos': [], 'decide': [], 'decisiones': [], 'condiciones': {}, 'textos': {}, 'videos': {}}
    base = json.dumps([plan, hist, web], ensure_ascii=False, sort_keys=True).encode('utf-8')
    datos = {
        'version': 2,
        'fuente': {'hash': hashlib.sha256(base).hexdigest()[:16], 'construido': construido, 'indice': indice, 'muestra': True},
        'plan': P, 'historial': H, 'web': web,
        'derivados': {'datosHasta': max(fechas) if fechas else None, 'dias': dias, 'final': final, 'bloques': bloques,
                      'hitos': sorted(hitos, key=lambda x: x['fecha']), 'marcas': marcas, 'noches': noches,
                      'series': series, 'perfiles': perfiles, 'lastre': [], 'controles': []}
    }
    # centinelas: nada sensible en la muestra
    txt = json.dumps(datos, ensure_ascii=False)
    malos = [c for c in (C.get('centinelas', {}) or {}).get('extra', []) if c in txt]
    if 'fechaNacimiento' in txt:
        malos.append('fechaNacimiento')
    if malos:
        sys.exit('ERROR: la muestra contiene centinelas: %s' % ', '.join(malos))
    os.makedirs(os.path.join(AQUI, 'datos'), exist_ok=True)
    with open(os.path.join(AQUI, 'datos', 'muestra.json'), 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, indent=1)
    print('datos/muestra.json: %d días, %d hitos, %d noches, marcas %s · media %.2f %s' % (
        len(dias), len(hitos), len(noches), p, marcas['media'], marcas['resultado']))


if __name__ == '__main__':
    main()

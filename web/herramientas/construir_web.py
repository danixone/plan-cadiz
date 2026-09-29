#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""construir_web.py · M1 · datos de la web del plan (especificación §8 y §10.1).

Lee plan.json e historial.json (solo lectura), web.json y campos.json, aplica la lista
blanca, calcula los derivados y comprueba la coherencia. No escribe nada del proyecto.

Uso desde build.py:

    from construir_web import construir, serializar
    datos, errores, avisos = construir(plan, historial, web, campos)       # hoy = fecha local
    datos, errores, avisos = construir(plan, historial, web, campos, hoy='2026-09-29',
                                       aceptar=('K5',))

Uso en línea de órdenes (informe; sale con 1 si hay errores):

    python3 herramientas/construir_web.py [--hoy AAAA-MM-DD] [--aceptar-conflicto K5]
                                          [--salida datos.json] [--firmas]
                                          [--plan p.json --historial h.json --web w.json --campos c.json]

--firmas imprime la firma que debería llevar cada entrada de web.json (días, decisiones y
condiciones compartidas) para rehacerlas cuando cambie un día de plan.json.
"""
import argparse
import copy
import datetime as dt
import hashlib
import html as htmlmod
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
IMPL = os.path.dirname(AQUI)
RAIZ = os.environ.get('PLAN_RAIZ', os.path.dirname(IMPL))  # la carpeta que contiene web/

VERSION = 2
ARRAYS_HIST = ('carrera', 'dominadas', 'circuito', 'sueno', 'garmin', 'composicion', 'evolucionEstimacion')
DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
MESES = {'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'ago': 8,
         'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12}
SIGLAS = {'BOE', 'VFC', 'FC', 'FCR', 'ICOT', 'HRM', 'PDF', 'GPS', 'FIT', 'TCX'}


def rutas_defecto():
    """En esta fase plan e historial se leen del proyecto; web.json y campos.json de impl/.
    Si algún día los datos viven junto a este archivo (producción), se usan esos."""
    datos_local = os.path.join(IMPL, 'datos')
    def elegir(nombre):
        loc = os.path.join(datos_local, nombre)
        return loc if os.path.exists(loc) else os.path.join(RAIZ, 'datos', nombre)
    return {
        'plan': elegir('plan.json'),
        'historial': elegir('historial.json'),
        'web': os.path.join(datos_local, 'web.json'),
        'campos': os.path.join(AQUI, 'campos.json'),
        'corpus': os.path.join(datos_local, 'corpus_web_antigua.html'),
    }


def leer_json(ruta):
    with open(ruta, encoding='utf-8') as f:
        return json.load(f)


# ---------------------------------------------------------------------------- sellos y firmas
def canon(o):
    return json.dumps(o, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def firma(o):
    """12 primeros caracteres del sha1 del objeto con claves ordenadas, sin espacios y sin
    escapar los acentos (§8.4.4)."""
    return hashlib.sha1(canon(o).encode('utf-8')).hexdigest()[:12]


def firma_de_varios(objs):
    if len(objs) == 1:
        return firma(objs[0])
    return hashlib.sha1('\n'.join(canon(o) for o in objs).encode('utf-8')).hexdigest()[:12]


def sello(plan, historial, web):
    """sha256 (16 caracteres) de plan + historial + web en forma canónica: cualquier cambio
    de datos obliga a reconstruir, y el espaciado de los archivos no influye."""
    t = canon(plan) + '\n' + canon(historial) + '\n' + canon(web)
    return hashlib.sha256(t.encode('utf-8')).hexdigest()[:16]


def serializar(datos):
    """Texto del bloque <script id="datos" type="application/json">: sin espacios y con
    «</» escapado."""
    return json.dumps(datos, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def bloque_html(datos):
    return '<script id="datos" type="application/json">' + serializar(datos) + '</script>'


# ---------------------------------------------------------------------------- fechas y tiempos
def F(s):
    return dt.date.fromisoformat(s[:10])


def mas(s, n):
    return (F(s) + dt.timedelta(days=n)).isoformat()


def es_iso(s):
    return isinstance(s, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', s) is not None


def seg(txt):
    """'3:34' → 214 · '0:43,5' → 43.5 · '86,85' → 86.85 · '9,9 s' → 9.9 · None si no es un tiempo."""
    if txt is None:
        return None
    if isinstance(txt, (int, float)):
        return float(txt)
    t = str(txt).strip().replace(' s', '').strip()
    m = re.fullmatch(r'(\d+):(\d{2})(?:[,.](\d+))?', t)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2)) + (float('0.' + m.group(3)) if m.group(3) else 0.0)
    m = re.fullmatch(r'(\d+)(?:[,.](\d+))?', t)
    if m:
        return float(m.group(1) + ('.' + m.group(2) if m.group(2) else ''))
    return None


def minutos_sueno(txt):
    m = re.search(r'(\d+)h(\d{2})', str(txt or ''))
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


def txt_s(v):
    """Número con coma decimal y sin ceros sobrantes: 9.9 → '9,9'; 10.0 → '10'."""
    s = ('%.3f' % v).rstrip('0').rstrip('.')
    return s.replace('.', ',')


# ---------------------------------------------------------------------------- recorridos del plan
def semanas(plan):
    return plan.get('calendario') or []


def dias_con_fecha(plan):
    for si, sem in enumerate(semanas(plan)):
        for di, d in enumerate(sem.get('dias') or []):
            if isinstance(d, dict) and d.get('fecha'):
                yield si, di, sem, d


def semana_final(plan):
    for si, sem in enumerate(semanas(plan)):
        if sem.get('versiones'):
            return si, sem
    return None, None


def dia_plan(plan, clave):
    """Objeto de plan.calendario de un día: por fecha ('2026-10-10') o, en la semana final,
    por versión y rótulo ('v2:Sáb 24')."""
    m = re.fullmatch(r'v(\d+):(.+)', clave or '')
    if m:
        _, sem = semana_final(plan)
        if not sem:
            return None
        vs = sem['versiones']
        i = int(m.group(1)) - 1
        if not (0 <= i < len(vs)):
            return None
        for d in vs[i].get('dias') or []:
            if d.get('dia') == m.group(2):
                return d
        return None
    for _, _, _, d in dias_con_fecha(plan):
        if d.get('fecha') == clave:
            return d
    return None


def por_id(lista, clave, campo=('id', 'clave', 'fecha', 'dia', 'nombre')):
    for x in lista or []:
        if isinstance(x, dict) and any(x.get(c) == clave for c in campo):
            return x
    return None


def resolver(raices, ruta):
    """Resuelve una ruta de fuente del tipo 'plan.calendario[2026-10-10].objetivo',
    'plan.reglas[dia-torcido].texto', 'plan.ritmos[B].condicion', 'plan.protocoloDominadas.reglas[6]',
    'historial.carrera[2026-08-31]' o 'plan.calendario[v2:Sáb 24].sesion'. Devuelve None si no existe."""
    toks = re.findall(r'\[([^\]]*)\]|([^.\[\]]+)', ruta)
    if not toks:
        return None
    primero = toks[0][1]
    if primero not in raices:
        return None
    cur = raices[primero]
    previo = primero
    for clave, nombre in toks[1:]:
        if cur is None:
            return None
        if nombre:
            cur = cur.get(nombre) if isinstance(cur, dict) else None
            previo = nombre
            continue
        if previo == 'calendario' and primero == 'plan':
            cur = dia_plan(raices['plan'], clave)
        elif isinstance(cur, list):
            if re.fullmatch(r'\d+', clave):
                i = int(clave)
                cur = cur[i] if i < len(cur) else None
            else:
                cur = por_id(cur, clave)
        elif isinstance(cur, dict):
            cur = cur.get(clave)
        else:
            return None
        previo = clave
    return cur


def textos_de(o):
    """Todas las cadenas de un objeto (recursivo)."""
    out = []
    if isinstance(o, str):
        out.append(o)
    elif isinstance(o, list):
        for x in o:
            out.extend(textos_de(x))
    elif isinstance(o, dict):
        for x in o.values():
            out.extend(textos_de(x))
    return out


# ---------------------------------------------------------------------------- normalización de textos
def norm(s):
    s = htmlmod.unescape(str(s))
    s = s.replace(' ', ' ').replace(' ', ' ')
    return re.sub(r'\s+', ' ', s).strip().casefold()


def texto_de_html(h):
    """Dos lecturas del HTML congelado: etiquetas quitadas sin espacio (para frases con
    <b> dentro) y con espacio (para no pegar párrafos). Normalizadas."""
    sin = re.sub(r'<script[^>]*>|</script>', ' ', h)
    a = norm(re.sub(r'<[^>]+>', '', sin))
    b = norm(re.sub(r'<[^>]+>', ' ', sin))
    return a, b


def es_literal(txt, fuentes):
    """txt es subcadena (sin distinguir mayúsculas y con espacios normalizados) de alguna de
    las fuentes, o se compone de trozos literales unidos por « · »."""
    t = norm(txt).rstrip('.')
    if not t:
        return True
    fs = [norm(f) for f in fuentes if f]
    if any(t in f for f in fs):
        return True
    trozos = [x.strip().rstrip('.') for x in t.split(' · ')]
    return len(trozos) > 1 and all(any(x in f for f in fs) for x in trozos if x)


RE_CIFRA = re.compile(r'\d+(?:[,.:]\d+)*')


def cifras(texto):
    return RE_CIFRA.findall(texto or '')


# ---------------------------------------------------------------------------- lista blanca
NIVELES = ('sensible', 'revisar', 'interno', 'descartado', 'publico')


def reglas_campos(campos):
    R = {k: [] for k in NIVELES}
    usa = {}
    for k in ('sensible', 'revisar', 'interno'):
        for p in campos.get(k, []):
            R[k].append(_patron(p))
    for e in campos.get('publico', []):
        if isinstance(e, str):
            R['publico'].append(_patron(e))
            continue
        ruta, u = e.get('ruta'), e.get('usa')
        base = _patron(ruta)
        if ruta.startswith('plan.') and not u:
            R['descartado'].append(base)
        else:
            R['publico'].append(base)
        usa[ruta] = u or []
    return R, usa


def _patron(p):
    return (p[:-2], True) if p.endswith('.*') else (p, False)


def clase(R, ruta):
    for k in NIVELES:
        for base, comodin in R[k]:
            if ruta == base:
                return k
            if comodin and (ruta.startswith(base + '.') or ruta.startswith(base + '[]')):
                return k
    return None


def proyectar(R, nodo, ruta, heredado, informe):
    if isinstance(nodo, dict):
        out = {}
        for k, v in nodo.items():
            if k.startswith('_'):
                continue
            r = f'{ruta}.{k}'
            c = clase(R, r)
            if c in ('sensible', 'revisar', 'interno', 'descartado'):
                informe[c].add(r)
                continue
            if c == 'publico' or heredado:
                out[k] = proyectar(R, v, r, True, informe)
            elif isinstance(v, (dict, list)):
                sub = proyectar(R, v, r, False, informe)
                if not vacio(sub):
                    out[k] = sub
            else:
                informe['sin_clasificar'].add(r)
        return out
    if isinstance(nodo, list):
        return [proyectar(R, x, ruta + '[]', heredado, informe) for x in nodo]
    return nodo


def vacio(x):
    if x in ({}, []):
        return True
    if isinstance(x, list):
        return all(vacio(i) for i in x)
    if isinstance(x, dict):
        return all(vacio(i) for i in x.values()) if all(isinstance(i, (dict, list)) for i in x.values()) else False
    return False


def valores_de(nodo, ruta, R, niveles, out):
    """Cadenas (8 caracteres o más) de los campos de esos niveles: lo que no puede aparecer."""
    if isinstance(nodo, dict):
        for k, v in nodo.items():
            r = f'{ruta}.{k}'
            if clase(R, r) in niveles:
                for s in textos_de(v):
                    if len(s) >= 8:
                        out.add(s)
            else:
                valores_de(v, r, R, niveles, out)
    elif isinstance(nodo, list):
        for x in nodo:
            valores_de(x, ruta + '[]', R, niveles, out)


def vigilados(plan, historial, campos):
    """Textos que nunca pueden aparecer publicados: prefijo de 40 caracteres de cada valor
    sensible o retenido, más los centinelas."""
    R, _ = reglas_campos(campos)
    sec = set()
    valores_de(plan, 'plan', R, ('sensible', 'revisar'), sec)
    valores_de(historial, 'historial', R, ('sensible', 'revisar'), sec)
    trozos = {s[:40] for s in sec}
    trozos |= set((campos.get('centinelas') or {}).get('extra', []))
    local = os.path.join(AQUI, 'centinelas.local.json')
    if os.path.exists(local):
        trozos |= set(json.load(open(local, encoding='utf-8')).get('extra', []))
    return sorted(trozos)


# ---------------------------------------------------------------------------- gramáticas del plan
def titulo_derivado(sesion, tipo=None, dia=None):
    """Primer tramo de la sesión: sin la hora inicial, hasta «:», «(», «+», «·» o «. », con
    mayúscula solo al principio (las palabras en mayúsculas pasan a minúsculas, salvo siglas)."""
    if tipo == 'prueba':
        return 'Prueba'
    s = re.sub(r'^\s*\d{1,2}:\d{2}\s+', '', sesion or '')
    mp = re.search(r'(?<!\brec)\. ', s)          # «rec. 90 s» no corta el título
    cortes = [i for i in (s.find(':'), s.find('('), s.find('+'), s.find('·'), mp.start() if mp else -1) if i > 0]
    if cortes:
        s = s[:min(cortes)]
    s = s.strip(' .,;')
    pal = []
    for w in s.split(' '):
        base = re.sub(r'[^\wÁÉÍÓÚÑÜ]', '', w)
        if len(base) > 1 and base.isupper() and base not in SIGLAS:
            w = w.lower()
        pal.append(w)
    s = ' '.join(pal)
    return s[:1].upper() + s[1:] if s else (dia or '')


MARCAS_COLOR = (('verde', 'VERDE'), ('ambar', 'ÁMBAR'), ('rojo', 'ROJO'))


def extraer_variantes(obj):
    """Marcas VERDE, ÁMBAR o ROJO en mayúsculas, con o sin dos puntos. Cada tramo acaba en la
    marca siguiente o en el primer «. »; lo que queda tras el último va a «comun»; lo que va
    antes de la primera marca (sin «Semáforo:»), a «base»."""
    if not obj:
        return {}
    pos = []
    for k, w in MARCAS_COLOR:
        for m in re.finditer(r'(?<![\wÁÉÍÓÚ])' + w + r'(?![\wÁÉÍÓÚ]):?\s*', obj):
            pos.append((m.start(), m.end(), k))
    if not pos:
        return {}
    pos.sort()
    out = {}
    comun = ''
    for i, (a, b, k) in enumerate(pos):
        fin = pos[i + 1][0] if i + 1 < len(pos) else len(obj)
        tramo = obj[b:fin]
        j = tramo.find('. ')
        texto = tramo[:j] if j >= 0 else tramo
        if i + 1 == len(pos) and j >= 0:
            comun = tramo[j + 2:]
        texto = texto.strip().rstrip(';,').strip()
        if texto.endswith('.'):
            texto = texto[:-1]
        if k not in out and texto:
            out[k] = texto
    base = obj[:pos[0][0]]
    base = re.sub(r'(?i)sem[aá]foro(?: de la mañana)?\s*[.:]?\s*$', '', base).strip().rstrip('.').strip()
    if base:
        out['base'] = base
    comun = comun.strip().rstrip('.')
    if comun:
        out['comun'] = comun
    out['origen'] = 'extraídas del objetivo'
    return out


RE_SERIE = re.compile(r'(\d+) × (\d+) m(?:, rec\. ([^+·()]+))?')
RE_T0 = re.compile(r'^\s*(\d:\d{2}(?:,\d)?(?:-\d:\d{2}(?:,\d)?)?)')


def tiene_alternativa(obj):
    return bool(re.search(r'\d:\d{2}(?:,\d)?\s+si\b', obj or '') or re.search(r',\s*o\s+\d:\d{2}', obj or ''))


def primer200_bloque(ritmos, bloque):
    r = por_id(ritmos, bloque, ('clave',)) or {}
    txt = r.get('primer200') or ''
    m = re.search(r'(\d:\d{2}(?:,\d)?(?:-\d:\d{2}(?:,\d)?)?) en el (?:bloque )?' + re.escape(bloque or '#') + r'\b', txt)
    return m.group(1) if m else None


def principal_gramatica(dia, bloque, ritmos):
    """{tipo:'series', n, dist, rec, obj, primer200, freno, aviso} si la sesión casa con
    «N × D m, rec. R» y el objetivo empieza por un tiempo sin alternativa («si …»)."""
    ses, obj = dia.get('sesion') or '', dia.get('objetivo') or ''
    m = RE_SERIE.search(ses)
    if not m or tiene_alternativa(obj):
        return None
    n, dist = int(m.group(1)), int(m.group(2))
    rec = (m.group(3) or '').strip() or None
    t = RE_T0.match(obj)
    r = por_id(ritmos, bloque, ('clave',)) or {}
    o = t.group(1) if t else r.get('m%d' % dist)
    if not o:
        return None
    p = {'tipo': 'series', 'n': n, 'dist': dist, 'rec': rec, 'obj': o}
    mp = re.search(r'primer 200(?: del \d+)? en (\d:\d{2}(?:,\d)?)', obj)
    p['primer200'] = mp.group(1) if mp else primer200_bloque(ritmos, bloque)
    mf = re.search(r'freno si (?:un \d+ )?baja de (\d:\d{2}(?:,\d)?)', obj)
    if mf:
        p['freno'] = mf.group(1)
    ma = re.search(r'aviso(?: de ritmo)? (\d:\d{2}-\d:\d{2})', obj)
    if ma:
        p['aviso'] = ma.group(1)
    p['desde'] = m.group(0).strip()
    p['origen'] = 'gramática'
    return p


def numeros_derivados(dia, principal, plan):
    """Anexo A: series → [n × dist, obj, rec]; circuito → [intentos, hora]; rodaje →
    [duración, «techo 145»]; descanso y examen → ninguno. Fuerza, solo desde web.json."""
    tipo = dia.get('tipo')
    ses = dia.get('sesion') or ''
    if principal and principal.get('tipo') == 'series':
        out = [{'v': '%d × %d m' % (principal['n'], principal['dist']), 'l': 'series'},
               {'v': principal['obj'], 'l': 'objetivo'}]
        if principal.get('rec'):
            out.append({'v': principal['rec'], 'l': 'recuperación'})
        return out
    if tipo == 'circuito':
        out = []
        m = re.search(r'\b(\d+|UN) intentos?\b', ses)
        if m:
            out.append({'v': m.group(0), 'l': 'como el BOE'})
        h = re.match(r'\s*(\d{1,2}:\d{2})', ses) or re.match(r'\s*(\d{1,2}:\d{2})', dia.get('hora') or '')
        hora = h.group(1) if h else ((plan.get('sesionesTipo') or {}).get('juevesCircuito') or {}).get('hora')
        if hora:
            out.append({'v': hora, 'l': 'hora'})
        return out or None
    m = re.search(r'(?i)rodaje (\d+) min', ses)
    if tipo == 'carrera' and m:
        return [{'v': '%s min' % m.group(1), 'l': 'rodaje'}, {'v': 'techo 145', 'l': 'primeros 10 min a 140'}]
    return None


RE_REPARTO = re.compile(r'\d:\d{2}(?:,\d)?(?:\s*/\s*\d:\d{2}(?:,\d)?){3,}')
RE_HISTORICO = re.compile(r'(?i)\b(antes (?:el \w+ |la \w+ )?dec[ií]a|resuelto el|corregido el)\b')


def frases_vigentes(texto):
    """Quita las frases que cuentan lo que el plan decía antes («Resuelto el 29-9: antes el
    protocolo decía …»): no son la prescripción vigente."""
    partes = re.split(r'(?<=[.;])\s+', texto or '')
    return ' '.join(p for p in partes if not RE_HISTORICO.search(p))


def conflictos_dia(clave, dia):
    """Conflicto dentro de un mismo día (§3.4.6): dos campos con repartos de 4 pasos distintos."""
    campos = ('objetivo', 'protocolo', 'decide', 'semaforo', 'sesion', 'hora', 'siPrueba28a30', 'siPrueba26o27')
    vistos = []
    for c in campos:
        txt = frases_vigentes(dia.get(c) or '')
        for m in RE_REPARTO.finditer(txt):
            seq = tuple(x.strip() for x in m.group(0).split('/'))
            vistos.append((c, seq, m.group(0)))
    distintos = {}
    for c, seq, t in vistos:
        distintos.setdefault(seq, (c, t))
    if len(distintos) < 2:
        return []
    (s1, (c1, t1)), (s2, (c2, t2)) = list(distintos.items())[:2]
    return [{'id': 'K5' if clave == '2026-10-10' else 'R-' + clave,
             'a': {'campo': c1, 'texto': t1}, 'b': {'campo': c2, 'texto': t2}}]


def fechas_cuando(txt, anio):
    """'28 sep - 4 oct' · '5 - 18 oct' · '19-25 oct y día de la prueba' → [fechas ISO]."""
    toks = re.findall(r'(\d{1,2})\s*(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)?', txt or '')
    out, mes = [], None
    for i in range(len(toks) - 1, -1, -1):
        d, m = toks[i]
        if m:
            mes = MESES[m]
        if mes:
            out.append(dt.date(anio, mes, int(d)).isoformat())
    return sorted(out)


def ventana_prueba(plan):
    obj = (plan.get('objetivo') or {}).get('pruebasFisicas') or {}
    ref = obj.get('fechaReferencia')
    _, sem = semana_final(plan)
    nums = []
    if sem:
        for v in sem.get('versiones') or []:
            nums += [int(x) for x in re.findall(r'\b(\d{1,2})\b', v.get('nombre') or '')]
    if ref and nums:
        r = F(ref)
        return {'desde': dt.date(r.year, r.month, min(nums)).isoformat(),
                'hasta': dt.date(r.year, r.month, max(nums)).isoformat()}
    if ref:
        return {'desde': ref, 'hasta': ref}
    return None


def clave_version(nombre):
    nums = [int(x) for x in re.findall(r'\b(\d{1,2})\b', nombre or '')]
    return '%d-%d' % (min(nums), max(nums)) if nums else None


def fecha_de_rotulo(rotulo, lunes_semana):
    """'Mié 21' → la fecha de ese número de día con ese día de la semana, en el mes de la
    semana final o el anterior. 'Prueba', '−2 días' → None."""
    m = re.fullmatch(r'(Lun|Mar|Mié|Jue|Vie|Sáb|Dom) (\d{1,2})', rotulo or '')
    if not m:
        return None
    base = F(lunes_semana)
    for k in range(-21, 21):
        d = base + dt.timedelta(days=k)
        if d.day == int(m.group(2)) and DOW[d.weekday()] == m.group(1):
            return d.isoformat()
    return None


def baremo_num(plan):
    B = plan.get('baremo') or {}
    def rango(txt):
        t = str(txt).strip()
        m = re.fullmatch(r'([\d,]+)\s*o\s*menos', t)
        if m:
            return 0.0, float(m.group(1).replace(',', '.'))
        m = re.fullmatch(r'([\d,]+)\s*o\s*más', t)
        if m:
            return float(m.group(1).replace(',', '.')), None
        m = re.fullmatch(r'([\d,]+)\s*[-–]\s*([\d,]+)', t)
        if m:
            return float(m.group(1).replace(',', '.')), float(m.group(2).replace(',', '.'))
        m = re.fullmatch(r'([\d,]+)', t)
        if m:
            v = float(m.group(1).replace(',', '.'))
            return v, v
        return None
    out = {'mil': [], 'dom': [], 'cir': []}
    for t in B.get('mil_metros') or []:
        out['mil'].append({'pts': t['puntos'], 'min': seg(t.get('desde')) or 0.0,
                           'max': seg(t['hasta']) if t.get('hasta') else None, 'elimina': bool(t.get('elimina'))})
    for t in B.get('dominadas') or []:
        r = rango(t.get('reps'))
        if r:
            out['dom'].append({'pts': t['puntos'], 'min': r[0], 'max': r[1], 'elimina': bool(t.get('elimina'))})
    for t in B.get('circuito_agilidad') or []:
        r = rango(t.get('seg'))
        if r:
            out['cir'].append({'pts': t['puntos'], 'min': r[0], 'max': r[1], 'elimina': bool(t.get('elimina'))})
    for k in out:
        out[k].sort(key=lambda x: -x['pts'])
    return out


def pts(BN, prueba, v):
    """Tiempos: primer tramo cuyo límite superior ≥ valor, sin redondear. Dominadas: enteros."""
    if v is None:
        return None
    T = BN[prueba]
    if prueba == 'dom':
        v = int(v)
        for t in T:
            if v >= t['min'] and (t['max'] is None or v <= t['max']):
                return t['pts']
        return 0
    for t in T:
        if t['max'] is not None and v <= t['max'] + 1e-9:
            return t['pts']
    return 0


def corte(BN, prueba, necesarios):
    """Peor marca que todavía da esos puntos (marca de corte viva, G10)."""
    if necesarios > 10:
        return None
    p = max(1, int(-(-necesarios // 1)))
    for t in BN[prueba]:
        if t['pts'] == p:
            return t['min'] if prueba == 'dom' else t['max']
    return None


def resultado(ps):
    s = sum(ps)
    if any(p == 0 for p in ps):
        return round(s / 3, 2), 'ELIMINADO'
    return round(s / 3, 2), 'APTO' if s >= 15 else 'NO APTO'


# ---------------------------------------------------------------------------- conflictos del Anexo D
def _txt(x):
    return x if isinstance(x, str) else ' '.join(textos_de(x))


def _k1(P, H, W, C, D):
    rc = _txt((P.get('atleta') or {}).get('relojConfigurado'))
    ap = _txt((P.get('zonasFC') or {}).get('accionPendiente'))
    if re.search(r'(?i)no hace falta reconfigurar', rc) and re.search(r'(?i)\breconfigura', ap):
        return 'atleta.relojConfigurado dice que no hace falta reconfigurar y zonasFC.accionPendiente pide reconfigurar'


def _k2(P, H, W, C, D):
    fc = (P.get('atleta') or {}).get('fcMaxima')
    z = ((P.get('zonasFC') or {}).get('zonas') or [{}])[-1].get('max')
    met = ((P.get('zonasFC') or {}).get('metodo') or '').replace(' ', '')
    if fc and z and z != fc:
        return 'atleta.fcMaxima %s y la zona 5 acaba en %s' % (fc, z)
    if fc and ('≥%s' % fc) not in met:
        return 'zonasFC.metodo no dice «≥%s»' % fc


def _k3(P, H, W, C, D):
    regla = (((P.get('sesionesTipo') or {}).get('juevesCircuito') or {}).get('regla') or '')
    m = re.search(r'miércoles acaba antes de las (\d{1,2}:\d{2})', regla)
    if not m:
        return None
    for _, _, _, d in dias_con_fecha(P):
        if d.get('dia') != 'Mié':
            continue
        sig = dia_plan(P, mas(d['fecha'], 1)) or {}
        if sig.get('tipo') != 'circuito':
            continue
        h = re.search(r'acabar antes de las (\d{1,2}:\d{2})', d.get('hora') or '')
        if h and h.group(1) != m.group(1):
            return '%s: la hora dice «antes de las %s» y juevesCircuito.regla «antes de las %s»' % (d['fecha'], h.group(1), m.group(1))


def _k4(P, H, W, C, D):
    nota = (((P.get('sesionesTipo') or {}).get('sabadoComplemento') or {}).get('nota') or '')
    if re.search(r'(?i)sin dominadas los sábados', nota) and not re.search(r'(?i)salvo', nota):
        for _, _, _, d in dias_con_fecha(P):
            if d.get('dia') == 'Sáb' and re.search(r'(?i)\bbarra\b', d.get('sesion') or ''):
                return 'sabadoComplemento.nota dice «sin dominadas los sábados» y el %s lleva barra' % d['fecha']


def _k5(P, H, W, C, D):
    d = next((x for x in D.get('dias', []) if x['fecha'] == '2026-10-10'), None)
    if d and d.get('conflictos'):
        c = d['conflictos'][0]
        return '10-10: %s «%s» frente a %s «%s»' % (c['a']['campo'], c['a']['texto'], c['b']['campo'], c['b']['texto'])


def _k6(P, H, W, C, D):
    t = _txt((por_id(P.get('reglas'), 'no-testear') or {}).get('texto'))
    if re.search(r'10 y (?:el )?24 de octubre|y 24 de octubre', t) and not re.search(r'(?i)24 de octubre ya no', t):
        return 'reglas[no-testear] sigue contando el 24 de octubre como test'


def _k7(P, H, W, C, D):
    t = _txt((por_id(P.get('ejercicios'), 'simulacro') or {}).get('tecnica'))
    if re.search(r'(?i)jueves en el gimnasio', t) and not re.search(r'(?i)antes dec[ií]a', t):
        return 'ejercicios[simulacro] propone el simulacro «un jueves en el gimnasio»'


def _k8(P, H, W, C, D):
    a = _txt((P.get('atleta') or {}).get('pista'))
    c = _txt((P.get('contextoDelUsuario') or {}).get('pista'))
    if 'Arucas' in c and 'Arucas' not in a:
        return 'atleta.pista no es la de contextoDelUsuario.pista (Arucas)'


def _k9(P, H, W, C, D):
    t = _txt((por_id(P.get('ejercicios'), 'series-cortas') or {}).get('tecnica'))
    if re.search(r'(?i)nunca parado', t) and not re.search(r'(?i)antes dec[ií]a', t):
        return 'ejercicios[series-cortas] dice «nunca parado»'


def _k10(P, H, W, C, D):
    t = _txt((por_id(P.get('reglas'), 'dia-torcido') or {}).get('texto'))
    if not re.search(r'(?i)encima del cuello[^.]*(rojo|verde|ámbar)', t):
        return 'el semáforo no fija color para los síntomas por encima del cuello'


def _k11(P, H, W, C, D):
    if 'carga' in (W or {}) or 'CARGA' in canon(W or {}):
        return 'web.json trae cifras de carga que no están en historial.garmin'


def _k12(P, H, W, C, D):
    R, _ = reglas_campos(C)
    for r in ('historial.carrera[].relato', 'historial.dominadas[].relato', 'historial.sueno[].causa'):
        if clase(R, r) == 'publico':
            return '%s está clasificado como público' % r


def _k13(P, H, W, C, D):
    A = next((b for b in D.get('bloques', []) if b['clave'] == 'A'), None)
    r = por_id(P.get('ritmos'), 'A', ('clave',)) or {}
    if not A:
        return None
    marcas = [x for x in (r.get('m400'), r.get('m600')) if x]
    for _, _, _, d in dias_con_fecha(P):
        if d['fecha'] < A['desde'] and any(re.search(r'(?<![\d:])' + re.escape(x) + r'(?![\d,])', d.get('objetivo') or '') for x in marcas):
            return '%s usa ritmos del bloque A antes de que empiece (%s)' % (d['fecha'], A['desde'])


def _k14(P, H, W, C, D):
    for e in H.get('carrera') or []:
        if e.get('fecha', '') >= '2026-09-23' and e.get('valida') and re.search(r'(?i)rodaje', e.get('sesion') or ''):
            der = ((e.get('resultado') or {}).get('deriva')) or {}
            if not any('mitad' in k.lower() for k in der):
                return 'carrera %s: rodaje sin la deriva por mitades' % e['fecha']


def _k15(P, H, W, C, D):
    e = por_id(P.get('ejercicios'), 'umbral') or {}
    r = por_id(P.get('ritmos'), 'UMB', ('clave',)) or {}
    sin = lambda t: re.search(r'(?i)sin sesiones de umbral', t or '')
    hay = any(re.search(r'(?i)\bumbral\b', d.get('sesion') or '') for _, _, _, d in dias_con_fecha(P) if d['fecha'] >= '2026-09-21')
    if (e or r) and not hay and not (sin(e.get('nota')) and sin(r.get('aviso'))):
        return 'ejercicios[umbral] y ritmos[UMB] siguen sin decir que no hay sesiones de umbral'


def _k16(P, H, W, C, D):
    if not isinstance(P.get('pendientes'), list):
        return 'plan.json no tiene lista de pendientes'


def _k17(P, H, W, C, D):
    if 'recorrido' in canon((W or {}).get('textos') or {}):
        return 'web.json dibuja o describe el recorrido del circuito sin la fuente del BOE'


def _k18(P, H, W, C, D):
    d = dia_plan(P, '2026-10-12') or {}
    o = d.get('objetivo') or ''
    if re.search(r'(?i)mala noche', o) or (re.search(r'(?i)no cerró la recuperación', o) and not re.search(r'(?i)se sustituye', o)):
        return '12-10: «mala noche» o «el reloj no cerró la recuperación» sin definir'


K_REGLAS = [
    ('K1', 'Reloj: configurado o pendiente de reconfigurar', _k1),
    ('K2', 'FC máxima frente a la zona 5 y el método de las zonas', _k2),
    ('K3', 'Hora de fin del miércoles antes del circuito', _k3),
    ('K4', 'Barra de los sábados frente al complemento del sábado', _k4),
    ('K5', 'Reparto del simulacro del 10-10: objetivo frente a protocolo', _k5),
    ('K6', '«No testear de más» frente a la regla del test máximo', _k6),
    ('K7', 'Ficha del simulacro frente al circuito del jueves anterior', _k7),
    ('K8', 'Pista del atleta frente a la pista vigente', _k8),
    ('K9', 'Recuperación de las series cortas: andando o al trote', _k9),
    ('K10', 'Color del semáforo con síntomas por encima del cuello', _k10),
    ('K11', 'Cifras de carga sin fuente en el historial', _k11),
    ('K12', 'Relatos y causas: publicados o retenidos', _k12),
    ('K13', 'Inicio del bloque A', _k13),
    ('K14', 'Deriva por mitades guardada en el historial', _k14),
    ('K15', 'Umbral sin sesiones programadas', _k15),
    ('K16', 'Fuente de los pendientes', _k16),
    ('K17', 'Recorrido del circuito', _k17),
    ('K18', '12-10: condiciones sin definir', _k18),
]


def decisiones_29sep(plan):
    """{'K1': 'reloj ya configurado', …} a partir de plan.resueltos29sep («…: reloj ya configurado
    (K1), FC máx ≥203 (K2), … K11 (carga del 12-9 sin fuente) …»)."""
    t = plan.get('resueltos29sep') or ''
    cola = t.split(': ', 1)[1] if ': ' in t else t
    out = {}
    for m in re.finditer(r'(K\d{1,2}) \(([^)]+)\)', cola):
        out[m.group(1)] = m.group(2).strip()
    for m in re.finditer(r'(?:^|,\s*|\s+y\s+)([^,]+?) \((K\d{1,2})\)', cola):
        out.setdefault(m.group(2), m.group(1).strip())
    return out


# ---------------------------------------------------------------------------- construcción
def construir(plan, historial, web, campos, hoy=None, aceptar=None, **_):
    """→ (datos, errores, avisos). No modifica los objetos que recibe."""
    P, H, W = copy.deepcopy(plan), copy.deepcopy(historial), copy.deepcopy(web or {})
    errores, avisos = [], []
    hoy = hoy or dt.date.today().isoformat()
    aceptar = set(aceptar or ())
    informe = {'sensible': set(), 'revisar': set(), 'interno': set(), 'descartado': set(), 'sin_clasificar': set()}
    ritmos = P.get('ritmos') or []
    anio = F(((P.get('objetivo') or {}).get('pruebasFisicas') or {}).get('fechaReferencia') or hoy).year

    # 1 · normalizar el historial antes de filtrar (campos calculados, no copias)
    for n in H.get('sueno') or []:
        if '/' not in n.get('fecha', ''):
            n['min'] = minutos_sueno(n.get('duracion'))
            if n['min'] is None:
                errores.append('sueño %s: duración ilegible «%s»' % (n.get('fecha'), n.get('duracion')))
    for c in H.get('composicion') or []:
        b = c.get('bascula') or ''
        c['serie'] = 'dietista' if ('dietista' in b.lower() and 'no la del dietista' not in b.lower()) or 'Tanita' in b else 'otra'

    # 2 · lista blanca
    R, usa = reglas_campos(campos)
    pub_plan = proyectar(R, P, 'plan', False, informe)
    pub_hist = proyectar(R, H, 'historial', False, informe)
    for r in sorted(informe['sin_clasificar']):
        errores.append('campo sin clasificar en campos.json: %s (no se publica hasta decidir si es público o privado)' % r)

    # 3 · calendario: coherencia
    vistos = set()
    for si, di, sem, d in dias_con_fecha(P):
        a, b = (sem.get('semana') or '/').split('/')
        f = d['fecha']
        if not (a <= f <= b):
            errores.append('calendario: %s está fuera de su semana %s' % (f, sem.get('semana')))
        if d.get('dia') and d['dia'] != DOW[F(f).weekday()]:
            errores.append('calendario: %s dice «%s» y es %s' % (f, d['dia'], DOW[F(f).weekday()]))
        if f in vistos:
            errores.append('calendario: %s repetido' % f)
        vistos.add(f)

    # 4 · bloques de ritmo y ventana de la prueba
    ventana = ventana_prueba(P)
    bloques = []
    for r in ritmos:
        k = r.get('clave') or ''
        if not re.fullmatch(r'[A-Z]', k) or not r.get('cuando'):
            continue
        fs = fechas_cuando(r['cuando'], anio)
        if not fs:
            errores.append('ritmos[%s].cuando ilegible: «%s»' % (k, r['cuando']))
            continue
        hasta = fs[-1]
        if re.search(r'(?i)prueba', r['cuando']) and ventana:
            hasta = max(hasta, ventana['hasta'])
        b = {'clave': k, 'desde': fs[0], 'hasta': hasta}
        for c in ('m200', 'm400', 'm600', 'objetivo1000', 'condicion'):
            if r.get(c):
                b[c] = r[c]
        p2 = primer200_bloque(ritmos, k)
        if p2:
            b['primer200'] = p2
        bloques.append(b)
    bloques.sort(key=lambda x: x['desde'])
    for x, y in zip(bloques, bloques[1:]):
        if mas(x['hasta'], 1) != y['desde']:
            avisos.append('bloques: entre %s (hasta %s) y %s (desde %s) hay hueco o solape' % (x['clave'], x['hasta'], y['clave'], y['desde']))

    def bloque_de(f):
        for b in bloques:
            if b['desde'] <= f <= b['hasta']:
                return b['clave']
        return None

    # 5 · historial por fecha
    hist_por_fecha = {}
    for arr in ('carrera', 'dominadas', 'circuito'):
        for i, e in enumerate(H.get(arr) or []):
            res = e.get('resumen') or e.get('sesion')
            if not res and arr == 'dominadas':
                s = e.get('series')
                if isinstance(s, list) and s:
                    res = 'Dominadas %d × %d' % (len(s), s[0]) if len(set(s)) == 1 else 'Dominadas ' + '-'.join(str(x) for x in s)
                elif isinstance(s, str):
                    res = s
            hist_por_fecha.setdefault(e.get('fecha'), []).append({
                'src': '%s:%s' % (arr, e.get('fecha')), 'arr': arr, 'i': i,
                'valida': e.get('valida'), 'hecho': e.get('hecho', True), 'resumen': res or ''})

    # 6 · firmas de web.json (§8.4.4): si el día cambió en plan.json, se para
    wd = W.get('dias') or {}
    for clave, e in wd.items():
        if clave.startswith('_'):
            continue
        obj = dia_plan(P, clave)
        if obj is None:
            errores.append('web.dias[%s]: ese día no existe en plan.json' % clave)
            continue
        if e.get('firma') != firma(obj):
            errores.append('El %s cambió en plan.json: revisa web.dias (firma %s, ahora %s)' % (clave, e.get('firma'), firma(obj)))
    raices = {'plan': P, 'historial': H, 'web': W}
    for i, e in enumerate(W.get('decide') or []):
        objs = [resolver(raices, r) for r in (e.get('firmaDe') or ['plan.calendario[%s]' % e.get('fecha')])]
        if any(o is None for o in objs):
            errores.append('web.decide[%d] (%s): alguna fuente de firmaDe no existe en plan.json' % (i, e.get('fecha')))
        elif e.get('firma') != firma_de_varios(objs):
            errores.append('El %s cambió en plan.json: revisa web.decide[%d] (firma %s, ahora %s)' % (e.get('fecha'), i, e.get('firma'), firma_de_varios(objs)))
    for k, e in (W.get('condiciones') or {}).items():
        if k.startswith('_'):
            continue
        objs = [resolver(raices, r) for r in (e.get('firmaDe') or [])]
        if not objs or any(o is None for o in objs):
            errores.append('web.condiciones.%s: firmaDe vacío o con fuentes que no existen' % k)
        elif e.get('firma') != firma_de_varios(objs):
            errores.append('Cambió en plan.json lo que decide web.condiciones.%s: revísala (firma %s, ahora %s)' % (k, e.get('firma'), firma_de_varios(objs)))

    # 7 · días
    def condicion_de(clave):
        e = wd.get(clave) or {}
        c = e.get('condicion')
        if not c:
            return None
        c = copy.deepcopy(c)
        if c.get('compartida'):
            sh = copy.deepcopy((W.get('condiciones') or {}).get(c['compartida']) or {})
            for k in ('firma', 'firmaDe', 'fuente'):
                sh.pop(k, None)
            sh.update(c)
            c = sh
            c['tipo'] = 'compartida'
        elif c.get('calculo'):
            c['tipo'] = 'calculo'
        else:
            c['tipo'] = 'opciones'
        return c

    dias = []
    for si, di, sem, d in dias_con_fecha(P):
        f = d['fecha']
        e = wd.get(f) or {}
        blq = bloque_de(f)
        hist = hist_por_fecha.get(f, [])
        tipo = d.get('tipo')
        # estado según el historial (independiente de hoy) y estado a la fecha de construcción
        if hist:
            if any(x['hecho'] is False for x in hist):
                eh = 'miss'
            elif any(x['valida'] is False for x in hist):
                eh = 'nomide'
            else:
                eh = 'hecho'
        elif tipo in ('descanso', 'examen'):
            eh = 'rest'
        else:
            eh = 'noreg'
        if f == hoy:
            est = 'hoy'
        elif f > hoy:
            est = 'rest' if tipo == 'descanso' else 'futuro'
        else:
            est = eh
        variantes = e.get('variantes') or extraer_variantes(d.get('objetivo'))
        if e.get('variantes'):
            variantes = dict(variantes, origen='web.json')
        pr = e.get('principal')
        if pr:
            pr = dict(pr, origen='web.json')
        else:
            pr = principal_gramatica(d, blq, ritmos)
        nums = e.get('numeros') or numeros_derivados(d, pr, P)
        confl = conflictos_dia(f, d) + list(e.get('conflictos') or [])
        dias.append({
            'fecha': f, 'ref': [si, di], 'semana': sem.get('semana'), 'bloque': blq,
            'titulo': e.get('titulo') or titulo_derivado(d.get('sesion'), tipo, d.get('dia')),
            'estado': est, 'estadoHist': eh, 'hist': hist,
            'variantes': variantes, 'principal': pr, 'numeros': nums,
            'condicion': condicion_de(f), 'conflictos': confl,
            'hechoAntiguo': (W.get('hechosAntiguos') or {}).get(f),
            'web': f in wd,
        })

    # 8 · semana final en dos versiones
    si_f, semf = semana_final(P)
    final = None
    if semf:
        lunes = (semf.get('semana') or '/').split('/')[0]
        versiones = []
        for vi, v in enumerate(semf.get('versiones') or []):
            vd = []
            for di, x in enumerate(v.get('dias') or []):
                k = 'v%d:%s' % (vi + 1, x.get('dia'))
                e = wd.get(k) or {}
                ent = {'dia': x.get('dia'), 'fecha': fecha_de_rotulo(x.get('dia'), lunes), 'tipo': x.get('tipo'),
                       'sesion': x.get('sesion'), 'clave': bool(x.get('clave')), 'key': k, 'ref': [si_f, vi, di],
                       'titulo': e.get('titulo') or titulo_derivado(x.get('sesion'), x.get('tipo'), x.get('dia'))}
                c = condicion_de(k)
                if c:
                    ent['condicion'] = c
                if e.get('principal'):
                    ent['principal'] = dict(e['principal'], origen='web.json')
                vd.append(ent)
            versiones.append({'clave': clave_version(v.get('nombre')), 'nombre': v.get('nombre'), 'dias': vd})
        final = {'semana': semf.get('semana'), 'titulo': semf.get('titulo'), 'nota': semf.get('nota'),
                 'ventana': ventana, 'versiones': versiones}

    # 9 · hitos
    decide_f = {e.get('fecha') for e in W.get('decide') or []}
    por_f = {x['fecha']: x for x in dias}
    hitos = []
    for x in dias:
        dd = dia_plan(P, x['fecha'])
        if dd.get('clave') or x['fecha'] in decide_f:
            h = {'fecha': x['fecha'], 'etiqueta': x['titulo'], 'tipo': dd.get('tipo')}
            if dd.get('clave'):
                h['clave'] = True
            if x['fecha'] in decide_f:
                h['decide'] = True
            hitos.append(h)
    if ventana:
        pf = (P.get('objetivo') or {}).get('pruebasFisicas') or {}
        et = 'Prueba'
        if pf.get('lugar'):
            et += ' · ' + pf['lugar']
        if pf.get('fecha'):
            et += ' · ' + pf['fecha'][:1].lower() + pf['fecha'][1:]
        hitos.append({'fecha': ventana['desde'], 'hasta': ventana['hasta'], 'etiqueta': et, 'tipo': 'prueba', 'clave': True})
    for a in ((W.get('anula') or {}).get('hitos') or []):
        for h in list(hitos):
            if h['fecha'] == a.get('fecha'):
                if a.get('quitar'):
                    hitos.remove(h)
                elif a.get('etiqueta'):
                    h['etiqueta'] = a['etiqueta']
                h['anulado'] = a.get('motivo')
    hitos.sort(key=lambda h: h['fecha'])

    # 10 · escalera del lastre
    lastre = []
    for p in ((P.get('protocoloDominadas') or {}).get('progresion') or []):
        if es_iso(p.get('semana')):
            desde, hasta = p['semana'], mas(p['semana'], 6)
        elif ventana:
            desde, hasta = ventana['desde'], ventana['hasta']
        else:
            desde = hasta = None
        ses = [e for e in H.get('dominadas') or []
               if desde and desde <= e.get('fecha', '') <= hasta and (e.get('lastreKg') or e.get('lastradas'))]
        if ses:
            est = 'hecho'
        elif hasta and hasta < hoy:
            est = 'sin registro'
        elif desde and desde <= hoy <= hasta:
            est = 'esta semana'
        else:
            est = 'por venir'
        fila = {k: p[k] for k in ('semana', 'habituacion', 'fuerza', 'sabado', 'porQue') if p.get(k)}
        fila.update({'desde': desde, 'hasta': hasta, 'estado': est, 'hist': ['dominadas:' + e['fecha'] for e in ses]})
        if ses and ses[0].get('lastreKg'):
            fila['kg'] = ses[0]['lastreKg']
        lastre.append(fila)

    # 11 · controles
    controles = []
    for x in dias:
        dd = dia_plan(P, x['fecha'])
        if dd.get('tipo') != 'control':
            continue
        c = {'fecha': x['fecha'], 'titulo': x['titulo'], 'ref': x['ref']}
        if any(h['src'] == 'carrera:' + x['fecha'] for h in x['hist']):
            c['hist'] = 'carrera:' + x['fecha']
        if any(h['src'] == 'dominadas:' + x['fecha'] for h in x['hist']):
            c['histDom'] = 'dominadas:' + x['fecha']
        for campo in ('sesion', 'siPrueba28a30', 'objetivo', 'protocolo'):
            m = re.search(r'jueves (\d{1,2})\b', dd.get(campo) or '')
            if m:
                for k in range(1, 8):
                    g = mas(x['fecha'], -k)
                    if F(g).day == int(m.group(1)) and F(g).weekday() == 3:
                        c['circuitoDia'] = g
                        break
                break
        controles.append(c)
    for e in W.get('controlesExtra') or []:
        c = {k: e[k] for k in ('fecha', 'titulo', 'hist', 'queCambio') if e.get(k)}
        c['extra'] = True
        controles.append(c)
    if ventana:
        controles.append({'fecha': ventana['desde'], 'hasta': ventana['hasta'], 'titulo': 'Prueba', 'prueba': True})
    controles.sort(key=lambda c: c['fecha'])

    # 12 · noches (cortes del semáforo: 6h30 y 5h00, literales de reglas[dia-torcido])
    dt_txt = _txt((por_id(P.get('reglas'), 'dia-torcido') or {}).get('texto'))
    mv = re.search(r'VERDE \((\d+h\d{2}) o más', dt_txt)
    mr = re.search(r'ROJO \(menos de (\d+h\d{2})', dt_txt)
    c_verde = minutos_sueno(mv.group(1)) if mv else None
    c_rojo = minutos_sueno(mr.group(1)) if mr else None
    if c_verde is None or c_rojo is None:
        errores.append('reglas[dia-torcido]: no encuentro los cortes «VERDE (…h… o más» y «ROJO (menos de …h…»')
    noches = []
    for n in sorted((x for x in H.get('sueno') or [] if '/' not in x.get('fecha', '')), key=lambda x: x['fecha']):
        mn = n.get('min')
        col = None
        if mn is not None and c_verde is not None and c_rojo is not None:
            col = 'verde' if mn >= c_verde else ('ambar' if mn >= c_rojo else 'rojo')
        o = {'fecha': n['fecha'], 'src': 'sueno:' + n['fecha'], 'duracion': n.get('duracion'), 'min': mn, 'color': col}
        for k in ('puntuacion', 'calidad', 'fcReposo', 'vfc', 'vfc7dias', 'nota'):
            if n.get(k) is not None:
                o[k] = n[k]
        noches.append(o)

    # 13 · baremo, marcas y escenarios (§8.6.7)
    BN = baremo_num(P)
    B = P.get('baremo') or {}
    if not any(t.get('elimina') and t.get('desde') == '3:49' for t in B.get('mil_metros') or []):
        errores.append('baremo: falta el tramo que elimina en 3:49 (tiene que verse en toda gráfica del 1.000)')
    MA = P.get('marcasActuales') or {}
    mil, dom, cir = MA.get('mil_metros') or {}, MA.get('dominadas') or {}, MA.get('circuito') or {}
    s_mil = seg(mil.get('marca'))
    m_dom = re.match(r'\s*(\d+)', str(dom.get('marca') or ''))
    r_dom = int(m_dom.group(1)) if m_dom else None
    s_cir = seg(re.sub(r'\s*s$', '', str(cir.get('marca') or '')))
    pm, pd, pc = pts(BN, 'mil', s_mil), pts(BN, 'dom', r_dom), pts(BN, 'cir', s_cir)
    for nombre, calc, esc in (('mil_metros', pm, mil.get('puntos')), ('dominadas', pd, dom.get('puntos')), ('circuito', pc, cir.get('puntos'))):
        if calc != esc:
            errores.append('marcasActuales.%s: el baremo da %s puntos y el plan escribe %s' % (nombre, calc, esc))
    media, res = resultado([pm or 0, pd or 0, pc or 0])
    ev = next((e for e in H.get('evolucionEstimacion') or [] if e.get('fecha') == mil.get('medidoEl')), {})
    m_fd = re.search(r'el (\d{1,2})-(\d{1,2})-(\d{4})', str(dom.get('marca') or ''))
    marcas = {
        'mil': {'txt': mil.get('marca'), 's': s_mil, 'pts': pm, 'fecha': mil.get('medidoEl'),
                'fiab': 'medido' if ev.get('medido') else 'estimado', 'banda': mil.get('banda')},
        'dom': {'reps': r_dom, 'pts': pd,
                'fecha': dt.date(int(m_fd.group(3)), int(m_fd.group(2)), int(m_fd.group(1))).isoformat() if m_fd else None,
                'fiab': 'autoinformado' if 'autoinformado' in str(dom.get('marca')) else 'medido'},
        'cir': {'s': s_cir, 'pts': pc, 'fecha': cir.get('fecha'),
                'fiab': (str(cir.get('condiciones') or '').split(',')[0].strip() or 'medido')},
        'media': media, 'resultado': res,
    }
    for e in P.get('escenariosNota') or []:
        p = (pts(BN, 'mil', seg(e.get('mil'))), pts(BN, 'dom', e.get('dominadas')), pts(BN, 'cir', e.get('circuito')))
        esc = (e.get('milPuntos'), e.get('dominadasPuntos'), e.get('circuitoPuntos'))
        mm, rr = resultado(list(p))
        if p != esc:
            errores.append('escenario «%s»: puntos escritos %s, el baremo da %s' % (e.get('nombre'), esc, p))
        if abs(mm - (e.get('media') or 0)) > 0.005:
            errores.append('escenario «%s»: media escrita %s, calculada %s' % (e.get('nombre'), e.get('media'), mm))
        if e.get('resultado') and e['resultado'] != rr:
            errores.append('escenario «%s»: resultado escrito %s, calculado %s' % (e.get('nombre'), e['resultado'], rr))
    real = next((e for e in P.get('escenariosNota') or [] if e.get('vigente')), None)
    S = P.get('sensibilidad') or {}
    if real:
        p_mil, p_dom, p_cir = pts(BN, 'mil', seg(real['mil'])), pts(BN, 'dom', real['dominadas']), pts(BN, 'cir', real['circuito'])
        c_cir = corte(BN, 'cir', 15 - p_mil - p_dom)
        for fila in S.get('circuito') or []:
            p = pts(BN, 'cir', fila.get('seg'))
            mm, rr = resultado([p_mil, p_dom, p])
            if p != fila.get('puntos') or abs(mm - fila.get('media', -1)) > 0.005 or (rr == 'APTO') != bool(fila.get('apto')):
                errores.append('sensibilidad.circuito %s: el baremo da %s puntos y %s de media' % (fila.get('seg'), p, mm))
            if c_cir is not None and (fila.get('seg') <= c_cir + 1e-9) != bool(fila.get('apto')):
                errores.append('la marca de corte viva del circuito (%s s) no reproduce sensibilidad en %s s' % (txt_s(c_cir), fila.get('seg')))
        for fila in S.get('dominadas') or []:
            p = pts(BN, 'dom', fila.get('reps'))
            mm, rr = resultado([p_mil, p, p_cir])
            if p != fila.get('puntos') or abs(mm - fila.get('media', -1)) > 0.005 or (rr == 'APTO') != bool(fila.get('apto')):
                errores.append('sensibilidad.dominadas %s: el baremo da %s puntos y %s de media' % (fila.get('reps'), p, mm))
        marcas['corteRealista'] = {'cir': c_cir, 'escenario': real.get('nombre')}

    # 14 · series y perfiles
    series, perfiles = [], []
    for e in H.get('carrera') or []:
        r = e.get('resultado') or {}
        ts = None
        if isinstance(r.get('tiemposS'), list):
            ts = [float(x) for x in r['tiemposS']]
        elif isinstance(r.get('tiempos'), list):
            ts = [seg(x) for x in r['tiempos']]
        par = r.get('parciales200')
        pares = par if isinstance(par, list) and par and all(isinstance(x, list) for x in par) else None
        if ts or pares:
            obj = e.get('objetivo') or ''
            t0 = RE_T0.match(obj)
            o = None
            if t0 and not tiene_alternativa(obj) and not re.match(r'\s*[\d:,]+(?:[–-][\d:,]+)?\s*/', obj):
                o = t0.group(1)
            ow = ((W.get('series') or {}).get(e['fecha']) or {}).get('objetivo')
            m = re.search(r'(\d+) × ([\d.]+) m', e.get('sesion') or '')
            series.append({'fecha': e['fecha'], 'src': 'carrera:' + e['fecha'], 'sesion': e.get('sesion'), 'valida': e.get('valida'),
                           'n': int(m.group(1)) if m else (len(ts) if ts else None),
                           'dist': int(m.group(2).replace('.', '')) if m else None,
                           'objetivo': ow or o, 'tiemposS': ts, 'parciales': pares,
                           'fcMax': r.get('fcMaxPorSerie') if isinstance(r.get('fcMaxPorSerie'), list) else None})
        tramos = None
        if isinstance(par, dict) and isinstance(par.get('tramosS'), list):
            tramos = [float(x) for x in par['tramosS']]
        elif isinstance(par, list) and par and all(isinstance(x, str) for x in par):
            tramos = [seg(x) for x in par]
        if tramos:
            d, mth = F(e['fecha']).day, F(e['fecha']).month
            perfiles.append({'fecha': e['fecha'], 'src': 'carrera:' + e['fecha'],
                             'etiqueta': '%s · %d-%d' % (titulo_derivado(e.get('sesion')), d, mth), 'tramosS': tramos})
    series.sort(key=lambda s: s['fecha'], reverse=True)
    perfiles.sort(key=lambda s: s['fecha'], reverse=True)

    # 15 · fechas de los datos y noches sin CSV
    todas = [str(e.get('fecha', ''))[:10] for a in ARRAYS_HIST for e in (H.get(a) or []) if e.get('fecha')]
    datos_hasta = max(todas) if todas else None
    medidas = sorted(n['fecha'] for n in noches)
    faltan = []
    if medidas:
        d0 = F(medidas[0])
        while d0.isoformat() < hoy:
            if d0.isoformat() not in medidas:
                faltan.append(d0.isoformat())
            d0 += dt.timedelta(days=1)

    # 16 · condiciones compartidas y de la última semana
    condiciones = {}
    for k, c in (W.get('condiciones') or {}).items():
        if k.startswith('_'):
            continue
        cc = {x: y for x, y in c.items() if x not in ('firma', 'firmaDe')}
        cc['dias'] = sorted(kk for kk, e in wd.items() if (e.get('condicion') or {}).get('compartida') == k)
        condiciones[k] = cc
    if final:
        condiciones['prueba'] = {'pregunta': '¿Cuándo es la prueba?', 'guardar': 'pc-prueba',
                                 'desde': '2026-10-21' if dia_plan(P, '2026-10-21') else (ventana or {}).get('desde'),
                                 'hasta': (ventana or {}).get('hasta'),
                                 'opciones': [{'id': v['clave'], 'nombre': v['nombre']} for v in final['versiones']]}

    # 17 · recortes aplicados (la web enseña el texto recortado, el plan no se toca)
    recortados = {}
    for rc in W.get('recortes') or []:
        f = rc.get('fuente') or ''
        if not f.startswith(('plan.', 'historial.')):
            continue
        t = resolver(raices, f)
        if not isinstance(t, str):
            errores.append('web.recortes: «%s» no es un texto de plan.json' % f)
            continue
        base = recortados.get(f, t)
        if rc.get('quitado') and rc['quitado'] in base:
            recortados[f] = re.sub(r'\s{2,}', ' ', base.replace(rc['quitado'], '')).strip()
        else:
            errores.append('web.recortes: «%s» ya no contiene la frase que se quita' % f)

    # 18 · conflictos del Anexo D
    D = {'dias': dias, 'bloques': bloques}
    dec = decisiones_29sep(P)
    resueltos = set(W.get('resueltos') or []) | set(re.findall(r'\bK\d{1,2}\b', P.get('resueltos29sep') or ''))
    conflictosK = []
    for kid, texto, fn in K_REGLAS:
        try:
            det = fn(P, H, W, campos, D)
        except Exception as ex:  # una regla rota no tumba la construcción
            det = None
            avisos.append('%s: la regla de detección falló (%s)' % (kid, ex))
        conflictosK.append({'id': kid, 'texto': texto, 'detectado': bool(det), 'detalle': det,
                            'resuelto': kid in resueltos, 'decision': dec.get(kid)})
        if det and kid not in resueltos:
            avisos.append('%s sin resolver: %s' % (kid, det))
        elif det:
            avisos.append('%s figura como resuelto pero la regla lo sigue detectando: %s' % (kid, det))
    k5 = next(k for k in conflictosK if k['id'] == 'K5')
    if k5['detectado'] and hoy >= '2026-10-03':
        msg = 'El reparto del 10-10 sigue sin decidir (K5): pregúntalo antes del sábado'
        (avisos if 'K5' in aceptar else errores).append(msg + (' [aceptado con --aceptar-conflicto K5]' if 'K5' in aceptar else ''))

    # 19 · avisos de mantenimiento
    for a in W.get('avisos') or []:
        if a.get('hasta') and a['hasta'] < hoy:
            avisos.append('aviso caducado (hasta %s): %s' % (a['hasta'], a.get('id')))
    for x in dias:
        dd = dia_plan(P, x['fecha'])
        ses = dd.get('sesion') or ''
        if x['fecha'] >= hoy and dd.get('tipo') == 'carrera' and x['principal'] is None and \
                (re.search(r'\d+ × \d+ m\b', ses) or re.search(r'(?i)kilómetro partido', ses) or re.search(r'\d{3} m \+ \d{3} m', ses)):
            avisos.append('%s: día con series sin principal derivable ni entrada en web.dias' % x['fecha'])
        if x['fecha'] >= hoy and not x['condicion']:
            for c in ('sesion', 'objetivo'):
                for m in re.finditer(r'(?<![\wáéíóú])[Ss]i (?!no\b)[^.;·]{3,60}', dd.get(c) or ''):
                    avisos.append('%s: «%s» sin condición (revisar si cambia qué se hace)' % (x['fecha'], m.group(0).strip()))
        if x['fecha'] < hoy and dd.get('tipo') not in ('descanso', 'examen') and not x['hist']:
            avisos.append('día pasado con sesión y sin registro en historial: %s %s «%s»' % (x['fecha'], dd.get('tipo'), ses[:50]))
    for e in H.get('carrera') or []:
        if e.get('fecha', '') >= '2026-09-23' and e.get('valida') and re.search(r'(?i)rodaje', e.get('sesion') or ''):
            der = ((e.get('resultado') or {}).get('deriva')) or {}
            if not any('mitad' in k.lower() for k in der):
                avisos.append('carrera %s: rodaje sin la deriva por mitades' % e['fecha'])
    for arr in ARRAYS_HIST:
        fs = [e.get('fecha', '') for e in H.get(arr) or [] if '/' not in e.get('fecha', '')]
        if fs != sorted(fs, reverse=True):
            avisos.append('historial.%s no está en orden de fecha descendente' % arr)
    if faltan:
        avisos.append('sueño: %d noches medidas y %d sin CSV desde la primera (%s)' % (len(medidas), len(faltan), ', '.join(x[5:] for x in faltan)))
    if informe['descartado']:
        avisos.append('campos públicos que ningún módulo usa (no se incluyen): ' + ', '.join(sorted(informe['descartado'])))

    # 20 · ensamblado
    indice = sorted('%s:%s' % (a, e['fecha']) for a in ARRAYS_HIST for e in (H.get(a) or []) if e.get('fecha'))
    derivados = {
        'datosHasta': datos_hasta, 'dias': dias, 'final': final, 'bloques': bloques, 'hitos': hitos,
        'lastre': lastre, 'controles': controles, 'noches': noches, 'marcas': marcas, 'series': series,
        'perfiles': perfiles, 'baremo': BN, 'condiciones': condiciones, 'recortados': recortados,
        'conflictosK': conflictosK, 'ventanaPrueba': ventana,
        'cortesSueno': {'verde': c_verde, 'rojo': c_rojo},
    }
    datos = {
        'version': VERSION,
        'fuente': {'hash': sello(plan, historial, web or {}), 'construido': hoy, 'indice': indice},
        'plan': pub_plan, 'historial': pub_hist, 'web': W, 'derivados': derivados,
    }

    # 21 · privacidad del bloque (el validador lo repite sobre el HTML entero)
    txt = serializar(datos)
    fugas = [t for t in vigilados(plan, historial, campos) if t and t in txt]
    for t in fugas:
        errores.append('privacidad: el bloque de datos contiene «%s»' % t)

    construir.informe = {k: sorted(v) for k, v in informe.items()}
    construir.informe['faltanNoches'] = faltan
    construir.informe['conflictosK'] = conflictosK
    construir.informe['kb'] = len(txt.encode('utf-8')) / 1024
    return datos, errores, avisos


construir.informe = {}


def firmas_esperadas(plan, web):
    """Firma que debería llevar cada entrada de web.json (para rehacerlas tras cambiar el plan)."""
    raices = {'plan': plan, 'historial': {}, 'web': web}
    out = {'dias': {}, 'decide': [], 'condiciones': {}}
    for k in (web.get('dias') or {}):
        if k.startswith('_'):
            continue
        o = dia_plan(plan, k)
        out['dias'][k] = firma(o) if o is not None else None
    for e in web.get('decide') or []:
        objs = [resolver(raices, r) for r in (e.get('firmaDe') or ['plan.calendario[%s]' % e.get('fecha')])]
        out['decide'].append(None if any(o is None for o in objs) else firma_de_varios(objs))
    for k, e in (web.get('condiciones') or {}).items():
        if k.startswith('_'):
            continue
        objs = [resolver(raices, r) for r in (e.get('firmaDe') or [])]
        out['condiciones'][k] = None if (not objs or any(o is None for o in objs)) else firma_de_varios(objs)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description='Construye el bloque de datos de la web y comprueba su coherencia.')
    rd = rutas_defecto()
    ap.add_argument('--hoy', default=dt.date.today().isoformat(), help='fecha de construcción (AAAA-MM-DD)')
    ap.add_argument('--aceptar-conflicto', action='append', default=[], metavar='K5')
    ap.add_argument('--salida', help='escribe el bloque de datos (JSON) en esta ruta')
    ap.add_argument('--firmas', action='store_true', help='imprime las firmas esperadas de web.json y sale')
    for k in ('plan', 'historial', 'web', 'campos'):
        ap.add_argument('--' + k, default=rd[k])
    a = ap.parse_args(argv)
    plan, hist, web, campos = (leer_json(getattr(a, k)) for k in ('plan', 'historial', 'web', 'campos'))
    if a.firmas:
        print(json.dumps(firmas_esperadas(plan, web), ensure_ascii=False, indent=1))
        return 0
    datos, errores, avisos = construir(plan, hist, web, campos, hoy=a.hoy, aceptar=a.aceptar_conflicto)
    inf = construir.informe
    if a.salida:
        with open(a.salida, 'w', encoding='utf-8') as f:
            f.write(serializar(datos))
    print('bloque de datos: %.1f KB · sello %s · construido %s · datos hasta %s' % (
        inf['kb'], datos['fuente']['hash'], datos['fuente']['construido'], datos['derivados']['datosHasta']))
    print('no publicados · sensibles: %s' % ', '.join(inf['sensible']))
    print('no publicados · internos: %s' % ', '.join(inf['interno']))
    print('retenidos hasta que Daniel decida: %s' % ', '.join(inf['revisar']))
    print('descartados (públicos sin consumidor): %s' % ', '.join(inf['descartado']))
    print('noches sin CSV: %s' % (', '.join(x[5:] for x in inf['faltanNoches']) or 'ninguna'))
    print('\nCONFLICTOS DEL ANEXO D (K1-K18)')
    for k in inf['conflictosK']:
        est = ('DETECTADO · ' if k['detectado'] else 'no detectado · ') + ('resuelto' if k['resuelto'] else 'SIN RESOLVER')
        print('  %-4s %-58s %s%s' % (k['id'], k['texto'], est, (' · ' + k['decision']) if k['decision'] else ''))
        if k['detalle']:
            print('       ' + k['detalle'])
    print('\nERRORES (%d)' % len(errores))
    for x in errores:
        print('  x ' + x)
    print('\nAVISOS (%d)' % len(avisos))
    for x in avisos:
        print('  - ' + x)
    return 1 if errores else 0


if __name__ == '__main__':
    sys.exit(main())

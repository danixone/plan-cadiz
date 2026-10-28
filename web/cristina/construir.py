#!/usr/bin/env python3
"""Construye docs/cristina/index.html: la web de Cristina con el MISMO armazón que la de Daniel.

Desde el 12-10-2026 la página de Cristina es la misma aplicación que la de Daniel: las cuatro pestañas
(Hoy, Plan, Marcas, Técnica), la barra de abajo, la hoja, el modo pista, el tema y el sistema de diseño.
Se comparte, sin copiarlo:
  · web/src/00_head.html (cabecera), web/src/20_shell.html (armazón), web/src/css/*.css (todos los estilos),
    web/src/js/00_core.js (núcleo PC) y web/src/js/99_arranque.js;
  · web/build.py (capas de CSS y minificado).
Es propio de Cristina:
  · web/cristina/src/views/*.html (el contenido fijo de cada pestaña),
  · web/cristina/src/js/*.js (10_cristina.js ajusta el núcleo; 60_consejo.js pinta «Cómo llegas hoy» en Hoy,
    detrás de los módulos de Daniel y delante del arranque),
  · web/cristina/src/css/*.css (solo lo que su web necesita y la de Daniel no tiene; capa «cristina»).

Los datos salen de datos/cristina/plan.json e historial.json (públicos). Lo personal vive en
datos/cristina/privado.json (en .gitignore): la construcción se para si alguno de sus valores
vigilados aparece en la página.

Uso:
  python3 web/cristina/construir.py                       escribe docs/cristina/index.html
  python3 web/cristina/construir.py --salida x.html       escribe en otro sitio (pruebas)
  python3 web/cristina/construir.py --hoy 2026-10-12      fecha de construcción (si no, la del día)
  python3 web/cristina/construir.py --modulos hoy,plan    solo esos módulos de pestaña (pruebas)
  python3 web/cristina/construir.py --sin-minificar       fuentes tal cual (depurar)
  python3 web/cristina/construir.py --datos x.json        vuelca el bloque de datos (para revisar)
"""
import argparse
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))            # web/cristina
WEB = os.path.dirname(AQUI)                                    # web
RAIZ = os.environ.get('PLAN_RAIZ', os.path.dirname(WEB))       # raíz del proyecto
DATOS = os.path.join(RAIZ, 'datos', 'cristina')
SRC_D = os.path.join(WEB, 'src')                               # fuentes de Daniel (compartidas)
SRC_C = os.path.join(AQUI, 'src')                              # fuentes de Cristina
SALIDA = os.path.join(RAIZ, 'docs', 'cristina', 'index.html')
VISTAS = ['hoy', 'plan', 'marcas', 'tecnica']
MOD_DE = {'hoy': '20_hoy.js', 'plan': '30_plan.js', 'marcas': '40_marcas.js', 'tecnica': '50_tecnica.js'}
DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
TECHO = {'suave': None}     # plan.pulso.techoSuave (desde el 26-10): lo pone construir()
LIMITE_GZIP = 240 * 1024


def leer(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def leer_json(p, defecto=None):
    if not os.path.exists(p):
        return defecto
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def cargar_build():
    """web/build.py como módulo: capas de CSS y minificado idénticos a los de la web de Daniel."""
    spec = importlib.util.spec_from_file_location('build_daniel', os.path.join(WEB, 'build.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ---------------------------------------------------------------------------------------------- tiempos
def seg(txt):
    """'4:45' → 285 · '0:43,5' → 43.5 · None si no es un tiempo."""
    m = re.match(r'^\s*(\d+):(\d{2})(?:[,.](\d+))?\s*$', str(txt or ''))
    if not m:
        return None
    return int(m.group(1)) * 60 + int(m.group(2)) + (float('0.' + m.group(3)) if m.group(3) else 0)


def mmss(s, dec=0):
    """285 → '4:45' · (43.5, 1) → '0:43,5'. Redondeo normal."""
    if s is None:
        return None
    f = 10 ** dec
    s = round(s * f) / f
    m = int(s // 60)
    r = s - m * 60
    if dec:
        txt = ('%0' + str(3 + dec) + '.' + str(dec) + 'f') % r
        return ('%d:%s' % (m, txt)).replace('.', ',')
    r = int(round(r))
    if r == 60:
        m, r = m + 1, 0
    return '%d:%02d' % (m, r)


def miles(n):
    """1000 → '1.000' (como se escribe en el plan)."""
    return '{:,}'.format(n).replace(',', '.')


def t_rep(s, dist):
    """Tiempo de una repetición: medio segundo en 200 y 300, segundo entero desde 400."""
    if dist <= 300:
        return mmss(round(s * 2) / 2, 1) if abs(round(s * 2) / 2 - round(s)) > 1e-9 else mmss(s)
    return mmss(s)


def F(s):
    return dt.date.fromisoformat(s[:10])


def mas(s, n):
    return (F(s) + dt.timedelta(days=n)).isoformat()


# ---------------------------------------------------------------------------------------------- baremo
def tramos_mil(plan):
    out = []
    for t in plan['baremo1000Mujeres']['tramos']:
        out.append({'pts': t['puntos'], 'min': seg(t['desde']) or 0.0, 'max': seg(t['hasta']) if t.get('hasta') else None,
                    'elimina': bool(t.get('elimina'))})
    out.sort(key=lambda x: -x['pts'])
    return out


def pts_mil(T, s):
    if s is None:
        return None
    for t in T:
        if t['max'] is not None and s <= t['max'] + 1e-9:
            return t['pts']
    return 0


# ---------------------------------------------------------------------------------------------- sesiones
NUM = r'(\d+(?:[.,]\d+)?)'


def n_(x):
    return float(str(x).replace(',', '.'))


def rec_seg(txt):
    """'2 min' → 120 · '2 min 30 s' → 150 · '90 s' → 90."""
    m = re.match(r'^\s*(?:(\d+)\s*min)?\s*(?:(\d+)\s*s)?\s*$', txt or '')
    if not m or not (m.group(1) or m.group(2)):
        return None
    return int(m.group(1) or 0) * 60 + int(m.group(2) or 0)


def parsear(d, sem):
    """Del título y el detalle de un día de carrera de plan.json saca su estructura. Se para si no lo entiende."""
    t = d['titulo']
    det = d.get('detalle') or ''
    p = None
    m = re.match(r'^(?:(\d+) min: )?(\d+) × \((\d+) min corriendo \+ (\d+) andando\)$', t)
    if m:
        p = {'tipo': 'correrAndar', 'n': int(m.group(2)), 'corre': int(m.group(3)), 'anda': int(m.group(4))}
        p['min'] = int(m.group(1)) if m.group(1) else p['n'] * (p['corre'] + p['anda'])
    if not p:
        m = re.match(r'^(\d+) min: correr y andar al escalón que toque$', t)
        if m:
            p = {'tipo': 'correrAndar', 'min': int(m.group(1)), 'escalon': True}
    if not p:
        m = re.match(r'^(\d+) min suave(?: \+ (\d+) rectas| \+ (\d+) cuestas de (\d+) s| \+ (\d+) × (\d+) m a ritmo K)?$', t)
        if m:
            p = {'tipo': 'rodaje', 'min': int(m.group(1))}
            if m.group(2):
                p['rectas'] = int(m.group(2))
            if m.group(3):
                p['cuestas'] = {'n': int(m.group(3)), 's': int(m.group(4))}
            if m.group(5):
                rec = '200 m andando' if '200 m andando' in det else None
                if not rec:
                    raise SystemExit('ERROR: %s · no encuentro la recuperación de los %s × %s m' % (d['fecha'], m.group(5), m.group(6)))
                p['extra'] = {'n': int(m.group(5)), 'dist': int(m.group(6)), 'ritmo': 'K', 'rec': rec}
    if not p:
        m = re.match(r'^(\d+) min con (\d+) × \((\d+) min alegre \+ (\d+) min suave\)$', t)
        if m:
            ini = re.search(r'(\d+) min suaves, ', det)
            p = {'tipo': 'rodaje', 'min': int(m.group(1)), 'fartlek': {'n': int(m.group(2)), 'alegre': int(m.group(3)),
                                                                        'suave': int(m.group(4)), 'antes': int(ini.group(1)) if ini else None}}
    if not p:
        m = re.match(r'^(\d+) min: suave y los (\d+) últimos alegres$', t)
        if m:
            p = {'tipo': 'rodaje', 'min': int(m.group(1)), 'alegreFinal': int(m.group(2))}
    if not p:
        m = re.match(r'^(\d+) × (\d+) min a (ritmo K \+ 10|ritmo K \+ 4|umbral)(?:, rec\. ([\d a-z]+?)( trotando)?| \+ (\d+) min suave)$', t)
        if m:
            p = {'tipo': 'intervalos', 'n': int(m.group(1)), 'dur': int(m.group(2)) * 60,
                 'ritmo': {'ritmo K + 10': 'K+10', 'ritmo K + 4': 'K+4'}.get(m.group(3), 'umbral')}
            if m.group(4):
                p['rec'] = rec_seg(m.group(4))
                p['recTxt'] = m.group(4) + (' trotando' if m.group(5) else '')
                if p['rec'] is None:
                    raise SystemExit('ERROR: %s · recuperación ilegible «%s»' % (d['fecha'], m.group(4)))
            if m.group(6):
                p['despues'] = int(m.group(6))
    if not p:
        m = re.match(r'^(\d+) × (\d+(?:\.\d{3})?) m (?:a ritmo (K \+ 10|K \+ 4|K|O)|(rápidos)), rec\. (.+?)(?: \+ (\d+) × (\d+) m rápidos)?$', t)
        if m:
            ritmo = {'K + 10': 'K+10', 'K + 4': 'K+4', 'K': 'K', 'O': 'O'}.get(m.group(3)) if m.group(3) else 'rapidos'
            rec = m.group(5)
            p = {'tipo': 'series', 'n': int(m.group(1)), 'dist': int(m.group(2).replace('.', '')), 'ritmo': ritmo}
            mr = re.match(r'^(\d+) m andando$', rec)
            if mr:
                p['recDist'] = int(mr.group(1))
                p['recTxt'] = rec
            else:
                mt = re.match(r'^(.+?)( trotando)?$', rec)
                p['rec'] = rec_seg(mt.group(1))
                p['recTxt'] = rec
                if p['rec'] is None:
                    raise SystemExit('ERROR: %s · recuperación ilegible «%s»' % (d['fecha'], rec))
            if m.group(6):
                p['extra'] = {'n': int(m.group(6)), 'dist': int(m.group(7)), 'ritmo': 'rapidos'}
                if 'rec. 200 m andando' not in det and 'andando' not in det:
                    p['extra']['rec'] = None
    if not p:
        m = re.match(r'^(\d+) × \((\d+) \+ (\d+) m\) a ritmo O: (\d+) min (?:entre el \d+ y el \d+, )?(?:y )?(\d+) min(?: entre las dos)?$', t)
        if m:
            p = {'tipo': 'kmPartido', 'n': int(m.group(1)), 'partes': [int(m.group(2)), int(m.group(3))], 'ritmo': 'O',
                 'recEntre': int(m.group(4)) * 60, 'recSeries': int(m.group(5)) * 60}
    if not p:
        m = re.match(r'^Control de 1\.000 m \((\d+)\.º\)$', t)
        if m:
            p = {'tipo': 'control1000', 'n': int(m.group(1))}
    if not p and t.startswith('SIMULACRO'):
        p = {'tipo': 'simulacro'}
    if not p and t.startswith('Prueba'):
        p = {'tipo': 'prueba'}
    if not p:
        raise SystemExit('ERROR: %s · no entiendo la sesión «%s». Añade su forma a parsear() en web/cristina/construir.py' % (d['fecha'], t))
    # lo que dice el detalle
    if re.search(r'La larga', det) or (d['dia'] == 'Sáb' and p['tipo'] in ('rodaje', 'correrAndar')):
        p['larga'] = True
    if 'Calentamiento: 15 min suave + movilidad + 4 rectas' in det:
        p['calentamiento'] = {'min': 15, 'rectas': 4}
    elif 'Calentamiento' in det:
        raise SystemExit('ERROR: %s · calentamiento con otra forma: «%s»' % (d['fecha'], det))
    if 'Después, 10 min muy suave' in det:
        p['calma'] = 10
    if '3 × 15 elevaciones de talón a una pierna' in det:
        p['talon'] = True
    if 'Semana de descarga' in det or sem.get('descarga'):
        p['descarga'] = True
    if re.search(r'Solo si el lunes salió sin dolor y no llegas cargada; si no, (\d+) min suave', det):
        p['siNo'] = int(re.search(r'si no, (\d+) min suave', det).group(1))
    return p


def ejercicios_de(p):
    """Ids de plan.ejercicios que explican la sesión (en el orden en que se hacen)."""
    out = []
    if p.get('calentamiento'):
        out += ['calentamiento', 'movilidad', 'rectas']
    t = p['tipo']
    if t == 'correrAndar':
        out += ['correr-andar']
    elif t == 'rodaje':
        out += ['larga' if p.get('larga') else 'suave']
        if p.get('rectas'):
            out += ['rectas']
        if p.get('cuestas'):
            out += ['cuestas']
        if p.get('fartlek') or p.get('alegreFinal'):
            out += ['alegre']
        if p.get('extra'):
            out += ['series-k']
    elif t == 'intervalos':
        out += ['umbral' if p['ritmo'] == 'umbral' else 'intervalos']
        if p.get('despues'):
            out += ['suave']
    elif t == 'series':
        out += {'K': ['series-k'], 'K+4': ['series-k'], 'K+10': ['intervalos'], 'O': ['series-o'], 'rapidos': ['rapidos']}[p['ritmo']]
        if p.get('extra'):
            out += ['rapidos']
    elif t == 'kmPartido':
        out += ['km-partido']
    elif t == 'control1000':
        out += ['control']
    elif t == 'simulacro':
        out += ['simulacro']
    elif t == 'prueba':
        out += ['control']
    if p.get('calma'):
        out += ['vuelta-calma']
    if p.get('talon'):
        out += ['talon']
    vistos = []
    for x in out:
        if x not in vistos:
            vistos.append(x)
    return vistos


# ---------------------------------------------------------------------------------------------- ritmos
def ritmos_de_k(k):
    """Ritmos del plan a partir de K (segundos del 1.000). reglas[ritmos] de plan.json."""
    if k is None:
        return None
    k400 = k * 0.4
    return {
        'K': {'km': k, '400': k400, '200': k * 0.2},
        'K+4': {'km': (k400 + 4) * 2.5, '400': k400 + 4, '200': (k400 + 4) / 2},
        'K+10': {'km': (k400 + 10) * 2.5, '400': k400 + 10, '200': (k400 + 10) / 2},
        'O': {'km': (k400 - 2) * 2.5, '400': k400 - 2, '200': (k400 - 2) / 2},
        'rapidos': {'400': k400 - 6, '200': (k400 - 6) / 2},          # 2 s más rápidos que O cada 200
        'umbral': {'km': [k * 1.20, k * 1.25]},                       # desde el 28-10, solo el tope: manda el pulso (160-170)
    }


def k_en(controles, fecha, incluir=False):
    """K en una fecha: el mejor de los dos últimos controles anteriores (o del mismo día si incluir)."""
    previos = [c for c in controles if (c['fecha'] <= fecha if incluir else c['fecha'] < fecha)]
    dos = previos[-2:]
    if not dos:
        return None, []
    mejor = min(dos, key=lambda c: c['s'])
    return mejor['s'], [c['fecha'] for c in dos]


def ritmo_txt_rep(R, ritmo, dist):
    """'2:24' para un 400 a ritmo K (None si no hay K o el ritmo va por sensación)."""
    if not R or ritmo not in ('K', 'K+4', 'K+10', 'O', 'rapidos'):
        return None
    return t_rep(R[ritmo]['400'] * dist / 400, dist)


def paso_marcas(obj, dist):
    """Paso acumulado de una repetición, plano: cada 50 m hasta 300 m y cada 100 m desde 400 (desde el 26-10, como el «Paso cada 50 m» de Daniel).
    '1:02,5', 200 → '50 m en 0:15,6 · 100 en 0:31,3 · 150 en 0:46,9 · 200 en 1:02,5'."""
    s = seg(obj)
    if not s or not dist:
        return None
    paso = 50 if dist <= 300 else 100
    out = []
    for d in range(paso, dist + 1, paso):
        t = obj if d == dist else mmss(s * d / dist, 1)
        out.append(('%d m en %s' if not out else '%d en %s') % (d, t))
    return ' · '.join(out)


# ---------------------------------------------------------------------------------------------- pasos de cada día
def hablar():
    """'Pulso por debajo de 150 y hablando con frases enteras.' (o solo lo de hablar, sin techo en el plan)."""
    t = TECHO['suave']
    return ('Pulso por debajo de %d y hablando con frases enteras.' % t) if t else 'Puedes hablar con frases enteras.'


def suave_de(RE, p):
    """Ritmo suave que se enseña: en «correr y andar», el de los tramos (ritmosEstimados.suaveTramos, medido el 12-10) si existe."""
    r = RE.get('suaveTramos') if p.get('tipo') == 'correrAndar' and RE.get('suaveTramos') else RE.get('suave')
    return (r or {}).get('txt')


def pasos_de(p, R, RE):
    """Pasos de la tarjeta de Hoy y del modo pista: {t, d, seg (temporizador), parte, n/de, ritmo}."""
    P = []
    suave = suave_de(RE, p)

    def paso(t, d='', seg=None, parte='principal', **kw):
        x = {'t': t, 'parte': parte}
        if d:
            x['d'] = d
        if seg:
            x['seg'] = seg
        x.update({k: v for k, v in kw.items() if v is not None})
        P.append(x)

    tipo = p['tipo']
    if tipo in ('correrAndar', 'rodaje'):
        paso('Anda 5 min a paso vivo', 'Para entrar en calor antes de correr. No cuenta en los minutos de la sesión.', 300, 'antes', ej='andar')
    if p.get('calentamiento'):
        c = p['calentamiento']
        paso('Trote suave %d min' % c['min'], ('A tu ritmo suave (%s). %s' % (suave, hablar())) if suave else hablar(),
             c['min'] * 60, 'calentamiento', ej='suave')
        paso('Movilidad', 'Los ejercicios de movilidad de Técnica › Carrera, unos 5 min.', None, 'calentamiento', ej='movilidad')
        paso('%d rectas de 80 m' % c['rectas'], 'Aceleras poco a poco hasta rápido pero suelto y vuelves andando.', None, 'calentamiento', ej='rectas')
        paso('Pausa de 2-3 min y empiezas', '', 150, 'calentamiento')
    if tipo == 'correrAndar':
        if p.get('escalon'):
            paso('Correr y andar %d min con tu escalón' % p['min'],
                 'El escalón en el que estés (2:1, 3:1, 4:1, 6:1, 8:1 o seguido). Suave: puedes hablar con frases.', p['min'] * 60, 'principal', ej='correr-andar')
        else:
            for i in range(p['n']):
                paso('Corre %d min suave' % p['corre'], 'Bloque %d de %d%s' % (i + 1, p['n'], (' · ' + suave + ' /km') if suave else ''),
                     p['corre'] * 60, 'principal', n=i + 1, de=p['n'], fase='corre', ej='correr-andar')
                paso('Anda %d min' % p['anda'], 'Paso vivo, sin pararte.', p['anda'] * 60, 'principal', n=i + 1, de=p['n'], fase='anda', ej='correr-andar')
    elif tipo == 'rodaje':
        fk = p.get('fartlek')
        if fk:
            if fk.get('antes'):
                paso('%d min suaves' % fk['antes'], (suave + ' /km') if suave else '', fk['antes'] * 60, 'principal', ej='suave')
            for i in range(fk['n']):
                paso('%d min alegre' % fk['alegre'], 'Respiras fuerte pero controlas · %d de %d' % (i + 1, fk['n']), fk['alegre'] * 60, 'principal',
                     n=i + 1, de=fk['n'], fase='rapido', ej='alegre')
                paso('%d min suave' % fk['suave'], '', fk['suave'] * 60, 'principal', n=i + 1, de=fk['n'], fase='suave', ej='suave')
            resto = p['min'] - (fk.get('antes') or 0) - fk['n'] * (fk['alegre'] + fk['suave'])
            if resto > 0:
                paso('%d min suaves hasta el final' % resto, '', resto * 60, 'principal', ej='suave')
        elif p.get('alegreFinal'):
            paso('%d min suave' % (p['min'] - p['alegreFinal']), (suave + ' /km') if suave else '', (p['min'] - p['alegreFinal']) * 60, 'principal', ej='suave')
            paso('%d min alegres' % p['alegreFinal'], 'Los últimos: respiras fuerte pero controlas.', p['alegreFinal'] * 60, 'principal', fase='rapido', ej='alegre')
        else:
            paso('%d min suave%s' % (p['min'], ' · la larga' if p.get('larga') else ''),
                 ('%s /km. %s' % (suave, hablar())) if suave else hablar(), p['min'] * 60, 'principal',
                 ej='larga' if p.get('larga') else 'suave')
        if p.get('rectas'):
            for i in range(p['rectas']):
                paso('Recta de 80 m', 'Recta %d de %d · vuelves andando' % (i + 1, p['rectas']), None, 'final', n=i + 1, de=p['rectas'], ej='rectas')
        if p.get('cuestas'):
            c = p['cuestas']
            for i in range(c['n']):
                paso('Cuesta de %d s' % c['s'], 'Cuesta %d de %d · subes fuerte sin llegar a tope y bajas andando' % (i + 1, c['n']), c['s'], 'final',
                     n=i + 1, de=c['n'], ej='cuestas')
        if p.get('extra'):
            x = p['extra']
            rt = ritmo_txt_rep(R, 'K', x['dist'])
            for i in range(x['n']):
                paso('%d m a ritmo K%s' % (x['dist'], (' · ' + rt) if rt else ''), 'Repetición %d de %d · %s entre cada uno' % (i + 1, x['n'], x['rec']),
                     None, 'final', n=i + 1, de=x['n'], dist=x['dist'], obj=rt, ej='series-k')
    elif tipo == 'intervalos':
        ritmo = {'umbral': 'umbral', 'K+4': 'ritmo K + 4', 'K+10': 'ritmo K + 10'}[p['ritmo']]
        for i in range(p['n']):
            obj = None
            if p['ritmo'] == 'umbral':
                obj = 'pulso 160-170' + ((', no más rápido de %s /km' % mmss(R['umbral']['km'][0])) if R else '')
            elif R:
                obj = '%s /km' % mmss(R[p['ritmo']]['km'])
            dist = int(round(p['dur'] / R[p['ritmo']]['km'] * 1000, -1)) if R and p['ritmo'] != 'umbral' else None
            paso('%d min a %s%s' % (p['dur'] // 60, ritmo, (' · ' + obj) if obj else ''), 'Repetición %d de %d' % (i + 1, p['n']) +
                 ((' · unos %d m' % dist) if dist else ''),
                 p['dur'], 'principal', n=i + 1, de=p['n'], fase='rapido', obj=obj, ej='umbral' if p['ritmo'] == 'umbral' else 'intervalos')
            if i < p['n'] - 1 and p.get('rec'):
                paso('Recupera %s' % p['recTxt'], '', p['rec'], 'principal', n=i + 1, de=p['n'], fase='rec')
            elif i < p['n'] - 1 and p['ritmo'] == 'umbral' and not p.get('rec'):
                paso('Recupera 2 min trotando suave', 'El plan no fija esta pausa: 2 min trotando muy suave.', 120, 'principal', n=i + 1, de=p['n'], fase='rec',
                     sinPlan=True)
        if p.get('despues'):
            paso('%d min suaves' % p['despues'], (suave + ' /km') if suave else '', p['despues'] * 60, 'principal', ej='suave')
    elif tipo == 'series':
        nombre = {'K': 'a ritmo K', 'K+4': 'a ritmo K + 4', 'K+10': 'a ritmo K + 10', 'O': 'a ritmo O', 'rapidos': 'rápidos'}[p['ritmo']]
        rt = ritmo_txt_rep(R, p['ritmo'], p['dist'])
        pm = paso_marcas(rt, p['dist']) if rt else None
        for i in range(p['n']):
            paso('%s m %s%s' % (miles(p['dist']), nombre, (' · ' + rt) if rt else ''), 'Repetición %d de %d' % (i + 1, p['n']) +
                 ((' · recuperación %s' % p['recTxt']) if i < p['n'] - 1 else '') + ((' · paso: ' + pm) if pm else ''),
                 p.get('rec') if i < p['n'] - 1 else None, 'principal', n=i + 1, de=p['n'], dist=p['dist'], obj=rt,
                 recDist=p.get('recDist') if i < p['n'] - 1 else None,
                 ej={'K': 'series-k', 'K+4': 'series-k', 'K+10': 'intervalos', 'O': 'series-o', 'rapidos': 'rapidos'}[p['ritmo']])
        if p.get('extra'):
            x = p['extra']
            paso('Pausa de 3 min', 'Antes de los %d × %d m rápidos.' % (x['n'], x['dist']), 180, 'principal', sinPlan=True)
            rr = ritmo_txt_rep(R, 'rapidos', x['dist'])
            for i in range(x['n']):
                paso('%d m rápidos%s' % (x['dist'], (' · ' + rr) if rr else ''), 'Repetición %d de %d · vuelves andando' % (i + 1, x['n']), None,
                     'principal', n=i + 1, de=x['n'], dist=x['dist'], obj=rr, ej='rapidos')
    elif tipo == 'kmPartido':
        a, b = p['partes']
        for i in range(p['n']):
            for j, dist in enumerate((a, b)):
                rt = ritmo_txt_rep(R, 'O', dist)
                paso('%d m a ritmo O%s' % (dist, (' · ' + rt) if rt else ''), 'Kilómetro partido %d de %d' % (i + 1, p['n']), None, 'principal',
                     n=i + 1, de=p['n'], dist=dist, obj=rt, ej='km-partido')
                if j == 0:
                    paso('Pausa de %d min' % (p['recEntre'] // 60), 'Entre el %d y el %d' % (a, b), p['recEntre'], 'principal')
            if i < p['n'] - 1:
                paso('Recupera %d min' % (p['recSeries'] // 60), 'Entre los dos kilómetros partidos', p['recSeries'], 'principal')
    elif tipo == 'control1000':
        k200 = R['K']['200'] if R else None
        if k200:
            txt = ('Los tres primeros 200 a tu ritmo K, cada uno en %s: a los 100 m, %s (si llevas menos, aflojas); 200 en %s · 400 en %s · 600 en %s. '
                   'Del 600 al 800 aguantas ese ritmo y los últimos 200, todo lo que te quede. Apunta el tiempo y, si puedes, los cinco parciales de 200.'
                   % (mmss(k200, 1), mmss(k200 / 2, 1), mmss(k200, 1), mmss(2 * k200, 1), mmss(3 * k200, 1)))
        else:
            txt = 'El primer 200 al mismo ritmo que los demás, no a sprint. Apunta el tiempo y, si puedes, los cinco parciales de 200.'
        paso('1.000 m a tope', txt, None, 'principal', dist=1000, ej='control')
    elif tipo == 'simulacro':
        paso('Circuito', 'En el orden del BOE, con los descansos que te den.', None, 'principal')
        paso('Barra', '', None, 'principal')
        paso('1.000 m a tope', 'Con el reparto de Técnica › 1.000.', None, 'principal', dist=1000, ej='control')
    elif tipo == 'prueba':
        paso('Prueba', 'La fecha la fija la convocatoria de 2027.', None, 'principal')
    if p.get('calma'):
        paso('Vuelta a la calma · %d min' % p['calma'], 'Trote muy suave. Si no puedes trotar, andando.', p['calma'] * 60, 'calma', ej='vuelta-calma')
    if tipo in ('correrAndar', 'rodaje'):
        paso('Anda 3-5 min para acabar', 'Hasta que respires normal.', None, 'calma', ej='vuelta-calma')
    if p.get('talon'):
        paso('Elevaciones de talón · 3 × 15 por pierna', 'A una pierna, lentas: 2 s arriba y 2 s abajo.', None, 'calma', ej='talon')
    return P


def barra_dia(spec, test):
    """Pasos y números de un día de barra (plan.calendario[].dias[].barra, desde el 26-10) para la tarjeta y el modo paso a paso.
    «seg: 'mitad'» es la mitad del último test (pruebasMujeres.barra.marca.valor)."""
    mitad = int(test // 2) if test else None
    P, N = [], []

    def paso(t, d='', seg=None, **kw):
        x = {'t': t, 'parte': 'principal'}
        if d:
            x['d'] = d
        if seg:
            x['seg'] = seg
        x.update({k: v for k, v in kw.items() if v is not None})
        P.append(x)

    for i, it in enumerate(spec):
        mm = re.match(r'^mitad(?:\+(\d+))?$', str(it.get('seg') or ''))      # «mitad» o «mitad+2»: +2 s por semana (versión 5)
        seg = (mitad + int(mm.group(1) or 0) if mitad is not None else None) if mm else it.get('seg')
        if mm and seg is None:
            raise SystemExit('ERROR: barra con «la mitad del test» y sin marca de barra en pruebasMujeres')
        n = it.get('n') or 1
        nota = ((' · la mitad de tu último test (%d s)' % test) + ((' más %s s' % mm.group(1)) if mm.group(1) else '')) if mm else ''
        if n == 1 and not it.get('reps'):
            paso(it['t'] + ((' · %d min' % (seg // 60)) if seg and seg >= 60 and seg % 60 == 0 else (' · %d s' % seg) if seg else ''), it.get('d', ''), seg,
                 ej='barra' if i == 0 else None)
            continue
        cuanto = ('%d s' % seg) if seg else ('%d repeticiones' % it['reps'])
        for k in range(n):
            paso('%s · %s' % (it['t'], cuanto), ('Serie %d de %d%s' % (k + 1, n, nota)) + ((' · ' + it['d']) if it.get('d') and k == 0 else ''), seg,
                 n=k + 1, de=n, fase='rapido')
            if k < n - 1 and it.get('rec'):
                r = it['rec']
                paso('Descansa %s' % (('%d min' % (r // 60)) if r % 60 == 0 else ('%d s' % r)), '', r, n=k + 1, de=n, fase='rec')
        N.append({'v': '%d × %s' % (n, ('%d s' % seg) if seg else it['reps']), 'l': it['t'].lower()})
    if test:
        N.append({'v': '%d s' % test, 'l': 'tu último test'})
    if any(it.get('t', '').startswith('Test') for it in spec):
        N = [{'v': 'a tope', 'l': 'una suspensión'}, {'v': '%d s' % test, 'l': 'el último test'}] if test else [{'v': 'a tope', 'l': 'una suspensión'}]
    return P, N[:3]


def numeros_de(p, R, RE):
    """Los tres números grandes del día (como «stats» en la web de Daniel)."""
    suave = suave_de(RE, p)
    t = p['tipo']
    N = []
    if t == 'correrAndar':
        if p.get('escalon'):
            N = [{'v': '%d min' % p['min'], 'l': 'correr y andar'}, {'v': 'tu escalón', 'l': '2:1 → 3:1 → 4:1 → …'}]
        else:
            N = [{'v': '%d × %d min' % (p['n'], p['corre']), 'l': 'corriendo'}, {'v': '%d min' % p['anda'], 'l': 'andando entre medias'}]
        if suave:
            N.append({'v': suave, 'l': 'ritmo suave /km', 'est': True})
    elif t == 'rodaje':
        N = [{'v': '%d min' % p['min'], 'l': 'la larga, suave' if p.get('larga') else 'suave'}]
        if p.get('rectas'):
            N.append({'v': '%d rectas' % p['rectas'], 'l': 'de 80 m al final'})
        elif p.get('cuestas'):
            N.append({'v': '%d × %d s' % (p['cuestas']['n'], p['cuestas']['s']), 'l': 'cuestas al final'})
        elif p.get('fartlek'):
            N.append({'v': '%d × %d min' % (p['fartlek']['n'], p['fartlek']['alegre']), 'l': 'alegres'})
        elif p.get('alegreFinal'):
            N.append({'v': '%d min' % p['alegreFinal'], 'l': 'últimos, alegres'})
        elif p.get('extra'):
            N.append({'v': '%d × %d m' % (p['extra']['n'], p['extra']['dist']), 'l': 'a ritmo K al final'})
        if TECHO['suave']:
            N.append({'v': '< %d' % TECHO['suave'], 'l': 'pulso en lo suave'})
        if suave:
            N.append({'v': suave, 'l': 'ritmo suave /km', 'est': True})
    elif t == 'intervalos':
        N = [{'v': '%d × %d min' % (p['n'], p['dur'] // 60), 'l': {'umbral': 'a umbral', 'K+4': 'a ritmo K + 4', 'K+10': 'a ritmo K + 10'}[p['ritmo']]}]
        if p['ritmo'] == 'umbral':
            N.append({'v': '160-170', 'l': 'pulso'})
            if R:
                N.append({'v': mmss(R['umbral']['km'][0]), 'l': 'tope por km'})
        elif R:
            N.append({'v': mmss(R[p['ritmo']]['km']), 'l': 'por km'})
        else:
            N.append({'v': 'tras el control', 'l': 'el ritmo sale de K', 'pend': True})
        if p.get('rec'):
            N.append({'v': p['recTxt'].replace(' trotando', ''), 'l': 'recuperación' + (' trotando' if 'trotando' in p['recTxt'] else '')})
        elif p.get('despues'):
            N.append({'v': '%d min' % p['despues'], 'l': 'suaves después'})
    elif t == 'series':
        N = [{'v': '%d × %s m' % (p['n'], miles(p['dist'])), 'l': 'series'}]
        rt = ritmo_txt_rep(R, p['ritmo'], p['dist'])
        if p['ritmo'] == 'rapidos' and rt:
            N.append({'v': rt, 'l': 'cada %s · O menos 2 s' % miles(p['dist'])})
        elif p['ritmo'] == 'rapidos':
            N.append({'v': 'rápidos', 'l': 'sueltos, sin sprint'})
        elif rt:
            N.append({'v': rt, 'l': 'cada %s · ritmo %s' % (miles(p['dist']), p['ritmo'].replace('+', ' + '))})
        else:
            N.append({'v': 'tras el control', 'l': 'el ritmo sale de K', 'pend': True})
        N.append({'v': p['recTxt'].replace(' andando', '').replace(' trotando', ''), 'l': 'recuperación' + (' andando' if 'andando' in p['recTxt'] else '')})
    elif t == 'kmPartido':
        N = [{'v': '%d × (%d + %d)' % (p['n'], p['partes'][0], p['partes'][1]), 'l': 'kilómetro partido'}]
        rt = ritmo_txt_rep(R, 'O', p['partes'][0])
        N.append({'v': rt, 'l': 'cada 600 · ritmo O'} if rt else {'v': 'tras el control', 'l': 'el ritmo sale de K', 'pend': True})
        N.append({'v': '%d min' % (p['recEntre'] // 60), 'l': 'entre el 600 y el 400'})
    elif t == 'control1000':
        N = [{'v': '1.000 m', 'l': 'a tope, reparto regular'}, {'v': '4:45', 'l': 'deja de eliminar'}]
    elif t == 'simulacro':
        N = [{'v': '3 pruebas', 'l': 'circuito, barra y 1.000'}]
    elif t == 'prueba':
        N = [{'v': '1.000 m', 'l': 'la prueba'}]
    return N[:3]


def resumen_hoy(p, R, RE):
    """«Hoy haces:» en una línea."""
    suave = suave_de(RE, p)
    t = p['tipo']
    if t == 'correrAndar':
        base = ('%d min de correr y andar con tu escalón' % p['min']) if p.get('escalon') else \
            '%d veces: %d min corriendo suave y %d min andando' % (p['n'], p['corre'], p['anda'])
        return base + ((' · suave a %s /km' % suave) if suave else '') + ' · 5 min andando antes'
    if t == 'rodaje':
        x = '%d min suave' % p['min']
        if p.get('rectas'):
            x += ' y %d rectas' % p['rectas']
        if p.get('cuestas'):
            x += ' y %d cuestas de %d s' % (p['cuestas']['n'], p['cuestas']['s'])
        if p.get('fartlek'):
            x = '%d min con %d × (%d min alegre + %d min suave)' % (p['min'], p['fartlek']['n'], p['fartlek']['alegre'], p['fartlek']['suave'])
        if p.get('alegreFinal'):
            x = '%d min: suave y los %d últimos alegres' % (p['min'], p['alegreFinal'])
        if p.get('extra'):
            x += ' y %d × %d m a ritmo K' % (p['extra']['n'], p['extra']['dist'])
        return x + ((' · suave a %s /km' % suave) if suave else '') + (' · elevaciones de talón' if p.get('talon') else '')
    return None


# ---------------------------------------------------------------------------------------------- construcción de datos
def construir(plan, hist, hoy):
    errores, avisos = [], []
    T = tramos_mil(plan)
    RE = plan.get('ritmosEstimados') or {}
    TECHO['suave'] = (plan.get('pulso') or {}).get('techoSuave')
    test_barra = next((((x.get('marca') or {}).get('valor')) for x in ((plan.get('pruebasMujeres') or {}).get('pruebas') or []) if x.get('id') == 'barra'), None)

    # controles (de más viejo a más nuevo) con sus puntos
    controles = []
    for c in hist.get('controles') or []:
        s = seg(c.get('tiempo'))
        if s is None:
            errores.append('controles %s: tiempo ilegible «%s»' % (c.get('fecha'), c.get('tiempo')))
            continue
        x = dict(c)
        x['s'] = s
        x['pts'] = pts_mil(T, s)
        controles.append(x)
    controles.sort(key=lambda c: c['fecha'])

    # calendario en la forma del núcleo (semana «a/b», sesion, tipo de Daniel) y días derivados
    cal, dias, fases = [], [], {f['id']: f for f in plan['fases']}
    bloques = []
    for f in plan['fases']:
        w0, w1 = plan['calendario'][f['desde'] - 1], plan['calendario'][f['hasta'] - 1]
        bloques.append({'clave': f['id'], 'nombre': f['nombre'], 'objetivo': f['objetivo'], 'desde': w0['desde'],
                        'hasta': w1['dias'][-1]['fecha'], 'semanas': [f['desde'], f['hasta']]})
    hist_por_fecha = {}
    for i, e in enumerate(hist.get('carrera') or []):
        hist_por_fecha.setdefault(e['fecha'], []).append({'src': 'carrera:' + e['fecha'], 'arr': 'carrera', 'i': i, 'hecho': e.get('hecho', True),
                                                          'valida': e.get('valida', True), 'resumen': e.get('resumen') or e.get('sesion') or ''})
    for c in controles:
        hist_por_fecha.setdefault(c['fecha'], []).append({'src': 'controles:' + c['fecha'], 'arr': 'controles', 'hecho': True, 'valida': c.get('valida', True),
                                                          'resumen': 'Control: %s (%s)' % (c['tiempo'], pts_txt(c['pts']))})
    semanas = []
    web_dias = {}
    vistos = set()
    for wi, w in enumerate(plan['calendario']):
        a, b = w['desde'], w['dias'][-1]['fecha']
        fase = fases[w['fase']]
        sem = {'semana': '%s/%s' % (a, b), 'n': w['n'], 'fase': w['fase'], 'descarga': bool(w.get('descarga')),
               'titulo': 'Semana %d · %s' % (w['n'], fase['nombre']) + (' · descarga' if w.get('descarga') else ''),
               'nota': 'Semana de descarga: menos carrera para llegar fresca al control del lunes siguiente.' if w.get('descarga') else None, 'dias': []}
        if F(a).weekday() != 0:
            errores.append('calendario: la semana %d no empieza en lunes (%s)' % (w['n'], a))
        min_plan = 0
        for di, d in enumerate(w['dias']):
            f = d['fecha']
            if f in vistos:
                errores.append('calendario: %s repetido' % f)
            vistos.add(f)
            if not (a <= f <= b):
                errores.append('calendario: %s fuera de su semana %d' % (f, w['n']))
            if d['dia'] != DOW[F(f).weekday()]:
                errores.append('calendario: %s dice «%s» y es %s' % (f, d['dia'], DOW[F(f).weekday()]))
            tipo = {'suave': 'carrera', 'calidad': 'carrera', 'control': 'control', 'prueba': 'prueba', 'otro': 'otro'}[d['tipo']]
            sub = d['tipo'] if d['tipo'] != 'otro' else ('martin' if 'Martín Freire' in d['titulo'] else 'barra' if d.get('barra') else 'crossfit' if 'CrossFit' in d['titulo'] else 'otro')
            base = {'fecha': f, 'dia': d['dia'], 'tipo': tipo, 'sub': sub, 'sesion': d['titulo']}
            for k in ('objetivo', 'min'):
                if d.get(k) not in (None, ''):
                    base[k] = d[k]
            if d.get('detalle'):
                base['nota'] = d['detalle']      # «Por qué › Nota» en la tarjeta de Daniel
            if tipo in ('control', 'prueba'):
                base['clave'] = True
            sem['dias'].append(base)
            dd = {'fecha': f, 'ref': [wi, di], 'semana': sem['semana'], 'bloque': w['fase'], 'titulo': d['titulo'], 'hist': hist_por_fecha.get(f, []),
                  'sub': sub, 'n': w['n']}
            if tipo != 'otro':
                p = parsear(d, w)
                K, deK = k_en(controles, f)
                R = ritmos_de_k(K)
                dd['cr'] = p                     # estructura de Cristina (no es el «principal» de Daniel)
                dd['ej'] = ejercicios_de(p)
                # web.dias en la forma de la tarjeta de Daniel: pasos con temporizador y enlace, números y «Hoy haces»
                wd = {'plantilla': 'control' if p['tipo'] == 'control1000' else 'cr',
                      'numeros': [{'v': n['v'], 'l': n['l']} for n in numeros_de(p, R, RE)],
                      'pasos': pasos_web(pasos_de(p, R, RE))}
                rh = resumen_hoy(p, R, RE) or ('%s · %s' % (d['titulo'], d['objetivo']) if d.get('objetivo') else None)
                if rh:
                    wd['variantes'] = {'verde': rh}
                web_dias[f] = wd
                if K:
                    dd['K'] = {'s': K, 'txt': mmss(K), 'de': deK}
                if d.get('min'):
                    min_plan += d['min']
            elif d.get('barra'):
                # días de Martín Freire con la barra del plan (desde el 26-10): pasos con temporizador, como los de carrera
                pb, nb = barra_dia(d['barra'], test_barra)
                web_dias[f] = {'plantilla': 'cr', 'numeros': nb, 'pasos': pasos_web(pb)}
                if d.get('objetivo'):
                    web_dias[f]['variantes'] = {'verde': d['objetivo']}
                dd['barra'] = True
            elif d.get('opciones'):
                # domingos desde el 21-12: dos opciones (CrossFit o carrera suave); al elegir una, la tarjeta dice qué cambia en el entreno
                web_dias[f] = {'plantilla': 'cr', 'variantes': {'verde': d.get('objetivo') or d['titulo']},
                               'condicion': {'pregunta': '¿Qué haces hoy?', 'comun': 'Si no haces ninguna, descanso.',
                                             'opciones': [{k: o[k] for k in ('id', 'txt', 'consecuencia', 'numeros') if o.get(k)} for o in d['opciones']]}}
            dias.append(dd)
        sem['minPlan'] = min_plan
        cal.append(sem)
        semanas.append({'n': w['n'], 'desde': a, 'hasta': b, 'fase': w['fase'], 'descarga': bool(w.get('descarga')), 'minPlan': min_plan})

    # hitos (para el camino de Hoy y el calendario)
    hitos = []
    nc = 0
    for sem in cal:
        for d in sem['dias']:
            if d['tipo'] == 'control':
                nc += 1
                hitos.append({'fecha': d['fecha'], 'etiqueta': d['sesion'], 'tipo': 'control', 'clave': True})
            elif d['tipo'] == 'prueba':
                hitos.append({'fecha': d['fecha'], 'etiqueta': 'Prueba (fecha supuesta)', 'tipo': 'prueba', 'clave': True})
    for b in bloques:
        hitos.append({'fecha': b['desde'], 'etiqueta': '%s · %s' % (b['clave'], b['nombre']), 'tipo': 'fase'})
    hitos.sort(key=lambda h: (h['fecha'], h['tipo'] != 'fase'))

    # ritmos de hoy (K = el mejor de los dos últimos controles)
    K, deK = k_en(controles, hoy, incluir=True)
    R = ritmos_de_k(K)
    ritmos = {'K': None, 'tabla': None, 'umbral': None}
    if R:
        ritmos['K'] = {'s': K, 'txt': mmss(K), 'de': deK}
        ritmos['tabla'] = [{'dist': d, 'K': t_rep(R['K']['400'] * d / 400, d), 'K+4': t_rep(R['K+4']['400'] * d / 400, d),
                            'K+10': t_rep(R['K+10']['400'] * d / 400, d), 'O': t_rep(R['O']['400'] * d / 400, d),
                            'rapidos': t_rep(R['rapidos']['400'] * d / 400, d) if d == 200 else None} for d in (200, 300, 400, 600, 800, 1000)]
        ritmos['umbral'] = [mmss(R['umbral']['km'][0]), mmss(R['umbral']['km'][1])]

    # marca del 1.000 para el chip y el simulador
    marcas = {'mil': None, 'dom': None, 'cir': None}
    if controles:
        u = controles[-1]
        marcas['mil'] = {'txt': u['tiempo'], 's': u['s'], 'pts': u['pts'], 'fecha': u['fecha'], 'fiab': 'medido'}
    # barra y circuito: las marcas de plan.pruebasMujeres (la barra va en «reps», en segundos, para el núcleo de Daniel)
    PM = {x['id']: x for x in (plan.get('pruebasMujeres') or {}).get('pruebas') or []}
    def pts_pm(pr, v):
        if v is None:
            return None
        if pr['mejor'] == 'mas':
            v = int(v)
            for t in sorted(pr['tramos'], key=lambda t: -t['puntos']):
                if v >= float(t['desde'].replace(',', '.')):
                    return t['puntos']
            return 0
        for t in sorted(pr['tramos'], key=lambda t: -t['puntos']):
            lim = [float(x.replace(',', '.')) for x in (t['desde'], t['hasta']) if x]
            if t['hasta'] is None:
                return t['puntos']
            if v <= max(lim) + 1e-9:
                return t['puntos']
        return 0
    mb = (PM.get('barra') or {}).get('marca') or {}
    if mb.get('valor') is not None:
        marcas['dom'] = {'reps': mb['valor'], 'pts': pts_pm(dict(PM['barra'], mejor='mas'), mb['valor']), 'fecha': mb.get('fecha'), 'fiab': mb.get('fiab') or 'autoinformado'}
    mc = (PM.get('cir') or {}).get('marca') or {}
    if mc.get('valor') is not None:
        marcas['cir'] = {'s': mc['valor'], 'pts': pts_pm(PM['cir'], mc['valor']), 'fecha': mc.get('fecha'), 'fiab': mc.get('fiab') or 'medido'}

    # fechas y avisos
    fechas = [e['fecha'] for e in (hist.get('carrera') or [])] + [c['fecha'] for c in controles]
    datos_hasta = max(fechas) if fechas else None
    fs = plan['objetivo'].get('fechaSupuesta')
    der = {
        'bloques': bloques, 'datosHasta': datos_hasta, 'dias': dias, 'hitos': hitos, 'controles': [
            {'fecha': d['fecha'], 'titulo': d['sesion'], 'ref': [i, j], 'tipo': d['tipo']}
            for i, sem in enumerate(cal) for j, d in enumerate(sem['dias']) if d['tipo'] in ('control', 'prueba')],
        'marcas': marcas, 'ritmos': ritmos, 'semanas': semanas, 'final': None,
        'ventanaPrueba': {'desde': fs, 'hasta': fs} if fs else None,
        'baremo': {'mil': T}, 'controlesHechos': [{'fecha': c['fecha'], 'tiempo': c['tiempo'], 's': c['s'], 'pts': c['pts'],
                                                   'parciales200': c.get('parciales200'), 'valoracion': c.get('valoracion'),
                                                   'valida': c.get('valida', True)} for c in controles],
    }
    # plan público en la forma del núcleo (baremo.mil_metros para PC.baremo)
    pub = {k: v for k, v in plan.items() if k != 'calendario'}
    pub['calendario'] = cal
    pub['baremo'] = {'mil_metros': [{'puntos': t['puntos'], 'desde': t['desde'], 'hasta': t['hasta'], 'elimina': bool(t.get('elimina'))}
                                    for t in plan['baremo1000Mujeres']['tramos']]}
    # circuito y barra de mujeres en la forma del baremo de Daniel («seg» y «reps», de menor a mayor), para su misma pestaña Marcas
    def rango_txt(t, menos):
        if t['desde'] is not None and t['hasta'] is None:
            return '%s o %s' % (t['desde'], 'más')
        if t['desde'] is None:
            return '%s o menos' % t['hasta']
        a, b = sorted([t['desde'], t['hasta']], key=lambda x: float(x.replace(',', '.')))
        return '%s-%s' % (a, b)
    if PM.get('cir'):
        pub['baremo']['circuito_agilidad'] = [{'puntos': t['puntos'], 'seg': rango_txt(t, True)} for t in sorted(PM['cir']['tramos'], key=lambda t: -t['puntos'])]
    if PM.get('barra'):
        pub['baremo']['dominadas'] = [{'puntos': t['puntos'], 'reps': rango_txt(t, False)} for t in sorted(PM['barra']['tramos'], key=lambda t: -t['puntos'])]
    pub['baremo']['fuente'] = 'BOE-A-2026-15055, Anexo II · verificado el 23-10-2026'
    for d in ejercicios_usados(dias):
        if d not in {e['id'] for e in plan.get('ejercicios') or []}:
            avisos.append('ejercicio sin explicar en plan.ejercicios: %s' % d)
    # cada control medido es un punto de la gráfica «El 1.000, control a control» de Marcas (historial.evolucionEstimacion en la de Daniel)
    hist = dict(hist)
    hist['evolucionEstimacion'] = [{'fecha': c['fecha'], 'estimacion': c['tiempo'], 'medido': True, 'motivo': 'Control de 1.000 m'}
                                   for c in reversed(controles)]
    datos = {'version': 1, 'atleta': 'Cristina', 'plan': pub, 'historial': hist, 'web': {'dias': web_dias}, 'derivados': der,
             'fuente': {'construido': hoy}}
    return datos, errores, avisos


def ejercicios_usados(dias):
    out = []
    for d in dias:
        for x in d.get('ej') or []:
            if x not in out:
                out.append(x)
    return out


def pasos_web(P):
    """Pasos de pasos_de() en la forma de web.dias[f].pasos de Daniel: {t, d, timer (s), enlace}; el calentamiento, en un grupo plegable."""
    out, grupo, cal, vistos = [], None, [], set()
    for x in P:
        o = {'t': x['t']}
        if x.get('d'):
            o['d'] = x['d']
        if x.get('seg'):
            o['timer'] = x['seg']
            if x.get('dist'):
                o['tras'] = True          # repetición de series: el temporizador es la recuperación, corre al acabarla
        if x.get('ej') and x['ej'] not in vistos:     # «Cómo se hace» solo la primera vez que sale cada ejercicio
            vistos.add(x['ej'])
            o['enlace'] = '#tecnica/ej/' + x['ej']
            o['enlaceTxt'] = 'Cómo se hace →'
        if x.get('parte') == 'calentamiento':
            if grupo is None:
                grupo = {'grupo': True, 't': 'Calentamiento', 'meta': '', 'pasos': []}
                out.append(grupo)
            grupo['pasos'].append(o)
            cal.append(x['t'])
        else:
            out.append(o)
    if grupo:
        grupo['meta'] = ' · '.join(c for c in cal if not c.startswith('Pausa')).lower()
    return out


def pts_txt(p):
    return '0 puntos: elimina' if p == 0 else ('1 punto' if p == 1 else '%s puntos' % p)


# ---------------------------------------------------------------------------------------------- ensamblado
def sustituir(txt, viejo, nuevo, donde, veces=None):
    n = txt.count(viejo)
    if n == 0 or (veces is not None and n != veces):
        raise SystemExit('ERROR: %s ya no contiene «%s» (%d veces): revisa web/cristina/construir.py' % (donde, viejo[:70], n))
    return txt.replace(viejo, nuevo)


def ensamblar(datos, B, modulos):
    head = leer(os.path.join(SRC_D, '00_head.html'))
    head = sustituir(head, '<title data-inv="C1">Plan Cádiz</title>', '<title>Plan 2027</title>', '00_head.html')
    head = sustituir(head, 'content="Plan de preparación física para las pruebas de la Escala Básica: 1.000 m, dominadas y circuito"',
                     'content="Plan de carrera de un año para el 1.000 m de las pruebas físicas de la Escala Básica"', '00_head.html')
    head = sustituir(head, '<meta name="apple-mobile-web-app-title" content="Plan Cádiz">', '<meta name="apple-mobile-web-app-title" content="Plan 2027">', '00_head.html')
    head = sustituir(head, "localStorage.getItem('pc-tema')", "localStorage.getItem('cr-tema')", '00_head.html')

    shell = leer(os.path.join(SRC_D, '20_shell.html'))
    shell = sustituir(shell, '<span class="brand-t">Plan Cádiz</span>', '<span class="brand-t">Plan 2027</span>', '20_shell.html')
    shell = sustituir(shell, '<a aria-current="page">Daniel</a><a href="cristina/">Cristina</a>', '<a href="../">Daniel</a><a aria-current="page">Cristina</a>',
                      '20_shell.html', veces=2)

    # CSS: los de Daniel en sus capas y los de Cristina en la capa «cristina», detrás
    dcss = os.path.join(SRC_D, 'css')
    css_d = sorted(f for f in os.listdir(dcss) if f.endswith('.css') and B.capa_de(f) in ('sistema', 'modulos'))
    ccss = os.path.join(SRC_C, 'css')
    css_c = sorted(f for f in os.listdir(ccss) if f.endswith('.css')) if os.path.isdir(ccss) else []
    partes = ['@layer sistema, modulos, cristina;']
    for f in css_d:
        partes.append('@layer %s{\n%s\n}' % (B.capa_de(f), B.min_css(leer(os.path.join(dcss, f)), f)))
    for f in css_c:
        cuerpo = leer(os.path.join(ccss, f))
        if re.search(r'@(import|layer)\b', re.sub(r'/\*.*?\*/', '', cuerpo, flags=re.S)):
            raise SystemExit('ERROR: %s usa @import o @layer: el constructor ya lo pone en la capa «cristina»' % f)
        partes.append('@layer cristina{\n%s\n}' % B.min_css(cuerpo, f))
    css = '\n'.join(partes)
    fuera = B.css_fuera_de_capa(css)
    if fuera:
        raise SystemExit('ERROR: CSS fuera de capa: %s' % fuera[:120])
    head = head.replace('/*__CSS__*/', css)

    for v in VISTAS:   # las vistas de Daniel tal cual: mismo menú, misma estructura
        shell = sustituir(shell, '<!--__VISTA:%s-->' % v, leer(os.path.join(SRC_D, 'views', v + '.html')).strip(), '20_shell.html', veces=1)

    # JS: núcleo de Daniel (con el prefijo de almacenamiento de Cristina), los de Cristina y el arranque de Daniel
    core = leer(os.path.join(SRC_D, 'js', '00_core.js'))
    core = sustituir(core, "function k(c) { return /^pc-/.test(c) ? c : 'pc-' + c; }", "function k(c) { return /^cr-/.test(c) ? c : 'cr-' + c; }", '00_core.js', veces=1)
    # detrás del núcleo, los ajustes de Cristina (10_cristina.js); después TODOS los módulos de Daniel, sin copiarlos
    archivos = [('00_core.js', core), ('10_cristina.js', leer(os.path.join(SRC_C, 'js', '10_cristina.js')))]
    djs = os.path.join(SRC_D, 'js')
    for f in sorted(x for x in os.listdir(djs) if x.endswith('.js') and x != '00_core.js'):
        vista = {v: k for k, v in MOD_DE.items()}.get(f)
        if vista and modulos is not None and vista not in modulos:
            continue
        archivos.append((f, leer(os.path.join(djs, f))))
    # módulos propios de Cristina (60_consejo.js…): detrás de los de Daniel y delante del arranque, que lanza la primera vista
    cjs = os.path.join(SRC_C, 'js')
    extra = [(f, leer(os.path.join(cjs, f))) for f in sorted(os.listdir(cjs)) if f.endswith('.js') and f != '10_cristina.js']
    i99 = next((i for i, (f, _) in enumerate(archivos) if f.startswith('99_')), len(archivos))
    archivos[i99:i99] = extra
    scripts = []
    for f, cuerpo in archivos:
        if re.search(r'</script', cuerpo, re.I):
            raise SystemExit('ERROR: %s contiene «</script»; escríbelo como «<\\/script»' % f)
        salida = B.min_js(cuerpo, f)
        scripts.append('<script data-mod="%s" data-sha="%s">\n%s\n</script>' % (f, B.sha12(cuerpo), salida))
    head, shell = B.min_html(head), B.min_html(shell)
    txt = json.dumps(datos, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/').replace('<!--', '\\u003c!--')
    shell = sustituir(shell, '<!--__DATOS__-->', '<script id="datos" type="application/json">' + txt + '</script>', '20_shell.html', veces=1)
    shell = sustituir(shell, '<!--__JS__-->', '\n'.join(scripts), '20_shell.html', veces=1)
    return head + shell


def comprobar_privacidad(pagina, privado):
    def valores(o):
        if isinstance(o, dict):
            for v in o.values():
                yield from valores(v)
        elif isinstance(o, list):
            for v in o:
                yield from valores(v)
        elif o not in (None, '', True, False):
            yield str(o)
    return ['privacidad: la página contiene «%s» (de privado.json)' % v for v in valores(privado.get('vigilar', {})) if v and v in pagina]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--hoy', help='fecha de construcción (AAAA-MM-DD); por defecto, la del día')
    ap.add_argument('--salida', default=SALIDA)
    ap.add_argument('--modulos', help='solo estos módulos de pestaña, separados por comas (pruebas)')
    ap.add_argument('--sin-minificar', action='store_true')
    ap.add_argument('--datos', help='vuelca el bloque de datos en este archivo (para revisar)')
    a = ap.parse_args()
    hoy = a.hoy or dt.date.today().isoformat()
    plan = leer_json(os.path.join(DATOS, 'plan.json'))
    hist = leer_json(os.path.join(DATOS, 'historial.json'), {'carrera': [], 'controles': []})
    privado = leer_json(os.path.join(DATOS, 'privado.json'), {})
    datos, errores, avisos = construir(plan, hist, hoy)
    for x in avisos:
        print('AVISO:', x)
    if errores:
        print('ERRORES (%d)' % len(errores))
        for x in errores:
            print('  x', x)
        sys.exit(1)
    if a.datos:
        with open(a.datos, 'w', encoding='utf-8') as f:
            json.dump(datos, f, ensure_ascii=False, indent=1)
    B = cargar_build()
    B.MINIFICAR = not a.sin_minificar
    modulos = set(a.modulos.split(',')) if a.modulos else None
    pagina = ensamblar(datos, B, modulos)
    for x in B._MIN_INFO:
        print(x)
    # los valores vigilados se buscan en los DATOS de la página: el código de Daniel nombra campos genéricos («FC media», «VO2»)
    priv = comprobar_privacidad(json.dumps(datos, ensure_ascii=False), privado)
    if priv:
        print('ERRORES (%d)' % len(priv))
        for x in priv:
            print('  x', x)
        sys.exit(1)
    os.makedirs(os.path.dirname(os.path.abspath(a.salida)), exist_ok=True)
    with open(a.salida, 'w', encoding='utf-8') as f:
        f.write(pagina)
    crudo = len(pagina.encode('utf-8'))
    comp = len(gzip.compress(pagina.encode('utf-8'), 9))
    nd = sum(1 for d in datos['derivados']['dias'] if d.get('cr'))
    print('%s · %.1f KB · %.1f KB con gzip%s · %d días de carrera · %d controles hechos · construido %s' % (
        os.path.relpath(a.salida, RAIZ), crudo / 1024, comp / 1024, '' if comp <= LIMITE_GZIP else ' (PASA DEL LÍMITE)', nd,
        len(datos['derivados']['controlesHechos']), hoy))


if __name__ == '__main__':
    main()

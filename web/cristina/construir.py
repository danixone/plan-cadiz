#!/usr/bin/env python3
"""Construye docs/cristina/index.html: el plan de carrera de Cristina.

Lee datos/cristina/plan.json y datos/cristina/historial.json (públicos) y reutiliza el sistema de
diseño de la web de Daniel (web/src/css/10_sistema.css). Los datos personales de Cristina viven en
datos/cristina/privado.json, que está en .gitignore: el constructor se para si alguno de sus valores
aparece en la página.

Uso: python3 web/cristina/construir.py            (escribe docs/cristina/index.html)
"""
import html
import json
import os
import re
import sys

RAIZ = os.environ.get('PLAN_RAIZ', os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATOS = os.path.join(RAIZ, 'datos', 'cristina')
SALIDA = os.path.join(RAIZ, 'docs', 'cristina', 'index.html')
CSS_SISTEMA = os.path.join(RAIZ, 'web', 'src', 'css', '10_sistema.css')
CSS_PROPIO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'estilo.css')
JS_PROPIO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pagina.js')


def leer(ruta, defecto=None):
    if not os.path.exists(ruta):
        return defecto
    with open(ruta, encoding='utf-8') as f:
        return json.load(f)


def e(t):
    return html.escape(str(t if t is not None else ''), quote=True)


def seg(txt):
    """'4:45' → 285"""
    m = re.match(r'^\s*(\d+):(\d{2})(?:[,.](\d))?\s*$', str(txt or ''))
    if not m:
        return None
    return int(m.group(1)) * 60 + int(m.group(2)) + (int(m.group(3)) / 10 if m.group(3) else 0)


def mmss(s, dec=False):
    if s is None:
        return ''
    if dec:
        s = round(s, 1)
        m, r = divmod(s, 60)
        txt = '%d:%04.1f' % (m, r)
        return txt.replace('.', ',')
    s = int(round(s))
    return '%d:%02d' % divmod(s, 60)


def puntos(t, tramos):
    for tr in tramos:
        lo = seg(tr['desde']) if tr.get('desde') else None
        hi = seg(tr['hasta']) if tr.get('hasta') else None
        if (lo is None or t >= lo) and (hi is None or t <= hi):
            return tr['puntos']
    return None


def main():
    plan = leer(os.path.join(DATOS, 'plan.json'))
    hist = leer(os.path.join(DATOS, 'historial.json'), {'carrera': [], 'controles': []})
    privado = leer(os.path.join(DATOS, 'privado.json'), {})
    errores = []

    tramos = plan['baremo1000Mujeres']['tramos']
    controles = sorted([c for c in hist.get('controles', []) if seg(c.get('tiempo'))], key=lambda c: c['fecha'])
    ult = controles[-1] if controles else None
    # reglas[ritmos]: K es el mejor de los dos últimos controles
    dos = controles[-2:]
    mejor = min(dos, key=lambda c: seg(c['tiempo'])) if dos else None
    t_k = seg(mejor['tiempo']) if mejor else None

    # ---------- ritmos derivados del último control (reglas[ritmos]: O = K − 2 s por 400) ----------
    ritmos = None
    if t_k:
        k400 = t_k * 0.4
        o400 = k400 - 2
        ritmos = {
            'K': {d: t_k * d / 1000 for d in (200, 300, 400, 600, 800, 1000)},
            'K4': {d: (k400 + 4) * d / 400 for d in (200, 300, 400, 600, 800, 1000)},
            'O': {d: o400 * d / 400 for d in (200, 300, 400, 600, 800, 1000)},
            'umbral': (t_k * 1.20, t_k * 1.25),
        }

    # ---------- datos para el JS (solo lo público) ----------
    dias = []
    for w in plan['calendario']:
        for d in w['dias']:
            dias.append({k: d.get(k) for k in ('fecha', 'dia', 'tipo', 'titulo', 'detalle', 'objetivo') if d.get(k)})
            dias[-1]['sem'] = w['n']
            dias[-1]['fase'] = w['fase']
            if w.get('descarga'):
                dias[-1]['descarga'] = True
    hechos = {c['fecha']: c for c in hist.get('carrera', [])}
    for c in controles:
        hechos.setdefault(c['fecha'], {'fecha': c['fecha'], 'hecho': True, 'resumen': 'Control: ' + c['tiempo']})
    datos_js = {
        'dias': dias,
        'fases': plan['fases'],
        'hechos': {f: {'hecho': v.get('hecho', True), 'resumen': v.get('resumen') or v.get('sesion') or ''} for f, v in hechos.items()},
        'prueba': plan['objetivo'].get('fechaSupuesta'),
    }

    # ---------- HTML ----------
    h = []
    h.append('<header class="cr-top"><div class="container">')
    h.append('<nav class="atleta" aria-label="De quién es el plan"><a href="../">Daniel</a><a aria-current="page">Cristina</a></nav>')
    h.append('<h1>Plan de carrera · Cristina</h1>')
    h.append('<p class="muted">%s. Solo carrera: %s.</p>' % (e(plan['objetivo']['prueba']), e(plan['meta'].get('diasCarrera', ''))))
    h.append('<nav class="cr-sub" aria-label="Secciones"><a href="#hoy">Hoy</a><a href="#plan">Plan</a><a href="#ritmos">Ritmos</a><a href="#reglas">Reglas</a><a href="#registro">Registro</a></nav>')
    h.append('</div></header><main class="container">')

    # Hoy
    h.append('<section id="hoy" class="cr-sec"><h2 class="vh-oculto">Hoy</h2><div id="cr-hoy" class="card cr-hoy"><p class="muted">Cargando el día…</p></div>')
    h.append('<div id="cr-semana" class="cr-semana" aria-label="Esta semana"></div>')
    h.append('<div id="cr-cuenta" class="cr-cuenta"></div></section>')

    # Objetivo y escalones
    h.append('<section class="cr-sec"><h2>El objetivo</h2>')
    h.append('<p>%s</p><ol class="cr-esc">' % e(plan['objetivo']['porQue']))
    exp_txt = plan['objetivo'].get('expectativa')
    for s in plan['objetivo']['escalones']:
        h.append('<li><b class="num">%s</b> %s</li>' % (e(s['marca']), e(s['que'])))
    h.append('</ol>' + ('<div class="aviso"><div><b>Qué esperar.</b> %s</div></div>' % e(exp_txt) if exp_txt else '') + '<p class="faint">Fecha: %s.</p></section>' % e(plan['objetivo']['fecha']))

    # Plan: fases y semanas
    h.append('<section id="plan" class="cr-sec"><h2>Plan</h2><div class="cr-fases">')
    for f in plan['fases']:
        w0 = plan['calendario'][f['desde'] - 1]['desde']
        w1 = plan['calendario'][f['hasta'] - 1]['dias'][-1]['fecha']
        h.append('<div class="cr-fase" data-fase="%s"><b>%s · %s</b><span class="faint">semanas %d-%d · %s a %s</span><span>%s</span></div>' % (
            e(f['id']), e(f['id']), e(f['nombre']), f['desde'], f['hasta'], fecha_corta(w0), fecha_corta(w1), e(f['objetivo'])))
    h.append('</div><h3>Semana tipo</h3><ul class="cr-tipo">')
    for s in plan['semanaTipo']:
        h.append('<li><b>%s</b> %s</li>' % (e(s['dia']), e(s['que'])))
    h.append('</ul><h3>Las 52 semanas</h3>')
    for f in plan['fases']:
        h.append('<details class="acc cr-acc" data-fase="%s"><summary><b>%s · %s</b> <span class="faint">semanas %d-%d</span></summary>' % (
            e(f['id']), e(f['id']), e(f['nombre']), f['desde'], f['hasta']))
        for w in plan['calendario'][f['desde'] - 1:f['hasta']]:
            h.append('<div class="cr-wk" data-sem="%d"><p class="cr-wk-t"><b>Semana %d</b> · desde el %s%s</p><ul>' % (
                w['n'], w['n'], fecha_corta(w['desde']), ' · <span class="chip">descarga</span>' if w.get('descarga') else ''))
            for d in w['dias']:
                if d['tipo'] == 'otro':
                    continue
                cls = {'control': 'ctl', 'prueba': 'ctl', 'calidad': 'cal'}.get(d['tipo'], 'sua')
                h.append('<li class="cr-d %s" data-fecha="%s"><span class="cr-d-f">%s %s</span><span>%s</span></li>' % (
                    cls, e(d['fecha']), e(d['dia']), fecha_corta(d['fecha']), e(d['titulo'])))
            h.append('</ul></div>')
        h.append('</details>')
    h.append('</section>')

    # Ritmos
    h.append('<section id="ritmos" class="cr-sec"><h2>Ritmos</h2>')
    if ritmos:
        h.append('<p>Último control: <b class="num">%s</b> el %s (%s). Ritmo K: <b class="num">%s</b>, el mejor de los dos últimos controles.</p>' % (
            e(ult['tiempo']), fecha_corta(ult['fecha']), pts_txt(puntos(seg(ult['tiempo']), tramos)), mmss(t_k)))
        h.append('<table class="cr-tab"><thead><tr><th>Distancia</th><th>K</th><th>K + 4</th><th>O</th></tr></thead><tbody>')
        for d in (200, 300, 400, 600, 800, 1000):
            h.append('<tr><td class="num">%s m</td><td class="num">%s</td><td class="num">%s</td><td class="num">%s</td></tr>' % (
                '{:,}'.format(d).replace(',', '.'), mmss(ritmos['K'][d], d <= 400), mmss(ritmos['K4'][d], d <= 400), mmss(ritmos['O'][d], d <= 400)))
        h.append('</tbody></table><p>Umbral: <b class="num">%s a %s</b> por kilómetro.</p>' % (mmss(ritmos['umbral'][0]), mmss(ritmos['umbral'][1])))
        h.append('<p class="faint">K: el mejor de tus dos últimos controles. K + 4: 4 s más por cada 400. O: K menos 2 s por cada 400 (desde junio). Umbral: K más un 20-25 % por kilómetro.</p>')
    else:
        h.append('<div class="aviso"><div><b>Sin control todavía.</b> Los ritmos salen del primer control de 1.000 m, el %s en Arucas. Hasta entonces, todo por sensación.</div></div>' % fecha_corta(plan['objetivo']['primerControl']))
    h.append('<h3>Baremo del 1.000 m, mujeres</h3><div class="cr-bar" role="img" aria-label="Baremo del 1.000 m de mujeres">')
    for tr in tramos:
        txt = ('%s o menos' % tr['hasta']) if not tr.get('desde') else (('%s o más' % tr['desde']) if not tr.get('hasta') else '%s-%s' % (tr['desde'], tr['hasta']))
        aqui = ult is not None and puntos(seg(ult['tiempo']), tramos) == tr['puntos']
        h.append('<div class="cr-tr%s%s" data-pts="%d"><b>%d</b><span class="num">%s</span>%s</div>' % (
            ' elim' if tr.get('elimina') else '', ' aqui' if aqui else '', tr['puntos'], tr['puntos'], e(txt), '<small>elimina</small>' if tr.get('elimina') else ''))
    h.append('</div><p class="faint">%s %s %s</p>' % (e(plan['baremo1000Mujeres']['reglasBOE']), e(plan['baremo1000Mujeres']['calificacion']), e(plan['baremo1000Mujeres']['fuente'])))
    h.append('</section>')

    # Reglas, glosario y reloj
    h.append('<section id="reglas" class="cr-sec"><h2>Reglas</h2>')
    for r in plan['reglas']:
        h.append('<div class="card flat cr-regla"><b>%s</b><p>%s</p></div>' % (e(r['titulo']), e(r['texto'])))
    h.append('<h3>Qué significa cada palabra</h3><dl class="cr-glo">')
    for g in plan['glosario']:
        h.append('<dt>%s</dt><dd>%s</dd>' % (e(g['t']), e(g['d'])))
    h.append('</dl><h3>El reloj (%s)</h3><ul class="cr-reloj">' % e(plan['reloj']['modelo']))
    for p in plan['reloj']['pasos']:
        h.append('<li>%s</li>' % e(p))
    h.append('</ul><p class="faint">%s</p></section>' % e(plan['reloj']['nota']))

    # Registro
    h.append('<section id="registro" class="cr-sec"><h2>Registro</h2>')
    if controles:
        h.append('<h3>Controles de 1.000 m</h3><ul class="cr-reg">')
        for c in reversed(controles):
            h.append('<li><b class="num">%s</b> · %s · %s%s</li>' % (e(c['tiempo']), fecha_corta(c['fecha']), pts_txt(puntos(seg(c['tiempo']), tramos)),
                                                                         (' · ' + e(c['valoracion'])) if c.get('valoracion') else ''))
        h.append('</ul>')
    car = sorted(hist.get('carrera', []), key=lambda c: c['fecha'], reverse=True)
    if car:
        h.append('<h3>Sesiones</h3><ul class="cr-reg">')
        for c in car:
            h.append('<li><b>%s</b> · %s%s</li>' % (fecha_corta(c['fecha']), e(c.get('sesion', '')), (' · ' + e(c['valoracion'])) if c.get('valoracion') else ''))
        h.append('</ul>')
    if not controles and not car:
        h.append('<p class="muted">Todavía no hay sesiones registradas.</p>')
    pend = plan.get('pendientes') or []
    if pend:
        h.append('<h3>Pendiente</h3><ul class="cr-reg">' + ''.join('<li>%s</li>' % e(p['texto']) for p in pend) + '</ul>')
    h.append('</section>')
    h.append('<footer class="cr-pie faint">Plan de carrera hecho el %s. Solo carrera: barra, circuito y CrossFit los lleva ella aparte.</footer>' % fecha_corta(plan['meta']['creado']))
    h.append('</main>')

    cuerpo = '\n'.join(h)
    pagina = PLANTILLA.replace('/*__CSS__*/', open(CSS_SISTEMA, encoding='utf-8').read() + '\n' + open(CSS_PROPIO, encoding='utf-8').read())
    pagina = pagina.replace('<!--__CUERPO__-->', cuerpo)
    pagina = pagina.replace('/*__DATOS__*/', json.dumps(datos_js, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))
    pagina = pagina.replace('/*__JS__*/', open(JS_PROPIO, encoding='utf-8').read())

    # privacidad: ningún valor de privado.json puede salir en la página
    def valores(o):
        if isinstance(o, dict):
            for v in o.values():
                yield from valores(v)
        elif isinstance(o, list):
            for v in o:
                yield from valores(v)
        elif o not in (None, '', True, False):
            yield str(o)
    for v in valores(privado.get('vigilar', {})):
        if v and v in pagina:
            errores.append('privacidad: la página contiene «%s» (de privado.json)' % v)

    if errores:
        print('ERRORES (%d)' % len(errores))
        for x in errores:
            print('  x', x)
        sys.exit(1)
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, 'w', encoding='utf-8') as f:
        f.write(pagina)
    print('docs/cristina/index.html · %.1f KB · %d días · %d controles' % (len(pagina.encode()) / 1024, len(dias), len(controles)))


def pts_txt(p):
    return '0 puntos: elimina' if p == 0 else ('1 punto' if p == 1 else '%s puntos' % p)


MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']


def fecha_corta(iso):
    a, m, d = iso.split('-')
    return '%d %s' % (int(d), MESES[int(m) - 1]) + ('' if a == '2026' else ' ' + a)


PLANTILLA = '''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Plan de carrera</title>
<meta name="description" content="Plan de carrera de un año para el 1.000 m de las pruebas físicas de la Escala Básica">
<meta name="theme-color" content="#F3F5F8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B1117" media="(prefers-color-scheme: dark)">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&display=swap" rel="stylesheet">
<style>
/*__CSS__*/
</style>
</head>
<body class="cr">
<!--__CUERPO__-->
<script>window.CR=/*__DATOS__*/;</script>
<script>
/*__JS__*/
</script>
</body>
</html>
'''

if __name__ == '__main__':
    main()

"""Láminas técnicas I5 (dominada, 4 paneles) e I6 (sentadilla, peso muerto rumano, remo con barra, elevación de talón).

Convención (§7.3): figura en gris maniquí; número negro = regla del BOE; letra azul = consejo del plan;
PI-1..PI-3 = posición inicial del BOE; aspa roja = nula o «lo que no»; verde = cota o referencia correcta.
La leyenda NO va en el SVG: la pinta 16_ilustracion.js en HTML con el texto literal de plan.json.

Fuentes de lo que se dibuja (se comprueban en exportar.py contra plan.json):
  I5: protocoloDominadas.tecnicaExamen (BOE-A-2026-15055, anexo, segundo ejercicio) y
      ejercicios[dominadas-lastradas].tecnica[1] (a: bajar los omóplatos) y [2] (b: codos a las costillas).
  I6: ejercicios[<id>].tecnica[i]; la letra de cada marca es la de la línea (a = primera línea).
      Solo se dibujan ángulos que el plan da: remo «45° o menos», sentadilla «paralelo».
Cada panel mide 360 × 330. Los ids internos llevan el prefijo del panel; el JS los hace únicos por página.
"""
import math
from rig import (figure, figure_front, MANI, n, P, rot, lerp, straight, ik, LTR)
from marcas import (marca, insignia, guia, aspa, flecha, arco, linea, texto, suelo, FS)

W, H = 360, 330
OK, BAD, PRI, REF = 'var(--ok)', 'var(--bad)', 'var(--primary)', 'var(--text-3)'


def tr(p, s, o):
    return (o[0] + p[0] * s, o[1] + p[1] * s)


def svg(pid, body, titulo, clip=False):
    c = ''
    if clip:
        c = f'<defs><clipPath id="{pid}-c"><rect width="{W}" height="{H}"/></clipPath></defs>'
        body = f'<g clip-path="url(#{pid}-c)">{body}</g>'
    return (f'<svg class="ill ill-lam" viewBox="0 0 {W} {H}" role="img" aria-labelledby="{pid}-t" data-ref="{W}">'
            f'<title id="{pid}-t">{titulo}</title>{c}{body}</svg>')


# ---------------------------------------------------------------- barra de dominadas
def barra_seccion(x, y, r=4.6, piel='var(--ill-m-piel)', w=3.4):
    """Vista de perfil: la barra se ve de sección (círculo) y los dedos la rodean por encima (§7.3)."""
    rr = r + w / 2 + .3
    arc = f'M{n(x-rr)} {n(y+r*.35)}A{n(rr)} {n(rr)} 0 0 1 {n(x+rr)} {n(y+r*.35)}'
    return (f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r)}" style="fill:var(--ill-hierro)"/>'
            f'<path class="il" d="{arc}" style="stroke:var(--ill-m-osc)" stroke-width="{n(w+2)}"/>'
            f'<path class="il" d="{arc}" style="stroke:{piel}" stroke-width="{n(w)}"/>')


# ---------------------------------------------------------------- I5 · panel 1: abajo
def dom_abajo():
    pid = 'i5-1'
    s, o = 1.5, (112, 0)
    S0 = (0, -130)
    Hn = straight(S0, (3, -51))
    ybar = 34
    o = (o[0], ybar - Hn[1] * s)
    pose = dict(hip=(0, -84), lean=0, A1=(2, -5), kb1=-1, fa1=66, A2=(0, -4), kb2=-1, fa2=72,
                H1=Hn, eb1=1, H2=Hn, eb2=1)
    fig, J = figure(pose, c=MANI, expr='neutro', s=s, tx=o[0], ty=o[1], sombra=False)
    bar = tr(Hn, s, o)
    g = [fig, barra_seccion(bar[0], bar[1])]
    # 2 · cuerpo extendido y perpendicular al suelo: recta a lo largo de la espalda
    xb = tr((-21, 0), s, o)[0]
    top2, bot2 = tr((0, -128), s, o)[1], tr((0, 4), s, o)[1]
    g.append(marca('2', 'boe', (40, tr((0, -60), s, o)[1]), target=(xb, tr((0, -60), s, o)[1]),
                   geom=linea([(xb, top2), (xb, bot2)], OK, 2.2, dash='6 5')))
    # 1 · brazos completamente extendidos: hombro, codo y muñeca en la misma recta
    Sp, E, Hp = tr(J['S'], s, o), tr(J['E1'], s, o), tr(J['H1'], s, o)
    geom1 = linea([Sp, Hp], OK, 2.4)
    for q in (Sp, E, Hp):
        geom1 += f'<circle cx="{n(q[0])}" cy="{n(q[1])}" r="3.4" style="fill:var(--ok);stroke:var(--surface)" stroke-width="1.5"/>'
    geom1 += texto(226, E[1] + 34, 'extendido', OK, FS, 700, 'middle')
    g.append(marca('1', 'boe', (226, E[1]), target=(E[0] + 5, E[1]), geom=geom1, dot=False))
    # a · consejo del plan: el tirón empieza bajando los omóplatos
    sc0 = tr((-9, -128), s, o); sc1 = tr((-9, -112), s, o)
    g.append(marca('a', 'plan', (44, sc0[1] + 8), target=None,
                   geom=flecha([(sc0[0] - 10, sc0[1] - 2), (sc0[0] - 10, sc1[1] + 2)], PRI, 2.6, 8)
                   + guia((sc0[0] - 14, (sc0[1] + sc1[1]) / 2), (44, sc0[1] + 8), 'plan', dot=False)))
    # 6 y 7 · pausa abajo: mínima (sin rebote) y nunca más de 5 s colgado
    x0, x1, yt = 184, 344, 272
    t0, t1 = 0.0, 6.5
    X = lambda t: x0 + (t - t0) / (t1 - t0) * (x1 - x0)
    geom = []
    geom.append(f'<rect x="{n(X(0))}" y="{yt-5}" width="{n(X(.45)-X(0))}" height="10" rx="2" style="fill:var(--bad)"/>')
    geom.append(f'<rect x="{n(X(.45)+1.5)}" y="{yt-5}" width="{n(X(5)-X(.45)-3)}" height="10" rx="2" style="fill:var(--ok)"/>')
    geom.append(f'<rect x="{n(X(5))}" y="{yt-5}" width="{n(X(t1)-X(5))}" height="10" rx="2" style="fill:var(--bad)"/>')
    g6 = ''.join(geom[:2]) + texto((X(.45) + X(5)) / 2, yt + 25, 'pausa', OK, FS, 700, 'middle')
    g7 = geom[2] + linea([(X(5), yt - 12), (X(5), yt + 12)], 'var(--text)', 2) + texto(X(5), yt + 25, '5 s', 'var(--text)', FS, 700, 'middle')
    g.append(marca('6', 'boe', (X(1.1), yt - 32), target=(X(1.1), yt - 6), geom=g6))
    g.append(marca('7', 'boe', (X(5.5), yt - 32), target=(X(5.5), yt - 6), geom=g7))
    g.append(texto(x1, yt - 54, 'entre repeticiones', REF, FS, None, 'end'))
    g.append(texto(x0, yt + 25, '0', REF, FS, None, 'middle'))
    return dict(id=pid, titulo='Abajo, antes de cada repetición', sub='Reglas 1, 2, 6 y 7 · consejo a',
                svg=svg(pid, ''.join(g), 'Dominada, abajo: brazos extendidos, cuerpo extendido y pausa corta'),
                marcas=['1', '2', '6', '7', 'a'])


# ---------------------------------------------------------------- I5 · panel 2: arriba
ARRIBA_BAR = (11.5, -131.7)     # centro de la barra: tercio inferior del cuello (base -130, mandíbula -140)
MUNECA = (10.2, -128.6)         # la muñeca queda algo por debajo y detrás: los dedos rodean la barra por encima


def pose_arriba(extra=None):
    p = dict(hip=(0, -84), lean=-2, A1=(4, -6), kb1=-1, fa1=62, A2=(1, -4), kb2=-1, fa2=70,
             H1=MUNECA, eb1=1, H2=MUNECA, eb2=1)
    if extra:
        p.update(extra)
    return p


def dom_arriba():
    pid = 'i5-2'
    s = 3.0
    o = (160, 160 + 130 * s)
    fig, J = figure(pose_arriba(dict(cuello=10.5)), c=MANI, expr='neutro', s=s, tx=o[0], ty=o[1], sombra=False)
    bar = tr(ARRIBA_BAR, s, o)
    g = [fig, barra_seccion(bar[0], bar[1], 2.3 * s, 'var(--ill-m-piel)', 2.4 * s)]
    # 5 · barbilla claramente por encima y barra al tercio inferior del cuello
    yb = tr((0, -130), s, o)[1]; yj = tr((0, -140), s, o)[1]
    tercio = (yb - yj) / 3
    xs = o[0] - 30
    g5 = [linea([(xs, yb), (xs, yj)], REF, 1.6)]
    for i in range(4):
        g5.append(linea([(xs - 5, yb - i * tercio), (xs + 5, yb - i * tercio)], REF, 1.6))
    g5.append(f'<rect x="{n(xs-4)}" y="{n(yb-tercio)}" width="8" height="{n(tercio)}" rx="2" style="fill:var(--ok)"/>')
    g5.append(linea([(xs + 8, bar[1]), (bar[0] - 8, bar[1])], OK, 1.8, dash='2 4'))
    g5.append(texto(xs - 12, bar[1] - 14, 'tercio|inferior|del cuello', OK, FS, 700, 'end'))
    ych = tr((0, -141.2), s, o)[1]
    ybt = bar[1] - 2.3 * s
    xr = 286
    g5.append(linea([(o[0] + 13 * s + 2, ych), (xr + 6, ych)], OK, 1.6, dash='4 3'))
    g5.append(linea([(bar[0] + 8, ybt), (xr + 6, ybt)], OK, 1.6, dash='4 3'))
    g5.append(flecha([(xr, ybt - 1), (xr, ych + 2)], OK, 2, 6))
    g.append(marca('5', 'boe', (xr + 30, (ych + ybt) / 2), geom=''.join(g5)))
    # 4 · cabeza en posición anatómica: la mirada sale horizontal
    eye = tr((12.3, -148.6), s, o)
    g.append(marca('4', 'boe', (xr + 30, eye[1]),
                   geom=linea([(eye[0] + 5, eye[1]), (xr + 18, eye[1])], OK, 2, dash='3 4')))
    # b · consejo del plan: codos hacia las costillas, pecho a la barra
    E = tr(J['E1'], s, o)
    g.append(marca('b', 'plan', (xr + 30, E[1] - 20), target=E,
                   geom=flecha([(E[0] + 26, E[1] - 44), (E[0] + 6, E[1] - 10)], PRI, 2.6, 8, curva=(E[0] + 26, E[1] - 18))))
    return dict(id=pid, titulo='Arriba', sub='Reglas 4 y 5 · consejo b',
                svg=svg(pid, ''.join(g), 'Dominada, arriba: la barbilla supera la barra, que queda al tercio inferior del cuello', clip=True),
                marcas=['4', '5', 'b'])


# ---------------------------------------------------------------- I5 · panel 3: agarre, de frente
def dom_agarre():
    pid = 'i5-3'
    s = 1.3
    SL, SR = (-14, -128), (14, -128)
    HL = straight(SL, (-3.2, -51)); HR = straight(SR, (3.2, -51))
    ybar = 56
    o = (180, ybar - HL[1] * s)
    p = dict(HL=HL, HR=HR, ebL=1, ebR=-1, AL=(3.5, -5), AR=(-3.5, -5), kbL=1, kbR=-1, cruza=True)
    fig, J = figure_front(p, c=MANI, expr='neutro', s=s, tx=o[0], ty=o[1], sombra=False)
    hl, hr = tr(HL, s, o), tr(HR, s, o)
    sl, sr = tr(SL, s, o), tr(SR, s, o)
    g = [f'<path class="il" d="M{n(hl[0]-70)} {n(ybar)}H{n(hr[0]+70)}" style="stroke:var(--ill-hierro)" stroke-width="6"/>']
    ys, yg = 14, 30
    for x_ in (sl[0], sr[0]):
        g.append(linea([(x_, sl[1]), (x_, ys - 5)], REF, 1.2, dash='2 3'))
    g.append(fig)
    # manos: los dedos pasan por delante de la barra (palmas al frente)
    for h in (hl, hr):
        g.append(f'<rect x="{n(h[0]-6)}" y="{n(ybar-5)}" width="12" height="10" rx="4" style="fill:var(--ill-m-piel);stroke:var(--ill-m-osc)" stroke-width="1"/>')
    # PI-2 · agarre algo más ancho que los hombros: dos cotas apiladas
    geo = []
    geo.append(linea([(sl[0], ys), (sr[0], ys)], REF, 1.8))
    geo.append(texto(sl[0] - 10, ys + 5, 'hombros', REF, FS, None, 'end'))
    geo.append(linea([(hl[0], yg), (hr[0], yg)], OK, 2.2))
    geo.append(linea([(hl[0], yg - 6), (hl[0], yg + 6)], OK, 2.2))
    geo.append(linea([(hr[0], yg - 6), (hr[0], yg + 6)], OK, 2.2))
    geo.append(texto(hl[0] - 10, yg + 5, 'agarre', OK, FS, 700, 'end'))
    g.append(marca('PI-2', 'pi', (hr[0] + 44, yg), target=(hr[0] + 3, yg), geom=''.join(geo), dot=False))
    # PI-1 · palmas al frente
    g.append(marca('PI-1', 'pi', (60, 104), target=(hl[0] - 3, ybar + 6)))
    # PI-3 · se permite cruzar las piernas
    cr = tr((0, -14), s, o)
    g.append(marca('PI-3', 'pi', (78, cr[1] - 10), target=(cr[0] - 4, cr[1])))
    # 8 · calzado, sin guantes ni nada que ayude al agarre
    sh = tr((5, -2), s, o)
    g.append(marca('8', 'boe', (282, sh[1] - 8), target=(sh[0] + 6, sh[1])))
    g.append(marca('8', 'boe', (282, ybar + 44), target=(hr[0] + 5, ybar + 4)))
    return dict(id=pid, titulo='Agarre, de frente', sub='Posición inicial PI-1, PI-2 y PI-3 · regla 8',
                svg=svg(pid, ''.join(g), 'Dominada, de frente: palmas al frente y agarre algo más ancho que los hombros'),
                marcas=['PI-1', 'PI-2', 'PI-3', '8'])


# ---------------------------------------------------------------- I5 · panel 4: nulas
def mini_nula(kind, ox, ybar, s=.9):
    if kind == 'balanceo':
        Hn = (-7, -181)
        pose = dict(hip=(13, -86), lean=-15, A1=(46, -30), kb1=-1, fa1=40, A2=(42, -26), kb2=-1, fa2=44,
                    H1=Hn, eb1=1, H2=Hn, eb2=1)
    elif kind == 'codos':
        Hn = (8, -160)
        pose = dict(hip=(0, -84), A1=(2, -5), kb1=-1, fa1=66, A2=(0, -4), kb2=-1, fa2=72,
                    H1=Hn, eb1=1, H2=Hn, eb2=1)
    else:   # cabeza fuera de la posición anatómica: cuello estirado para pasar la barbilla
        Hn = ARRIBA_BAR
        pose = pose_arriba(dict(tilt=-34))
        pose.update(H1=MUNECA, H2=MUNECA)
    o = (ox, ybar - Hn[1] * s)
    fig, J = figure(pose, c=MANI, expr='neutro', s=s, tx=o[0], ty=o[1], sombra=False)
    bar = tr(Hn, s, o)
    g = [fig, barra_seccion(bar[0], bar[1], 4)]
    if kind == 'balanceo':
        g.append(flecha([(o[0] - 12, o[1] - 10), (o[0] + 50, o[1] - 42)], BAD, 2.2, 8, curva=(o[0] + 26, o[1] + 8)))
        foc = None
    elif kind == 'codos':
        E = tr(J['E1'], s, o)
        g.append(f'<circle cx="{n(E[0])}" cy="{n(E[1])}" r="12" style="fill:none;stroke:var(--bad)" stroke-width="2"/>')
    else:
        hd = tr((6, -154), s, o)
        g.append(f'<circle cx="{n(hd[0])}" cy="{n(hd[1])}" r="20" style="fill:none;stroke:var(--bad)" stroke-width="2"/>')
    return ''.join(g)


def dom_nulas():
    pid = 'i5-4'
    ybar = 46
    cols = [(64, 'balanceo', '3', 'balanceo'), (180, 'codos', '1', 'sin|extender'), (292, 'cabeza', '4', 'cuello|estirado')]
    g = []
    for x, kind, regla, lab in cols:
        fig = mini_nula(kind, x - 4, ybar)
        g.append(marca(regla, 'boe', (x + 18, 288), geom=fig + texto(x, 240, lab, BAD, FS, 700, 'middle'),
                       extra=aspa(x - 18, 288)).replace('<g class="ill-m"', '<g class="ill-m" data-nula="1"', 1))
    g.append(marca('9', 'boe', (24, 318), geom=texto(50, 323, 'un solo intento', 'var(--text-2)', FS, 700)))
    return dict(id=pid, titulo='Lo que el tribunal anula', sub='Reglas 3, 1 y 4 · regla 9',
                svg=svg(pid, ''.join(g), 'Dominadas nulas: balanceo, sin extender los brazos abajo y cuello estirado'),
                marcas=['3', '1', '4', '9'])


def dominada():
    return [dom_abajo(), dom_arriba(), dom_agarre(), dom_nulas()]


# ================================================================= I6
def disco(x, y, s, r=21.5):
    """Disco de la barra vista de lado. Se dibuja DETRÁS de la figura para no taparla."""
    return f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r*s)}" style="fill:var(--ill-disco);stroke:var(--border-strong)" stroke-width="1.5"/>'


def casquillo(x, y, s):
    """La barra de sección, delante de la figura."""
    return (f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(max(3.4, 3*s))}" style="fill:var(--ill-hierro);stroke:var(--surface)" stroke-width="1.2"/>')


def fase(fig):
    return f'<g class="ill-fase">{fig}</g>'


def lam(pid, titulo, sub, body, desc, marcas, clip=False):
    return dict(id=pid, titulo=titulo, sub=sub, svg=svg(pid, body, desc, clip), marcas=marcas)


def mini_col(x, lab, nid, fig, ylab=254, ymark=298):
    t = texto(x, ylab, lab, BAD, FS, 700, 'middle')
    return marca(nid, 'plan', (x + 18, ymark), geom=fig + t, extra=aspa(x - 18, ymark))


# ---------------------------------------------------------------- sentadilla
SENT_DE_PIE = dict(hip=(-2, -82.5), lean=4, A1=(1, -5), kb1=-1, fa1=0, A2=(0, -5), kb2=-1, fa2=0,
                   H1=(-8, -130.5), eb1=-1, H2=(-8, -130.5), eb2=-1, shx=4, shr=26)
SENT_ABAJO = dict(hip=(-18.2, -36.1), lean=42, tilt=-34, A1=(1, -5), kb1=-1, fa1=0, A2=(0, -5), kb2=-1, fa2=0,
                  H1=(5.6, -77.6), eb1=-1, H2=(5.6, -77.6), eb2=-1, shx=4, shr=30)
SENT_BAR = {'pie': (-8, -130.5), 'abajo': (7.0, -76.2)}


def sent_asi():
    pid = 'i6s-1'
    s, o = 1.62, (168, 312)
    g = [suelo(20, 340, o[1])]
    f0, J0 = figure(SENT_DE_PIE, c=MANI, s=s, tx=o[0], ty=o[1], sombra=False)
    f1, J1 = figure(SENT_ABAJO, c=MANI, s=s, tx=o[0], ty=o[1])
    b0, b1 = tr(SENT_BAR['pie'], s, o), tr(SENT_BAR['abajo'], s, o)
    g.append(disco(b1[0], b1[1], s))
    g.append(fase(f0 + casquillo(b0[0], b0[1], s)))
    g.append(f1 + casquillo(b1[0], b1[1], s))
    # c · baja sentándote hacia atrás hasta el muslo paralelo
    hp0, hp1 = tr(SENT_DE_PIE['hip'], s, o), tr(SENT_ABAJO['hip'], s, o)
    K = tr(J1['K2'], s, o)
    gc = (flecha([(hp0[0] - 6, hp0[1] + 6), (hp1[0] - 12, hp1[1] - 6)], PRI, 2.6, 9, curva=(hp0[0] - 44, hp0[1] + 30))
          + linea([(hp1[0] - 22, hp1[1]), (K[0] + 24, K[1])], OK, 2.4, dash='7 5')
          + texto(K[0] + 28, K[1] + 5, 'paralelo', OK, FS, 700))
    g.append(marca('c', 'plan', (40, hp1[1]), target=(hp1[0] - 22, hp1[1]), geom=gc, dot=False))
    # a · barra sobre el trapecio, nunca en el cuello
    g.append(marca('a', 'plan', (58, b1[1] - 92), target=(b1[0] - 3, b1[1] - 3)))
    # d · espalda neutra y talón en el suelo
    back0 = tr(J1['hip'], s, o)
    sh = tr(J1['S'], s, o)
    ux, uy = sh[0] - back0[0], sh[1] - back0[1]
    k = math.hypot(ux, uy); ux, uy = ux / k, uy / k
    off = (-uy * -19 * s * .9, ux * -19 * s * .9)
    pa = (back0[0] + off[0] - ux * 4, back0[1] + off[1] - uy * 4)
    pb = (sh[0] + off[0] + ux * 6, sh[1] + off[1] + uy * 6)
    heel = tr((-4, 0), s, o)
    gd = (linea([pa, pb], OK, 2.4)
          + f'<path class="ill-ref" d="M{n(heel[0]-9)} {n(heel[1])}H{n(heel[0]+12)}" style="stroke:var(--ok)" stroke-width="4"/>')
    g.append(marca('d', 'plan', (40, (pa[1] + pb[1]) / 2 - 6), target=lerp(pa, pb, .45), geom=gd))
    return lam(pid, 'Así: de pie y abajo', 'Consejos a, c y d · en gris claro, la posición de partida',
               ''.join(g), 'Sentadilla de perfil: barra sobre el trapecio, muslo paralelo, espalda neutra y talón apoyado',
               ['a', 'c', 'd'])


def sent_no():
    pid = 'i6s-2'
    s = .9
    y0 = 222
    g = [suelo(10, 350, y0)]
    # a · barra en el cuello
    p = dict(SENT_DE_PIE, H1=(-2, -138.5), H2=(-2, -138.5))
    f, J = figure(p, c=MANI, s=s, tx=62, ty=y0)
    b = tr((-2, -138.5), s, (62, y0))
    f = disco(b[0], b[1], s) + f + casquillo(b[0], b[1], s) + f'<circle cx="{n(b[0])}" cy="{n(b[1])}" r="12" style="fill:none;stroke:var(--bad)" stroke-width="2.2"/>'
    g.append(mini_col(62, 'barra en|el cuello', 'a', f))
    # d · talón despegado
    p = dict(SENT_ABAJO, A1=(3, -12), A2=(2, -12), fa1=26, fa2=26, H1=(5.6, -84), H2=(5.6, -84))
    p['hip'] = (-16, -43)
    f, J = figure(p, c=MANI, s=s, tx=178, ty=y0)
    bb = tr((7.0, -83), s, (178, y0))
    hl = tr((-3, -6), s, (178, y0))
    f = disco(bb[0], bb[1], s) + f + casquillo(bb[0], bb[1], s) + f'<circle cx="{n(hl[0])}" cy="{n(hl[1])}" r="12" style="fill:none;stroke:var(--bad)" stroke-width="2.2"/>'
    g.append(mini_col(178, 'talón|despegado', 'd', f))
    # e · la cadera sube antes que el pecho
    p = dict(hip=(-20, -62), lean=74, tilt=-50, A1=(1, -5), kb1=-1, fa1=0, A2=(0, -5), kb2=-1, fa2=0,
             H1=(4.2, -75), eb1=-1, H2=(4.2, -75), eb2=-1, shx=0, shr=26)
    f, J = figure(p, c=MANI, s=s, tx=296, ty=y0)
    hp = tr(p['hip'], s, (296, y0))
    bb = tr((6.4, -73.5), s, (296, y0))
    f = disco(bb[0], bb[1], s) + f + casquillo(bb[0], bb[1], s) + flecha([(hp[0] - 8, hp[1] + 26), (hp[0] - 8, hp[1] - 10)], BAD, 2.4, 8)
    g.append(mini_col(296, 'cadera antes|que el pecho', 'e', f))
    return lam(pid, 'Lo que no', 'Consejos a, d y e', ''.join(g),
               'Sentadilla, errores: barra en el cuello, talón despegado y cadera que sube antes que el pecho', ['a', 'd', 'e'])


def sentadilla():
    return [sent_asi(), sent_no()]


# ---------------------------------------------------------------- peso muerto rumano
PMR_PIE = dict(hip=(-5.1, -81.2), lean=4, A1=(1, -5), kb1=-1, fa1=0, A2=(0, -5), kb2=-1, fa2=0,
               H1=(3.8, -77), eb1=1, H2=(3.8, -77), eb2=1, shx=4, shr=26)
PMR_ABAJO = dict(hip=(-22.1, -78.2), lean=95, tilt=-40, A1=(1, -5), kb1=-1, fa1=0, A2=(0, -5), kb2=-1, fa2=0,
                 H1=(5.6, -25.7), eb1=1, H2=(5.6, -25.7), eb2=1, shx=0, shr=34)


def pmr_asi():
    pid = 'i6p-1'
    s, o = 1.62, (184, 312)
    g = [suelo(20, 340, o[1])]
    f0, J0 = figure(PMR_PIE, c=MANI, s=s, tx=o[0], ty=o[1], sombra=False)
    f1, J1 = figure(PMR_ABAJO, c=MANI, s=s, tx=o[0], ty=o[1])
    b0, b1 = tr((5, -75), s, o), tr((5.6, -25.7), s, o)
    g.append(disco(b1[0], b1[1], s))
    g.append(fase(f0 + casquillo(b0[0], b0[1], s)))
    g.append(f1 + casquillo(b1[0], b1[1], s))
    # b · cadera atrás, espalda recta y barra pegada a las piernas
    hp0, hp1 = tr(PMR_PIE['hip'], s, o), tr(PMR_ABAJO['hip'], s, o)
    sh = tr(J1['S'], s, o)
    ux, uy = sh[0] - hp1[0], sh[1] - hp1[1]; k = math.hypot(ux, uy); ux, uy = ux / k, uy / k
    off = (uy * 16 * s, -ux * 16 * s)
    pa = (hp1[0] + off[0] - ux * 14, hp1[1] + off[1] - uy * 14); pb = (sh[0] + off[0] + ux * 2, sh[1] + off[1] + uy * 2)
    gb = (flecha([(hp0[0] - 16, hp0[1] + 18), (hp1[0] - 30, hp1[1] + 16)], PRI, 2.8, 10, curva=((hp0[0] + hp1[0]) / 2 - 12, hp0[1] + 34))
          + linea([pa, pb], OK, 2.4)
          + linea([(b0[0] + 10, b0[1] + 6), (b1[0] + 10, b1[1] - 6)], OK, 2, dash='4 4'))
    g.append(marca('b', 'plan', (36, hp1[1] - 48), target=pa, geom=gb))
    # a · rodillas algo flexionadas y fijas
    K = tr(J1['K2'], s, o)
    g.append(marca('a', 'plan', (322, K[1] - 26), target=(K[0] + 6, K[1]),
                   geom=arco(K, 15, -110, 70, OK, 2.2)))
    # c · hasta media espinilla
    A = tr((0, -5), s, o)
    ym = (K[1] + A[1]) / 2
    gc = linea([(K[0] + 22, ym), (K[0] + 58, ym)], OK, 2.4) + texto(K[0] + 62, ym - 4, 'media|espinilla', OK, FS, 700)
    g.append(marca('c', 'plan', (322, ym + 46), target=(K[0] + 44, ym + 2), geom=gc, dot=False))
    return lam(pid, 'Así: de pie y abajo', 'Consejos a, b y c · en gris claro, la posición de partida',
               ''.join(g), 'Peso muerto rumano de perfil: cadera atrás, espalda recta, rodillas fijas y barra hasta media espinilla',
               ['a', 'b', 'c'])


def pmr_no():
    pid = 'i6p-2'
    s = .92
    y0 = 222
    g = [suelo(10, 350, y0)]
    # c · la espalda se redondea: ya has bajado demasiado
    p = dict(PMR_ABAJO, curva=34, lean=86, tilt=-10, H1=(9, -18), H2=(9, -18))
    f, J = figure(p, c=MANI, s=s, tx=96, ty=y0)
    hp = tr(p['hip'], s, (96, y0)); sh = tr(J['S'], s, (96, y0))
    mid = lerp(hp, sh, .5)
    bb = tr((9, -18), s, (96, y0))
    f = disco(bb[0], bb[1], s) + f + casquillo(bb[0], bb[1], s) + f'<path class="ill-ref" d="M{P((hp[0]-6, hp[1]-12))}Q{P((mid[0]-2, mid[1]-44))} {P((sh[0]+6, sh[1]-18))}" style="stroke:var(--bad)" stroke-width="2.4"/>'
    g.append(mini_col(96, 'espalda|redondeada', 'c', f))
    # e · no es una sentadilla: la rodilla casi no se mueve
    p = dict(SENT_ABAJO, lean=30, tilt=-20, H1=(10, -44), H2=(10, -44), eb1=1, eb2=1)
    f, J = figure(p, c=MANI, s=s, tx=262, ty=y0)
    K = tr(J['K2'], s, (262, y0))
    bb = tr((10, -44), s, (262, y0))
    f = disco(bb[0], bb[1], s) + f + casquillo(bb[0], bb[1], s) + f'<circle cx="{n(K[0])}" cy="{n(K[1])}" r="14" style="fill:none;stroke:var(--bad)" stroke-width="2.2"/>'
    g.append(mini_col(262, 'rodilla|muy doblada', 'e', f))
    return lam(pid, 'Lo que no', 'Consejos c y e', ''.join(g),
               'Peso muerto rumano, errores: espalda redondeada y rodilla que se dobla como en una sentadilla', ['c', 'e'])


def rumano():
    return [pmr_asi(), pmr_no()]


# ---------------------------------------------------------------- remo con barra
REMO = dict(hip=(-16.3, -75.2), lean=48, tilt=-36, A1=(1, -5), kb1=-1, fa1=0, A2=(0, -5), kb2=-1, fa2=0, shx=0, shr=30)
REMO_BAR_ABAJO = (19.5, -55)
REMO_BAR_ARRIBA = (6.5, -73)


def remo_asi():
    pid = 'i6r-1'
    s, o = 1.8, (176, 312)
    g = [suelo(20, 340, o[1])]
    p0 = dict(REMO, H1=REMO_BAR_ABAJO, H2=REMO_BAR_ABAJO, eb1=1, eb2=1)
    p1 = dict(REMO, H1=REMO_BAR_ARRIBA, H2=REMO_BAR_ARRIBA, eb1=1, eb2=1)
    f0, J0 = figure(p0, c=MANI, s=s, tx=o[0], ty=o[1], sombra=False)
    f1, J1 = figure(p1, c=MANI, s=s, tx=o[0], ty=o[1])
    b0, b1 = tr(REMO_BAR_ABAJO, s, o), tr(REMO_BAR_ARRIBA, s, o)
    g.append(disco(b1[0], b1[1], s))
    g.append(fase(f0 + casquillo(b0[0], b0[1], s)))
    g.append(f1 + casquillo(b1[0], b1[1], s))
    # b · tronco a unos 45° o menos, espalda sin redondear
    hp = tr(REMO['hip'], s, o); sh = tr(J1['S'], s, o)
    ang = math.degrees(math.atan2(sh[1] - hp[1], sh[0] - hp[0]))      # negativo: el tronco sube hacia la derecha
    ux, uy = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    back = (hp[0] - ux * 78, hp[1] - uy * 78)
    gb = (linea([(hp[0] - 6, hp[1]), (hp[0] - 92, hp[1])], OK, 2, dash='5 4')
          + linea([(hp[0] - ux * 6, hp[1] - uy * 6), back], OK, 2, dash='5 4')
          + arco(hp, 56, 180, 180 + ang, OK, 2.4)
          + texto(hp[0] - 62, hp[1] + 44, '45° o menos', OK, FS, 700, 'middle', halo=True))
    g.append(marca('b', 'plan', (40, hp[1] - 50), target=(hp[0] - 50, hp[1] - 2), geom=gb))
    # c · la barra sube hacia el ombligo, codos pegados
    gc = flecha([(b0[0] + 16, b0[1] - 4), (b1[0] + 16, b1[1] + 4)], PRI, 2.6, 9, curva=(b0[0] + 2, b0[1] - 20))
    g.append(marca('c', 'plan', (318, b0[1] + 6), target=(b0[0] + 20, (b0[1] + b1[1]) / 2 + 6), geom=gc))
    # e · el tronco no se mueve
    E = tr(J1['E1'], s, o)
    g.append(marca('e', 'plan', (318, sh[1] - 60), target=lerp(hp, sh, .8)))
    return lam(pid, 'Así: brazos abajo y barra al ombligo', 'Consejos b, c y e · en gris claro, la posición de partida',
               ''.join(g), 'Remo con barra de perfil: tronco a 45 grados o menos, barra hacia el ombligo y tronco quieto',
               ['b', 'c', 'e'])


def remo_no():
    pid = 'i6r-2'
    s = .95
    y0 = 222
    g = [suelo(10, 350, y0)]
    p = dict(REMO, curva=32, lean=44, tilt=-12, H1=(14, -52), H2=(14, -52), eb1=1, eb2=1)
    f, J = figure(p, c=MANI, s=s, tx=92, ty=y0)
    hp = tr(p['hip'], s, (92, y0)); sh = tr(J['S'], s, (92, y0)); mid = lerp(hp, sh, .5)
    bb = tr((14, -52), s, (92, y0))
    f = disco(bb[0], bb[1], s) + f + casquillo(bb[0], bb[1], s) + f'<path class="ill-ref" d="M{P((hp[0]-8, hp[1]-8))}Q{P((mid[0]-26, mid[1]-30))} {P((sh[0]-4, sh[1]-16))}" style="stroke:var(--bad)" stroke-width="2.4"/>'
    g.append(mini_col(92, 'espalda|redondeada', 'b', f))
    p = dict(REMO, lean=18, tilt=-10, hip=(-10, -79), H1=(8, -88), H2=(8, -88), eb1=1, eb2=1)
    f, J = figure(p, c=MANI, s=s, tx=262, ty=y0)
    sh = tr(J['S'], s, (262, y0))
    bb = tr((8, -88), s, (262, y0))
    f = disco(bb[0], bb[1], s) + f + casquillo(bb[0], bb[1], s) + flecha([(sh[0] + 22, sh[1] + 30), (sh[0] + 6, sh[1] - 12)], BAD, 2.4, 8, curva=(sh[0] + 26, sh[1]))
    g.append(mini_col(262, 'tirón con|la espalda', 'e', f))
    return lam(pid, 'Lo que no', 'Consejos b y e', ''.join(g),
               'Remo, errores: espalda redondeada y tronco que se levanta para impulsar la barra', ['b', 'e'])


def remo():
    return [remo_asi(), remo_no()]


# ---------------------------------------------------------------- elevación de talón a una pierna
def pie_escalon(phi):
    """Tobillo con la bola del pie fija en el borde del escalón (0,0) y el pie girado phi grados
    (negativo = talón abajo, positivo = de puntillas)."""
    return rot((-9.5, -5), phi)


def talon_panel(pid, phi):
    """Primer plano de cintura para abajo: pierna de trabajo con la bola del pie en el borde (x = 0)
    y la otra pierna recogida detrás."""
    s, o = 3.3, (196, 252)
    A = pie_escalon(phi)
    hip = (A[0] + 7, A[1] - 76.5)
    pose = dict(hip=hip, lean=0, A2=A, kb2=-1, fa2=phi, A1=(hip[0] - 30, hip[1] + 40), kb1=-1, fa1=96,
                H1=(hip[0] + 12, hip[1] + 4), eb1=1, H2=(hip[0] + 6, hip[1] + 6), eb2=1)
    fig, J = figure(pose, c=MANI, s=s, tx=o[0], ty=o[1], sombra=False)
    e = tr((0, 0), s, o)
    step_h = 60
    g = [f'<rect x="{n(e[0])}" y="{n(e[1])}" width="{n(360-e[0]+4)}" height="{step_h}" style="fill:var(--surface-3);stroke:var(--border-strong)" stroke-width="1.5"/>',
         suelo(0, 360, e[1] + step_h), fig]
    heel = tr(A, s, o)
    hb = tr((A[0] + rot((-4.5, 4.6), phi)[0], A[1] + rot((-4.5, 4.6), phi)[1]), s, o)
    return g, dict(edge=e, heel=hb, ankle=heel, s=s, o=o)


def talon_abajo():
    pid = 'i6t-1'
    g, d = talon_panel(pid, -26)
    ex, ey = d['edge']; hx, hy = d['heel']
    # a · antepié en el borde del escalón
    g.append(marca('a', 'plan', (ex + 104, ey + 34), target=(ex + 2, ey + 1)))
    # b · baja el talón todo lo que puedas y aguanta 1 s abajo
    gb = (linea([(ex - 2, ey), (ex - 150, ey)], OK, 2, dash='5 4')
          + flecha([(hx - 40, ey - 40), (hx - 12, hy + 2)], PRI, 2.8, 10, curva=(hx - 50, hy - 14))
          + texto(hx - 18, hy + 30, '1 s', PRI, 16, 700, 'middle', halo=True))
    g.append(marca('b', 'plan', (36, ey - 44), target=(hx - 40, ey - 40), geom=gb, dot=False))
    return lam(pid, 'Abajo: el talón baja del borde', 'Consejos a y b', ''.join(g),
               'Elevación de talón, abajo: antepié en el borde del escalón y talón por debajo, 1 segundo', ['a', 'b'], clip=True)


def talon_arriba():
    pid = 'i6t-2'
    g, d = talon_panel(pid, 40)
    ex, ey = d['edge']; hx, hy = d['heel']
    gc = (linea([(ex - 2, ey), (ex - 150, ey)], REF, 1.6, dash='5 4')
          + flecha([(hx - 16, ey - 4), (hx - 16, hy + 6)], PRI, 2.8, 10)
          + texto(hx - 28, (ey + hy) / 2 + 6, '1 s', PRI, 16, 700, 'end', halo=True))
    g.append(marca('c', 'plan', (36, hy - 30), target=(hx - 16, (ey + hy) / 2), geom=gc, dot=False))
    # d · lento y sin rebote
    zx, zy = 66, 298
    zz = f'<path class="ill-ref" d="M{zx-30} {zy+6}l8 -14l8 14l8 -14l8 14l8 -14l8 14" style="stroke:var(--bad)" stroke-width="2.4"/>'
    g.append(marca('d', 'plan', (zx + 58, zy), geom=zz + texto(zx - 2, zy + 26, 'rebote', BAD, FS, 700, 'middle'),
                   extra=aspa(zx + 32, zy - 2, 10)))
    return lam(pid, 'Arriba: de puntillas del todo', 'Consejos c y d', ''.join(g),
               'Elevación de talón, arriba: subir al máximo y aguantar 1 segundo, lento y sin rebote', ['c', 'd'], clip=True)


def talon():
    return [talon_abajo(), talon_arriba()]


LAMINAS = {
    'dominada': dict(fuente='protocoloDominadas.tecnicaExamen', ejercicio='dominadas-lastradas', paneles=dominada),
    'sentadilla': dict(ejercicio='sentadilla', paneles=sentadilla),
    'peso-muerto-rumano': dict(ejercicio='peso-muerto-rumano', paneles=rumano),
    'remo-barra': dict(ejercicio='remo-barra', paneles=remo),
    'elevacion-talon': dict(ejercicio='elevacion-talon', paneles=talon),
}

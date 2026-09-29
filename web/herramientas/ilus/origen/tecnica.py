#!/usr/bin/env python3
"""Lámina técnica de la dominada con los puntos de control del BOE.

Fuente de las reglas: BOE-A-2026-15055, Anexo, segundo ejercicio (hombres), copiado literal en
datos/plan.json → protocoloDominadas.tecnicaExamen (comprobado en boe.es el 28-9-2026).
Las señales de entrenador (azules) salen de plan.json → ejercicios[dominadas-lastradas].tecnica.

Código visual:
  ● negro con número  = regla del BOE (su número de regla)
  ● azul              = consejo del plan (no es regla del BOE)
  ✕ rojo              = nula en el examen
La figura va en gris «maniquí» para que solo destaquen las marcas.
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig import figure, figure_front, MANI, LU, LF

C = dict(MANI, rule='#E3E9EF', red='#BE2C16', redbg='#FBEAE7', ok='#12775A', okbg='#E6F3EC',
         blue='#2A6FB0', bluebg='#EAF2FA', ink='#16202B', muted='#647688', paper='#FFFFFF', bar='#16202B')
FONT = 'font-family="Barlow, system-ui, sans-serif"'
PW, PH = 360, 330

def badge(x, y, txt, col, r=9):
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{col}"/>'
            f'<text x="{x:.1f}" y="{y+3.6:.1f}" font-size="{10.5 if len(str(txt)) < 2 else 8.2}" font-weight="700" fill="#FFF" text-anchor="middle">{txt}</text>')

def leader(p, q, col):
    return f'<path d="M{p[0]:.1f} {p[1]:.1f} L{q[0]:.1f} {q[1]:.1f}" stroke="{col}" stroke-width="1.2"/><circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="2.4" fill="{col}"/>'

def tx(pt, s, o):
    return (o[0] + pt[0] * s, o[1] + pt[1] * s)

def panel(title, sub, body, legend, tag=None):
    g = [f'<rect width="{PW}" height="{PH}" rx="14" fill="{C["paper"]}" stroke="{C["rule"]}"/>']
    g.append(f'<text x="18" y="28" font-size="14.5" font-weight="700" fill="{C["ink"]}">{title}</text>')
    g.append(f'<text x="18" y="45" font-size="11" fill="{C["muted"]}">{sub}</text>')
    if tag:
        g.append(f'<rect x="{PW-96}" y="14" width="80" height="22" rx="11" fill="{tag[1]}"/><text x="{PW-56}" y="29" font-size="11" font-weight="700" fill="{tag[2]}" text-anchor="middle">{tag[0]}</text>')
    g.append(body)
    y = 226
    for (b, col, txt) in legend:
        if b: g.append(badge(26, y, b, col, 8))
        g.append(f'<text x="40" y="{y+4:.1f}" font-size="11.5" fill="{C["ink"]}">{txt}</text>')
        y += 21
    return g

def barra_tramo(p, r=5.5):
    """Tramo de barra que se aleja hacia el fondo: se dibuja DETRÁS de la figura."""
    x, y = p
    return f'<path d="M{x:.1f} {y:.1f} L{x-22:.1f} {y-12:.1f}" stroke="{C["bar"]}" stroke-width="{2*r:.1f}" stroke-linecap="round" opacity=".22"/>'

def barra_perfil(p, r=5.5, skin=None):
    """Barra vista de perfil: sección circular con los dedos por encima (DELANTE de la figura)."""
    x, y = p
    sk = skin or C['skin']
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{C["bar"]}"/>'
            f'<path d="M{x-r-1.5:.1f} {y+1:.1f} A{r+1.5} {r+1.5} 0 0 1 {x+r+1.5:.1f} {y+1:.1f}" stroke="{sk}" stroke-width="3" fill="none" stroke-linecap="round"/>')

def straight_hand(S, target_dir, L=LU + LF - 0.05):
    n = math.hypot(*target_dir); return (S[0] + target_dir[0] / n * L, S[1] + target_dir[1] / n * L)

# ------------------------------------------------ 1. posición inicial (perfil)
def p_inicial():
    s, o = 0.78, (150, 210)
    S = (0, -130)
    H = straight_hand(S, (3, -51))
    pose = dict(hip=(0, -84), lean=0, A1=(2, -5), kb1=-1, fa1=66, A2=(0, -4), kb2=-1, fa2=72,
                H1=H, eb1=1, H2=H, eb2=1, shadow=False)
    fig, J = figure(pose, c=C, expr='neutro', dorsal=None, scale=s, tx=o[0], ty=o[1])
    bar = tx(H, s, o)
    b = []
    b.append(barra_tramo(bar, 5))
    # plomada: cuerpo perpendicular al suelo
    b.append(f'<path d="M{bar[0]:.1f} {bar[1]+6:.1f} V{o[1]+2:.1f}" stroke="{C["ok"]}" stroke-width="1.3" stroke-dasharray="4 4"/>')
    b.append(fig)
    b.append(barra_perfil(bar, 5))
    # ángulo de codo 180º
    E = tx(J['E1'], s, o)
    b.append(f'<path d="M{E[0]-9:.1f} {E[1]-7:.1f} A11 11 0 0 1 {E[0]-9:.1f} {E[1]+7:.1f}" stroke="{C["ok"]}" stroke-width="1.6" fill="none"/>')
    b.append(f'<text x="{E[0]-14:.1f}" y="{E[1]+4:.1f}" font-size="10.5" font-weight="700" fill="{C["ok"]}" text-anchor="end">180°</text>')
    # etiquetas
    b.append(leader((E[0] + 4, E[1]), (E[0] + 58, E[1] + 4), C['ink'])); b.append(badge(E[0] + 67, E[1] + 4, '1', C['ink']))
    hipp = tx((6, -84), s, o)
    b.append(leader(hipp, (hipp[0] + 52, hipp[1]), C['ink'])); b.append(badge(hipp[0] + 61, hipp[1], '2', C['ink']))
    Sp = tx((-8, -126), s, o)
    b.append(f'<path d="M{Sp[0]:.1f} {Sp[1]-12:.1f} V{Sp[1]+6:.1f}" stroke="{C["blue"]}" stroke-width="2.2" marker-end="url(#fa)"/>')
    b.append(badge(Sp[0] - 18, Sp[1] - 4, 'a', C['blue']))
    # reloj de la pausa: mínima (regla 6) y nunca más de 5 s (regla 7)
    cx, cy = bar[0] + 96, bar[1] + 62
    b.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="17" fill="{C["okbg"]}" stroke="{C["ok"]}" stroke-width="1.4"/>')
    b.append(f'<path d="M{cx:.1f} {cy:.1f} L{cx:.1f} {cy-17:.1f} A17 17 0 0 1 {cx+16.2:.1f} {cy-5.3:.1f} Z" fill="{C["ok"]}" opacity=".85"/>')
    b.append(f'<text x="{cx:.1f}" y="{cy+31:.1f}" font-size="10.5" fill="{C["ok"]}" font-weight="700" text-anchor="middle">pausa, ≤ 5 s</text>')
    b.append(badge(cx - 26, cy - 14, '6', C['ink'])); b.append(badge(cx + 26, cy - 14, '7', C['ink']))
    legend = [('1', C['ink'], 'Cada una parte con brazos completamente extendidos'),
              ('2', C['ink'], 'Cuerpo totalmente extendido durante toda la serie'),
              ('6', C['ink'], 'Pausa mínima entre repeticiones: sin rebote'),
              ('7', C['ink'], 'Sin soltar ninguna mano ni pasar de 5 s colgado'),
              ('a', C['blue'], 'Empieza bajando los omóplatos, no doblando el codo')]
    return panel('1 · Abajo, antes de cada repetición', 'Reglas 1, 2, 6 y 7', ''.join(b), legend)

# ------------------------------------------------ 2. arriba (perfil)
def p_arriba():
    s, o = 1.55, (150, 318)
    H = (18, -131.8)
    pose = dict(hip=(0, -84), lean=-1, A1=(2, -5), kb1=-1, fa1=66, A2=(0, -4), kb2=-1, fa2=72,
                H1=H, eb1=1, H2=H, eb2=1, shadow=False)
    fig, J = figure(pose, c=C, expr='neutro', dorsal=None, scale=s, tx=o[0], ty=o[1])
    bar = tx(H, s, o)
    b = [f'<clipPath id="cpA"><rect x="1" y="54" width="{PW-2}" height="158"/></clipPath><g clip-path="url(#cpA)">']
    b.append(fig)
    b.append(barra_perfil(bar, 5))
    b.append('</g>')
    # cuello en tercios: de la base (≈ -131) a la barbilla (≈ -138)
    n0 = tx((-2, -130), s, o); n1 = tx((-2, -139.6), s, o)
    third = (n0[1] - n1[1]) / 3
    xb = n0[0] - 20
    b.append(f'<path d="M{xb:.1f} {n0[1]:.1f} V{n1[1]:.1f}" stroke="{C["muted"]}" stroke-width="1.2"/>')
    for i in range(4):
        yy = n0[1] - i * third
        b.append(f'<path d="M{xb-3:.1f} {yy:.1f} H{xb+3:.1f}" stroke="{C["muted"]}" stroke-width="1.2"/>')
    b.append(f'<rect x="{xb-3:.1f}" y="{n0[1]-third:.1f}" width="6" height="{third:.1f}" fill="{C["ok"]}"/>')
    b.append(f'<path d="M{xb-4:.1f} {n0[1]-third/2:.1f} H{xb-24:.1f}" stroke="{C["ok"]}" stroke-width="1.2"/>')
    b.append(f'<text x="{xb-28:.1f}" y="{n0[1]-third/2-2:.1f}" font-size="10.5" font-weight="700" fill="{C["ok"]}" text-anchor="end">tercio</text>')
    b.append(f'<text x="{xb-28:.1f}" y="{n0[1]-third/2+11:.1f}" font-size="10.5" font-weight="700" fill="{C["ok"]}" text-anchor="end">inferior</text>')
    b.append(f'<path d="M{xb+4:.1f} {bar[1]:.1f} H{bar[0]-9:.1f}" stroke="{C["ok"]}" stroke-width="1" stroke-dasharray="2 2"/>')
    # barbilla claramente por encima
    ch = tx((11, -139.4), s, o)
    b.append(f'<path d="M{ch[0]+4:.1f} {ch[1]:.1f} H{ch[0]+34:.1f}" stroke="{C["ok"]}" stroke-width="1.2" stroke-dasharray="3 2"/>')
    b.append(f'<path d="M{bar[0]+6:.1f} {bar[1]-5:.1f} H{ch[0]+34:.1f}" stroke="{C["ok"]}" stroke-width="1.2" stroke-dasharray="3 2"/>')
    b.append(f'<path d="M{ch[0]+30:.1f} {bar[1]-5.5:.1f} V{ch[1]+1:.1f}" stroke="{C["ok"]}" stroke-width="1.6"/>')
    b.append(badge(ch[0] + 46, (ch[1] + bar[1]) / 2, '5', C['ink']))
    # cabeza en posición anatómica: línea de la mirada horizontal
    ey = tx((12.5, -148.6), s, o)
    b.append(f'<path d="M{ey[0]+4:.1f} {ey[1]:.1f} H{ey[0]+60:.1f}" stroke="{C["ok"]}" stroke-width="1.2" stroke-dasharray="2 3"/>')
    b.append(badge(ey[0] + 70, ey[1], '4', C['ink']))
    # codos a las costillas (plan)
    E = tx(J['E1'], s, o)
    b.append(leader(E, (E[0] + 58, E[1] - 4), C['blue'])); b.append(badge(E[0] + 67, E[1] - 4, 'b', C['blue']))
    legend = [('5', C['ink'], 'Barbilla claramente por encima de la barra,'),
              ('', C['paper'], 'que queda a la altura del tercio inferior del cuello'),
              ('4', C['ink'], 'Cabeza en posición anatómica: sin estirar el cuello'),
              ('b', C['blue'], 'Codos hacia las costillas, pecho a la barra (plan)')]
    return panel('2 · Arriba', 'Reglas 4 y 5', ''.join(b), legend)

# ------------------------------------------------ 3. agarre (frente)
def p_agarre():
    s, o = 0.66, (180, 214)
    SL, SR = (-14, -128), (14, -128)
    HL = straight_hand(SL, (-7, -51)); HR = straight_hand(SR, (7, -51))
    p = dict(HL=HL, HR=HR, ebL=1, ebR=-1, AL=(-3, -4), AR=(3, -4), shadow=False)
    fig, J = figure_front(p, c=C, expr='neutro', dorsal=None, scale=s, tx=o[0], ty=o[1])
    hl, hr = tx(HL, s, o), tx(HR, s, o)
    sl, sr = tx(SL, s, o), tx(SR, s, o)
    b = [f'<path d="M{hl[0]-40:.1f} {hl[1]:.1f} H{hr[0]+40:.1f}" stroke="{C["bar"]}" stroke-width="5" stroke-linecap="round"/>', fig]
    # manos: palmas al frente (se ven los dedos por delante de la barra)
    for h in (hl, hr):
        b.append(f'<rect x="{h[0]-4.5:.1f}" y="{h[1]-3:.1f}" width="9" height="7" rx="3" fill="{C["skin"]}" stroke="{C["skinD"]}" stroke-width="1"/>')
    # cotas apiladas encima de la barra: hombros (gris) y agarre (verde), para comparar de un vistazo
    yb = hl[1] - 16; ys2 = hl[1] - 36
    for x_ in (sl[0], sr[0]):
        b.append(f'<path d="M{x_:.1f} {sl[1]-4:.1f} V{ys2-5:.1f}" stroke="{C["muted"]}" stroke-width="1" stroke-dasharray="2 3"/>')
    b.append(f'<path d="M{sl[0]:.1f} {ys2:.1f} H{sr[0]:.1f}" stroke="{C["muted"]}" stroke-width="1.4"/>')
    b.append(f'<text x="{sl[0]-8:.1f}" y="{ys2+4:.1f}" font-size="10.5" fill="{C["muted"]}" text-anchor="end">hombros</text>')
    b.append(f'<path d="M{hl[0]:.1f} {yb:.1f} H{hr[0]:.1f}" stroke="{C["ok"]}" stroke-width="1.6"/>')
    b.append(f'<path d="M{hl[0]:.1f} {yb-5:.1f} V{yb+5:.1f} M{hr[0]:.1f} {yb-5:.1f} V{yb+5:.1f}" stroke="{C["ok"]}" stroke-width="1.6"/>')
    b.append(f'<text x="{hr[0]+8:.1f}" y="{yb+4:.1f}" font-size="10.5" font-weight="700" fill="{C["ok"]}">agarre, algo más ancho</text>')
    b.append(leader((hl[0]-5, hl[1]+4), (hl[0]-52, hl[1]+26), C['ink'])); b.append(badge(hl[0] - 61, hl[1] + 28, 'PI', C['ink']))
    lg = tx((4, -30), s, o)
    b.append(leader((lg[0]-8, lg[1]), (lg[0] - 60, lg[1]), C['ink'])); b.append(badge(lg[0] - 69, lg[1], 'PI', C['ink']))
    legend = [('PI', C['ink'], 'Palmas al frente (agarre prono)'),
              ('PI', C['ink'], 'Agarre ligeramente más ancho que los hombros'),
              ('PI', C['ink'], 'Se permite cruzar las piernas'),
              ('8', C['ink'], 'Calzado; sin guantes ni nada que ayude al agarre')]
    return panel('3 · Agarre, de frente', 'PI = posición inicial del BOE · regla 8', ''.join(b), legend)

# ------------------------------------------------ 4. nulas
def mini(pose_kind, ox, bar_y, s=0.56):
    S = (0, -130)
    if pose_kind == 'balanceo':
        H = straight_hand(S, (-6, -51))
        pose = dict(hip=(4, -84), lean=-12, A1=(44, -34), kb1=-1, fa1=40, A2=(40, -30), kb2=-1, fa2=40,
                    H1=H, eb1=1, H2=H, eb2=1, shadow=False)
    elif pose_kind == 'codos':
        H = (4, -168)
        pose = dict(hip=(0, -84), A1=(2, -5), kb1=-1, fa1=66, A2=(0, -4), kb2=-1, fa2=72,
                    H1=H, eb1=1, H2=H, eb2=1, shadow=False)
    else:  # cuello
        H = (18, -128)
        pose = dict(hip=(0, -84), tilt=-30, A1=(2, -5), kb1=-1, fa1=66, A2=(0, -4), kb2=-1, fa2=72,
                    H1=H, eb1=1, H2=H, eb2=1, shadow=False)
    oy = bar_y - pose['H1'][1] * s
    fig, J = figure(pose, c=C, expr='neutro', dorsal=None, scale=s, tx=ox, ty=oy)
    bar = tx(pose['H1'], s, (ox, oy))
    g = ([barra_tramo(bar, 4)] if pose_kind != 'cuello' else []) + [fig, barra_perfil(bar, 4)]
    if pose_kind == 'balanceo':
        g.append(f'<path d="M{ox+4:.1f} {oy+4:.1f} Q{ox+30:.1f} {oy+8:.1f} {ox+44:.1f} {oy-14:.1f}" stroke="{C["red"]}" stroke-width="1.6" fill="none" marker-end="url(#fr)"/>')
    if pose_kind == 'codos':
        E = tx(J['E1'], s, (ox, oy))
        g.append(f'<circle cx="{E[0]:.1f}" cy="{E[1]:.1f}" r="8" fill="none" stroke="{C["red"]}" stroke-width="1.6"/>')
    if pose_kind == 'cuello':
        hd = tx((6, -150), s, (ox, oy))
        g.append(f'<circle cx="{hd[0]:.1f}" cy="{hd[1]:.1f}" r="15" fill="none" stroke="{C["red"]}" stroke-width="1.6"/>')
    # cruz roja
    cx, cy = bar[0] + 30, bar[1] + 18
    g.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="9" fill="{C["red"]}"/><path d="M{cx-3.5:.1f} {cy-3.5:.1f} l7 7 m0 -7 l-7 7" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>')
    return ''.join(g)

def p_nulas():
    b = [mini('balanceo', 62, 84), mini('codos', 178, 84), mini('cuello', 292, 110)]
    lab = [('Balanceo o impulso', 66), ('Sin extender abajo', 180), ('Cuello estirado', 294)]
    for t, x in lab:
        b.append(f'<text x="{x}" y="206" font-size="11" font-weight="600" fill="{C["red"]}" text-anchor="middle">{t}</text>')
    legend = [('3', C['ink'], 'Nula si hay oscilación, balanceo o impulso'),
              ('1', C['ink'], 'Nula si no parte con los brazos extendidos'),
              ('4', C['ink'], 'Nula si la cabeza no va en posición anatómica'),
              ('9', C['ink'], 'Dominada nula = no cuenta. Un solo intento')]
    return panel('4 · Lo que el tribunal anula', 'Reglas 1, 3, 4 y 9', ''.join(b), legend, tag=('NULAS', C['redbg'], C['red']))

if __name__ == '__main__':
    defs = (f'<defs><marker id="fa" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">'
            f'<path d="M0 0 L10 5 L0 10 z" fill="{C["blue"]}"/></marker>'
            f'<marker id="fr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">'
            f'<path d="M0 0 L10 5 L0 10 z" fill="{C["red"]}"/></marker></defs>')
    panels = [p_inicial(), p_arriba(), p_agarre(), p_nulas()]
    Wt, Ht = 2 * PW + 20, 2 * PH + 20 + 64
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {Wt} {Ht}" {FONT} role="img"><title>Dominada: puntos de control del BOE</title>', defs,
           f'<rect width="{Wt}" height="{Ht}" fill="#F1F5F8"/>',
           f'<text x="4" y="24" font-size="18" font-weight="700" fill="{C["ink"]}">Dominada · lo que mira el tribunal</text>',
           f'<text x="4" y="44" font-size="11.5" fill="{C["muted"]}">Número negro = regla del BOE-A-2026-15055 (anexo, segundo ejercicio) · letra azul = consejo del plan · rojo = nula</text>']
    for i, p in enumerate(panels):
        x, y = (i % 2) * (PW + 20), 64 + (i // 2) * (PH + 20)
        out.append(f'<g transform="translate({x} {y})">' + ''.join(p) + '</g>')
    out.append('</svg>')
    open('tecnica_dominada.svg', 'w').write('\n'.join(out))
    # una tarjeta por panel, para el carrusel del móvil
    for i, p in enumerate(panels, 1):
        d = defs.replace('id="fa"', f'id="fa{i}"').replace('id="fr"', f'id="fr{i}"')
        body = ''.join(p).replace('url(#fa)', f'url(#fa{i})').replace('url(#fr)', f'url(#fr{i})').replace('cpA', f'cpA{i}')
        open(f'tecnica_dominada_{i}.svg', 'w').write(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {PW} {PH}" {FONT} role="img"><title>Dominada, panel {i}</title>{d}{body}</svg>')
    print('ok')

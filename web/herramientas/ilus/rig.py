"""Rig del agente y del maniquí (M6, versión web).

Parte de ilustracion/rig.py (copia literal en origen/rig.py): IK de dos huesos, perfil mirando a la derecha,
suelo en y = 0. Longitudes: muslo 40, pierna 38, brazo 27, antebrazo 25, cadera-hombro 46; cuello alargado
3 unidades (7,7 cabezas) para que se vea la regla 5 del BOE (barra al tercio inferior del cuello).

Cambios respecto al original:
  - Colores: nunca hexadecimales. Cada pieza lleva la clase de su papel (if-cam, is-piel…) y 16_ilus.css la
    resuelve con variables: .ill-ag usa los tokens --ill-* de §4.2 y .ill-mani los --ill-m-*, que se derivan
    de --ill-mani y --ill-mani-2. Mismo resultado que style="fill:var(--…)" (funciona en oscuro) con la mitad de peso.
  - Trazos de extremidades con la clase "il" (sin relleno y extremos redondos en 16_ilus.css).
  - Tronco con curvatura opcional ('curva', grados): la parte alta rota alrededor de la mitad de la espalda.
    Sirve para dibujar la espalda redondeada que las láminas marcan como error.
  - El dorsal «43» va en un grupo data-deco con aria-hidden (la QA de letra lo ignora).
"""
import math, re

KEYS = ('cam', 'cam2', 'pan', 'gorra', 'visera', 'vivo', 'piel', 'piel2', 'pelo', 'ojo', 'zapa', 'zapa2', 'suela',
        'dorsal', 'dorsalTxt', 'sombra')
# Las figuras no llevan colores escritos: cada pieza lleva la clase de su papel (if-cam = relleno de camiseta,
# is-piel = trazo de piel…) y 16_ilus.css la resuelve con una variable --c-* que fija el envoltorio:
#   .ill-ag   -> tokens --ill-* del agente (§4.2)
#   .ill-mani -> tokens --ill-m-* del maniquí (derivados de --ill-mani y --ill-mani-2)
# Así una misma pose sirve para las dos paletas y el SVG pesa la mitad que con style="fill:var(--…)" en cada pieza.
AG = dict({k: k for k in KEYS}, _cls='ill-ag')
MANI = dict({k: k for k in KEYS}, _cls='ill-mani', dorsal=None)

LT, LS, LU, LF, LTR = 40, 38, 27, 25, 46


def n(v):
    s = f'{v:.1f}'
    if s.endswith('.0'):
        s = s[:-2]
    return '0' if s in ('-0', '') else s


def fs(v):
    s = f'{v:.3f}'.rstrip('0').rstrip('.')
    return s or '0'


def P(p):
    return f'{n(p[0])} {n(p[1])}'


def ik(root, target, l1, l2, bend):
    dx, dy = target[0] - root[0], target[1] - root[1]
    D = max(1e-6, min(math.hypot(dx, dy), l1 + l2 - 0.01))
    ux, uy = dx / D, dy / D
    a = (l1 * l1 - l2 * l2 + D * D) / (2 * D)
    h = math.sqrt(max(0.0, l1 * l1 - a * a))
    nx, ny = -uy * bend, ux * bend
    j = (root[0] + a * ux + h * nx, root[1] + a * uy + h * ny)
    end = (root[0] + D * ux, root[1] + D * uy)
    return j, end


def rot(p, deg, c=(0, 0)):
    t = math.radians(deg)
    x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(t) - y * math.sin(t), c[1] + x * math.sin(t) + y * math.cos(t))


def lerp(a, b, f):
    return (a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]))


def L(pts, col, w, extra=''):
    """Trazo de extremidad (cápsula): clase il = sin relleno y extremos redondos; is-<papel> = color."""
    d = 'M' + 'L'.join(P(p) for p in pts)
    return f'<path class="il is-{col}" d="{d}" stroke-width="{n(w)}"{extra}/>'


def F(d, col, extra=''):
    return f'<path class="if-{col}" d="{d}"{extra}/>'


def straight(S, direction, L_=LU + LF - 0.05):
    k = math.hypot(*direction)
    return (S[0] + direction[0] / k * L_, S[1] + direction[1] / k * L_)


# ----------------------------------------------------------------- piezas
def shoe(A, ang, col, sole):
    x, y = A
    op, cl = (f'<g transform="rotate({n(ang)} {n(x)} {n(y)})">', '</g>') if abs(ang) > .05 else ('', '')
    return (op
            + F(f'M{n(x-4.5)} {n(y-3.5)}Q{n(x+1)} {n(y-5.5)} {n(x+6)} {n(y-2)}L{n(x+12.5)} {n(y+.5)}'
                f'Q{n(x+15.5)} {n(y+3.5)} {n(x+12)} {n(y+5)}L{n(x-4.5)} {n(y+5)}Z', col)
            + L([(x - 4, y + 4.6), (x + 12, y + 4.6)], sole, 1.8) + cl)


def sleeve(H, K, w, f, col):
    d = (K[0] - H[0], K[1] - H[1]); k = math.hypot(*d); u = (d[0] / k, d[1] / k); p = (-u[1], u[0])
    Q = lerp(H, K, f)
    pts = [(H[0] + p[0] * w / 2 - u[0] * 4, H[1] + p[1] * w / 2 - u[1] * 4),
           (Q[0] + p[0] * w / 2, Q[1] + p[1] * w / 2),
           (Q[0] - p[0] * w / 2, Q[1] - p[1] * w / 2),
           (H[0] - p[0] * w / 2 - u[0] * 4, H[1] - p[1] * w / 2 - u[1] * 4)]
    d = 'M' + 'L'.join(P(q) for q in pts) + 'Z'
    return f'<path class="isl if-{col} is-{col}" d="{d}"/>'


TORSO = 'M-12 -44Q-2 -51 10 -47Q15 -38 12.5 -22Q10.5 -12 11 -2Q0 2 -12 -1Q-11 -13 -13 -26Q-14 -36 -12 -44Z'
TORSO_SOMBRA = 'M-12 -44Q-14 -36 -13 -26Q-11 -13 -12 -1Q-8 .4 -5 .6Q-7 -17 -5 -45.5Z'
CINTURA = 'M-12 -8H11L11 1Q0 6 -12 2Z'
PIVOTE = (0, -18)     # mitad de la espalda (coordenadas de cadera)
SPAN = 26


def bend_pt(p, a):
    """Curvatura progresiva: por encima del pivote, rota a·t grados (t de 0 a 1 en SPAN unidades)."""
    if not a or p[1] >= PIVOTE[1]:
        return p
    t = min(1.0, (PIVOTE[1] - p[1]) / SPAN)
    return rot(p, a * t, PIVOTE)


def bend_path(d, a):
    if not a:
        return d
    toks = re.findall(r'[MLQCZHVz]|-?\d*\.?\d+', d)
    out, i, cmd, buf = [], 0, None, []
    # expandimos H/V no se usan en TORSO: solo M, Q, L, Z
    nums = []
    for t in toks:
        if t.isalpha():
            if nums:
                out.append(nums); nums = []
            out.append(t)
        else:
            nums.append(float(t))
    if nums:
        out.append(nums)
    s = ''
    for item in out:
        if isinstance(item, str):
            s += item
        else:
            pts = [bend_pt((item[k], item[k + 1]), a) for k in range(0, len(item), 2)]
            s += ' '.join(P(q) for q in pts)
    return s


def head(c, expr, tilt=0, cap=True, cuello=7):
    """Cabeza de perfil en coordenadas de cadera (el cuello nace en (1.5,-46))."""
    g = [f'<g transform="rotate({n(tilt)} 2 -49)">' if tilt else '<g>']
    g.append(L([(1.5, -46), (3.4, -56)], c['piel2'], cuello))
    g.append('<g transform="translate(.5 81)">')
    g.append(F('M5 -159C12.5 -159 15.5 -153.5 15.3 -148.6L17.2 -144.8Q17.4 -143.6 15.4 -143.4Q15.2 -139.5 13 -138.2'
               'Q9 -136.2 4.5 -137C-2.5 -138 -5 -142.5 -5 -148C-5 -154.5 -1 -159 5 -159Z', c['piel']))
    g.append(F('M-5 -149Q-5.6 -140.5 -1.5 -138.6L.6 -147.4Z', c['pelo']))
    g.append(f'<ellipse class="if-piel2" cx="1.6" cy="-146.8" rx="2.2" ry="2.9"/>')
    if cap:
        g.append(F('M-6 -149.6C-7 -164.5 16 -166.5 16.2 -151.4Z', c['gorra']))
        g.append(F('M12 -152.4L27 -150.8Q27.4 -147.9 12 -148.4Z', c['visera']))
        g.append('<path class="il is-vivo" d="M-6 -150.6Q5 -152.5 16.2 -151.6" stroke-width="1"/>')
    else:
        g.append(F('M-5.6 -147C-7 -161 8 -163.5 14.6 -153.5Q10 -155.4 6 -153.6Q1 -152 -1.5 -146.5Z', c['pelo']))
    ink = c['ojo']
    if expr == 'concentrado':
        g.append(L([(10.2, -145.6), (13.1, -145.3)], ink, 1.6))
    elif expr == 'neutro':
        g.append(f'<circle class="if-{ink}" cx="11.8" cy="-145.6" r="1.3"/>')
    elif expr == 'esfuerzo':
        g.append(L([(10.2, -145.4), (13.1, -145.8)], ink, 1.6))
        g.append(L([(11.5, -140.2), (14.4, -140.4)], ink, 1.2))
    elif expr == 'contento':
        g.append(f'<path class="il is-{ink}" d="M10 -144.8Q11.7 -147.2 13.4 -144.8" stroke-width="1.5"/>')
    g.append('</g></g>')
    return g


def figure(pose, c=AG, expr='neutro', dorsal=False, s=1.0, tx=0, ty=0, flip=False, sombra=True,
           estelas=None, cap=True, extra_behind='', extra_front=''):
    """Perfil mirando a la derecha. pose: hip, lean, curva, A1 (pie lejano), A2 (cercano), H1 (mano cercana),
    H2 (lejana), kb*/eb* (sentido de rodilla y codo), fa1/fa2 (ángulo del pie), tilt, K*/E* forzados."""
    hip = pose['hip']; lean = pose.get('lean', 0); curva = pose.get('curva', 0)
    Sl = bend_pt((0, -LTR), curva)
    S = rot((hip[0] + Sl[0], hip[1] + Sl[1]), lean, hip)
    K1, A1 = ik(hip, pose['A1'], LT, LS, pose.get('kb1', 1))
    K2, A2 = ik(hip, pose['A2'], LT, LS, pose.get('kb2', 1))
    E1, H1 = ik(S, pose['H1'], LU, LF, pose.get('eb1', -1))
    E2, H2 = ik(S, pose['H2'], LU, LF, pose.get('eb2', -1))
    if 'K1' in pose: K1, A1 = pose['K1'], pose['A1']
    if 'K2' in pose: K2, A2 = pose['K2'], pose['A2']
    if 'E1' in pose: E1, H1 = pose['E1'], pose['H1']
    if 'E2' in pose: E2, H2 = pose['E2'], pose['H2']
    sx = -s if flip else s
    sc = fs(s) if sx == s else f'{fs(sx)} {fs(s)}'
    tf = f' transform="translate({n(tx)} {n(ty)}) scale({sc})"' if (s != 1 or flip or tx or ty) else ''
    g = [f'<g class="{c["_cls"]}"{tf}>']
    if sombra and c.get('sombra'):
        g.append(f'<ellipse class="if-sombra" cx="{n(pose.get("shx", hip[0]))}" cy="0" rx="{n(pose.get("shr", 34))}" ry="4"/>')
    if estelas:
        g.append('<g aria-hidden="true" data-deco="1">' + ''.join(
            f'<path class="il is-estela" d="M{n(a)} {n(y)}H{n(b)}" stroke-width="2.6"/>' for (a, b, y) in estelas) + '</g>')
    g.append(extra_behind)
    # brazo lejano
    g.append(L([S, E2], c['piel2'], 8.5)); g.append(L([E2, H2], c['piel2'], 7.5))
    g.append(sleeve(S, E2, 11.5, .40, c['cam2']))
    # pierna lejana
    g.append(L([hip, K1], c['piel2'], 12.5)); g.append(L([K1, A1], c['piel2'], 9.5))
    g.append(shoe(A1, pose.get('fa1', 0), c['zapa2'], c['suela']))
    # pierna cercana
    g.append(L([hip, K2], c['piel'], 13)); g.append(L([K2, A2], c['piel'], 10))
    g.append(shoe(A2, pose.get('fa2', 0), c['zapa'], c['suela']))
    g.append(sleeve(hip, K1, 15, .40, c['pan']))
    g.append(sleeve(hip, K2, 16, .42, c['pan']))
    # tronco y cabeza en el marco de la cadera
    g.append(f'<g transform="translate({n(hip[0])} {n(hip[1])}) rotate({n(lean)})">')
    g.append(F(CINTURA, c['pan']))
    g.append(F(bend_path(TORSO, curva), c['cam']))
    g.append(F(bend_path(TORSO_SOMBRA, curva), c['cam2'], ' opacity=".6"'))
    if dorsal and c.get('dorsal'):
        dp = bend_pt((3, -25), curva)
        g.append(f'<g transform="rotate({n(-4 + curva * .5)} {P(dp)})" data-deco="1" aria-hidden="true">'
                 f'<rect class="if-dorsal" x="{n(dp[0]-5.5)}" y="{n(dp[1]-8.5)}" width="13.5" height="12.5" rx="1.5"/>'
                 f'<text class="if-dorsalTxt" x="{n(dp[0]+1.25)}" y="{n(dp[1]+0.9)}" font-size="7.4" font-weight="700" text-anchor="middle">43</text></g>')
    hg = head(c, expr, pose.get('tilt', 0), cap, pose.get('cuello', 7))
    if curva:
        g.append(f'<g transform="rotate({n(curva)} {P(PIVOTE)})">' + ''.join(hg) + '</g>')
    else:
        g.extend(hg)
    g.append('</g>')
    # brazo cercano
    g.append(L([S, E1], c['piel'], 8.5)); g.append(L([E1, H1], c['piel'], 7.5))
    g.append(sleeve(S, E1, 11.5, .40, c['cam']))
    g.append(extra_front)
    g.append('</g>')
    J = dict(S=S, E1=E1, H1=H1, E2=E2, H2=H2, K1=K1, A1=A1, K2=K2, A2=A2, hip=hip)
    return ''.join(g), J


def figure_front(p, c=AG, expr='neutro', dorsal=False, s=1.0, tx=0, ty=0, sombra=True, cap=True, extra_front=''):
    """De frente. p: manos HL/HR, pies AL/AR (L = izquierda del dibujo), bends kbL/kbR/ebL/ebR.
    'cruza': True dibuja la pierna derecha delante (piernas cruzadas)."""
    hy = p.get('hy', -84)
    hipL, hipR = (-7, hy), (7, hy)
    SL, SR = (-14, hy - 44), (14, hy - 44)
    KL, AL = ik(hipL, p['AL'], LT, LS, p.get('kbL', 1))
    KR, AR = ik(hipR, p['AR'], LT, LS, p.get('kbR', -1))
    EL, HL = ik(SL, p['HL'], LU, LF, p.get('ebL', -1))
    ER, HR = ik(SR, p['HR'], LU, LF, p.get('ebR', 1))
    oy = hy + 84
    tf = f' transform="translate({n(tx)} {n(ty)}) scale({fs(s)})"' if (s != 1 or tx or ty) else ''
    g = [f'<g class="{c["_cls"]}"{tf}>']
    if sombra and c.get('sombra'):
        g.append('<ellipse class="if-sombra" cx="0" cy="0" rx="26" ry="3.6"/>')
    legs = [(hipL, KL, AL, c['piel2'] if p.get('cruza') else c['piel']), (hipR, KR, AR, c['piel'])]
    for (H_, K_, A_, col) in legs:
        g.append(L([H_, K_], col, 12.5)); g.append(L([K_, A_], col, 9.5))
        x, y = A_
        g.append(F(f'M{n(x-5.5)} {n(y+5)}Q{n(x-6)} {n(y-3)} {n(x)} {n(y-3.5)}Q{n(x+6)} {n(y-3)} {n(x+5.5)} {n(y+5)}Z', c['zapa']))
        g.append(L([(x - 5, y + 4.6), (x + 5, y + 4.6)], c['suela'], 1.8))
    g.append(sleeve(hipL, KL, 15, .40, c['pan'])); g.append(sleeve(hipR, KR, 15, .40, c['pan']))
    g.append(f'<g transform="translate(0 {n(oy)})">')
    g.append(F('M-14 -92H14L14.5 -80H-14.5Z', c['pan']))
    g.append(F('M-15 -129Q0 -133 15 -129Q17.5 -118 14 -104Q12.5 -95 13.5 -86Q0 -82 -13.5 -86Q-12.5 -95 -14 -104Q-17.5 -118 -15 -129Z', c['cam']))
    g.append(F('M5 -130.5Q15 -130 15 -129Q17.5 -118 14 -104Q12.5 -95 13.5 -86Q10 -84.5 7 -84Q10 -106 5 -130.5Z', c['cam2'], ' opacity=".45"'))
    if dorsal and c.get('dorsal'):
        g.append('<g data-deco="1" aria-hidden="true"><rect class="if-dorsal" x="-7.5" y="-118" width="15" height="13" rx="1.5"/>'
                 '<text class="if-dorsalTxt" x="0" y="-108.2" font-size="7.8" font-weight="700" text-anchor="middle">43</text></g>')
    g.append(L([(0, -129), (0, -139)], c['piel2'], 8))
    g.append('<g transform="translate(0 -3)">')
    g.append('<ellipse class="if-piel2" cx="-10" cy="-147" rx="2.2" ry="3"/><ellipse class="if-piel2" cx="10" cy="-147" rx="2.2" ry="3"/>')
    g.append(F('M0 -159C7.5 -159 10 -154 10 -148C10 -141 6 -136.5 0 -136.5C-6 -136.5 -10 -141 -10 -148C-10 -154 -7.5 -159 0 -159Z', c['piel']))
    g.append(F('M-10 -149Q-10.6 -143 -9 -141L-8.4 -148Z', c['pelo'])); g.append(F('M10 -149Q10.6 -143 9 -141L8.4 -148Z', c['pelo']))
    if cap:
        g.append(F('M-10.8 -150C-11 -165 11 -165 10.8 -150Z', c['gorra']))
        g.append(F('M-11.5 -151Q0 -146.2 11.5 -151L11 -148.6Q0 -144.4 -11 -148.6Z', c['visera']))
        g.append('<path class="il is-vivo" d="M-10.8 -151.4Q0 -154 10.8 -151.4" stroke-width="1"/>')
    ink = c['ojo']
    if expr == 'contento':
        for ex in (-4, 4):
            g.append(f'<path class="il is-{ink}" d="M{n(ex-1.8)} -142.6Q{n(ex)} -145 {n(ex+1.8)} -142.6" stroke-width="1.4"/>')
        g.append(F('M-3 -140Q0 -136.6 3 -140Z', ink))
    elif expr == 'esfuerzo':
        for ex in (-4, 4):
            g.append(L([(ex - 1.6, -143), (ex + 1.6, -143)], ink, 1.5))
        g.append(L([(-2.4, -139.4), (2.4, -139.4)], ink, 1.2))
    else:
        for ex in (-4, 4):
            g.append(f'<circle class="if-{ink}" cx="{ex}" cy="-143" r="1.25"/>')
    g.append('</g></g>')
    for (S_, E_, H_) in ((SL, EL, HL), (SR, ER, HR)):
        g.append(L([S_, E_], c['piel'], 8.5)); g.append(L([E_, H_], c['piel'], 7.5))
        g.append(sleeve(S_, E_, 11.5, .40, c['cam']))
    g.append(extra_front)
    g.append('</g>')
    return ''.join(g), dict(SL=SL, SR=SR, EL=EL, ER=ER, HL=HL, HR=HR, KL=KL, KR=KR, AL=AL, AR=AR, hipL=hipL, hipR=hipR)


# ----------------------------------------------------------------- poses del agente (coordenadas de la figura)
CORRE = dict(hip=(0, -86), lean=9, A1=(24, -29), kb1=-1, fa1=4, A2=(-47, -37), kb2=-1, fa2=128,
             H1=(38, -122), eb1=1, H2=(-24, -99), eb2=1, shx=-4, shr=38)
CORRE_ESTELAS = [(-74, -50, -122), (-84, -58, -102), (-96, -74, -64)]
CELEBRA_F = dict(HL=(-40, -178), HR=(40, -178), ebL=1, ebR=-1, AL=(-12, -6), AR=(12, -6), kbL=1, kbR=-1)
DEPIE_F = dict(HL=(-19, -82), HR=(19, -82), ebL=1, ebR=-1, AL=(-9, -6), AR=(9, -6))

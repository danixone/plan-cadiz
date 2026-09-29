"""Rig de la mascota (perfil, mirando a la derecha) con IK de dos huesos.

Unidades locales: suelo en y=0, altura de pie ~166 (7,5 cabezas).
Longitudes: muslo 40, pierna 38, brazo 27, antebrazo 25, cadera-hombro 46.
Todas las escenas y las láminas técnicas usan este mismo esqueleto.
"""
import math

PAL = dict(
    ink='#16202B', muted='#647688', paper='#FBFCFD',
    navy='#1F3D63', navyD='#16304F', navyS='#142840', cap='#13243B', visor='#0C1828',
    skin='#EDBB98', skinD='#D49A76', hair='#2B2420', shoe='#2A6FB0', shoeD='#1F5A92', sole='#F4F7FA',
    accent='#7FB2E5')
# Paleta «maniquí» para láminas técnicas: la misma figura, sin color de uniforme, para que lo que destaque sean las marcas
MANI = dict(PAL, navy='#8C9CAD', navyD='#75879A', navyS='#6A7C90', cap='#6A7C90', visor='#56687C',
            skin='#C9D3DD', skinD='#AEBBC8', hair='#6A7C90', shoe='#6A7C90', shoeD='#56687C', accent='#C9D3DD')

LT, LS, LU, LF, LTR = 40, 38, 27, 25, 46

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
    t = math.radians(deg); x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(t) - y * math.sin(t), c[1] + x * math.sin(t) + y * math.cos(t))

def L(pts, col, w, op=None):
    d = 'M' + ' L'.join(f'{p[0]:.1f} {p[1]:.1f}' for p in pts)
    o = f' opacity="{op}"' if op else ''
    return f'<path d="{d}" stroke="{col}" stroke-width="{w}" fill="none" stroke-linecap="round" stroke-linejoin="round"{o}/>'

def lerp(a, b, f):
    return (a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]))

def shoe(A, ang, col, sole_col):
    # zapatilla con la punta hacia +x, girada 'ang' grados alrededor del tobillo
    x, y = A
    return (f'<g transform="rotate({ang:.1f} {x:.1f} {y:.1f})">'
            f'<path d="M{x-4.5:.1f} {y-3.5:.1f} Q{x+1:.1f} {y-5.5:.1f} {x+6:.1f} {y-2:.1f} L{x+12.5:.1f} {y+0.5:.1f} '
            f'Q{x+15.5:.1f} {y+3.5:.1f} {x+12:.1f} {y+5:.1f} L{x-4.5:.1f} {y+5:.1f} Z" fill="{col}"/>'
            f'<path d="M{x-4:.1f} {y+4.6:.1f} L{x+12:.1f} {y+4.6:.1f}" stroke="{sole_col}" stroke-width="1.8" stroke-linecap="round"/></g>')

def shorts_leg(H, K, w, f, col):
    d = (K[0] - H[0], K[1] - H[1]); n = math.hypot(*d); u = (d[0] / n, d[1] / n); p = (-u[1], u[0])
    P = lerp(H, K, f)
    pts = [(H[0] + p[0] * w / 2 - u[0] * 4, H[1] + p[1] * w / 2 - u[1] * 4),
           (P[0] + p[0] * w / 2, P[1] + p[1] * w / 2),
           (P[0] - p[0] * w / 2, P[1] - p[1] * w / 2),
           (H[0] - p[0] * w / 2 - u[0] * 4, H[1] - p[1] * w / 2 - u[1] * 4)]
    d = 'M' + ' L'.join(f'{q[0]:.1f} {q[1]:.1f}' for q in pts) + ' Z'
    return f'<path d="{d}" fill="{col}" stroke="{col}" stroke-width="2.5" stroke-linejoin="round"/>'

def head(c, expr, tilt=0, cap=True):
    """Cabeza en el marco del tronco, cuello en (1,-131). tilt gira la cabeza sobre el cuello."""
    g = [f'<g transform="rotate({tilt} 2 -133)">']
    g.append(L([(1.5, -130), (3.4, -140)], c['skinD'], 7))
    g.append('<g transform="translate(0.5 -3)">')   # cuello algo más largo: 7,7 cabezas
    # cabeza de perfil con nariz
    g.append(f'<path d="M5 -159 C12.5 -159 15.5 -153.5 15.3 -148.6 L17.2 -144.8 Q17.4 -143.6 15.4 -143.4 '
             f'Q15.2 -139.5 13 -138.2 Q9 -136.2 4.5 -137 C-2.5 -138 -5 -142.5 -5 -148 C-5 -154.5 -1 -159 5 -159 Z" fill="{c["skin"]}"/>')
    g.append(f'<path d="M-5 -149 Q-5.6 -140.5 -1.5 -138.6 L0.6 -147.4 Z" fill="{c["hair"]}"/>')
    g.append(f'<ellipse cx="1.6" cy="-146.8" rx="2.2" ry="2.9" fill="{c["skinD"]}"/>')
    if cap:
        g.append(f'<path d="M-6 -149.6 C-7 -164.5 16 -166.5 16.2 -151.4 Z" fill="{c["cap"]}"/>')
        g.append(f'<path d="M12 -152.4 L27 -150.8 Q27.4 -147.9 12 -148.4 Z" fill="{c["visor"]}"/>')
        g.append(f'<path d="M-6 -150.6 Q5 -152.5 16.2 -151.6" stroke="{c["accent"]}" stroke-width="1" fill="none"/>')
    else:  # pelo corto
        g.append(f'<path d="M-5.6 -147 C-7 -161 8 -163.5 14.6 -153.5 Q10 -155.4 6 -153.6 Q1 -152 -1.5 -146.5 Z" fill="{c["hair"]}"/>')
    ink = c['ink']
    if expr == 'concentrado':
        g.append(L([(10.2, -145.6), (13.1, -145.3)], ink, 1.6))
    elif expr == 'neutro':
        g.append(f'<circle cx="11.8" cy="-145.6" r="1.25" fill="{ink}"/>')
    elif expr == 'esfuerzo':
        g.append(L([(10.2, -145.4), (13.1, -145.8)], ink, 1.6))
        g.append(L([(11.5, -140.2), (14.4, -140.4)], ink, 1.2))
    elif expr == 'contento':
        g.append(f'<path d="M10 -144.8 Q11.7 -147.2 13.4 -144.8" stroke="{ink}" stroke-width="1.5" fill="none" stroke-linecap="round"/>')
        g.append(f'<path d="M10.6 -140.4 Q12.7 -137.6 15 -140.4 Z" fill="{ink}"/>')
    elif expr == 'dormido':
        g.append(f'<path d="M10 -145.8 Q11.7 -144 13.4 -145.8" stroke="{ink}" stroke-width="1.4" fill="none" stroke-linecap="round"/>')
    g.append('</g></g>')
    return g

def figure(pose, c=PAL, expr='neutro', dorsal='43', sleeves=True, scale=1.0, tx=0, ty=0, flip=False):
    """pose: hip, lean, feet (A1 lejano, A2 cercano) y manos (H1 cercana, H2 lejana), con bends y ángulos de pie."""
    hip = pose['hip']; lean = pose.get('lean', 0)
    S = rot((hip[0], hip[1] - LTR), lean, hip)
    K1, A1 = ik(hip, pose['A1'], LT, LS, pose.get('kb1', 1))
    K2, A2 = ik(hip, pose['A2'], LT, LS, pose.get('kb2', 1))
    E1, H1 = ik(S, pose['H1'], LU, LF, pose.get('eb1', -1))
    E2, H2 = ik(S, pose['H2'], LU, LF, pose.get('eb2', -1))
    # articulaciones forzadas (escorzo): si la pose trae K1/K2/E1/E2, mandan sobre la IK
    K1 = pose.get('K1', K1); K2 = pose.get('K2', K2); E1 = pose.get('E1', E1); E2 = pose.get('E2', E2)
    if 'K1' in pose: A1 = pose['A1']
    if 'K2' in pose: A2 = pose['A2']
    if 'E1' in pose: H1 = pose['H1']
    if 'E2' in pose: H2 = pose['H2']
    sx = -scale if flip else scale
    g = [f'<g transform="translate({tx:.1f} {ty:.1f}) scale({sx} {scale})">']
    if pose.get('shadow', True):
        g.append(f'<ellipse cx="{pose.get("shx", hip[0]):.1f}" cy="0" rx="{pose.get("shr", 34)}" ry="4" fill="{c["ink"]}" opacity=".10"/>')
    g.extend(pose.get('behind', []))
    # brazo lejano
    g.append(L([S, E2], c['skinD'], 8.5)); g.append(L([E2, H2], c['skinD'], 7.5))
    if sleeves: g.append(shorts_leg(S, E2, 11.5, .40, c['navyD']))
    # pierna lejana
    g.append(L([hip, K1], c['skinD'], 12.5)); g.append(L([K1, A1], c['skinD'], 9.5))
    g.append(shoe(A1, pose.get('fa1', 0), c['shoeD'], c['sole']))
    # pierna cercana
    g.append(L([hip, K2], c['skin'], 13)); g.append(L([K2, A2], c['skin'], 10))
    g.append(shoe(A2, pose.get('fa2', 0), c['shoe'], c['sole']))
    # pantalón corto
    g.append(shorts_leg(hip, K1, 15, .40, c['navyS']))
    g.append(shorts_leg(hip, K2, 16, .42, c['navyS']))
    g.append(f'<g transform="translate({hip[0]:.1f} {hip[1]:.1f}) rotate({lean}) translate(0 84)">')
    g.append(f'<path d="M-12 -92 H11 L11 -83 Q0 -78 -12 -82 Z" fill="{c["navyS"]}"/>')
    # tronco
    g.append(f'<path d="M-12 -128 Q-2 -135 10 -131 Q15 -122 12.5 -106 Q10.5 -96 11 -86 Q0 -82 -12 -85 Q-11 -97 -13 -110 Q-14 -120 -12 -128 Z" fill="{c["navy"]}"/>')
    g.append(f'<path d="M-12 -128 Q-14 -120 -13 -110 Q-11 -97 -12 -85 Q-8 -83.6 -5 -83.4 Q-7 -101 -5 -129.5 Z" fill="{c["navyD"]}" opacity=".6"/>')
    if dorsal:
        g.append(f'<g transform="rotate(-4 3 -109)"><rect x="-2.5" y="-117.5" width="13.5" height="12.5" rx="1.5" fill="#FFFFFF"/>'
                 f'<text x="4.25" y="-108.1" font-size="7.4" font-weight="700" text-anchor="middle" fill="{c["ink"]}" font-family="Barlow, system-ui, sans-serif">{dorsal}</text></g>')
    g.extend(head(c, expr, pose.get('tilt', 0), pose.get('cap', True)))
    g.append('</g>')
    # brazo cercano
    g.append(L([S, E1], c['skin'], 8.5)); g.append(L([E1, H1], c['skin'], 7.5))
    if sleeves: g.append(shorts_leg(S, E1, 11.5, .40, c['navy']))
    g.extend(pose.get('front', []))
    g.append('</g>')
    return '\n'.join(g), dict(S=S, E1=E1, H1=H1, E2=E2, H2=H2, K1=K1, A1=A1, K2=K2, A2=A2, hip=hip)

# ---------------- poses ----------------
CORRE = dict(hip=(0, -86), lean=9, A1=(24, -29), kb1=-1, fa1=4, A2=(-47, -37), kb2=-1, fa2=128,
             H1=(38, -122), eb1=1, H2=(-24, -99), eb2=1, shx=-4, shr=38)
CELEBRA = dict(hip=(0, -85), lean=-4, tilt=-8, A1=(9, -6), kb1=-1, fa1=0, A2=(-15, -9), kb2=-1, fa2=-14,
               H1=(22, -182), eb1=1, H2=(-10, -184), eb2=-1, shr=30)


# ---------------- figura de frente ----------------
def figure_front(p, c=PAL, expr='neutro', dorsal='43', scale=1.0, tx=0, ty=0, shadow=True):
    """De frente. p: manos HL/HR, pies AL/AR (L = izquierda del dibujo), bends. Cadera en y=-84."""
    hipL, hipR = (-7, p.get('hy', -84)), (7, p.get('hy', -84))
    SL, SR = (-14, p.get('hy', -84) - 44), (14, p.get('hy', -84) - 44)
    KL, AL = ik(hipL, p['AL'], LT, LS, p.get('kbL', 1))
    KR, AR = ik(hipR, p['AR'], LT, LS, p.get('kbR', -1))
    EL, HL = ik(SL, p['HL'], LU, LF, p.get('ebL', -1))
    ER, HR = ik(SR, p['HR'], LU, LF, p.get('ebR', 1))
    oy = p.get('hy', -84) + 84
    g = [f'<g transform="translate({tx:.1f} {ty:.1f}) scale({scale})">']
    if shadow:
        g.append(f'<ellipse cx="0" cy="0" rx="26" ry="3.6" fill="{c["ink"]}" opacity=".10"/>')
    g.extend(p.get('behind', []))
    for (H_, K_, A_) in ((hipL, KL, AL), (hipR, KR, AR)):
        g.append(L([H_, K_], c['skin'], 12.5)); g.append(L([K_, A_], c['skin'], 9.5))
        x, y = A_
        g.append(f'<path d="M{x-5.5:.1f} {y+5:.1f} Q{x-6:.1f} {y-3:.1f} {x:.1f} {y-3.5:.1f} Q{x+6:.1f} {y-3:.1f} {x+5.5:.1f} {y+5:.1f} Z" fill="{c["shoe"]}"/>')
        g.append(L([(x - 5, y + 4.6), (x + 5, y + 4.6)], c['sole'], 1.8))
    g.append(shorts_leg(hipL, KL, 15, .40, c['navyS'])); g.append(shorts_leg(hipR, KR, 15, .40, c['navyS']))
    g.append(f'<g transform="translate(0 {oy})">')
    g.append(f'<path d="M-14 -92 H14 L14.5 -80 H-14.5 Z" fill="{c["navyS"]}"/>')
    # tronco en V suave
    g.append(f'<path d="M-15 -129 Q0 -133 15 -129 Q17.5 -118 14 -104 Q12.5 -95 13.5 -86 Q0 -82 -13.5 -86 Q-12.5 -95 -14 -104 Q-17.5 -118 -15 -129 Z" fill="{c["navy"]}"/>')
    g.append(f'<path d="M5 -130.5 Q15 -130 15 -129 Q17.5 -118 14 -104 Q12.5 -95 13.5 -86 Q10 -84.5 7 -84 Q10 -106 5 -130.5 Z" fill="{c["navyD"]}" opacity=".45"/>')
    if dorsal:
        g.append(f'<rect x="-7.5" y="-118" width="15" height="13" rx="1.5" fill="#FFFFFF"/>'
                 f'<text x="0" y="-108.2" font-size="7.8" font-weight="700" text-anchor="middle" fill="{c["ink"]}" font-family="Barlow, system-ui, sans-serif">{dorsal}</text>')
    # cuello y cabeza de frente
    g.append(L([(0, -129), (0, -139)], c['skinD'], 8))
    g.append('<g transform="translate(0 -3)">')
    g.append(f'<ellipse cx="-10" cy="-147" rx="2.2" ry="3" fill="{c["skinD"]}"/><ellipse cx="10" cy="-147" rx="2.2" ry="3" fill="{c["skinD"]}"/>')
    g.append(f'<path d="M0 -159 C7.5 -159 10 -154 10 -148 C10 -141 6 -136.5 0 -136.5 C-6 -136.5 -10 -141 -10 -148 C-10 -154 -7.5 -159 0 -159 Z" fill="{c["skin"]}"/>')
    g.append(f'<path d="M-10 -149 Q-10.6 -143 -9 -141 L-8.4 -148 Z" fill="{c["hair"]}"/><path d="M10 -149 Q10.6 -143 9 -141 L8.4 -148 Z" fill="{c["hair"]}"/>')
    g.append(f'<path d="M-10.8 -150 C-11 -165 11 -165 10.8 -150 Z" fill="{c["cap"]}"/>')
    g.append(f'<path d="M-11.5 -151 Q0 -146.2 11.5 -151 L11 -148.6 Q0 -144.4 -11 -148.6 Z" fill="{c["visor"]}"/>')
    g.append(f'<path d="M-10.8 -151.4 Q0 -154 10.8 -151.4" stroke="{c["accent"]}" stroke-width="1" fill="none"/>')
    ink = c['ink']
    if expr == 'contento':
        for ex in (-4, 4):
            g.append(f'<path d="M{ex-1.8} -142.6 Q{ex} -145 {ex+1.8} -142.6" stroke="{ink}" stroke-width="1.4" fill="none" stroke-linecap="round"/>')
        g.append(f'<path d="M-3 -140 Q0 -136.6 3 -140 Z" fill="{ink}"/>')
    elif expr == 'esfuerzo':
        for ex in (-4, 4):
            g.append(L([(ex - 1.6, -143), (ex + 1.6, -143)], ink, 1.5))
        g.append(L([(-2.4, -139.4), (2.4, -139.4)], ink, 1.2))
    else:
        for ex in (-4, 4):
            g.append(f'<circle cx="{ex}" cy="-143" r="1.2" fill="{ink}"/>')
    g.append('</g></g>')
    for (S_, E_, H_) in ((SL, EL, HL), (SR, ER, HR)):
        g.append(L([S_, E_], c['skin'], 8.5)); g.append(L([E_, H_], c['skin'], 7.5))
        g.append(shorts_leg(S_, E_, 11.5, .40, c['navy']))
    g.extend(p.get('front', []))
    g.append('</g>')
    return '\n'.join(g), dict(SL=SL, SR=SR, EL=EL, ER=ER, HL=HL, HR=HR, KL=KL, KR=KR, AL=AL, AR=AR)

CELEBRA_F = dict(HL=(-40, -178), HR=(40, -178), ebL=1, ebR=-1, AL=(-12, -6), AR=(12, -6), kbL=1, kbR=-1)

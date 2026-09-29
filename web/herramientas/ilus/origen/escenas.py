#!/usr/bin/env python3
"""Escenas de la mascota: barra, valla, sueño y apto. Cada una es una tarjeta de 360 × 250.
Los números que aparecen salen de datos/plan.json e historial.json (a 29-9-2026) y en la web los pondría el JS.
Convención de honestidad: lo MEDIDO va relleno; lo AUTOINFORMADO o ESTIMADO, hueco y con trazo discontinuo.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig import figure, figure_front, PAL, CELEBRA_F

C = dict(PAL, rule='#E3E9EF', red='#BE2C16', redbg='#F7DED8', ok='#12775A', okbg='#E3F1EA',
         warn='#9C6B00', warnbg='#FDF1D6', band='#F1F5F8', steel='#8C9CAD', wood='#C9D4DE')
FONT = 'font-family="Barlow, system-ui, sans-serif"'
MONO = 'font-family="IBM Plex Mono, ui-monospace, monospace"'
W, H = 360, 250

def card(inner, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" {FONT} role="img"><title>{title}</title>'
            f'<rect width="{W}" height="{H}" rx="14" fill="{C["paper"]}"/>' + inner + '</svg>')

# ---------------------------------------------------------------- barra
def escena_barra(reps=11, validado=False, suelo=12, objetivo=15):
    # arriba de la dominada, perfil: barra al tercio inferior del cuello, barbilla por encima
    bar_y, bar_x = 58, 104
    # coordenadas locales: manos en (18,-134) → trasladamos para que caigan en la barra
    s = 0.78
    tx, ty = bar_x - 18 * s, bar_y + 131.8 * s
    pose = dict(hip=(0, -84), lean=-2, A1=(4, -8), kb1=-1, fa1=62, A2=(1, -6), kb2=-1, fa2=70,
                H1=(18, -131.8), eb1=1, H2=(18, -131.8), eb2=1, shadow=False)
    fig, _ = figure(pose, expr='esfuerzo', scale=s, tx=tx, ty=ty, dorsal=None)
    g = []
    # estación vista de lado: poste delante del atleta y brazo que sostiene la barra (en sección)
    px = 184
    g.append(f'<path d="M{px} 214 V{bar_y} H{bar_x+4}" stroke="{C["wood"]}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')
    g.append(f'<path d="M20 216 H206" stroke="{C["rule"]}" stroke-width="2"/>')
    g.append(fig)
    g.append(f'<circle cx="{bar_x}" cy="{bar_y}" r="3" fill="{C["ink"]}"/>'
             f'<path d="M{bar_x-4.4} {bar_y+0.8} A4.4 4.4 0 0 1 {bar_x+4.4} {bar_y+0.8}" stroke="{C["skin"]}" stroke-width="2.2" fill="none" stroke-linecap="round"/>')
    # contador: 17 píldoras de abajo arriba, zonas del baremo
    x0, yb, step = 254, 214, 10.2
    pts = {0: range(0, 5), 1: [5], 2: [6], 3: [7], 4: [8, 9], 5: [10, 11], 6: [12, 13], 7: [14], 8: [15], 9: [16], 10: [17]}
    def pts_de(n):
        for p, r in pts.items():
            if n in r: return p
    for n in range(1, 18):
        y = yb - n * step
        p = pts_de(n)
        if n <= reps:
            fill = C['red'] if p == 0 else C['navy']
            if validado:
                g.append(f'<rect x="{x0}" y="{y:.1f}" width="26" height="7.4" rx="3.7" fill="{fill}"/>')
            else:
                g.append(f'<rect x="{x0+0.8}" y="{y+0.8:.1f}" width="24.4" height="5.8" rx="2.9" fill="{fill}" fill-opacity=".22" stroke="{fill}" stroke-width="1.4" stroke-dasharray="3 2"/>')
        else:
            col = C['ok'] if n <= objetivo else C['rule']
            g.append(f'<rect x="{x0+0.8}" y="{y+0.8:.1f}" width="24.4" height="5.8" rx="2.9" fill="none" stroke="{col}" stroke-width="1.4"/>')
        if n == reps:
            g.append(f'<path d="M{x0-6} {y+3.7:.1f} l-6 -4 v8 z" fill="{C["ink"]}"/>')
            g.append(f'<text x="{x0-16}" y="{y+7.5:.1f}" font-size="12" font-weight="700" fill="{C["ink"]}" text-anchor="end">tú {reps}</text>')
            g.append(f'<text x="{x0-16}" y="{y+20:.1f}" font-size="10.5" fill="{C["muted"]}" text-anchor="end">{pts_de(reps)} pts</text>')
        if n in (4, suelo, objetivo, 17):
            lab = {4: '0–4 elimina', suelo: f'{suelo} · {pts_de(suelo)} pts', objetivo: f'{objetivo} · {pts_de(objetivo)} pts', 17: '17 · 10 pts'}[n]
            col = C['red'] if n == 4 else (C['ok'] if n in (suelo, objetivo) else C['muted'])
            g.append(f'<text x="{x0+34}" y="{y+7:.1f}" font-size="11" font-weight="500" fill="{col}">{lab}</text>')
    estado = 'validadas en vídeo' if validado else 'autoinformadas: van huecas hasta el vídeo'
    g.append(f'<text x="24" y="238" font-size="11" fill="{C["muted"]}">{reps} {estado}</text>')
    return card(''.join(g), 'Dominadas: tu máximo frente al baremo')

# ---------------------------------------------------------------- valla
def escena_valla(t=None, objetivo=9.3, corte=11.7):
    g = []
    ground = 196
    g.append(f'<path d="M0 {ground} H{W}" stroke="{C["rule"]}" stroke-width="2"/>')
    # sin conos ni picas: el recorrido real es el del gráfico del BOE y no se inventa
    # valla
    hx = 150; top = ground - 40
    g.append(f'<path d="M{hx} {ground} V{top}" stroke="{C["steel"]}" stroke-width="3" stroke-linecap="round"/>')
    g.append(f'<path d="M{hx-9} {ground} H{hx+9}" stroke="{C["steel"]}" stroke-width="3" stroke-linecap="round"/>')
    g.append(f'<rect x="{hx-4}" y="{top-2}" width="8" height="9" rx="2" fill="{C["ink"]}"/>')
    # mascota franqueando: pierna de ataque (cercana) extendida por encima de la valla,
    # la de impulso (lejana) con el muslo hacia fuera (escorzo) y el pie atrás; brazo contrario adelante
    s = 0.74
    hipw = (0, -104)
    pose = dict(hip=hipw, lean=30, tilt=-10,
                K2=(34, -103), A2=(70, -99), fa2=-72,
                K1=(4, -92), A1=(-34, -96), fa1=178,
                E2=(20, -130), H2=(42, -124),
                E1=(-8, -108), H1=(-26, -118),
                A1_=None, shadow=False)
    pose.update(dict(H1=(-26, -118), H2=(42, -124)))
    fig, _ = figure(dict(pose, A1=(-34, -96), A2=(70, -99)), expr='concentrado', scale=s, tx=hx - 22, ty=ground + 24)
    g.append(f'<ellipse cx="{hx+4}" cy="{ground}" rx="34" ry="3.6" fill="{C["ink"]}" opacity=".10"/>')
    for yy, a2, b2 in ((ground-86, 40, 70), (ground-70, 30, 62)):
        g.append(f'<path d="M{a2} {yy} H{b2}" stroke="#C9D4DE" stroke-width="2.6" stroke-linecap="round"/>')
    g.append(fig)
    # cronómetro: hueco porque no hay medición seria
    cx, cy, r = 296, 70, 26
    medido = t is not None
    g.append(f'<rect x="{cx-5}" y="{cy-r-9}" width="10" height="6" rx="2" fill="{C["ink"]}"/>')
    if medido:
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{C["ink"]}"/>')
        g.append(f'<text x="{cx}" y="{cy+6}" font-size="17" font-weight="700" fill="#FFF" text-anchor="middle" {MONO}>{t:.1f}</text>'.replace('.', ','))
    else:
        g.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#FFF" stroke="{C["ink"]}" stroke-width="2" stroke-dasharray="4 3"/>')
        g.append(f'<text x="{cx}" y="{cy+1}" font-size="15" font-weight="700" fill="{C["ink"]}" text-anchor="middle" {MONO}>¿?</text>')
        g.append(f'<text x="{cx}" y="{cy+14}" font-size="9" fill="{C["muted"]}" text-anchor="middle">sin medir</text>')
    # escala del baremo del circuito (s): 8,2 → 11,7
    x0, x1, yb = 24, 336, 222
    t0, t1 = 8.0, 12.0
    X = lambda v: x0 + (v - t0) / (t1 - t0) * (x1 - x0)
    zonas = [(10, 0, 8.25), (9, 8.25, 8.85), (8, 8.85, 9.35), (7, 9.35, 9.75), (6, 9.75, 10.15), (5, 10.15, 10.55),
             (4, 10.55, 10.95), (3, 10.95, 11.25), (2, 11.25, 11.45), (1, 11.45, 11.65), (0, 11.65, 99)]
    greens = {1: '#E3F1EA', 2: '#CBE6D9', 3: '#ADD8C4', 4: '#86C5A8', 5: '#5AAE8B', 6: '#349370', 7: '#1B7E5E', 8: '#0F6B4F', 9: '#0B5C43', 10: '#084D38'}
    for p, a, b in zonas:
        a2, b2 = max(a, t0), min(b, t1)
        col = C['red'] if p == 0 else greens[p]
        g.append(f'<rect x="{X(a2):.1f}" y="{yb}" width="{X(b2)-X(a2):.1f}" height="7" fill="{col}"/>')
    for v, lab, col in ((objetivo, f'objetivo {objetivo:.1f}'.replace('.', ','), C['ok']), (corte, f'{corte:.1f} elimina'.replace('.', ','), C['red'])):
        g.append(f'<path d="M{X(v):.1f} {yb-5} V{yb+10}" stroke="{col}" stroke-width="2"/>')
        g.append(f'<text x="{X(v):.1f}" y="{yb+22}" font-size="10.5" font-weight="600" fill="{col}" text-anchor="middle">{lab}</text>')
    g.append(f'<text x="{x0}" y="{yb-8}" font-size="10.5" fill="{C["muted"]}">segundos · menos es mejor</text>')
    return card(''.join(g), 'Circuito: salto de valla y tiempo frente al baremo')

# ---------------------------------------------------------------- sueño
def escena_sueno(horas=2 + 14/60, color=None):
    """color manda si viene del semáforo completo (VFC, «Sobrecarga», dolor); si no, se deduce de las horas."""
    g = []
    # cama
    bx, by = 24, 164
    g.append(f'<rect x="{bx}" y="{by}" width="214" height="16" rx="4" fill="{C["wood"]}"/>')
    g.append(f'<path d="M{bx+4} {by+16} V{by+26} M{bx+210} {by+16} V{by+26}" stroke="{C["steel"]}" stroke-width="4" stroke-linecap="round"/>')
    g.append(f'<rect x="{bx-4}" y="{by-40}" width="8" height="80" rx="3" fill="{C["steel"]}"/>')      # cabecero
    g.append(f'<rect x="{bx+208}" y="{by-18}" width="8" height="58" rx="3" fill="{C["steel"]}"/>')    # piecero
    # gorra colgada en el cabecero
    g.append(f'<g transform="translate({bx} {by-44}) rotate(-14)"><path d="M-9 0 C-9 -12 9 -12 9 0 Z" fill="{C["cap"]}"/><path d="M7 -1 L18 0.5 Q18 3 7 2.5 Z" fill="{C["visor"]}"/><path d="M-9 -0.6 Q0 -2.4 9 -0.6" stroke="{C["accent"]}" stroke-width="1" fill="none"/></g>')
    # almohada
    g.append(f'<rect x="{bx+6}" y="{by-18}" width="44" height="20" rx="9" fill="#FFFFFF" stroke="{C["rule"]}" stroke-width="1.5"/>')
    # mascota tumbada boca arriba: la figura de pie girada -90º
    pose = dict(hip=(0, -84), lean=0, A1=(2, -5), kb1=-1, fa1=80, A2=(0, -5), kb2=-1, fa2=80,
                H1=(10, -86), eb1=1, H2=(8, -84), eb2=1, shadow=False, cap=False)
    if color: act0 = color
    elif horas >= 6.5: act0 = 'verde'
    elif horas >= 5.0: act0 = 'ambar'
    else: act0 = 'rojo'
    fig, _ = figure(pose, expr='dormido' if act0 != 'rojo' else 'neutro', dorsal=None, scale=1.0)
    s = 0.86
    g.append(f'<g transform="translate({bx+160} {by-3}) scale({s}) rotate(-90)">{fig}</g>')
    # manta
    g.append(f'<path d="M{bx+60} {by+2} Q{bx+60} {by-22} {bx+84} {by-23} H{bx+188} Q{bx+204} {by-22} {bx+206} {by-8} V{by+2} Z" fill="{C["navy"]}"/>')
    g.append(f'<path d="M{bx+60} {by+2} Q{bx+60} {by-22} {bx+84} {by-23} H{bx+96} Q{bx+76} {by-20} {bx+75} {by+2} Z" fill="{C["accent"]}" opacity=".55"/>')
    # luna
    g.append(f'<path d="M150 52 A20 20 0 1 0 176 78 A16 16 0 1 1 150 52 Z" fill="{C["wood"]}"/>')
    # semáforo de la mañana (plan: verde 6h30 o más; ámbar 5h00-6h29; rojo menos de 5h00)
    act = act0
    col = dict(verde=C['ok'], ambar='#D08A00', rojo=C['red'])
    sx, sy = 294, 40
    g.append(f'<rect x="{sx-17}" y="{sy-17}" width="34" height="96" rx="17" fill="{C["ink"]}"/>')
    for i, k in enumerate(('rojo', 'ambar', 'verde')):
        on = (k == act)
        g.append(f'<circle cx="{sx}" cy="{sy + i*31}" r="10.5" fill="{col[k] if on else "#2E3A47"}"/>')
    hh = int(horas); mm = int(round((horas - hh) * 60))
    g.append(f'<text x="{sx}" y="{sy+106}" font-size="15" font-weight="700" fill="{C["ink"]}" text-anchor="middle" {MONO}>{hh}h{mm:02d}</text>')
    txt = {'verde': 'sesión como está', 'ambar': 'dos tercios, mismo ritmo', 'rojo': '30–40 min, techo 145'}[act]
    for k, linea in enumerate(txt.split(', ')):
        g.append(f'<text x="{sx}" y="{sy+121+k*13}" font-size="10.5" fill="{col[act]}" text-anchor="middle" font-weight="600">{linea}</text>')
    g.append(f'<text x="24" y="226" font-size="11" fill="{C["muted"]}">Verde 6h30 o más · ámbar 5h00–6h29</text>')
    g.append(f'<text x="24" y="241" font-size="11" fill="{C["muted"]}">Rojo: menos de 5h00, VFC desequilibrada o «Sobrecarga»</text>')
    return card(''.join(g), 'Semáforo de sueño de cada mañana')

# ---------------------------------------------------------------- apto
def escena_apto(media=5.67, notas=(('1.000 m', 3), ('Dominadas', 6), ('Circuito', 8))):
    g = []
    ground = 196
    apto = media >= 5 and all(n > 0 for _, n in notas)
    # tres pedestales con los puntos de cada prueba (altura = puntos)
    bw, gap, x0 = 52, 10, 22
    for i, (nom, p) in enumerate(notas):
        h = 6 + p * 11
        x = x0 + i * (bw + gap)
        col = C['red'] if p == 0 else (C['ok'] if p >= 5 else '#86C5A8')
        g.append(f'<rect x="{x}" y="{ground-h}" width="{bw}" height="{h}" rx="4" fill="{col}"/>')
        g.append(f'<text x="{x+bw/2}" y="{ground-h-7}" font-size="15" font-weight="700" fill="{C["ink"]}" text-anchor="middle" {MONO}>{p}</text>')
        g.append(f'<text x="{x+bw/2}" y="{ground+16}" font-size="10.5" fill="{C["muted"]}" text-anchor="middle">{nom}</text>')
    # línea del 5
    y5 = ground - (6 + 5 * 11)
    g.append(f'<path d="M{x0-6} {y5} H{x0 + 3*bw + 2*gap + 6}" stroke="{C["ink"]}" stroke-width="1.4" stroke-dasharray="4 3"/>')
    g.append(f'<text x="{x0 + 3*bw + 2*gap + 8}" y="{y5+4}" font-size="10.5" fill="{C["ink"]}">5 = apto</text>')
    g.append(f'<path d="M0 {ground} H{W}" stroke="{C["rule"]}" stroke-width="2"/>')
    # mascota
    if apto:
        fig, _ = figure_front(CELEBRA_F, expr='contento', scale=0.72, tx=296, ty=ground)
    else:
        p = dict(HL=(-18, -80), HR=(18, -80), ebL=1, ebR=-1, AL=(-9, -6), AR=(9, -6))
        fig, _ = figure_front(p, expr='esfuerzo', scale=0.72, tx=296, ty=ground)
    g.append(fig)
    tag_col = C['ok'] if apto else C['red']
    g.append(f'<rect x="22" y="22" width="112" height="30" rx="15" fill="{tag_col}"/>')
    g.append(f'<text x="78" y="42" font-size="14" font-weight="700" fill="#FFF" text-anchor="middle">{"APTO" if apto else "NO APTO"} · {media:.2f}</text>'.replace('.', ',', 1) if False else
             f'<text x="78" y="42" font-size="14" font-weight="700" fill="#FFF" text-anchor="middle">{"APTO" if apto else "NO APTO"} · {str(round(media, 2)).replace(".", ",")}</text>')
    g.append(f'<text x="24" y="238" font-size="11" fill="{C["muted"]}">Escenario realista: 3:34 · 12 dominadas · 9,0 s</text>')
    return card(''.join(g), 'Nota: media de las tres pruebas y apto')

if __name__ == '__main__':
    esc = {'escena_barra.svg': escena_barra(), 'escena_valla.svg': escena_valla(),
           'escena_sueno.svg': escena_sueno(), 'escena_apto.svg': escena_apto()}
    open('escena_sueno_verde.svg', 'w').write(escena_sueno(6 + 42/60))
    for n, s in esc.items():
        open(n, 'w').write(s)
    # hoja 2 × 2
    sheet = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {2*W+20} {2*H+20}"><rect width="{2*W+20}" height="{2*H+20}" fill="#E9EEF3"/>']
    for i, n in enumerate(esc):
        x, y = (i % 2) * (W + 20), (i // 2) * (H + 20)
        inner = esc[n]
        sheet.append(f'<svg x="{x}" y="{y}" width="{W}" height="{H}" ' + inner[inner.find('viewBox'):])
    sheet.append('</svg>')
    open('escenas.svg', 'w').write('\n'.join(sheet))
    print('ok')

"""Marcas de las láminas técnicas (§7.3).

  número negro en círculo  = regla del BOE          (kind 'boe',  --text)
  letra azul en círculo    = consejo del plan        (kind 'plan', --primary)
  PI-1, PI-2, PI-3         = posición inicial del BOE (kind 'pi',  --text, píldora)
  aspa roja                = nula o «lo que no»       (aspa(), --bad)
  verde                    = cota, ángulo o referencia correcta (--ok)

Cada marca es un <g class="ill-m" data-n="…"> con su geometría, la guía y la insignia. El JS (16_ilustracion.js)
le pone rol, foco y aria-label con el texto literal de la leyenda, y enlaza la leyenda HTML con el dibujo.
Nada de glifos: el aspa y las flechas son trazos.
"""
import math
from rig import n, P

COL = dict(boe='var(--text)', plan='var(--primary)', pi='var(--text)', bad='var(--bad)', ok='var(--ok)',
           ref='var(--text-3)')
TXT = dict(boe='var(--surface)', plan='var(--on-primary)', pi='var(--surface)')
FS = 14          # tamaño de letra de referencia dentro de un panel de 360 (12,6 px a 324 px de ancho)
R = 11           # radio de la insignia


def texto(x, y, t, col='var(--text-2)', size=FS, weight=None, anchor='start', extra='', halo=False):
    w = f' font-weight="{weight}"' if weight else ''
    a = f' text-anchor="{anchor}"' if anchor != 'start' else ''
    h = ';paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round' if halo else ''
    if '|' in t:     # varias líneas: el interlineado va en em y crece con la letra
        partes = t.split('|')
        t = partes[0] + ''.join(f'<tspan x="{n(x)}" dy="1.15em">{p}</tspan>' for p in partes[1:])
    return f'<text class="ill-t" x="{n(x)}" y="{n(y)}" font-size="{n(size)}"{w}{a} style="fill:{col}{h}"{extra}>{t}</text>'


def insignia(x, y, lab, kind):
    col, tc = COL[kind], TXT.get(kind, 'var(--surface)')
    if kind == 'pi':
        w = 44
        return (f'<g class="ill-b"><rect x="{n(x-w/2)}" y="{n(y-R)}" width="{w}" height="{2*R}" rx="{R}" style="fill:{col}"/>'
                f'<text class="ill-t" x="{n(x)}" y="{n(y+4.6)}" font-size="13" font-weight="700" text-anchor="middle" style="fill:{tc}">{lab}</text></g>')
    return (f'<g class="ill-b"><circle cx="{n(x)}" cy="{n(y)}" r="{R}" style="fill:{col}"/>'
            f'<text class="ill-t" x="{n(x)}" y="{n(y+4.8)}" font-size="{14 if len(lab) == 1 else 12}" font-weight="700" text-anchor="middle" style="fill:{tc}">{lab}</text></g>')


def guia(p, q, kind, dot=True):
    """Línea fina desde el punto señalado p hasta el borde de la insignia en q."""
    col = COL[kind]
    dx, dy = q[0] - p[0], q[1] - p[1]
    d = math.hypot(dx, dy) or 1
    edge = R + 1 if kind != 'pi' else 12
    qe = (q[0] - dx / d * edge, q[1] - dy / d * edge) if d > edge else q
    s = f'<path class="ill-ld" d="M{P(p)}L{P(qe)}" style="stroke:{col}"/>'
    if dot:
        s += f'<circle cx="{n(p[0])}" cy="{n(p[1])}" r="2.6" style="fill:{col}"/>'
    return s


def marca(nid, kind, pos, target=None, geom='', lab=None, dot=True, extra=''):
    lab = lab or nid
    g = [f'<g class="ill-m" data-n="{nid}" data-k="{kind}">', geom]
    if target is not None:
        g.append(guia(target, pos, kind, dot))
    g.append(extra)
    g.append(f'<circle class="ill-hit" cx="{n(pos[0])}" cy="{n(pos[1])}" r="24"/>')   # zona de toque: el JS la lleva a 44 px
    g.append(insignia(pos[0], pos[1], lab, kind))
    g.append('</g>')
    return ''.join(g)


def aspa(x, y, r=11):
    """Aspa roja dibujada con trazos (no con el carácter ✕)."""
    k = r * .42
    return (f'<g class="ill-a"><circle cx="{n(x)}" cy="{n(y)}" r="{r}" style="fill:var(--bad-soft);stroke:var(--bad)" stroke-width="1.8"/>'
            f'<path class="il" d="M{n(x-k)} {n(y-k)}L{n(x+k)} {n(y+k)}M{n(x+k)} {n(y-k)}L{n(x-k)} {n(y+k)}" style="stroke:var(--bad)" stroke-width="2.6"/></g>')


def flecha(pts, col, w=2.2, cabeza=7, curva=None, dash=None, cls='ill-ref'):
    """Flecha (línea o cuadrática con control 'curva') con punta dibujada."""
    a, b = pts[0], pts[-1]
    ds = f' stroke-dasharray="{dash}"' if dash else ''
    if curva:
        d = f'M{P(a)}Q{P(curva)} {P(b)}'
        tdir = (b[0] - curva[0], b[1] - curva[1])
    else:
        d = 'M' + 'L'.join(P(p) for p in pts)
        tdir = (b[0] - pts[-2][0], b[1] - pts[-2][1])
    k = math.hypot(*tdir) or 1
    ux, uy = tdir[0] / k, tdir[1] / k
    px, py = -uy, ux
    h1 = (b[0] - ux * cabeza + px * cabeza * .55, b[1] - uy * cabeza + py * cabeza * .55)
    h2 = (b[0] - ux * cabeza - px * cabeza * .55, b[1] - uy * cabeza - py * cabeza * .55)
    return (f'<path class="{cls}" d="{d}" style="stroke:{col}" stroke-width="{n(w)}"{ds}/>'
            f'<path d="M{P(h1)}L{P(b)}L{P(h2)}Z" style="fill:{col};stroke:{col};stroke-linejoin:round" stroke-width="1.2"/>')


def arco(c, r, a0, a1, col, w=2):
    """Arco de ángulo (grados en pantalla, 0 = +x, 90 = abajo)."""
    p0 = (c[0] + r * math.cos(math.radians(a0)), c[1] + r * math.sin(math.radians(a0)))
    p1 = (c[0] + r * math.cos(math.radians(a1)), c[1] + r * math.sin(math.radians(a1)))
    large = 1 if abs(a1 - a0) > 180 else 0
    sweep = 1 if a1 > a0 else 0
    return f'<path class="ill-ref" d="M{P(p0)}A{n(r)} {n(r)} 0 {large} {sweep} {P(p1)}" style="stroke:{col}" stroke-width="{n(w)}"/>'


def linea(pts, col, w=2, dash=None, cls='ill-ref'):
    ds = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<path class="{cls}" d="M' + 'L'.join(P(p) for p in pts) + f'" style="stroke:{col}" stroke-width="{n(w)}"{ds}/>'


def suelo(x0, x1, y):
    return f'<path class="il" d="M{n(x0)} {n(y)}H{n(x1)}" style="stroke:var(--border-strong)" stroke-width="2"/>'

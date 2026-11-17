"""Mide en metros de pista lo corrido en Arucas SIN el modo pista del reloj (FIT de Garmin).

Sin el perfil «Pista», cada vuelta automática de 200 m la mide el GPS. Este script proyecta el recorrido sobre la calle 1
de la pista de Arucas y dice cuántos metros de pista mide cada vuelta y en cuánto se corren 200 m de pista.

La calle 1 sale de una vuelta del simulacro de Daniel del 19-10-2026, grabado CON el modo pista
(archivos-garmin/24781784350.zip): la primera vuelta de 400 m desde el inicio del 1.000.

Uso:
  python3 herramientas/pista_arucas.py archivos-garmin/cristina/<archivo>.zip
  python3 herramientas/pista_arucas.py <archivo>.zip --ref <otro FIT de referencia en modo pista>

Las vueltas impares se tratan como repeticiones (cuando las vueltas alternan 200 corriendo y 200 andando). Usado por
primera vez el 16-11-2026 con el 6 × 200 de Cristina: las vueltas midieron entre 198 y 206 m de pista y los 200 m salieron
como los del GPS con ±1 s. Necesita fitdecode.
"""
import sys
import io
import math
import zipfile
import datetime as dt
import argparse
import os

import fitdecode

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(RAIZ, 'archivos-garmin', '24781784350.zip')
LAT0, LON0 = 28.112, -15.5205


def xy(la, lo):
    return ((lo - LON0) * 111320 * math.cos(math.radians(LAT0)), (la - LAT0) * 110574)


def leer(zp):
    z = zipfile.ZipFile(zp)
    recs, laps = [], []
    nombre = [n for n in z.namelist() if n.lower().endswith('.fit')][0]
    with fitdecode.FitReader(io.BytesIO(z.read(nombre))) as fr:
        for fm in fr:
            if not isinstance(fm, fitdecode.FitDataMessage):
                continue
            if fm.name == 'record':
                la = fm.get_value('position_lat', fallback=None)
                if la is None:
                    continue
                recs.append((fm.get_value('timestamp'), xy(la * 180 / 2 ** 31, fm.get_value('position_long') * 180 / 2 ** 31),
                             fm.get_value('distance', fallback=None), fm.get_value('heart_rate', fallback=None)))
            elif fm.name == 'lap':
                st, el = fm.get_value('start_time'), fm.get_value('total_elapsed_time')
                laps.append((st, st + dt.timedelta(seconds=el), el, fm.get_value('total_distance')))
    return recs, laps


def calle1(ref):
    R, RL = leer(ref)
    ini = [l for l in RL if abs((l[3] or 0) - 200) < 1][0]
    seg = [r for r in R if r[0] >= ini[0] and r[2] is not None]
    d0 = seg[0][2]
    return [r[1] for r in seg if r[2] - d0 <= 400.5]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('archivo')
    ap.add_argument('--ref', default=REF)
    a = ap.parse_args()
    loop = calle1(a.ref)
    L = sum(math.dist(loop[i], loop[i + 1]) for i in range(len(loop) - 1)) + math.dist(loop[-1], loop[0])
    print('vuelta de referencia (calle 1, modo pista): %d puntos, %.1f m' % (len(loop), L))
    acc = [0.0]
    for i in range(len(loop) - 1):
        acc.append(acc[-1] + math.dist(loop[i], loop[i + 1]))
    segs = [(loop[i], loop[(i + 1) % len(loop)], acc[i]) for i in range(len(loop))]

    def proyectar(p):
        best = None
        for q0, q1, s0 in segs:
            dx, dy = q1[0] - q0[0], q1[1] - q0[1]
            l2 = dx * dx + dy * dy or 1e-9
            t = max(0, min(1, ((p[0] - q0[0]) * dx + (p[1] - q0[1]) * dy) / l2))
            q = (q0[0] + t * dx, q0[1] + t * dy)
            d = math.dist(p, q)
            if best is None or d < best[0]:
                best = (d, (s0 + t * math.sqrt(l2)) % L)
        return best

    S, Rl = leer(a.archivo)
    s_un, prev, off, dists = [], None, 0.0, []
    for r in S:
        d, s = proyectar(r[1])
        dists.append(d)
        if prev is not None:
            ds = s - prev
            if ds < -L / 2:
                off += L
            elif ds > L / 2:
                off -= L
        s_un.append(s + off)
        prev = s
    dists.sort()
    print('separación de la calle 1: mediana %.1f m, p90 %.1f m (con más de 5 m, no corrió en esta pista)' % (dists[len(dists) // 2], dists[int(len(dists) * .9)]))
    sentido = 1 if s_un[-1] > s_un[0] else -1

    def s_en(t):
        for r, s in zip(S, s_un):
            if r[0] >= t:
                return s * sentido
        return s_un[-1] * sentido
    for i, (t0, t1, el, dist) in enumerate(Rl):
        da = s_en(t1) - s_en(t0)
        hr = [r[3] for r in S if t0 <= r[0] <= t1 and r[3]]
        extra = '  → 200 m de pista en %.1f s' % (el * 200 / da) if i % 2 == 0 and da > 50 else ''
        print('vuelta %2d  %5.1f s  GPS %6.1f m  pista %6.1f m%s  pulso máx %s' % (i + 1, el, dist or 0, da, extra, max(hr) if hr else '-'))
    print('distancia total por la pista %.0f m (GPS del reloj %.0f m)' % (abs(s_un[-1] - s_un[0]), S[-1][2] or 0))


if __name__ == '__main__':
    main()

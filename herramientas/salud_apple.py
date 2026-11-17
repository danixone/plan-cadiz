"""Lee la exportación completa de Salud del Apple Watch de Cristina (export.zip / exportación-N.zip) SIN extraerla.

La exportación lleva TODOS sus datos de salud: se lee en local, desde el zip, y nunca se copia al proyecto ni se sube.
Lo que se saca de un entreno (tiempos, ritmos, pulso) sí va a datos/cristina/historial.json, que es público.
Las horas de la exportación son las locales (en Canarias, UTC+0 en invierno).

Usos:
  python3 herramientas/salud_apple.py listar  <zip> <desde AAAA-MM-DD>
      entrenos desde esa fecha (tipo, inicio, fin, duración, eventos, estadísticas) y rutas GPX
  python3 herramientas/salud_apple.py rodaje  <zip> "<inicio AAAA-MM-DD HH:MM:SS>" "<fin>" <ruta gpx dentro del zip>
      bloques de 5 min (ritmo y pulso), huecos y tramos andando, pulso de los 10 primeros min,
      mitades desde el minuto 15 (Pa:HR, la deriva de CLAUDE.md) y el minuto más rápido
  python3 herramientas/salud_apple.py minuto  <zip> "<inicio>" "<fin>" <ruta gpx>
      minuto a minuto: metros, ritmo, pulso y pasos por minuto
  python3 herramientas/salud_apple.py pulso   <zip> "<inicio>" "<fin>" <paso en s>
      pulso medio y máximo cada <paso> segundos (sin GPS: CrossFit, barra)

Para un rodaje, el inicio es el de la parte corriendo: si el entreno tuvo una pausa larga al principio, la hora de
«Resume» que da «listar». Necesita Python 3 de serie (no usa librerías de fuera).
"""
import sys
import math
import zipfile
import datetime as dt
import xml.etree.ElementTree as ET

GPX = '{http://www.topografix.com/GPX/1/1}'


def fecha(s):
    return dt.datetime.strptime(s[:19], '%Y-%m-%d %H:%M:%S')


def xml_principal(z):
    """El XML grande de la exportación («export.xml» o «exportación.xml», con el nombre en NFD)."""
    return [n for n in z.namelist() if n.endswith('.xml') and 'cda' not in n and n.count('/') == 1][0]


def registros(z, tipos, t0, t1, solo_reloj=True):
    """Registros de Salud de esos tipos entre t0 y t1: lista de (inicio, fin, valor, tipo)."""
    out = []
    with z.open(xml_principal(z)) as f:
        for _, el in ET.iterparse(f, events=('end',)):
            if el.tag == 'Record':
                ty = el.get('type')
                if ty in tipos and (not solo_reloj or 'Watch' in (el.get('sourceName') or '')):
                    a = fecha(el.get('startDate'))
                    if t0 <= a <= t1:
                        out.append((a, fecha(el.get('endDate')), float(el.get('value')), ty))
                el.clear()
            elif el.tag == 'Workout':
                el.clear()
    out.sort()
    return out


def pulso(z, t0, t1, margen_antes=2, margen_despues=4):
    r = registros(z, {'HKQuantityTypeIdentifierHeartRate'}, t0 - dt.timedelta(minutes=margen_antes), t1 + dt.timedelta(minutes=margen_despues))
    return [(a, v) for a, _, v, _ in r]


def ruta(z, nombre):
    g = ET.fromstring(z.read(nombre))
    pts = []
    for p in g.iter(GPX + 'trkpt'):
        t = dt.datetime.strptime(p.find(GPX + 'time').text[:19], '%Y-%m-%dT%H:%M:%S')
        e = p.find(GPX + 'ele')
        pts.append((t, float(p.get('lat')), float(p.get('lon')), float(e.text) if e is not None else None))
    return pts


def hav(a, b):
    R = 6371000
    p1, p2 = math.radians(a[1]), math.radians(b[1])
    dl, dp = math.radians(b[2] - a[2]), p2 - p1
    return 2 * R * math.asin(math.sqrt(math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))


def acumulada(pts):
    cum = [0.0]
    for i in range(1, len(pts)):
        cum.append(cum[-1] + hav(pts[i - 1], pts[i]))
    return cum


def dist_en(pts, cum, t):
    for i in range(len(pts)):
        if pts[i][0] >= t:
            return cum[i]
    return cum[-1]


def media(v):
    return sum(v) / len(v) if v else None


def fc_entre(hr, a, b):
    v = [x for t, x in hr if a <= t < b]
    return (media(v), len(v))


def mmss(seg):
    return '%d:%02d' % (seg // 60, seg % 60)


def listar(zp, desde):
    z = zipfile.ZipFile(zp)
    print('rutas:', [n for n in z.namelist() if 'workout-routes' in n and n.split('route_')[-1][:10] >= desde])
    with z.open(xml_principal(z)) as f:
        for _, el in ET.iterparse(f, events=('end',)):
            if el.tag == 'Workout':
                if el.get('startDate', '') >= desde:
                    print('ENTRENO', el.get('workoutActivityType'), el.get('startDate'), el.get('endDate'), 'duración', el.get('duration'), el.get('durationUnit'), '·', el.get('sourceName'))
                    for c in el:
                        if c.tag == 'WorkoutStatistics':
                            print('   ', c.get('type').replace('HKQuantityTypeIdentifier', ''), {k: c.get(k) for k in ('average', 'minimum', 'maximum', 'sum', 'unit') if c.get(k)})
                        elif c.tag == 'MetadataEntry':
                            print('    meta', c.get('key'), c.get('value'))
                        elif c.tag == 'WorkoutEvent':
                            print('    evento', c.get('type'), c.get('date'), c.get('duration'))
                el.clear()
            elif el.tag == 'Record':
                el.clear()


def rodaje(zp, ini, fin, gpx):
    t0, t1 = fecha(ini), fecha(fin)
    z = zipfile.ZipFile(zp)
    hr = pulso(z, t0, t1)
    pts = ruta(z, gpx)
    cum = acumulada(pts)
    eles = [p[3] for p in pts if p[3] is not None]
    print('GPX', pts[0][0], pts[-1][0], len(pts), 'puntos', round(cum[-1]), 'm', 'altitud', min(eles) if eles else '-', max(eles) if eles else '-')
    for i in range(1, len(pts)):
        h = (pts[i][0] - pts[i - 1][0]).total_seconds()
        if h > 5:
            print('hueco', pts[i - 1][0].time(), h, 's', '·', round(hav(pts[i - 1], pts[i])), 'm de salto')
    lento = None
    for i in range(len(pts)):
        j = max(0, i - 10)
        v = (cum[i] - cum[j]) / ((pts[i][0] - pts[j][0]).total_seconds() or 1) * 3.6
        if v < 4.5 and lento is None:
            lento = pts[i][0]
        if v >= 4.5 and lento is not None:
            d = (pts[i][0] - lento).total_seconds()
            if d > 15:
                print('lento o andando', lento.time(), '→', pts[i][0].time(), d, 's')
            lento = None
    T = (t1 - t0).total_seconds()
    print('tramo', round(T / 60, 1), 'min')
    k = 0
    while t0 + dt.timedelta(minutes=5 * k) < t1:
        a = t0 + dt.timedelta(minutes=5 * k)
        b = min(t1, a + dt.timedelta(minutes=5))
        d = dist_en(pts, cum, b) - dist_en(pts, cum, a)
        s = (b - a).total_seconds()
        m, n = fc_entre(hr, a, b)
        r = s / (d / 1000) if d > 0 else 0
        print('bloque %d-%d min: %4.0f m  %s /km  pulso %s (%d)' % (5 * k, 5 * k + s / 60, d, mmss(r), round(m) if m else None, n))
        k += 1
    m10, _ = fc_entre(hr, t0, t0 + dt.timedelta(minutes=10))
    print('pulso de los 10 primeros min', round(m10, 1) if m10 else None)
    v = [x for t, x in hr if t0 <= t <= t1]
    if v:
        print('pulso: media %.1f · máximo %d · %d muestras · por encima de 150: %d' % (media(v), max(v), len(v), sum(1 for x in v if x > 150)))
    a = t0 + dt.timedelta(minutes=15)
    if a < t1:
        mid = a + (t1 - a) / 2
        pa = []
        for x, y in ((a, mid), (mid, t1)):
            d = dist_en(pts, cum, y) - dist_en(pts, cum, x)
            vel = d / (y - x).total_seconds()
            m, _ = fc_entre(hr, x, y)
            pa.append(vel / m if m else None)
            print('mitad %s-%s: %.3f m/s · %s /km · pulso %.1f · Pa:HR %.5f' % (x.time(), y.time(), vel, mmss(1000 / vel), m or 0, (vel / m) if m else 0))
        if all(pa):
            print('deriva por mitades (Pa:HR): %+.1f %%' % (100 * (1 - pa[1] / pa[0])))
    mejor = None
    for mm in range(int(T // 60)):
        x = t0 + dt.timedelta(minutes=mm)
        d = dist_en(pts, cum, x + dt.timedelta(minutes=1)) - dist_en(pts, cum, x)
        if mejor is None or d > mejor[1]:
            mejor = (mm, d, fc_entre(hr, x, x + dt.timedelta(minutes=1))[0])
    print('minuto más rápido', mejor)


def minuto(zp, ini, fin, gpx):
    t0, t1 = fecha(ini), fecha(fin)
    z = zipfile.ZipFile(zp)
    rs = registros(z, {'HKQuantityTypeIdentifierHeartRate', 'HKQuantityTypeIdentifierStepCount'}, t0 - dt.timedelta(minutes=15), t1 + dt.timedelta(minutes=4))
    hr = [(a, v) for a, _, v, ty in rs if ty.endswith('HeartRate')]
    pasos = [(a, b, v) for a, b, v, ty in rs if ty.endswith('StepCount')]
    pts = ruta(z, gpx)
    cum = acumulada(pts)

    def pasos_entre(a, b):
        s = 0
        for x, y, v in pasos:
            ov = (min(b, y) - max(a, x)).total_seconds()
            if ov > 0:
                s += v * ov / ((y - x).total_seconds() or 1)
        return s
    m = 0
    while t0 + dt.timedelta(minutes=m) < t1:
        a = t0 + dt.timedelta(minutes=m)
        b = min(t1, a + dt.timedelta(minutes=1))
        d = dist_en(pts, cum, b) - dist_en(pts, cum, a)
        s = (b - a).total_seconds()
        r = s / (d / 1000) if d > 5 else 0
        fc = fc_entre(hr, a, b)[0]
        print('min %2d %s  %4.0f m  %s /km  pulso %s  pasos/min %3.0f' % (m, a.time(), d, mmss(r), round(fc) if fc else None, pasos_entre(a, b) * 60 / s))
        m += 1


def pulso_tramos(zp, ini, fin, paso):
    t0, t1 = fecha(ini), fecha(fin)
    z = zipfile.ZipFile(zp)
    hr = pulso(z, t0, t1, 0, 0)
    t = t0
    while t < t1:
        u = t + dt.timedelta(seconds=int(paso))
        w = [x for s, x in hr if t <= s < u]
        if w:
            print(t.time(), 'n%2d' % len(w), 'media %3.0f' % media(w), 'máximo %3.0f' % max(w))
        t = u


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    orden, args = sys.argv[1], sys.argv[2:]
    {'listar': listar, 'rodaje': rodaje, 'minuto': minuto, 'pulso': pulso_tramos}[orden](*args)

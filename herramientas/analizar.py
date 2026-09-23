#!/usr/bin/env python3
"""
Analiza un entrenamiento del Garmin y saca el informe completo.

    python3 herramientas/analizar.py archivos-garmin/24362863560.zip
    python3 herramientas/analizar.py archivos-garmin/*.fit archivos-garmin/sueno.csv

Acepta .fit, .tcx, .zip (los descomprime) y .csv de sueño.
Requiere: pip install fitdecode --break-system-packages
"""
import sys, os, csv, glob, zipfile, tempfile, statistics
from datetime import datetime

try:
    import fitdecode
except ImportError:
    sys.exit("Falta fitdecode.  pip install fitdecode --break-system-packages")


def mmss(s):
    return f"{int(s // 60)}:{s % 60:04.1f}"


def ritmo(seg, metros):
    return mmss(seg / (metros / 1000)) + "/km" if metros > 20 else "—"


# ───────────────────────────── FIT ─────────────────────────────

def lee_fit(ruta):
    rec, ses, sets, sensores = [], {}, [], set()
    laps = []
    with fitdecode.FitReader(ruta) as f:
        for fr in f:
            if not isinstance(fr, fitdecode.FitDataMessage):
                continue
            if fr.name == "record":
                d = {}
                for k in ("timestamp", "distance", "heart_rate", "cadence",
                          "altitude", "enhanced_altitude", "enhanced_speed", "temperature"):
                    if fr.has_field(k):
                        d[k] = fr.get_value(k)
                rec.append(d)
            elif fr.name == "session":
                for k in ("sport", "sub_sport", "start_time", "total_timer_time",
                          "total_distance", "avg_heart_rate", "max_heart_rate",
                          "avg_cadence", "max_cadence", "total_ascent", "total_descent",
                          "avg_step_length", "avg_stance_time", "avg_vertical_oscillation",
                          "total_calories", "total_training_effect",
                          "total_anaerobic_training_effect"):
                    if fr.has_field(k):
                        ses[k] = fr.get_value(k)
            elif fr.name == "set":
                d = {}
                for k in ("repetitions", "duration", "weight", "set_type", "category"):
                    if fr.has_field(k):
                        d[k] = fr.get_value(k)
                if d.get("repetitions"):
                    sets.append(d)
            elif fr.name == "lap":
                d = {}
                for k in ("start_time", "total_distance", "total_timer_time",
                          "total_elapsed_time", "avg_heart_rate", "max_heart_rate", "lap_trigger"):
                    if fr.has_field(k):
                        d[k] = fr.get_value(k)
                laps.append(d)
            elif fr.name == "device_info":
                if fr.has_field("device_type") and fr.get_value("device_type") == "heart_rate":
                    sensores.add(str(fr.get_value("garmin_product") if fr.has_field("garmin_product") else "?"))
    ses["_laps"] = laps
    return rec, ses, sets, sensores


def informe_vueltas(laps):
    """Vueltas del reloj: la fuente buena para progresivos, series y controles.
    Nunca medir una repetición con un umbral de velocidad: usar esto."""
    if len(laps) < 2:
        return
    print("\n  VUELTAS DEL RELOJ (la referencia para series y progresivos)")
    for i, l in enumerate(laps, 1):
        d = l.get("total_distance") or 0
        t = l.get("total_timer_time") or 0
        el = l.get("total_elapsed_time") or 0
        pausa = f"  (pausa {el - t:.0f} s)" if el - t > 2 else ""
        rit = f"{mmss(t / (d / 1000))}/km" if d > 0 and t > 0 else "—"
        print(f"    {i:2}: {d:7.1f} m  {t:6.1f} s  {rit:>9}  FC med {l.get('avg_heart_rate') or '—'} máx {l.get('max_heart_rate') or '—'}  [{l.get('lap_trigger')}]{pausa}")


def informe_carrera(rec, ses, sensores):
    rec = [r for r in rec if r.get("distance") is not None]
    if len(rec) < 30:
        return
    t0 = rec[0]["timestamp"]
    dist = ses.get("total_distance") or (rec[-1]["distance"] - rec[0]["distance"])
    dur = ses.get("total_timer_time") or (rec[-1]["timestamp"] - t0).total_seconds()

    print(f"  inicio        {ses.get('start_time')}")
    print(f"  sensor FC     {', '.join(sensores) if sensores else 'muñeca (sin banda)'}")
    print(f"  duración      {mmss(dur)}")
    print(f"  distancia     {dist/1000:.2f} km")
    print(f"  ritmo medio   {ritmo(dur, dist)}")
    print(f"  FC            media {ses.get('avg_heart_rate')} · máx {ses.get('max_heart_rate')}")
    if ses.get("avg_cadence"):
        print(f"  cadencia      {ses['avg_cadence']*2} ppm")
    if ses.get("avg_step_length"):
        print(f"  zancada       {ses['avg_step_length']:.0f} mm · contacto {ses.get('avg_stance_time')} ms")
    if ses.get("total_ascent") is not None:
        print(f"  desnivel      D+ {ses.get('total_ascent')} m · D- {ses.get('total_descent')} m")
    if ses.get("total_training_effect"):
        print(f"  efecto        aeróbico {ses['total_training_effect']} · anaeróbico {ses.get('total_anaerobic_training_effect')}")

    # minuto a minuto
    print("\n  MINUTO A MINUTO")
    filas = []
    for m in range(0, int(dur // 60) + 1):
        seg = [r for r in rec if m * 60 <= (r["timestamp"] - t0).total_seconds() < (m + 1) * 60]
        if len(seg) < 10:
            continue
        dd = seg[-1]["distance"] - seg[0]["distance"]
        du = (seg[-1]["timestamp"] - seg[0]["timestamp"]).total_seconds()
        hr = [r["heart_rate"] for r in seg if r.get("heart_rate")]
        cd = [r["cadence"] for r in seg if r.get("cadence")]
        al = [r.get("altitude") or r.get("enhanced_altitude") for r in seg
              if (r.get("altitude") or r.get("enhanced_altitude"))]
        filas.append((m + 1, du / (dd / 1000) if dd > 0 else 0,
                      statistics.mean(hr) if hr else 0,
                      2 * statistics.mean(cd) if cd else 0,
                      al[-1] if al else 0))
        print(f"    min {m+1:2}  {mmss(filas[-1][1]):>8}/km   FC {filas[-1][2]:5.1f}   cad {filas[-1][3]:3.0f}   alt {filas[-1][4]:.0f} m")

    # DERIVA CARDÍACA: el termómetro principal
    if len(filas) >= 12:
        ini = [f for f in filas[2:8] if f[1] > 0]
        fin = [f for f in filas[-8:] if f[1] > 0]
        if ini and fin:
            ri, rf = statistics.mean(f[1] for f in ini), statistics.mean(f[1] for f in fin)
            hi, hf = statistics.mean(f[2] for f in ini), statistics.mean(f[2] for f in fin)
            print(f"\n  DERIVA CARDÍACA")
            print(f"    minutos 3-8    {mmss(ri)}/km a {hi:.0f} ppm")
            print(f"    últimos 8 min  {mmss(rf)}/km a {hf:.0f} ppm")
            print(f"    deriva         {rf-ri:+.0f} s/km   (normal con base asentada: 5-10 s/km en 35 min)")
        # Segunda medida, inmune a la salida rápida: mitades desde el minuto 15
        if len(filas) >= 30:
            resto = [f for f in filas[15:] if f[1] > 0]
            mitad = len(resto) // 2
            a, b = resto[:mitad], resto[mitad:]
            if a and b:
                ra, rb = statistics.mean(f[1] for f in a), statistics.mean(f[1] for f in b)
                ha, hb = statistics.mean(f[2] for f in a), statistics.mean(f[2] for f in b)
                pct = 100 * ((rb / hb) - (ra / ha)) / (ra / ha) if ha and hb else 0
                print(f"    mitades desde el min 15: {mmss(ra)}/km a {ha:.0f} → {mmss(rb)}/km a {hb:.0f}  ({rb-ra:+.0f} s/km, {pct:+.1f} % de desacople; base asentada < 5 %)")
    temps = [r.get("temperature") for r in rec if r.get("temperature") is not None]
    if temps:
        print(f"\n  SENSOR DE MUÑECA  media {statistics.mean(temps):.1f} °C · máx {max(temps):.0f}  (no es temperatura ambiente: sirve solo para comparar sesiones)")
    informe_vueltas(ses.get("_laps", []))

    # franjas de pulso
    z = {"<130": 0, "130-140": 0, "140-145": 0, "145-155": 0, "155-170": 0, ">170": 0}
    for i in range(1, len(rec)):
        dt = (rec[i]["timestamp"] - rec[i-1]["timestamp"]).total_seconds()
        h = rec[i].get("heart_rate")
        if not h or dt > 10:
            continue
        k = "<130" if h < 130 else "130-140" if h < 140 else "140-145" if h <= 145 \
            else "145-155" if h <= 155 else "155-170" if h <= 170 else ">170"
        z[k] += dt
    tot = sum(z.values()) or 1
    print("\n  FRANJAS DE PULSO")
    for k, v in z.items():
        if v:
            print(f"    {k:>8}  {mmss(v):>7}   {100*v/tot:4.0f} %")

    # desnivel real
    alts = [r.get("altitude") or r.get("enhanced_altitude") for r in rec
            if (r.get("altitude") or r.get("enhanced_altitude"))]
    if alts:
        gain = sum(max(0, alts[i+1] - alts[i]) for i in range(len(alts) - 1))
        print(f"\n  ALTITUD  {min(alts):.0f}-{max(alts):.0f} m · D+ acumulado real {gain:.0f} m")


def informe_series(rec, ses):
    """Reparte por vueltas si las hay; si no, detecta repeticiones por ritmo."""
    pass


def informe_fuerza(sets, ses):
    print(f"  inicio        {ses.get('start_time')}")
    print(f"  duración      {mmss(ses.get('total_timer_time', 0))}")
    print(f"  FC            media {ses.get('avg_heart_rate')} · máx {ses.get('max_heart_rate')}")
    print("\n  SERIES")
    for i, x in enumerate(sets, 1):
        peso = f" · {x['weight']} kg" if x.get("weight") else ""
        print(f"    {i}: {x.get('repetitions')} repeticiones · {x.get('duration', 0):.0f} s{peso}")
    tot = sum(x.get("repetitions", 0) for x in sets)
    print(f"    total: {tot} repeticiones en {len(sets)} series")


# ───────────────────────────── TCX ─────────────────────────────

def lee_tcx(ruta):
    import xml.etree.ElementTree as ET
    NS = {"t": "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"}
    act = ET.parse(ruta).getroot().find(".//t:Activity", NS)
    print("  AVISO: es un TCX y recorta la cadencia y las dinámicas de carrera.")
    print("  Pídele el original: Garmin Connect → actividad → engranaje → Exportar original.")
    for i, lap in enumerate(act.findall("t:Lap", NS), 1):
        tt = float(lap.find("t:TotalTimeSeconds", NS).text)
        d = float(lap.find("t:DistanceMeters", NS).text)
        hr = lap.find("t:AverageHeartRateBpm/t:Value", NS)
        print(f"    vuelta {i}: {mmss(tt)} · {d:.0f} m · {ritmo(tt, d)} · FC {hr.text if hr is not None else '—'}")


# ───────────────────────────── SUEÑO ─────────────────────────────

def lee_sueno(ruta):
    campos = {}
    with open(ruta, encoding="utf-8-sig") as f:
        for fila in csv.reader(f):
            if len(fila) >= 2 and fila[0].strip():
                campos[fila[0].strip()] = fila[1].strip()
    orden = ["Fecha", "Duración del sueño", "Puntuación de sueño", "Calidad",
             "Duración del sueño profundo", "Duración de REM", "Tiempo despierto",
             "Frecuencia cardiaca en reposo", "VFC med. durante la noche",
             "Cambio en Body Battery", "Estrés Media"]
    for k in orden:
        if k in campos:
            print(f"  {k:32} {campos[k]}")
    print("\n  Necesidad estimada: 8h50. Compara con las noches de datos/historial.json.")


# ───────────────────────────── principal ─────────────────────────────

def procesa(ruta):
    print("\n" + "=" * 62)
    print(os.path.basename(ruta))
    print("=" * 62)
    ext = ruta.lower().rsplit(".", 1)[-1]
    if ext == "csv":
        lee_sueno(ruta)
    elif ext == "tcx":
        lee_tcx(ruta)
    elif ext == "fit":
        rec, ses, sets, sensores = lee_fit(ruta)
        deporte = f"{ses.get('sport')} {ses.get('sub_sport') or ''}".strip()
        print(f"  tipo          {deporte}")
        if sets:
            informe_fuerza(sets, ses)
        else:
            informe_carrera(rec, ses, sensores)
    else:
        print("  Formato no reconocido.")


def main():
    rutas = []
    for a in sys.argv[1:]:
        rutas.extend(glob.glob(a) or [a])
    if not rutas:
        sys.exit(__doc__)
    tmp = tempfile.mkdtemp()
    final = []
    for r in rutas:
        if r.lower().endswith(".zip"):
            with zipfile.ZipFile(r) as z:
                for n in z.namelist():
                    if n.lower().endswith((".fit", ".tcx")):
                        final.append(z.extract(n, tmp))
        else:
            final.append(r)
    for r in sorted(final):
        procesa(r)
    print("\n" + "=" * 62)
    print("Siguiente paso: decidir si la sesión es válida, registrarla en")
    print("datos/historial.json y actualizar docs/index.html. Ver CLAUDE.md.")


if __name__ == "__main__":
    main()

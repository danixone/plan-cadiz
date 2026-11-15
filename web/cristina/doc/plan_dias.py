"""Foto del plan de Cristina día a día, sacada de datos/cristina/plan.json (la fuente de verdad).
Uso: python3 web/cristina/doc/plan_dias.py AAAA-MM-DD salida.json  (desde esa fecha hasta el final del plan)
Método de la duración y de la intensidad: web/cristina/doc/integracion-estudio.md, apartado 3."""
import json, re, sys, importlib.util
import os
RAIZ = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
spec = importlib.util.spec_from_file_location('c', RAIZ + '/web/cristina/construir.py'); c = importlib.util.module_from_spec(spec); spec.loader.exec_module(c)
plan = json.load(open(RAIZ + '/datos/cristina/plan.json')); hist = json.load(open(RAIZ + '/datos/cristina/historial.json'))
import copy
DESDE = sys.argv[1]
datos, err, av = c.construir(copy.deepcopy(plan), hist, DESDE); assert not err, err
wd = datos['web']['dias']
def seg_t(s):
    m = re.search(r'·\s*(\d+):(\d{2})(?:,(\d))?', s)
    if m: return int(m.group(1)) * 60 + int(m.group(2)) + (int(m.group(3)) / 10 if m.group(3) else 0)
    m = re.search(r'·\s*(\d+),(\d)\b', s) or re.search(r'·\s*(\d+)\s*s\b', s)
    if m: return float(m.group(1)) + (int(m.group(2)) / 10 if m.lastindex and m.lastindex > 1 else 0)
    return None
def rec_titulo(t):
    m = re.search(r'rec\. (.+?)(?: \+|$)', t)
    if not m: return None
    r = m.group(1)
    if '200 m andando' in r: return 150, True
    mm = re.match(r'(\d+) min(?: (\d+) s)?', r)
    if mm: return int(mm.group(1)) * 60 + int(mm.group(2) or 0), False
    mm = re.match(r'(\d+) s', r)
    if mm: return int(mm.group(1)), False
    return 120, True
def primera_frase(t):
    t = (t or '').strip()
    m = re.match(r'(.+?\.)(\s|$)', t)
    return (m.group(1) if m else t).strip()
K = 313  # 1.000 m del control del 26-10 (5:13)
out = []
for s in plan['calendario']:
    for d in s.get('dias', []):
        f = d['fecha']
        if f < DESDE: continue
        t = d['titulo']; tipo = d['tipo']; w = wd.get(f) or {}
        e = {'fecha': f, 'dia': d['dia'], 'hora': None, 'tipo': None, 'sesion': t, 'duracion_min': None, 'duracion': None, 'intensidad': None, 'notas': ''}
        txt = d.get('objetivo') or d.get('detalle') or ''
        if tipo == 'otro':
            if t.startswith('Descanso') or t.startswith('Sin barra'):
                e.update(tipo='descanso', duracion_min=0, duracion='plan', intensidad='descanso', notas=primera_frase(txt) if txt else '')
            elif t.startswith('Eliges'):
                e.update(tipo='elige CrossFit o rodaje', intensidad='media', duracion='sin fijar',
                         notas='Elige CrossFit (sin piernas pesadas ni saltos) o un rodaje suave; si no hace ninguno, descanso. ' + ('Rodaje de 15-20 min (víspera del simulacro).' if '15-20' in t else 'Rodaje de 25-30 min.'))
            elif 'CrossFit' in t:
                e.update(tipo='CrossFit', intensidad='media', duracion='sin fijar', notas=t + '. La duración de la clase no está en el plan.')
            else:
                test = 'Test' in t
                m = re.search(r'\((\d+) min', txt)
                if m: e.update(duracion_min=int(m.group(1)), duracion='plan')
                elif test: e.update(duracion_min=10, duracion='estimada')
                sub = 'test de barra' if test else ('barra A (fuerza)' if 'Barra A' in t else ('barra B (la del examen)' if 'Barra B' in t else 'barra'))
                e.update(tipo=sub, intensidad='dura' if test else 'media', notas=txt)
                cir = d.get('circuito')
                if cir:
                    mc = re.search(r'\((\d+) min', cir.get('texto', ''))
                    e['notas'] += ' Cuando llegue el kit del circuito (aún no): antes de la barra, ' + cir['titulo'].lower() + (' (%s min más)' % mc.group(1) if mc else '') + '.'
                    if 'Test' in cir.get('titulo', ''): e['tipo'] += ' + test de circuito (con el kit)'
        else:
            tot, est = 0.0, False
            pasos = w.get('pasos', [])
            reps = [i for i, p in enumerate(pasos) if re.search(r' m (a ritmo|rápidos)', p['t'])]
            rec = rec_titulo(t)
            if rec is None and '200 m andando' in (d.get('detalle') or ''): rec = (150, True)
            for i, p in enumerate(pasos):
                tt = p['t']; tm = p.get('timer') or 0
                if tt.startswith('Calentamiento'): tot += 25 * 60; est = True
                elif i in reps:
                    r = seg_t(tt); tot += (r or 0)
                    if p.get('tras'): tot += tm
                    elif rec and i != reps[-1]: tot += rec[0]; est = est or rec[1]
                elif tt.startswith('Recta'): tot += 60; est = True
                elif tt.startswith('Cuesta'): tot += tm + 60; est = True
                elif tt.startswith('Anda') and 'para acabar' in tt: tot += 4 * 60; est = True
                elif tt.startswith('Elevaciones'): tot += 5 * 60; est = True
                elif re.match(r'[\d.]+ m a tope', tt): tot += K; est = True
                elif tt in ('Barra', 'Circuito'): tot += 15 * 60; est = True
                elif tt == 'Prueba': tot = None; break
                else: tot += tm
            if tot is not None and tot > 0: e.update(duracion_min=int(5 * round(tot / 300.0)), duracion='estimada' if est else 'plan')
            if tipo == 'suave':
                media = bool(re.search(r'a ritmo K|alegre', t))
                e.update(tipo='rodaje suave' + (' + cuestas' if 'cuestas' in t else '') + (' + rectas' if 'rectas' in t else ''), intensidad='media' if media else 'suave')
            elif tipo == 'calidad':
                e.update(tipo='umbral' if 'umbral' in t else ('intervalos' if ' min a ' in t else 'series'), intensidad='dura')
            elif tipo == 'control':
                e.update(tipo='simulacro (circuito, barra y 1.000 m)' if 'SIMULACRO' in t else 'control de 1.000 m', intensidad='dura')
            elif tipo == 'prueba':
                e.update(tipo='PRUEBAS FÍSICAS (fecha supuesta)', intensidad='dura', duracion='sin fijar')
            e['notas'] = (d.get('objetivo') or '') if tipo in ('calidad', 'control') and d.get('objetivo') else primera_frase(d.get('detalle') or '')
        e['notas'] = re.sub(r'\s+', ' ', e['notas']).strip()
        out.append(e)
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
print(len(out), out[0]['fecha'], out[-1]['fecha'])
print(Counter(x['intensidad'] for x in out)); print(Counter(x['tipo'] for x in out)); print(Counter(x['duracion'] for x in out))
for x in out[:10]: print(json.dumps(x, ensure_ascii=False)[:330])


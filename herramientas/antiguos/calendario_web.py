#!/usr/bin/env python3
"""Regenera el calendario de la pestaña Plan de docs/index.html desde datos/plan.json.
Manda plan.json: si cambias el calendario, cambias plan.json y ejecutas esto.
Uso: python3 herramientas/calendario_web.py
"""
import json, html, re, sys, os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN = os.path.join(RAIZ, 'datos', 'plan.json')
WEB = os.path.join(RAIZ, 'docs', 'index.html')
MES = {'09': 'sept', '10': 'oct', '11': 'nov'}
HOY = sys.argv[1] if len(sys.argv) > 1 else None   # fecha AAAA-MM-DD para marcar hechos; opcional

def esc(t): return html.escape(t or '', quote=False)
def rango(sem):
    a, b = sem['semana'].split('/')
    da, ma, db, mb = a[8:10].lstrip('0'), a[5:7], b[8:10].lstrip('0'), b[5:7]
    return f"{da} – {db} {MES[mb]}" if ma == mb else f"{da} {MES[ma]} – {db} {MES[mb]}"

def dia_html(dia, abierto_por_defecto=False):
    cls = 'day'
    if dia['tipo'] == 'descanso': cls += ' rest'
    if dia.get('clave') or dia['tipo'] in ('control', 'examen', 'prueba'): cls += ' key'
    if dia.get('hecho'): cls += ' done'
    f = dia.get('fecha')
    etiqueta = f"{dia['dia']} {int(f[8:10])}" if f else dia['dia']
    ses = esc(dia['sesion'])
    if dia.get('hecho'): ses = f"<strong>{esc(dia['hecho'])}</strong>"
    elif cls.endswith('key') or ' key' in cls:
        if ':' in ses: ses = '<strong>' + ses.split(':')[0] + ':</strong>' + ':'.join(ses.split(':')[1:])
        else: ses = f'<strong>{ses}</strong>'
    partes = []
    if dia.get('siPrueba28a30'): partes.append(f"<b>Si la prueba es del 28 al 30:</b> {esc(dia['siPrueba28a30'])}")
    if dia.get('siPrueba26o27'): partes.append(f"<b>Si es el 26 o el 27:</b> {esc(dia['siPrueba26o27'])}")
    t = ' · '.join(x for x in [esc(dia.get('hora', '')) and 'hora ' + esc(dia['hora']), esc(dia.get('objetivo', ''))] if x)
    extra = ''.join(f'<div class="t">{x}</div>' for x in partes) + (f'<div class="t">{t}</div>' if t else '')
    return f'      <div class="{cls}"><div class="d">{etiqueta}</div><div class="w">{ses}{extra}</div></div>'

def semana_html(sem, abierta):
    titulo = sem['titulo'][0].lower() + sem['titulo'][1:]
    out = [f'    <details class="acc"{" open" if abierta else ""}><summary>{rango(sem)}<span class="when">{esc(titulo)}</span></summary><div class="in">']
    if sem.get('nota'): out.append(f'      <p class="cap">{esc(sem["nota"])}</p>')
    if sem.get('versiones'):
        for v in sem['versiones']:
            out.append(f'      <p class="hd" style="margin-top:10px">{esc(v["nombre"])}</p>')
            out += [dia_html(x) for x in v['dias']]
    else:
        out += [dia_html(x) for x in sem['dias']]
    out.append('    </div></details>\n')
    return '\n'.join(out)

def main():
    d = json.load(open(PLAN, encoding='utf-8'))
    s = open(WEB, encoding='utf-8').read()
    ini = s.index('<h3>Calendario</h3>')
    i = s.index('    <details class="acc"', ini)
    j = s.index('  </section>', i)
    semanas = [x for x in d['calendario'] if x['semana'] >= '2026-09-14']
    abierta = None
    if HOY:
        for x in semanas:
            a, b = x['semana'].split('/')
            if a <= HOY <= b: abierta = x['semana']
    nuevo = '\n'.join(semana_html(x, x['semana'] == abierta) for x in semanas) + '\n'
    s = s[:i] + nuevo + s[j:]
    open(WEB, 'w', encoding='utf-8').write(s)
    print(f"calendario regenerado: {len(semanas)} semanas" + (f", abierta la de {abierta}" if abierta else ''))

if __name__ == '__main__':
    main()

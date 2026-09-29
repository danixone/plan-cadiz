#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""lab_datos.py · M1 · casos de laboratorio del validador (§10.5 M1).

Crea copias en una carpeta temporal, les mete un fallo a propósito y comprueba que
herramientas/validar_web.py lo detecta. No toca ni los JSON del proyecto ni impl/datos.

    python3 qa/lab_datos.py
"""
import copy
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

QA = os.path.dirname(os.path.abspath(__file__))
IMPL = os.path.dirname(QA)
sys.path.insert(0, os.path.join(IMPL, 'herramientas'))
import construir_web as cw  # noqa: E402

VALIDAR = os.path.join(IMPL, 'herramientas', 'validar_web.py')
R = cw.rutas_defecto()


def cargar():
    return {k: cw.leer_json(R[k]) for k in ('plan', 'historial', 'web', 'campos')}


def escribir(tmp, nombre, obj):
    p = os.path.join(tmp, nombre)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    return p


def validar(args):
    r = subprocess.run([sys.executable, VALIDAR, '--solo-datos', '--hoy', '2026-09-29'] + args,
                       capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


def main():
    tmp = tempfile.mkdtemp(prefix='lab_datos_')
    casos = []
    base = cargar()

    # 0 · control: los datos reales no dan errores
    code, out = validar([])
    casos.append(('datos reales sin errores', code == 0 and 'ERRORES (0)' in out, 'ERRORES (0)'))

    # 1 · campo sin clasificar en el historial
    h = copy.deepcopy(base['historial'])
    h['carrera'][0]['potenciaNueva'] = 480
    code, out = validar(['--historial', escribir(tmp, 'historial.json', h)])
    casos.append(('campo sin clasificar', code == 1 and 'campo sin clasificar en campos.json: historial.carrera[].potenciaNueva' in out,
                  'historial.carrera[].potenciaNueva'))

    # 2 · cifra inventada en web.json
    w = copy.deepcopy(base['web'])
    corpus = open(R['corpus'], encoding='utf-8').read()
    inventada = '7:77'
    assert inventada not in corpus and inventada not in json.dumps(base['plan'], ensure_ascii=False)
    w['textos']['N7'] = 'Superficie de tartán. Prohibido correr descalzo o con clavos. Récord de pista 7:77.'
    code, out = validar(['--web', escribir(tmp, 'web_cifra.json', w)])
    casos.append(('cifra inventada', code == 1 and 'cifra sin fuente «7:77»' in out, 'cifra sin fuente «7:77»'))

    # 3 · centinela (el nombre del dietista) dentro de web.json
    w = copy.deepcopy(base['web'])
    w['decisiones'][0]['texto'] += ' Lo confirmó Tomás.'
    code, out = validar(['--web', escribir(tmp, 'web_centinela.json', w)])
    casos.append(('centinela en los datos', code == 1 and 'privacidad: el bloque de datos contiene «Tomás»' in out, 'privacidad … «Tomás»'))

    # 4 · firma que no coincide: «6 × 400» → «5 × 400» en una copia de plan.json
    p = copy.deepcopy(base['plan'])
    d = cw.dia_plan(p, '2026-09-28')
    d['sesion'] = d['sesion'].replace('6 × 400', '5 × 400')
    code, out = validar(['--plan', escribir(tmp, 'plan_firma.json', p)])
    casos.append(('firma que no coincide', code == 1 and 'El 2026-09-28 cambió en plan.json: revisa web.dias' in out,
                  'El 2026-09-28 cambió en plan.json'))
    # 4b · el mismo cambio en todo el texto de plan.json (también toca el semáforo)
    txt = json.dumps(base['plan'], ensure_ascii=False).replace('6 × 400', '5 × 400')
    ptodo = os.path.join(tmp, 'plan_firma_todo.json')
    open(ptodo, 'w', encoding='utf-8').write(txt)
    code, out = validar(['--plan', ptodo])
    casos.append(('firma (cambio en todo el plan)', code == 1 and 'El 2026-09-28 cambió en plan.json' in out and
                  'web.semaforo: «6 × 400 → 4» no es subcadena' in out, 'firma + semáforo'))

    # 5 · opción de condición que no es literal
    w = copy.deepcopy(base['web'])
    w['dias']['2026-10-05']['condicion']['opciones'][1]['txt'] = '1:27 si el 30 falló'
    code, out = validar(['--web', escribir(tmp, 'web_opcion.json', w)])
    casos.append(('opción de condición no literal', code == 1 and 'la opción «1:27 si el 30 falló» no es literal' in out,
                  'la opción «1:27 si el 30 falló»'))

    # 6 · corpus de literalidad cambiado
    pc = os.path.join(tmp, 'corpus.html')
    shutil.copy(R['corpus'], pc)
    with open(pc, 'a', encoding='utf-8') as f:
        f.write('\n<!-- cambio -->\n')
    code, out = validar(['--corpus', pc])
    casos.append(('corpus con otro sha256', code == 1 and 'el corpus de literalidad cambió' in out, 'el corpus de literalidad cambió'))

    # 7 · variante que no es literal del objetivo
    w = copy.deepcopy(base['web'])
    w['dias']['2026-09-30']['variantes']['rojo'] = '30 min con techo 145'
    code, out = validar(['--web', escribir(tmp, 'web_variante.json', w)])
    casos.append(('variante no literal', code == 1 and 'web.dias[2026-09-30].variantes.rojo no es literal' in out, 'variantes.rojo'))

    # 8 · K5: el reparto del 10-10 vuelve a no coincidir consigo mismo (desde el 3-10 es error)
    p = copy.deepcopy(base['plan'])
    d = cw.dia_plan(p, '2026-10-10')
    d['protocolo'] = d['protocolo'].replace('Reparto del examen: 0:42 / 1:24 / 2:06 / 2:48', 'Reparto del examen: 0:43 / 1:26 / 2:09 / 2:52')
    pk = escribir(tmp, 'plan_k5.json', p)
    r = subprocess.run([sys.executable, VALIDAR, '--solo-datos', '--hoy', '2026-10-05', '--plan', pk], capture_output=True, text=True)
    casos.append(('K5 desde el 3-10 es error', r.returncode == 1 and 'El reparto del 10-10 sigue sin decidir (K5)' in r.stdout, 'K5 error'))
    r2 = subprocess.run([sys.executable, VALIDAR, '--solo-datos', '--hoy', '2026-10-05', '--plan', pk, '--aceptar-conflicto', 'K5'],
                        capture_output=True, text=True)
    ok2 = 'aceptado con --aceptar-conflicto K5' in r2.stdout and 'x  El reparto del 10-10' not in r2.stdout
    casos.append(('K5 con --aceptar-conflicto queda como aviso', ok2, 'K5 aviso'))
    r3 = subprocess.run([sys.executable, VALIDAR, '--solo-datos', '--hoy', '2026-09-29', '--plan', pk], capture_output=True, text=True)
    casos.append(('K5 antes del 3-10: aviso', 'K5' in r3.stdout and 'El reparto del 10-10 sigue sin decidir' not in r3.stdout, 'K5 aviso antes'))

    # 9 · baremo: escenario con la media mal escrita
    p = copy.deepcopy(base['plan'])
    p['escenariosNota'][1]['media'] = 5.5
    code, out = validar(['--plan', escribir(tmp, 'plan_baremo.json', p)])
    casos.append(('baremo: media de un escenario', code == 1 and 'media escrita 5.5, calculada 5.67' in out, 'media escrita'))

    # 10 · calendario: día que no corresponde a la fecha
    p = copy.deepcopy(base['plan'])
    cw.dia_plan(p, '2026-10-06')['dia'] = 'Mié'
    code, out = validar(['--plan', escribir(tmp, 'plan_cal.json', p)])
    casos.append(('calendario: día de la semana', code == 1 and 'calendario: 2026-10-06 dice «Mié» y es Mar' in out, 'día de la semana'))

    # 11 · privacidad en el HTML construido (un relato retenido pegado en la página)
    if os.path.exists(os.path.join(IMPL, 'out', 'index.html')):
        html = open(os.path.join(IMPL, 'out', 'index.html'), encoding='utf-8').read()
        rel = next(e['relato'] for e in base['historial']['carrera'] if e.get('relato'))
        ph = os.path.join(tmp, 'index.html')
        open(ph, 'w', encoding='utf-8').write(html.replace('</body>', '<p>%s</p></body>' % rel))
        r = subprocess.run([sys.executable, VALIDAR, ph, '--hoy', '2026-09-29'], capture_output=True, text=True)
        casos.append(('texto retenido en el HTML', r.returncode == 1 and 'privacidad: aparece en el HTML «%s»' % rel[:40] in r.stdout, 'privacidad HTML'))

    ancho = max(len(c[0]) for c in casos)
    fallos = 0
    for nombre, ok, esperado in casos:
        print('%s  %s  (%s)' % ('PASA ' if ok else 'FALLA', nombre.ljust(ancho), esperado))
        fallos += 0 if ok else 1
    shutil.rmtree(tmp, ignore_errors=True)
    print('\n%d de %d casos detectados' % (len(casos) - fallos, len(casos)))
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())

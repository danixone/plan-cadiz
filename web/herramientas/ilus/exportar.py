#!/usr/bin/env python3
"""Exportador de M6 (§7.4): genera src/js/15_ilus_datos.js con

  PC.ill._poses   = {corre, celebra, dePie, arriba, valla}: el agente en unidades de figura (suelo en y = 0),
                    con 'cuerpo', 'sombra', 'estelas' (decoración) y medidas: caja, alto, pie (punta del pie
                    adelantado en «corre»), barra (centro de la barra en «arriba»), valla (travesaño en «valla»).
  PC.ill._laminas = {dominada, sentadilla, peso-muerto-rumano, remo-barra, elevacion-talon}: paneles SVG
                    (360 × 330) con sus marcas; la leyenda la pinta el JS con el texto literal de plan.json.

Antes de escribir comprueba contra datos/plan.json que cada marca sigue diciendo lo que dibuja
(palabras clave de cada línea de técnica y de las reglas del BOE). Si algo no cuadra, se para: el dibujo
estaría enseñando una técnica que el plan ya no dice.

Uso: python3 impl/herramientas/ilus/exportar.py [ruta de plan.json]
"""
import json, math, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from rig import (figure, figure_front, AG, CORRE, CORRE_ESTELAS, CELEBRA_F, DEPIE_F, rot, n)
import laminas as LM

IMPL = os.path.abspath(os.path.join(AQUI, '..', '..'))
PLAN = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get('PLAN_RAIZ', os.path.dirname(IMPL)), 'datos', 'plan.json')
SALIDA = os.path.join(IMPL, 'src', 'js', '15_ilus_datos.js')

# ------------------------------------------------------------------ medidas
SHOE = [(-4.5, -3.5), ('q', (1, -5.5), (6, -2)), (12.5, .5), ('q', (15.5, 3.5), (12, 5)), (-4.5, 5)]


def shoe_pts(A, ang):
    pts, prev = [], None
    for it in SHOE:
        if isinstance(it[0], str):
            c, e = it[1], it[2]
            for k in range(1, 21):
                t = k / 20
                x = (1 - t) ** 2 * prev[0] + 2 * (1 - t) * t * c[0] + t * t * e[0]
                y = (1 - t) ** 2 * prev[1] + 2 * (1 - t) * t * c[1] + t * t * e[1]
                pts.append((x, y))
            prev = e
        else:
            pts.append(it); prev = it
    return [(A[0] + rot(p, ang)[0], A[1] + rot(p, ang)[1]) for p in pts]


def head_pts(hip, lean, tilt, curva=0):
    """Extremos de la cabeza de perfil (gorra, visera, nuca, barbilla) en coordenadas de figura."""
    loc = [(5, -166.5), (-7, -157), (27.4, -149.4), (16.2, -151.4), (-5, -148), (13, -138.2), (4.5, -137)]
    out = []
    for p in loc:
        q = (p[0] + .5, p[1] + 81)                 # translate(.5 81): de la cabeza al marco de la cadera
        q = rot(q, tilt, (2, -49))
        if curva:
            q = rot(q, curva, LM_PIVOTE)
        q = rot(q, lean)
        out.append((hip[0] + q[0], hip[1] + q[1]))
    return out


from rig import PIVOTE as LM_PIVOTE


def caja_perfil(pose, J):
    pts = []
    for k in ('S', 'E1', 'H1', 'E2', 'H2', 'K1', 'A1', 'K2', 'A2', 'hip'):
        x, y = J[k]
        pts += [(x - 7, y - 7), (x + 7, y + 7)]
    pts += shoe_pts(J['A1'], pose.get('fa1', 0)) + shoe_pts(J['A2'], pose.get('fa2', 0))
    pts += head_pts(pose['hip'], pose.get('lean', 0), pose.get('tilt', 0), pose.get('curva', 0))
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return [round(min(xs), 1), round(min(ys), 1), round(max(xs), 1), round(max(ys), 1)]


def caja_frente(p, J):
    pts = []
    for k in ('SL', 'SR', 'EL', 'ER', 'HL', 'HR', 'KL', 'KR', 'AL', 'AR'):
        x, y = J[k]
        pts += [(x - 7, y - 7), (x + 7, y + 7)]
    oy = p.get('hy', -84) + 84
    pts += [(-17.5, -129 + oy), (17.5, -129 + oy), (0, -167.5 + oy), (-11.5, -151 + oy), (11.5, -151 + oy)]
    for k in ('AL', 'AR'):
        x, y = J[k]; pts += [(x - 6, y + 5.5), (x + 6, y + 5.5)]
    xs, ys = [q[0] for q in pts], [q[1] for q in pts]
    return [round(min(xs), 1), round(min(ys), 1), round(max(xs), 1), round(max(ys), 1)]


# ------------------------------------------------------------------ poses del agente
VALLA = dict(hip=(0, -104), lean=30, tilt=-12,
             K2=(34, -103), A2=(70, -99), fa2=-74,          # pierna de ataque (cercana), estirada sobre la valla
             K1=(6, -90), A1=(-30, -98), fa1=176,           # pierna de impulso (lejana), recogida detrás
             E2=(22, -131), H2=(44, -126),                  # brazo lejano adelante (contrario a la pierna de ataque)
             E1=(-6, -110), H1=(-24, -120),                 # brazo cercano atrás
             shx=10, shr=36)
VALLA_TRAVESANO = (32, -76)      # punto medio del travesaño bajo la pierna de ataque (holgura de unas 20 u.)


def exportar_poses():
    P = {}
    # corre (perfil, a la derecha)
    cuerpo, J = figure(CORRE, c=AG, expr='concentrado', dorsal=True, sombra=False)
    tip = max(p[0] for p in shoe_pts(J['A1'], CORRE['fa1']))
    sombra = f'<ellipse cx="{n(CORRE["shx"])}" cy="0" rx="{n(CORRE["shr"])}" ry="4" class="if-sombra"/>'
    estelas = ('<g data-deco="1" aria-hidden="true">' + ''.join(
        f'<path class="il is-estela" d="M{n(a)} {n(y)}H{n(b)}" stroke-width="2.6"/>' for a, b, y in CORRE_ESTELAS) + '</g>')
    caja = caja_perfil(CORRE, J)
    P['corre'] = dict(cuerpo=cuerpo, sombra=sombra, estelas=estelas, caja=caja, alto=round(-caja[1], 1), pie=round(tip, 2))
    # celebra (de frente, brazos arriba): solo con un dato real
    cuerpo, J = figure_front(CELEBRA_F, c=AG, expr='contento', dorsal=True, sombra=False)
    caja = caja_frente(CELEBRA_F, J)
    P['celebra'] = dict(cuerpo=cuerpo, sombra='<ellipse cx="0" cy="0" rx="26" ry="3.6" class="if-sombra"/>',
                        estelas='', caja=caja, alto=167.5)
    # de pie (de frente, gesto de esfuerzo): nota real que no llega o eliminado
    cuerpo, J = figure_front(DEPIE_F, c=AG, expr='esfuerzo', dorsal=True, sombra=False)
    caja = caja_frente(DEPIE_F, J)
    P['dePie'] = dict(cuerpo=cuerpo, sombra='<ellipse cx="0" cy="0" rx="26" ry="3.6" class="if-sombra"/>',
                      estelas='', caja=caja, alto=167.5)
    # arriba (perfil, dominada arriba: la barra al tercio inferior del cuello)
    pa = LM.pose_arriba()
    cuerpo, J = figure(pa, c=AG, expr='esfuerzo', dorsal=True, sombra=False)
    caja = caja_perfil(pa, J)
    P['arriba'] = dict(cuerpo=cuerpo, sombra='', estelas='', caja=caja, alto=round(-caja[1], 1), barra=list(LM.ARRIBA_BAR))
    # valla (perfil, franqueo)
    cuerpo, J = figure(VALLA, c=AG, expr='concentrado', dorsal=True, sombra=False)
    caja = caja_perfil(VALLA, J)
    P['valla'] = dict(cuerpo=cuerpo, sombra='', estelas=('<g data-deco="1" aria-hidden="true">'
                      '<path class="il is-estela" d="M-70 -128H-44" stroke-width="2.6"/>'
                      '<path class="il is-estela" d="M-80 -110H-50" stroke-width="2.6"/></g>'),
                      caja=caja, alto=round(-caja[1], 1), valla=list(VALLA_TRAVESANO))
    return P


# ------------------------------------------------------------------ comprobación contra plan.json
CLAVES_I6 = {
    'sentadilla': {'a': 'cuello', 'c': 'paralelo', 'd': 'talón', 'e': 'cadera'},
    'peso-muerto-rumano': {'a': 'rodillas', 'b': 'cadera hacia atrás', 'c': 'media espinilla', 'e': 'No es una sentadilla'},
    'remo-barra': {'b': '45°', 'c': 'ombligo', 'e': 'El tronco no se mueve'},
    'elevacion-talon': {'a': 'borde de un escalón', 'b': 'abajo', 'c': 'arriba', 'd': 'sin rebote'},
}
CONSEJOS_DOM = {'a': (1, 'omóplatos'), 'b': (2, 'codos hacia las costillas')}
CLAVES_BOE = ['palmas al frente', 'ligeramente superior a la anchura de los hombros', 'cruzar las piernas',
              '1. Cada dominada', 'brazos completamente extendidos', '2. El cuerpo', '3. No se permiten oscilaciones',
              '4. La cabeza permanecerá en posición anatómica', 'tercio inferior del cuello', '6. Se deberá realizar una mínima pausa',
              '5 segundos', '8. No se permite realizar la prueba descalzo', '9. Se dispone de un intento', 'Será nula']


def comprobar(plan):
    err = []
    ej = {e['id']: e for e in plan.get('ejercicios', [])}
    for lid, claves in CLAVES_I6.items():
        tec = ej.get(lid, {}).get('tecnica') or []
        for letra, palabra in claves.items():
            i = ord(letra) - 97
            if i >= len(tec) or palabra not in tec[i]:
                err.append(f'{lid}: la marca «{letra}» dibuja «{palabra}» y la línea {i + 1} de tecnica ya no lo dice')
    tec = ej.get('dominadas-lastradas', {}).get('tecnica') or []
    for letra, (i, palabra) in CONSEJOS_DOM.items():
        if i >= len(tec) or palabra not in tec[i]:
            err.append(f'dominada: el consejo «{letra}» dibuja «{palabra}» y tecnica[{i}] ya no lo dice')
    te = plan.get('protocoloDominadas', {}).get('tecnicaExamen', '')
    for c in CLAVES_BOE:
        if c not in te:
            err.append(f'dominada: protocoloDominadas.tecnicaExamen ya no contiene «{c}»')
    return err


def diccionario(textos, minimo=180, maximo=12):
    """Trozos largos que se repiten en muchos dibujos (cabezas, troncos): se guardan una vez en ill._dic y
    en los dibujos quedan como «@0»…«@9»; 16_ilustracion.js los expande al cargar. Se eligen por ahorro."""
    cand = {}
    for t in textos:
        for m in re.finditer(r'<g transform=[\'"]translate\(\.5 81\)[\'"]>.*?</g>|<path class=[\'"]if-(?:cam|cam2|pan|piel|gorra|visera|pelo)[\'"] d=[\'"][^\'"]{60,}[\'"](?: opacity=[\'"][^\'"]+[\'"])?/>', t):
            cand[m.group(0)] = cand.get(m.group(0), 0) + 1
    orden = sorted(((len(k) * (v - 1), k) for k, v in cand.items() if v > 1 and len(k) >= minimo // 3), reverse=True)
    dic = [k for ahorro, k in orden if ahorro > minimo][:maximo]
    return dic


def aplicar(texto, dic):
    for i, k in enumerate(dic):
        texto = texto.replace(k, '@' + 'ABCDEFGHIJKL'[i])
    return texto


def comillas(svg):
    """Atributos con comilla simple: el JSON no tiene que escapar cada comilla doble (unos 10 KB menos)."""
    assert "'" not in svg, 'comilla simple dentro de un dibujo'
    return re.sub(r'="([^"]*)"', r"='\1'", svg)


def main():
    plan = json.load(open(PLAN, encoding='utf-8'))
    err = comprobar(plan)
    if err:
        print('No se exporta: el plan y las láminas no cuadran.')
        for e in err:
            print('  -', e)
        sys.exit(1)
    poses = exportar_poses()
    for v in poses.values():
        for k in ('cuerpo', 'sombra', 'estelas'):
            v[k] = comillas(v[k])
    lams = {}
    for lid, d in LM.LAMINAS.items():
        pan = d['paneles']()
        lams[lid] = dict(ejercicio=d.get('ejercicio'), fuente=d.get('fuente'),
                         titulo='Qué mira el tribunal en tu vídeo' if lid == 'dominada' else 'Qué mirar en tu vídeo',
                         paneles=[dict(id=p['id'], titulo=p['titulo'], sub=p['sub'], svg=comillas(p['svg']), marcas=p['marcas']) for p in pan])
    lams['dominada']['consejos'] = {k: v[0] for k, v in CONSEJOS_DOM.items()}
    assert '@' not in json.dumps(poses) + json.dumps(lams), 'arroba en los dibujos'
    textos = [v[k] for v in poses.values() for k in ('cuerpo',)] + [p['svg'] for v in lams.values() for p in v['paneles']]
    dic = diccionario(textos)
    for v in poses.values():
        v['cuerpo'] = aplicar(v['cuerpo'], dic)
    for v in lams.values():
        for p in v['paneles']:
            p['svg'] = aplicar(p['svg'], dic)
    js = ('/* Generado por herramientas/ilus/exportar.py a partir de rig.py y laminas.py. No se edita a mano. */\n'
          '(function (PC) {\n  var ill = PC.ill = PC.ill || {};\n'
          f'  ill._poses = {json.dumps(poses, ensure_ascii=False, separators=(",", ":"))};\n'
          f'  ill._laminas = {json.dumps(lams, ensure_ascii=False, separators=(",", ":"))};\n'
          f'  ill._dic = {json.dumps(dict(zip("ABCDEFGHIJKL", dic)), ensure_ascii=False, separators=(",", ":"))};\n'
          "})(typeof PC !== 'undefined' ? PC : (window.PC = window.PC || {}));\n")
    js = js.replace('</', '<\\/')
    if re.search(r'#[0-9A-Fa-f]{3,8}\b', js):
        print('No se exporta: queda un color hexadecimal en los dibujos.'); sys.exit(1)
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    open(SALIDA, 'w', encoding='utf-8').write(js)
    tam = {k: len(v['cuerpo']) for k, v in poses.items()}
    tl = {k: sum(len(p['svg']) for p in v['paneles']) for k, v in lams.items()}
    print(f'{SALIDA}: {len(js.encode()) / 1024:.1f} KB')
    print('  poses (bytes):', tam)
    print('  láminas (bytes):', tl)
    print('  corre: pie a', poses['corre']['pie'], 'u. del origen; alto', poses['corre']['alto'])


if __name__ == '__main__':
    main()

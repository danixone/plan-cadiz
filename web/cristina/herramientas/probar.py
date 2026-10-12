#!/usr/bin/env python3
"""Prueba la web de Cristina en Chrome sin cabecera (con el marco de QA de Daniel, web/qa/marco.html).

  python3 web/cristina/herramientas/probar.py [--pagina web/cristina/out/prueba.html] [--ruta hoy] [--hoy 2026-10-12]
                                              [--ancho 390] [--alto 844] [--tema light] [--captura salida.png] [--abrir 1]
                                              [--extra clave=valor ...]

Imprime los errores de JavaScript (window.__errores), si hay desbordamiento horizontal y, con --captura,
guarda una captura PNG de la ventana (ancho mínimo de ventana 500 px; la página va dentro de un iframe del ancho pedido).
"""
import argparse, html, json, os, re, subprocess, sys

CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MARCO = os.path.join(RAIZ, 'web', 'qa', 'marco.html')


def chrome(args, timeout=90):
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--mute-audio'] + args
    try:
        return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=timeout).stdout.decode('utf-8', 'replace')
    except subprocess.TimeoutExpired:
        return ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pagina', default='web/cristina/out/prueba.html')
    ap.add_argument('--ruta', default='hoy')
    ap.add_argument('--hoy', default='2026-10-12')
    ap.add_argument('--ancho', type=int, default=390)
    ap.add_argument('--alto', type=int, default=844)
    ap.add_argument('--tema', default='light')
    ap.add_argument('--captura')
    ap.add_argument('--abrir', help='abrir=1 abre todos los desplegables')
    ap.add_argument('--extra', nargs='*', default=[])
    a = ap.parse_args()
    pag = os.path.relpath(os.path.abspath(a.pagina), os.path.dirname(MARCO))
    q = {'w': a.ancho, 'h': a.alto, 'ruta': a.ruta, 'tema': a.tema, 'hoy': a.hoy, 'pagina': pag}
    if a.abrir:
        q['abrir'] = a.abrir
    for kv in a.extra:
        k, v = kv.split('=', 1)
        q[k] = v
    u = 'file://' + MARCO + '?' + '&'.join('%s=%s' % (k, v) for k, v in q.items())
    dom = chrome(['--virtual-time-budget=12000', '--window-size=%d,%d' % (max(500, a.ancho), a.alto), '--dump-dom', u])
    m = re.findall(r'<pre id="res">(.*?)</pre>', dom, re.S)
    if not m or not m[-1].strip():
        print('SIN RESULTADO del marco (¿la página no cargó?)')
        sys.exit(2)
    r = json.loads(html.unescape(m[-1])).get('qa') or {}
    err = r.get('errores') or []
    print('errores JS (%d)%s' % (len(err), ':' if err else ''))
    for e in err:
        print('  x', e)
    sw, cw = r.get('scrollW'), r.get('clientW')
    print('ancho: scrollWidth %s · clientWidth %s%s' % (sw, cw, '  ← DESBORDA' if sw and cw and sw > cw + 1 else ''))
    if a.captura:
        chrome(['--virtual-time-budget=8000', '--window-size=%d,%d' % (max(500, a.ancho), a.alto), '--screenshot=' + os.path.abspath(a.captura), u])
        print('captura:', a.captura, '(la página ocupa los %d px de la izquierda)' % a.ancho if a.ancho < 500 else '')
    sys.exit(1 if err else 0)


if __name__ == '__main__':
    main()

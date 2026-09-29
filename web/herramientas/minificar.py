#!/usr/bin/env python3
"""Minificación conservadora para build.py (M8 · integración).

Solo quita comentarios y espacios. No renombra nada, no reescribe expresiones.

JS: tokenizador propio (cadenas, plantillas con ${} anidadas, expresiones regulares, números,
signos). Reglas:
  - fuera los comentarios;
  - entre dos tokens de la misma línea, un espacio solo si hace falta (dos palabras, «+ +», «- -»,
    «/ /», número seguido de «.»);
  - un salto de línea del original se conserva salvo que sea imposible que la inserción automática
    de punto y coma dependa de él: el token anterior no puede cerrar una sentencia (p. ej. «{ ( , = &&»)
    o el siguiente no puede abrirla (p. ej. «) ] } , ; . : ? ==»);
  - después de return/break/continue/throw/yield y antes de ++/-- el salto se conserva siempre.
Comprobación: se vuelve a tokenizar la salida y la secuencia de tokens (sin comentarios) tiene que ser
idéntica a la del original; si no, se para.

CSS: fuera comentarios, espacios alrededor de { } ; , y ">" "~" fuera de paréntesis, y el ; final
de cada bloque. Los espacios dentro de calc()/var() y alrededor de «+» no se tocan.
"""
import re
import sys

PUNCT = sorted('''>>>= ... === !== **= <<= >>= >>> &&= ||= ??= => == != <= >= && || ?? ?. ++ -- += -= *= /= %= &= |= ^= ** << >>
{ } ( ) [ ] ; , < > + - * / % & | ^ ! ~ ? : = . @ #'''.split(), key=len, reverse=True)

REGEX_ANTES_KW = {'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do',
                  'else', 'yield', 'await'}
# un «/» después de estos signos abre una expresión regular
REGEX_ANTES_P = set('( , = : [ ! & | ? { } ; + - * % < > ~ ^ => == != === !== <= >= && || ?? += -= *= /= %= &= |= ^= **= <<= >>= >>>= &&= ||= ??= ** << >> >>> ... ++ --'.split())
# tras estos, un salto de línea nunca puede ser el que cierra la sentencia
NO_CIERRA = set('{ ( [ , ; : ? = == === != !== < > <= >= + - * / % ** & | ^ && || ?? ! ~ += -= *= /= %= **= <<= >>= >>>= &= |= ^= &&= ||= ??= => . ?. << >> >>> ...'.split())
# estos nunca pueden abrir una sentencia
NO_ABRE = set(') ] } , ; . ?. : ? = == === != !== <= >= * % ** && || ?? => += -= *= /= %= **= <<= >>= >>>= &= |= ^= &&= ||= ??= | ^ & < >'.split())
RESTRINGIDAS = {'return', 'break', 'continue', 'throw', 'yield', 'async', 'let'}

NUM = re.compile(r'0[xXoObB][0-9a-fA-F_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?n?')


def es_palabra_ch(c):
    return c.isalnum() or c in '_$' or ord(c) > 127 and c.isalpha() or c == '\\'


class ErrorMin(Exception):
    pass


def tokenizar(s):
    """Devuelve [(tipo, texto, salto_antes)] con tipo ∈ {w (palabra), n, s (cadena), t (plantilla), r (regex), p}.
    Las plantillas se devuelven troceadas: 't' es un trozo literal que empieza en ` o } y acaba en ` o ${ ."""
    toks = []
    i, n = 0, len(s)
    salto = False
    pila = []  # 'b' llave normal · 't' llave de ${ en plantilla
    ult = None  # último token significativo

    def regex_permitida():
        if ult is None:
            return True
        tp, tx = ult[0], ult[1]
        if tp == 'p':
            return tx in REGEX_ANTES_P
        if tp == 'w':
            return tx in REGEX_ANTES_KW
        if tp == 't':
            return tx.endswith('${')
        return False

    def leer_plantilla(j):
        # s[j] es ` o } (continuación); devuelve fin (exclusivo) y si acaba en ${
        k = j + 1
        while k < n:
            c = s[k]
            if c == '\\':
                k += 2
                continue
            if c == '`':
                return k + 1, False
            if c == '$' and k + 1 < n and s[k + 1] == '{':
                return k + 2, True
            k += 1
        raise ErrorMin('plantilla sin cerrar en %d' % j)

    while i < n:
        c = s[i]
        if c in ' \t\r\ufeff\u00a0':
            i += 1
            continue
        if c == '\n' or c in '\u2028\u2029':
            salto = True
            i += 1
            continue
        if s.startswith('//', i):
            j = s.find('\n', i)
            i = n if j < 0 else j
            continue
        if s.startswith('/*', i):
            j = s.find('*/', i + 2)
            if j < 0:
                raise ErrorMin('comentario sin cerrar en %d' % i)
            if '\n' in s[i:j]:
                salto = True
            i = j + 2
            continue
        if c in '"\'':
            k = i + 1
            while k < n and s[k] != c:
                if s[k] == '\\':
                    k += 1
                elif s[k] == '\n':
                    raise ErrorMin('cadena con salto de línea en %d' % i)
                k += 1
            tok = ('s', s[i:k + 1], salto)
            i = k + 1
        elif c == '`':
            fin, abre = leer_plantilla(i)
            tok = ('t', s[i:fin], salto)
            if abre:
                pila.append('t')
            i = fin
        elif c == '}' and pila and pila[-1] == 't':
            pila.pop()
            fin, abre = leer_plantilla(i)
            tok = ('t', s[i:fin], salto)
            if abre:
                pila.append('t')
            i = fin
        elif c == '/' and regex_permitida():
            k = i + 1
            clase = False
            while k < n:
                ch = s[k]
                if ch == '\\':
                    k += 2
                    continue
                if ch == '\n':
                    raise ErrorMin('regex con salto de línea en %d: %r' % (i, s[i:i + 40]))
                if clase:
                    if ch == ']':
                        clase = False
                elif ch == '[':
                    clase = True
                elif ch == '/':
                    break
                k += 1
            k += 1
            while k < n and (s[k].isalpha()):
                k += 1
            tok = ('r', s[i:k], salto)
            i = k
        elif c.isdigit() or (c == '.' and i + 1 < n and s[i + 1].isdigit()):
            m = NUM.match(s, i)
            tok = ('n', m.group(0), salto)
            i = m.end()
        elif es_palabra_ch(c):
            k = i
            while k < n and es_palabra_ch(s[k]):
                if s[k] == '\\':
                    k += 2
                else:
                    k += 1
            tok = ('w', s[i:k], salto)
            i = k
        else:
            for p in PUNCT:
                if s.startswith(p, i):
                    if p == '?.' and i + 2 < n and s[i + 2].isdigit():
                        continue
                    break
            else:
                raise ErrorMin('carácter inesperado %r en %d' % (c, i))
            tok = ('p', p, salto)
            if p == '{':
                pila.append('b')
            elif p == '}':
                if pila:
                    pila.pop()
            i += len(p)
        toks.append(tok)
        ult = tok
        salto = False
    return toks


def _necesita_espacio(a, b):
    ta, xa = a[0], a[1]
    tb, xb = b[0], b[1]
    fin_a, ini_b = xa[-1], xb[0]
    if es_palabra_ch(fin_a) and es_palabra_ch(ini_b):
        return True
    if ta == 'n' and ini_b == '.':
        return True
    if fin_a == '+' and ini_b == '+' or fin_a == '-' and ini_b == '-':
        return True
    if fin_a == '/' and ini_b in '/*':
        return True
    if fin_a == '<' and xb.startswith('!--') or xa.endswith('--') and ini_b == '>':
        return True
    return False


def _salto_necesario(a, b):
    if a[0] == 'w' and a[1] in RESTRINGIDAS:
        return True
    if b[0] == 'p' and b[1] in ('++', '--'):
        return True
    if a[0] == 'p' and a[1] in NO_CIERRA:
        return False
    if a[0] == 't' and a[1].endswith('${'):
        return False
    if b[0] == 'p' and b[1] in NO_ABRE:
        return False
    if b[0] == 't' and b[1].startswith('}'):
        return False
    return True


def js(src):
    toks = tokenizar(src)
    out = []
    prev = None
    for t in toks:
        if prev is not None:
            if t[2] and _salto_necesario(prev, t):
                out.append('\n')
            elif _necesita_espacio(prev, t):
                out.append(' ')
        out.append(t[1])
        prev = t
    res = ''.join(out)
    # comprobación: misma secuencia de tokens
    a = [(x[0], x[1]) for x in toks]
    b = [(x[0], x[1]) for x in tokenizar(res)]
    if a != b:
        for k, (x, y) in enumerate(zip(a, b)):
            if x != y:
                raise ErrorMin('la salida no conserva los tokens (primer cambio en el token %d: %r → %r)' % (k, x, y))
        raise ErrorMin('la salida no conserva los tokens (longitudes %d → %d)' % (len(a), len(b)))
    return res


def css(src):
    s = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    # proteger cadenas
    guard = []

    def g(m):
        guard.append(m.group(0))
        return '\x00%d\x00' % (len(guard) - 1)
    s = re.sub(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'', g, s)
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'\s*([{};,])\s*', r'\1', s)
    # «>» y «~» son combinadores fuera de paréntesis; dentro de :is()/:where() también lo son,
    # pero en calc() no aparecen. Se quitan espacios alrededor de ellos.
    s = re.sub(r'\s*([>~])\s*', r'\1', s)
    # «a: b» -> «a:b» (el espacio antes de «:» no se toca: en selectores es un descendiente)
    s = re.sub(r':\s+', ':', s)
    s = s.replace(';}', '}')
    s = re.sub(r'\x00(\d+)\x00', lambda m: guard[int(m.group(1))], s)
    return s.strip()


if __name__ == '__main__':
    import gzip
    for p in sys.argv[1:]:
        t = open(p, encoding='utf-8').read()
        r = js(t) if p.endswith('.js') else css(t)
        print('%-40s %7.1f → %7.1f KB · gzip %6.1f → %6.1f' % (
            p, len(t.encode()) / 1024, len(r.encode()) / 1024,
            len(gzip.compress(t.encode(), 9)) / 1024, len(gzip.compress(r.encode(), 9)) / 1024))

"""Fotos de la pestaña Técnica de Daniel: las máquinas del gimnasio del Arsenal, recortadas y con los puntos marcados.

Daniel autorizó publicarlas el 17-11-2026, recortadas a la máquina y SIN caras ni emblemas: dos emblemas que no se
podían recortar (IMG_9501 e IMG_9504) se pixelan. Las fotos originales (IMG_9472 a IMG_9524, en HEIC) no van al
repositorio: solo las recortadas, en docs/img/tecnica/, sin EXIF ni ubicación. Los textos de cada número están en
datos/plan.json → tecnicaGimnasio[].marcas, en el mismo orden que las marcas de aquí.

Uso:
  python3 herramientas/fotos_tecnica.py <carpeta con las IMG_95xx.HEIC o .jpg> [--salida docs/img/tecnica]

Las coordenadas son de la foto pasada a JPG con «sips -s format jpeg -Z 1100» (618 × 1100 en vertical), que hace el
propio script si le das los HEIC. Si cambias una marca, mira la foto resultante: una marca mal puesta es peor que ninguna.
Necesita Pillow.
"""
import sys
import os
import glob
import json
import shutil
import argparse
import tempfile
import subprocess

from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# nombre: (foto, recorte x0,y0,x1,y1, zonas a pixelar [(x0,y0,x1,y1)], marcas [(x,y)] en orden 1, 2, 3…
A = {
 'press-banca':       ('9502', (0, 200, 618, 950), [], [(270, 450), (470, 650), (440, 395)]),
 'remo-t':            ('9501', (0, 180, 618, 980), [(130, 225, 205, 335)], [(400, 290), (395, 462), (480, 550)]),
 'banco-inclinado':   ('9508', (150, 150, 618, 760), [], [(475, 476), (330, 530), (505, 630)]),
 'jalon':             ('9490', (0, 40, 618, 1060), [], [(70, 150), (200, 722), (120, 860), (265, 660)]),
 'scott':             ('9500', (0, 120, 618, 880), [], [(370, 360), (450, 485), (262, 562), (130, 700)]),
 'polea':             ('9491', (0, 60, 618, 1000), [], [(385, 745), (445, 845)]),
 'silla-rodillas':    ('9504', (0, 180, 618, 1000), [(430, 455, 575, 590)], [(245, 450), (360, 392), (420, 330)]),
 'silla-fondos':      ('9504', (0, 180, 618, 1000), [(430, 455, 575, 590)], [(470, 432), (420, 742)]),
 'abdominales':       ('9515', (0, 150, 618, 950), [], [(300, 235), (240, 600), (225, 742)]),
 'sentadilla-palanca':('9497', (0, 200, 618, 1000), [], [(200, 440), (490, 330), (290, 680), (520, 545)]),
 'extension':         ('9494', (0, 120, 560, 800), [], [(390, 530), (390, 630), (255, 620)]),
 'femoral':           ('9495', (0, 0, 618, 950), [], [(310, 790), (440, 612), (185, 585)]),
 'gemelo':            ('9489', (150, 150, 618, 1000), [], [(420, 380), (390, 690), (355, 452)]),
 'polea-doble':       ('9499', (0, 60, 618, 1000), [], [(350, 540), (445, 330), (300, 750)]),
 'lastre':            ('9475', (250, 120, 618, 1100), [], [(420, 420), (420, 870)]),
 'press-militar':     ('9518', (0, 230, 618, 1000), [], [(270, 330), (110, 540), (300, 730)]),
 'remo-polea':        ('9492', (0, 300, 618, 950), [], [(430, 640), (245, 690), (165, 600)]),
 'press-inclinado':   ('9517', (40, 280, 618, 920), [], [(470, 450), (285, 570), (150, 720), (560, 570)]),
 'barra':             ('9480', (100, 250, 350, 820), [], [(230, 462)]),
 'hexagonal':         ('9477', (0, 270, 230, 900), [], [(80, 565)]),
 'hack':              ('9498', (160, 260, 618, 1000), [], [(300, 345), (300, 450), (470, 705)]),
 'sissy':             ('9488', (80, 330, 560, 800), [], [(270, 665), (280, 480), (280, 570), (455, 395)]),
 'lumbar':            ('9507', (30, 330, 600, 830), [], [(400, 430), (120, 600), (180, 770), (310, 545)]),
 'abductor':          ('9496', (0, 120, 618, 820), [], [(230, 480), (120, 450), (305, 712), (440, 410)]),
 'declinado':         ('9487', (100, 300, 618, 720), [], [(520, 380), (210, 465), (540, 450)]),
}

def preparar(origen, tmp):
    """Deja en tmp las IMG_xxxx.jpg a 1100 px de alto (de HEIC con sips, o copiando los JPG)."""
    for f in glob.glob(os.path.join(origen, 'IMG_*')):
        base, ext = os.path.splitext(os.path.basename(f))
        dst = os.path.join(tmp, base + '.jpg')
        if ext.lower() == '.heic':
            subprocess.run(['sips', '-s', 'format', 'jpeg', '-Z', '1100', f, '--out', dst], check=True, stdout=subprocess.DEVNULL)
        elif ext.lower() in ('.jpg', '.jpeg'):
            shutil.copy(f, dst)


def anotar(src, dst):
    F = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 30, index=1)
    info = {}
    for nom, (foto, box, pix, marcas) in A.items():
        im = Image.open(os.path.join(src, 'IMG_%s.jpg' % foto)).convert('RGB')
        for (a, b, c, d) in pix:
            reg = im.crop((a, b, c, d)); w, h = reg.size
            reg = reg.resize((max(1, w // 14), max(1, h // 14)), Image.BILINEAR).resize((w, h), Image.NEAREST)
            im.paste(reg, (a, b))
        x0, y0, x1, y1 = box
        im = im.crop(box); dr = ImageDraw.Draw(im)
        for k, (x, y) in enumerate(marcas, 1):
            x, y = x - x0, y - y0; r = 21
            dr.ellipse([x - r - 3, y - r - 3, x + r + 3, y + r + 3], fill=(255, 255, 255))
            dr.ellipse([x - r, y - r, x + r, y + r], fill=(250, 178, 25), outline=(15, 24, 34), width=2)
            t = str(k); tw = dr.textlength(t, font=F)
            dr.text((x - tw / 2, y - 18), t, fill=(15, 24, 34), font=F)
        im.save(os.path.join(dst, nom + '.jpg'), 'JPEG', quality=74, optimize=True, progressive=True)
        info[nom] = {'w': im.width, 'h': im.height, 'foto': foto, 'n': len(marcas)}
    return info


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('origen')
    ap.add_argument('--salida', default=os.path.join(RAIZ, 'docs', 'img', 'tecnica'))
    a = ap.parse_args()
    os.makedirs(a.salida, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        preparar(a.origen, tmp)
        info = anotar(tmp, a.salida)
    print(json.dumps(info, indent=1))
    print(len(info), 'fotos en', a.salida, '· ancho, alto y número de marcas: los de cada ficha de plan.json → tecnicaGimnasio')


if __name__ == '__main__':
    main()

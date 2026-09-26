#!/usr/bin/env python3
"""tools_prepare_geld_icons.py — Produkt-Ikonen für die Geld-App aufbereiten.

Die generierten Bilder sind 1024x1024 mit weissem Hintergrund. Für die App
brauchen wir kleine Dateien mit transparentem Hintergrund, damit sie auf dem
cremefarbenen Kartenhintergrund gut aussehen.

Ablauf pro Bild:
  1. Weiss (und fast-weiss) in Transparenz umwandeln
  2. Auf den sichtbaren Inhalt zuschneiden
  3. Quadratisch mit etwas Rand auffüllen
  4. Auf 320x320 verkleinern und als PNG speichern

Einmalig ausführen. Danach nicht mehr nötig (die Dateien bleiben aufbereitet).
"""

import glob
import os

from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(BASE_DIR, 'images')
TARGET = 320
# Ab diesem Helligkeitswert gilt ein Pixel als "weisser Hintergrund".
WHITE_CUTOFF = 246
PAD_RATIO = 0.06


def white_to_alpha(im):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= WHITE_CUTOFF and g >= WHITE_CUTOFF and b >= WHITE_CUTOFF:
                px[x, y] = (r, g, b, 0)
    return im


def square_pad(im):
    w, h = im.size
    side = max(w, h)
    side = int(side * (1 + 2 * PAD_RATIO))
    out = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    out.paste(im, ((side - w) // 2, (side - h) // 2), im)
    return out


def main():
    files = sorted(glob.glob(os.path.join(IMG_DIR, 'geld_*.png')))
    if not files:
        print('Keine geld_*.png gefunden.')
        return
    for path in files:
        im = white_to_alpha(Image.open(path))
        box = im.getbbox()
        if box:
            im = im.crop(box)
        im = square_pad(im)
        im = im.resize((TARGET, TARGET), Image.LANCZOS)
        im.save(path, 'PNG', optimize=True)
        kb = os.path.getsize(path) // 1024
        print('  aufbereitet: %s (%d KB)' % (os.path.basename(path), kb))
    print('Fertig — %d Ikonen.' % len(files))


if __name__ == '__main__':
    main()

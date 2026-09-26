#!/usr/bin/env python3
"""enhance_stickers.py — macht die Sticker kräftiger und gibt ihnen einen
weichen weissen Rand, damit sie auf jedem Hintergrund (auch dunkles Gras,
Wasser, Nachtszenen) gut sichtbar bleiben.

Warum: viele Sticker (Schaf, Wolke, Kleeblatt, Schnecke, Regenbogen, Stern,
Schwein, Qualle, Seepferdchen, Lutscher, Schaukel, Libelle ...) sind fast
weiss/pastell gemalt und hatten keinen Rand -> auf dem Wiesen-/Wasserhintergrund
kaum zu erkennen.

Vorgehen pro Bild:
  1. Aus dem Alpha-Kanal eine harte Maske bauen (>10 Alpha = "gehört zum Motiv").
  2. Die Maske um ein paar Pixel aufweiten (MaxFilter) -> das ist die Randform.
  3. Rand = aufgeweitete Maske minus Original-Maske, leicht weich gezeichnet.
  4. Farben des Originalmotivs kräftiger machen (Sättigung + Kontrast).
  5. Weissen Rand UNTER das kräftigere Motiv legen und beides zusammenfügen.

Nur additiv: Form und Motiv bleiben exakt gleich, nur Randbreite und Farbkraft
ändern sich. Originale werden vorher nach images/_orig_stickers/ gesichert.
"""
import os
import sys
from PIL import Image, ImageFilter, ImageEnhance, ImageChops

d = os.path.dirname(os.path.abspath(__file__))
imgdir = os.path.join(d, 'images')
backupdir = os.path.join(imgdir, '_orig_stickers')
os.makedirs(backupdir, exist_ok=True)

STICKER_IDS = ['cat','bunny','tulip','sunflower','butterfly','mushroom','frog','ladybug','deer','blossom',
    'bird','apple','snail','rainbow','star','owl','fox','hedgehog','squirrel','bee',
    'pig','sheep','cow','horse','duck','rooster','fish','turtle','octopus','dolphin',
    'jellyfish','crab','seahorse','whale','starfish','rose','daisy','lavender','clover','cactus',
    'pinetree','oaktree','fairyhouse','fern','palmtree','fence','birdhouse','bridge','boat','lighthouse',
    'barn','windmill','cloud','sun','moon','strawberry','watermelon','cupcake','icecream','lollipop',
    'balloon','kite','treasure','crown','wand','fairy','crystal','cabin','goat','edelweiss',
    'marmot','eagle','wateringcan','gnome','dragonfly','swing']

OUTLINE_PX = 5       # Randbreite in Pixeln (bei den vorliegenden Bildgrössen)
OUTLINE_COLOR = (255, 255, 255)  # weicher weisser Rand passt zur Aquarell-Optik
SATURATION = 1.55    # kräftigere Farben
CONTRAST = 1.18

# Manche Motive (z.B. Sonne, Mond) sind kaum als Fläche gemalt, sondern fast
# nur als dünne, halbtransparente Linien -> Sättigung allein kann nichts
# sichtbar machen, wo praktisch kein deckendes Pixel liegt. Darum wird der
# Alpha-Kanal zusätzlich angehoben: schwach deckende Pixel (die feinen Linien)
# werden kräftiger deckend, voll transparente bleiben transparent, voll
# deckende bleiben deckend. Eine einfache Gamma-Kurve reicht dafür.
ALPHA_GAMMA = 0.55   # < 1 hebt mittlere/niedrige Alpha-Werte kräftig an

# sticker_moon.png hat einen kaputten Alpha-Kanal: die Farbebene zeigt einen
# vollständigen, klar gezeichneten Mond mit Gesicht und Sternen, aber fast der
# gesamte Alpha-Kanal ist 0 (nur ~1.5% der Fläche hat überhaupt Deckkraft,
# und das auch nur verstreut, nicht als zusammenhängende Form). Deshalb greift
# der normale Weg (Maske aus Alpha bauen) hier ins Leere. Für diese Sticker
# wird die Alpha-Maske stattdessen direkt aus der Farbe rekonstruiert: alles,
# was nicht (fast) reines Weiss ist, gehört zum Motiv.
REBUILD_ALPHA_FROM_COLOR = {'moon'}
WHITE_THRESHOLD = 8  # Farbabweichung von Weiss unterhalb davon gilt als Hintergrund


def boost_alpha(a):
    lut = [min(255, int(255 * ((v / 255.0) ** ALPHA_GAMMA))) if v > 0 else 0 for v in range(256)]
    return a.point(lut)


def rebuild_alpha_from_color(r, g, b):
    # alpha = wie weit weg von Weiss (min. Kanalwert), mit Rauschschwelle
    min_rgb = ImageChops.darker(ImageChops.darker(r, g), b)
    lut = [max(0, min(255, (255 - p) - WHITE_THRESHOLD)) for p in range(256)]
    return min_rgb.point(lut)


def enhance_one(path, sid=None):
    im = Image.open(path).convert('RGBA')
    r, g, b, a = im.split()

    if sid in REBUILD_ALPHA_FROM_COLOR:
        a = rebuild_alpha_from_color(r, g, b)

    # 1+2: harte Maske, dann aufgeweitet
    mask = a.point(lambda p: 255 if p > 10 else 0)
    dilated = mask.filter(ImageFilter.MaxFilter(OUTLINE_PX * 2 + 1))
    # weich zeichnen, damit der Rand nicht hart gezackt aussieht
    dilated_soft = dilated.filter(ImageFilter.GaussianBlur(1.2))

    # 3: Randform = aufgeweitet minus original (nur dort, wo das Original leer ist)
    outline_alpha = ImageChops.subtract(dilated_soft, mask)

    outline_layer = Image.new('RGBA', im.size, OUTLINE_COLOR + (0,))
    outline_layer.putalpha(outline_alpha)

    # 4: Farben kräftiger, dazu die feinen Linien deckender machen
    rgb = Image.merge('RGB', (r, g, b))
    rgb = ImageEnhance.Color(rgb).enhance(SATURATION)
    rgb = ImageEnhance.Contrast(rgb).enhance(CONTRAST)
    a_boosted = boost_alpha(a)
    enhanced = Image.merge('RGBA', (*rgb.split(), a_boosted))

    # 5: Rand unter das Motiv legen
    out = Image.alpha_composite(outline_layer, enhanced)
    return out


def main():
    only = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    done = []
    for sid in STICKER_IDS:
        if only and sid not in only:
            continue
        fname = 'sticker_' + sid + '.png'
        path = os.path.join(imgdir, fname)
        if not os.path.exists(path):
            print('fehlt:', fname)
            continue
        bpath = os.path.join(backupdir, fname)
        if not os.path.exists(bpath):
            Image.open(path).save(bpath)  # Original sichern, nur beim ersten Lauf
        out = enhance_one(bpath, sid)  # immer vom Original ausgehen, nie kumulieren
        out.save(path)
        done.append(sid)
    print('bearbeitet:', ', '.join(done))


if __name__ == '__main__':
    main()

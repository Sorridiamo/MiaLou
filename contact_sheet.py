#!/usr/bin/env python3
"""contact_sheet.py — legt alle 76 Sticker als Bilder-Übersicht an, damit man
sieht, welche zu blass sind oder keinen Rand haben. Nur ein Hilfsmittel für
die Beurteilung, wird danach wieder gelöscht."""
import os
from PIL import Image

d = os.path.dirname(os.path.abspath(__file__))
imgdir = os.path.join(d, 'images')

STICKER_IDS = ['cat','bunny','tulip','sunflower','butterfly','mushroom','frog','ladybug','deer','blossom',
    'bird','apple','snail','rainbow','star','owl','fox','hedgehog','squirrel','bee',
    'pig','sheep','cow','horse','duck','rooster','fish','turtle','octopus','dolphin',
    'jellyfish','crab','seahorse','whale','starfish','rose','daisy','lavender','clover','cactus',
    'pinetree','oaktree','fairyhouse','fern','palmtree','fence','birdhouse','bridge','boat','lighthouse',
    'barn','windmill','cloud','sun','moon','strawberry','watermelon','cupcake','icecream','lollipop',
    'balloon','kite','treasure','crown','wand','fairy','crystal','cabin','goat','edelweiss',
    'marmot','eagle','wateringcan','gnome','dragonfly','swing']

cell = 100
cols = 10
rows = (len(STICKER_IDS) + cols - 1) // cols

for bgname, bgcolor in [('light', (230, 224, 208, 255)), ('dark', (60, 90, 60, 255))]:
    sheet = Image.new('RGBA', (cols*cell, rows*cell), bgcolor)
    for i, sid in enumerate(STICKER_IDS):
        path = os.path.join(imgdir, 'sticker_' + sid + '.png')
        if not os.path.exists(path):
            continue
        im = Image.open(path).convert('RGBA')
        im.thumbnail((cell-10, cell-10))
        x = (i % cols) * cell + (cell - im.width)//2
        y = (i // cols) * cell + (cell - im.height)//2
        sheet.paste(im, (x, y), im)
    out = os.path.join(d, '_contact_' + bgname + '.png')
    sheet.convert('RGB').save(out)
    print('geschrieben:', out)

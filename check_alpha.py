#!/usr/bin/env python3
"""check_alpha.py — Check if stickers actually have transparent pixels."""
from PIL import Image

for name in ['sticker_fox.png', 'sticker_cat.png', 'sticker_butterfly.png']:
    img = Image.open(f'images/{name}').convert('RGBA')
    w, h = img.size
    pixels = img.load()
    fully_transparent = 0
    semi_transparent = 0
    opaque = 0
    for x in range(w):
        for y in range(h):
            a = pixels[x, y][3]
            if a == 0:
                fully_transparent += 1
            elif a < 255:
                semi_transparent += 1
            else:
                opaque += 1
    total = w * h
    print(f'{name}: {w}x{h} = {total} pixels')
    print(f'  Transparent: {fully_transparent} ({fully_transparent*100//total}%)')
    print(f'  Semi-trans:  {semi_transparent}')
    print(f'  Opaque:      {opaque} ({opaque*100//total}%)')
    corners = [(0,0), (w-1,0), (0,h-1), (w-1,h-1)]
    for cx, cy in corners:
        r,g,b,a = pixels[cx, cy]
        print(f'  Corner ({cx},{cy}): rgba({r},{g},{b},{a})')
    print()

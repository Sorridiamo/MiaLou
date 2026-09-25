#!/usr/bin/env python3
"""remove_bg.py — Remove white/light background from sticker PNGs, making them transparent."""

import os
from PIL import Image

IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images')
BACKUP_DIR = os.path.join(IMG_DIR, 'backup_originals')

def remove_background(img_path, threshold=220, edge_feather=True):
    """Remove near-white background from a PNG image.

    Uses flood-fill from corners to identify background pixels,
    then makes them transparent. This avoids removing white parts
    inside the actual sticker artwork.
    """
    img = Image.open(img_path).convert('RGBA')
    pixels = img.load()
    w, h = img.size

    # Track which pixels are background via flood fill from edges
    visited = set()
    queue = []

    # Seed from all edge pixels
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.pop()
        if (x, y) in visited:
            continue
        if x < 0 or x >= w or y < 0 or y >= h:
            continue

        r, g, b, a = pixels[x, y]

        # Check if pixel is "near white" or very light
        if r >= threshold and g >= threshold and b >= threshold:
            visited.add((x, y))
            # Spread to neighbors
            queue.append((x + 1, y))
            queue.append((x - 1, y))
            queue.append((x, y + 1))
            queue.append((x, y - 1))
        else:
            # Not background — stop flood fill here
            continue

    # Make background pixels transparent, with soft edges
    for (x, y) in visited:
        r, g, b, a = pixels[x, y]
        # Check how many non-background neighbors this pixel has
        if edge_feather:
            neighbor_count = 0
            for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    neighbor_count += 1
            if neighbor_count > 0:
                # Edge pixel — semi-transparent for smoother blend
                pixels[x, y] = (r, g, b, int(a * 0.15 * neighbor_count))
            else:
                pixels[x, y] = (r, g, b, 0)
        else:
            pixels[x, y] = (r, g, b, 0)

    img.save(img_path, 'PNG')
    return len(visited)


def main():
    # Backup originals
    os.makedirs(BACKUP_DIR, exist_ok=True)

    sticker_files = sorted([f for f in os.listdir(IMG_DIR)
                           if f.startswith('sticker_') and f.endswith('.png')])

    print(f'Processing {len(sticker_files)} stickers...')

    for i, fname in enumerate(sticker_files):
        fpath = os.path.join(IMG_DIR, fname)
        backup_path = os.path.join(BACKUP_DIR, fname)

        # Backup if not already done
        if not os.path.exists(backup_path):
            img = Image.open(fpath)
            img.save(backup_path)

        removed = remove_background(fpath, threshold=225)
        print(f'  [{i+1}/{len(sticker_files)}] {fname} — {removed} pixels made transparent')

    print('\nDone! Originals backed up in images/backup_originals/')


if __name__ == '__main__':
    main()

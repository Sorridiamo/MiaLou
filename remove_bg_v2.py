#!/usr/bin/env python3
"""remove_bg_v2.py — Aggressively remove white/light background from sticker PNGs."""

import os
from PIL import Image
from collections import deque

IMG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images')
BACKUP_DIR = os.path.join(IMG_DIR, 'backup_originals')

def luminance(r, g, b):
    """Perceived brightness 0-255."""
    return int(0.299 * r + 0.587 * g + 0.114 * b)

def remove_background(img_path, lum_threshold=210, alpha_feather_px=2):
    """
    Flood-fill from all edges. Any pixel with luminance >= threshold
    is considered background. After flood fill, apply anti-aliased
    feathering on edge pixels.
    """
    # Restore from backup to start clean
    backup = os.path.join(BACKUP_DIR, os.path.basename(img_path))
    if os.path.exists(backup):
        img = Image.open(backup).convert('RGBA')
    else:
        img = Image.open(img_path).convert('RGBA')

    pixels = img.load()
    w, h = img.size

    # BFS flood fill from edges
    is_bg = [[False] * h for _ in range(w)]
    q = deque()

    # Seed all edge pixels
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(1, h - 1):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        if is_bg[x][y]:
            continue

        r, g, b, a = pixels[x, y]
        lum = luminance(r, g, b)

        if lum >= lum_threshold:
            is_bg[x][y] = True
            q.append((x + 1, y))
            q.append((x - 1, y))
            q.append((x, y + 1))
            q.append((x, y - 1))
            # Also diagonals for better corner removal
            q.append((x + 1, y + 1))
            q.append((x - 1, y - 1))
            q.append((x + 1, y - 1))
            q.append((x - 1, y + 1))

    # Count bg pixels
    bg_count = 0

    # Compute distance from nearest non-bg pixel for feathering
    for x in range(w):
        for y in range(h):
            if is_bg[x][y]:
                bg_count += 1
                # Check distance to nearest non-bg pixel
                min_dist = alpha_feather_px + 1
                for dx in range(-alpha_feather_px, alpha_feather_px + 1):
                    for dy in range(-alpha_feather_px, alpha_feather_px + 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not is_bg[nx][ny]:
                            d = ((dx * dx + dy * dy) ** 0.5)
                            if d < min_dist:
                                min_dist = d

                r, g, b, a = pixels[x, y]
                if min_dist <= alpha_feather_px:
                    # Edge: gradual fade
                    alpha = int(255 * (1.0 - min_dist / (alpha_feather_px + 1)) * 0.4)
                    pixels[x, y] = (r, g, b, max(0, min(255, alpha)))
                else:
                    pixels[x, y] = (r, g, b, 0)

    img.save(img_path, 'PNG')
    return bg_count


def main():
    os.makedirs(BACKUP_DIR, exist_ok=True)

    sticker_files = sorted([f for f in os.listdir(IMG_DIR)
                           if f.startswith('sticker_') and f.endswith('.png')
                           and os.path.isfile(os.path.join(IMG_DIR, f))])

    print(f'Processing {len(sticker_files)} stickers (v2 — aggressive)...')
    print(f'Luminance threshold: 210 (lower = more aggressive)')

    for i, fname in enumerate(sticker_files):
        fpath = os.path.join(IMG_DIR, fname)
        backup_path = os.path.join(BACKUP_DIR, fname)

        # Ensure backup exists
        if not os.path.exists(backup_path):
            img = Image.open(fpath)
            img.save(backup_path)

        removed = remove_background(fpath, lum_threshold=210, alpha_feather_px=2)
        print(f'  [{i+1}/{len(sticker_files)}] {fname} — {removed} bg pixels')

    print('\nDone!')


if __name__ == '__main__':
    main()

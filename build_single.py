#!/usr/bin/env python3
"""build_single.py — Build single-file HTML with Base64-embedded images for MiaLou Spielkiste."""

import base64, os, re, sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(BASE_DIR, 'images')
OUT_FILE = os.path.join(BASE_DIR, 'MiaLou_Spielkiste.html')

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def img_to_base64(path):
    ext = os.path.splitext(path)[1].lower()
    mime = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp'}.get(ext, 'image/png')
    with open(path, 'rb') as f:
        data = base64.b64encode(f.read()).decode('ascii')
    return f'data:{mime};base64,{data}'

def main():
    print('Building single-file HTML...')

    # Read source files
    html = read_file(os.path.join(BASE_DIR, 'index.html'))
    css = read_file(os.path.join(BASE_DIR, 'style.css'))
    fb_config_js = read_file(os.path.join(BASE_DIR, 'firebase-config.js'))
    app_js = read_file(os.path.join(BASE_DIR, 'app.js'))
    em_js = read_file(os.path.join(BASE_DIR, 'game_einmaleins.js'))
    dr_js = read_file(os.path.join(BASE_DIR, 'game_durch.js'))
    pl_js = read_file(os.path.join(BASE_DIR, 'game_plus.js'))
    mi_js = read_file(os.path.join(BASE_DIR, 'game_minus.js'))
    rs_js = read_file(os.path.join(BASE_DIR, 'game_rechtschreibung.js'))

    # Collect all image references
    all_js = app_js + em_js + dr_js + pl_js + mi_js + rs_js
    img_refs = set()

    # Find in HTML: src="images/..."
    for m in re.finditer(r'src="(images/[^"]+)"', html):
        img_refs.add(m.group(1))

    # Find in JS: 'images/...'
    for m in re.finditer(r"'(images/[^']+)'", all_js):
        img_refs.add(m.group(1))

    # Also find sticker references (constructed dynamically)
    for fname in os.listdir(IMG_DIR):
        if os.path.isfile(os.path.join(IMG_DIR, fname)):
            img_refs.add('images/' + fname)

    print(f'Found {len(img_refs)} image references')

    # Build base64 map
    b64_map = {}
    total_size = 0
    for ref in sorted(img_refs):
        fpath = os.path.join(BASE_DIR, ref)
        if os.path.exists(fpath):
            b64_map[ref] = img_to_base64(fpath)
            total_size += os.path.getsize(fpath)
            print(f'  Encoded: {ref} ({os.path.getsize(fpath) // 1024} KB)')
        else:
            print(f'  WARNING: {ref} not found!')

    print(f'Total image data: {total_size // (1024*1024)} MB')

    # Replace image paths in HTML
    for ref, b64 in b64_map.items():
        html = html.replace(f'src="{ref}"', f'src="{b64}"')

    # Replace image paths in JS (both single and double quotes)
    for ref, b64 in b64_map.items():
        app_js = app_js.replace(f"'{ref}'", f"'{b64}'")
        em_js = em_js.replace(f"'{ref}'", f"'{b64}'")
        dr_js = dr_js.replace(f"'{ref}'", f"'{b64}'")
        pl_js = pl_js.replace(f"'{ref}'", f"'{b64}'")
        mi_js = mi_js.replace(f"'{ref}'", f"'{b64}'")
        rs_js = rs_js.replace(f"'{ref}'", f"'{b64}'")

    # Also handle dynamically constructed paths like 'images/sticker_' + sid + '.png'
    # We inject a lookup map into app.js
    sticker_map_entries = []
    for sid_file in sorted(os.listdir(IMG_DIR)):
        if sid_file.startswith('sticker_') and sid_file.endswith('.png'):
            ref = 'images/' + sid_file
            if ref in b64_map:
                sticker_map_entries.append(f"  '{ref}': '{b64_map[ref]}'")

    world_map_entries = []
    for wf in ['world_forest.png', 'world_ocean.png', 'world_farm.png', 'world_mountain.png']:
        ref = 'images/' + wf
        if ref in b64_map:
            world_map_entries.append(f"  '{ref}': '{b64_map[ref]}'")

    img_map_js = "var IMG_MAP = {\n" + ",\n".join(sticker_map_entries + world_map_entries) + "\n};\n"
    img_map_js += """
function resolveImg(path) {
  return IMG_MAP[path] || path;
}
"""

    # Patch JS to use resolveImg for dynamic paths
    # In app.js: 'images/sticker_' + sid + '.png' -> resolveImg('images/sticker_' + sid + '.png')
    app_js = app_js.replace(
        "'images/sticker_' + sid + '.png'",
        "resolveImg('images/sticker_' + sid + '.png')"
    )
    app_js = app_js.replace(
        "'images/world_' + worldId + '.png'",
        "resolveImg('images/world_' + worldId + '.png')"
    )

    # Inline CSS
    html = html.replace(
        '<link rel="stylesheet" href="style.css">',
        f'<style>\n{css}\n</style>'
    )

    # Inline JS (replace script tags)
    # Firebase CDN-Skripte bleiben als externe <script src> erhalten (kein lokales File, kein Base64 nötig).
    # firebase-config.js und die Spiel-Skripte werden wie bisher direkt inline gebaut.
    html = html.replace(
        '<script src="firebase-config.js"></script>\n<script src="app.js"></script>\n<script src="game_einmaleins.js"></script>\n<script src="game_durch.js"></script>\n<script src="game_plus.js"></script>\n<script src="game_minus.js"></script>\n<script src="game_rechtschreibung.js"></script>',
        f'<script>\n{img_map_js}\n{fb_config_js}\n{app_js}\n{em_js}\n{dr_js}\n{pl_js}\n{mi_js}\n{rs_js}\n</script>'
    )

    # Write output
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        f.write(html)

    out_size = os.path.getsize(OUT_FILE)
    print(f'\nOutput: {OUT_FILE}')
    print(f'Size: {out_size // (1024*1024)} MB ({out_size:,} bytes)')
    print('Done!')

if __name__ == '__main__':
    main()

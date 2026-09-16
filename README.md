# Mia Lou's Spielkiste

Eine Lern-App für Kinder mit 5 Spielen und einem Sticker-Belohnungssystem.

## Spiele

- **Einmaleins** — Multiplikation (1×1 bis 10×10)
- **Durch** — Division (umgekehrtes Einmaleins)
- **Plus** — Addition (bis 100 oder 1000)
- **Minus** — Subtraktion (bis 100 oder 1000)
- **Rechtschreibung** — tz/z und ck/k Wörter

## Features

- Punkte-System: 1 Punkt pro richtige Antwort
- Sticker-Shop: alle 25 Punkte ein neuer Sticker
- 4 Landschaften zum Dekorieren mit Stickern
- Falsche Antworten werden wiederholt bis alles sitzt
- Pause alle 20 Aufgaben
- Historie mit Statistiken

## Nutzung

Die App läuft als einzelne HTML-Datei im Browser (optimiert für iPad Safari).

**Download:** Siehe [Releases](../../releases) für die fertige `MiaLou_Spielkiste.html`.

### Selber bauen

```bash
python3 build_single.py
```

Erzeugt `MiaLou_Spielkiste.html` mit allen Bildern als Base64 eingebettet (~395 MB).

## Dateien

| Datei | Beschreibung |
|---|---|
| `index.html` | Haupt-HTML mit allen Screens |
| `style.css` | Styling |
| `app.js` | Kernlogik (Punkte, Shop, Welten) |
| `game_einmaleins.js` | Multiplikations-Spiel |
| `game_durch.js` | Divisions-Spiel |
| `game_plus.js` | Additions-Spiel |
| `game_minus.js` | Subtraktions-Spiel |
| `game_rechtschreibung.js` | Rechtschreib-Spiel |
| `build_single.py` | Build-Script für Single-File HTML |
| `images/` | Alle Bilder (Maus, Sticker, Landschaften) |

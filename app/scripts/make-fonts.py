#!/usr/bin/env python3
"""make-fonts.py — build the shipped font subsets from the design-team drop.

ADR 0008: "Fonts ship subset with the OFL license text; the full design-drop
font set does not ship." This script is that subsetting step.

Source (operator-local, gitignored): design-team/v2/fonts/
Output (tracked, shipped):           app/public/fonts/

  PlexSansVar.woff2   IBM Plex Sans variable, wght limited to 400..600 (the
                      brand weight ceiling is 600 semibold; nothing heavier is
                      ever used), wdth axis pinned to default. One file serves
                      every sans weight via interpolation.
  PlexMono-400.woff2  IBM Plex Mono Regular   (numeric data, scores)
  PlexMono-500.woff2  IBM Plex Mono Medium
  PlexMono-600.woff2  IBM Plex Mono SemiBold
  OFL.txt             full license text (static tracked asset, IBM's own
                      LICENSE.txt from github.com/IBM/plex; not regenerated)

Glyph subset: printable ASCII plus the ADR 0015 notation allowlist (math and
currency glyphs) plus typographic quotes. Em/en dashes are deliberately absent;
the voice rule bans them, and DASH_VIOLATION enforces it in content.

Run: python3 app/scripts/make-fonts.py   (requires fonttools + brotli)
"""
import pathlib

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = pathlib.Path(__file__).parent
SRC = HERE.parent.parent / "design-team" / "v2" / "fonts"
OUT = HERE.parent / "public" / "fonts"

# Printable ASCII + ADR 0015 allowlist + typographic quotes + nbsp + ellipsis.
UNICODES = (
    "U+0020-007E,U+00A0,U+00B1,U+00B2,U+00B3,U+00D7,U+00F7,"
    "U+0394,U+03BC,U+03C3,"
    "U+2018,U+2019,U+201C,U+201D,U+2026,U+2044,U+20B9,"
    "U+2229,U+222A,U+222B,U+221A,U+2248,U+2260,U+2264,U+2265"
)

SUBSET_ARGS = [
    f"--unicodes={UNICODES}",
    "--flavor=woff2",
    "--layout-features=kern,liga,ccmp,mark,mkmk",
    "--no-hinting",
    "--desubroutinize",
]


def build_sans():
    src = SRC / "IBMPlexSans-VariableFont_wdth_wght.ttf"
    font = TTFont(src)
    # Pin wdth, keep wght interpolable across the weights the app uses.
    font = instancer.instantiateVariableFont(font, {"wdth": 100, "wght": (400, 600)})
    tmp = OUT / "_sans_instanced.ttf"
    font.save(tmp)
    subset.main([str(tmp), f"--output-file={OUT / 'PlexSansVar.woff2'}", *SUBSET_ARGS])
    tmp.unlink()


def build_mono():
    for weight, name in [(400, "Regular"), (500, "Medium"), (600, "SemiBold")]:
        src = SRC / f"IBMPlexMono-{name}.ttf"
        subset.main([str(src), f"--output-file={OUT / f'PlexMono-{weight}.woff2'}", *SUBSET_ARGS])


def main():
    OUT.mkdir(exist_ok=True)
    if not (OUT / "OFL.txt").exists():
        raise SystemExit("public/fonts/OFL.txt missing; fonts must not ship without it (ADR 0008)")
    build_sans()
    build_mono()
    total = 0
    for f in sorted(OUT.iterdir()):
        size = f.stat().st_size
        total += size
        print(f"{f.name}: {size} bytes")
    print(f"total: {total} bytes")


if __name__ == "__main__":
    main()

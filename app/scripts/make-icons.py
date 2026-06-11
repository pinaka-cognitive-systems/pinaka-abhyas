#!/usr/bin/env python3
"""make-icons.py — regenerate the PWA icon set from the brand chevron-mark.

The mark is the design-team chevron (design-team/v2/app-shell.jsx, icon
"chevron-mark"): two strokes on a 24-unit grid, stroke width 3, square caps.
  long stroke   (4, 18) -> (12, 6)
  short stroke  (16, 12) -> (20, 18)

Outputs (all under app/public/):
  icons/icon-192.png        manifest icon, purpose "any maskable"
  icons/icon-512.png        manifest icon, purpose "any maskable"
  apple-touch-icon.png      180x180, iOS home screen
  favicon-32.png            legacy/Safari tab fallback (favicon.svg is primary)

Maskable safe zone: the mark spans ~52% of the canvas, well inside the central
80% circle a launcher mask may apply.

Colors: tile is the brand primary after the W5-6 WCAG correction (#5558E8,
matches --color-brand-primary and the theme-color meta); the mark is white.
favicon-32 inverts: indigo mark on transparent, matching favicon.svg.

Run: python3 app/scripts/make-icons.py   (requires Pillow)
"""
import math
import pathlib

from PIL import Image, ImageDraw

PUBLIC = pathlib.Path(__file__).parent.parent / "public"

BRAND = (0x55, 0x58, 0xE8, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)

# Mark geometry in 24-unit viewBox coordinates.
STROKES = [((4, 18), (12, 6)), ((16, 12), (20, 18))]
STROKE_W = 3.0  # viewBox units
SS = 4  # supersample factor for clean anti-aliased edges


def stroke_polygon(a, b, half_w):
    """Quad covering a stroke with square caps (caps extend half_w past each end)."""
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length  # along the stroke
    nx, ny = -uy, ux  # normal
    ax, ay = ax - ux * half_w, ay - uy * half_w
    bx, by = bx + ux * half_w, by + uy * half_w
    return [
        (ax + nx * half_w, ay + ny * half_w),
        (bx + nx * half_w, by + ny * half_w),
        (bx - nx * half_w, by - ny * half_w),
        (ax - nx * half_w, ay - ny * half_w),
    ]


def render(size, bg, fg, mark_scale):
    """mark_scale: pixels per viewBox unit at the final size."""
    big = size * SS
    scale = mark_scale * SS
    img = Image.new("RGBA", (big, big), bg)
    draw = ImageDraw.Draw(img)
    cx = cy = big / 2
    for a, b in STROKES:
        quad = stroke_polygon(a, b, STROKE_W / 2)
        px = [((x - 12) * scale + cx, (y - 12) * scale + cy) for x, y in quad]
        draw.polygon(px, fill=fg)
    return img.resize((size, size), Image.LANCZOS)


def main():
    icons = PUBLIC / "icons"
    icons.mkdir(exist_ok=True)
    # 512 baseline: 14 px/unit puts the mark at ~52% of the canvas (safe zone).
    render(512, BRAND, WHITE, 14.0).save(icons / "icon-512.png", optimize=True)
    render(192, BRAND, WHITE, 14.0 * 192 / 512).save(icons / "icon-192.png", optimize=True)
    render(180, BRAND, WHITE, 14.0 * 180 / 512).save(PUBLIC / "apple-touch-icon.png", optimize=True)
    # Tab favicon fallback: indigo mark, transparent, slightly larger in frame.
    render(32, CLEAR, BRAND, 32 / 24).save(PUBLIC / "favicon-32.png", optimize=True)
    for f in ["icons/icon-512.png", "icons/icon-192.png", "apple-touch-icon.png", "favicon-32.png"]:
        print(f"{f}: {(PUBLIC / f).stat().st_size} bytes")


if __name__ == "__main__":
    main()

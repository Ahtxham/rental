"""
Route M in saffron and midnight: the mark, the lockups and the icons.

The M is a route. It sets off from a saffron dot at the bottom of the left
upright, runs up, down through the V and up again, and arrives at a saffron pin
that stands in for the right foot. Every file below is drawn from that one
geometry, so the sticker on a car, the favicon in a tab and the icon on a home
screen cannot drift apart.

Rules the geometry is held to, because the mark has to survive a rear window:

  Flat colour only. Cut vinyl has no tints and no gradients.

  Real knockouts. The hole in the pin is a hole (even-odd fill), not a dot
  painted in the background colour, so the one-colour and vinyl versions work
  on any ground. That is also why the road stops short of the hole: a road
  running into it would show through as a sliver.

  Contrast measured, not eyeballed. The bright saffron reads on midnight and on
  tinted glass, but not on white (2.4:1), so on paper the pin and "Cars" take
  a darker shade worked out here to clear 4.5:1.

Run with the brand venv (fontTools + uharfbuzz), then the PNGs are rendered by
headless Chrome:

    python src/route_m.py
"""

from __future__ import annotations

import base64
import math
import subprocess
import sys
import tempfile
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen

sys.path.insert(0, str(Path(__file__).parent))
from typeset import FRAUNCES, PUBLIC_SANS, _instance, typeset  # noqa: E402

OUT = Path("/Users/ahtxham/Documents/invo/rental/brand/logo/route-m")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# ── Colour ────────────────────────────────────────────────────────────────
MIDNIGHT = "#0f1f3d"
SAFFRON = "#ff8a1f"
WHITE = "#ffffff"
PAPER = "#f7f7f8"
# A typical tinted rear window, seen from behind. Only used to check contrast
# and to draw the mock-up; nothing is ever printed in it.
GLASS = "#22282d"


def _lin(c: int) -> float:
    v = c / 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def luminance(hex_: str) -> float:
    r, g, b = (int(hex_[i : i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast(a: str, b: str) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def darken_until(hex_: str, against: str, target: float) -> str:
    """Mix toward black, one percent at a time, until it clears `target`."""
    r, g, b = (int(hex_[i : i + 2], 16) for i in (1, 3, 5))
    for step in range(101):
        k = 1 - step / 100
        c = "#%02x%02x%02x" % (round(r * k), round(g * k), round(b * k))
        if contrast(c, against) >= target:
            return c
    return "#000000"


# Saffron for paper: the pin and "Cars" on a light ground. Worked out against
# PAPER rather than pure white, because the site's light surface is PAPER and a
# shade that only clears 4.5:1 on white fails there.
SAFFRON_INK = darken_until(SAFFRON, PAPER, 4.5)

# Who paints what, per ground.
SCHEMES = {
    # Midnight tile, dark site surfaces, the printed card's front.
    "dark": {"road": WHITE, "accent": SAFFRON, "word": WHITE, "cars": SAFFRON},
    # White or paper: the site header, letterheads, invoices.
    "light": {"road": MIDNIGHT, "accent": SAFFRON_INK, "word": MIDNIGHT, "cars": SAFFRON_INK},
    # Stamps, embroidery, a fax, a one-colour newspaper ad.
    "one-colour": {"road": MIDNIGHT, "accent": MIDNIGHT, "word": MIDNIGHT, "cars": MIDNIGHT},
    # Single white vinyl, or any photo too busy for the saffron.
    "white": {"road": WHITE, "accent": WHITE, "word": WHITE, "cars": WHITE},
}

# ── The mark, in its own 120-unit box ─────────────────────────────────────
STROKE = 16
# Ends at y=56 rather than running further into the pin: the round cap then
# stops 5 units clear of the hole, which is about 5mm on the rear-window
# decal, comfortably over the 1.5mm a vinyl cutter can hold.
ROUTE = "M24,94 L24,30 L60,70 L96,30 L96,56"
ORIGIN = (24.0, 94.0, 9.0)  # the saffron dot: cx, cy, r
PIN = (96.0, 108.0, 15.0)  # the saffron pin: cx, tip y, r

# The visible extent, used to centre the mark optically in tiles and to start
# the lockup where the ink starts rather than at the box edge.
BBOX = (ORIGIN[0] - ORIGIN[2], 30 - STROKE / 2, PIN[0] + PIN[2], PIN[1])  # x0, y0, x1, y1


def _pin_path(cx: float, tip_y: float, r: float) -> str:
    """Teardrop with a true hole, filled even-odd."""
    cy = tip_y - r * 2.15
    ang = math.asin(r / (tip_y - cy))
    lx, rx = cx - r * math.cos(ang), cx + r * math.cos(ang)
    ly = cy + r * math.sin(ang)
    h = r * 0.42
    return (
        f"M{cx:.2f},{tip_y:.2f} L{lx:.2f},{ly:.2f} A{r:.2f},{r:.2f} 0 1 1 {rx:.2f},{ly:.2f} Z "
        f"M{cx - h:.2f},{cy:.2f} a{h:.2f},{h:.2f} 0 1 0 {2 * h:.2f},0 a{h:.2f},{h:.2f} 0 1 0 {-2 * h:.2f},0 Z"
    )


def mark(scheme: str) -> str:
    """The mark's elements in 120-box coordinates, coloured for `scheme`."""
    s = SCHEMES[scheme]
    ox, oy, orr = ORIGIN
    return (
        f'<path d="{ROUTE}" fill="none" stroke="{s["road"]}" stroke-width="{STROKE}" '
        'stroke-linejoin="round" stroke-linecap="round"/>'
        f'<circle cx="{ox:g}" cy="{oy:g}" r="{orr:g}" fill="{s["accent"]}"/>'
        f'<path d="{_pin_path(*PIN)}" fill="{s["accent"]}" fill-rule="evenodd"/>'
    )


def _svg(view: tuple[float, float, float, float], body: str, size: tuple[float, float] | None = None) -> str:
    x, y, w, h = view
    dims = f' width="{size[0]:g}" height="{size[1]:g}"' if size else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:g} {y:g} {w:g} {h:g}"{dims}>'
        f"{body}</svg>"
    )


def mark_svg(scheme: str) -> str:
    x0, y0, x1, y1 = BBOX
    return _svg((x0, y0, x1 - x0, y1 - y0), mark(scheme))


# ── The wordmark, locked to the mark ──────────────────────────────────────
WORD_AXES = {"wght": 700, "opsz": 72, "SOFT": 0, "WONK": 0}
TRACKING = -0.015
_font, _ = _instance(FRAUNCES, **WORD_AXES)
_CAP_PER_EM = _font["OS/2"].sCapHeight / _font["head"].unitsPerEm

# Cap line on the top of the road, baseline on the origin dot: the M's
# uprights are exactly cap height, and the pin hangs below the baseline the way
# a descender does. That is what makes the two read as one object.
CAP_TOP = 30 - STROKE / 2
BASELINE = ORIGIN[1]
WORD_SIZE = (BASELINE - CAP_TOP) / _CAP_PER_EM
# The space between the mark and a word set beside it, as "M Fleet" is.
GAP = 0.30 * (BBOX[2] - BBOX[0])

# The mark IS the M of Musafir, so the lockup sets only "usafir" after it and
# reads as one word. The u starts just clear of the pin, which hangs where the
# M's right foot would be: CLEAR is the gap from the pin's edge to the u's ink,
# chosen by eye against 3 and 10 (the pin crowded the u, or the M came loose).
CLEAR = 6.0
WORD = typeset("usafir", size=WORD_SIZE, tracking=TRACKING, **WORD_AXES)
CARS = typeset("Cars", size=WORD_SIZE, tracking=TRACKING, **WORD_AXES)


def _ink_left(char: str) -> float:
    """How far a glyph's ink starts after its origin, in lockup units."""
    glyphs = _font.getGlyphSet()
    pen = BoundsPen(glyphs)
    glyphs[_font.getBestCmap()[ord(char)]].draw(pen)
    return pen.bounds[0] * WORD_SIZE / _font["head"].unitsPerEm


def lockup_svg(scheme: str) -> str:
    s = SCHEMES[scheme]
    x0, y0, x1, y1 = BBOX
    tx = PIN[0] + PIN[2] + CLEAR - _ink_left("u")
    body = (
        mark(scheme)
        + f'<g transform="translate({tx:.2f},{BASELINE:g})">'
        + f'<g fill="{s["word"]}">{WORD.d}</g>'
        + f'<g fill="{s["cars"]}" transform="translate({WORD.width:.2f},0)">{CARS.d}</g></g>'
    )
    width = tx + WORD.width + CARS.width - x0
    return _svg((x0, y0, width, y1 - y0), body)


# ── Icons ─────────────────────────────────────────────────────────────────
def icon_svg(px: int, *, fill: float, round_corners: bool = False, circle: bool = False) -> str:
    """
    The dark mark centred on a midnight tile, its ink `fill` of the tile wide.

    Centred on the visible box rather than the 120 box, which sits the mark
    visibly low and right because of where the pin hangs.
    """
    x0, y0, x1, y1 = BBOX
    k = (fill * px) / (x1 - x0)
    tx = px / 2 - k * (x0 + x1) / 2
    ty = px / 2 - k * (y0 + y1) / 2
    if circle:
        ground = f'<circle cx="{px / 2:g}" cy="{px / 2:g}" r="{px / 2:g}" fill="{MIDNIGHT}"/>'
    else:
        rx = f' rx="{px * 0.2237:.2f}"' if round_corners else ""
        ground = f'<rect width="{px}" height="{px}"{rx} fill="{MIDNIGHT}"/>'
    body = ground + f'<g transform="translate({tx:.3f},{ty:.3f}) scale({k:.5f})">{mark("dark")}</g>'
    return _svg((0, 0, px, px), body, (px, px))


# Tiles: favicons fill more of the square because 16 pixels has no room to
# spare; app icons sit back because the OS adds its own mask and padding;
# maskable and the WhatsApp photo are cropped to a circle by somebody else, so
# the whole mark has to sit inside it.
ICONS = {
    "favicon-16": (16, {"fill": 0.86}),
    "favicon-32": (32, {"fill": 0.84}),
    "apple-touch-icon": (180, {"fill": 0.66}),
    "icon-192": (192, {"fill": 0.66}),
    "icon-512": (512, {"fill": 0.66}),
    "icon-maskable-512": (512, {"fill": 0.56}),
    "whatsapp-640": (640, {"fill": 0.60}),
}


# ── Rendering ─────────────────────────────────────────────────────────────
PROFILE = Path(tempfile.gettempdir()) / "musafir-brand-chrome"


def _window(n: int) -> int:
    """Headless Chrome will not open a tiny window, so pad small sizes up to
    500 by an even amount: the image then sits on whole pixels when centred."""
    return n if n >= 500 else n + 2 * math.ceil((500 - n) / 2)


def render(html: Path, png: Path, w: int, h: int, scale: int = 1, transparent: bool = True) -> None:
    """
    Screenshot `html`, w×h CSS pixels. The page must centre its content: a
    window padded up by `_window` is cropped back to w×h about its centre,
    which is the only crop `sips` does.
    """
    win_w, win_h = _window(w), _window(h)
    args = [
        CHROME,
        "--headless=new",
        "--hide-scrollbars",
        f"--force-device-scale-factor={scale}",
        f"--window-size={win_w},{win_h}",
        f"--user-data-dir={PROFILE}",
        "--virtual-time-budget=4000",
        f"--screenshot={png}",
    ]
    if transparent:
        args.append("--default-background-color=00000000")
    subprocess.run(args + [html.as_uri()], check=True, capture_output=True)
    if (win_w, win_h) != (w, h):
        subprocess.run(
            ["sips", "-c", str(h * scale), str(w * scale), str(png)],
            check=True,
            capture_output=True,
        )


def svg_to_png(svg: str, png: Path, w: int, h: int) -> None:
    page = png.with_suffix(".render.html")
    uri = "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()
    page.write_text(
        '<!doctype html><html><body style="margin:0;background:transparent;'
        f'width:{_window(w)}px;height:{_window(h)}px;display:flex;align-items:center;justify-content:center">'
        f'<img src="{uri}" width="{w}" height="{h}" style="display:block"></body></html>'
    )
    render(page, png, w, h)
    page.unlink()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    files: dict[str, str] = {}
    for scheme in SCHEMES:
        files[f"mark-{scheme}.svg"] = mark_svg(scheme)
        files[f"lockup-{scheme}.svg"] = lockup_svg(scheme)
    for name, (px, opts) in ICONS.items():
        files[f"{name}.svg"] = icon_svg(px, **opts)
    for name, content in files.items():
        (OUT / name).write_text(content)

    for name, (px, _) in ICONS.items():
        svg_to_png(files[f"{name}.svg"], OUT / f"{name}.png", px, px)
    # The lockups as PNG too, for anyone who cannot open an SVG.
    for scheme in ("dark", "light"):
        svg = files[f"lockup-{scheme}.svg"]
        vb = [float(v) for v in svg.split('viewBox="')[1].split('"')[0].split()]
        h = 160
        w = round(h * vb[2] / vb[3])
        svg_to_png(svg, OUT / f"lockup-{scheme}.png", w, h)

    checks = [
        ("White road on midnight", contrast(WHITE, MIDNIGHT), 3.0),
        ("Saffron pin on midnight", contrast(SAFFRON, MIDNIGHT), 3.0),
        ("Pin against road", contrast(SAFFRON, WHITE), 2.0),
        ("Saffron on tinted glass", contrast(SAFFRON, GLASS), 3.0),
        ("White on tinted glass", contrast(WHITE, GLASS), 3.0),
        (f"Saffron ink {SAFFRON_INK} on paper", contrast(SAFFRON_INK, PAPER), 4.5),
        ("Midnight on paper", contrast(MIDNIGHT, PAPER), 4.5),
    ]
    for label, ratio, need in checks:
        print(f"{'ok ' if ratio >= need else 'LOW'} {label}: {ratio:.2f}:1 (needs {need})")
    print(f"wrote {len(files)} svg + {len(ICONS) + 2} png to {OUT}")


if __name__ == "__main__":
    main()

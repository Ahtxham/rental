"""
Print primitives. Every coordinate in this file is a millimetre.

The viewBox is the trim size in mm and nothing is ever expressed in pixels or
points, so "the URL is 46mm tall" is a thing you can check with a ruler against
the printed sheet rather than a number that meant something at some assumed DPI.

Type is outlined on the way in. A print shop that opens a PDF with a font it
does not have substitutes something else and does not tell you, and you find
out when the box arrives.
"""

from __future__ import annotations

import sys
from pathlib import Path

import segno

sys.path.insert(0, str(Path(__file__).parent))
from typeset import FRAUNCES, PUBLIC_SANS, typeset  # noqa: E402

NIGHT = "#0b0b0d"
NIGHT_SOFT = "#17171a"
AMBER = "#ffb020"
PAPER = "#f7f7f8"
WHITE = "#ffffff"
INK = "#131316"
INK_SOFT = "#45464b"
MUTED = "#87888f"
LINE = "#e2e2e6"

BLEED = 3.0  # mm, the industry default and what every shop in Lahore expects


def text(
    s: str,
    *,
    x: float,
    y: float,
    size: float,
    font: str = PUBLIC_SANS,
    anchor: str = "start",
    tracking: float = 0.0,
    fill: str = INK,
    opacity: float | None = None,
    **axes: float,
) -> str:
    """One line of outlined type, baseline at `y`."""
    line = typeset(s, font_path=font, size=size, tracking=tracking, **axes)
    dx = {"start": 0.0, "middle": -line.width / 2, "end": -line.width}[anchor]
    op = f' opacity="{opacity}"' if opacity is not None else ""
    return f'<g transform="translate({x + dx:.3f},{y:.3f})" fill="{fill}"{op}>{line.d}</g>'


def width_of(s: str, *, size: float, font: str = PUBLIC_SANS, tracking: float = 0.0, **axes) -> float:
    return typeset(s, font_path=font, size=size, tracking=tracking, **axes).width


def fit(
    s: str,
    *,
    max_width: float,
    font: str = PUBLIC_SANS,
    tracking: float = 0.0,
    cap: float = 400.0,
    **axes: float,
) -> float:
    """The largest size at which `s` still fits `max_width`. Type is linear in size."""
    unit = width_of(s, size=100.0, font=font, tracking=tracking, **axes) / 100.0
    return min(cap, max_width / unit) if unit else cap


# Display and body settings, pinned once so every piece is set the same way the
# website is and the printed sheet does not read as a different company.
DISPLAY = dict(font=FRAUNCES, wght=600, opsz=48, SOFT=0, WONK=0, tracking=-0.022)
BODY = dict(font=PUBLIC_SANS, wght=400)
BOLD = dict(font=PUBLIC_SANS, wght=700)
EYEBROW = dict(font=PUBLIC_SANS, wght=700, tracking=0.16)


def qr(name: str, *, x: float, y: float, size: float, dark: str = NIGHT) -> str:
    """
    A QR drawn as one path of modules, at an exact physical size.

    Rendered from the matrix rather than scaled from a raster, so the module
    edges land on true coordinates instead of half a pixel off, which is what
    makes a printed code soft at the corners.
    """
    from codes import CODES

    url, ec = CODES[name]
    code = segno.make(url, error=ec, micro=False)
    matrix = list(code.matrix_iter(border=4))
    n = len(matrix)
    m = size / n
    parts = []
    for r, row in enumerate(matrix):
        run = 0
        for c, v in enumerate(list(row) + [0]):
            if v:
                run += 1
                continue
            if run:
                # Merge each horizontal run into one rectangle: fewer, larger
                # shapes means no hairline seams between adjacent modules when
                # a RIP antialiases the edges.
                parts.append(
                    f"M{x + (c - run) * m:.4f},{y + r * m:.4f}h{run * m:.4f}v{m:.4f}h{-run * m:.4f}z"
                )
                run = 0
    return f'<path d="{"".join(parts)}" fill="{dark}" shape-rendering="crispEdges"/>'


def qr_module(name: str) -> float:
    """Modules across, border included. Used to pick a size that lands on whole modules."""
    from codes import CODES

    url, ec = CODES[name]
    return len(list(segno.make(url, error=ec, micro=False).matrix_iter(border=4)))


def mark(*, x: float, y: float, size: float, scheme: str = "paper") -> str:
    """
    The two-tone M, scaled into a `size` x `size` box at (x, y).

    Drawn from the same geometry as the logo files rather than a copy, so the
    sticker and the favicon cannot drift apart.
    """
    up, vee = (NIGHT, AMBER) if scheme == "paper" else (PAPER, AMBER)
    if scheme == "solid-night":
        up = vee = NIGHT
    if scheme == "solid-paper":
        up = vee = PAPER
    s = size / 120.0
    sw = 17 * s

    def stroked(d: str, colour: str, clip: str = "") -> str:
        return (
            f'<path d="{d}" stroke="{colour}" stroke-width="{sw:.4f}" stroke-linejoin="miter" '
            f'stroke-linecap="butt" fill="none"{clip}/>'
        )

    def p(pts: list[tuple[float, float]]) -> str:
        return "M" + " L".join(f"{x + a * s:.4f},{y + b * s:.4f}" for a, b in pts)

    cid = f"c{abs(hash((x, y, size))) % 100000}"
    clip = (
        f'<clipPath id="{cid}"><rect x="{x:.3f}" y="{y + 32 * s:.4f}" '
        f'width="{size:.3f}" height="{size - 32 * s:.4f}"/></clipPath>'
    )
    return (
        clip
        + stroked(p([(24, 98), (24, 32)]), up)
        + stroked(p([(96, 98), (96, 32)]), up)
        + f'<g clip-path="url(#{cid})">{stroked(p([(16, 20), (60, 74), (104, 20)]), vee)}</g>'
    )


def page(
    w: float,
    h: float,
    body: str,
    *,
    bleed: float = 0.0,
    background: str = WHITE,
    marks: bool = False,
) -> str:
    """
    A sheet at trim size `w` x `h`, optionally grown by `bleed` on every side.

    With bleed the origin stays at the top-left of the *trim* box, so every
    layout number below is a distance from the cut edge and stays right whether
    or not the file is built for a printer.
    """
    vb = f"{-bleed} {-bleed} {w + 2 * bleed} {h + 2 * bleed}"
    crop = ""
    if marks and bleed:
        # Crop marks live in the bleed, offset from the trim corners so the
        # blade has something to line up on that is not printed artwork.
        g, ln = 1.2, bleed - 1.4
        segs = []
        for cx, sx in ((0, -1), (w, 1)):
            for cy, sy in ((0, -1), (h, 1)):
                segs.append(f"M{cx + sx * g},{cy}h{sx * ln}")
                segs.append(f"M{cx},{cy + sy * g}v{sy * ln}")
        crop = f'<path d="{"".join(segs)}" stroke="{NIGHT}" stroke-width="0.15" fill="none"/>'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
        f'width="{w + 2 * bleed}mm" height="{h + 2 * bleed}mm">'
        f'<rect x="{-bleed}" y="{-bleed}" width="{w + 2 * bleed}" height="{h + 2 * bleed}" '
        f'fill="{background}"/>{body}{crop}</svg>'
    )


def para(
    s: str,
    *,
    x: float,
    y: float,
    size: float,
    max_width: float,
    leading: float = 1.5,
    fill: str = INK_SOFT,
    anchor: str = "start",
    **style,
) -> tuple[str, float]:
    """
    Wrapped body copy. Returns the markup and the baseline of the line after it.

    Leading is a multiple of size and loosens as size drops, because the ratio
    that reads well on a headline is too tight for a paragraph.
    """
    style = {**BODY, **style}
    words, lines, cur = s.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if cur and width_of(trial, size=size, **style) > max_width:
            lines.append(cur)
            cur = w
        else:
            cur = trial
    if cur:
        lines.append(cur)
    out = [
        text(ln, x=x, y=y + i * size * leading, size=size, fill=fill, anchor=anchor, **style)
        for i, ln in enumerate(lines)
    ]
    return "".join(out), y + len(lines) * size * leading


def rule(*, x: float, y: float, w: float, colour: str, thickness: float = 0.4) -> str:
    return f'<rect x="{x:.3f}" y="{y:.3f}" width="{w:.3f}" height="{thickness:.3f}" fill="{colour}"/>'


def pt(points: float) -> float:
    """
    Points to millimetres.

    Type is specified in points by every print shop alive, and the sheets in
    this set are laid out in mm. Doing the conversion in one named place beats
    doing it in your head per line, which is how a 30pt headline becomes a 30mm
    one and runs off the edge of the card.
    """
    return points * 25.4 / 72.0

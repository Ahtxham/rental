"""
Set a line of type as SVG path data, with the letterforms outlined.

A vinyl cutter does not have Fraunces installed, and a print shop that opens a
PDF with a missing font substitutes Arial and tells nobody. Outlining removes
the question: every piece of artwork here carries the shapes themselves, not a
reference to a font file that has to travel with it.

Shaping goes through HarfBuzz so kerning pairs and the variable axes are the
same ones the website renders, rather than a naive sum of advance widths.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

MEDIA = "/Users/ahtxham/Documents/invo/rental/rentals-web/.next/static/media"
FRAUNCES = f"{MEDIA}/54fc36028e2bb174-s.p.20jfceqj9zyw9.woff2"
PUBLIC_SANS = f"{MEDIA}/fa0520225c6f3d07-s.p.33u8lzvd44aqk.woff2"


@dataclass
class Line:
    """One set line: the outlines, and the box they occupy."""

    d: str
    width: float
    ascent: float
    descent: float

    @property
    def height(self) -> float:
        return self.ascent + self.descent


_cache: dict[tuple, tuple[TTFont, bytes]] = {}


def _instance(path: str, **axes: float) -> tuple[TTFont, bytes]:
    """Pin a variable font to one point in its design space, once per set of axes."""
    key = (path, tuple(sorted(axes.items())))
    if key not in _cache:
        font = TTFont(path)
        if axes:
            font = instancer.instantiateVariableFont(font, axes, inplace=False)
        buf = io.BytesIO()
        font.flavor = None
        font.save(buf)
        _cache[key] = (font, buf.getvalue())
    return _cache[key]


def typeset(
    text: str,
    *,
    font_path: str = FRAUNCES,
    size: float = 100.0,
    tracking: float = 0.0,
    **axes: float,
) -> Line:
    """
    Outline `text` at `size` user units, returning path data with the baseline at y=0.

    `tracking` is in em, matching CSS letter-spacing: negative tightens, which is
    what large display text wants and small text does not.
    """
    font, raw = _instance(font_path, **axes)
    upem = font["head"].unitsPerEm
    scale = size / upem

    face = hb.Face(raw)
    hb_font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf)

    glyphs = font.getGlyphSet()
    order = font.getGlyphOrder()
    parts: list[str] = []
    x = 0.0

    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}")
        glyphs[name].draw(pen)
        d = pen.getCommands()
        if d:
            # Font units are y-up, SVG is y-down. Flip here so the caller never
            # has to think about it, and bake the pen position into the same
            # transform rather than wrapping every glyph in its own <g>.
            tx = (x + pos.x_offset) * scale
            ty = pos.y_offset * scale
            parts.append(
                f'<path transform="translate({tx:.3f},{-ty:.3f}) scale({scale:.6f},{-scale:.6f})" d="{d}"/>'
            )
        x += pos.x_advance + tracking * upem

    # The last glyph's tracking is a gap after the line, not part of it.
    width = (x - tracking * upem) * scale if text else 0.0
    os2 = font["OS/2"]
    return Line(
        d="".join(parts),
        width=width,
        ascent=os2.sTypoAscender * scale,
        descent=abs(os2.sTypoDescender) * scale,
    )


def merged(line: Line) -> str:
    """The glyph elements, ready to drop inside a <g fill="..."> in an SVG."""
    return line.d

"""
Three candidate marks for Musafir, drawn as flat vector.

Constraints every one of them is built against, because the mark has to live on
a rear windscreen before it lives anywhere else:

  Two flat colours, no gradients. A vinyl cutter cuts sheets of colour; there is
  no such thing as a 40% tint in cut vinyl.

  No stroke thinner than about 6% of the mark's width. Thin vinyl tears on the
  weeding table and lifts at the edges in the sun.

  Legible as one solid silhouette. The glass version has to work in white only,
  because most rear windows in Lahore are tinted and near-black vinyl on dark
  glass is an invisible sticker.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from typeset import FRAUNCES, typeset  # noqa: E402

OUT = Path("/Users/ahtxham/Documents/invo/rental/brand/logo")
NIGHT = "#0b0b0d"
AMBER = "#ffb020"
PAPER = "#f7f7f8"

# The mark's own square. Everything is drawn inside this and nothing touches the
# edge, so the mark keeps its own breathing room wherever it is placed.
BOX = 120


def _svg(body: str, size: int = BOX) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'width="{size}" height="{size}" fill="none">{body}</svg>'
    )


def _glyph_m(height: float, cx: float, cy: float, weight: float = 900, opsz: float = 9) -> str:
    """
    The brand's own M, outlined, centred on (cx, cy).

    Fraunces rather than a drawn M so the mark and the wordmark are the same
    letter. Low optical size on purpose: Fraunces at display opsz has enough
    thick/thin contrast to lose its hairlines at sticker scale.
    """
    line = typeset("M", size=height, wght=weight, opsz=opsz, SOFT=0, WONK=0)
    # Cap height, not typo ascent: an M sits on the baseline and reaches the cap
    # line, and centring on the font's full ascent leaves it visibly low.
    cap = height * 0.70
    x = cx - line.width / 2
    y = cy + cap / 2
    return f'<g transform="translate({x:.3f},{y:.3f})">{line.d}</g>'


def milestone() -> dict[str, str]:
    """
    A. The kilometre stone.

    The dome-topped roadside marker every road out of Lahore is measured in.
    It means distance covered, which is what the business sells and what the
    name means.

    Squat on purpose. The first attempt used a full semicircle on a tall body
    and read as a headstone, which is a thing you cannot un-see once somebody
    has said it. A shallow elliptical dome on a body wider than it is tall
    reads as a marker, or at worst a shield, and neither of those is a grave.
    """
    left, right, base = 20.0, 100.0, 100.0
    hw = (right - left) / 2
    dome_h, shoulder = 26.0, 56.0
    stone = (
        f"M{left},{base} L{left},{shoulder} "
        f"A{hw},{dome_h} 0 0 1 {right},{shoulder} L{right},{base} Z"
    )
    m = _glyph_m(40, cx=60, cy=66)
    return {
        "milestone": _svg(f'<path d="{stone}" fill="{AMBER}"/><g fill="{NIGHT}">{m}</g>'),
        "milestone-glass": _svg(
            f'<mask id="k"><rect width="{BOX}" height="{BOX}" fill="black"/>'
            f'<path d="{stone}" fill="white"/><g fill="black">{m}</g></mask>'
            f'<rect width="{BOX}" height="{BOX}" fill="{PAPER}" mask="url(#k)"/>'
        ),
        "milestone-solid": _svg(f'<path d="{stone}" fill="{NIGHT}"/>'),
    }


# The four straight lines every chevron variant is cut from. The apex stops
# well above the baseline: a V taken all the way down closes up the counters
# and the mark greys out at favicon size.
_M_PATH = "M24,98 L24,32 L60,74 L96,32 L96,98"
_M_STROKE = 17
_M_LEFT, _M_RIGHT = "M24,98 L24,32", "M96,98 L96,32"
_M_VEE = "M24,32 L60,74 L96,32"


def _stroked(d: str, colour: str, width: float = _M_STROKE, extra: str = "") -> str:
    return (
        f'<path d="{d}" stroke="{colour}" stroke-width="{width}" '
        f'stroke-linejoin="miter" stroke-linecap="butt" fill="none"{extra}/>'
    )


def chevron() -> dict[str, str]:
    """
    B. The road chevron, upright.

    The merge arrow painted on a carriageway. The sturdiest of the set and the
    only one that holds together at 16px, because it is four straight lines
    and nothing else. Also the least distinctive, for exactly the same reason.
    """
    return {
        "chevron": _svg(_stroked(_M_PATH, AMBER)),
        "chevron-glass": _svg(_stroked(_M_PATH, PAPER)),
        "chevron-solid": _svg(_stroked(_M_PATH, NIGHT)),
    }


def raked() -> dict[str, str]:
    """
    B2. The same chevron, leaning.

    Nine degrees of forward rake, which is enough to read as motion at a
    glance and not enough to read as a mistake. The lean is what makes it
    theirs rather than any M: an upright sans M belongs to everyone.
    """
    # Skew about the baseline, so the mark leans forward from where it stands
    # rather than sliding sideways as a whole.
    lean = ' transform="translate(0,98) skewX(-9) translate(0,-98)"'
    return {
        "raked": _svg(_stroked(_M_PATH, AMBER, extra=lean)),
        "raked-glass": _svg(_stroked(_M_PATH, PAPER, extra=lean)),
        "raked-solid": _svg(_stroked(_M_PATH, NIGHT, extra=lean)),
    }


def twotone() -> dict[str, str]:
    """
    D. The chevron with the road picked out.

    Same four lines, but the centre V is cut in the second colour: the two
    uprights are the kerbs and the V between them is the road. The only mark
    here that gives the second vinyl colour something to do besides
    decoration, and on glass the amber V is the part that catches a headlight.
    """
    # The V is drawn past the top of the mark and clipped flat, so its mitred
    # ends cannot notch into the uprights. Butt caps on a diagonal cut at the
    # stroke's own angle, which left a visible step where the two colours met.
    clip = (
        f'<clipPath id="t"><rect x="0" y="32" width="{BOX}" height="{BOX - 32}"/></clipPath>'
    )
    vee = "M16,20 L60,74 L104,20"
    return {
        "twotone": _svg(
            clip
            + _stroked(_M_LEFT, NIGHT)
            + _stroked(_M_RIGHT, NIGHT)
            + f'<g clip-path="url(#t)">{_stroked(vee, AMBER)}</g>'
        ),
        "twotone-glass": _svg(
            clip
            + _stroked(_M_LEFT, PAPER)
            + _stroked(_M_RIGHT, PAPER)
            + f'<g clip-path="url(#t)">{_stroked(vee, AMBER)}</g>'
        ),
        "twotone-solid": _svg(_stroked(_M_PATH, NIGHT)),
    }


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    written = []
    for group in (milestone(), chevron(), raked(), twotone()):
        for name, svg in group.items():
            (OUT / f"{name}.svg").write_text(svg)
            written.append(name)
    print("wrote", len(written), "marks:", ", ".join(written))

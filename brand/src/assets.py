"""
The final logo files, and the app icons that go with them.

The icons currently shipping on the site are the old dark-green and gold pair
from before the palette changed, which is why they are regenerated here rather
than cropped from anything existing.

Nothing in here is copied by hand from the marks: every file is drawn from the
same geometry in `layout.mark`, so the sticker on a car, the favicon in a tab
and the icon on a home screen cannot drift apart.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from layout import AMBER, DISPLAY, INK, NIGHT, PAPER, mark, text, width_of  # noqa: E402

OUT = Path("/Users/ahtxham/Documents/invo/rental/brand/logo")


def svg(w: float, h: float, body: str, bg: str = "none") -> str:
    ground = "" if bg == "none" else f'<rect width="{w:g}" height="{h:g}" fill="{bg}"/>'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" '
        f'width="{w:g}" height="{h:g}">{ground}{body}</svg>'
    )


def lockup(scheme: str) -> str:
    """
    Mark and wordmark, locked together.

    The gap between them is a quarter of the mark's width and the wordmark's
    cap line is matched to the mark's top edge. Both of those are why it can be
    scaled to anything and still look like one object rather than two things
    placed near each other.
    """
    size, gap = 120.0, 30.0
    ink = PAPER if scheme == "glass" else INK
    word = 98.0
    w = width_of("Musafir", size=word, **DISPLAY)
    body = mark(x=0, y=0, size=size, scheme=scheme) + text(
        "Musafir", x=size + gap, y=98, size=word, fill=ink, **DISPLAY
    )
    return svg(size + gap + w, size, body)


def icon(size: float, *, maskable: bool = False, rounded: bool = False) -> str:
    """
    App icon on the night ground.

    Maskable icons get the mark at 60% of the canvas: Android crops to a circle
    of unknown radius, and anything that fills the square gets its corners
    eaten. The plain icon can be more generous because nothing crops it.
    """
    inner = size * (0.58 if maskable else 0.70)
    off = (size - inner) / 2
    radius = f' rx="{size * 0.22:g}"' if rounded else ""
    ground = f'<rect width="{size:g}" height="{size:g}"{radius} fill="{NIGHT}"/>'
    return svg(size, size, ground + mark(x=off, y=off, size=inner, scheme="glass"))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)

    # Park the rejected concepts rather than deleting them: the next time
    # somebody asks "what else did you look at", the answer should be a folder.
    concepts = OUT / "concepts"
    concepts.mkdir(exist_ok=True)
    for stem in ("milestone", "chevron", "raked", "stamp"):
        for variant in ("", "-glass", "-solid"):
            f = OUT / f"{stem}{variant}.svg"
            if f.exists():
                shutil.move(str(f), concepts / f.name)

    files = {
        # The mark on its own.
        "musafir-mark.svg": svg(120, 120, mark(x=0, y=0, size=120, scheme="paper")),
        "musafir-mark-glass.svg": svg(120, 120, mark(x=0, y=0, size=120, scheme="glass")),
        "musafir-mark-one-colour.svg": svg(120, 120, mark(x=0, y=0, size=120, scheme="solid-night")),
        # Mark plus wordmark, which is what goes on almost everything.
        "musafir-lockup.svg": lockup("paper"),
        "musafir-lockup-glass.svg": lockup("glass"),
        # App and browser icons.
        "icon-512.svg": icon(512),
        "icon-192.svg": icon(192),
        "favicon-32.svg": icon(32),
        "apple-touch-icon.svg": icon(180, rounded=True),
        "icon-maskable-512.svg": icon(512, maskable=True),
    }
    for name, content in files.items():
        (OUT / name).write_text(content)
    for f in OUT.glob("twotone*.svg"):
        f.unlink()
    print("wrote", len(files), "files, parked", len(list(concepts.glob('*.svg'))), "concepts")

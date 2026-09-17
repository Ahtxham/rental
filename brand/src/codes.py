"""
The QR codes, one per printed piece.

Each piece gets its own `?s=` so a scan can be attributed in the access log
without any analytics: a spike in `s=glass` means the car stickers are working
and a flat `s=flyer` means the workshop drop was a waste of an afternoon. The
parameter is inert, every one of these URLs was checked against production
before it was drawn.

Two rules that are not negotiable on a printed code:

  Black on white, never amber. A scanner is reading luminance, and amber on
  white is about 1.9:1. It photographs as a pale grey square and fails in bad
  light, which is most of the light a car sticker ever sees.

  The quiet zone stays. Four modules of empty margin on every side is part of
  the code, not padding around it, and a designer tucking artwork into it is
  the single most common way a printed QR stops working.
"""

from __future__ import annotations

from pathlib import Path

import segno

OUT = Path("/Users/ahtxham/Documents/invo/rental/brand/qr")

# Error correction is chosen per surface, not per taste. H survives roughly 30%
# of the code being obscured, which on a rear windscreen is dust, a wiper
# smear and a dealer frame. Paper in somebody's hand does not need that, and
# buying it costs modules, which costs physical size.
CODES = {
    "glass": ("https://musafircars.com/?s=glass", "h"),
    "seat": ("https://musafircars.com/cars?s=seat", "q"),
    "flyer": ("https://musafircars.com/rent-your-car?s=flyer", "q"),
    "card": ("https://musafircars.com/?s=card", "q"),
}


def build() -> dict[str, str]:
    OUT.mkdir(parents=True, exist_ok=True)
    made = {}
    for name, (url, ec) in CODES.items():
        qr = segno.make(url, error=ec, micro=False)
        qr.save(OUT / f"qr-{name}.svg", scale=10, border=4, dark="#000000", light=None)
        # A PNG at cutting-tool resolution as well, for the shops that will not
        # take an SVG. Big enough that nobody is tempted to upscale it.
        qr.save(OUT / f"qr-{name}.png", scale=24, border=4, dark="#000000", light="#ffffff")
        made[name] = f"{qr.version} · {qr.symbol_size(scale=1, border=4)[0]} modules · EC {ec.upper()}"
    return made


if __name__ == "__main__":
    for name, spec in build().items():
        print(f"{name:8} {spec:34} {CODES[name][0]}")

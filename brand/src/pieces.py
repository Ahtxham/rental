"""
The four printed pieces.

Sizes are the real ones. The decal is drawn on a transparent ground because a
vinyl cutter cuts shapes, not backgrounds, and any rectangle behind the artwork
becomes a rectangle of vinyl somebody has to pay for and look at.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from layout import (  # noqa: E402
    AMBER, BODY, BOLD, DISPLAY, EYEBROW, INK, INK_SOFT, LINE, MUTED, NIGHT,
    NIGHT_SOFT, PAPER, WHITE, fit, mark, page, para, pt, qr, qr_module, rule,
    text, width_of,
)

OUT = Path("/Users/ahtxham/Documents/invo/rental/brand/print")

# ── The one thing still missing ────────────────────────────────────────────
# Deliberately un-printable. A real number goes here and every piece picks it
# up; an X on a proof is a question, a plausible wrong number is a reprint.
PHONE = "03XX XXXXXXX"
URL = "musafircars.com"

# In this market the number is a WhatsApp number first and a phone second.
# Saying so doubles the ways somebody can act on the card at the cost of two
# words, and it is the difference between a missed call and a message that
# waits for you.
REACH = "Call or WhatsApp"


def decal(ground: str = "none") -> str:
    """
    Rear windscreen band, 600 x 170mm, cut vinyl in white and amber.

    The URL is the whole point of this piece and everything else is sized
    around what is left. At 600mm wide `musafircars.com` lands near 40mm of
    cap height, which is a comfortable read from about two car lengths and a
    squint from four. Making the name bigger than the address would be
    backwards: nobody types a name into a browser.
    """
    W, H, m = 600.0, 170.0, 20.0
    body = []

    body.append(mark(x=m, y=14, size=64, scheme="glass"))

    wm_x = m + 64 + 16
    body.append(text("Musafir", x=wm_x, y=62, size=52, fill=PAPER, **DISPLAY))

    body.append(
        text(
            "RENT A CAR  ·  LAHORE",
            x=W - m,
            y=58,
            size=15,
            anchor="end",
            fill=AMBER,
            **EYEBROW,
        )
    )

    body.append(rule(x=m, y=82, w=W - 2 * m, colour=AMBER, thickness=2.2))

    # The address, as large as the sheet allows once the phone has its corner.
    phone_size = 30.0
    phone_w = width_of(PHONE, size=phone_size, **BOLD)
    url_size = fit(URL, max_width=W - 2 * m - phone_w - 26, cap=120, **BOLD)
    body.append(text(URL, x=m, y=H - 22, size=url_size, fill=PAPER, **BOLD))
    body.append(
        text(PHONE, x=W - m, y=H - 24, size=phone_size, anchor="end", fill=AMBER, **BOLD)
    )

    return page(W, H, "".join(body), background=ground)


def decal_patch() -> str:
    """
    The QR that goes beside the decal, 70 x 70mm, printed on white vinyl.

    Separate from the decal on purpose. A 41-module code cut from vinyl is
    roughly eight hundred individual squares to weed off the backing paper by
    hand, which no shop will do well and none will do twice. Printed on a small
    white patch it costs almost nothing and it actually scans, because the code
    keeps a true white ground instead of borrowing whatever tint the glass has.
    """
    S = 70.0
    q = 46.0
    body = [
        f'<rect x="0" y="0" width="{S}" height="{S}" rx="5" fill="{WHITE}"/>',
        qr("glass", x=(S - q) / 2, y=8, size=q, dark=NIGHT),
        text("SCAN TO BOOK", x=S / 2, y=63, size=5.2, anchor="middle", fill=INK, **EYEBROW),
    ]
    return page(S, S, "".join(body), background="none")


def _reach(x: float, y: float, *, label_fill: str, number_fill: str, size: float) -> str:
    """`Call or WhatsApp  03XX XXXXXXX`, set on one baseline."""
    lab = text(REACH, x=x, y=y, size=size * 0.78, fill=label_fill, **BODY)
    w = width_of(REACH, size=size * 0.78, **BODY)
    return lab + text(PHONE, x=x + w + size * 0.5, y=y, size=size, fill=number_fill, **BOLD)


def seatback() -> str:
    """
    A5 seat-back card, 148 x 210mm, on the dark ground.

    Dark because it lives in a car interior, where a white card in a footwell
    reads as litter. The QR gets a true white tile: a code reversed out of a
    dark background fails on a fair number of older scanners, and this is the
    one piece whose whole job is being scanned.
    """
    W, H, m = 148.0, 210.0, 14.0
    dim = "#8e8f97"
    body = []

    body.append(mark(x=m, y=m, size=9, scheme="glass"))
    body.append(text("Musafir", x=m + 12.5, y=m + 7.6, size=pt(17), fill=PAPER, **DISPLAY))
    body.append(rule(x=m, y=m + 15, w=W - 2 * m, colour="#2b2c31", thickness=0.3))

    body.append(text("LAHORE  ·  BY THE DAY", x=m, y=66, size=pt(7.5), fill=AMBER, **EYEBROW))

    head = pt(30)
    body.append(text("A car and a driver,", x=m, y=86, size=head, fill=PAPER, **DISPLAY))
    body.append(text("for the day.", x=m, y=86 + head * 1.12, size=head, fill=PAPER, **DISPLAY))

    p, _ = para(
        "Pick the car, pick the dates, and we confirm it with you on the phone. "
        "Nothing is held until we do. The car goes out full and comes back full.",
        x=m, y=118, size=pt(9.5), max_width=W - 2 * m - 6, leading=1.62, fill="#a9aab1",
    )
    body.append(p)

    tile, ty = 38.0, 144.0
    body.append(f'<rect x="{m}" y="{ty}" width="{tile}" height="{tile}" rx="2.5" fill="{WHITE}"/>')
    body.append(qr("seat", x=m + 4, y=ty + 4, size=tile - 8, dark=NIGHT))

    tx = m + tile + 10
    body.append(text("Scan for the cars", x=tx, y=ty + 11, size=pt(10.5), fill=PAPER, **BOLD))
    body.append(text(URL, x=tx, y=ty + 22, size=pt(12.5), fill=AMBER, **BOLD))
    body.append(text("or just type it in", x=tx, y=ty + 30, size=pt(7.5), fill=dim, **BODY))

    body.append(rule(x=m, y=ty + tile + 9, w=W - 2 * m, colour="#2b2c31", thickness=0.3))
    body.append(_reach(m, H - 12, label_fill=dim, number_fill=PAPER, size=pt(11)))

    return page(W, H, "".join(body), bleed=3.0, background=NIGHT, marks=True)


def lender() -> str:
    """
    A5 flyer for car owners, 148 x 210mm, on paper.

    Light where the seat-back card is dark. The two get handed out in the same
    places and an owner should see at a glance that this is the other
    conversation, before reading a word of it.

    The headline is the only argument that matters to somebody who already owns
    the car: it is sitting still. Everything under it answers the fear that
    follows, which is that handing it over means losing control of it.
    """
    W, H, m = 148.0, 210.0, 14.0
    body = []

    body.append(mark(x=m, y=m, size=9, scheme="paper"))
    body.append(text("Musafir", x=m + 12.5, y=m + 7.6, size=pt(17), fill=INK, **DISPLAY))
    body.append(
        text("FOR CAR OWNERS", x=W - m, y=m + 6.6, size=pt(7.5), anchor="end",
             fill="#8a5a08", **EYEBROW)
    )
    body.append(rule(x=m, y=m + 15, w=W - 2 * m, colour=LINE, thickness=0.3))

    head = pt(31)
    body.append(text("Your car is parked", x=m, y=72, size=head, fill=INK, **DISPLAY))
    body.append(text("23 hours a day.", x=m, y=72 + head * 1.1, size=head, fill=INK, **DISPLAY))
    body.append(rule(x=m, y=97, w=26, colour=AMBER, thickness=1.8))

    p, _ = para(
        "Put it on Musafir for the days you do not need it. We find the customer, "
        "take the booking, and pay you for the days it goes out.",
        x=m, y=111, size=pt(10), max_width=W - 2 * m - 4, leading=1.6, fill=INK_SOFT,
    )
    body.append(p)

    y = 134.0
    for point in (
        "You choose which days it is available.",
        "We agree the daily rate with you before it is listed.",
        "You can turn any offer down. It stays your car.",
    ):
        body.append(f'<circle cx="{m + 1.3}" cy="{y - 1.1}" r="1.3" fill="{AMBER}"/>')
        body.append(text(point, x=m + 6, y=y, size=pt(9.5), fill=INK, **BODY))
        y += 9.5

    q, qy = 28.0, 158.0
    body.append(qr("flyer", x=m, y=qy, size=q, dark=NIGHT))
    tx = m + q + 8
    body.append(text("Scan to list your car", x=tx, y=qy + 11, size=pt(10.5), fill=INK, **BOLD))
    body.append(text(URL, x=tx, y=qy + 21, size=pt(11), fill="#8a5a08", **BOLD))
    body.append(text("or just type it in", x=tx, y=qy + 28.5, size=pt(7.5), fill=MUTED, **BODY))

    body.append(rule(x=m, y=H - 19, w=W - 2 * m, colour=LINE, thickness=0.3))
    body.append(_reach(m, H - 11, label_fill=MUTED, number_fill=INK, size=pt(11)))

    return page(W, H, "".join(body), bleed=3.0, background=PAPER, marks=True)


def card_front() -> str:
    """A6 hand-out, 105 x 148mm. Front is the rental."""
    W, H, m = 105.0, 148.0, 11.0
    head, dim = pt(21), "#8e8f97"
    body = [
        mark(x=m, y=m, size=7.5, scheme="glass"),
        text("Musafir", x=m + 10.5, y=m + 6.4, size=pt(14), fill=PAPER, **DISPLAY),
        text("RENT A CAR  ·  LAHORE", x=m, y=46, size=pt(6.8), fill=AMBER, **EYEBROW),
        text("A car and a driver,", x=m, y=60, size=head, fill=PAPER, **DISPLAY),
        text("by the day.", x=m, y=60 + head * 1.12, size=head, fill=PAPER, **DISPLAY),
    ]
    tile, ty = 32.0, 88.0
    body.append(f'<rect x="{m}" y="{ty}" width="{tile}" height="{tile}" rx="2" fill="{WHITE}"/>')
    body.append(qr("card", x=m + 3, y=ty + 3, size=tile - 6, dark=NIGHT))
    tx = m + tile + 7
    body.append(text("Scan or type", x=tx, y=ty + 11, size=pt(8.5), fill=dim, **BODY))
    body.append(text(URL, x=tx, y=ty + 21, size=pt(10.5), fill=AMBER, **BOLD))
    body.append(rule(x=m, y=H - 20, w=W - 2 * m, colour="#2b2c31", thickness=0.3))
    body.append(_reach(m, H - 12, label_fill=dim, number_fill=PAPER, size=pt(10)))
    return page(W, H, "".join(body), bleed=3.0, background=NIGHT, marks=True)


def card_back() -> str:
    """A6 hand-out, reverse. The same card sells the other side of the business."""
    W, H, m = 105.0, 148.0, 11.0
    head = pt(21)
    body = [
        text("OWN A CAR?", x=m, y=m + 6, size=pt(6.8), fill="#8a5a08", **EYEBROW),
        text("It is parked", x=m, y=44, size=head, fill=INK, **DISPLAY),
        text("23 hours a day.", x=m, y=44 + head * 1.12, size=head, fill=INK, **DISPLAY),
        rule(x=m, y=62, w=22, colour=AMBER, thickness=1.6),
    ]
    p, _ = para(
        "Rent it out on the days you do not need it. You pick the days, we agree "
        "the rate with you first, and you can say no.",
        x=m, y=75, size=pt(9), max_width=W - 2 * m - 3, leading=1.6, fill=INK_SOFT,
    )
    body.append(p)
    q, qy = 28.0, 96.0
    body.append(qr("flyer", x=m, y=qy, size=q, dark=NIGHT))
    tx = m + q + 7
    body.append(text("Scan to list your car", x=tx, y=qy + 12, size=pt(9), fill=INK, **BOLD))
    body.append(text(URL, x=tx, y=qy + 21, size=pt(9), fill="#8a5a08", **BOLD))
    body.append(rule(x=m, y=H - 20, w=W - 2 * m, colour=LINE, thickness=0.3))
    body.append(_reach(m, H - 12, label_fill=MUTED, number_fill=INK, size=pt(10)))
    return page(W, H, "".join(body), bleed=3.0, background=PAPER, marks=True)


PIECES = {
    # The cut file carries no background: a vinyl cutter cuts shapes, and any
    # rectangle behind the artwork becomes a rectangle of vinyl. The proof
    # puts the same artwork on glass so a human can see what they are buying.
    "decal-600x170-cut": decal,
    "decal-600x170-proof": lambda: decal(ground="#14161a"),
    "decal-qr-patch-70x70": decal_patch,
    "seatback-a5": seatback,
    "lender-a5": lender,
    "card-a6-front": card_front,
    "card-a6-back": card_back,
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, build in PIECES.items():
        (OUT / f"{name}.svg").write_text(build())
        print("wrote", name)

"""
How the saffron and midnight Route M looks where it will actually live.

Builds `logo/route-m/preview.html` from the files `route_m.py` wrote and
screenshots it to `PREVIEW.png`. Everything shown is the real artwork: the
phone shows the real icon, the tab shows the real 16px favicon at 16 pixels,
the car carries the real vinyl lockup.

    python src/route_m.py && python src/route_m_preview.py
"""

from __future__ import annotations

import base64
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from route_m import (  # noqa: E402
    GLASS,
    MIDNIGHT,
    OUT,
    PAPER,
    SAFFRON,
    SAFFRON_INK,
    WHITE,
    contrast,
    render,
)
from typeset import FRAUNCES, PUBLIC_SANS  # noqa: E402

WIDTH, HEIGHT = 1280, 2460


def uri(name: str) -> str:
    """A generated SVG as a data URI, so the page needs nothing beside it."""
    data = (OUT / name).read_bytes()
    return "data:image/svg+xml;base64," + base64.b64encode(data).decode()


def tile(colour: str, glyph: str, label: str) -> str:
    """A neutral stand-in app on the home screen: flat colour, simple shape."""
    shapes = {
        "dot": '<circle cx="30" cy="30" r="11" fill="#fff" opacity=".9"/>',
        "bar": '<rect x="17" y="26" width="26" height="8" rx="4" fill="#fff" opacity=".9"/>',
        "ring": '<circle cx="30" cy="30" r="12" fill="none" stroke="#fff" stroke-width="5" opacity=".9"/>',
        "square": '<rect x="19" y="19" width="22" height="22" rx="6" fill="#fff" opacity=".9"/>',
    }
    return (
        f'<div class="app"><svg viewBox="0 0 60 60" class="ico"><rect width="60" height="60" fill="{colour}"/>'
        f'{shapes[glyph]}</svg><span>{label}</span></div>'
    )


def car() -> str:
    """A hatchback from behind, tinted rear glass, the vinyl lockup on it."""
    return f"""
<svg viewBox="0 0 560 400" class="car" role="img" aria-label="The vinyl lockup on a car's tinted rear window">
  <ellipse cx="280" cy="374" rx="236" ry="13" fill="#000" opacity=".14"/>
  <rect x="68" y="326" width="84" height="40" rx="10" fill="#1d1f22"/>
  <rect x="408" y="326" width="84" height="40" rx="10" fill="#1d1f22"/>
  <path d="M112,206 L152,70 Q158,50 180,50 L380,50 Q402,50 408,70 L448,206 Z" fill="#eef1f4" stroke="#c9d0d7" stroke-width="2"/>
  <rect x="40" y="196" width="480" height="128" rx="44" fill="#eef1f4" stroke="#c9d0d7" stroke-width="2"/>
  <path d="M134,196 L170,82 Q174,70 188,70 L372,70 Q386,70 390,82 L426,196 Z" fill="{GLASS}"/>
  <path d="M188,70 L246,70 L176,196 L134,196 Z" fill="#fff" opacity=".045"/>
  <image href="{uri('lockup-dark.svg')}" x="190" y="116" width="180" height="21.9"/>
  <text x="280" y="164" text-anchor="middle" class="url">musafircars.com</text>
  <rect x="54" y="214" width="76" height="40" rx="12" fill="#b8322a"/>
  <rect x="430" y="214" width="76" height="40" rx="12" fill="#b8322a"/>
  <path d="M60,206 H500" stroke="#c9d0d7" stroke-width="2"/>
  <rect x="226" y="262" width="108" height="34" rx="4" fill="#fff" stroke="#2b2f36" stroke-width="2"/>
  <text x="280" y="285" text-anchor="middle" class="plate">LEB 2417</text>
  <rect x="30" y="300" width="500" height="38" rx="18" fill="#e3e7eb" stroke="#c9d0d7" stroke-width="2"/>
</svg>"""


def main() -> None:
    checks = [
        ("White road on midnight", contrast(WHITE, MIDNIGHT)),
        ("Saffron on midnight", contrast(SAFFRON, MIDNIGHT)),
        ("Saffron on tinted glass", contrast(SAFFRON, GLASS)),
        ("Pin against road", contrast(SAFFRON, WHITE)),
        ("Saffron ink on paper", contrast(SAFFRON_INK, PAPER)),
        ("Midnight on paper", contrast(MIDNIGHT, PAPER)),
    ]
    check_rows = "".join(f"<li><span>{label}</span><b>{r:.1f}:1</b></li>" for label, r in checks)

    apps = "".join(
        [
            f'<div class="app"><img class="ico" src="{uri("apple-touch-icon.svg")}" alt=""><span>Musafir</span></div>',
            tile("#5a6b7d", "ring", "Camera"),
            tile("#3f8f6b", "dot", "Maps"),
            tile("#d0743c", "square", "Photos"),
            tile("#4a5bd1", "bar", "Mail"),
            tile("#8a8f98", "ring", "Clock"),
            tile("#c9a227", "bar", "Notes"),
            tile("#2f7bbf", "dot", "Weather"),
        ]
    )

    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face {{ font-family: "Fraunces"; src: url("{Path(FRAUNCES).as_uri()}") format("woff2"); font-weight: 100 900; }}
@font-face {{ font-family: "Public Sans"; src: url("{Path(PUBLIC_SANS).as_uri()}") format("woff2"); font-weight: 100 900; }}
:root {{ --midnight: {MIDNIGHT}; --saffron: {SAFFRON}; --ink: {SAFFRON_INK}; --paper: {PAPER}; --line: #e2e5ea; --muted: #5d6676; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; width: {WIDTH}px; background: #e9ebef; font: 14px/1.45 "Public Sans", system-ui, sans-serif; color: #1b2230; }}
.display {{ font-family: "Fraunces", serif; font-variation-settings: "opsz" 72, "SOFT" 0, "WONK" 0; font-weight: 700; letter-spacing: -0.015em; }}
.hero {{ background: var(--midnight); color: #fff; padding: 56px 64px 48px; display: grid; grid-template-columns: 1fr auto; gap: 40px; align-items: end; }}
.hero img {{ height: 84px; display: block; }}
.hero p {{ margin: 22px 0 0; color: #c7cede; font-size: 16px; max-width: 560px; }}
.chips {{ display: grid; gap: 10px; }}
.chip {{ display: flex; align-items: center; gap: 12px; font-size: 13px; color: #c7cede; }}
.chip i {{ width: 30px; height: 30px; border-radius: 8px; display: block; box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); }}
.chip b {{ color: #fff; font-weight: 600; }}
main {{ padding: 32px 40px 40px; display: grid; gap: 24px; }}
.row {{ display: grid; gap: 24px; }}
.r2 {{ grid-template-columns: 1fr 1fr; }}
.card {{ background: #fff; border-radius: 18px; padding: 24px 26px 26px; }}
.card h2 {{ margin: 0 0 4px; font-size: 17px; }}
.card .sub {{ margin: 0 0 18px; color: var(--muted); font-size: 13px; }}
/* Phone */
.phones {{ display: flex; gap: 28px; align-items: center; justify-content: center; }}
.phone {{ width: 290px; height: 470px; border-radius: 44px; padding: 54px 22px; background: linear-gradient(160deg, #3b4b66, #1c2230 70%); box-shadow: 0 0 0 10px #15181d, 0 18px 40px rgba(0,0,0,.25); }}
.grid {{ display: grid; grid-template-columns: repeat(4, 1fr); row-gap: 22px; }}
.app {{ display: flex; flex-direction: column; align-items: center; gap: 6px; }}
.app .ico {{ width: 56px; height: 56px; border-radius: 13px; display: block; }}
.app span {{ color: #fff; font-size: 11px; }}
.android {{ display: grid; gap: 10px; justify-items: center; color: var(--muted); font-size: 12px; text-align: center; }}
.android img {{ width: 92px; height: 92px; border-radius: 50%; display: block; }}
/* Chat list */
.chat {{ border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }}
.chat header {{ padding: 14px 18px; font-weight: 700; font-size: 18px; border-bottom: 1px solid var(--line); }}
.msg {{ display: flex; gap: 14px; align-items: center; padding: 12px 18px; border-bottom: 1px solid #f0f2f5; }}
.msg:last-child {{ border-bottom: 0; }}
.avatar {{ width: 50px; height: 50px; border-radius: 50%; flex: none; display: grid; place-items: center; color: #fff; font-weight: 700; }}
.msg .who {{ font-weight: 600; }}
.msg .what {{ color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
.msg time {{ margin-left: auto; color: #8a93a3; font-size: 12px; align-self: flex-start; }}
.tag {{ font-size: 11px; color: var(--muted); background: #f0f2f5; border-radius: 6px; padding: 1px 6px; margin-left: 6px; }}
.profile {{ display: flex; gap: 22px; align-items: center; margin-top: 18px; }}
.profile img {{ width: 120px; height: 120px; border-radius: 50%; display: block; }}
/* Browser */
.browser {{ border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }}
.tabs {{ background: #dfe3e8; padding: 8px 10px 0; display: flex; gap: 4px; }}
.tab {{ display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 10px 10px 0 0; font-size: 13px; width: 290px; }}
.tab.on {{ background: #fff; }}
.tab img {{ width: 16px; height: 16px; image-rendering: auto; }}
.tab .blank {{ width: 16px; height: 16px; border-radius: 4px; background: #9aa3af; }}
.bar {{ background: #fff; padding: 8px 14px; border-bottom: 1px solid var(--line); }}
.bar div {{ background: #f0f2f5; border-radius: 999px; padding: 7px 16px; font-size: 13px; color: #3c4658; }}
.site-head {{ display: flex; align-items: center; justify-content: space-between; padding: 18px 32px; background: #fff; border-bottom: 1px solid var(--line); }}
.site-head img {{ height: 34px; display: block; }}
.site-head nav {{ display: flex; gap: 28px; align-items: center; font-size: 14px; color: #3c4658; }}
.btn {{ border-radius: 10px; padding: 10px 18px; font-weight: 600; font-size: 14px; display: inline-block; }}
.btn.dark {{ background: var(--midnight); color: #fff; }}
.btn.saffron {{ background: var(--saffron); color: var(--midnight); }}
.site-hero {{ background: var(--midnight); color: #fff; padding: 44px 32px 48px; }}
.site-hero h3 {{ margin: 0 0 10px; font-size: 40px; line-height: 1.08; max-width: 640px; }}
.site-hero p {{ margin: 0 0 22px; color: #c7cede; font-size: 16px; }}
.darktab {{ display: flex; align-items: center; gap: 8px; background: #35363a; color: #e8eaed; padding: 9px 14px; border-radius: 10px; font-size: 13px; width: 290px; margin-top: 14px; }}
/* Car + print */
.car {{ width: 100%; display: block; }}
.car .url {{ font: 600 13px "Public Sans", sans-serif; fill: #fff; letter-spacing: .02em; }}
.car .plate {{ font: 700 15px "Public Sans", sans-serif; fill: #1b2230; letter-spacing: .06em; }}
.cards {{ display: flex; gap: 22px; justify-content: center; align-items: flex-start; }}
.a6 {{ width: 214px; height: 302px; border-radius: 6px; box-shadow: 0 10px 26px rgba(0,0,0,.16); padding: 26px 22px; display: flex; flex-direction: column; }}
.a6.front {{ background: var(--midnight); color: #fff; }}
.a6.back {{ background: var(--paper); color: var(--midnight); }}
.a6 .lock {{ width: 100%; display: block; }}
.a6 h4 {{ margin: 34px 0 8px; font-size: 22px; line-height: 1.1; }}
.a6 p {{ margin: 0; font-size: 11.5px; }}
.a6.front p {{ color: #c7cede; }}
.a6.back p {{ color: #3c4658; }}
.a6 .foot {{ margin-top: auto; font-weight: 700; font-size: 13px; }}
.a6.front .foot {{ color: var(--saffron); }}
.a6.back .foot {{ color: var(--ink); }}
.a6 .then {{ display: block; font-weight: 500; font-size: 11px; color: #3c4658; margin-top: 2px; }}
.a6.back .mk {{ width: 52px; display: block; }}
/* Small and flat */
.ladder {{ display: flex; align-items: flex-end; gap: 18px; }}
.ladder img {{ display: block; }}
.pix {{ image-rendering: pixelated; }}
.flat {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 22px; }}
.flat div {{ border-radius: 12px; height: 108px; display: grid; place-items: center; border: 1px solid var(--line); }}
.cap {{ font-size: 12px; color: var(--muted); margin-top: 8px; }}
.checks {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }}
.checks li {{ display: flex; justify-content: space-between; border-bottom: 1px solid #f0f2f5; padding-bottom: 7px; font-size: 13px; }}
.checks b {{ color: #1a7f37; font-variant-numeric: tabular-nums; }}
</style></head><body>

<section class="hero">
  <div>
    <img src="{uri('lockup-dark.svg')}" alt="MusafirCars">
    <p>Route M in saffron and midnight. The M is the road: it sets off from the saffron dot and arrives at the pin.</p>
  </div>
  <div class="chips">
    <div class="chip"><i style="background:{MIDNIGHT}"></i><span><b>Midnight</b> {MIDNIGHT}</span></div>
    <div class="chip"><i style="background:{SAFFRON}"></i><span><b>Saffron</b> {SAFFRON}</span></div>
    <div class="chip"><i style="background:{SAFFRON_INK}"></i><span><b>Saffron on paper</b> {SAFFRON_INK}</span></div>
    <div class="chip"><i style="background:{WHITE}"></i><span><b>White</b> #ffffff</span></div>
  </div>
</section>

<main>
  <div class="row r2">
    <section class="card">
      <h2>On a phone</h2>
      <p class="sub">The app icon on a home screen, and the circle Android crops it to.</p>
      <div class="phones">
        <div class="phone"><div class="grid">{apps}</div></div>
        <div class="android"><img src="{uri('icon-maskable-512.svg')}" alt="">Android, cropped<br>to a circle</div>
      </div>
    </section>

    <section class="card">
      <h2>As the WhatsApp profile photo</h2>
      <p class="sub">What a customer sees in their chat list, and on the business profile.</p>
      <div class="chat">
        <header>Chats</header>
        <div class="msg"><img class="avatar" src="whatsapp-640.png" alt=""><div style="min-width:0"><div class="who">Musafir Cars<span class="tag">Business</span></div><div class="what">Your Alto is booked for Friday, 10 AM. The driver will call when he leaves.</div></div><time>11:42</time></div>
        <div class="msg"><div class="avatar" style="background:#7a8699">AK</div><div><div class="who">Ali Khan</div><div class="what">Reached Lahore, thanks</div></div><time>10:05</time></div>
        <div class="msg"><div class="avatar" style="background:#9b8a7a">SR</div><div><div class="who">Sana R.</div><div class="what">Voice message</div></div><time>Yesterday</time></div>
      </div>
      <div class="profile">
        <img src="whatsapp-640.png" alt="">
        <div><div class="display" style="font-size:24px">Musafir Cars</div><div class="cap">Car rental · Lahore · musafircars.com</div></div>
      </div>
    </section>
  </div>

  <section class="card">
    <h2>In the browser, and on the website</h2>
    <p class="sub">The favicon at its real 16 pixels, and how the header and a dark band would carry the new colours.</p>
    <div class="browser">
      <div class="tabs">
        <div class="tab on"><img src="favicon-16.png" alt="">Musafir Cars · Rent a car in Lahore</div>
        <div class="tab"><span class="blank"></span>New tab</div>
      </div>
      <div class="bar"><div>musafircars.com</div></div>
      <div class="site-head">
        <img src="{uri('lockup-light.svg')}" alt="MusafirCars">
        <nav><span>Cars</span><span>How it works</span><span>Rent your car</span><span class="btn dark">Book a car</span></nav>
      </div>
      <div class="site-hero">
        <h3 class="display">Rent a car in Lahore, with a driver or without.</h3>
        <p>Pick your dates, see what is free, and we confirm on WhatsApp.</p>
        <span class="btn saffron">See the cars</span>
      </div>
    </div>
    <div class="darktab"><img src="favicon-16.png" alt="" width="16" height="16">Musafir Cars · dark tab bar</div>
  </section>

  <div class="row r2">
    <section class="card">
      <h2>On the car's rear window</h2>
      <p class="sub">White and saffron vinyl, the only two colours that show on tinted glass.</p>
      {car()}
    </section>
    <section class="card">
      <h2>On the printed card</h2>
      <p class="sub">A6 hand-out: the front rents, the back recruits car owners.</p>
      <div class="cards">
        <div class="a6 front">
          <img class="lock" src="{uri('lockup-dark.svg')}" alt="">
          <h4 class="display">Rent a car in Lahore.</h4>
          <p>With a driver or without. Daily and weekly rates, confirmed on WhatsApp.</p>
          <div class="foot">musafircars.com</div>
        </div>
        <div class="a6 back">
          <img class="mk" src="{uri('mark-light.svg')}" alt="">
          <h4 class="display">Your car sits idle?</h4>
          <p>List it with Musafir. We find the customer, you set the dates, and you are paid when it comes back.</p>
          <div class="foot">musafircars.com<span class="then">then “Rent your car”</span></div>
        </div>
      </div>
    </section>
  </div>

  <div class="row r2">
    <section class="card">
      <h2>Small, flat and one colour</h2>
      <p class="sub">96, 48, 32 and 16 px, then the real 16 px favicon enlarged without smoothing.</p>
      <div class="ladder">
        <img src="{uri('icon-512.svg')}" width="96" height="96" style="border-radius:21px" alt="">
        <img src="{uri('icon-192.svg')}" width="48" height="48" style="border-radius:11px" alt="">
        <img src="favicon-32.png" width="32" height="32" alt="">
        <img src="favicon-16.png" width="16" height="16" alt="">
        <img class="pix" src="favicon-16.png" width="64" height="64" alt="" style="margin-left:18px">
      </div>
      <div class="flat">
        <div style="background:#fff"><img src="{uri('mark-one-colour.svg')}" height="56" alt=""></div>
        <div style="background:{MIDNIGHT}"><img src="{uri('mark-white.svg')}" height="56" alt=""></div>
        <div style="background:#fff;grid-column:span 2"><img src="{uri('lockup-one-colour.svg')}" style="width:84%;height:auto" alt=""></div>
      </div>
      <div class="cap">One colour: a rubber stamp, embroidery, a newspaper ad. The hole in the pin is a real cut-out.</div>
    </section>
    <section class="card">
      <h2>Contrast, measured</h2>
      <p class="sub">Marks need 3:1, text needs 4.5:1. Saffron only reaches 2.4:1 on white, so paper gets the darker shade.</p>
      <ul class="checks">{check_rows}</ul>
    </section>
  </div>
</main>
</body></html>"""
    page = OUT / "preview.html"
    page.write_text(html)
    render(page, OUT / "PREVIEW.png", WIDTH, HEIGHT, scale=2, transparent=False)
    print("wrote", OUT / "PREVIEW.png")


if __name__ == "__main__":
    main()

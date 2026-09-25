"""dayuse custom logotype: the 'd' IS Dayu; a-y-u-s-e are drawn from Dayu's own geometry
(same bowl size, same stroke as the raised arm, same forward lean). No font."""
import os, io, math, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen4 as g
from shapely.geometry import LineString, Point, box, Polygon
from shapely.ops import unary_union
from shapely import affinity
import cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "v7"); os.makedirs(OUT, exist_ok=True)
BLUE, INK, WHITE, NIGHT = "#2563EB", "#1E293B", "#FFFFFF", "#020617"

B, T = 58.5, 19.5          # baseline, x-height top (Dayu bowl spans exactly this)
XH = B - T                 # 39
SW = 9.6                   # stroke = a touch lighter than the arm (10.5) so the d stays the hero
R = XH / 2 - SW / 2        # centre-line radius of every bowl
LEAN = math.atan2(6, 43.5) # Dayu's arm angle ≈ 7.9°
TL = math.tan(LEAN)

def stroke(pts, w=SW):
    return LineString(pts).buffer(w / 2, cap_style=1, join_style=1, resolution=48)
def arcpts(cx, cy, r, a0, a1, n=64):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
def lean(geom):  # shear about the baseline, like the raised arm
    return affinity.affine_transform(geom, [1, -TL, 0, 1, B * TL, 0])

# ---- letters, each built at x=0, returned with its advance-relevant bounds ----
def L_d():
    return g.mark("default")                         # Dayu himself

def L_a():
    cx = R + SW / 2; cy = B - XH / 2
    bowl = Point(cx, cy).buffer(R + SW / 2, 128).difference(Point(cx, cy).buffer(R - SW / 2, 128))
    x_st = cx + R + 0.6
    stem = stroke([(x_st, B - SW / 2), (x_st + (XH - SW) * TL, T + SW / 2)])
    return unary_union([bowl, stem])

def L_u(desc=False):
    w = 2 * R
    pts = [(0, T + SW / 2)] + [(p[0] + R, p[1]) for p in arcpts(0, B - SW / 2 - R, R, 180, 0)[::-1][::-1]]
    left = stroke([(0, T + SW / 2), (0, B - SW / 2 - R)] )
    bottom = stroke(arcpts(R, B - SW / 2 - R, R, 180, 0)[::-1] if False else arcpts(R, B - SW / 2 - R, R, 0, 180)[::-1])
    if not desc:
        right = stroke([(w, T + SW / 2), (w, B - SW / 2)])
        geom = unary_union([left, bottom, right])
    else:  # y: right stem drops into a soft hook
        drop = 16.0
        tail = [(w, T + SW / 2), (w, B - SW / 2 + drop - R * 0.9)] + arcpts(w - R * 0.9, B - SW / 2 + drop - R * 0.9, R * 0.9, 0, 125)
        geom = unary_union([left, bottom, stroke(tail)])
    return affinity.translate(lean(geom), SW / 2, 0)

def L_s():
    h = XH - SW; r = h / 4; sx = 1.38               # wider than tall-circle s so its counters stay open
    top_c = (0, T + SW / 2 + r); bot_c = (0, B - SW / 2 - r)
    upper = arcpts(*top_c, r, -28, -270)
    lower = arcpts(*bot_c, r, -90, 152)
    pts = [(x * sx, y) for x, y in upper + lower]
    spine = stroke(pts, SW * 0.94)
    return lean(affinity.translate(spine, r * sx + SW / 2, 0))

def L_e():
    cx = R + SW / 2; cy = B - XH / 2
    ring = arcpts(cx, cy, R, 52, 360)                 # opens at lower-right: the terminal lifts like a smile
    bar = stroke([(cx - R, cy), (cx + R, cy)], SW * 0.92)
    return unary_union([stroke(ring[:-0] if False else ring), bar])

LETTERS = [("d", L_d), ("a", L_a), ("y", lambda: L_u(True)), ("u", L_u), ("s", L_s), ("e", L_e)]
GAPS = {"da": 4.2, "ay": 3.6, "yu": 5.6, "us": 7.4, "se": 5.2}

def build():
    parts = []; x = 0; prev = None; placed = []
    for ch, fn in LETTERS:
        gm = fn(); b = gm.bounds
        if prev is None:
            dx = -b[0]
        else:
            # optical spacing: gap between ink at x-height band, not full bounds (leaning letters overlap)
            band = box(-1e3, T, 1e3, B)
            pb = placed[-1].intersection(band).bounds
            cb = gm.intersection(band).bounds
            dx = pb[2] + GAPS[prev + ch] - cb[0]
        gm = affinity.translate(gm, dx, 0); placed.append(gm); parts.append((ch, gm)); prev = ch
    return parts

PARTS = build()
ALL = unary_union([p for _, p in PARTS])
X0, Y0, X1, Y1 = ALL.bounds

def logo_svg(d_color, rest_color, pad=0, expr="default"):
    items = []
    for ch, gm in PARTS:
        if ch == "d" and expr != "default":
            gm = affinity.translate(g.mark(expr), PARTS[0][1].bounds[0] - g.mark().bounds[0], 0)
        col = d_color if ch == "d" else rest_color
        items.append(f'<path fill="{col}" fill-rule="evenodd" d="{g.poly_d(gm)}"/>')
    w, h = X1 - X0 + 2 * pad, Y1 - Y0 + 2 * pad
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{X0 - pad:.2f} {Y0 - pad:.2f} {w:.2f} {h:.2f}" '
            f'width="{w * 2:.0f}" height="{h * 2:.0f}">' + "".join(items) + "</svg>")

VARIANTS = {"light": (BLUE, INK), "blue": (BLUE, BLUE), "dark": (BLUE, WHITE), "mono-black": (INK, INK), "mono-white": (WHITE, WHITE)}
for n, (dc, rc) in VARIANTS.items():
    open(os.path.join(OUT, f"logotype-{n}.svg"), "w").write(logo_svg(dc, rc))
for e in ("done", "cheer", "rest"):
    open(os.path.join(OUT, f"logotype-{e}.svg"), "w").write(logo_svg(BLUE, INK, expr=e))
print("bounds", [round(v, 1) for v in (X0, Y0, X1, Y1)], "ratio", round((X1 - X0) / (Y1 - Y0), 3))

S = Image.new("RGBA", (1300, 760), (248, 250, 252, 255))
def P(f, x, y, h, bg=None):
    im = Image.open(io.BytesIO(cairosvg.svg2png(url=os.path.join(OUT, f), output_height=h))).convert("RGBA")
    if bg: b2 = Image.new("RGBA", (im.width + 40, im.height + 40), bg); b2.alpha_composite(im, (20, 20)); im = b2
    S.alpha_composite(im, (x, y))
P("logotype-light.svg", 20, 20, 220)
P("logotype-dark.svg", 20, 290, 110, bg=(2, 6, 23, 255))
P("logotype-mono-black.svg", 520, 290, 110, bg=(255, 255, 255, 255))
P("logotype-done.svg", 20, 470, 90)
P("logotype-light.svg", 20, 600, 40); P("logotype-light.svg", 260, 600, 26); P("logotype-light.svg", 440, 600, 18)
P("logotype-mono-white.svg", 700, 460, 90, bg=(37, 99, 235, 255))
S.save(os.path.join(HERE, "preview_v7.png"))

# construction sheet: guides over a light logotype
pad = 14
w, h = X1 - X0 + 2 * pad, Y1 - Y0 + 2 * pad
items = [f'<rect x="{X0 - pad}" y="{Y0 - pad}" width="{w}" height="{h}" fill="#FFFFFF"/>']
for ch, gm in PARTS:
    items.append(f'<path fill="{BLUE if ch == "d" else "#1E293B"}" fill-opacity="{0.9 if ch == "d" else 0.16}" fill-rule="evenodd" d="{g.poly_d(gm)}"/>')
for yy, lab in ((T, "x-height"), (B, "baseline")):
    items.append(f'<line x1="{X0 - pad}" y1="{yy}" x2="{X1 + pad}" y2="{yy}" stroke="#2563EB" stroke-width=".35" stroke-dasharray="1.5 1.5"/>')
# same-size circles: every bowl = Dayu's face
for ch, gm in PARTS:
    if ch in "dae":
        if ch == "d":
            cx = g.BCX + (gm.bounds[0] - g.mark().bounds[0])
        else:
            bb = gm.intersection(box(-1e3, B - XH / 2 - 1, 1e3, B - XH / 2 + 1)).bounds; cx = bb[0] + XH / 2
        items.append(f'<circle cx="{cx:.2f}" cy="{B - XH / 2}" r="{XH / 2}" fill="none" stroke="#2563EB" stroke-width=".4"/>')
# one lean for every stem = the raised arm
for ch, gm in PARTS:
    if ch in "dau":
        yb = 14 if ch == "d" else T + 10
        band = gm.intersection(box(-1e3, yb - .3, 1e3, yb + .3))
        segs = list(getattr(band, "geoms", [band])); seg = max(segs, key=lambda q: q.bounds[2]).bounds
        xc = (seg[0] + seg[2]) / 2
        items.append(f'<line x1="{xc - (B + 6 - yb) * TL:.2f}" y1="{B + 6}" x2="{xc + yb * TL:.2f}" y2="0" stroke="#F59E0B" stroke-width=".45"/>')
open(os.path.join(OUT, "logotype-construction.svg"), "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{X0 - pad:.2f} {Y0 - pad:.2f} {w:.2f} {h:.2f}" width="{w * 3:.0f}" height="{h * 3:.0f}">' + "".join(items) + "</svg>")
print("construction ratio", round(w / h, 3))

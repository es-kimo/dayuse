"""dayuse v4: 'Dayu' — the d that cheers. Letter + character mark with an expression system."""
import os, io, shutil, math
from shapely.geometry import LineString, Point, box, Polygon
from shapely.ops import unary_union
from shapely import affinity
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "v4"); shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
BLUE, SLATE, WHITE, INK = "#2563EB", "#1E293B", "#FFFFFF", "#020617"

def ring(c):
    p = list(c); return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in p[:-1]) + " Z"
def poly_d(g):
    out = []
    for p in getattr(g, "geoms", [g]):
        if p.is_empty: continue
        out.append(ring(p.exterior.coords)); out += [ring(i.coords) for i in p.interiors]
    return " ".join(out)
def ellipse(cx, cy, rx, ry, rot=0):
    e = affinity.scale(Point(0, 0).buffer(1, 64), rx, ry)
    return affinity.translate(affinity.rotate(e, rot), cx, cy)
def stroke(pts, w):
    return LineString(pts).buffer(w / 2, cap_style=1, join_style=1, resolution=32)
def arc(cx, cy, r, a0, a1, w, n=40):
    pts = [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
    return stroke(pts, w)

# ---- body: a round bowl (face) + a raised, slightly outward-leaning arm (the d's ascender) ----
BCX, BCY, BR = 27, 39, 19.5
def body():
    bowl = Point(BCX, BCY).buffer(BR, 128)
    arm = stroke([(42.5, 52), (48.5, 8.5)], 10.5)
    # soft armpit fillet: fill the notch between bowl and arm
    g = unary_union([bowl, arm]).buffer(2.2, join_style=1).buffer(-2.2, join_style=1)
    return g

# eyes look up and toward the raised arm (optimism)
EL, ER = (21.5, 35.5), (32.5, 35.5)
def face(expr, small=False):
    if small:  # 16–24 px: just two bold eyes, no mouth
        return unary_union([ellipse(EL[0], EL[1] + 1, 3.6, 5), ellipse(ER[0], ER[1] + 1, 3.6, 5)])
    if expr == "default":
        eyes = [ellipse(*EL, 2.9, 4.1), ellipse(*ER, 2.9, 4.1)]
        mouth = arc(27, 41.5, 5, 25, 155, 2.8)
    elif expr == "done":    # 인증 완료: happy closed eyes + open smile
        eyes = [arc(EL[0], EL[1] + 2, 3.4, 200, 340, 2.8), arc(ER[0], ER[1] + 2, 3.4, 200, 340, 2.8)]
        m = Point(27, 42.5).buffer(6.2, 64).intersection(box(0, 42.5, 64, 64))
        mouth = m
    elif expr == "cheer":   # 응원: wink
        eyes = [arc(EL[0], EL[1] + 2, 3.4, 200, 340, 2.8), ellipse(*ER, 2.9, 4.1)]
        mouth = arc(27, 41.5, 5.5, 20, 160, 2.8)
    elif expr == "rest":    # 쉬는 날·미인증: sleepy, calm — never sad or scolding
        eyes = [stroke([(EL[0] - 3, EL[1] + 1.5), (EL[0] + 3, EL[1] + 1.5)], 2.8), stroke([(ER[0] - 3, ER[1] + 1.5), (ER[0] + 3, ER[1] + 1.5)], 2.8)]
        mouth = arc(27, 42.5, 3.6, 40, 140, 2.6)
    return unary_union(eyes + [mouth])

def mark(expr="default", small=False):
    return body().difference(face(expr, small))

def svg64(inner, vb="0 0 64 64"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="64" height="64">{inner}</svg>'
def free(color, expr="default", small=False):
    return svg64(f'<path fill="{color}" fill-rule="evenodd" d="{poly_d(mark(expr, small))}"/>', "2 2 60 60")
TILE = "M16 0 H48 A16 16 0 0 1 64 16 V48 A16 16 0 0 1 48 64 H16 A16 16 0 0 1 0 48 V16 A16 16 0 0 1 16 0 Z"
def tile(tile_c, mark_c, expr="default", small=False):
    g = affinity.translate(affinity.scale(mark(expr, small), 0.82, 0.82, origin=(32, 32)), 0.8, -0.8)
    return svg64(f'<path fill="{tile_c}" d="{TILE}"/><path fill="{mark_c}" fill-rule="evenodd" d="{poly_d(g)}"/>')

# ---- wordmark ----
font = TTFont(os.path.join(HERE, "fnt/pt/package/dist/public/static/Pretendard-ExtraBold.otf"))
gs = font.getGlyphSet(); cmap = font.getBestCmap(); hmtx = font["hmtx"]; upm = font["head"].unitsPerEm
TRACK = -0.02 * upm; x = 0; parts = []; bb = [1e9, 1e9, -1e9, -1e9]
for ch in "dayuse":
    gn = cmap[ord(ch)]; pen = SVGPathPen(gs); gs[gn].draw(TransformPen(pen, (1, 0, 0, -1, x, 0))); parts.append(pen.getCommands())
    bp = BoundsPen(gs); gs[gn].draw(bp); a, b, c, d = bp.bounds
    bb = [min(bb[0], a + x), min(bb[1], -d), max(bb[2], c + x), max(bb[3], -b)]; x += hmtx[gn][0] + TRACK
WP = " ".join(parts); S = 100 / upm; WX0, WY0, WX1, WY1 = [v * S for v in bb]; WW, WH = WX1 - WX0, WY1 - WY0
def wpath(fill, dx, dy, k=1):
    return f'<path fill="{fill}" transform="translate({dx - WX0 * k:.2f} {dy - WY0 * k:.2f}) scale({S * k:.5f})" d="{WP}"/>'

def combo(mark_c, word_c):
    # character height ≈ 1.3 × wordmark ascender-to-descender, baseline-aligned feel
    mb = mark().bounds; mw, mh = mb[2] - mb[0], mb[3] - mb[1]
    H = WH * 1.18; k = H / mh; gap = H * 0.16
    w = mw * k + gap + WW; h = H
    mg = f'<path fill="{mark_c}" fill-rule="evenodd" transform="translate({-mb[0] * k:.2f} {-mb[1] * k:.2f}) scale({k:.4f})" d="{poly_d(mark())}"/>'
    # align wordmark baseline with the bottom of the bowl (minus descender)
    desc = WY1  # descender below baseline
    wy = h - WH + desc * 0.0 - desc * 1.0 + desc  # keep bottom at h? place so baseline sits near bowl bottom
    wy = h - (WH - desc) - desc * 0.2 - (WH - (WH - desc)) * 0.0 - 1.0
    wy = h - (-WY0) - 2.0 - WY0 * 0  # baseline at h-2 → top = baseline - ascender
    wy = (h - 2.0) - (-WY0)
    total_h = max(h, wy + WH)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {total_h:.2f}" width="{w:.0f}" height="{total_h:.0f}">'
            + mg + wpath(word_c, mw * k + gap, wy) + "</svg>")

def put(n, s): open(os.path.join(OUT, n), "w").write(s)
for c, n in [(BLUE, "blue"), (SLATE, "slate"), (WHITE, "white")]:
    put(f"mark-{n}.svg", free(c)); put(f"mark-small-{n}.svg", free(c, small=True))
for e in ("default", "done", "cheer", "rest"):
    put(f"expr-{e}.svg", free(BLUE, e))
put("icon-blue.svg", tile(BLUE, WHITE)); put("icon-white.svg", tile(WHITE, BLUE)); put("icon-small.svg", tile(BLUE, WHITE, small=True))
put("combo-light.svg", combo(BLUE, SLATE)); put("combo-dark.svg", combo(BLUE, WHITE)) if False else put("combo-dark.svg", combo(WHITE, WHITE))
put("combo-blue.svg", combo(BLUE, BLUE)); put("combo-mono-slate.svg", combo(SLATE, SLATE))
import re
for n in ("combo-light.svg", "combo-dark.svg"):
    print(n, re.search(r'viewBox="([^"]+)"', open(os.path.join(OUT, n)).read()).group(1))

sheet = Image.new("RGBA", (1100, 560), (248, 250, 252, 255))
def paste(f, x, y, w=None, h=None, bg=None):
    im = Image.open(io.BytesIO(cairosvg.svg2png(url=os.path.join(OUT, f), output_width=w, output_height=h))).convert("RGBA")
    if bg:
        b = Image.new("RGBA", (im.width + 24, im.height + 24), bg); b.alpha_composite(im, (12, 12)); im = b
    sheet.alpha_composite(im, (x, y))
paste("mark-blue.svg", 20, 20, 240, 240)
paste("icon-blue.svg", 290, 20, 120, 120); paste("icon-white.svg", 290, 150, 120, 120, bg=(226, 232, 240, 255))
X = 440
for e in ("default", "done", "cheer", "rest"):
    paste(f"expr-{e}.svg", X, 20, 120, 120); X += 140
paste("combo-light.svg", 440, 170, h=70)
paste("combo-dark.svg", 440, 260, h=70, bg=(2, 6, 23, 255))
X = 20
for s in (16, 24, 32, 48):
    paste("mark-small-blue.svg" if s <= 24 else "mark-blue.svg", X, 300, s, s); X += s + 20
X = 20
for s in (16, 24, 32, 48):
    paste("icon-small.svg" if s <= 24 else "icon-blue.svg", X, 380, s, s); X += s + 20
paste("combo-light.svg", 440, 380, h=28); paste("combo-light.svg", 440, 430, h=20)
sheet.save(os.path.join(HERE, "preview_v4.png"))

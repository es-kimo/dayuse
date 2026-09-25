"""dayuse BR-01 final asset build — '데이유' (Dayu) character mark.
Geometry lives in gen4.py (body/face/mark/tile/wordmark). This script builds every production file."""
import os, io, sys, shutil, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen4 as g
from shapely import affinity
import cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "dayuse-brand-v1.0"); shutil.rmtree(OUT, ignore_errors=True)
BLUE, INK, WHITE, NIGHT = "#2563EB", "#1E293B", "#FFFFFF", "#020617"
EXPRS = ("default", "done", "cheer", "rest")
THEMES = {  # mark colour, wordmark colour, preview background
    "light": (BLUE, INK, "#FFFFFF"), "dark": (BLUE, WHITE, NIGHT),
    "mono-black": (INK, INK, "#FFFFFF"), "mono-white": (WHITE, WHITE, BLUE),
}
files = {}
def put(rel, svg):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, "w").write(svg); files[rel] = p; return p

MB = g.mark().bounds  # free mark bounds in 64-grid
def mark_group(color, x, y, h, expr="default", small=False):
    m = g.mark(expr, small); b = MB; k = h / (b[3] - b[1])
    return (f'<path fill="{color}" fill-rule="evenodd" transform="translate({x - b[0] * k:.2f} {y - b[1] * k:.2f}) scale({k:.4f})" '
            f'd="{g.poly_d(m)}"/>'), (b[2] - b[0]) * k

def symbol(color, expr="default", small=False):
    # square canvas, mark centred optically (bounds-centred)
    b = MB; w, h = b[2] - b[0], b[3] - b[1]; side = max(w, h) * 1.0
    m = g.mark(expr, small)
    dx = (side - w) / 2 - b[0]; dy = (side - h) / 2 - b[1]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side:.2f} {side:.2f}" width="64" height="64">'
            f'<path fill="{color}" fill-rule="evenodd" transform="translate({dx:.2f} {dy:.2f})" d="{g.poly_d(m)}"/></svg>')

def wordmark(color):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {g.WW:.2f} {g.WH:.2f}" width="{g.WW:.0f}" height="{g.WH:.0f}">'
            + g.wpath(color, 0, 0) + "</svg>")

def horizontal(mc, wc):
    H = g.WH * 1.18; gap = H * 0.16
    mg, mw = mark_group(mc, 0, 0, H)
    wy = (H - 2.0) - (-g.WY0); th = max(H, wy + g.WH); w = mw + gap + g.WW
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {th:.2f}" width="{w:.0f}" height="{th:.0f}">'
            + mg + g.wpath(wc, mw + gap, wy) + "</svg>")

def vertical(mc, wc):
    H = g.WH * 2.1; gap = g.WH * 0.34
    b = MB; mw = (b[2] - b[0]) * H / (b[3] - b[1]); w = max(mw, g.WW)
    mg, _ = mark_group(mc, (w - mw) / 2, 0, H)
    th = H + gap + g.WH
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {th:.2f}" width="{w:.0f}" height="{th:.0f}">'
            + mg + g.wpath(wc, (w - g.WW) / 2, H + gap) + "</svg>")

def app_icon(tile_c, mark_c, small=False, full_bleed=False, scale=0.82):
    m = affinity.translate(affinity.scale(g.mark("default", small), scale, scale, origin=(32, 32)), 0.8, -0.8)
    bg = f'<rect width="64" height="64" fill="{tile_c}"/>' if full_bleed else f'<path fill="{tile_c}" d="{g.TILE}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">{bg}'
            f'<path fill="{mark_c}" fill-rule="evenodd" d="{g.poly_d(m)}"/></svg>')

# ---------- SVG ----------
for t, (mc, wc, _) in THEMES.items():
    put(f"production/svg/symbol/symbol-{t}.svg", symbol(mc))
    put(f"production/svg/symbol/symbol-small-{t}.svg", symbol(mc, small=True))
    put(f"production/svg/wordmark/wordmark-{t}.svg", wordmark(wc))
    put(f"production/svg/combination/logo-horizontal-{t}.svg", horizontal(mc, wc))
    put(f"production/svg/combination/logo-vertical-{t}.svg", vertical(mc, wc))
put("production/svg/wordmark/wordmark-blue.svg", wordmark(BLUE))
for e in EXPRS:
    for cn, c in (("blue", BLUE), ("ink", INK), ("white", WHITE)):
        put(f"production/svg/expressions/dayu-{e}-{cn}.svg", symbol(c, e))
put("production/svg/app-icon/app-icon.svg", app_icon(BLUE, WHITE))
put("production/svg/app-icon/app-icon-white.svg", app_icon(WHITE, BLUE))
put("production/svg/app-icon/app-icon-small.svg", app_icon(BLUE, WHITE, small=True))
put("production/svg/app-icon/app-icon-fullbleed.svg", app_icon(BLUE, WHITE, full_bleed=True))
put("production/svg/app-icon/app-icon-maskable.svg", app_icon(BLUE, WHITE, full_bleed=True, scale=0.62))
# spec-named defaults
for src, dst in [("production/svg/symbol/symbol-light.svg", "production/svg/symbol.svg"),
                 ("production/svg/wordmark/wordmark-light.svg", "production/svg/wordmark.svg"),
                 ("production/svg/combination/logo-horizontal-light.svg", "production/svg/logo-combination.svg")]:
    shutil.copy(files[src], os.path.join(OUT, dst))

# ---------- PNG (transparent) ----------
def png(src, rel, w=None, h=None):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    cairosvg.svg2png(url=src, write_to=p, output_width=w, output_height=h); return p
for t in THEMES:
    for s in (64, 128, 256, 512, 1024):
        png(files[f"production/svg/symbol/symbol-{t}.svg"], f"production/png/symbol/symbol-{t}-{s}.png", s, s)
    for s in (16, 24, 32):
        png(files[f"production/svg/symbol/symbol-small-{t}.svg"], f"production/png/symbol/symbol-small-{t}-{s}.png", s, s)
    for h in (48, 96, 192):
        png(files[f"production/svg/wordmark/wordmark-{t}.svg"], f"production/png/wordmark/wordmark-{t}-h{h}.png", h=h)
        png(files[f"production/svg/combination/logo-horizontal-{t}.svg"], f"production/png/combination/logo-horizontal-{t}-h{h}.png", h=h)
    for h in (256, 512):
        png(files[f"production/svg/combination/logo-vertical-{t}.svg"], f"production/png/combination/logo-vertical-{t}-h{h}.png", h=h)
for e in EXPRS:
    for cn in ("blue", "ink", "white"):
        for s in (128, 256, 512):
            png(files[f"production/svg/expressions/dayu-{e}-{cn}.svg"], f"production/png/expressions/dayu-{e}-{cn}-{s}.png", s, s)
for s in (256, 512, 1024):
    png(files["production/svg/app-icon/app-icon.svg"], f"production/png/app-icon/app-icon-{s}.png", s, s)

# ---------- web ----------
W = "production/web/"
png(files["production/svg/app-icon/app-icon-fullbleed.svg"], W + "apple-touch-icon.png", 180, 180)
png(files["production/svg/app-icon/app-icon-fullbleed.svg"], W + "icon-192.png", 192, 192)
png(files["production/svg/app-icon/app-icon-fullbleed.svg"], W + "icon-512.png", 512, 512)
png(files["production/svg/app-icon/app-icon-maskable.svg"], W + "icon-maskable-512.png", 512, 512)
shutil.copy(files["production/svg/app-icon/app-icon-small.svg"], os.path.join(OUT, W + "favicon.svg"))
ims = []
for s in (16, 24, 32, 48, 64):
    src = files["production/svg/app-icon/app-icon-small.svg"] if s <= 24 else files["production/svg/app-icon/app-icon.svg"]
    ims.append(Image.open(io.BytesIO(cairosvg.svg2png(url=src, output_width=s, output_height=s))).convert("RGBA"))
ims[-1].save(os.path.join(OUT, W + "favicon.ico"), sizes=[(s, s) for s in (16, 24, 32, 48, 64)], append_images=ims[:-1])

# OG / share image 1200×630: white, horizontal logo + tagline (Korean set as outlines-free text via installed Pretendard)
mg, mw = mark_group(BLUE, 0, 0, 150)
og = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">'
      f'<rect width="1200" height="630" fill="#F8FAFC"/>'
      f'<g transform="translate(120 130) scale(1.5)">{horizontal(BLUE, INK)[horizontal(BLUE, INK).index(">") + 1:-6]}</g>'
      f'<text x="120" y="440" font-family="Pretendard" font-weight="700" font-size="56" fill="{INK}" letter-spacing="-1">목표는 각자, 꾸준함은 함께.</text>'
      f'<text x="120" y="505" font-family="Pretendard" font-weight="400" font-size="30" fill="#475569">친구들과 각자의 챌린지를 인증하고 기록해요.</text></svg>')
put(W + "og-image.svg", og)
png(files[W + "og-image.svg"], W + "og-image.png", 1200, 630)

# ---------- editable source ----------
def inner(svg): return svg[svg.index(">") + 1: svg.rindex("</svg>")]
blocks, y = [], 0
for t, (mc, wc, bg) in THEMES.items():
    hz = horizontal(mc, wc); vt = vertical(mc, wc)
    blocks.append(f'<g id="{t}" transform="translate(0 {y})"><rect id="{t}-bg" width="1600" height="320" fill="{bg}"/>'
                  f'<g id="{t}-symbol" transform="translate(40 60) scale(3)">{inner(symbol(mc))}</g>'
                  f'<g id="{t}-horizontal" transform="translate(300 110)">{inner(hz)}</g>'
                  f'<g id="{t}-vertical" transform="translate(900 20) scale(0.95)">{inner(vt)}</g>'
                  f'<g id="{t}-wordmark" transform="translate(1260 120)">{inner(wordmark(wc))}</g></g>')
    y += 320
ex = "".join(f'<g id="expr-{e}" transform="translate({40 + i * 240} {y + 40}) scale(3)">{inner(symbol(BLUE, e))}</g>' for i, e in enumerate(EXPRS))
put("source/dayuse-logo-master.svg",
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 {y + 280}" width="1600" height="{y + 280}">'
    f'<!-- dayuse logo master v1.0 · Dayu mark (60-unit grid) · Wordmark: Pretendard ExtraBold, tracking -20/1000, outlined (SIL OFL 1.1) · '
    f'Blue #2563EB · Ink #1E293B · White #FFFFFF --><rect y="{y}" width="1600" height="280" fill="#FFFFFF"/>' + "".join(blocks) + ex + "</svg>")
# construction sheet
body = g.poly_d(g.body())
grid = "".join(f'<line x1="{i*4}" y1="0" x2="{i*4}" y2="64" stroke="#94A3B8" stroke-width=".12"/><line x1="0" y1="{i*4}" x2="64" y2="{i*4}" stroke="#94A3B8" stroke-width=".12"/>' for i in range(17))
put("source/dayu-construction.svg",
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="640" height="640"><rect width="64" height="64" fill="#FFFFFF"/>{grid}'
    f'<path fill="{BLUE}" fill-opacity=".14" d="{body}"/><path fill="{BLUE}" fill-rule="evenodd" d="{g.poly_d(g.mark())}" fill-opacity=".9"/>'
    f'<circle cx="{g.BCX}" cy="{g.BCY}" r="{g.BR}" fill="none" stroke="#1E293B" stroke-width=".25" stroke-dasharray=".8 .8"/>'
    f'<line x1="42.5" y1="52" x2="48.5" y2="8.5" stroke="#1E293B" stroke-width=".25" stroke-dasharray=".8 .8"/>'
    f'<circle cx="{g.BCX}" cy="{g.BCY}" r=".6" fill="#1E293B"/></svg>')
shutil.copy(os.path.join(HERE, "gen4.py"), os.path.join(OUT, "source/geometry.py"))
shutil.copy(os.path.abspath(__file__), os.path.join(OUT, "source/build.py"))
os.makedirs(os.path.join(OUT, "source/fonts"), exist_ok=True)
shutil.copy(os.path.join(HERE, "fnt/pt/package/dist/LICENSE.txt"), os.path.join(OUT, "source/fonts/Pretendard-OFL.txt"))
print("svg files:", len(files))

"""Korean wordmark '데이유즈' + bilingual lockup, added on top of the gen5 build."""
import os, io, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen5 as b          # rebuilds the English pack first
import gen4 as g
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
font = TTFont(os.path.join(HERE, "fnt/pt/package/dist/public/static/Pretendard-ExtraBold.otf"))
gs = font.getGlyphSet(); cmap = font.getBestCmap(); hmtx = font["hmtx"]; upm = font["head"].unitsPerEm

def outline(text, track):
    x = 0; parts = []; bb = [1e9, 1e9, -1e9, -1e9]
    for ch in text:
        gn = cmap[ord(ch)]; pen = SVGPathPen(gs); gs[gn].draw(TransformPen(pen, (1, 0, 0, -1, x, 0))); parts.append(pen.getCommands())
        bp = BoundsPen(gs); gs[gn].draw(bp)
        if bp.bounds:
            a, c0, c, d = bp.bounds; bb = [min(bb[0], a + x), min(bb[1], -d), max(bb[2], c + x), max(bb[3], -c0)]
        x += hmtx[gn][0] + track * upm
    return " ".join(parts), bb

KP, KB = outline("데이유즈", -0.04)
# scale Korean so its ink height matches the Latin ascender (top of 'd' to baseline) → same visual weight next to Dayu
LAT_ASC = -g.WY0                       # px in wordmark space
KS = LAT_ASC / (KB[3] - KB[1])         # font units → px
KW, KH = (KB[2] - KB[0]) * KS, (KB[3] - KB[1]) * KS
def kpath(fill, dx, dy, k=1.0):
    s = KS * k
    return f'<path fill="{fill}" transform="translate({dx - KB[0] * s:.2f} {dy - KB[1] * s:.2f}) scale({s:.5f})" d="{KP}"/>'

def wordmark_ko(color):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {KW:.2f} {KH:.2f}" width="{KW:.0f}" height="{KH:.0f}">'
            + kpath(color, 0, 0) + "</svg>")

def horizontal_ko(mc, wc):
    H = g.WH * 1.18; gap = H * 0.16
    mg, mw = b.mark_group(mc, 0, 0, H)
    base = H - 2.0                       # same baseline as the English lockup
    w = mw + gap + KW
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {H:.2f}" width="{w:.0f}" height="{H:.0f}">'
            + mg + kpath(wc, mw + gap, base - KH) + "</svg>")

def vertical_ko(mc, wc):
    H = g.WH * 2.1; gap = g.WH * 0.34
    bb = b.MB; mw = (bb[2] - bb[0]) * H / (bb[3] - bb[1]); w = max(mw, KW)
    mg, _ = b.mark_group(mc, (w - mw) / 2, 0, H)
    th = H + gap + KH
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {th:.2f}" width="{w:.0f}" height="{th:.0f}">'
            + mg + kpath(wc, (w - KW) / 2, H + gap) + "</svg>")

def bilingual(mc, wc, sub_c):
    """Dayu + 'dayuse' with '데이유즈' set small underneath — for store listings, press, first-time exposure."""
    H = g.WH * 1.62; gap = H * 0.13
    mg, mw = b.mark_group(mc, 0, 0, H)
    k2 = 0.42                            # Korean at 34% of Latin ascender
    ky_h = KH * k2; line_gap = g.WH * 0.12
    block_h = g.WH + line_gap + ky_h
    top = (H - block_h) / 2
    x = mw + gap; w = x + max(g.WW, KW * k2)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {H:.2f}" width="{w:.0f}" height="{H:.0f}">'
            + mg + g.wpath(wc, x, top) + kpath(sub_c, x + 2, top + g.WH + line_gap, k2) + "</svg>")

SUB = {"light": "#475569", "dark": "#CBD5E1", "mono-black": b.INK, "mono-white": b.WHITE}
for t, (mc, wc, _) in b.THEMES.items():
    b.put(f"production/svg/wordmark/wordmark-ko-{t}.svg", wordmark_ko(wc))
    b.put(f"production/svg/combination/logo-horizontal-ko-{t}.svg", horizontal_ko(mc, wc))
    b.put(f"production/svg/combination/logo-vertical-ko-{t}.svg", vertical_ko(mc, wc))
    b.put(f"production/svg/combination/logo-bilingual-{t}.svg", bilingual(mc, wc, SUB[t]))
b.put("production/svg/wordmark/wordmark-ko-blue.svg", wordmark_ko(b.BLUE))

for t in b.THEMES:
    for h in (48, 96, 192):
        b.png(b.files[f"production/svg/wordmark/wordmark-ko-{t}.svg"], f"production/png/wordmark/wordmark-ko-{t}-h{h}.png", h=h)
        b.png(b.files[f"production/svg/combination/logo-horizontal-ko-{t}.svg"], f"production/png/combination/logo-horizontal-ko-{t}-h{h}.png", h=h)
        b.png(b.files[f"production/svg/combination/logo-bilingual-{t}.svg"], f"production/png/combination/logo-bilingual-{t}-h{h}.png", h=h)
    for h in (256, 512):
        b.png(b.files[f"production/svg/combination/logo-vertical-ko-{t}.svg"], f"production/png/combination/logo-vertical-ko-{t}-h{h}.png", h=h)

# add Korean rows to the editable master
master = os.path.join(b.OUT, "source/dayuse-logo-master.svg")
s = open(master).read()
import re
vb = re.search(r'viewBox="0 0 1600 ([\d.]+)"', s); H0 = float(vb.group(1))
rows = []
for i, (t, (mc, wc, bg)) in enumerate(b.THEMES.items()):
    y = H0 + i * 320
    rows.append(f'<g id="ko-{t}" transform="translate(0 {y})"><rect width="1600" height="320" fill="{bg}"/>'
                f'<g id="ko-{t}-horizontal" transform="translate(40 110)">{b.inner(horizontal_ko(mc, wc))}</g>'
                f'<g id="ko-{t}-vertical" transform="translate(560 20) scale(0.95)">{b.inner(vertical_ko(mc, wc))}</g>'
                f'<g id="bilingual-{t}" transform="translate(960 90)">{b.inner(bilingual(mc, wc, SUB[t]))}</g></g>')
newH = H0 + 4 * 320
s = s.replace(f'viewBox="0 0 1600 {vb.group(1)}" width="1600" height="{int(H0) if H0.is_integer() else H0}"', f'viewBox="0 0 1600 {newH}" width="1600" height="{int(newH)}"')
s = s.replace("</svg>", "".join(rows) + "</svg>")
open(master, "w").write(s)

for n in ("wordmark/wordmark-ko-light", "combination/logo-horizontal-ko-light", "combination/logo-vertical-ko-light", "combination/logo-bilingual-light"):
    print(n, re.search(r'viewBox="([^"]+)"', open(b.files[f"production/svg/{n}.svg"]).read()).group(1))

# preview
S = Image.new("RGBA", (1200, 620), (226, 232, 240, 255))
def P(f, x, y, w=None, h=None, bg=None):
    im = Image.open(io.BytesIO(cairosvg.svg2png(url=b.files[f], output_width=w, output_height=h))).convert("RGBA")
    if bg: bb2 = Image.new("RGBA", (im.width + 30, im.height + 30), bg); bb2.alpha_composite(im, (15, 15)); im = bb2
    S.alpha_composite(im, (x, y))
C = "production/svg/combination/"
P(C + "logo-horizontal-light.svg", 20, 20, h=80, bg=(255, 255, 255, 255))
P(C + "logo-horizontal-ko-light.svg", 20, 140, h=80, bg=(255, 255, 255, 255))
P(C + "logo-horizontal-ko-dark.svg", 20, 260, h=80, bg=(2, 6, 23, 255))
P(C + "logo-bilingual-light.svg", 20, 380, h=110, bg=(255, 255, 255, 255))
P(C + "logo-vertical-ko-light.svg", 560, 20, h=240, bg=(255, 255, 255, 255))
P(C + "logo-bilingual-dark.svg", 560, 320, h=110, bg=(2, 6, 23, 255))
P(C + "logo-horizontal-ko-light.svg", 20, 540, h=24, bg=(255, 255, 255, 255))
P(C + "logo-horizontal-light.svg", 250, 540, h=24, bg=(255, 255, 255, 255))
S.save(os.path.join(HERE, "preview_ko.png"))

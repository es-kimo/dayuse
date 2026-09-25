"""BR-06: SNS profile, OG images and the repo-shaped brand asset folder, built from the v1.1 brand pack."""
import os, re, shutil, io
import cairosvg
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "dayuse-brand-v1.1")
PS = os.path.join(SRC, "production/svg")
OUT = os.path.join(HERE, "dayuse-br06"); shutil.rmtree(OUT, ignore_errors=True)
BRAND = os.path.join(OUT, "frontend/public/assets/brand"); os.makedirs(BRAND)
BLUE, INK, NIGHT, CARD, WHITE, PAGE = "#2563EB", "#1E293B", "#020617", "#0F172A", "#FFFFFF", "#F8FAFC"

def read(rel): return open(os.path.join(PS, rel)).read()
def nest(svg, x, y, w=None, h=None):
    """Embed an existing SVG file as a positioned nested <svg> (keeps its own viewBox)."""
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1); vx, vy, vw, vh = map(float, vb.split())
    if w is None: w = h * vw / vh
    if h is None: h = w * vh / vw
    inner = svg[svg.index(">") + 1: svg.rindex("</svg>")]
    return f'<svg x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" viewBox="{vb}">{inner}</svg>', w, h

def save(name, svg, w, h, png=True):
    p = os.path.join(BRAND, name + ".svg"); open(p, "w").write(svg)
    if png: cairosvg.svg2png(url=p, write_to=os.path.join(BRAND, name + ".png"), output_width=w, output_height=h)
    return p

# ---------- 1. logo files at the paths the issue names ----------
def copy_logo(src_rel, name, png_h):
    s = read(src_rel); open(os.path.join(BRAND, name + ".svg"), "w").write(s)
    cairosvg.svg2png(url=os.path.join(PS, src_rel), write_to=os.path.join(BRAND, name + ".png"), output_height=png_h)

copy_logo("symbol/symbol-light.svg", "symbol", 512)                                  # 1:1, transparent
copy_logo("logo-ko/wordmark-ko-light.svg", "wordmark", 96)                            # 데이유즈 (기본)
copy_logo("logo-ko/logo-horizontal-ko-light.svg", "logo-combination", 96)             # 기본 메인 로고
copy_logo("logo-ko/logo-horizontal-ko-dark.svg", "logo-combination-dark", 96)
copy_logo("logo-ko/logo-vertical-ko-light.svg", "logo-combination-vertical", 256)
copy_logo("logo-en/logotype-light.svg", "logo-en", 96)                                # 영문이 필요할 때
copy_logo("logo-en/logotype-dark.svg", "logo-en-dark", 96)
os.makedirs(os.path.join(BRAND, "expressions"), exist_ok=True)
for e in ("default", "done", "cheer", "rest"):
    for c in ("blue", "white"):
        shutil.copy(os.path.join(PS, f"expressions/dayu-{e}-{c}.svg"), os.path.join(BRAND, f"expressions/dayu-{e}-{c}.svg"))

# ---------- 2. SNS profile (1:1, circle-crop safe) ----------
def profile(bg, mark_rel, size=1024):
    m, w, h = nest(read(mark_rel), 0, 0, h=size * 0.5)
    x = (size - w) / 2 - size * 0.012; y = (size - h) / 2 + size * 0.01       # optical centre: arm pulls weight right/up
    m, _, _ = nest(read(mark_rel), x, y, h=size * 0.5)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}"><rect width="{size}" height="{size}" fill="{bg}"/>{m}</svg>'
p = save("sns-profile", profile(BLUE, "symbol/symbol-mono-white.svg"), 1024, 1024)
cairosvg.svg2png(url=p, write_to=os.path.join(BRAND, "sns-profile-512.png"), output_width=512, output_height=512)
os.rename(os.path.join(BRAND, "sns-profile.png"), os.path.join(BRAND, "sns-profile-1024.png"))
p = save("sns-profile-white", profile(WHITE, "symbol/symbol-light.svg"), 1024, 1024)
cairosvg.svg2png(url=p, write_to=os.path.join(BRAND, "sns-profile-white-512.png"), output_width=512, output_height=512)
os.rename(os.path.join(BRAND, "sns-profile-white.png"), os.path.join(BRAND, "sns-profile-white-1024.png"))

# ---------- 3. OG images 1200x630 ----------
FONT = "Pretendard"
def og(bg, logo_rel, head, sub, head_c, sub_c, panel_c, dayu_rel, foot_c):
    logo, lw, lh = nest(read(logo_rel), 88, 104, h=78)
    # Dayu stands on the bottom edge of the right panel, slightly cropped — like peeking into the link preview
    dayu, dw, dh = nest(read(dayu_rel), 0, 0, h=370)
    dayu, _, _ = nest(read(dayu_rel), 800 + (400 - dw) / 2 - 8, 630 - dh + 40, h=370)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">'
            f'<rect width="1200" height="630" fill="{bg}"/><rect x="800" width="400" height="630" fill="{panel_c}"/>{dayu}{logo}'
            f'<text x="88" y="344" font-family="{FONT}" font-weight="800" font-size="60" letter-spacing="-1.8" fill="{head_c}">{head}</text>'
            f'<text x="90" y="404" font-family="{FONT}" font-weight="400" font-size="28" fill="{sub_c}">{sub}</text>'
            f'<text x="90" y="548" font-family="{FONT}" font-weight="600" font-size="22" fill="{foot_c}">dayuse.kr</text></svg>')
save("og-default", og(PAGE, "logo-ko/logo-horizontal-ko-light.svg", "목표는 각자, 꾸준함은 함께.",
                       "친구들과 각자의 챌린지를 인증하고 기록해요.", INK, "#475569", BLUE,
                       "expressions/dayu-cheer-white.svg", "#64748B"), 1200, 630)
save("og-share", og(NIGHT, "logo-ko/logo-horizontal-ko-dark.svg", "오늘도 해냈어요!",
                     "친구의 챌린지 기록을 데이유즈에서 확인해 보세요.", WHITE, "#CBD5E1", BLUE,
                     "expressions/dayu-done-white.svg", "#94A3B8"), 1200, 630)

# ---------- 4. design source (what the production files are exported from) ----------
DS = os.path.join(OUT, "design/brand"); os.makedirs(DS)
shutil.copytree(os.path.join(SRC, "source"), os.path.join(DS, "source"))
shutil.copytree(os.path.join(SRC, "tokens"), os.path.join(DS, "tokens"))
shutil.copy(os.path.join(SRC, "COPY-GUIDE.md"), os.path.join(DS, "COPY-GUIDE.md"))
shutil.copy(os.path.join(SRC, "LICENSES.md"), os.path.join(DS, "LICENSES.md"))
shutil.copy(os.path.abspath(__file__), os.path.join(DS, "source/build_br06.py"))
for f in sorted(os.listdir(BRAND)): print(f)

# preview sheet
S = Image.new("RGB", (1240, 1020), (226, 232, 240))
for i, (n, x, y, w) in enumerate([("og-default.png", 20, 20, 600), ("og-share.png", 620, 20, 600),
                                   ("sns-profile-512.png", 20, 360, 280), ("sns-profile-white-512.png", 320, 360, 280)]):
    im = Image.open(os.path.join(BRAND, n)).convert("RGB"); im = im.resize((w, int(im.height * w / im.width))); S.paste(im, (x, y))
# circle-crop check
im = Image.open(os.path.join(BRAND, "sns-profile-512.png")).convert("RGBA").resize((280, 280))
mask = Image.new("L", (280, 280), 0)
from PIL import ImageDraw
ImageDraw.Draw(mask).ellipse((0, 0, 279, 279), fill=255)
S.paste(im, (640, 360), mask)
S.save(os.path.join(HERE, "preview_br06.png"))

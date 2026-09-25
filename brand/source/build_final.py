"""Final pack per logo policy:
  default main logo  = Dayu + '데이유즈' (Pretendard ExtraBold, outlined)   → production/svg/logo-ko/
  when English needed = custom 'dayuse' logotype (d = Dayu)                 → production/svg/logo-en/
Removes: Pretendard 'dayuse' lockups/wordmarks, bilingual lockup, experimental Hangul logotypes."""
import os, io, sys, shutil, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen6_ko as ko          # rebuilds symbol/expressions/app-icons/web + EN & KO lockups
import gen7 as en             # custom English logotype geometry
b = ko.b; g = ko.g
import cairosvg

OUT = b.OUT; P = os.path.join(OUT, "production")
def rm(pattern):
    for f in glob.glob(os.path.join(OUT, pattern)):
        os.remove(f) if os.path.isfile(f) else shutil.rmtree(f)

# ---- remove what the policy drops ----
for t in b.THEMES:
    rm(f"production/svg/combination/logo-horizontal-{t}.svg"); rm(f"production/svg/combination/logo-vertical-{t}.svg")
    rm(f"production/svg/combination/logo-bilingual-{t}.svg"); rm(f"production/svg/wordmark/wordmark-{t}.svg")
    rm(f"production/png/combination/logo-horizontal-{t}-*.png"); rm(f"production/png/combination/logo-vertical-{t}-*.png")
    rm(f"production/png/combination/logo-bilingual-{t}-*.png"); rm(f"production/png/wordmark/wordmark-{t}-*.png")
rm("production/svg/wordmark/wordmark-blue.svg"); rm("production/svg/wordmark.svg"); rm("production/svg/logo-combination.svg")

# ---- Korean main logo → logo-ko/ ----
os.makedirs(f"{P}/svg/logo-ko", exist_ok=True); os.makedirs(f"{P}/png/logo-ko", exist_ok=True)
for f in glob.glob(f"{P}/svg/combination/*-ko-*.svg") + glob.glob(f"{P}/svg/wordmark/wordmark-ko-*.svg"):
    shutil.move(f, f"{P}/svg/logo-ko/")
for f in glob.glob(f"{P}/png/combination/*-ko-*.png") + glob.glob(f"{P}/png/wordmark/wordmark-ko-*.png"):
    shutil.move(f, f"{P}/png/logo-ko/")
for d in ("svg/combination", "svg/wordmark", "png/combination", "png/wordmark"):
    shutil.rmtree(f"{P}/{d}", ignore_errors=True)

# ---- English logotype → logo-en/ ----
os.makedirs(f"{P}/svg/logo-en", exist_ok=True); os.makedirs(f"{P}/png/logo-en", exist_ok=True)
V = {"light": (b.BLUE, b.INK), "dark": (b.BLUE, b.WHITE), "mono-black": (b.INK, b.INK), "mono-white": (b.WHITE, b.WHITE), "blue": (b.BLUE, b.BLUE)}
for n, (dc, rc) in V.items():
    open(f"{P}/svg/logo-en/logotype-{n}.svg", "w").write(en.logo_svg(dc, rc))
for e in ("done", "cheer", "rest"):
    open(f"{P}/svg/logo-en/logotype-{e}.svg", "w").write(en.logo_svg(b.BLUE, b.INK, expr=e))
for f in glob.glob(f"{P}/svg/logo-en/*.svg"):
    n = os.path.basename(f)[:-4]
    for h in (48, 96, 192):
        cairosvg.svg2png(url=f, write_to=f"{P}/png/logo-en/{n}-h{h}.png", output_height=h)

# ---- default names ----
shutil.copy(f"{P}/svg/logo-ko/logo-horizontal-ko-light.svg", f"{P}/svg/logo.svg")        # 기본 메인 로고
shutil.copy(f"{P}/svg/logo-en/logotype-light.svg", f"{P}/svg/logo-en.svg")                # 영문이 필요할 때

# ---- OG image with the Korean main logo ----
hz = ko.horizontal_ko(b.BLUE, b.INK); inner = hz[hz.index(">") + 1: hz.rindex("</svg>")]
og = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630"><rect width="1200" height="630" fill="#F8FAFC"/>'
      f'<g transform="translate(120 140) scale(1.5)">{inner}</g>'
      f'<text x="120" y="440" font-family="Pretendard" font-weight="700" font-size="56" fill="{b.INK}" letter-spacing="-1">목표는 각자, 꾸준함은 함께.</text>'
      f'<text x="120" y="505" font-family="Pretendard" font-weight="400" font-size="30" fill="#475569">친구들과 각자의 챌린지를 인증하고 기록해요.</text></svg>')
open(f"{P}/web/og-image.svg", "w").write(og)
cairosvg.svg2png(url=f"{P}/web/og-image.svg", write_to=f"{P}/web/og-image.png", output_width=1200, output_height=630)

# ---- editable master: KO lockups + EN logotype + expressions ----
def inn(svg): return svg[svg.index(">") + 1: svg.rindex("</svg>")]
rows, y = [], 0
for t, (mc, wc, bg) in b.THEMES.items():
    dc, rc = V[t]
    ex0 = en.X0; ey0 = en.Y0
    rows.append(f'<g id="{t}" transform="translate(0 {y})"><rect id="{t}-bg" width="1600" height="320" fill="{bg}"/>'
                f'<g id="{t}-symbol" transform="translate(40 60) scale(3)">{inn(b.symbol(mc))}</g>'
                f'<g id="{t}-logo-ko-horizontal" transform="translate(280 110)">{inn(ko.horizontal_ko(mc, wc))}</g>'
                f'<g id="{t}-logo-ko-vertical" transform="translate(720 20) scale(0.95)">{inn(ko.vertical_ko(mc, wc))}</g>'
                f'<g id="{t}-logo-en-logotype" transform="translate(1040 110) translate({-ex0:.2f} {-ey0:.2f})">{inn(en.logo_svg(dc, rc))}</g></g>')
    y += 320
ex = "".join(f'<g id="expr-{e}" transform="translate({40 + i * 240} {y + 40}) scale(3)">{inn(b.symbol(b.BLUE, e))}</g>' for i, e in enumerate(b.EXPRS))
open(f"{OUT}/source/dayuse-logo-master.svg", "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 {y + 280}" width="1600" height="{y + 280}">'
    f'<!-- dayuse logo master v1.1 · main = Dayu + 데이유즈 (Pretendard ExtraBold, outlined) · English = custom dayuse logotype (d = Dayu, no font) · '
    f'Blue #2563EB · Ink #1E293B --><rect y="{y}" width="1600" height="280" fill="#FFFFFF"/>' + "".join(rows) + ex + "</svg>")

# ---- sources ----
shutil.copy(os.path.join(ko.HERE, "gen6_ko.py"), f"{OUT}/source/build_ko.py")
shutil.copy(os.path.join(ko.HERE, "gen7.py"), f"{OUT}/source/build_logotype_en.py")
shutil.copy(os.path.join(ko.HERE, "v7/logotype-construction.svg"), f"{OUT}/source/logotype-en-construction.svg")
shutil.copy(os.path.abspath(__file__), f"{OUT}/source/build_final.py")
print("done")

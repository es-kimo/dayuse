"""Additional OG images (1200x630): og-invite, og-expired. Same grid as og-default / og-share."""
import os, re
import cairosvg

HERE = os.path.dirname(os.path.abspath(__file__))
PS = os.path.join(HERE, "dayuse-brand-v1.1/production/svg")
BRAND = os.path.join(HERE, "dayuse-br06/frontend/public/assets/brand")
BLUE, INK, PAGE, SUB = "#2563EB", "#1E293B", "#F8FAFC", "#475569"

def read(rel): return open(os.path.join(PS, rel)).read()
def nest(svg, x, y, h):
    vb = re.search(r'viewBox="([^"]+)"', svg).group(1); _, _, vw, vh = map(float, vb.split())
    w = h * vw / vh
    return f'<svg x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" viewBox="{vb}">{svg[svg.index(">") + 1: svg.rindex("</svg>")]}</svg>', w

def text_block(head, sub):
    logo, _ = nest(read("logo-ko/logo-horizontal-ko-light.svg"), 88, 104, 78)
    return (logo +
            f'<text x="88" y="344" font-family="Pretendard" font-weight="800" font-size="60" letter-spacing="-1.8" fill="{INK}">{head}</text>'
            f'<text x="90" y="404" font-family="Pretendard" font-weight="400" font-size="28" fill="{SUB}">{sub}</text>'
            f'<text x="90" y="548" font-family="Pretendard" font-weight="600" font-size="22" fill="#64748B">dayuse.kr</text>')

# ---- og-invite: Dayu pops out of an invitation envelope ----
def invite():
    px, pw = 800, 400
    env_w, env_h = 300, 190; ex = px + (pw - env_w) / 2; ey = 630 - env_h - 58
    dayu, dw = nest(read("expressions/dayu-cheer-blue.svg"), 0, 0, 250)
    dayu, _ = nest(read("expressions/dayu-cheer-blue.svg"), px + (pw - dw) / 2 - 6, ey - 150, 250)
    back = f'<rect x="{ex}" y="{ey}" width="{env_w}" height="{env_h}" rx="20" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="4"/>'
    # front pocket covers Dayu's lower half; the V flap line gives the envelope read
    pocket_top = ey + 70
    front = (f'<path d="M{ex} {pocket_top} L{ex + env_w / 2} {pocket_top + 62} L{ex + env_w} {pocket_top} '
             f'L{ex + env_w} {ey + env_h - 20} Q{ex + env_w} {ey + env_h} {ex + env_w - 20} {ey + env_h} '
             f'L{ex + 20} {ey + env_h} Q{ex} {ey + env_h} {ex} {ey + env_h - 20} Z" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="4" stroke-linejoin="round"/>')
    label = (f'<text x="{ex + env_w / 2}" y="{ey + env_h - 34}" text-anchor="middle" font-family="Pretendard" font-weight="700" '
             f'font-size="24" letter-spacing="2" fill="{BLUE}">초대장</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">'
            f'<rect width="1200" height="630" fill="{PAGE}"/><rect x="{px}" width="{pw}" height="630" fill="#EFF6FF"/>'
            f'{back}{dayu}{front}{label}'
            + text_block("모임 초대장이 도착했어요", "친구들과 각자의 챌린지를 함께 시작해요.") + "</svg>")

# ---- og-expired: resting Dayu, calm, no blame ----
def expired():
    px, pw = 800, 400
    dayu, dw = nest(read("expressions/dayu-rest-blue.svg"), 0, 0, 300)
    dayu, _ = nest(read("expressions/dayu-rest-blue.svg"), px + (pw - dw) / 2 - 8, 630 - 300 + 34, 300)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">'
            f'<rect width="1200" height="630" fill="{PAGE}"/><rect x="{px}" width="{pw}" height="630" fill="#F1F5F9"/>{dayu}'
            + text_block("없거나 만료된 링크예요", "데이유즈에서 친구들과 챌린지를 새로 시작해 보세요.") + "</svg>")

for name, svg in (("og-invite", invite()), ("og-expired", expired())):
    p = os.path.join(BRAND, name + ".svg"); open(p, "w").write(svg)
    cairosvg.svg2png(url=p, write_to=os.path.join(BRAND, name + ".png"), output_width=1200, output_height=630)
    print(name)

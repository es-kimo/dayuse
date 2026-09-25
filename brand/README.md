# dayuse 브랜드 자산 v1.0 — BR-01 · BR-02

목표는 각자, 꾸준함은 함께.

심볼 **데이유(Dayu)** — 손을 들어 올린 d. 둥근 얼굴은 하루, 들어 올린 팔(d의 기둥)은 "오늘 했어요!"의 인증, 위를 보는 눈은 각자의 목표.

## 폴더

```
production/            실제 서비스에 쓰는 파일
  svg/symbol.svg · wordmark.svg · logo-combination.svg   ← 기본(Light) 이름
  svg/symbol/          심볼 (+ symbol-small: 24px 이하 전용, 입 생략·눈 확대)
  svg/wordmark/        워드마크 dayuse (wordmark-*) · 데이유즈 (wordmark-ko-*) · 각 blue 버전
  svg/combination/     logo-horizontal-* · logo-vertical-*          (영문)
                       logo-horizontal-ko-* · logo-vertical-ko-*    (한글)
                       logo-bilingual-*                             (dayuse + 데이유즈 병기)
  svg/expressions/     dayu-{default|done|cheer|rest}-{blue|ink|white}
  svg/app-icon/        app-icon · -white · -small · -fullbleed · -maskable
  png/                 투명 배경 PNG (심볼 16–1024, 로고 h48–512, 표정 128–512)
  web/                 favicon.ico(16–64) · favicon.svg · apple-touch-icon · icon-192/512 · maskable · og-image
source/                편집용 원본
  dayuse-logo-master.svg   전 버전·표정이 id 그룹으로 정리된 원본 (Figma/Illustrator)
  dayu-construction.svg    64 그리드 구성도
  geometry.py · build.py · build_ko.py   수치를 바꾸면 전체 파일을 다시 생성 (build_ko.py가 영문 → 한글 순서로 전체 빌드)
tokens/                BR-02 디자인 토큰
  tokens.json · tokens.css · tailwind.preset.js (v3) · theme.css (v4)
COPY-GUIDE.md          문구 가이드
LICENSES.md            서체·자산 라이선스
```

## 영문 · 한글 표기

표기는 아직 확정 전이라 세 가지를 모두 준비했어요. 심볼·색·배치 규칙은 같고 글자만 바뀌어요.

| 버전 | 파일 | 어울리는 곳 |
|---|---|---|
| 영문 `dayuse` | logo-horizontal-* · logo-vertical-* | 서비스 헤더, 도메인·URL과 함께 쓰는 곳, 해외 노출 |
| 한글 `데이유즈` | logo-horizontal-ko-* · logo-vertical-ko-* | 국내 마케팅, 카카오톡 공유·채널, 오프라인 인쇄물 |
| 병기 | logo-bilingual-* | 앱스토어, 보도자료, 첫 노출 — 읽는 법을 함께 알려줄 때 |

- 한글 워드마크: Pretendard ExtraBold, 자간 −4%, 아웃라인. 글자 높이를 영문 `d`의 높이(어센더)에 맞춰 같은 무게로 보이게 했어요.
- 한 화면·한 매체 안에서는 영문과 한글 로고를 섞지 않아요. 병기가 필요하면 bilingual 버전을 써요.
- 최소 크기: 한글 수평 20px, 한글 수직 64px, 병기 28px.

테마: `light`(파란 심볼 + Ink 글자) · `dark`(파란 심볼 + 흰 글자, 외부 어두운 배너용 — 서비스 다크 모드 아님) · `mono-black`(Ink 단색) · `mono-white`(흰 단색, 파란색·사진 위).

## 로고 사용 기준

| 항목 | 기준 |
|---|---|
| 여백 | X = 데이유 얼굴(원) 지름의 1/2. 로고 사방 X 이상 비움 |
| 최소 크기 · 심볼 | 16px (24px 이하 symbol-small / app-icon-small) · 인쇄 5mm |
| 최소 크기 · 수평 조합 | 높이 20px (모바일 헤더 24–28px 권장) · 인쇄 6mm |
| 최소 크기 · 수직 조합 | 높이 64px · 인쇄 18mm |
| 워드마크 단독 | 높이 14px · 심볼이 같은 화면에 이미 있을 때만 |
| 표정 | 몸 형태는 고정, 얼굴만 교체. 슬프거나 화난 표정은 만들지 않음 |

하지 않기: 비율 변형·회전(팔 기울기는 고정), 그라디언트·그림자·빛 번짐, 지정 외 색, 얼굴 임의 추가(볼터치·눈썹 등), 심볼과 워드마크 순서·간격 변경, 파란 배경 위 파란 심볼.

## 웹 적용

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:image" content="/og-image.png">
```

`production/web/*` → `public/`. PWA manifest: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`(purpose: "maskable"), `theme_color: "#2563EB"`, `background_color: "#F8FAFC"`.

## 디자인 토큰 요약 (BR-02)

- Primary `#2563EB` (흰 글자 5.17:1) · hover `#1D4ED8` · subtle `#EFF6FF`
- Page `#F8FAFC` · Card `#FFFFFF` · Sunken `#F1F5F9` · Border `#E2E8F0` / strong `#CBD5E1`
- Text `#1E293B` 14.6:1 · secondary `#475569` 7.6:1 · muted `#64748B` 4.76:1 (텍스트 최저선)
- Success `#047857` · Warning `#B45309` · Danger `#B91C1C` (모두 흰 배경 5:1 이상), 아이콘은 한 단계 밝은 600
- Pretendard · display 32 / title 24·20·17 / body 16·14 / caption 13 / label 12
- Radius 8·12(버튼·입력)·16(카드)·20·24(시트) · Space 4pt · 카드는 그림자 대신 1px 테두리

### 현재 UI에서 고칠 것

1. 흐린 보조 글자 `slate-400`(2.56:1) → `slate-500`(4.76:1). placeholder 포함.
2. 경고 버튼 `amber-600` 배경 + 흰 글자(3.19:1) → `amber-700`(5.02:1).
3. 완료 텍스트 `emerald-600`(3.77:1) → `emerald-700`(5.48:1). 아이콘은 600 유지.
4. 로그인 로고 아래 파란 빛 번짐 그림자 제거.
5. 로고 3종(반짝임 타일, 글자 로고, D 타일) → 데이유로 통일.

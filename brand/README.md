# 데이유즈 브랜드 자산 v1.1 — BR-01 · BR-02

목표는 각자, 꾸준함은 함께.

심볼 **데이유(Dayu)** — 손을 들어 올린 d. 둥근 얼굴은 하루, 들어 올린 팔(d의 기둥)은 "오늘 했어요!"의 인증, 위를 보는 눈은 각자의 목표.

## 로고 정책

| 구분 | 로고 | 파일 |
|---|---|---|
| **기본 메인 로고** | 데이유 + `데이유즈` (한글 조합형) | `production/svg/logo.svg` = `logo-ko/logo-horizontal-ko-light.svg` |
| 세로 공간 | 데이유 위 + `데이유즈` 아래 | `logo-ko/logo-vertical-ko-*` |
| **영문이 필요할 때** | `dayuse` 로고타입 (d 자리가 데이유) | `production/svg/logo-en.svg` = `logo-en/logotype-light.svg` |
| 작은 자리 | 데이유 심볼 · 앱 아이콘 | `symbol/` · `app-icon/` |

- 국내 서비스·마케팅·공유 카드·로그인 등 **기본은 한글 조합형**이에요.
- 영문 로고타입은 도메인·URL과 함께 쓰는 곳, 해외 노출, 영문 문서처럼 **영문 표기가 꼭 필요할 때만** 써요.
- 한 화면·한 매체 안에서 한글 로고와 영문 로고를 섞지 않아요.
- 본문에서 서비스명을 글자로 쓸 때도 로고와 같은 표기를 따라요 (한글 `데이유즈`, 영문은 소문자 `dayuse`).

## 폴더

```
production/
  svg/logo.svg            기본 메인 로고 (한글 조합형 · Light)
  svg/logo-en.svg         영문 로고타입 (Light)
  svg/symbol.svg          심볼 (Light)
  svg/logo-ko/            logo-horizontal-ko-* · logo-vertical-ko-* · wordmark-ko-*
  svg/logo-en/            logotype-{light,dark,mono-black,mono-white,blue} · logotype-{done,cheer,rest}
  svg/symbol/             심볼 (+ symbol-small: 24px 이하 전용, 입 생략·눈 확대)
  svg/expressions/        dayu-{default|done|cheer|rest}-{blue|ink|white}
  svg/app-icon/           app-icon · -white · -small · -fullbleed · -maskable
  png/                    같은 구성의 투명 배경 PNG
  web/                    favicon.ico(16–64) · favicon.svg · apple-touch-icon · icon-192/512 · maskable · og-image(한글 로고)
source/
  dayuse-logo-master.svg       심볼 · 한글 조합형(수평/수직) · 영문 로고타입 · 표정 — 테마별 id 그룹 원본
  dayu-construction.svg        데이유 64 그리드 구성도
  logotype-en-construction.svg 영문 로고타입 구성도 (얼굴 크기 원 · 팔 기울기 7.9°)
  geometry.py · build.py · build_ko.py · build_logotype_en.py · build_final.py   수치 수정 → build_final.py로 전체 재생성
tokens/                        tokens.json · tokens.css · tailwind.preset.js (v3) · theme.css (v4)
COPY-GUIDE.md · LICENSES.md
```

테마: `light`(파란 심볼 + Ink 글자) · `dark`(파란 심볼 + 흰 글자, 외부 어두운 배너용 — 서비스 다크 모드 아님) · `mono-black`(Ink 단색) · `mono-white`(흰 단색, 파란색·사진 위).

## 로고 사용 기준

| 항목 | 기준 |
|---|---|
| 여백 | X = 데이유 얼굴(원)의 반지름 (심볼 높이의 약 35%). 로고 사방 X 이상 비움 |
| 최소 크기 · 심볼 | 16px (24px 이하 symbol-small / app-icon-small) · 인쇄 5mm |
| 최소 크기 · 한글 수평 | 높이 20px (모바일 헤더 24–28px 권장) · 인쇄 6mm |
| 최소 크기 · 한글 수직 | 높이 64px · 인쇄 18mm |
| 최소 크기 · 영문 로고타입 | 높이 16px · 그보다 작으면 심볼만 |
| 한글 워드마크 단독 | 높이 14px · 심볼이 같은 화면에 이미 있을 때만 |
| 표정 | 몸 형태는 고정, 얼굴만 교체. 슬프거나 화난 표정은 만들지 않음 |

한글 조합형: 워드마크는 Pretendard ExtraBold, 자간 −4%, 아웃라인. 글자 높이를 데이유 팔 끝 기준선에 맞췄어요.
영문 로고타입: 서체 없이 직접 그림. a·e의 원은 데이유 얼굴 크기, 모든 세로획은 팔과 같은 7.9° 기울기, 끝은 둥글게.

하지 않기: 비율 변형·회전(팔 기울기 고정), 그라디언트·그림자·빛 번짐, 지정 외 색, 얼굴 임의 추가, 심볼과 글자 순서·간격 변경, 파란 배경 위 파란 심볼, 한글·영문 로고 섞어 쓰기.

## 웹 적용

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:image" content="/og-image.png">
```

`production/web/*` → `public/`. PWA manifest: `name: "데이유즈"`, `short_name: "데이유즈"`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`(purpose: "maskable"), `theme_color: "#2563EB"`, `background_color: "#F8FAFC"`.

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
5. 로고 3종(반짝임 타일, 글자 로고, D 타일) → 헤더·로그인·초대는 한글 조합형, 공유 카드·파비콘은 데이유로 통일.

# 데이유즈 브랜드 가이드

> 데이유즈(dayuse)의 로고·색·서체·문구·자산 위치를 한 문서에 모았어요. 디자이너 없이도 이 문서만 보고 같은 결과를 낼 수 있는 게 목표예요.
> 버전 1.1 · 대상 이슈 BR-01 · BR-02 · BR-06

## 목차

1. [브랜드 개요](#1-브랜드-개요)
2. [이름 표기](#2-이름-표기)
3. [로고](#3-로고)
4. [색상](#4-색상)
5. [타이포그래피](#5-타이포그래피)
6. [모양 · 간격 · 컴포넌트](#6-모양--간격--컴포넌트)
7. [보이스 앤 톤](#7-보이스-앤-톤)
8. [외부 채널 · 공유 자산](#8-외부-채널--공유-자산)
9. [공개 공유 카드 (v0.2) 브랜딩 기준](#9-공개-공유-카드-v02-브랜딩-기준)
10. [파일 위치 인덱스](#10-파일-위치-인덱스)
11. [라이선스 · 남은 확인](#11-라이선스--남은-확인)

---

## 1. 브랜드 개요

| 항목 | 내용 |
|---|---|
| 서비스 | 친구들과 각자의 챌린지를 인증하고 기록하는 소모임 챌린지·정산 서비스 |
| 대표 문구 | **목표는 각자, 꾸준함은 함께.** |
| 설명 문구 | 친구들과 각자의 챌린지를 인증하고 기록해요. |
| 성격 | 다정하지만 담백하게. 응원은 하되 재촉·비난은 하지 않아요. |
| 심볼 | **데이유(Dayu)** — 손을 들어 올린 d. 둥근 얼굴은 하루, 들어 올린 팔은 “오늘 했어요!”의 인증, 위를 보는 눈은 각자의 목표 |

## 2. 이름 표기

| 상황 | 표기 | 예 |
|---|---|---|
| **기본 (국내·서비스 안)** | `데이유즈` | 데이유즈에서 친구들과 챌린지를 시작해요 |
| 영문이 필요할 때 | `dayuse` (항상 소문자) | dayuse.kr · Join dayuse |
| 심볼 이름 | `데이유` / `Dayu` | 데이유가 응원해요 |

- 쓰지 않는 표기: `Dayuse`, `DAYUSE`, `DayUse`, `데이유스`, `데이 유즈`(띄어쓰기).
- 문장 맨 앞이어도 영문은 소문자 `dayuse`를 유지해요.
- 한 화면·한 문서 안에서는 한 가지 표기만 써요. 로고가 한글이면 본문도 `데이유즈`.

## 3. 로고

### 3.1 로고 정책

| 구분 | 로고 | 파일 |
|---|---|---|
| **기본 메인 로고** | 데이유 + `데이유즈` (한글 조합형) | `assets/brand/logo-combination.svg` |
| 세로 공간 | 데이유 위 + `데이유즈` 아래 | `assets/brand/logo-combination-vertical.svg` |
| 영문이 필요할 때 | `dayuse` 로고타입 (d 자리가 데이유) | `assets/brand/logo-en.svg` |
| 작은 자리 | 데이유 심볼 | `assets/brand/symbol.svg` |
| 한글 글자만 | `데이유즈` 워드마크 (심볼이 같은 화면에 이미 있을 때만) | `assets/brand/wordmark.svg` |

> `assets/brand/` = `frontend/public/assets/brand/`. 코드에서는 `/assets/brand/logo-combination.svg`로 불러요.

**어디에 무엇을**

| 자리 | 쓰는 로고 |
|---|---|
| 서비스 헤더 (높이 24–28px) | 기본 메인 로고 |
| 로그인 · 초대 첫 화면 · 스플래시 | 세로 조합형 (120px 이상) |
| 공개 공유 카드 | 기본 메인 로고 Dark (`logo-combination-dark.svg`) |
| 파비콘 · 앱 아이콘 · 푸시 알림 · SNS 프로필 | 심볼 / 앱 아이콘 |
| 도메인과 함께 · 해외 · 영문 문서 | 영문 로고타입 |

### 3.2 배경별 버전

| 테마 | 구성 | 쓰는 곳 |
|---|---|---|
| Light | 심볼 Blue `#2563EB` + 글자 Ink `#1E293B` | 흰색·밝은 배경 (기본) |
| Dark | 심볼 Blue + 글자 White | 공유 카드, 외부 어두운 배너 (서비스 다크 모드 아님) |
| Mono Black | Ink 한 가지 색, 얼굴은 투명 | 흑백 인쇄, 파트너 로고 나열 |
| Mono White | White 한 가지 색, 얼굴은 투명 | 파란색·사진 위 |

전체 테마 파일은 `design/brand/`의 원본에서 내보내요 (10장 참고).

### 3.3 여백 (Clear space)

- **X = 데이유 얼굴(원)의 반지름** — 심볼 높이의 약 35%.
- 로고 사방으로 X만큼은 다른 글자·이미지·화면 가장자리를 두지 않아요.
- 예: 헤더 로고 높이 26px → 여백 약 9px.

### 3.4 최소 크기

| 로고 | 디지털 | 인쇄 |
|---|---|---|
| 심볼 | 16px (24px 이하는 small 버전) | 5mm |
| 기본 메인 로고 (수평) | 높이 20px | 6mm |
| 세로 조합형 | 높이 64px | 18mm |
| 영문 로고타입 | 높이 16px | 5mm |
| 한글 워드마크 단독 | 높이 14px | 4mm |

### 3.5 하지 않기

- 비율을 늘이거나 줄이기, 회전하기, 팔 각도 바꾸기
- 그라디언트 · 그림자 · 빛 번짐 넣기
- 지정 외 색 쓰기, 파란 배경 위에 파란 심볼 올리기
- 얼굴에 볼터치·눈썹 등 요소 추가하기
- 심볼과 글자의 순서·간격 바꾸기
- 한 화면에서 한글 로고와 영문 로고 섞어 쓰기

### 3.6 표정

몸의 형태는 고정하고 얼굴만 바꿔요. 슬프거나 화난 표정은 만들지 않아요.

| 표정 | 파일 | 쓰는 곳 |
|---|---|---|
| 기본 | `expressions/dayu-default-*.svg` | 로고, 홈, 로딩 |
| 해냈어요 | `expressions/dayu-done-*.svg` | 인증 완료, 연속 기록, 공유 카드 |
| 응원해요 | `expressions/dayu-cheer-*.svg` | 친구 응원, OG 이미지 |
| 쉬어가요 | `expressions/dayu-rest-*.svg` | 미인증, 빈 화면 |

한 화면에 표정 데이유는 하나만, 64px 이상으로 써요.

## 4. 색상

### 4.1 팔레트

Tailwind 토큰 이름은 `design/brand/tokens/tailwind.preset.js`(v3) · `theme.css`(v4)와 같아요.

| 역할 | HEX | Tailwind | 용도 | 흰 배경 대비 |
|---|---|---|---|---|
| Primary | `#2563EB` | `primary` | 로고, 주 버튼, 활성 탭, 링크 | 5.17 |
| Primary hover | `#1D4ED8` | `primary-hover` | 버튼 hover | 6.70 |
| Primary active | `#1E40AF` | `primary-active` | 버튼 pressed | — |
| Primary subtle | `#EFF6FF` | `primary-subtle` | 아이콘 배경, 정보 박스 | — |
| Primary muted | `#DBEAFE` | `primary-muted` | 포커스 링, 선택 배경 | — |
| Night | `#020617` | `night` | 공유 카드·외부 어두운 배너 전용 | — |
| Page | `#F8FAFC` | `page` | 화면 배경 | — |
| Card | `#FFFFFF` | `card` | 카드, 시트 | — |
| Sunken | `#F1F5F9` | `sunken` | 보조 버튼, 읽기 전용 칸 | — |
| Line | `#E2E8F0` | `line` | 카드 테두리, 구분선 | — |
| Line strong | `#CBD5E1` | `line-strong` | 입력창·외곽선 버튼 | — |
| Ink | `#1E293B` | `ink` | 제목, 본문 | 14.63 |
| Ink secondary | `#475569` | `ink-secondary` | 설명 | 7.58 |
| Ink muted | `#64748B` | `ink-muted` | 메타, placeholder (텍스트 최저선) | 4.76 |
| Ink disabled | `#94A3B8` | `ink-disabled` | 비활성 컨트롤만 | 2.56 ✕ |
| Success | `#047857` / 아이콘 `#059669` | `success` / `success-icon` | 완료 | 5.48 |
| Warning | `#B45309` / 아이콘 `#D97706` | `warning` / `warning-icon` | 인증 대기, 주의 | 5.02 |
| Danger | `#B91C1C` / 아이콘 `#DC2626` | `danger` / `danger-icon` | 미인증, 오류 | 6.47 |
| Streak | `#F59E0B` | `streak` | 연속 기록 불꽃 아이콘만 (글자 금지) | — |

각 상태색에는 배경 `*-bg`(50)와 테두리 `*-border`(200)도 있어요.

### 4.2 컬러 페어링

| 글자 / 요소 | 배경 | 대비 | 허용 |
|---|---|---|---|
| White | Primary `#2563EB` | 5.17 | ✓ 버튼 |
| White | Warning `#B45309` | 5.02 | ✓ 경고 버튼 |
| Ink | Page · Card | 14+ | ✓ |
| Ink muted | Card `#FFFFFF` | 4.76 | ✓ |
| Ink muted | Page `#F8FAFC` | 4.55 | ✓ (최저선) |
| Ink muted | Sunken `#F1F5F9` | 4.34 | ✕ → Ink secondary |
| Success / Warning / Danger | 각 `*-bg` | 4.8+ | ✓ 상태 칩 |
| White · `#CBD5E1` | Night `#020617` | 7.8+ | ✓ 공유 카드 |
| Ink disabled | 어디든 | 2.56 | ✕ 읽어야 하는 글자에는 금지 |

- 본문 글자는 4.5:1 이상. 색만으로 상태를 구분하지 않고 아이콘·문장을 함께 써요.
- 그라디언트와 색 있는 그림자(빛 번짐)는 쓰지 않아요.

## 5. 타이포그래피

- 서체: **Pretendard** (한글·영문·숫자 공통, SIL OFL 1.1)
- 스택: `Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`
- 금액·날짜·카운터는 `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`)
- 최소 글자 크기 12px

| 토큰 | 크기/행간 | 굵기 | 자간 | 용도 |
|---|---|---|---|---|
| `display` | 32/40 | 800 | −0.02em | 연속 일수, 큰 결과 숫자 |
| `title-lg` | 24/32 | 700 | −0.02em | 페이지 제목 |
| `title-md` | 20/28 | 700 | −0.01em | 섹션·시트 제목 |
| `title-sm` | 17/24 | 600 | −0.01em | 카드 제목 |
| `body` | 16/24 | 400 (버튼 600) | 0 | 본문, 입력, 버튼 |
| `body-sm` | 14/20 | 400 | 0 | 보조 설명 |
| `caption` | 13/18 | 500 | 0 | 메타, 시간 |
| `label` | 12/16 | 600 | 0 | 상태 칩 |

## 6. 모양 · 간격 · 컴포넌트

| 항목 | 값 |
|---|---|
| 반경 | sm 8 · **md 12** (버튼·입력) · **lg 16** (카드) · xl 20 · 2xl 24 (바텀시트) · full (칩·아바타) |
| 간격 | 4pt 단위 — 화면 좌우 16 · 카드 안쪽 20 · 카드 사이 12 · 섹션 사이 24–32 |
| 테두리 | 카드 1px `line`, 입력창 1px `line-strong` |
| 그림자 | 카드는 없음. 드롭다운 `shadow-sm`, 바텀시트 `shadow-sheet`만 |
| 포커스 | 2px `primary` 테두리 + 4px `primary-muted` 링 |

| 컴포넌트 | 기준 |
|---|---|
| 버튼 | 높이 52(주 CTA) · 44(기본) · 36(작은) / 반경 12 / 16px 600 · 터치 영역 44px 이상 |
| 버튼 종류 | primary · secondary(`sunken`) · dark(`ink`) · outline · warning · disabled(`line` 배경 + `ink-disabled` 글자) |
| 입력창 | 높이 48 / 반경 12 / 좌우 16 / 오류 시 `danger-icon` 테두리 + 아이콘 + `danger` 문장 |
| 카드 | 반경 16 / 안쪽 20 / 1px `line` / 완료 카드는 `success-border` |
| 상태 칩 | 높이 26 / full / `label` / `*-bg` + `*-border` + `*` 글자 |

Tailwind 클래스 조합 예시는 `design/brand/tokens/tailwind.preset.js` 하단 주석에 있어요.

## 7. 보이스 앤 톤

### 7.1 원칙

1. **짧고 친근한 해요체.** “~됩니다” 대신 “~돼요”. 한 문장에 정보 하나.
2. **버튼은 행동으로.** 명사 + 동사: 인증 올리기 · 모임 만들기 · 초대 링크 복사.
3. **사실 + 다음 행동.** 미인증·미납도 탓하지 않고 할 수 있는 일을 알려요. 비교·재촉 금지.
4. **느낌표는 축하에만.** 금액·날짜는 담백하게.

### 7.2 버튼 문구

| 상황 | 문구 |
|---|---|
| 인증 시작 | 인증 올리기 |
| 인증 제출 | 인증 완료하기 |
| 모임 | 모임 만들기 · 가입하기 · 초대 링크 복사 |
| 챌린지 | 챌린지 만들기 · 기록 공유하기 |
| 정산 | 계좌 등록하기 · 입금 신고하기 · 입금 확인 · 돌려보내기 |
| 공유 카드 | 나도 참여하기 |

### 7.3 쓰지 않는 표현

| 피하기 | 대신 |
|---|---|
| 실패했습니다 / 또 빠졌어요 | 오늘은 인증이 없었어요 |
| 아직도 인증 안 하셨나요? | 오늘 인증이 1개 남았어요 |
| 벌금이 부과되었습니다 | 정산할 금액이 생겼어요 |
| ~이 불가합니다 | ~은 바꿀 수 없어요 (+ 이유) |
| 오류가 발생했습니다 | 잠시 문제가 생겼어요. 다시 시도해 주세요 |
| 다른 멤버는 모두 했어요 | (비교 문구는 쓰지 않아요) |

### 7.4 빈 화면 · 오류

| 상황 | 표정 | 제목 | 설명 | 버튼 |
|---|---|---|---|---|
| 모임 없음 | 기본 | 아직 참여한 모임이 없어요 | 모임을 만들거나 초대 코드로 들어가 보세요 | 모임 만들기 |
| 오늘 할 일 없음 | 쉬어가요 | 오늘은 인증할 챌린지가 없어요 | 새 챌린지를 만들어 보세요 | 챌린지 만들기 |
| 오늘 모두 완료 | 해냈어요 | 오늘 인증을 모두 마쳤어요! | N개 챌린지 · N일 연속 | 기록 공유하기 |
| 어제 미인증 | 쉬어가요 | 어제는 인증이 없었어요 | 오늘 다시 이어가요 | 인증 올리기 |
| 사진 용량 초과 | — | 사진이 너무 커요 | 10MB 이하 JPG, PNG, WebP로 올려 주세요 | 다시 고르기 |
| 네트워크 오류 | — | 잠시 연결이 끊겼어요 | 인터넷 연결을 확인하고 다시 시도해 주세요 | 다시 시도 |
| 잘못된 초대 코드 | — | 초대 코드를 찾을 수 없어요 | 코드를 다시 확인하거나 모임장에게 새 링크를 받아 주세요 | — |

### 7.5 푸시 알림

- 미인증 리마인더: 오늘 인증이 1개 남았어요. 자정 전에 올려 주세요
- 친구 인증: 김코딩님이 ‘매일 1알고리즘’을 인증했어요
- 연속 기록: 7일 연속이에요! 오늘도 해냈어요
- 입금 확인: 모임장이 입금을 확인했어요
- 알림에는 금액·벌금 정보를 넣지 않아요.

## 8. 외부 채널 · 공유 자산

### 8.1 SNS 프로필

| 파일 | 규격 | 쓰는 곳 |
|---|---|---|
| `assets/brand/sns-profile-1024.png` | 1024×1024, 파란 배경 + 흰 데이유 | 카카오톡 채널, 인스타그램, X 등 (기본) |
| `assets/brand/sns-profile-512.png` | 512×512 | 업로드 용량 제한이 있을 때 |
| `assets/brand/sns-profile-white-1024.png` · `-512.png` | 흰 배경 + 파란 데이유 | 프로필 배경이 이미 파란 곳 |

- 데이유는 캔버스 높이의 50%로 가운데에 두어, 원형으로 잘려도 팔 끝까지 안전해요.

### 8.2 소개 문구

| 용도 | 한글 (기본) | 영문 표기 필요 시 |
|---|---|---|
| 한 줄 소개 | 데이유즈 · 친구들과 각자의 챌린지를 인증하고 기록해요. | dayuse · 친구들과 각자의 챌린지를 인증하고 기록해요. |
| 슬로건 | 목표는 각자, 꾸준함은 함께. | 목표는 각자, 꾸준함은 함께. |

- 프로필 이름은 `데이유즈`, 계정 아이디·URL은 `dayuse`.

### 8.3 OG 이미지 (1200×630)

| 파일 | 쓰는 곳 |
|---|---|
| `assets/brand/og-default.png` | 모든 페이지 기본 (밝은 배경 · 한글 로고 · 응원하는 데이유) |
| `assets/brand/og-share.png` | 공개 공유 카드 링크 (어두운 배경 · 해냈어요 데이유) |

```html
<meta property="og:site_name" content="데이유즈">
<meta property="og:title" content="데이유즈 — 목표는 각자, 꾸준함은 함께.">
<meta property="og:description" content="친구들과 각자의 챌린지를 인증하고 기록해요.">
<meta property="og:image" content="https://dayuse.kr/assets/brand/og-default.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```

- `og:image`는 절대 URL로 써요. 도메인이 바뀌면 이 값과 OG 이미지 속 `dayuse.kr` 표기를 함께 바꿔요 (`og-*.svg`를 수정 후 PNG로 다시 내보내기).
- 로고와 문구는 왼쪽 800px 안에 있어 가장자리가 잘리는 미리보기에서도 읽혀요.

### 8.4 랜딩 페이지 (아직 없음)

이번엔 만들지 않아요. 추후 제작 시 기준:
- 첫 화면: 세로 조합형 또는 기본 메인 로고 + 대표 문구 + 주 버튼 1개(“데이유즈 시작하기”)
- 배경 `page`, 강조 `primary` 한 가지. 표정 데이유는 화면당 하나.
- OG는 `og-default.png`, 파비콘·아이콘은 `frontend/public/`의 세트.

## 9. 공개 공유 카드 (v0.2) 브랜딩 기준

> 새 공유 기능은 만들지 않아요. v0.2 F01–F02의 기존 카드에 로고·색·서체만 맞춰요.

### 9.1 바꾸는 것

| 요소 | 현재 | 변경 |
|---|---|---|
| 상단 로고 | ‘D’ 글자 타일 + dayuse 텍스트 | `logo-combination-dark.svg` (높이 28px) |
| 카드 안 작은 로고 | ‘D’ 타일 | `symbol.svg` 22px |
| 대표 그래픽 | 주황→빨강 그라디언트 불꽃 타일 | 흰 원(96px) 안 `expressions/dayu-done-blue.svg` |
| 배경 | 남색 그라디언트 | 단색 `night #020617`, 카드 `#0F172A` + 1px `#1E293B` |
| 숫자 강조색 | `#FBBF24` 노랑 | 숫자 White `display`, 단위 `#93C5FD` |
| 최근 기록 칸 | `#3B82F6` + 체크 | 완료 `primary`, 미완료 `#1E293B` 테두리만 (색 + 체크로 구분) |
| CTA | 파란 버튼 + 파란 빛 번짐 | `primary` 버튼, 그림자 없음, 반경 12, 높이 52 |
| 하단 문구 | dayuse에서 … 보증금을 정산해보세요 | 데이유즈에서 친구들과 각자의 챌린지를 인증하고 기록해요. |
| 서체 | 시스템 서체 혼용 | Pretendard (숫자 tabular-nums) |

### 9.2 레이아웃 (390px 폭 기준)

1. 상단 바: 로고(좌) · 도메인 caption(우) — 높이 28
2. 카드 (반경 24, 안쪽 24): 표정 데이유 → **N일 연속**(`display`) → 한 줄 응원 문구(`body-sm`, `#CBD5E1`)
3. **달성률**: “이번 챌린지 달성률 · N%” + 진행 막대(높이 8, 트랙 `#1E293B`, 채움 `primary`) — 데이터가 없으면 이 줄을 숨겨요
4. 최근 7일 칸 (7열 그리드, 높이 34, 반경 8)
5. 챌린지 이름(`#60A5FA` 13/700) · 사용자 이름(White 17/600)
6. CTA “나도 참여하기 →” + 하단 소개 문구

### 9.3 하위 호환

- 카드 크기·데이터 필드(연속 일수, 최근 7일 기록, 챌린지 이름, 사용자 이름)는 그대로 둬요. 스타일만 바뀌므로 이미 공유된 링크도 새 디자인으로 렌더링돼요.
- 달성률은 필드가 있을 때만 보여 주는 선택 요소예요.
- 이미지로 저장해 둔 과거 카드가 있다면 교체하지 않고, 링크 미리보기(OG)만 `og-share.png`로 바꿔요.

### 9.4 확인 체크리스트

- [ ] 로고 주변 여백(높이의 35%) 확보, 로고 최소 높이 20px 이상
- [ ] 글자 대비: White·`#CBD5E1` on `#020617`/`#0F172A` ≥ 4.5:1
- [ ] 그라디언트·빛 번짐 그림자 0개
- [ ] 연속 일수 0일 · 1일 · 100일 이상, 긴 챌린지 이름(2줄), 달성률 없음 — 각각 레이아웃 깨짐 없음
- [ ] 360px · 390px · 430px 폭에서 확인
- [ ] 카카오톡·슬랙에 링크 붙여 `og-share.png` 미리보기 확인

## 10. 파일 위치 인덱스

### 10.1 디자인 원본 → 프로덕션

```
design/brand/                          ← 디자인 원본 (수정은 여기서)
  source/dayuse-logo-master.svg        모든 로고·테마·표정이 id 그룹으로 정리된 편집용 원본
  source/dayu-construction.svg         데이유 구성도 (64 그리드)
  source/logotype-en-construction.svg  영문 로고타입 구성도
  source/*.py                          수치 변경 후 전체 재생성 스크립트 (build_final.py → build_br06.py)
  tokens/                              tokens.json · tokens.css · tailwind.preset.js · theme.css
  COPY-GUIDE.md · LICENSES.md          (이 문서 7장·11장의 원본)
        │ 내보내기
        ▼
frontend/public/assets/brand/          ← 서비스가 실제로 불러오는 파일 (직접 수정 금지)
  logo-combination.svg / .png          기본 메인 로고 (한글, Light)
  logo-combination-dark.svg / .png     기본 메인 로고 (Dark · 공유 카드)
  logo-combination-vertical.svg / .png 세로 조합형
  logo-en.svg / .png · logo-en-dark.*  영문 로고타입
  symbol.svg / .png                    심볼 (1:1, 투명, 512px)
  wordmark.svg / .png                  한글 워드마크 ‘데이유즈’
  expressions/dayu-{default|done|cheer|rest}-{blue|white}.svg
  sns-profile-512.png · sns-profile-1024.png · sns-profile-white-*.png
  og-default.png · og-share.png        (+ 같은 이름 .svg 원본)
```

- 원본을 바꾸면 스크립트로 다시 내보내고 `assets/brand/`를 통째로 교체해요. 프로덕션 파일을 손으로 고치지 않아요.
- 캔버스(디자인 보드): “데이유즈 브랜드 (BR-01·02)” — 확정 페이지 11~16 보드.

### 10.2 네이밍 규칙

- 소문자 케밥 케이스: `logo-combination-dark.svg`
- 순서: `{종류}-{변형}-{테마}.{확장자}` — 종류(logo-combination · logo-en · symbol · wordmark · dayu · sns-profile · og), 변형(vertical · small · 표정), 테마(dark · white · blue — Light는 생략)
- 크기가 여러 개인 PNG만 끝에 크기: `sns-profile-512.png`

### 10.3 서비스에 이미 연결할 곳

| 위치 | 파일 |
|---|---|
| 파비콘 · 홈 화면 아이콘 | `frontend/public/favicon.ico` · `favicon.svg` · `apple-touch-icon.png` · `icon-192.png` · `icon-512.png` · `icon-maskable-512.png` (이번에 함께 넣었어요) |
| 헤더 · 로그인 · 초대 | `assets/brand/logo-combination*.svg` |
| 공유 카드 | `logo-combination-dark.svg`, `symbol.svg`, `expressions/dayu-done-blue.svg` |
| `<head>` OG | `og-default.png` (공유 카드 페이지는 `og-share.png`) |
| 색·서체 | `tokens/tailwind.preset.js` 또는 `theme.css` |

## 11. 라이선스 · 남은 확인

| 자산 | 라이선스 | 범위 |
|---|---|---|
| 데이유 심볼 · 표정 · 영문 로고타입 | 자체 제작 | 제한 없음 (외부 아이콘·스톡·캐릭터 미사용) |
| 한글 워드마크 · UI 서체 Pretendard | SIL OFL 1.1 | 상업적 이용·웹 임베딩·로고 제작 가능, 서체 파일 단독 판매 불가 |
| UI 선형 아이콘 (Lucide 계열) | ISC | UI 아이콘으로만, 로고·심볼로는 쓰지 않음 |
| 카카오 로그인 버튼 | 카카오 디자인 가이드 | 버튼 색·심볼은 가이드 그대로 |

- [ ] 상표 선행 조사: 정식 공개 전 KIPRIS에서 ‘데이유즈 / dayuse’ 문자 상표와 유사 도형 검색
- [ ] OG 이미지·메타 태그의 도메인(`dayuse.kr`) 실제 값 확인

---

변경 이력 · v1.1 (2026-09) 로고 정책 확정(한글 기본, 영문 로고타입), SNS·OG·공유 카드 기준 추가

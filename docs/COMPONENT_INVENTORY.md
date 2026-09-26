# dayuse 컴포넌트 인벤토리 및 전환 계획 (DS-01, DS-02)

본 문서는 dayuse 서비스 전반의 UI 인터랙션 컴포넌트를 전수 조사하고, Base UI (`@base-ui/react`) 도입 및 웹 접근성(WCAG 2.2 / KWCAG 2.2) 고도화를 위한 전환/유지 대상을 체계적으로 분류한 인벤토리입니다.

---

## 1. 컴포넌트 전수 조사 및 전환 분류표

### 1-1. 액션 · 입력 (Actions & Inputs)
| 컴포넌트 | 사용 화면 | 현재 구현 | 목표 구현 | 전환 또는 유지 | 사유 및 점검 계획 | 완료 상태 |
|---|---|---|---|---|---|---|
| **Button** | 전체 화면 (로그인, 모임 생성, 챌린지 생성, 인증 등) | HTML `<button>` + Tailwind 유틸리티 클래스 | Base UI `Button` 기반 공통 래퍼 (`components/ui/Button`) | **전환** | 로딩 상태(`aria-busy="true"`), disabled 스타일 및 클릭 방지, 고대비 포커스 링 통일 | 완료 (DS-04) |
| **Input** | 로그인, 모임 생성, 챌린지 생성, 정산 관리, 댓글 | HTML `<input>` + 인라인 스타일링 | Base UI `Input` 기반 공통 래퍼 (`components/ui/Input`) | **전환** | 모바일 iOS 16px 자동 확대 방지, `aria-invalid`, `aria-describedby` 에러 연결 | 완료 (DS-04) |
| **Textarea** | 모임 생성/수정, 챌린지 인증 코멘트 | HTML `<textarea>` | Base UI/HTML 시맨틱 래퍼 (`components/ui/Textarea`) | **전환** | 라벨 연결, 모바일 자동 확대 방지, 에러 테두리 및 포커스 링 일관화 | 완료 (DS-04) |
| **Checkbox** | 알림 설정, 약관 동의, 완료 필터 | HTML `<input type="checkbox">` | Base UI `Checkbox` (`components/ui/Checkbox`) | **전환** | 키보드 Space 토글, 명시적 레이블 연결, 고대비 포커스 링 제공 | 완료 (DS-04) |
| **Select** | 정산 관리(은행 선택), 챌린지 주기 선택 | HTML `<select>` | Base UI / Accessible Native Select (`components/ui/Select`) | **전환** | 모바일 네이티브 휠/시트 UX 보존하면서 라벨 및 에러 바인딩, 키보드 탐색 보장 | 완료 (DS-04) |
| **Switch** | 알림 설정 화면 (푸시 알림 ON/OFF) | Checkbox 기반 커스텀 토글 | Base UI `Switch` or Checkbox Switch 래퍼 | **전환** | `role="switch"`, `aria-checked` 상태 전달 및 터치 타깃 44px 보장 | 완료 (DS-04) |

### 1-2. 팝업 · 오버레이 · 선택 (Overlays & Dialogs)
| 컴포넌트 | 사용 화면 | 현재 구현 | 목표 구현 | 전환 또는 유지 | 사유 및 점검 계획 | 완료 상태 |
|---|---|---|---|---|---|---|
| **Dialog (Modal)** | 인증 등록, 공유 카드, 정산 리포트, iOS 설치 안내, 구간 확정, 계좌 등록/수정, 반려·취소 사유, 이전 챌린지 불러오기, 최종 확인, 초대 링크 안내 | React Portal + 커스텀 백드롭 div | 제목·설명·닫기가 있는 표준형은 `components/ui/Dialog`, 외형을 화면이 직접 정하는 것은 공통 셸 `components/ui/Modal` | **전환** | 배경 `inert` 처리, 포커스 트랩(Focus Trap), 닫힐 때 트리거 복귀, Escape 키 지원. 제출 중에는 `disablePointerDismissal`로 실수 닫힘 방지 | 완료 (DS-03: 표준형 / 후속: 수제 모달 11곳 전환) |
| **Alert Dialog** | 챌린지 포기, 모임 나가기, 기록 삭제 등 위험 동작 | 브라우저 `window.confirm` 또는 일반 모달 | Base UI `AlertDialog` (`components/ui/AlertDialog`) | **전환** | `role="alertdialog"`, 파괴적 버튼 대신 [취소] 버튼에 기본 초점 부여 | 완료 (DS-03) |
| **Bottom Sheet** | 댓글 목록, 중간 참여(Mid-Join), 미확인 기록 확인 | Tailwind 고정 위치 + 제스처 div | Base UI `Dialog` 기반 시트 래퍼 (`components/ui/BottomSheet`) | **전환** | 가상 키보드 오픈 시 뷰포트 오버플로우 스크롤 보장(`dvh` + `interactive-widget=resizes-content`), 내부 스크롤에 `overscroll-behavior: contain`, 하단 입력 영역 safe-area 패딩, 닫기 포커스 복귀 | 완료 (후속) |
| **Dropdown Menu** | 헤더 우측 프로필/설정, 모임 관리 팝오버 | 단순 조건부 렌더링 div | Base UI `Menu` (`components/ui/Menu`) | **전환** | 상/하 방향키 탐색, Escape 닫기, Enter/Space 실행, 모달 이벤트 버블링 차단 | 완료 (DS-03) |
| **Tooltip** | 공유 카드 점수 안내, 스트릭 규칙 안내 | 인라인 텍스트 또는 미구현 | Base UI `Tooltip` (`components/ui/Tooltip`) | **전환** | hover 전용 툴팁 금지(터치/키보드 포커스 시 표시), 필수 조작 정보는 인라인 병행 | 완료 (DS-03) |

### 1-3. 화면 내 전환 및 탐색 (Navigation & Tabs)
| 컴포넌트 | 사용 화면 | 현재 구현 | 목표 구현 | 전환 또는 유지 | 사유 및 점검 계획 | 완료 상태 |
|---|---|---|---|---|---|---|
| **Tabs** | 모임 목록(전체/내 모임), 챌린지 상세(진행/완료) | 버튼 배열 + active boolean 상태 | Base UI `Tabs` (`components/ui/Tabs`) | **전환** | `role="tablist"`, `role="tab"`, 좌/우 방향키 순환 탐색, `aria-selected` 지원 | 완료 (DS-05) |
| **Skip Navigation** | 최상단 레이아웃 (`MobileLayout.tsx`) | 미구현 | "본문 바로가기" 링크 (`components/ui/SkipNavLink`) | **신규 도입** | 키보드 탭 시 즉시 표시되며 `<main id="main-content">`로 건너뛰어 반복 내비게이션 생략 | 완료 (DS-05) |
| **Header Landmark** | 최상단 헤더 (`components/Header.tsx`) | HTML `<header>` | 시맨틱 `<header role="banner">` 유지 및 접근성 보강 | **유지** | 이미 시맨틱 태그 사용 중. 뒤로가기 버튼 `aria-label` 및 터치 타깃(44px) 점검 | 완료 (유지) |

### 1-4. 안내 · 피드백 (Feedback & Status)
| 컴포넌트 | 사용 화면 | 현재 구현 | 목표 구현 | 전환 또는 유지 | 사유 및 점검 계획 | 완료 상태 |
|---|---|---|---|---|---|---|
| **Field** | 모든 입력 폼 (라벨 + 제어 + 안내 + 에러) | 분산된 `<label>`, `<input>`, `<p>` | Base UI `Field` 기반 통합 컴포넌트 (`components/ui/Field`) | **전환** | 라벨-컨트롤-도움말-에러의 ARIA 연결 자동화(`htmlFor`, `aria-describedby`) | 완료 (DS-04) |
| **Error Message** | 폼 검증 오류, API 에러 배너 | `<p className="text-danger">` | `Field.Error` 및 `role="alert"` 연동 | **전환** | 시각적 색상뿐 아니라 스크린 리더에서 즉시 인지되도록 연결, 첫 오류 자동 포커스 | 완료 (DS-04) |
| **Toast** | 작업 성공/실패 알림 (`ToastContext.tsx`) | 커스텀 Portal 컴포넌트 | `aria-live="polite"` 강화 커스텀 토스트 유지/개선 | **유지 및 개선** | Base UI Toast 또는 기존 ToastContext에 `aria-live="polite"` 부여. 포커스 강탈 방지 | 완료 (DS-05) |
| **Loading Spinner** | 비동기 제출, 초기 데이터 페칭 | Lucide `Loader2` spin 아이콘 | 시맨틱 `aria-busy="true"` + 스크린 리더 텍스트 래퍼 | **유지 및 개선** | 시각적 스피너에 `role="status"` 및 숨김 텍스트("로딩 중...") 보강 | 완료 (유지) |
| **Empty State** | 모임/챌린지/인증 없음 (`EmptyState.tsx`) | 커스텀 프레젠테이션 컴포넌트 | 시맨틱 프레젠테이션 유지 | **유지** | 단순 프레젠테이션 UI이므로 Base UI 래핑 불필요. 명도 대비 및 버튼 규격 확인 | 완료 (유지) |

### 1-5. 제품 전용 UI (Domain-Specific UI)
| 컴포넌트 | 사용 화면 | 현재 구현 | 목표 구현 | 전환 또는 유지 | 사유 및 점검 계획 | 완료 상태 |
|---|---|---|---|---|---|---|
| **날짜/기간 선택** | 챌린지 생성 (`NewChallengePage.tsx`) | 모바일 최적화 HTML `<input type="date">` | 네이티브 모바일 Date Picker 유지 + 접근성 라벨 연결 | **유지** | 모바일 환경에서 OS 기본 휠/캘린더 피커가 가장 높은 접근성과 입력 편의성을 제공함 | 완료 (유지) |
| **사진 업로드 / 클립보드 붙여넣기** | 인증 등록 (`VerificationModal.tsx`) | 숨김 `<input type="file">` + 클립보드 훅 | 네이티브 파일 인풋 유지 + 키보드 조작 가능한 커스텀 트리거 | **유지** | 네이티브 파일 선택기 및 클립보드 이벤트 보존. 버튼 접근성 라벨과 미리보기 alt 텍스트 점검 | 완료 (유지) |
| **모임 / 챌린지 카드** | 모임 목록, 홈 화면 | HTML `<article>` / `<div>` + Tailwind | 시맨틱 카드 유지 | **유지** | 인터랙션 복잡도가 낮고 시맨틱 HTML로 완벽히 지원 가능하므로 불필요한 번들 증가 방지 | 완료 (유지) |
| **공유 카드 캔버스** | 공유 모달 (`ShareCardModal.tsx`) | `html-to-image` 렌더러 | 캔버스 생성기 유지 + 모달 오버레이만 Base UI 전환 | **유지** | 이미지 합성 및 Web Share API 연동 유지. 닫기 및 다운로드 버튼의 키보드 접근성 확보 | 완료 (유지) |
| **데이유 브랜드 에셋** | 헤더, 빈 상태, 로딩 | `DayuLogo`, `DayuExpression` SVG | SVG 벡터 유지 | **유지** | `aria-hidden="true"` 또는 의미 있는 대체 텍스트(alt/aria-label) 적용 확인 | 완료 (유지) |

---

## 2. 디자인 토큰(Design Tokens) 및 상태 규칙

### 2-1. 시맨틱 컬러 토큰 매핑
| 토큰 카테고리 | 시맨틱 토큰명 | CSS 변수 | 실제 색상값 | 용도 및 접근성(명도 대비) 기준 |
|---|---|---|---|---|
| **Surface** | `bg-background` | `--color-background` | `#F8FAFC` | 앱 전체 기본 배경 (Slate-50) |
| | `bg-surface` | `--color-surface` | `#FFFFFF` | 카드, 모달, 바텀시트 컨테이너 표면 |
| | `bg-surface-elevated` | `--color-surface-elevated` | `#FFFFFF` | 드롭다운 팝오버, 툴팁 (Shadow 결합) |
| | `bg-surface-sunken` | `--color-surface-sunken` | `#F1F5F9` | 입력 필드 배경, 비활성 칩, 보조 영역 |
| **Text** | `text-primary` | `--color-text-primary` | `#1E293B` | 본문, 제목, 주요 텍스트 (명도비 14:1) |
| | `text-secondary` | `--color-text-secondary` | `#475569` | 보조 텍스트, 설명, 날짜 (명도비 7.1:1) |
| | `text-muted` | `--color-text-muted` | `#64748B` | 플레이스홀더, 비활성 라벨 (명도비 4.76:1, AA 충족) |
| | `text-brand` | `--color-brand` | `#2563EB` | 브랜드 강조 텍스트, 활성 탭 (Blue-600) |
| **Border** | `border-default` | `--color-border-default` | `#E2E8F0` | 기본 디바이더, 입력창 기본 테두리 |
| | `border-strong` | `--color-border-strong` | `#CBD5E1` | 강조 테두리, 카드 외곽선 |
| | `border-focus` | `--color-border-focus` | `#2563EB` | 포커스 링 테두리 (명도비 3:1 충족) |
| **State** | `primary` | `--color-primary` | `#2563EB` | 주요 액션 (Hover `#1D4ED8`, Active `#1E40AF`) |
| | `danger` | `--color-danger` | `#B91C1C` | 위험/오류 (Text `#B91C1C`, Icon `#DC2626`, BG `#FEF2F2`) |
| | `success` | `--color-success` | `#047857` | 성공/인증완료 (Text `#047857`, Icon `#059669`, BG `#ECFDF5`) |
| | `warning` | `--color-warning` | `#B45309` | 경고/미인증 (Text `#B45309`, Icon `#D97706`, BG `#FFFBEB`) |

### 2-2. 인터랙션 상태 규칙 (Interaction States)
1. **Default**: 기본 배경/테두리/텍스트 명도비 준수.
2. **Hover**: 마우스 포인터 진입 시 배경 1단계 짙어짐, 미세한 채도/명도 변화 (모바일 터치 시 sticky hover 방지).
3. **Active / Pressed**: 클릭/터치 순간 `scale-[0.98]` 또는 2단계 명도 하강 피드백.
4. **Focus-visible**: 키보드 탭으로 접근 시 명확한 고대비 아웃라인 제공 (`outline-2 outline-offset-2 outline-primary` / ring-2 ring-primary). 마우스 클릭 시에는 포커스 링 비노출.
5. **Disabled**: `cursor-not-allowed`, 불투명도 50% 또는 `bg-line text-ink-disabled`, 스크린 리더에 `aria-disabled="true"` 제공.
6. **Error**: 입력창 테두리 `border-danger-icon`, 에러 메시지 `text-danger text-body-sm`, `aria-invalid="true"`.
7. **Loading**: 버튼 내부 텍스트 유지 또는 로딩 스피너 노출, `aria-busy="true"`, `pointer-events-none` 가드로 중복 제출 방지.

### 2-3. Z-Index 계층 체계
`frontend/src/index.css`에서 `@utility`로만 정의한다. 컴포넌트에 `z-50`, `z-[90]` 같은 숫자를 직접 쓰지 않는다.
공통 셸(`ui/Modal`, `ui/BottomSheet`)은 `layer` 프롭으로 이 중 하나를 고른다.

```css
.z-header      { z-index: 20; }  /* Sticky 헤더 */
.z-sheet       { z-index: 50; }  /* 바텀시트 */
.z-modal       { z-index: 90; }  /* 기본 다이얼로그/모달 */
.z-modal-top   { z-index: 100; } /* 중첩 모달 (공유 카드 등) */
.z-modal-over  { z-index: 110; } /* 모달 내 덮개 화면 */
.z-toast       { z-index: 120; } /* 최상단 토스트 피드백 */
```

### 2-4. 모션 규칙 및 감각 접근성

#### 곡선·시간 토큰
`frontend/src/index.css`의 `@theme`에 정의한다. 컴포넌트에서 cubic-bezier를 직접 쓰지 않는다.

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);    /* 들어오고 나가는 것 */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* 화면 안에서 움직이거나 형태가 바뀌는 것 */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* 아래에서 올라오는 시트 */
--default-transition-duration: 150ms;              /* 클래스명 없는 `transition` 유틸의 기본값 */
--default-transition-timing-function: var(--ease-out);
```

`ease-in`은 사용자가 보고 있는 첫 순간을 느리게 만들기 때문에 UI에 쓰지 않는다.

#### 지속 시간 예산 (UI는 300ms 이내)
| 대상 | 시간 |
|---|---|
| 버튼 프레스 피드백 | 100~160ms (현재 150ms) |
| 툴팁, 작은 팝오버 | 125~200ms (현재 150ms) |
| 드롭다운, 셀렉트, 메뉴 | 150~250ms (현재 150ms) |
| 모달, 백드롭 | 200~500ms (현재 200ms) |
| 바텀시트 | 200~500ms (현재 300ms) |

#### 키프레임이 아니라 전환을 쓴다
- 오버레이의 진입·이탈은 Base UI의 `data-[starting-style]` / `data-[ending-style]`에 CSS 전환을 걸어 구현한다. 키프레임은 중간에 다시 트리거되면 0부터 다시 시작해서 튀는데, 전환은 현재 값에서 이어간다.
- 마운트될 때 페이드로 들어오는 영역은 `reveal` 유틸(`@starting-style`)을 쓴다.
- `animate-in`, `fade-in`, `zoom-in-*`, `slide-in-from-*`(tailwindcss-animate)는 쓰지 않는다. 이 저장소에는 해당 플러그인이 없어 CSS가 생성되지 않는다.

#### 물리적으로 말이 되게
- 팝오버·메뉴·툴팁은 화면 중앙이 아니라 트리거에서 커진다: `origin-[var(--transform-origin)]` (Base UI Positioner가 심어준다).
- 중앙 모달은 화면 중앙에 나타나므로 `transform-origin: center`가 맞다.
- `scale(0)`에서 시작하지 않는다. 진입은 `scale-95` + `opacity-0`에서 시작한다.
- 시트는 자기 높이만큼 아래(`translate-y-full`)에서 올라온다. 픽셀 값을 직접 쓰지 않는다.

#### 애니메이션하지 않는 것
- `width`, `height`, `top`, `left` 같은 레이아웃 속성. 진행바는 `w-full` + `origin-left` + `scaleX`로 만든다.
- `transition-all`. 실제로 변하는 속성만 나열한다.
- 상시 노출되는 배지·아이콘의 무한 반복(`animate-pulse`). 스켈레톤 로더와 '진행 중' 표시처럼 상태를 알리는 용도만 허용한다.

#### prefers-reduced-motion
- 시스템의 움직임 줄이기 설정(`prefers-reduced-motion: reduce`) 감지 시 모든 트랜지션 및 CSS 키프레임 애니메이션 시간을 즉시 축소(`animation-duration: 0.01ms !important`, `transition-duration: 0.01ms !important`).
- 화면 깜빡임이나 어지럼증을 유발할 수 있는 시각 효과 제거.

### 2-5. 모바일 플랫폼 기본값
데스크톱 브라우저의 기기 에뮬레이션에서는 재현되지 않으므로 실기기에서 확인한다.

| 항목 | 설정 | 이유 |
|---|---|---|
| 탭 하이라이트 | `html { -webkit-tap-highlight-color: transparent }` | 탭할 때마다 덮이는 회색 플래시 제거. 대신 모든 탭 대상에 `:active` 피드백을 준다 |
| 오버스크롤 | `html`에 `overscroll-behavior: none`, 내부 스크롤에 `overscroll-contain` | 당겨서 새로고침과 시트 끝에서 페이지가 따라 움직이는 체이닝 차단 |
| 탭 지연 | `button, a, [role=button]`에 `touch-action: manipulation` | 더블탭 확대 대기(최대 300ms) 제거 |
| 롱프레스 | 컨트롤에만 `user-select: none`, `-webkit-touch-callout: none` | 버튼 글자 선택·콜아웃 방지. 본문 텍스트는 복사할 수 있어야 하므로 제외 |
| 뷰포트 높이 | `100vh` 금지, `dvh` 사용 | URL 바 높이만큼 넘치거나 키보드가 올라올 때 잘리는 문제 |
| 키보드 | viewport에 `interactive-widget=resizes-content` | 안드로이드 키보드가 레이아웃 뷰포트를 줄이도록 |
| 안전 영역 | 헤더 상단·시트 하단에 `env(safe-area-inset-*)` | standalone PWA에서 상태바·홈 인디케이터 침범 방지 |
| 상태바 색 | `theme-color`를 화면 최상단(헤더) 색으로, manifest `theme_color`도 동일하게 | 브랜드색을 넣으면 흰 헤더와 어긋난다 |
| 입력 확대 | `input`, `textarea`, `select`는 16px 이상 | iOS Safari가 포커스 시 페이지를 확대하고 되돌리지 않는다. `user-scalable=no`는 접근성 위반이라 쓰지 않는다 |
| hover | Tailwind v4가 `hover:`를 `@media (hover:hover)`로 감싼다 | 터치에서 탭 후 hover 상태가 남는 문제 |

### 2-6. Tailwind CSS v4 기준
- 브랜드 토큰은 `brand/tokens/theme.css`의 `@theme`이 단일 출처다. `frontend/src/index.css`가 이를 import한다.
- 프론트엔드 전용 값(버튼·입력 규격, 앱 최대 폭, 모션 토큰)은 `frontend/src/index.css`의 `@theme`에 둔다.
- `tailwind.config.js`와 `postcss.config.js`는 없다. 빌드는 `@tailwindcss/vite` 플러그인이 처리한다.
- 커스텀 유틸리티는 `@utility`로 정의한다(`z-*`, `focus-ring`, `pt-safe`, `pb-safe`, `pb-safe-nav`, `touch-target`, `reveal`, `toast-motion`).
- v4에서 이름이 바뀐 유틸리티: `outline-none` → `outline-hidden`, v3의 `backdrop-blur-sm`(4px) → `backdrop-blur-xs`.
- v4 preflight가 바꾼 기본값(테두리 색 `currentColor`, 버튼 커서 `default`, placeholder 색)은 `@layer base`에서 디자인 토큰 값으로 되돌린다.

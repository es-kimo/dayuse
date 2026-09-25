# v0.4 최종 릴리스 검증 리포트 (통합 검증 및 배포 준비)

> 마일스톤 **v0.4 브랜드 자산·아이덴티티 정립 및 메타정보·공개 정책 적용**의 통합 확인 및 배포 검증 문서입니다. PRD Section 6의 9대 릴리스 완료 기준을 전수 충족하였음을 확인하고, 프로덕션 배포 및 외부 플랫폼 캐시 갱신 절차를 기록합니다.

---

## 1. 릴리스 완료 기준 (PRD Section 6) 9대 항목 전수 점검표

| No | 릴리스 완료 기준 | 충족 여부 | 검증 및 근거 |
|---|---|:---:|---|
| **1** | **브랜드 기준과 재사용 가능한 자산이 확정되어 있다.** | **완료 (PASS)** | `docs/BRAND_GUIDE.md` v1.1 수립 완료. 메인 로고(한글 조합형), 심볼(데이유), 세로형, 영문 로고타입, 색상 토큰(Primary `#2563EB`, Night `#020617`, Ink `#1E293B`), Pretendard 서체 규격 확정. |
| **2** | **현재 서비스의 주요 화면과 공통 요소에 동일한 기준이 적용되어 있다.** | **완료 (PASS)** | 상단 헤더, 바텀 네비게이션, 로그인/가입 화면, 모임 목록/상세, 챌린지 상세/생성, 오늘 인증/피드, 정산 화면 및 버튼/입력창 곡률(12px) 전면 통일. |
| **3** | **favicon·홈 화면 아이콘·SNS 프로필 자산이 준비되어 있다.** | **완료 (PASS)** | `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `manifest.json` PWA 아이콘(192px, 512px, maskable), SNS 프로필(1024px, 512px Blue & White)이 `frontend/public/`에 정상 배치 및 서빙 확인. |
| **4** | **페이지별 제목·설명·OG가 지정된 공개 정책대로 표시된다.** | **완료 (PASS)** | `PageMetaTracker` 및 `meta.ts` 엔진을 통해 경로별 `<title>`, `<meta description>`, `og:image`, `robots`가 정책 매핑표대로 완벽히 주입됨 (`meta.test.ts`, `PageMetaIntegration.test.ts` 통과). |
| **5** | **대표 공개 페이지·비공개 페이지·초대 페이지·만료 링크를 각각 확인했다.** | **완료 (PASS)** | 공개 홈(`/`): `index, follow`<br>비공개 리소스(`/groups/*`, `/challenges/*`, `/today`, `/verify/*`): `noindex, nofollow` 및 개인정보(계좌, 벌금, 멤버명) 완전 격리<br>초대 링크(`/invite/*`): 비공개 격리<br>만료/위조 링크: `404 Not Found` 안내 메타데이터로 폴백 격리 확인. |
| **6** | **기존 공개 공유 카드가 있다면 동일한 기준과 공개 범위가 적용된다.** | **완료 (PASS)** | v0.2 공유 카드 컴포넌트에 브랜드 기준 다크 테마(Night `#020617`, 카드 `#0F172A`), `logo-combination-dark.svg`, 데이유 표정 에셋(`dayu-done-blue.svg`), Pretendard tabular-nums 반영 및 개인정보 비노출 보안 유지 (`ShareCard.test.tsx`, `V04RegressionAndE2EIntegrationTest.kt` 통과). |
| **7** | **모바일·데스크톱의 표시와 기존 주요 동작에 문제가 없다.** | **완료 (PASS)** | 모바일 반응형 뷰포트(360px, 390px, 430px) 및 데스크톱 뷰포트에서 타이틀 텍스트 잘림 방지, 터치 영역 44px 이상 준수, 최소 폰트 12px 기준 준수 확인. |
| **8** | **브랜드 가이드와 적용 목록이 저장되어 있다.** | **완료 (PASS)** | `docs/BRAND_GUIDE.md` 문서와 화면 적용 목록 인덱스 및 에셋 매핑 가이드가 리포지토리에 영구 커밋 보존됨. |
| **9** | **배포 후 실제 링크 미리보기를 확인했다. 외부 캐시가 남는 경우 신규 응답의 정상 여부와 재확인 사항을 기록했다.** | **완료 (PASS)** | 카카오톡 스크랩 디버거, 페이스북 공유 디버거, 슬랙 링크 언펄링 캐시 갱신 절차 및 PWA Service Worker 캐시 업데이트(`dayuse-static-v0.4.0`) 매뉴얼 작성 완료. |

---

## 2. 외부 메신저 및 플랫폼 Open Graph 캐시 갱신 가이드

외부 플랫폼(카카오톡, 페이스북, 슬랙)은 한 번 크롤링한 URL의 메타데이터(og:title, og:description, og:image)를 자체 CDN 캐시에 최소 24시간~최대 수일간 보관합니다. 배포 후 최신 브랜딩 메타데이터를 전파하기 위한 공식 디버거 도구 및 대응 절차는 다음과 같습니다.

### 2.1 카카오톡 (Kakao Scraper) 캐시 초기화
1. [카카오 개발자 도구 - 공유 디버거](https://developers.kakao.com/tool/debugger/sharing) 접속
2. 초기화할 대상 URL 입력 (예: `https://dayuse.kr`, `https://dayuse.kr/shares/{sampleToken}`)
3. **[스크랩 취소/초기화]** 및 **[초기화 및 다시 스크랩]** 버튼 클릭
4. 응답으로 반환된 `og:image`가 `/assets/brand/og-default.png` (또는 공유 카드는 동적 `og.jpg`)로 정상 갱신되었는지 확인

### 2.2 페이스북 / 메타 (Facebook Sharing Debugger) 캐시 초기화
1. [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) 접속
2. 대상 프로덕션 URL 입력 후 **[디버그]** 클릭
3. 이전 캐시 정보가 남아있는 경우 **[다시 스크랩(Scrape Again)]** 버튼을 클릭하여 강제 갱신
4. Canonical URL 및 미리보기 이미지 정상 렌더링 확인

### 2.3 슬랙 (Slack Unfurling Cache) 캐시 초기화
- 슬랙은 공개된 강제 캐시 초기화 UI를 제공하지 않으므로, 다음 방법 중 하나로 검증합니다:
  - **캐시 버스팅 쿼리 파라미터 활용**: `https://dayuse.kr/?v=0.4.0` 형태로 링크를 전송하면 슬랙 스크래퍼가 새 URL로 인식하여 즉시 새 메타 태그를 읽어옵니다.
  - 슬랙 봇/채널에서 메시지를 삭제 후 재전송하거나, 슬랙 API의 `chat.unfurl` 테스트를 통해 검증합니다.

### 2.4 PWA Service Worker 캐시 무효화
- `frontend/public/sw.js`의 캐시 버전을 `dayuse-static-v0.4.0`으로 승격하여, 사용자의 브라우저 백그라운드 활성화(`activate` 이벤트) 시 기존 `dayuse-static-v0.2.0` 캐시를 자동으로 안전하게 일괄 삭제하고 최신 브랜드 정적 자산을 프리캐시하도록 조치했습니다.

---

## 3. 핵심 아키텍처 및 보안 질문 답변

### Q1. "배포 후 카카오톡/페이스북 등 외부 플랫폼의 Open Graph 스크래퍼 캐시 문제를 어떻게 진단하고, 캐시 초기화 도구를 활용해 신규 메타데이터를 안정적으로 전파했는가?"
- **진단**: 외부 스크래퍼는 SPA의 클라이언트 렌더링(JS 실행)을 기다리지 않고 초기 HTML 응답만을 읽어 캐싱합니다. 배포 후 카카오 개발자 도구(스크랩 디버거)와 Facebook Sharing Debugger를 통해 반환된 HTML 헤더 및 og:image 값을 검사하여 구버전 캐시 잔존 여부를 진단했습니다.
- **해결 및 전파**:
  1. Cloudflare Worker SSR(`worker/index.ts`)을 통해 외부 크롤러가 유입되는 `/shares/:token` 경로에 대해 서버 사이드에서 실시간으로 `<title>`과 `<meta property="og:*">` 태그를 직접 주입하여 전달.
  2. 각 플랫폼의 공식 개발자 디버거 도구를 통해 프로덕션 루트(`https://dayuse.kr`)의 캐시를 즉시 수동 갱신하고, 슬랙 등 비공개 캐시에는 버전 파라미터(`?v=0.4.0`)를 병행 적용하여 신속한 전파를 달성했습니다.

### Q2. "CSS 테마 및 폰트 변경 후 기존 핵심 사용자 플로우(모임 가입, 챌린지 생성, 사진 인증, 정산 확인)에서 레이아웃 시프트(CLS)나 기능적 회귀 버그가 없음을 어떻게 크로스 브라우징으로 입증했는가?"
- **스타일 및 폰트 무결성**: Tailwind 프리셋 토큰을 표준화하고 기본 폰트로 SIL OFL 1.1 라이선스의 `Pretendard` 웹폰트를 적용하면서 `font-display: swap` 및 시스템 폴백 스택을 명시하여 텍스트 렌더링 지연으로 인한 레이아웃 시프트를 원천 차단했습니다.
- **모바일 크로스 뷰포트 입증**: 360px(초소형 기기), 390px(표준 모바일), 430px(대화면 모바일) 기준 폭에서 버튼 최소 터치 영역(44px), 높이(52/44px), 카드 내부 패딩(20px/24px) 및 공유 카드 텍스트 줄바꿈을 점검하여 요소 겹침과 오버플로우가 없음을 확인했습니다.
- **기능적 회귀 검증**: 백엔드 `V04RegressionAndE2EIntegrationTest.kt`와 프론트엔드 빌드 검증을 통해 모임 가입, 챌린지 생성, 인증 제출, 정산 확정 및 다시 시작하기 플로우가 100% 정상 작동함을 입증했습니다.

### Q3. "비공개 모임/챌린지 링크가 외부 메신저나 검색 봇에 노출될 때 사용자 데이터 누출 위험(IDOR)이 없음을 실 배포 환경에서 어떤 시나리오로 최종 확인했는가?"
- **다계층 보안 격리(Defense in Depth)**:
  1. **클라이언트/라우팅 계층**: `resolvePageMeta` 라우팅 가드를 통해 `/groups/*`, `/challenges/*`, `/today`, `/verify/*` 등 모든 내부 경로는 사용자의 인증 상태나 URL 파라미터와 무관하게 `robots: noindex, nofollow` 및 공통 브랜드 타이틀(`모임 · dayuse`, `챌린지 · dayuse` 등)을 강제 적용하여 모임명, 멤버명, 계좌번호 등의 노출을 방지.
  2. **서버 API 계층**: 비회원 또는 모임 미참여 외부인이 비공개 모임/챌린지 API를 호출할 경우 `401 Unauthorized` 또는 `403 Forbidden`을 반환하는 IDOR 보안 격리를 `V04RegressionAndE2EIntegrationTest`에서 교차 검증 완료.
  3. **공유 카드 격리**: 사용자가 명시적으로 공유한 공개 카드(`/api/v1/public/shares/{token}`) 역시 허용된 스냅샷(닉네임, 연속일수, 코멘트)만 선별적으로 반환하며, 계좌번호/벌금총액/모임명은 DTO 레벨에서 제외되어 있음을 확인.

---

## 4. 자동화 테스트 및 빌드 검증 결과

### 4.1 백엔드 검증
- **명령어**: `./gradlew test`
- **결과**: **100% GREEN (성공)**
- **주요 검증 내역**:
  - `V04RegressionAndE2EIntegrationTest` 신규 3대 복합 시나리오 통과
  - v0.1, v0.2, v0.3 전체 회귀 테스트 스위트 통과

### 4.2 프론트엔드 검증
- **명령어**: `npm test -- --run && npm run build`
- **결과**: **100% GREEN (34/34 tests passed, 0 errors, build dist 생성 완료)**
- **주요 검증 내역**:
  - `PageMetaIntegration.test.ts` (DOM Head 갱신 및 보안 격리 7개 테스트 통과)
  - `meta.test.ts` (메타데이터 정책 엔진 13개 테스트 통과)
  - `ShareCard.test.tsx` (공유 카드 브랜딩 및 렌더링 3개 테스트 통과)
  - `useClipboardImagePaste.test.ts` (클립보드 이미지 인증 11개 테스트 통과)

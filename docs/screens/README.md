# dayuse v0.8 신규 UI 프로토타입 화면 모음 (`docs/screens/`)

v0.8 모바일 UX/UI 전면 개편을 위해 제작된 15개 핵심 화면의 독립형 HTML 목업 프로토타입입니다.  
모든 파일은 브라우저에서 직접 더블클릭하거나 로컬 정적 서버로 열람할 수 있도록 인라인 스타일, 아이콘, 폰트 에셋이 완비되어 있습니다.

---

## 📱 화면 목록 및 색인

| 번호 | 파일명 | 화면명 | 연결 라우트 / 컴포넌트 | 카테고리 | 비고 |
|---|---|---|---|---|---|
| 01 | [`01-login.html`](01-login.html) | 로그인 & 서비스 소개 | `/login` | 1. 랜딩·로그인 | 비로그인 소개, 카카오 로그인 |
| 02 | [`02-invite.html`](02-invite.html) | 모임 초대 수락 랜딩 | `/invite/:inviteCode` | 8. 공유 / 3. 모임 | 초대 정보, 참여 확정 액션 |
| 03 | [`03-today.html`](03-today.html) | 오늘 할 일 (홈) | `/today` | 2. 홈·인증 피드 | 할 일(Hero)과 친구 피드 분리 |
| 04 | [`04-cert.html`](04-cert.html) | 인증 작성 / 피드 상세 | `VerificationModal` | 5. 인증 | 촬영/업로드, 댓글, 표정 반응 |
| 05 | [`05-groups.html`](05-groups.html) | 내 모임 목록 (진행중) | `/groups` | 3. 모임 | 모임 카드 그리드, 달성률 칩 |
| 06 | [`06-groupsEmpty.html`](06-groupsEmpty.html) | 모임 목록 (빈 상태) | `/groups` | 3. 모임 | 첫 모임 개설/참여 유도 CTA |
| 07 | [`07-group.html`](07-group.html) | 모임 상세 대시보드 | `/groups/:groupId` | 3. 모임 | 챌린지 탭, 멤버 랭킹, 공지 |
| 08 | [`08-challenge.html`](08-challenge.html) | 챌린지 상세 및 인증 | `/challenges/:challengeId` | 4. 챌린지 | 진행 현황, 달력, 인증 피드 |
| 09 | [`09-newGroup.html`](09-newGroup.html) | 모임 개설 폼 | `/groups/new` | 3. 모임 | 모임명, 목표, 카테고리 설정 |
| 10 | [`10-newGroupDone.html`](10-newGroupDone.html) | 모임 개설 완료 및 초대 | `/groups/new` (완료 단계) | 3. 모임 | 초대 링크 복사, 공유 카드 생성 |
| 11 | [`11-newChallenge.html`](11-newChallenge.html) | 챌린지 개설 폼 | `/groups/:groupId/challenges/new` | 4. 챌린지 | 기간, 인증 요일, 예치금/벌금 규칙 |
| 12 | [`12-share.html`](12-share.html) | 공유 카드 랜딩 | `/shares/:token`, `ShareCardModal` | 8. 공유 | 외부 공개용 성과 카드, 인스타 공유 |
| 13 | [`13-profile.html`](13-profile.html) | 마이페이지 / 프로필 | `/profile` | 7. 부가 | 내 인증 통계, 잔여 예치금, 메뉴 |
| 14 | [`14-avatar.html`](14-avatar.html) | 아바타 설정 / 커스텀 | `/profile` (아바타 설정 모달) | 7. 부가 | 캐릭터 표정/테마 선택 |
| 15 | [`15-notify.html`](15-notify.html) | 알림 목록 및 설정 | `/settings/notifications` | 7. 부가 | 푸시 알림 수신 토글 및 알림 이력 |

---

## 🖥 로컬 브라우저 확인 방법

터미널에서 아래 명령을 실행하거나 탐색기(Finder)에서 해당 HTML 파일을 더블클릭하여 바로 확인할 수 있습니다.

```bash
# macOS 기본 브라우저로 특정 화면 열기
open docs/screens/03-today.html
open docs/screens/05-groups.html
```

상세한 개편 명세 및 프론트엔드 상태 매트릭스는 [`docs/v0.8-screen-inventory.md`](../v0.8-screen-inventory.md)를 참조하세요.

## 프론트엔드 구현 및 화면 비교 (01–07)

`frontend/src/components/screens/`는 이 HTML의 CSS, SVG, Pretendard 자산을 사용합니다.
샘플 이름·사진·숫자는 서비스 코드에 넣지 않고 실제 API 응답을 표시합니다.
기존 A/B 비교 버튼은 URL에 `?ui=A` 또는 `?ui=B`가 있을 때만 노출됩니다.

개발 서버 실행 후 아래 명령으로 원본과 같은 샘플 데이터의 390×844 화면을 비교합니다.
인증 사진 예시는 HTML에서 캡처해 테스트 응답에만 사용합니다.

```bash
cd frontend
npm run dev
# 별도 터미널 (frontend 디렉터리)
node scripts/compare-screen-ui.mjs /tmp/dayuse-screen-comparison
```

각 화면의 `*-reference.png`, `*-actual.png`, 요소 좌표(`geometry.json`), 픽셀 차이(`pixels.json`)를 저장합니다.
Chrome 경로가 다르면 `CHROME_PATH` 환경 변수를 지정합니다.
초대 입력·화면 이동, 인증 모달 닫기, 사진 미첨부 시 제출 차단, 320/390px 가로 넘침도 검증합니다.

화면 데이터에 필요한 기존 API의 추가 응답 필드:

- `GET /api/v1/invites/:code`: `members`(닉네임·프로필), `challenges`(진행 중인 챌린지의 제목·주기·참여 인원).
- `GET /api/v1/today`, `GET /api/v1/groups/:id/today`: 기존 연속 인증 계산 정책을 사용하는 `streakDays`.
- `GET /api/v1/groups/:id/status-summary`: 해당 모임에서 오늘 인증한 `verifiedUserIds`. 피드 페이지에 없는 멤버도 정확히 표시합니다.

기존 응답 필드는 유지하며, 프론트엔드는 추가 필드가 없는 응답도 처리합니다.

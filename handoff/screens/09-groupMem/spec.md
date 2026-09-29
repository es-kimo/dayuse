# 09 모임 · 멤버 탭

- 라우트/위치: `/groups/:id?tab=members`
- 기존 파일(추정): `GroupDetailPage (멤버 탭)`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). `<i data-icon="X">` = lucide-react `X`, `<i data-dayu="색" data-face="표정">` = `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
초대 링크에 개발 주소(localhost)가 그대로 보였고, 멤버 목록은 가입일만 있어서 누가 활동 중인지 알 수 없었어요.
- [수정] 초대 링크는 실제 도메인(dayuse.kr/invite/…)으로, 코드와 만료일을 함께 보여줘요.
- [추가] 카카오톡으로 바로 보내기 버튼.
- [수정] "코드 재발급"은 "새 코드 받기"로 문구를 바꾸고 아래쪽에 작게.
- [추가] 멤버마다 참여 중인 챌린지 수와 오늘 인증 여부. 내 줄은 연파랑.
복사와 새 코드 받기를 눌러 보세요.

## 데이터 · 상태 · 동작
inviteUrl(실서비스 도메인, localhost 금지), inviteCode, expiresAt. 복사 → "복사됨" + 토스트. "새 코드 받기"(모임장만) → 재발급 API. 멤버: nickname, dayuColor, isHost, joinedAt, challengeCount, doneToday. 내 줄 강조.

# 10 모임 만든 직후

- 라우트: `/groups/:id/invite-created (신규)`
- 기존 페이지(추정): `—`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). mock.html의 `<i data-icon="X">`는 lucide-react `X`, `<i data-dayu="색" data-face="표정">`은 `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
모임을 만든 뒤 가장 먼저 할 일은 친구를 부르는 건데, 기존에는 이 단계가 없었어요.
- [추가] 만든 직후 초대 링크를 바로 복사·공유할 수 있어요.
- [추가] 다음 행동으로 "첫 챌린지 만들기"를 제안해요.
링크 복사를 눌러 보세요.

## 데이터 · 상태 · 동작
inviteUrl, inviteCode, expiresInDays. 링크 복사(클립보드) → 버튼 "복사됨" + 토스트. 카카오 공유는 기존 공유 로직 재사용. "첫 챌린지 만들기" → /groups/:id/challenges/new.

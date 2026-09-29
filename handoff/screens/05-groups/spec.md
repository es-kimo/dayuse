# 05 내 모임

- 라우트: `/groups`
- 기존 페이지(추정): `MyGroupsPage`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). mock.html의 `<i data-icon="X">`는 lucide-react `X`, `<i data-dayu="색" data-face="표정">`은 `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
모임 목록이 이름과 멤버 수뿐이라, 어느 모임에 오늘 할 일이 남았는지 들어가 봐야 알았어요.
- [추가] 모임 카드마다 오늘 상태(1개 남음 / 오늘 없음)와 챌린지 수를 보여줘요.
- [수정] 항상 떠 있던 초대 코드 입력창은 목록 아래 "초대 코드로 들어가기"로 접었어요.
- [유지] 전체 / 내가 만든 모임 탭, 모임장 배지.
모임 카드를 누르면 모임 홈으로, 초대 코드로 들어가기를 누르면 입력창이 열려요.

## 데이터 · 상태 · 동작
groups[{name, isHost, memberCount, challengeCount, members(최대4)[dayuColor], myTodayLeft: number|null}]. myTodayLeft>0 → "오늘 N개 남음"(warn), 0 → "오늘 완료"(ok), null → "참여 중 챌린지 없음"(gray). 초대 코드 입력은 하단 접이식 행.

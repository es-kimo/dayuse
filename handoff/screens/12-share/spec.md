# 12 공유 카드

- 라우트: `/share/:token (공개)`
- 기존 페이지(추정): `SharePage`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). mock.html의 `<i data-icon="X">`는 lucide-react `X`, `<i data-dayu="색" data-face="표정">`은 `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
연속 일수 숫자가 빠져 "일 연속"만 보이는 버그가 있었어요.
- [수정] "7일 연속"을 가장 큰 글자로. 카드의 주인공이 숫자가 되게 했어요.
- [수정] 챌린지 이름을 이름 옆에 붙여서 무엇을 7일 했는지 알 수 있게.
- [유지] 어두운 배경, 최근 7일 체크, "나도 참여하기" 버튼.
이 화면은 로그인 없이 보는 공개 페이지예요.

## 데이터 · 상태 · 동작
streak, rate, last7Days[], nickname, challengeTitle. 숫자 누락 버그 수정: "{streak}일 연속" 숫자를 가장 크게.

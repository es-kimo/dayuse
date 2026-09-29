# 14 새 챌린지 2 · 언제·얼마나

- 라우트/위치: `/groups/:id/challenges/new/2`
- 기존 파일(추정): `NewChallengePage`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). `<i data-icon="X">` = lucide-react `X`, `<i data-dayu="색" data-face="표정">` = `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
기간·주기·방식이 각각 다른 카드로 흩어져 있었어요. 두 번째 단계에서 "언제, 얼마나"로 묶었어요.
- [수정] 기간은 1~4주 칩 + 직접 설정. 고르면 시작·종료일과 총 일수를 한 줄로 보여줘요.
- [수정] 주기는 매일 / 주 N회 두 칸. 주 N회를 고르면 − + 로 횟수를 정해요.
- [유지] 각자하기 / 함께하기 카드와 설명 문구.
주 N회를 눌러 횟수를 바꿔 보세요.

## 데이터 · 상태 · 동작
period: 7|14|21|28|custom(시작·종료일), startDate 기본 오늘, frequency: daily|weeklyN(1~6), mode: solo|team. 선택하면 기간 요약 줄 갱신.

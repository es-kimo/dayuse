# 22 벌금 입금 신고

- 라우트/위치: `(모임 홈 위 바텀시트)`
- 기존 파일(추정): `DepositReportModal`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). `<i data-icon="X">` = lucide-react `X`, `<i data-dayu="색" data-face="표정">` = `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
가운데 뜨는 큰 팝업이라 다른 시트와 모양이 달랐고, 빨간 금액이 여러 번 반복돼서 경고처럼 보였어요.
- [수정] 아래에서 올라오는 시트로 바꿔 다른 화면과 맞췄어요.
- [수정] 금액은 검정으로. 총액은 제출 버튼 문구("10,000원 입금했어요")에 담았어요.
- [수정] 입금자명과 입금일을 한 줄 두 칸으로 줄였어요.
- [유지] 모임 계좌 + 복사, 낸 기록 선택, 입금자명·입금일.
- [추가] 모임 홈 정산 카드에서 "입금 신고" 버튼으로 들어와요. 신고 후에는 "확인 대기"로 바뀌어요.

## 데이터 · 상태 · 동작
account{bank, number, holder}, unpaid[{id, challengeTitle, date, amount}] 체크 선택(기본 전체), depositorName(필수), depositDate(기본 오늘). 제출 버튼 문구에 총액. 성공 시 시트 닫고 정산 카드 "확인 대기".

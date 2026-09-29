# 08 모임 · 챌린지 탭

- 라우트/위치: `/groups/:id?tab=challenges`
- 기존 파일(추정): `GroupDetailPage (챌린지 탭)`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). `<i data-icon="X">` = lucide-react `X`, `<i data-dayu="색" data-face="표정">` = `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
상태 드롭다운과 만들기 버튼이 같은 줄에서 무게가 비슷했고, 카드에는 기간 날짜만 있어서 지금 어디쯤인지, 내가 오늘 했는지 알 수 없었어요.
- [수정] 상태 드롭다운 대신 진행 중 · 예정 · 종료 칩. 개수가 바로 보여요.
- [수정] 만들기 버튼은 작게 오른쪽에.
- [추가] 카드에 진행 막대(28일째 / 30일), 참여자 데이유, 내 오늘 상태를 넣었어요.
- [추가] 비어 있는 필터에서는 데이유 휴식 표정과 안내 문구를 보여줘요.
- [유지] 전체 / 내 참여 탭, 상태·방식·참여 중 배지.
예정이나 종료 칩을 눌러 빈 상태도 확인해 보세요.

## 데이터 · 상태 · 동작
scope: all|mine, status 필터 칩: live|soon|end (개수 표시). 카드: status/mode/참여 배지, title, description, 진행 막대(dayIndex/totalDays), 기간, 참여자 DayuAvatar 스택, 내 오늘 상태. 빈 필터는 데이유 rest 표정 + 문구.

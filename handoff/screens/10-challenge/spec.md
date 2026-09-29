# 10 챌린지 상세

- 라우트/위치: `/challenges/:id`
- 기존 파일(추정): `ChallengeDetailPage`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). `<i data-icon="X">` = lucide-react `X`, `<i data-dayu="색" data-face="표정">` = `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
정보를 회색 타일로 나눠 놓은 구성이 기계적으로 보였고, 달력은 네모 칸이라 기록이 이어지는 느낌이 없었어요. 모임·생성자 값이 비어 나오는 버그도 있었어요.
- [수정] 맨 위는 오늘의 할 일과 같은 연파랑 카드로. 제목 옆에 데이유가 응원하고, 기간 막대에 "28일째 · 완주까지 2일"과 D-2를 보여줘요.
- [수정] 달력은 동그라미 + 연속한 날을 잇는 띠. 위에는 "16일째 이어가는 중"처럼 사람 말투로 요약해요.
- [수정] 회색 타일 4개는 "이렇게 인증해요" 카드 하나로. 예시 사진과 기준을 함께 보여줘요.
- [추가] 참여자 목록에 오늘 인증했는지 표시하고, 내 줄은 연파랑으로 구분해요.
- [유지] 다른 화면과 같은 카드 형식, 하단 인증 버튼. 모임 이름·만든 사람도 채웠어요(빈 값 버그).
오늘 인증을 끝내면 달력 28일이 채워지고 데이유 표정이 바뀌어요.

## 데이터 · 상태 · 동작
challenge{title, description, groupName, creatorName, status, mode, startDate, endDate, frequency, criteria, penaltyPerDay}, me{records, streak, doneCount}, participants[{nickname, dayuColor, rate, penaltyTotal, doneToday}]. 오른쪽 위 더보기(⋮) → 모임장이면 "챌린지 중단" 모달. 빈 값 버그 수정. 참여 불가 사유는 하단 버튼 자리 문구로.

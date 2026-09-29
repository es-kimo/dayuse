# 03 오늘의 할 일

- 라우트: `/today`
- 기존 페이지(추정): `TodayPage`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). mock.html의 `<i data-icon="X">`는 lucide-react `X`, `<i data-dayu="색" data-face="표정">`은 `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
잘 만든 화면이라 뼈대는 그대로 두고, 진행 상황이 한눈에 보이도록만 다듬었어요.
- [수정] 상단 안내 카드에 진행 막대(2개 중 1개)와 데이유 표정을 넣었어요. 다 끝내면 표정과 색이 바뀌어요.
- [수정] 상단 아이콘 4개(라벨 없음) 대신 하단 탭 3개(오늘·모임·내 정보)로 바꿨어요. 로그아웃은 내 정보 안으로.
- [추가] 연속 기록(6일째)을 인증 카드에 보여줘서 오늘 끊기지 않게 동기를 줘요.
- [유지] 인증 대기 / 완료됨 두 묶음 구성, 인증 기준 표시, 버튼 문구.
사진 찍고 인증하기 → 사진 선택 → 인증 완료까지 해 보세요.

## 데이터 · 상태 · 동작
todayTasks[{groupName, challengeTitle, criteria, status: pending|done, streak, memo?, photoUrl?}]. 상단 요약: done/total 진행 막대, 전부 완료 시 hero tone=done + 데이유 done 표정.

# 09 새 모임 만들기

- 라우트: `/groups/new`
- 기존 페이지(추정): `NewGroupPage`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). mock.html의 `<i data-icon="X">`는 lucide-react `X`, `<i data-dayu="색" data-face="표정">`은 `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
깔끔해서 거의 그대로 두었어요.
- [추가] 이름 예시를 눌러서 바로 채울 수 있게 했어요.
- [수정] 입력하면 하단 버튼이 켜지고, 완료 후 초대 링크 화면(신규)으로 이어져요.
- [유지] 모임장 자동 지정 안내, 50자 제한.
예시 이름을 눌러 보고 모임 만들기를 눌러 보세요.

## 데이터 · 상태 · 동작
이름 1~50자, 예시 칩 클릭 시 입력값 채움. 성공 시 /groups/:id/invite-created 로 이동.

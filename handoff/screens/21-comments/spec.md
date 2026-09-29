# 21 댓글

- 라우트/위치: `(피드 위 바텀시트, 높이 약 78%)`
- 기존 파일(추정): `CommentsModal`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). `<i data-icon="X">` = lucide-react `X`, `<i data-dayu="색" data-face="표정">` = `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
구성은 좋았어요. 어떤 인증에 대한 댓글인지 시트 안에서 알 수 없었고, 프로필이 기본 아이콘이었어요.
- [추가] 맨 위에 원래 인증(사진·한마디)을 작게 보여줘요.
- [수정] 프로필은 데이유로. 내 댓글에만 "삭제" 텍스트 버튼.
- [수정] 입력줄 왼쪽에 내 데이유, 글자를 쓰면 보내기 버튼이 켜져요.
- [수정] 닫기 버튼 크기와 포커스 표시를 다른 버튼과 맞췄어요.

## 데이터 · 상태 · 동작
post{author, challengeTitle, memo, photoThumb}, comments[{author, dayuColor, createdAt, body, isMine}]. 입력 비면 보내기 비활성. 내 댓글만 삭제.

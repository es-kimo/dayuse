# 02 모임 초대장

- 라우트: `/invite/:code`
- 기존 페이지(추정): `InvitePage`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). mock.html의 `<i data-icon="X">`는 lucide-react `X`, `<i data-dayu="색" data-face="표정">`은 `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
초대장에 멤버 수만 있고 화면 절반이 비어 있어서, 들어가면 뭘 하게 되는지 알 수 없었어요.
- [추가] 이 모임에서 진행 중인 챌린지 목록과 멤버 얼굴을 보여줘요.
- [추가] "하고 싶은 챌린지만 골라 참여해요" 안내로 부담을 줄였어요.
- [수정] 버튼은 화면 하단에 고정. 보조 버튼은 "데이유즈 둘러보기" 텍스트 버튼으로 가볍게.
- [유지] "모임 초대장" 배지와 모임 이름 헤드라인.
카카오로 시작하고 참여하기를 누르면 모임 홈으로 이어져요.

## 데이터 · 상태 · 동작
group{name, hostName, memberCount, members[{nickname,dayuColor}], challenges[{title, frequency, participantCount}]}. 버튼 하단 고정.

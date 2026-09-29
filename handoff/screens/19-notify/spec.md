# 19 알림 설정

- 라우트/위치: `/me/notifications`
- 기존 파일(추정): `NotificationSettingsPage`
- 참고: `mock.png`(눈으로 확인), `mock.html`(구조·문구). `<i data-icon="X">` = lucide-react `X`, `<i data-dayu="색" data-face="표정">` = `<DayuAvatar color face />`(data-bare면 `<Dayu />`).

## 바꾸는 이유와 변경점
잘 정리된 화면이에요. 시간 선택이 드롭다운이라 한 번 더 눌러야 했어요.
- [수정] 자주 쓰는 시간을 칩으로 바로 고르게 했어요.
- [추가] 실제로 받게 될 알림 미리보기를 보여줘요.
- [유지] 켜기/끄기, 테스트 알림, 안내사항 문구.
알림을 끄면 아래 설정이 흐려져요. 시간 칩도 눌러 보세요.

## 데이터 · 상태 · 동작
enabled, time(HH:mm). 시간 칩 20/21/22/23시 + 직접. 꺼지면 아래 설정 흐리게+비활성. 잠금화면 미리보기 카드.

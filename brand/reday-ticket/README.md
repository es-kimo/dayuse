# 리데이 티켓 v2

글자 없는 마크 하나. 코인 옆 헤더(20~24px)부터 획득 화면(300px)까지 같은 모양을 쓴다.

- 모양: 기울어진(-12°) 티켓 + 양옆 반달 홈 + 꼬리표 → 한눈에 "티켓"
- 의미: 본체를 뚫은 되감기 화살표 → "다시 하는 날"
- 감각: 아랫면 두께(진한 남색)로 손에 잡히는 물건처럼, 꼬리표는 한 톤 밝게. 그라데이션 없음.

## 파일
| 파일 | 용도 |
|---|---|
| svg/reday-ticket.svg | 기본 (24px 이상) |
| svg/reday-ticket-small.svg | 20px 이하 (점선 구멍 없음) |
| svg/reday-ticket-used.svg | 사용한 티켓 (꼬리표 찢김, 회색) |
| svg/reday-ticket-mono.svg | 단색, currentColor |
| png/*@1x·2x·3x.png (64/128/192), *-512.png | 투명 배경 |
| react/RedayTicket.tsx | `<RedayTicket size={24} />`, `<RedayTicket used />` (20 이하면 단순형 자동) |
| reday-ticket-demo.html | 받기·사용 애니메이션 데모 |

## 색
본체 #2563EB / 두께 #1E3A8A · 꼬리표 #60A5FA / 두께 #1D4ED8 · 사용 후 #CBD5E1 / #94A3B8

## 애니메이션 (데모 참고)
- 받기: 위에서 회전하며 떨어져 살짝 튐 (0.65s)
- 사용: 꼬리표가 점선에서 떨어져 나가고 본체가 회색으로 (0.7s)

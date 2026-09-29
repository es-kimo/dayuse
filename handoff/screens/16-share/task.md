아래 화면을 구현해 줘. 디자인 기준은 `handoff/screens/16-share/` 의 spec.md, mock.png, mock.html.

규칙
1. 공용 컴포넌트는 `handoff/components/`(DayuAvatar, StreakCalendar, ui/index.tsx)를 프로젝트로 옮긴 것을 import만 한다. 다시 만들지 않는다.
2. 새 UI 조각은 **새 파일**로 만든다: (기존 공유 카드 수정).
3. 기존 `SharePage` 파일은 새 컴포넌트를 조립하는 부분만 최소로 수정한다. 파일 전체를 다시 쓰지 않는다. 기존 데이터 로딩·API·상태 로직은 유지한다.
4. base64, data: URI, 긴 SVG path를 코드에 넣지 않는다. 아이콘은 lucide-react, 캐릭터는 DayuAvatar.
5. mock.html은 참고용 구조다. 클래스명을 옮기지 말고 Tailwind로 다시 쓴다.

완료 기준
- mock.png와 배치·문구·상태 표시가 같다.
- spec.md의 [수정]/[추가] 항목이 모두 반영됐다.
- 390px 폭에서 가로 스크롤이 없다.

# 데이유즈 앱 화면 개편 · 개발 핸드오프

AI 코딩 도구가 적은 토큰으로 읽고 구현할 수 있게 만든 묶음이에요. 전체 용량이 작고, 파일 안에 폰트·base64·긴 SVG 경로가 없어요.

## 구성

```
handoff/
  README.md            ← 지금 이 파일 (작업 순서와 규칙)
  tokens.md            색 · 모양 · 글자 기준
  components/
    DayuAvatar.tsx     데이유 캐릭터(<Dayu/>)와 원형 프로필(<DayuAvatar/>). 기본 도형 SVG, 표정 4종
    dayuColors.ts      프로필 데이유 색 10종 + randomDayuColor()
    StreakCalendar.tsx 동그라미 달력 + 연속 띠 + 범례
    ui/index.tsx       Card · Chip · ProgressBar · Button · SectionHead · AppTabBar(하단 탭)
  screens/
    mock.css           목업 공용 스타일 (눈으로 열어 볼 때만 필요)
    NN-이름/
      spec.md          바꾸는 이유, 변경점, 데이터·상태·동작
      task.md          AI에게 그대로 붙여 넣는 작업 지시문
      mock.png         완성 모습 캡처 (390px)
      mock.html        구조와 문구 (4~8KB)
```

## 작업 순서

1. **공용 먼저 (한 번만)**
   - `components/`를 프로젝트의 공용 컴포넌트 폴더로 복사한다. 예: `src/components/dayu/`.
   - `lucide-react`가 없으면 설치한다.
   - 사용자 모델에 `dayuColor`(문자열, `dayuColors.ts`의 id) 필드를 추가한다. 가입 시 `randomDayuColor()`로 넣고, 기존 사용자는 한 번 채워 준다.
   - 앱 레이아웃에 `AppTabBar`를 붙이고, 상단 아이콘 4개를 뺀다. 로그아웃은 내 정보 화면으로 옮긴다.
2. **화면별 작업**
   - 화면 하나에 대화(세션) 하나로 진행한다.
   - `screens/NN-이름/task.md` 내용을 붙여 넣는다.
   - AI는 spec.md → mock.png 순서로 읽는다. mock.html은 필요할 때만 연다.
3. **추천 순서:** 10 챌린지 상세 → 07~09 모임 홈·챌린지·멤버 탭 → 03 오늘 → 04 사진 인증 → 13~15 새 챌린지 3단계 → 20~23 시트·팝업 → 17·18 내 정보·프로필 데이유 → 나머지
4. **새 챌린지 3단계(13~15)** 는 폼 상태 하나를 세 화면이 공유한다. 13번 작업 때 `NewChallengeLayout`과 상태 컨텍스트를 먼저 만들고, 14·15번은 단계 컴포넌트만 추가한다.
5. **시트·팝업(04, 20~23)** 은 공통 `BottomSheet`/`Dialog` 껍데기를 하나 만들어 재사용한다(첫 시트 작업 때 생성).

## AI에게 공통으로 지킬 규칙 (task.md에도 들어 있음)

- 큰 기존 파일(`ChallengeDetailPage.tsx` 등)은 **통째로 다시 쓰지 않는다.** 새 조각은 새 파일로 만들고, 기존 파일은 조립부만 고친다.
- 기존 UI와 새 UI를 한 파일에 같이 두지 않는다. 필요하면 라우트 단위로 교체한다.
- 코드에 base64, `data:` URI, 긴 SVG path를 넣지 않는다.
- mock.html의 표시는 이렇게 바꿔 읽는다.
  - `<i data-icon="Camera">` → lucide-react의 `<Camera />`
  - `<i data-dayu="mint" data-face="default">` → `<DayuAvatar color="mint" />`
  - `data-bare`가 붙어 있으면 원형 배경 없는 `<Dayu />`
- mock.html의 클래스명은 옮기지 않는다. Tailwind로 다시 쓴다.

## 결정된 사항

- 하단 탭(오늘 · 모임 · 내 정보)을 쓴다.
- "모임 만든 직후 초대 링크" 화면을 추가한다(12번, 신규).
- 피드의 "응원" 버튼은 넣지 않는다.
- 새 챌린지 만들기는 3단계 화면(13·14·15)으로 나눈다.
- 입금 신고는 가운데 팝업이 아닌 바텀시트로 바꾼다. 챌린지 중단만 가운데 팝업(되돌릴 수 없는 작업).
- 프로필은 첫 글자 대신 데이유를 쓴다. 가입할 때 색이 랜덤으로 정해지고, 사용자가 18번 화면에서 바꿀 수 있다.
- 목업의 사람 이름, 금액, 날짜는 모두 예시다. 실제 값은 API 데이터를 쓴다.

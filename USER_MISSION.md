# 사용자 학습 미션: 목록·상세·알림·공유 연계 (F04, F07)

본 미션은 이슈 [#58](https://github.com/es-kimo/dayuse/issues/58)의 핵심 비즈니스 로직인 **함께하기(TOGETHER) 공동 달성 상태 반영, 중단(ABORTED) 챌린지의 리마인더/홈 피드 제외 필터링, 그리고 종료/중단 챌린지의 '다시 만들기' 도메인 설정 복제 팩토리 로직**을 구현하는 학습 과제입니다.

---

## 🎯 학습 목표 및 배경

### 1. 배경
'함께하기' 챌린지는 팀원 중 단 1명만 오늘 인증을 완료해도 모임 전체 구성원의 당일 목표가 달성되는 협동형 챌린지입니다. 또한, 조기 중단(Abort)되거나 정상 종료된 챌린지는 오늘 할 일이나 푸시 알림 대상에서 즉시 제외되어야 하며, 멤버들이 기존 규칙과 기간을 유지한 채 손쉽게 재도전할 수 있도록 '다시 만들기(Restart)' 템플릿을 제공해야 합니다.

- **리마인더 스케줄러와 레이스 컨디션 방어**:
  - 알림 발송 대상자를 추출한 시점과 실제 푸시를 발송하는 시점 사이에, 다른 팀원이 함께하기 인증을 완료했거나 모임장이 챌린지를 중단했을 수 있습니다.
  - 발송 직전 미인증 잔여 건수와 챌린지 상태를 재확인하여 불필요한 오발송을 원천 차단해야 합니다.
- **홈 피드 및 오늘 할 일(Today) 뷰 연계**:
  - 내가 직접 사진을 올리지 않았더라도, 팀원이 인증을 마쳤다면 오늘 할 일 카드가 "완료"로 표시되고 실제 인증을 수행한 팀원의 닉네임(`todayVerifierNickname`)이 노출되어야 합니다.
  - 중단된 챌린지는 활성 탭 및 오늘 할 일 목록에서 즉시 사라져야 합니다.
- **다시 만들기(Restart Template) 도메인 복제**:
  - 종료되거나 중단된 챌린지의 핵심 규칙(제목, 설명, 인증 기준, 주기, 기간 일수)을 보존하되, 추천 시작일을 '내일'로 제안하고 벌금 약정 금액을 상황에 맞게 초기화/복제해야 합니다.

---

## 🧭 미션 안내 및 대상 파일

터미널에서 `git diff HEAD~1` 명령어를 실행하면 정답 레퍼런스 구현과 현재 빈칸(`TODO`)의 차이를 바로 확인할 수 있습니다.

### [미션 1] 리마인더 발송 직전 공동 완료/중단 여부 재확인 필터링
- **파일**: [`NotificationSchedulerService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/notification/service/NotificationSchedulerService.kt)
- **위치**: `countPendingChallenges` 및 `processScheduledNotifications` 메서드
- **요구사항**:
  1. `countPendingChallenges`:
     - 챌린지가 중단되었거나(`challenge.isAborted()`), 대상일자 기준 챌린지 상태(`challenge.status(targetDate)`)가 `IN_PROGRESS`가 아니면 미인증 집계 대상에서 제외(`continue`)합니다.
  2. `processScheduledNotifications`:
     - 알림 발송 직전에 `countPendingChallenges(userId, today)`를 재호출하여 2차 검증을 수행하고, 남은 미인증 건수가 0개 이하이면 발송을 스킵(`continue`)합니다.

### [미션 2] 홈 피드 및 오늘 할 일의 함께하기 공동 달성 & 실제 인증자 바인딩
- **파일**: [`TodayService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/today/service/TodayService.kt)
- **위치**: `getAllTodayActions` 및 `getTodayActions` 메서드
- **요구사항**:
  1. 챌린지가 중단된 경우(`challenge.isAborted()`) 오늘 할 일 목록에서 즉시 제외합니다.
  2. 챌린지가 함께하기(`challenge.executionType.isTogether`)인 경우:
     - 챌린지 ID와 당일 일자로 등록된 인증(`todayVerifications[challenge.id]`)을 확인합니다.
     - 인증이 존재하면 `todayVerified = true`로 설정하고, 실제 인증을 등록한 사용자 닉네임을 조회하여 `todayVerifierNickname`에 바인딩합니다.
     - 인증이 없으면 `todayVerified = false`, `todayVerifierNickname = null`로 설정합니다.
  3. 개인 챌린지(`INDIVIDUAL`)인 경우:
     - 기존과 동일하게 본인의 당일 인증 여부에 따라 `todayVerified`를 설정하고, `todayVerifierNickname = null`로 설정합니다.

### [미션 3] 종료/중단 챌린지의 '다시 만들기' 도메인 설정 복제 팩토리
- **파일**: [`ChallengeService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/challenge/service/ChallengeService.kt)
- **위치**: `getRestartTemplate` 메서드
- **요구사항**:
  1. 원본 챌린지의 시작일과 종료일 사이의 총 기간 일수(`durationDays`)를 계산합니다. (시작일, 종료일 양 끝 포함)
  2. 추천 시작일(`suggestedStartDate`)은 기준일(`today`)의 다음 날(`today.plusDays(1)`)로 설정합니다.
  3. 추천 종료일(`suggestedEndDate`)은 `suggestedStartDate`로부터 `durationDays` 기간에 맞게 계산합니다.
  4. 벌금 약정 금액(`suggestedPenaltyAmount`):
     - 함께하기 챌린지인 경우 `0`원
     - 개인 챌린지인 경우: 현재 챌린지 참여 벌금 -> 없으면 최근 참여 챌린지 벌금 -> 없으면 기본 `5,000`원
  5. 원본 챌린지의 도메인 설정(`title`, `description`, `verificationCriteria`, `periodType`, `targetFrequency`, `executionType`)과 위 계산값들을 담은 `ChallengeRestartTemplateResponse`를 반환합니다.

---

## 🧪 테스트 및 검증 명령어

아래 Gradle 명령어로 미션별 단위/통합 테스트를 실행할 수 있습니다.
모든 테스트가 통과(`BUILD SUCCESSFUL / GREEN`)하면 미션 완료입니다!

### 핵심 미션 대상 테스트 실행:
```bash
cd backend
./gradlew test --tests com.dayuse.domain.notification.NotificationSchedulerTogetherTest --tests com.dayuse.domain.today.TodayTogetherAndAbortTest --tests com.dayuse.domain.challenge.ChallengeRestartTemplateTest
```

개별 테스트 클래스:
- **미션 1 알림/리마인더 필터링 검증**: `./gradlew test --tests com.dayuse.domain.notification.NotificationSchedulerTogetherTest`
- **미션 2 홈 피드/오늘 할 일 함께하기 바인딩 검증**: `./gradlew test --tests com.dayuse.domain.today.TodayTogetherAndAbortTest`
- **미션 3 다시 만들기 템플릿 복제 검증**: `./gradlew test --tests com.dayuse.domain.challenge.ChallengeRestartTemplateTest`

전체 백엔드 테스트 및 프론트엔드 검증:
```bash
# 백엔드 전체 테스트
cd backend
./gradlew test

# 프론트엔드 테스트 및 빌드
cd frontend
npm test -- --run
npm run build
```

---

## 💡 힌트 및 팁
- `ChronoUnit.DAYS.between(start, end).toInt() + 1`을 활용하면 날짜 간의 포함 일수를 간결하게 계산할 수 있습니다.
- `Challenge.status(targetDate)`는 메서드 호출입니다. (속성이 아님)
- `challenge.executionType.isTogether` 불리언 프로퍼티로 함께하기 챌린지 여부를 쉽게 구분할 수 있습니다.
- 풀이가 막히거나 정답 레퍼런스를 확인하고 싶을 때는 언제든지 터미널에서 `git diff HEAD~1`을 실행하여 이전 커밋의 정답 코드를 비교해 보세요!

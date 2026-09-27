# 사용자 학습 미션: 함께하기(TOGETHER) 챌린지 공동 집계 및 동기화 엔진

본 미션은 이슈 [#56](https://github.com/es-kimo/dayuse/issues/56)의 핵심 비즈니스 로직인 **함께하기(TOGETHER) 모드의 공동 집계 및 구성원 동기화 엔진**을 구현하는 학습 과제입니다.

---

## 🎯 학습 목표 및 요구사항

### 1. 배경
기존 데이유즈의 챌린지는 참가자 각자가 목표를 달성하는 **각자하기(INDIVIDUAL)** 방식이었습니다.
이슈 #56에서는 그룹원들이 하나의 공통 목표를 향해 협력하는 **함께하기(TOGETHER)** 수행 방식이 추가되었습니다.

- **공동 목표 달성**: 모임원 중 최소 1명이 인증하면 해당 일자는 참여자 전원의 공동 목표가 달성(`COMPLETED`)됩니다.
- **개인 기록 분리**: 공동 목표 달성과 별개로, 실제 인증을 제출한 사람의 개인 인증 통계 및 원본 기록은 분리 보존되어야 합니다.
- **7일 고정 공동 윈도우**: 각자하기와 달리 중도 참여자가 합류하더라도 별도의 개인 주기를 생성하지 않고, 챌린지 시작일 기준의 7일 고정 공동 주기에 즉시 합류합니다.
- **인증 삭제 안전성**: 동일 날짜에 다른 참가자의 유효 인증이 남아있다면 완료 상태가 유지되어야 하며, 해당 날짜의 마지막 남은 인증이 삭제될 때만 공동 달성이 롤백되어야 합니다.

---

## 🧭 미션 안내 및 대상 파일

`git diff HEAD~1` 명령어를 실행하면 정답 레퍼런스 구현과 현재 빈칸(`TODO`)의 차이를 바로 확인할 수 있습니다.

### [미션 1] 함께하기 7일 고정 윈도우 시작 기준일 계산
- **파일**: [`ChallengePeriodCalculator.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/challenge/period/ChallengePeriodCalculator.kt)
- **위치**: `calculate()` 메서드 내 `effectiveStart` 결정 로직
- **요구사항**:
  - `executionType`이 `TOGETHER`인 경우: 참여자의 중도 참여일(`participantStartDate`)과 무관하게 항상 `challengeStartDate`를 주기의 시작 기준일로 사용합니다.
  - `executionType`이 `INDIVIDUAL`인 경우: 기존과 동일하게 `participantStartDate > challengeStartDate`이면 `participantStartDate`를 사용합니다.

### [미션 2] 날짜별 공동 인증 집계 엔진
- **파일**: [`VerificationAggregator.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/verification/service/VerificationAggregator.kt)
- **위치**:
  - `isDateCompleted(challengeId: Long, targetDate: LocalDate): Boolean`
  - `getCompletedDates(challengeId: Long): Set<LocalDate>`
- **요구사항**:
  - `isDateCompleted`: 해당 날짜에 해당 챌린지의 인증이 1건 이상 존재하는지 확인하는 쿼리를 호출합니다.
  - `getCompletedDates`: 챌린지 전체 기간 중 유효한 인증이 1건 이상 등록된 모든 날짜들의 집합(중복 제거 `Set<LocalDate>`)을 반환합니다. 동일 날짜에 다수의 인증이 있더라도 1일로 집계되어야 합니다.

### [미션 3] 공동 인증 등록 및 삭제 시 구성원 진행률 동기화
- **파일**: [`ChallengeProgressService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/challenge/service/ChallengeProgressService.kt)
- **위치**:
  - `onVerificationCreated(verification: Verification, challenge: Challenge)`
  - `onVerificationDeleted(verification: Verification, challenge: Challenge)`
- **요구사항**:
  - `onVerificationCreated`:
    1. `challenge.executionType != ExecutionType.TOGETHER`이면 아무 작업 없이 리턴합니다.
    2. 챌린지의 `ACTIVE` 상태 참여자 목록을 조회합니다.
    3. 각 참여자별로 참여 시작일(`participant.startDate`)이 인증 대상일(`targetDate`)보다 미래인 경우 제외합니다.
    4. `dailyRecordService.ensureDailyRecordsForParticipant`를 호출하여 일일 기록을 보장합니다.
    5. 본인(`participant.userId == verification.userId`)인 경우:
       - 이미 `COMPLETED`가 아니면 당일/지각 인증 반영 (`targetDate < today`이면 `verifyLate`, 아니면 `verifyToday`).
       - 이미 `COMPLETED`인데 `verificationId`가 비어있다면 본인 인증 연결 (`verifyToday`).
    6. 타 참여자인 경우: `it.completeJointly()`를 호출하여 가짜 인증 ID 없이 공동 완료 상태만 반영합니다.
  - `onVerificationDeleted`:
    1. `challenge.executionType != ExecutionType.TOGETHER`이면 아무 작업 없이 리턴합니다.
    2. `verificationAggregator`를 통해 `targetDate`에 남아있는 유효 인증 목록을 조회합니다.
    3. 타 참가자의 인증이 1건 이상 남아있다면: 삭제를 수행한 본인의 `DailyRecord`를 찾아 `clearJointVerification()`을 호출합니다 (공동 완료 상태 유지).
    4. 마지막 남은 인증이 삭제된 경우: 모든 활성 참가자의 `targetDate DailyRecord`를 찾아 `rollbackVerification(today)`를 호출합니다.

---

## 🧪 테스트 및 검증 명령어

아래 Gradle 테스트 명령어를 실행하여 미션 구현 결과를 검증할 수 있습니다.
모든 테스트가 통과(`BUILD SUCCESSFUL / GREEN`)하면 미션 완료입니다!

```bash
cd backend
./gradlew test --tests "com.dayuse.domain.challenge.TogetherChallengeAggregationTest" --tests "com.dayuse.domain.challenge.TogetherChallengePeriodTest"
```

전체 백엔드 테스트 실행:
```bash
cd backend
./gradlew test
```

---

## 💡 힌트 및 팁
- `DailyRecord` 엔티티에는 함께하기 전용 메서드인 `completeJointly()`, `clearJointVerification()`, `rollbackVerification()` 등이 이미 구현되어 있습니다.
- `VerificationRepository`에는 `existsByChallengeIdAndTargetDate`, `findDistinctTargetDatesByChallengeId` 등의 쿼리 메서드가 준비되어 있습니다.
- 풀이가 막히거나 정답 레퍼런스를 참고하고 싶을 때는 언제든지 `git diff HEAD~1`을 확인하세요.

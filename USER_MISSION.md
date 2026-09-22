# 🎓 사용자 핵심 학습 미션: 중도 참여 및 참여자별 개별 수행 기간 (F03)

본 이슈(GitHub Issue #13)는 **"진행 중인 챌린지에 사용자가 개별 시작일로 중도 참여할 때, 어떻게 과거의 데이터 무결성을 보장하고 시작일 전후의 비즈니스 불변 조건을 안전하게 격리·방어할 것인가?"**를 직접 고민하고 구현해보는 핵심 학습 단계입니다.

AI Agent가 기초 인프라, DTO, REST API 엔드포인트, 데이터베이스 스키마 및 프론트엔드 UI를 모두 완성해 두었습니다.  
이제 아래의 핵심 미션들을 직접 완성하여 **RED 상태인 테스트를 GREEN으로 전환**해보세요!

---

## 🎯 핵심 학습 질문 (미션을 완료하고 나면 답할 수 있게 됩니다)
1. **"챌린지 전체 기간(시작일~종료일)과 참여자별 실제 수행 기간(개별 시작일~종료일)이 달라질 때, 참여 전 날짜를 벌금/미수행 계산 및 미인증 상태에서 어떻게 안전하게 배제했나요?"**
2. **"시작 전(참여 취소/금액 수정 가능) vs 시작 당일/이후(변경 불가) 비즈니스 불변(Immutable) 제약조건을 엔티티 도메인 메서드와 트랜잭션에서 어떻게 방어했나요?"**
3. **"기존 참여자의 과거 수행 기록 및 입금 정산 내역에 전혀 사이드 이펙트를 주지 않고 새로운 참여자의 일일 기록을 동적으로 연계하는 트랜잭션 무결성 전략은 무엇인가요?"**

---

## 🧭 미션 목록 및 구현 가이드

### 📍 [미션 1] `ChallengeParticipant.kt` 비즈니스 검증 메서드 구현
- **파일**: [`ChallengeParticipant.kt`](backend/src/main/kotlin/com/dayuse/domain/challenge/ChallengeParticipant.kt)
- **목표**: 참여자의 시작일 전/후 상태 및 금액 수정·취소 불변 조건을 엔티티 레벨에서 방어합니다.
- **구현 항목**:
  1. `isStarted(today: LocalDate)`: `today >= startDate` 여부를 판단합니다.
  2. `canCancel(today: LocalDate)`: 본인의 수행 시작 전(`!isStarted(today)`)이면서 상태가 `ACTIVE`인 경우에만 `true`를 반환합니다.
  3. `canModifyPenalty(today: LocalDate)`: 본인의 수행 시작 전이면서 상태가 `ACTIVE`인 경우에만 `true`를 반환합니다.
  4. `cancel(today: LocalDate)`: `canCancel(today)` 검증을 통과하지 못하면 `ChallengeAlreadyStartedException`을 발생시키고, 통과 시 `status = ParticipantStatus.CANCELLED`로 변경합니다.
  5. `updatePenalty(newAmount: Int, today: LocalDate)`: `canModifyPenalty(today)` 검증 및 `newAmount >= 0` 검증(`BadRequestException`) 후 `this.penaltyAmount = newAmount`로 수정합니다.

---

### 📍 [미션 2] `Challenge.kt`의 중도 참여 시작일 산출 로직 구현
- **파일**: [`Challenge.kt`](backend/src/main/kotlin/com/dayuse/domain/challenge/Challenge.kt)
- **목표**: 챌린지 진행 상태와 사용자가 선택한 `startDateType`(`TODAY`, `TOMORROW`)에 따라 올바른 시작일을 계산합니다.
- **구현 항목 (`calculateStartDate`)**:
  1. 이미 종료된 챌린지(`isEnded(today)`): `BadRequestException("이미 종료된 챌린지에는 참여할 수 없습니다.")`
  2. 아직 시작 전인 챌린지(`!isStarted(today)`): 챌린지의 `startDate`를 그대로 반환
  3. 진행 중인 챌린지:
     - `startDateType`의 기본값은 `StartDateType.TOMORROW`
     - `TODAY`: `today` 반환
     - `TOMORROW`: `today.plusDays(1)` 반환. 단, 오늘이 챌린지 종료 당일(`today >= endDate`)인 경우 내일부터는 불가능하므로 `BadRequestException("종료 당일에는 오늘부터만 참여할 수 있습니다.")` 발생
  4. 계산된 시작일이 `endDate`를 초과하면 `BadRequestException("수행 시작일은 챌린지 종료일 이전이어야 합니다.")` 발생

---

### 📍 [미션 3] `DailyRecordService.kt`의 일일 기록 시작일 격리 방어
- **파일**: [`DailyRecordService.kt`](backend/src/main/kotlin/com/dayuse/domain/dailyrecord/service/DailyRecordService.kt)
- **목표**: 중도 참여자의 참여 이전 날짜에는 `DailyRecord`를 생성하지 않음으로써, 벌금 집계나 미인증 상태 조회에서 원천 배제합니다.
- **구현 항목 (`ensureDailyRecordsForParticipant`)**:
  1. 참여자의 상태가 `ACTIVE`가 아닌 경우(`participant.status != ParticipantStatus.ACTIVE`) 즉시 리턴
  2. 일일 기록 생성 시작일을 `effectiveStartDate`로 산출:
     - `challenge.startDate`와 `participant.startDate` 중 더 늦은 날짜(`if (participant.startDate > challenge.startDate) participant.startDate else challenge.startDate`)

---

### 📍 [미션 4] `ChallengeService.kt`의 참여자별 달성률(완료율) 계산
- **파일**: [`ChallengeService.kt`](backend/src/main/kotlin/com/dayuse/domain/challenge/service/ChallengeService.kt)
- **목표**: 챌린지 전체 기간이 아닌 **본인 실제 수행 기간 대비 완료 일수**로 달성률(%)을 산출합니다.
- **구현 항목 (`getChallengeDetail`)**:
  1. `totalDays`: `participant.startDate`부터 `challenge.endDate`까지의 일수 (양 끝일 포함, `ChronoUnit.DAYS.between(p.startDate, challenge.endDate).toInt() + 1`)
  2. `completedCount`: `allRecords` 중 본인 참여(`challengeParticipantId == p.id`)이면서 상태가 `DailyRecordStatus.COMPLETED`인 레코드 개수
  3. `completionRate`: `totalDays > 0`인 경우 `((completedCount.toDouble() / totalDays) * 100).toInt()`, 아니면 `0`

---

## 🧪 테스트 실행 및 검증 명령어

아래 Gradle 테스트 명령어를 실행하여 작성한 코드의 통과 여부를 검증하세요:

```bash
# 1. 단위 테스트 검증 (미션 1)
./gradlew test --tests "com.dayuse.domain.challenge.ChallengeParticipantTest"

# 2. 통합 테스트 검증 (미션 1, 2, 3, 4 전체)
./gradlew test --tests "com.dayuse.domain.challenge.ChallengeMidJoinIntegrationTest"

# 3. 전체 프로젝트 회귀 테스트
./gradlew test
```

---

## 💡 정답 비교 및 힌트 확인 방법

작업을 완료하여 테스트를 모두 `GREEN`으로 만드신 후(또는 풀이 도중 막힐 때), 아래 명령어를 통해 Agent가 미리 작성해 둔 모범 답안과 손쉽게 비교해 볼 수 있습니다:

```bash
# 직전 완성본 커밋과 현재 빈칸/작성 코드의 차이점 한눈에 보기
git diff HEAD~1
```

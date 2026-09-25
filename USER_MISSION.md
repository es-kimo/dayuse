# 🎯 [이슈 27번] 주 N회 화면·정산·알림 연결 핵심 학습 미션

안녕하세요! **이슈 27번 (`[v0.3] 04. 주기별 화면·정산·알림 연결 (F05)`)** 의 인프라, 프론트엔드 UI, 엔티티, 통합 테스트 코드가 모두 구현되었습니다.

협업 학습 규칙에 따라, **이전 커밋(`HEAD~1`)에 동작하는 완전한 정답 코드가 저장**되어 있으며, 현재 브랜치에는 사용자가 직접 고민하고 구현해볼 수 있도록 **3가지 핵심 비즈니스 로직에 `TODO [사용자 미션 N]` 빈칸**이 뚫려 있습니다 (`RED` 상태).

---

## 🔍 학습 시작하기 & 정답 확인 방법
터미널에서 다음 명령어를 실행하면 어떤 파일의 어느 부분이 빈칸으로 뚫려 있는지 한눈에 확인할 수 있습니다:
```bash
git diff HEAD~1
```
미션을 모두 해결한 후 테스트를 통과(`GREEN`)시키면, `git diff HEAD~1`을 다시 실행하여 본인의 풀이와 이전 커밋의 레퍼런스 정답을 비교해 볼 수 있습니다!

---

## 📋 핵심 미션 목록

### 미션 1: `ChallengeService.kt` - 주 N회 구간 상태 머신 및 본인 확정 API
- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/challenge/service/ChallengeService.kt`
- **세부 내용**:
  1. **미션 1-A (`getChallengeDetail`)**:
     - 주 N회 구간(`intervals`) 매핑 시, 오늘 날짜(`today`)와 구간 종료일(`interval.endDate`)을 비교하여 상태를 판정합니다:
       - 구간이 종료(`today > interval.endDate`)되었을 때:
         - 목표를 달성했으면 `ACHIEVED`
         - 목표에 미달했으면 DB에 이미 확정된 내역(`ChallengePeriodSettlement`)이 존재하는지 확인:
           - 확정 내역이 있으면 `CONFIRMED_FAILED`
           - 확정 내역이 아직 없으면 본인 확인 대기(`NEEDS_CONFIRMATION`)
       - 구간이 진행 중(`today <= interval.endDate`)일 때: `IN_PROGRESS`
     - 미수행 횟수(`missedCount`)와 총 벌금(`totalPenaltyAmount`)을 정확히 산출하여 `ChallengePeriodIntervalDto`에 바인딩하세요.
  2. **미션 1-B (`confirmPeriod`)**:
     - 아직 진행 중인 구간(`today <= interval.endDate`)이거나 이미 목표를 달성한 구간(`interval.isAchieved`)인 경우 예외(`BadRequestException`)를 발생시킵니다.
     - **멱등성 보장**: 이미 `CONFIRMED_FAILED`로 확정된 내역이 존재하면 중복 벌금 부과 없이 기존 확정 내역을 반환합니다.
     - 미수행 횟수(`missedCount = maxOf(0, targetCount - completedCount)`)와 총 벌금(`missedCount * penaltyAmountPerMiss`)을 계산하고, `ChallengePeriodSettlement` 엔티티를 생성/저장(상태: `CONFIRMED_FAILED`, `depositStatus: UNPAID`)합니다.

---

### 미션 2: `SettlementService.kt` - 주간 구간 미수행 벌금의 입금 신고 통합
- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/settlement/service/SettlementService.kt`
- **세부 내용**:
  1. **미션 2-A (`getUnpaidRecords`)**:
     - `challengePeriodSettlementRepository`에서 본인(`userId`)과 모임(`groupId`)의 미납(`UNPAID`) 구간 정산 내역을 조회합니다.
     - 조회한 정산 내역을 `UnpaidRecordItemResponse(isPeriod = true, ...)` 형태로 변환하여 기존 일일 미납 기록(`dailyItems`)과 합쳐서 반환합니다.
  2. **미션 2-B (`createDepositReport`)**:
     - 요청에 포함된 `periodSettlementIds`에 해당하는 구간 정산 건들을 검증합니다:
       - 본인 및 모임 소유 여부 검증
       - `CONFIRMED_FAILED` 및 `depositStatus == UNPAID` 상태 검증
       - 벌금액이 0보다 큰지 검증
     - 총 신고 금액(`calculatedTotal`)에 구간 벌금 합계를 합산 검증합니다.
     - 구간 정산 건들의 `depositStatus`를 `WAITING_CONFIRMATION`으로 전이시킵니다.
     - `DepositReportItem` 생성 시 `periodSettlementId`를 매핑하여 저장합니다.

---

### 미션 3: `NotificationSchedulerService.kt` - 주 N회 웹 푸시 발송 조건 복합 판정
- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/notification/service/NotificationSchedulerService.kt`
- **세부 내용**:
  - `countPendingChallenges`에서 `WEEKLY_N` 챌린지의 알림 대상을 카운트할 때:
    - 당일 미인증이더라도, 사용자가 **해당 구간의 목표(targetCount)를 이미 달성(`curPeriod.isAchieved`)한 경우** 알림 발송 대상에서 제외(카운트 X)해야 합니다.
    - 당일 미인증이면서 **아직 이번 구간의 목표 횟수를 다 채우지 못한 경우에만** `pendingCount`를 1 증가시키세요.

---

## 🧪 테스트 실행 명령어
미션을 수행하면서 다음 통합 테스트를 실행해 상태를 점검할 수 있습니다:

```bash
cd backend
./gradlew test --tests ChallengePeriodSettlementIntegrationTest
```

테스트가 모두 통과(`GREEN`, 3 tests completed, 0 failed)하면 전체 백엔드 테스트를 확인합니다:
```bash
./gradlew test
```

프론트엔드 빌드 및 단위 테스트 확인:
```bash
cd ../frontend
npm run build
npm test -- --run
```

모든 테스트가 통과하면 완성입니다! 화이팅! 🚀

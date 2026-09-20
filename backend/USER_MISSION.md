# 🎯 사용자 핵심 학습 미션 가이드 (Issue #4)

이 문서는 사용자가 직접 구현하고 고민해 보아야 하는 **3가지 핵심 학습 미션** 안내서입니다.
구현 후 `cd backend && ./gradlew test`를 실행하면 본인의 코드가 올바르게 동작하는지 즉시 검증할 수 있습니다.

💡 **정답/레퍼런스 코드가 궁금할 땐?**
언제든지 `git diff HEAD~1`을 실행하면 이전 완성본 커밋의 레퍼런스 구현을 바로 확인하고 비교할 수 있습니다!

---

## 🎓 이 이슈를 끝내고 답할 수 있게 될 핵심 질문
1. **"상태가 5가지(`예정`, `인증대기`, `완료`, `미확인`, `미수행`)로 변화하는 복잡한 상태 머신을 DB에 어떻게 영속화하고 전이시켰나요?"**
2. **"자정이 지났을 때 대량의 데이터를 매일 배치로 일괄 업데이트하지 않고도 실시간 쿼리로 성능 저하 없이 상태를 판별하는 방법은?"**
3. **"사용자별 미수행 벌금을 집계할 때 복잡한 조건(미확인 제외, 다중 챌린지 합산)을 SQL 집계 함수(`SUM`, `GROUP BY`)로 어떻게 안전하게 작성하나요?"**

---

## 📌 미션 1: `DailyRecord` 엔티티 상태 전이 메서드 (`markFailed()`, `verifyLate()`) 직접 구현
- **관련 파일**:
  - `backend/src/main/kotlin/com/dayuse/domain/dailyrecord/DailyRecord.kt`
- **목표**:
  도메인 엔티티 내에 날짜별 5대 상태 머신의 전이 규칙과 정산 락(`depositStatus != UNPAID`) 가드 로직을 응집도 높게 캡슐화합니다.
- **작업 내용**:
  1. `markFailed(penalty: Int)`:
     - 락 검사: `isLocked()`가 `true`이면 `BadRequestException("정산 진행 중이거나 완료된 기록은 상태를 변경할 수 없습니다.")`를 던집니다.
     - 전이 조건 검사: 현재 상태가 `DailyRecordStatus.UNCHECKED`가 아니라면 `BadRequestException("미확인 상태의 기록만 미수행으로 확정할 수 있습니다.")`를 던집니다.
     - 상태 변경: `status`를 `FAILED`로 변경하고, `penaltyAmount`에 전달받은 약정 금액(`penalty`)을 설정하며, `failedAt`에 현재 시각(`LocalDateTime.now()`)을 기록합니다.
  2. `verifyLate(verificationId: Long)`:
     - 락 검사: `isLocked()`가 `true`이면 `BadRequestException("정산 진행 중이거나 완료된 기록은 인증을 등록할 수 없습니다.")`를 던집니다.
     - 전이 조건 검사: 현재 상태가 `UNCHECKED` 또는 `FAILED`가 아니라면 `BadRequestException("미확인 또는 미수행 상태의 기록만 늦은 인증을 등록할 수 있습니다.")`를 던집니다.
     - 상태 변경: `status`를 `COMPLETED`로 변경하고, `verificationId`를 연결하며, `penaltyAmount`를 `0`으로 즉시 복구(차감)하고, `isLate`를 `true`로 설정합니다.
- **검증 테스트**: `DailyRecordIntegrationTest`, `DailyRecordTransactionTest`

---

## 📌 미션 2: `DailyRecordRepository` 미수행 미납 벌금(`SUM`) 집계 쿼리 직접 작성
- **관련 파일**:
  - `backend/src/main/kotlin/com/dayuse/domain/dailyrecord/DailyRecordRepository.kt`
- **목표**:
  미확인(`UNCHECKED`) 날짜는 벌금에 절대 산입되지 않고, 오직 사용자가 명시적으로 확정한 미수행(`FAILED`)이면서 아직 정산되지 않은(`UNPAID`) 약정 벌금만을 안전하게 합산하는 JPQL 집계 쿼리를 작성합니다.
- **작업 내용**:
  `calculateUnpaidPenaltyAmount` 메서드의 `@Query`에 JPQL을 작성합니다.
  - ⚠️ **주의**: 집계 조건에 일치하는 행이 0건일 때 SQL의 `SUM` 함수는 `null`을 반환하므로, Kotlin의 Non-null 타입인 `Int`로 안전하게 매핑되도록 `COALESCE(SUM(r.penaltyAmount), 0)` 함수를 사용해야 합니다!
  ```kotlin
  @Query("""
      SELECT COALESCE(SUM(r.penaltyAmount), 0)
      FROM DailyRecord r
      WHERE r.userId = :userId
        AND r.groupId = :groupId
        AND r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.FAILED
        AND r.depositStatus = com.dayuse.domain.dailyrecord.DepositStatus.UNPAID
  """)
  fun calculateUnpaidPenaltyAmount(
      @Param("userId") userId: Long,
      @Param("groupId") groupId: Long
  ): Int
  ```
- **검증 테스트**: `DailyRecordIntegrationTest`, `DailyRecordTransactionTest`

---

## 📌 미션 3: 늦은 인증 등록 시 벌금 차감 트랜잭션 무결성 검증 테스트 작성
- **관련 파일**:
  - `backend/src/test/kotlin/com/dayuse/domain/dailyrecord/DailyRecordTransactionTest.kt`
- **목표**:
  미수행 확정으로 부과되었던 약정 벌금(10,000원)이 늦은 사진 인증 등록 시 즉시 0원으로 복구되고, 미납 벌금 집계에서도 정확히 차감되는지 트랜잭션 무결성을 직접 테스트 코드로 검증합니다.
- **작업 내용**:
  `DailyRecordTransactionTest.kt`의 `미수행 확정 후 늦은 인증 등록 시 벌금이 차감되는 트랜잭션 무결성 검증` 테스트 메서드 내부의 `TODO`를 구현합니다:
  1. `val failedDetail = dailyRecordService.markFailed(targetRecord.id, user.id)` 호출 후 `assertEquals(DailyRecordStatus.FAILED, failedDetail.status)`, `assertEquals(10000, failedDetail.penaltyAmount)` 검증
  2. `dailyRecordRepository.calculateUnpaidPenaltyAmount(user.id, group.id)`가 `10000`원인지 검증
  3. `LateVerificationRequest(imageUrl = "...", comment = "...")`를 생성하여 `dailyRecordService.verifyLate(targetRecord.id, user.id, lateRequest)` 호출
  4. DB에서 레코드를 다시 조회(`dailyRecordRepository.findById(targetRecord.id).get()`)하여 `COMPLETED`, `penaltyAmount == 0`, `isLate == true`인지 검증
  5. `dailyRecordRepository.calculateUnpaidPenaltyAmount(user.id, group.id)`가 `0`원으로 차감 복구되었는지 검증
- **검증 테스트**: `DailyRecordTransactionTest`

---

## 🧪 테스트 실행 및 검증 방법
```bash
cd backend
./gradlew test
```
현재 빈칸 스텁 상태에서는 해당 미션 관련 테스트들이 **FAILED (RED)** 상태입니다:
- `DailyRecordTransactionTest > 미수행 확정 후 늦은 인증 등록 시 벌금이 차감되는 트랜잭션 무결성 검증()`
- `DailyRecordIntegrationTest > DoD 2 사용자가 미수행을 확정했을 때만 정확히 약정 금액이 미납금에 산입된다()`
- `DailyRecordIntegrationTest > DoD 3 과거 미확인 또는 미수행 날짜에 늦은 인증을 올리면 완료로 변경되고 미납 벌금이 즉시 제외된다()`
- `DailyRecordIntegrationTest > DoD 4 여러 챌린지를 미수행한 경우 각 챌린지의 약정 벌금이 정확히 누적 합산된다()`

위 3가지 미션을 순서대로 채워 넣으면 모든 테스트(90개)가 **BUILD SUCCESSFUL (GREEN)**으로 전환됩니다!
미션을 완료한 뒤 언제든지 `git diff HEAD~1`로 이전 완성본과 본인의 구현을 비교해 보세요.


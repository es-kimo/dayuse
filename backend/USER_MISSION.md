# 🎯 사용자 핵심 학습 미션 가이드 (Issue #5)

이 문서는 사용자가 직접 구현하고 고민해 보아야 하는 **3가지 핵심 학습 미션** 안내서입니다.
구현 후 `cd backend && ./gradlew test`를 실행하면 본인의 코드가 올바르게 동작하는지 즉시 검증할 수 있습니다.

💡 **정답/레퍼런스 코드가 궁금할 땐?**
언제든지 `git diff HEAD~1`을 실행하면 이전 완성본 커밋의 레퍼런스 구현을 바로 확인하고 비교할 수 있습니다!

---

## 🎓 이 이슈를 끝내고 답할 수 있게 될 핵심 질문
1. **"돈과 정산이 오가는 도메인에서 동시성 문제(이중 입금 신고, 동시 승인)를 InnoDB 비관적 락(`SELECT ... FOR UPDATE`)으로 어떻게 해결했나요?"**
2. **"모임장의 승인 취소 시 연결된 N개의 미납 기록을 다시 원복하고 누적액을 차감하는 복잡한 롤백을 `@Transactional`로 어떻게 일관성 있게 보장했나요?"**
3. **"정산 상태의 모든 변경 이력을 추적하기 위해 별도의 감사 로그(Audit Log) 테이블을 설계한 이유는 무엇인가요?"**

---

## 📌 미션 1: `DailyRecordRepository` 비관적 락(`SELECT ... FOR UPDATE`) 쿼리 완성
- **관련 파일**:
  - `backend/src/main/kotlin/com/dayuse/domain/dailyrecord/DailyRecordRepository.kt`
- **목표**:
  모임원이 미납 기록들을 선택해 입금을 신고할 때, 동일한 일일 기록에 대해 동시에 중복 입금 신고가 발생하는 것을 DB 레벨에서 원천 차단하기 위해 `SELECT ... FOR UPDATE` 비관적 쓰기 락(`PESSIMISTIC_WRITE`)을 적용합니다.
- **작업 내용**:
  `DailyRecordRepository`의 `findAllByIdInWithLock` 메서드 위에 Spring Data JPA의 `@Lock(LockModeType.PESSIMISTIC_WRITE)` 어노테이션을 부여합니다.
  ```kotlin
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM DailyRecord r WHERE r.id IN :ids")
  fun findAllByIdInWithLock(@Param("ids") ids: Collection<Long>): List<DailyRecord>
  ```
  - **작동 원리**: 트랜잭션이 시작되고 해당 메서드로 레코드들을 조회할 때 InnoDB가 해당 레코드 행들에 X-Lock(배타 락)을 겁니다. 동일 레코드에 대해 동시에 실행된 다른 트랜잭션은 락이 해제될 때까지 대기하다가, 먼저 실행된 트랜잭션이 상태를 `WAITING_CONFIRMATION`으로 전이한 뒤 커밋하면 이후에 락을 얻게 됩니다. 이때 상태 검사(`depositStatus == UNPAID`)에 걸려 `BadRequestException`이 발생하며 중복 신고가 안전하게 방어됩니다.
- **검증 테스트**: `SettlementConcurrencyTest`

---

## 📌 미션 2: `SettlementService` 모임장 승인 확인 취소(롤백) 비즈니스 로직 구현
- **관련 파일**:
  - `backend/src/main/kotlin/com/dayuse/domain/settlement/service/SettlementService.kt`
- **목표**:
  모임장이 실수로 입금을 잘못 승인했을 때, 한 번의 트랜잭션(`@Transactional`) 안에서 승인 상태를 취소(`CANCELLED`)하고 연결된 N개의 일일 미수행 기록을 다시 `UNPAID`로 원복하며, 감사 로그를 안전하게 남기는 복합 롤백 로직을 구현합니다.
- **작업 내용**:
  `SettlementService.kt`의 `cancelConfirmation` 메서드 내부를 구현합니다:
  1. `reportId`로 `DepositReport` 조회 (미존재 시 `ResourceNotFoundException`)
  2. 모임장 권한 검증: `validateHost(report.groupId, hostUserId)`
  3. 상태 검증: 현재 신고 상태가 `DepositReportStatus.CONFIRMED`가 아니면 `BadRequestException("확인 완료(CONFIRMED) 상태의 입금 건만 확인을 취소할 수 있습니다.")`
  4. 취소 사유 검증: `request.reason.trim().isBlank()`이면 `BadRequestException("확인 취소 사유를 입력해 주세요.")`
  5. 신고 상태 갱신: `report.cancelConfirmationByHost(hostUserId, reason)` 호출
  6. 연관 기록 원복: `depositReportItemRepository.findAllByDepositReportId(report.id)`로 아이템들을 찾고, 연관된 `DailyRecord` N건을 조회하여 `record.depositStatus = DepositStatus.UNPAID`로 일괄 원복
  7. 감사 로그 생성 및 저장: `DepositAuditLog`(`depositReportId = report.id`, `action = DepositAuditAction.CONFIRMATION_CANCELLED_BY_HOST`, `actorUserId = hostUserId`, `reason = reason`)를 생성해 `depositAuditLogRepository.save()`
  8. `return getReportDetail(report.id, hostUserId)` 반환
- **검증 테스트**: `SettlementIntegrationTest > 모임장이 승인을 취소하면 누적액에서 차감되고 연결 기록들이 다시 미납으로 안전하게 원복된다()`

---

## 📌 미션 3: `SettlementConcurrencyTest` 멀티스레드 동시성 테스트 코드 작성
- **관련 파일**:
  - `backend/src/test/kotlin/com/dayuse/domain/settlement/SettlementConcurrencyTest.kt`
- **목표**:
  멀티스레드(`ExecutorService`, `CountDownLatch`) 환경을 구성하여 2개의 스레드가 동일한 미납 기록들에 대해 동시에 `createDepositReport`를 호출할 때, 비관적 락으로 인해 1건만 성공하고 1건은 차단되는지 검증하는 테스트 코드를 작성합니다.
- **작업 내용**:
  `SettlementConcurrencyTest.kt`의 테스트 메서드 내부를 구현합니다:
  1. `threadCount = 2`, `Executors.newFixedThreadPool(threadCount)`, `readyLatch = CountDownLatch(threadCount)`, `startLatch = CountDownLatch(1)`, `doneLatch = CountDownLatch(threadCount)` 준비
  2. `successCount = AtomicInteger(0)`, `failCount = AtomicInteger(0)` 카운터 생성
  3. `request = CreateDepositReportRequest(depositorName = "동시성입금자", depositDate = today, totalAmount = 10000, dailyRecordIds = listOf(record1.id, record2.id))` 생성
  4. 두 스레드가 `readyLatch.countDown()` 후 `startLatch.await()`로 신호를 기다렸다가, 동시에 `settlementService.createDepositReport(group.id, memberUser.id, request)`를 호출하도록 실행
  5. `readyLatch.await()`, `startLatch.countDown()`, `doneLatch.await()`로 동시 실행 및 종료 대기
  6. 검증:
     - `assertEquals(1, successCount.get())`
     - `assertEquals(1, failCount.get())`
     - `depositReportRepository.findAllByGroupIdOrderByCreatedAtDesc(group.id).size == 1`
     - `DailyRecord`들의 `depositStatus == DepositStatus.WAITING_CONFIRMATION`
     - `DepositAuditLog`의 `REPORTED` 액션이 1건 존재
- **검증 테스트**: `SettlementConcurrencyTest`

---

## 🧪 테스트 실행 및 검증 방법
```bash
cd backend
./gradlew test
```
현재 빈칸 스텁 상태에서는 해당 미션 관련 테스트들이 **FAILED (RED)** 상태입니다:
- `SettlementConcurrencyTest > 동일한 미납 기록들에 대해 2개의 스레드가 동시에 입금 신고를 시도할 때 비관적 락으로 1건만 성공하고 중복 처리가 방어된다()`
- `SettlementIntegrationTest > 모임장이 승인을 취소하면 누적액에서 차감되고 연결 기록들이 다시 미납으로 안전하게 원복된다()`

위 3가지 미션을 순서대로 채워 넣으면 모든 테스트(101개)가 **BUILD SUCCESSFUL (GREEN)**으로 전환됩니다!
미션을 완료한 뒤 언제든지 `git diff HEAD~1`로 이전 완성본과 본인의 구현을 비교해 보세요.


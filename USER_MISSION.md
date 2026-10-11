# 🎯 사용자 핵심 학습 미션 가이드 (#148: 멱등적 코인 원장 트랜잭션·차액 보정·비상 통제)

이 문서는 **[v0.13] 03. 멱등적 코인 원장 트랜잭션·차액 보정·비상 통제 (F06·F07·F11)** 이슈의 핵심 비즈니스 로직을 직접 구현하고 검증하기 위한 가이드입니다.

> 💡 **빠른 빈칸 위치 및 정답 확인**:
> 터미널에서 `git diff HEAD~1`을 실행하면, 어떤 파일의 어느 라인을 채워 넣어야 하는지(그리고 이전 커밋의 레퍼런스 정답 코드는 무엇인지) 한눈에 확인할 수 있습니다.

---

## 📌 미션 목록 및 대상 파일

### 1️⃣ [사용자 미션 1] 멱등성을 보장하는 백그라운드 자동 코인 지급 엔진 (F06, 5.4)
- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/coin/service/CoinTransactionService.kt`
- **구현 대상 메서드**: `grantCoins(...)` (`TODO [사용자 미션 1]`)
- **요구사항**:
  1. `eligibleDates`가 비어있으면 `emptyList()`를 즉시 반환합니다.
  2. `userId`에 해당하는 `CoinBalance`를 비관적 행 레벨 락(`getOrCreateBalanceForUpdate(userId)`)으로 조회하여 동시성 레이스 컨디션을 방지합니다.
  3. `eligibleDates.sorted()`의 각 `targetDate`에 대해:
     - 멱등키를 생성합니다: `"GRANT:CHALLENGE:${challengeId}:USER:${userId}:DATE:${targetDate}"`
     - `coinTransactionRepository.existsByIdempotencyKey(key)`를 검사하여 이미 지급된 경우 중복 지급하지 않고 건너뜁니다(`continue`).
     - 지급 수량은 1일 상한 기준인 `CoinPolicy.DAILY_COIN_CAP`(10코인)입니다.
     - `coinEmergencyControlService.shouldHold(userId, amount)`를 통해 비상 킬스위치 활성화 또는 이상 패턴 여부를 판정합니다:
       - **보류 대상인 경우 (`true`)**: `balance.addHeld(amount, now)`, `type = CoinTransactionType.HOLD`, `status = CoinTransactionStatus.HELD`
       - **정상 지급인 경우 (`false`)**: `balance.addAvailable(amount, now)`, `type = CoinTransactionType.GRANT`, `status = CoinTransactionStatus.COMPLETED`
     - 동시 요청에 따른 DB 유니크 제약 충돌 방어(`try-catch DataIntegrityViolationException`)를 적용하여 원장 트랜잭션을 저장하고 결과 리스트에 누적합니다.
  4. 잔액(`balance`)을 저장하고 새로 지급된 원장 트랜잭션 목록을 반환합니다.

---

### 2️⃣ [사용자 미션 2] 원장 불변성 기반 차액 보정 엔진 (F07, 5.4)
- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/coin/service/CoinTransactionService.kt`
- **구현 대상 메서드**: `adjustCoins(...)` (`TODO [사용자 미션 2]`)
- **요구사항**:
  1. `adjustmentAmount == 0`이면 `BadRequestException("보정 금액은 0일 수 없습니다.")` 예외를 던집니다.
  2. `getOrCreateBalanceForUpdate(userId)`로 비관적 락을 획득합니다.
  3. `idempotencyKey`가 지정되지 않았으면 `"ADJUST:USER:${userId}:DATE:${targetDate}:AMT:${adjustmentAmount}:TIME:${now}"` 형태로 생성하고, 동일 멱등키가 이미 존재하면 해당 기존 트랜잭션을 반환합니다.
  4. **원장 불변성(Append-Only)** 원칙에 따라 기존 원장은 수정하지 않고 차액에 따른 분기를 수행합니다:
     - `adjustmentAmount > 0`: `type = ADJUSTMENT_ADD`, `balance.addAvailable(absAmount, now)`
     - `adjustmentAmount < 0`: `type = ADJUSTMENT_SUB`, `balance.subtractAvailable(absAmount, now)` (가용 잔액 부족 시 `BadRequestException` 방어)
  5. 새로운 `CoinTransaction` 행을 생성(`balanceAfter`, `heldBalanceAfter` 최신 스냅샷 포함)하여 저장하고 반환합니다.

---

### 3️⃣ [사용자 미션 3] 보류 건 관리자 승인/반려 및 원장 정합성 검증 (F11, 5.3.7)
- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/coin/service/CoinTransactionService.kt`
- **구현 대상 메서드**:
  1. `approveHeldTransaction(...)` (`TODO [사용자 미션 3-1]`)
     - `transactionId`를 조회하고 거래 상태가 `HELD`가 아니면 `BadRequestException`을 던집니다.
     - `balance.releaseHeld(heldTx.amount, now)`로 보류 잔액에서 차감하고 가용 잔액으로 이동시킵니다.
     - 기존 HELD 건에 관리자 승인 정보(`heldTx.markReleased(adminUserId, now)`)를 기록합니다.
     - `type = RELEASE`, `status = COMPLETED`인 신규 원장 행을 생성하여 저장 및 반환합니다.
  2. `rejectHeldTransaction(...)` (`TODO [사용자 미션 3-2]`)
     - `transactionId`를 조회하고 거래 상태가 `HELD`가 아니면 `BadRequestException`을 던집니다.
     - `balance.rejectHeld(heldTx.amount, now)`로 보류 잔액에서 차감합니다 (가용 잔액은 변동 없음).
     - 기존 HELD 건에 관리자 반려 정보(`heldTx.markRejected(adminUserId, reason, now)`)를 기록합니다.
     - `type = REJECT`, `status = REJECTED`인 신규 원장 행을 생성하여 저장 및 반환합니다.
  3. `verifyLedgerConsistency(userId)` (`TODO [사용자 미션 3-3]`)
     - 공식: $M_{end} = M_{start} + I - S - R$
     - `CoinBalance`의 `availableBalance`와 `heldBalance`를 조회합니다.
     - 전체 원장 행을 순회하며 합계를 계산합니다:
       - `GRANT`, `ADJUSTMENT_ADD`: COMPLETED 시 `calculatedAvailable += amount`
       - `ADJUSTMENT_SUB`: COMPLETED 시 `calculatedAvailable -= amount`
       - `HOLD`: `calculatedHeld += amount`
       - `RELEASE`: COMPLETED 시 `calculatedHeld -= amount`, `calculatedAvailable += amount`
       - `REJECT`: `calculatedHeld -= amount`
     - `isConsistent = (currentAvailable == calculatedAvailable) && (currentHeld == calculatedHeld)`를 검증하여 `LedgerConsistencyResponse`를 반환합니다.

---

## 🧪 테스트 실행 및 검증 명령어

```bash
cd backend
# 1. 단위 테스트 실행 (미션 구현 전 RED -> 구현 후 GREEN)
./gradlew test --tests "com.dayuse.domain.coin.CoinTransactionServiceTest" --console=plain

# 2. 동시성 및 중복 지급 방지 테스트 실행
./gradlew test --tests "com.dayuse.domain.coin.CoinConcurrencyTest" --console=plain

# 3. 통합 테스트 (자동 지급 연계, IDOR 방어, 킬스위치 제어) 실행
./gradlew test --tests "com.dayuse.domain.coin.CoinIntegrationTest" --console=plain
```

모든 빈칸을 채우고 테스트를 실행하면 모든 테스트가 **GREEN(통과)**으로 전환됩니다!

---

## 💬 구현 후 스스로 답해볼 핵심 질문
1. 결과 화면을 열지 않아도 백그라운드 자동 지급이 이루어질 때, 네트워크 재시도나 동시 요청 속에서 중복 지급을 원천 방지(멱등성 보장)하기 위해 DB 유니크 제약조건과 비관적 락을 어떻게 조합하여 설계했는가?
2. 인증 삭제/수정 등으로 인해 이미 지급된 코인의 적격성이 변동될 때, 기존 원장 이력을 UPDATE/DELETE하지 않고 추가 보정(차액 반영)을 Append-Only로 기록하는 이유는 무엇인가?
3. 비상 킬스위치나 이상 패턴 감지 시 보류된 코인을 사용 가능 잔액에서 어떻게 안전하게 분리하고, 관리자가 승인하거나 반려할 때 잔액과 원장을 어떻게 무결하게 동기화했는가?

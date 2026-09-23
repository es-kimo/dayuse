# 🎓 사용자 핵심 학습 미션: 인증 및 연속 기록 공유 카드 (Issue #14, F01–F02)

본 이슈(GitHub Issue #14)는 **"외부 비인가 공개 엔드포인트(`GET /api/v1/public/shares/{token}`)에서 모임 내부 민감 정보를 원천 격리하고, 비즈니스 불변 규칙에 따른 연속 기록(Streak) 산출 및 공유 링크 라이프사이클(삭제/해제 연동)을 어떻게 안전하게 방어할 것인가?"**를 직접 고민하고 구현해보는 핵심 학습 단계입니다.

AI Agent가 인프라, Flyway DB 마이그레이션(`V3__create_share_cards.sql`), REST API 컨트롤러, 9:16 인스타 스토리 규격 모달(`ShareCardModal.tsx`), 카카오톡 SDK 연동, 공개 카드 랜딩 페이지(`/shares/:token`) 및 온보딩 플로우를 모두 완성해 두었습니다.  
이제 아래의 4가지 핵심 미션을 직접 완성하여 **RED 상태인 9개의 테스트를 GREEN으로 전환**해보세요!

---

## 🎯 핵심 학습 질문 (미션을 완료하고 나면 답할 수 있게 됩니다)
1. **"외부 공개 엔드포인트(`GET /api/v1/public/shares/{token}`)에서 모임 내부 민감 정보(모임명, 타 회원 정보, 정산 내역)가 유출되지 않도록 스냅샷 기반의 DTO 격리를 어떻게 달성했나요?"**
2. **"공유 링크의 소유자 권한 확인 및 원본 인증 삭제/공유 링크 해제 시 즉시 무효화(`404 Not Found`)되는 라이프사이클을 서비스 레이어 및 도메인 엔티티에서 어떻게 관리했나요?"**
3. **"연속 달성 일수(Streak)를 계산할 때 '오늘 완료 전에는 어제까지, 오늘 완료 후에는 오늘까지 집계'하고, 중도 참여자의 과거 기록을 안전하게 방어하는 날짜 역순 순회 알고리즘은 어떻게 설계했나요?"**

---

## 🧭 미션 목록 및 구현 가이드

### 📍 [미션 1] `ShareCard.kt` 엔티티 비즈니스 메서드 구현
- **파일**: [`ShareCard.kt`](backend/src/main/kotlin/com/dayuse/domain/share/ShareCard.kt)
- **목표**: 공유 카드의 비활성화 상태 전이 및 작성자 본인 소유권 검증 메서드를 구현합니다.
- **구현 항목**:
  1. `deactivate()`: `this.isActive = false`로 변경합니다.
  2. `validateOwner(requestUserId: Long)`: 요청한 사용자가 카드의 소유자가 아닌 경우(`this.userId != requestUserId`), `ForbiddenException("본인의 공유 카드만 조작할 수 있습니다.")`을 발생시킵니다.

---

### 📍 [미션 2] `StreakCalculator.kt` 연속 기록(Streak) 산출 알고리즘 구현
- **파일**: [`StreakCalculator.kt`](backend/src/main/kotlin/com/dayuse/domain/share/service/StreakCalculator.kt)
- **목표**: 오늘 인증 완료 여부와 참여자의 시작일을 고려하여 날짜 역순으로 연속 달성 일수를 계산합니다.
- **구현 항목 (`calculateStreak`)**:
  1. **기준 날짜(`baseDate`) 산출**:
     - 오늘(`today`)의 일일 기록 상태가 `DailyRecordStatus.COMPLETED`이면 기준 날짜는 `today`입니다.
     - 아직 완료 전이면 기준 날짜는 어제(`today.minusDays(1)`)입니다.
  2. **연속 달성 일수(`streakDays`) 순회 계산**:
     - 기준 날짜가 참여자의 수행 시작일(`effectiveStartDate`) 이전이거나, 기준 날짜의 일일 기록이 `COMPLETED`가 아니면 `streakDays = 0`입니다.
     - 기준 날짜가 `COMPLETED`라면, 기준일부터 하루씩 과거로 이동(`checkDate = checkDate.minusDays(1)`)하면서 `COMPLETED`인 일수를 연속 카운트합니다.
     - 단, `effectiveStartDate` 이전으로는 절대 넘어가지 않도록 순회를 중단(break)해야 합니다.

---

### 📍 [미션 3] `ShareCardService.kt` 비인가 공개 카드 조회 차단 가드 및 소유권 검증
- **파일**: [`ShareCardService.kt`](backend/src/main/kotlin/com/dayuse/domain/share/service/ShareCardService.kt)
- **목표**: 비활성화된 공유 카드에 대한 외부 접근을 원천 차단하고, 본인 카드만 해제할 수 있도록 보안 가드를 적용합니다.
- **구현 항목**:
  1. `getPublicShareCard(token: String)`:
     - 카드가 존재하지 않거나, 비활성화된 상태(`!card.isActive`)인 경우 `ResourceNotFoundException("공유 카드를 찾을 수 없거나 비활성화되었습니다.")`을 발생시켜 외부 접근을 차단합니다.
  2. `deactivateShareCard(userId: Long, token: String)`:
     - 토큰으로 카드를 찾은 후, `card.validateOwner(userId)`를 호출하여 본인 여부를 검증하고 `card.deactivate()`를 호출합니다.

---

### 📍 [미션 4] `VerificationService.kt` 원본 인증 삭제 시 공유 카드 비활성화 연동
- **파일**: [`VerificationService.kt`](backend/src/main/kotlin/com/dayuse/domain/verification/service/VerificationService.kt)
- **목표**: 원본 인증 내역이 삭제될 때 연계된 외부 공개 카드도 함께 즉시 무효화되도록 트랜잭션을 연동합니다.
- **구현 항목 (`deleteVerification`)**:
  - `shareCardRepository?.findAllByVerificationIdAndIsActiveTrue(verificationId)`로 해당 인증의 모든 활성 공유 카드를 조회하여 각각 `it.deactivate()`를 호출합니다.

---

## 🧪 테스트 실행 및 검증 명령어

아래 Gradle 테스트 명령어를 실행하여 작성한 코드의 통과 여부를 검증하세요:

```bash
# 1. 단위 테스트 검증 (미션 1, 2)
./gradlew test --tests "com.dayuse.domain.share.ShareCardTest"
./gradlew test --tests "com.dayuse.domain.share.StreakCalculatorTest"

# 2. 통합 테스트 검증 (미션 1, 2, 3, 4 전체)
./gradlew test --tests "com.dayuse.domain.share.ShareCardIntegrationTest"

# 3. 공유 도메인 전체 테스트
./gradlew test --tests "com.dayuse.domain.share.*"

# 4. 전체 프로젝트 회귀 테스트
./gradlew test
```

---

## 💡 정답 비교 및 힌트 확인 방법

작업을 완료하여 테스트를 모두 `GREEN`으로 만드신 후(또는 풀이 도중 막힐 때), 아래 명령어를 통해 Agent가 미리 작성해 둔 모범 답안과 손쉽게 비교해 볼 수 있습니다:

```bash
# 직전 완성본 커밋과 현재 빈칸/작성 코드의 차이점 한눈에 보기
git diff HEAD~1
```

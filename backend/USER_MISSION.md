# 🎯 사용자 핵심 학습 미션 가이드 (Issue #2)

이 문서는 사용자가 직접 구현하고 고민해 보아야 하는 **3가지 핵심 학습 미션** 안내서입니다.
구현 후 `cd backend && ./gradlew test`를 실행하면 본인의 코드가 올바르게 동작하는지 즉시 검증할 수 있습니다.

💡 **정답/레퍼런스 코드가 궁금할 땐?**
언제든지 `git diff HEAD~1`을 실행하면 이전 완성본 커밋의 레퍼런스 구현을 바로 확인하고 비교할 수 있습니다!

---

## 🎓 이 이슈를 끝내고 답할 수 있게 될 핵심 질문
1. **"비즈니스 규칙(시작일 전/후 수정·참여 잠금 조건)을 DB 컬럼 제약조건이 아닌 도메인 엔티티와 Service 계층에서 어떻게 방어했나요?"**
2. **"챌린지 생성과 생성자 자동 참여를 `@Transactional`을 통해 단일 원자적 단위로 묶어야 하는 이유는 무엇인가요?"**
3. **"한국 시간(KST) 기준 날짜 계산 시 서버의 시스템 타임존에 의존하지 않고 안전하게 처리하려면 어떻게 해야 하나요?"**

---

## 📌 미션 1: `Challenge` 엔티티 도메인 비즈니스 메서드 작성
- **파일**: `backend/src/main/kotlin/com/dayuse/domain/challenge/Challenge.kt`
- **목표**: 서비스 레이어가 비즈니스 규칙을 일일이 조작하는 '빈약한 도메인 모델(Anemic Domain Model)' 대신, 엔티티 객체가 스스로 규칙을 검증하고 데이터를 갱신하도록 도메인 로직을 응집화합니다.
- **작업 내용**:
  1. `isStarted(today)`: 오늘 날짜(`today`)가 시작일(`startDate`) 이상인지 검사 (`today >= startDate`)
  2. `canJoin(today)`: 시작 전(`!isStarted(today)`) 여부 반환
  3. `canModifyFullConditions(today)`: 시작 전(`!isStarted(today)`) 여부 반환
  4. `updateConditions(...)`:
     - **시작 후(`isStarted`)**: `verificationCriteria`, `startDate`, `endDate`가 기존 값과 다르면 `BadRequestException("챌린지 시작 후에는 제목과 설명만 수정할 수 있습니다.")` 예외를 던집니다.
     - **시작 전**: `newStartDate < today`이면 `BadRequestException("시작일은 오늘 이후 날짜여야 합니다.")`, `newEndDate < startDate`이면 `BadRequestException("종료일은 시작일 이후여야 합니다.")` 등을 검증하고 각 필드를 갱신합니다.
     - **공통**: `newTitle` 유효성 검사 (1~50자)
- **검증 테스트**: `ChallengePolicyTest` 및 `ChallengeIntegrationTest`의 시작 전/후 정책 테스트

---

## 📌 미션 2: 챌린지 생성 시 생성자 자동 참여 트랜잭션 원자성 구현
- **파일**: `backend/src/main/kotlin/com/dayuse/domain/challenge/service/ChallengeService.kt`의 `createChallenge` 메서드
- **목표**: 챌린지를 생성한 사람은 별도의 참여 신청 과정 없이 즉시 해당 챌린지의 참여자(Participant)로 등록되어야 합니다. 또한, 챌린지 엔티티만 생성되고 참여자 생성이 실패하는 데이터 불일치를 방지하기 위해 단일 `@Transactional` 안에서 원자적으로 처리합니다.
- **작업 내용**:
  `createChallenge` 메서드 내부에서:
  1. `ChallengeParticipant(challengeId = challenge.id, userId = userId, penaltyAmount = request.myPenaltyAmount)` 엔티티를 생성합니다.
  2. `challengeParticipantRepository.save(...)`를 호출하여 DB에 저장합니다.
  3. 생성된 참여자 정보로 `ChallengeParticipantResponse`를 생성하여 `ChallengeDetailResponse`의 `participants` 리스트에 포함합니다.
- **검증 테스트**: `ChallengeIntegrationTest`의 `DoD 1 모임원이 14일 기본 기간과 5000원 기본 금액으로 챌린지를 정상 생성하고 생성자가 자동 참여된다`

---

## 📌 미션 3: 시작 후 조건 변경 차단 단위 테스트 (JUnit5) 작성
- **파일**: `backend/src/test/kotlin/com/dayuse/domain/challenge/ChallengePolicyTest.kt`
- **목표**: 이미 시작된 챌린지에서 인증 기준(`verificationCriteria`), 시작일(`startDate`), 종료일(`endDate`) 변경을 시도했을 때 `BadRequestException`이 발생하는지 검증하는 단위 테스트를 작성합니다.
- **작업 내용**:
  `ChallengePolicyTest`의 `시작 후 인증 기준, 시작일, 종료일을 변경하려고 하면 BadRequestException이 발생한다` 테스트 메서드에 던져진 `NotImplementedError`를 제거하고, `assertThrows(BadRequestException::class.java)`를 활용하여 예외가 발생하는지 검증하는 테스트 코드를 완성하세요.
- **검증 테스트**: `ChallengePolicyTest` 단위 테스트

---

## 🧪 테스트 실행 및 검증 방법
```bash
cd backend
./gradlew test
```
현재 빈칸 스텁 상태에서는 테스트가 **FAILED (RED)** 상태입니다.
3가지 미션을 순서대로 채워 넣으면 모든 테스트가 **BUILD SUCCESSFUL (GREEN)**으로 전환됩니다!


# 🎯 사용자 핵심 학습 미션 가이드 (Issue #3)

이 문서는 사용자가 직접 구현하고 고민해 보아야 하는 **3가지 핵심 학습 미션** 안내서입니다.
구현 후 `cd backend && ./gradlew test`를 실행하면 본인의 코드가 올바르게 동작하는지 즉시 검증할 수 있습니다.

💡 **정답/레퍼런스 코드가 궁금할 땐?**
언제든지 `git diff HEAD~1`을 실행하면 이전 완성본 커밋의 레퍼런스 구현을 바로 확인하고 비교할 수 있습니다!

---

## 🎓 이 이슈를 끝내고 답할 수 있게 될 핵심 질문
1. **"대용량 이미지 파일을 WAS(Spring Boot)로 받지 않고 S3 Presigned URL로 직접 업로드하게 설계한 이유는 무엇인가요?"**
2. **"피드 목록을 조회할 때 작성자 정보와 댓글을 함께 가져올 때 발생하는 N+1 문제는 무엇이고 어떻게 방지(Fetch Join / Batch Size)했나요?"**
3. **"하루 1인증 원칙을 애플리케이션 코드뿐 아니라 DB 복합 유니크 인덱스(`challengeId + userId + targetDate`)로 이중 방어하는 이유는 무엇인가요?"**

---

## 📌 미션 1: `Verification` & `VerificationComment` 지연 로딩(`FetchType.LAZY`) 설정 및 검증 테스트
- **관련 파일**:
  - `backend/src/main/kotlin/com/dayuse/domain/verification/Verification.kt`
  - `backend/src/main/kotlin/com/dayuse/domain/verification/VerificationComment.kt`
  - `backend/src/test/kotlin/com/dayuse/domain/EntityAndRelationshipTest.kt`
- **목표**:
  JPA의 연관관계 매핑 시 불필요한 즉시 조인(EAGER Loading)을 방지하고 성능을 최적화하기 위해, 엔티티 간 참조를 지연 로딩(`FetchType.LAZY`)으로 설정하고 실제 런타임에 프록시 객체로 로딩되는지 테스트로 확인합니다.
- **작업 내용**:
  1. `VerificationComment.kt`: `verification` 필드에 `fetch = FetchType.LAZY`를 명시합니다.
     - ⚠️ **주의**: JPA에서 `@ManyToOne`의 기본 fetch 전략은 `EAGER`(즉시 로딩)입니다! 이를 `LAZY`로 바꾸지 않으면 단일 댓글 조회 시에도 부모 인증 엔티티를 항상 즉시 조인해 가져옵니다.
  2. `Verification.kt`: `comments` 컬렉션에 `@OneToMany(mappedBy = "verification", fetch = FetchType.LAZY, ...)`를 확인 및 설정합니다.
  3. `EntityAndRelationshipTest.kt`의 `Verification과 VerificationComment 간의 지연 로딩(FetchType LAZY) 확인` 테스트:
     - 던져진 `TODO`를 제거하고, `entityManager.flush()` 및 `entityManager.clear()`로 1차 캐시를 비운 뒤
     - `entityManager.entityManager.entityManagerFactory.persistenceUnitUtil.isLoaded(loadedVerification, "comments")`가 처음에는 `false`이고,
     - `loadedVerification.comments.size`를 호출하여 실제로 접근한 이후에는 `true`로 초기화되는지 단언(assert)합니다.
- **검증 테스트**: `EntityAndRelationshipTest`

---

## 📌 미션 2: 피드 목록 조회 쿼리 N+1 문제 해결을 위한 `@BatchSize` 설정
- **관련 파일**:
  - `backend/src/main/kotlin/com/dayuse/domain/verification/Verification.kt`
- **목표**:
  모임 피드 목록에서 10개의 인증글을 가져온 뒤 각 글의 댓글 수(`verification.comments.size`)를 계산할 때, 지연 로딩으로 인해 10번의 추가 SELECT 쿼리(1 + N 쿼리)가 발생하는 병목을 체감하고, Hibernate의 `@BatchSize` 애노테이션으로 이를 1번의 `IN (?, ?, ...)` 쿼리로 최적화합니다.
- **작업 내용**:
  `Verification.kt`의 `comments` 필드 상단에 `@BatchSize(size = 100)`를 추가하세요.
  ```kotlin
  @BatchSize(size = 100)
  @OneToMany(mappedBy = "verification", fetch = FetchType.LAZY, cascade = [CascadeType.ALL], orphanRemoval = true)
  var comments: MutableList<VerificationComment> = mutableListOf()
  ```
- **검증 방법**:
  `FeedAndCommentIntegrationTest` 실행 시 콘솔에 출력되는 Hibernate SQL 로그에서 `select ... from verification_comments where verification_id in (?, ?, ...)` 형태의 배치 쿼리가 나가는지 확인합니다.

---

## 📌 미션 3: 복합 유니크 제약조건 위반 예외 변환 및 중복 방어 통합 테스트
- **관련 파일**:
  - `backend/src/main/kotlin/com/dayuse/domain/verification/service/VerificationService.kt`
  - `backend/src/test/kotlin/com/dayuse/domain/verification/VerificationIntegrationTest.kt`
- **목표**:
  하루 1인증 원칙을 지키기 위해 애플리케이션 레벨의 1차 검사(`existsBy...`)뿐 아니라, 동시성 요청(Race Condition) 상황에서도 완벽히 방어할 수 있도록 DB의 `(challengeId, userId, targetDate)` 복합 유니크 인덱스를 활용합니다. 이때 DB 레벨에서 발생하는 `DataIntegrityViolationException`을 catch하여 클라이언트에게 명확한 비즈니스 에러(`DuplicateResourceException`)로 변환합니다.
- **작업 내용**:
  1. `VerificationService.kt`의 `createVerification` 메서드 내부:
     `verificationRepository.save(verification)` 호출부를 `try-catch`로 감싸고, `DataIntegrityViolationException`이 발생하면 `DuplicateResourceException("해당 챌린지는 대상 날짜에 이미 인증을 완료했습니다.")`를 던지도록 작성합니다.
  2. `VerificationIntegrationTest.kt`의 `DoD 2 동일 챌린지, 동일 참여자, 동일 날짜에 2회 이상 인증 시도 시 409 Conflict로 방어된다` 테스트:
     던져진 `TODO`를 제거하고, 동일한 대상 날짜로 2번 연속 `POST /api/v1/verifications` 요청을 보냈을 때 2차 요청이 `409 Conflict`와 에러 메시지를 반환하는지 검증하는 테스트 코드를 완성합니다.
- **검증 테스트**: `VerificationIntegrationTest`

---

## 🧪 테스트 실행 및 검증 방법
```bash
cd backend
./gradlew test
```
현재 빈칸 스텁 상태에서는 해당 미션 관련 테스트 2개가 **FAILED (RED)** 상태입니다:
- `EntityAndRelationshipTest > Verification과 VerificationComment 간의 지연 로딩(FetchType LAZY) 확인()`
- `VerificationIntegrationTest > DoD 2 동일 챌린지, 동일 참여자, 동일 날짜에 2회 이상 인증 시도 시 409 Conflict로 방어된다()`

위 3가지 미션을 순서대로 채워 넣으면 모든 테스트(54개)가 **BUILD SUCCESSFUL (GREEN)**으로 전환됩니다!
미션을 완료한 뒤 `git diff HEAD~1`로 이전 완성본과 본인의 구현을 비교해 보세요.

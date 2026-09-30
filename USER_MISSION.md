# 사용자 학습 미션: Event API·저장·중복 처리 (F04–F05)

본 미션은 이슈 [#88](https://github.com/es-kimo/dayuse/issues/88)의 핵심 학습 영역인 **서버 인증 세션 기반 `userId` 확정(클라이언트 변조 방어), `occurredAt`/`receivedAt` 분리 기록, `eventId` 기반 순차·동시(Race Condition) 중복 멱등 처리, 그리고 비즈니스 트랜잭션과의 장애 격리(`ProductEventService`)**를 직접 완성하는 실무 과제입니다.

---

## 🎯 학습 목표 및 핵심 질문

이 미션을 직접 해결하면서 아래 3가지 핵심 질문에 대한 답을 코드로 체득해 보세요:

1. **"클라이언트가 요청 바디에 임의의 `userId`를 변조해 보낼 수 있는 상황에서, 서버가 인증 컨텍스트를 통해 실제 사용자 식별자를 안전하게 확정하는 구조는 어떻게 동작하는가?"**
2. **"동일한 `eventId`를 가진 요청이 동시에(Race Condition) 또는 순차적으로 재전송될 때, DB Unique 제약조건과 애플리케이션 레벨 처리를 결합해 어떻게 중복 저장 없이 멱등한 응답을 반환했는가?"**
3. **"분석 이벤트 저장 중 발생한 예외나 부하가 인증·챌린지·정산 등 핵심 비즈니스 트랜잭션을 롤백시키거나 실패시키지 않도록 어떻게 격리했는가?"**

---

## 🧭 미션 안내 및 대상 파일

터미널에서 `git diff HEAD~1` 명령어를 실행하면 에이전트가 사전 검증을 마친 레퍼런스 구현과 현재 빈칸(`TODO`)의 차이를 확인할 수 있습니다.

### 대상 파일
- **핵심 구현 대상**: [`ProductEventService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/service/ProductEventService.kt)
- **참고 파일 (구현 완료)**:
  - 컨트롤러: [`ProductEventController.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/controller/ProductEventController.kt)
  - 요청/응답 DTO: [`ProductEventDtos.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/dto/ProductEventDtos.kt)
  - 도메인 엔티티: [`ProductEvent.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/ProductEvent.kt)
- **통합 검증 테스트**: [`ProductEventIntegrationTest.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/test/kotlin/com/dayuse/domain/analytics/ProductEventIntegrationTest.kt)

---

### [미션 1] 순차 중복 확인 및 서버 인증 `userId` / `receivedAt` 기반 도메인 생성
- **위치**: [`ProductEventService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/service/ProductEventService.kt) -> `recordEvent(...)` 내 `TODO [사용자 미션 1]`
- **요구사항**:
  1. **순차 재전송 사전 확인**: `productEventRepository.findByEventId(trimmedEventId)`로 이미 저장된 이벤트인지 조회합니다. 이미 존재한다면 새 레코드를 추가하지 않고 `ProductEventRecordResponse.duplicateIgnored(existingEvent)`를 즉시 반환하세요.
  2. **발생 시각 보존 및 수신 시각 생성**:
     - `occurredAt`: `request.resolveOccurredAtKst()`를 호출하여 클라이언트가 보낸 발생 시각을 KST `LocalDateTime`으로 변환합니다.
     - `receivedAt`: `DateTimeUtils.nowKst()`를 호출하여 서버 수신 시각을 생성합니다.
  3. **도메인 엔티티 생성 및 검증**:
     - `ProductEvent.create(...)` 팩토리 메서드를 호출하여 `newEvent`를 생성합니다.
     - **보안 핵심**: 클라이언트가 요청 본문에 보낸 `request.userId`는 무시하고, 컨트롤러가 `@CurrentUserId`로 전달한 `authenticatedUserId`를 바인딩하세요.

---

### [미션 2] 동시 재전송(Race Condition) 시 DB Unique 충돌 흡수 및 멱등 응답 반환
- **위치**: [`ProductEventService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/service/ProductEventService.kt) -> `recordEvent(...)` 내 `TODO [사용자 미션 2]`
- **요구사항**:
  1. `requiresNewTransactionTemplate.execute { productEventRepository.saveAndFlush(newEvent) }!!`를 사용해 독립 트랜잭션에서 이벤트를 저장하고 `ProductEventRecordResponse.recorded(saved)`를 반환하세요.
  2. 동일한 `eventId`가 동시에 유입되어 `DataIntegrityViolationException`(`uk_product_events_event_id` 위반)이 발생한 경우:
     - 500 에러나 409 Conflict 에러가 외부로 전파되지 않도록 `catch (ex: DataIntegrityViolationException)` 블록으로 흡수하세요.
     - `productEventRepository.findByEventId(trimmedEventId)`로 먼저 커밋된 이벤트를 재조회한 뒤 `ProductEventRecordResponse.duplicateIgnored(event = concurrentSaved, fallbackEventId = trimmedEventId)`를 반환하세요.

---

### [미션 3] 핵심 비즈니스 트랜잭션 보호를 위한 예외 격리 (`recordEventSafely`)
- **위치**: [`ProductEventService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/service/ProductEventService.kt) -> `recordEventSafely(...)` 내 `TODO [사용자 미션 3]`
- **요구사항**:
  1. `try` 블록에서 `recordEvent(authenticatedUserId = authenticatedUserId, request = request)`를 실행하여 결과를 반환합니다.
  2. 분석 이벤트 검증/저장 도중 어떤 `Exception`이 발생하더라도 호출자의 비즈니스 트랜잭션(인증·챌린지·정산 등)을 롤백시키거나 실패시키지 않도록 `catch (ex: Exception)`으로 포착합니다.
  3. `log.warn(...)`으로 실패 로그를 남기고 `ProductEventRecordResponse.isolatedFailure(request.eventId)`를 반환하세요.

---

## 🧪 테스트 실행 및 검증 명령어

### 1. 백엔드 통합 테스트 실행 (현재 RED 실패 -> 미션 완료 후 전체 GREEN 통과 확인)
```bash
cd backend && ./gradlew test --tests com.dayuse.domain.analytics.ProductEventIntegrationTest
```

### 2. 정답 레퍼런스 비교 (미션 완료 후 확인용)
```bash
git diff HEAD~1 backend/src/main/kotlin/com/dayuse/domain/analytics/service/ProductEventService.kt
```

# 사용자 학습 미션: Product Event 모델·이벤트 규칙 정의 (F01)

본 미션은 이슈 [#86](https://github.com/es-kimo/dayuse/issues/86)의 핵심 학습 영역인 **`ProductEvent` 도메인 엔티티 설계(`occurredAt`/`receivedAt` 분리, Unique 제약조건 및 집계 인덱스), 초기 표준 이벤트 이름 검증(`ProductEventName`), 그리고 민감정보·콘텐츠 유입을 차단하는 `properties` 검증기(`ProductEventPropertiesValidator`)**를 직접 완성하는 실무 과제입니다.

---

## 🎯 학습 목표 및 핵심 질문

이 미션을 직접 해결하면서 아래 3가지 핵심 질문에 대한 답을 코드로 체득해 보세요:

1. **"이벤트 발생 시각(`occurredAt`)과 서버 수신 시각(`receivedAt`)을 분리하여 저장하는 이유는 무엇이며, 이를 통해 네트워크 지연이나 오프라인 재전송 상황에서 어떻게 시계열 정합성을 보장할 수 있는가?"**
2. **"Product Event를 인증·챌린지·정산 같은 핵심 비즈니스 도메인 테이블과 논리적으로 분리하고, 도메인 데이터를 복제하지 않으면서도 분석에 필요한 엔티티 연결(`challengeId`, `groupId` 등)을 어떻게 설계했는가?"**
3. **"이벤트 `properties`에 인증 사진·댓글·계좌번호·표시 이름 등의 민감정보/콘텐츠 유입을 원천 차단하기 위해 도메인 모델에서 어떤 검증 규칙(Whitelist/Sanitization)을 적용했는가?"**

---

## 🧭 미션 안내 및 대상 파일

터미널에서 `git diff HEAD~1` 명령어를 실행하면 에이전트가 사전 검증을 마친 레퍼런스 구현과 현재 빈칸(`TODO`)의 차이를 확인할 수 있습니다.

### 대상 파일
- **도메인 엔티티**: [`ProductEvent.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/ProductEvent.kt)
- **표준 이벤트 이름 검증기**: [`ProductEventName.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/ProductEventName.kt)
- **민감 속성/콘텐츠 검증기**: [`ProductEventPropertiesValidator.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/ProductEventPropertiesValidator.kt)
- **검증 테스트**: [`ProductEventTest.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/test/kotlin/com/dayuse/domain/analytics/ProductEventTest.kt)

---

### [미션 1] `ProductEvent` 테이블 제약조건·인덱스 설계 및 생성 팩토리 구현
- **위치**: [`ProductEvent.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/ProductEvent.kt)
- **요구사항**:
  1. **`TODO [사용자 미션 1-1]` (`@Table` 설정)**:
     - 동일 `eventId`가 중복 저장되지 않도록 `event_id` 컬럼에 Unique 제약조건(`uk_product_events_event_id`)을 선언하세요.
     - 향후 이벤트별 기간 조회 및 퍼널 집계를 위한 복합 인덱스 2종을 선언하세요:
       - `idx_product_events_name_occurred`: `event_name, occurred_at`
       - `idx_product_events_user_occurred`: `user_id, occurred_at`
  2. **`TODO [사용자 미션 1-2]` (`ProductEvent.create(...)` 팩토리)**:
     - `ProductEventName.validate(eventName)`와 `ProductEventPropertiesValidator.validateAndSanitize(properties)`를 호출해 검증된 값을 사용하세요.
     - `occurredAt`(실제 행동 발생 시각)과 `receivedAt`(서버 수신 시각)이 서로 덮어쓰이지 않고 각각 정확히 매핑되도록 설정하세요.
     - `userId`에는 클라이언트 임의 값이 아닌 서버 인증 컨텍스트 기반의 `authenticatedUserId`를 바인딩하세요.

---

### [미션 2] 초기 표준 이벤트 이름(`ProductEventName`) 형식 및 허용 목록 검증
- **위치**: [`ProductEventName.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/ProductEventName.kt) -> `validate(eventName: String)`
- **요구사항**:
  1. 전달된 `eventName`의 앞뒤 공백을 제거(`trim()`)하고 빈 문자열이면 [`BadRequestException`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/global/exception/DayuseException.kt#L14)을 던집니다.
  2. `SNAKE_CASE_REGEX`(`^[a-z][a-z0-9_]*$`)에 부합하는지 확인합니다.
  3. 초기 표준 이벤트 7종(`home_viewed`, `certification_started`, `certification_completed`, `certification_failed`, `challenge_created`, `challenge_joined`, `share_clicked`)에 속하는지 `isAllowed(...)`로 확인하고, 허용되지 않은 이름이면 `BadRequestException`을 던집니다.

---

### [미션 3] `properties` 민감정보·콘텐츠·URL 차단 검증기 구현
- **위치**: [`ProductEventPropertiesValidator.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/analytics/ProductEventPropertiesValidator.kt) -> `validateAndSanitize(properties: Map<String, Any?>)`
- **요구사항**:
  1. `properties`의 각 `(rawKey, value)`를 순회하며 `key = rawKey.trim()`이 비어 있으면 `BadRequestException`을 던집니다.
  2. `normalizeKey(key)`(소문자 변환 및 `_`, `-` 제거)가 `FORBIDDEN_NORMALIZED_KEYS`(사진 URL, 댓글/문구 원문, 이름/닉네임, 계좌번호/예금주, 토큰, 클라이언트 `userId` 등)에 포함되면 `BadRequestException`으로 차단합니다.
  3. `validateValue(key, value)`를 호출해 값에 이미지/외부 URL(`http://`, `https://`, `s3://`, `data:image/`)이 들어가거나 허용 길이를 초과한 자유 입력 문자열이 유입되는 경우를 차단합니다.
  4. 검증을 통과한 안전한 `Map<String, Any?>`를 반환합니다.

---

## 🧪 테스트 실행 및 검증 명령어

### 1. 백엔드 미션 테스트 실행 (현재 RED 실패 -> 미션 완료 후 전체 GREEN 통과 확인)
```bash
cd backend && ./gradlew test --tests com.dayuse.domain.analytics.ProductEventTest
```

### 2. 정답 레퍼런스 비교 (미션 완료 후 확인용)
```bash
git diff HEAD~1 backend/src/main/kotlin/com/dayuse/domain/analytics/
```

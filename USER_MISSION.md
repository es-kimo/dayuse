# 사용자 학습 미션: 피처 플래그 기반 점진적 롤아웃·비상 킬스위치 및 로깅 파이프라인 (F02, F03, F04, F06)

본 미션은 이슈 [#78](https://github.com/es-kimo/dayuse/issues/78)의 핵심 비즈니스 로직인 **계정 단위 고정 배정(Sticky Rollout), 장애 발생 시 무중단 비상 킬스위치(Kill-Switch) 폴백, QA 강제 오버라이드, 그리고 인증 액션 판정 비즈니스 로직**을 직접 완성하는 실무 학습 과제입니다.

---

## 🎯 학습 목표 및 배경

### 1. 배경
실사용자 모수가 적은 초기 프로덕션 환경에서 대규모 UI 개편에 통계적 가설 검정(A/B 테스트)을 적용하는 것은 통계적 검정력이 결여된 형식적 오버엔지니어링입니다.  
대신, 실무에서 더 필수적인 것은 **"장애 위험을 최소화하는 점진적 카나리 배포(Canary Release)", "장애 즉시 배포 없이 구버전으로 원복하는 비상 킬스위치", 그리고 "메인 트랜잭션을 방해하지 않는 안전한 비동기 이벤트 로깅"**입니다.

### 2. 이 미션을 해결하며 답을 찾아야 할 핵심 질문
1. **"로그인 계정 단위 고정 배정(Sticky Assignment)은 왜 필요하며, 세션/기기 변경에도 일관된 UI를 유지하기 위해 어떻게 영속화해야 하는가?"**
2. **"프로덕션 장애 발생 시 재배포 없이 즉각 전체 트래픽을 구버전(Variant A)으로 폴백시키는 킬스위치와, QA 계정의 사전 검증을 위한 파라미터 오버라이드의 우선순위는 어떻게 제어해야 하는가?"**
3. **"노출(Impression)과 유저 액션(인증 성공/실패)을 메인 비즈니스 로직에 지연이나 오류 전파 없이 안전하게 수집하기 위해 어떤 비동기 격리 구조를 취해야 하는가?"**

---

## 🧭 미션 안내 및 대상 파일

터미널에서 `git diff HEAD~1` 명령어를 실행하면 에이전트가 사전 검증을 마친 정답 레퍼런스 구현과 현재 빈칸(`TODO`)의 차이를 바로 확인할 수 있습니다.

### 대상 파일
- **핵심 서비스 파일**: [`FeatureFlagService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/feature/service/FeatureFlagService.kt)
- **통합 검증 테스트**: [`FeatureFlagIntegrationTest.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/test/kotlin/com/dayuse/domain/feature/FeatureFlagIntegrationTest.kt)

---

### [미션 1] QA 강제 오버라이드 및 글로벌 비상 킬스위치(Kill-Switch) 판정
- **위치**: `FeatureFlagService.kt` -> `getOrAssignVariant` 메서드 상단
- **요구사항**:
  1. **QA/운영자 강제 오버라이드 (1순위)**:
     - 인자로 전달된 `normalizedOverride`가 `"A"` 또는 `"B"`인 경우, DB 배정이나 킬스위치와 무관하게 최우선적으로 해당 버전을 반환합니다.
     - 이때 `isOverride = true`, `isKillSwitchActive = isKillSwitchActive(featureKey)`로 설정합니다.
  2. **글로벌 비상 킬스위치 활성화 검사 (2순위)**:
     - `isKillSwitchActive(featureKey)`가 `true`인 경우, 비상 상황이므로 기존 사용자의 DB 할당값과 상관없이 **무조건 안정 버전 `"A"`로 즉시 폴백**합니다.
     - 이때 `isOverride = false`, `isKillSwitchActive = true`를 반환합니다.

---

### [미션 2] 계정별 고정 배정(Sticky Rollout) 조회 및 비율 기반 할당/영속화
- **위치**: `FeatureFlagService.kt` -> `getOrAssignVariant` 메서드 하단
- **요구사항**:
  1. **기존 배정 내역 조회 (Sticky)**:
     - `featureAssignmentRepository.findByUserIdAndFeatureKey(userId, featureKey)`로 이미 배정된 레코드가 있는지 조회합니다.
     - 기존 배정이 존재하면, 사용자가 재방문하거나 기기가 바뀌어도 동일한 버전을 경험할 수 있도록 해당 `existingAssignment.variant`를 즉시 반환합니다.
  2. **신규 사용자 비율 기반 할당 (Canary)**:
     - 기존 배정이 없는 신규 유저의 경우 `getRolloutPercentage(featureKey)`로 현재 롤아웃 비율(0~100)을 가져옵니다.
     - `userId`와 `featureKey`를 기반으로 결정론적 해시 버킷(0~99)을 계산합니다:
       - 예: `(Math.abs(Objects.hash(featureKey, userId)) % 100)`
     - 계산된 버킷 값이 롤아웃 비율 미만이면 신규 버전 `"B"`, 이상이면 기본 버전 `"A"`를 할당합니다.
  3. **DB 영속화 및 동시성 예외 방어**:
     - `FeatureAssignment(userId = userId, featureKey = featureKey, variant = assignedVariant)`를 DB에 저장합니다.
     - **동시성 방어**: 다중 요청이 동시에 들어와 `DataIntegrityViolationException`(복합 유니크 제약 `uk_feature_assignment_user_key` 위반)이 발생할 경우, 먼저 저장된 레코드를 안전하게 재조회(`findByUserIdAndFeatureKey`)하여 그 값을 반환합니다.

---

### [미션 3] 인증 플로우 액션 판정 및 비동기 이벤트 연계 로직
- **위치**: `FeatureFlagService.kt` -> `evaluateAndLogCertAction` 메서드
- **요구사항**:
  1. 현재 대상 사용자(`userId`)의 피처 배정 버전(`assignment.variant`)을 `getOrAssignVariant`를 통해 조회합니다.
  2. `isSuccess` 플래그에 따라 이벤트 타입을 결정합니다:
     - 성공 시: `"CERT_FLOW_SUCCESS"`
     - 실패 시: `"CERT_FLOW_FAIL"`
  3. 전달받은 `metadata`에 실패 메시지(`errorMessage`)가 있을 경우 `"error"` 키로 메타데이터에 추가합니다.
  4. `featureEventAsyncService.recordEventAsync(...)`를 호출하여 메인 비즈니스 트랜잭션과 격리된 비동기 로깅을 수행합니다.

---

## 🧪 테스트 실행 및 검증 명령어

### 백엔드 미션 검증 (현재 5개 실패 -> 미션 해결 후 전체 통과 GREEN 확인)
```bash
./gradlew test --tests com.dayuse.domain.feature.FeatureFlagIntegrationTest
```

### 정답 레퍼런스 확인
```bash
git diff HEAD~1 backend/src/main/kotlin/com/dayuse/domain/feature/service/FeatureFlagService.kt
```

### 전체 테스트 일괄 검증
```bash
# 백엔드 전체
./gradlew test

# 프론트엔드 전체 (토큰 절약용 점 리포터)
npm test -- --reporter=dot
```

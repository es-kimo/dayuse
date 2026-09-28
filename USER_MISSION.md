# 사용자 학습 미션: 챌린지 중단·기록·정산 (F05–F06) 및 동시성 제어

본 미션은 이슈 [#57](https://github.com/es-kimo/dayuse/issues/57)의 핵심 비즈니스 로직인 **챌린지 조기 중단(Abort), 수행 기간 정산 분모 재계산 및 인증과의 동시성 제어(Concurrency Control)**를 구현하는 학습 과제입니다.

---

## 🎯 학습 목표 및 배경

### 1. 배경
챌린지 운영 중 모임 사정, 참여율 저조, 불가피한 일정 변경 등으로 인해 진행 중인 챌린지를 정상 종료일 전에 조기 중단해야 하는 요구사항이 발생합니다.
단순히 상태만 바꾸는 것이 아니라, **이미 지불/성공한 인증 기록을 안전하게 보존**하고, **중단 시점의 미완료 기간을 공정하게 정산에서 제외**해야 하며, **중단과 동시에 발생하는 인증 등록 간의 충돌(동시성 이슈)**을 원자적으로 방어해야 합니다.

- **권한 및 상태 전이**: 생성자 또는 해당 모임의 모임장(HOST)만 중단할 수 있으며, 자연 종료된 챌린지나 이미 중단된 챌린지는 재중단할 수 없습니다.
- **공정한 정산 및 달성률 분모 재계산**:
  - 중단일 당일에 열려 있는 진행 중 구간 및 미래 구간은 정산 대상(분모)에서 제외됩니다.
  - 마감 완료된 과거 구간의 미수행 벌금 및 당일까지 개인이 이미 등록 완료한 인증 기록은 영구 보존됩니다.
- **동시성 제어 (Pessimistic Lock)**:
  - 사용자가 인증 사진을 업로드하고 등록하는 찰나에 관리자가 챌린지를 중단하는 레이스 컨디션이 발생할 수 있습니다.
  - 챌린지 행(Row)에 대한 비관적 쓰기 락(`PESSIMISTIC_WRITE`)을 통해 중단 트랜잭션과 인증 등록 트랜잭션을 직렬화하고, 중단 확정 후에는 인증 등록을 원자적으로 거부해야 합니다.

---

## 🧭 미션 안내 및 대상 파일

`git diff HEAD~1` 명령어를 실행하면 정답 레퍼런스 구현과 현재 빈칸(`TODO`)의 차이를 바로 확인할 수 있습니다.

### [미션 1] 챌린지 중단 트랜잭션 및 권한 가드 로직
- **파일**: [`ChallengeService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/challenge/service/ChallengeService.kt)
- **위치**: `abortChallenge(challengeId, userId, request, now)` 메서드
- **요구사항**:
  1. `challengeRepository.findByIdWithLock(challengeId)` (또는 `findById`)로 챌린지를 조회하고, 없으면 `ResourceNotFoundException`을 발생시킵니다.
  2. 권한 검증: 챌린지 생성자(`challenge.creatorUserId == userId`)이거나, 해당 모임의 모임장(`groupMember.role == HOST`)만 중단할 수 있습니다. 권한이 없으면 `ForbiddenException("챌린지 중단 권한이 없습니다. 생성자 또는 모임장만 중단할 수 있습니다.")`을 발생시킵니다.
  3. `challenge.abort(userId, request.reason, now)`를 호출하여 상태를 `ABORTED`로 전이시키고 저장합니다.
  4. `getChallengeDetail(...)`을 호출하여 최신 상세 응답 DTO를 반환합니다.

### [미션 2] 중단 시점의 열린 수행 기간 정산 제외 및 달성률 분모 재계산 엔진
- **파일**: [`ChallengePeriodCalculator.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/challenge/period/ChallengePeriodCalculator.kt)
- **위치**: `calculate()` 메서드 내 `totalTarget` (총 목표 횟수, 달성률 분모) 계산 로직
- **요구사항**:
  - 챌린지가 조기 중단된 경우(`abortedDate != null`):
    - **매일형(`DAILY`)**: 중단일(`abortedDate`) 당일 및 이후 날짜는 분모에서 제외됩니다.
      - 만약 시작 전 중단(`abortedDate <= effectiveStart`)이면 분모는 `0`입니다.
      - 그렇지 않다면 닫힌 기간의 종료일(`closedEnd = minOf(effectiveEnd, abortedDate.minusDays(1))`)까지의 일수를 분모로 계산합니다.
    - **주 N회형(`WEEKLY_N`)**: 중단일 이전에 완전히 마감된 과거 구간(`it.endDate < abortedDate`)의 `targetCount`만 분모에 합산합니다. 중단 시점에 진행 중이던 열린 구간과 미래 구간은 분모에서 완전히 제외됩니다.

### [미션 3] 중단과 동시 인증 등록 간의 충돌 해결 및 원자적 동시성 제어
- **파일**: [`VerificationService.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/verification/service/VerificationService.kt)
- **위치**: `createVerification(userId, request)` 메서드
- **요구사항**:
  1. 중단 트랜잭션(`abortChallenge`)과 인증 등록 트랜잭션이 동시에 실행될 때 충돌(Lost Update, Race Condition)을 방지할 수 있도록, `challengeRepository.findByIdWithLock(request.challengeId)`를 통해 비관적 쓰기 락을 획득합니다.
  2. 조회된 챌린지가 이미 중단된 상태(`challenge.isAborted()`)인 경우 `BadRequestException("중단된 챌린지에는 인증을 등록할 수 없습니다.")`를 발생시켜 인증 등록을 차단합니다.

---

## 🧪 테스트 및 검증 명령어

아래 Gradle 명령어로 미션별 단위/통합/동시성 테스트를 실행할 수 있습니다.
모든 테스트가 통과(`BUILD SUCCESSFUL / GREEN`)하면 미션 완료입니다!

### 챌린지 중단 관련 테스트 실행:
```bash
cd backend
./gradlew test --tests "com.dayuse.domain.challenge.ChallengeAbort*"
```

개별 테스트 클래스:
- **미션 1 권한 검증**: `./gradlew test --tests "com.dayuse.domain.challenge.ChallengeAbortPermissionTest"`
- **미션 1 상태 전이 검증**: `./gradlew test --tests "com.dayuse.domain.challenge.ChallengeAbortStateTransitionTest"`
- **미션 2 정산/분모 재계산 검증**: `./gradlew test --tests "com.dayuse.domain.challenge.ChallengeAbortSettlementTest"`
- **미션 3 동시성 락 검증**: `./gradlew test --tests "com.dayuse.domain.challenge.ChallengeAbortConcurrencyTest"`

전체 백엔드 테스트 실행:
```bash
cd backend
./gradlew test
```

프론트엔드 테스트 및 빌드 확인:
```bash
cd frontend
npm test -- --run
npm run build
```

---

## 💡 힌트 및 팁
- `Challenge.kt` 도메인 엔티티에 `canAbort()`, `isAborted()`, `abort(userId, reason, now)` 메서드가 이미 구현되어 있습니다.
- `ChallengeRepository.kt`에 `@Lock(LockModeType.PESSIMISTIC_WRITE) fun findByIdWithLock(id: Long): Challenge?`가 정의되어 있어 바로 활용할 수 있습니다.
- 풀이가 막히거나 정답 레퍼런스를 참고하고 싶을 때는 언제든지 터미널에서 `git diff HEAD~1`을 확인하세요!

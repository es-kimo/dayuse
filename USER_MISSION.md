# 🎓 사용자 핵심 학습 미션: 기간·수행 주기 설정과 집계 (Issue #24, F03–F04)

본 이슈(GitHub Issue #24)는 **"챌린지의 가변 기간(1일~365일)과 참여자별 개별 시작일이 주어졌을 때, 7일 단위 구간 분할 및 짧은 마지막 구간의 목표(`min(N, 남은 일수)`)를 순수 도메인 로직으로 어떻게 우아하게 모델링하고, 초과 인증의 차기 구간 이월 방지 규칙을 완료율 산출에서 어떻게 정합성 있게 보장할 것인가?"**를 직접 고민하고 구현해보는 핵심 학습 단계입니다.

AI Agent가 인프라, Flyway DB 마이그레이션(`V5__add_challenge_period_and_frequency.sql`), `Challenge` 엔티티 및 DTO 확장, 서비스 레이어 연동, 프론트엔드 기간 직접 선택기 및 주 N회 선택/구간 분할 실시간 미리보기 UI, 통합 테스트를 모두 완성해 두었습니다.  
이제 아래의 3가지 핵심 미션을 직접 완성하여 **RED 상태인 7개의 단위 테스트를 GREEN으로 전환**해보세요!

---

## 🎯 핵심 학습 질문 (미션을 완료하고 나면 답할 수 있게 됩니다)
1. **"챌린지의 전체 기간과 참여자의 개별 시작일이 주어졌을 때, 7일 단위의 구간(Period Interval)과 짧은 마지막 구간의 목표(`min(N, 남은 일수)`)를 순수 도메인 로직으로 어떻게 우아하게 모델링했나요?"**
2. **"하루 최대 1회 인증 제한과 구간 초과 달성분의 차기 구간 이월 방지 규칙을 완료율 산출 로직에서 어떻게 정합성 있게 보장했나요?"**
3. **"기존의 14일 매일형 챌린지 및 과거 일일 기록(DailyRecord)과의 하위 호환성을 깨뜨리지 않고 스키마와 계산 파이프라인을 확장한 전략은 무엇인가요?"**

---

## 🧭 미션 목록 및 구현 가이드

### 📍 [미션 1] `ChallengePeriodInterval.kt` 값 객체 계산 속성 구현
- **파일**: [`ChallengePeriodInterval.kt`](backend/src/main/kotlin/com/dayuse/domain/challenge/period/ChallengePeriodInterval.kt)
- **목표**: 구간 내 달성 여부(`isAchieved`), 잔여 목표 횟수(`remainingTarget`), 초과 달성 이월 방지용 유효 인증 횟수(`effectiveCompletedCount`)를 구현합니다.
- **구현 항목**:
  1. `isAchieved`: 구간 내 실제 유효 인증 횟수가 구간 목표치 이상인지 여부 (`completedCount >= targetCount`)
  2. `remainingTarget`: 달성까지 남은 목표 횟수 (음수가 되지 않도록 최소 0: `maxOf(0, targetCount - completedCount)`)
  3. `effectiveCompletedCount`: 한 구간에서 목표치를 초과하여 인증하더라도 다음 구간으로 이월되지 않도록 목표치까지만 인정 (`minOf(completedCount, targetCount)`)

---

### 📍 [미션 2] `ChallengePeriodCalculator.kt` 주기별 구간 목표 횟수 산출 알고리즘
- **파일**: [`ChallengePeriodCalculator.kt`](backend/src/main/kotlin/com/dayuse/domain/challenge/period/ChallengePeriodCalculator.kt)
- **목표**: 주기 유형(`DAILY` vs `WEEKLY_N`)에 따라 구간의 목표 횟수(`targetCount`)를 계산합니다.
- **구현 항목**:
  1. `periodType == PeriodType.DAILY` (매일형):
     - 구간의 일수(`daysInInterval`)만큼 매일 인증하는 것이 목표입니다.
  2. `periodType == PeriodType.WEEKLY_N` (주 N회):
     - 기본적으로 주당 설정한 목표 횟수(`targetFrequency ?: 1`)가 목표입니다.
     - 단, 마지막 구간이 7일 미만으로 짧게 남은 경우(예: 남은 일수 3일인데 주 5회 설정 시), 비율 계산이 아닌 **`minOf(targetFrequency ?: 1, daysInInterval)`**로 계산하여 남은 일수를 초과하지 않도록 보정합니다.

---

### 📍 [미션 3] `ChallengePeriodCalculator.kt` 차기 구간 이월 방지 및 전체 완료율 계산
- **파일**: [`ChallengePeriodCalculator.kt`](backend/src/main/kotlin/com/dayuse/domain/challenge/period/ChallengePeriodCalculator.kt)
- **목표**: 구간 초과 인증이 다음 구간으로 이월되지 않도록 전체 완료 횟수를 집계하고, 전체 완료율을 산출합니다.
- **구현 항목**:
  1. `totalCompleted`:
     - 모든 구간의 단순 `completedCount` 합이 아니라, 미션 1에서 구현한 **`effectiveCompletedCount`의 합**으로 집계합니다. (초과 인증 이월 원천 방지)
  2. `progressRate`:
     - `totalTarget > 0`일 때: `((totalCompleted.toDouble() / totalTarget) * 100).toInt()`
     - 최대 100%를 초과하지 않도록 제한합니다 (`minOf(100, ...)`).

---

## 🧪 테스트 실행 및 검증 명령어

아래 Gradle 테스트 명령어를 실행하여 작성한 코드의 통과 여부를 검증하세요:

```bash
# 1. 사용자 미션 단위 테스트 검증 (7개 테스트 GREEN 전환 목표)
./gradlew test --tests "com.dayuse.domain.challenge.period.ChallengePeriodCalculatorTest"

# 2. 챌린지 도메인 통합 테스트 검증
./gradlew test --tests "com.dayuse.domain.challenge.ChallengeIntegrationTest"

# 3. 전체 프로젝트 회귀 테스트
./gradlew test
```

---

## 💡 정답 비교 및 힌트 확인 방법

작업을 완료하여 테스트를 모두 `GREEN`으로 만드신 후(또는 풀이 도중 막힐 때), 아래 명령어를 통해 Agent가 미리 작성해 둔 모범 답안과 손쉽게 비교해 볼 수 있습니다:

```bash
# 직전 완성본 커밋(feat: ...)과 현재 작성 코드의 차이점 한눈에 보기
git diff HEAD~1
```

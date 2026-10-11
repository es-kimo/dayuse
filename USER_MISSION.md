# 🎯 사용자 핵심 학습 미션 가이드 (#147: 날짜별 코인 권리·발행 상한)

이 문서는 **[v0.13] 02. 날짜별 코인 권리·발행 상한 (F05·F11, 10코인 캡·누적 상한·방어)** 이슈의 핵심 학습 포인트를 직접 구현하고 검증하기 위한 가이드입니다.

> 💡 **빠른 빈칸 위치 및 모범 답안 확인**:
> 터미널에서 `git diff HEAD~1`을 실행하면, 어떤 파일의 어느 라인을 채워 넣어야 하는지(그리고 직전 커밋의 레퍼런스 구현은 무엇인지) 한눈에 확인할 수 있습니다.

---

## 📌 배경 및 설계 원칙

과거에 검토되었던 복잡한 지급 공식(**수행 횟수×10 + 완주 20% 보너스, 챌린지당 300코인 제한, 동시 보상 챌린지 3개 제한 등**)을 전면 폐기하고, **"계정 전체 인정 날짜당 최대 10코인"** 정책을 일관되게 적용합니다.

- **F05 (날짜당 10코인 캡)**: 하루에 여러 번 수행하거나, 사진을 여러 장 올리거나, 챌린지 여러 개를 병행하더라도 계정 전체 기준으로 같은 날짜(KST)에는 최대 10코인만 인정됩니다.
- **F11 (누적 상한 검증)**: 30일(최대 300코인), 365일(최대 3,650코인) 상한은 '지급 시점'이 아닌 **'수행 대상 날짜(targetDate)'** 기준 윈도우로 검증됩니다.
- **F11 (부정 적립 기초 방어)**: 기기 시계 및 EXIF 조작을 배제하고, 서버 KST 접수 시각 대비 미래 날짜, 계정 생성 전, 참가 전 날짜는 원천 배제합니다.

---

## 🧭 미션 목록 및 대상 파일

- **대상 파일**: [`CoinEligibilityCalculator.kt`](file:///Users/kihyun/orgs/personal/dayuse/backend/src/main/kotlin/com/dayuse/domain/coin/CoinEligibilityCalculator.kt)

### 1️⃣ [사용자 미션 1] 부정 적립 기초 방어 (`filterValidDates`)
- **위치**: `CoinEligibilityCalculator.filterValidDates` (`// TODO [사용자 미션 1]`)
- **요구사항**:
  1. `context.challengeStatus != ChallengeResultStatus.CONFIRMED`:
     - 정상 종료 및 확정되지 않은 챌린지인 경우, 모든 후보를 `CHALLENGE_NOT_CONFIRMED` 사유로 거절하고 빈 목록을 반환합니다.
  2. 각 후보 인증(`CandidateVerification`)에 대해 다음 비정상 시도를 순차 검사하여 `rejectedDates`에 사유를 기록하고 제외합니다:
     - **미래 날짜 방어**: 현재 서버 날짜보다 미래이거나(`targetDate > todayKst`), 서버에 접수된 날짜보다 미래를 주장하거나(`targetDate > submittedDate`), 접수 시각 자체가 미래인 경우(`submittedAt > now`) → `FUTURE_DATE`
     - **계정 생성 이전 날짜 방어**: 계정 생성일보다 이전 날짜(`targetDate < context.userCreatedAt.toLocalDate()`) → `BEFORE_USER_CREATED`
     - **참가 효력 발생 이전 날짜 방어**: 참가 시작일보다 이전 날짜(`targetDate < context.participantStartDate`) → `BEFORE_PARTICIPANT_JOINED`
     - **지각 인증 배제**: 지각 인증(`candidate.isLate == true`) → `LATE_VERIFICATION`
     - **리데이 티켓 적용 배제**: 리데이 적용 건(`candidate.isRedayApplied == true`) → `REDAY_APPLIED`
  3. 모든 방어 조건을 통과한 유효 인증들만 `validCandidates`에 담아 `FilterResult(validCandidates, rejectedDates)`로 반환합니다.

---

### 2️⃣ [사용자 미션 2] 동일 날짜 10코인 캡 적용 및 중복 제거 (`deduplicateAndCapDaily`)
- **위치**: `CoinEligibilityCalculator.deduplicateAndCapDaily` (`// TODO [사용자 미션 2]`)
- **요구사항**:
  1. `validCandidates`를 수행 대상 날짜(`targetDate`) 기준으로 그룹화(또는 distinct)합니다.
     - 동일한 날짜에 2건 이상 등록된 경우(하루 여러 번, 사진 여러 장 등), `cappedDates`에 해당 날짜를 추가합니다.
  2. 각 날짜에 대해 계정의 기존 기지급 내역(`existingAwardedCoinsByDate`)을 대조합니다:
     - 이미 해당 날짜에 10코인 이상 지급된 경우(`existingCoins >= DAILY_COIN_CAP`):
       - `alreadyGrantedRejections`에 `ALREADY_GRANTED` 사유를 기록하고 `cappedDates`에 추가합니다.
     - 아직 10코인 미만인 경우:
       - `newCandidateDates`에 신규 지급 후보로 추가합니다.
  3. 오름차순으로 정렬된 `newCandidateDates`, `cappedDates`, `alreadyGrantedRejections`를 담아 `DailyCapResult`로 반환합니다.

---

### 3️⃣ [사용자 미션 3] 30일(300코인) / 365일(3,650코인) 수행일 기준 상한 검증 (`validateWindowCaps` & `isExceedingWindowCap`)
- **위치**: `CoinEligibilityCalculator.validateWindowCaps` 및 `isExceedingWindowCap` (`// TODO [사용자 미션 3]`)
- **요구사항**:
  1. `isExceedingWindowCap`:
     - 대상 날짜(`targetDate`)를 포함하는 모든 연속된 `windowDays`(30일 또는 365일) 슬라이딩 윈도우를 검사합니다.
     - 윈도우 시작일 `w`의 범위는 `targetDate.minusDays(windowDays - 1)`부터 `targetDate`까지입니다.
     - 어떤 윈도우 구간 `[w, w + windowDays - 1]` 내에 속한 코인 합계 + `coinsToAdd`(10코인)가 `maxCoins`를 초과하면 즉시 `true`(상한 초과)를 반환합니다.
  2. `validateWindowCaps`:
     - 후보 날짜들을 오름차순으로 정렬하여 순회합니다.
     - `runningCoinsByDate` 누적 맵을 기준으로:
       - 30일 윈도우 상한(300코인) 초과 시: `EXCEEDS_30_DAY_CAP` 거절
       - 365일 윈도우 상한(3,650코인) 초과 시: `EXCEEDS_365_DAY_CAP` 거절
       - 두 상한을 모두 통과하면 `eligibleDates`에 추가하고 `runningCoinsByDate[targetDate]`에 10코인을 누적합니다.
  3. `WindowCapResult(eligibleDates, windowCapRejections)`를 반환합니다.

---

## 🧪 테스트 실행 및 검증 명령어

아래 Gradle 테스트 명령어를 실행하여 작성한 코드의 통과 여부를 검증하세요:

```bash
# 1. 사용자 미션 단위 테스트 검증 (15개 테스트 GREEN 전환 목표)
cd backend
./gradlew test --tests "com.dayuse.domain.coin.CoinEligibilityCalculatorTest" --console=plain

# 2. 코인 도메인 전체 통합 테스트 검증
./gradlew test --tests "com.dayuse.domain.coin.*" --console=plain
```

모든 빈칸을 올바르게 구현하면 15개의 단위 테스트와 통합 테스트가 모두 **GREEN(통과)**으로 전환됩니다!

---

## 💡 모범 답안 비교 및 힌트 확인 방법

구현 도중 막히거나 풀이를 완료한 후 모범 답안을 확인하고 싶다면 아래 명령어를 실행하세요:

```bash
# 직전 완성본 커밋(feat: ...)과 현재 작성 코드의 차이점 한눈에 비교
git diff HEAD~1
```

---

## 💬 구현 후 스스로 답해볼 셀프 인터뷰 질문
1. 사용자가 같은 날짜에 챌린지를 병행하거나 여러 개로 쪼개어 인증을 분할하더라도, 계정 전체 기준으로 특정 수행 날짜(KST)의 순발행액이 10코인을 초과하지 않도록 어떻게 권리를 판정하고 중복을 제거했나요?
2. 수행 날짜와 챌린지 종료/코인 지급 날짜가 서로 다를 때, 30일(300코인) 및 365일(3,650코인) 상한을 '지급일'이 아닌 '수행 날짜' 기준으로 어떻게 누적 검증했나요?
3. 클라이언트 시계 조작, 미래 날짜 인증, 챌린지 참가 이전 날짜 인증 등의 비정상 시도를 서버 자격 검증 단계에서 어떻게 원천 차단했나요?

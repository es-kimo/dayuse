# 🎯 사용자 핵심 학습 미션 가이드 (#146: 종료 결과·유형별 집계)

이 문서는 **[v0.13] 01. 종료 결과·유형별 집계 (F01·F03, 시간·정책 버전·참가 범위)** 이슈의 핵심 학습 포인트를 직접 구현하고 검증하기 위한 가이드입니다.

> 💡 **빠른 정답 레퍼런스 및 빈칸 위치 확인**:
> 터미널에서 `git diff HEAD~1`을 실행하면, 어떤 파일의 어느 라인을 채워 넣어야 하는지(그리고 이전 커밋의 레퍼런스 구현은 무엇인지) 한눈에 비교할 수 있습니다.

---

## 📌 미션 목록 및 대상 파일

- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/challenge/result/ChallengeResultCalculator.kt`

---

### 1️⃣ [사용자 미션 1] 마감 시점 및 결과 상태 판정 (PROVISIONAL vs CONFIRMED vs ABORTED)
- **구현 대상 메서드**:
  1. `calculateFinalConfirmationDeadline(challenge: Challenge): LocalDateTime` (`TODO [사용자 미션 1-1]`)
     - 서버 시각 및 KST(Asia/Seoul) 기준 마지막 인증 인정 기한을 계산합니다.
     - **매일 각자하기**: 마지막 수행일 익일 오전 09:00 KST (`challenge.endDate.plusDays(1).atTime(9, 0)`)
     - **주 N회 각자하기**: 마지막 집계 구간 종료일(endDate) 익일 오전 09:00 KST
     - **핵심 정책**: 리데이 사용 가능 기간 때문에 결과 확정을 지연시키지 않습니다.
  2. `evaluateResultStatus(challenge: Challenge, now: LocalDateTime): ChallengeResultStatus` (`TODO [사용자 미션 1-2]`)
     - 챌린지가 중단(`challenge.isAborted()`)된 경우 → `ABORTED`
     - 현재 시각(`now`)이 최종 마감 인정 기한(`calculateFinalConfirmationDeadline`) 이상인 경우 → `CONFIRMED` (확정)
     - 현재 시각이 운영 종료 시점(`endDate.plusDays(1).atStartOfDay()`) 이상인 경우 → `PROVISIONAL` (잠정)

---

### 2️⃣ [사용자 미션 2] 각자하기(INDIVIDUAL) 목표 및 인정 횟수 산정 엔진 (F01, F03, 5.2)
- **구현 대상 메서드**:
  - `calculateIndividual(...)` (`TODO [사용자 미션 2]`)
  - **요구사항**:
    1. **지각 및 리데이 인증 제외**:
       - `verification.isLate == true`인 인증은 인정 수행 횟수($C$)에서 제외합니다.
       - 일일 기록(`dailyRecord.redayApplied == true`)이 존재하는 인증도 코인용 인정 수행($C$)에서 제외합니다.
    2. **개인 참가 기간 반영**:
       - 중도 참가자를 포함하여, 개인 참가 기간(`participant.startDate .. challenge.endDate`) 내의 유효 인증만 집계합니다.
       - 실제 등록한 전체 인증 수는 `actualSubmissionCount`에 별도 기록합니다.
    3. **매일형 목표($T$) 및 인정($C$) 계산**:
       - 목표 횟수 $T$: 참가 시작일부터 종료일(중단된 경우 중단 전일)까지의 일수 ($T = ChronoUnit.DAYS.between(startDate, endDate) + 1$)
       - 인정 횟수 $C$: 유효 인증 일수
    4. **주 N회형 초과 수행 상계 불가**:
       - `ChallengePeriodCalculator.calculate`를 활용하여 7일 단위 구간별로 계산합니다.
       - 주간 초과 수행은 다른 주의 미달분과 상계할 수 없으므로, 각 구간별 `effectiveCompletedCount`($\min(targetCount, completedCount)$)의 합을 최종 인정 횟수($C$)로 산정합니다.
    5. **달성률 및 완주 판정**:
       - $T == 0$인 경우 나눗셈 예외를 방어하여 `null`을 반환합니다.
       - 완주 여부(`isSuccess`)는 반올림된 100%가 아닌 **$T > 0$ 이고 $C == T$ 일치 여부**로 판정합니다. (중단된 경우 `false`)

---

### 3️⃣ [사용자 미션 3] 함께하기(TOGETHER) 공동 의무별 최초 1인 기여자 판정 (F03, 5.2)
- **구현 대상 메서드**:
  - `calculateTogether(...)` (`TODO [사용자 미션 3]`)
  - **요구사항**:
    1. **단일 최초 기여자 판정**:
       - 하나의 공동 의무(매일형: targetDate별 1개 duty, 주 N회형: 구간 목표 $N$회 슬롯)에 대해 중복 기여 보상이 발생하지 않도록, **가장 먼저 유효 인증(`isLate == false`)을 등록한 1명만 코인용 기여자(`contributionCount`)**로 인정합니다.
       - 동일 날짜에 다른 참여자가 뒤이어 올린 인증은 피드/개인 제출 기록(`actualSubmissionCount`)으로는 남기되, 공동 완료 수 및 기여 카운트에서는 제외합니다.
    2. **주 N회 주간 초과 수행 방지**:
       - 주간 목표 횟수 $N$회를 채운 이후 동일 주차에 추가로 등록된 인증은 공동 인정 및 코인 기여 대상에서 제외합니다.
    3. **공동 달성률과 개인 기여 횟수 분리 집계**:
       - 공동 전체의 목표 $T$, 인정 $C$, 공동 달성률을 계산하고,
       - 각 참여자에게는 공동의 완주 성공 여부(`isSuccess`)와 함께 본인의 실제 유효 기여 횟수(`contributionCount`)를 분리하여 제공합니다.

---

## 🧪 테스트 실행 및 검증 명령어

### 1) 단위 테스트 검증
```bash
cd backend
./gradlew test --tests "com.dayuse.domain.challenge.result.ChallengeResultCalculatorTest" --console=plain
```

### 2) 통합 테스트 검증
```bash
cd backend
./gradlew test --tests "com.dayuse.domain.challenge.result.ChallengeResultIntegrationTest" --console=plain
```

빈칸을 모두 올바르게 구현하면 테스트가 **GREEN(성공)**으로 전환됩니다!

---

## 💬 구현 후 스스로 답해볼 핵심 질문

1. **운영 기간 종료 직후 시점과 마지막 인증 인정 기한 종료 시점 사이의 상태를 어떻게 '잠정(PROVISIONAL)'과 '확정(CONFIRMED)'으로 나누어 처리할 것인가?**
   - 왜 리데이 사용 가능 기간(targetDate + 2일 09:00) 때문에 챌린지 결과 확정을 지연시키지 않아야 하는가?
2. **함께하기(공동 챌린지)에서 공동 달성률과 개인 기여 횟수를 분리하고, 하나의 공동 의무에 대해 중복 기여 보상이 발생하지 않도록 어떻게 단일 최초 기여자를 판정할 것인가?**
3. **중도 참가, 목표 0회(나눗셈 방어), 지각/리데이 인증, 초과 수행 방지 등 다양한 엣지 케이스를 기존 비즈니스 로직과 어긋남 없이 어떻게 산정할 것인가?**

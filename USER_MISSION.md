# 🎯 사용자 핵심 학습 미션 가이드 (#149: 종료 안내·결과 화면·다음 행동)

이 문서는 **[v0.13] 04. 종료 안내·결과 화면·다음 행동 (F02~F04·F08, 모바일·접근성)** 이슈의 핵심 학습 포인트를 직접 구현하고 검증하기 위한 가이드입니다.

> 💡 **빠른 빈칸 위치 및 정답 비교 확인**:
> 터미널에서 `git diff HEAD~1`을 실행하면 어떤 파일의 어느 라인을 채워 넣어야 하는지(그리고 이전 커밋의 레퍼런스 구현은 무엇인지) 한눈에 확인할 수 있습니다.

---

## 📌 핵심 학습 목표 및 배경

1. **결과 확인 상태(`acknowledged`) 전이 모델**:
   - 운영 기간 종료 직후의 잠정 결과(`PROVISIONAL`)를 열람했을 때는 확인 처리를 유보해야 합니다.
   - 확정 결과(`CONFIRMED`) 또는 중단 결과(`ABORTED`) 상세를 정상 열람했을 때만 계정별 확인 상태(`acknowledged`)를 기록합니다.
   - 결과 보정으로 버전(`revision`)이 증가한 경우 기존 확인자라도 "결과가 수정됐어요" 상태로 전이되어 재확인 대상이 됩니다.
2. **축하 효과 제어 및 접근성 존중 (5.5, 6)**:
   - 결과 보정으로 인한 재확인 시에는 축하 효과(애니메이션) 중복 재생을 방지합니다.
   - OS `prefers-reduced-motion` 동작 줄이기 설정이 활성화된 경우 축하 효과를 비활성화합니다.

---

## 📌 미션 목록 및 대상 파일

### 1️⃣ [사용자 미션 1] 결과 확인 상태(`acknowledged`) 전이 및 잠정 결과 유보 (백엔드)
- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/challenge/result/service/ChallengeResultService.kt`
- **대상 메서드**: `acknowledgeResult(...)`
- **요구사항**:
  1. 조회된 `challengeResult.status`가 잠정 결과(`PROVISIONAL`)인 경우:
     - 확인 완료 처리를 유보하고 `BadRequestException("잠정 결과는 확정 전까지 확인 완료 처리할 수 없습니다.")`를 던집니다.
  2. 확정(`CONFIRMED`) 또는 중단(`ABORTED`) 상태인 경우:
     - `participantResult.acknowledge(challengeResult.revision, now)`를 호출하여 현재 revision과 확인 시각을 기록합니다.

---

### 2️⃣ [사용자 미션 2] 확정 결과 열람 시 확인 상태 기록 훅 및 축하 효과 제어 (프론트엔드)
- **대상 파일**: `frontend/src/hooks/useChallengeResultAcknowledgment.ts`
- **구현 대상**:
  1. **`shouldCelebrate` 조건 판정 (`TODO [사용자 미션 2-1]`)**:
     - 결과가 확정(`CONFIRMED`) 상태여야 합니다.
     - 목표를 달성(`isSuccess || (targetCount > 0 && completedCount >= targetCount)`)해야 합니다.
     - 결과 보정으로 인한 재확인 건이 아니어야 합니다(`!isRevised`).
     - OS 동작 줄이기 설정이 켜져 있지 않아야 합니다(`!prefersReduced`).
     - 위 조건을 모두 만족할 때만 `true`를 반환합니다.
  2. **`useEffect` 확인 상태 기록 트리거 (`TODO [사용자 미션 2-2]`)**:
     - `result` 또는 `myParticipantResult`가 없으면 바로 리턴합니다.
     - 잠정 결과(`PROVISIONAL`)이거나 확정/중단 상태가 아닌 경우 API 호출을 유보합니다.
     - 이미 확인 완료되었고 수정되지 않은 경우(`isAlreadyAck && !isRevised`) API 호출을 건너뜁니다.
     - 중복 호출 방지(`hasCalledRef.current`)를 확인 및 설정하고, `challengeResultApi.acknowledgeResult(groupId, challengeId)`를 호출합니다.
     - 성공 시 `onAcknowledged?.(updated)` 콜백을 호출합니다.

---

## 🧪 테스트 실행 및 검증 명령어

### 백엔드 테스트 (미션 1)
```bash
./backend/gradlew -p backend test --tests "com.dayuse.domain.challenge.result.ChallengeResultAcknowledgmentTest"
```

### 프론트엔드 테스트 (미션 2)
```bash
npm --prefix frontend test -- src/hooks/useChallengeResultAcknowledgment.test.ts
```

---

## 🏁 풀이 완료 후 레퍼런스 정답 확인

모든 테스트가 통과(`GREEN`)하면 아래 명령어로 Step 1의 완성 커밋과 비교해보세요:
```bash
git diff HEAD~1
```

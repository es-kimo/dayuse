# 🎯 사용자 핵심 학습 미션 가이드 (Issue #15: 미인증 웹 푸시 F04)

이 문서는 사용자가 직접 설계하고 구현해 보아야 하는 **3가지 핵심 학습 미션** 안내서입니다.
구현 후 `cd backend && ./gradlew test --tests "com.dayuse.domain.notification.*"`를 실행하면 본인의 코드가 올바르게 동작하는지 즉시 검증할 수 있습니다.

💡 **정답/레퍼런스 코드가 궁금할 땐?**
언제든지 `git diff HEAD~1`을 실행하면 이전 완성본 커밋의 레퍼런스 구현을 바로 확인하고 비교할 수 있습니다!

---

## 🎓 이 이슈를 끝내고 답할 수 있게 될 핵심 질문
1. **"다수의 사용자가 각자 설정한 시간(예: 21:00)에 맞춰 알림을 보낼 때, 스케줄러가 매 분 대상자를 조회하면서 발생할 수 있는 DB 부하와 당일 중복 발송 문제를 어떻게 방어했나요?"**
2. **"W3C Web Push 표준(VAPID) 프로토콜에서 브라우저 구독 정보(Endpoint, p256dh, auth)를 DB에 어떻게 영속화하고, 만료되거나 차단된 구독(HTTP 410 Gone / 404 Not Found)을 어떻게 안전하게 정리하나요?"**
3. **"여러 모임과 챌린지에 분산된 오늘 미인증 대기 상태를 단 1회의 알림 메시지('오늘 인증할 챌린지가 N개 남아 있어요')로 묶어 발송하고, 직전에 인증을 마친 경우를 어떻게 걸러냈나요?"**

---

## 📌 미션 1: `NotificationSchedulerService` 당일 미인증 챌린지 통합 집계 및 1회 발송 파이프라인 완성
- **관련 파일**:
  - `backend/src/main/kotlin/com/dayuse/domain/notification/service/NotificationSchedulerService.kt`
- **목표**:
  스케줄러가 지정된 시각에 실행될 때, 사용자가 참여 중인 여러 모임의 챌린지들을 통합 조회하여 오늘 미인증 대기 건수를 집계하고, 당일 1회만 알림이 전송되도록 보장합니다.
- **작업 내용**:
  1. `countPendingChallenges(userId: Long, targetDate: LocalDate)` 구현:
     - `challengeParticipantRepository.findAllByUserIdAndStatus(userId, ParticipantStatus.ACTIVE)`로 활성 참여 목록 조회
     - 각 참여에 대해 참여 시작일(`participant.startDate <= targetDate`) 및 챌린지 종료일(`targetDate <= challenge.endDate`) 검사
     - `verificationRepository.findByChallengeIdAndUserIdAndTargetDate`로 오늘 인증 완료 여부 확인
     - 아직 인증하지 않은 챌린지 건수(`pendingCount`)를 집계하여 반환
  2. `processScheduledNotifications` 내 발송 파이프라인 구현:
     - `pushSendLogRepository.existsByUserIdAndSendDate(userId, today)`로 오늘 이미 발송했는지 체크 -> 발송 이력이 있으면 스킵(`continue`)
     - `countPendingChallenges(userId, today)`가 `0` 이하이면 스킵
     - `pendingCount > 0`인 경우:
       - `PushPayload(title = "dayuse 오늘 인증 리마인더", body = "오늘 인증할 챌린지가 ${pendingCount}개 남아 있어요! 잊지 말고 인증해 주세요.", url = "/today")` 생성
       - `notificationPushService.sendPushToUser(userId, payload)` 호출
       - `pushSendLogRepository.save(PushSendLog(userId = userId, sendDate = today, pendingChallengeCount = pendingCount, sentAt = targetDateTime))` 저장
       - 동시에 다른 스레드나 노드에서 동일 사용자에 대해 저장 시도가 일어날 경우 `uk_user_send_date` DB 유니크 제약 충돌(`DataIntegrityViolationException`)이 발생하므로 이를 `catch`하여 안전하게 방어
- **검증 테스트**: `NotificationIntegrationTest > 스케줄러는 미인증 챌린지가 남아 있는 대상자에게만 단 1회의 알림을 발송하고 PushSendLog를 남긴다()`

---

## 📌 미션 2: `NotificationPushService` 만료 엔드포인트(410 Gone / 404 Not Found) 자동 비활성화 파이프라인
- **관련 파일**:
  - `backend/src/main/kotlin/com/dayuse/domain/notification/service/NotificationPushService.kt`
- **목표**:
  사용자가 브라우저 설정에서 사이트 권한을 초기화하거나 기기 알림을 차단/삭제한 경우, 푸시 서비스(Google FCM, Apple APNs 등)는 `410 Gone` 또는 `404 Not Found` 응답을 반환합니다. 이를 감지하여 유효하지 않은 구독(`PushSubscription`)을 DB에서 즉시 비활성화(`isActive = false`)하는 자가 치유(Self-healing) 파이프라인을 구축합니다.
- **작업 내용**:
  `NotificationPushService.kt`의 `sendPushToUser` 메서드 내부 루프를 구현합니다:
  - `webPushClient.send(...)` 결과인 `result`를 확인
  - `result.isSuccess`인 경우: `successCount++`
  - `result.isExpired` (HTTP 410 또는 404)인 경우:
    - 만료된 엔드포인트이므로 `subscription.deactivate()`를 호출하여 `isActive = false`로 상태를 갱신
    - 로그 기록: `log.info("만료된 웹 푸시 구독 비활성화 처리: subscriptionId={}, endpoint={}", subscription.id, subscription.endpoint)`
- **검증 테스트**: `NotificationIntegrationTest > 만료된 엔드포인트(410 Gone) 응답 수신 시 구독 엔티티가 즉시 비활성화된다()`

---

## 📌 미션 3: `NotificationIntegrationTest` 직전 완료 상태 재검증 단위/통합 테스트 작성
- **관련 파일**:
  - `backend/src/test/kotlin/com/dayuse/domain/notification/NotificationIntegrationTest.kt`
- **목표**:
  사용자가 21:00에 알림 설정을 해두었더라도, 21:00 직전에 이미 오늘 할 일을 모두 인증했다면 스케줄러가 불필요한 푸시 알림을 보내지 않고 스킵해야 합니다. 이 운영 정책을 보장하는 테스트 코드를 완성합니다.
- **작업 내용**:
  `NotificationIntegrationTest`의 `모든 챌린지 인증을 완료한 사용자는 스케줄러 발송 대상에서 제외된다` 테스트 메서드를 완성합니다:
  1. `userNotificationSettingRepository.save(UserNotificationSetting(userId = user.id, enabled = true, reminderTime = targetTime))`으로 21:00 알림 ON 설정
  2. `pushSubscriptionRepository.save(...)`로 활성 기기 1대 등록
  3. `group`, `challenge`, `challengeParticipant` 생성
  4. 오늘 날짜(`today`)로 해당 챌린지의 `Verification` 엔티티를 생성하여 `verificationRepository.save()` (인증 완료 상태 시뮬레이션)
  5. `notificationSchedulerService.processScheduledNotifications(targetDateTime)` 실행
  6. 단언(Assertion):
     - `assertEquals(0, fakeWebPushClient.sentEndpoints.size)` : 푸시가 발송되지 않아야 함
     - `assertFalse(pushSendLogRepository.existsByUserIdAndSendDate(user.id, today))` : 발송 로그도 남지 않아야 함
- **검증 테스트**: `NotificationIntegrationTest > 모든 챌린지 인증을 완료한 사용자는 스케줄러 발송 대상에서 제외된다()`

---

## 🧪 테스트 실행 및 검증 방법
```bash
cd backend
./gradlew test --tests "com.dayuse.domain.notification.*"
```
현재 빈칸 스텁 상태에서는 위 3개 미션 관련 테스트들이 **FAILED (RED)** 상태입니다:
- `NotificationIntegrationTest > 스케줄러는 미인증 챌린지가 남아 있는 대상자에게만 단 1회의 알림을 발송하고 PushSendLog를 남긴다() FAILED`
- `NotificationIntegrationTest > 만료된 엔드포인트(410 Gone) 응답 수신 시 구독 엔티티가 즉시 비활성화된다() FAILED`
- `NotificationIntegrationTest > 모든 챌린지 인증을 완료한 사용자는 스케줄러 발송 대상에서 제외된다() FAILED`

위 3가지 미션을 완성하면 모든 테스트가 **BUILD SUCCESSFUL (GREEN)**으로 전환됩니다!
미션을 풀면서 언제든지 `git diff HEAD~1`을 입력하여 모범 답안과 비교해 보세요.

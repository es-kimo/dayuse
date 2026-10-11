# 🎯 사용자 핵심 학습 미션 가이드 (#127: 소식 데이터·게시·노출 정책)

이 문서는 **[v0.12] 01. 소식 데이터·게시·노출 정책 (F05~F06, 시각·상태·권한)** 이슈의 핵심 학습 포인트를 직접 구현하고 검증하기 위한 가이드입니다.

> 💡 **빠른 빈칸 위치 확인**:
> 터미널에서 `git diff HEAD~1`을 실행하면, 어떤 파일의 어느 라인을 채워 넣어야 하는지(그리고 이전 커밋의 레퍼런스 구현은 무엇인지) 한눈에 비교할 수 있습니다.

---

## 📌 미션 목록 및 대상 파일

### 1️⃣ [사용자 미션 1] 소식 생명주기 전이 및 안내 기간 vs 게시 종료 분리 판정
- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/announcement/Announcement.kt`
- **구현 대상 메서드**:
  1. `resolveDisplayPhase(now: LocalDateTime): AnnouncementDisplayPhase` (`TODO [사용자 미션 1-1]`)
     - 저장된 `status`(`DRAFT`, `PUBLISHED`, `ENDED`)와 서버 KST 시각(`now`, `publishAt`, `noticeEndsAt`)을 조합하여 파생 노출 단계를 반환합니다.
     - `PUBLISHED` 상태일 때:
       - `publishAt == null` 또는 `now < publishAt` → `SCHEDULED` (예약 대기)
       - `publishAt <= now < noticeEndsAt` → `ACTIVE_NOTICE` (안내 기간 중: 홈 카드·인라인·미확인 점 + 목록·상세 모두 활성)
       - `now >= noticeEndsAt` → `NOTICE_EXPIRED` (**안내 기간 종료**: 홈 카드·인라인·미확인 점은 중단하되, **목록·상세 조회는 유지**)
  2. `publish(...)` (`TODO [사용자 미션 1-2]`)
     - 이미 `ENDED`(게시 종료) 상태인 소식은 재게시할 수 없도록 `BadRequestException`으로 차단합니다.
     - `requestedNoticeEndsAt`이 생략된 경우 기본값으로 `effectivePublishAt.plusDays(DEFAULT_NOTICE_DURATION_DAYS)`(14일)을 적용하고, `validateScheduleWindow(effectivePublishAt, effectiveNoticeEndsAt)`로 `noticeEndsAt > publishAt`을 검증합니다.
  3. `end(...)` (`TODO [사용자 미션 1-3]`)
     - `DRAFT` 상태이거나 이미 `ENDED` 상태이면 `BadRequestException`을 던집니다.
     - `PUBLISHED` 상태일 때만 `ENDED`로 전이하고 `endedAt`, `endedBy`, `updatedBy`, `updatedAt`을 기록합니다.

---

### 2️⃣ [사용자 미션 2] 계정×소식 단위 읽음(`readAt`)과 닫기(`dismissedAt`) 분리 및 멱등 처리 (F05)
- **대상 파일**: `backend/src/main/kotlin/com/dayuse/domain/announcement/AnnouncementUserState.kt`
- **구현 대상 메서드**:
  1. `markRead(now: LocalDateTime)` (`TODO [사용자 미션 2-1]`)
     - `readAt == null`일 때만 `readAt = now`, `updatedAt = now`로 기록합니다 (중복 호출 시 최초 시각 유지).
     - 기존 `dismissedAt` 값은 건드리지 않습니다.
  2. `markDismissed(now: LocalDateTime)` (`TODO [사용자 미션 2-2]`)
     - `dismissedAt == null`일 때만 `dismissedAt = now`, `updatedAt = now`로 기록합니다.
     - **중요**: 홈/인라인에서 닫더라도 목록에서는 `읽지 않은 소식`으로 남아야 하므로 `readAt`은 절대 변경하지 않습니다.

---

### 3️⃣ [사용자 미션 3] 기능 제공 조건(Fail-Safe) 및 위치별 적격 소식 최대 1건 판정 (F06)
- **대상 파일 1**: `backend/src/main/kotlin/com/dayuse/domain/announcement/service/AnnouncementFeatureEligibilityEvaluator.kt`
  - `isEligible(userId, conditionType, featureKey)` (`TODO [사용자 미션 3-1]`)
    - `ALL_USERS`이면 `true`를 반환합니다.
    - 조건부 소식(`EXPERIMENT_PARTICIPANT`, `EXPERIMENT_VARIANT_B`)이면 `experimentService.assignVariant(cleanedKey, userId)`를 호출해 판정을 위임합니다.
    - `assignment.isFallback || !assignment.participating`이거나 판정 중 예외가 발생하면 예외를 전파하지 않고 `false`를 반환(Fail-Safe)합니다.
- **대상 파일 2**: `backend/src/main/kotlin/com/dayuse/domain/announcement/service/AnnouncementService.kt`
  - `getUnreadDotStatus(userId, now)` (`TODO [사용자 미션 3-2]`)
    - 현재 안내 기간 내(`isWithinActiveNoticeWindow(now)`) + 기능 조건 충족 + 미열람(`!isRead`) + 미닫기(`!isDismissed`) 소식 개수를 집계합니다.
  - `getActiveNoticeForPlacement(userId, placement, now)` (`TODO [사용자 미션 3-3]`)
    - 요청한 화면 위치(`HOME` 또는 `CERT_CREATE`)에 대해 안내 기간 내 + 위치 활성(`isActiveForPlacement`) + 기능 조건 충족 + 미열람 + 미닫기 소식 중 최신 `publishAt`(동일 시각 시 `id` 역순) 기준 **최대 1건**을 선택합니다.

---

## 🧪 테스트 실행 및 검증 명령어

```bash
cd backend
./gradlew test --tests "com.dayuse.domain.announcement.*" --console=plain
```

모든 빈칸을 올바르게 구현하면 `AnnouncementTest`와 `AnnouncementIntegrationTest`가 모두 **GREEN(통과)**으로 전환됩니다!

---

## 💬 구현 후 스스로 답해볼 핵심 질문
1. 안내 기간 종료(`noticeEndsAt` 경과)와 게시 종료(`ENDED`)를 단일 상태나 단일 시각으로 합치지 않고 분리해야 하는 이유는 무엇이며, 각각 홈/인라인 노출·미확인 점·목록/상세 조회에 어떻게 다르게 작용하는가?
2. 사용자의 '읽음(`readAt`)'과 '안내 닫기(`dismissedAt`)'를 하나의 불리언 플래그로 합치지 않고 별도로 저장해야 하는 이유는 무엇이며, 게시 중 소식 내용이 수정될 때 기존 상태를 초기화하지 않아야 하는 이유는 무엇인가?
3. 점진 배포나 실험(v0.10) 대상 기능에 연결된 조건부 소식을 조회할 때, 공지 도메인이 자체적으로 기능을 활성화하지 않고 기존 기능 제공 판정을 그대로 위임·검증하며 판정 실패 시 어떻게 안전하게 처리(Fail-Safe)해야 하는가?

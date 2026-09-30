# 사용자 학습 미션: Frontend Tracker 구축 (F02)

이슈 [#87](https://github.com/es-kimo/dayuse/issues/87)의 핵심 학습 영역인 **`track()` 공통 메타데이터 생성, 동일 `eventId` 재시도와 비차단 격리, 클라이언트 민감정보 1차 방어 필터**를 직접 완성하는 과제입니다.

`git diff HEAD~1`로 빈칸이 뚫린 위치를 확인하고, 풀이 후에는 같은 명령으로 레퍼런스 구현과 비교하세요.

---

## 🎯 이 미션을 끝내고 답할 수 있어야 하는 질문

1. 기능 컴포넌트가 분석 API 스펙이나 인프라 변경에 영향받지 않도록 `track(eventName, properties)` 추상화 계층을 어떻게 설계했는가?
2. 네트워크 일시 오류로 재전송이 발생해도 서버에서 중복 저장이 일어나지 않도록, `eventId` 생성 시점과 재시도 페이로드를 어떻게 관리했는가?
3. 분석 이벤트의 전송 지연·실패가 화면 이동, 폼 제출, 사용자 피드백 같은 본래 UX를 블로킹하거나 에러로 노출하지 않도록 어떻게 격리했는가?

---

## 🧭 대상 파일

| 미션 | 파일 | 함수 |
|---|---|---|
| 1 | [tracker.ts](frontend/src/utils/tracker.ts) | `buildEvent` |
| 2 | [tracker.ts](frontend/src/utils/tracker.ts) | `deliver` |
| 3 | [trackerSanitizer.ts](frontend/src/utils/trackerSanitizer.ts) | `sanitizeProperties` |

이미 구현되어 있어 그대로 쓰는 것: `track()`(진입점), `toOffsetIsoString`, `generateEventId`, `sleep`, `withJitter`, [sendTrackedEvent](frontend/src/api/events.ts)(전송 1회), 이벤트 타입([analytics.ts](frontend/src/types/analytics.ts)), `APP_VERSION`.

### [미션 1] `buildEvent`: 공통 메타데이터 생성
- `TrackedEventPayload`의 `eventId`, `occurredAt`, `sessionId`, `schemaVersion`, `appVersion`, `properties`를 채워 반환하세요.
- 생각해 볼 것
  - `eventId`와 `occurredAt`은 **언제, 몇 번** 만들어져야 재시도·지연 전송에서도 행동 시각과 식별자가 보존될까요?
  - `occurredAt`은 왜 UTC(`Z`)가 아니라 오프셋을 포함한 형식일까요? (백엔드 `receivedAt`은 KST `LocalDateTime`)
  - 페이로드에 `userId`가 있으면 안 되는 이유는 무엇일까요?

### [미션 2] `deliver`: 동일 `eventId` 재시도와 비차단 격리
- 일시 오류에서만 **같은 페이로드**로 재시도하고, 그 밖의 경우는 멈추세요.
- 재시도 횟수와 간격은 `RETRY_DELAYS_MS`(1초, 3초)와 `JITTER_RATIO`(±20%)를 따릅니다. 첫 시도 포함 총 3회가 상한입니다.
- 생각해 볼 것
  - `sendTrackedEvent`가 돌려주는 `'ok' | 'retry' | 'drop'` 중 어떤 값에서 계속하고 어떤 값에서 멈출까요? 비로그인 사용자의 이벤트(서버 4xx)는 어떻게 되어야 할까요?
  - 재시도 때 `buildEvent`를 다시 부르면 무슨 일이 생길까요? 서버의 `uk_product_events_event_id`와 연결해 보세요.
  - 이 함수가 reject되면 `track()`을 부른 화면은 어떻게 될까요?
  - 재시도 간격에 지터를 넣는 이유는 무엇일까요?

### [미션 3] `sanitizeProperties`: 민감정보 1차 방어 필터
- 금지 키와 위험한 값을 제거한 **새 객체**를 반환하세요. 입력 객체는 변경하지 않습니다.
- 재료: `FORBIDDEN_NORMALIZED_KEYS`, `FORBIDDEN_VALUE_PREFIXES`, `normalizeKey`, `MAX_STRING_PROPERTY_LENGTH`.
- 생각해 볼 것
  - `photoUrl`, `photo_url`, `Photo-Url`을 같은 키로 다루려면 어떻게 비교해야 할까요?
  - 서버(`ProductEventPropertiesValidator`)는 400으로 거부하는데, 클라이언트는 왜 항목만 제거하는 편이 나을까요?
  - 클라이언트 필터만으로 충분할까요? 서버 검증이 별도로 필요한 이유는 무엇일까요?

---

## ✅ 테스트

```bash
# 전체 (기존 71건 + 신규, dot 리포터)
cd /Users/kihyun/orgs/personal/dayuse/frontend && npm test

# 미션 1·2
cd /Users/kihyun/orgs/personal/dayuse/frontend && npm test -- src/utils/tracker.test.ts

# 미션 3
cd /Users/kihyun/orgs/personal/dayuse/frontend && npm test -- src/utils/trackerSanitizer.test.ts
```

현재 상태는 신규 22건 중 19건이 RED, 기존 71건과 나머지 3건은 GREEN입니다. 전부 GREEN이 되면 완료입니다. 타입체크는 `npm run build`로 확인하세요.

## 참고

- Event API(`POST /api/v1/events`)는 #88에서 별도 워크트리로 구현 중입니다. 이 미션의 테스트는 `fetch`를 목으로 대체하므로 서버 없이 검증됩니다.
- 기능 코드에서는 `fetch`/`axios`로 Event API를 직접 호출하지 않고 `track()`만 씁니다. 실제 호출부 적용은 #89 범위입니다.

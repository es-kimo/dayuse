# 🎯 사용자 핵심 학습 미션 가이드 (#131: 공지 분석 이벤트 연결 및 소식 출처 귀속)

이 문서는 **[v0.12] 02. 공지 분석 연결(F10) 및 초기 콘텐츠 준비(F11)** 이슈의 핵심 학습 포인트를 직접 구현하고 검증하기 위한 가이드입니다.

> 💡 **빠른 빈칸 위치 및 정답 확인**:
> 터미널에서 `git diff HEAD~1`을 실행하면, 어떤 파일의 어느 라인을 채워 넣어야 하는지(그리고 이전 커밋의 레퍼런스 구현은 무엇인지) 한눈에 확인할 수 있습니다.

---

## 📌 미션 목록 및 대상 파일

### 1️⃣ [사용자 미션 1] 동일 화면 방문 내 노출 중복 방지 및 `announcement_impression` 발화 (F10)
- **대상 파일**: `frontend/src/utils/announcementTracking.ts`
- **구현 대상 함수**:
  - `trackAnnouncementImpression(announcementId, placement, featureKey): boolean` (`TODO [사용자 미션 1]`)
- **구현 요구사항**:
  1. `getImpressionKey(announcementId, placement)`를 생성합니다.
  2. 이미 `recordedImpressions` Set에 존재하는 키라면 중복 노출이므로 `false`를 반환합니다.
  3. 존재하지 않는다면 세트에 키를 추가하고, `track('announcement_impression', { announcementId, placement, featureKey })`를 발화한 뒤 `true`를 반환합니다.
- **학습 포인트**:
  - API 응답을 수신한 시점이 아니라 사용자의 화면에 실제 렌더링된 시점에 노출을 기록해야 하는 이유
  - 동일한 화면 방문(세션/마운트) 중에 리렌더링 등으로 인해 같은 소식이 반복 측정되는 현상을 방지하는 방법

---

### 2️⃣ [사용자 미션 2] 소식 출처 귀속(Attribution) 생명주기 및 과대 귀속 방어 (F10)
- **대상 파일**: `frontend/src/utils/announcementAttribution.ts`
- **구현 대상 함수**:
  1. `checkRouteNavigation(newPathname: string): void` (`TODO [사용자 미션 2-1]`)
     - 라우트 변경 시 호출되어, 사용자가 CTA 목적지 외의 무관한 화면으로 이동했는지 확인합니다.
     - `getAnnouncementAttribution()`을 확인하고, `destinationPath`가 설정되어 있을 때 `newPathname`이 목적지와 일치하지 않고 모임 맥락(`/groups`) 내 이동도 아니라면 `clearAnnouncementAttribution()`을 호출하여 출처를 즉시 해제합니다.
  2. `consumeAnnouncementAttribution(properties: EventProperties): EventProperties` (`TODO [사용자 미션 2-2]`)
     - 기능 성공 이벤트(`certification_completed`, `recovery_completed` 등) 발생 시 호출됩니다.
     - 저장된 출처 컨텍스트가 없으면 그대로 `properties`를 반환합니다.
     - 보존된 출처가 있다면 `clearAnnouncementAttribution()`을 호출해 즉시 1회 소비 후 해제합니다.
     - `properties`에 `sourceAnnouncementId`, `sourcePlacement`, `sourceFeatureKey`를 결합하여 반환합니다.
- **학습 포인트**:
  - CTA 버튼 클릭을 곧바로 '기능 사용 성공'으로 간주하지 않고 실제 기능의 성공 이벤트와 연결해야 하는 이유
  - 사용자가 다른 화면으로 이탈하거나 취소했을 때 출처를 즉시 소멸시켜 이후의 무관한 사용자 활동이 공지 성과로 과대 귀속되는 것을 방어하는 기법

---

## 🧪 테스트 실행 및 검증 명령어

### 프론트엔드 미션 테스트 실행:
```bash
cd frontend
npm run test -- src/utils/announcementTracking.test.ts src/utils/announcementAttribution.test.ts
```

빈칸을 모두 채우면 2개 테스트 파일의 모든 테스트(총 8건)가 **GREEN(통과)**으로 전환됩니다!

전체 프론트엔드 테스트 검증:
```bash
npm run test -- --reporter=dot
```

---

## 💬 구현 후 스스로 답해볼 핵심 질문
1. **"API 응답을 받은 시점이 아니라 실제 화면에 표시된 시점에 `announcement_impression`을 기록하고, 같은 화면 방문 안에서 동일 소식·위치의 중복 기록을 막아야 하는 이유는 무엇인가?"**
2. **"`announcement_cta_clicked`(실행 버튼 클릭)를 곧바로 '기능 사용 완료'로 간주하지 않고, 직접 이동으로 이어진 현재 작업의 성공 이벤트에만 소식 출처를 귀속시킨 뒤 완료·취소·이탈·로그아웃 시 즉시 해제해야 하는 이유는 무엇인가?"**
3. **"출시 시 준비하는 초기 소식 2건을 선정할 때, 왜 문서상의 가정이 아니라 실제 코드베이스에서 제공 중인 기능과 그 성공 이벤트를 확인해 연결해야 하는가?"**

# 챌린지 생성 리데이 UI 실험

- 키: `challenge-reday-ui-v1`. 서버 시드는 DRAFT, 배정은 A:B=50:50.
- 대상: ViewB 신규 생성 중 매일·각자하기·벌금 > 0인 설정 영역을 실제 본 사용자.
- A: 기존 미허용/허용 카드. B: 혜택·추천 배지·허용 체크박스. **둘 다 기본 허용**.
- 미허용은 체크 해제로 바로 선택 가능하며 벌금 결과를 함께 안내한다.
- 초기부터 이전 챌린지 복사/재시작한 경우 실험 제외. 기존 리데이 설정을 보존한다.
- 노출 이후 조건을 바꾸거나 이전 설정을 불러온 경우도 원래 실험에 귀속해 완료율 손실을 숨기지 않는다.
- UI A도 신규 생성 기본값은 허용으로 변경한다. 기존 API의 필드 생략 기본값, DB 기존 행, 수정 화면은 변경하지 않는다.
- 실험 조회 실패/비활성은 기존 카드 + 기본 허용. 로딩 중에는 자리표시자를 보여준다.

## 측정

`experiment_exposed`는 설정 영역 50% 이상이 화면에 보였을 때 기존 세션 중복 제거 규칙으로 기록한다.
생성 API 성공 후 `challenge_created`에 실험 컨텍스트, `redayAllowed`, `redayEligible`, `isTemplate`, `uiVersion`을 저장한다.
허용 생성 시에는 `challenge_created_reday_allowed`도 기록한다. 생성 실패는 기록하지 않는다.

1. 주 지표: 각 사용자의 **노출 이후 첫 생성**에서 리데이 허용 비율.
2. 보조 지표: 노출 사용자 대비 생성 완료율, 노출 사용자 대비 허용 생성률.
3. 사용자별 첫 생성만 비교해 한 명의 반복 생성이 결과를 지배하지 않게 한다.
4. 조건을 바꿔 리데이가 적용되지 않는 생성도 미허용으로 포함한다(노출 이후 선택).

기존 results API에서 `conversionEventName=challenge_created`와
`conversionEventName=challenge_created_reday_allowed`를 각각 조회하면 사용자 기준 완료/허용 생성 CVR을 볼 수 있다.
이 API는 사용자의 모든 전환을 집계하므로 두 CVR의 비율을 주 지표로 쓰지 않는다.
주 지표는 단일 `challenge_created` 이벤트의 속성으로 아래 쿼리에서 계산한다.
서로 다른 두 이벤트의 전달 성공 여부 차이도 주 지표에 영향을 주지 않는다.

```sql
WITH exposures AS (
  SELECT user_id,
         JSON_UNQUOTE(JSON_EXTRACT(properties, '$.variant')) AS variant,
         MIN(occurred_at) AS first_exposed_at
  FROM product_events
  WHERE event_name = 'experiment_exposed'
    AND JSON_UNQUOTE(JSON_EXTRACT(properties, '$.experimentKey')) = 'challenge-reday-ui-v1'
  GROUP BY user_id, variant
), creations AS (
  SELECT e.user_id, e.variant,
         JSON_UNQUOTE(JSON_EXTRACT(p.properties, '$.redayAllowed')) = 'true' AS allowed,
         ROW_NUMBER() OVER (PARTITION BY e.user_id, e.variant ORDER BY p.occurred_at, p.id) AS rn
  FROM exposures e
  JOIN product_events p ON p.user_id = e.user_id AND p.occurred_at >= e.first_exposed_at
  WHERE p.event_name = 'challenge_created'
    AND JSON_UNQUOTE(JSON_EXTRACT(p.properties, '$.experiment.experimentKey')) = 'challenge-reday-ui-v1'
    AND JSON_UNQUOTE(JSON_EXTRACT(p.properties, '$.experiment.variant')) = e.variant
)
SELECT e.variant, COUNT(*) AS exposed_users,
       COUNT(c.user_id) AS created_users, COALESCE(SUM(c.allowed), 0) AS allowed_users,
       100.0 * SUM(c.allowed) / NULLIF(COUNT(c.user_id), 0) AS allowance_percent,
       100.0 * COUNT(c.user_id) / NULLIF(COUNT(*), 0) AS completion_percent
FROM exposures e
LEFT JOIN creations c ON c.user_id = e.user_id AND c.variant = e.variant AND c.rn = 1
GROUP BY e.variant;
```

## 운영 및 채택

백엔드(이벤트 허용 목록/시드)를 먼저 배포하고 프론트엔드를 배포한다.
운영자 권한으로 `POST /api/v1/experiments/challenge-reday-ui-v1/activate`하면 시작된다.
이번 코드 변경 자체는 운영 서버를 활성화하거나 승자를 정하지 않는다.

시작 전에 기준 허용률, 탐지할 최소 개선폭, 필요 사용자 수와 종료일, 허용 가능한 생성 완료율 하락폭을 확정한다.
종료 시점과 표본을 채운 뒤 사용자 단위 비율 차이의 신뢰구간을 확인한다.
허용률 개선이 확인되고 완료율 하락이 허용 범위 안인 경우에만 승자로 채택한다.
표본 부족·차이 불명확이면 A를 유지한다. 중간 결과가 높다는 이유로 조기 종료하지 않는다.
실제 실험 결과는 아직 없다.

실험 종료 후 stop API를 호출하고 승자 UI를 기본으로 승격한다.
기존 세션에는 배정 캐시가 있으므로 stop 호출만으로 즉시 전원 A가 되지는 않는다.
승자 배포에서 분기와 배정 훅을 제거하고 시드에서 정의를 제거한다. 키는 재사용하지 않는다.

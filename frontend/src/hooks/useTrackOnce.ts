import { useEffect, useRef } from 'react';
import { track } from '../utils/tracker';
import type { EventName, EventProperties } from '../types/analytics';

/**
 * 진입(마운트) 1회 행동 이벤트 발화 훅 (F03)
 *
 * `home_viewed`, `certification_started`처럼 "화면/흐름에 들어왔다"는 행동은
 * 리렌더링마다 다시 발생하면 안 된다. 이 훅은 마운트 인스턴스당 정확히 한 번만 track()을 부른다.
 *
 * - properties 객체를 매 렌더 새로 만들어 넘겨도 재발화하지 않는다(의존성에 넣지 않는다).
 * - enabled가 false인 동안에는 대기하고, 처음 true가 되는 순간 한 번 발화한다.
 *   (인증 로딩이 끝나고 로그인 사용자로 확정된 뒤에 홈 조회를 기록하기 위한 장치)
 * - 탭 전환·포커스 복귀는 언마운트가 아니므로 중복 발화하지 않는다.
 *   뒤로가기·새로고침으로 화면에 다시 들어오면 새 마운트이므로 새 조회로 한 번 기록된다.
 */
export function useTrackOnce(
  eventName: EventName,
  properties?: EventProperties,
  enabled: boolean = true
): void {
  const firedRef = useRef(false);
  // 최신 properties를 ref로만 들고 있어 effect 재실행 트리거가 되지 않게 한다.
  const propertiesRef = useRef(properties);

  // 아래 발화 effect보다 먼저 선언해, 같은 커밋에서 최신 properties가 먼저 반영되게 한다.
  useEffect(() => {
    propertiesRef.current = properties;
  });

  useEffect(() => {
    if (!enabled || firedRef.current) return;
    firedRef.current = true;
    track(eventName, propertiesRef.current);
  }, [eventName, enabled]);
}

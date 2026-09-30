import { useEffect, useRef, useState } from 'react';
import { fetchExperimentAssignment } from '../api/experiments';
import type { ExperimentAssignmentResponse, ExperimentState } from '../types/experiment';
import {
  fallbackState,
  pendingState,
  readCachedState,
  toExperimentState,
  writeCachedState,
} from '../utils/experiment';

/**
 * Variant 조회 및 Flicker 방지 훅 (F04-1)
 *
 * - 세션 캐시가 있으면 첫 렌더부터 isReady=true다. 같은 세션 재방문에 재요청도, 깜빡임도 없다.
 * - 캐시가 없으면 isReady=false로 시작한다. 화면은 이 구간에 실험 영역을 렌더하지 않고
 *   자리(placeholder)만 잡아 A → B 전환이 사용자 눈에 보이지 않게 한다.
 * - 조회 실패·미인증은 throw하지 않고 즉시 기본 경험(A, participating=false)으로 확정한다.
 * - 같은 experimentKey를 여러 컴포넌트가 동시에 마운트해도 요청은 1회로 합쳐진다.
 */

/** 진행 중인 요청을 experimentKey로 공유해 동시 마운트 시 중복 호출을 막는다. */
const inFlight = new Map<string, Promise<ExperimentAssignmentResponse | null>>();

/**
 * 진행 중인 공유 요청을 끊는다.
 * 사용자가 바뀌는 순간(로그인/로그아웃) 이전 사용자의 응답이 새 사용자 화면에 반영되면 안 된다.
 */
export function clearPendingExperimentRequests(): void {
  inFlight.clear();
}

function loadAssignment(experimentKey: string): Promise<ExperimentAssignmentResponse | null> {
  const pending = inFlight.get(experimentKey);
  if (pending) return pending;

  const request = fetchExperimentAssignment(experimentKey).finally(() => {
    inFlight.delete(experimentKey);
  });
  inFlight.set(experimentKey, request);
  return request;
}

export function useExperiment(experimentKey: string, enabled: boolean = true): ExperimentState {
  const [resolved, setResolved] = useState<ExperimentState | null>(() =>
    enabled ? readCachedState(experimentKey) : null
  );
  const [target, setTarget] = useState({ experimentKey, enabled });

  // 실험 키나 활성 여부가 바뀌면 렌더 중에 확정 상태를 버린다.
  // (effect에서 setState로 되돌리면 이전 Variant가 한 프레임 보여 Flicker가 된다)
  if (target.experimentKey !== experimentKey || target.enabled !== enabled) {
    setTarget({ experimentKey, enabled });
    setResolved(enabled ? readCachedState(experimentKey) : null);
  }

  // 언마운트 후 도착한 응답으로 setState하지 않는다.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // 캐시로 이미 확정됐다면 재요청하지 않는다.
    if (readCachedState(experimentKey)) return;

    let cancelled = false;
    loadAssignment(experimentKey)
      .then((response) => {
        if (cancelled || !mountedRef.current) return;
        const next = toExperimentState(experimentKey, response);
        writeCachedState(next);
        setResolved(next);
      })
      .catch(() => {
        if (cancelled || !mountedRef.current) return;
        setResolved(fallbackState(experimentKey, 'ERROR'));
      });

    return () => {
      cancelled = true;
    };
  }, [experimentKey, enabled]);

  if (!enabled) return pendingState(experimentKey);
  return resolved ?? pendingState(experimentKey);
}

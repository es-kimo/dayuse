import { useEffect } from 'react';
import type { ExperimentState } from '../types/experiment';
import { track } from '../utils/tracker';
import { hasRecordedExposure, markExposureRecorded, shouldRecordExposure } from '../utils/experiment';

/**
 * 실제 노출 시점 `experiment_exposed` 기록 훅 (F05-1)
 *
 * 배정(Assignment)과 노출(Exposure)은 다르다. 이 훅은 실험 대상 UI가 실제로 렌더되는 컴포넌트 안에서,
 * Variant가 확정된(isReady) 참여자에게만 호출된다.
 *
 * - 미참여자·Fallback·미확정 상태에서는 발화하지 않는다.
 * - 같은 세션·같은 실험·같은 Variant는 한 번만 기록한다(리렌더·재마운트 모두 중복 제거).
 * - visible=false인 동안(모달 닫힘, 지연 렌더 등)에는 대기하고, 처음 보이는 순간 기록한다.
 */
export function useExperimentExposure(state: ExperimentState, visible: boolean = true): void {
  const { experimentKey, variant } = state;
  const ready = visible && shouldRecordExposure(state);

  useEffect(() => {
    if (!ready) return;
    if (hasRecordedExposure(experimentKey, variant)) return;

    markExposureRecorded(experimentKey, variant);
    track('experiment_exposed', { experimentKey, variant });
  }, [ready, experimentKey, variant]);
}

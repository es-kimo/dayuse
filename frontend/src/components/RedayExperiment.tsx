import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ExperimentState } from '../types/experiment';
import { useExperimentExposure } from '../hooks/useExperimentExposure';
import { fallbackState, shouldRecordExposure } from '../utils/experiment';
import { CHALLENGE_REDAY_UI_EXPERIMENT } from '../constants/experiments';

/** 실제 화면에 보인 배정만 전환에 연결한다. 단계 이동 자체는 노출이 아니다. */
export function RedayExperiment({ state, allowed, onChange, onExposure, children }: {
  state?: ExperimentState;
  allowed: boolean;
  onChange: (allowed: boolean) => void;
  onExposure: (state: ExperimentState) => void;
  children: ReactNode;
}) {
  const [searchParams] = useSearchParams();
  const previewVariant = import.meta.env.DEV ? searchParams.get('reday_ui') : null;
  const isPreview = previewVariant === 'A' || previewVariant === 'B';
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  // 미리보기는 실제 배정/노출과 분리한다. 배포 빌드에서는 URL 재정의가 동작하지 않는다.
  const resolved = (isPreview ? undefined : state) ?? fallbackState(CHALLENGE_REDAY_UI_EXPERIMENT, 'NONE');
  useExperimentExposure(resolved, visible);

  useEffect(() => {
    if (!resolved.isReady || !container.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [resolved.isReady]);

  useEffect(() => {
    if (visible && shouldRecordExposure(resolved)) onExposure(resolved);
  }, [visible, resolved, onExposure]);

  const treatment = isPreview ? previewVariant === 'B' : shouldRecordExposure(resolved) && resolved.variant === 'B';
  return (
    <div ref={container}>
      {!resolved.isReady ? (
        <div role="status" className="min-h-28 rounded-xl bg-slate-100 p-4 text-sm text-slate-500">리데이 설정을 준비하고 있어요…</div>
      ) : treatment ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <span>하루 늦어도, 다시 이어갈 기회</span>
            <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">추천</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            기한 안에 지각 인증을 하고 리데이 티켓을 사용하면 해당 날짜의 벌금을 면제받을 수 있어요. 자동 면제는 아니에요.
          </p>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-slate-800">
            <span>리데이 허용 <span className="font-normal text-slate-500">· {allowed ? '허용됨' : '미허용'}</span></span>
            <input type="checkbox" checked={allowed} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-emerald-700" />
          </label>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">허용을 끄면 지각 인증을 해도 약정 벌금이 부과돼요.</p>
        </div>
      ) : children}
    </div>
  );
}

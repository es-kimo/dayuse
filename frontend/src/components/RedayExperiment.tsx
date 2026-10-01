import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Chip, Help } from './dayu/ui';
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
        <div className="flex flex-col gap-2">
          <label className={`relative flex cursor-pointer items-center gap-2.5 rounded-[14px] border-[1.5px] px-[13.5px] py-[13.5px] transition-colors ${
            allowed ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}>
            <input
              type="checkbox"
              aria-label="리데이 허용"
              checked={allowed}
              onChange={(event) => onChange(event.target.checked)}
              className="peer sr-only"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={`flex flex-wrap items-center gap-1.5 text-[14.5px] font-bold ${allowed ? 'text-blue-600' : 'text-slate-800'}`}>
                리데이 허용
                <Chip tone="blue">추천</Chip>
              </span>
              <span className="text-[12px] leading-[1.45] text-slate-500">
                하루 늦어도 다시 이어갈 수 있도록, 지각 인증 후 티켓으로 벌금을 면제받아요.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`grid size-[22px] shrink-0 place-items-center rounded-[7px] border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2 ${
                allowed ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
              }`}
            >
              {allowed && <Check className="size-3.5 stroke-3" />}
            </span>
          </label>
          <Help>
            {allowed
              ? '자동 면제가 아니라, 기한 안에 인증하고 티켓을 사용해야 해요.'
              : '미허용 상태예요. 지각 인증을 해도 약정 벌금이 부과돼요.'}
          </Help>
        </div>
      ) : children}
    </div>
  );
}

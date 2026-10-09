import React from 'react';
import { ArrowRight, ChevronRight, X, Sparkles } from 'lucide-react';
import { AnnouncementBodyRenderer } from './AnnouncementBodyRenderer';
import { AnnouncementImage } from './AnnouncementImage';
import type {
  AnnouncementAdminResponse,
  AnnouncementActionTarget,
} from '../../types';

export interface AnnouncementPreviewProps {
  data: Partial<AnnouncementAdminResponse>;
  mode: 'list' | 'detail' | 'home' | 'inline';
  onNavigateCta?: (target?: AnnouncementActionTarget | null) => void;
}

export const AnnouncementPreview: React.FC<AnnouncementPreviewProps> = ({
  data,
  mode,
  onNavigateCta,
}) => {
  const {
    title = '새 소식 제목',
    summary = '새 소식 요약 내용이 여기에 표시됩니다.',
    body = '새 소식 본문 내용입니다.',
    imageUrl,
    imageAlt,
    ctaLabel,
    ctaTarget,
  } = data;

  const handleCtaClick = () => {
    // 무부작용 격리: 실제 읽음 처리/외부 내비게이션 없이 콜백만 통지
    if (onNavigateCta) {
      onNavigateCta(ctaTarget);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      {/* 초안/미리보기 격리 워터마크 배지 */}
      <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-3.5 py-1.5 text-[11px] font-semibold text-amber-800">
        <span className="flex items-center gap-1">
          <Sparkles className="size-3 text-amber-600" />
          [미리보기] {mode === 'list' ? '목록 카드' : mode === 'detail' ? '상세 화면' : mode === 'home' ? '홈 안내 카드' : '인라인 안내'}
        </span>
        <span className="text-amber-600 font-medium text-[10px]">무부작용 격리 모드 (상태/로그 미반영)</span>
      </div>

      {/* 1. 홈 안내 카드 (home) */}
      {mode === 'home' && (
        <div className="relative p-4 bg-gradient-to-br from-blue-50/80 via-white to-slate-50 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 mb-1.5">
                새로운 소식
              </span>
              <h4 className="text-[15px] font-bold text-slate-900 tracking-tight leading-snug line-clamp-1">
                {title}
              </h4>
              <p className="mt-1 text-[13px] text-slate-600 line-clamp-2 leading-relaxed">
                {summary}
              </p>
            </div>
            <button
              type="button"
              disabled
              className="text-slate-400 p-1 -mr-1 -mt-1 cursor-not-allowed opacity-60"
              title="미리보기에서는 닫기 동작이 기록되지 않습니다"
            >
              <X className="size-4" />
            </button>
          </div>

          {imageUrl && (
            <div className="mt-3">
              <AnnouncementImage src={imageUrl} alt={imageAlt} className="max-h-40" />
            </div>
          )}

          {ctaLabel && (
            <div className="mt-3.5 pt-2 border-t border-slate-100/80 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCtaClick}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-600 hover:text-blue-700"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="size-3.5" />
              </button>
              {ctaTarget && (
                <span className="text-[11px] text-slate-400 font-mono">
                  → {ctaTarget}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. 인라인 안내 (inline) */}
      {mode === 'inline' && (
        <div className="p-4 bg-slate-50/90 border border-slate-200/80 rounded-xl m-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
                  안내
                </span>
                <h4 className="text-[14px] font-bold text-slate-900 truncate">
                  {title}
                </h4>
              </div>
              <p className="text-[12.5px] text-slate-600 leading-relaxed">
                {summary}
              </p>
            </div>
            <button
              type="button"
              disabled
              className="text-slate-400 p-1 cursor-not-allowed opacity-60"
            >
              <X className="size-4" />
            </button>
          </div>

          {ctaLabel && (
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={handleCtaClick}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-semibold text-white shadow-xs"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. 목록 카드 (list) */}
      {mode === 'list' && (
        <div className="p-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="size-2 rounded-full bg-blue-600 inline-block" title="미확인 점(Dot) 예시" />
                <h4 className="text-[15px] font-bold text-slate-900 tracking-tight line-clamp-1">
                  {title}
                </h4>
              </div>
              <p className="text-[13px] text-slate-600 line-clamp-2 leading-relaxed">
                {summary}
              </p>
              <span className="mt-2 block text-[11px] text-slate-400">
                방금 전 · 열람 시 읽음 처리
              </span>
            </div>
            {imageUrl && (
              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/50">
                <img
                  src={imageUrl}
                  alt={imageAlt || ''}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <ChevronRight className="size-4 text-slate-400 shrink-0 self-center" />
          </div>
        </div>
      )}

      {/* 4. 상세 화면 (detail) */}
      {mode === 'detail' && (
        <div className="p-5 max-w-lg mx-auto">
          <div className="mb-4">
            <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600 mb-2">
              서비스 소식
            </span>
            <h2 className="text-[18px] font-extrabold text-slate-900 tracking-tight leading-snug">
              {title}
            </h2>
            <p className="mt-1 text-[12px] text-slate-400">
              {data.publishAt ? `게시일: ${data.publishAt}` : '게시 예정'}
            </p>
          </div>

          {imageUrl && (
            <div className="mb-5">
              <AnnouncementImage src={imageUrl} alt={imageAlt} className="max-h-64" />
            </div>
          )}

          <div className="mb-6 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <h5 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              핵심 요약
            </h5>
            <p className="text-[13.5px] font-medium text-slate-700 leading-relaxed">
              {summary}
            </p>
          </div>

          <div className="mb-8 border-t border-slate-100 pt-5">
            <AnnouncementBodyRenderer body={body} />
          </div>

          {ctaLabel && (
            <div className="sticky bottom-3 z-10 pt-2">
              <button
                type="button"
                onClick={handleCtaClick}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-[14.5px] font-bold text-white shadow-md active:bg-blue-700 transition"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

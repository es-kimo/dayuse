import React from 'react';
import { ArrowRight, ChevronRight, X, Sparkles } from 'lucide-react';
import { Button, Chip } from '../dayu/ui';
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
    <div className="relative overflow-hidden rounded-[18px] border border-line bg-white">
      {/* 초안/미리보기 격리 워터마크 배지 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-page px-4 py-3 text-label text-ink-muted">
        <span className="flex items-center gap-1">
          <Sparkles className="size-3 text-ink-muted" />
          미리보기 · {mode === 'list' ? '목록 카드' : mode === 'detail' ? '상세 화면' : mode === 'home' ? '홈 안내 카드' : '인라인 안내'}
        </span>
        <span className="text-ink-muted font-medium text-label">실제 게시 화면의 예시예요</span>
      </div>

      {/* 1. 홈 안내 카드 (home) */}
      {mode === 'home' && (
        <div className="relative p-4 bg-primary-subtle">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Chip tone="blue" className="mb-2">
                새로운 소식
              </Chip>
              <h4 className="text-[15px] font-bold text-ink tracking-tight leading-snug line-clamp-1">
                {title}
              </h4>
              <p className="mt-1 text-[13px] text-ink-secondary line-clamp-2 leading-relaxed">
                {summary}
              </p>
            </div>
            <button
              type="button"
              disabled
              aria-label="안내 닫기 (미리보기)"
              className="text-ink-muted p-1 -mr-1 -mt-1 cursor-not-allowed opacity-60"
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
            <div className="mt-3.5 pt-2 border-t border-line/80 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCtaClick}
                className="focus-ring min-h-11 rounded-sm inline-flex items-center gap-1.5 text-[13px] font-bold text-primary hover:text-primary-hover"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. 인라인 안내 (inline) */}
      {mode === 'inline' && (
        <div className="p-4 bg-page border border-line rounded-[14px] m-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-secondary">
                  안내
                </span>
                <h4 className="text-[14px] font-bold text-ink truncate">
                  {title}
                </h4>
              </div>
              <p className="text-[12.5px] text-ink-secondary leading-relaxed">
                {summary}
              </p>
            </div>
            <button
              type="button"
              disabled
              aria-label="안내 닫기 (미리보기)"
              className="text-ink-muted p-1 cursor-not-allowed opacity-60"
            >
              <X className="size-4" />
            </button>
          </div>

          {ctaLabel && (
            <div className="mt-3 flex items-center justify-end">
              <Button
                type="button"
                onClick={handleCtaClick}
                size="sm" className="min-h-11 focus-ring"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="size-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 3. 목록 카드 (list) */}
      {mode === 'list' && (
        <div className="p-4 hover:bg-page transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="size-2 rounded-full bg-primary inline-block" title="미확인 점(Dot) 예시" />
                <h4 className="text-[15px] font-bold text-ink tracking-tight line-clamp-1">
                  {title}
                </h4>
              </div>
              <p className="text-[13px] text-ink-secondary line-clamp-2 leading-relaxed">
                {summary}
              </p>
              <span className="mt-2 block text-[11px] text-ink-muted">
                방금 전
              </span>
            </div>
            {imageUrl && (
              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-sunken border border-line/50">
                <img
                  src={imageUrl}
                  alt={imageAlt || ''}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <ChevronRight className="size-4 text-ink-muted shrink-0 self-center" />
          </div>
        </div>
      )}

      {/* 4. 상세 화면 (detail) */}
      {mode === 'detail' && (
        <div className="p-5 max-w-app mx-auto">
          <div className="mb-4">
            <span className="inline-block rounded-md bg-primary-subtle px-2 py-0.5 text-[11px] font-bold text-primary mb-2">
              서비스 소식
            </span>
            <h2 className="text-title-md font-extrabold text-ink tracking-tight leading-snug">
              {title}
            </h2>
            <p className="mt-1 text-[12px] text-ink-muted">
              {data.publishAt ? `게시일: ${data.publishAt}` : '게시 예정'}
            </p>
          </div>

          {imageUrl && (
            <div className="mb-5">
              <AnnouncementImage src={imageUrl} alt={imageAlt} className="max-h-64" />
            </div>
          )}

          <div className="mb-6 rounded-xl bg-page p-3.5 border border-line">
            <h5 className="text-label font-bold text-ink-muted mb-1">
              핵심 요약
            </h5>
            <p className="text-[13.5px] font-medium text-ink-secondary leading-relaxed">
              {summary}
            </p>
          </div>

          <div className="mb-8 border-t border-line pt-5">
            <AnnouncementBodyRenderer body={body} />
          </div>

          {ctaLabel && (
            <div className="sticky bottom-3 z-10 pt-2">
              <Button
                type="button"
                onClick={handleCtaClick}
                className="w-full focus-ring"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

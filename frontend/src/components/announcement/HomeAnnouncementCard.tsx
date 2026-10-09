import React, { useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '../dayu/ui';
import { AnnouncementImage } from './AnnouncementImage';
import type { AnnouncementUserItemResponse } from '../../types';
import { trackAnnouncementImpression } from '../../utils/announcementTracking';

interface HomeAnnouncementCardProps {
  announcement: AnnouncementUserItemResponse;
  onDismiss: () => void;
  onDetail: () => void;
  onCtaClick?: () => void;
}

export const HomeAnnouncementCard: React.FC<HomeAnnouncementCardProps> = ({
  announcement,
  onDismiss,
  onDetail,
  onCtaClick,
}) => {
  useEffect(() => {
    trackAnnouncementImpression(announcement.id, announcement.placement ?? 'HOME', announcement.featureKey);
  }, [announcement.id, announcement.placement, announcement.featureKey]);
  return (
    <article
      className="relative overflow-hidden rounded-[20px] border border-blue-100 bg-white p-4.5 shadow-2xs"
      aria-labelledby={`home-notice-title-${announcement.id}`}
    >
      {/* 닫기 버튼 */}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-3.5 right-3.5 grid size-7 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="안내 닫기"
      >
        <X className="size-4" />
      </button>

      {/* 헤더 배지 & 마스코트 */}
      <div className="mb-3 flex items-center gap-2.5">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50">
          <img
            src="/assets/brand/expressions/dayu-default-blue.svg"
            alt=""
            className="size-6"
          />
        </div>
        <div className="min-w-0 pr-8">
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
            새 소식
          </span>
        </div>
      </div>

      {/* 제목 및 요약 */}
      <h3
        id={`home-notice-title-${announcement.id}`}
        className="text-[16px] font-bold tracking-tight text-slate-900 leading-snug break-words"
      >
        {announcement.title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 break-words">
        {announcement.summary}
      </p>

      {/* 대표 이미지 (옵션) */}
      {announcement.imageUrl && (
        <div className="mt-3">
          <AnnouncementImage
            src={announcement.imageUrl}
            alt={announcement.imageAlt}
            className="border border-slate-100"
          />
        </div>
      )}

      {/* 액션 버튼 그룹: 자세히 보기 & 실행 버튼 */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onDetail}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-xl px-3 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          자세히 보기
          <ArrowRight className="size-3.5" />
        </button>

        {announcement.ctaLabel && (
          <Button
            type="button"
            size="sm"
            onClick={onCtaClick}
            className="ml-auto inline-flex items-center gap-1.5 font-bold"
          >
            <span>{announcement.ctaLabel}</span>
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
};

import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { AnnouncementUserItemResponse } from '../../types';

interface InlineAnnouncementCardProps {
  announcement: AnnouncementUserItemResponse;
  onDismiss: () => void;
  onDetail: () => void;
  onCtaClick?: () => void;
}

export const InlineAnnouncementCard: React.FC<InlineAnnouncementCardProps> = ({
  announcement,
  onDismiss,
  onDetail,
  onCtaClick,
}) => {
  return (
    <div
      className="relative flex items-start gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3.5 text-slate-800"
      aria-labelledby={`inline-notice-title-${announcement.id}`}
    >
      <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-2xs">
        <img
          src="/assets/brand/expressions/dayu-default-blue.svg"
          alt=""
          className="size-5 brightness-0 invert"
        />
      </div>

      <div className="min-w-0 flex-1 pr-6">
        <h4
          id={`inline-notice-title-${announcement.id}`}
          className="text-[13.5px] font-bold text-slate-900 leading-snug"
        >
          {announcement.title}
        </h4>
        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600 line-clamp-2">
          {announcement.summary}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDetail}
            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-700 hover:underline focus:outline-none"
          >
            자세히 보기
            <ArrowRight className="size-3" />
          </button>

          {announcement.ctaLabel && (
            <button
              type="button"
              onClick={onCtaClick}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs hover:bg-blue-700 focus:outline-none"
            >
              <span>{announcement.ctaLabel}</span>
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 grid size-6 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-blue-100/70 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="안내 닫기"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
};

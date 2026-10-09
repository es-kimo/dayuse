import React, { useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '../dayu/ui';
import type { AnnouncementUserItemResponse } from '../../types';
import { trackAnnouncementImpression } from '../../utils/announcementTracking';

interface InlineAnnouncementCardProps {
  announcement: AnnouncementUserItemResponse;
  onDismiss: () => void;
  onDetail: () => void;
  onCtaClick?: () => void;
}

export const InlineAnnouncementCard: React.FC<InlineAnnouncementCardProps> = ({
  announcement, onDismiss, onDetail, onCtaClick,
}) => {
  useEffect(() => {
    trackAnnouncementImpression(
      announcement.id,
      announcement.placement ?? 'CERT_CREATE',
      announcement.featureKey
    );
  }, [announcement.id, announcement.placement, announcement.featureKey]);

  return (
    <aside
      className="relative rounded-[18px] border border-primary/15 bg-primary-subtle p-4 text-ink"
      aria-labelledby={`inline-notice-title-${announcement.id}`}
    >
    <div className="flex items-start gap-3 pr-7">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white">
        <img src="/assets/brand/expressions/dayu-default-blue.svg" alt="" className="size-7" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 id={`inline-notice-title-${announcement.id}`} className="break-words text-body-sm font-bold leading-snug">
          {announcement.title}
        </h4>
        <p className="mt-1.5 break-words text-caption leading-relaxed text-ink-secondary">
          {announcement.summary}
        </p>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/10 pt-3">
      <Button type="button" variant="line" onClick={onDetail} className="min-w-32 flex-1 focus-ring !whitespace-normal">
        자세히 보기
      </Button>
      {announcement.ctaLabel && (
        <Button type="button" onClick={onCtaClick} className="min-w-32 flex-1 focus-ring !whitespace-normal">
          <span className="min-w-0 break-words">{announcement.ctaLabel}</span>
          <ArrowRight aria-hidden className="size-4 shrink-0" />
        </Button>
      )}
    </div>

    <button type="button" onClick={onDismiss} className="absolute right-1 top-1 grid size-11 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-primary-muted focus-ring" aria-label="안내 닫기">
      <X aria-hidden className="size-4" />
    </button>
  </aside>
  );
};

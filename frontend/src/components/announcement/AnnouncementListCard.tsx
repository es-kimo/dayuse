import { useState } from 'react';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { formatAnnouncementDate } from '../../utils/announcementFormat';

interface AnnouncementListCardProps {
  title: string;
  summary: string;
  publishAt?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  isRead?: boolean;
}

/** Shared card content for the real list and the isolated admin preview. */
export function AnnouncementListCard({ title, summary, publishAt, imageUrl, imageAlt, isRead = false }: AnnouncementListCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const hasImage = imageUrl && failedImage !== imageUrl;

  return (
    <div className={`overflow-hidden rounded-[18px] border bg-white p-4 transition-colors ${isRead ? 'border-line' : 'border-primary/20 group-hover:border-primary/40'}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-label ${isRead ? 'bg-sunken text-ink-muted' : 'bg-primary-subtle text-primary'}`}>
          {isRead ? <Check aria-hidden className="size-3.5" /> : <Sparkles aria-hidden className="size-3.5" />}
          {isRead ? '읽은 소식' : '새 소식'}
        </span>
        <span className="text-label font-normal tabular-nums text-ink-muted">{publishAt ? formatAnnouncementDate(publishAt) : '게시 예정'}</span>
      </div>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-title-sm font-bold leading-snug tracking-tight text-ink">{title}</h2>
          <p className="mt-2 line-clamp-2 break-words text-caption leading-relaxed text-ink-secondary">{summary}</p>
        </div>
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-page">
          {hasImage ? (
            <img src={imageUrl} alt={imageAlt || ''} onError={() => setFailedImage(imageUrl)} className="size-full object-cover" loading="lazy" />
          ) : (
            <img src="/assets/brand/expressions/dayu-default-blue.svg" alt="" className="size-10" />
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
        <span className="text-label font-normal text-ink-muted">데이유즈 소식</span>
        <span className={`inline-flex items-center gap-1 text-caption font-bold ${isRead ? 'text-ink-secondary' : 'text-primary'}`}>
          자세히 보기 <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  );
}

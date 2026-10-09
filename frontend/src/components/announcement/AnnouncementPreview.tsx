import React from 'react';
import { ArrowRight, Eye, Sparkles } from 'lucide-react';
import { Button } from '../dayu/ui';
import { AnnouncementBodyRenderer } from './AnnouncementBodyRenderer';
import { AnnouncementListCard } from './AnnouncementListCard';
import { AnnouncementImage } from './AnnouncementImage';
import type { AnnouncementAdminResponse, AnnouncementActionTarget } from '../../types';

export interface AnnouncementPreviewProps {
  data: Partial<AnnouncementAdminResponse>;
  mode: 'list' | 'detail' | 'home' | 'inline';
  onNavigateCta?: (target?: AnnouncementActionTarget | null) => void;
}

const modeLabels = { list: '소식 목록', detail: '소식 상세', home: '홈 카드', inline: '화면 속 안내' };

function DayuNotice({ small = false }: { small?: boolean }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-primary-subtle ${small ? 'size-11' : 'size-16'}`}>
      <img src="/assets/brand/expressions/dayu-default-blue.svg" alt="" className={small ? 'size-8' : 'size-12'} />
    </div>
  );
}

export const AnnouncementPreview: React.FC<AnnouncementPreviewProps> = ({ data, mode, onNavigateCta }) => {
  const title = data.title?.trim() || '어떤 소식이 있나요?';
  const summary = data.summary?.trim() || '가장 중요한 내용을 한 문장으로 알려 주세요.';
  const body = data.body?.trim() || '';
  const handleCtaClick = () => onNavigateCta?.(data.ctaTarget);
  const date = data.publishAt?.split('T')[0].replaceAll('-', '. ');

  const action = data.ctaLabel && (
    <Button type="button" onClick={handleCtaClick} className="w-full focus-ring !whitespace-normal text-left">
      <span className="min-w-0 break-words">{data.ctaLabel}</span>
      <ArrowRight aria-hidden className="size-4 shrink-0" />
    </Button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1 text-label text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><Eye aria-hidden className="size-3.5" />{modeLabels[mode]} 미리보기</span>
        <span>나에게만 보여요</span>
      </div>
      <article className={mode === 'list' ? 'text-ink' : 'overflow-hidden rounded-[18px] border border-line bg-white text-ink break-words'}>
        {mode === 'home' && (
          <div className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <DayuNotice />
              <div><p className="text-label text-primary">데이유즈 소식</p><p className="mt-1 text-body-sm font-bold">오늘의 작은 변화</p></div>
            </div>
            <h2 className="text-title-md font-extrabold leading-snug">{title}</h2>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">{summary}</p>
            {data.imageUrl && <AnnouncementImage src={data.imageUrl} alt={data.imageAlt} className="mt-4" />}
            {action && <div className="mt-5">{action}</div>}
          </div>
        )}

        {mode === 'inline' && (
          <div className="flex items-start gap-3 p-4">
            <DayuNotice small />
            <div className="min-w-0 flex-1">
              <h2 className="text-body-sm font-bold leading-snug">{title}</h2>
              <p className="mt-1.5 text-caption leading-relaxed text-ink-secondary">{summary}</p>
              {data.ctaLabel && <button type="button" onClick={handleCtaClick} className="focus-ring mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-sm text-caption font-bold text-primary"><span>{data.ctaLabel}</span><ArrowRight aria-hidden className="size-4 shrink-0" /></button>}
            </div>
          </div>
        )}

        {mode === 'list' && (
          <AnnouncementListCard
            title={title}
            summary={summary}
            publishAt={data.publishAt}
            imageUrl={data.imageUrl}
            imageAlt={data.imageAlt}
          />
        )}

        {mode === 'detail' && (
          <>
            <header className="p-5 pb-0">
              <div className="mb-5 flex items-center gap-3"><DayuNotice small /><div><p className="text-label text-primary">데이유즈 소식</p><p className="mt-1 text-label font-normal text-ink-muted">{date || '게시 예정'}</p></div></div>
              <h1 className="text-title-lg font-extrabold leading-snug">{title}</h1>
              <div className="mt-5 rounded-2xl bg-primary-subtle p-4">
                <p className="mb-2 flex items-center gap-1.5 text-label text-primary"><Sparkles aria-hidden className="size-4" />한눈에 보기</p>
                <p className="text-body-sm font-semibold leading-relaxed">{summary}</p>
              </div>
              {data.imageUrl && <AnnouncementImage src={data.imageUrl} alt={data.imageAlt} className="mt-4" />}
            </header>
            <div className="p-5">
              {body ? <AnnouncementBodyRenderer body={body} /> : <p className="rounded-xl border border-dashed border-line p-4 text-caption leading-relaxed text-ink-muted">소제목과 짧은 목록으로 자세한 내용을 전해 보세요.</p>}
              {action && <div className="mt-6 border-t border-line pt-5">{action}</div>}
            </div>
          </>
        )}
      </article>
    </div>
  );
};

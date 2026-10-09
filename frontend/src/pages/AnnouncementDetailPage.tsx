import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { AnnouncementBodyRenderer } from '../components/announcement/AnnouncementBodyRenderer';
import { AnnouncementImage } from '../components/announcement/AnnouncementImage';
import { Button } from '../components/dayu/ui';
import { getUserAnnouncementDetail, markAnnouncementAsRead } from '../api/announcements';
import { formatAnnouncementDate, formatAnnouncementUpdatedTime } from '../utils/announcementFormat';
import { useAnnouncementNotification } from '../context/AnnouncementNotificationContext';
import { useAuth } from '../context/AuthContext';
import type { AnnouncementUserDetailResponse } from '../types';

export const AnnouncementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const handleBack = useBackNavigation('/announcements');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { refreshUnreadDot } = useAnnouncementNotification();

  const [announcement, setAnnouncement] = useState<AnnouncementUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEndedOrNotFound, setIsEndedOrNotFound] = useState(false);
  const [error, setError] = useState('');

  const announcementId = id ? parseInt(id, 10) : NaN;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/login?redirect=/announcements/${id}`);
      return;
    }
    if (isAuthenticated && !isNaN(announcementId)) {
      void fetchDetail(announcementId);
    }
  }, [authLoading, isAuthenticated, id]);

  const fetchDetail = async (targetId: number) => {
    setLoading(true);
    setError('');
    setIsEndedOrNotFound(false);

    try {
      // 서버에서 상세 조회 시 자동으로 markAsReadOnOpen=true 처리됨
      const data = await getUserAnnouncementDetail(targetId, true);
      setAnnouncement(data);

      // 상세 진입 성공 시 미확인 점 갱신
      void refreshUnreadDot();

      // 만에 하나 읽음 처리가 안 되어 있다면 보조 호출 (실패하더라도 화면 열람은 차단하지 않음)
      if (!data.isRead) {
        markAnnouncementAsRead(targetId)
          .then(() => refreshUnreadDot())
          .catch(() => {
            // 보조 읽음 처리 실패는 무시
          });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 403) {
        // 게시 종료(ENDED), 초안, 예약 미도달, 미존재 소식
        setIsEndedOrNotFound(true);
      } else {
        setError('소식을 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCtaClick = () => {
    if (!announcement?.ctaPath) {
      navigate('/groups');
      return;
    }
    navigate(announcement.ctaPath);
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-app flex-col bg-slate-50 font-sans text-slate-800">
      <AppHeader
        variant="sub"
        title="소식 상세"
        onBack={handleBack}
      />

      <main className="flex flex-1 flex-col px-4 pt-2 pb-16">
        {isEndedOrNotFound ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertCircle className="size-6" />
            </div>
            <h2 className="text-[17px] font-bold text-slate-800">더 이상 제공되지 않는 소식이에요</h2>
            <p className="mt-1.5 text-[13.5px] text-slate-500 max-w-xs leading-relaxed">
              게시가 종료되었거나 접근할 수 없는 소식입니다. 다른 새로운 소식을 확인해 보세요.
            </p>
            <Button
              type="button"
              className="mt-6 focus-ring"
              // 상세를 목록으로 교체해 목록에서 뒤로 갈 때 이 화면으로 되돌아오지 않게 한다.
              onClick={() => navigate('/announcements', { replace: true })}
            >
              새로운 소식 목록으로 돌아가기
            </Button>
          </div>
        ) : error ? (
          <div className="mt-4 flex items-center justify-between rounded-[18px] border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchDetail(announcementId)}
              className="inline-flex cursor-pointer items-center gap-1 font-bold underline"
            >
              <RefreshCw className="size-3.5" />
              다시 시도
            </button>
          </div>
        ) : loading || !announcement ? (
          <div className="py-20 text-center text-[13.5px] text-slate-500" role="status">
            소식 상세를 불러오는 중이에요...
          </div>
        ) : (
          <article className="flex flex-1 flex-col rounded-[18px] border border-line bg-white p-5 break-words">
            {/* 상단 메타 및 제목 */}
            <header className="mb-5">
              <img src="/assets/brand/expressions/dayu-default-blue.svg" alt="" className="mb-4 size-12" />
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                  데이유즈 소식
                </span>
                <span className="text-[12.5px] text-slate-500">
                  {formatAnnouncementDate(announcement.publishAt)}
                </span>
                {formatAnnouncementUpdatedTime(announcement.publishAt, announcement.updatedAt) && (
                  <span className="text-[11.5px] text-slate-400">
                    · {formatAnnouncementUpdatedTime(announcement.publishAt, announcement.updatedAt)}
                  </span>
                )}
              </div>
              <h1 className="text-title-lg font-extrabold tracking-tight text-slate-900 leading-snug">
                {announcement.title}
              </h1>
            </header>

            {/* 대표 이미지 (비율 보존 및 실패 Fallback 격리) */}
            {announcement.imageUrl && (
              <div className="mb-4">
                <AnnouncementImage
                  src={announcement.imageUrl}
                  alt={announcement.imageAlt}
                  className="border border-slate-200/80"
                />
              </div>
            )}

            {/* 한눈에 보기 */}
            {announcement.summary && (
              <div className="mb-5 rounded-2xl bg-primary-subtle p-4">
                <h2 className="mb-2 text-label font-bold tracking-tight text-blue-800">
                  한눈에 보기
                </h2>
                <p className="text-[14px] font-medium text-slate-700 leading-relaxed">
                  {announcement.summary}
                </p>
              </div>
            )}

            {/* 제한된 서식 본문 */}
            <div className="flex-1 pt-1 text-ink">
              <AnnouncementBodyRenderer body={announcement.body} />
            </div>

            {/* 하단 고정 실행 버튼 (CTA) */}
            {announcement.ctaLabel && (
              <div className="mt-6 border-t border-line pt-5">
                <Button
                  type="button"
                  size="lg"
                  className="w-full focus-ring !whitespace-normal font-bold"
                  onClick={handleCtaClick}
                >
                  <span>{announcement.ctaLabel}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </article>
        )}
      </main>
    </div>
  );
};

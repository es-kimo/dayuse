import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, ChevronRight, RefreshCw } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { listUserAnnouncements } from '../api/announcements';
import { formatAnnouncementDate } from '../utils/announcementFormat';
import { useAnnouncementNotification } from '../context/AnnouncementNotificationContext';
import { useAuth } from '../context/AuthContext';
import type { AnnouncementUserItemResponse } from '../types';

export const AnnouncementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { refreshUnreadDot } = useAnnouncementNotification();
  const [announcements, setAnnouncements] = useState<AnnouncementUserItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/announcements');
      return;
    }
    if (isAuthenticated) {
      void fetchAnnouncements();
    }
  }, [authLoading, isAuthenticated]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listUserAnnouncements();
      setAnnouncements(data);
      // 목록 조회 후 미확인 점 최신화 (다른 탭/기기 반영 대비)
      void refreshUnreadDot();
    } catch {
      setError('새로운 소식을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-app flex-col bg-slate-50 font-sans text-slate-800">
      <AppHeader
        variant="sub"
        title="새로운 소식"
        onBack={() => navigate(-1)}
      />

      <main className="flex flex-1 flex-col px-4 pt-2 pb-12">
        {error ? (
          <div className="mt-4 flex items-center justify-between rounded-[18px] border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={fetchAnnouncements}
              className="inline-flex cursor-pointer items-center gap-1 font-bold underline"
            >
              <RefreshCw className="size-3.5" />
              다시 시도
            </button>
          </div>
        ) : loading ? (
          <div className="py-20 text-center text-[13.5px] text-slate-500" role="status">
            소식을 불러오는 중이에요...
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Megaphone className="size-6" />
            </div>
            <h2 className="text-[16px] font-bold text-slate-700">아직 등록된 새로운 소식이 없어요</h2>
            <p className="mt-1 text-[13.5px] text-slate-500">
              새로운 기능이나 유용한 소식이 올라오면 바로 알려드릴게요.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {announcements.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => navigate(`/announcements/${item.id}`)}
                className={`group w-full text-left focus-ring rounded-[18px] border p-4 transition-all ${
                  item.isRead
                    ? 'border-slate-200 bg-white/80 opacity-90'
                    : 'border-blue-200/80 bg-white shadow-2xs hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                      {/* 색상 이외의 수단(텍스트 배지 및 스크린리더 레이블)으로 읽음/안읽음 구분 준수 */}
                      {!item.isRead ? (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-bold text-blue-700">
                          <span className="size-1.5 rounded-full bg-blue-600" aria-hidden="true" />
                          새 소식
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-500">
                          읽음
                        </span>
                      )}
                      <span className="text-[12px] text-slate-500">
                        {formatAnnouncementDate(item.publishAt)}
                      </span>
                    </div>

                    <h3 className={`text-[15.5px] tracking-tight leading-snug line-clamp-1 ${
                      item.isRead ? 'font-semibold text-slate-700' : 'font-extrabold text-slate-900'
                    }`}>
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[13px] text-slate-600 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  {item.imageUrl && (
                    <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt || ''}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <ChevronRight className="size-4 shrink-0 self-center text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

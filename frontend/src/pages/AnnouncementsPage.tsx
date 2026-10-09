import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Megaphone, RefreshCw } from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { useBackNavigation } from '../hooks/useBackNavigation';
import { listUserAnnouncements } from '../api/announcements';
import { AnnouncementListCard } from '../components/announcement/AnnouncementListCard';
import { useAnnouncementNotification } from '../context/AnnouncementNotificationContext';
import { useAuth } from '../context/AuthContext';
import type { AnnouncementUserItemResponse } from '../types';

export const AnnouncementsPage: React.FC = () => {
  const navigate = useNavigate();
  const handleBack = useBackNavigation('/groups');
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
        onBack={handleBack}
      />

      <main className="flex flex-1 flex-col px-4 pt-2 pb-12">
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-primary-subtle p-4">
          <img src="/assets/brand/expressions/dayu-default-blue.svg" alt="" className="size-12 shrink-0" />
          <div><h1 className="text-title-sm font-bold text-ink">데이유즈의 작은 변화</h1><p className="mt-1 text-caption text-ink-secondary">새로운 기능과 알아두면 좋은 소식을 모았어요.</p></div>
        </div>
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
              <Link
                key={item.id}
                to={`/announcements/${item.id}`}
                className="group block rounded-[18px] text-left focus-ring"
              >
                <AnnouncementListCard {...item} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

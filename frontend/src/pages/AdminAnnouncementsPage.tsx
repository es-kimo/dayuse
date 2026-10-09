import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { SubPageHeader } from '../components/layout/SubPageHeader';
import { listAdminAnnouncements } from '../api/announcements';
import type { AnnouncementAdminResponse, AnnouncementDisplayPhase } from '../types';

export const AdminAnnouncementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<AnnouncementAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminAnnouncements();
      setAnnouncements(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 403) {
        setError('운영자 권한이 없습니다. (ANALYTICS_ADMIN_USER_IDS에 등록된 사용자만 접근할 수 있습니다)');
      } else {
        setError('소식 목록을 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
  }, []);

  const getPhaseBadge = (phase: AnnouncementDisplayPhase) => {
    switch (phase) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
            <Clock className="size-3" /> 초안 (DRAFT)
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
            <Calendar className="size-3" /> 예약 (SCHEDULED)
          </span>
        );
      case 'ACTIVE_NOTICE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="size-3" /> 게시 중 (ACTIVE)
          </span>
        );
      case 'NOTICE_EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
            <Clock className="size-3" /> 안내 종료 (EXPIRED)
          </span>
        );
      case 'ENDED':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
            <Archive className="size-3" /> 게시 종료 (ENDED)
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <SubPageHeader
        title="소식 운영 관리 (F07)"
        onBack={() => navigate('/groups')}
        rightAction={
          <button
            type="button"
            onClick={() => void fetchList()}
            aria-label="새로고침"
            className="p-1.5 text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <main className="max-w-2xl mx-auto px-4 pt-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">
              소식 목록 및 상태 관리
            </h1>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              전체 소식 생성, 예약, 수정 및 즉시/게시 종료를 관리합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/announcements/new')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[13px] font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Plus className="size-4" />
            새 소식 작성
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <ShieldAlert className="size-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-[15px] font-bold text-red-800">접근 제한</h3>
            <p className="mt-1 text-[13px] text-red-600 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/groups')}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-[12px] font-bold text-red-800 hover:bg-red-200"
            >
              홈으로 돌아가기
            </button>
          </div>
        ) : loading && announcements.length === 0 ? (
          <div className="py-20 text-center text-[13px] text-slate-400">
            소식 목록을 불러오는 중입니다...
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <AlertCircle className="size-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-[15px] font-bold text-slate-700">등록된 소식이 없습니다</h4>
            <p className="mt-1 text-[13px] text-slate-400">
              우측 상단의 '새 소식 작성' 버튼을 눌러 첫 번째 소식을 등록해 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/admin/announcements/${item.id}`)}
                className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPhaseBadge(item.displayPhase)}
                    {item.homeVisible && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10.5px] font-bold text-indigo-700">
                        홈 노출
                      </span>
                    )}
                    {item.placement && (
                      <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10.5px] font-bold text-purple-700">
                        위치: {item.placement}
                      </span>
                    )}
                    {item.featureConditionType !== 'ALL_USERS' && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
                        조건: {item.featureConditionType} ({item.featureKey})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                    ID #{item.id}
                  </span>
                </div>

                <h3 className="text-[15.5px] font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                  {item.title}
                </h3>
                <p className="mt-1 text-[13px] text-slate-500 line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>

                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11.5px] text-slate-400">
                  <div className="space-x-3">
                    <span>
                      게시: {item.publishAt ? item.publishAt.replace('T', ' ') : '미설정'}
                    </span>
                    <span>
                      종료: {item.noticeEndsAt ? item.noticeEndsAt.replace('T', ' ') : '미설정'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-blue-600">
                    <span>편집 및 미리보기</span>
                    <ArrowRight className="size-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

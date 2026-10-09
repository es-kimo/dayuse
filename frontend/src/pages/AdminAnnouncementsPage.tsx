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
import { Button, Card, Chip, ScreenTitle } from '../components/dayu/ui';
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
        setError('소식 관리는 운영자만 이용할 수 있어요.');
      } else {
        setError('소식 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
  }, []);

  const getPhaseBadge = (phase: AnnouncementDisplayPhase) => {
    const phases = {
      DRAFT: { tone: 'gray', label: '초안', icon: Clock },
      SCHEDULED: { tone: 'warn', label: '게시 예약', icon: Calendar },
      ACTIVE_NOTICE: { tone: 'ok', label: '게시 중', icon: CheckCircle2 },
      NOTICE_EXPIRED: { tone: 'gray', label: '안내 종료', icon: Clock },
      ENDED: { tone: 'gray', label: '게시 종료', icon: Archive },
    } as const;
    const { tone, label, icon: Icon } = phases[phase];
    return <Chip tone={tone}><Icon className="size-3" />{label}</Chip>;
  };

  return (
    <div className="min-h-dvh bg-page pb-20">
      <SubPageHeader
        title="소식 관리"
        onBack={() => navigate('/groups')}
        rightAction={
          <button
            type="button"
            onClick={() => void fetchList()}
            aria-label="새로고침"
            className="touch-target focus-ring rounded-xl text-ink-muted hover:bg-sunken"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <main className="w-full max-w-app mx-auto px-4 pt-5">
        <div className="mb-5 space-y-4">
          <ScreenTitle sub="데이유즈의 새로운 소식을 전해요.">소식 관리</ScreenTitle>
          <Button type="button" className="w-full focus-ring" onClick={() => navigate('/admin/announcements/new')}>
            <Plus className="size-4" /> 새 소식 작성
          </Button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <ShieldAlert className="size-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-[15px] font-bold text-red-800">소식을 불러올 수 없어요</h3>
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
          <div className="py-20 text-center text-[13px] text-ink-muted">
            소식 목록을 불러오는 중입니다...
          </div>
        ) : announcements.length === 0 ? (
          <Card className="py-10 text-center">
            <AlertCircle className="size-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-[15px] font-bold text-ink-secondary">아직 등록된 소식이 없어요</h4>
            <p className="mt-1 text-[13px] text-ink-muted">
              새 소식 작성 버튼을 눌러 첫 소식을 전해 보세요.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => navigate(`/admin/announcements/${item.id}`)}
                className="group w-full text-left focus-ring rounded-[18px] border border-line bg-white p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPhaseBadge(item.displayPhase)}
                    {item.homeVisible && (
                      <span className="rounded bg-primary-subtle px-1.5 py-0.5 text-[10.5px] font-bold text-primary">
                        홈 노출
                      </span>
                    )}
                    {item.placement && (
                      <span className="rounded bg-sunken px-1.5 py-0.5 text-[10.5px] font-bold text-ink-muted">
                        위치: {
                          item.placement === 'CERT_CREATE'
                            ? '인증 작성'
                            : item.placement === 'GROUP_DETAIL'
                            ? '모임 홈'
                            : item.placement === 'CERT_SUCCESS'
                            ? '인증 축하'
                            : item.placement
                        }
                      </span>
                    )}
                    {item.featureConditionType !== 'ALL_USERS' && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
                        조건: {item.featureConditionType === 'EXPERIMENT_VARIANT_B' ? '실험군 B' : '실험 참여자'}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-muted shrink-0 font-mono">
                    ID #{item.id}
                  </span>
                </div>

                <h3 className="text-[15.5px] font-bold break-words text-ink group-hover:text-primary transition leading-snug">
                  {item.title}
                </h3>
                <p className="mt-1 text-[13px] text-ink-muted line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>

                <div className="mt-3.5 pt-2.5 border-t border-line flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-ink-muted">
                  <div className="flex flex-col gap-1">
                    <span>
                      게시: {item.publishAt ? item.publishAt.replace('T', ' ') : '미설정'}
                    </span>
                    <span>
                      종료: {item.noticeEndsAt ? item.noticeEndsAt.replace('T', ' ') : '미설정'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-primary">
                    <span>편집 및 미리보기</span>
                    <ArrowRight className="size-3" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

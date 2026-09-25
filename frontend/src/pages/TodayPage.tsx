import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight, Calendar, Bell } from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
import { VerificationModal } from '../components/VerificationModal';
import { DayuExpression } from '../components/brand/DayuExpression';
import { todayApi } from '../api/today';
import type { TodayAction } from '../types';
import { useAuth } from '../context/AuthContext';

export const TodayPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [actions, setActions] = useState<TodayAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAction, setSelectedAction] = useState<TodayAction | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/today');
      return;
    }
    loadTodayActions();
  }, [isAuthenticated]);

  const loadTodayActions = async () => {
    try {
      setLoading(true);
      const data = await todayApi.getAllTodayActions();
      setActions(data);
    } catch (err) {
      console.error('오늘 할 일 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingActions = actions.filter((a) => !a.isCompletedToday);
  const completedActions = actions.filter((a) => a.isCompletedToday);

  return (
    <MobileLayout>
      <div className="space-y-5">
        {/* 상단 타이틀 & 알림 설정 바로가기 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              오늘의 할 일
            </h1>
            <p className="text-caption text-ink-muted mt-0.5">
              참여 중인 모임의 오늘 인증 현황이에요
            </p>
          </div>
          <button
            onClick={() => navigate('/settings/notifications')}
            className="p-2 rounded-xl text-ink-secondary hover:text-primary hover:bg-sunken transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="알림 설정"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-ink-muted">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-body-sm">오늘 할 일을 불러오는 중...</p>
          </div>
        ) : actions.length === 0 ? (
          <div className="py-12 text-center bg-card border border-line rounded-lg p-6 space-y-3">
            <DayuExpression expression="rest" color="blue" className="w-16 h-16 mx-auto mb-2" />
            <h3 className="text-title-sm text-ink">오늘은 인증할 챌린지가 없어요</h3>
            <p className="text-body-sm text-ink-muted leading-relaxed max-w-xs mx-auto">
              새 챌린지를 만들어 보세요
            </p>
            <button
              onClick={() => navigate('/groups')}
              className="mt-2 inline-flex items-center gap-1.5 h-btn-sm px-4 bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-semibold rounded-md transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-muted"
            >
              챌린지 만들기 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 요약 배너 */}
            {pendingActions.length === 0 ? (
              <div className="p-4 bg-success-bg border border-success-border rounded-lg flex items-center gap-3">
                <DayuExpression expression="done" color="blue" className="w-10 h-10 shrink-0" />
                <div>
                  <h3 className="text-title-sm text-success">오늘 인증을 모두 완료했어요! 🎉</h3>
                  <p className="text-caption text-success mt-0.5 opacity-90">
                    멋진 하루를 완성하셨습니다. 내일도 꾸준히 이어가 봐요!
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-primary-subtle border border-primary-muted rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="text-title-sm text-ink">
                    인증할 챌린지가 {pendingActions.length}개 남아 있어요!
                  </h3>
                  <p className="text-caption text-primary font-medium mt-0.5">
                    오늘이 지나기 전에 사진을 찍어 인증을 완료해 주세요.
                  </p>
                </div>
              </div>
            )}

            {/* 미완료 챌린지 섹션 */}
            {pendingActions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  인증 대기 ({pendingActions.length})
                </h2>
                <div className="space-y-3">
                  {pendingActions.map((action) => (
                    <div
                      key={action.challengeId}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-blue-300 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {action.groupName && (
                            <span className="inline-block text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mb-1">
                              {action.groupName}
                            </span>
                          )}
                          <h3 className="text-sm font-bold text-slate-900">
                            {action.challengeTitle}
                          </h3>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">인증 기준: </span>
                        {action.verificationCriteria}
                      </div>

                      <button
                        onClick={() => setSelectedAction(action)}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        사진 찍고 인증하기
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 완료된 챌린지 섹션 */}
            {completedActions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  완료됨 ({completedActions.length})
                </h2>
                <div className="space-y-3">
                  {completedActions.map((action) => (
                    <div
                      key={action.challengeId}
                      className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 opacity-90"
                    >
                      <div className="flex items-center gap-3">
                        {action.myVerification?.imageUrl ? (
                          <img
                            src={action.myVerification.imageUrl}
                            alt="인증 사진"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-xs">
                            완료
                          </div>
                        )}
                        <div>
                          {action.groupName && (
                            <span className="text-[10px] text-slate-500 font-medium block">
                              {action.groupName}
                            </span>
                          )}
                          <h3 className="text-body-sm font-semibold text-ink">
                            {action.challengeTitle}
                          </h3>
                          {action.myVerification?.comment && (
                            <p className="text-caption text-ink-muted line-clamp-1 mt-0.5">
                              "{action.myVerification.comment}"
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-label text-success bg-success-bg border border-success-border px-2 py-1 rounded-md shrink-0 font-semibold">
                        인증 완료
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedAction && (
        <VerificationModal
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onSuccess={() => {
            setSelectedAction(null);
            loadTodayActions();
          }}
        />
      )}
    </MobileLayout>
  );
};

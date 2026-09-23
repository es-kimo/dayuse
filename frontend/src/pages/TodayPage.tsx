import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight, Sparkles, Calendar, Bell } from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
import { VerificationModal } from '../components/VerificationModal';
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
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              오늘의 할 일
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              참여 중인 모든 모임의 오늘 인증 현황입니다.
            </p>
          </div>
          <button
            onClick={() => navigate('/settings/notifications')}
            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            title="알림 설정"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">오늘 할 일을 불러오는 중...</p>
          </div>
        ) : actions.length === 0 ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">오늘 진행 중인 챌린지가 없어요</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              모임에 참여하거나 새로운 챌린지를 만들어 함께 습관을 시작해 보세요!
            </p>
            <button
              onClick={() => navigate('/groups')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              내 모임 보러가기 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 요약 배너 */}
            {pendingActions.length === 0 ? (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">오늘 인증을 모두 완료했어요! 🎉</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    멋진 하루를 완성하셨습니다. 내일도 꾸준히 이어가 봐요!
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-blue-900">
                    인증할 챌린지가 {pendingActions.length}개 남아 있어요!
                  </h3>
                  <p className="text-xs text-blue-700 mt-0.5">
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
                          <h3 className="text-xs font-bold text-slate-800">
                            {action.challengeTitle}
                          </h3>
                          {action.myVerification?.comment && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              "{action.myVerification.comment}"
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
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

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight, Calendar, Bell } from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
import { BottomNav } from '../components/BottomNav';
import { DayuLogo } from '../components/brand/DayuLogo';
import { VerificationModal } from '../components/VerificationModal';
import { Lightbox } from '../components/ui/Lightbox';
import { DayuExpression } from '../components/brand/DayuExpression';
import { todayApi } from '../api/today';
import type { TodayAction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useUiVersion } from '../context/UiVersionContext';

export const TodayPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { uiVersion } = useUiVersion();
  const navigate = useNavigate();
  const [actions, setActions] = useState<TodayAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAction, setSelectedAction] = useState<TodayAction | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/today');
      return;
    }
    if (isAuthenticated) {
      loadTodayActions();
    }
  }, [authLoading, isAuthenticated]);

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
  const progressRatio = actions.length > 0 ? (completedActions.length / actions.length) * 100 : 0;

  const todayDateString = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // ==========================================
  // 신규 모바일 UI (B) 렌더링 (03-today.html)
  // ==========================================
  if (uiVersion === 'B') {
    return (
      <div className="max-w-app mx-auto min-h-dvh bg-slate-50 flex flex-col border-x border-slate-200 text-slate-800 font-sans relative">
        {/* 상단 헤더 바 */}
        <header className="sticky top-0 z-header h-14 bg-slate-50/95 backdrop-blur-xs border-b border-transparent flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <DayuLogo variant="symbol" className="h-7 w-auto" />
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">오늘</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings/notifications')}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 focus-ring cursor-pointer"
            aria-label="알림 설정"
          >
            <Bell className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-4 pb-12 flex flex-col gap-4">
          <p className="text-xs font-semibold text-slate-400">{todayDateString}</p>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">오늘 할 일을 불러오는 중...</p>
            </div>
          ) : actions.length === 0 ? (
            <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-2xs">
              <DayuExpression expression="rest" color="blue" className="w-16 h-16 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">참여 중인 챌린지가 없어요</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                새 모임에 참여하거나 챌린지를 만들어 보세요
              </p>
              <button
                type="button"
                onClick={() => navigate('/groups')}
                className="mt-2 inline-flex items-center gap-1.5 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl transition active:scale-[0.98] cursor-pointer"
              >
                <span>모임 둘러보기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {/* 히어로 섹션 */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-md flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0">
                  {pendingActions.length === 0 ? (
                    <DayuExpression expression="done" color="white" className="w-12 h-12 object-contain" />
                  ) : (
                    <DayuExpression expression="cheer" color="white" className="w-12 h-12 object-contain" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-extrabold leading-snug">
                    {pendingActions.length === 0
                      ? '오늘 할 일을 모두 마쳤어요! 🎉'
                      : `인증할 챌린지가 ${pendingActions.length}개 남았어요`}
                  </h2>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {pendingActions.length === 0 ? '내일도 함께 꾸준히 달려봐요.' : '자정 전에 사진 한 장이면 끝나요.'}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-300"
                        style={{ width: `${progressRatio}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold font-mono">
                      {completedActions.length}/{actions.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* 인증 대기 섹션 */}
              {pendingActions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      인증 대기 <span className="text-slate-700">{pendingActions.length}</span>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {pendingActions.map((action) => (
                      <div
                        key={action.challengeId}
                        className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-blue-300 transition space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                            {action.groupName}
                          </span>
                          {action.executionType === 'TOGETHER' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              함께하기
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-slate-900">{action.challengeTitle}</h4>
                          <div className="mt-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600">
                            <span className="font-bold text-slate-700">인증 기준: </span>
                            {action.verificationCriteria || '인증 사진 제출'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedAction(action)}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
                        >
                          <span>사진 찍고 인증하기</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 완료됨 섹션 */}
              {completedActions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      완료 <span className="text-slate-700">{completedActions.length}</span>
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {completedActions.map((action) => (
                      <div
                        key={action.challengeId}
                        className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-2xs"
                      >
                        {action.myVerification?.imageUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                src: action.myVerification!.imageUrl,
                                alt: `${action.challengeTitle} 인증 사진`,
                              })
                            }
                            className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 cursor-zoom-in shrink-0 focus-ring flex items-center justify-center"
                            aria-label="사진 확대 보기"
                          >
                            <img
                              src={action.myVerification.imageUrl}
                              alt="인증 사진"
                              className="w-full h-full object-contain"
                            />
                          </button>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold text-xs shrink-0">
                            완료
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold text-slate-400 block truncate">
                            {action.groupName}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 truncate">{action.challengeTitle}</h4>
                          {action.executionType === 'TOGETHER' && action.todayVerifierNickname ? (
                            <p className="text-[11px] text-indigo-600 font-medium truncate mt-0.5">
                              {action.todayVerifierNickname}님이 인증 완료
                            </p>
                          ) : action.myVerification?.comment ? (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              "{action.myVerification.comment}"
                            </p>
                          ) : null}
                        </div>

                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                          완료
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* 바텀 네비게이션 바 */}
        <BottomNav todayBadgeCount={pendingActions.length} />

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

        {lightboxImage && (
          <Lightbox
            open={true}
            onClose={() => setLightboxImage(null)}
            src={lightboxImage.src}
            alt={lightboxImage.alt}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // 기존 레거시 UI (A) 온전한 보존
  // ==========================================
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
            className="p-2 rounded-md text-ink-secondary hover:text-primary hover:bg-sunken transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
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
              className="mt-2 inline-flex items-center gap-1.5 h-btn-sm px-4 bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-semibold rounded-md transition focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-primary-muted"
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
                      className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs hover:border-blue-300 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            {action.groupName && (
                              <span className="inline-block text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                {action.groupName}
                              </span>
                            )}
                            {action.executionType === 'TOGETHER' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                함께하기
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {action.challengeTitle}
                          </h3>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-md p-2.5 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">인증 기준: </span>
                        {action.verificationCriteria}
                      </div>

                      <button
                        onClick={() => setSelectedAction(action)}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-xs"
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
                      className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between gap-3 opacity-90"
                    >
                      <div className="flex items-center gap-3">
                        {action.myVerification?.imageUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                src: action.myVerification!.imageUrl,
                                alt: `${action.challengeTitle} 인증 사진`,
                              })
                            }
                            className="w-12 h-12 rounded-md overflow-hidden bg-slate-900 border border-slate-200 cursor-zoom-in shrink-0 focus-ring flex items-center justify-center"
                            title="사진 확대 보기"
                            aria-label="사진 확대 보기"
                          >
                            <img
                              src={action.myVerification.imageUrl}
                              alt="인증 사진"
                              className="w-full h-full object-contain"
                            />
                          </button>
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                              action.executionType === 'TOGETHER'
                                ? 'bg-indigo-100 text-indigo-600'
                                : 'bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            완료
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            {action.groupName && (
                              <span className="text-[10px] text-slate-500 font-medium block">
                                {action.groupName}
                              </span>
                            )}
                            {action.executionType === 'TOGETHER' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                함께하기
                              </span>
                            )}
                          </div>
                          <h3 className="text-body-sm font-semibold text-ink">
                            {action.challengeTitle}
                          </h3>
                          {action.executionType === 'TOGETHER' && action.todayVerifierNickname ? (
                            <p className="text-caption text-indigo-600 font-medium mt-0.5">
                              오늘 공동 완료 · {action.todayVerifierNickname}님이 인증했어요
                            </p>
                          ) : action.myVerification?.comment ? (
                            <p className="text-caption text-ink-muted line-clamp-1 mt-0.5">
                              "{action.myVerification.comment}"
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {action.executionType === 'TOGETHER' ? (
                        <span className="text-label text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md shrink-0 font-semibold">
                          공동 완료
                        </span>
                      ) : (
                        <span className="text-label text-success bg-success-bg border border-success-border px-2 py-1 rounded-md shrink-0 font-semibold">
                          인증 완료
                        </span>
                      )}
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

      {lightboxImage && (
        <Lightbox
          open={true}
          onClose={() => setLightboxImage(null)}
          src={lightboxImage.src}
          alt={lightboxImage.alt}
        />
      )}
    </MobileLayout>
  );
};

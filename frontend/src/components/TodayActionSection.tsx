import React, { useState } from 'react';
import type { TodayAction } from '../types';
import { CheckCircle2, Camera, Calendar, ShieldCheck } from 'lucide-react';
import { Lightbox } from './ui/Lightbox';

interface TodayActionSectionProps {
  todayActions: TodayAction[];
  loading: boolean;
  onOpenVerificationModal: (action: TodayAction) => void;
}

export const TodayActionSection: React.FC<TodayActionSectionProps> = ({
  todayActions,
  loading,
  onOpenVerificationModal,
}) => {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-20 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (todayActions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center py-7">
        <ShieldCheck className="w-9 h-9 text-blue-500 mx-auto mb-2 opacity-80" />
        <h3 className="text-sm font-bold text-slate-800 mb-1">오늘 수행할 챌린지가 없습니다.</h3>
        <p className="text-xs text-slate-500">
          새로운 챌린지에 참여해보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-800">오늘 할 일</h2>
        </div>
        <span className="text-[11px] text-slate-400">
          {todayActions.filter((a) => a.isCompletedToday).length} / {todayActions.length} 완료
        </span>
      </div>

      <div className="space-y-2">
        {todayActions.map((action) => (
          <div
            key={action.challengeId}
            className={`bg-white border rounded-lg p-3.5 shadow-xs transition flex items-center justify-between gap-3 ${
              action.isCompletedToday ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {action.challengeTitle}
                </span>
                {action.executionType === 'TOGETHER' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    함께하기
                  </span>
                )}
                {action.isCompletedToday ? (
                  action.executionType === 'TOGETHER' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                      오늘 공동 완료
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      완료
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    인증 대기
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                기준: {action.verificationCriteria}
              </p>
              {action.isCompletedToday && action.executionType === 'TOGETHER' && action.todayVerifierNickname && (
                <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                  오늘 공동 완료 · {action.todayVerifierNickname}님이 인증했어요
                </p>
              )}
              {action.periodType === 'WEEKLY_N' && action.periodInfo && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[120px] overflow-hidden">
                    <div
                      className={`h-full w-full origin-left rounded-full transition-transform duration-300 ease-out ${
                        action.periodInfo.isGoalAchieved ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{
                        transform: `scaleX(${Math.min(
                          1,
                          action.periodInfo.completedCount / action.periodInfo.targetCount
                        )})`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {action.periodInfo.index}구간: {action.periodInfo.completedCount}/{action.periodInfo.targetCount}회
                    {action.periodInfo.isGoalAchieved && ' 🎉 목표 달성!'}
                  </span>
                </div>
              )}
            </div>

            {action.isCompletedToday ? (
              <div className="flex items-center gap-2 shrink-0">
                {action.myVerification?.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setLightboxImage({ src: action.myVerification!.imageUrl, alt: `${action.challengeTitle} 오늘 인증 사진` })}
                    className="w-11 h-11 rounded-md overflow-hidden bg-slate-900 border border-emerald-200 shadow-2xs cursor-zoom-in focus-ring flex items-center justify-center"
                    title="사진 확대 보기"
                    aria-label="사진 확대 보기"
                  >
                    <img
                      src={action.myVerification.imageUrl}
                      alt="오늘 인증 사진"
                      className="w-full h-full object-contain"
                      crossOrigin="anonymous"
                    />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenVerificationModal(action)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-medium rounded-md flex items-center gap-1 shadow-xs shrink-0 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{action.periodInfo?.isGoalAchieved ? '추가인증' : '인증하기'}</span>
              </button>
            )}
          </div>
        ))}
      </div>

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
};

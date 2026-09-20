import React from 'react';
import type { TodayAction } from '../types';
import { CheckCircle2, Camera, Calendar, ShieldCheck } from 'lucide-react';

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
            className={`bg-white border rounded-2xl p-3.5 shadow-xs transition flex items-center justify-between gap-3 ${
              action.isCompletedToday ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {action.challengeTitle}
                </span>
                {action.isCompletedToday ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    완료
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    인증 대기
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                기준: {action.verificationCriteria}
              </p>
            </div>

            {action.isCompletedToday ? (
              <div className="flex items-center gap-2 shrink-0">
                {action.myVerification?.imageUrl && (
                  <img
                    src={action.myVerification.imageUrl}
                    alt="오늘 인증 사진"
                    className="w-11 h-11 rounded-xl object-cover border border-emerald-200 shadow-2xs"
                  />
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenVerificationModal(action)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-medium rounded-xl flex items-center gap-1 shadow-xs shrink-0 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>인증하기</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

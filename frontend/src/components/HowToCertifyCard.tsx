import React from 'react';
import type { ChallengeDetail } from '../types';
import { Card } from './dayu/ui';
import { CircleCheck, Repeat, Coins, Lock } from 'lucide-react';

interface HowToCertifyCardProps {
  challenge: ChallengeDetail;
}

export const HowToCertifyCard: React.FC<HowToCertifyCardProps> = ({ challenge }) => {
  const frequencyText =
    challenge.periodType === 'DAILY' || !challenge.periodType
      ? '매일 한 번, 자정까지'
      : `주 ${challenge.targetFrequency ?? 1}회, 일요일 자정까지`;

  const penaltyText = `못 한 날 ${(challenge.myPenaltyAmount ?? 1000).toLocaleString()}원`;

  return (
    <Card className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <CircleCheck className="w-4 h-4 text-slate-800 shrink-0" />
        <h3 className="text-[15px] font-extrabold text-slate-900 tracking-[-0.01em]">
          이렇게 인증해요
        </h3>
      </div>

      {/* Example thumbnail & Criteria */}
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl bg-[#0B1222] p-3 flex flex-col justify-center gap-1.5 shrink-0 overflow-hidden shadow-xs">
          <i className="block h-1 rounded-sm bg-[#60A5FA]" style={{ width: '46%' }} />
          <i className="block h-1 rounded-sm bg-[#334155]" style={{ width: '78%' }} />
          <i className="block h-1 rounded-sm bg-[#334155]" style={{ width: '64%' }} />
          <i className="block h-1 rounded-sm bg-[#34D399]" style={{ width: '30%' }} />
          <i className="block h-1 rounded-sm bg-[#334155]" style={{ width: '84%' }} />
          <i className="block h-1 rounded-sm bg-[#334155]" style={{ width: '52%' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-slate-900 leading-snug tracking-[-0.01em]">
            {challenge.verificationCriteria || '제출 성공 화면 캡처 또는 커밋 내역'}
          </div>
          {challenge.description && (
            <div className="text-[13px] text-slate-500 mt-0.5 leading-normal break-keep">
              {challenge.description}
            </div>
          )}
        </div>
      </div>

      {/* Rules Chips */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <span className="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-[9px] bg-slate-100 text-[12.5px] font-semibold text-slate-700">
          <Repeat className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {frequencyText}
        </span>
        <span className="inline-flex items-center gap-1.5 h-[30px] px-2.5 rounded-[9px] bg-slate-100 text-[12.5px] font-semibold text-slate-700">
          <Coins className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {penaltyText}
        </span>
      </div>

      {/* Lock Notice */}
      <p className="flex items-center gap-1.5 text-[12.5px] text-slate-400">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        <span>시작한 뒤에는 참여자와 규칙을 바꿀 수 없어요</span>
      </p>
    </Card>
  );
};

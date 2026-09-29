import React from 'react';
import { DayuAvatar } from './dayu/DayuAvatar';

interface PushPreviewProps {
  time?: string;
}

export const PushPreview: React.FC<PushPreviewProps> = ({ time = '21:00' }) => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayName = dayNames[today.getDay()];

  return (
    <div className="bg-[#1E3A8A] rounded-[20px] p-[18px_14px] flex flex-col gap-2.5 items-stretch text-white shadow-xs">
      <div className="text-center font-extrabold text-[40px] tracking-[-0.03em] tabular-nums leading-none">
        {time}
      </div>
      <div className="text-center text-[12px] text-blue-200 mt-[-4px]">
        {month}월 {day}일 {dayName} · 미리보기
      </div>

      <div className="flex gap-2.5 p-3 rounded-[18px] bg-white/90 backdrop-blur-xs border border-slate-200 shadow-lg text-slate-800">
        <div className="shrink-0 w-9 h-9 rounded-[9px] overflow-hidden flex items-center justify-center">
          <DayuAvatar color="blue" face="cheer" size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-900">데이유즈</span>
            <span className="text-[11px] text-slate-400">지금</span>
          </div>
          <p className="text-[13px] text-slate-600 mt-0.5 leading-snug break-keep">
            오늘 인증할 챌린지가 1개 남았어요. 자정 전에 사진 한 장이면 끝나요.
          </p>
        </div>
      </div>
    </div>
  );
};

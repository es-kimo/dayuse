import React from 'react';
import { DayuAvatar } from './dayu/DayuAvatar';
import type { DayuColor } from './dayu/dayuColors';
import { Palette, MessageCircle } from 'lucide-react';

interface ProfileHeaderProps {
  nickname: string;
  dayuColor?: DayuColor;
  onAvatarClick: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  nickname,
  dayuColor = 'blue',
  onAvatarClick,
}) => {
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {/* Avatar with palette button */}
      <button
        type="button"
        onClick={onAvatarClick}
        className="relative p-0 rounded-full hover:opacity-95 active:scale-95 transition cursor-pointer select-none"
        aria-label="프로필 데이유 색 바꾸기"
      >
        <DayuAvatar color={dayuColor} face="default" size={88} />
        <span className="absolute bottom-0 right-0 w-[30px] h-[30px] rounded-full bg-white border border-slate-200 grid place-items-center text-slate-600 shadow-xs">
          <Palette className="w-3.5 h-3.5" />
        </span>
      </button>

      {/* Nickname */}
      <div className="text-[18px] font-bold text-slate-900 tracking-[-0.01em]">
        {nickname}
      </div>

      {/* Kakao linked chip */}
      <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-[7px] text-xs font-bold bg-[#FEF9C3] text-[#713F12]">
        <MessageCircle className="w-3.5 h-3.5 fill-current" />
        카카오 계정 연동됨
      </span>
    </div>
  );
};

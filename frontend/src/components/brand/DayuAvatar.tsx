import React from 'react';
import { parseDayuColor, isHttpProfileImage, type DayuColorOption } from '../../tokens/dayuColors';
import { DAYU_FACE_PATH, DAYU_EXPRESSION_WHITE_PATH } from '../../tokens/dayuSvgPaths';

interface DayuAvatarProps {
  profileImageUrl?: string | null;
  colorOption?: DayuColorOption;
  size?: number | string; // e.g. 40, 48, 88, 136 or Tailwind w-h
  alt?: string;
  className?: string;
  ariaHidden?: boolean;
}

export const DayuAvatar: React.FC<DayuAvatarProps> = ({
  profileImageUrl,
  colorOption,
  size = 40,
  alt = '데이유 프로필',
  className = '',
  ariaHidden = false,
}) => {
  if (isHttpProfileImage(profileImageUrl)) {
    const sizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : {};
    return (
      <img
        src={profileImageUrl!}
        alt={alt}
        style={sizeStyle}
        className={`rounded-full object-cover shrink-0 border border-slate-200 ${className}`}
        aria-hidden={ariaHidden}
      />
    );
  }

  const color = colorOption || parseDayuColor(profileImageUrl);
  const sizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : {};

  return (
    <div
      style={{
        backgroundColor: color.bg,
        color: color.color,
        ...sizeStyle,
      }}
      className={`rounded-full flex items-center justify-center shrink-0 select-none overflow-hidden ${className}`}
      aria-label={ariaHidden ? undefined : alt}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : 'img'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 55.25 55.25"
        className="w-[74%] h-[74%] mt-[14%] block"
        aria-hidden="true"
      >
        {/* 흰색 눈과 입 배킹 - 데이유 표정이 모든 배경색에서 뚜렷하게 보이도록 지원 */}
        <path
          fill="#FFFFFF"
          transform="translate(-3.00 -3.25)"
          d={DAYU_EXPRESSION_WHITE_PATH}
        />
        {/* 데이유 본체 실루엣 및 눈/입 컷아웃 (fillRule="evenodd") */}
        <path
          fill="currentColor"
          fillRule="evenodd"
          transform="translate(-3.00 -3.25)"
          d={DAYU_FACE_PATH}
        />
      </svg>
    </div>
  );
};

import React from 'react';

export type LogoVariant = 'horizontal' | 'vertical' | 'symbol' | 'app-icon' | 'en' | 'wordmark';
export type LogoTheme = 'light' | 'dark' | 'mono-black' | 'mono-white';

interface DayuLogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  ko?: boolean; // v1.1 기본값: true (한글 메인 로고 정책)
  className?: string;
  alt?: string;
}

export const DayuLogo: React.FC<DayuLogoProps> = ({
  variant = 'horizontal',
  theme = 'light',
  ko = true,
  className = 'h-7 w-auto',
  alt = '데이유즈',
}) => {
  let src = '/brand/logo.svg';

  if (variant === 'app-icon') {
    src = theme === 'mono-white' ? '/brand/app-icon/app-icon-white.svg' : '/brand/app-icon/app-icon.svg';
  } else if (variant === 'symbol') {
    src = theme === 'light' ? '/brand/symbol.svg' : `/brand/symbol/symbol-${theme}.svg`;
  } else if (variant === 'en') {
    src = theme === 'light' ? '/brand/logo-en.svg' : `/brand/logo-en/logotype-${theme}.svg`;
  } else if (variant === 'vertical') {
    src = `/brand/logo-ko/logo-vertical-ko-${theme}.svg`;
  } else if (variant === 'wordmark') {
    src = `/brand/logo-ko/wordmark-ko-${theme}.svg`;
  } else {
    // horizontal
    if (!ko) {
      src = theme === 'light' ? '/brand/logo-en.svg' : `/brand/logo-en/logotype-${theme}.svg`;
    } else if (theme === 'light') {
      src = '/brand/logo.svg';
    } else {
      src = `/brand/logo-ko/logo-horizontal-ko-${theme}.svg`;
    }
  }

  return <img src={src} alt={alt} className={className} />;
};


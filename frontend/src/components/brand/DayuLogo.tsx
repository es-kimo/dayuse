import React from 'react';

export type LogoVariant = 'horizontal' | 'vertical' | 'symbol' | 'app-icon' | 'bilingual';
export type LogoTheme = 'light' | 'dark' | 'mono-black' | 'mono-white';

interface DayuLogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  ko?: boolean;
  className?: string;
  alt?: string;
}

export const DayuLogo: React.FC<DayuLogoProps> = ({
  variant = 'horizontal',
  theme = 'light',
  ko = false,
  className = 'h-7 w-auto',
  alt = 'dayuse',
}) => {
  let src = '/brand/combination/logo-horizontal-light.svg';

  if (variant === 'app-icon') {
    src = theme === 'mono-white' ? '/brand/app-icon/app-icon-white.svg' : '/brand/app-icon/app-icon.svg';
  } else if (variant === 'symbol') {
    src = `/brand/symbol/symbol-${theme}.svg`;
  } else if (variant === 'bilingual') {
    src = `/brand/combination/logo-bilingual-${theme}.svg`;
  } else if (variant === 'vertical') {
    src = ko
      ? `/brand/combination/logo-vertical-ko-${theme}.svg`
      : `/brand/combination/logo-vertical-${theme}.svg`;
  } else {
    // horizontal
    src = ko
      ? `/brand/combination/logo-horizontal-ko-${theme}.svg`
      : `/brand/combination/logo-horizontal-${theme}.svg`;
  }

  return <img src={src} alt={alt} className={className} />;
};

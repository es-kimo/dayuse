import React, { useState } from 'react';
import { isInAppBrowser, getInAppBrowserName, openInExternalBrowser } from '../utils/shareEnv';
import { ExternalLink, Copy, Check, X } from 'lucide-react';

interface InAppBrowserNoticeProps {
  className?: string;
}

export const InAppBrowserNotice: React.FC<InAppBrowserNoticeProps> = ({ className = '' }) => {
  const inApp = typeof window !== 'undefined' && isInAppBrowser();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('dayuse_inapp_notice_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState<boolean>(false);

  if (!inApp || dismissed) return null;

  const appName = getInAppBrowserName();
  const appDisplayName =
    appName === 'kakaotalk'
      ? '카카오톡'
      : appName === 'instagram'
      ? '인스타그램'
      : appName === 'naver'
      ? '네이버'
      : '인앱';

  const handleOpenExternal = () => {
    openInExternalBrowser();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 폴백
      const textarea = document.createElement('textarea');
      textarea.value = window.location.href;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('dayuse_inapp_notice_dismissed', '1');
    } catch {
      // 무시
    }
  };

  return (
    <div
      role="region"
      aria-label="인앱 브라우저 안내"
      className={`w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 sm:p-4 text-xs sm:text-sm shadow-xs ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-semibold text-amber-950 flex items-center gap-1.5">
          <span>⚠️ {appDisplayName} 인앱 브라우저로 접속 중입니다</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-amber-700 hover:text-amber-950 p-1 -mr-1 -mt-1 rounded-lg transition"
          aria-label="안내 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-amber-800 break-keep mb-3 leading-relaxed">
        인앱 브라우저 환경에서는 소셜 로그인 및 세션 유지가 불안정할 수 있습니다. 오른쪽 상단 더보기(⋮ 또는 ⋯)를 눌러 <strong>&apos;기본 브라우저로 열기&apos;</strong>를 권장합니다.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleOpenExternal}
          className="min-h-[44px] px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg inline-flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>기본 브라우저로 열기</span>
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="min-h-[44px] px-3 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">복사됨!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-amber-700" />
              <span>주소 복사</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 라우트 변경(경로 이동) 시 이전 화면의 스크롤 위치가 유지되지 않도록
 * 화면 스크롤을 최상단으로 자동 초기화하는 컴포넌트
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
    } else {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView();
      }
    }
  }, [pathname, hash]);

  return null;
};

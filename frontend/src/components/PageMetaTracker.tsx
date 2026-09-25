import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resolvePageMeta, updateDocumentMeta } from '../utils/meta';

/**
 * 라우트 변경을 감지하여 정의된 메타데이터 정책(제목, 설명, OG 태그, robots)을 자동으로 DOM Head에 동기화하는 컴포넌트
 */
export const PageMetaTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const meta = resolvePageMeta(location.pathname);
    updateDocumentMeta(meta);
  }, [location.pathname]);

  return null;
};

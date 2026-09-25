import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resolvePageMeta, updateDocumentMeta, type ResolveMetaOptions, type PageMeta } from '../utils/meta';

/**
 * 컴포넌트 레벨에서 페이지 메타데이터를 관리하거나 상세 상태(404, 만료 등)를 반영하는 React Hook
 */
export function usePageMeta(options?: ResolveMetaOptions): PageMeta {
  const location = useLocation();
  const meta = resolvePageMeta(location.pathname, options);

  useEffect(() => {
    updateDocumentMeta(meta);
  }, [meta]);

  return meta;
}

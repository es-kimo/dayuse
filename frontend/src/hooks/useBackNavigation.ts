import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * 앱 안에서 들어온 화면이면 이전 화면으로, 링크·새로고침으로 바로 들어온 화면이면 fallback으로 보낸다.
 * react-router는 앱 첫 진입 엔트리의 location.key를 'default'로 둔다.
 */
export function useBackNavigation(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [navigate, location.key, fallback]);
}

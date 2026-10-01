import { describe, expect, it } from 'vitest';
import { createMemoryRouter } from 'react-router-dom';
import { navigateAfterChallengeCreation } from './challengeNavigation';

// 화면을 렌더링하지 않고 실제 라우터의 뒤로/앞으로 이동 결과를 검증한다.
describe('챌린지 생성 완료 히스토리', () => {
  it.each([
    ['모임 챌린지 탭', ['/groups/7?tab=challenges', '/groups/7/challenges/new']],
    ['모임 피드', ['/groups/7', '/groups/7/challenges/new']],
    ['재시작', ['/challenges/12', '/groups/7/challenges/new?restartFrom=12']],
    ['직접 진입', ['/groups/7/challenges/new']],
  ])('%s에서 생성해도 뒤로가기는 모임 챌린지 탭으로 이동한다', async (_name, initialEntries) => {
    const router = createMemoryRouter([{ path: '*', element: null }], { initialEntries });
    try {
      navigateAfterChallengeCreation(router.navigate, 7, 99);
      expect(router.state.location.pathname).toBe('/challenges/99');

      await router.navigate(-1);
      expect(router.state.location.pathname + router.state.location.search).toBe('/groups/7?tab=challenges');

      await router.navigate(1);
      expect(router.state.location.pathname).toBe('/challenges/99');

      await router.navigate(-1);
      await router.navigate(-1);
      expect(router.state.location.pathname).not.toContain('/challenges/new');
    } finally {
      router.dispose();
    }
  });
});

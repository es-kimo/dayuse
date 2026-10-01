import type { NavigateFunction } from 'react-router-dom';

/** 생성 성공 후 상세 화면으로 이동한다. */
export function navigateAfterChallengeCreation(
  navigate: NavigateFunction,
  groupId: number,
  challengeId: number,
): void {
  // 완료된 생성 폼을 교체해 뒤로/앞으로 이동으로 다시 제출할 수 없게 한다.
  navigate(`/groups/${groupId}?tab=challenges`, { replace: true });
  navigate(`/challenges/${challengeId}`);
}

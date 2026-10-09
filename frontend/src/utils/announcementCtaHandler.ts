import type { NavigateFunction } from 'react-router-dom';
import type { AnnouncementActionTarget } from '../types';
import { markAnnouncementAsRead } from '../api/announcements';

export interface AnnouncementCtaContext {
  target?: AnnouncementActionTarget | null;
  announcementId?: number;
  navigate: NavigateFunction;
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  onRefreshUnread?: () => void;
  // 선택적 부가 맥락 (예: 현재 접근 가능한 모임 목록이나 챌린지)
  userGroupCount?: number;
  activeGroupId?: number;
}

/**
 * 실행 버튼(CTA) 대상 경로 매핑 및 권한/기능 상태 안전 검증 핸들러 (F08).
 *
 * 규칙:
 * 1. 유효한 내부 경로로 이동하는 경우 소식을 읽음(markAsRead) 처리한다.
 * 2. 특정 맥락(예: 모임, 리데이)이 필요하지만 사용할 수 없는 상태인 경우
 *    '현재 사용할 수 없는 기능이에요' 안내 후 화면을 이동하지 않는다.
 */
export async function executeAnnouncementCta(ctx: AnnouncementCtaContext): Promise<boolean> {
  const {
    target,
    announcementId,
    navigate,
    showToast,
    onRefreshUnread,
    userGroupCount = 1,
    activeGroupId,
  } = ctx;

  if (!target) {
    showToast('현재 사용할 수 없는 기능이에요', 'warning');
    return false;
  }

  // 1. 목적지 유효성 및 권한/기능 제공 조건 검증
  let destinationPath: string | null = null;

  switch (target) {
    case 'HOME':
      destinationPath = '/today';
      break;

    case 'CERT_CREATE':
      // 인증 작성을 위해 오늘 페이지로 이동
      destinationPath = '/today';
      break;

    case 'REDAY_HISTORY':
      if (activeGroupId) {
        destinationPath = `/groups/${activeGroupId}`;
      } else if (userGroupCount > 0) {
        destinationPath = '/groups';
      } else {
        showToast('현재 사용할 수 없는 기능이에요', 'warning');
        return false;
      }
      break;

    case 'GROUP_CREATE':
      destinationPath = '/groups/new';
      break;

    case 'ANNOUNCEMENT_LIST':
      destinationPath = '/announcements';
      break;

    case 'MY_PAGE':
      destinationPath = '/profile';
      break;

    default:
      showToast('현재 사용할 수 없는 기능이에요', 'warning');
      return false;
  }

  // 2. 소식 읽음 비동기 기록 (이동을 차단하지 않음)
  if (announcementId) {
    markAnnouncementAsRead(announcementId)
      .then(() => {
        onRefreshUnread?.();
      })
      .catch(() => {
        // 읽음 처리 실패는 Fail-Safe로 무시
      });
  }

  // 3. 목적지로 안전 이동
  navigate(destinationPath);
  return true;
}

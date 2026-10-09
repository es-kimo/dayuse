import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeAnnouncementCta } from './announcementCtaHandler';
import * as announcementsApi from '../api/announcements';

describe('executeAnnouncementCta (F08)', () => {
  const navigate = vi.fn();
  const showToast = vi.fn();
  const onRefreshUnread = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('target이 없는 경우 경고 토스트를 표시하고 이동하지 않는다', async () => {
    const success = await executeAnnouncementCta({
      target: null,
      navigate,
      showToast,
    });

    expect(success).toBe(false);
    expect(showToast).toHaveBeenCalledWith('현재 사용할 수 없는 기능이에요', 'warning');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('HOME 대상이면 /today로 이동하고 읽음 처리 API를 비동기 호출한다', async () => {
    const markReadSpy = vi.spyOn(announcementsApi, 'markAnnouncementAsRead').mockResolvedValue({
      announcementId: 10,
      userId: 1,
      isRead: true,
      readAt: '2026-10-09T12:00:00',
      isDismissed: false,
      dismissedAt: null,
    });

    const success = await executeAnnouncementCta({
      target: 'HOME',
      announcementId: 10,
      placement: 'HOME',
      featureKey: 'reday',
      navigate,
      showToast,
      onRefreshUnread,
    });

    expect(success).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/today');
    expect(markReadSpy).toHaveBeenCalledWith(10);
  });

  it('GROUP_CREATE 대상이면 /groups/new로 안전하게 이동한다', async () => {
    const success = await executeAnnouncementCta({
      target: 'GROUP_CREATE',
      navigate,
      showToast,
    });

    expect(success).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/groups/new');
  });

  it('REDAY_HISTORY 대상일 때 activeGroupId가 있으면 해당 모임으로, 없으면 /groups로 분기한다', async () => {
    await executeAnnouncementCta({
      target: 'REDAY_HISTORY',
      navigate,
      showToast,
      activeGroupId: 42,
    });
    expect(navigate).toHaveBeenCalledWith('/groups/42');

    await executeAnnouncementCta({
      target: 'REDAY_HISTORY',
      navigate,
      showToast,
      userGroupCount: 2,
    });
    expect(navigate).toHaveBeenCalledWith('/groups');
  });

  it('REDAY_HISTORY 대상이지만 참여 중인 모임이 전혀 없으면 안내 토스트를 띄우고 차단한다', async () => {
    const success = await executeAnnouncementCta({
      target: 'REDAY_HISTORY',
      navigate,
      showToast,
      userGroupCount: 0,
    });

    expect(success).toBe(false);
    expect(showToast).toHaveBeenCalledWith('현재 사용할 수 없는 기능이에요', 'warning');
    expect(navigate).not.toHaveBeenCalled();
  });
});

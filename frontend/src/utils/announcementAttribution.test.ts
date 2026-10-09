import { describe, it, expect, beforeEach } from 'vitest';
import {
  setAnnouncementAttribution,
  getAnnouncementAttribution,
  clearAnnouncementAttribution,
  consumeAnnouncementAttribution,
  checkRouteNavigation,
} from './announcementAttribution';

describe('announcementAttribution (F10)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearAnnouncementAttribution();
  });

  it('출처 컨텍스트를 저장하고 조회할 수 있다', () => {
    setAnnouncementAttribution({
      sourceAnnouncementId: 10,
      placement: 'HOME',
      featureKey: 'reday',
      destinationTarget: 'REDAY_HISTORY',
      destinationPath: '/groups/1',
    });

    const stored = getAnnouncementAttribution();
    expect(stored).not.toBeNull();
    expect(stored?.sourceAnnouncementId).toBe(10);
    expect(stored?.placement).toBe('HOME');
    expect(stored?.featureKey).toBe('reday');
    expect(stored?.destinationPath).toBe('/groups/1');
  });

  it('consumeAnnouncementAttribution 호출 시 출처를 결합하고 즉시 해제한다', () => {
    setAnnouncementAttribution({
      sourceAnnouncementId: 10,
      placement: 'HOME',
      featureKey: 'reday',
      destinationTarget: 'REDAY_HISTORY',
    });

    const enriched = consumeAnnouncementAttribution({ challengeId: 5 });
    expect(enriched).toEqual({
      challengeId: 5,
      sourceAnnouncementId: 10,
      sourcePlacement: 'HOME',
      sourceFeatureKey: 'reday',
    });

    // 1회 소비 후 즉시 해제 확인 (이후 작업에 과대 귀속 방지)
    expect(getAnnouncementAttribution()).toBeNull();

    // 두 번째 호출 시에는 출처가 붙지 않음
    const nextEnriched = consumeAnnouncementAttribution({ challengeId: 6 });
    expect(nextEnriched).toEqual({ challengeId: 6 });
  });

  it('clearAnnouncementAttribution 호출 시 즉시 해제된다', () => {
    setAnnouncementAttribution({
      sourceAnnouncementId: 10,
    });
    expect(getAnnouncementAttribution()).not.toBeNull();

    clearAnnouncementAttribution();
    expect(getAnnouncementAttribution()).toBeNull();
  });

  describe('checkRouteNavigation (무관한 화면 이동 시 즉시 해제)', () => {
    it('지정된 목적지 경로 또는 그룹 맥락 내 이동 시에는 출처를 유지한다', () => {
      setAnnouncementAttribution({
        sourceAnnouncementId: 10,
        destinationPath: '/groups/1',
      });

      // 동일 경로 이동
      checkRouteNavigation('/groups/1');
      expect(getAnnouncementAttribution()).not.toBeNull();

      // 같은 모임 맥락 이동
      checkRouteNavigation('/groups/1/challenges/new');
      expect(getAnnouncementAttribution()).not.toBeNull();
    });

    it('지정된 목적지와 무관한 화면으로 이탈하면 출처를 즉시 해제한다', () => {
      setAnnouncementAttribution({
        sourceAnnouncementId: 10,
        destinationPath: '/groups/1',
      });

      // 무관한 화면으로 이동 (예: 마이페이지, 프로필, 엉뚱한 화면)
      checkRouteNavigation('/profile');
      expect(getAnnouncementAttribution()).toBeNull();
    });
  });
});

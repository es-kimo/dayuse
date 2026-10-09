import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  trackAnnouncementImpression,
  trackAnnouncementOpened,
  trackAnnouncementDismissed,
  clearRecordedImpressions,
  hasRecordedImpression,
} from './announcementTracking';
import * as trackerModule from './tracker';

describe('announcementTracking (F10)', () => {
  let trackSpy: any;

  beforeEach(() => {
    trackSpy = vi.spyOn(trackerModule, 'track').mockImplementation(() => {});
    clearRecordedImpressions();
  });

  afterEach(() => {
    trackSpy.mockRestore();
  });

  describe('trackAnnouncementImpression (노출 중복 방지)', () => {
    it('최초 노출 시 announcement_impression 이벤트를 기록한다', () => {
      const recorded = trackAnnouncementImpression(1, 'HOME', 'reday');
      expect(recorded).toBe(true);
      expect(trackSpy).toHaveBeenCalledWith('announcement_impression', {
        announcementId: 1,
        placement: 'HOME',
        featureKey: 'reday',
      });
      expect(hasRecordedImpression(1, 'HOME')).toBe(true);
    });

    it('동일 화면 방문 내 같은 소식 ID + 노출 위치의 중복 호출은 무시한다', () => {
      trackAnnouncementImpression(1, 'HOME', 'reday');
      expect(trackSpy).toHaveBeenCalledTimes(1);

      const duplicate = trackAnnouncementImpression(1, 'HOME', 'reday');
      expect(duplicate).toBe(false);
      expect(trackSpy).toHaveBeenCalledTimes(1);
    });

    it('동일 소식이어도 위치(placement)가 다르면 각각 기록된다', () => {
      trackAnnouncementImpression(1, 'HOME', 'reday');
      const differentPlacement = trackAnnouncementImpression(1, 'CERT_CREATE', 'reday');
      expect(differentPlacement).toBe(true);
      expect(trackSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('trackAnnouncementOpened', () => {
    it('announcement_opened 이벤트를 발화한다', () => {
      trackAnnouncementOpened(10, 'HOME', 'feature-x');
      expect(trackSpy).toHaveBeenCalledWith('announcement_opened', {
        announcementId: 10,
        placement: 'HOME',
        featureKey: 'feature-x',
      });
    });
  });

  describe('trackAnnouncementDismissed', () => {
    it('announcement_dismissed 이벤트를 발화한다', () => {
      trackAnnouncementDismissed(10, 'CERT_CREATE', 'feature-y');
      expect(trackSpy).toHaveBeenCalledWith('announcement_dismissed', {
        announcementId: 10,
        placement: 'CERT_CREATE',
        featureKey: 'feature-y',
      });
    });
  });
});

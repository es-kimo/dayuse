import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { TrackedEventPayload } from '../types/analytics';
import { STORAGE_KEY_SESSION } from './analytics';
import { RETRY_DELAYS_MS, buildEvent, deliver, toOffsetIsoString, track } from './tracker';

const fetchMock = vi.fn();

const res = (status: number) => ({ ok: status >= 200 && status < 300, status }) as Response;
const bodyOf = (callIndex: number) => JSON.parse(fetchMock.mock.calls[callIndex][1].body);
const totalRetryWindowMs = RETRY_DELAYS_MS.reduce((sum, ms) => sum + ms, 0) * 1.3;

const FIXTURE: TrackedEventPayload = {
  eventId: 'evt-fixture-1',
  eventName: 'home_viewed',
  occurredAt: '2026-09-30T19:11:17.123+09:00',
  sessionId: 'session-1',
  schemaVersion: 1,
  appVersion: '0.8.1',
  properties: { challengeId: 1 },
};

describe('Frontend Tracker (F02)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T10:00:00.000Z'));
    sessionStorage.clear();
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('toOffsetIsoString', () => {
    it('오프셋을 포함한 ISO-8601이며 같은 시각으로 되돌려진다', () => {
      const date = new Date('2026-09-30T10:00:00.456Z');
      const text = toOffsetIsoString(date);
      expect(text).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
      expect(new Date(text).getTime()).toBe(date.getTime());
    });
  });

  describe('1. 공통 메타데이터 (buildEvent)', () => {
    it('eventId·occurredAt·sessionId·schemaVersion·appVersion을 자동으로 채운다', () => {
      const event = buildEvent('certification_started', { challengeId: 7, groupId: 3 });

      expect(event.eventName).toBe('certification_started');
      expect(event.eventId.length).toBeGreaterThan(0);
      expect(event.eventId.length).toBeLessThanOrEqual(64);
      expect(new Date(event.occurredAt).toISOString()).toBe('2026-09-30T10:00:00.000Z');
      expect(event.occurredAt).toMatch(/[+-]\d{2}:\d{2}$/);
      expect(event.sessionId).toBe(sessionStorage.getItem(STORAGE_KEY_SESSION));
      expect(event.schemaVersion).toBe(1);
      expect(event.appVersion.length).toBeGreaterThan(0);
      expect(event.appVersion.length).toBeLessThanOrEqual(32);
      expect(event.properties).toEqual({ challengeId: 7, groupId: 3 });
    });

    it('호출마다 eventId가 다르고 같은 세션에서는 sessionId가 같다', () => {
      const first = buildEvent('home_viewed');
      const second = buildEvent('home_viewed');
      expect(first.eventId).not.toBe(second.eventId);
      expect(first.sessionId).toBe(second.sessionId);
    });

    it('properties로 userId를 넘겨도 페이로드에 userId가 실리지 않는다', () => {
      const event = buildEvent('home_viewed', { userId: 999, challengeId: 1 });
      expect(event).not.toHaveProperty('userId');
      expect(event.properties).toEqual({ challengeId: 1 });
    });
  });

  describe('2. 동일 eventId 재시도와 비차단 격리 (deliver)', () => {
    it('성공하면 1회만 전송한다', async () => {
      fetchMock.mockResolvedValue(res(201));
      await deliver(FIXTURE);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('5xx 뒤 성공하면 같은 본문(eventId·occurredAt 포함)으로 재전송한다', async () => {
      fetchMock.mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(201));
      const done = deliver(FIXTURE);
      await vi.advanceTimersByTimeAsync(totalRetryWindowMs);
      await done;

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(bodyOf(1)).toEqual(bodyOf(0));
      expect(bodyOf(1).eventId).toBe(FIXTURE.eventId);
    });

    it('계속 실패하면 첫 시도 + 재시도 2회, 총 3회에서 멈추고 reject하지 않는다', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const done = deliver(FIXTURE);
      await vi.advanceTimersByTimeAsync(totalRetryWindowMs);
      await expect(done).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1 + RETRY_DELAYS_MS.length);
    });

    it('429는 재시도하고, 400·401·403은 재시도하지 않는다', async () => {
      fetchMock.mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(201));
      const retried = deliver(FIXTURE);
      await vi.advanceTimersByTimeAsync(totalRetryWindowMs);
      await retried;
      expect(fetchMock).toHaveBeenCalledTimes(2);

      for (const status of [400, 401, 403]) {
        fetchMock.mockReset();
        fetchMock.mockResolvedValue(res(status));
        await deliver(FIXTURE);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      }
    });

    it('재시도 간격은 1초, 3초 기준(±20%)으로 벌어진다', async () => {
      fetchMock.mockResolvedValue(res(503));
      const done = deliver(FIXTURE);
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(799);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(401);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(2399);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1201);
      await done;
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('accessToken이 있으면 Authorization 헤더를 붙이고 없으면 붙이지 않는다', async () => {
      fetchMock.mockResolvedValue(res(201));
      await deliver(FIXTURE);
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();

      localStorage.setItem('accessToken', 'tok');
      await deliver(FIXTURE);
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer tok');
    });
  });

  describe('3. track() 공개 인터페이스', () => {
    it('동기적으로 undefined를 반환하고 응답을 기다리지 않는다', () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const returned = track('home_viewed');
      expect(returned).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('fetch가 동기적으로 throw해도 호출부로 예외가 나오지 않는다', async () => {
      fetchMock.mockImplementation(() => {
        throw new Error('boom');
      });
      expect(() => track('certification_failed', { reason: 'network' })).not.toThrow();
      await vi.advanceTimersByTimeAsync(totalRetryWindowMs);
    });

    it('저장소 접근이 막혀도 예외 없이 동작한다', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      fetchMock.mockResolvedValue(res(201));
      expect(() => track('home_viewed')).not.toThrow();
      vi.restoreAllMocks();
    });

    it('재시도 중 시간이 흘러도 모든 시도가 같은 eventId·occurredAt을 보낸다', async () => {
      fetchMock
        .mockResolvedValueOnce(res(503))
        .mockResolvedValueOnce(res(503))
        .mockResolvedValueOnce(res(201));
      track('certification_completed', { challengeId: 5 });
      await vi.advanceTimersByTimeAsync(totalRetryWindowMs);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [first, second, third] = [bodyOf(0), bodyOf(1), bodyOf(2)];
      expect(second).toEqual(first);
      expect(third).toEqual(first);
      expect(new Date(first.occurredAt).toISOString()).toBe('2026-09-30T10:00:00.000Z');
    });

    it('금지 속성은 전송 본문에 실리지 않는다', () => {
      fetchMock.mockResolvedValue(res(201));
      track('share_clicked', { channel: 'kakao', photoUrl: 'https://x/y.png', userId: 1 } as never);
      expect(bodyOf(0).properties).toEqual({ channel: 'kakao' });
      expect(bodyOf(0)).not.toHaveProperty('userId');
    });
  });
});

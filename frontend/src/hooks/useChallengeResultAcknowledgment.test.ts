import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChallengeResultAcknowledgment } from './useChallengeResultAcknowledgment';
import { challengeResultApi } from '../api/challengeResult';
import type { ChallengeResultDetail, ChallengeParticipantResult } from '../types';

vi.mock('../api/challengeResult', () => ({
  challengeResultApi: {
    acknowledgeResult: vi.fn(),
  },
}));

describe('useChallengeResultAcknowledgment 훅', () => {
  const dummyResult: ChallengeResultDetail = {
    id: 1,
    challengeId: 10,
    groupId: 100,
    status: 'CONFIRMED',
    policyVersion: 'v1',
    executionType: 'INDIVIDUAL',
    periodType: 'DAILY',
    startDate: '2026-10-01',
    endDate: '2026-10-07',
    totalTargetCount: 7,
    totalCompletedCount: 7,
    achievementRate: 100,
    isSuccess: true,
    revision: 1,
    participants: [],
  };

  const dummyParticipant: ChallengeParticipantResult = {
    id: 1,
    challengeParticipantId: 101,
    userId: 1,
    participantStartDate: '2026-10-01',
    targetCount: 7,
    completedCount: 7,
    contributionCount: 7,
    actualSubmissionCount: 7,
    achievementRate: 100,
    isSuccess: true,
    isAcknowledged: false,
    isRevised: false,
    lateCount: 0,
    coinRewardCount: 7,
    coinExcludedDaysCount: 0,
    coinGrantStatus: 'GRANTED',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('잠정(PROVISIONAL) 결과 상태에서는 확인 API를 호출하지 않는다', () => {
    const provisionalResult: ChallengeResultDetail = {
      ...dummyResult,
      status: 'PROVISIONAL',
    };

    renderHook(() =>
      useChallengeResultAcknowledgment({
        groupId: 100,
        challengeId: 10,
        result: provisionalResult,
        myParticipantResult: dummyParticipant,
      })
    );

    expect(challengeResultApi.acknowledgeResult).not.toHaveBeenCalled();
  });

  it('확정(CONFIRMED) 상태이며 미확인인 경우 acknowledgeResult API를 자동 호출한다', async () => {
    const mockUpdated: ChallengeParticipantResult = {
      ...dummyParticipant,
      isAcknowledged: true,
    };
    vi.mocked(challengeResultApi.acknowledgeResult).mockResolvedValue(mockUpdated);

    const onAck = vi.fn();

    const { result } = renderHook(() =>
      useChallengeResultAcknowledgment({
        groupId: 100,
        challengeId: 10,
        result: dummyResult,
        myParticipantResult: dummyParticipant,
        onAcknowledged: onAck,
      })
    );

    await waitFor(() => {
      expect(challengeResultApi.acknowledgeResult).toHaveBeenCalledWith(100, 10);
    });

    expect(onAck).toHaveBeenCalledWith(mockUpdated);
    expect(result.current.isAcknowledged).toBe(true);
    expect(result.current.shouldCelebrate).toBe(true);
  });

  it('이미 확인 완료되었고 수정되지 않은 경우 중복 API 호출을 방지한다', () => {
    const alreadyAckParticipant: ChallengeParticipantResult = {
      ...dummyParticipant,
      isAcknowledged: true,
      isRevised: false,
    };

    renderHook(() =>
      useChallengeResultAcknowledgment({
        groupId: 100,
        challengeId: 10,
        result: dummyResult,
        myParticipantResult: alreadyAckParticipant,
      })
    );

    expect(challengeResultApi.acknowledgeResult).not.toHaveBeenCalled();
  });

  it('결과가 보정된 경우(isRevised=true) 재확인 API를 호출하고 축하 효과는 비활성화한다', async () => {
    const revisedParticipant: ChallengeParticipantResult = {
      ...dummyParticipant,
      isAcknowledged: false,
      isRevised: true,
    };
    vi.mocked(challengeResultApi.acknowledgeResult).mockResolvedValue(revisedParticipant);

    const { result } = renderHook(() =>
      useChallengeResultAcknowledgment({
        groupId: 100,
        challengeId: 10,
        result: dummyResult,
        myParticipantResult: revisedParticipant,
      })
    );

    await waitFor(() => {
      expect(challengeResultApi.acknowledgeResult).toHaveBeenCalledWith(100, 10);
    });

    expect(result.current.shouldCelebrate).toBe(false);
  });
});

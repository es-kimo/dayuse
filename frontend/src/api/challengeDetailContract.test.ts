import { describe, expect, it } from 'vitest';
import { ContractError, parseChallengeDetail } from './challengeDetailContract';

// 백엔드 ChallengeDetailResponse 직렬화 결과와 같은 형태 (null 필드도 키가 있다)
const inProgressResponse = {
  id: 12,
  groupId: 7,
  groupName: '아침 루틴',
  creatorUserId: 1,
  creatorNickname: '호스트',
  title: '매일 물 2L',
  description: null,
  verificationCriteria: '물병 사진',
  startDate: '2026-10-01',
  endDate: '2026-10-14',
  durationDays: 14,
  periodType: 'DAILY',
  targetFrequency: null,
  executionType: 'INDIVIDUAL',
  redayAllowed: false,
  redayRuleDescription: null,
  totalTargetCount: 14,
  totalCompletedCount: 3,
  progressRate: 21,
  currentPeriod: null,
  intervals: [
    {
      index: 1,
      startDate: '2026-10-01',
      endDate: '2026-10-01',
      targetCount: 1,
      completedCount: 1,
      isAchieved: true,
      settlementStatus: 'ACHIEVED',
      settlementId: null,
      missedCount: null,
      penaltyAmountPerMiss: null,
      totalPenaltyAmount: null,
      depositStatus: null,
    },
  ],
  status: 'IN_PROGRESS',
  isCreator: true,
  isParticipating: true,
  myPenaltyAmount: 5000,
  canJoin: false,
  canCancel: false,
  canDelete: false,
  canModifyFull: false,
  canAbort: true,
  abortedAt: null,
  abortedBy: null,
  abortedByNickname: null,
  abortReason: null,
  participants: [
    {
      id: 100,
      userId: 1,
      nickname: '호스트',
      profileImageUrl: null,
      penaltyAmount: 5000,
      startDate: '2026-10-01',
      status: 'ACTIVE',
      completionRate: 21,
      joinedAt: '2026-09-30T21:00:00',
      isCreator: true,
    },
  ],
};

const abortedResponse = {
  ...inProgressResponse,
  status: 'ABORTED',
  canAbort: false,
  abortedAt: '2026-10-04T09:30:00',
  abortedBy: 1,
  abortedByNickname: '호스트',
  abortReason: '일정 변경',
};

describe('parseChallengeDetail', () => {
  it('정상 응답은 값을 그대로 유지하고 위반이 없다', () => {
    const { detail, violations } = parseChallengeDetail(abortedResponse);

    expect(violations).toEqual([]);
    expect(detail).toMatchObject({
      id: 12,
      status: 'ABORTED',
      abortedAt: '2026-10-04T09:30:00',
      abortedBy: 1,
      abortedByNickname: '호스트',
      participants: [{ nickname: '호스트' }],
    });
  });

  it('중단자 닉네임이 없어도 정상으로 처리한다', () => {
    const { detail, violations } = parseChallengeDetail({ ...abortedResponse, abortedByNickname: null });

    expect(violations).toEqual([]);
    expect(detail.abortedByNickname).toBeNull();
  });

  it('중단 상태인데 중단 시각이 없으면 상세는 유지하고 위반으로 돌려준다', () => {
    const { detail, violations } = parseChallengeDetail({ ...abortedResponse, abortedAt: null });

    expect(violations).toEqual([{ path: 'abortedAt', rule: 'required_when_aborted' }]);
    expect(detail).toMatchObject({ id: 12, title: '매일 물 2L', status: 'ABORTED', abortedAt: null, abortedBy: 1 });
  });

  it('중단 상태인데 중단 시각·중단자 키 자체가 없어도 상세는 유지한다', () => {
    const { abortedAt: _at, abortedBy: _by, ...withoutKeys } = abortedResponse;
    const { detail, violations } = parseChallengeDetail(withoutKeys);

    expect(violations).toEqual([
      { path: 'abortedAt', rule: 'required_when_aborted' },
      { path: 'abortedBy', rule: 'required_when_aborted' },
    ]);
    expect(detail).toMatchObject({ status: 'ABORTED', abortedAt: null, abortedBy: null });
  });

  it('중단 상태가 아닌데 중단 시각이 있으면 버리고 위반으로 돌려준다', () => {
    const { detail, violations } = parseChallengeDetail({ ...inProgressResponse, abortedAt: '2026-10-04T09:30:00' });

    expect(violations).toEqual([{ path: 'abortedAt', rule: 'null_unless_aborted' }]);
    expect(detail).toMatchObject({ status: 'IN_PROGRESS', abortedAt: null });
  });

  it('서버가 보낸 구간의 null 벌금 필드를 받아들인다', () => {
    const { detail } = parseChallengeDetail(inProgressResponse);

    expect(detail.intervals?.[0]).toMatchObject({ missedCount: null, totalPenaltyAmount: null });
  });

  it.each([
    ['상태가 없는 응답', { ...inProgressResponse, status: undefined }, 'status'],
    ['알 수 없는 상태', { ...inProgressResponse, status: 'PAUSED' }, 'status'],
    ['ID가 문자열인 응답', { ...inProgressResponse, id: '12' }, 'id'],
    ['참여자 닉네임이 null인 응답', { ...inProgressResponse, participants: [{ ...inProgressResponse.participants[0], nickname: null }] }, 'participants.0.nickname'],
  ])('%s는 ContractError로 실패한다', (_name, raw, path) => {
    expect(() => parseChallengeDetail(raw)).toThrow(ContractError);
    try {
      parseChallengeDetail(raw);
    } catch (error) {
      expect((error as ContractError).violations.map((v) => v.path)).toContain(path);
    }
  });

  it.each([
    ['null', null],
    ['HTML 문자열', '<!doctype html>'],
  ])('본문이 %s이면 ContractError로 실패한다', (_name, raw) => {
    expect(() => parseChallengeDetail(raw)).toThrow(ContractError);
  });

  it('ContractError 메시지에 응답 값을 담지 않는다', () => {
    expect(() => parseChallengeDetail({ ...inProgressResponse, title: 12345, groupName: null })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('12345') })
    );
  });
});

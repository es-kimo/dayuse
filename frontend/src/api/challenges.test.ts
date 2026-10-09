import { afterEach, describe, expect, it, vi } from 'vitest';
import { challengesApi } from './challenges';
import { apiClient } from './client';
import { ContractError } from './challengeDetailContract';
import { resetContractViolationReporter, setContractViolationSink } from './contractViolationReporter';

vi.mock('./client', () => ({ apiClient: { get: vi.fn() } }));

const abortedResponse = {
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
  status: 'ABORTED',
  isCreator: true,
  isParticipating: true,
  myPenaltyAmount: 5000,
  canJoin: false,
  canCancel: false,
  canDelete: false,
  canModifyFull: false,
  abortedAt: '2026-10-04T09:30:00',
  abortedBy: 1,
  abortedByNickname: '호스트',
  participants: [],
};

function respondWith(data: unknown) {
  vi.mocked(apiClient.get).mockResolvedValueOnce({ data });
}

describe('challengesApi.getChallengeDetail', () => {
  afterEach(() => {
    vi.mocked(apiClient.get).mockReset();
    resetContractViolationReporter();
  });

  it('정상 응답이면 보고하지 않는다', async () => {
    const sink = vi.fn();
    setContractViolationSink(sink);
    respondWith(abortedResponse);

    const detail = await challengesApi.getChallengeDetail(12);

    expect(detail).toMatchObject({ id: 12, abortedAt: '2026-10-04T09:30:00' });
    expect(sink).not.toHaveBeenCalled();
  });

  it('중단 시각이 없으면 상세를 돌려주고 위반을 보고한다', async () => {
    const sink = vi.fn();
    setContractViolationSink(sink);
    respondWith({ ...abortedResponse, abortedAt: null });

    const detail = await challengesApi.getChallengeDetail(12);

    expect(detail).toMatchObject({ id: 12, status: 'ABORTED', abortedAt: null });
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        api: 'GET /challenges/{id}',
        resourceId: 12,
        fatal: false,
        violations: [{ path: 'abortedAt', rule: 'required_when_aborted' }],
      })
    );
  });

  it('보고가 실패해도 상세는 돌려준다', async () => {
    setContractViolationSink(() => {
      throw new Error('network down');
    });
    respondWith({ ...abortedResponse, abortedAt: null });

    await expect(challengesApi.getChallengeDetail(12)).resolves.toMatchObject({ id: 12, abortedAt: null });
  });

  it('처리할 수 없는 응답이면 보고하고 ContractError로 실패한다', async () => {
    const sink = vi.fn();
    setContractViolationSink(sink);
    respondWith({ ...abortedResponse, status: undefined });

    await expect(challengesApi.getChallengeDetail(12)).rejects.toBeInstanceOf(ContractError);
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ resourceId: 12, fatal: true }));
  });
});

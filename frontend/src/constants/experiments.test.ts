import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_INVITE_COPY,
  CHALLENGE_INVITE_COPY_EXPERIMENT,
  resolveChallengeInviteCopy,
} from './experiments';
import type { ExperimentState } from '../types/experiment';
import { fallbackState, pendingState } from '../utils/experiment';

const state = (overrides: Partial<ExperimentState> = {}): ExperimentState => ({
  experimentKey: CHALLENGE_INVITE_COPY_EXPERIMENT,
  variant: 'B',
  participating: true,
  isReady: true,
  isFallback: false,
  fallbackReason: 'NONE',
  ...overrides,
});

describe('resolveChallengeInviteCopy', () => {
  it('참여자에게는 배정된 Variant 문구를 보여준다', () => {
    expect(resolveChallengeInviteCopy(state({ variant: 'A' }))).toBe(CHALLENGE_INVITE_COPY.A);
    expect(resolveChallengeInviteCopy(state({ variant: 'B' }))).toBe(CHALLENGE_INVITE_COPY.B);
  });

  it('Variant 미확정 구간에는 기본 문구(A)를 쓴다', () => {
    expect(resolveChallengeInviteCopy(pendingState(CHALLENGE_INVITE_COPY_EXPERIMENT))).toBe(
      CHALLENGE_INVITE_COPY.A
    );
  });

  it('조회 실패·비활성 실험(STOPPED/DRAFT)에는 기본 문구(A)를 쓴다', () => {
    expect(resolveChallengeInviteCopy(fallbackState(CHALLENGE_INVITE_COPY_EXPERIMENT, 'ERROR'))).toBe(
      CHALLENGE_INVITE_COPY.A
    );
    expect(
      resolveChallengeInviteCopy(fallbackState(CHALLENGE_INVITE_COPY_EXPERIMENT, 'INACTIVE_STOPPED'))
    ).toBe(CHALLENGE_INVITE_COPY.A);
  });

  it('미참여자에게 B가 내려와도 기본 문구(A)로 막는다', () => {
    expect(
      resolveChallengeInviteCopy(state({ participating: false, isFallback: true, fallbackReason: 'ROLLOUT_DISABLED' }))
    ).toBe(CHALLENGE_INVITE_COPY.A);
  });

  it('A와 B는 문구만 다르고 서로 구별된다 (단일 변인)', () => {
    expect(CHALLENGE_INVITE_COPY.A).not.toBe(CHALLENGE_INVITE_COPY.B);
  });
});

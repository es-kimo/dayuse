import { describe, expect, it } from 'vitest';
import {
  calculateRemainingSeconds,
  pickRedayUsableRecords,
  REDAY_EARN_BUTTON_LABEL,
  REDAY_USE_BUTTON_LABEL,
  adFailureMessage,
  classifyAdFailure,
  describeAdStage,
  describePenalty,
  formatRedayRemaining,
  redayIneligibleMessage,
  resolveRedayAction,
  shouldShowRedayUi,
} from './reday';
import type { RedayEligibilityResponse } from '../types';

const eligibility = (
  overrides: Partial<RedayEligibilityResponse> = {}
): RedayEligibilityResponse => ({
  recordId: 10,
  verificationId: 99,
  challengeId: 5,
  targetDate: '2026-10-01',
  eligible: true,
  reason: 'ELIGIBLE',
  reasonMessage: '리데이 티켓을 사용할 수 있습니다.',
  redayAllowed: true,
  timePhase: 'OVERDUE_REDAY_ELIGIBLE',
  penaltyAmount: 3000,
  penaltyStatus: 'PENDING',
  redayApplied: false,
  redayDeadline: '2026-10-03T09:00:00',
  remainingSeconds: 3600,
  ...overrides,
});

describe('resolveRedayAction', () => {
  it('보유 티켓이 있으면 즉시 사용 경로를 제시한다', () => {
    const action = resolveRedayAction(eligibility(), 1);
    expect(action.kind).toBe('use-ticket');
    expect(action.primaryLabel).toBe(REDAY_USE_BUTTON_LABEL);
  });

  it('보유 티켓이 0장이면 광고 시청 경로를 제시한다', () => {
    const action = resolveRedayAction(eligibility(), 0);
    expect(action.kind).toBe('watch-ad');
    expect(action.primaryLabel).toBe(REDAY_EARN_BUTTON_LABEL);
  });

  it('이미 리데이가 적용된 기록은 사용 버튼을 주지 않는다', () => {
    const action = resolveRedayAction(
      eligibility({ redayApplied: true, penaltyStatus: 'EXEMPTED' }),
      3
    );
    expect(action.kind).toBe('applied');
    expect(action.primaryLabel).toBeNull();
  });

  it('기한이 지난 기록은 티켓을 들고 있어도 차단하고 사유를 안내한다', () => {
    const action = resolveRedayAction(
      eligibility({ eligible: false, reason: 'EXPIRED' }),
      5
    );
    expect(action.kind).toBe('blocked');
    expect(action.message).toBe('기한이 지났어요.');
    expect(action.retryable).toBe(false);
  });

  it('이미 확정된 벌금은 차단하고 확정 사유를 안내한다', () => {
    const action = resolveRedayAction(
      eligibility({ eligible: false, reason: 'ALREADY_CONFIRMED', penaltyStatus: 'CONFIRMED' }),
      1
    );
    expect(action.kind).toBe('blocked');
    expect(action.message).toBe('이미 확정된 벌금이에요.');
  });

  it('적격 정보를 못 받은 경우에도 크래시 없이 재시도 가능한 차단 상태를 돌려준다', () => {
    const action = resolveRedayAction(null, 0);
    expect(action.kind).toBe('blocked');
    expect(action.retryable).toBe(true);
  });
});

describe('formatRedayRemaining', () => {
  it('일·시간 단위로 줄여 표기한다', () => {
    expect(formatRedayRemaining(26 * 3600)).toBe('1일 2시간 남음');
  });

  it('하루 미만은 시간과 분으로 표기한다', () => {
    expect(formatRedayRemaining(3 * 3600 + 25 * 60)).toBe('3시간 25분 남음');
  });

  it('1시간 미만은 분으로만 표기한다', () => {
    expect(formatRedayRemaining(90)).toBe('1분 남음');
  });

  it('1분 미만과 0 이하를 구분한다', () => {
    expect(formatRedayRemaining(30)).toBe('1분 미만 남음');
    expect(formatRedayRemaining(0)).toBe('기한 종료');
    expect(formatRedayRemaining(-10)).toBe('기한 종료');
    expect(formatRedayRemaining(Number.NaN)).toBe('기한 종료');
  });
});

describe('describePenalty', () => {
  it('보류 금액은 입금해야 할 확정 금액에 합산하지 않는다', () => {
    const pending = describePenalty('PENDING', 3000);
    expect(pending.label).toBe('벌금 보류');
    expect(pending.amount).toBe(3000);
    expect(pending.payableAmount).toBe(0);
  });

  it('확정 금액만 입금 대상으로 집계한다', () => {
    const confirmed = describePenalty('CONFIRMED', 3000);
    expect(confirmed.payableAmount).toBe(3000);
  });

  it('면제된 기록은 금액을 0으로 보여준다', () => {
    const exempted = describePenalty('EXEMPTED', 3000);
    expect(exempted.amount).toBe(0);
    expect(exempted.payableAmount).toBe(0);
  });

  it('상태와 금액이 비어 있어도 안전하게 벌금 없음으로 처리한다', () => {
    const none = describePenalty(undefined, Number.NaN);
    expect(none.label).toBe('벌금 없음');
    expect(none.amount).toBe(0);
  });
});

describe('describeAdStage', () => {
  it('광고 완료와 티켓 지급 완료와 리데이 완료를 서로 다른 단계로 구분한다', () => {
    expect(describeAdStage('ad-completed').completedSteps).toBe(1);
    expect(describeAdStage('ticket-granted').completedSteps).toBe(2);
    expect(describeAdStage('recovery-completed').completedSteps).toBe(3);
  });

  it('티켓 지급 단계에서는 아직 벌금이 면제되지 않았다고 안내한다', () => {
    expect(describeAdStage('ticket-granted').description).toContain('아직 벌금은 면제되지 않았어요');
  });

  it('비가시 상태로 멈춘 동안에는 시청 단계가 올라가지 않는다', () => {
    expect(describeAdStage('paused').completedSteps).toBe(0);
    expect(describeAdStage('watching', 10).description).toContain('10초');
  });
});

describe('classifyAdFailure', () => {
  it('400은 세션 만료로, 5xx는 통신 실패로 분류한다', () => {
    expect(classifyAdFailure({ response: { status: 400 } })).toBe('SESSION_EXPIRED');
    expect(classifyAdFailure({ response: { status: 503 } })).toBe('NETWORK');
  });

  it('응답이 없는 네트워크 오류를 구분한다', () => {
    expect(classifyAdFailure({ message: 'Network Error' })).toBe('NETWORK');
    expect(classifyAdFailure(null)).toBe('UNKNOWN');
  });

  it('모든 사유에 사용자 안내 문구가 있다', () => {
    expect(adFailureMessage('NO_AVAILABLE_AD')).toContain('안내 광고가 없어요');
    expect(adFailureMessage('DAILY_LIMIT_REACHED')).toContain('내일');
  });
});

describe('shouldShowRedayUi', () => {
  it('주 N회 챌린지에는 리데이 UI를 표시하지 않는다', () => {
    expect(shouldShowRedayUi('WEEKLY_N', true)).toBe(false);
  });

  it('리데이 미허용 챌린지에는 표시하지 않는다', () => {
    expect(shouldShowRedayUi('DAILY', false)).toBe(false);
  });

  it('기간 유형과 허용 여부를 모를 때는 서버 판정에 맡긴다', () => {
    expect(shouldShowRedayUi(undefined, undefined)).toBe(true);
  });
});

describe('redayIneligibleMessage', () => {
  it('모든 불가 사유에 고정 안내 문구가 있다', () => {
    const reasons = [
      'NOT_OWNER',
      'NOT_ALLOWED',
      'WEEKLY_NOT_SUPPORTED',
      'TOGETHER_NOT_SUPPORTED',
      'NO_PENALTY',
      'CHALLENGE_ABORTED',
      'NOT_VERIFIED',
      'NOT_OVERDUE',
      'ALREADY_APPLIED',
      'ALREADY_SETTLED',
      'ALREADY_CONFIRMED',
      'EXPIRED',
    ] as const;
    for (const reason of reasons) {
      expect(redayIneligibleMessage(reason).length).toBeGreaterThan(0);
    }
  });
});

describe('pickRedayUsableRecords', () => {
  const now = new Date('2026-10-01T12:00:00+09:00');
  const base = {
    status: 'COMPLETED',
    isLate: true,
    depositStatus: 'UNPAID',
    penaltyStatus: 'PENDING' as const,
    redayApplied: false,
    redayDeadline: '2026-10-02T09:00:00',
  };

  it('기한 안의 지각·보류 기록만 고른다', () => {
    expect(pickRedayUsableRecords([base], now)).toHaveLength(1);
  });

  it('지난달 대상일이라도 기한이 남아 있으면 고른다', () => {
    // 월 단위 달력에는 안 보이는 9월 기록이 빠지지 않는지가 핵심이다.
    const lastMonth = { ...base, date: '2026-09-30' };
    expect(pickRedayUsableRecords([lastMonth], now)).toHaveLength(1);
  });

  it('기한이 지난 기록은 제외한다', () => {
    expect(pickRedayUsableRecords([{ ...base, redayDeadline: '2026-10-01T09:00:00' }], now)).toHaveLength(0);
  });

  it('이미 적용·면제·확정·정산 중인 기록은 제외한다', () => {
    const cases = [
      { ...base, redayApplied: true },
      { ...base, penaltyStatus: 'EXEMPTED' as const },
      { ...base, penaltyStatus: 'CONFIRMED' as const },
      { ...base, depositStatus: 'WAITING_CONFIRMATION' },
    ];
    for (const record of cases) {
      expect(pickRedayUsableRecords([record], now)).toHaveLength(0);
    }
  });

  it('인증 미완료 또는 지각이 아닌 기록은 제외한다', () => {
    expect(pickRedayUsableRecords([{ ...base, status: 'UNCHECKED' }], now)).toHaveLength(0);
    expect(pickRedayUsableRecords([{ ...base, isLate: false }], now)).toHaveLength(0);
  });

  it('빈 목록과 null을 안전하게 처리한다', () => {
    expect(pickRedayUsableRecords([], now)).toEqual([]);
    expect(pickRedayUsableRecords(null, now)).toEqual([]);
    expect(pickRedayUsableRecords(undefined, now)).toEqual([]);
  });
});

describe('calculateRemainingSeconds', () => {
  it('오프셋 없는 서버 시각을 KST로 보정해 계산한다', () => {
    const now = new Date('2026-10-01T12:00:00+09:00');
    expect(calculateRemainingSeconds('2026-10-01T13:00:00', now)).toBe(3600);
  });

  it('기한이 지났거나 값이 없으면 0이다', () => {
    const now = new Date('2026-10-01T12:00:00+09:00');
    expect(calculateRemainingSeconds('2026-10-01T11:00:00', now)).toBe(0);
    expect(calculateRemainingSeconds(null, now)).toBe(0);
    expect(calculateRemainingSeconds('이상한값', now)).toBe(0);
  });
});

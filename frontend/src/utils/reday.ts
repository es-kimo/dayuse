import { parseKstDate } from './date';
import type {
  PenaltyStatus,
  RedayEligibilityResponse,
  RedayIneligibleReason,
} from '../types';

/**
 * 리데이 화면의 순수 상태 판별 및 포맷 유틸 (v0.11 F11, F12)
 *
 * 화면 컴포넌트는 분기 조건을 직접 들고 있지 않고 여기 결과만 쓴다.
 * 기한·벌금·티켓 보유 조합이 UI 코드 여기저기에 흩어지면 "광고만 보고 자동 면제" 같은
 * 정책 위반 분기가 조용히 생긴다.
 */

/** 사용자에게 보이는 아이템 명칭. 전 화면에서 이 명칭만 쓴다. */
export const REDAY_TICKET_LABEL = '리데이 티켓';
export const REDAY_USE_BUTTON_LABEL = '리데이 티켓 1장 사용하기';
export const REDAY_EARN_BUTTON_LABEL = '광고 보고 리데이 티켓 받기';
export const REDAY_DEFAULT_GUIDE =
  '늦었지만 해냈네요. 리데이 티켓을 사용하면 이번 벌금이 면제돼요. 지각 기록은 그대로 남아요.';

/**
 * 리데이 안내 화면의 다음 행동.
 * - `use-ticket`: 보유 티켓이 있어 바로 사용할 수 있다
 * - `watch-ad`: 보유 티켓이 없어 광고를 보고 받아야 한다
 * - `applied`: 이미 리데이가 적용되어 벌금이 면제됐다
 * - `blocked`: 사유가 있어 사용할 수 없다
 */
export type RedayActionKind = 'use-ticket' | 'watch-ad' | 'applied' | 'blocked';

export interface RedayActionState {
  kind: RedayActionKind;
  /** 주 동작 버튼 문구. `applied`/`blocked`면 null이다. */
  primaryLabel: string | null;
  /** 상태 안내 문구. 스크린리더에도 이 문구가 전달된다. */
  message: string;
  /** 재시도(다시 시도하기) 버튼을 제공할 수 있는 상태인지. */
  retryable: boolean;
}

/** 리데이 불가 사유별 안내 문구. 서버 메시지 대신 화면 문구로 고정해 표기를 통일한다. */
const INELIGIBLE_MESSAGES: Record<RedayIneligibleReason, string> = {
  ELIGIBLE: REDAY_DEFAULT_GUIDE,
  NOT_OWNER: '본인의 인증 기록만 리데이를 사용할 수 있어요.',
  NOT_ALLOWED: '이 챌린지는 리데이를 허용하지 않아요.',
  WEEKLY_NOT_SUPPORTED: '주 N회 챌린지에는 리데이를 쓸 수 없어요.',
  TOGETHER_NOT_SUPPORTED: '함께하기 챌린지에는 리데이를 쓸 수 없어요.',
  NO_PENALTY: '약정 벌금이 없어 리데이가 필요하지 않아요.',
  CHALLENGE_ABORTED: '중단된 챌린지 기록에는 리데이를 쓸 수 없어요.',
  NOT_VERIFIED: '지각 인증을 먼저 올려야 리데이를 쓸 수 있어요.',
  NOT_OVERDUE: '벌금이 없는 기록이라 리데이가 필요하지 않아요.',
  ALREADY_APPLIED: '이미 리데이를 사용해 벌금이 면제된 기록이에요.',
  ALREADY_SETTLED: '이미 입금 신고 중이거나 정산이 끝난 기록이에요.',
  ALREADY_CONFIRMED: '이미 확정된 벌금이에요.',
  EXPIRED: '기한이 지났어요.',
};

export function redayIneligibleMessage(reason: RedayIneligibleReason): string {
  return INELIGIBLE_MESSAGES[reason] ?? '지금은 리데이를 사용할 수 없어요.';
}

/**
 * 리데이 적격 상태와 보유 티켓 수로 다음 행동을 정한다.
 *
 * 광고 시청 완료만으로는 절대 `applied`가 되지 않는다. 티켓을 받은 뒤에도
 * 사용자가 `리데이 티켓 1장 사용하기`를 눌러야 소비된다(사용 확정 전 자동 소비 금지).
 */
export function resolveRedayAction(
  eligibility: RedayEligibilityResponse | null,
  availableTicketCount: number
): RedayActionState {
  if (!eligibility) {
    return {
      kind: 'blocked',
      primaryLabel: null,
      message: '리데이 정보를 불러오지 못했어요.',
      retryable: true,
    };
  }

  if (eligibility.redayApplied || eligibility.penaltyStatus === 'EXEMPTED') {
    return {
      kind: 'applied',
      primaryLabel: null,
      message: '리데이를 사용해 이번 벌금이 면제됐어요. 지각 기록은 그대로 남아요.',
      retryable: false,
    };
  }

  if (!eligibility.eligible) {
    return {
      kind: 'blocked',
      primaryLabel: null,
      message: redayIneligibleMessage(eligibility.reason),
      // 기한 만료·확정·정산처럼 되돌릴 수 없는 사유는 재시도해도 결과가 같다.
      retryable: false,
    };
  }

  if (availableTicketCount > 0) {
    return {
      kind: 'use-ticket',
      primaryLabel: REDAY_USE_BUTTON_LABEL,
      message: REDAY_DEFAULT_GUIDE,
      retryable: true,
    };
  }

  return {
    kind: 'watch-ad',
    primaryLabel: REDAY_EARN_BUTTON_LABEL,
    message: REDAY_DEFAULT_GUIDE,
    retryable: true,
  };
}

/**
 * 남은 기한 표기. 초 단위 값을 "N시간 M분" 수준으로만 줄여 보여준다.
 * 0 이하이면 기한이 끝난 것으로 본다.
 */
export function formatRedayRemaining(remainingSeconds: number): string {
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) return '기한 종료';

  const totalMinutes = Math.floor(remainingSeconds / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}일 ${hours}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  if (minutes > 0) return `${minutes}분 남음`;
  return '1분 미만 남음';
}

/** 벌금 표기 구분. 보류·확정·면제를 한 화면에서 섞어 보여주지 않기 위한 분류다. */
export interface PenaltyDisplay {
  tone: 'pending' | 'confirmed' | 'exempted' | 'none';
  label: string;
  amount: number;
  /** 입금해야 할 확정 금액에 합산해야 하는 금액. 보류·면제는 0이다. */
  payableAmount: number;
}

/**
 * 보류(PENDING)는 아직 낼 돈이 아니다.
 * 확정 금액에 보류를 더해 보여주면 리데이로 면제될 수 있는 금액까지 청구처럼 읽힌다.
 */
export function describePenalty(
  penaltyStatus: PenaltyStatus | undefined,
  penaltyAmount: number
): PenaltyDisplay {
  const amount = Number.isFinite(penaltyAmount) && penaltyAmount > 0 ? penaltyAmount : 0;

  switch (penaltyStatus) {
    case 'PENDING':
      return { tone: 'pending', label: '벌금 보류', amount, payableAmount: 0 };
    case 'CONFIRMED':
      return { tone: 'confirmed', label: '벌금 확정', amount, payableAmount: amount };
    case 'EXEMPTED':
      return { tone: 'exempted', label: '벌금 면제', amount: 0, payableAmount: 0 };
    default:
      return { tone: 'none', label: '벌금 없음', amount: 0, payableAmount: 0 };
  }
}

/**
 * 광고 시청 → 보상 → 리데이의 3단계.
 * `ad-completed`(광고 완료)와 `ticket-granted`(티켓 지급 완료)와 `recovery-completed`(리데이 완료)를
 * 한 단계로 합치면 "광고만 봤는데 벌금이 면제된 것처럼" 보인다.
 */
export type RedayAdStage =
  | 'idle'
  | 'watching'
  | 'paused'
  | 'ad-completed'
  | 'ticket-granted'
  | 'recovery-completed'
  | 'failed';

export interface RedayStageView {
  label: string;
  description: string;
  /** 3단계 표시에서 몇 번째까지 채워졌는지(0~3). */
  completedSteps: number;
}

export const REDAY_AD_STAGE_LABELS = ['광고 완료', '리데이 티켓 지급 완료', '리데이 완료'] as const;

export function describeAdStage(stage: RedayAdStage, requiredWatchSeconds = 0): RedayStageView {
  switch (stage) {
    case 'watching':
      return {
        label: '시청 중',
        description: `${requiredWatchSeconds}초 동안 화면을 열어두면 리데이 티켓 1장을 받아요.`,
        completedSteps: 0,
      };
    case 'paused':
      return {
        label: '일시정지',
        description: '화면이 가려져 시청 시간이 멈췄어요. 다시 돌아오면 이어서 재생돼요.',
        completedSteps: 0,
      };
    case 'ad-completed':
      return {
        label: REDAY_AD_STAGE_LABELS[0],
        description: '시청을 마쳤어요. 리데이 티켓을 지급하고 있어요.',
        completedSteps: 1,
      };
    case 'ticket-granted':
      return {
        label: REDAY_AD_STAGE_LABELS[1],
        description: '리데이 티켓 1장을 받았어요. 아직 벌금은 면제되지 않았어요.',
        completedSteps: 2,
      };
    case 'recovery-completed':
      return {
        label: REDAY_AD_STAGE_LABELS[2],
        description: '리데이 티켓을 사용해 이번 벌금이 면제됐어요. 지각 기록은 그대로 남아요.',
        completedSteps: 3,
      };
    case 'failed':
      return {
        label: '중단됨',
        description: '시청이 끝나지 않아 리데이 티켓을 받지 못했어요.',
        completedSteps: 0,
      };
    default:
      return {
        label: '대기',
        description: '',
        completedSteps: 0,
      };
  }
}

/** 광고 없음·세션 만료·통신 실패 등 광고 경로의 실패 사유. */
export type RedayAdFailureReason =
  | 'NO_AVAILABLE_AD'
  | 'DAILY_LIMIT_REACHED'
  | 'SESSION_EXPIRED'
  | 'ABANDONED'
  | 'NETWORK'
  | 'UNKNOWN';

const AD_FAILURE_MESSAGES: Record<RedayAdFailureReason, string> = {
  NO_AVAILABLE_AD: '지금은 볼 수 있는 안내 광고가 없어요. 잠시 뒤에 다시 시도해 주세요.',
  DAILY_LIMIT_REACHED: '오늘 볼 수 있는 광고를 모두 봤어요. 내일 다시 시도해 주세요.',
  SESSION_EXPIRED: '광고 시청 시간이 만료됐어요. 처음부터 다시 시도해 주세요.',
  ABANDONED: '시청이 중단돼 리데이 티켓을 받지 못했어요. 다시 시도할 수 있어요.',
  NETWORK: '통신이 불안정해 실패했어요. 다시 시도해 주세요.',
  UNKNOWN: '광고를 불러오지 못했어요. 다시 시도해 주세요.',
};

export function adFailureMessage(reason: RedayAdFailureReason): string {
  return AD_FAILURE_MESSAGES[reason] ?? AD_FAILURE_MESSAGES.UNKNOWN;
}

/** axios 오류 등 임의 값에서 광고 실패 사유를 거칠게 분류한다. 서버 메시지 원문은 화면에 쓰지 않는다. */
export function classifyAdFailure(error: unknown): RedayAdFailureReason {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === undefined) {
    const message = (error as { message?: string } | null)?.message ?? '';
    return message.toLowerCase().includes('network') ? 'NETWORK' : 'UNKNOWN';
  }
  if (status === 400) return 'SESSION_EXPIRED';
  if (status >= 500) return 'NETWORK';
  return 'UNKNOWN';
}

/**
 * 주 N회 챌린지에는 리데이 설정·사용 버튼·카운트다운을 일절 표시하지 않는다.
 * 기간 유형을 모르는 호출부는 `undefined`를 넘기므로, 이 경우에도 막지 않고 서버 판정에 맡긴다.
 */
export function shouldShowRedayUi(
  periodType: string | undefined,
  redayAllowed: boolean | undefined
): boolean {
  if (periodType === 'WEEKLY_N') return false;
  return redayAllowed !== false;
}

/** 리데이 사용 경로를 띄울 수 있는 기록의 최소 조건. 최종 판정은 서버가 다시 한다. */
export interface RedayCandidateRecord {
  status: string;
  isLate: boolean;
  depositStatus: string;
  penaltyStatus?: PenaltyStatus;
  redayApplied?: boolean;
  redayDeadline?: string | null;
}

/**
 * 기록 목록에서 리데이를 바로 쓸 수 있는 것만 고른다.
 *
 * 홈의 안내 카드와 상세 달력의 사용 가능한 날짜를 같은 조건으로 선별한다.
 * 조회한 달과 관계없이 모든 기록을 검사해 월초의 지난달 대상일도 놓치지 않는다.
 *
 * @param now 기한 비교 기준 시각. 호출부가 타이머로 갱신한 값을 넘긴다.
 */
export function pickRedayUsableRecords<T extends RedayCandidateRecord>(
  records: T[] | null | undefined,
  now: Date = new Date()
): T[] {
  if (!records || records.length === 0) return [];
  return records.filter((record) => {
    if (record.status !== 'COMPLETED' || !record.isLate) return false;
    if (record.redayApplied) return false;
    if (record.penaltyStatus !== 'PENDING') return false;
    // 입금 신고 중이거나 정산이 끝난 기록은 되돌릴 수 없다.
    if (record.depositStatus !== 'UNPAID') return false;
    return calculateRemainingSeconds(record.redayDeadline, now) > 0;
  });
}

/**
 * 기한까지 남은 초.
 *
 * 서버의 `redayDeadline`은 오프셋 없는 KST LocalDateTime 문자열이라
 * `new Date()`에 그대로 넘기면 브라우저 시간대만큼 틀어진다. [parseKstDate]가 +09:00을 보정한다.
 */
export function calculateRemainingSeconds(
  deadline: string | null | undefined,
  now: Date = new Date()
): number {
  const parsed = parseKstDate(deadline);
  if (!parsed) return 0;
  return Math.max(0, Math.floor((parsed.getTime() - now.getTime()) / 1000));
}

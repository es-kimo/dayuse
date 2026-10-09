import { z } from 'zod';
import type { ChallengeDetail, ChallengeDetailBase } from '../types';
import type { ContractViolation } from './contractViolationReporter';

const periodIntervalSchema = z.object({
  index: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  targetCount: z.number(),
  completedCount: z.number(),
  isAchieved: z.boolean(),
  settlementStatus: z
    .enum(['IN_PROGRESS', 'ACHIEVED', 'NEEDS_CONFIRMATION', 'CONFIRMED_FAILED', 'NOT_ACHIEVED', 'EXCLUDED_ABORTED'])
    .nullish(),
  missedCount: z.number().nullish(),
  penaltyAmountPerMiss: z.number().nullish(),
  totalPenaltyAmount: z.number().nullish(),
  isSettled: z.boolean().optional(),
});

const participantSchema = z.object({
  id: z.number(),
  userId: z.number(),
  nickname: z.string(),
  profileImageUrl: z.string().nullish(),
  penaltyAmount: z.number(),
  startDate: z.string(),
  status: z.enum(['ACTIVE', 'CANCELLED']),
  completionRate: z.number(),
  joinedAt: z.string(),
  isCreator: z.boolean(),
});

const challengeDetailBaseSchema = z.object({
  id: z.number(),
  groupId: z.number(),
  groupName: z.string(),
  creatorUserId: z.number(),
  creatorNickname: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  verificationCriteria: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  durationDays: z.number().optional(),
  periodType: z.enum(['DAILY', 'WEEKLY_N']).optional(),
  targetFrequency: z.number().nullish(),
  executionType: z.enum(['INDIVIDUAL', 'TOGETHER']).optional(),
  redayAllowed: z.boolean().optional(),
  redayRuleDescription: z.string().nullish(),
  totalTargetCount: z.number().optional(),
  totalCompletedCount: z.number().optional(),
  progressRate: z.number().optional(),
  currentPeriod: periodIntervalSchema.nullish(),
  intervals: z.array(periodIntervalSchema).nullish(),
  isCreator: z.boolean(),
  isParticipating: z.boolean(),
  myPenaltyAmount: z.number().nullish(),
  canJoin: z.boolean(),
  canCancel: z.boolean(),
  canDelete: z.boolean(),
  canModifyFull: z.boolean(),
  canAbort: z.boolean().optional(),
  abortReason: z.string().nullish(),
  participants: z.array(participantSchema),
  abortedByNickname: z.string().nullish(),
});

// 스키마는 런타임에 모르는 키를 버린다. 타입에만 있고 스키마에 없는 필드가 생기면 화면에서 값이 사라지므로
// 두 정의가 키·타입 모두 같은지 컴파일 타임에 확인한다.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const baseSchemaMatchesType: Equals<z.infer<typeof challengeDetailBaseSchema>, ChallengeDetailBase> = true;
void baseSchemaMatchesType;

/**
 * 화면에서 처리할 수 있는 형태인지만 본다. 중단 시각·중단자는 상태와의 관계를 따로 검사하기 위해 여기서는 느슨하게 받는다.
 * 이 단계를 통과하지 못하면 상세를 표시할 수 없는 응답이다.
 */
const challengeDetailShapeSchema = challengeDetailBaseSchema.extend({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ENDED', 'ABORTED']),
  abortedAt: z.string().nullish(),
  abortedBy: z.number().nullish(),
});

/** 응답을 화면 모델로 바꿀 수 없을 때 던진다. 메시지와 위반 목록에는 응답 값을 담지 않는다. */
export class ContractError extends Error {
  readonly violations: ContractViolation[];

  constructor(violations: ContractViolation[]) {
    super(`응답이 계약과 다릅니다: ${violations.map((v) => `${v.path}(${v.rule})`).join(', ')}`);
    this.name = 'ContractError';
    this.violations = violations;
  }
}

export interface ChallengeDetailParseResult {
  detail: ChallengeDetail;
  /** 표시는 가능하지만 서버가 계약을 어긴 항목 */
  violations: ContractViolation[];
}

/**
 * 챌린지 상세 응답을 확인하고 화면 모델로 바꾼다.
 * - 형태가 틀리면 ContractError를 던진다.
 * - ABORTED인데 중단 시각·중단자가 없으면 null로 두고 위반으로 돌려준다.
 * - ABORTED가 아닌데 중단 시각·중단자가 있으면 버리고 위반으로 돌려준다.
 */
export function parseChallengeDetail(raw: unknown): ChallengeDetailParseResult {
  const parsed = challengeDetailShapeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ContractError(
      parsed.error.issues.map((issue) => ({ path: issue.path.join('.') || '(root)', rule: issue.code }))
    );
  }

  const { status, abortedAt, abortedBy, ...base } = parsed.data;
  const violations: ContractViolation[] = [];

  if (status === 'ABORTED') {
    if (abortedAt == null) violations.push({ path: 'abortedAt', rule: 'required_when_aborted' });
    if (abortedBy == null) violations.push({ path: 'abortedBy', rule: 'required_when_aborted' });
    return {
      detail: { ...base, status, abortedAt: abortedAt ?? null, abortedBy: abortedBy ?? null },
      violations,
    };
  }

  if (abortedAt != null) violations.push({ path: 'abortedAt', rule: 'null_unless_aborted' });
  if (abortedBy != null) violations.push({ path: 'abortedBy', rule: 'null_unless_aborted' });
  return { detail: { ...base, status, abortedAt: null, abortedBy: null }, violations };
}

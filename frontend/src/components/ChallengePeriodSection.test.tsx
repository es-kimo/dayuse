import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ChallengePeriodSection } from './ChallengePeriodSection';
import type { ChallengePeriodInterval } from '../types';

describe('ChallengePeriodSection with ExecutionType (F02, F03)', () => {
  it('함께하기 미달성 구간(NOT_ACHIEVED)은 벌금 청구 없이 미달성 안내 뱃지만 표시된다', () => {
    const intervals: ChallengePeriodInterval[] = [
      {
        index: 1,
        startDate: '2026-09-01',
        endDate: '2026-09-07',
        targetCount: 3,
        completedCount: 1,
        isAchieved: false,
        settlementStatus: 'NOT_ACHIEVED',
        totalPenaltyAmount: 0,
      },
    ];

    const onOpenConfirmModal = vi.fn();

    render(
      <ChallengePeriodSection
        intervals={intervals}
        isParticipating={true}
        onOpenConfirmModal={onOpenConfirmModal}
      />
    );

    expect(screen.getByText('1구간')).toBeInTheDocument();
    expect(screen.getByText('미달성 (벌금 없음)')).toBeInTheDocument();
    expect(screen.queryByText('결과 확인하기')).not.toBeInTheDocument();
  });

  it('달성 완료 구간(ACHIEVED)은 목표 달성 뱃지가 표시된다', () => {
    const intervals: ChallengePeriodInterval[] = [
      {
        index: 1,
        startDate: '2026-09-01',
        endDate: '2026-09-07',
        targetCount: 3,
        completedCount: 3,
        isAchieved: true,
        settlementStatus: 'ACHIEVED',
      },
    ];

    render(
      <ChallengePeriodSection
        intervals={intervals}
        isParticipating={true}
        onOpenConfirmModal={vi.fn()}
      />
    );

    expect(screen.getByText('목표 달성')).toBeInTheDocument();
  });
});

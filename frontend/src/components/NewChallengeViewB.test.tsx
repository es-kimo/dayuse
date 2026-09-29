import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NewChallengeViewB } from './NewChallengeViewB';

describe('새 챌린지 모임원 선택', () => {
  it.each([null, 'https://example.com/profile.png'])('프로필 %s를 36px로 표시한다', (profileImageUrl) => {
    const noop = vi.fn();
    render(<NewChallengeViewB
      title="매일 운동" setTitle={noop} description="" setDescription={noop}
      verificationCriteria="운동 사진" setVerificationCriteria={noop}
      startDate="2026-09-29" setStartDate={noop} endDate="2026-10-05" setEndDate={noop}
      selectedPreset={7} setSelectedPreset={noop} periodType="DAILY" setPeriodType={noop}
      targetFrequency={1} setTargetFrequency={noop} executionType="INDIVIDUAL" setExecutionType={noop}
      penaltyAmount={1000} setPenaltyAmount={noop} durationDays={7}
      groupMembers={[{ id: 1, userId: 1, nickname: '나', profileImageUrl, role: 'HOST', joinedAt: '2026-09-29T00:00:00' }]}
      selectedMemberIds={new Set()} onToggleMember={noop} memberPenalties={{}}
      onMemberPenaltyChange={noop} isSubmitting={false} onBack={noop} onSubmit={noop} currentUserId={1}
    />);
    fireEvent.click(screen.getByRole('button', { name: /다음/ }));
    fireEvent.click(screen.getByRole('button', { name: /다음/ }));
    // 모임 멤버 목록과 같은 36px 규격을 유지한다.
    expect(screen.getByRole('img', { name: '데이유 프로필' })).toHaveStyle({ width: '36px', height: '36px' });
    expect(screen.getByRole('button', { name: /나 · 필수/ })).toBeDisabled();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ParticipantsCard } from './ParticipantsCard';
import { ChallengeDetailViewB } from './ChallengeDetailViewB';
import type { ChallengeDetail, ChallengeCalendarResponse } from '../types';

describe('ChallengeDetailViewB (08 챌린지 상세 화면)', () => {
  const mockChallenge: ChallengeDetail = {
    id: 1,
    groupId: 10,
    groupName: '알고리즘 & 습관 스터디',
    creatorUserId: 101,
    creatorNickname: '류코딩',
    title: '매일 1알고리즘\n문제 풀기',
    description: '매일 백준이나 프로그래머스에서 한 문제를 풀고 올려요',
    verificationCriteria: '제출 성공 화면 캡처 또는 커밋 내역',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    durationDays: 30,
    periodType: 'DAILY',
    targetFrequency: 1,
    executionType: 'INDIVIDUAL',
    status: 'IN_PROGRESS',
    isCreator: true,
    isParticipating: true,
    myPenaltyAmount: 1000,
    canJoin: false,
    canCancel: false,
    canDelete: false,
    canModifyFull: false,
    canAbort: true,
    participants: [
      { userId: 101, nickname: '류코딩', profileImageUrl: null, isCreator: true, penaltyAmount: 1000 },
      { userId: 102, nickname: '김운동', profileImageUrl: null, isCreator: false, penaltyAmount: 4000 },
      { userId: 103, nickname: '박기상', profileImageUrl: null, isCreator: false, penaltyAmount: 4000 },
      { userId: 104, nickname: '최독서', profileImageUrl: null, isCreator: false, penaltyAmount: 8000 },
    ] as any,
  } as unknown as ChallengeDetail;

  const mockCalendarData: ChallengeCalendarResponse = {
    challengeId: 1,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    participants: [
      {
        userId: 101,
        nickname: '류코딩',
        profileImageUrl: null,
        records: [
          ...Array.from({ length: 26 }, (_, i) => ({
            id: i + 1,
            date: `2026-09-${String(i + 1).padStart(2, '0')}`,
            status: i === 11 ? 'MISSED' : 'COMPLETED',
            penaltyAmount: 1000,
            depositStatus: 'NONE',
            isLate: false,
          })),
        ] as any,
      },
      {
        userId: 102,
        nickname: '김운동',
        profileImageUrl: null,
        records: [
          { id: 1001, date: new Date().toISOString().slice(0, 10), status: 'COMPLETED', penaltyAmount: 0, depositStatus: 'NONE', isLate: false },
        ] as any,
      },
      {
        userId: 103,
        nickname: '박기상',
        profileImageUrl: null,
        records: [
          { id: 1002, date: new Date().toISOString().slice(0, 10), status: 'COMPLETED', penaltyAmount: 0, depositStatus: 'NONE', isLate: false },
        ] as any,
      },
      {
        userId: 104,
        nickname: '최독서',
        profileImageUrl: null,
        records: [],
      },
    ] as any,
  } as unknown as ChallengeCalendarResponse;

  it('ChallengeHeroCard가 올바르게 렌더링된다 (진행 중, 각자하기, D-Day, 제목, 데이유 마스코트)', () => {
    render(
      <ChallengeDetailViewB
        challenge={mockChallenge}
        calendarData={mockCalendarData}
        dDay="D-2"
        totalDurationDays={30}
        currentDayNumber={28}
        progressPercent={93}
        remainingDays={2}
        isTodayCompleted={false}
        streakCount={16}
        currentUserId={101}
        onBack={vi.fn()}
        onShare={vi.fn()}
        onOpenCert={vi.fn()}
      />
    );

    expect(screen.getByText('진행 중')).toBeInTheDocument();
    expect(screen.getByText('각자하기')).toBeInTheDocument();
    expect(screen.getByText('D-2')).toBeInTheDocument();
    expect(screen.getByText(/매일 1알고리즘/)).toBeInTheDocument();
    expect(screen.getByText(/알고리즘 & 습관 스터디 · 류코딩이 만들었어요/)).toBeInTheDocument();
    expect(screen.getByText(/28일째/)).toBeInTheDocument();
    expect(screen.getByText(/완주까지 2일/)).toBeInTheDocument();
  });

  it('MyRecordCard에서 StreakCalendar와 기록 요약이 올바르게 렌더링된다', () => {
    render(
      <ChallengeDetailViewB
        challenge={mockChallenge}
        calendarData={mockCalendarData}
        dDay="D-2"
        totalDurationDays={30}
        currentDayNumber={28}
        progressPercent={93}
        remainingDays={2}
        isTodayCompleted={false}
        streakCount={16}
        currentUserId={101}
        onBack={vi.fn()}
        onShare={vi.fn()}
        onOpenCert={vi.fn()}
      />
    );

    expect(screen.getByText(/내 기록/)).toBeInTheDocument();
    expect(screen.getByText('16일째 이어가는 중')).toBeInTheDocument();
    expect(screen.getByText('인증')).toBeInTheDocument();
    expect(screen.getByText('놓친 날')).toBeInTheDocument();
    expect(screen.getAllByText('오늘').length).toBeGreaterThan(0);
    expect(screen.getByText('오늘 하면 17일 연속')).toBeInTheDocument();
  });

  it('HowToCertifyCard에서 인증 기준과 규칙 칩들이 올바르게 렌더링된다', () => {
    render(
      <ChallengeDetailViewB
        challenge={mockChallenge}
        calendarData={mockCalendarData}
        dDay="D-2"
        totalDurationDays={30}
        currentDayNumber={28}
        progressPercent={93}
        remainingDays={2}
        isTodayCompleted={false}
        streakCount={16}
        currentUserId={101}
        onBack={vi.fn()}
        onShare={vi.fn()}
        onOpenCert={vi.fn()}
      />
    );

    expect(screen.getByText('이렇게 인증해요')).toBeInTheDocument();
    expect(screen.getByText('제출 성공 화면 캡처 또는 커밋 내역')).toBeInTheDocument();
    expect(screen.getByText('매일 한 번, 자정까지')).toBeInTheDocument();
    expect(screen.getByText('못 한 날 1,000원')).toBeInTheDocument();
    expect(screen.getByText('시작한 뒤에는 참여자와 규칙을 바꿀 수 없어요')).toBeInTheDocument();
  });

  it.each([true, false])('참여자 프로필을 실제 저장 값으로 표시한다 (캘린더: %s)', (withCalendar) => {
    const profiles = ['dayu:purple', 'https://example.com/avatar.png', null, 'dayu:mint'];
    const challenge = {
      ...mockChallenge,
      participants: mockChallenge.participants.map((p, i) => ({ ...p, profileImageUrl: profiles[i] })),
    };
    const calendar = withCalendar ? {
      ...mockCalendarData,
      participants: mockCalendarData.participants.map((p, i) => ({ ...p, profileImageUrl: profiles[i] })),
    } : null;
    render(<ParticipantsCard challenge={challenge} calendarData={calendar} totalDurationDays={30} currentUserId={101} />);
    expect(screen.getByRole('img', { name: '류코딩' })).toHaveStyle({ backgroundColor: '#EDE9FE' });
    expect(screen.getByRole('img', { name: '김운동' })).toHaveAttribute('src', profiles[1]);
    expect(screen.getByRole('img', { name: '박기상' })).toHaveStyle({ backgroundColor: '#DBEAFE' });
    expect(screen.getByRole('img', { name: '최독서' })).toHaveStyle({ backgroundColor: '#CCFBF1' });
  });

  it('ParticipantsCard에서 참여자 목록과 내 하이라이트가 올바르게 렌더링된다', () => {
    render(
      <ChallengeDetailViewB
        challenge={mockChallenge}
        calendarData={mockCalendarData}
        dDay="D-2"
        totalDurationDays={30}
        currentDayNumber={28}
        progressPercent={93}
        remainingDays={2}
        isTodayCompleted={false}
        streakCount={16}
        currentUserId={101}
        onBack={vi.fn()}
        onShare={vi.fn()}
        onOpenCert={vi.fn()}
      />
    );

    expect(screen.getByText('함께하는 4명')).toBeInTheDocument();
    expect(screen.getByText('류코딩')).toBeInTheDocument();
    expect(screen.getByText('나')).toBeInTheDocument();
    expect(screen.getByText('김운동')).toBeInTheDocument();
    expect(screen.getByText('박기상')).toBeInTheDocument();
    expect(screen.getByText('최독서')).toBeInTheDocument();
  });

  it('하단에 오늘 인증하기 버튼이 표시된다', () => {
    render(
      <ChallengeDetailViewB
        challenge={mockChallenge}
        calendarData={mockCalendarData}
        dDay="D-2"
        totalDurationDays={30}
        currentDayNumber={28}
        progressPercent={93}
        remainingDays={2}
        isTodayCompleted={false}
        streakCount={16}
        currentUserId={101}
        onBack={vi.fn()}
        onShare={vi.fn()}
        onOpenCert={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /오늘 인증하기/ })).toBeInTheDocument();
  });
});

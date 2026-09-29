import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { GroupChallengesViewB } from './GroupChallengesViewB';
import type { ChallengeSummary } from '../types';

const challenge: ChallengeSummary = {
  id: 1, groupId: 1, title: '함께 운동', verificationCriteria: '사진',
  startDate: '2026-09-01', endDate: '2026-09-30', status: 'IN_PROGRESS',
  participantCount: 4, isParticipating: false, isCreator: false, createdAt: '2026-09-01',
  participants: [
    { userId: 1, nickname: '민트', profileImageUrl: 'dayu:mint' },
    { userId: 2, nickname: '사진', profileImageUrl: 'https://example.com/avatar.png' },
    { userId: 3, nickname: '기본', profileImageUrl: null },
    { userId: 4, nickname: '추가', profileImageUrl: null },
  ],
};

describe('챌린지 목록 참여자 아바타', () => {
  it('최대 3명의 실제 프로필과 전체 인원수를 표시한다', () => {
    render(<MemoryRouter><GroupChallengesViewB groupId={1} challenges={[challenge]} loading={false} /></MemoryRouter>);
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.getByRole('img', { name: '민트' })).toHaveStyle({ backgroundColor: '#CCFBF1' });
    expect(screen.getByRole('img', { name: '사진' })).toHaveAttribute('src', 'https://example.com/avatar.png');
    expect(screen.getByRole('img', { name: '기본' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: '추가' })).not.toBeInTheDocument();
    expect(screen.getByText('4명 참여')).toBeInTheDocument();
  });
  it('참여자 프로필이 없는 이전 응답에서도 인원수를 표시한다', () => {
    render(<MemoryRouter><GroupChallengesViewB groupId={1} challenges={[{ ...challenge, participants: undefined }]} loading={false} /></MemoryRouter>);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getByText('4명 참여')).toBeInTheDocument();
  });
});

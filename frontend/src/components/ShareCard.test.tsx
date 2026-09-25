import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicShareLandingPage } from '../pages/PublicShareLandingPage';
import { shareApi } from '../api/share';
import type { PublicShareCardResponse } from '../types';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

// Mock shareApi
vi.mock('../api/share', () => ({
  shareApi: {
    getPublicShareCard: vi.fn(),
  },
}));

describe('PublicShareLandingPage Brand v1.1 Card (BR-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('연속 기록(Streak) 공유 카드가 새 브랜드 디자인 사양(로고, 데이유 표정, 일 연속, 하단 문구)대로 렌더링된다', async () => {
    const mockCard: PublicShareCardResponse = {
      token: 'test-token-123',
      cardType: 'STREAK',
      challengeId: 1,
      title: '매일 1알고리즘 문제 풀기',
      userNickname: '류기현',
      streakDays: 7,
      historyJson: JSON.stringify([
        { date: '2026-09-19', completed: true, inPeriod: true },
        { date: '2026-09-20', completed: true, inPeriod: true },
        { date: '2026-09-21', completed: true, inPeriod: true },
        { date: '2026-09-22', completed: true, inPeriod: true },
        { date: '2026-09-23', completed: true, inPeriod: true },
        { date: '2026-09-24', completed: true, inPeriod: true },
        { date: '2026-09-25', completed: true, inPeriod: true },
      ]),
      createdAt: '2026-09-25T12:00:00',
    };

    (shareApi.getPublicShareCard as any).mockResolvedValue(mockCard);

    render(
      <MemoryRouter initialEntries={['/shares/test-token-123']}>
        <Routes>
          <Route path="/shares/:token" element={<PublicShareLandingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 1. 데이터 로드 대기
    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    // 2. 연속 일수 및 슬로건 확인
    expect(screen.getByText('일 연속')).toBeInTheDocument();
    expect(screen.getByText('목표를 향해 꾸준히 달리는 중이에요')).toBeInTheDocument();

    // 3. 달성률 진행 바 (7 / 7일 · 100%) 확인
    expect(screen.getByText('이번 챌린지 달성률')).toBeInTheDocument();
    expect(screen.getByText('7 / 7일 · 100%')).toBeInTheDocument();

    // 4. 최근 7일 날짜 및 챌린지/사용자명 확인
    expect(screen.getByText('최근 7일')).toBeInTheDocument();
    expect(screen.getByText('매일 1알고리즘 문제 풀기')).toBeInTheDocument();
    expect(screen.getByText('류기현')).toBeInTheDocument();

    // 5. CTA 및 공식 브랜드 하단 카피 확인
    expect(screen.getByRole('button', { name: /나도 참여하기/i })).toBeInTheDocument();
    expect(
      screen.getByText('데이유즈에서 친구들과 각자의 챌린지를 인증하고 기록해요.')
    ).toBeInTheDocument();
  });

  it('달성률 데이터(inPeriod)가 없는 경우 달성률 진행 바가 표시되지 않는다', async () => {
    const mockCardNoAchievement: PublicShareCardResponse = {
      token: 'test-token-empty',
      cardType: 'STREAK',
      challengeId: 2,
      title: '미라클 모닝',
      userNickname: '김코딩',
      streakDays: 1,
      historyJson: JSON.stringify([]),
      createdAt: '2026-09-25T12:00:00',
    };

    (shareApi.getPublicShareCard as any).mockResolvedValue(mockCardNoAchievement);

    render(
      <MemoryRouter initialEntries={['/shares/test-token-empty']}>
        <Routes>
          <Route path="/shares/:token" element={<PublicShareLandingPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    expect(screen.queryByText('이번 챌린지 달성률')).not.toBeInTheDocument();
  });

  it('100일 이상 긴 스트릭도 레이아웃 깨짐 없이 렌더링된다', async () => {
    const mockLongStreak: PublicShareCardResponse = {
      token: 'test-token-100',
      cardType: 'STREAK',
      challengeId: 3,
      title: '100일 연속 러닝 챌린지 완주를 위한 장기 프로젝트',
      userNickname: '마라토너',
      streakDays: 105,
      historyJson: JSON.stringify([
        { date: '2026-09-25', completed: true, inPeriod: true },
      ]),
      createdAt: '2026-09-25T12:00:00',
    };

    (shareApi.getPublicShareCard as any).mockResolvedValue(mockLongStreak);

    render(
      <MemoryRouter initialEntries={['/shares/test-token-100']}>
        <Routes>
          <Route path="/shares/:token" element={<PublicShareLandingPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('105')).toBeInTheDocument();
    });

    expect(screen.getByText('100일 연속 러닝 챌린지 완주를 위한 장기 프로젝트')).toBeInTheDocument();
    expect(screen.getByText('마라토너')).toBeInTheDocument();
  });
});

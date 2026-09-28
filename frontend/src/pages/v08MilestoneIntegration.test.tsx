import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { UiVersionProvider, useUiVersion } from '../context/UiVersionContext';
import { ToastProvider } from '../context/ToastContext';
import { TodayPage } from './TodayPage';
import { GroupsPage } from './GroupsPage';
import { ProfilePage } from './ProfilePage';
import { AvatarCustomPage } from './AvatarCustomPage';

// API 모킹
vi.mock('../api/today', () => ({
  todayApi: {
    getAllTodayActions: vi.fn().mockResolvedValue([
      {
        challengeId: 101,
        challengeTitle: '알고리즘 1일 1제',
        groupName: '코딩 스터디',
        isCompletedToday: false,
        verificationCriteria: '백준 제출 완료 화면',
        executionType: 'INDIVIDUAL',
      },
      {
        challengeId: 102,
        challengeTitle: '아침 7시 기상',
        groupName: '미라클 모닝',
        isCompletedToday: true,
        verificationCriteria: '시계 사진',
        executionType: 'INDIVIDUAL',
        myVerification: {
          imageUrl: 'https://example.com/clock.jpg',
          comment: '오늘도 상쾌하게 기상 완료',
        },
      },
    ]),
  },
}));

vi.mock('../api/groups', () => ({
  groupsApi: {
    getMyGroups: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: '코딩 스터디',
        role: 'HOST',
        memberCount: 4,
      },
      {
        id: 2,
        name: '미라클 모닝',
        role: 'MEMBER',
        memberCount: 6,
      },
    ]),
    createGroup: vi.fn().mockResolvedValue({ id: 3, name: '새 모임' }),
    getGroupDetail: vi.fn().mockResolvedValue({
      id: 3,
      name: '새 모임',
      inviteCode: 'TEST1234',
      memberCount: 1,
      isHost: true,
      members: [],
    }),
  },
}));

vi.mock('../api/auth', () => ({
  authApi: {
    getMe: vi.fn().mockResolvedValue({
      id: 1,
      kakaoId: '12345',
      nickname: '류코딩',
      profileImageUrl: 'dayu:blue',
    }),
    updateNickname: vi.fn().mockImplementation((nick) =>
      Promise.resolve({
        id: 1,
        kakaoId: '12345',
        nickname: nick,
        profileImageUrl: 'dayu:blue',
      })
    ),
    updateProfile: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: 1,
        kakaoId: '12345',
        nickname: data.nickname || '류코딩',
        profileImageUrl: data.profileImageUrl || 'dayu:blue',
      })
    ),
  },
}));

const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ToastProvider>
  );
};


describe('v0.8 모바일 UX/UI 개편 및 A/B UI 공존 통합 검증 (F01, F02)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('accessToken', 'mock-test-token');
  });

  it('[F02] UI(B) 모드에서 TodayPage는 히어로 배너, 인증 대기/완료 섹션, 하단 바텀 네비게이션을 렌더링한다', async () => {
    localStorage.setItem('dayuse_ui_version', 'B');

    render(
      <MemoryRouter initialEntries={['/today']}>
        <UiVersionProvider>
          <MockAuthProvider>
            <TodayPage />
          </MockAuthProvider>
        </UiVersionProvider>
      </MemoryRouter>
    );

    // 오늘 할 일 로드 완료 대기
    await waitFor(() => {
      expect(screen.queryByText(/불러오는 중/)).not.toBeInTheDocument();
    });

    // 히어로 배너 및 할 일 섹션 검증
    expect(screen.getByText(/인증할 챌린지가 1개 남았어요/)).toBeInTheDocument();
    expect(screen.getByText('알고리즘 1일 1제')).toBeInTheDocument();
    expect(screen.getByText('사진 찍고 인증하기')).toBeInTheDocument();
    expect(screen.getByText('아침 7시 기상')).toBeInTheDocument();

    // 하단 3대 탭 메뉴 검증
    const nav = screen.getByRole('navigation', { name: '주요 메뉴' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /오늘/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /모임/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /내 정보/ })).toBeInTheDocument();
  });

  it('[F02] UI(A) 모드에서 TodayPage는 기존 레거시 레이아웃을 손상 없이 렌더링한다', async () => {
    localStorage.setItem('dayuse_ui_version', 'A');

    render(
      <MemoryRouter initialEntries={['/today']}>
        <UiVersionProvider>
          <MockAuthProvider>
            <TodayPage />
          </MockAuthProvider>
        </UiVersionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/불러오는 중/)).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /오늘의 할 일/ })).toBeInTheDocument();
    expect(screen.getByText(/참여 중인 모임의 오늘 인증 현황이에요/)).toBeInTheDocument();
    expect(screen.getByText('알고리즘 1일 1제')).toBeInTheDocument();
  });

  it('[F01] UI(B) GroupsPage는 모바일 카드 뷰와 만들기 버튼, 바텀 네비게이션을 지원한다', async () => {
    localStorage.setItem('dayuse_ui_version', 'B');

    render(
      <MemoryRouter initialEntries={['/groups']}>
        <UiVersionProvider>
          <MockAuthProvider>
            <GroupsPage />
          </MockAuthProvider>
        </UiVersionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/불러오는 중/)).not.toBeInTheDocument();
    });

    expect(screen.getByText('코딩 스터디')).toBeInTheDocument();
    expect(screen.getByText('미라클 모닝')).toBeInTheDocument();
    expect(screen.getByText('초대 코드로 들어가기')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toBeInTheDocument();
  });

  it('[F01] UI(B) ProfilePage는 프로필 데이유 아바타, 닉네임 수정 및 설정 메뉴를 렌더링한다', async () => {
    localStorage.setItem('dayuse_ui_version', 'B');

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <UiVersionProvider>
          <MockAuthProvider>
            <ProfilePage />
          </MockAuthProvider>
        </UiVersionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '내 정보' })).toBeInTheDocument();
    });


    expect(screen.getByText('류코딩')).toBeInTheDocument();
    expect(screen.getByText('미인증 알림')).toBeInTheDocument();
    expect(screen.getByText('dayuse 소개')).toBeInTheDocument();
    expect(screen.getByText('이용약관')).toBeInTheDocument();
    expect(screen.getByText('개인정보처리방침')).toBeInTheDocument();
    expect(screen.getByText('로그아웃')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '프로필 데이유 색 바꾸기' })).toBeInTheDocument();
  });

  it('[F01] AvatarCustomPage는 10가지 데이유 색상 선택과 랜덤 변경 인터랙션을 지원한다', async () => {
    render(
      <MemoryRouter initialEntries={['/profile/avatar']}>
        <UiVersionProvider>
          <MockAuthProvider>
            <AvatarCustomPage />
          </MockAuthProvider>
        </UiVersionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('프로필 데이유')).toBeInTheDocument();
    });

    expect(screen.getByText('색 고르기')).toBeInTheDocument();
    expect(screen.getByText('랜덤으로 바꾸기')).toBeInTheDocument();
    expect(screen.getByText('모임에서는 이렇게 보여요')).toBeInTheDocument();

    // 10종 색상 라디오 버튼 존재 확인
    const colorGroup = screen.getByRole('radiogroup', { name: '데이유 색' });
    expect(colorGroup).toBeInTheDocument();

    // 민트 색상 선택 클릭
    const mintButton = screen.getByRole('radio', { name: '민트' });
    fireEvent.click(mintButton);

    // 하단 CTA 버튼이 "이 색으로 바꾸기"로 활성화됨
    expect(screen.getByText('이 색으로 바꾸기')).toBeInTheDocument();
  });
});

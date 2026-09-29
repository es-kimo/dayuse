import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewGroupPage } from './NewGroupPage';
import { InviteCreatedPage } from './InviteCreatedPage';
import { groupsApi } from '../api/groups';
import { ToastProvider } from '../context/ToastContext';

vi.mock('../api/groups', () => ({
  groupsApi: {
    createGroup: vi.fn(),
    getGroupDetail: vi.fn(),
    refreshInviteCode: vi.fn(),
  },
}));

describe('09 새 모임 만들기 (NewGroupPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본 UI 요소(제목, 입력창, 추천 칩, 카운터, 버튼)가 올바르게 렌더링된다', () => {
    render(
      <MemoryRouter>
        <NewGroupPage />
      </MemoryRouter>
    );

    expect(screen.getByText('새 모임 만들기')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('예: 미라클모닝 챌린지')).toBeInTheDocument();
    expect(screen.getByText('미라클모닝 챌린지')).toBeInTheDocument();
    expect(screen.getByText('주말 러닝 크루')).toBeInTheDocument();
    expect(screen.getByText('퇴근 후 알고리즘')).toBeInTheDocument();
    expect(screen.getByText('0/50')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '모임 만들기' })).toBeDisabled();
  });

  it('추천 칩을 누르면 입력창에 텍스트가 채워지고 버튼이 활성화된다', () => {
    render(
      <MemoryRouter>
        <NewGroupPage />
      </MemoryRouter>
    );

    const chip = screen.getByText('주말 러닝 크루');
    fireEvent.click(chip);

    const input = screen.getByPlaceholderText('예: 미라클모닝 챌린지') as HTMLInputElement;
    expect(input.value).toBe('주말 러닝 크루');
    expect(screen.getByRole('button', { name: '모임 만들기' })).not.toBeDisabled();
  });

  it('모임 생성 성공 시 /groups/:id/invite-created 로 이동한다', async () => {
    (groupsApi.createGroup as any).mockResolvedValue({
      id: 42,
      name: '새로운 스터디',
    });

    render(
      <MemoryRouter initialEntries={['/groups/new']}>
        <Routes>
          <Route path="/groups/new" element={<NewGroupPage />} />
          <Route path="/groups/:groupId/invite-created" element={<div>초대 생성 완료 페이지</div>} />
        </Routes>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('예: 미라클모닝 챌린지');
    fireEvent.change(input, { target: { value: '새로운 스터디' } });

    const submitBtn = screen.getByRole('button', { name: '모임 만들기' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(groupsApi.createGroup).toHaveBeenCalledWith('새로운 스터디');
      expect(screen.getByText('초대 생성 완료 페이지')).toBeInTheDocument();
    });
  });
});

describe('10 모임 만든 직후 (InviteCreatedPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('모임 정보와 초대 코드, 초대 링크, 첫 챌린지 만들기 카드가 렌더링된다', async () => {
    (groupsApi.getGroupDetail as any).mockResolvedValue({
      id: 42,
      name: '알고리즘 & 습관 스터디',
      inviteCode: 'Q7K2M9',
    });

    render(
      <MemoryRouter initialEntries={['/groups/42/invite-created']}>
        <ToastProvider>
          <Routes>
            <Route path="/groups/:groupId/invite-created" element={<InviteCreatedPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('모임을 만들었어요')).toBeInTheDocument();
      expect(screen.getByText('알고리즘 & 습관 스터디')).toBeInTheDocument();
      expect(screen.getByText('Q7K2M9')).toBeInTheDocument();
      expect(screen.getByText('링크 복사')).toBeInTheDocument();
      expect(screen.getByText('카카오톡으로 보내기')).toBeInTheDocument();
      expect(screen.getByText('첫 챌린지 만들기')).toBeInTheDocument();
      expect(screen.getByText('친구가 들어오기 전에 만들어 둬도 돼요')).toBeInTheDocument();
    });
  });
});

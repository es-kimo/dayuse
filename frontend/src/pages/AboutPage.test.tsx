import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AboutPage } from './AboutPage';
import * as AuthContextModule from '../context/AuthContext';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AboutPage (공개 소개 페이지)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (isAuthenticated: boolean) => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: isAuthenticated ? { id: 1, kakaoId: '12345', nickname: '테스터', profileImageUrl: null } : null,
      isAuthenticated,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUserNickname: vi.fn(),
    });

    return render(
      <BrowserRouter>
        <AboutPage />
      </BrowserRouter>
    );
  };

  it('비로그인 상태에서 소개 페이지가 정상 렌더링되고 주요 섹션이 표시된다', () => {
    renderWithAuth(false);

    expect(screen.getByRole('heading', { name: /사진 한 장이면/i })).toBeInTheDocument();
    expect(screen.getByText('시작 전 궁금한 점')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /매일 가볍게/i })).toBeInTheDocument();
  });

  it('비로그인 사용자가 "친구들과 시작하기"를 클릭하면 로그인 후 모임 생성 리다이렉트 URL로 이동한다', () => {
    renderWithAuth(false);

    const startButtons = screen.getAllByRole('button', { name: /시작하기/i });
    expect(startButtons.length).toBeGreaterThan(0);

    // 첫 번째 상단 nav 시작하기 버튼 클릭
    fireEvent.click(startButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=/groups/new');
  });

  it('로그인 사용자가 "친구들과 시작하기"를 클릭하면 즉시 모임 개설 페이지(/groups/new)로 이동한다', () => {
    renderWithAuth(true);

    const startButtons = screen.getAllByRole('button', { name: /시작하기/i });
    fireEvent.click(startButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/groups/new');
  });

  it('비로그인 사용자가 "내 모임으로"를 클릭하면 로그인 후 모임 목록 리다이렉트 URL로 이동한다', () => {
    renderWithAuth(false);

    const myGroupsButton = screen.getByRole('button', { name: '내 모임으로' });
    fireEvent.click(myGroupsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=/groups');
  });

  it('로그인 사용자가 "내 모임으로"를 클릭하면 서비스 홈(/groups)으로 이동한다', () => {
    renderWithAuth(true);

    const myGroupsButton = screen.getByRole('button', { name: '내 모임으로' });
    fireEvent.click(myGroupsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/groups');
  });

  it('FAQ 질문을 클릭하면 아코디언 답변이 토글되고 aria-expanded 상태가 변경된다', () => {
    renderWithAuth(false);

    const faqButton = screen.getByRole('button', { name: /이용료나 벌금을 내야 하나요/i });
    expect(faqButton).toHaveAttribute('aria-expanded', 'false');

    // 클릭하여 열기
    fireEvent.click(faqButton);
    expect(faqButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/자동 출금이나 강제 결제 기능은 일절 없습니다/i)).toBeInTheDocument();

    // 다시 클릭하여 닫기
    fireEvent.click(faqButton);
    expect(faqButton).toHaveAttribute('aria-expanded', 'false');
  });
});

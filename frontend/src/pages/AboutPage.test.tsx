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
    vi.unstubAllGlobals();
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

  it('좁은 뷰포트(760px 이하)에서는 모바일 전용 소개 페이지가 렌더링된다', () => {
    // 데스크톱/모바일은 마크업이 완전히 다른 별도 컴포넌트라 분기 자체를 고정한다.
    // jsdom에는 matchMedia가 없어서 직접 심는다.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(max-width: 760px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = renderWithAuth(false);

    expect(container.querySelector('.about-mobile')).toBeInTheDocument();
    expect(container.querySelector('.about-page')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /목표는 각자,\s*꾸준함은 함께\./i })).toBeInTheDocument();
  });

  it('비로그인 상태에서 소개 페이지가 정상 렌더링되고 주요 섹션이 표시된다', () => {
    renderWithAuth(false);

    expect(screen.getByRole('heading', { name: /목표는 각자,\s*꾸준함은 함께\./i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /사진 한 장이면\s*끝나는 인증/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /매일 하는 일은\s*가볍게/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /오늘부터 친구와\s*하루 하나씩/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /목표가 달라도 한 모임에서/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /친구의 인증에\s*한마디 얹어요/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /초대 링크 하나면\s*준비 끝/i })).toBeInTheDocument();
  });

  it('비로그인 사용자가 "시작하기"를 클릭하면 로그인 후 모임 생성 리다이렉트 URL로 이동한다', () => {
    renderWithAuth(false);

    const startButtons = screen.getAllByRole('button', { name: /시작하기/i });
    expect(startButtons.length).toBeGreaterThan(0);

    // 첫 번째 상단 nav 시작하기 버튼 클릭
    fireEvent.click(startButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=/groups/new');
  });

  it('로그인 사용자가 "시작하기"를 클릭하면 즉시 모임 개설 페이지(/groups/new)로 이동한다', () => {
    renderWithAuth(true);

    const startButtons = screen.getAllByRole('button', { name: /시작하기/i });
    fireEvent.click(startButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/groups/new');
  });

});

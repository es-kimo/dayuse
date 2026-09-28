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
    sessionStorage.clear();
  });

  const renderWithAuth = (isAuthenticated: boolean) => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: isAuthenticated ? { id: 1, kakaoId: '12345', nickname: '테스터', profileImageUrl: null } : null,
      isAuthenticated,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUserNickname: vi.fn(),
      updateUserProfile: vi.fn(),
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

  it('바닥글(Footer)의 링크가 실제 정책 라우트로 연결되며 임시(todo) 링크가 남아있지 않다', () => {
    const { container } = renderWithAuth(false);

    const contactLink = screen.getByRole('link', { name: '문의하기' });
    const guideLink = screen.getByRole('link', { name: '서비스 안내' });
    const termsLink = screen.getByRole('link', { name: '이용약관' });
    const privacyLink = screen.getByRole('link', { name: '개인정보처리방침' });

    expect(contactLink).toHaveAttribute('href', '/contact');
    expect(guideLink).toHaveAttribute('href', '/guide');
    expect(termsLink).toHaveAttribute('href', '/terms');
    expect(privacyLink).toHaveAttribute('href', '/privacy');

    // 임시 링크나 todo 클래스가 남아있지 않아야 함
    expect(container.querySelectorAll('.todo').length).toBe(0);
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

  describe('유입 분석 및 액션 트래킹 연동 (F06)', () => {
    it('페이지 진입 시 landing_view 이벤트가 sessionStorage 플래그와 함께 1회 발송된다', () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchSpy);
      vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

      renderWithAuth(false);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/public/analytics/events',
        expect.objectContaining({
          body: expect.stringContaining('"eventName":"landing_view"'),
        })
      );
    });

    it('상단 시작 버튼 클릭 시 hero_cta_click 이벤트가 placement: hero와 함께 발송된다', () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchSpy);
      vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

      renderWithAuth(false);
      fetchSpy.mockClear();

      const heroStartBtn = screen.getByRole('button', { name: '시작하기' });
      fireEvent.click(heroStartBtn);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/public/analytics/events',
        expect.objectContaining({
          body: expect.stringMatching(/"eventName":"hero_cta_click".*"placement":"hero"/),
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=/groups/new');
    });

    it('하단 시작 버튼 클릭 시 footer_cta_click 이벤트가 placement: bottom과 함께 발송된다', () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchSpy);
      vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

      renderWithAuth(true);
      fetchSpy.mockClear();

      const footerStartBtn = screen.getByRole('button', { name: '데이유즈 시작하기' });
      fireEvent.click(footerStartBtn);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/public/analytics/events',
        expect.objectContaining({
          body: expect.stringMatching(/"eventName":"footer_cta_click".*"placement":"bottom"/),
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/groups/new');
    });

    it('"내 모임으로" 버튼 클릭 시 my_group_click 이벤트가 발송되고 적절한 경로로 이동한다', () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchSpy);
      vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

      // 비로그인 사용자
      const { unmount } = renderWithAuth(false);
      fetchSpy.mockClear();

      const myGroupButtons = screen.getAllByRole('button', { name: /내 모임으로/i });
      fireEvent.click(myGroupButtons[0]);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/public/analytics/events',
        expect.objectContaining({
          body: expect.stringContaining('"eventName":"my_group_click"'),
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=/groups');

      // 로그인 사용자
      unmount();
      renderWithAuth(true);
      mockNavigate.mockClear();

      const myGroupBtnAuth = screen.getAllByRole('button', { name: /내 모임으로/i })[0];
      fireEvent.click(myGroupBtnAuth);
      expect(mockNavigate).toHaveBeenCalledWith('/groups');
    });

    it('분석 요청이 네트워크 오류나 AdBlock으로 실패하더라도 사용자 이동이 정상적으로 진행된다', () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Blocked by client')));
      vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

      renderWithAuth(true);

      const footerStartBtn = screen.getByRole('button', { name: '데이유즈 시작하기' });
      expect(() => fireEvent.click(footerStartBtn)).not.toThrow();
      expect(mockNavigate).toHaveBeenCalledWith('/groups/new');
    });
  });
});


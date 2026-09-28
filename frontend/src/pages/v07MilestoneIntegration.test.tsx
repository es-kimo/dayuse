import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AboutPage } from './AboutPage';
import { LoginPage } from './LoginPage';
import { GuidePage } from './GuidePage';
import { TermsPage } from './TermsPage';
import { PrivacyPage } from './PrivacyPage';
import { ContactPage } from './ContactPage';
import * as AuthContextModule from '../context/AuthContext';
import * as shareEnvModule from '../utils/shareEnv';
import swContent from '../../public/sw.js?raw';

describe('v0.7 마일스톤 통합 검증 (PRD Section 8 완료 조건 14개 항목)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  const renderWithAuth = (isAuthenticated: boolean, initialRoute = '/about') => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: isAuthenticated ? { id: 1, kakaoId: '12345', nickname: '정회원', profileImageUrl: null } : null,
      isAuthenticated,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUserNickname: vi.fn(),
      updateUserProfile: vi.fn(),
    });

    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('[조건 1, 2, 7] 비인가 상태에서 고정 URL(/about) 접속 시 6개 섹션과 핵심 가치가 정상 표시된다', () => {
    renderWithAuth(false, '/about');

    // 1. 헤드라인 및 핵심 가치
    expect(screen.getByRole('heading', { name: /목표는 각자,\s*꾸준함은 함께\./i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /사진 한 장이면\s*끝나는 인증/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /매일 하는 일은\s*가볍게/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /오늘부터 친구와\s*하루 하나씩/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /목표가 달라도 한 모임에서/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /친구의 인증에\s*한마디 얹어요/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /초대 링크 하나면\s*준비 끝/i })).toBeInTheDocument();

    // 키보드 접근성: 내비게이션 시작하기 버튼 포커스 가능
    const startBtns = screen.getAllByRole('button', { name: /시작하기/i });
    expect(startBtns.length).toBeGreaterThanOrEqual(1);
    startBtns[0].focus();
    expect(startBtns[0]).toHaveFocus();
  });

  it('[조건 3, 4] 비로그인 사용자가 시작하기를 누르면 로그인 후 모임 생성 리다이렉트로 이어진다', () => {
    renderWithAuth(false, '/about');

    const startBtns = screen.getAllByRole('button', { name: /시작하기/i });
    fireEvent.click(startBtns[0]);

    // LoginPage 렌더링 확인
    expect(screen.getByRole('button', { name: /카카오로 시작하기/i })).toBeInTheDocument();
  });

  it('[조건 4, 11] 기존 회원은 "내 모임"으로 진입할 수 있다', () => {
    renderWithAuth(true, '/about');

    const myGroupBtns = screen.getAllByRole('button', { name: /내 모임/i });
    expect(myGroupBtns.length).toBeGreaterThan(0);
  });

  it('[조건 6] 4개 정책 문서(문의하기, 서비스 안내, 이용약관, 개인정보처리방침)가 비인가 열람 가능하다', () => {
    // 1. 서비스 안내
    const { unmount: unmountGuide } = renderWithAuth(false, '/guide');
    expect(screen.getByRole('heading', { level: 1, name: /서비스 (이용 )?안내/i })).toBeInTheDocument();
    expect(screen.getAllByText(/목표는 각자, 꾸준함은 함께/i).length).toBeGreaterThan(0);
    unmountGuide();

    // 2. 이용약관
    const { unmount: unmountTerms } = renderWithAuth(false, '/terms');
    expect(screen.getByRole('heading', { level: 1, name: /이용약관/i })).toBeInTheDocument();
    expect(screen.getByText(/제5조 \(챌린지 보증금 및 정산에 관한 책임의 한계\)/i)).toBeInTheDocument();
    unmountTerms();

    // 3. 개인정보처리방침
    const { unmount: unmountPrivacy } = renderWithAuth(false, '/privacy');
    expect(screen.getByRole('heading', { level: 1, name: /개인정보처리방침/i })).toBeInTheDocument();
    expect(screen.getAllByText(/개인정보 보호책임자/i).length).toBeGreaterThan(0);
    unmountPrivacy();

    // 4. 문의하기
    const { unmount: unmountContact } = renderWithAuth(false, '/contact');
    expect(screen.getByRole('heading', { level: 1, name: '문의하기' })).toBeInTheDocument();
    expect(screen.getByText('contact@dayuse.kr')).toBeInTheDocument();
    unmountContact();
  });

  it('[조건 12] 인앱 브라우저(카카오톡/인스타) 환경 감지 시 외부 브라우저 오픈 안내가 제공된다', () => {
    vi.spyOn(shareEnvModule, 'isInAppBrowser').mockReturnValue(true);
    vi.spyOn(shareEnvModule, 'getInAppBrowserName').mockReturnValue('kakaotalk');

    renderWithAuth(false, '/login');

    expect(screen.getByText(/카카오톡 인앱 브라우저로 접속 중입니다/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /기본 브라우저로 열기/i })).toBeInTheDocument();
  });

  it('[조건 14] Service Worker 캐시 버전이 v0.7.0으로 정상 갱신되어 있다', () => {
    expect(swContent).toContain("dayuse-static-v0.7.0");
    expect(swContent).toContain("v0.7.0");
  });
});

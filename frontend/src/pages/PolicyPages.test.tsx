import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ContactPage } from './ContactPage';
import { GuidePage } from './GuidePage';
import { TermsPage } from './TermsPage';
import { PrivacyPage } from './PrivacyPage';

describe('고객 안내 및 법적 정책 페이지 (F07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. 문의하기 (/contact)', () => {
    it('공식 지원 이메일 안내 및 복사 기능이 정상 제공된다', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <BrowserRouter>
          <ContactPage />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: '문의하기' })).toBeInTheDocument();
      expect(screen.getByText('공식 지원 이메일')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /메일 보내기/i })).toHaveAttribute(
        'href',
        'mailto:contact@dayuse.kr?subject=[dayuse 문의] '
      );

      const copyBtn = screen.getByRole('button', { name: /이메일 주소 복사하기/i });
      await act(async () => {
        fireEvent.click(copyBtn);
      });
      expect(writeTextMock).toHaveBeenCalledWith('contact@dayuse.kr');
    });

    it('오픈채팅 및 전송되지 않는 빈 폼 없이 공식 이메일 중심의 명확한 문의 가이드를 안내한다', () => {
      render(
        <BrowserRouter>
          <ContactPage />
        </BrowserRouter>
      );

      // 오픈채팅 링크가 없어야 함
      expect(screen.queryByRole('link', { name: /카카오톡 오픈채팅/i })).not.toBeInTheDocument();

      // 빈 폼 전송 인풋이 없어야 함 (가짜 폼 금지 정책)
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText(/서비스 오류 및 버그 제보/i)).toBeInTheDocument();
      expect(screen.getByText(/자주 묻는 질문 \(FAQ\)/i)).toBeInTheDocument();
    });
  });

  describe('2. 서비스 안내 (/guide)', () => {
    it('핵심 철학 및 각자하기/함께하기 챌린지 수행 방식의 차이점을 명확히 안내한다', () => {
      render(
        <BrowserRouter>
          <GuidePage />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: '서비스 이용 안내' })).toBeInTheDocument();
      expect(screen.getByText(/"목표는 각자, 꾸준함은 함께"/i)).toBeInTheDocument();
      expect(screen.getByText(/개인 맞춤형 · 각자하기/i)).toBeInTheDocument();
      expect(screen.getByText(/그룹 단체형 · 함께하기/i)).toBeInTheDocument();
    });

    it('보증금 및 미수행 정산 운영 방식(자율 송금, 0원 벌금 가능, 자동 출금 없음)을 명시한다', () => {
      render(
        <BrowserRouter>
          <GuidePage />
        </BrowserRouter>
      );

      expect(screen.getByText(/보증금 및 미수행 정산 운영 방식 \(필독\)/i)).toBeInTheDocument();
      expect(screen.getByText(/회원 간 직접 자율 송금 방식/i)).toBeInTheDocument();
      expect(screen.getByText(/0원 정산 설정 지원/i)).toBeInTheDocument();
      expect(screen.getByText(/서비스 자동 출금 기능 없음/i)).toBeInTheDocument();
    });
  });

  describe('3. 이용약관 (/terms)', () => {
    it('회원 간 자율 정산 및 회사의 자금 수탁·예치/지급보증 면책 책임 한계 조항을 명시한다', () => {
      render(
        <BrowserRouter>
          <TermsPage />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: 'dayuse 서비스 이용약관' })).toBeInTheDocument();
      expect(screen.getByText(/보증금 및 벌금 정산에 대한 핵심 고지/i)).toBeInTheDocument();
      expect(screen.getByText(/제5조 \(챌린지 보증금 및 정산에 관한 책임의 한계\)/i)).toBeInTheDocument();

      // 수탁/보관/예치 부존재 및 자동출금 부존재 확인
      expect(screen.getByText(/회사는 회원의 자금을 직접 수탁, 보관, 예치하지 아니하며/i)).toBeInTheDocument();
      expect(screen.getByText(/회사는 정산금의 강제 징수, 지급 보증, 대위 변제, 환불 의무를 일체 부담하지 않습니다/i)).toBeInTheDocument();
      expect(screen.getByText(/미수행 정산금을 0원으로 설정할 수 있으며/i)).toBeInTheDocument();
    });
  });

  describe('4. 개인정보처리방침 (/privacy)', () => {
    it('개인정보보호법 필수 기재 항목(수집 항목, 목적, 파기 기간, 보호책임자)을 전수 포함한다', () => {
      render(
        <BrowserRouter>
          <PrivacyPage />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: 'dayuse 개인정보처리방침' })).toBeInTheDocument();

      // 수집 항목
      expect(screen.getByText(/카카오 회원번호\(ID\), 프로필 닉네임, 프로필 이미지 URL, 이메일/i)).toBeInTheDocument();
      expect(screen.getByText(/챌린지 인증 사진, 인증 메모, 응원 댓글/i)).toBeInTheDocument();

      // 보유 및 파기
      expect(screen.getAllByText(/회원 탈퇴 시 지체 없이 파기/i).length).toBeGreaterThan(0);

      // 보호 책임자 정보
      expect(screen.getAllByText(/류기현/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/contact@dayuse.kr/i).length).toBeGreaterThan(0);
    });
  });

  describe('5. 공통 레이아웃 및 탭 내비게이션', () => {
    it('상단 탭을 통해 4개 문서 간의 유기적인 전환 경로를 제공한다', () => {
      render(
        <MemoryRouter initialEntries={['/guide']}>
          <GuidePage />
        </MemoryRouter>
      );

      const nav = screen.getByRole('navigation', { name: '정책 및 안내 문서 목록' });
      expect(nav).toBeInTheDocument();

      const guideTab = screen.getByRole('link', { name: '서비스 안내' });
      expect(guideTab).toHaveAttribute('aria-current', 'page');

      const links = nav.querySelectorAll('a');
      const hrefs = Array.from(links).map((l) => l.getAttribute('href'));
      expect(hrefs).toEqual(['/guide', '/terms', '/privacy', '/contact']);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { ScrollToTop } from './ScrollToTop';

describe('ScrollToTop 컴포넌트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    document.documentElement.scrollTo = vi.fn();
    document.body.scrollTo = vi.fn();
  });

  it('페이지 이동 시 window 및 root 엘리먼트의 스크롤이 (0, 0)으로 초기화된다', async () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/about']}>
        <ScrollToTop />
        <nav>
          <Link to="/terms">이용약관으로 이동</Link>
        </nav>
        <Routes>
          <Route path="/about" element={<div>소개 페이지</div>} />
          <Route path="/terms" element={<div>이용약관 페이지</div>} />
        </Routes>
      </MemoryRouter>
    );

    // 최초 렌더링 시 최상단 스크롤 호출 확인
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    // 링크 클릭하여 다른 라우트로 이동
    const link = getByText('이용약관으로 이동');
    await act(async () => {
      fireEvent.click(link);
    });

    // 경로 변경 후 다시 최상단 스크롤 호출 확인
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
  });
});

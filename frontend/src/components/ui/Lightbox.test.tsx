import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Lightbox } from './Lightbox';

describe('Lightbox Component', () => {
  const sampleSrc = 'https://dayuse.kr/images/sample.jpg';
  const sampleAlt = '오늘의 러닝 인증';

  it('open=true일 때 정상적으로 렌더링되고 이미지와 닫기 버튼이 노출된다', () => {
    const handleClose = vi.fn();

    render(
      <Lightbox
        open={true}
        onClose={handleClose}
        src={sampleSrc}
        alt={sampleAlt}
      />
    );

    // 닫기 버튼 확인
    const closeBtn = screen.getByRole('button', { name: '닫기' });
    expect(closeBtn).toBeInTheDocument();

    // 이미지 엘리먼트 확인
    const img = screen.getByAltText(sampleAlt);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', sampleSrc);
  });

  it('닫기 버튼 클릭 시 onClose 콜백이 호출된다', () => {
    const handleClose = vi.fn();

    render(
      <Lightbox
        open={true}
        onClose={handleClose}
        src={sampleSrc}
        alt={sampleAlt}
      />
    );

    const closeBtn = screen.getByRole('button', { name: '닫기' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('확대(+) 버튼을 누르면 배율이 증가하고, 초기화 버튼을 누르면 100%로 리셋된다', () => {
    const handleClose = vi.fn();

    render(
      <Lightbox
        open={true}
        onClose={handleClose}
        src={sampleSrc}
        alt={sampleAlt}
      />
    );

    // 초기 배율 100%
    expect(screen.getByText('100%')).toBeInTheDocument();

    // 확대 버튼 클릭
    const zoomInBtn = screen.getByRole('button', { name: '확대' });
    fireEvent.click(zoomInBtn);

    expect(screen.getByText('150%')).toBeInTheDocument();

    // 초기화 버튼 클릭
    const resetBtn = screen.getByRole('button', { name: '줌 초기화' });
    fireEvent.click(resetBtn);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('키보드 + 및 0 단축키로 확대 및 초기화가 동작한다', () => {
    const handleClose = vi.fn();

    render(
      <Lightbox
        open={true}
        onClose={handleClose}
        src={sampleSrc}
        alt={sampleAlt}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();

    // 키보드 '+' 누름
    fireEvent.keyDown(window, { key: '+' });
    expect(screen.getByText('150%')).toBeInTheDocument();

    // 키보드 '0' 누름
    fireEvent.keyDown(window, { key: '0' });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

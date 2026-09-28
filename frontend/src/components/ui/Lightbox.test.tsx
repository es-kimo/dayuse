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

  it('키보드 - 단축키로 축소가 동작한다', () => {
    const handleClose = vi.fn();

    render(
      <Lightbox
        open={true}
        onClose={handleClose}
        src={sampleSrc}
        alt={sampleAlt}
      />
    );

    // 먼저 확대한 후 축소
    fireEvent.keyDown(window, { key: '+' });
    expect(screen.getByText('150%')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '-' });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('모바일 터치 더블 탭 시 1x에서 2x로 확대되고 다시 더블 탭 시 1x로 리셋된다', () => {
    const handleClose = vi.fn();

    render(
      <Lightbox
        open={true}
        onClose={handleClose}
        src={sampleSrc}
        alt={sampleAlt}
      />
    );

    const img = screen.getByAltText(sampleAlt);
    const container = img.closest('.overflow-hidden') || img;

    expect(screen.getByText('100%')).toBeInTheDocument();

    // 첫 번째 탭
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // 100ms 후 두 번째 탭 (더블 탭)
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // 200%로 확대 확인
    expect(screen.getByText('200%')).toBeInTheDocument();

    // 다시 더블 탭 시 리셋
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('모바일 핀치 줌 제스처(두 손가락 거리 확대) 시 배율이 증가한다', () => {
    const handleClose = vi.fn();

    render(
      <Lightbox
        open={true}
        onClose={handleClose}
        src={sampleSrc}
        alt={sampleAlt}
      />
    );

    const img = screen.getByAltText(sampleAlt);
    const container = img.closest('.overflow-hidden') || img;

    expect(screen.getByText('100%')).toBeInTheDocument();

    // 두 손가락 터치 시작 (거리: 100px)
    fireEvent.touchStart(container, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ],
    });

    // 두 손가락 거리 벌리기 (거리: 200px -> 2배 핀치 확대)
    fireEvent.touchMove(container, {
      touches: [
        { clientX: 50, clientY: 100 },
        { clientX: 250, clientY: 100 },
      ],
    });

    fireEvent.touchEnd(container);

    // 100%보다 커진 배율 확인
    expect(screen.getByText('200%')).toBeInTheDocument();
  });

  it('긴 영수증이나 세로형 스크린샷 등 극단적 이미지 비율에서도 object-contain 스타일이 유지된다', () => {
    const handleClose = vi.fn();

    render(
      <Lightbox
        open={true}
        onClose={handleClose}
        src="https://dayuse.kr/images/long-receipt.jpg"
        alt="긴 영수증 인증 사진"
      />
    );

    const img = screen.getByAltText('긴 영수증 인증 사진');
    expect(img).toHaveClass('object-contain');
    expect(img).toHaveClass('max-h-[80dvh]');
    expect(img).toHaveClass('max-w-[95dvw]');
  });
});

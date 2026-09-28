import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InAppBrowserNotice } from './InAppBrowserNotice';
import * as shareEnvModule from '../utils/shareEnv';

describe('InAppBrowserNotice 컴포넌트', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('일반 브라우저 환경에서는 렌더링되지 않는다', () => {
    vi.spyOn(shareEnvModule, 'isInAppBrowser').mockReturnValue(false);

    const { container } = render(<InAppBrowserNotice />);
    expect(container.firstChild).toBeNull();
  });

  it('카카오톡 인앱 브라우저 감지 시 안내 배너가 표시되고 외부 열기 및 복사 기능을 지원한다', async () => {
    vi.spyOn(shareEnvModule, 'isInAppBrowser').mockReturnValue(true);
    vi.spyOn(shareEnvModule, 'getInAppBrowserName').mockReturnValue('kakaotalk');
    const openExternalSpy = vi.spyOn(shareEnvModule, 'openInExternalBrowser').mockReturnValue(true);

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<InAppBrowserNotice />);

    expect(screen.getByText(/카카오톡 인앱 브라우저로 접속 중입니다/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /기본 브라우저로 열기/i })).toBeInTheDocument();

    // 외부 브라우저 버튼 클릭
    fireEvent.click(screen.getByRole('button', { name: /기본 브라우저로 열기/i }));
    expect(openExternalSpy).toHaveBeenCalled();

    // 주소 복사 버튼 클릭
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /주소 복사/i }));
    });
    expect(writeTextMock).toHaveBeenCalled();
  });

  it('닫기 버튼을 누르면 배너가 사라지고 세션 스토리지에 저장된다', () => {
    vi.spyOn(shareEnvModule, 'isInAppBrowser').mockReturnValue(true);
    vi.spyOn(shareEnvModule, 'getInAppBrowserName').mockReturnValue('instagram');

    render(<InAppBrowserNotice />);

    expect(screen.getByText(/인스타그램 인앱 브라우저로 접속 중입니다/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /안내 닫기/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/인스타그램 인앱 브라우저로 접속 중입니다/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem('dayuse_inapp_notice_dismissed')).toBe('1');
  });
});

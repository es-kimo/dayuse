/**
 * 모바일(HTTP, 비보안 환경, 구형 브라우저 포함)에서도 100% 동작하는 안전한 클립보드 복사 함수
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  // 1. 최신 navigator.clipboard 시도 (HTTPS 또는 localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText 실패, fallback 시도:', e);
    }
  }

  // 2. Fallback: textarea + document.execCommand('copy') (HTTP, 192.168.x.x, 구형 모바일 완벽 지원)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // 화면 밖으로 숨김 처리 및 모바일 줌인 방지
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    // iOS WebKit을 위한 selection range 설정
    textArea.setSelectionRange(0, 99999);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    return successful;
  } catch (err) {
    console.error('클립보드 복사 fallback 실패:', err);
    return false;
  }
};

import { isWebKit, isSecureContext } from './shareEnv';

/**
 * 클립보드 복사.
 *
 * 브라우저별 제약이 두 가지라 경로를 나눈다.
 * 1. Safari/WebKit은 사용자 제스처와 같은 태스크에서 클립보드 쓰기를 시작해야 한다.
 *    복사할 값을 네트워크로 받아와야 하면 `copyTextDeferred`로 Promise 자체를 넘겨야 한다.
 * 2. 비보안 컨텍스트(HTTP, 사설 IP)에는 navigator.clipboard가 아예 없어 execCommand로 내려간다.
 */

const hasAsyncClipboard = (): boolean =>
  typeof navigator !== 'undefined' &&
  !!navigator.clipboard &&
  typeof navigator.clipboard.writeText === 'function' &&
  isSecureContext();

const hasClipboardItem = (): boolean =>
  hasAsyncClipboard() &&
  typeof navigator.clipboard.write === 'function' &&
  typeof ClipboardItem !== 'undefined';

/**
 * execCommand 폴백.
 * iOS WebKit은 화면 밖(-9999px)이나 readonly인 textarea는 선택이 잡히지 않으므로
 * 화면 안에 1px로 두고 Range로 직접 선택한다.
 */
const legacyCopy = (text: string): boolean => {
  if (typeof document === 'undefined') return false;

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('aria-hidden', 'true');
  area.contentEditable = 'true';
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.width = '1px';
  area.style.height = '1px';
  area.style.padding = '0';
  area.style.border = 'none';
  area.style.outline = 'none';
  area.style.boxShadow = 'none';
  area.style.background = 'transparent';
  area.style.opacity = '0';
  // iOS에서 포커스 시 화면이 확대되지 않도록 16px 이상을 유지한다.
  area.style.fontSize = '16px';

  document.body.appendChild(area);

  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  try {
    if (isWebKit()) {
      const range = document.createRange();
      range.selectNodeContents(area);
      selection?.removeAllRanges();
      selection?.addRange(range);
      area.setSelectionRange(0, text.length);
    } else {
      area.focus();
      area.select();
      area.setSelectionRange(0, text.length);
    }
    return document.execCommand('copy');
  } catch (err) {
    console.warn('execCommand 클립보드 폴백 실패:', err);
    return false;
  } finally {
    document.body.removeChild(area);
    if (previousRange) {
      selection?.removeAllRanges();
      selection?.addRange(previousRange);
    }
  }
};

/** 이미 값을 들고 있을 때 쓰는 복사. 클릭 핸들러에서 await 없이 바로 호출해야 한다. */
export const copyText = async (text: string): Promise<boolean> => {
  if (hasAsyncClipboard()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText 실패, execCommand로 폴백:', err);
    }
  }
  return legacyCopy(text);
};

/**
 * 복사할 값을 아직 받아오는 중일 때 쓰는 복사.
 *
 * Safari는 await 뒤의 클립보드 쓰기를 NotAllowedError로 막기 때문에,
 * Promise를 담은 ClipboardItem을 제스처와 같은 태스크에서 만들어 넘긴다.
 * 그래서 이 함수는 async가 아니다 — 호출 즉시 ClipboardItem이 만들어져야 한다.
 */
export const copyTextDeferred = (textPromise: Promise<string>): Promise<boolean> => {
  if (hasClipboardItem()) {
    try {
      const item = new ClipboardItem({
        'text/plain': textPromise.then((text) => new Blob([text], { type: 'text/plain' })),
      });
      return navigator.clipboard
        .write([item])
        .then(() => true)
        .catch(async (err) => {
          console.warn('ClipboardItem 지연 복사 실패, 값 확정 후 재시도:', err);
          return copyText(await textPromise);
        });
    } catch (err) {
      console.warn('ClipboardItem 생성 실패, 값 확정 후 재시도:', err);
    }
  }
  return textPromise.then((text) => copyText(text));
};

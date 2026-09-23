/**
 * 공유 기능(이미지 저장 / 카카오톡 공유 / 링크 복사)이 공통으로 쓰는 실행 환경 판정.
 *
 * 세 기능이 제각각 UA를 파싱하면 분기가 어긋나므로 판정은 이 파일에만 둔다.
 */

const ua = (): string => (typeof navigator === 'undefined' ? '' : navigator.userAgent || '');

/** iPadOS 13+ 는 UA가 Macintosh로 나오므로 터치 포인트 수를 함께 본다. */
export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const agent = ua();
  if (/iPad|iPhone|iPod/.test(agent)) return true;
  return /Macintosh/.test(agent) && navigator.maxTouchPoints > 1;
};

export const isAndroid = (): boolean => /Android/i.test(ua());

export const isMobile = (): boolean => isIOS() || isAndroid();

/**
 * WebKit 렌더링 엔진 여부.
 * iOS는 브라우저 종류와 무관하게 전부 WebKit이라 클립보드/공유 제약이 동일하다.
 */
export const isWebKit = (): boolean => {
  if (isIOS()) return true;
  const agent = ua();
  return /Safari/.test(agent) && !/Chrome|Chromium|Edg|OPR/.test(agent);
};

export const isKakaoInApp = (): boolean => /KAKAOTALK/i.test(ua());

/** 카카오톡·인스타그램·네이버 등 인앱 브라우저. 팝업과 다운로드가 막혀 있는 경우가 많다. */
export const isInAppBrowser = (): boolean =>
  /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\/|DaumApps/i.test(ua());

export const isSecureContext = (): boolean =>
  typeof window !== 'undefined' && window.isSecureContext === true;

export const canShareLink = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** 파일 공유 지원 여부. 브라우저마다 파일 타입 제한이 달라 실제 File로 물어봐야 한다. */
export const canShareFile = (file: File): boolean => {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
};

/**
 * 이미지 저장 전략.
 * - `share-sheet`: 네이티브 공유 시트로 넘겨 "이미지 저장"을 고르게 한다. (모바일 기본)
 * - `download`   : a[download]로 파일을 내려받는다. (데스크톱 기본)
 * - `long-press` : iOS에서 공유 시트를 못 쓸 때. 이미지를 띄우고 길게 눌러 저장하도록 안내한다.
 *
 * iOS Safari는 a[download] + data:/blob: 로 사진 앱에 저장할 수 없어서 download로 내려보내지 않는다.
 * 데스크톱은 canShareFile이 true여도(윈도우 Chrome 등) 공유 시트 대신 다운로드가 기대 동작이다.
 */
export type ImageSaveStrategy = 'share-sheet' | 'download' | 'long-press';

export const pickImageSaveStrategy = (file: File): ImageSaveStrategy => {
  if (isMobile() && canShareFile(file)) return 'share-sheet';
  if (isIOS()) return 'long-press';
  return 'download';
};

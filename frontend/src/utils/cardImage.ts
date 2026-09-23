import { toBlob } from 'html-to-image';
import { isWebKit } from './shareEnv';

/** 카드 실측 270x480 CSS px × 4 = 1080x1920 (인스타 스토리 규격) */
export const STORY_PIXEL_RATIO = 4;

const CAPTURE_OPTIONS = {
  pixelRatio: STORY_PIXEL_RATIO,
  // presigned URL은 쿼리스트링이 서명이라 cacheBust를 붙이면 403이 난다.
  cacheBust: false,
  // 기본값은 쿼리를 떼고 캐시 키를 만들어, 서명이 갱신돼도 실패했던 빈 값이 그대로 재사용된다.
  includeQueryParams: true,
  backgroundColor: '#0f172a',
  skipAutoScale: true,
};

/**
 * 외부 이미지를 data URL로 바꿔 카드에 직접 심는다.
 *
 * html-to-image는 캡처 중 이미지를 fetch하는데, 실패해도 예외 없이 빈 문자열로 대체한다.
 * (node_modules/html-to-image/lib/dataurl.js의 `imagePlaceholder || ''`)
 * 그래서 사진이 빠진 카드가 조용히 저장된다. 미리 우리가 받아서 성패를 직접 판정한다.
 *
 * 실패 원인은 대부분 S3 버킷에 CORS 규칙이 없는 경우다.
 */
export const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) {
      console.warn(`인증 사진 응답이 ${res.status} 입니다: ${url}`);
      return null;
    }

    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) {
      console.warn(`인증 사진이 이미지가 아닙니다: ${blob.type}`);
      return null;
    }

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('인증 사진을 불러오지 못했습니다. S3 버킷의 CORS 설정을 확인하세요:', err);
    return null;
  }
};

/**
 * 카드 DOM을 PNG Blob으로 만든다.
 *
 * WebKit은 첫 캡처에서 폰트나 이미지가 빠진 결과를 내놓는 문제가 있어 한 번 버리고 다시 찍는다.
 */
export const captureCard = async (node: HTMLElement): Promise<Blob> => {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  if (isWebKit()) {
    await toBlob(node, CAPTURE_OPTIONS);
  }

  const blob = await toBlob(node, CAPTURE_OPTIONS);
  if (!blob) {
    throw new Error('카드 이미지를 만들지 못했습니다.');
  }
  return blob;
};

export const blobToFile = (blob: Blob, filename: string): File =>
  new File([blob], filename, { type: blob.type || 'image/png', lastModified: Date.now() });

/** 데스크톱 다운로드. data URL 대신 blob URL을 써야 대용량에서도 안전하다. */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari가 다운로드를 시작하기 전에 해제되지 않도록 넉넉히 늦춘다.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
};

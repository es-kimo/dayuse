import { isMobile } from './shareEnv';

declare global {
  interface Window {
    Kakao?: any;
  }
}

const KAKAO_SDK_VERSION = '2.7.4';
const KAKAO_SDK_URL = `https://t1.kakaocdn.net/kakao_js_sdk/${KAKAO_SDK_VERSION}/kakao.min.js`;
// `npm run verify:kakao-sdk`로 실제 배포본과 대조할 수 있다. 버전을 올리면 해시도 같이 갱신해야 한다.
const KAKAO_SDK_INTEGRITY = 'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka';

let loadPromise: Promise<void> | null = null;

const loadKakaoSdk = (): Promise<void> => {
  if (window.Kakao) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.integrity = KAKAO_SDK_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => {
      // 무결성 불일치도 여기로 떨어진다. 다음 시도에서 다시 붙일 수 있게 캐시를 비운다.
      loadPromise = null;
      script.remove();
      reject(new Error('카카오 SDK 로드에 실패했습니다.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

/**
 * 카카오톡 공유 사용 가능 여부. 동기 함수다.
 *
 * 데스크톱 `sendDefault`는 팝업을 띄우기 때문에 클릭 핸들러에서 await를 거치면 팝업이 차단된다.
 * 그래서 SDK 로드/초기화는 앱 부팅 때 `preloadKakao`로 끝내두고,
 * 클릭 시점에는 이 함수로 준비 여부만 확인한 뒤 곧바로 전송한다.
 */
export const isKakaoReady = (): boolean => {
  try {
    return !!window.Kakao?.isInitialized?.() && !!window.Kakao?.Share;
  } catch {
    return false;
  }
};

/** 앱 부팅 시 1회 호출. 실패해도 앱 동작에는 영향이 없도록 예외를 삼킨다. */
export const preloadKakao = async (): Promise<boolean> => {
  const kakaoKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
  if (!kakaoKey) {
    console.warn(
      'VITE_KAKAO_JAVASCRIPT_KEY가 없어 카카오톡 공유가 비활성화됩니다. (카카오 로그인용 REST 키와 다른 값입니다)'
    );
    return false;
  }

  try {
    await loadKakaoSdk();
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(kakaoKey);
    }
    return isKakaoReady();
  } catch (err) {
    console.error('카카오 SDK 초기화 실패:', err);
    return false;
  }
};

/** 카카오 서버가 접근할 수 있는 공개 오리진. 로컬 개발 중에도 썸네일만은 여기서 받아간다. */
const PUBLIC_ORIGIN = 'https://dayuse.kr';

/** 넘겨받은 이미지가 없을 때 쓰는 브랜드 기본 썸네일. 링크 미리보기 카드를 항상 띄우기 위한 최소 보장이다. */
const BRAND_FALLBACK_IMAGE = '/assets/brand/og-default.png';

/**
 * 카카오 썸네일로 실제로 쓸 수 있는 절대 URL로 정리한다. 못 쓰는 값이면 null.
 *
 * - SVG는 카카오가 썸네일로 잡지 못하므로 제외한다.
 * - 상대 경로는 절대 URL로 올린다.
 * - localhost/사설 IP는 카카오 서버가 받아갈 수 없으므로 공개 오리진의 같은 경로로 바꾼다.
 *   (로컬에서 공유를 눌러도 그림이 깨지지 않게 하는 용도다.)
 */
export const resolveKakaoImageUrl = (
  url: string | null | undefined,
  origin: string
): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url, origin);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (/\.svg$/i.test(parsed.pathname)) return null;
    if (/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|192\.168\.|10\.)/.test(parsed.host)) {
      return new URL(parsed.pathname + parsed.search, PUBLIC_ORIGIN).toString();
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

interface ShareKakaoParams {
  title: string;
  description: string;
  imageUrl?: string | null;
  linkUrl: string;
  /** 메시지 하단 버튼 문구. 공유 대상에 맞는 말로 바꿔 쓴다. */
  buttonTitle?: string;
}

/**
 * 카카오톡으로 공유한다. 동기 함수이므로 클릭 핸들러에서 await 없이 호출해야 한다.
 *
 * 항상 feed 템플릿으로 보낸다. text 템플릿은 링크가 도메인 한 줄로만 붙어서
 * 받는 쪽에 문구만 덩그러니 보이고 눌러볼 만한 카드가 만들어지지 않는다.
 * 그래서 쓸 만한 썸네일이 없으면 브랜드 기본 이미지로 메꾼다.
 */
export const shareToKakao = ({
  title,
  description,
  imageUrl,
  linkUrl,
  buttonTitle = '자세히 보기',
}: ShareKakaoParams): boolean => {
  if (!isKakaoReady()) return false;

  const link = { mobileWebUrl: linkUrl, webUrl: linkUrl };
  const buttons = [{ title: buttonTitle, link }];
  const origin = typeof window !== 'undefined' ? window.location.origin : PUBLIC_ORIGIN;
  const thumbnail =
    resolveKakaoImageUrl(imageUrl, origin) ??
    resolveKakaoImageUrl(BRAND_FALLBACK_IMAGE, origin);

  try {
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      installTalk: isMobile(),
      content: {
        title,
        description,
        imageUrl: thumbnail,
        link,
      },
      buttons,
    });
    return true;
  } catch (err) {
    console.error('카카오톡 공유 전송 실패:', err);
    return false;
  }
};

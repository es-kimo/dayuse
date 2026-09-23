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

/**
 * 카카오 썸네일로 쓸 수 있는 이미지인지 확인한다.
 * 카카오 스크래퍼는 SVG를 썸네일로 잡지 못하므로 favicon.svg 같은 값은 걸러낸다.
 */
const isScrapableImage = (url?: string | null): url is string => {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    return !/\.svg$/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

interface ShareKakaoParams {
  title: string;
  description: string;
  imageUrl?: string | null;
  linkUrl: string;
}

/**
 * 카카오톡으로 공유한다. 동기 함수이므로 클릭 핸들러에서 await 없이 호출해야 한다.
 *
 * 쓸 수 있는 썸네일이 없으면 feed 대신 text 템플릿을 쓴다.
 * feed 템플릿은 imageUrl이 필수라, 깨진 이미지를 넣으면 메시지 자체가 볼품없어진다.
 */
export const shareToKakao = ({
  title,
  description,
  imageUrl,
  linkUrl,
}: ShareKakaoParams): boolean => {
  if (!isKakaoReady()) return false;

  const link = { mobileWebUrl: linkUrl, webUrl: linkUrl };
  const buttons = [{ title: '카드 보러가기', link }];

  try {
    if (isScrapableImage(imageUrl)) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        installTalk: isMobile(),
        content: { title, description, imageUrl, link },
        buttons,
      });
    } else {
      window.Kakao.Share.sendDefault({
        objectType: 'text',
        installTalk: isMobile(),
        text: `${title}\n${description}`,
        link,
        buttons,
      });
    }
    return true;
  } catch (err) {
    console.error('카카오톡 공유 전송 실패:', err);
    return false;
  }
};

declare global {
  interface Window {
    Kakao?: any;
  }
}

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

export const loadKakaoSdk = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Kakao) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.integrity = 'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxm4+XR+R1vOKnyumoK1';
    script.crossOrigin = 'anonymous';
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error('카카오 SDK 로드에 실패했습니다.'));

    document.head.appendChild(script);
  });
};

export const initKakao = async (): Promise<boolean> => {
  try {
    await loadKakaoSdk();
    const kakaoKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
    if (!kakaoKey) {
      console.warn('VITE_KAKAO_JAVASCRIPT_KEY가 설정되지 않아 카카오톡 공유가 비활성화됩니다.');
      return false;
    }

    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(kakaoKey);
    }
    return window.Kakao?.isInitialized() ?? false;
  } catch (err) {
    console.error('카카오 SDK 초기화 에러:', err);
    return false;
  }
};

interface ShareKakaoFeedParams {
  title: string;
  description: string;
  imageUrl?: string | null;
  linkUrl: string;
}

export const shareToKakao = async ({
  title,
  description,
  imageUrl,
  linkUrl,
}: ShareKakaoFeedParams): Promise<boolean> => {
  const isReady = await initKakao();
  if (!isReady || !window.Kakao) {
    return false;
  }

  try {
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl: imageUrl || `${window.location.origin}/favicon.svg`,
        link: {
          mobileWebUrl: linkUrl,
          webUrl: linkUrl,
        },
      },
      buttons: [
        {
          title: '카드 보러가기',
          link: {
            mobileWebUrl: linkUrl,
            webUrl: linkUrl,
          },
        },
      ],
    });
    return true;
  } catch (err) {
    console.error('카카오톡 공유 전송 실패:', err);
    return false;
  }
};

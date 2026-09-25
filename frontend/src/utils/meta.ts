/**
 * 페이지별 메타데이터 정책 및 브라우저 Head 태그 관리 엔진 (BR-04, BR-05)
 */

export interface PageMeta {
  title: string;
  description: string;
  ogImage: string;
  robots: 'index, follow' | 'noindex, nofollow';
  ogType?: 'website' | 'article';
}

export interface ResolveMetaOptions {
  /** 404 또는 만료/삭제된 리소스 여부 */
  isNotFound?: boolean;
  /** 만료된 리소스 여부 */
  isExpired?: boolean;
  /** 공유 카드 등 공개 승인된 전용 이미지 (비공개 리소스에는 무시됨) */
  customShareImage?: string;
  /** 공유 카드 공개 허용 커스텀 설명 (비공개 리소스에는 무시됨) */
  customShareDescription?: string;
}

export const BRAND_DEFAULT_OG = '/assets/brand/og-default.png';
export const BRAND_SHARE_OG = '/assets/brand/og-share.png';

/**
 * 정의된 페이지 유형별 기본 메타데이터 정책 매핑 (BR-04)
 */
export const PAGE_META_PRESETS: Record<string, PageMeta> = {
  HOME: {
    title: 'dayuse · 목표는 각자, 꾸준함은 함께',
    description: '친구들과 각자의 챌린지를 인증하고 기록해요.',
    ogImage: BRAND_DEFAULT_OG,
    robots: 'index, follow',
  },
  LOGIN: {
    title: '로그인 · dayuse',
    description: '친구들과 각자의 챌린지를 인증하고 기록해요.',
    ogImage: BRAND_DEFAULT_OG,
    robots: 'noindex, nofollow',
  },
  SIGNUP: {
    title: '가입 · dayuse',
    description: '친구들과 각자의 챌린지를 인증하고 기록해요.',
    ogImage: BRAND_DEFAULT_OG,
    robots: 'noindex, nofollow',
  },
  GROUPS: {
    title: '모임 · dayuse',
    description: '친구들과 각자의 챌린지를 인증하고 기록해요.',
    ogImage: BRAND_DEFAULT_OG,
    robots: 'noindex, nofollow',
  },
  CHALLENGES: {
    title: '챌린지 · dayuse',
    description: '친구들과 각자의 챌린지를 인증하고 기록해요.',
    ogImage: BRAND_DEFAULT_OG,
    robots: 'noindex, nofollow',
  },
  VERIFY: {
    title: '인증 · dayuse',
    description: '친구들과 각자의 챌린지를 인증하고 기록해요.',
    ogImage: BRAND_DEFAULT_OG,
    robots: 'noindex, nofollow',
  },
  INVITE: {
    title: '모임 초대 · dayuse',
    description: 'dayuse 모임에 초대되었습니다.',
    ogImage: BRAND_DEFAULT_OG,
    robots: 'noindex, nofollow',
  },
  SHARE: {
    title: '챌린지 기록 · dayuse',
    description: '챌린지 수행 기록을 확인해보세요.',
    ogImage: BRAND_SHARE_OG,
    robots: 'noindex, nofollow',
  },
  NOT_FOUND: {
    title: '페이지 안내 · dayuse',
    description: '존재하지 않거나 만료된 페이지입니다.',
    ogImage: BRAND_DEFAULT_OG,
    robots: 'noindex, nofollow',
  },
};

/**
 * URL 경로(pathname) 및 상태 옵션에 따라 안전한 페이지 메타데이터를 결정하는 라우팅 가드
 *
 * ⚠️ 보안 원칙 (BR-05):
 * 1. 비공개 모임, 챌린지, 인증 등록, 계정 화면은 로그인 여부나 외부 입력과 무관하게
 *    개인정보(모임명, 참여자 목록, 계좌번호, 개인 사진 등)가 메타태그에 포함되어서는 안 되며,
 *    항상 공통 메타데이터로 강제 격리되어야 합니다.
 * 2. 만료되었거나 존재하지 않는 리소스는 '페이지 안내 · dayuse' 폴백 메타데이터를 반환합니다.
 */
export function resolvePageMeta(pathname: string, options: ResolveMetaOptions = {}): PageMeta {
  // 1. 만료 또는 404 리소스는 즉시 안내 메타데이터로 격리
  if (options.isNotFound || options.isExpired) {
    return { ...PAGE_META_PRESETS.NOT_FOUND };
  }

  // 경로 정규화 (끝 슬래시 제거, 단 루트 제외)
  const normalizedPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // 2. 공개 홈 및 서비스 소개
  if (normalizedPath === '/' || normalizedPath === '/about') {
    return { ...PAGE_META_PRESETS.HOME };
  }

  // 3. 로그인 및 회원가입
  if (normalizedPath === '/login' || normalizedPath === '/oauth/callback/kakao') {
    return { ...PAGE_META_PRESETS.LOGIN };
  }
  if (normalizedPath === '/signup') {
    return { ...PAGE_META_PRESETS.SIGNUP };
  }

  // 4. 비공개 모임 (목록, 생성, 상세, 정산 등)
  // 개인정보(모임명, 멤버명, 계좌번호)가 외부에서 주입되어도 철저히 격리
  if (normalizedPath === '/groups' || normalizedPath.startsWith('/groups/')) {
    // 세부 경로 중 챌린지 생성이 포함된 경우
    if (normalizedPath.includes('/challenges/new')) {
      return { ...PAGE_META_PRESETS.CHALLENGES };
    }
    return { ...PAGE_META_PRESETS.GROUPS };
  }

  // 5. 비공개 챌린지 상세
  if (normalizedPath.startsWith('/challenges/')) {
    return { ...PAGE_META_PRESETS.CHALLENGES };
  }

  // 6. 비공개 인증 등록 및 오늘 화면
  if (normalizedPath === '/today' || normalizedPath.startsWith('/verify/') || normalizedPath === '/verify') {
    return { ...PAGE_META_PRESETS.VERIFY };
  }

  // 7. 모임 초대 수락 화면
  if (normalizedPath.startsWith('/invite/')) {
    return { ...PAGE_META_PRESETS.INVITE };
  }

  // 8. 공개 공유 카드 (v0.2)
  if (normalizedPath.startsWith('/shares/')) {
    return {
      title: PAGE_META_PRESETS.SHARE.title,
      description: options.customShareDescription || PAGE_META_PRESETS.SHARE.description,
      ogImage: options.customShareImage || PAGE_META_PRESETS.SHARE.ogImage,
      robots: 'noindex, nofollow',
    };
  }

  // 9. 프로필 및 설정 등 기타 내부 개인화 페이지
  if (normalizedPath === '/profile' || normalizedPath.startsWith('/settings/')) {
    return { ...PAGE_META_PRESETS.GROUPS };
  }

  // 10. 정의되지 않은 모든 경로는 404 안내 폴백
  return { ...PAGE_META_PRESETS.NOT_FOUND };
}

/**
 * 주어진 메타데이터를 브라우저 DOM head에 안전하게 반영
 */
export function updateDocumentMeta(meta: PageMeta): void {
  if (typeof document === 'undefined') return;

  // 1. Title 업데이트
  document.title = meta.title;

  // 2. Helper to set or create meta element
  const setMeta = (attributeName: string, attributeValue: string, content: string) => {
    let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attributeName, attributeValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // 3. Absolute URL 처리 (OG 이미지 및 URL 규격)
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://dayuse.kr';
  const fullOgImage = meta.ogImage.startsWith('http://') || meta.ogImage.startsWith('https://')
    ? meta.ogImage
    : `${origin}${meta.ogImage.startsWith('/') ? '' : '/'}${meta.ogImage}`;

  // 4. Description & Robots
  setMeta('name', 'description', meta.description);
  setMeta('name', 'robots', meta.robots);

  // 5. Open Graph
  setMeta('property', 'og:title', meta.title);
  setMeta('property', 'og:description', meta.description);
  setMeta('property', 'og:image', fullOgImage);
  if (typeof window !== 'undefined' && window.location) {
    setMeta('property', 'og:url', window.location.href);
  }

  // 6. Twitter Card
  setMeta('name', 'twitter:title', meta.title);
  setMeta('name', 'twitter:description', meta.description);
  setMeta('name', 'twitter:image', fullOgImage);
}

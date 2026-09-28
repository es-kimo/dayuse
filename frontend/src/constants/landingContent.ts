/**
 * 데이유즈(dayuse) 랜딩페이지 확정 콘텐츠 및 화면 자산 메타데이터
 *
 * - dayuse-landing-prototype-0.1.html 프로토타입 기반 확정 원고
 * - PRD 5절(서비스 소개 콘텐츠) 및 실제 프로덕션 정책(벌금 0원 설정, 자동 출금 없음 등) 100% 일치
 * - 화면 자산 종횡비(Aspect Ratio) 보존 메타데이터 포함 (CLS 방지)
 */

export interface ScreenAsset {
  id: string;
  title: string;
  caption: string;
  webpPath: string;
  pngPath: string;
  width: number;
  height: number;
  aspectRatio: string;
  alt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface StepItem {
  step: number;
  title: string;
  description: string;
}

// 1. Hero 섹션 콘텐츠
export const HERO_CONTENT = {
  eyebrow: '06:30',
  title: '목표는 각자, 꾸준함은 함께.',
  subtitle: '친구들과 각자의 챌린지를 인증하고 기록해요.',
  primaryCta: '친구들과 시작하기',
  secondaryCta: '어떻게 사용하는지 보기',
  chips: [
    { initial: '류', goal: '매일 1알고리즘', tag: '코딩' },
    { initial: '김', goal: '주 3회 헬스장', tag: '운동' },
    { initial: '박', goal: '6시 기상', tag: '습관' },
  ],
} as const;

// 2. 익숙한 경험에서 출발 (사진 인증)
export const HABIT_PHOTO_CONTENT = {
  title: '사진 한 장이면 끝나는 인증',
  description: '찍고, 한마디 남기고, 올리면 끝. 친구들에게 바로 보여요.',
  subcopy: '카톡방에 올리던 인증, 기록까지 편하게.',
} as const;

// 3. 사용 방법 3단계
export const HOW_IT_WORKS_STEPS: StepItem[] = [
  {
    step: 1,
    title: '오늘 할 일 확인',
    description: '참여 중인 모든 모임의 인증을 한 화면에서.',
  },
  {
    step: 2,
    title: '사진으로 인증',
    description: '카메라로 찍거나 캡처를 붙여 넣어요.',
  },
  {
    step: 3,
    title: '연속 기록 쌓기',
    description: '하루하루 칸이 채워지는 걸 친구와 함께 봐요.',
  },
];

// 4. 서로 다른 목표 / 함께라서 꾸준해져요
export const TOGETHER_CONTENT = {
  eyebrow: '목표는 각자 꾸준함은 함께',
  title: '함께라서 꾸준해져요',
  description: '목표는 각자 정하고, 인증은 서로 보면서. 친구의 오늘이 내일의 나를 움직여요.',
} as const;

// 5. 확정 FAQ 4선 (프로덕션 배포 정책 검증 완료)
export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-different-goals',
    question: '모두 같은 챌린지를 해야 하나요?',
    answer:
      '아니요! 같은 모임 안에서도 각자 원하는 챌린지를 자유롭게 만들고 참여할 수 있어요. 한 사람은 알고리즘, 다른 사람은 운동이나 기상 인증을 해도 괜찮아요.',
  },
  {
    id: 'faq-participate-all',
    question: '모임의 모든 챌린지에 참여해야 하나요?',
    answer:
      '아니에요. 자신이 실천하고 싶은 챌린지만 골라서 참여하면 됩니다. 부담 없이 하루 하나부터 시작해 보세요.',
  },
  {
    id: 'faq-why-dayuse',
    question: '카톡 대신 데이유즈를 쓰는 이유가 뭔가요?',
    answer:
      '카톡방에 올린 사진은 묻히거나 만료되지만, 데이유즈에서는 날짜별 캘린더와 스트릭 기록으로 차곡차곡 쌓여요. 오늘 할 일도 한 화면에서 깔끔하게 챙길 수 있습니다.',
  },
  {
    id: 'faq-fee-deposit',
    question: '이용료나 벌금을 내야 하나요?',
    answer:
      '기본 기능은 누구나 무료예요. 챌린지 생성 시 미수행 벌금은 0원으로 부담 없이 설정할 수 있으며, 자동 출금이나 강제 결제 기능은 일절 없습니다.',
  },
];

// 6. 시작 제안 / 아웃트로
export const OUTRO_CONTENT = {
  title: '오늘부터 친구와 하루 하나씩',
  description: '모임을 만들고 초대 링크를 보내면 준비 끝이에요.',
  primaryCta: '데이유즈 시작하기',
  secondaryCta: '내 모임으로',
  serviceUrl: 'https://dayuse.kr',
  copyright: '© 2026 dayuse. All rights reserved.',
} as const;

// 7. 랜딩 대표 화면 5종 자산 메타데이터 (Aspect Ratio 및 무손실 WebP/PNG)
export const LANDING_SCREEN_CAPTURES: Record<string, ScreenAsset> = {
  feed: {
    id: '03-group-feed',
    title: '모임 인증 피드',
    caption: '친구들의 일일 챌린지 인증 사진과 한마디 피드 타임라인',
    webpPath: '/landing/assets/captures/03-group-feed.webp',
    pngPath: '/landing/assets/captures/03-group-feed.png',
    width: 780,
    height: 1976,
    aspectRatio: '780/1976',
    alt: '데이유즈 모임 인증 피드 화면 캡처',
  },
  calendar: {
    id: '04-challenge-calendar',
    title: '챌린지 캘린더 및 스트릭',
    caption: '7일 연속 달성 스트릭과 참가자별 수행률 통계',
    webpPath: '/landing/assets/captures/04-challenge-calendar.webp',
    pngPath: '/landing/assets/captures/04-challenge-calendar.png',
    width: 780,
    height: 1688,
    aspectRatio: '780/1688',
    alt: '데이유즈 챌린지 캘린더 및 스트릭 통계 화면 캡처',
  },
  today: {
    id: '05-today-actions',
    title: '오늘의 챌린지 액션',
    caption: '오늘 인증할 챌린지 카드와 즉시 사진 인증 액션',
    webpPath: '/landing/assets/captures/05-today-actions.webp',
    pngPath: '/landing/assets/captures/05-today-actions.png',
    width: 780,
    height: 1688,
    aspectRatio: '780/1688',
    alt: '데이유즈 오늘 할 일 목록 및 즉시 인증 액션 화면 캡처',
  },
  groupNew: {
    id: '06-group-new',
    title: '새 모임 개설 폼',
    caption: '모임 이름과 설명 설정 후 즉시 친구 초대 링크 발급',
    webpPath: '/landing/assets/captures/06-group-new.webp',
    pngPath: '/landing/assets/captures/06-group-new.png',
    width: 780,
    height: 1688,
    aspectRatio: '780/1688',
    alt: '데이유즈 새 모임 개설 폼 화면 캡처',
  },
  verificationModal: {
    id: '08-verification-modal',
    title: '사진 인증 작성 모달',
    caption: '인증 사진 프리뷰와 한마디 작성으로 간편하게 인증 완료',
    webpPath: '/landing/assets/captures/08-verification-modal.webp',
    pngPath: '/landing/assets/captures/08-verification-modal.png',
    width: 780,
    height: 1688,
    aspectRatio: '780/1688',
    alt: '데이유즈 사진 인증 작성 모달 화면 캡처',
  },
};

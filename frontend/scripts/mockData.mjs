/**
 * 화면 자동 캡처 도구에서 사용할 개인정보 배제 가명 Mock 데이터
 * (실제 프론트엔드 타입 인터페이스 100% 일치)
 */

export const MOCK_USER = {
  id: 1,
  kakaoId: '12345678',
  nickname: '류코딩',
  profileImageUrl: 'dayu:blue',
};

export const MOCK_GROUPS_EMPTY = [];

export const MOCK_GROUPS_LIST = [
  {
    id: 1,
    name: '알고리즘 & 습관 스터디',
    hostUserId: 1,
    role: 'HOST',
    memberCount: 4,
    inviteCode: 'SAMPLE',
  },
  {
    id: 2,
    name: '오운완 운동 크루',
    hostUserId: 2,
    role: 'MEMBER',
    memberCount: 5,
    inviteCode: 'CREW01',
  },
];

export const MOCK_GROUP_DETAIL = {
  id: 1,
  name: '알고리즘 & 습관 스터디',
  hostUserId: 1,
  inviteCode: 'SAMPLE',
  inviteCodeIssuedAt: '2026-03-01T00:00:00Z',
  isHost: true,
  memberCount: 4,
  members: [
    { id: 1, userId: 1, nickname: '류코딩', profileImageUrl: null, role: 'HOST', joinedAt: '2026-03-01T00:00:00Z' },
    { id: 2, userId: 2, nickname: '김운동', profileImageUrl: null, role: 'MEMBER', joinedAt: '2026-03-02T00:00:00Z' },
    { id: 3, userId: 3, nickname: '박기상', profileImageUrl: null, role: 'MEMBER', joinedAt: '2026-03-03T00:00:00Z' },
    { id: 4, userId: 4, nickname: '최독서', profileImageUrl: null, role: 'MEMBER', joinedAt: '2026-03-04T00:00:00Z' },
  ],
};

export const MOCK_GROUP_CHALLENGES = [
  {
    id: 1,
    groupId: 1,
    title: '매일 1알고리즘 문제 풀기',
    description: '백준 또는 프로그래머스 1문제 풀고 인증',
    verificationCriteria: '제출 성공 화면 캡처 또는 커밋 내역',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: 'IN_PROGRESS',
    periodType: 'DAILY',
    executionType: 'INDIVIDUAL',
    participantCount: 4,
    isParticipating: true,
  },
  {
    id: 2,
    groupId: 1,
    title: '6시 기상 습관',
    description: '일어나서 시계 사진 인증',
    verificationCriteria: '시간이 보이는 시계/알람 화면 사진',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: 'IN_PROGRESS',
    periodType: 'DAILY',
    executionType: 'INDIVIDUAL',
    participantCount: 3,
    isParticipating: true,
  },
];

export const MOCK_GROUP_FEED = {
  items: [
    {
      id: 101,
      groupId: 1,
      challengeId: 1,
      challengeTitle: '매일 1알고리즘 문제 풀기',
      userId: 1,
      authorNickname: '류코딩',
      authorProfileImageUrl: null,
      targetDate: '2026-03-28',
      imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
      comment: '오늘은 DP 골드 문제 하나 해결했습니다! ✓',
      isLate: false,
      commentCount: 2,
      isMine: true,
      createdAt: '2026-03-28T09:15:00Z',
    },
    {
      id: 102,
      groupId: 1,
      challengeId: 1,
      challengeTitle: '매일 1알고리즘 문제 풀기',
      userId: 2,
      authorNickname: '김운동',
      authorProfileImageUrl: null,
      targetDate: '2026-03-28',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
      comment: '하체 루틴 완료. 오늘도 오운완 달성!',
      isLate: false,
      commentCount: 1,
      isMine: false,
      createdAt: '2026-03-28T08:30:00Z',
    },
  ],
  pageNumber: 0,
  pageSize: 10,
  totalElements: 2,
  totalPages: 1,
  hasNext: false,
};

export const MOCK_GROUP_STATUS_SUMMARY = {
  groupId: 1,
  uncheckedCount: 2,
  unpaidPenaltyAmount: 5000,
  verifiedUserIds: [1, 2],
};

export const MOCK_UNCHECKED_RECORDS = [
  {
    id: 101,
    challengeId: 1,
    challengeTitle: '매일 1알고리즘 문제 풀기',
    date: '2026-03-28',
    status: 'UNCHECKED',
    penaltyAmount: 5000,
    verificationCriteria: '제출 성공 화면 캡처 또는 커밋 내역',
  },
  {
    id: 102,
    challengeId: 2,
    challengeTitle: '6시 기상 습관',
    date: '2026-03-27',
    status: 'UNCHECKED',
    penaltyAmount: 5000,
    verificationCriteria: '시간이 보이는 시계/알람 사진',
  },
];

export const MOCK_SETTLEMENT_SUMMARY = {
  groupId: 1,
  unpaidAmount: 10000,
  myUnpaidAmount: 5000,
  waitingAmount: 5000,
  confirmedAmount: 45000,
  totalPenaltyAmount: 60000,
  accountRegistered: true,
  account: {
    bankName: '카카오뱅크',
    accountNumber: '3333-01-9876543',
    accountHolder: '류코딩',
  },
};

export const MOCK_UNPAID_RECORDS = [
  {
    id: 201,
    recordId: 201,
    challengeId: 1,
    challengeTitle: '매일 1알고리즘 문제 풀기',
    date: '2026-03-26',
    targetDate: '2026-03-26',
    penaltyAmount: 5000,
    depositStatus: 'UNPAID',
  },
  {
    id: 202,
    recordId: 202,
    challengeId: 2,
    challengeTitle: '6시 기상 습관',
    date: '2026-03-25',
    targetDate: '2026-03-25',
    penaltyAmount: 5000,
    depositStatus: 'UNPAID',
  },
];

export const MOCK_COMMENTS = [
  {
    id: 1,
    verificationId: 101,
    userId: 2,
    authorNickname: '김운동',
    authorProfileImageUrl: null,
    content: '대단해요! 오늘 문제 난이도 꽤 높았는데 멋집니다 🔥',
    isMine: false,
    createdAt: '2026-03-28T10:00:00Z',
  },
  {
    id: 2,
    verificationId: 101,
    userId: 1,
    authorNickname: '류코딩',
    authorProfileImageUrl: null,
    content: '감사합니다! 내일도 같이 화이팅해요 💪',
    isMine: true,
    createdAt: '2026-03-28T10:15:00Z',
  },
];

export const MOCK_CHALLENGE_DETAIL = {
  id: 1,
  groupId: 1,
  title: '매일 1알고리즘 문제 풀기',
  description: '매일 백준 또는 프로그래머스 1문제를 풀고 제출 성공 화면을 인증합니다.',
  verificationCriteria: '제출 성공 화면 캡처 또는 커밋 내역',
  startDate: '2026-03-01',
  endDate: '2026-03-31',
  durationDays: 31,
  status: 'IN_PROGRESS',
  periodType: 'DAILY',
  executionType: 'INDIVIDUAL',
  targetFrequency: 1,
  penaltyAmountPerMiss: 0,
  myPenaltyAmount: 0,
  isJoined: true,
  isHost: true,
  canAbort: true,
  participantCount: 4,
  participants: [
    { id: 1, challengeId: 1, userId: 1, nickname: '류코딩', profileImageUrl: null, isCreator: true, startDate: '2026-03-01', joinedAt: '2026-03-01T00:00:00Z', consecutiveSuccessDays: 7, totalSuccessCount: 28, achievementRate: 100, completionRate: 100, penaltyAmount: 0 },
    { id: 2, challengeId: 1, userId: 2, nickname: '김운동', profileImageUrl: null, isCreator: false, startDate: '2026-03-01', joinedAt: '2026-03-02T00:00:00Z', consecutiveSuccessDays: 6, totalSuccessCount: 24, achievementRate: 85, completionRate: 85, penaltyAmount: 0 },
    { id: 3, challengeId: 1, userId: 3, nickname: '박기상', profileImageUrl: null, isCreator: false, startDate: '2026-03-01', joinedAt: '2026-03-03T00:00:00Z', consecutiveSuccessDays: 6, totalSuccessCount: 24, achievementRate: 85, completionRate: 85, penaltyAmount: 0 },
    { id: 4, challengeId: 1, userId: 4, nickname: '최독서', profileImageUrl: null, isCreator: false, startDate: '2026-03-01', joinedAt: '2026-03-04T00:00:00Z', consecutiveSuccessDays: 5, totalSuccessCount: 20, achievementRate: 71, completionRate: 71, penaltyAmount: 0 },
  ],
  intervals: [
    { index: 1, startDate: '2026-03-01', endDate: '2026-03-31', targetCount: 31, completedCount: 28, isAchieved: true },
  ],
};

export const MOCK_CHALLENGE_CALENDAR = {
  challengeId: 1,
  title: '매일 1알고리즘 문제 풀기',
  startDate: '2026-03-01',
  endDate: '2026-03-31',
  participants: [
    {
      userId: 1,
      nickname: '류코딩',
      profileImageUrl: null,
      records: [
        { date: '2026-03-22', status: 'COMPLETED', depositStatus: 'UNPAID', recordId: 1 },
        { date: '2026-03-23', status: 'COMPLETED', depositStatus: 'UNPAID', recordId: 2 },
        { date: '2026-03-24', status: 'COMPLETED', depositStatus: 'UNPAID', recordId: 3 },
        { date: '2026-03-25', status: 'COMPLETED', depositStatus: 'UNPAID', recordId: 4 },
        { date: '2026-03-26', status: 'COMPLETED', depositStatus: 'UNPAID', recordId: 5 },
        { date: '2026-03-27', status: 'COMPLETED', depositStatus: 'UNPAID', recordId: 6 },
        { date: '2026-03-28', status: 'COMPLETED', depositStatus: 'UNPAID', recordId: 7 },
      ],
    },
  ],
};

export const MOCK_TODAY_ACTIONS = [
  {
    challengeId: 1,
    challengeTitle: '매일 1알고리즘 문제 풀기',
    groupId: 1,
    groupName: '알고리즘 & 습관 스터디',
    verificationCriteria: '제출 성공 화면 캡처 또는 커밋 내역',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    isCompletedToday: false,
    canVerify: true,
    myVerification: null,
  },
  {
    challengeId: 2,
    challengeTitle: '6시 기상 습관',
    groupId: 1,
    groupName: '알고리즘 & 습관 스터디',
    verificationCriteria: '시간이 보이는 시계/알람 사진',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    isCompletedToday: true,
    canVerify: false,
    myVerification: {
      id: 99,
      imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=600&auto=format&fit=crop&q=80',
      comment: '오늘도 상쾌하게 6시 기상 완료!',
      verifiedAt: '2026-03-28T06:05:00Z',
    },
  },
];

export const MOCK_INVITE_INFO = {
  groupId: 1,
  groupName: '알고리즘 & 습관 스터디',
  hostNickname: '류코딩',
  memberCount: 4,
  inviteCode: 'SAMPLE',
};

export const MOCK_SHARE_CARD = {
  token: 'sample-share-token',
  challengeTitle: '매일 1알고리즘 문제 풀기',
  userNickname: '류코딩',
  consecutiveDays: 7,
  latestImageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
  historyJson: JSON.stringify([
    { date: '2026-03-22', inPeriod: true, completed: true },
    { date: '2026-03-23', inPeriod: true, completed: true },
    { date: '2026-03-24', inPeriod: true, completed: true },
    { date: '2026-03-25', inPeriod: true, completed: true },
    { date: '2026-03-26', inPeriod: true, completed: true },
    { date: '2026-03-27', inPeriod: true, completed: true },
    { date: '2026-03-28', inPeriod: true, completed: true },
  ]),
};

export const MOCK_NOTIFICATION_SETTINGS = {
  enabled: true,
  reminderTime: '21:00',
  hasActiveSubscription: true,
  vapidPublicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
};

export const MOCK_DEPOSIT_REPORTS = [
  {
    id: 101,
    groupId: 6,
    userId: 2,
    userNickname: '김운동',
    userProfileImageUrl: null,
    depositorName: '김운동',
    depositDate: '2026-03-28',
    totalAmount: 5000,
    status: 'WAITING_CONFIRMATION',
    createdAt: '2026-03-28T14:20:00Z',
    items: [
      {
        id: 1,
        challengeId: 1,
        challengeTitle: '매일 1알고리즘 문제 풀기',
        date: '2026-03-27',
        penaltyAmount: 5000,
      },
    ],
    auditLogs: [],
  },
  {
    id: 102,
    groupId: 6,
    userId: 3,
    userNickname: '박기상',
    userProfileImageUrl: null,
    depositorName: '박기상',
    depositDate: '2026-03-26',
    totalAmount: 5000,
    status: 'CONFIRMED',
    processedByNickname: '류코딩',
    processedAt: '2026-03-26T18:00:00Z',
    createdAt: '2026-03-26T17:30:00Z',
    items: [
      {
        id: 2,
        challengeId: 2,
        challengeTitle: '6시 기상 습관',
        date: '2026-03-25',
        penaltyAmount: 5000,
      },
    ],
    auditLogs: [],
  },
];

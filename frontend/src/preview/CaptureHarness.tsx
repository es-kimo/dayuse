import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { DayuLogo } from '../components/brand/DayuLogo';
import { Plus, Users, Calendar, CheckCircle2, ChevronRight, Copy, ArrowLeft, Trophy, Crown, Sparkles, Camera, ShieldCheck } from 'lucide-react';

interface MockUser {
  nickname: string;
  avatar: string;
}

interface MockGroup {
  id: number;
  name: string;
  role: 'HOST' | 'MEMBER';
  activeChallengeCount: number;
  memberCount: number;
}

interface MockFeedItem {
  id: number;
  challengeName: string;
  userNickname: string;
  userProfileImage: string;
  imageUrl: string;
  comment: string;
  verifiedAt: string;
}

interface MockTodayAction {
  challengeId: number;
  challengeName: string;
  status: 'PENDING' | 'VERIFIED';
  verificationCondition: string;
  consecutiveDays: number;
  comment?: string;
}

export const mockMaskedData: {
  user: MockUser;
  groups: MockGroup[];
  feedItems: MockFeedItem[];
  todayActions: MockTodayAction[];
} = {
  user: {
    nickname: '류코딩',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  groups: [
    {
      id: 1,
      name: '알고리즘 & 습관 스터디',
      role: 'HOST',
      activeChallengeCount: 3,
      memberCount: 4,
    },
    {
      id: 2,
      name: '오운완 운동 크루',
      role: 'MEMBER',
      activeChallengeCount: 2,
      memberCount: 5,
    },
  ],
  feedItems: [
    {
      id: 101,
      challengeName: '매일 1알고리즘 문제 풀기',
      userNickname: '류코딩',
      userProfileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
      comment: '오늘은 DP 골드 문제 하나 해결했습니다! ✓',
      verifiedAt: '09:15',
    },
    {
      id: 102,
      challengeName: '주 3회 헬스장 운동',
      userNickname: '김운동',
      userProfileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
      comment: '하체 루틴 완료. 오늘도 오운완 달성!',
      verifiedAt: '08:30',
    },
  ],
  todayActions: [
    {
      challengeId: 1,
      challengeName: '매일 1알고리즘 문제 풀기',
      status: 'PENDING',
      verificationCondition: '제출 성공 화면 캡처 또는 커밋 내역',
      consecutiveDays: 7,
    },
    {
      challengeId: 2,
      challengeName: '6시 기상 습관',
      status: 'VERIFIED',
      verificationCondition: '시간이 찍힌 기상 사진',
      consecutiveDays: 14,
      comment: '오늘도 상쾌하게 6시 기상 완료!',
    },
  ],
};

export const CaptureHarness: React.FC = () => {
  const [searchParams] = useSearchParams();
  const screen = searchParams.get('screen') || 'overview';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-6 px-4">
      {screen === 'overview' && (
        <div className="w-full max-w-2xl bg-slate-800 p-6 rounded-2xl shadow-xl mb-6">
          <div className="flex items-center gap-3 mb-4">
            <DayuLogo className="h-8 w-auto text-primary" />
            <h1 className="text-xl font-bold">화면 캡처 테스트 하네스</h1>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            시스템 내 모든 페이지를 개인정보 없는 가명 데이터로 미리보고 캡처합니다. 아래 화면 링크를 클릭하거나 캡처 스크립트를 실행하세요.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              ['01-groups-empty', '모임 목록 (빈 상태)'],
              ['02-groups-list', '모임 목록 (2개 모임)'],
              ['03-group-feed', '모임 피드 (대표 UI)'],
              ['04-challenge-calendar', '챌린지 캘린더/통계'],
              ['05-today-actions', '오늘 할 일 목록'],
              ['06-group-new', '새 모임 만들기'],
              ['07-challenge-new', '새 챌린지 만들기'],
              ['08-verification-modal', '인증 작성 모달'],
              ['09-share-card', '인증 공유 카드'],
              ['10-invite-landing', '초대 수락 랜딩'],
              ['11-login', '로그인 페이지'],
              ['12-profile', '프로필 페이지'],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`/__capture?screen=${id}`}
                className="p-2.5 bg-slate-700/60 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors flex items-center justify-between"
              >
                <span>{label}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 390x844 모바일 뷰포트 시뮬레이션 컨테이너 */}
      <div
        id="capture-target"
        className="w-[390px] min-h-[844px] bg-slate-50 text-slate-900 rounded-[32px] overflow-hidden shadow-2xl border-4 border-slate-700 relative flex flex-col"
        data-screen={screen}
      >
        {/* 상단 상태 표시줄 시뮬레이션 */}
        <div className="h-11 bg-white px-6 flex items-center justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 select-none">
          <span>09:41</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            <span className="w-4 h-2.5 rounded-sm bg-slate-400"></span>
          </div>
        </div>

        {/* 01. 모임 목록 빈 상태 */}
        {screen === '01-groups-empty' && (
          <div className="flex-1 flex flex-col bg-slate-50">
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-lg text-slate-900">내 모임</span>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" /> 모임 만들기
              </Button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-primary flex items-center justify-center mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-slate-800 mb-1">아직 참여 중인 모임이 없어요</h2>
              <p className="text-xs text-slate-500 mb-6">친구들과 함께할 모임을 만들거나 초대 코드로 가입해 보세요.</p>
              <Button className="w-full mb-3">새 모임 만들기</Button>
              <div className="w-full flex gap-2">
                <Input placeholder="초대 코드 입력" className="text-xs" />
                <Button variant="secondary" className="whitespace-nowrap">참여</Button>
              </div>
            </div>
          </div>
        )}

        {/* 02. 모임 목록 리스트 */}
        {screen === '02-groups-list' && (
          <div className="flex-1 flex flex-col bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="font-bold text-xl text-slate-900">내 모임</h1>
                <p className="text-xs text-slate-500">참여 중인 2개의 모임</p>
              </div>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" /> 모임 만들기
              </Button>
            </div>

            <div className="space-y-3">
              {mockMaskedData.groups.map((group) => (
                <div key={group.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-base">{group.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-primary flex items-center gap-1">
                      <Crown className="w-3 h-3" /> 방장
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {group.memberCount}명</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> 챌린지 {group.activeChallengeCount}개</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50/60 rounded-2xl border border-blue-100">
              <h3 className="text-xs font-bold text-blue-950 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> 초대 코드로 바로 참여하기
              </h3>
              <p className="text-[11px] text-blue-700/80 mb-3">친구에게 받은 6자리 초대 코드가 있다면 입력하세요.</p>
              <div className="flex gap-2">
                <Input placeholder="예: DAYUSE" className="bg-white text-xs h-9" />
                <Button size="sm" className="h-9">입장</Button>
              </div>
            </div>
          </div>
        )}

        {/* 03. 모임 상세 피드 (대표 UI 화면) */}
        {screen === '03-group-feed' && (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
            {/* 상단 모임 헤더 */}
            <div className="p-4 bg-white border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                  <h1 className="font-bold text-base text-slate-900">알고리즘 & 습관 스터디</h1>
                </div>
                <button className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium transition-colors">
                  <Copy className="w-3 h-3" /> 초대 링크
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>멤버 4명</span>
                <span>•</span>
                <span>진행 중 챌린지 3개</span>
              </div>
            </div>

            {/* 오늘 인증 상태 요약 */}
            <div className="p-4">
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-slate-800">오늘 4명 중 3명 인증 완료!</span>
                </div>
                <span className="text-[11px] font-bold text-primary">75% 달성</span>
              </div>

              {/* 피드 섹션 */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-slate-400 tracking-wider">오늘 올라온 인증 피드</h2>
                {mockMaskedData.feedItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={item.userProfileImage} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <div className="text-xs font-bold text-slate-800">{item.userNickname}</div>
                          <div className="text-[10px] text-slate-400">{item.challengeName}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">{item.verifiedAt}</span>
                    </div>
                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                      <img src={item.imageUrl} alt="인증 사진" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-slate-800 font-medium">{item.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 04. 챌린지 캘린더 / 기록 화면 */}
        {screen === '04-challenge-calendar' && (
          <div className="flex-1 flex flex-col bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
              <h1 className="font-bold text-base text-slate-900">챌린지 상세 및 기록</h1>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600 mb-2 inline-block">
                7일 연속 달성 중 🔥
              </span>
              <h2 className="text-base font-bold text-slate-900 mb-1">매일 1알고리즘 문제 풀기</h2>
              <p className="text-xs text-slate-500 mb-4">목표: 매일 백준/프로그래머스 1문제 인증</p>

              {/* 7일 연속 잔디 / 체크 시뮬레이션 */}
              <div className="grid grid-cols-7 gap-1.5 text-center pt-2 border-t border-slate-100">
                {['월', '화', '수', '목', '금', '토', '일'].map((day, idx) => (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400">{day}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      idx < 6 ? 'bg-primary text-white shadow-sm' : 'bg-blue-100 text-primary border border-blue-300'
                    }`}>
                      {idx < 6 ? '✓' : '오늘'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 참가자별 현황 */}
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 mb-3">함께 도전하는 친구들 (4명)</h3>
              <div className="space-y-3">
                {[
                  { name: '류코딩', count: '7/7일', rate: '100%' },
                  { name: '김운동', count: '6/7일', rate: '85%' },
                  { name: '박기상', count: '6/7일', rate: '85%' },
                  { name: '최독서', count: '5/7일', rate: '71%' },
                ].map((user) => (
                  <div key={user.name} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{user.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{user.count}</span>
                      <span className="font-bold text-primary">{user.rate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 05. 오늘 할 일 (Today) 화면 */}
        {screen === '05-today-actions' && (
          <div className="flex-1 flex flex-col bg-slate-50 p-4">
            <div className="mb-4">
              <h1 className="font-bold text-xl text-slate-900">오늘의 챌린지</h1>
              <p className="text-xs text-slate-500">2개의 챌린지 중 1개 완료</p>
            </div>

            <div className="space-y-3">
              {/* 인증 대기 카드 */}
              <div className="p-4 bg-white rounded-2xl border-2 border-blue-500/30 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-primary">인증 필요</span>
                  <span className="text-xs text-slate-400">7일 연속 중</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mb-1">매일 1알고리즘 문제 풀기</h2>
                <p className="text-xs text-slate-500 mb-4">기준: 제출 성공 화면 캡처 또는 커밋 내역</p>
                <Button className="w-full gap-1.5 h-10">
                  <Camera className="w-4 h-4" /> 지금 사진 인증하기
                </Button>
              </div>

              {/* 인증 완료 카드 */}
              <div className="p-4 bg-white/80 rounded-2xl border border-slate-100 shadow-sm opacity-90">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 오늘 인증 완료
                  </span>
                  <span className="text-xs text-slate-400">오전 06:05</span>
                </div>
                <h2 className="text-sm font-semibold text-slate-800">6시 기상 습관</h2>
                <p className="text-xs text-slate-400 mt-1">"오늘도 상쾌하게 6시 기상 완료!"</p>
              </div>
            </div>
          </div>
        )}

        {/* 06. 새 모임 만들기 */}
        {screen === '06-group-new' && (
          <div className="flex-1 flex flex-col bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
              <h1 className="font-bold text-base text-slate-900">새 모임 만들기</h1>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">모임 이름</label>
                <Input value="알고리즘 & 습관 스터디" readOnly className="text-xs font-semibold" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">모임 설명</label>
                <Input value="친구들과 각자 목표를 인증하고 기록하는 모임" readOnly className="text-xs text-slate-600" />
              </div>
              <div className="pt-2">
                <Button className="w-full">모임 개설하고 친구 초대하기</Button>
              </div>
            </div>
          </div>
        )}

        {/* 07. 새 챌린지 만들기 */}
        {screen === '07-challenge-new' && (
          <div className="flex-1 flex flex-col bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
              <h1 className="font-bold text-base text-slate-900">챌린지 개설</h1>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">챌린지 제목</label>
                <Input value="매일 1알고리즘 문제 풀기" readOnly className="text-xs font-semibold" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">수행 요일</label>
                <div className="flex gap-1">
                  {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
                    <div key={d} className="flex-1 py-1.5 text-center text-xs font-bold bg-primary text-white rounded-lg">
                      {d}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">인증 기준 안내</label>
                <Input value="제출 성공 화면 캡처 또는 커밋 내역" readOnly className="text-xs text-slate-600" />
              </div>
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-900">미수행 벌금은 0원으로 부담 없이 설정할 수 있습니다.</p>
              </div>
              <Button className="w-full">챌린지 등록하기</Button>
            </div>
          </div>
        )}

        {/* 08. 인증 작성 모달 */}
        {screen === '08-verification-modal' && (
          <div className="flex-1 flex flex-col bg-slate-900/60 p-4 justify-end">
            <div className="bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="font-bold text-base text-slate-900">오늘 사진 인증</h2>
                  <p className="text-xs text-slate-500">매일 1알고리즘 문제 풀기</p>
                </div>
                <span className="text-xs font-bold text-primary">03.28</span>
              </div>
              <div className="aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80"
                  alt="인증 프리뷰"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded-md font-medium">
                  ✓ 제출 성공
                </span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">한마디 남기기</label>
                <Input value="오늘은 DP 문제 하나 풀었어요 ✓" readOnly className="text-xs" />
              </div>
              <Button className="w-full h-11 text-sm font-bold">인증 완료하기</Button>
            </div>
          </div>
        )}

        {/* 09. 인증 공유 카드 */}
        {screen === '09-share-card' && (
          <div className="flex-1 flex flex-col bg-slate-100 p-4 items-center justify-center">
            <div className="w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <DayuLogo className="h-5 w-auto text-primary" />
                <span className="text-xs font-bold text-slate-800">dayuse</span>
              </div>
              <div className="my-3">
                <span className="text-3xl font-extrabold text-primary">7</span>
                <span className="text-base font-bold text-slate-700">일 연속</span>
              </div>
              <h2 className="font-bold text-base text-slate-900 mb-1">매일 1알고리즘 문제 풀기</h2>
              <p className="text-xs text-slate-500 mb-4">류코딩 님의 연속 챌린지 인증</p>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-4 shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-slate-400 font-medium">목표는 각자, 꾸준함은 함께.</p>
            </div>
          </div>
        )}

        {/* 10. 초대 수락 랜딩 */}
        {screen === '10-invite-landing' && (
          <div className="flex-1 flex flex-col bg-slate-50 p-6 items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-primary flex items-center justify-center mb-4">
              <Users className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold text-primary mb-1">모임 초대장</span>
            <h1 className="text-xl font-bold text-slate-900 mb-2">알고리즘 & 습관 스터디</h1>
            <p className="text-xs text-slate-600 mb-6">
              <strong className="text-slate-900">류코딩</strong> 님이 모임에 초대했습니다.<br />
              함께 각자의 챌린지를 인증하고 기록해 보세요!
            </p>
            <div className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 text-left">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">진행 중인 챌린지</span>
              <ul className="text-xs space-y-1.5 text-slate-700">
                <li>• 매일 1알고리즘 문제 풀기</li>
                <li>• 주 3회 헬스장 운동</li>
                <li>• 6시 기상 습관</li>
              </ul>
            </div>
            <Button className="w-full h-11 font-bold">초대 수락하고 시작하기</Button>
          </div>
        )}

        {/* 11. 로그인 페이지 */}
        {screen === '11-login' && (
          <div className="flex-1 flex flex-col bg-slate-50 p-6 items-center justify-center text-center">
            <div className="mb-6 flex flex-col items-center">
              <DayuLogo className="h-10 w-auto text-primary mb-3" />
              <h1 className="text-2xl font-black text-slate-900">dayuse</h1>
              <p className="text-xs text-slate-500 mt-1">목표는 각자, 꾸준함은 함께.</p>
            </div>
            <div className="w-full space-y-3 mt-6">
              <button className="w-full h-12 bg-[#FEE500] hover:bg-[#FDD800] text-black font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
                <span className="w-4 h-4 rounded-full bg-black/80"></span>
                카카오로 시작하기
              </button>
            </div>
          </div>
        )}

        {/* 12. 프로필 페이지 */}
        {screen === '12-profile' && (
          <div className="flex-1 flex flex-col bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
              <h1 className="font-bold text-base text-slate-900">내 프로필</h1>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 mb-4">
              <img src={mockMaskedData.user.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <h2 className="font-bold text-base text-slate-900">{mockMaskedData.user.nickname}</h2>
                <p className="text-xs text-slate-500">참여 챌린지 2개 진행 중</p>
              </div>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">누적 인증 횟수</span>
                <span className="font-bold text-slate-900">42회</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">최대 연속 달성</span>
                <span className="font-bold text-primary">14일</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

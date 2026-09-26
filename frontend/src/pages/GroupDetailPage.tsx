import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import { challengesApi } from '../api/challenges';
import { todayApi } from '../api/today';
import { verificationsApi } from '../api/verifications';
import { recordsApi } from '../api/records';
import { settlementApi } from '../api/settlement';
import type {
  GroupDetail,
  ChallengeSummary,
  TodayAction,
  FeedItem,
  StatusSummaryResponse,
  UncheckedRecordItem,
  SettlementSummary,
} from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { TodayActionSection } from '../components/TodayActionSection';
import { VerificationModal } from '../components/VerificationModal';
import { GroupFeedSection } from '../components/GroupFeedSection';
import { CommentsBottomSheet } from '../components/CommentsBottomSheet';
import { GroupStatusSummaryBanner } from '../components/GroupStatusSummaryBanner';
import { UncheckedRecordsBottomSheet } from '../components/UncheckedRecordsBottomSheet';
import { GroupSettlementCard } from '../components/GroupSettlementCard';
import { DepositReportModal } from '../components/DepositReportModal';
import { formatKstDate } from '../utils/date';
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  Crown,
  User as UserIcon,
  Loader2,
  Trophy,
  Plus,
  Calendar,
  Clock,
  ChevronRight,
  Home,
  UserCheck,
} from 'lucide-react';

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab: 'home' | 'challenges' | 'members' =
    tabParam === 'challenges' || tabParam === 'members'
      ? tabParam
      : location.pathname.endsWith('/challenges')
      ? 'challenges'
      : 'home';

  const handleTabChange = (tab: 'home' | 'challenges' | 'members') => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'home') {
          next.delete('tab');
        } else {
          next.set('tab', tab);
        }
        return next;
      },
      { replace: false }
    );
  };

  const [challengeFilter, setChallengeFilter] = useState<string>('ALL');
  // 상태 필터와 별개의 축이라 AND로 함께 적용한다.
  const [onlyParticipating, setOnlyParticipating] = useState<boolean>(false);

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [challengesLoading, setChallengesLoading] = useState<boolean>(false);

  // 오늘 할 일 상태
  const [todayActions, setTodayActions] = useState<TodayAction[]>([]);
  const [todayLoading, setTodayLoading] = useState<boolean>(false);

  // 미확인/미수행 상태 요약
  const [statusSummary, setStatusSummary] = useState<StatusSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [uncheckedRecords, setUncheckedRecords] = useState<UncheckedRecordItem[]>([]);
  const [uncheckedLoading, setUncheckedLoading] = useState<boolean>(false);
  const [showUncheckedSheet, setShowUncheckedSheet] = useState<boolean>(false);
  const [lateVerificationTarget, setLateVerificationTarget] = useState<{
    recordId: number;
    action: { challengeId: number; challengeTitle: string; verificationCriteria?: string };
    targetDate?: string;
  } | null>(null);

  // 정산 및 계좌 상태 (F07)
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary | null>(null);
  const [settlementLoading, setSettlementLoading] = useState<boolean>(false);
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);

  // 모임 피드 상태
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState<boolean>(false);
  const [feedPage, setFeedPage] = useState<number>(0);
  const [hasMoreFeed, setHasMoreFeed] = useState<boolean>(false);
  const [loadingMoreFeed, setLoadingMoreFeed] = useState<boolean>(false);

  // 모달 및 바텀시트 상태
  const [activeVerificationAction, setActiveVerificationAction] = useState<TodayAction | null>(null);
  const [activeCommentVerificationId, setActiveCommentVerificationId] = useState<number | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchGroup = async () => {
    if (!groupId) return;
    try {
      const data = await groupsApi.getGroupDetail(Number(groupId));
      setGroup(data);
    } catch (err: any) {
      console.error('Failed to fetch group detail:', err);
      if (err.response?.status === 403) {
        setErrorStatus(403);
      } else if (err.response?.status === 404) {
        setErrorStatus(404);
      } else {
        setErrorStatus(500);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayActions = async () => {
    if (!groupId) return;
    setTodayLoading(true);
    try {
      const actions = await todayApi.getTodayActions(Number(groupId));
      setTodayActions(actions);
    } catch (err) {
      console.error('Failed to fetch today actions:', err);
    } finally {
      setTodayLoading(false);
    }
  };

  const fetchFeed = async (page = 0) => {
    if (!groupId) return;
    if (page === 0) {
      setFeedLoading(true);
    } else {
      setLoadingMoreFeed(true);
    }

    try {
      const data = await verificationsApi.getGroupFeed(Number(groupId), page, 10);
      if (page === 0) {
        setFeedItems(data.items);
      } else {
        setFeedItems((prev) => [...prev, ...data.items]);
      }
      setFeedPage(data.pageNumber);
      setHasMoreFeed(data.hasNext);
    } catch (err) {
      console.error('Failed to fetch group feed:', err);
    } finally {
      setFeedLoading(false);
      setLoadingMoreFeed(false);
    }
  };

  const fetchSettlementSummary = async () => {
    if (!groupId) return;
    setSettlementLoading(true);
    try {
      const data = await settlementApi.getSettlementSummary(Number(groupId));
      setSettlementSummary(data);
    } catch (err) {
      console.error('Failed to fetch settlement summary:', err);
    } finally {
      setSettlementLoading(false);
    }
  };

  const fetchStatusSummary = async () => {
    if (!groupId) return;
    setSummaryLoading(true);
    try {
      const data = await recordsApi.getStatusSummary(Number(groupId));
      setStatusSummary(data);
    } catch (err) {
      console.error('Failed to fetch status summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchUncheckedRecords = async () => {
    if (!groupId) return;
    setUncheckedLoading(true);
    try {
      const data = await recordsApi.getUncheckedRecords(Number(groupId));
      setUncheckedRecords(data);
    } catch (err) {
      console.error('Failed to fetch unchecked records:', err);
    } finally {
      setUncheckedLoading(false);
    }
  };

  const handleOpenUncheckedSheet = () => {
    setShowUncheckedSheet(true);
    fetchUncheckedRecords();
  };

  const handleMarkFailed = async (recordId: number) => {
    try {
      await recordsApi.markFailed(recordId);
      await fetchStatusSummary();
      await fetchSettlementSummary();
      await fetchUncheckedRecords();
    } catch (err: any) {
      console.error('Failed to mark failed:', err);
      alert(err.response?.data?.message || '미수행 확정에 실패했습니다.');
    }
  };

  const handleStartVerifyLate = (record: UncheckedRecordItem) => {
    setLateVerificationTarget({
      recordId: record.id,
      action: {
        challengeId: record.challengeId,
        challengeTitle: record.challengeTitle,
        verificationCriteria: record.verificationCriteria,
      },
      targetDate: record.date,
    });
  };

  const handleLateVerificationSuccess = () => {
    setLateVerificationTarget(null);
    fetchStatusSummary();
    fetchSettlementSummary();
    fetchUncheckedRecords();
    fetchTodayActions();
    fetchFeed(0);
  };

  const fetchChallenges = async () => {
    if (!groupId) return;
    setChallengesLoading(true);
    try {
      const list = await challengesApi.getGroupChallenges(Number(groupId));
      setChallenges(list);
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
    } finally {
      setChallengesLoading(false);
    }
  };

  const myChallengeCount = challenges.filter((c) => c.isParticipating).length;

  const filteredChallenges = challenges.filter(
    (c) =>
      (challengeFilter === 'ALL' || c.status === challengeFilter) &&
      (!onlyParticipating || c.isParticipating)
  );

  useEffect(() => {
    fetchGroup();
    fetchChallenges();
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      if (activeTab === 'home') {
        fetchStatusSummary();
        fetchSettlementSummary();
        fetchTodayActions();
        fetchFeed(0);
      } else if (activeTab === 'challenges') {
        fetchChallenges();
      }
    }
  }, [groupId, activeTab]);

  const handleVerificationSuccess = () => {
    setActiveVerificationAction(null);
    fetchStatusSummary();
    fetchSettlementSummary();
    fetchTodayActions();
    fetchFeed(0);
  };

  const handleDeleteVerification = async (verificationId: number) => {
    try {
      await verificationsApi.deleteVerification(verificationId);
      setFeedItems((prev) => prev.filter((item) => item.id !== verificationId));
      fetchStatusSummary();
      fetchTodayActions();
    } catch (err) {
      console.error('Failed to delete verification:', err);
      alert('인증 삭제에 실패했습니다.');
    }
  };

  const handleCommentCountChange = (delta: number) => {
    if (!activeCommentVerificationId) return;
    setFeedItems((prev) =>
      prev.map((item) =>
        item.id === activeCommentVerificationId
          ? { ...item, commentCount: Math.max(0, item.commentCount + delta) }
          : item
      )
    );
  };

  const inviteUrl = group ? `${window.location.origin}/invite/${group.inviteCode}` : '';

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshInviteCode = async () => {
    if (!group || !window.confirm('초대 코드를 재발급하시겠습니까?\n기존에 공유된 초대 링크는 즉시 무효화됩니다.')) {
      return;
    }
    setIsRefreshing(true);
    try {
      const refreshed = await groupsApi.refreshInviteCode(group.id);
      setGroup({
        ...group,
        inviteCode: refreshed.inviteCode,
        inviteCodeIssuedAt: refreshed.inviteCodeIssuedAt,
      });
      alert('새로운 초대 링크가 발급되었습니다.');
    } catch (err) {
      console.error('Failed to refresh invite code:', err);
      alert('초대 코드 재발급에 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (errorStatus === 403) {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">접근 권한이 없습니다</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-xs">
            해당 모임의 멤버만 내용을 조회할 수 있습니다. (403 Forbidden)
          </p>
          <button
            onClick={() => navigate('/groups')}
            className="px-4 py-2 bg-slate-800 text-white rounded-md text-xs font-medium"
          >
            내 모임 목록으로 돌아가기
          </button>
        </div>
      </MobileLayout>
    );
  }

  if (!group || errorStatus === 404) {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <h2 className="text-lg font-bold text-slate-800 mb-1">모임을 찾을 수 없습니다</h2>
          <button
            onClick={() => navigate('/groups')}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-md text-xs font-medium"
          >
            내 모임 목록으로
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      {/* 상단 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate('/groups')}
          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 truncate flex-1">{group.name}</h1>
        {group.isHost && (
          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Crown className="w-3 h-3" />
            모임장
          </span>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-slate-200 mb-4">
        <button
          onClick={() => handleTabChange('home')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'home'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>홈</span>
        </button>
        <button
          onClick={() => handleTabChange('challenges')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'challenges'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>챌린지 ({challenges.length})</span>
        </button>
        <button
          onClick={() => handleTabChange('members')}
          className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'members'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>멤버 ({group.members.length})</span>
        </button>
      </div>

      {activeTab === 'home' && (
        <div className="space-y-6 flex-1 flex flex-col">
          {/* 상단: 미확인 기록 및 미납 벌금 요약 배너 */}
          <GroupStatusSummaryBanner
            summary={statusSummary}
            loading={summaryLoading}
            onOpenUncheckedSheet={handleOpenUncheckedSheet}
          />

          {/* 모임 정산 & 계좌 카드 (F07) */}
          <GroupSettlementCard
            groupId={Number(groupId)}
            isHost={!!group?.isHost}
            summary={settlementSummary}
            loading={settlementLoading}
            onRefresh={() => {
              fetchSettlementSummary();
              fetchStatusSummary();
            }}
            onOpenDepositModal={() => setShowDepositModal(true)}
          />

          {/* 오늘 할 일 */}
          <TodayActionSection
            todayActions={todayActions}
            loading={todayLoading}
            onOpenVerificationModal={(action) => setActiveVerificationAction(action)}
          />

          <hr className="border-slate-200/80 -mx-4" />

          {/* 하단: 모임 피드 */}
          <GroupFeedSection
            feedItems={feedItems}
            loading={feedLoading}
            hasMore={hasMoreFeed}
            onLoadMore={() => fetchFeed(feedPage + 1)}
            loadingMore={loadingMoreFeed}
            onOpenComments={(verificationId) => setActiveCommentVerificationId(verificationId)}
            onDeleteVerification={handleDeleteVerification}
          />
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-4 flex-1 flex flex-col">
          {/*
            챌린지 상단 바.

            필터와 만들기 버튼을 한 줄에 두면 390px에서 폭이 모자라 마지막 필터가 잘린다.
            가로 스크롤 안으로 숨은 필터는 있어도 못 찾으므로 줄을 나눈다.
          */}
          <div className="space-y-2">
            <div
              className="flex items-center gap-1 overflow-x-auto -mx-4 px-4"
              role="group"
              aria-label="챌린지 필터"
            >
              {[
                { label: '전체', value: 'ALL' },
                { label: '진행 중', value: 'IN_PROGRESS' },
                { label: '시작 전', value: 'NOT_STARTED' },
                { label: '종료', value: 'ENDED' },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setChallengeFilter(f.value)}
                  aria-pressed={challengeFilter === f.value}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                    challengeFilter === f.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <span className="w-px h-4 bg-slate-200 shrink-0 mx-0.5" aria-hidden="true" />

              {/* 상태 필터와 다른 축이라 함께 적용되는 토글이다 */}
              <button
                type="button"
                onClick={() => setOnlyParticipating((prev) => !prev)}
                aria-pressed={onlyParticipating}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1 ${
                  onlyParticipating
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3 h-3" aria-hidden="true" />
                <span>내 참여 {myChallengeCount}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate(`/groups/${group.id}/challenges/new`)}
                className="min-h-[36px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium rounded-md flex items-center gap-1 shadow-xs shrink-0 transition"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>챌린지 만들기</span>
              </button>
            </div>
          </div>

          {/* 챌린지 목록 */}
          {challengesLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : challenges.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-200 rounded-lg text-center my-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">아직 등록된 챌린지가 없습니다.</h3>
              <p className="text-xs text-slate-500 mb-5 max-w-xs leading-relaxed">
                모임원들과 함께 매일 실천할 첫 번째 챌린지를 만들어 보세요.
              </p>
              <button
                onClick={() => navigate(`/groups/${group.id}/challenges/new`)}
                className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition shadow-xs active:scale-[0.98] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>새 챌린지 만들기</span>
              </button>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-200 rounded-lg text-center my-4">
              <p className="text-xs text-slate-400">
                {onlyParticipating
                  ? '참여 중인 챌린지가 없습니다.'
                  : '해당 상태의 챌린지가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {filteredChallenges.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/challenges/${c.id}`)}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-lg p-4 shadow-xs transition cursor-pointer active:scale-[0.98] space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {c.status === 'IN_PROGRESS' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            진행 중
                          </span>
                        )}
                        {c.status === 'NOT_STARTED' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            시작 전
                          </span>
                        )}
                        {c.status === 'ENDED' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            종료
                          </span>
                        )}

                        {c.isParticipating && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            참여 중
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{c.title}</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                  </div>

                  {c.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.startDate} ~ {c.endDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>참여자 {c.participantCount}명</span>
                      {c.myPenaltyAmount && (
                        <span className="text-amber-600 font-medium">
                          {c.myPenaltyAmount.toLocaleString()}원/일
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4 flex-1">
          {/* 초대 링크 관리 카드 */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">모임 초대 링크</span>
              {group.isHost && (
                <button
                  onClick={handleRefreshInviteCode}
                  disabled={isRefreshing}
                  className="text-[11px] text-slate-400 hover:text-blue-600 flex items-center gap-1 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  코드 재발급
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              비공개 모임입니다. 초대 링크를 받은 사람만 가입할 수 있습니다.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 text-base bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2 text-slate-600 truncate outline-hidden select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md flex items-center gap-1 shadow-xs transition active:scale-[0.98]"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사됨' : '복사'}</span>
              </button>
            </div>
          </div>

          {/* 모임 멤버 목록 */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-700">모임 멤버 ({group.members.length}명)</h2>
            </div>

            <div className="flex flex-col divide-y divide-slate-100">
              {group.members.map((member) => (
                <div key={member.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {member.profileImageUrl ? (
                      <img
                        src={member.profileImageUrl}
                        alt={member.nickname}
                        className="w-8 h-8 rounded-full object-cover border border-slate-100"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-medium text-slate-800 flex items-center gap-1">
                        {member.nickname}
                        {member.role === 'HOST' && (
                          <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded font-semibold">
                            모임장
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatKstDate(member.joinedAt)} 가입
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 사진 인증 모달 (오늘 인증) */}
      {activeVerificationAction && (
        <VerificationModal
          action={activeVerificationAction}
          onClose={() => setActiveVerificationAction(null)}
          onSuccess={handleVerificationSuccess}
        />
      )}

      {/* 미확인 기록 정리 바텀시트 */}
      <UncheckedRecordsBottomSheet
        isOpen={showUncheckedSheet}
        onClose={() => setShowUncheckedSheet(false)}
        records={uncheckedRecords}
        loading={uncheckedLoading}
        onMarkFailed={handleMarkFailed}
        onStartVerifyLate={handleStartVerifyLate}
      />

      {/* 사진 인증 모달 (늦은 인증) */}
      {lateVerificationTarget && (
        <VerificationModal
          action={lateVerificationTarget.action}
          recordId={lateVerificationTarget.recordId}
          targetDate={lateVerificationTarget.targetDate}
          onClose={() => setLateVerificationTarget(null)}
          onSuccess={handleLateVerificationSuccess}
        />
      )}

      {/* 댓글 바텀시트 */}
      <CommentsBottomSheet
        isOpen={activeCommentVerificationId !== null}
        verificationId={activeCommentVerificationId}
        onClose={() => setActiveCommentVerificationId(null)}
        onCommentCountChange={handleCommentCountChange}
      />

      {/* 미수행 입금 신고 모달 */}
      <DepositReportModal
        groupId={Number(groupId)}
        isOpen={showDepositModal}
        account={settlementSummary?.account}
        onClose={() => setShowDepositModal(false)}
        onSuccess={() => {
          fetchSettlementSummary();
          fetchStatusSummary();
          fetchUncheckedRecords();
        }}
      />
    </MobileLayout>
  );
};

import { GroupHomeScreen } from "../components/screens/GroupHomeScreen";
import { UncheckedRecordsCard } from "../components/screens/UncheckedRecordsCard";
import { RedayActionCard, type RedayActionItem } from "../components/RedayActionCard";
import { RedayTicketSheet } from "../components/RedayTicketSheet";
import { redayApi } from "../api/reday";
import { GroupChallengesViewB } from "../components/GroupChallengesViewB";
import { GroupMembersViewB } from "../components/GroupMembersViewB";
import { Lightbox } from "../components/ui/Lightbox";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { groupsApi } from "../api/groups";
import { challengesApi } from "../api/challenges";
import { todayApi } from "../api/today";
import { verificationsApi } from "../api/verifications";
import { recordsApi } from "../api/records";
import { settlementApi } from "../api/settlement";
import { useAuth } from "../context/AuthContext";
import type {
  GroupDetail,
  ChallengeSummary,
  TodayAction,
  FeedItem,
  StatusSummaryResponse,
  UncheckedRecordItem,
  SettlementSummary,
  RedayCandidate,
} from "../types";
import { MobileLayout } from "../components/MobileLayout";
import { VerificationModal } from "../components/VerificationModal";
import { GroupFeedSection } from "../components/GroupFeedSection";
import { CommentsBottomSheet } from "../components/CommentsBottomSheet";
import { UncheckedRecordsBottomSheet } from "../components/UncheckedRecordsBottomSheet";
import { GroupSettlementCard } from "../components/GroupSettlementCard";
import { DepositReportModal } from "../components/DepositReportModal";
import { ShieldAlert, Loader2 } from "lucide-react";

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: "home" | "challenges" | "members" =
    tabParam === "challenges" || tabParam === "members"
      ? tabParam
      : location.pathname.endsWith("/challenges")
        ? "challenges"
        : "home";

  const handleTabChange = (tab: "home" | "challenges" | "members") => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "home") {
          next.delete("tab");
        } else {
          next.set("tab", tab);
        }
        return next;
      },
      { replace: false },
    );
  };

  const [homeImage, setHomeImage] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [challengesLoading, setChallengesLoading] = useState<boolean>(false);

  // 오늘 할 일 상태
  const [todayActions, setTodayActions] = useState<TodayAction[]>([]);
  const [todayLoading, setTodayLoading] = useState<boolean>(false);

  // 미확인/미수행 상태 요약
  const [statusSummary, setStatusSummary] = useState<StatusSummaryResponse | null>(null);
  const [uncheckedRecords, setUncheckedRecords] = useState<UncheckedRecordItem[]>([]);
  const [uncheckedLoading, setUncheckedLoading] = useState<boolean>(false);
  const [showUncheckedSheet, setShowUncheckedSheet] = useState<boolean>(false);
  /** 모임 안에서 지금 리데이를 쓸 수 있는 내 기록. 적격 판정은 서버가 끝내서 내려준다. */
  const [redayCandidates, setRedayCandidates] = useState<RedayCandidate[]>([]);
  const [redayTarget, setRedayTarget] = useState<{
    recordId: number;
    targetDate: string;
    challengeTitle: string;
  } | null>(null);
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
  const [isCommentsBottomSheetOpen, setIsCommentsBottomSheetOpen] = useState(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { user: currentUser } = useAuth();
  const completedTodayCount = todayActions.filter((a) => a.isCompletedToday).length;
  const verifiedUserIds = useMemo(() => {
    if (statusSummary?.verifiedUserIds) return new Set(statusSummary.verifiedUserIds);
    const set = new Set<number>();
    feedItems.forEach((f) => {
      if (f.targetDate === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })) set.add(f.userId);
    });
    if (completedTodayCount > 0 && currentUser?.id) {
      set.add(currentUser.id);
    }
    return set;
  }, [feedItems, completedTodayCount, currentUser?.id, statusSummary]);

  const fetchGroup = async () => {
    if (!groupId) return;
    try {
      const data = await groupsApi.getGroupDetail(Number(groupId));
      setGroup(data);
    } catch (err: any) {
      console.error("Failed to fetch group detail:", err);
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
      console.error("Failed to fetch today actions:", err);
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
      console.error("Failed to fetch group feed:", err);
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
      console.error("Failed to fetch settlement summary:", err);
    } finally {
      setSettlementLoading(false);
    }
  };

  const fetchStatusSummary = async () => {
    if (!groupId) return;
    try {
      const data = await recordsApi.getStatusSummary(Number(groupId));
      setStatusSummary(data);
    } catch (err) {
      console.error("Failed to fetch status summary:", err);
    }
  };

  const fetchUncheckedRecords = async () => {
    if (!groupId) return;
    setUncheckedLoading(true);
    try {
      const data = await recordsApi.getUncheckedRecords(Number(groupId));
      setUncheckedRecords(data);
    } catch (err) {
      console.error("Failed to fetch unchecked records:", err);
    } finally {
      setUncheckedLoading(false);
    }
  };

  const fetchRedayCandidates = async () => {
    if (!groupId) return;
    try {
      const data = await redayApi.getGroupCandidates(Number(groupId));
      setRedayCandidates(data);
    } catch (err) {
      // 리데이 안내를 못 불러와도 모임 홈의 다른 영역은 그대로 보여야 한다.
      console.error("Failed to fetch reday candidates:", err);
      setRedayCandidates([]);
    }
  };

  const handleCommentOpen = (verificationId: number) => {
    setIsCommentsBottomSheetOpen(true);
    setActiveCommentVerificationId(verificationId);
  };

  const handleMarkFailed = async (recordId: number) => {
    try {
      await recordsApi.markFailed(recordId);
      await fetchStatusSummary();
      await fetchSettlementSummary();
      await fetchUncheckedRecords();
    } catch (err: any) {
      console.error("Failed to mark failed:", err);
      alert(err.response?.data?.message || "미수행 확정에 실패했습니다.");
    }
  };

  const redayItems: RedayActionItem[] = redayCandidates.map((candidate) => ({
    recordId: candidate.recordId,
    targetDate: candidate.targetDate,
    penaltyAmount: candidate.penaltyAmount,
    redayDeadline: candidate.redayDeadline,
    // 모임 홈은 여러 챌린지가 섞이므로 어느 챌린지의 벌금인지 함께 보여준다.
    challengeTitle: candidate.challengeTitle,
  }));

  const handleStartReday = (item: RedayActionItem) => {
    setRedayTarget({
      recordId: item.recordId,
      targetDate: item.targetDate,
      challengeTitle: item.challengeTitle ?? "",
    });
  };

  const handleRedayApplied = () => {
    fetchRedayCandidates();
    fetchStatusSummary();
    fetchSettlementSummary();
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
    fetchRedayCandidates();
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
      console.error("Failed to fetch challenges:", err);
    } finally {
      setChallengesLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
    fetchChallenges();
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      if (activeTab === "home") {
        fetchStatusSummary();
        fetchRedayCandidates();
        fetchSettlementSummary();
        fetchTodayActions();
        fetchFeed(0);
      } else if (activeTab === "challenges") {
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
      console.error("Failed to delete verification:", err);
      alert("인증 삭제에 실패했습니다.");
    }
  };

  const handleCommentCountChange = (verificationId: number, delta: number) => {
    setFeedItems((prev) =>
      prev.map((item) =>
        item.id === verificationId ? { ...item, commentCount: Math.max(0, item.commentCount + delta) } : item,
      ),
    );
  };

  const inviteUrl = group ? `${window.location.origin}/invite/${group.inviteCode}` : "";

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshInviteCode = async () => {
    if (!group || !window.confirm("초대 코드를 재발급하시겠습니까?\n기존에 공유된 초대 링크는 즉시 무효화됩니다.")) {
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
      alert("새로운 초대 링크가 발급되었습니다.");
    } catch (err) {
      console.error("Failed to refresh invite code:", err);
      alert("초대 코드 재발급에 실패했습니다.");
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
            onClick={() => navigate("/groups")}
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
            onClick={() => navigate("/groups")}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-md text-xs font-medium"
          >
            내 모임 목록으로
          </button>
        </div>
      </MobileLayout>
    );
  }

  const modals = (
    <>
      {/* 사진 인증 모달 (오늘 인증) */}
      {activeVerificationAction && (
        <VerificationModal
          action={activeVerificationAction}
          onClose={() => setActiveVerificationAction(null)}
          onSuccess={handleVerificationSuccess}
        />
      )}

      {/* 리데이 티켓 안내 및 사용 시트 */}
      {redayTarget && (
        <RedayTicketSheet
          open={true}
          dailyRecordId={redayTarget.recordId}
          targetDate={redayTarget.targetDate}
          challengeTitle={redayTarget.challengeTitle}
          onClose={() => setRedayTarget(null)}
          onApplied={handleRedayApplied}
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
        isOpen={isCommentsBottomSheetOpen}
        verificationId={activeCommentVerificationId}
        onClose={() => setIsCommentsBottomSheetOpen(false)}
        onOpenChangeComplete={(open) => !open && setActiveCommentVerificationId(null)}
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
      {homeImage && <Lightbox open onClose={() => setHomeImage(null)} src={homeImage} alt="인증 사진" />}
    </>
  );
  return (
    <>
      <GroupHomeScreen
        group={group}
        challengeCount={challenges.length}
        tab={activeTab}
        actions={todayActions}
        loading={todayLoading}
        verifiedUserIds={verifiedUserIds}
        copied={copied}
        onBack={() => navigate("/groups")}
        onInvite={handleCopyLink}
        onTab={handleTabChange}
        onVerify={setActiveVerificationAction}
        onImage={setHomeImage}
        redaySlot={<RedayActionCard items={redayItems} onStartReday={handleStartReday} />}
        uncheckedSlot={
          <UncheckedRecordsCard
            count={statusSummary?.uncheckedCount ?? 0}
            onOpen={() => {
              fetchUncheckedRecords();
              setShowUncheckedSheet(true);
            }}
          />
        }
      >
        {activeTab === "home" && (
          <>
            <GroupFeedSection
              screen
              feedItems={feedItems}
              loading={feedLoading}
              hasMore={hasMoreFeed}
              onLoadMore={() => fetchFeed(feedPage + 1)}
              loadingMore={loadingMoreFeed}
              onOpenComments={handleCommentOpen}
              onDeleteVerification={handleDeleteVerification}
            />
            <GroupSettlementCard
              screen
              groupId={Number(groupId)}
              isHost={group.isHost}
              summary={settlementSummary}
              loading={settlementLoading}
              onRefresh={() => {
                fetchSettlementSummary();
                fetchStatusSummary();
              }}
              onOpenDepositModal={() => setShowDepositModal(true)}
            />
          </>
        )}

        {activeTab === "challenges" && (
          <GroupChallengesViewB groupId={Number(groupId)} challenges={challenges} loading={challengesLoading} />
        )}

        {activeTab === "members" && (
          <GroupMembersViewB
            group={group}
            inviteUrl={inviteUrl}
            isHost={group.isHost}
            onRefreshInviteCode={handleRefreshInviteCode}
            isRefreshing={isRefreshing}
            currentUserId={currentUser?.id}
            verifiedUserIds={verifiedUserIds}
          />
        )}
      </GroupHomeScreen>
      {modals}
    </>
  );
};

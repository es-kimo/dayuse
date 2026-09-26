import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { challengesApi } from '../api/challenges';
import { recordsApi } from '../api/records';
import type { ChallengeDetail, ChallengeCalendarResponse, CalendarDailyRecordItem, ChallengePeriodInterval } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { ChallengeCalendarSection } from '../components/ChallengeCalendarSection';
import { ChallengePeriodSection } from '../components/ChallengePeriodSection';
import { PeriodSettlementModal } from '../components/PeriodSettlementModal';
import { VerificationModal } from '../components/VerificationModal';
import { MidJoinBottomSheet } from '../components/MidJoinBottomSheet';
import { useAuth } from '../context/AuthContext';
import { getTodayKstString, getDurationDaysKst } from '../utils/date';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  Edit3,
  Loader2,
  Trash2,
  User as UserIcon,
  Users,
  AlertCircle,
  Lock,
  Flame,
  RotateCcw,
  Repeat,
  MoreVertical,
} from 'lucide-react';
import { ShareCardModal } from '../components/ShareCardModal';
import {
  Dialog,
  ConfirmDialog,
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  Button,
  FormField,
  Input,
  Textarea,
} from '../components/ui';

export const ChallengeDetailPage: React.FC = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  // 모달 상태
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPeriodForConfirm, setSelectedPeriodForConfirm] = useState<ChallengePeriodInterval | null>(null);
  const [verificationTarget, setVerificationTarget] = useState<{
    recordId?: number;
    isLate: boolean;
    targetDate?: string;
  } | null>(null);

  // 폼 입력 상태
  const [joinPenalty, setJoinPenalty] = useState<number>(5000);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCriteria, setEditCriteria] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // 캘린더 히스토리 상태
  const [calendarData, setCalendarData] = useState<ChallengeCalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState<boolean>(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCalendar = async () => {
    if (!challengeId) return;
    setCalendarLoading(true);
    try {
      const data = await recordsApi.getChallengeCalendar(Number(challengeId));
      setCalendarData(data);
    } catch (err) {
      console.error('Failed to fetch challenge calendar:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const fetchChallenge = async () => {
    if (!challengeId) return;
    try {
      const data = await challengesApi.getChallengeDetail(Number(challengeId));
      setChallenge(data);
      setJoinPenalty(data.myPenaltyAmount ?? 5000);
      setEditTitle(data.title);
      setEditDescription(data.description || '');
      setEditCriteria(data.verificationCriteria);
      setEditStartDate(data.startDate);
      setEditEndDate(data.endDate);
    } catch (err: any) {
      console.error('Failed to fetch challenge detail:', err);
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

  useEffect(() => {
    fetchChallenge();
    fetchCalendar();
  }, [challengeId]);


  const handleLeave = async () => {
    if (!challenge) return;
    setActionLoading(true);
    try {
      await challengesApi.leaveChallenge(challenge.id);
      setShowLeaveConfirm(false);
      await fetchChallenge();
    } catch (err: any) {
      alert(err.response?.data?.message || '참여 취소에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePenalty = async () => {
    if (!challenge) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await challengesApi.updatePenalty(challenge.id, { penaltyAmount: joinPenalty });
      setShowPenaltyModal(false);
      await fetchChallenge();
    } catch (err: any) {
      setActionError(err.response?.data?.message || '약정 금액 변경에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setActionLoading(true);
    setActionError(null);

    try {
      await challengesApi.updateChallenge(challenge.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        verificationCriteria: challenge.status === 'NOT_STARTED' ? editCriteria.trim() : undefined,
        startDate: challenge.status === 'NOT_STARTED' ? editStartDate : undefined,
        endDate: challenge.status === 'NOT_STARTED' ? editEndDate : undefined,
      });
      setShowEditModal(false);
      await fetchChallenge();
    } catch (err: any) {
      setActionError(err.response?.data?.message || '챌린지 수정에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteChallenge = async () => {
    if (!challenge) return;
    setActionLoading(true);
    try {
      await challengesApi.deleteChallenge(challenge.id);
      setShowDeleteConfirm(false);
      navigate(`/groups/${challenge.groupId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || '챌린지 삭제에 실패했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartVerify = (record: CalendarDailyRecordItem, isLate: boolean) => {
    setVerificationTarget({
      recordId: isLate ? record.id : undefined,
      isLate,
      targetDate: record.date,
    });
  };

  const handleVerificationSuccess = () => {
    setVerificationTarget(null);
    fetchCalendar();
    fetchChallenge();
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
          <h2 className="text-base font-bold text-slate-800 mb-1">접근 권한이 없습니다</h2>
          <p className="text-xs text-slate-500 mb-6">해당 모임의 멤버만 챌린지를 조회할 수 있습니다.</p>
          <button
            onClick={() => navigate('/groups')}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium"
          >
            내 모임 목록으로
          </button>
        </div>
      </MobileLayout>
    );
  }

  if (!challenge || errorStatus === 404) {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <h2 className="text-base font-bold text-slate-800 mb-1">챌린지를 찾을 수 없습니다</h2>
          <button
            onClick={() => navigate('/groups')}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium"
          >
            내 모임 목록으로
          </button>
        </div>
      </MobileLayout>
    );
  }

  const getStatusBadge = () => {
    switch (challenge.status) {
      case 'IN_PROGRESS':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            진행 중
          </span>
        );
      case 'NOT_STARTED':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            시작 전
          </span>
        );
      case 'ENDED':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            종료
          </span>
        );
    }
  };

  return (
    <MobileLayout>
      {/* 상단 네비게이션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate(`/groups/${challenge.groupId}?tab=challenges`);
            }
          }}
          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-md"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {challenge.isParticipating && (
            <button
              onClick={() => setShowStreakModal(true)}
              className="px-2.5 py-1 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded-md transition flex items-center gap-1 text-[11px] font-bold"
              title="연속 기록 공유 카드 만들기"
            >
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>기록 공유</span>
            </button>
          )}
          {challenge.isCreator && (
            <Menu>
              <MenuTrigger
                className="p-1.5 text-ink-muted hover:text-ink rounded-md transition focus-ring min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer"
                aria-label="챌린지 관리 메뉴"
              >
                <MoreVertical className="w-4 h-4" aria-hidden="true" />
              </MenuTrigger>
              <MenuPopup sideOffset={6}>
                <MenuItem
                  onSelect={() => {
                    setShowEditModal(true);
                    setActionError(null);
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>챌린지 수정</span>
                </MenuItem>
                {challenge.status === 'NOT_STARTED' && (
                  <MenuItem
                    destructive
                    onSelect={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>챌린지 삭제</span>
                  </MenuItem>
                )}
              </MenuPopup>
            </Menu>
          )}
        </div>
      </div>

      {/* 챌린지 기본 정보 헤더 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-xs">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h1 className="text-base font-bold text-slate-800 leading-snug">{challenge.title}</h1>
        </div>

        {challenge.description && (
          <p className="text-xs text-slate-600 mb-3 whitespace-pre-wrap">{challenge.description}</p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <span>모임: {challenge.groupName}</span>
          <span>·</span>
          <span>생성자: {challenge.creatorNickname}</span>
        </div>
      </div>

      {/* 진행 기간 & 인증 기준 */}
      <div className="space-y-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">
                진행 기간 ({challenge.periodType === 'WEEKLY_N' ? `주 ${challenge.targetFrequency}회 수행` : '매일 수행'})
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {challenge.startDate} ~ {challenge.endDate} ({getDurationDaysKst(challenge.startDate, challenge.endDate)}일간)
              </span>
            </div>
          </div>
        </div>

        {/* 주 N회 또는 매일형 현재 구간 달성 현황 */}
        {challenge.currentPeriod && (
          <div className="bg-blue-50/80 border border-blue-200 rounded-md p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-blue-600" />
                <span>현재 {challenge.currentPeriod.index}구간 진행 현황</span>
              </span>
              <span className="font-bold text-blue-700">
                {challenge.currentPeriod.completedCount} / {challenge.currentPeriod.targetCount}회 달성
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between items-center">
              <span>{challenge.currentPeriod.startDate} ~ {challenge.currentPeriod.endDate}</span>
              {challenge.currentPeriod.isAchieved ? (
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  구간 달성 완료! 🎉
                </span>
              ) : (
                <span className="text-blue-600 font-medium">
                  남은 목표: {Math.max(0, challenge.currentPeriod.targetCount - challenge.currentPeriod.completedCount)}회
                </span>
              )}
            </div>
            {challenge.progressRate !== undefined && (
              <div className="pt-1 border-t border-blue-100">
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>전체 달성률</span>
                  <span className="font-bold text-blue-700">{challenge.progressRate}%</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 w-full origin-left rounded-full transition-transform duration-300 ease-out"
                    style={{
                      transform: `scaleX(${Math.min(100, Math.max(0, challenge.progressRate)) / 100})`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>인증 기준</span>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md whitespace-pre-wrap border border-slate-100">
            {challenge.verificationCriteria}
          </p>
        </div>

        {/* 시작 후 잠금 알림 안내 배너 */}
        {challenge.status !== 'NOT_STARTED' && (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-[11px] text-slate-600 flex items-start gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-slate-700">챌린지 진행/수정 잠금 적용 중</span>
              챌린지 시작일(00:00 KST) 이후에는 참여자 추가/취소 및 인증 기준 변경이 불가합니다.
            </div>
          </div>
        )}
      </div>

      {/* 주차별(구간별) 달성 및 정산 현황 */}
      {challenge.periodType === 'WEEKLY_N' && challenge.intervals && (
        <ChallengePeriodSection
          intervals={challenge.intervals}
          isParticipating={challenge.isParticipating}
          onOpenConfirmModal={(interval) => setSelectedPeriodForConfirm(interval)}
        />
      )}

      {/* 날짜별 수행 히스토리 달력 */}
      <ChallengeCalendarSection
        calendarData={calendarData}
        loading={calendarLoading}
        currentUserId={user?.id}
        onStartVerify={handleStartVerify}
      />

      {/* 참여자 카드 목록 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex-1 shadow-xs mb-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Users className="w-4 h-4 text-blue-600" />
            <span>참여자 목록 ({challenge.participants.length}명)</span>
          </div>
          {challenge.isParticipating && challenge.myPenaltyAmount !== undefined && (
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
              나의 약정: {challenge.myPenaltyAmount?.toLocaleString()}원
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {challenge.participants.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {p.profileImageUrl ? (
                  <img
                    src={p.profileImageUrl}
                    alt={p.nickname}
                    className="w-8 h-8 rounded-full object-cover border border-slate-100"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-slate-800 flex items-center gap-1">
                    {p.nickname}
                    {p.isCreator && (
                      <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded font-semibold flex items-center gap-0.5">
                        <Crown className="w-2.5 h-2.5" />
                        생성자
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{p.startDate} 시작</span>
                    <span>·</span>
                    <span>{p.joinedAt.split('T')[0]} 신청</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-600 block">
                  {p.penaltyAmount.toLocaleString()}원
                </span>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-[9px] text-slate-400">1일 약정</span>
                  {p.completionRate !== undefined && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">
                      달성 {p.completionRate}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 고정 액션 바 */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 max-w-md mx-auto">
        {challenge.canJoin ? (
          <button
            onClick={() => {
              setShowJoinModal(true);
              setActionError(null);
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-xs transition active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <Coins className="w-4 h-4" />
            <span>{(() => {
              if (challenge.status === 'NOT_STARTED') return '챌린지 참여하기';
              const todayStr = getTodayKstString();
              if (challenge.endDate === todayStr) return '오늘 하루 참여하기';
              const diffDays = Math.max(
                1,
                Math.round(
                  (new Date(challenge.endDate).getTime() - new Date(todayStr).getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1
              );
              return `남은 ${diffDays}일 참여하기`;
            })()}</span>
          </button>
        ) : challenge.isParticipating ? (
          <div className="flex gap-2">
            {(challenge.status === 'NOT_STARTED' || challenge.canCancel) ? (
              <>
                <button
                  onClick={() => {
                    setShowPenaltyModal(true);
                    setActionError(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md transition"
                >
                  약정 금액 변경
                </button>
                {challenge.canCancel && (
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(true)}
                    disabled={actionLoading}
                    className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-md transition"
                  >
                    참여 취소
                  </button>
                )}
              </>
            ) : (
              <div className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 font-medium text-xs rounded-md flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>수행 진행 중 (약정·취소 고정)</span>
              </div>
            )}
          </div>
        ) : challenge.status === 'ENDED' ? (
          <button
            onClick={() => navigate(`/groups/${challenge.groupId}/challenges/new?restartFrom=${challenge.id}`)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-xs transition active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>이 챌린지 다시 시작하기</span>
          </button>
        ) : (
          <div className="text-center py-2 text-xs text-slate-400">
            현재 참여할 수 없는 상태입니다.
          </div>
        )}
      </div>

      {/* 중도/신규 참여 바텀시트 */}
      <MidJoinBottomSheet
        challengeId={challenge.id}
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          fetchChallenge();
          fetchCalendar();
        }}
      />

      {/* 약정 금액 변경 모달 */}
      <Dialog
        open={showPenaltyModal}
        onOpenChange={setShowPenaltyModal}
        title="약정 금액 변경"
        description="챌린지 시작 전까지 약정 금액을 자유롭게 변경할 수 있습니다."
      >
        <div className="space-y-4">
          {actionError && (
            <div role="alert" aria-live="polite" className="p-2.5 rounded-md bg-danger-bg text-danger text-caption font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-danger-icon" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex gap-2">
              {[3000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setJoinPenalty(amt)}
                  className={`flex-1 py-1.5 text-xs rounded-md border transition ${
                    joinPenalty === amt
                      ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {amt.toLocaleString()}원
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={0}
              step={1000}
              value={joinPenalty}
              onChange={(e) => setJoinPenalty(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setShowPenaltyModal(false)}
              disabled={actionLoading}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              onClick={handleUpdatePenalty}
              isLoading={actionLoading}
              loadingText="변경 중..."
            >
              변경 완료
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 챌린지 수정 모달 */}
      <Dialog
        open={showEditModal}
        onOpenChange={setShowEditModal}
        title={challenge.status === 'NOT_STARTED' ? '챌린지 조건 수정' : '챌린지 정보 수정'}
        hasUnsavedChanges={Boolean(editTitle !== challenge.title || editDescription !== (challenge.description || ''))}
      >
        <form onSubmit={handleUpdateChallenge} noValidate className="space-y-4">
          {actionError && (
            <div role="alert" aria-live="polite" className="p-2.5 rounded-md bg-danger-bg text-danger text-caption font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-danger-icon" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}

          <FormField label="제목" required id="edit-challenge-title">
            <Input
              id="edit-challenge-title"
              type="text"
              required
              maxLength={50}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </FormField>

          <FormField label="설명" id="edit-challenge-desc">
            <Textarea
              id="edit-challenge-desc"
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="resize-none"
            />
          </FormField>

          {challenge.status === 'NOT_STARTED' ? (
            <>
              <FormField label="인증 기준" required id="edit-challenge-criteria">
                <Textarea
                  id="edit-challenge-criteria"
                  rows={2}
                  required
                  value={editCriteria}
                  onChange={(e) => setEditCriteria(e.target.value)}
                  className="resize-none"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="시작일" id="edit-start-date">
                  <Input
                    id="edit-start-date"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </FormField>
                <FormField label="종료일" id="edit-end-date">
                  <Input
                    id="edit-end-date"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                  />
                </FormField>
              </div>
            </>
          ) : (
            <div className="p-2.5 rounded-md bg-sunken border border-line text-caption text-ink-muted">
              🔒 챌린지 시작 후에는 제목과 설명만 수정할 수 있습니다. (기간 및 인증 기준 잠김)
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setShowEditModal(false)}
              disabled={actionLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={actionLoading}
              loadingText="수정 저장 중..."
            >
              수정 저장
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 참여 취소 확인 다이얼로그 (위험 액션: 취소 버튼 기본 포커스) */}
      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title="챌린지 참여 취소"
        description="챌린지 참여를 취소하시겠습니까? 미인증 시 약정금이 차감될 수 있습니다."
        confirmText="참여 취소"
        confirmVariant="danger"
        onConfirm={handleLeave}
        isLoading={actionLoading}
      />

      {/* 챌린지 삭제 확인 다이얼로그 (위험 액션: 취소 버튼 기본 포커스) */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="챌린지 삭제"
        description="챌린지를 정말 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
        confirmText="삭제하기"
        confirmVariant="danger"
        onConfirm={handleDeleteChallenge}
        isLoading={actionLoading}
      />

      {/* 사진 인증 모달 (당일 인증 / 늦은 인증) */}
      {verificationTarget && challenge && (
        <VerificationModal
          action={{
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            verificationCriteria: challenge.verificationCriteria,
          }}
          recordId={verificationTarget.recordId}
          targetDate={verificationTarget.targetDate}
          onClose={() => setVerificationTarget(null)}
          onSuccess={handleVerificationSuccess}
        />
      )}

      {/* 연속 기록(Streak) 공유 카드 모달 */}
      {showStreakModal && challenge && (
        <ShareCardModal
          cardType="STREAK"
          targetId={challenge.id}
          title={challenge.title}
          userNickname={user?.nickname || '참여자'}
          onClose={() => setShowStreakModal(false)}
        />
      )}

      {/* 구간 미수행 정산 확정 모달 */}
      {selectedPeriodForConfirm && challenge && (
        <PeriodSettlementModal
          groupId={challenge.groupId}
          challengeId={challenge.id}
          interval={selectedPeriodForConfirm}
          isOpen={!!selectedPeriodForConfirm}
          onClose={() => setSelectedPeriodForConfirm(null)}
          onSuccess={async () => {
            await fetchChallenge();
            await fetchCalendar();
          }}
        />
      )}
    </MobileLayout>
  );
};

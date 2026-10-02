import { calculateStreak } from '../utils/streak';
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { challengesApi } from '../api/challenges';
import { recordsApi } from '../api/records';
import type { ChallengeDetail, ChallengeCalendarResponse, CalendarDailyRecordItem, ChallengePeriodInterval } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { Screen } from '../components/screens/Screen';
import { RedayTicketSheet } from '../components/RedayTicketSheet';
import { shouldShowRedayUi } from '../utils/reday';
import { PeriodSettlementModal } from '../components/PeriodSettlementModal';
import { VerificationModal } from '../components/VerificationModal';
import { AbortChallengeModal } from '../components/AbortChallengeModal';
import { MidJoinBottomSheet } from '../components/MidJoinBottomSheet';
import { useAuth } from '../context/AuthContext';
import { ChallengeDetailViewB } from '../components/ChallengeDetailViewB';
import { getTodayKstString, getDurationDaysKst } from '../utils/date';
import { Loader2, AlertCircle } from 'lucide-react';
import { ShareCardModal } from '../components/ShareCardModal';
import { Dialog, ConfirmDialog, Button, FormField, Input, Textarea } from '../components/ui';

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
  const [showAbortModal, setShowAbortModal] = useState(false);
  const [selectedPeriodForConfirm, setSelectedPeriodForConfirm] = useState<ChallengePeriodInterval | null>(null);
  const [verificationTarget, setVerificationTarget] = useState<{
    recordId?: number;
    isLate: boolean;
    targetDate?: string;
  } | null>(null);
  const [redayTarget, setRedayTarget] = useState<{ recordId: number; targetDate: string } | null>(null);

  // 폼 입력 상태
  const [joinPenalty, setJoinPenalty] = useState<number>(5000);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCriteria, setEditCriteria] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editRedayAllowed, setEditRedayAllowed] = useState(false);

  // 캘린더 히스토리 상태
  const [calendarData, setCalendarData] = useState<ChallengeCalendarResponse | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);


  const todayStr = getTodayKstString();
  const totalDurationDays = useMemo(() => {
    return challenge ? getDurationDaysKst(challenge.startDate, challenge.endDate) : 1;
  }, [challenge]);

  const currentDayNumber = useMemo(() => {
    if (!challenge) return 1;
    const s = new Date(challenge.startDate).getTime();
    const now = new Date(todayStr).getTime();
    const diff = Math.floor((now - s) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(totalDurationDays, diff));
  }, [challenge, todayStr, totalDurationDays]);

  const progressPercent = useMemo(() => {
    return Math.min(100, Math.max(0, Math.round((currentDayNumber / totalDurationDays) * 100)));
  }, [currentDayNumber, totalDurationDays]);

  const remainingDays = useMemo(() => {
    return Math.max(0, totalDurationDays - currentDayNumber);
  }, [totalDurationDays, currentDayNumber]);

  const dDay = useMemo(() => {
    if (!challenge) return '';
    const now = new Date(todayStr).getTime();
    const s = new Date(challenge.startDate).getTime();
    const end = new Date(challenge.endDate).getTime();
    if (now < s) {
      const diff = Math.ceil((s - now) / (1000 * 60 * 60 * 24));
      return `D-${diff}`;
    }
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return '종료';
    if (diff === 0) return 'D-Day';
    return `D-${diff}`;
  }, [challenge, todayStr]);

  const myParticipant = useMemo(() => {
    return calendarData?.participants.find((p) => p.userId === user?.id) || null;
  }, [calendarData, user?.id]);

  const myRecords = useMemo(() => {
    return myParticipant?.records || [];
  }, [myParticipant]);

  const isTodayCompleted = useMemo(() => {
    const todayRec = myRecords.find((r) => r.date === todayStr);
    return todayRec?.status === 'COMPLETED' && !todayRec.isLate;
  }, [myRecords, todayStr]);

  // 지각 인증·리데이 면제는 정상 연속 인증에 포함하지 않는다.
  const streakCount = calculateStreak(myRecords, todayStr);

  // Calendar dates for the active month (UI B grid)
  const calendarMonthDays = useMemo(() => {
    if (!challenge) return [];
    const baseDate = new Date(challenge.startDate);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const recordMap = new Map<string, CalendarDailyRecordItem>();
    myRecords.forEach((r) => recordMap.set(r.date, r));

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      status: 'BLANK' | 'DONE' | 'MISS' | 'WAIT_NOW' | 'FUTURE';
    }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ dayNumber: 0, dateStr: '', status: 'BLANK' });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = recordMap.get(dateStr);
      let status: 'BLANK' | 'DONE' | 'MISS' | 'WAIT_NOW' | 'FUTURE' = 'FUTURE';

      if (rec?.status === 'COMPLETED') {
        status = 'DONE';
      } else if (dateStr === todayStr) {
        status = 'WAIT_NOW';
      } else if (dateStr < todayStr) {
        if (dateStr >= challenge.startDate && dateStr <= challenge.endDate) {
          status = 'MISS';
        } else {
          status = 'FUTURE';
        }
      } else {
        status = 'FUTURE';
      }

      days.push({ dayNumber: d, dateStr, status });
    }

    return days;
  }, [challenge, myRecords, todayStr]);

  const handleStartTodayVerify = () => {
    setVerificationTarget({
      recordId: undefined,
      isLate: false,
      targetDate: todayStr,
    });
  };

  const fetchCalendar = async () => {
    if (!challengeId) return;
    try {
      const data = await recordsApi.getChallengeCalendar(Number(challengeId));
      setCalendarData(data);
    } catch (err) {
      console.error('Failed to fetch challenge calendar:', err);
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
      setEditRedayAllowed(Boolean(data.redayAllowed));
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
        redayAllowed: challenge.status === 'NOT_STARTED' ? editRedayAllowed : undefined,
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

  const handleVerificationSuccess = () => {
    setVerificationTarget(null);
    fetchCalendar();
    fetchChallenge();
  };

  const handleStartReday = (recordId: number) => {
    const target = calendarData?.participants
      .find((p) => p.userId === user?.id)
      ?.records.find((r) => r.id === recordId);
    setRedayTarget({ recordId, targetDate: target?.date ?? '' });
  };

  /*
   * 주 N회 챌린지에는 리데이 설정·사용 버튼·일별 카운트다운을 표시하지 않는다.
   * 챌린지의 리데이 허용 여부는 달력 응답(redayAllowed)이 서버 판정으로 알려준다.
   */
  const redayUiEnabled =
    shouldShowRedayUi(challenge?.periodType, calendarData?.redayAllowed) &&
    Boolean(calendarData?.redayAllowed);

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

  return (
    <Screen>
      <ChallengeDetailViewB
        challenge={challenge}
        calendarData={calendarData}
        dDay={dDay}
        totalDurationDays={totalDurationDays}
        currentDayNumber={currentDayNumber}
        progressPercent={progressPercent}
        remainingDays={remainingDays}
        isTodayCompleted={isTodayCompleted}
        streakCount={streakCount}
        calendarMonthDays={calendarMonthDays}
        currentUserId={user?.id}
        onBack={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate(`/groups/${challenge.groupId}?tab=challenges`);
          }
        }}
        onShare={() => setShowStreakModal(true)}
        onOpenCert={handleStartTodayVerify}
        onAbortChallenge={challenge.canAbort ? () => setShowAbortModal(true) : undefined}
        onDeleteChallenge={challenge.isCreator ? () => setShowDeleteConfirm(true) : undefined}
        onEditChallenge={challenge.isCreator ? () => { setShowEditModal(true); setActionError(null); } : undefined}
        onOpenMidJoin={() => setShowJoinModal(true)}
        onRestartChallenge={() => navigate(`/groups/${challenge.groupId}/challenges/new?restartFrom=${challenge.id}`)}
        redayUiEnabled={redayUiEnabled}
        onStartReday={handleStartReday}
      />

      {/* 중도/신규 참여 바텀시트 */}
      <MidJoinBottomSheet
        challengeId={challenge.id}
        groupId={challenge.groupId}
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
              {(!challenge.periodType || challenge.periodType === 'DAILY') &&
                challenge.executionType !== 'TOGETHER' && (
                  <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        🎟️ 리데이(벌금 면제권) 허용
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        지각 인증 후 리데이 티켓을 사용하면 벌금을 면제합니다.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editRedayAllowed}
                      onChange={(e) => setEditRedayAllowed(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>
                )}
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
            groupId: challenge.groupId,
          }}
          recordId={verificationTarget.recordId}
          targetDate={verificationTarget.targetDate}
          onClose={() => setVerificationTarget(null)}
          onSuccess={handleVerificationSuccess}
        />
      )}

      {/* 리데이 티켓 안내 및 사용 시트 (기록 상세) */}
      {redayTarget && challenge && (
        <RedayTicketSheet
          open={true}
          dailyRecordId={redayTarget.recordId}
          targetDate={redayTarget.targetDate}
          challengeTitle={challenge.title}
          onClose={() => setRedayTarget(null)}
          onApplied={() => {
            fetchCalendar();
            fetchChallenge();
          }}
        />
      )}

      {/* 연속 기록(Streak) 공유 카드 모달 */}
      {showStreakModal && challenge && (
        <ShareCardModal
          cardType="STREAK"
          targetId={challenge.id}
          challengeId={challenge.id}
          groupId={challenge.groupId}
          title={challenge.title}
          userNickname={user?.nickname || '참여자'}
          executionType={challenge.executionType}
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

      {/* 챌린지 중단 확인 모달 */}
      {showAbortModal && challenge && (
        <AbortChallengeModal
          challengeId={challenge.id}
          challengeTitle={challenge.title}
          participantCount={challenge.participants?.length}
          isOpen={showAbortModal}
          onClose={() => setShowAbortModal(false)}
          onSuccess={(updated) => {
            setChallenge(updated);
            fetchCalendar();
          }}
        />
      )}
    </Screen>
  );
};

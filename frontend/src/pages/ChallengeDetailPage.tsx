import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { challengesApi } from '../api/challenges';
import { recordsApi } from '../api/records';
import type { ChallengeDetail, ChallengeCalendarResponse, CalendarDailyRecordItem } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { ChallengeCalendarSection } from '../components/ChallengeCalendarSection';
import { VerificationModal } from '../components/VerificationModal';
import { MidJoinBottomSheet } from '../components/MidJoinBottomSheet';
import { useAuth } from '../context/AuthContext';
import { getTodayKstString } from '../utils/date';
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
} from 'lucide-react';

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
  const [verificationTarget, setVerificationTarget] = useState<{
    recordId?: number;
    isLate: boolean;
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
    if (!challenge || !window.confirm('챌린지 참여를 취소하시겠습니까?')) return;
    setActionLoading(true);
    try {
      await challengesApi.leaveChallenge(challenge.id);
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
    if (!challenge || !window.confirm('챌린지를 정말 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.')) return;
    setActionLoading(true);
    try {
      await challengesApi.deleteChallenge(challenge.id);
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
          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {challenge.isCreator && challenge.canDelete && (
            <button
              onClick={handleDeleteChallenge}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
              title="챌린지 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {challenge.isCreator && (
            <button
              onClick={() => {
                setShowEditModal(true);
                setActionError(null);
              }}
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg transition"
              title="챌린지 수정"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 챌린지 기본 정보 헤더 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-xs">
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
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">진행 기간 (매일 수행)</span>
              <span className="text-xs font-semibold text-slate-700">
                {challenge.startDate} ~ {challenge.endDate}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>인증 기준</span>
          </div>
          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg whitespace-pre-wrap border border-slate-100">
            {challenge.verificationCriteria}
          </p>
        </div>

        {/* 시작 후 잠금 알림 안내 배너 */}
        {challenge.status !== 'NOT_STARTED' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-slate-700">챌린지 진행/수정 잠금 적용 중</span>
              챌린지 시작일(00:00 KST) 이후에는 참여자 추가/취소 및 인증 기준 변경이 불가합니다.
            </div>
          </div>
        )}
      </div>

      {/* 날짜별 수행 히스토리 달력 */}
      <ChallengeCalendarSection
        calendarData={calendarData}
        loading={calendarLoading}
        currentUserId={user?.id}
        onStartVerify={handleStartVerify}
      />

      {/* 참여자 카드 목록 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex-1 shadow-xs mb-20">
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
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition active:scale-[0.99] flex items-center justify-center gap-1.5"
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
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  약정 금액 변경
                </button>
                {challenge.canCancel && (
                  <button
                    onClick={handleLeave}
                    disabled={actionLoading}
                    className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl transition"
                  >
                    참여 취소
                  </button>
                )}
              </>
            ) : (
              <div className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>수행 진행 중 (약정·취소 고정)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2 text-xs text-slate-400">
            {challenge.status === 'ENDED'
              ? '챌린지가 종료되어 참여가 마감되었습니다.'
              : '현재 참여할 수 없는 상태입니다.'}
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
      {showPenaltyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-800">약정 금액 변경</h2>
            <p className="text-xs text-slate-500">
              챌린지 시작 전까지 약정 금액을 자유롭게 변경할 수 있습니다.
            </p>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition ${
                      joinPenalty === amt
                        ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {amt.toLocaleString()}원
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                step={1000}
                value={joinPenalty}
                onChange={(e) => setJoinPenalty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-base px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPenaltyModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleUpdatePenalty}
                disabled={actionLoading}
                className="flex-1 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '변경 완료'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 챌린지 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateChallenge}
            className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-sm font-bold text-slate-800">
              {challenge.status === 'NOT_STARTED' ? '챌린지 조건 수정' : '챌린지 정보 수정'}
            </h2>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-600 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">제목</label>
              <input
                type="text"
                required
                maxLength={50}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-base px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">설명</label>
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full text-base px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {challenge.status === 'NOT_STARTED' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">인증 기준</label>
                  <textarea
                    rows={2}
                    required
                    value={editCriteria}
                    onChange={(e) => setEditCriteria(e.target.value)}
                    className="w-full text-base px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <label className="block text-[11px] text-slate-500 mb-1">시작일</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full min-w-0 max-w-full text-xs sm:text-sm px-2 py-1.5 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[11px] text-slate-500 mb-1">종료일</label>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full min-w-0 max-w-full text-xs sm:text-sm px-2 py-1.5 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                🔒 챌린지 시작 후에는 제목과 설명만 수정할 수 있습니다. (기간 및 인증 기준 잠김)
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={actionLoading}
                className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '수정 저장'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 사진 인증 모달 (당일 인증 / 늦은 인증) */}
      {verificationTarget && challenge && (
        <VerificationModal
          action={{
            challengeId: challenge.id,
            challengeTitle: challenge.title,
            verificationCriteria: challenge.verificationCriteria,
          }}
          recordId={verificationTarget.recordId}
          onClose={() => setVerificationTarget(null)}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </MobileLayout>
  );
};

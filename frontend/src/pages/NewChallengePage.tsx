import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { challengesApi } from '../api/challenges';
import { MobileLayout } from '../components/MobileLayout';
import { ArrowLeft, Calendar, ShieldCheck, Coins, AlertCircle, Loader2 } from 'lucide-react';
import { getTodayKstString, addDaysKst } from '../utils/date';

export const NewChallengePage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const today = getTodayKstString();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [verificationCriteria, setVerificationCriteria] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(5000);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endDate = addDaysKst(startDate, 13); // 시작일 포함 14일

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('챌린지 제목을 입력해주세요.');
      return;
    }
    if (!verificationCriteria.trim()) {
      setError('인증 기준을 상세히 입력해주세요.');
      return;
    }
    if (startDate < today) {
      setError('시작일은 오늘 이후 날짜여야 합니다.');
      return;
    }
    if (penaltyAmount < 0) {
      setError('약정 금액은 0원 이상이어야 합니다.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!groupId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const challenge = await challengesApi.createChallenge(Number(groupId), {
        title: title.trim(),
        description: description.trim() || undefined,
        verificationCriteria: verificationCriteria.trim(),
        startDate,
        endDate,
        myPenaltyAmount: penaltyAmount,
      });

      navigate(`/challenges/${challenge.id}`);
    } catch (err: any) {
      console.error('Failed to create challenge:', err);
      setError(err.response?.data?.message || '챌린지 생성에 실패했습니다.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileLayout>
      {/* 상단 헤더 */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate(`/groups/${groupId}?tab=challenges`);
            }
          }}
          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">새 챌린지 만들기</h1>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleOpenConfirm} className="space-y-4 flex-1">
        {/* 제목 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            챌린지 제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={50}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 매일 아침 10분 스트레칭"
            className="w-full text-base px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            챌린지 설명 (선택)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="모임원들에게 챌린지의 목표나 규칙을 소개해 주세요."
            className="w-full text-base px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white resize-none"
          />
        </div>

        {/* 인증 기준 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>인증 기준 <span className="text-red-500">*</span></span>
            <span className="text-[10px] text-slate-400 font-normal">매일 1회 인증</span>
          </label>
          <textarea
            rows={3}
            required
            value={verificationCriteria}
            onChange={(e) => setVerificationCriteria(e.target.value)}
            placeholder="예: 스트레칭 수행 화면 캡처 또는 운동 앱 기록 사진 1장 (자정 전까지 제출)"
            className="w-full text-base px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white resize-none"
          />
        </div>

        {/* 기간 설정 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>챌린지 기간 설정 (기본 14일)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <span className="block text-[11px] text-slate-500 mb-1">시작일</span>
              <input
                type="date"
                required
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 max-w-full text-xs sm:text-sm px-2 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-slate-500 mb-1">종료일 (자동 14일)</span>
              <input
                type="date"
                disabled
                value={endDate}
                className="w-full min-w-0 max-w-full text-xs sm:text-sm px-2 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            시작일 00:00 KST부터 14일간 매일 수행 주기로 진행됩니다.
          </p>
        </div>

        {/* 본인 약정 금액 설정 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>나의 1일 미수행 약정 금액</span>
            </div>
            <span className="text-xs font-bold text-amber-600">
              {penaltyAmount.toLocaleString()}원
            </span>
          </div>

          <div className="flex gap-2">
            {[3000, 5000, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setPenaltyAmount(amt)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition ${
                  penaltyAmount === amt
                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {amt.toLocaleString()}원
              </button>
            ))}
          </div>

          <div>
            <span className="block text-[11px] text-slate-500 mb-1">직접 입력 (원 단위)</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={penaltyAmount}
              onChange={(e) => setPenaltyAmount(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full text-base px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            생성자는 챌린지 생성과 동시에 위 약정 금액으로 자동 참여됩니다.
          </p>
        </div>

        {/* 제출 버튼 */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition active:scale-[0.99]"
          >
            챌린지 생성 확인
          </button>
        </div>
      </form>

      {/* 최종 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-slate-800">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold">챌린지 생성 최종 확인</h2>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">챌린지명</span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">진행 기간</span>
                <span className="font-semibold text-slate-800">{startDate} ~ {endDate} (14일)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">수행 주기</span>
                <span className="font-semibold text-slate-800">매일 1회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">나의 약정 금액</span>
                <span className="font-bold text-amber-600">{penaltyAmount.toLocaleString()}원 / 일</span>
              </div>
              <div className="pt-1 border-t border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-0.5">인증 기준 안내:</span>
                <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{verificationCriteria}</p>
              </div>
            </div>

            <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              ⚠️ 챌린지가 시작(시작일 00:00 KST)되면 기간 및 인증 기준 수정과 챌린지 삭제가 잠깁니다.
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                다시 수정
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 shadow-xs transition"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>확정하고 생성하기</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
};

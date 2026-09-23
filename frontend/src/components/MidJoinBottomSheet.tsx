import React, { useEffect, useState } from 'react';
import { challengesApi } from '../api/challenges';
import type { JoinPreviewResponse, StartDateType } from '../types';
import {
  Calendar,
  Coins,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Info,
} from 'lucide-react';

interface MidJoinBottomSheetProps {
  challengeId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MidJoinBottomSheet: React.FC<MidJoinBottomSheetProps> = ({
  challengeId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [preview, setPreview] = useState<JoinPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<StartDateType>('TOMORROW');
  const [penaltyAmount, setPenaltyAmount] = useState<number>(5000);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await challengesApi.getJoinPreview(challengeId);
        setPreview(data);
        const defaultOpt = data.options.find((o) => o.isRecommended) || data.options[0];
        if (defaultOpt) {
          setSelectedType(defaultOpt.type);
        }
        setPenaltyAmount(data.defaultPenaltyAmount || 5000);
      } catch (err: any) {
        setError(err.response?.data?.message || '참여 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [challengeId, isOpen]);

  if (!isOpen) return null;

  const selectedOption = preview?.options.find((o) => o.type === selectedType);
  const totalDays = selectedOption?.remainingDays || 0;
  const maxPossiblePenalty = totalDays * penaltyAmount;

  const handleJoin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await challengesApi.joinChallenge(challengeId, {
        penaltyAmount,
        startDateType: selectedType,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || '참여 신청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {preview?.isStarted ? '챌린지 중도 참여 신청' : '챌린지 참여 신청'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {preview?.challengeTitle || '챌린지'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <span className="text-xs">참여 옵션을 계산하고 있습니다...</span>
            </div>
          ) : error && !preview ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : preview ? (
            <>
              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 시작일 선택 섹션 */}
              {preview.isStarted ? (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    수행 시작일 선택
                  </label>
                  <div className="space-y-2">
                    {preview.options.map((option) => {
                      const isSelected = selectedType === option.type;
                      return (
                        <button
                          key={option.type}
                          type="button"
                          onClick={() => setSelectedType(option.type)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800">
                                  {option.type === 'TOMORROW' ? '내일부터 참여' : '오늘부터 참여'}
                                </span>
                                {option.isRecommended && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" /> 추천
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {option.startDate}부터 시작 (종료일까지 {option.remainingDays}일간)
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-blue-600 shrink-0">
                            {option.remainingDays}일
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">수행 기간 (시작 전)</span>
                    <span className="text-xs font-bold text-slate-700">
                      {preview.challengeStartDate} ~ {preview.challengeEndDate} ({totalDays}일)
                    </span>
                  </div>
                </div>
              )}

              {/* 1일 약정 벌금 설정 섹션 */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  1일 미수행 약정 벌금
                </label>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  인증에 실패하거나 미제출 시 모임에 적립될 하루 벌금입니다.
                </p>

                <div className="flex gap-2 mb-2">
                  {[3000, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPenaltyAmount(amt)}
                      className={`flex-1 py-2 text-xs rounded-xl border font-semibold transition ${
                        penaltyAmount === amt
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {amt.toLocaleString()}원
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={penaltyAmount}
                    onChange={(e) => setPenaltyAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-sm font-semibold px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">원</span>
                </div>
              </div>

              {/* 요약 안내 카드 */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">본인 수행 일수</span>
                  <span className="font-bold text-slate-800">{totalDays}일</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">참여 이전 날짜</span>
                  <span className="font-medium text-slate-600">미수행·벌금 원천 제외</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                  <span className="text-slate-700 font-semibold">최대 예상 약정 총액</span>
                  <span className="font-extrabold text-blue-600">
                    {maxPossiblePenalty.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 정책 안내 */}
              <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <span>
                  본인 수행 시작일(00:00 KST) 전까지만 참여 취소와 금액 변경이 가능하며, 시작 이후에는 고정됩니다.
                </span>
              </div>
            </>
          ) : null}
        </div>

        {/* 푸터 액션 */}
        <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleJoin}
            disabled={submitting || loading || !preview}
            className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Coins className="w-4 h-4" />
                <span>참여 확정하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

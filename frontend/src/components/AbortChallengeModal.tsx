import React, { useState } from 'react';
import type { ChallengeDetail } from '../types';
import { challengesApi } from '../api/challenges';
import { Modal, ModalTitle, ModalClose } from './ui/Modal';
import { AlertTriangle, X } from 'lucide-react';

interface AbortChallengeModalProps {
  challengeId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedChallenge: ChallengeDetail) => void;
}

export const AbortChallengeModal: React.FC<AbortChallengeModalProps> = ({
  challengeId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAbort = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const updated = await challengesApi.abortChallenge(challengeId, {
        reason: reason.trim() || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || '챌린지 중단 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      disablePointerDismissal={submitting}
      backdropClassName="bg-black/50 backdrop-blur-xs"
      className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl relative"
    >
      <>
        <ModalClose
          aria-label="닫기"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md focus-ring"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </ModalClose>

        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <ModalTitle className="text-base font-bold text-slate-800">
              챌린지 중단
            </ModalTitle>
            <p className="text-xs text-slate-400">
              진행 중인 챌린지를 조기 종료합니다
            </p>
          </div>
        </div>

        <div className="bg-rose-50/60 border border-rose-100 rounded-md p-3 mb-4 text-xs text-rose-800 space-y-1.5">
          <p className="font-semibold">⚠️ 중단 전 꼭 확인해주세요!</p>
          <ul className="list-disc list-inside space-y-0.5 text-rose-700">
            <li>오늘 진행 중인 구간과 이후 구간은 정산에서 제외됩니다.</li>
            <li>지금까지 성공한 인증 기록은 안전하게 보존됩니다.</li>
            <li>중단 후에는 새로운 인증을 올릴 수 없으며, 되돌릴 수 없습니다.</li>
          </ul>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            중단 사유 (선택)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="중단 사유를 입력해주세요 (예: 모임 사정, 목표 조정 등)"
            maxLength={200}
            rows={3}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
            disabled={submitting}
          />
          <div className="text-right text-[10px] text-slate-400 mt-1">
            {reason.length}/200
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleAbort}
            disabled={submitting}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-md text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5"
          >
            {submitting ? '중단 처리 중...' : '챌린지 중단'}
          </button>
        </div>
      </>
    </Modal>
  );
};

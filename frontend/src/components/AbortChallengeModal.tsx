import React, { useState } from 'react';
import type { ChallengeDetail } from '../types';
import { challengesApi } from '../api/challenges';
import { Modal, ModalTitle, ModalDescription } from './ui/Modal';
import { AlertTriangle, Check, Lock, X } from 'lucide-react';
import { Button, Field, TextAreaField } from './dayu/ui';

interface AbortChallengeModalProps {
  challengeId: number;
  /** 무엇을 중단하는지 보여 주기 위한 정보 */
  challengeTitle?: string;
  participantCount?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedChallenge: ChallengeDetail) => void;
}

/** 되돌릴 수 없는 작업이라 바텀시트가 아니라 가운데 팝업을 쓴다. */
export const AbortChallengeModal: React.FC<AbortChallengeModalProps> = ({
  challengeId,
  challengeTitle,
  participantCount,
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

  const subtitle = [challengeTitle, participantCount ? `참여자 ${participantCount}명` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      disablePointerDismissal={submitting}
      backdropClassName="bg-slate-900/45"
      className="relative flex w-full max-w-app flex-col gap-4 rounded-3xl bg-white px-5 pt-[22px] pb-[18px]"
    >
      <>
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span aria-hidden className="grid size-[52px] place-items-center rounded-2xl bg-red-50 text-red-700">
            <AlertTriangle className="size-6" />
          </span>
          <ModalTitle className="text-[19px] font-extrabold text-slate-800">챌린지를 중단할까요?</ModalTitle>
          {subtitle && <ModalDescription className="text-[13px] text-slate-500">{subtitle}</ModalDescription>}
        </div>

        <ul className="flex flex-col gap-2 rounded-[14px] bg-slate-50 px-3.5 py-3 text-[13.5px] text-slate-600">
          <li className="flex items-center gap-2">
            <Check className="size-3.5 shrink-0 text-slate-400" />
            지금까지 인증한 기록은 그대로 남아요
          </li>
          <li className="flex items-center gap-2">
            <X className="size-3.5 shrink-0 text-slate-400" />
            오늘부터 남은 날은 정산에서 빠져요
          </li>
          <li className="flex items-center gap-2">
            <Lock className="size-3.5 shrink-0 text-slate-400" />
            중단하면 다시 시작할 수 없어요
          </li>
        </ul>

        <Field
          label={
            <>
              중단 이유 <span className="font-normal text-slate-500">(선택) · 참여자에게 보여요</span>
            </>
          }
          htmlFor="abort-reason"
        >
          <TextAreaField
            id="abort-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 모임 일정이 바뀌었어요"
            maxLength={200}
            className="min-h-[72px]"
            disabled={submitting}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={submitting}>
            계속 진행
          </Button>
          <Button type="button" variant="danger" className="flex-1" onClick={handleAbort} disabled={submitting}>
            {submitting ? '중단 처리 중...' : '중단하기'}
          </Button>
        </div>
      </>
    </Modal>
  );
};

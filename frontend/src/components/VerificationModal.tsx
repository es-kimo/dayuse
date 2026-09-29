import { Camera as ScreenCamera, ImageIcon as ScreenImageIcon, Clipboard as ScreenClipboard, X as ScreenX } from './screens/ScreenIcons';
import React, { useState, useRef, useEffect } from 'react';
import { verificationsApi } from '../api/verifications';
import { recordsApi } from '../api/records';
import type { TodayAction, VerificationDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShareCardModal } from './ShareCardModal';
import { useClipboardImagePaste, validateImageFile } from '../hooks/useClipboardImagePaste';
import { Modal, ModalTitle, ModalDescription, ModalClose } from './ui/Modal';
import {
  getTodayKstString,
  addDaysKst,
  isNightGraceWindow,
  getKstHour,
  formatMonthDay,
} from '../utils/date';
import {
  Loader2,
  CheckCircle2,
  Share2,
  Repeat,
  Trash2,
} from 'lucide-react';

interface VerificationModalProps {
  action: TodayAction | { challengeId: number; challengeTitle: string; verificationCriteria?: string };
  recordId?: number;
  targetDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  action,
  recordId,
  targetDate,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState<boolean>(false);

  /*
   * 부모가 이 모달을 조건부로 마운트하므로 열림 상태를 내부에서 들고 있는다.
   * 닫을 때 바로 부모의 onClose를 부르면 노드가 즉시 사라져 이탈 전환이 못 돈다.
   * Modal이 애니메이션 완료를 알려주면(onOpenChangeComplete) 그때 부모에 알린다.
   */
  const [open, setOpen] = useState<boolean>(true);
  const requestClose = () => setOpen(false);
  const [createdVerification, setCreatedVerification] = useState<VerificationDetail | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // KST 기준 날짜 및 심야 유예 시간(00:00 ~ 09:00) 판별
  const todayKst = getTodayKstString();
  const yesterdayKst = addDaysKst(todayKst, -1);
  const isNightGrace = isNightGraceWindow();

  // 기본 대상 날짜 결정:
  // - targetDate가 직접 명시된 경우 최우선 사용
  // - recordId가 있는 늦은 인증인 경우: targetDate 없으면 yesterdayKst 기본
  // - 일반 인증이면서 심야(00:00~05:00)인 경우: 전날 밤 인증을 마무리하려는 경우가 많으므로 yesterdayKst 추천
  // - 그 외(05:00~09:00 아침 또는 09:00 이후): todayKst 기본
  const initialTargetDate = targetDate
    ? targetDate
    : recordId
    ? yesterdayKst
    : isNightGrace && getKstHour() < 5
    ? yesterdayKst
    : todayKst;

  const [selectedTargetDate, setSelectedTargetDate] = useState<string>(initialTargetDate);

  // 모달 오픈 시 배경 스크롤 방지 및 언마운트 시 ObjectURL 해제
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 새로운 파일 적용 파이프라인 (검증, 미리보기 URL 생성, 메모리 해제)
  const applyNewFile = (newFile: File) => {
    const validation = validateImageFile(newFile);
    if (!validation.valid) {
      setErrorMessage(validation.error || '유효하지 않은 이미지 파일입니다.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setErrorMessage(null);
    setCanRetry(false);
    setFile(newFile);

    const url = URL.createObjectURL(newFile);
    setPreviewUrl(url);
  };

  // 클립보드 붙여넣기 훅 연동
  useClipboardImagePaste({
    enabled: !isSubmitting && !createdVerification,
    hasExistingImage: !!file,
    onImagePasted: (pastedFile) => {
      applyNewFile(pastedFile);
    },
    onError: (msg) => {
      setErrorMessage(msg);
    },
    onConfirmReplace: (newFile) => {
      setPendingReplaceFile(newFile);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    applyNewFile(selected);
  };

  const handleRemovePhoto = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  const handleConfirmReplace = () => {
    if (pendingReplaceFile) {
      applyNewFile(pendingReplaceFile);
      setPendingReplaceFile(null);
    }
  };

  const handleCancelReplace = () => {
    setPendingReplaceFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setCanRetry(false);

    try {
      // 1. S3 Presigned URL 발급
      const presignedData = await verificationsApi.getPresignedUrl({
        challengeId: action.challengeId,
        filename: file.name,
        contentType: file.type || 'image/jpeg',
        fileSize: file.size,
      });

      // 2. S3 직업로드 (PUT)
      await verificationsApi.uploadToS3(presignedData.presignedUrl, file);

      // 3. 인증 등록 (늦은 인증 vs 일반 인증)
      const uploadedKey = presignedData.imageKey || presignedData.presignedUrl.split('?')[0];
      let savedVerification: VerificationDetail;
      if (recordId) {
        savedVerification = await recordsApi.verifyLate(recordId, {
          imageUrl: uploadedKey,
          comment: comment.trim() || undefined,
        });
      } else {
        savedVerification = await verificationsApi.createVerification({
          challengeId: action.challengeId,
          imageUrl: uploadedKey,
          comment: comment.trim() || undefined,
          targetDate: selectedTargetDate,
        });
      }

      setCreatedVerification(savedVerification);
    } catch (err: any) {
      console.error('인증 등록 실패:', err);
      const msg =
        err.response?.data?.message ||
        (err.message?.includes('Network')
          ? '이미지 업로드 중 네트워크 오류가 발생했습니다.'
          : '인증 등록 중 오류가 발생했습니다.');
      setErrorMessage(msg);
      // 업로드 실패 시 입력값 유지 및 재시도 활성화
      setCanRetry(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdVerification) {
    return (
      <Modal
        open={open}
        animateInitialOpen
        onOpenChange={setOpen}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) onSuccess();
        }}
        backdropClassName="bg-black/60 backdrop-blur-xs"
        className="bg-white w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl space-y-4"
      >
        <>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <ModalTitle className="text-base font-bold text-slate-800">인증이 완료되었습니다! 🎉</ModalTitle>
            <ModalDescription className="text-xs text-slate-500">오늘의 멋진 도전을 기록했습니다.</ModalDescription>
          </div>
          <div className="pt-2 space-y-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md shadow-blue-500/20"
            >
              <Share2 className="w-4 h-4" />
              <span>오늘 인증 공유 카드 만들기</span>
            </button>
            <button
              type="button"
              onClick={requestClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              확인
            </button>
          </div>
          {showShareModal && (
            <ShareCardModal
              cardType="TODAY_VERIFICATION"
              targetId={createdVerification.id}
              title={action.challengeTitle}
              userNickname={user?.nickname || '참여자'}
              imageUrl={previewUrl || createdVerification.imageUrl}
              comment={createdVerification.comment}
              targetDate={createdVerification.targetDate}
              onClose={() => {
                setShowShareModal(false);
                onSuccess();
              }}
            />
          )}
        </>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      animateInitialOpen
      placement="screen-bottom"
      disablePointerDismissal={isSubmitting}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onClose();
      }}
      backdropClassName="bg-black/60 backdrop-blur-xs"
      className="bg-white w-full max-w-[390px] rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
    >
      <>
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto -mt-1 mb-2" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <ModalTitle className="text-lg font-bold text-slate-800">
              {recordId ? '늦은 사진 인증' : '오늘 사진 인증'}
            </ModalTitle>
            <ModalDescription className="text-xs text-blue-600 font-semibold mt-0.5">
              {action.challengeTitle}
            </ModalDescription>
          </div>
          <ModalClose
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            disabled={isSubmitting}
            aria-label="닫기"
          >
            <ScreenX className="w-5 h-5" />
          </ModalClose>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!recordId && isNightGrace && (
            <div className="space-y-1.5">
              <label htmlFor="verification-date" className="block text-xs font-bold text-slate-700">
                인증할 날짜
              </label>
              <select
                id="verification-date"
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-600 transition"
                value={selectedTargetDate}
                onChange={(e) => setSelectedTargetDate(e.target.value)}
                disabled={isSubmitting}
              >
                <option value={yesterdayKst}>{formatMonthDay(yesterdayKst)} 어제 인증</option>
                <option value={todayKst}>{formatMonthDay(todayKst)} 오늘 인증</option>
              </select>
            </div>
          )}
          <div className="text-xs text-slate-600 bg-blue-50/70 border border-blue-100 rounded-xl px-3.5 py-2.5 leading-relaxed">
            <strong className="font-bold text-slate-800 mr-1.5">인증 기준</strong> {action.verificationCriteria}
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileChange}
            hidden
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            hidden
          />
          {previewUrl ? (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={previewUrl}
                  alt="인증 사진 미리보기"
                  className="w-full max-h-[280px] object-contain mx-auto"
                />
                <button
                  type="button"
                  className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/80 text-white font-semibold text-xs backdrop-blur-xs transition cursor-pointer"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  사진 변경
                </button>
              </div>
              <button
                type="button"
                className="w-full py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                onClick={handleRemovePhoto}
                disabled={isSubmitting}
              >
                <Trash2 className="w-3.5 h-3.5" />
                삭제
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 bg-slate-50 transition cursor-pointer text-slate-700 gap-1.5"
                >
                  <ScreenCamera className="w-6 h-6 text-blue-600" />
                  <span className="text-xs font-bold">카메라 촬영</span>
                  <span className="text-[11px] text-slate-400">지금 바로 찍기</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 bg-slate-50 transition cursor-pointer text-slate-700 gap-1.5"
                >
                  <ScreenImageIcon className="w-6 h-6 text-blue-600" />
                  <span className="text-xs font-bold">갤러리 선택</span>
                  <span className="text-[11px] text-slate-400">캡처·사진 고르기</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <ScreenClipboard className="w-3.5 h-3.5" />
                캡처한 이미지는 붙여넣기(⌘V · Ctrl+V)로도 올릴 수 있어요
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="verification-comment" className="text-xs font-bold text-slate-700">
                인증 한마디 <span className="font-normal text-slate-400">(선택)</span>
              </label>
              <div className="text-[11px] text-slate-400">{comment.length} / 200</div>
            </div>
            <textarea
              className="w-full h-20 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition resize-none"
              id="verification-comment"
              maxLength={200}
              placeholder="오늘 한 일을 한 줄로 남겨 보세요"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          {errorMessage && (
            <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
              {errorMessage}
            </p>
          )}
          <button
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            type="submit"
            disabled={!file || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                인증 업로드 중...
              </>
            ) : !file ? (
              '사진을 먼저 올려 주세요'
            ) : canRetry ? (
              '다시 시도하기'
            ) : recordId ? (
              `${formatMonthDay(targetDate || yesterdayKst)} 늦은 인증 완료하기`
            ) : (
              '인증 완료하기'
            )}
          </button>
        </form>

        {/* 기존 사진 존재 시 클립보드 붙여넣기 사진 교체 확인 다이얼로그 */}
        {pendingReplaceFile && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs rounded-t-3xl sm:rounded-2xl z-20 flex items-center justify-center p-5 reveal">
            <div className="bg-white rounded-2xl p-5 shadow-xl max-w-xs w-full text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Repeat className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">기존 첨부된 사진을 변경하시겠습니까?</h4>
                <p className="text-[11px] text-slate-500">
                  클립보드에서 새로 감지된 이미지로 사진이 교체됩니다.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelReplace}
                  className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                >
                  유지하기
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReplace}
                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-xs"
                >
                  변경하기
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </Modal>
  );
};

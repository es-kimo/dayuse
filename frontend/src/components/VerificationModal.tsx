import { Camera as ScreenCamera, ImageIcon as ScreenImageIcon, Clipboard as ScreenClipboard, X as ScreenX } from './screens/ScreenIcons';
import React, { useState, useRef, useEffect } from 'react';
import { verificationsApi } from '../api/verifications';
import { recordsApi } from '../api/records';
import type { TodayAction, VerificationDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { useUiVersion } from '../context/UiVersionContext';
import { logCertFlowAction } from '../hooks/useFeatureLogging';
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
  Smartphone,
} from 'lucide-react';
import { IosInstallGuideModal } from './IosInstallGuideModal';
import { isStandalone, isIos } from '../utils/webPush';
import { logPwaImpression, logPwaGuideOpen } from '../utils/pwaAnalytics';

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
  const { uiVersion } = useUiVersion();

  useEffect(() => {
    void logCertFlowAction(uiVersion, 'CERT_FLOW_ENTER', { challengeId: action.challengeId });
  }, [uiVersion, action.challengeId]);

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
  const [postSuccessAction, setPostSuccessAction] = useState<'success' | 'share' | 'install_guide'>('success');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);

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

  // previewUrl 변경 또는 언마운트 시 ObjectURL 해제
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 모달 언마운트 시 body overflow 잠금 잔여물 정리 (안전장치)
  useEffect(() => {
    return () => {
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
    };
  }, []);

  // 인증 완료 시 PWA 설치 안내 노출 로깅 (비 standalone 환경)
  useEffect(() => {
    if (createdVerification && !isStandalone()) {
      logPwaImpression('verification_success');
    }
  }, [createdVerification]);

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
      void logCertFlowAction(uiVersion, 'CERT_FLOW_SUCCESS', {
        challengeId: action.challengeId,
        verificationId: savedVerification.id,
      });
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
      void logCertFlowAction(uiVersion, 'CERT_FLOW_FAIL', {
        challengeId: action.challengeId,
        error: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdVerification) {
    if (showShareModal) {
      return (
        <ShareCardModal
          cardType="TODAY_VERIFICATION"
          targetId={createdVerification.id}
          title={action.challengeTitle}
          userNickname={user?.nickname || '참여자'}
          imageUrl={previewUrl || createdVerification.imageUrl}
          comment={createdVerification.comment}
          targetDate={createdVerification.targetDate}
          onClose={onSuccess}
        />
      );
    }

    if (showInstallGuideModal) {
      return (
        <IosInstallGuideModal
          isOpen={true}
          onClose={onSuccess}
          initialPlatform={isIos() ? 'ios' : 'android'}
        />
      );
    }

    return (
      <Modal
        open={open}
        animateInitialOpen
        onOpenChange={setOpen}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) {
            if (postSuccessAction === 'share') {
              setShowShareModal(true);
            } else if (postSuccessAction === 'install_guide') {
              setShowInstallGuideModal(true);
            } else {
              onSuccess();
            }
          }
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
              type="button"
              onClick={() => {
                setPostSuccessAction('share');
                setOpen(false);
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md shadow-blue-500/20"
            >
              <Share2 className="w-4 h-4" />
              <span>오늘 인증 공유 카드 만들기</span>
            </button>

            {!isStandalone() && (
              <button
                type="button"
                onClick={() => {
                  logPwaGuideOpen('verification_success');
                  setPostSuccessAction('install_guide');
                  setOpen(false);
                }}
                className="w-full py-2.5 bg-blue-50/80 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>내일도 바로 열기 (홈 화면에 앱 추가)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setPostSuccessAction('success');
                requestClose();
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              확인
            </button>
          </div>
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
      backdropClassName="bg-slate-900/45"
      className="bg-white w-full max-w-app rounded-t-[26px] px-5 pt-2.5 pb-5 space-y-3.5 max-h-[92vh] overflow-y-auto"
    >
      <>
        <div className="w-10 h-[5px] rounded-[2.5px] bg-slate-300 mx-auto" aria-hidden="true" />
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <ModalTitle className="text-[19px] font-extrabold text-slate-800">
              {recordId ? '늦은 사진 인증' : '오늘 사진 인증'}
            </ModalTitle>
            <ModalDescription className="text-[13.5px] font-semibold text-blue-600">
              {action.challengeTitle}
            </ModalDescription>
          </div>
          <ModalClose
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
            disabled={isSubmitting}
            aria-label="닫기"
          >
            <ScreenX className="size-[22px]" />
          </ModalClose>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!recordId && isNightGrace && (
            <div className="space-y-2">
              <label htmlFor="verification-date" className="block text-[14px] font-bold text-slate-800">
                인증할 날짜
              </label>
              <select
                id="verification-date"
                className="h-[50px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[15.5px] text-slate-800 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-100 focus:outline-none"
                value={selectedTargetDate}
                onChange={(e) => setSelectedTargetDate(e.target.value)}
                disabled={isSubmitting}
              >
                <option value={yesterdayKst}>{formatMonthDay(yesterdayKst)} 어제 인증</option>
                <option value={todayKst}>{formatMonthDay(todayKst)} 오늘 인증</option>
              </select>
            </div>
          )}
          <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-[13px] leading-[1.5] text-slate-600">
            <strong className="mr-1.5 font-bold text-slate-800">인증 기준</strong>
            {action.verificationCriteria}
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
              <div className="relative overflow-hidden rounded-2xl bg-slate-100">
                <img src={previewUrl} alt="인증 사진 미리보기" className="mx-auto max-h-[280px] w-full object-contain" />
                <button
                  type="button"
                  className="absolute top-2.5 right-2.5 h-[30px] cursor-pointer rounded-[9px] bg-slate-900/72 px-2.5 text-[12px] font-bold text-white transition-colors hover:bg-slate-900/85"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  사진 변경
                </button>
              </div>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold text-red-700 transition-colors hover:bg-red-50"
                onClick={handleRemovePhoto}
                disabled={isSubmitting}
              >
                <Trash2 className="size-3.5" />
                삭제
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex h-[112px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-blue-600 hover:bg-blue-50"
                >
                  <ScreenCamera className="size-[26px] text-blue-600" />
                  <span className="text-[14px] font-bold text-slate-800">카메라 촬영</span>
                  <span className="text-[12px] text-slate-500">지금 바로 찍기</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex h-[112px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-blue-600 hover:bg-blue-50"
                >
                  <ScreenImageIcon className="size-[26px] text-blue-600" />
                  <span className="text-[14px] font-bold text-slate-800">갤러리 선택</span>
                  <span className="text-[12px] text-slate-500">캡처·사진 고르기</span>
                </button>
              </div>
              <p className="flex items-center gap-1.5 text-[12.5px] text-slate-500">
                <ScreenClipboard className="size-3.5 shrink-0" />
                캡처한 이미지는 붙여넣기(⌘V · Ctrl+V)로도 올릴 수 있어요
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="verification-comment" className="block text-[14px] font-bold text-slate-800">
              인증 한마디 <span className="font-normal text-slate-500">(선택)</span>
            </label>
            <textarea
              className="min-h-[84px] w-full resize-none rounded-xl border border-slate-300 bg-white px-[15px] py-[13px] text-[15.5px] leading-[1.5] text-slate-800 placeholder:text-slate-800/55 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-100 focus:outline-none"
              id="verification-comment"
              maxLength={200}
              placeholder="오늘 한 일을 한 줄로 남겨 보세요"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="text-right text-[12px] tabular-nums text-slate-400">{comment.length} / 200</div>
          </div>
          {errorMessage && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
              {errorMessage}
            </p>
          )}
          <button
            className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[14px] bg-blue-600 text-base font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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

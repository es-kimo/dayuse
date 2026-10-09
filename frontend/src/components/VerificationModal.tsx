import { NoticeTransition } from './announcement/NoticeTransition';
import { Camera as ScreenCamera, ImageIcon as ScreenImageIcon, Clipboard as ScreenClipboard, X as ScreenX } from './screens/ScreenIcons';
import React, { useState, useRef, useEffect } from 'react';
import { verificationsApi } from '../api/verifications';
import { recordsApi } from '../api/records';
import type { TodayAction, VerificationDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { track } from '../utils/tracker';
import { useTrackOnce } from '../hooks/useTrackOnce';
import { toFailureReason, toStatusCode } from '../utils/trackErrorReason';
import { ShareCardModal } from './ShareCardModal';
import { RedayTicketSheet } from './RedayTicketSheet';
import { useClipboardImagePaste, validateImageFile } from '../hooks/useClipboardImagePaste';
import { Modal, ModalTitle, ModalDescription, ModalClose } from './ui/Modal';
import {
  getTodayKstString,
  addDaysKst,
  formatMonthDay,
} from '../utils/date';
import {
  Loader2,
  Share2,
  Repeat,
  Trash2,
  Smartphone,
  ChevronRight,
  Ticket,
} from 'lucide-react';
import { Dayu } from './dayu/DayuAvatar';
import { Button } from './dayu/ui';
import { IosInstallGuideModal } from './IosInstallGuideModal';
import { isStandalone, isIos } from '../utils/webPush';
import { logPwaImpression, logPwaGuideOpen } from '../utils/pwaAnalytics';
import { useVerificationDraft } from '../context/VerificationDraftContext';
import { usePlacementNotice } from '../hooks/usePlacementNotice';
import { InlineAnnouncementCard } from './announcement/InlineAnnouncementCard';
import { executeAnnouncementCta } from '../utils/announcementCtaHandler';
import { clearAnnouncementAttribution, consumeAnnouncementAttribution } from '../utils/announcementAttribution';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

interface VerificationModalProps {
  action:
    | TodayAction
    | { challengeId: number; challengeTitle: string; verificationCriteria?: string; groupId?: number };
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

  /*
   * 인증 퍼널 문맥. 내부 식별자만 싣는다.
   * 인증 사진·문구·닉네임 등 사용자 콘텐츠는 이벤트 properties에 절대 넣지 않는다.
   */
  const certContext = {
    challengeId: action.challengeId,
    groupId: action.groupId ?? null,
    isLate: !!recordId,
  };

  /*
   * 인증 작성 흐름 진입. 모달 인스턴스당 1회만 기록한다.
   */
  useTrackOnce('certification_started', certContext);

  const navigate = useNavigate();
  const { showToast } = useToast();
  const { draft, saveDraft, clearDraft, hasDraftFor } = useVerificationDraft();
  const { notice: inlineNotice, dismiss: dismissInlineNotice } = usePlacementNotice('CERT_CREATE');

  // 드래프트 복원 여부 확인
  const isDraftMatch = hasDraftFor(action.challengeId, recordId);
  const initialDraft = isDraftMatch ? draft : null;

  const [file, setFile] = useState<File | null>(() => initialDraft?.file ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => initialDraft?.previewUrl ?? null);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
  const [comment, setComment] = useState<string>(() => initialDraft?.comment ?? '');
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

  // 인라인 공지 '자세히 보기' 이동 시 현재 입력 내용과 첨부 파일 보존 후 이동
  const handleInlineNoticeDetail = () => {
    if (!inlineNotice) return;
    saveDraft({
      challengeId: action.challengeId,
      challengeTitle: action.challengeTitle,
      verificationCriteria: action.verificationCriteria,
      groupId: action.groupId,
      recordId,
      targetDate,
      comment,
      file,
      previewUrl,
    });
    navigate(`/announcements/${inlineNotice.id}`);
  };

  const handleInlineNoticeCta = () => {
    if (!inlineNotice) return;
    saveDraft({
      challengeId: action.challengeId,
      challengeTitle: action.challengeTitle,
      verificationCriteria: action.verificationCriteria,
      groupId: action.groupId,
      recordId,
      targetDate,
      comment,
      file,
      previewUrl,
    });
    void executeAnnouncementCta({
      target: inlineNotice.ctaTarget,
      announcementId: inlineNotice.id,
      placement: 'CERT_CREATE',
      featureKey: inlineNotice.featureKey,
      navigate,
      showToast,
      activeGroupId: action.groupId,
    });
  };
  const [createdVerification, setCreatedVerification] = useState<VerificationDetail | null>(null);
  const [postSuccessAction, setPostSuccessAction] = useState<'success' | 'share' | 'install_guide' | 'reday'>('success');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);
  const [showRedaySheet, setShowRedaySheet] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // KST 기준 날짜
  const todayKst = getTodayKstString();
  const yesterdayKst = addDaysKst(todayKst, -1);

  /*
   * 일반 인증의 대상 날짜는 부모가 명시한 targetDate, 없으면 항상 오늘이다.
   * 과거 날짜 인증은 recordId 기반 늦은 인증(verifyLate) 경로로만 처리한다.
   * 모달에서 임의로 과거 날짜를 고르게 하면 해당 날짜 인증 여부를 모르는 상태로
   * S3 업로드까지 끝낸 뒤 서버 중복 검사에서만 실패한다.
   */
  const effectiveTargetDate = targetDate || todayKst;

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
          targetDate: effectiveTargetDate,
        });
      }

      setCreatedVerification(savedVerification);
      clearDraft();
      // 인증 저장 API가 실제로 성공한 뒤에만 completed를 기록한다(failed와 배타적).
      // 소식 CTA 클릭으로 이어진 인증 성공인 경우 출처를 함께 기록하고 즉시 해제한다. (F10)
      track('certification_completed', consumeAnnouncementAttribution({
        ...certContext,
        verificationId: savedVerification.id,
      }));
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
      // 실패 사유는 거친 분류값으로만 남긴다. 서버 메시지 원문은 싣지 않는다.
      track('certification_failed', {
        ...certContext,
        reason: toFailureReason(err),
        statusCode: toStatusCode(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdVerification) {
    /*
     * 지각 인증 직후 리데이 안내.
     * 서버가 이 기록에 대해 '리데이 사용 가능'이라고 판정한 경우에만 띄운다.
     * 적격 판정은 챌린지 정책(주 N회·함께하기·리데이 미허용)과 기한·벌금 상태까지 모두 본 결과다.
     */
    const redayRecordId = createdVerification.dailyRecordId;
    const redayAvailable = Boolean(createdVerification.redayEligible && redayRecordId);

    if (showRedaySheet && redayRecordId) {
      return (
        <RedayTicketSheet
          open={true}
          dailyRecordId={redayRecordId}
          targetDate={createdVerification.targetDate}
          challengeTitle={action.challengeTitle}
          onClose={onSuccess}
        />
      );
    }

    if (showShareModal) {
      return (
        <ShareCardModal
          cardType="TODAY_VERIFICATION"
          targetId={createdVerification.id}
          challengeId={action.challengeId}
          groupId={action.groupId}
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
            } else if (postSuccessAction === 'reday') {
              setShowRedaySheet(true);
            } else {
              onSuccess();
            }
          }
        }}
        placement="bottom"
        backdropClassName="bg-slate-900/45"
        className="flex max-h-[92dvh] w-full max-w-app flex-col gap-5 overflow-y-auto overscroll-contain rounded-t-[26px] bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:rounded-[26px]"
      >
        <div className="flex justify-end">
          <ModalClose
            aria-label="닫기"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <ScreenX className="size-[22px]" />
          </ModalClose>
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <Dayu face="cheer" size={72} />
          <div>
            <ModalTitle className="text-[21px] font-extrabold tracking-[-0.02em] text-slate-800">
              {redayAvailable ? '늦었지만 해냈네요!' : '인증을 완료했어요!'}
            </ModalTitle>
            <ModalDescription className="mt-2 text-[14px] leading-relaxed text-slate-500">
              {redayAvailable
                ? '리데이 티켓을 사용하면 이번 벌금이 면제돼요. 지각 기록은 그대로 남아요.'
                : '오늘의 도전이 기록됐어요. 수고했어요!'}
            </ModalDescription>
          </div>
          <p className="max-w-full break-words text-[14px] font-semibold text-slate-700">{action.challengeTitle}</p>
        </div>

        <div className="flex flex-col gap-2">
          {redayAvailable && (
            <Button
              size="lg"
              className="w-full shrink-0"
              onClick={() => {
                setPostSuccessAction('reday');
                setOpen(false);
              }}
            >
              <Ticket className="size-4 shrink-0" />
              리데이 티켓으로 벌금 면제하기
            </Button>
          )}
          <Button
            variant={redayAvailable ? 'line' : 'primary'}
            size="lg"
            className="w-full shrink-0"
            onClick={() => {
              setPostSuccessAction('success');
              requestClose();
            }}
          >
            확인
          </Button>
          <Button
            variant="line"
            className="w-full shrink-0"
            onClick={() => {
              setPostSuccessAction('share');
              setOpen(false);
            }}
          >
            <Share2 className="size-4 shrink-0" />
            인증 카드 공유하기
          </Button>
        </div>

        {!isStandalone() && (
          <button
            type="button"
            onClick={() => {
              logPwaGuideOpen('verification_success');
              setPostSuccessAction('install_guide');
              setOpen(false);
            }}
            className="flex w-full shrink-0 cursor-pointer items-center gap-3 rounded-[18px] bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Smartphone className="size-5" />
            </span>
            <span className="min-w-0 flex-1 break-words">
              <span className="block text-[14px] font-bold text-slate-800">홈 화면에 추가하기</span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-slate-500">내일은 홈 화면에서 바로 열어보세요.</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          </button>
        )}
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
        if (!isOpen) {
          clearDraft();
          clearAnnouncementAttribution();
          onClose();
        }
      }}
      backdropClassName="bg-slate-900/45"
      className="bg-white w-full max-w-app rounded-t-[26px] px-5 pt-2.5 pb-5 flex flex-col gap-3.5 [&>*]:shrink-0 max-h-[92vh] overflow-y-auto"
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

        <NoticeTransition noticeKey={`announcement:${inlineNotice?.id ?? 'empty'}`}>
          {inlineNotice && (
            <InlineAnnouncementCard
              announcement={inlineNotice}
              onDismiss={dismissInlineNotice}
              onDetail={handleInlineNoticeDetail}
              onCtaClick={handleInlineNoticeCta}
            />
          )}
        </NoticeTransition>

        <form onSubmit={handleSubmit} className="space-y-3.5">
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

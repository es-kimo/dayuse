import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { verificationsApi } from '../api/verifications';
import { recordsApi } from '../api/records';
import type { TodayAction, VerificationDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShareCardModal } from './ShareCardModal';
import { useClipboardImagePaste, validateImageFile } from '../hooks/useClipboardImagePaste';
import {
  getTodayKstString,
  addDaysKst,
  isNightGraceWindow,
  getKstHour,
  formatMonthDay,
} from '../utils/date';
import {
  X,
  Camera,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Share2,
  Clock,
  Moon,
  Sun,
  Clipboard,
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
    return createPortal(
      <div className="fixed inset-0 z-modal w-screen h-[100dvh] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">인증이 완료되었습니다! 🎉</h3>
            <p className="text-xs text-slate-500">오늘의 멋진 도전을 기록했습니다.</p>
          </div>
          <div className="pt-2 space-y-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-500/20"
            >
              <Share2 className="w-4 h-4" />
              <span>오늘 인증 공유 카드 만들기</span>
            </button>
            <button
              onClick={onSuccess}
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
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-modal w-screen h-[100dvh] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto p-5 shadow-2xl flex flex-col relative">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              {recordId
                ? '늦은 사진 인증'
                : isNightGrace
                ? '심야/새벽 사진 인증'
                : '오늘 사진 인증'}
            </h2>
            <p className="text-[11px] text-blue-600 font-medium truncate">{action.challengeTitle}</p>
            {recordId && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-1 inline-block">
                {formatMonthDay(targetDate || yesterdayKst)} 대상 · 익일 오전 9시 이전 등록 시 정상 인정 (지각 제외)
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 심야/새벽(00:00~09:00) 인증 대상 날짜 선택 세그먼트 */}
          {!recordId && isNightGrace && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  인증 대상 날짜 선택
                </span>
                <span className="text-[10px] text-blue-600 bg-blue-50 font-medium px-2 py-0.5 rounded-full border border-blue-200">
                  오전 09:00까지 유예 시간
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 어제 인증 선택 */}
                <button
                  type="button"
                  onClick={() => setSelectedTargetDate(yesterdayKst)}
                  className={`p-2.5 rounded-md border text-left transition flex flex-col justify-between ${
                    selectedTargetDate === yesterdayKst
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Moon className="w-3 h-3 text-indigo-500" />
                      어제 ({formatMonthDay(yesterdayKst)})
                    </span>
                    {selectedTargetDate === yesterdayKst && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
                    09:00까지 정상 인정
                  </span>
                </button>

                {/* 오늘 인증 선택 */}
                <button
                  type="button"
                  onClick={() => setSelectedTargetDate(todayKst)}
                  className={`p-2.5 rounded-md border text-left transition flex flex-col justify-between ${
                    selectedTargetDate === todayKst
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-500" />
                      오늘 ({formatMonthDay(todayKst)})
                    </span>
                    {selectedTargetDate === todayKst && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                    오늘의 새로운 도전
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                {selectedTargetDate === yesterdayKst
                  ? '🌙 어젯밤 인증을 깜빡하셨나요? 오전 9시 이전 등록 시 벌금 없이 정상 인정됩니다.'
                  : '☀️ 오늘자 실천 내용으로 인증을 등록합니다.'}
              </p>
            </div>
          )}

          {/* 인증 기준 안내 */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-md p-3 text-[11px] text-blue-900 leading-relaxed">
            <span className="font-bold">인증 기준:</span> {action.verificationCriteria}
          </div>

          {/* 사진 선택 / 미리보기 영역 */}
          <div>
            {/* 카메라 직접 촬영용 (capture="environment") */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* 갤러리/파일 보관함 선택용 (capture 없음) */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-4/3 bg-slate-900 group">
                  <img
                    src={previewUrl}
                    alt="인증 사진 미리보기"
                    className="w-full h-full object-cover"
                  />
                  {!isSubmitting && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition shadow-md"
                        title="사진 삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 첨부 완료 후 교체 / 삭제 액션 바 */}
                {!isSubmitting && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      사진이 첨부되었습니다
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 py-1 px-2 hover:bg-blue-50 rounded-md transition"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        사진 변경
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 py-1 px-2 hover:bg-rose-50 rounded-md transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  {/* 카메라 촬영 버튼 */}
                  <button
                    type="button"
                    onClick={() => !isSubmitting && cameraInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="p-4 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-md flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50/30 transition active:scale-98 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-700 block">카메라 촬영</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">즉시 사진 찍기</span>
                    </div>
                  </button>

                  {/* 갤러리 선택 버튼 */}
                  <button
                    type="button"
                    onClick={() => !isSubmitting && galleryInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="p-4 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-md flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50/30 transition active:scale-98 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-indigo-100/80 text-indigo-600 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-700 block">갤러리 선택</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">보관함에서 선택</span>
                    </div>
                  </button>
                </div>

                {/* 클립보드 붙여넣기 안내 힌트 뱃지 */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-md p-2.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                  <Clipboard className="w-3.5 h-3.5 text-blue-600" />
                  <span>캡처한 이미지를</span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-semibold text-slate-700 shadow-2xs">Ctrl+V</kbd>
                  <span>(또는</span>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-semibold text-slate-700 shadow-2xs">⌘+V</kbd>
                  <span>)로 바로 붙여넣을 수 있습니다.</span>
                </div>

                <p className="text-center text-[10px] text-slate-400">
                  JPG, PNG, WebP 형식 (최대 10MB)
                </p>
              </div>
            )}
          </div>

          {/* 인증 한마디 문구 입력 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">인증 한마디 (선택)</label>
              <span className="text-[10px] text-slate-400">{comment.length} / 200자</span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              disabled={isSubmitting}
              placeholder="오늘 실천한 소감이나 인증 한마디를 남겨보세요."
              rows={2}
              className="w-full text-base p-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-blue-500 transition resize-none text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-600 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
                {canRetry && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">
                    작성한 내용이 유지되어 있으니 다시 시도해 보세요.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 하단 액션 버튼 */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-md text-xs font-medium hover:bg-slate-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!file || isSubmitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>인증 업로드 중...</span>
                </>
              ) : canRetry ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>다시 시도하기</span>
                </>
              ) : (
                <span>
                  {recordId
                    ? `${formatMonthDay(targetDate || yesterdayKst)} 늦은 인증 완료하기`
                    : isNightGrace
                    ? `${formatMonthDay(selectedTargetDate)} 인증 완료하기`
                    : '인증 완료하기'}
                </span>
              )}
            </button>
          </div>
        </form>

        {/* 기존 사진 존재 시 클립보드 붙여넣기 사진 교체 확인 다이얼로그 */}
        {pendingReplaceFile && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs rounded-t-3xl sm:rounded-2xl z-20 flex items-center justify-center p-5 animate-in fade-in duration-150">
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
      </div>
    </div>,
    document.body
  );
};

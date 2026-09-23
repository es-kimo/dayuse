import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { verificationsApi } from '../api/verifications';
import { recordsApi } from '../api/records';
import type { TodayAction, VerificationDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShareCardModal } from './ShareCardModal';
import { X, Camera, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, CheckCircle2, Share2 } from 'lucide-react';

interface VerificationModalProps {
  action: TodayAction | { challengeId: number; challengeTitle: string; verificationCriteria?: string };
  recordId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  action,
  recordId,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState<boolean>(false);
  const [createdVerification, setCreatedVerification] = useState<VerificationDetail | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // 모달 오픈 시 배경 스크롤 방지
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // 10MB 검증
    if (selected.size > 10 * 1024 * 1024) {
      setErrorMessage('파일 크기는 최대 10MB 이하만 가능합니다.');
      return;
    }

    // 포맷 검증 (JPG, PNG, WebP)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selected.type)) {
      setErrorMessage('JPG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.');
      return;
    }

    setErrorMessage(null);
    setCanRetry(false);
    setFile(selected);

    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
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
      <div className="fixed inset-0 z-[90] w-screen h-[100dvh] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
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
    <div className="fixed inset-0 z-[90] w-screen h-[100dvh] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto p-5 shadow-2xl flex flex-col">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              {recordId ? '늦은 사진 인증' : '오늘 사진 인증'}
            </h2>
            <p className="text-[11px] text-blue-600 font-medium truncate">{action.challengeTitle}</p>
            {recordId && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-1 inline-block">
                익일 오전 9시 이전 등록 시 정상 인정 (지각 제외)
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
          {/* 인증 기준 안내 */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-900 leading-relaxed">
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
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-4/3 bg-slate-900 group">
                <img
                  src={previewUrl}
                  alt="인증 사진 미리보기"
                  className="w-full h-full object-cover"
                />
                {!isSubmitting && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition shadow-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  {/* 카메라 촬영 버튼 */}
                  <button
                    type="button"
                    onClick={() => !isSubmitting && cameraInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="p-4 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50/30 transition active:scale-98 cursor-pointer"
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
                    className="p-4 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-50/30 transition active:scale-98 cursor-pointer"
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
              className="w-full text-base p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 transition resize-none text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-600 text-[11px]">
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
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!file || isSubmitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition active:scale-98"
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
                <span>인증 완료하기</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

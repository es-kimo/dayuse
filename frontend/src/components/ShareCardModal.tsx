import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { shareApi } from '../api/share';
import { absoluteApiUrl } from '../api/client';
import { isKakaoReady, shareToKakao } from '../utils/kakao';
import { copyText, copyTextDeferred } from '../utils/clipboard';
import {
  canShareLink,
  isIOS,
  pickImageSaveStrategy,
} from '../utils/shareEnv';
import {
  blobToFile,
  captureCard,
  downloadBlob,
  fetchImageAsDataUrl,
} from '../utils/cardImage';
import { useToast } from '../context/ToastContext';
import type { ShareCardType, StreakHistoryItem } from '../types';
import {
  X,
  Download,
  Share2,
  Copy,
  Calendar,
  Loader2,
  Sparkles,
  Check,
} from 'lucide-react';
import { DayuLogo } from './brand/DayuLogo';
import { DayuExpression } from './brand/DayuExpression';

interface ShareCardModalProps {
  cardType: ShareCardType;
  targetId: number; // verificationId (for TODAY_VERIFICATION) or challengeId (for STREAK)
  title: string;
  userNickname: string;
  imageUrl?: string | null;
  comment?: string | null;
  streakDays?: number;
  historyJson?: string | null;
  targetDate?: string;
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  cardType,
  targetId,
  title,
  userNickname,
  imageUrl: initialImageUrl,
  comment,
  streakDays: initialStreakDays = 0,
  historyJson: initialHistoryJson,
  targetDate,
  onClose,
}) => {
  const { showToast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [streakDays, setStreakDays] = useState<number>(initialStreakDays);
  const [historyItems, setHistoryItems] = useState<StreakHistoryItem[]>([]);

  // 카드에 실제로 그릴 이미지. 외부 URL은 data URL로 바꿔 심어야 캡처에서 빠지지 않는다.
  const [cardImageSrc, setCardImageSrc] = useState<string | null>(initialImageUrl || null);
  const [imageEmbedFailed, setImageEmbedFailed] = useState(false);

  // 클릭 시점의 사용자 제스처를 쓰려면 캡처 결과가 미리 준비돼 있어야 한다.
  const [preparedFile, setPreparedFile] = useState<File | null>(null);

  // 저장/복사가 막힌 환경을 위한 수동 폴백 오버레이
  const [longPressUrl, setLongPressUrl] = useState<string | null>(null);
  const [manualCopyUrl, setManualCopyUrl] = useState<string | null>(null);

  // 토큰 사전 발급이 실패하면 버튼을 영영 잠그지 않고, 클릭 시 재시도하게 연다.
  const [tokenFailed, setTokenFailed] = useState(false);

  const [savingImage, setSavingImage] = useState(false);
  const [sharingKakao, setSharingKakao] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const [initializing, setInitializing] = useState(
    cardType === 'STREAK' && initialStreakDays === 0 && !initialHistoryJson
  );

  const tokenRequestRef = useRef<Promise<string> | null>(null);

  // 모달 오픈 시 배경 스크롤 방지
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (initialHistoryJson) {
      try {
        setHistoryItems(JSON.parse(initialHistoryJson));
      } catch (e) {
        console.error('Failed to parse historyJson:', e);
      }
    }
  }, [initialHistoryJson]);

  // 달성률 계산 (유효 기간 데이터 기준)
  const inPeriodItems = historyItems.filter((item) => item.inPeriod);
  const completedCount = inPeriodItems.filter((item) => item.completed).length;
  const totalDays = inPeriodItems.length;
  const hasAchievementData = totalDays > 0;
  const achievementRate = hasAchievementData ? Math.round((completedCount / totalDays) * 100) : 0;
  const recent7Items = historyItems.slice(-7);

  /** 공유 토큰 발급. 동시에 여러 번 눌러도 요청은 한 번만 나간다. */
  const requestShareToken = useCallback((): Promise<string> => {
    if (tokenRequestRef.current) return tokenRequestRef.current;

    const request = (
      cardType === 'TODAY_VERIFICATION'
        ? shareApi.createVerificationShare(targetId)
        : shareApi.createStreakShare(targetId)
    )
      .then((res) => {
        setShareToken(res.token);
        if (res.imageUrl) setImageUrl(res.imageUrl);
        if (cardType === 'STREAK') {
          setStreakDays(res.streakDays);
          if (res.historyJson) {
            try {
              setHistoryItems(JSON.parse(res.historyJson));
            } catch (e) {
              console.error('Failed to parse historyJson:', e);
            }
          }
        }
        return res.token;
      })
      .catch((err) => {
        // 실패한 약속을 캐싱해두면 재시도가 막힌다.
        tokenRequestRef.current = null;
        throw err;
      });

    tokenRequestRef.current = request;
    return request;
  }, [cardType, targetId]);

  // 모달이 열리면 토큰부터 확보한다.
  // 버튼을 누른 뒤에 발급하면 Safari가 클립보드를, 데스크톱 브라우저가 카카오 팝업을 막는다.
  useEffect(() => {
    requestShareToken()
      .catch((err) => {
        console.error('공유 토큰 사전 발급 실패:', err);
        setTokenFailed(true);
      })
      .finally(() => {
        setInitializing(false);
      });
  }, [requestShareToken]);

  // 외부 이미지를 data URL로 치환한다. 미리보기는 원본으로 먼저 띄워 빈 화면을 피한다.
  useEffect(() => {
    if (!imageUrl) {
      setCardImageSrc(null);
      return;
    }
    if (imageUrl.startsWith('data:')) {
      setCardImageSrc(imageUrl);
      return;
    }

    let cancelled = false;
    setCardImageSrc(imageUrl);

    fetchImageAsDataUrl(imageUrl).then((dataUrl) => {
      if (cancelled) return;
      if (dataUrl) {
        setCardImageSrc(dataUrl);
        setImageEmbedFailed(false);
      } else {
        setImageEmbedFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const buildFileName = useCallback(
    () => `dayuse-${cardType.toLowerCase()}-${Date.now()}.png`,
    [cardType]
  );

  // 카드를 미리 캡처해둔다. 저장 버튼을 눌렀을 때 네이티브 공유 시트까지의 지연을 없애기 위함이다.
  useEffect(() => {
    if (initializing) return;
    const node = cardRef.current;
    if (!node) return;

    let cancelled = false;
    setPreparedFile(null);

    // 방금 바뀐 이미지/숫자가 화면에 반영된 뒤에 찍는다.
    const timer = window.setTimeout(() => {
      captureCard(node)
        .then((blob) => {
          if (!cancelled) setPreparedFile(blobToFile(blob, buildFileName()));
        })
        .catch((err) => {
          console.warn('카드 사전 렌더에 실패했습니다. 저장 시 다시 시도합니다:', err);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [initializing, cardImageSrc, streakDays, historyItems.length, buildFileName]);

  // 폴백 오버레이가 만든 blob URL 정리
  useEffect(() => {
    return () => {
      if (longPressUrl) URL.revokeObjectURL(longPressUrl);
    };
  }, [longPressUrl]);

  // 링크가 필요한 두 기능은 토큰이 손에 들어온 뒤에만 눌리게 한다.
  // 발급 전에 눌리면 제스처가 끊겨 카카오 팝업 대신 링크 복사로 새어나간다.
  const preparingLink = initializing || (!shareToken && !tokenFailed);

  const buildShareUrl = (token: string) => `${window.location.origin}/shares/${token}`;

  // 카카오 썸네일은 S3 프리사인 URL을 쓸 수 없다. 60분이면 만료되는 데다,
  // 연속 기록 카드는 사진 자체가 없다. 만료 없는 서버 OG 엔드포인트로 넘긴다.
  const buildOgImageUrl = (token: string) => absoluteApiUrl(`/public/shares/${token}/og.jpg`);

  const shareDescription =
    cardType === 'TODAY_VERIFICATION'
      ? `${userNickname}님의 오늘 인증: "${comment || title}"`
      : `${userNickname}님이 ${streakDays}일 연속 인증을 달성했습니다! 🔥`;

  /**
   * 링크 복사 공통 경로.
   * 제스처가 살아 있는 동안 호출돼야 하므로 첫 줄에서 곧바로 클립보드 쓰기를 시작한다.
   */
  const copyWithFallback = async (urlPromise: Promise<string>, successMessage: string) => {
    const copied = await copyTextDeferred(urlPromise);
    if (copied) {
      showToast(successMessage, 'success');
      return;
    }

    // 클립보드가 막힌 환경(인앱 브라우저, 비보안 컨텍스트)에서는 직접 선택해 복사하게 한다.
    try {
      setManualCopyUrl(await urlPromise);
    } catch {
      showToast('공유 링크를 준비하지 못했습니다.', 'error');
    }
  };

  const shareUrlPromise = (): Promise<string> =>
    shareToken
      ? Promise.resolve(buildShareUrl(shareToken))
      : requestShareToken().then(buildShareUrl);

  // 1. 이미지 저장
  const handleSaveImage = async () => {
    if (savingImage || initializing) return;
    setSavingImage(true);

    try {
      let file = preparedFile;
      if (!file) {
        if (!cardRef.current) return;
        file = blobToFile(await captureCard(cardRef.current), buildFileName());
        setPreparedFile(file);
      }

      if (imageEmbedFailed) {
        showToast('인증 사진을 불러오지 못해 사진 없이 저장됩니다.', 'warning');
      }

      const strategy = pickImageSaveStrategy(file);

      if (strategy === 'share-sheet') {
        try {
          await navigator.share({
            files: [file],
            title: `데이유즈 | ${title}`,
            text: `${userNickname}님의 데이유즈 공유 카드`,
          });
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return;
          console.warn('공유 시트 저장에 실패해 대체 경로로 전환합니다:', shareErr);
          // iOS는 a[download]로 사진 앱에 저장할 수 없어 길게 눌러 저장하도록 안내한다.
          if (isIOS()) {
            setLongPressUrl(URL.createObjectURL(file));
            return;
          }
        }
      } else if (strategy === 'long-press') {
        setLongPressUrl(URL.createObjectURL(file));
        return;
      }

      downloadBlob(file, file.name);
      showToast('카드가 이미지로 저장되었습니다!', 'success');
    } catch (err) {
      console.error('이미지 저장 실패:', err);
      showToast('이미지 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSavingImage(false);
    }
  };

  /**
   * 2. 카카오톡 공유.
   *
   * 동기 함수다. 데스크톱 sendDefault는 팝업을 띄우므로 await를 한 번이라도 거치면 차단된다.
   * 토큰과 SDK가 모두 준비된 정상 경로에서는 여기서 바로 전송이 끝난다.
   */
  const handleKakaoShare = () => {
    if (sharingKakao || preparingLink) return;

    if (shareToken) {
      const linkUrl = buildShareUrl(shareToken);

      if (
        isKakaoReady() &&
        shareToKakao({
          title: `데이유즈 | ${title}`,
          description: shareDescription,
          imageUrl: buildOgImageUrl(shareToken),
          linkUrl,
        })
      ) {
        return;
      }

      // 카카오 SDK를 못 쓰는 환경: 네이티브 공유 시트에서 카카오톡을 고르게 한다.
      if (canShareLink()) {
        navigator
          .share({ title: `데이유즈 | ${title}`, text: shareDescription, url: linkUrl })
          .catch((shareErr: any) => {
            if (shareErr?.name === 'AbortError') return;
            console.warn('네이티브 공유 실패, 링크 복사로 전환:', shareErr);
            void copyWithFallback(
              Promise.resolve(linkUrl),
              '공유 링크를 복사했습니다. 카카오톡에 붙여넣어 주세요.'
            );
          });
        return;
      }

      void copyWithFallback(
        Promise.resolve(linkUrl),
        '공유 링크를 복사했습니다. 카카오톡에 붙여넣어 주세요.'
      );
      return;
    }

    // 토큰이 아직 없으면 카카오 팝업도 공유 시트도 제스처를 잃는다. 복사로 내려간다.
    setSharingKakao(true);
    void copyWithFallback(
      shareUrlPromise(),
      '공유 링크를 복사했습니다. 카카오톡에 붙여넣어 주세요.'
    )
      .catch((err) => {
        console.error('카카오톡 공유 실패:', err);
        showToast('공유 링크 생성 중 오류가 발생했습니다.', 'error');
      })
      .finally(() => setSharingKakao(false));
  };

  // 3. 링크 복사
  const handleCopyLink = () => {
    if (copyingLink || preparingLink) return;
    setCopyingLink(true);

    void copyWithFallback(shareUrlPromise(), '공유 링크가 클립보드에 복사되었습니다!')
      .catch((err) => {
        console.error('링크 복사 실패:', err);
        showToast('링크 복사 중 오류가 발생했습니다.', 'error');
      })
      .finally(() => setCopyingLink(false));
  };

  return createPortal(
    <div className="fixed inset-0 z-modal-top w-screen h-[100dvh] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-4 flex flex-col items-center shadow-2xl relative">
        {/* 상단 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-full transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-1.5 self-start px-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          공유 카드 미리보기
        </h3>

        {/* 9:16 스토리 프리뷰 카드 영역 (270x480 → 4배 캡처 시 1080x1920) */}
        <div className="w-full flex justify-center py-1">
          <div
            ref={cardRef}
            className="w-[270px] min-h-[480px] rounded-3xl overflow-hidden bg-[#0F172A] text-white flex flex-col justify-between p-5 relative shadow-xl border border-[#1E293B]"
          >
            {/* 상단 서비스 브랜딩 */}
            <div className="flex items-center justify-between border-b border-[#1E293B]/60 pb-3 gap-2 min-w-0">
              <DayuLogo variant="horizontal" theme="dark" className="h-5 w-auto max-w-[120px] object-contain shrink-0" />
              <span className="text-[10px] text-[#94A3B8] font-mono tracking-wider shrink-0">dayuse.kr</span>
            </div>

            {/* 카드 중앙 본문 */}
            {initializing ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
                <span className="text-xs text-slate-400">기록 불러오는 중...</span>
              </div>
            ) : cardType === 'TODAY_VERIFICATION' ? (
              /* 오늘의 인증 카드 중앙 */
              <div className="flex-1 flex flex-col justify-center py-3 space-y-3">
                <div className="rounded-xl overflow-hidden aspect-square bg-slate-800 border border-[#1E293B] shadow-md">
                  {cardImageSrc ? (
                    /* crossOrigin을 두지 않는다. 캡처용 이미지는 이미 data URL로 심었고,
                       치환에 실패한 경우엔 CORS 없이도 미리보기는 보여야 한다. */
                    <img src={cardImageSrc} alt="인증 사진" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      인증 사진 없음
                    </div>
                  )}
                </div>

                {comment && (
                  /* backdrop-blur는 캡처(foreignObject)에서 무시돼 미리보기와 결과가 달라진다. */
                  <div className="bg-[#1E293B]/50 border border-[#1E293B] rounded-xl p-3">
                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                      "{comment}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* 연속 기록(Streak) 카드 중앙 */
              <div className="flex-1 flex flex-col justify-center py-3 text-center">
                {/* 대표 그래픽: 흰 원 속 해냈어요 데이유 */}
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md mx-auto mb-2">
                  <DayuExpression expression="done" color="blue" className="w-10 h-10 object-contain" />
                </div>

                {/* 연속 일수 타이포그래피 */}
                <div className="text-3xl font-extrabold text-white tracking-tight tabular-nums flex items-baseline justify-center">
                  {streakDays}
                  <span className="text-base font-bold text-[#93C5FD] ml-1 font-sans">일 연속</span>
                </div>
                <p className="text-[10px] text-[#CBD5E1] font-normal mt-0.5 mb-3">
                  목표를 향해 꾸준히 달리는 중이에요
                </p>

                {/* 달성률 (데이터가 있을 때만 노출) */}
                {hasAchievementData && (
                  <div className="w-full mb-3 text-left">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-[#94A3B8] font-medium">이번 챌린지 달성률</span>
                      <span className="text-white font-bold tabular-nums">
                        {completedCount} / {totalDays}일 · {achievementRate}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, achievementRate))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 최근 7일 기록 칸 */}
                {recent7Items.length > 0 && (
                  <div className="w-full mb-2">
                    <div className="text-[10px] text-[#94A3B8] font-medium mb-1.5 text-left">
                      최근 7일
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {recent7Items.map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1">
                          <div
                            className={`w-full aspect-square max-w-[28px] rounded-md flex items-center justify-center ${
                              item.completed
                                ? 'bg-blue-600 text-white'
                                : 'bg-transparent border border-[#1E293B]'
                            }`}
                          >
                            {item.completed && <Check className="w-3 h-3 text-white stroke-[2.5]" />}
                          </div>
                          <span className="text-[8px] text-[#94A3B8] tabular-nums font-mono">
                            {item.date ? item.date.slice(8) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 하단 작성자 & 챌린지 정보 */}
            <div className="border-t border-[#1E293B]/60 pt-2.5 text-left">
              <div className="text-[11px] font-bold text-[#60A5FA] truncate mb-0.5">
                {title}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-white">{userNickname}</span>
                {targetDate && (
                  <span className="text-[10px] text-[#94A3B8] flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {targetDate}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 3종 */}
        <div className="w-full grid grid-cols-3 gap-2 mt-4">
          {/* 1. 이미지 저장 */}
          <button
            onClick={handleSaveImage}
            disabled={savingImage || initializing}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition active:scale-95 disabled:opacity-50"
          >
            {savingImage ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <Download className="w-4 h-4 text-blue-400" />
            )}
            <span>이미지 저장</span>
          </button>

          {/* 2. 카카오톡 공유 */}
          <button
            onClick={handleKakaoShare}
            disabled={sharingKakao || preparingLink}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-[#FEE500] hover:bg-[#FDD835] text-slate-900 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            {sharingKakao || preparingLink ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span>카톡 공유</span>
          </button>

          {/* 3. 링크 복사 */}
          <button
            onClick={handleCopyLink}
            disabled={copyingLink || preparingLink}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition active:scale-95 disabled:opacity-50"
          >
            {copyingLink || preparingLink ? (
              <Loader2 className="w-4 h-4 animate-spin text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-green-400" />
            )}
            <span>링크 복사</span>
          </button>
        </div>
      </div>

      {/* iOS 등 자동 저장이 막힌 환경의 폴백: 이미지를 길게 눌러 저장 */}
      {longPressUrl && (
        <div className="fixed inset-0 z-modal-over bg-black/90 flex flex-col items-center justify-center p-4 gap-3">
          <p className="text-xs text-white text-center leading-relaxed">
            아래 이미지를 <strong>길게 눌러</strong> &lsquo;사진에 저장&rsquo;을 선택해 주세요.
          </p>
          <img
            src={longPressUrl}
            alt="공유 카드"
            className="max-h-[70vh] w-auto rounded-2xl shadow-2xl"
          />
          <button
            onClick={() => {
              URL.revokeObjectURL(longPressUrl);
              setLongPressUrl(null);
            }}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold"
          >
            닫기
          </button>
        </div>
      )}

      {/* 클립보드가 막힌 환경의 폴백: 직접 선택해서 복사 */}
      {manualCopyUrl && (
        <div className="fixed inset-0 z-modal-over bg-black/90 flex flex-col items-center justify-center p-6 gap-3">
          <p className="text-xs text-white text-center leading-relaxed">
            자동 복사가 막힌 환경이에요. 아래 주소를 눌러 선택한 뒤 복사해 주세요.
          </p>
          <input
            readOnly
            value={manualCopyUrl}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            className="w-full max-w-sm px-3 py-3 rounded-xl bg-slate-800 text-white text-xs font-mono border border-slate-700 text-center"
          />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (await copyText(manualCopyUrl)) {
                  showToast('공유 링크가 클립보드에 복사되었습니다!', 'success');
                  setManualCopyUrl(null);
                }
              }}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
            >
              다시 복사
            </button>
            <button
              onClick={() => setManualCopyUrl(null)}
              className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

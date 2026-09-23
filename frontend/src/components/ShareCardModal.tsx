import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { shareApi } from '../api/share';
import { shareToKakao } from '../utils/kakao';
import { copyToClipboard } from '../utils/clipboard';
import { useToast } from '../context/ToastContext';
import type { ShareCardType, StreakHistoryItem } from '../types';
import {
  X,
  Download,
  Share2,
  Copy,
  Flame,
  Calendar,
  Loader2,
  Sparkles,
} from 'lucide-react';

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

  const [savingImage, setSavingImage] = useState(false);
  const [sharingKakao, setSharingKakao] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (initialHistoryJson) {
      try {
        setHistoryItems(JSON.parse(initialHistoryJson));
      } catch (e) {
        console.error('Failed to parse historyJson:', e);
      }
    }
  }, [initialHistoryJson]);

  // STREAK 카드인데 streakDays가 전달되지 않았거나 최신 정보가 필요할 경우 사전 조회
  useEffect(() => {
    if (cardType === 'STREAK' && initialStreakDays === 0 && !initialHistoryJson) {
      setInitializing(true);
      shareApi.createStreakShare(targetId)
        .then((res) => {
          setShareToken(res.token);
          setStreakDays(res.streakDays);
          if (res.historyJson) {
            try {
              setHistoryItems(JSON.parse(res.historyJson));
            } catch (e) {
              console.error(e);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to fetch streak preview:', err);
        })
        .finally(() => {
          setInitializing(false);
        });
    }
  }, [cardType, targetId, initialStreakDays, initialHistoryJson]);

  // 공유 링크 토큰 확보 (이미 있으면 재사용, 없으면 생성)
  const ensureShareToken = async (): Promise<string> => {
    if (shareToken) return shareToken;

    if (cardType === 'TODAY_VERIFICATION') {
      const res = await shareApi.createVerificationShare(targetId);
      setShareToken(res.token);
      if (res.imageUrl) setImageUrl(res.imageUrl);
      return res.token;
    } else {
      const res = await shareApi.createStreakShare(targetId);
      setShareToken(res.token);
      setStreakDays(res.streakDays);
      if (res.historyJson) {
        try {
          setHistoryItems(JSON.parse(res.historyJson));
        } catch (e) {
          console.error(e);
        }
      }
      return res.token;
    }
  };

  // 1. 이미지 저장 (모바일에서는 갤러리 저장용 네이티브 공유 시트 지원)
  const handleSaveImage = async () => {
    if (!cardRef.current || savingImage) return;
    setSavingImage(true);
    try {
      // 폰트 및 이미지 렌더링 대기
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: false,
        pixelRatio: 2,
      });

      // 모바일 Web Share API (사진 앱/갤러리 저장 및 네이티브 공유 시트)
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `dayuse-${cardType.toLowerCase()}-${Date.now()}.png`, {
          type: 'image/png',
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `dayuse | ${title}`,
            text: `${userNickname}님의 dayuse 공유 카드`,
          });
          showToast('공유/저장 창이 열렸습니다.', 'success');
          return;
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          // 사용자가 공유 창을 그냥 닫은 경우
          return;
        }
        console.warn('Web Share API 이미지 공유 실패, 파일 다운로드로 fallback:', shareErr);
      }

      // PC 또는 Web Share 미지원 환경: a 태그 직접 다운로드
      const link = document.createElement('a');
      link.download = `dayuse-${cardType.toLowerCase()}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showToast('카드가 이미지로 저장되었습니다!', 'success');
    } catch (err) {
      console.error('이미지 저장 실패:', err);
      showToast('이미지 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSavingImage(false);
    }
  };

  // 2. 카카오톡 공유 (모바일 네이티브 공유 및 클립보드 폴백 지원)
  const handleKakaoShare = async () => {
    if (sharingKakao) return;
    setSharingKakao(true);
    try {
      const token = await ensureShareToken();
      const linkUrl = `${window.location.origin}/shares/${token}`;
      const desc =
        cardType === 'TODAY_VERIFICATION'
          ? `${userNickname}님의 오늘 인증: "${comment || title}"`
          : `${userNickname}님이 ${streakDays}일 연속 인증을 달성했습니다! 🔥`;

      const success = await shareToKakao({
        title: `dayuse | ${title}`,
        description: desc,
        imageUrl: imageUrl,
        linkUrl,
      });

      if (!success) {
        // 모바일 네이티브 공유 시트 시도 (카카오톡 바로 선택 가능)
        if (navigator.share) {
          try {
            await navigator.share({
              title: `dayuse | ${title}`,
              text: desc,
              url: linkUrl,
            });
            showToast('공유 창이 열렸습니다.', 'success');
            return;
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') return;
          }
        }

        // 클립보드 안전 복사 fallback
        const copied = await copyToClipboard(linkUrl);
        if (copied) {
          showToast('공유 링크가 클립보드에 복사되었습니다!', 'success');
        } else {
          showToast('공유 링크: ' + linkUrl, 'info');
        }
      }
    } catch (err: any) {
      console.error('카카오톡 공유 실패:', err);
      showToast('공유 링크 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setSharingKakao(false);
    }
  };

  // 3. 링크 복사
  const handleCopyLink = async () => {
    if (copyingLink) return;
    setCopyingLink(true);
    try {
      const token = await ensureShareToken();
      const linkUrl = `${window.location.origin}/shares/${token}`;
      const copied = await copyToClipboard(linkUrl);
      if (copied) {
        showToast('공유 링크가 클립보드에 복사되었습니다!', 'success');
      } else {
        showToast('공유 링크: ' + linkUrl, 'info');
      }
    } catch (err) {
      console.error('링크 복사 실패:', err);
      showToast('링크 복사 중 오류가 발생했습니다.', 'error');
    } finally {
      setCopyingLink(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
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
          공유 카드 미리보기 (9:16)
        </h3>

        {/* 9:16 스토리 프리뷰 카드 영역 */}
        <div className="w-full flex justify-center py-1">
          <div
            ref={cardRef}
            className="w-[280px] h-[498px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-5 relative shadow-xl border border-white/10"
            style={{ aspectRatio: '9/16' }}
          >
            {/* 상단 서비스 브랜딩 */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-xs">
                  D
                </div>
                <span className="font-extrabold tracking-tight text-sm text-white">dayuse</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">dayuse.kr</span>
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
                <div className="rounded-xl overflow-hidden aspect-square bg-slate-800 border border-white/10 shadow-md">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="인증 사진"
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                      인증 사진 없음
                    </div>
                  )}
                </div>

                {comment && (
                  <div className="bg-white/5 backdrop-blur-xs border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                      "{comment}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* 연속 기록(Streak) 카드 중앙 */
              <div className="flex-1 flex flex-col justify-center py-4 text-center space-y-5">
                <div className="inline-flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-2">
                    <Flame className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-3xl font-black text-white tracking-tight">
                    {streakDays}
                    <span className="text-lg font-bold text-amber-400 ml-1">일 연속</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                    매일매일 꾸준한 성장 중!
                  </p>
                </div>

                {/* 최근 일자별 기록 잔디/타일 */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-medium">
                    <span>최근 기록</span>
                    <span>성공 여부</span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    {historyItems.map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                            item.completed
                              ? 'bg-blue-500 text-white shadow-xs'
                              : item.inPeriod
                              ? 'bg-slate-800 text-slate-500 border border-slate-700'
                              : 'bg-slate-800/40 text-slate-600'
                          }`}
                        >
                          {item.completed ? '✓' : ''}
                        </div>
                        <span className="text-[8px] text-slate-400">
                          {item.date.slice(8)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 하단 작성자 & 챌린지 정보 */}
            <div className="border-t border-white/10 pt-3">
              <div className="text-[11px] text-blue-400 font-bold truncate mb-0.5">
                {title}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold">{userNickname}</span>
                {targetDate && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
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
            disabled={sharingKakao || initializing}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-[#FEE500] hover:bg-[#FDD835] text-slate-900 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
          >
            {sharingKakao ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span>카톡 공유</span>
          </button>

          {/* 3. 링크 복사 */}
          <button
            onClick={handleCopyLink}
            disabled={copyingLink || initializing}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition active:scale-95 disabled:opacity-50"
          >
            {copyingLink ? (
              <Loader2 className="w-4 h-4 animate-spin text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-green-400" />
            )}
            <span>링크 복사</span>
          </button>
        </div>
      </div>
    </div>
  );
};

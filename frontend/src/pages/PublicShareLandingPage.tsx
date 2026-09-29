import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shareApi } from '../api/share';
import { challengesApi } from '../api/challenges';
import { useAuth } from '../context/AuthContext';
import type { PublicShareCardResponse, StreakHistoryItem } from '../types';
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  X,
  Check,
} from 'lucide-react';
import { DayuLogo } from '../components/brand/DayuLogo';
import { DayuExpression } from '../components/brand/DayuExpression';
import { usePageMeta } from '../hooks/usePageMeta';
import { Modal, ModalTitle, ModalDescription, ModalClose } from '../components/ui';
import { Lightbox } from '../components/ui/Lightbox';

export const PublicShareLandingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [card, setCard] = useState<PublicShareCardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [historyItems, setHistoryItems] = useState<StreakHistoryItem[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);

  // 비공개 정보 격리 및 404/만료 안전 폴백 메타데이터 관리
  usePageMeta({
    isNotFound: notFound,
    customShareDescription: card ? '챌린지 수행 기록을 확인해보세요.' : undefined,
    customShareImage: card && token ? `/api/v1/public/shares/${encodeURIComponent(token)}/og.jpg` : undefined,
  });

  // 달성률 계산 (유효 기간 데이터 기준)
  const inPeriodItems = historyItems.filter((item) => item.inPeriod);
  const completedCount = inPeriodItems.filter((item) => item.completed).length;
  const totalDays = inPeriodItems.length;
  const hasAchievementData = totalDays > 0;
  const achievementRate = hasAchievementData ? Math.round((completedCount / totalDays) * 100) : 0;
  const recent7Items = historyItems.slice(-7);

  // 비모임원 가입 제한 모달 상태
  const [showInviteRequiredModal, setShowInviteRequiredModal] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    shareApi.getPublicShareCard(token)
      .then((data) => {
        setCard(data);
        if (data.historyJson) {
          try {
            setHistoryItems(JSON.parse(data.historyJson));
          } catch (e) {
            console.error('Failed to parse history JSON:', e);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch public share card:', err);
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  // "나도 참여하기" CTA 클릭 핸들러
  const handleJoinCta = async () => {
    if (!card) return;

    // 1. 비로그인 시: 타겟 챌린지 저장 후 로그인 페이지로 이동
    if (!isAuthenticated) {
      sessionStorage.setItem('dayuse_pending_challenge_id', String(card.challengeId));
      navigate('/login');
      return;
    }

    // 2. 로그인 상태: 모임원 권한 검증
    setCheckingMembership(true);
    try {
      await challengesApi.getChallengeDetail(card.challengeId);
      // 권한이 있으면 챌린지 상세 화면으로 이동
      navigate(`/challenges/${card.challengeId}`);
    } catch (err: any) {
      if (err.response?.status === 403) {
        // 비모임원: 초대 링크 필요 안내 팝업
        setShowInviteRequiredModal(true);
      } else {
        // 기타 에러 시 챌린지 상세로 이동 시도
        navigate(`/challenges/${card.challengeId}`);
      }
    } finally {
      setCheckingMembership(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400">공유 카드를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (notFound || !card) {
    return (
      <div className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-base font-bold text-white mb-2">공유 카드를 찾을 수 없습니다</h2>
        <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
          작성자가 공유를 해제했거나, 원본 인증이 삭제되어 더 이상 열람할 수 없는 카드입니다.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold transition"
        >
          데이유즈 홈으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-app flex-col bg-[#020617] font-sans text-white">
      {/* 상단 브랜딩 바: 로고 (좌) · 도메인 (우) */}
      <div className="flex h-14 w-full min-w-0 shrink-0 items-center justify-between gap-2 px-5">
        <DayuLogo variant="horizontal" theme="dark" className="h-6 w-auto shrink-0 object-contain" />
        {card.executionType === 'TOGETHER' ? (
          <span className="shrink-0 rounded-[7px] bg-indigo-500/20 px-2 py-1 text-[12px] font-bold text-indigo-300">
            함께하기 · 공동 달성
          </span>
        ) : (
          <span className="shrink-0 font-mono text-[13px] text-slate-500">dayuse.kr</span>
        )}
      </div>

      {/* 공유 카드 본체 */}
      <div className="mx-5 my-auto flex flex-col justify-between rounded-[28px] border border-[#1E293B] bg-[#0F172A] p-[25px]">
        {/* 카드 중앙 내용 */}
        {card.cardType === 'TODAY_VERIFICATION' ? (
          <div className="flex-1 flex flex-col justify-center py-4 space-y-4">
            <div
              role={card.imageUrl ? 'button' : undefined}
              tabIndex={card.imageUrl ? 0 : undefined}
              aria-label={card.imageUrl ? '인증 사진 확대 보기' : undefined}
              onClick={() => {
                if (card.imageUrl) {
                  setLightboxImage({ src: card.imageUrl, alt: `${card.title} 인증 사진` });
                }
              }}
              onKeyDown={(e) => {
                if (card.imageUrl && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setLightboxImage({ src: card.imageUrl, alt: `${card.title} 인증 사진` });
                }
              }}
              className={`rounded-2xl overflow-hidden aspect-square bg-slate-950 border border-[#1E293B] shadow-lg flex items-center justify-center relative ${
                card.imageUrl ? 'cursor-zoom-in focus-ring' : ''
              }`}
            >
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt="인증 사진"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  인증 사진 없음
                </div>
              )}
            </div>

            {card.comment && (
              <div className="bg-[#1E293B]/50 border border-[#1E293B] rounded-xl p-3.5">
                <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                  "{card.comment}"
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center py-2 text-center">
            {/* 대표 그래픽: 흰 원 속 해냈어요 데이유 */}
            <div className="mx-auto mb-[18px] flex size-[88px] items-center justify-center rounded-full bg-white">
              <DayuExpression expression="done" color="blue" className="size-16 object-contain" />
            </div>

            {/* 연속 일수 타이포그래피 */}
            <div className="flex items-baseline justify-center tabular-nums">
              <span className="text-[56px] leading-none font-extrabold tracking-[-0.04em] text-white">
                {card.streakDays}
              </span>
              <span className="ml-1 text-[20px] font-extrabold text-[#93C5FD]">일 연속</span>
            </div>
            <p className="mt-[7px] mb-[18px] text-[14px] text-[#CBD5E1]">목표를 향해 꾸준히 달리는 중이에요</p>

            {/* 달성률 (데이터가 있을 때만 노출) */}
            {hasAchievementData && (
              <div className="mb-[18px] w-full text-left">
                <div className="mb-2 flex items-center justify-between text-[13px]">
                  <span className="text-[#94A3B8]">이번 챌린지 달성률</span>
                  <span className="font-bold tabular-nums text-white">
                    {completedCount} / {totalDays}일 · {achievementRate}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-[#1E293B]">
                  <div
                    className="h-full w-full origin-left rounded bg-blue-600 transition-transform duration-300 ease-out"
                    style={{
                      transform: `scaleX(${Math.min(100, Math.max(0, achievementRate)) / 100})`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* 최근 7일 기록 칸 */}
            {recent7Items.length > 0 && (
              <div className="mb-[18px] w-full">
                <div className="mb-2 text-left text-[13px] text-[#94A3B8]">최근 7일</div>
                <div className="grid grid-cols-7 gap-1.5">
                  {recent7Items.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <div
                        className={`flex aspect-square w-full items-center justify-center rounded-full ${
                          item.completed ? 'bg-blue-600 text-white' : 'border border-[#1E293B]'
                        }`}
                      >
                        {item.completed && <Check className="size-3.5 stroke-[2.5] text-white" />}
                      </div>
                      <span className="text-[11px] tabular-nums text-slate-500">
                        {item.date ? item.date.slice(8) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 카드 하단 정보 */}
        <div className="border-t border-[#1E293B] pt-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <b className="text-[17px] font-bold text-white">{card.userNickname}</b>
            <span className="min-w-0 truncate text-right text-[12px] text-slate-500">{card.title}</span>
          </div>
          {card.executionType === 'TOGETHER' && card.actualVerifierNickname && (
            <p className="mt-0.5 text-[12px] text-indigo-300">
              {card.actualVerifierNickname}님의 인증으로 달성
            </p>
          )}
        </div>
      </div>

      {/* 하단 CTA 바 */}
      <div className="flex w-full shrink-0 flex-col items-center gap-2.5 px-4 pt-3 pb-[calc(15px+env(safe-area-inset-bottom,0px))]">
        <button
          onClick={handleJoinCta}
          disabled={checkingMembership}
          className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[14px] bg-blue-600 text-base font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {checkingMembership ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              나도 참여하기
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <p className="text-center text-[12.5px] text-slate-500">
          데이유즈에서 친구들과 각자의 챌린지를 인증하고 기록해요
        </p>
      </div>

      {/* 비모임원 초대 링크 필요 안내 팝업 모달 */}
      <Modal
        open={showInviteRequiredModal}
        onOpenChange={setShowInviteRequiredModal}
        layer="sheet"
        backdropClassName="bg-black/80 backdrop-blur-xs"
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative"
      >
        <>
          <ModalClose
            aria-label="닫기"
            className="absolute top-4 right-4 text-slate-400 hover:text-white rounded-md focus-ring"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </ModalClose>

          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <ModalTitle className="text-base font-bold text-white">모임 가입이 필요합니다</ModalTitle>
            <ModalDescription className="text-xs text-slate-300 leading-relaxed">
              이 챌린지는 비공개 소모임에서 진행 중입니다.<br />
              모임원으로부터 <strong className="text-amber-400">초대 링크</strong>를 전달받아 먼저 모임에 가입해 주세요.
            </ModalDescription>
          </div>

          <ModalClose className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-semibold transition focus-ring">
            확인
          </ModalClose>
        </>
      </Modal>

      {/* 인증 사진 확대 보기(Lightbox) 모달 */}
      {lightboxImage && (
        <Lightbox
          open={true}
          onClose={() => setLightboxImage(null)}
          src={lightboxImage.src}
          alt={lightboxImage.alt}
        />
      )}
    </div>
  );
};

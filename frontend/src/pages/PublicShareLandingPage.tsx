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

export const PublicShareLandingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [card, setCard] = useState<PublicShareCardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [historyItems, setHistoryItems] = useState<StreakHistoryItem[]>([]);

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400">공유 카드를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (notFound || !card) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
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
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-between p-4 py-8 max-w-md mx-auto relative font-sans">
      {/* 상단 브랜딩 바: 로고 (좌) · 도메인 (우) */}
      <div className="w-full max-w-[340px] flex items-center justify-between mb-4 px-1 gap-2 min-w-0">
        <DayuLogo variant="horizontal" theme="dark" className="h-7 w-auto object-contain shrink-0" />
        <span className="text-xs text-[#94A3B8] font-mono tracking-wider shrink-0">dayuse.kr</span>
      </div>

      {/* 공유 카드 본체 */}
      <div className="w-full max-w-[340px] rounded-3xl bg-[#0F172A] border border-[#1E293B] p-6 flex flex-col justify-between my-auto relative shadow-2xl">
        {/* 카드 중앙 내용 */}
        {card.cardType === 'TODAY_VERIFICATION' ? (
          <div className="flex-1 flex flex-col justify-center py-4 space-y-4">
            <div className="rounded-2xl overflow-hidden aspect-square bg-slate-800 border border-[#1E293B] shadow-lg">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
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
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-md mx-auto mb-4">
              <DayuExpression expression="done" color="blue" className="w-14 h-14 object-contain" />
            </div>

            {/* 연속 일수 타이포그래피 */}
            <div className="text-[44px] leading-tight font-extrabold text-white tracking-tight tabular-nums flex items-baseline justify-center">
              {card.streakDays}
              <span className="text-xl font-bold text-[#93C5FD] ml-1.5 font-sans">일 연속</span>
            </div>
            <p className="text-xs text-[#CBD5E1] font-normal mt-1 mb-5">
              목표를 향해 꾸준히 달리는 중이에요
            </p>

            {/* 달성률 (데이터가 있을 때만 노출) */}
            {hasAchievementData && (
              <div className="w-full mb-5 text-left">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#94A3B8] font-medium">이번 챌린지 달성률</span>
                  <span className="text-white font-bold tabular-nums">
                    {completedCount} / {totalDays}일 · {achievementRate}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, achievementRate))}%` }}
                  />
                </div>
              </div>
            )}

            {/* 최근 7일 기록 칸 */}
            {recent7Items.length > 0 && (
              <div className="w-full mb-6">
                <div className="text-xs text-[#94A3B8] font-medium mb-2.5 text-left">
                  최근 7일
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {recent7Items.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-full aspect-square max-w-[34px] rounded-lg flex items-center justify-center transition ${
                          item.completed
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-transparent border border-[#1E293B]'
                        }`}
                      >
                        {item.completed && <Check className="w-4 h-4 text-white stroke-[2.5]" />}
                      </div>
                      <span className="text-[10px] text-[#94A3B8] tabular-nums font-mono">
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
        <div className="text-left pt-3 border-t border-[#1E293B]/60">
          <div className="text-xs font-bold text-[#60A5FA] truncate mb-0.5">
            {card.title}
          </div>
          <div className="text-[17px] font-semibold text-white">
            {card.userNickname}
          </div>
        </div>
      </div>

      {/* 하단 CTA 바 */}
      <div className="w-full max-w-[340px] mt-6 space-y-2">
        <button
          onClick={handleJoinCta}
          disabled={checkingMembership}
          className="w-full h-[52px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
        >
          {checkingMembership ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>나도 참여하기</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-xs text-[#94A3B8] text-center mt-2.5">
          데이유즈에서 친구들과 각자의 챌린지를 인증하고 기록해요.
        </p>
      </div>

      {/* 비모임원 초대 링크 필요 안내 팝업 모달 */}
      {showInviteRequiredModal && (
        <div className="fixed inset-0 z-sheet bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowInviteRequiredModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">모임 가입이 필요합니다</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                이 챌린지는 비공개 소모임에서 진행 중입니다.<br />
                모임원으로부터 <strong className="text-amber-400">초대 링크</strong>를 전달받아 먼저 모임에 가입해 주세요.
              </p>
            </div>

            <button
              onClick={() => setShowInviteRequiredModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-semibold transition"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

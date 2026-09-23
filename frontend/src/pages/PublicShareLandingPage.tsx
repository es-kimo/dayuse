import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shareApi } from '../api/share';
import { challengesApi } from '../api/challenges';
import { useAuth } from '../context/AuthContext';
import type { PublicShareCardResponse, StreakHistoryItem } from '../types';
import {
  Flame,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  X,
} from 'lucide-react';

export const PublicShareLandingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [card, setCard] = useState<PublicShareCardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [historyItems, setHistoryItems] = useState<StreakHistoryItem[]>([]);

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
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
        >
          dayuse 홈으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-4 py-8 max-w-md mx-auto relative">
      {/* 상단 브랜딩 헤더 */}
      <div className="w-full flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs text-white">
            D
          </div>
          <span className="font-extrabold tracking-tight text-base">dayuse</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">dayuse.kr</span>
      </div>

      {/* 9:16 공유 카드 본체 */}
      <div
        className="w-full max-w-[320px] rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-6 shadow-2xl border border-white/10 my-auto"
        style={{ aspectRatio: '9/16' }}
      >
        {/* 카드 상단 */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
              D
            </div>
            <span className="font-bold text-xs tracking-tight">dayuse</span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">shared card</span>
        </div>

        {/* 카드 중앙 내용 */}
        {card.cardType === 'TODAY_VERIFICATION' ? (
          <div className="flex-1 flex flex-col justify-center py-4 space-y-4">
            <div className="rounded-2xl overflow-hidden aspect-square bg-slate-800 border border-white/10 shadow-lg">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt="인증 사진"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  인증 사진 없음
                </div>
              )}
            </div>

            {card.comment && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                  "{card.comment}"
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center py-6 text-center space-y-6">
            <div className="inline-flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center shadow-xl shadow-orange-500/25 mb-3">
                <Flame className="w-12 h-12 text-white" />
              </div>
              <div className="text-4xl font-black text-white tracking-tight">
                {card.streakDays}
                <span className="text-xl font-bold text-amber-400 ml-1.5">일 연속</span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">
                목표를 향해 꾸준히 달리는 중!
              </p>
            </div>

            {/* 최근 일자별 기록 타일 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2.5 font-medium">
                <span>최근 기록</span>
                <span>성공 여부</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {historyItems.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${
                        item.completed
                          ? 'bg-blue-500 text-white shadow-xs'
                          : item.inPeriod
                          ? 'bg-slate-800 text-slate-500 border border-slate-700'
                          : 'bg-slate-800/40 text-slate-600'
                      }`}
                    >
                      {item.completed ? '✓' : ''}
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {item.date.slice(8)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 카드 하단 */}
        <div className="border-t border-white/10 pt-3">
          <div className="text-xs text-blue-400 font-bold truncate mb-0.5">
            {card.title}
          </div>
          <div className="text-sm font-semibold text-slate-200">
            {card.userNickname}
          </div>
        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="w-full mt-6 space-y-2">
        <button
          onClick={handleJoinCta}
          disabled={checkingMembership}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
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

        <p className="text-[11px] text-slate-500 text-center">
          dayuse에서 친구들과 함께 습관을 만들고 보증금을 정산해보세요
        </p>
      </div>

      {/* 비모임원 초대 링크 필요 안내 팝업 모달 */}
      {showInviteRequiredModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
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
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

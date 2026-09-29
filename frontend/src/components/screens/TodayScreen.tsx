import { Clock, Bell, Camera, Check, CheckCircle2 } from './ScreenIcons';
import { useNavigate } from 'react-router-dom';
import type { TodayAction } from '../../types';
import { Screen, ScreenNav, screenAssets } from './Screen';
import { AppHeader } from '../layout/AppHeader';

export function TodayScreen({
  actions,
  loading,
  error,
  retry,
  onVerify,
  onImage,
}: {
  actions: TodayAction[];
  loading: boolean;
  error: string;
  retry: () => void;
  onVerify: (action: TodayAction) => void;
  onImage: (src: string, alt: string) => void;
}) {
  const navigate = useNavigate();
  const pending = actions.filter((a) => !a.isCompletedToday);
  const completed = actions.filter((a) => a.isCompletedToday);

  return (
    <Screen>
      <AppHeader
        variant="main"
        leftAction={<img className="h-7 w-auto mr-1" src={screenAssets.symbol} alt="데이유즈" />}
        title="오늘"
        rightAction={
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            onClick={() => navigate('/settings/notifications')}
            aria-label="알림 설정"
          >
            <Bell className="w-5 h-5" />
          </button>
        }
      />
      <main className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3.5 pb-24">
        <div>
          <p className="text-xs text-slate-500 font-medium">
            {new Date().toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
              timeZone: 'Asia/Seoul',
            })}
          </p>
        </div>
        {loading ? (
          <p className="py-12 text-center text-xs text-slate-400" role="status">
            오늘 할 일을 불러오는 중...
          </p>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={retry} className="font-bold underline cursor-pointer">
              다시 시도
            </button>
          </div>
        ) : !actions.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <img src={screenAssets.symbol} alt="" className="w-24 h-24 mb-1" />
            <h2 className="text-base font-bold text-slate-800">오늘은 인증할 챌린지가 없어요</h2>
            <button
              className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition cursor-pointer"
              onClick={() => navigate('/groups')}
            >
              모임 둘러보기
            </button>
          </div>
        ) : (
          <>
            <div
              className={`rounded-2xl p-4 flex items-center gap-3.5 shadow-xs transition ${
                pending.length
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
              }`}
            >
              <img src={screenAssets.hero} alt="" className="w-14 h-14 shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-bold leading-tight">
                  {pending.length
                    ? `인증할 챌린지가 ${pending.length}개 남았어요`
                    : '오늘 할 일을 모두 마쳤어요!'}
                </h2>
                <p className="text-xs text-white/80 mt-0.5">
                  {pending.length ? '자정 전에 사진 한 장이면 끝나요.' : '내일도 함께 꾸준히 이어가요.'}
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <div className="h-1.5 bg-white/30 rounded-full overflow-hidden flex-1">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${(completed.length / actions.length) * 100}%` }}
                    />
                  </div>
                  <b className="text-xs font-mono font-bold">
                    {completed.length}/{actions.length}
                  </b>
                </div>
              </div>
            </div>

            {!!pending.length && (
              <div className="flex items-center justify-between mt-1">
                <h3 className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  인증 대기 <span className="font-semibold text-amber-600">{pending.length}</span>
                </h3>
              </div>
            )}
            {pending.map((action) => (
              <div
                key={action.challengeId}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                    {action.groupName}
                  </span>
                  {!!action.streakDays && (
                    <span className="text-xs font-bold text-blue-600">
                      {action.streakDays}일째 이어가는 중
                    </span>
                  )}
                </div>
                <div className="text-[17px] font-bold text-slate-800 leading-snug">
                  {action.challengeTitle}
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 leading-relaxed">
                  <strong className="font-bold text-slate-700 mr-1.5">인증 기준</strong>
                  {action.verificationCriteria}
                </div>
                <button
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer mt-1"
                  onClick={() => onVerify(action)}
                  disabled={!action.canVerify}
                >
                  <Camera className="w-4 h-4" />
                  사진 찍고 인증하기
                </button>
              </div>
            ))}

            {!!completed.length && (
              <div className="flex items-center justify-between mt-2">
                <h3 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  완료 <span className="font-semibold text-emerald-600">{completed.length}</span>
                </h3>
              </div>
            )}
            {completed.map((action) => (
              <div
                key={action.challengeId}
                className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center gap-3"
              >
                {action.myVerification?.imageUrl && (
                  <button
                    className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-100 cursor-pointer"
                    onClick={() => onImage(action.myVerification!.imageUrl, action.challengeTitle)}
                    aria-label="사진 확대 보기"
                  >
                    <img
                      src={action.myVerification.imageUrl}
                      alt="인증 사진"
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400 font-medium">{action.groupName}</div>
                  <div className="text-sm font-bold text-slate-800 truncate">{action.challengeTitle}</div>
                  {action.myVerification?.comment && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      "{action.myVerification.comment}"
                    </div>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <Check className="w-3 h-3" />
                  {action.streakDays ? `${action.streakDays}일 연속` : '완료'}
                </span>
              </div>
            ))}
          </>
        )}
      </main>
      <ScreenNav active="today" pending={pending.length} />
    </Screen>
  );
}

import React, { useState, useEffect } from 'react';
import { Clock, Bell, Camera, Check, CheckCircle2 } from './ScreenIcons';
import { useNavigate } from 'react-router-dom';
import type { TodayAction } from '../../types';
import { Screen, ScreenNav, screenAssets } from './Screen';
import { AppHeader, HeaderIconButton } from '../layout/AppHeader';
import { Button, Card, Chip, Notice, ProgressBar } from '../dayu/ui';
import { Smartphone, X, Megaphone } from 'lucide-react';
import { IosInstallGuideModal } from '../IosInstallGuideModal';
import { useAnnouncementNotification } from '../../context/AnnouncementNotificationContext';
import { usePlacementNotice } from '../../hooks/usePlacementNotice';
import { HomeAnnouncementCard } from '../announcement/HomeAnnouncementCard';
import { executeAnnouncementCta } from '../../utils/announcementCtaHandler';
import { useToast } from '../../context/ToastContext';
import { isStandalone, isIos } from '../../utils/webPush';
import {
  logPwaImpression,
  logPwaGuideOpen,
  dismissPwaBanner,
  isPwaBannerDismissed,
} from '../../utils/pwaAnalytics';

/** 섹션 제목 줄. 인증 대기(amber)와 완료(emerald)는 글자색까지 상태를 따른다. */
function StatusHead({ tone, icon, title, count }: { tone: 'warn' | 'ok'; icon: React.ReactNode; title: string; count: number }) {
  const c = tone === 'warn' ? 'text-amber-700' : 'text-emerald-700';
  return (
    <h3 className={`flex items-center gap-1.5 text-[15px] font-extrabold tracking-[-0.01em] ${c}`}>
      {icon}
      {title}
      <span className="text-[12.5px] tabular-nums">{count}</span>
    </h3>
  );
}

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
  const { hasUnread, refreshUnreadDot } = useAnnouncementNotification();
  const { showToast } = useToast();
  const { notice: homeNotice, dismiss: dismissHomeNotice } = usePlacementNotice('HOME');
  const pending = actions.filter((a) => !a.isCompletedToday);
  const completed = actions.filter((a) => a.isCompletedToday);

  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => isPwaBannerDismissed());

  const canShowBanner = !isStandalone() && !isBannerDismissed;

  useEffect(() => {
    if (canShowBanner) {
      logPwaImpression('today_banner');
    }
  }, [canShowBanner]);

  return (
    <Screen>
      <AppHeader
        variant="main"
        titleSize="md"
        leftAction={<img className="mr-1 h-[26px] w-auto" src={screenAssets.symbol} alt="데이유즈" />}
        title="오늘"
        rightAction={
          <div className="flex items-center gap-1">
            <HeaderIconButton
              onClick={() => navigate('/announcements')}
              aria-label="새로운 소식"
              dot={hasUnread}
              dotLabel="새로운 소식 있음"
            >
              <Megaphone className="size-[20px]" />
            </HeaderIconButton>
            <HeaderIconButton onClick={() => navigate('/settings/notifications')} aria-label="알림 설정">
              <Bell className="size-[22px]" />
            </HeaderIconButton>
          </div>
        }
      />
      <main className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto px-4 pt-1 pb-screen-nav">
        {canShowBanner && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50/90 to-sky-50/90 p-3.5 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                logPwaGuideOpen('today_banner');
                setShowInstallGuide(true);
              }}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
            >
              <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Smartphone className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-bold text-slate-800">앱으로 편하게 쓰기</span>
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10.5px] font-bold text-blue-700">
                    설치 3초
                  </span>
                </div>
                <p className="truncate text-[12px] text-slate-500">홈 화면에 추가하고 매일 편하게 인증하세요</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                dismissPwaBanner(7);
                setIsBannerDismissed(true);
              }}
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600"
              aria-label="배너 닫기"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <p className="text-[14px] text-slate-500">
          {new Date().toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            timeZone: 'Asia/Seoul',
          })}
        </p>

        {homeNotice && (
          <HomeAnnouncementCard
            announcement={homeNotice}
            onDismiss={dismissHomeNotice}
            onDetail={() => navigate(`/announcements/${homeNotice.id}`)}
            onCtaClick={() => {
              void executeAnnouncementCta({
                target: homeNotice.ctaTarget,
                announcementId: homeNotice.id,
                navigate,
                showToast,
                onRefreshUnread: refreshUnreadDot,
              });
            }}
          />
        )}

        {loading ? (
          <p className="py-12 text-center text-[13px] text-slate-500" role="status">
            오늘 할 일을 불러오는 중...
          </p>
        ) : error ? (
          <div className="flex items-center justify-between rounded-[18px] border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
            <span>{error}</span>
            <button onClick={retry} className="cursor-pointer font-bold underline">
              다시 시도
            </button>
          </div>
        ) : !actions.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <img src={screenAssets.symbol} alt="" className="mb-1 size-24" />
            <h2 className="text-[17px] font-bold text-slate-800">오늘은 인증할 챌린지가 없어요</h2>
            <Button onClick={() => navigate('/groups')}>모임 둘러보기</Button>
          </div>
        ) : (
          <>
            {/* 오늘의 진행 상황 요약 */}
            <div className="flex items-center gap-3.5 rounded-[20px] border border-blue-100 bg-blue-50 p-[19px]">
              <img src={screenAssets.hero} alt="" className="size-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] leading-[1.35] font-extrabold tracking-[-0.02em] text-slate-800">
                  {pending.length ? `인증할 챌린지가 ${pending.length}개 남았어요` : '오늘 할 일을 모두 마쳤어요!'}
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-600">
                  {pending.length ? '자정 전에 사진 한 장이면 끝나요.' : '내일도 함께 꾸준히 이어가요.'}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <ProgressBar value={completed.length / actions.length} track="white" className="flex-1" />
                  <b className="text-[12.5px] tabular-nums text-slate-800">
                    {completed.length}/{actions.length}
                  </b>
                </div>
              </div>
            </div>

            {!!pending.length && (
              <StatusHead tone="warn" icon={<Clock className="size-4" />} title="인증 대기" count={pending.length} />
            )}
            {pending.map((action) => (
              <Card key={action.challengeId}>
                <div className="flex items-center justify-between gap-2">
                  <Chip tone="blue">{action.groupName}</Chip>
                  {!!action.streakDays && (
                    <span className="text-[13px] font-bold text-blue-600">{action.streakDays}일째 이어가는 중</span>
                  )}
                </div>
                <h3 className="mt-3 text-[17px] leading-[1.5] font-bold tracking-[-0.01em] text-slate-800">
                  {action.challengeTitle}
                </h3>
                <Notice className="mt-2.5">
                  <span className="mr-1.5 font-bold text-slate-800">인증 기준</span>
                  {action.verificationCriteria}
                </Notice>
                <Button className="mt-3 w-full" onClick={() => onVerify(action)} disabled={!action.canVerify}>
                  <Camera className="size-4" />
                  사진 찍고 인증하기
                </Button>
              </Card>
            ))}

            {!!completed.length && (
              <StatusHead tone="ok" icon={<CheckCircle2 className="size-4" />} title="완료" count={completed.length} />
            )}
            {completed.map((action) => (
              <Card key={action.challengeId} tone="done" className="flex items-center gap-3">
                {action.myVerification?.imageUrl && (
                  <button
                    className="size-[52px] shrink-0 cursor-pointer overflow-hidden rounded-xl"
                    onClick={() => onImage(action.myVerification!.imageUrl, action.challengeTitle)}
                    aria-label="사진 확대 보기"
                  >
                    <img src={action.myVerification.imageUrl} alt="인증 사진" className="size-full object-cover" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-slate-500">{action.groupName}</div>
                  <div className="truncate text-[15.5px] font-bold tracking-[-0.01em] text-slate-800">
                    {action.challengeTitle}
                  </div>
                  {action.myVerification?.comment && (
                    <div className="truncate text-[13px] text-slate-600">"{action.myVerification.comment}"</div>
                  )}
                </div>
                <Chip tone="ok">
                  <Check className="size-3.5" />
                  {action.streakDays ? `${action.streakDays}일 연속` : '완료'}
                </Chip>
              </Card>
            ))}
          </>
        )}
      </main>
      <ScreenNav active="today" pending={pending.length} announcementDot={hasUnread} />

      <IosInstallGuideModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        initialPlatform={isIos() ? 'ios' : 'android'}
      />
    </Screen>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Send, ShieldAlert, AlertCircle, Smartphone } from 'lucide-react';
import { SubPageHeader } from '../components/layout/SubPageHeader';
import { IosInstallGuideModal } from '../components/IosInstallGuideModal';
import { useToast } from '../context/ToastContext';
import {
  getNotificationSettings,
  updateNotificationSettings,
  registerPushSubscription,
  unregisterPushSubscription,
  sendTestPush,
  type NotificationSettingResponse,
} from '../api/notifications';
import {
  isPushNotificationSupported,
  isIos,
  isAndroid,
  isStandalone,
  subscribeToPush,
  unsubscribePush,
  getMatchingSubscription,
  toSubscriptionData,
} from '../utils/webPush';

import { NotifyTimeChips } from '../components/NotifyTimeChips';
import { PushPreview } from '../components/PushPreview';
import { Button, Card, Help, Switch } from '../components/dayu/ui';

export const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingResponse | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<'ios' | 'android'>('ios');
  const [deviceOutOfSync, setDeviceOutOfSync] = useState(false);

  const supported = isPushNotificationSupported();
  const iosEnv = isIos();
  const androidEnv = isAndroid();
  const standaloneEnv = isStandalone();
  const iosNeedsInstall = iosEnv && !standaloneEnv;
  const androidCanInstall = androidEnv && !standaloneEnv;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getNotificationSettings();
      setSettings(data);
      await reconcileDevice(data);
    } catch {
      showToast('알림 설정을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 서버가 아는 구독과 이 브라우저의 실제 구독을 맞춘다.
   *
   * 브라우저 데이터를 지우거나 구독이 갱신되면 둘이 어긋나는데, 서버는 이를 알 방법이 없다.
   * 그대로 두면 토글은 켜진 것처럼 보이지만 알림은 오지 않는다.
   */
  const reconcileDevice = async (data: NotificationSettingResponse) => {
    if (!isPushNotificationSupported()) return;

    try {
      const local = await getMatchingSubscription(data.vapidPublicKey);

      // 브라우저에는 구독이 있는데 서버가 모르는 경우 (구독 갱신 직후 등)
      if (local && !data.hasActiveSubscription) {
        await registerPushSubscription(toSubscriptionData(local));
        setSettings({ ...data, hasActiveSubscription: true });
        setDeviceOutOfSync(false);
        return;
      }

      // 서버는 등록됐다고 보는데 이 브라우저에는 구독이 없는 경우
      if (!local && data.hasActiveSubscription) {
        if (Notification.permission === 'granted') {
          // 권한이 이미 있으니 프롬프트 없이 조용히 다시 등록된다.
          const subData = await subscribeToPush(data.vapidPublicKey);
          if (subData) {
            await registerPushSubscription(subData);
            setDeviceOutOfSync(false);
            return;
          }
        }
        setDeviceOutOfSync(true);
        return;
      }

      setDeviceOutOfSync(false);
    } catch (err) {
      console.error('구독 상태 동기화 실패:', err);
      setDeviceOutOfSync(true);
    }
  };

  const handleToggle = async () => {
    if (!settings) return;

    if (!settings.enabled) {
      // 알림 켜기 시도
      if (iosNeedsInstall) {
        setGuidePlatform('ios');
        setShowIosGuide(true);
        return;
      }

      if (!supported) {
        showToast('이 브라우저는 웹 푸시 알림을 지원하지 않습니다.', 'error');
        return;
      }

      try {
        setSaving(true);
        // 브라우저 푸시 구독 신청
        const subData = await subscribeToPush(settings.vapidPublicKey);
        if (subData) {
          await registerPushSubscription(subData);
        }

        const updated = await updateNotificationSettings({
          enabled: true,
          reminderTime: settings.reminderTime,
        });
        setSettings(updated);
        setDeviceOutOfSync(false);
        showToast('알림이 활성화되었습니다.', 'success');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알림 권한을 얻지 못했습니다.';
        showToast(message, 'error');
      } finally {
        setSaving(false);
      }
    } else {
      // 알림 끄기 시도
      try {
        setSaving(true);
        const endpoint = await unsubscribePush();
        if (endpoint) {
          await unregisterPushSubscription({ endpoint });
        }

        const updated = await updateNotificationSettings({
          enabled: false,
          reminderTime: settings.reminderTime,
        });
        setSettings(updated);
        setDeviceOutOfSync(false);
        showToast('알림이 비활성화되었습니다.', 'info');
      } catch {
        showToast('알림 끄기에 실패했습니다.', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleTimeChange = async (newTime: string) => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await updateNotificationSettings({
        enabled: settings.enabled,
        reminderTime: newTime,
      });
      setSettings(updated);
      showToast(`알림 시간이 ${newTime}으로 변경되었습니다.`, 'success');
    } catch {
      showToast('알림 시간 변경에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    try {
      setTesting(true);
      const res = await sendTestPush();
      if (res.success) {
        showToast('테스트 알림이 발송되었습니다!', 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch {
      showToast('테스트 알림 발송 중 오류가 발생했습니다.', 'error');
    } finally {
      setTesting(false);
    }
  };


  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-800">
      {/* Header */}
      <SubPageHeader
        title="알림 설정"
        onBack={() => navigate(-1)}
      />

      <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-[14px] px-4 pt-1.5 pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
        <p className="text-[14px] text-slate-500">오늘 인증을 아직 안 한 챌린지가 있을 때만 알려드려요.</p>

        {/* iOS 환경 안내 배너 */}
        {iosNeedsInstall && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-[14px] flex items-start gap-2.5">
            <Smartphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-900">iOS 홈 화면 추가 필요</h4>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                아이폰에서는 홈 화면에 추가된 데이유즈 앱에서만 알림을 수신할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  setGuidePlatform('ios');
                  setShowIosGuide(true);
                }}
                className="mt-1.5 text-[11px] font-bold text-amber-800 underline hover:text-amber-900 cursor-pointer"
              >
                홈 화면 추가 방법 알아보기 &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Android 환경 안내 배너 */}
        {androidCanInstall && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-[14px] flex items-start gap-2.5">
            <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-blue-900">앱으로 더 편리하게 사용하기</h4>
              <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                홈 화면에 데이유즈를 추가하면 브라우저 주소창 없이 앱처럼 깔끔하게 사용하고 알림을 관리할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  setGuidePlatform('android');
                  setShowIosGuide(true);
                }}
                className="mt-1.5 text-[11px] font-bold text-blue-800 underline hover:text-blue-900 cursor-pointer"
              >
                홈 화면 추가 방법 알아보기 &rarr;
              </button>
            </div>
          </div>
        )}

        {/* 브라우저 미지원 배너 */}
        {!supported && !iosEnv && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-[14px] flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 leading-relaxed">
              현재 브라우저는 웹 푸시 알림을 지원하지 않습니다. Chrome, Safari(iOS 16.4+ 홈화면), 또는 최신 모바일 브라우저를 사용해 주세요.
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex justify-center items-center text-slate-400 text-sm">
            알림 설정을 불러오는 중...
          </div>
        ) : settings ? (
          <div className="flex flex-col gap-3.5">
            {/* 알림 받기 토글 카드 */}
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15.5px] font-bold tracking-[-0.01em] text-slate-800">미인증 챌린지 알림</div>
                <p className="text-[13px] text-slate-500">하루 한 번, 남은 인증이 있을 때만</p>
              </div>
              <Switch
                checked={settings.enabled}
                onChange={handleToggle}
                disabled={saving}
                label="미인증 챌린지 알림"
              />
            </Card>

            {/* 알림 시간 설정 및 미리보기 영역 */}
            <div className={`flex flex-col gap-3.5 transition-opacity ${
              settings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}>
              {/* 알림 시간 카드 */}
              <Card className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-[15.5px] font-bold text-slate-800">
                  <Clock className="size-4" />
                  알림 시간
                  <span className="text-[13px] font-normal text-slate-500">한국 시간</span>
                </div>

                <NotifyTimeChips
                  selectedTime={settings.reminderTime}
                  onTimeChange={handleTimeChange}
                  disabled={!settings.enabled || saving}
                />
              </Card>

              {/* 푸시 잠금화면 미리보기 */}
              <PushPreview time={settings.reminderTime} />

              {/* 테스트 알림 전송 버튼 */}
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={testing || !settings.hasActiveSubscription || deviceOutOfSync}
                onClick={handleTestPush}
              >
                <Send className="size-4" />
                {testing ? '발송 중...' : '테스트 알림 보내기'}
              </Button>

              {deviceOutOfSync ? (
                <p className="text-xs text-amber-600 flex items-center gap-1 px-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  이 기기의 알림 구독이 해제되어 있습니다. 알림을 껐다가 다시 켜 주세요.
                </p>
              ) : !settings.hasActiveSubscription ? (
                <p className="text-xs text-amber-600 flex items-center gap-1 px-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  먼저 상단의 알림을 켜서 현재 기기를 등록해 주세요.
                </p>
              ) : null}
            </div>

            {/* 알아 두세요 안내사항 */}
            <div className="flex flex-col gap-1.5 px-1 pt-1">
              <div className="text-[14px] font-bold text-slate-800">알아 두세요</div>
              <Help>· 오늘 인증을 모두 마친 날에는 알림이 오지 않아요.</Help>
              <Help>· 알림에는 친구 이름이나 금액이 나오지 않고, 남은 개수만 보여요.</Help>
              <Help>· 브라우저 알림 권한이 꺼져 있으면 받을 수 없어요.</Help>
              <button
                type="button"
                onClick={() => {
                  setGuidePlatform(androidEnv ? 'android' : 'ios');
                  setShowIosGuide(true);
                }}
                className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-blue-600 hover:text-blue-700 hover:underline self-start cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                홈 화면에 앱 추가하는 방법 (iOS / Android) &rarr;
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <IosInstallGuideModal
        isOpen={showIosGuide}
        onClose={() => setShowIosGuide(false)}
        initialPlatform={guidePlatform}
      />
    </div>
  );
};

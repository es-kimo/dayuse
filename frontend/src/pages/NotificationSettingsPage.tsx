import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, Send, ShieldAlert, AlertCircle, Smartphone, ArrowLeft } from 'lucide-react';
import { MobileLayout } from '../components/MobileLayout';
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
  isStandalone,
  subscribeToPush,
  unsubscribePush,
  getMatchingSubscription,
  toSubscriptionData,
} from '../utils/webPush';

export const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingResponse | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [deviceOutOfSync, setDeviceOutOfSync] = useState(false);

  const supported = isPushNotificationSupported();
  const iosEnv = isIos();
  const standaloneEnv = isStandalone();
  const iosNeedsInstall = iosEnv && !standaloneEnv;

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

  const timeOptions = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '20:30',
    '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ];

  return (
    <MobileLayout>
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-md transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              알림 설정
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            오늘 아직 완료하지 않은 챌린지가 있을 때 정해진 시간에 리마인드해 드려요.
          </p>
        </div>

        {/* iOS 환경 안내 배너 */}
        {iosNeedsInstall && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900">iOS 홈 화면 추가 필요</h4>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                아이폰에서는 홈 화면에 추가된 데이유즈 앱에서만 알림을 수신할 수 있습니다.
              </p>
              <button
                onClick={() => setShowIosGuide(true)}
                className="mt-2 text-xs font-semibold text-amber-800 underline hover:text-amber-900"
              >
                홈 화면 추가 방법 알아보기 &rarr;
              </button>
            </div>
          </div>
        )}

        {/* 브라우저 미지원 배너 */}
        {!supported && !iosEnv && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
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
          <div className="space-y-4">
            {/* 알림 받기 토글 카드 */}
            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-slate-900">미인증 챌린지 알림 받기</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  하루 1회, 미인증 챌린지가 있을 때만 발송됩니다.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  settings.enabled ? 'bg-blue-600' : 'bg-slate-200'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    settings.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 알림 시간 설정 카드 */}
            <div className={`p-4 bg-white border border-slate-200 rounded-lg shadow-xs space-y-3 transition-opacity ${
              settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'
            }`}>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock className="w-4 h-4 text-blue-600" />
                알림 시간 (KST 기준)
              </div>
              <p className="text-xs text-slate-500">
                선택하신 시간에 맞춰 알림이 전송됩니다.
              </p>

              <select
                value={settings.reminderTime}
                disabled={!settings.enabled || saving}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            {/* 테스트 알림 전송 버튼 */}
            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-slate-900">테스트 알림 보내보기</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    현재 기기로 테스트 알림이 도착하는지 즉시 확인해 봅니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={testing || !settings.hasActiveSubscription || deviceOutOfSync}
                onClick={handleTestPush}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {testing ? '발송 중...' : '테스트 알림 발송'}
              </button>
              {deviceOutOfSync ? (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  이 기기의 알림 구독이 해제되어 있습니다. 알림을 껐다가 다시 켜 주세요.
                </p>
              ) : !settings.hasActiveSubscription ? (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  먼저 상단의 알림을 켜서 현재 기기를 등록해 주세요.
                </p>
              ) : null}
            </div>

            {/* 안내사항 */}
            <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-slate-700">💡 알림 안내사항</div>
              <div>• 오늘 인증해야 할 챌린지를 모두 완료한 날에는 알림이 오지 않습니다.</div>
              <div>• 친구들의 이름이나 금액 정보는 알림에 노출되지 않으며 건수만 요약됩니다.</div>
              <div>• 기기 설정에서 브라우저 알림 권한이 차단되어 있으면 알림이 수신되지 않습니다.</div>
            </div>
          </div>
        ) : null}
      </div>

      <IosInstallGuideModal
        isOpen={showIosGuide}
        onClose={() => setShowIosGuide(false)}
      />
    </MobileLayout>
  );
};

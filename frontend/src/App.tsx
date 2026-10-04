import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { KakaoCallbackPage } from './pages/KakaoCallbackPage';
import { GroupsPage } from './pages/GroupsPage';
import { NewGroupPage } from './pages/NewGroupPage';
import { GroupDetailPage } from './pages/GroupDetailPage';
import { InviteLandingPage } from './pages/InviteLandingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AvatarCustomPage } from './pages/AvatarCustomPage';
import { NewChallengePage } from './pages/NewChallengePage';
import { ChallengeDetailPage } from './pages/ChallengeDetailPage';
import { SettlementManagePage } from './pages/SettlementManagePage';
import { PublicShareLandingPage } from './pages/PublicShareLandingPage';
import { TodayPage } from './pages/TodayPage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { GuidePage } from './pages/GuidePage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { InviteCreatedPage } from './pages/InviteCreatedPage';
import { PageMetaTracker } from './components/PageMetaTracker';
import { ScrollToTop } from './components/ScrollToTop';
import { preloadKakao } from './utils/kakao';
import { registerServiceWorker } from './utils/webPush';
import { initPwaInstallTracking } from './utils/pwaAnalytics';

export const App: React.FC = () => {
  // 카카오 SDK 및 웹 푸시 Service Worker, PWA 설치 추적을 부팅 때 초기화한다.
  useEffect(() => {
    void preloadKakao();
    void registerServiceWorker();
    const cleanupTracking = initPwaInstallTracking();
    return () => {
      cleanupTracking();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <PageMetaTracker />
          <ScrollToTop />
          <AuthProvider>
            <Routes>

            <Route path="/" element={<Navigate to="/groups" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/oauth/callback/kakao" element={<KakaoCallbackPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/new" element={<NewGroupPage />} />
            <Route path="/groups/:groupId/invite-created" element={<InviteCreatedPage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
            <Route path="/groups/:groupId/challenges/new" element={<NewChallengePage />} />
            <Route path="/groups/:groupId/settlements" element={<SettlementManagePage />} />
            <Route path="/challenges/:challengeId" element={<ChallengeDetailPage />} />
            <Route path="/shares/:token" element={<PublicShareLandingPage />} />
            <Route path="/invite/:inviteCode" element={<InviteLandingPage />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
            <Route path="/me/notifications" element={<NotificationSettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/me" element={<ProfilePage />} />
            <Route path="/profile/avatar" element={<AvatarCustomPage />} />
            <Route path="/me/avatar" element={<AvatarCustomPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate to="/groups" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;


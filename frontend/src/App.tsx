import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageMetaTracker } from "./components/PageMetaTracker";
import { ScrollToTop } from "./components/ScrollToTop";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AboutPage } from "./pages/AboutPage";
import { AvatarCustomPage } from "./pages/AvatarCustomPage";
import { ChallengeDetailPage } from "./pages/ChallengeDetailPage";
import { ContactPage } from "./pages/ContactPage";
import { GroupIdErrorBoundary } from "./pages/Group/Error/GroupIdErrorBoundary";
import { GroupDetailPage } from "./pages/GroupDetailPage";
import { GroupsPage } from "./pages/GroupsPage";
import { GuidePage } from "./pages/GuidePage";
import { InviteCreatedPage } from "./pages/InviteCreatedPage";
import { InviteLandingPage } from "./pages/InviteLandingPage";
import { KakaoCallbackPage } from "./pages/KakaoCallbackPage";
import { LoginPage } from "./pages/LoginPage";
import { NewChallengePage } from "./pages/NewChallengePage";
import { NewGroupPage } from "./pages/NewGroupPage";
import { NotificationSettingsPage } from "./pages/NotificationSettingsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicShareLandingPage } from "./pages/PublicShareLandingPage";
import { SettlementManagePage } from "./pages/SettlementManagePage";
import { TermsPage } from "./pages/TermsPage";
import { TodayPage } from "./pages/TodayPage";
import { preloadKakao } from "./utils/kakao";
import { initPwaInstallTracking } from "./utils/pwaAnalytics";
import { registerServiceWorker } from "./utils/webPush";

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
              <Route path="/groups/:groupId" element={<GroupIdErrorBoundary />}>
                <Route path="/groups/:groupId/invite-created" element={<InviteCreatedPage />} />
                <Route path="/groups/:groupId" element={<GroupDetailPage />} />
                <Route path="/groups/:groupId/challenges/new" element={<NewChallengePage />} />
                <Route path="/groups/:groupId/settlements" element={<SettlementManagePage />} />
              </Route>
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

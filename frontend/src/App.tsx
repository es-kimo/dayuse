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
import { NewChallengePage } from './pages/NewChallengePage';
import { ChallengeDetailPage } from './pages/ChallengeDetailPage';
import { SettlementManagePage } from './pages/SettlementManagePage';
import { PublicShareLandingPage } from './pages/PublicShareLandingPage';
import { preloadKakao } from './utils/kakao';

export const App: React.FC = () => {
  // 카카오 SDK를 부팅 때 붙여둔다.
  // 공유 버튼을 누른 뒤에 로드하면 그 사이 사용자 제스처가 끊겨 데스크톱에서 팝업이 차단된다.
  useEffect(() => {
    void preloadKakao();
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/groups" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/oauth/callback/kakao" element={<KakaoCallbackPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/groups/new" element={<NewGroupPage />} />
              <Route path="/groups/:groupId" element={<GroupDetailPage />} />
              <Route path="/groups/:groupId/challenges" element={<GroupDetailPage />} />
              <Route path="/groups/:groupId/challenges/new" element={<NewChallengePage />} />
              <Route path="/groups/:groupId/settlements" element={<SettlementManagePage />} />
              <Route path="/challenges/:challengeId" element={<ChallengeDetailPage />} />
              <Route path="/shares/:token" element={<PublicShareLandingPage />} />
              <Route path="/invite/:inviteCode" element={<InviteLandingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/groups" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;


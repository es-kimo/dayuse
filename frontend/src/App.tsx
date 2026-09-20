import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

export const App: React.FC = () => {
  return (
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
          <Route path="/invite/:inviteCode" element={<InviteLandingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/groups" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;


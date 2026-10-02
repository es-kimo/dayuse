import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsApi } from '../api/groups';
import type { GroupSummary } from '../types';
import { GroupsScreen } from '../components/screens/GroupsScreen';
import { useTrackOnce } from '../hooks/useTrackOnce';

export const GroupsPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [inviteInput, setInviteInput] = useState<string>('');

  // 홈 조회는 로그인 사용자가 실제로 홈에 들어왔을 때 진입당 1회만 기록한다.
  useTrackOnce('home_viewed', undefined, !authLoading && isAuthenticated);


  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchGroups = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await groupsApi.getMyGroups();
        setGroups(data);
      } catch (err) {
        console.error('Failed to fetch groups:', err);
        setLoadError('모임 목록을 불러오지 못했어요.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchGroups();
    }
  }, [authLoading, isAuthenticated, navigate, reload]);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteInput.trim();
    if (!cleanCode) return;
    const code = (cleanCode.includes('/invite/') ? cleanCode.split('/invite/')[1] : cleanCode).split(/[?#/]/)[0];
    navigate(`/invite/${code}`);
  };

  return <GroupsScreen groups={groups} loading={loading || authLoading} error={loadError} retry={() => setReload(n => n + 1)} inviteInput={inviteInput} setInviteInput={setInviteInput} onJoin={handleJoinByCode} />;
};

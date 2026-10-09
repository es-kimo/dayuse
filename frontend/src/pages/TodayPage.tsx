import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TodayScreen } from '../components/screens/TodayScreen';

import { VerificationModal } from '../components/VerificationModal';
import { Lightbox } from '../components/ui/Lightbox';
import { todayApi } from '../api/today';
import type { TodayAction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useVerificationDraft } from '../context/VerificationDraftContext';

export const TodayPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { draft } = useVerificationDraft();
  const [actions, setActions] = useState<TodayAction[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAction, setSelectedAction] = useState<TodayAction | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);

  // 이전에 저장된 드래프트가 있다면 모달 자동 복원
  useEffect(() => {
    if (draft && !selectedAction) {
      setSelectedAction({
        challengeId: draft.challengeId,
        challengeTitle: draft.challengeTitle,
        verificationCriteria: draft.verificationCriteria || '',
        groupId: draft.groupId || 0,
        groupName: '',
        startDate: '',
        endDate: '',
        streakDays: 0,
        isCompletedToday: false,
        canVerify: true,
      });
    }
  }, [draft]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/today');
      return;
    }
    if (isAuthenticated) {
      loadTodayActions();
    }
  }, [authLoading, isAuthenticated]);

  const loadTodayActions = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await todayApi.getAllTodayActions();
      setActions(data);
    } catch (err) {
      console.error('오늘 할 일 목록 조회 실패:', err);
      setLoadError('오늘 할 일을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };


  return <>
    <TodayScreen actions={actions} loading={loading} error={loadError} retry={loadTodayActions} onVerify={setSelectedAction} onImage={(src, alt) => setLightboxImage({ src, alt })} />
    {selectedAction && <VerificationModal action={selectedAction} onClose={() => setSelectedAction(null)} onSuccess={() => { setSelectedAction(null); loadTodayActions(); }} />}
    {lightboxImage && <Lightbox open onClose={() => setLightboxImage(null)} src={lightboxImage.src} alt={lightboxImage.alt} />}
  </>;
};

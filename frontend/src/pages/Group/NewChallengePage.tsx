import React, { useState, useEffect, useMemo } from 'react';
import { useExperiment } from '../../hooks/useExperiment';
import { CHALLENGE_REDAY_UI_EXPERIMENT } from '../../constants/experiments';
import type { ExperimentState } from '../../types/experiment';
import { track } from '../../utils/tracker';
import { navigateAfterChallengeCreation } from '../../utils/challengeNavigation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { challengesApi } from '../../api/challenges';
import { groupsApi } from '../../api/groups';
import { useAuth } from '../../context/AuthContext';
import { NewChallengeViewB } from '../../components/NewChallengeViewB';
import { getTodayKstString, addDaysKst } from '../../utils/date';
import type { ChallengeSummary, PeriodType, ExecutionType, GroupMember, CreateChallengePayload } from '../../types';
import { useGroupIdOrThrow } from './hooks/useGroupIdOrThrow';

const PERIOD_PRESETS = [
  { label: '1주 (7일)', days: 7 },
  { label: '2주 (14일)', days: 14 },
  { label: '3주 (21일)', days: 21 },
  { label: '4주 (28일)', days: 28 },
] as const;

export const NewChallengePage: React.FC = () => {
  const groupId = useGroupIdOrThrow();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const restartFromId = searchParams.get('restartFrom');
  const today = getTodayKstString();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [verificationCriteria, setVerificationCriteria] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDaysKst(today, 13));
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(14);
  const [periodType, setPeriodType] = useState<PeriodType>('DAILY');
  const [executionType, setExecutionType] = useState<ExecutionType>('INDIVIDUAL');
  const [targetFrequency, setTargetFrequency] = useState<number>(3);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(5000);
  const [redayAllowed, setRedayAllowed] = useState<boolean>(true);

  const canEnableReday = periodType === 'DAILY' && executionType === 'INDIVIDUAL' && penaltyAmount > 0;
  const effectiveRedayAllowed = canEnableReday && redayAllowed;

  // 모임원 다중 선택 및 참가자별 벌금 상태
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const [memberPenalties, setMemberPenalties] = useState<Record<number, number>>({});

  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isTemplateLoaded, setIsTemplateLoaded] = useState(false);
  const [activeRestartId, setActiveRestartId] = useState<string | null>(restartFromId);

  const redayPreview = import.meta.env.DEV && ['A', 'B'].includes(searchParams.get('reday_ui') ?? '');
  const redayExperimentEligible = !redayPreview && !activeRestartId && !isTemplateLoaded && !isLoadingTemplate;
  const redayExperiment = useExperiment(CHALLENGE_REDAY_UI_EXPERIMENT, redayExperimentEligible);
  const redayExposure = React.useRef<ExperimentState | null>(null);

  // 이전 챌린지 불러오기 모달 상태
  const [, setShowHistoryModal] = useState(false);
  const [, setHistoryChallenges] = useState<ChallengeSummary[]>([]);
  const [, setIsLoadingHistory] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 총 진행 일수 계산
  const durationDays = useMemo(() => {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 1;
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  // 1. URL restartFrom 쿼리 파라미터가 있을 때 템플릿 로드
  useEffect(() => {
    if (!restartFromId) return;

    const loadTemplate = async () => {
      setIsLoadingTemplate(true);
      try {
        const template = await challengesApi.getRestartTemplate(groupId, Number(restartFromId));
        setTitle(template.title);
        setDescription(template.description || '');
        setVerificationCriteria(template.verificationCriteria);
        setStartDate(template.suggestedStartDate);
        setEndDate(template.suggestedEndDate);
        if (template.periodType) setPeriodType(template.periodType);
        if (template.targetFrequency) setTargetFrequency(template.targetFrequency);
        setRedayAllowed(Boolean(template.redayAllowed));
        if (template.executionType) {
          setExecutionType(template.executionType);
          if (template.executionType === 'TOGETHER') {
            setPenaltyAmount(0);
          } else {
            setPenaltyAmount(template.suggestedPenaltyAmount || 5000);
          }
        } else {
          setPenaltyAmount(template.suggestedPenaltyAmount || 5000);
        }
        const dur = Math.round((new Date(template.suggestedEndDate).getTime() - new Date(template.suggestedStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const matched = PERIOD_PRESETS.find((p) => p.days === dur);
        setSelectedPreset(matched ? matched.days : 'custom');
        setIsTemplateLoaded(true);
        setActiveRestartId(restartFromId);
      } catch (err: any) {
        console.error('Failed to load restart template:', err);
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [groupId, restartFromId]);

  // 1-1. 모임원 목록 조회
  useEffect(() => {
    const fetchGroupMembers = async () => {
      try {
        const detail = await groupsApi.getGroupDetail(groupId);
        setGroupMembers(detail.members || []);
      } catch (err) {
        console.error('Failed to load group members:', err);
      }
    };
    fetchGroupMembers();
  }, [groupId]);

  const handleToggleMember = (userId: number) => {
    if (userId === currentUser?.id) return; // 생성자는 필수 참여
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
        if (memberPenalties[userId] === undefined) {
          setMemberPenalties((p) => ({ ...p, [userId]: penaltyAmount }));
        }
      }
      return next;
    });
  };

  const handleMemberPenaltyChange = (userId: number, amount: number) => {
    setMemberPenalties((prev) => ({ ...prev, [userId]: Math.max(0, amount) }));
  };

  // 최종 등록 대상 참가자 목록
  const participantsList = useMemo(() => {
    const list: Array<{
      userId: number;
      nickname: string;
      profileImageUrl?: string | null;
      penaltyAmount: number;
      isCreator: boolean;
    }> = [];

    // 1. 생성자 본인 (필수 참여)
    const creatorMember = groupMembers.find((m) => m.userId === currentUser?.id);
    list.push({
      userId: currentUser?.id || 0,
      nickname: creatorMember?.nickname || currentUser?.nickname || '생성자 (나)',
      profileImageUrl: creatorMember?.profileImageUrl || currentUser?.profileImageUrl,
      penaltyAmount: executionType === 'TOGETHER' ? 0 : penaltyAmount,
      isCreator: true,
    });

    // 2. 추가 선택된 모임원들
    groupMembers.forEach((m) => {
      if (m.userId !== currentUser?.id && selectedMemberIds.has(m.userId)) {
        list.push({
          userId: m.userId,
          nickname: m.nickname,
          profileImageUrl: m.profileImageUrl,
          penaltyAmount: executionType === 'TOGETHER' ? 0 : penaltyAmount,
          isCreator: false,
        });
      }
    });

    return list;
  }, [groupMembers, currentUser, selectedMemberIds, memberPenalties, penaltyAmount, executionType]);

  // 2. 모임 내 기존 챌린지 목록 조회 (불러오기 모달용)
  const handleOpenHistoryModal = async () => {
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    try {
      const list = await challengesApi.getGroupChallenges(groupId);
      setHistoryChallenges(list);
    } catch (err: any) {
      console.error('Failed to load group challenges:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let createdChallenge;
      const payload: CreateChallengePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        verificationCriteria: verificationCriteria.trim(),
        startDate,
        endDate,
        periodType,
        targetFrequency: periodType === 'WEEKLY_N' ? targetFrequency : null,
        executionType,
        redayAllowed: effectiveRedayAllowed,
        myPenaltyAmount: executionType === 'TOGETHER' ? 0 : penaltyAmount,
        participants: participantsList.map((p) => ({
          userId: p.userId,
          penaltyAmount: executionType === 'TOGETHER' ? 0 : p.penaltyAmount,
        })),
      };

      if (activeRestartId) {
        createdChallenge = await challengesApi.restartChallenge(groupId, Number(activeRestartId), payload);
      } else {
        createdChallenge = await challengesApi.createChallenge(groupId, payload);
      }

      // 생성 API가 실제로 성공해 챌린지가 만들어진 뒤에만 기록한다.
      // 노출 뒤 조건/템플릿을 바꿔도 완료율 분모에서 빠지지 않게 최초 노출에 귀속한다.
      const experimentContext = redayPreview ? undefined : redayExposure.current ?? undefined;
      const creationProperties = {
        challengeId: createdChallenge.id,
        groupId: createdChallenge.groupId,
        isRestart: !!activeRestartId,
        redayAllowed: effectiveRedayAllowed,
        redayEligible: canEnableReday,
        isTemplate: isTemplateLoaded,
      };
      track('challenge_created', creationProperties, experimentContext);
      if (effectiveRedayAllowed && experimentContext) {
        track('challenge_created_reday_allowed', creationProperties, experimentContext);
      }

      navigateAfterChallengeCreation(navigate, createdChallenge.groupId, createdChallenge.id);
    } catch (err: any) {
      console.error('Failed to create challenge:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <NewChallengeViewB
      title={title}
      setTitle={setTitle}
      description={description}
      setDescription={setDescription}
      verificationCriteria={verificationCriteria}
      setVerificationCriteria={setVerificationCriteria}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      selectedPreset={selectedPreset}
      setSelectedPreset={setSelectedPreset}
      periodType={periodType}
      setPeriodType={setPeriodType}
      targetFrequency={targetFrequency}
      setTargetFrequency={setTargetFrequency}
      executionType={executionType}
      setExecutionType={setExecutionType}
      penaltyAmount={penaltyAmount}
      setPenaltyAmount={setPenaltyAmount}
      redayExperiment={redayExperimentEligible ? redayExperiment : undefined}
      onRedayExposure={(state) => { redayExposure.current = state; }}
      redayAllowed={redayAllowed}
      setRedayAllowed={setRedayAllowed}
      groupMembers={groupMembers}
      selectedMemberIds={selectedMemberIds}
      onToggleMember={handleToggleMember}
      memberPenalties={memberPenalties}
      onMemberPenaltyChange={handleMemberPenaltyChange}
      durationDays={durationDays}
      isSubmitting={isSubmitting}
      onBack={() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate(`/groups/${groupId}?tab=challenges`);
        }
      }}
      onSubmit={handleConfirmSubmit}
      onOpenHistory={handleOpenHistoryModal}
      currentUserId={currentUser?.id}
    />
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { challengesApi } from '../api/challenges';
import { groupsApi } from '../api/groups';
import { useAuth } from '../context/AuthContext';
import { MobileLayout } from '../components/MobileLayout';
import {
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Coins,
  AlertCircle,
  Loader2,
  History,
  RotateCcw,
  Sparkles,
  X,
  Check,
  Repeat,
  Layers,
  Users,
  SlidersHorizontal,
} from 'lucide-react';
import { getTodayKstString, addDaysKst } from '../utils/date';
import type { ChallengeSummary, PeriodType, GroupMember, CreateChallengePayload } from '../types';

const PERIOD_PRESETS = [
  { label: '1주 (7일)', days: 7 },
  { label: '2주 (14일)', days: 14 },
  { label: '3주 (21일)', days: 21 },
  { label: '4주 (28일)', days: 28 },
] as const;

export const NewChallengePage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
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
  const [targetFrequency, setTargetFrequency] = useState<number>(3);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(5000);

  // 모임원 다중 선택 및 참가자별 벌금 상태
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const [memberPenalties, setMemberPenalties] = useState<Record<number, number>>({});
  const [isCustomPenaltyPerMember, setIsCustomPenaltyPerMember] = useState(false);

  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isTemplateLoaded, setIsTemplateLoaded] = useState(false);
  const [activeRestartId, setActiveRestartId] = useState<string | null>(restartFromId);

  // 이전 챌린지 불러오기 모달 상태
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyChallenges, setHistoryChallenges] = useState<ChallengeSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // 총 진행 일수 계산
  const durationDays = useMemo(() => {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 1;
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  // 주 N회 선택 시 7일 구간 분할 계산 (프리뷰용)
  const previewIntervals = useMemo(() => {
    if (periodType !== 'WEEKLY_N' || !startDate || !endDate || endDate < startDate) {
      return [];
    }
    const intervals: Array<{
      index: number;
      startDate: string;
      endDate: string;
      days: number;
      targetCount: number;
      isShort: boolean;
    }> = [];

    let cur = startDate;
    let idx = 1;

    while (cur <= endDate) {
      const naturalEnd = addDaysKst(cur, 6);
      const curEnd = naturalEnd > endDate ? endDate : naturalEnd;
      const sMs = new Date(cur).getTime();
      const eMs = new Date(curEnd).getTime();
      const days = Math.round((eMs - sMs) / (1000 * 60 * 60 * 24)) + 1;
      const target = Math.min(targetFrequency, days);

      intervals.push({
        index: idx,
        startDate: cur,
        endDate: curEnd,
        days,
        targetCount: target,
        isShort: days < 7,
      });

      cur = addDaysKst(curEnd, 1);
      idx++;
    }

    return intervals;
  }, [periodType, targetFrequency, startDate, endDate]);

  // 1. URL restartFrom 쿼리 파라미터가 있을 때 템플릿 로드
  useEffect(() => {
    if (!groupId || !restartFromId) return;

    const loadTemplate = async () => {
      setIsLoadingTemplate(true);
      setError(null);
      try {
        const template = await challengesApi.getRestartTemplate(Number(groupId), Number(restartFromId));
        setTitle(template.title);
        setDescription(template.description || '');
        setVerificationCriteria(template.verificationCriteria);
        setStartDate(template.suggestedStartDate);
        setEndDate(template.suggestedEndDate);
        if (template.periodType) setPeriodType(template.periodType);
        if (template.targetFrequency) setTargetFrequency(template.targetFrequency);
        setPenaltyAmount(template.suggestedPenaltyAmount || 5000);
        const dur = Math.round((new Date(template.suggestedEndDate).getTime() - new Date(template.suggestedStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const matched = PERIOD_PRESETS.find((p) => p.days === dur);
        setSelectedPreset(matched ? matched.days : 'custom');
        setIsTemplateLoaded(true);
        setActiveRestartId(restartFromId);
        setSuccessNotice('종료된 챌린지 설정을 성공적으로 불러왔습니다.');
      } catch (err: any) {
        console.error('Failed to load restart template:', err);
        setError(err.response?.data?.message || '챌린지 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [groupId, restartFromId]);

  // 1-1. 모임원 목록 조회
  useEffect(() => {
    if (!groupId) return;
    const fetchGroupMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const detail = await groupsApi.getGroupDetail(Number(groupId));
        setGroupMembers(detail.members || []);
      } catch (err) {
        console.error('Failed to load group members:', err);
      } finally {
        setIsLoadingMembers(false);
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
      penaltyAmount: penaltyAmount,
      isCreator: true,
    });

    // 2. 추가 선택된 모임원들
    groupMembers.forEach((m) => {
      if (m.userId !== currentUser?.id && selectedMemberIds.has(m.userId)) {
        list.push({
          userId: m.userId,
          nickname: m.nickname,
          profileImageUrl: m.profileImageUrl,
          penaltyAmount: isCustomPenaltyPerMember ? (memberPenalties[m.userId] ?? penaltyAmount) : penaltyAmount,
          isCreator: false,
        });
      }
    });

    return list;
  }, [groupMembers, currentUser, selectedMemberIds, memberPenalties, penaltyAmount, isCustomPenaltyPerMember]);

  // 2. 모임 내 기존 챌린지 목록 조회 (불러오기 모달용)
  const handleOpenHistoryModal = async () => {
    if (!groupId) return;
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    try {
      const list = await challengesApi.getGroupChallenges(Number(groupId));
      setHistoryChallenges(list);
    } catch (err: any) {
      console.error('Failed to load group challenges:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 3. 특정 기존 챌린지 선택하여 불러오기
  const handleSelectHistoryChallenge = async (selected: ChallengeSummary) => {
    if (!groupId) return;
    setError(null);
    setIsLoadingTemplate(true);

    try {
      if (selected.status === 'ENDED') {
        const template = await challengesApi.getRestartTemplate(Number(groupId), selected.id);
        setTitle(template.title);
        setDescription(template.description || '');
        setVerificationCriteria(template.verificationCriteria);
        setStartDate(template.suggestedStartDate);
        setEndDate(template.suggestedEndDate);
        const dur = Math.round((new Date(template.suggestedEndDate).getTime() - new Date(template.suggestedStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const matched = PERIOD_PRESETS.find((p) => p.days === dur);
        setSelectedPreset(matched ? matched.days : 'custom');
        if (template.periodType) setPeriodType(template.periodType);
        if (template.targetFrequency) setTargetFrequency(template.targetFrequency);
        setPenaltyAmount(template.suggestedPenaltyAmount || 5000);
        setActiveRestartId(String(selected.id));
      } else {
        setTitle(selected.title);
        setDescription(selected.description || '');
        setVerificationCriteria(selected.verificationCriteria);
        const nextStart = addDaysKst(today, 1);
        setStartDate(nextStart);
        const startMs = new Date(selected.startDate).getTime();
        const endMs = new Date(selected.endDate).getTime();
        const days = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
        setEndDate(addDaysKst(nextStart, days - 1));
        const matched = PERIOD_PRESETS.find((p) => p.days === days);
        setSelectedPreset(matched ? matched.days : 'custom');
        if (selected.periodType) setPeriodType(selected.periodType);
        if (selected.targetFrequency) setTargetFrequency(selected.targetFrequency);
        if (selected.myPenaltyAmount) {
          setPenaltyAmount(selected.myPenaltyAmount);
        }
        setActiveRestartId(null);
      }

      setIsTemplateLoaded(true);
      setShowHistoryModal(false);
      setSuccessNotice(`'${selected.title}' 챌린지 설정을 불러왔습니다.`);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      console.error('Failed to import challenge:', err);
      setError(err.response?.data?.message || '챌린지 설정을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleSelectPreset = (days: number) => {
    setSelectedPreset(days);
    setEndDate(addDaysKst(startDate, days - 1));
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (typeof selectedPreset === 'number') {
      setEndDate(addDaysKst(newStart, selectedPreset - 1));
    } else if (newStart > endDate) {
      setEndDate(newStart);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    if (newEnd >= startDate) {
      setEndDate(newEnd);
      const diff = Math.round((new Date(newEnd).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const matched = PERIOD_PRESETS.find((p) => p.days === diff);
      setSelectedPreset(matched ? matched.days : 'custom');
    }
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('챌린지 제목을 입력해주세요.');
      return;
    }
    if (!verificationCriteria.trim()) {
      setError('인증 기준을 상세히 입력해주세요.');
      return;
    }
    if (startDate < today) {
      setError('시작일은 오늘 이후 날짜여야 합니다.');
      return;
    }
    if (endDate < startDate) {
      setError('종료일은 시작일 이후여야 합니다.');
      return;
    }
    if (periodType === 'WEEKLY_N' && (targetFrequency < 1 || targetFrequency > 7)) {
      setError('주 N회 챌린지의 목표 횟수는 1회 이상 7회 이하여야 합니다.');
      return;
    }
    if (penaltyAmount < 0) {
      setError('약정 금액은 0원 이상이어야 합니다.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!groupId || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

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
        myPenaltyAmount: penaltyAmount,
        participants: participantsList.map((p) => ({
          userId: p.userId,
          penaltyAmount: p.penaltyAmount,
        })),
      };

      if (activeRestartId) {
        createdChallenge = await challengesApi.restartChallenge(Number(groupId), Number(activeRestartId), payload);
      } else {
        createdChallenge = await challengesApi.createChallenge(Number(groupId), payload);
      }

      navigate(`/challenges/${createdChallenge.id}`);
    } catch (err: any) {
      console.error('Failed to create challenge:', err);
      setError(err.response?.data?.message || '챌린지 생성에 실패했습니다.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileLayout>
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(`/groups/${groupId}?tab=challenges`);
              }
            }}
            className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">
            {activeRestartId ? '챌린지 다시 시작' : '새 챌린지 만들기'}
          </h1>
        </div>

        {/* 이전 챌린지 불러오기 버튼 */}
        <button
          type="button"
          onClick={handleOpenHistoryModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-semibold transition active:scale-95"
        >
          <History className="w-3.5 h-3.5" />
          <span>기존 내용 불러오기</span>
        </button>
      </div>

      {isLoadingTemplate && (
        <div className="p-4 mb-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>이전 챌린지 설정을 불러오는 중입니다...</span>
        </div>
      )}

      {successNotice && (
        <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleOpenConfirm} className="space-y-4 flex-1">
        {/* 제목 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            챌린지 제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={50}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 주 3회 헬스장 가기"
            className="w-full text-base px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            챌린지 설명 (선택)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="모임원들에게 챌린지의 목표나 규칙을 소개해 주세요."
            className="w-full text-base px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white resize-none"
          />
        </div>

        {/* 인증 기준 */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>인증 기준 <span className="text-red-500">*</span></span>
            <span className="text-[10px] text-slate-400 font-normal">1일 최대 1회 인증</span>
          </label>
          <textarea
            rows={3}
            required
            value={verificationCriteria}
            onChange={(e) => setVerificationCriteria(e.target.value)}
            placeholder="예: 헬스장 락커 번호표와 운동 인증 사진 1장 (자정 전까지 제출)"
            className="w-full text-base px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-white resize-none"
          />
        </div>

        {/* 기간 설정 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>진행 기간 설정</span>
              {isTemplateLoaded && (
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                  불러온 기간
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              총 {durationDays}일간 진행
            </span>
          </div>

          {/* 추천 기간 선택 칩 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-500 font-medium">추천 기간</span>
              {selectedPreset === 'custom' && (
                <span className="text-[10px] text-slate-400">직접 설정 중</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PERIOD_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.days;
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => handleSelectPreset(preset.days)}
                    className={`py-2 px-2 text-[11px] rounded-lg border font-medium transition text-center whitespace-nowrap ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                className={`col-span-2 py-2 px-2 text-[11px] rounded-lg border font-medium transition text-center whitespace-nowrap ${
                  selectedPreset === 'custom'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                직접 날짜 설정
              </button>
            </div>
          </div>

          {/* 날짜 직접 선택 피커 */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="min-w-0">
              <span className="block text-[11px] text-slate-500 mb-1">시작일</span>
              <input
                type="date"
                required
                min={today}
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full min-w-0 max-w-full text-xs sm:text-sm px-2 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-slate-500 mb-1">종료일</span>
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full min-w-0 max-w-full text-xs sm:text-sm px-2 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {startDate}부터 {endDate}까지 {durationDays}일간 진행돼요. (최소 1일부터 자유롭게 설정 가능)
          </p>
        </div>

        {/* 수행 주기 설정 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Repeat className="w-4 h-4 text-blue-600" />
              <span>수행 주기 설정</span>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
              {periodType === 'DAILY' ? '매일 1회' : `주 ${targetFrequency}회`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPeriodType('DAILY')}
              className={`py-2 px-3 text-xs rounded-lg border font-medium transition flex items-center justify-center gap-1.5 ${
                periodType === 'DAILY'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>매일 (1일 1회)</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('WEEKLY_N')}
              className={`py-2 px-3 text-xs rounded-lg border font-medium transition flex items-center justify-center gap-1.5 ${
                periodType === 'WEEKLY_N'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>주 N회</span>
            </button>
          </div>

          {periodType === 'WEEKLY_N' && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">주당 목표 횟수</span>
                <select
                  value={targetFrequency}
                  onChange={(e) => setTargetFrequency(Number(e.target.value))}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white font-semibold text-slate-800"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <option key={num} value={num}>
                      주 {num}회
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400">
                참여자 시작일부터 7일마다 N회 인증합니다. (달력 월~일 기준이 아닌 참여일 기준 7일 주기)
              </p>

              {/* 구간 분할 미리보기 */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>구간 분할 미리보기 ({previewIntervals.length}개 구간)</span>
                  </span>
                  <span className="text-blue-600 font-semibold">
                    총 목표 {previewIntervals.reduce((sum, item) => sum + item.targetCount, 0)}회
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                  {previewIntervals.map((iv) => (
                    <div
                      key={iv.index}
                      className={`p-2 rounded-lg text-[11px] flex items-center justify-between border ${
                        iv.isShort
                          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{iv.index}구간</span>
                        <span className="text-slate-400">
                          {iv.startDate.slice(5)} ~ {iv.endDate.slice(5)} ({iv.days}일간)
                        </span>
                      </div>
                      <div className="font-semibold">
                        <span>목표 {iv.targetCount}회</span>
                        {iv.isShort && (
                          <span className="ml-1 text-[10px] text-amber-600 font-normal">
                            (남은 {iv.days}일 맞춤)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {previewIntervals.some((iv) => iv.isShort) && (() => {
                  const lastShort = previewIntervals.find((iv) => iv.isShort);
                  return (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200/70 leading-relaxed">
                      💡 마지막 주차는 남은 기간({lastShort?.days}일)이 1주일보다 짧아, 무리하지 않도록 목표가 최대 {lastShort?.targetCount}회로 자동 조정돼요!
                    </p>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* 본인 및 기본 약정 금액 설정 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>{periodType === 'WEEKLY_N' ? '미수행 1회당 약정 금액' : '1일 미수행 약정 금액'}</span>
            </div>
            <span className="text-xs font-bold text-amber-600">
              {penaltyAmount.toLocaleString()}원
            </span>
          </div>

          <div className="flex gap-2">
            {[3000, 5000, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setPenaltyAmount(amt)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition ${
                  penaltyAmount === amt
                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {amt.toLocaleString()}원
              </button>
            ))}
          </div>

          <div>
            <span className="block text-[11px] text-slate-500 mb-1">직접 입력 (원 단위)</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={penaltyAmount}
              onChange={(e) => setPenaltyAmount(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full text-base px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {isCustomPenaltyPerMember
              ? `생성자 본인 및 별도 지정하지 않은 참가자의 ${periodType === 'WEEKLY_N' ? '미수행 1회당' : '1일'} 기본 약정 금액입니다.`
              : `모든 참가자에게 동일하게 적용되는 ${periodType === 'WEEKLY_N' ? '미수행 1회당' : '1일 미수행'} 약정 금액입니다.`}
          </p>
        </div>

        {/* 함께할 모임원 선택 리스트 & 참가자별 약정금 설정 */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Users className="w-4 h-4 text-blue-600" />
              <span>함께할 모임원 선택</span>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
              나 포함 총 {participantsList.length}명 참여
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            생성자는 필수 참여되며, 모임원을 터치하여 함께 도전할 멤버를 선택하세요.
          </p>

          {isLoadingMembers ? (
            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>모임원 목록을 불러오는 중...</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
              {groupMembers.map((member) => {
                const isCreator = member.userId === currentUser?.id;
                const isSelected = isCreator || selectedMemberIds.has(member.userId);
                const currentPenalty = isCreator
                  ? penaltyAmount
                  : (isCustomPenaltyPerMember ? (memberPenalties[member.userId] ?? penaltyAmount) : penaltyAmount);

                return (
                  <div
                    key={member.userId}
                    onClick={() => !isCreator && handleToggleMember(member.userId)}
                    className={`p-3 rounded-xl border transition ${
                      isCreator ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      {/* 좌측: 체크박스 + 프로필 + 닉네임 */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isCreator}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => !isCreator && handleToggleMember(member.userId)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-60 cursor-pointer"
                        />
                        {member.profileImageUrl ? (
                          <img
                            src={member.profileImageUrl}
                            alt={member.nickname}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold shrink-0">
                            {member.nickname.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {member.nickname}
                          </span>
                          {isCreator && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                              생성자 (필수)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 우측: 약정금 뱃지 */}
                      {isSelected && (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md shrink-0">
                          {currentPenalty.toLocaleString()}원
                        </span>
                      )}
                    </div>

                    {/* 참가자별 개별 약정금 설정 필드 (토글 ON일 때만 서브 행으로 표시) */}
                    {isCustomPenaltyPerMember && isSelected && !isCreator && (
                      <div
                        className="mt-2.5 pt-2 border-t border-blue-100 flex items-center justify-between animate-in fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] text-slate-500 font-medium">
                          개별 약정 금액
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={currentPenalty}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              handleMemberPenaltyChange(member.userId, val);
                            }}
                            className="w-20 text-xs px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 bg-white font-bold text-right text-amber-700"
                          />
                          <span className="text-[11px] text-slate-600">원</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 참가자별 약정 금액 다르게 설정 토글 스위치 */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>참가자별로 금액 다르게 설정하기</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomPenaltyPerMember(!isCustomPenaltyPerMember)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isCustomPenaltyPerMember ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isCustomPenaltyPerMember ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 당일 시작 챌린지 즉시 확정 경고 */}
        {startDate === today && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold block">⚠️ 오늘 시작하는 챌린지 주의</span>
              오늘 시작하는 챌린지는 생성 즉시 조건이 확정되어 취소/수정이 불가합니다.
            </div>
          </div>
        )}

        {/* 제출 버튼 */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-xs transition active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            {activeRestartId ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>새로운 조건으로 다시 시작하기</span>
              </>
            ) : (
              <span>챌린지 생성 확인</span>
            )}
          </button>
        </div>
      </form>

      {/* 이전 챌린지 불러오기 모달 */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-modal bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800">이전 챌린지 불러오기</h2>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 -mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              이전에 진행했던 챌린지의 제목, 인증 기준, 기간 및 수행 주기를 그대로 불러옵니다.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>모임 챌린지 목록을 불러오는 중...</span>
                </div>
              ) : historyChallenges.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  불러올 수 있는 이전 챌린지가 없습니다.
                </div>
              ) : (
                historyChallenges.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectHistoryChallenge(c)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 line-clamp-1">
                        {c.title}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          c.status === 'ENDED'
                            ? 'bg-slate-100 text-slate-600'
                            : c.status === 'IN_PROGRESS'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {c.status === 'ENDED' ? '종료됨' : c.status === 'IN_PROGRESS' ? '진행 중' : '시작 전'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{c.startDate} ~ {c.endDate} · {c.periodType === 'WEEKLY_N' ? `주 ${c.targetFrequency}회` : '매일'}</span>
                      <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                        불러오기 <Check className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 최종 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-sheet bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-slate-800">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold">
                {activeRestartId ? '다시 시작 챌린지 생성 최종 확인' : '챌린지 생성 최종 확인'}
              </h2>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">챌린지명</span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">진행 기간</span>
                <span className="font-semibold text-slate-800">{startDate} ~ {endDate} ({durationDays}일)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">수행 주기</span>
                <span className="font-semibold text-slate-800">
                  {periodType === 'WEEKLY_N' ? `주 ${targetFrequency}회` : '매일 1회'}
                </span>
              </div>
              {periodType === 'WEEKLY_N' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">총 목표 횟수</span>
                  <span className="font-semibold text-blue-600">
                    총 {previewIntervals.reduce((sum, item) => sum + item.targetCount, 0)}회 ({previewIntervals.length}개 구간)
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">최종 참여 인원</span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  나 포함 총 {participantsList.length}명
                </span>
              </div>

              {/* 참가자별 약정금 명단 요약 */}
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 block font-medium">참가자별 약정 금액:</span>
                <div className="max-h-28 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200/80">
                  {participantsList.map((p) => (
                    <div key={p.userId} className="flex justify-between text-[11px]">
                      <span className="text-slate-700 truncate max-w-[140px]">
                        {p.nickname} {p.isCreator && '(생성자)'}
                      </span>
                      <span className="font-semibold text-amber-700">
                        {p.penaltyAmount.toLocaleString()}원 / {periodType === 'WEEKLY_N' ? '회' : '일'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-1 border-t border-slate-200">
                <span className="text-[11px] text-slate-500 block mb-0.5">인증 기준 안내:</span>
                <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{verificationCriteria}</p>
              </div>
            </div>

            {activeRestartId && (
              <div className="text-[11px] text-blue-700 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                ℹ️ 기존 챌린지의 과거 기록(인증 사진 등)은 새 챌린지로 복사되지 않으며 이번에 설정한 참가자 명단으로 새롭게 시작됩니다.
              </div>
            )}

            {startDate === today ? (
              <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed font-medium">
                ⚠️ 오늘 시작하는 챌린지는 생성 즉시 조건이 확정되어 취소/수정이 불가합니다.
              </div>
            ) : (
              <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                ⚠️ 챌린지가 시작(시작일 00:00 KST)되면 기간 및 수행 주기, 인증 기준 수정과 챌린지 삭제가 잠깁니다.
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                다시 수정
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 shadow-xs transition"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>{activeRestartId ? '다시 시작하기' : '확정하고 생성하기'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
};

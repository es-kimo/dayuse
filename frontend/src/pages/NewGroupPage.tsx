import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import { MobileLayout } from '../components/MobileLayout';
import { Button, FormField, Input } from '../components/ui';
import { useUiVersion } from '../context/UiVersionContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Check, Copy, Sparkles, Plus } from 'lucide-react';
import type { GroupDetail } from '../types';

export const NewGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const { uiVersion } = useUiVersion();
  const { showToast } = useToast();
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdGroup, setCreatedGroup] = useState<GroupDetail | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('모임 이름을 입력해 주세요.');
      nameInputRef.current?.focus();
      return;
    }
    if (trimmed.length > 50) {
      setError('모임 이름은 최대 50자까지 입력 가능합니다.');
      nameInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const created = await groupsApi.createGroup(trimmed);
      if (uiVersion === 'B') {
        // 신규 UI(B)에서는 10-newGroupDone.html 인라인 완료 화면 표시
        const detail = await groupsApi.getGroupDetail(created.id);
        setCreatedGroup(detail);
      } else {
        navigate(`/groups/${created.id}`);
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      setError('모임 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
      nameInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdGroup?.inviteCode) return;
    const inviteUrl = `${window.location.origin}/invite/${createdGroup.inviteCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      showToast('초대 링크가 복사되었습니다!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(`초대 코드: ${createdGroup.inviteCode}`, 'info');
    }
  };

  // ==========================================
  // 모임 개설 완료 화면 (10-newGroupDone.html)
  // ==========================================
  if (createdGroup) {
    const inviteUrl = `${window.location.origin}/invite/${createdGroup.inviteCode}`;

    return (
      <div className="max-w-app mx-auto min-h-dvh bg-slate-50 flex flex-col border-x border-slate-200 text-slate-800 font-sans relative">
        <header className="sticky top-0 z-header h-14 bg-slate-50/95 backdrop-blur-xs border-b border-transparent flex items-center px-4">
          <h1 className="text-base font-extrabold tracking-tight text-slate-900">새 모임 만들기</h1>
        </header>

        <main className="flex-1 p-4 pb-12 flex flex-col justify-between my-auto">
          <div className="py-8 text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900">모임을 만들었어요! 🎉</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              <span className="font-bold text-slate-700">'{createdGroup.name}'</span>에 함께할 친구를 불러 보세요
            </p>

            {/* 초대 링크 박스 */}
            <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 mt-4 shadow-2xs space-y-2.5 text-left">
              <span className="text-xs font-bold text-slate-600">초대 링크</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 outline-hidden select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '복사됨' : '복사'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                초대 코드 <b className="text-slate-700">{createdGroup.inviteCode}</b> · 언제든 다시 공유할 수 있어요
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-4">
            <button
              type="button"
              onClick={() => navigate(`/groups/${createdGroup.id}/challenges/new`)}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>첫 챌린지 만들기</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/groups/${createdGroup.id}`)}
              className="w-full py-3.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold transition active:scale-[0.98] cursor-pointer"
            >
              모임 홈으로 가기
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // 모임 생성 입력 화면 (09-newGroup.html & 레거시 A)
  // ==========================================
  return (
    <MobileLayout>
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => navigate('/groups')}
          aria-label="모임 목록으로 돌아가기"
          className="p-2 -ml-2 text-ink-secondary hover:text-ink rounded-md focus-ring min-w-[44px] min-h-[44px] inline-flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h1 className="text-title-md font-bold text-ink">새 모임 만들기</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col justify-between">
        <div className="bg-card border border-line rounded-2xl p-5 shadow-xs space-y-3">
          <FormField
            label="모임 이름"
            required
            error={error}
            id="group-name-input"
            description="생성자는 자동으로 모임장(HOST)이 됩니다."
          >
            <Input
              ref={nameInputRef}
              id="group-name-input"
              name="name"
              placeholder="예: 미라클모닝 챌린지, 주말 러닝 크루"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              maxLength={50}
              error={error}
              required
            />
          </FormField>
          <div className="flex justify-end text-caption text-ink-muted">
            <span aria-label={`현재 ${name.length}자, 최대 50자`}>{name.length}/50</span>
          </div>
        </div>

        <div className="pt-6">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            loadingText="모임 생성 중..."
            disabled={isSubmitting || !name.trim()}
          >
            모임 만들기
          </Button>
        </div>
      </form>
    </MobileLayout>
  );
};

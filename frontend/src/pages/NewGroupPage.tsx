import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import { GroupNameSuggestions } from '../components/GroupNameSuggestions';
import { Button, Card } from '../components/dayu/ui';
import { SubPageHeader } from '../components/layout/SubPageHeader';
import { BottomActionBar } from '../components/layout/BottomActionBar';

export const NewGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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
      navigate(`/groups/${created.id}/invite-created`);
    } catch (err) {
      console.error('Failed to create group:', err);
      setError('모임 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
      nameInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      {/* Header */}
      <SubPageHeader
        title="새 모임 만들기"
        onBack={() => navigate('/groups')}
      />

      {/* Main Body */}
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col px-4 pt-3 pb-28">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          <Card className="flex flex-col gap-2.5">
            <div>
              <label htmlFor="group-name-input" className="block text-[14px] font-bold text-slate-800 mb-2">
                모임 이름 <span className="text-red-700">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="group-name-input"
                name="name"
                type="text"
                placeholder="예: 미라클모닝 챌린지"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                maxLength={50}
                className="h-[50px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[15.5px] text-slate-800 placeholder:text-slate-800/55 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-100 focus:outline-none"
              />
              {error && <p className="mt-1.5 text-[13px] text-red-700">{error}</p>}
            </div>

            {/* 추천 이름 칩들 */}
            <GroupNameSuggestions
              onSelect={(sug) => {
                setName(sug);
                if (error) setError('');
              }}
            />

            <div className="flex items-center justify-between text-[12.5px] text-slate-500">
              <span>만든 사람이 자동으로 모임장이 돼요</span>
              <span className="text-[12px] tabular-nums text-slate-400">{name.length}/50</span>
            </div>
          </Card>
        </form>
      </main>

      {/* Bottom Sticky Action */}
      <BottomActionBar>
        <Button type="button" size="lg" className="w-full" onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? '모임 만드는 중...' : '모임 만들기'}
        </Button>
      </BottomActionBar>
    </div>
  );
};

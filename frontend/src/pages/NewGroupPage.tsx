import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import { GroupNameSuggestions } from '../components/GroupNameSuggestions';
import { Card } from '../components/dayu/ui';
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col">
      {/* Header */}
      <SubPageHeader
        title="새 모임 만들기"
        onBack={() => navigate('/groups')}
      />

      {/* Main Body */}
      <main className="w-full max-w-[390px] mx-auto px-4 pt-3 pb-28 flex-1 flex flex-col justify-between">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
          <Card className="flex flex-col gap-2.5">
            <div>
              <label htmlFor="group-name-input" className="block text-[14px] font-bold text-slate-800 mb-2">
                모임 이름 <span className="text-rose-500 font-normal">*</span>
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
                className="w-full h-[50px] px-3.5 bg-white border border-slate-300 rounded-xl text-[15.5px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-3 focus:ring-blue-100 transition"
              />
              {error && <p className="text-xs text-rose-500 mt-1.5 font-medium">{error}</p>}
            </div>

            {/* 추천 이름 칩들 */}
            <GroupNameSuggestions
              onSelect={(sug) => {
                setName(sug);
                if (error) setError('');
              }}
            />

            <div className="flex justify-between items-center pt-2 text-[12.5px] text-slate-500 border-t border-slate-100">
              <span>만든 사람이 자동으로 모임장이 돼요</span>
              <span className="text-xs text-slate-400 tabular-nums">{name.length}/50</span>
            </div>
          </Card>
        </form>
      </main>

      {/* Bottom Sticky Action */}
      <BottomActionBar>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim()}
          className="w-full h-[54px] rounded-[14px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-xs active:scale-[0.99]"
        >
          {isSubmitting ? '모임 만드는 중...' : '모임 만들기'}
        </button>
      </BottomActionBar>
    </div>
  );
};

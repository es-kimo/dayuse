import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import { MobileLayout } from '../components/MobileLayout';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const NewGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('모임 이름을 입력해 주세요.');
      return;
    }
    if (trimmed.length > 50) {
      setError('모임 이름은 최대 50자까지 입력 가능합니다.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const created = await groupsApi.createGroup(trimmed);
      navigate(`/groups/${created.id}`);
    } catch (err) {
      console.error('Failed to create group:', err);
      setError('모임 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileLayout>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/groups')}
          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">새 모임 만들기</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            모임 이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="예: 미라클모닝 챌린지, 주말 러닝 크루"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            maxLength={50}
            className="w-full px-3.5 py-2.5 text-base bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition"
          />
          <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400">
            <span>생성자는 자동으로 모임장(HOST)이 됩니다.</span>
            <span>{name.length}/50</span>
          </div>

          {error && <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>모임 생성 중...</span>
            </>
          ) : (
            <span>모임 만들기 완료</span>
          )}
        </button>
      </form>
    </MobileLayout>
  );
};

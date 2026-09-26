import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import { MobileLayout } from '../components/MobileLayout';
import { Button, FormField, Input } from '../components/ui';
import { ArrowLeft } from 'lucide-react';

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
      navigate(`/groups/${created.id}`);
    } catch (err) {
      console.error('Failed to create group:', err);
      // 네트워크 오류 시 사용자 입력값 유지
      setError('모임 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
      nameInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="bg-card border border-line rounded-lg p-5 shadow-xs space-y-3">
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
            모임 만들기 완료
          </Button>
        </div>
      </form>
    </MobileLayout>
  );
};

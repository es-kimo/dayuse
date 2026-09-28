import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DAYU_COLOR_LIST, DAYU_COLORS, parseDayuColor, DayuColorOption } from '../tokens/dayuColors';
import { DayuAvatar } from '../components/brand/DayuAvatar';
import { ArrowLeft, Dices, Check, Loader2 } from 'lucide-react';

export const AvatarCustomPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile } = useAuth();
  const { showSuccess, showError } = useToast();

  const initialColor = parseDayuColor(user?.profileImageUrl);
  const [selectedColor, setSelectedColor] = useState<DayuColorOption>(initialColor);
  const [isSaving, setIsSaving] = useState(false);

  const isCurrentColor = user?.profileImageUrl === `dayu:${selectedColor.id}` ||
    (!user?.profileImageUrl && selectedColor.id === 'blue');

  const handleRandomPick = () => {
    const otherColors = DAYU_COLOR_LIST.filter((c) => c.id !== selectedColor.id);
    const randomIndex = Math.floor(Math.random() * otherColors.length);
    setSelectedColor(otherColors[randomIndex]);
  };

  const handleSave = async () => {
    if (isCurrentColor || isSaving) return;

    setIsSaving(true);
    try {
      await updateUserProfile({ profileImageUrl: `dayu:${selectedColor.id}` });
      showSuccess(`프로필 데이유가 '${selectedColor.label}' 색상으로 변경되었습니다.`);
      navigate('/profile');
    } catch (err) {
      console.error('Failed to update avatar:', err);
      showError('데이유 색상 변경 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-app mx-auto min-h-dvh bg-slate-50 flex flex-col border-x border-slate-200 text-slate-800 font-sans relative">
      {/* 상단 네비게이션 바 */}
      <header className="sticky top-0 z-header h-14 bg-slate-50/95 backdrop-blur-xs border-b border-transparent flex items-center gap-2 px-3">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 focus-ring cursor-pointer"
          aria-label="뒤로"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-extrabold tracking-tight">프로필 데이유</h1>
      </header>

      <main className="flex-1 p-4 pb-28 flex flex-col gap-4">
        {/* 상단 대형 아바타 프리뷰 */}
        <div className="flex flex-col items-center gap-3 py-3">
          <DayuAvatar
            colorOption={selectedColor}
            size={136}
            alt={`${selectedColor.label} 데이유 프리뷰`}
            className="shadow-sm"
          />
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900">{user?.nickname || '사용자'}</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{selectedColor.label} 데이유</p>
          </div>
        </div>

        {/* 색 고르기 카드 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">색 고르기</h3>
            <button
              type="button"
              onClick={handleRandomPick}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-50 focus-ring cursor-pointer transition active:scale-95"
            >
              <Dices className="w-4 h-4 text-blue-600" />
              <span>랜덤으로 바꾸기</span>
            </button>
          </div>

          <div
            role="radiogroup"
            aria-label="데이유 색"
            className="grid grid-cols-5 gap-2.5 justify-items-center py-1"
          >
            {DAYU_COLOR_LIST.map((c) => {
              const isSelected = selectedColor.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={c.label}
                  onClick={() => setSelectedColor(c)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center p-0.5 transition cursor-pointer relative ${
                    isSelected ? 'ring-2 ring-offset-2 ring-blue-600 scale-105' : 'hover:scale-102 opacity-85 hover:opacity-100'
                  }`}
                >
                  <DayuAvatar colorOption={c} size={44} alt={c.label} ariaHidden />
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            가입할 때 랜덤으로 정해진 색이에요. 언제든 바꿀 수 있어요.
          </p>
        </div>

        {/* 모임 미리보기 카드 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-500">모임에서는 이렇게 보여요</h3>
          <div className="flex items-center gap-3 py-1">
            <DayuAvatar colorOption={selectedColor} size={40} ariaHidden />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">
                {user?.nickname || '사용자'}{' '}
                <span className="text-xs font-normal text-slate-400">· 나</span>
              </div>
              <div className="text-xs text-slate-500 truncate">매일 1알고리즘 문제 풀기</div>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">방금</span>
          </div>

          {/* 친구 아바타 스택 */}
          <div className="flex items-center -space-x-2 pt-1 border-t border-slate-100">
            <DayuAvatar colorOption={selectedColor} size={32} className="border-2 border-white" ariaHidden />
            <DayuAvatar colorOption={DAYU_COLORS.mint} size={32} className="border-2 border-white" ariaHidden />
            <DayuAvatar colorOption={DAYU_COLORS.orange} size={32} className="border-2 border-white" ariaHidden />
            <DayuAvatar colorOption={DAYU_COLORS.purple} size={32} className="border-2 border-white" ariaHidden />
          </div>
        </div>
      </main>

      {/* 하단 CTA 버튼 */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-app mx-auto p-4 bg-slate-50/95 backdrop-blur-xs border-t border-slate-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={isCurrentColor || isSaving}
          className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition focus-ring ${
            isCurrentColor
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] cursor-pointer'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>저장하는 중...</span>
            </>
          ) : isCurrentColor ? (
            <span>지금 쓰는 색이에요</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>이 색으로 바꾸기</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
};

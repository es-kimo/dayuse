import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DAYU_COLORS, type DayuColor } from '../components/dayu/dayuColors';
import { DayuAvatar } from '../components/dayu/DayuAvatar';
import { DayuColorPicker } from '../components/DayuColorPicker';
import { SubPageHeader } from '../components/layout/SubPageHeader';
import { BottomActionBar } from '../components/layout/BottomActionBar';

function parseUserDayuColor(profileImageUrl?: string | null): DayuColor {
  if (profileImageUrl && profileImageUrl.startsWith('dayu:')) {
    const raw = profileImageUrl.replace('dayu:', '');
    if (raw in DAYU_COLORS) return raw as DayuColor;
  }
  return 'blue';
}

export const AvatarPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile } = useAuth();
  const { showToast, showErrorToast } = useToast();

  const initialColor = parseUserDayuColor(user?.profileImageUrl);
  const [selectedColor, setSelectedColor] = useState<DayuColor>(initialColor);
  const [isSaving, setIsSaving] = useState(false);

  const isCurrentColor = selectedColor === initialColor;

  const handleSave = async () => {
    if (isCurrentColor || isSaving) return;

    setIsSaving(true);
    try {
      await updateUserProfile({ profileImageUrl: `dayu:${selectedColor}` });
      showToast(`프로필 데이유가 '${DAYU_COLORS[selectedColor].name}' 색상으로 변경되었습니다.`, 'success');
      navigate(-1);
    } catch (err) {
      console.error('Failed to update avatar:', err);
      showErrorToast('데이유 색상 변경 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const colorMeta = DAYU_COLORS[selectedColor];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col">
      {/* Top Header */}
      <SubPageHeader
        title="프로필 데이유"
        onBack={() => navigate(-1)}
      />

      {/* Main Body */}
      <main className="w-full max-w-[390px] mx-auto px-4 pt-2 pb-28 flex flex-col gap-4">
        {/* Large Avatar Preview & Title */}
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <DayuAvatar color={selectedColor} face="cheer" size={136} />
          <div>
            <div className="text-[18px] font-bold text-slate-900 tracking-tight">
              {user?.nickname || '사용자'}
            </div>
            <div className="text-[13px] text-slate-500 mt-0.5">
              {colorMeta.name} 데이유
            </div>
          </div>
        </div>

        {/* Color Picker Swatch */}
        <DayuColorPicker
          selectedColor={selectedColor}
          onColorSelect={(color) => setSelectedColor(color)}
        />

        {/* Preview in Group Card */}
        <div className="bg-white border border-slate-200 rounded-[18px] p-4 flex flex-col gap-2.5">
          <div className="text-[13px] font-bold text-slate-500">
            모임에서는 이렇게 보여요
          </div>

          <div className="flex items-center gap-3 pt-1">
            <DayuAvatar color={selectedColor} face="default" size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-bold text-slate-800 truncate">
                {user?.nickname || '사용자'}{' '}
                <span className="text-[12px] font-semibold text-slate-400">· 나</span>
              </div>
              <div className="text-[13px] text-slate-500 truncate">
                매일 1알고리즘 문제 풀기
              </div>
            </div>
            <span className="text-[12px] text-slate-400 shrink-0">방금</span>
          </div>

          <div className="flex -space-x-2 mt-1">
            <DayuAvatar color={selectedColor} face="default" size={36} className="border-2 border-white relative z-10" />
            <DayuAvatar color="mint" face="default" size={36} className="border-2 border-white relative z-9" />
            <DayuAvatar color="orange" face="default" size={36} className="border-2 border-white relative z-8" />
            <DayuAvatar color="purple" face="default" size={36} className="border-2 border-white relative z-7" />
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action */}
      <BottomActionBar>
        <button
          type="button"
          onClick={handleSave}
          disabled={isCurrentColor || isSaving}
          className="w-full h-[54px] rounded-[14px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-xs active:scale-[0.99]"
        >
          {isSaving ? '저장 중...' : isCurrentColor ? '지금 쓰는 색이에요' : '이 색으로 바꾸기'}
        </button>
      </BottomActionBar>
    </div>
  );
};

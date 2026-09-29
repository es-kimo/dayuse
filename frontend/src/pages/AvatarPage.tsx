import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DAYU_COLORS, parseUserDayuColor, type DayuColor } from '../components/dayu/dayuColors';
import { DayuAvatar } from '../components/dayu/DayuAvatar';
import { DayuColorPicker } from '../components/DayuColorPicker';
import { Button } from '../components/dayu/ui';
import { SubPageHeader } from '../components/layout/SubPageHeader';
import { BottomActionBar } from '../components/layout/BottomActionBar';

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
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-800">
      {/* Top Header */}
      <SubPageHeader
        title="프로필 데이유"
        onBack={() => navigate(-1)}
      />

      {/* Main Body */}
      <main className="mx-auto flex w-full max-w-app flex-col gap-4 px-4 pt-2 pb-action-bar">
        {/* Large Avatar Preview & Title */}
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <DayuAvatar color={selectedColor} face="cheer" size={136} />
          <div>
            <div className="text-[18px] font-bold tracking-[-0.01em] text-slate-800">{user?.nickname || '사용자'}</div>
            <div className="text-[13px] text-slate-500">{colorMeta.name} 데이유</div>
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
              <div className="truncate text-[14.5px] font-bold tracking-[-0.01em] text-slate-800">
                {user?.nickname || '사용자'} <span className="text-[13px] font-semibold text-slate-500">· 나</span>
              </div>
              <div className="truncate text-[13px] text-slate-500">매일 1알고리즘 문제 풀기</div>
            </div>
            <span className="shrink-0 text-[13px] text-slate-500">방금</span>
          </div>

          <div className="mt-1 flex -space-x-2">
            <DayuAvatar color={selectedColor} face="default" size={30} className="relative z-10 border-2 border-white" />
            <DayuAvatar color="mint" face="default" size={30} className="relative z-9 border-2 border-white" />
            <DayuAvatar color="orange" face="default" size={30} className="relative z-8 border-2 border-white" />
            <DayuAvatar color="purple" face="default" size={30} className="relative z-7 border-2 border-white" />
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action */}
      <BottomActionBar>
        <Button type="button" size="lg" className="w-full" onClick={handleSave} disabled={isCurrentColor || isSaving}>
          {isSaving ? '저장 중...' : isCurrentColor ? '지금 쓰는 색이에요' : '이 색으로 바꾸기'}
        </Button>
      </BottomActionBar>
    </div>
  );
};

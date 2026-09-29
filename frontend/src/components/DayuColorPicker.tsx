import React from 'react';
import { DAYU_COLORS, DAYU_COLOR_IDS, randomDayuColor, type DayuColor } from './dayu/dayuColors';
import { DayuAvatar } from './dayu/DayuAvatar';
import { Shuffle } from 'lucide-react';

interface DayuColorPickerProps {
  selectedColor: DayuColor;
  onColorSelect: (color: DayuColor) => void;
}

export const DayuColorPicker: React.FC<DayuColorPickerProps> = ({
  selectedColor,
  onColorSelect,
}) => {
  const handleRandomize = () => {
    const nextColor = randomDayuColor(selectedColor);
    onColorSelect(nextColor);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[18px] p-4 flex flex-col gap-3.5">
      {/* Header & Randomize button */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold text-slate-900 tracking-[-0.01em]">
          색 고르기
        </h3>
        <button
          type="button"
          onClick={handleRandomize}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] bg-slate-100 px-3 text-[13.5px] font-bold text-slate-800 transition-colors hover:bg-slate-200"
        >
          <Shuffle className="size-4 text-slate-600" />
          랜덤으로 바꾸기
        </button>
      </div>

      {/* 10-color Swatches (5x2 grid) */}
      <div
        className="grid grid-cols-5 gap-2.5 justify-items-center"
        role="radiogroup"
        aria-label="데이유 색"
      >
        {DAYU_COLOR_IDS.map((colorKey) => {
          const isSelected = selectedColor === colorKey;
          const colorMeta = DAYU_COLORS[colorKey];

          return (
            <button
              key={colorKey}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={colorMeta.name}
              onClick={() => onColorSelect(colorKey)}
              className={`p-0.5 rounded-full transition-all cursor-pointer relative ${
                isSelected
                  ? 'ring-2.5 ring-offset-2'
                  : 'hover:scale-105 active:scale-95'
              }`}
              style={{
                borderColor: isSelected ? colorMeta.fg : 'transparent',
                boxShadow: isSelected ? `0 0 0 2.5px ${colorMeta.fg}` : 'none',
              }}
            >
              <DayuAvatar color={colorKey} face="default" size={48} />
            </button>
          );
        })}
      </div>

      {/* Guide text */}
      <p className="text-[12.5px] text-slate-500 font-normal">
        가입할 때 랜덤으로 정해진 색이에요. 언제든 바꿀 수 있어요.
      </p>
    </div>
  );
};

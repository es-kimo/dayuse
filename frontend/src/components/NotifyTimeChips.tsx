import React, { useState } from 'react';

interface NotifyTimeChipsProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
}

const PRESET_TIMES = ['20:00', '21:00', '22:00', '23:00'];

export const NotifyTimeChips: React.FC<NotifyTimeChipsProps> = ({
  selectedTime,
  onTimeChange,
  disabled = false,
}) => {
  const isCustomTime = !PRESET_TIMES.includes(selectedTime);
  const [showCustomInput, setShowCustomInput] = useState(isCustomTime);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_TIMES.map((time) => {
          const isSelected = selectedTime === time;
          return (
            <button
              key={time}
              type="button"
              disabled={disabled}
              onClick={() => {
                setShowCustomInput(false);
                onTimeChange(time);
              }}
              className={`h-[34px] px-3 rounded-[10px] text-[13.5px] font-semibold transition active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
                isSelected
                  ? 'border border-blue-600 bg-blue-50 text-blue-600 font-bold'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {time}
            </button>
          );
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowCustomInput(!showCustomInput)}
          className={`h-[34px] px-3 rounded-[10px] text-[13.5px] font-semibold transition active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
            isCustomTime || showCustomInput
              ? 'border border-blue-600 bg-blue-50 text-blue-600 font-bold'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          직접
        </button>
      </div>

      {showCustomInput && (
        <div className="pt-1">
          <input
            type="time"
            disabled={disabled}
            value={selectedTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="h-10 px-3 border border-slate-300 rounded-xl text-sm bg-white text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
      )}
    </div>
  );
};

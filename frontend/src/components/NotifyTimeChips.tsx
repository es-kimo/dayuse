import React, { useState } from 'react';
import { Pill } from './dayu/ui';

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
            <Pill
              key={time}
              active={isSelected}
              disabled={disabled}
              onClick={() => {
                setShowCustomInput(false);
                onTimeChange(time);
              }}
            >
              {time}
            </Pill>
          );
        })}
        <Pill active={isCustomTime || showCustomInput} disabled={disabled} onClick={() => setShowCustomInput(!showCustomInput)}>
          직접
        </Pill>
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

import React from 'react';

interface GroupNameSuggestionsProps {
  onSelect: (name: string) => void;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  '미라클모닝 챌린지',
  '주말 러닝 크루',
  '퇴근 후 알고리즘',
];

export const GroupNameSuggestions: React.FC<GroupNameSuggestionsProps> = ({
  onSelect,
  suggestions = DEFAULT_SUGGESTIONS,
}) => {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {suggestions.map((sug) => (
        <button
          key={sug}
          type="button"
          onClick={() => onSelect(sug)}
          className="h-[34px] px-3 rounded-[10px] border border-dashed border-slate-300 bg-white hover:bg-slate-50 text-[13.5px] font-semibold text-slate-600 transition active:scale-95 cursor-pointer whitespace-nowrap"
        >
          {sug}
        </button>
      ))}
    </div>
  );
};

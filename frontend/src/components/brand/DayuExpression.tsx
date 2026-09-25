import React from 'react';

export type ExpressionType = 'default' | 'done' | 'cheer' | 'rest';
export type ExpressionColor = 'blue' | 'ink' | 'white';

interface DayuExpressionProps {
  expression?: ExpressionType;
  color?: ExpressionColor;
  className?: string;
  alt?: string;
}

export const DayuExpression: React.FC<DayuExpressionProps> = ({
  expression = 'default',
  color = 'blue',
  className = 'w-16 h-16',
  alt = '데이유',
}) => {
  const src = `/brand/expressions/dayu-${expression}-${color}.svg`;
  return <img src={src} alt={alt} className={className} />;
};

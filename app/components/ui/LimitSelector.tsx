import React from 'react';

interface LimitSelectorProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const LIMIT_OPTIONS = [
  { value: 10, label: '10 results' },
  { value: 20, label: '20 results' },
  { value: 30, label: '30 results' },
  { value: 50, label: '50 results' },
  { value: 100, label: '100 results' },
];

export const LimitSelector: React.FC<LimitSelectorProps> = ({ 
  value, 
  onChange, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="limit-selector" className="text-sm text-gray-300 whitespace-nowrap">
        Show:
      </label>
      <select
        id="limit-selector"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 px-2 rounded border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
      >
        {LIMIT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-gray-800 text-white">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

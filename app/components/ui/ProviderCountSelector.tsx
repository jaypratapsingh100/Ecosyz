import React from 'react';

interface ProviderCountSelectorProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const PROVIDER_COUNT_OPTIONS = [
  { value: 10, label: '10 per provider' },
  { value: 20, label: '20 per provider' },
  { value: 30, label: '30 per provider' },
  { value: 50, label: '50 per provider' },
  { value: 100, label: '100 per provider' },
];

export const ProviderCountSelector: React.FC<ProviderCountSelectorProps> = ({ 
  value, 
  onChange, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="provider-count-selector" className="text-sm text-gray-300 whitespace-nowrap">
        Provider count:
      </label>
      <select
        id="provider-count-selector"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 px-2 rounded border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
      >
        {PROVIDER_COUNT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-gray-800 text-white">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

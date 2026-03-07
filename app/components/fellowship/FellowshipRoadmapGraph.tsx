'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ContributionArea = {
  id: string;
  title: string;
  icon: string;
  skills: string[];
  stipendPerMilestone: string;
  description: string;
};

// Edges define dependencies: Platform Dev and AI feed into DevRel; DevRel and Marketing are parallel
const EDGES: { from: string; to: string }[] = [
  { from: 'platform-development', to: 'developer-relations' },
  { from: 'ai-ml', to: 'developer-relations' },
  { from: 'platform-development', to: 'marketing-growth' },
  { from: 'ai-ml', to: 'marketing-growth' },
];

interface FellowshipRoadmapGraphProps {
  areas: ContributionArea[];
}

export default function FellowshipRoadmapGraph({ areas }: FellowshipRoadmapGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = areas.find((a) => a.id === selectedId);

  // Layout: 2 top nodes (platform, ai), 2 bottom nodes (devrel, marketing)
  const topNodes = areas.filter((a) => ['platform-development', 'ai-ml'].includes(a.id));
  const bottomNodes = areas.filter((a) => ['developer-relations', 'marketing-growth'].includes(a.id));

  return (
    <div className="relative rounded-xl border border-[#38bdf8]/20 bg-zinc-900/60 p-8 overflow-hidden">
      {/* SVG edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#0ff0fc" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        {EDGES.map((e, i) => {
          // Approximate positions: top ~25%, bottom ~75%
          const fromTop = ['platform-development', 'ai-ml'].includes(e.from);
          const toTop = ['platform-development', 'ai-ml'].includes(e.to);
          const fromX = e.from === 'platform-development' ? 25 : 75;
          const toX = e.to === 'developer-relations' ? 35 : 65;
          const fromY = fromTop ? 25 : 75;
          const toY = toTop ? 25 : 75;
          return (
            <line
              key={`${e.from}-${e.to}-${i}`}
              x1={`${fromX}%`}
              y1={`${fromY}%`}
              x2={`${toX}%`}
              y2={`${toY}%`}
              stroke="url(#edgeGrad)"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
          );
        })}
      </svg>

      {/* Top row */}
      <div className="relative flex justify-center gap-12 mb-16">
        {topNodes.map((area) => (
          <NodeButton
            key={area.id}
            area={area}
            isSelected={selectedId === area.id}
            onClick={() => setSelectedId(selectedId === area.id ? null : area.id)}
          />
        ))}
      </div>

      {/* Bottom row */}
      <div className="relative flex justify-center gap-12">
        {bottomNodes.map((area) => (
          <NodeButton
            key={area.id}
            area={area}
            isSelected={selectedId === area.id}
            onClick={() => setSelectedId(selectedId === area.id ? null : area.id)}
          />
        ))}
      </div>

      {/* Selected detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg rounded-lg border border-[#38bdf8]/30 bg-zinc-900/95 p-4 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{selected.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[#38bdf8]">{selected.title}</h4>
                <p className="text-sm text-teal-100/80 mt-1">{selected.description}</p>
                <p className="text-xs text-[#0ff0fc] mt-2">Stipend: {selected.stipendPerMilestone} per milestone</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selected.skills.slice(0, 4).map((s) => (
                    <span key={s} className="px-2 py-0.5 text-xs bg-zinc-800/80 text-teal-100 rounded border border-[#38bdf8]/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-teal-100/60 hover:text-teal-100 text-sm"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NodeButton({
  area,
  isSelected,
  onClick,
}: {
  area: ContributionArea;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-[#38bdf8] bg-[#38bdf8]/20 shadow-lg shadow-[#38bdf8]/20'
          : 'border-[#38bdf8]/30 bg-zinc-800/60 hover:border-[#38bdf8]/50 hover:bg-[#38bdf8]/10'
      }`}
    >
      <span className="text-3xl">{area.icon}</span>
      <span className="font-semibold text-[#38bdf8] text-sm text-center max-w-[140px]">{area.title}</span>
    </motion.button>
  );
}

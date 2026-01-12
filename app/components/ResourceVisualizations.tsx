'use client';

import { useMemo } from 'react';

interface ResourceVisualizationsProps {
  resources: any[];
}

export default function ResourceVisualizations({ resources }: ResourceVisualizationsProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const yearCounts: Record<number, number> = {};
    const licenseCounts: Record<string, number> = {};
    
    resources.forEach(r => {
      // Type counts
      const type = r.type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      
      // Source counts
      const source = r.source || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      
      // Year counts
      if (r.year) {
        yearCounts[r.year] = (yearCounts[r.year] || 0) + 1;
      }
      
      // License counts
      if (r.license) {
        licenseCounts[r.license] = (licenseCounts[r.license] || 0) + 1;
      }
    });
    
    return { typeCounts, sourceCounts, yearCounts, licenseCounts };
  }, [resources]);
  
  // Get top items
  const topTypes = Object.entries(stats.typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  const topSources = Object.entries(stats.sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  const topLicenses = Object.entries(stats.licenseCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  const maxTypeCount = Math.max(...topTypes.map(([, count]) => count), 1);
  const maxSourceCount = Math.max(...topSources.map(([, count]) => count), 1);
  
  return (
    <div className="space-y-6">
      {/* Resource Types Chart */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Resource Types Distribution
        </h3>
        <div className="space-y-2">
          {topTypes.map(([type, count]) => {
            const percentage = (count / maxTypeCount) * 100;
            const typeLabels: Record<string, string> = {
              'paper': 'Research Papers',
              'code': 'Code Repositories',
              'dataset': 'Datasets',
              'model': 'AI Models',
              'video': 'Videos',
              'hardware': 'Hardware'
            };
            return (
              <div key={type} className="flex items-center gap-3">
                <div className="w-24 text-xs text-gray-400 capitalize">
                  {typeLabels[type] || type}
                </div>
                <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-12 text-right text-xs text-gray-300 font-medium">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Sources Chart */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Sources Distribution
        </h3>
        <div className="space-y-2">
          {topSources.map(([source, count]) => {
            const percentage = (count / maxSourceCount) * 100;
            return (
              <div key={source} className="flex items-center gap-3">
                <div className="w-32 text-xs text-gray-400 truncate">
                  {source}
                </div>
                <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-12 text-right text-xs text-gray-300 font-medium">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Licenses */}
      {topLicenses.length > 0 && (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Licenses
          </h3>
          <div className="flex flex-wrap gap-2">
            {topLicenses.map(([license, count]) => (
              <div
                key={license}
                className="px-3 py-1.5 bg-purple-900/30 border border-purple-700/50 rounded-lg text-xs text-purple-200"
              >
                {license} ({count})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


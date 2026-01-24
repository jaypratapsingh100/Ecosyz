'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Framework {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  features: string[];
  preview: {
    title: string;
    subtitle: string;
    components: string[];
  };
}

const FRAMEWORKS: Framework[] = [
  {
    id: 'react',
    name: 'React',
    description: 'A JavaScript library for building user interfaces',
    icon: '⚛️',
    color: '#61DAFB',
    gradient: 'from-cyan-400 to-blue-500',
    features: ['Component-Based', 'Virtual DOM', 'Rich Ecosystem', 'Fast & Flexible'],
    preview: {
      title: 'Modern React App',
      subtitle: 'Built with React 18 & Hooks',
      components: ['Header', 'Hero Section', 'Features Grid', 'Footer']
    }
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'The React framework for production',
    icon: '▲',
    color: '#000000',
    gradient: 'from-gray-800 to-black',
    features: ['Server-Side Rendering', 'Static Generation', 'API Routes', 'File-based Routing'],
    preview: {
      title: 'Next.js Application',
      subtitle: 'Full-stack React Framework',
      components: ['App Router', 'Server Components', 'API Routes', 'Optimized Images']
    }
  },
  {
    id: 'vue',
    name: 'Vue.js',
    description: 'The progressive JavaScript framework',
    icon: '💚',
    color: '#42B883',
    gradient: 'from-green-400 to-emerald-600',
    features: ['Progressive', 'Approachable', 'Versatile', 'Performant'],
    preview: {
      title: 'Vue 3 Application',
      subtitle: 'Composition API & Reactive',
      components: ['Navbar', 'Content Area', 'Sidebar', 'Footer']
    }
  },
  {
    id: 'html',
    name: 'HTML/CSS/JS',
    description: 'Classic web development with vanilla JavaScript',
    icon: '🌐',
    color: '#E34F26',
    gradient: 'from-orange-400 to-red-500',
    features: ['No Build Step', 'Lightweight', 'Universal', 'Easy to Learn'],
    preview: {
      title: 'Static Website',
      subtitle: 'Pure HTML, CSS & JavaScript',
      components: ['Landing Page', 'About Section', 'Contact Form', 'Gallery']
    }
  }
];

interface FrameworkSelectorProps {
  onSelect: (frameworkId: string) => void;
  onCancel: () => void;
}

export default function FrameworkSelector({ onSelect, onCancel }: FrameworkSelectorProps) {
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [hoveredFramework, setHoveredFramework] = useState<string | null>(null);

  const handleFrameworkClick = (framework: Framework) => {
    setSelectedFramework(framework);
  };

  const handleConfirm = () => {
    if (selectedFramework) {
      onSelect(selectedFramework.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a] flex items-center justify-center p-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white">Choose Your Framework</h1>
          </div>
          <p className="text-gray-400 text-lg">Select a framework to scaffold your project</p>
        </div>

        {/* Framework Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {FRAMEWORKS.map((framework) => {
            const isSelected = selectedFramework?.id === framework.id;
            const isHovered = hoveredFramework === framework.id;

            return (
              <button
                key={framework.id}
                onClick={() => handleFrameworkClick(framework)}
                onMouseEnter={() => setHoveredFramework(framework.id)}
                onMouseLeave={() => setHoveredFramework(null)}
                className={`relative group p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 scale-105 shadow-2xl shadow-emerald-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 hover:scale-105'
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <div className={`text-5xl mb-4 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
                  {framework.icon}
                </div>

                {/* Name */}
                <h3 className="text-xl font-bold text-white mb-2">{framework.name}</h3>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{framework.description}</p>

                {/* Features */}
                <div className="space-y-1">
                  {framework.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${framework.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              </button>
            );
          })}
        </div>

        {/* Preview Section */}
        {selectedFramework && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start gap-6">
              {/* Preview Icon */}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedFramework.gradient} flex items-center justify-center text-4xl flex-shrink-0 shadow-lg`}>
                {selectedFramework.icon}
              </div>

              {/* Preview Content */}
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">{selectedFramework.preview.title}</h3>
                <p className="text-gray-400 mb-4">{selectedFramework.preview.subtitle}</p>

                {/* Components Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedFramework.preview.components.map((component, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 text-center hover:bg-white/10 transition-colors"
                    >
                      {component}
                    </div>
                  ))}
                </div>

                {/* All Features */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {selectedFramework.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedFramework}
            className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-gray-900 font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-400 disabled:hover:to-cyan-500 flex items-center gap-2"
          >
            <span>Continue with {selectedFramework?.name || 'Framework'}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            💡 Don't worry, you can always change the framework later in your project settings
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface AdSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gradient: string;
  features: string[];
  cta: string;
}

const AD_SLIDES: AdSlide[] = [
  {
    id: 'ai-powered',
    title: 'AI-Powered Code Generation',
    subtitle: 'Build Faster, Build Smarter',
    description: 'Our advanced AI understands your requirements and generates production-ready code in seconds.',
    icon: '🤖',
    gradient: 'from-emerald-400 to-cyan-500',
    features: ['Instant Code Generation', 'Best Practices Included', 'Multiple Framework Support', 'Real-time Preview'],
    cta: 'Start Building Now'
  },
  {
    id: 'no-limits',
    title: 'No Limits, No Boundaries',
    subtitle: 'Create Anything You Imagine',
    description: 'From simple landing pages to complex web applications - bring your ideas to life without constraints.',
    icon: '🚀',
    gradient: 'from-purple-500 to-pink-500',
    features: ['Unlimited Projects', 'Full Customization', 'Export Anytime', 'Cloud & Local'],
    cta: 'Explore Possibilities'
  },
  {
    id: 'collaborate',
    title: 'Collaborate Seamlessly',
    subtitle: 'Team Up, Build Together',
    description: 'Share projects, work in real-time, and deploy with a single click. Built for teams of all sizes.',
    icon: '👥',
    gradient: 'from-blue-500 to-indigo-600',
    features: ['Real-time Collaboration', 'Version Control', 'Team Workspaces', 'Easy Sharing'],
    cta: 'Invite Your Team'
  },
  {
    id: 'deploy',
    title: 'Deploy Instantly',
    subtitle: 'From Code to Production',
    description: 'One-click deployment to Vercel, Netlify, or your own infrastructure. No configuration needed.',
    icon: '⚡',
    gradient: 'from-orange-500 to-red-500',
    features: ['One-Click Deploy', 'Multiple Platforms', 'Custom Domains', 'SSL Included'],
    cta: 'Deploy Your App'
  },
  {
    id: 'templates',
    title: 'Rich Template Library',
    subtitle: 'Start with Proven Designs',
    description: 'Choose from hundreds of pre-built templates and customize them to match your brand perfectly.',
    icon: '🎨',
    gradient: 'from-teal-500 to-green-500',
    features: ['100+ Templates', 'Fully Customizable', 'Mobile Responsive', 'Modern Designs'],
    cta: 'Browse Templates'
  }
];

export default function AdvertisementPlaceholder() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance slides
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % AD_SLIDES.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const slide = AD_SLIDES[currentSlide];

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a] flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br ${slide.gradient} opacity-10 rounded-full blur-3xl animate-pulse`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br ${slide.gradient} opacity-10 rounded-full blur-3xl animate-pulse`} style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="max-w-4xl w-full">
          {/* Slide Content */}
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br ${slide.gradient} mb-8 shadow-2xl transform hover:scale-105 transition-transform duration-300`}>
              <span className="text-7xl">{slide.icon}</span>
            </div>

            {/* Title */}
            <h2 className="text-5xl font-bold text-white mb-4">{slide.title}</h2>

            {/* Subtitle */}
            <p className="text-2xl text-gray-300 mb-6">{slide.subtitle}</p>

            {/* Description */}
            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              {slide.description}
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {slide.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-2 justify-center">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${slide.gradient}`}></div>
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="inline-block">
              <div className={`px-8 py-4 bg-gradient-to-r ${slide.gradient} text-white font-semibold rounded-xl shadow-lg shadow-black/20 transform hover:scale-105 transition-transform cursor-pointer`}>
                {slide.cta}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
          {AD_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 h-2 bg-white rounded-full'
                  : 'w-2 h-2 bg-white/30 rounded-full hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Slide Counter */}
      <div className="absolute top-8 right-8 z-20">
        <div className="px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full border border-white/10">
          <span className="text-sm text-gray-400">
            {currentSlide + 1} / {AD_SLIDES.length}
          </span>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => goToSlide((currentSlide - 1 + AD_SLIDES.length) % AD_SLIDES.length)}
        className="absolute left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all group"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={() => goToSlide((currentSlide + 1) % AD_SLIDES.length)}
        className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all group"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

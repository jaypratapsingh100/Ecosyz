/**
 * IdeaInputStep Component - First Step of GOBuild Wizard
 * 
 * This component allows users to describe their app idea and automatically extracts:
 * - Features (e.g., "Header/Navigation", "Contact Form", "Blog Section")
 * - Target Audience (e.g., "Business owners", "Students", "Professionals")
 * - Design Style (modern, minimalist, bold, professional, playful)
 * 
 * Features:
 * - Auto-extraction from description using AI (Azure DeepSeek) or rule-based fallback
 * - Loads description from URL params (?description=...) or localStorage
 * - Debounced auto-extraction (2 seconds after user stops typing)
 * - Manual "Auto-fill" button for immediate extraction
 * - Navigation to App Builder with description
 * 
 * Integration:
 * - Called from home page when user selects "Build App" and types description
 * - Description passed via URL: /studio?description=...
 * - Stores description in localStorage for cross-page navigation
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { AppIdea } from '../../../types/app-builder';

interface IdeaInputStepProps {
  onSubmit: (idea: AppIdea) => void;
}

interface ExtractedInfo {
  features: string[];
  targetAudience: string;
  designStyle: string;
}

/**
 * Extract features and info from description using AI
 * 
 * First tries AI-powered extraction via /api/app-projects/extract-info
 * Falls back to rule-based extraction if AI fails
 * 
 * @param description - User's app description text
 * @returns Extracted features, target audience, and design style
 */
async function extractInfoFromDescription(description: string): Promise<ExtractedInfo> {
  try {
    // Create a temporary project to use the chat API for extraction
    // Or use a dedicated extraction endpoint
    const response = await fetch('/api/app-projects/extract-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        features: data.features || [],
        targetAudience: data.targetAudience || '',
        designStyle: data.designStyle || 'modern',
      };
    }
  } catch (error) {
    console.error('Error extracting info:', error);
  }

  // Fallback: Simple rule-based extraction if AI API fails
  return extractInfoSimple(description);
}

/**
 * Simple rule-based extraction as fallback
 * 
 * Uses keyword matching to extract:
 * - Features: Matches common keywords (header, footer, contact, blog, etc.)
 * - Target Audience: Matches audience keywords (business, student, developer, etc.)
 * - Design Style: Matches style keywords (minimal, bold, professional, etc.)
 * 
 * Also tries to parse "with X, Y, and Z" patterns
 * 
 * @param description - User's app description text
 * @returns Extracted features, target audience, and design style
 */
function extractInfoSimple(description: string): ExtractedInfo {
  const lowerDesc = description.toLowerCase();
  const features: string[] = [];
  let targetAudience = '';
  let designStyle = 'modern';

  // Extract features - look for common keywords and patterns
  const featureKeywords: { [key: string]: string } = {
    'header': 'Header/Navigation',
    'footer': 'Footer',
    'contact': 'Contact Form',
    'blog': 'Blog Section',
    'blogs': 'Blog Section',
    'project': 'Projects Portfolio',
    'projects': 'Projects Portfolio',
    'portfolio': 'Portfolio Display',
    'about': 'About Section',
    'home': 'Home Page',
    'landing': 'Landing Page',
    'dashboard': 'Dashboard',
    'profile': 'User Profile',
    'authentication': 'User Authentication',
    'login': 'Login System',
    'signup': 'Sign Up',
    'search': 'Search Functionality',
    'filter': 'Filtering',
    'cart': 'Shopping Cart',
    'checkout': 'Checkout',
    'payment': 'Payment Integration',
    'chat': 'Chat/Messaging',
    'comment': 'Comments System',
    'like': 'Like/Reaction',
    'share': 'Share Functionality',
    'gallery': 'Image Gallery',
    'video': 'Video Player',
    'map': 'Map Integration',
    'calendar': 'Calendar',
    'booking': 'Booking System',
    'reservation': 'Reservation System',
    'review': 'Reviews/Ratings',
    'notification': 'Notifications',
    'settings': 'Settings Page',
    'admin': 'Admin Panel',
  };

  // Extract features from description
  for (const [keyword, featureName] of Object.entries(featureKeywords)) {
    if (lowerDesc.includes(keyword)) {
      if (!features.includes(featureName)) {
        features.push(featureName);
      }
    }
  }

  // Extract target audience keywords
  const audienceKeywords: { [key: string]: string } = {
    'business': 'Business owners',
    'company': 'Companies',
    'enterprise': 'Enterprises',
    'startup': 'Startups',
    'freelancer': 'Freelancers',
    'student': 'Students',
    'developer': 'Developers',
    'designer': 'Designers',
    'artist': 'Artists',
    'photographer': 'Photographers',
    'writer': 'Writers',
    'blogger': 'Bloggers',
    'restaurant': 'Restaurant owners',
    'hotel': 'Hotel owners',
    'ecommerce': 'E-commerce businesses',
    'portfolio': 'Professionals',
  };

  for (const [keyword, audience] of Object.entries(audienceKeywords)) {
    if (lowerDesc.includes(keyword)) {
      targetAudience = audience;
      break;
    }
  }

  // Extract design style keywords
  if (lowerDesc.includes('minimal') || lowerDesc.includes('simple') || lowerDesc.includes('clean')) {
    designStyle = 'minimalist';
  } else if (lowerDesc.includes('bold') || lowerDesc.includes('colorful') || lowerDesc.includes('vibrant')) {
    designStyle = 'bold';
  } else if (lowerDesc.includes('professional') || lowerDesc.includes('corporate') || lowerDesc.includes('business')) {
    designStyle = 'professional';
  } else if (lowerDesc.includes('playful') || lowerDesc.includes('fun') || lowerDesc.includes('creative')) {
    designStyle = 'playful';
  }

  // If no features found, try to extract from "with" or "and" patterns
  if (features.length === 0) {
    const withPattern = /with\s+([^,]+(?:,\s*[^,]+)*)/i;
    const andPattern = /\band\s+([^,]+(?:,\s*[^,]+)*)/i;
    
    const withMatch = description.match(withPattern);
    const andMatch = description.match(andPattern);
    
    if (withMatch) {
      const items = withMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
      features.push(...items.slice(0, 5));
    } else if (andMatch) {
      const items = andMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
      features.push(...items.slice(0, 5));
    }
  }

  // If still no features, extract nouns/phrases
  if (features.length === 0) {
    const words = description.split(/\s+/).filter(w => w.length > 3);
    const commonWords = ['with', 'and', 'for', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'this', 'that'];
    const extracted = words
      .filter(w => !commonWords.includes(w.toLowerCase()))
      .slice(0, 5)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    features.push(...extracted);
  }

  // Default target audience if not found
  if (!targetAudience) {
    if (lowerDesc.includes('portfolio') || lowerDesc.includes('personal')) {
      targetAudience = 'Professionals';
    } else if (lowerDesc.includes('business') || lowerDesc.includes('company')) {
      targetAudience = 'Business owners';
    } else {
      targetAudience = 'General users';
    }
  }

  return {
    features: features.length > 0 ? features : ['Core functionality'],
    targetAudience: targetAudience || 'General users',
    designStyle,
  };
}

export default function IdeaInputStep({ onSubmit }: IdeaInputStepProps) {
  const searchParams = useSearchParams(); // For reading URL params (?description=...)
  const router = useRouter(); // For navigation
  
  // Form state
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>(['']);
  const [targetAudience, setTargetAudience] = useState('');
  const [designStyle, setDesignStyle] = useState('modern');
  
  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasExtracted, setHasExtracted] = useState(false);
  const extractTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For debouncing

  /**
   * Extract info from description using AI or rule-based methods
   * Updates features, target audience, and design style fields automatically
   * 
   * @param desc - Description text to extract info from
   */
  const extractInfo = useCallback(async (desc: string) => {
    if (!desc.trim() || desc.trim().length < 10) return;
    
    setIsExtracting(true);
    try {
      const extracted = await extractInfoFromDescription(desc);
      
      // Update features
      if (extracted.features.length > 0) {
        setFeatures(extracted.features.map(f => f.trim()).filter(f => f.length > 0));
      }
      
      // Update target audience
      if (extracted.targetAudience) {
        setTargetAudience(extracted.targetAudience);
      }
      
      // Update design style
      if (extracted.designStyle) {
        setDesignStyle(extracted.designStyle);
      }
      
      setHasExtracted(true);
    } catch (error) {
      console.error('Error extracting info:', error);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  /**
   * Load description from URL params or localStorage on mount
   * 
   * Priority:
   * 1. URL params (?description=...) - from home page navigation
   * 2. localStorage ('gobuild-description') - from cross-page navigation
   * 
   * After loading, automatically extracts features and populates form fields
   */
  useEffect(() => {
    // First check URL params (from home page "Build App" button)
    const urlDescription = searchParams?.get('description');
    if (urlDescription) {
      const decodedDescription = decodeURIComponent(urlDescription);
      setDescription(decodedDescription);
      // Extract info from description automatically
      extractInfo(decodedDescription);
      // Clear URL param after reading to keep URL clean
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('description');
        window.history.replaceState({}, '', url.toString());
      }
      return;
    }

    // Then check localStorage (from App Builder navigation)
    const storedDescription = typeof window !== 'undefined' 
      ? localStorage.getItem('gobuild-description')
      : null;
    
    if (storedDescription) {
      setDescription(storedDescription);
      // Extract info from description automatically
      extractInfo(storedDescription);
      // Clear localStorage after reading
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gobuild-description');
      }
    }
  }, [searchParams, extractInfo]);

  /**
   * Feature management handlers
   */
  const handleAddFeature = () => {
    setFeatures([...features, '']);
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  /**
   * Handle form submission
   * Validates required fields and passes data to parent component
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validFeatures = features.filter(f => f.trim() !== '');
    if (!description.trim() || validFeatures.length === 0 || !targetAudience.trim()) {
      return;
    }
    onSubmit({
      description: description.trim(),
      features: validFeatures,
      targetAudience: targetAudience.trim(),
      designStyle,
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-2xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">Describe Your App Idea</h2>
          <p className="text-gray-400 text-lg">
            Tell us what you want to build. Be as detailed as possible for the best results.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* App Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              App Description <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  
                  // Store description in localStorage for cross-page navigation
                  // Available if user navigates to app-builder
                  if (typeof window !== 'undefined' && e.target.value.trim()) {
                    localStorage.setItem('gobuild-description', e.target.value.trim());
                  }
                  
                  // Reset extraction flag when user manually edits
                  // Allows re-extraction if user changes description significantly
                  setHasExtracted(false);
                  
                  // Auto-extract after user stops typing (debounced)
                  // Waits 2 seconds of inactivity before extracting
                  if (extractTimeoutRef.current) {
                    clearTimeout(extractTimeoutRef.current);
                  }
                  extractTimeoutRef.current = setTimeout(() => {
                    if (e.target.value.trim().length >= 10) {
                      extractInfo(e.target.value.trim());
                    }
                  }, 2000); // Wait 2 seconds after user stops typing
                }}
                placeholder="E.g., A portfolio with header, footer, contact, blogs, and projects..."
                rows={5}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
                required
              />
              {/* Manual "Auto-fill" button - appears when description is long enough but not yet extracted */}
              {description.trim().length >= 10 && !hasExtracted && !isExtracting && (
                <button
                  type="button"
                  onClick={() => extractInfo(description.trim())}
                  className="absolute top-2 right-2 px-3 py-1.5 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all border border-emerald-500/30 flex items-center gap-1"
                  title="Extract features automatically"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Auto-fill
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Describe your app's purpose, main functionality, and what makes it unique.
              </p>
              {isExtracting && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Extracting features...
                </span>
              )}
              {hasExtracted && !isExtracting && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Features extracted
                </span>
              )}
            </div>
          </div>

          {/* Key Features */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Key Features <span className="text-emerald-400">*</span>
            </label>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    placeholder={`Feature ${index + 1} (e.g., User authentication, Dashboard, etc.)`}
                    className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
                  />
                  {features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddFeature}
                className="w-full px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all border border-emerald-500/30"
              >
                + Add Feature
              </button>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-gray-300 mb-2">
              Target Audience <span className="text-emerald-400">*</span>
            </label>
            <input
              id="audience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="E.g., Small business owners, Students, Developers, etc."
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
              required
            />
          </div>

          {/* Design Style */}
          <div>
            <label htmlFor="designStyle" className="block text-sm font-medium text-gray-300 mb-2">
              Design Style Preference
            </label>
            <select
              id="designStyle"
              value={designStyle}
              onChange={(e) => setDesignStyle(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
            >
              <option value="modern">Modern & Clean</option>
              <option value="minimalist">Minimalist</option>
              <option value="bold">Bold & Colorful</option>
              <option value="professional">Professional</option>
              <option value="playful">Playful & Fun</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={!description.trim() || features.filter(f => f.trim() !== '').length === 0 || !targetAudience.trim()}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-500 hover:to-cyan-600 text-gray-900 font-bold text-lg rounded-lg transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Continue to Configuration →
            </button>
            {/* Optional: Navigate to App Builder with description */}
            {/* Allows users to skip wizard and go directly to editor */}
            {description.trim() && (
              <button
                type="button"
                onClick={() => {
                  // Store description and navigate to app-builder
                  // Description will be available in app-builder welcome screen
                  if (description.trim()) {
                    localStorage.setItem('gobuild-description', description.trim());
                    router.push(`/studio?description=${encodeURIComponent(description.trim())}`);
                  } else {
                    router.push('/studio');
                  }
                }}
                className="w-full px-8 py-3 bg-gradient-to-r from-purple-500/80 to-pink-500/80 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-[1.02] border border-purple-400/30"
              >
                Open in App Builder →
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

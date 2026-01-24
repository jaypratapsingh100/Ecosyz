'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import WizardFlow from '../components/app-builder/WizardFlow';
import { useAuthCheck } from '../hooks/useAuthCheck';

function AppBuilderWizardContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuthCheck();
  const initialDescription = searchParams.get('description') || undefined;

  const handleComplete = (projectId: string) => {
    // Redirect to studio after project creation
    if (typeof window !== 'undefined') {
      window.location.href = `/studio`;
    }
  };

  const handleClose = () => {
    // Redirect to studio when wizard is closed
    if (typeof window !== 'undefined') {
      window.location.href = `/studio`;
    }
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <div className="flex-1">
        <WizardFlow
          onComplete={handleComplete}
          onClose={handleClose}
          initialDescription={initialDescription}
        />
      </div>
      <Footer />
    </div>
  );
}

export default function AppBuilderWizardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    }>
      <AppBuilderWizardContent />
    </Suspense>
  );
}

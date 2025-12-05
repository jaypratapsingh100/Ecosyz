'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useEffect, useState } from 'react';

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const type = searchParams?.get('type') || 'feature';
  const name = searchParams?.get('name') || '';
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);

  useEffect(() => {
    // Animate logo on mount
    const interval = setInterval(() => {
      setLogoScale((prev) => (prev === 1 ? 1.1 : 1));
      setLogoRotation((prev) => (prev + 5) % 360);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getDisplayName = () => {
    if (name) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return type === 'framework' ? 'Framework' : 'Integration';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <main className="flex-grow relative flex items-center justify-center">
        {/* Globe background image */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/hero-globe.png"
            alt="Digital Globe Background"
            fill
            className="object-cover object-right opacity-30"
            quality={100}
            priority
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
        </div>

        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 py-20">
          {/* Animated Logo */}
          <div className="mb-8 flex justify-center">
            <div
              className="relative"
              style={{
                transform: `scale(${logoScale}) rotate(${logoRotation}deg)`,
                transition: 'transform 0.6s ease-in-out',
              }}
            >
              <Image
                src="/logo.png"
                alt="Open Idea Logo"
                width={120}
                height={120}
                className="animate-pulse"
              />
            </div>
          </div>

          {/* Coming Soon Content */}
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
              Coming Soon
            </h1>
            <p className="text-xl sm:text-2xl text-teal-100/90 mb-8">
              {getDisplayName()} integration is on its way!
            </p>
            <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto">
              We&apos;re working hard to bring you this feature. Stay tuned for updates and be among the first to know when it&apos;s ready.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/"
                className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg shadow-lg transition hover:scale-105"
              >
                Back to Home
              </Link>
              <Link
                href="/features"
                className="px-8 py-3 bg-transparent border-2 border-cyan-400/50 text-cyan-400 font-semibold rounded-lg transition hover:scale-105 hover:bg-cyan-400/10 hover:border-cyan-400"
              >
                View Features
              </Link>
            </div>

            {/* Notification Signup */}
            <div className="mt-12 p-6 bg-black/40 backdrop-blur-sm border border-emerald-400/30 rounded-xl max-w-md mx-auto">
              <p className="text-sm text-gray-400 mb-4">
                Get notified when this feature launches
              </p>
              <button
                onClick={() => {
                  // You can integrate with a notification service here
                  alert('We\'ll notify you when this feature is ready!');
                }}
                className="w-full px-6 py-3 bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-400/50 text-emerald-400 font-medium rounded-lg transition-colors"
              >
                Notify Me
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-teal-100/80">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <ComingSoonContent />
    </Suspense>
  );
}


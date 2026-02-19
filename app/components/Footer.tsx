'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <>
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      <footer className="glass text-gray-400 pt-10 pb-6 px-6 sm:px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          {/* Main row: aligned grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 items-center">
            {/* Brand */}
            <div className="flex items-center justify-center md:justify-start">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="ECOSYZ logo"
                  width={32}
                  height={32}
                  className="opacity-90"
                />
                <span className="text-lg font-medium text-white tracking-wide">
                  ECOSYZ
                </span>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-center text-sm text-gray-400/90 max-w-xs mx-auto">
              Empowering Open, Sustainable Innovation Worldwide
            </p>

            {/* Contact + Links */}
            <div className="flex flex-col items-center md:items-end gap-2">
              <div className="flex items-center gap-4">
                <Link
                  href="https://discord.gg/4weahHXQYY"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                  aria-label="Discord"
                >
                  <i className="fab fa-discord" />
                </Link>
                <Link
                  href="https://www.linkedin.com/company/ecosyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                  aria-label="LinkedIn"
                >
                  <i className="fab fa-linkedin" />
                </Link>
                <Link
                  href="https://x.com/OpenIdeaOrg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                  aria-label="Twitter"
                >
                  <i className="fab fa-twitter" />
                </Link>
                <Link
                  href="mailto:info@openidea.world"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                  aria-label="Email"
                >
                  <i className="fas fa-envelope" />
                </Link>
              </div>
              <div className="flex flex-col items-center md:items-end gap-0.5">
                <Link
                  href="tel:+917838832332"
                  className="text-sm text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-2"
                  aria-label="Phone"
                >
                  <i className="fas fa-phone text-[10px]" />
                  <span>+91 78388 32332</span>
                </Link>
                <Link
                  href="/careers"
                  className="text-sm text-emerald-400/90 hover:text-emerald-400 transition-colors"
                >
                  Careers
                </Link>
              </div>
            </div>
          </div>

          {/* Legal links */}
          <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
            <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Use</Link>
            <Link href="/cookies" className="hover:text-emerald-400 transition-colors">Cookie Policy</Link>
          </div>
          {/* Copyright */}
          <div className="mt-4 text-center text-xs text-gray-500">
            © {currentYear} ECOSYZ. All rights reserved. Proudly built in India 🇮🇳 with ❤️ for global innovation.
          </div>
        </div>
      </footer>
    </>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <>
      <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-40 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>

      <footer className="glass text-gray-300 pt-12 pb-8 px-4 sm:px-8 border-t glass-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          {/* 🔵 Logo + Name + Links */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 md:mb-0">
            <div className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="ECOSYZ logo"
              width={40}
              height={40}
            />
            <span className="text-xl font-semibold text-white tracking-wide">
              ECOSYZ
            </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/careers" className="text-gray-300 hover:text-emerald-400 transition-colors">
                Careers
              </Link>
              <Link href="/about" className="text-gray-300 hover:text-emerald-400 transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-gray-300 hover:text-emerald-400 transition-colors">
                Contact
              </Link>
            </div>
          </div>

          {/* 🌍 Tagline */}
          <p className="text-center text-sm md:text-base mb-6 md:mb-0 max-w-md text-gray-300/80">
            Empowering Open, Sustainable Innovation Worldwide
          </p>

          {/* 📱 Social Icons + 📧 Mail */}
          <div className="flex flex-col items-center gap-4 text-lg">
            <div className="flex space-x-5">
              <Link
                href="https://discord.gg/4weahHXQYY"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors duration-300"
                aria-label="Discord"
              >
                <i className="fab fa-discord" />
              </Link>
              <Link
                href="https://www.linkedin.com/company/ecosyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors duration-300"
                aria-label="LinkedIn"
              >
                <i className="fab fa-linkedin" />
              </Link>
              <Link
                href="https://x.com/OpenIdeaOrg"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors duration-300"
                aria-label="Twitter"
              >
                <i className="fab fa-twitter" />
              </Link>
              <Link
                href="mailto:info@openidea.world"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-gray-400 hover:text-emerald-400 transition-colors duration-300"
                aria-label="Email"
              >
                <i className="fas fa-envelope" />
              </Link>
            </div>
            <Link
              href="tel:+917838832332"
              className="flex items-center text-sm text-gray-400 hover:text-emerald-400 transition-colors duration-300"
              aria-label="Phone"
            >
              <i className="fas fa-phone mr-2" />
              <span>7838832332</span>
            </Link>
          </div>
        </div>

        {/* 🔚 Bottom Note */}
        <div className="mt-8 text-center text-xs text-gray-400">
          © {currentYear} ECOSYZ. All rights reserved. Proudly built in India {' '}
          <span className="text-lg"> 🇮🇳 </span> with {' '}
          <span className="text-emerald-400">❤️</span> for global innovation.
        </div>
      </footer>
    </>
  );
}

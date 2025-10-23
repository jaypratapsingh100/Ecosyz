'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Container } from "./ui/Container";
import { toast } from "sonner";
import { useAuth } from '../../src/lib/useAuth';

// Central nav definition
const NAV_LINKS = [
  { href: "/openresources", label: "Resources" },
  { href: "/projects", label: "Projects" },
  { href: "/community", label: "Community" },
  { href: "/whitepaper", label: "Whitepaper" },
  { href: "/pricing", label: "Pricing" },
];

export default function Header() {
  const { user, loading, logout: authLogout, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Ensure hydration matches server
  useEffect(() => {
    setIsMounted(true);
  }, []);

  
  // Close mobile nav on route change
  useEffect(() => { 
    setMobileOpen(false);
  }, [pathname]);
  
  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };
    
    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent scrolling when mobile menu is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling when mobile menu is closed
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [mobileOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await authLogout();
      toast.success('Signed out successfully');
      setDropdownOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Keyboard handler for user dropdown accessibility
  function onDropdownKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setDropdownOpen(o => !o);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  }

  // Derive active route for highlighting
  const activeRoot = pathname === "/" ? "/" : `/${pathname.split('/')[1]}`;

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <header className="sticky top-0 z-[99] glass h-14 border-b glass-border">
        <Container>
          <div className="h-14 flex justify-between items-center gap-4 w-full">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/eco.png" alt="Open Idea Logo" width={36} height={36} />
              <span className="text-xl font-bold gradient-text ml-2">Open Idea</span>
            </Link>
          </div>
        </Container>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-[99] glass h-14 border-b glass-border">
      <Container>
        <div className="h-14 flex justify-between items-center gap-4 w-full">
          {/* Brand left */}
          <Link href="/" className="flex items-center gap-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400/60">
            <Image src="/eco.png" alt="Open Idea Logo" width={36} height={36} priority />
            <span className="text-xl font-bold gradient-text ml-2">Open Idea</span>
          </Link>

          {/* Mobile menu button - ALWAYS show on small screens */}
          <button
            type="button"
            className="lg:hidden p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label="Main menu"
          >
            <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Desktop nav right - ALWAYS show on large screens */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Main">
            {NAV_LINKS.map(link => {
              const isActive = activeRoot === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`focus:outline-none focus:ring-2 focus:ring-emerald-400/60 px-2 py-1 rounded transition-colors hover:text-emerald-400/90 ${
                    isActive ? 'text-emerald-400 font-semibold' : 'text-gray-300 dark:text-gray-200'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User avatar, feedback, theme toggle - ALWAYS show on large screens */}
          <div className="hidden lg:flex items-center gap-4">
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-gray-700 animate-pulse"></div>
            ) : isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-2 border-emerald-400 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400/60 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="User menu"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onKeyDown={onDropdownKey}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || user.email || 'User'}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-lg font-bold text-gray-500 dark:text-gray-300">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </button>

                {dropdownOpen && (
                  <div
                    role="menu"
                    aria-label="User menu"
                    className="absolute right-0 mt-2 w-80 bg-gray-900 rounded-2xl shadow-xl border border-gray-700/50 z-[9999] animate-slide-down"
                  >
                    {/* Header section with avatar and user info */}
                    <div className="p-6 border-b border-gray-700/50">
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name || user.email || 'User'}
                              className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-400"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-emerald-600 ring-2 ring-emerald-400 flex items-center justify-center text-3xl font-bold text-white">
                              {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <button
                            className="absolute bottom-0 right-0 bg-gray-800 border border-gray-600 rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Edit profile"
                            onClick={() => {/* open edit modal or profile page */}}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-lg font-semibold text-white">{user.name || 'User'}</span>
                          <span className="text-sm text-gray-400">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="p-2">
                      <div className="flex flex-col gap-1">
                        <button 
                          className="flex items-center gap-3 w-full p-3 text-gray-200 hover:bg-gray-800/80 rounded-xl transition-colors text-left"
                          onClick={() => {/* manage account */}}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                            <path fillRule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 01.804.98v1.36a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.295A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.03l1.25.834a6.957 6.957 0 011.416-.587l.295-1.473zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          Manage Account
                        </button>
                        <Link
                          href="/dashboard"
                          role="menuitem"
                          className="flex items-center gap-3 w-full p-3 text-gray-200 hover:bg-gray-800/80 rounded-xl transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                            <path d="M2 4.25A2.25 2.25 0 014.25 2h2.5A2.25 2.25 0 019 4.25v2.5A2.25 2.25 0 016.75 9h-2.5A2.25 2.25 0 012 6.75v-2.5zM2 13.25A2.25 2.25 0 014.25 11h2.5A2.25 2.25 0 019 13.25v2.5A2.25 2.25 0 016.75 18h-2.5A2.25 2.25 0 012 15.75v-2.5zM11 4.25A2.25 2.25 0 0113.25 2h2.5A2.25 2.25 0 0118 4.25v2.5A2.25 2.25 0 0115.75 9h-2.5A2.25 2.25 0 0111 6.75v-2.5zM11 13.25A2.25 2.25 0 0113.25 11h2.5A2.25 2.25 0 0118 13.25v2.5A2.25 2.25 0 0115.75 18h-2.5A2.25 2.25 0 0111 15.75v-2.5z" />
                          </svg>
                          Workspace
                        </Link>
                        <Link
                          href="/projects"
                          role="menuitem"
                          className="flex items-center gap-3 w-full p-3 text-gray-200 hover:bg-gray-800/80 rounded-xl transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                            <path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2z" />
                            <path fillRule="evenodd" d="M2 7.5h16l-.811 7.71a2 2 0 01-1.99 1.79H4.802a2 2 0 01-1.99-1.79L2 7.5zM7 11a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                          Projects
                        </Link>
                        <Link 
                          href="/feedback"
                          role="menuitem" 
                          className="flex items-center gap-3 w-full p-3 text-gray-200 hover:bg-gray-800/80 rounded-xl transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                            <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zM6.75 6a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 2.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                          </svg>
                          Feedback
                        </Link>
                      </div>
                    </div>

                    {/* Sign out button */}
                    <div className="p-2 border-t border-gray-700/50">
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full p-3 text-gray-200 hover:bg-gray-800/80 rounded-xl transition-colors text-left"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                          <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link 
                  href="/feedback" 
                  className="focus:outline-none focus:ring-2 focus:ring-emerald-400/60 px-2 py-1 rounded transition-colors hover:text-emerald-400 font-medium text-gray-300"
                >
                  Feedback
                </Link>
                <Link
                  href="/auth"
                  className="focus:outline-none focus:ring-2 focus:ring-emerald-400/60 px-4 py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu - ONLY show on small screens when opened */}
        {mobileOpen && (
          <div 
            id="mobile-menu"
            ref={mobileMenuRef}
            className="lg:hidden fixed inset-0 top-14 z-50 bg-gray-900/95 backdrop-blur-sm overflow-y-auto animate-fade-in"
          >
            <div className="px-4 py-6 space-y-6">
              <nav className="space-y-4 pb-6 border-b border-gray-700/50">
                {NAV_LINKS.map(link => {
                  const isActive = activeRoot === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`block px-4 py-3 rounded-lg text-lg font-medium transition-colors ${
                        isActive ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-gray-800/80 text-gray-200'
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              {/* User section in mobile menu */}
              {isAuthenticated && user ? (
                <div className="space-y-4 pb-6 border-b border-gray-700/50">
                  <div className="flex items-center gap-4 px-4 py-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || user.email || 'User'}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-400"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-600 ring-2 ring-emerald-400 flex items-center justify-center text-xl font-bold text-white">
                        {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-base font-semibold text-white">{user.name || 'User'}</span>
                      <span className="text-sm text-gray-400">{user.email}</span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-3 rounded-lg text-lg font-medium hover:bg-gray-800/80 text-gray-200 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Workspace
                  </Link>
                  <Link
                    href="/projects"
                    className="block px-4 py-3 rounded-lg text-lg font-medium hover:bg-gray-800/80 text-gray-200 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Projects
                  </Link>
                </div>
              ) : null}

              <div className="space-y-4 pb-6">
                <Link
                  href="/feedback"
                  className="block px-4 py-3 rounded-lg text-lg font-medium hover:bg-gray-800/80 text-gray-200 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Feedback
                </Link>
                <Link
                  href="/contact"
                  className="block px-4 py-3 rounded-lg text-lg font-medium hover:bg-gray-800/80 text-gray-200 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Contact Us
                </Link>
                
                {isAuthenticated && user ? (
                  <div className="px-4 pt-4">
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileOpen(false);
                      }}
                      className="block w-full px-4 py-3 text-center bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="px-4 pt-4">
                    <Link
                      href="/auth"
                      className="block w-full px-4 py-3 text-center bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:shadow-lg transition-all"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}

'use client';

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Container } from "./ui/Container";
import { toast } from "sonner";

// Central nav definition - base links
const ALL_NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<{ name?: string; email?: string; avatarUrl?: string } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Determine which nav links to show based on current page
  const BASE_NAV_LINKS = ALL_NAV_LINKS;

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Check authentication status and fetch user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch('/api/auth/session', {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);
          setUserData(data.user);
          
          // Fetch workspace ID
          try {
            const workspaceRes = await fetch('/api/workspaces', {
              signal: controller.signal,
            });
            if (workspaceRes.ok) {
              const workspaceData = await workspaceRes.json();
              if (workspaceData?.id) {
                setWorkspaceId(workspaceData.id);
              }
            }
          } catch (error) {
            // Silently fail - workspace will be fetched on click if needed
            console.error('Failed to fetch workspace:', error);
          }
        } else {
          // 401 is expected when user is not logged in - don't log as error
          // Only log unexpected errors (500, 503, etc.)
          if (response.status !== 401) {
            console.warn('Unexpected auth check status:', response.status);
          }
          setIsAuthenticated(false);
          setUserData(null);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Auth check timed out');
        } else {
          // Only log network/connection errors, not expected 401s
          console.error('Auth check network error:', error);
        }
        setIsAuthenticated(false);
        setUserData(null);
      }
    };
    checkAuth();
  }, []);

  // Trap focus in mobile nav
  useEffect(() => {
    if (!mobileOpen) return;
    const panel = mobileNavRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll('a,button');
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length-1] as HTMLElement;
    function trap(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }
    panel.addEventListener('keydown', trap);
    first?.focus();
    return () => panel.removeEventListener('keydown', trap);
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Signed out successfully', {
          description: 'You have been logged out of your account.',
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            color: 'white',
            border: 'none',
            fontWeight: '600',
          },
        });
        setIsAuthenticated(false);
        setUserData(null);
        setDropdownOpen(false);
        router.push('/');
      } else {
        toast.error('Failed to sign out', {
          description: 'Please try again or refresh the page.',
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white',
            border: 'none',
            fontWeight: '600',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derive active segment for highlighting (first path part)
  // Use useMemo to ensure consistent server/client rendering and prevent hydration mismatch
  const activeRoot = useMemo(() => {
    if (!pathname || pathname === "/") return "/";
    const segments = pathname.split('/').filter(Boolean);
    return segments.length > 0 ? `/${segments[0]}` : "/";
  }, [pathname]);

  // Keyboard handler for user dropdown accessibility
  function onDropdownKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setDropdownOpen(o => !o);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 glass h-14 border-b glass-border">
      <Container>
        <div className="h-14 flex items-center justify-between gap-2 relative">
          {/* Brand left */}
          <Link href="/" className="flex items-center gap-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400/60">
            <Image src="/logo.png" alt="Open Idea Logo" width={36} height={36} className="shrink-0" />
            <span className="text-xl font-bold gradient-text ml-2 whitespace-nowrap">Open Idea</span>
          </Link>
          
          {/* Desktop nav center - Hide on smaller screens to prevent overlap */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 absolute left-1/2 -translate-x-1/2 max-w-[600px] overflow-hidden" aria-label="Main">
            {BASE_NAV_LINKS.map(link => {
              const isActive = activeRoot === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`focus:outline-none px-2 xl:px-3 py-1.5 rounded transition whitespace-nowrap text-sm active:scale-95 ${
                    isActive 
                      ? 'text-emerald-400 font-semibold bg-emerald-400/10 border border-emerald-400/20 shadow-md shadow-emerald-400/10 hover:text-emerald-400/90' 
                      : 'text-gray-300 dark:text-gray-200 hover:text-emerald-400/90 hover:bg-gray-800/50 active:bg-gray-800/70 active:shadow-sm'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/studio"
              className="focus:outline-none focus:ring-2 focus:ring-emerald-400/60 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:shadow-lg transition-all text-sm md:text-base whitespace-nowrap"
            >
              App Studio
            </Link>
          </nav>
          
          {/* Utilities right - Improved responsive layout */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* User profile / Sign In - Always visible on md+ */}
            <div className="hidden md:flex items-center gap-2 md:gap-3">
              {isAuthenticated && userData ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    onKeyDown={onDropdownKey}
                    className="flex items-center gap-2 p-1.5 md:p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400/60 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                    aria-label="User menu"
                    aria-haspopup="menu"
                    aria-expanded={dropdownOpen}
                  >
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      {userData.avatarUrl ? (
                        <Image
                          src={userData.avatarUrl}
                          alt="User avatar"
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300">
                          {(userData.name || userData.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap hidden lg:inline">
                      {userData.name || userData.email?.split('@')[0] || 'User'}
                    </span>
                    <svg
                      className={`w-3 h-3 md:w-4 md:h-4 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div
                      role="menu"
                      aria-label="User menu"
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                    >
                      <div className="py-1">
                        <Link
                          href="/profile"
                          role="menuitem"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setDropdownOpen(false)}
                        >
                          Profile
                        </Link>
                        {workspaceId ? (
                          <Link
                            href={`/workspaces/${workspaceId}`}
                            role="menuitem"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setDropdownOpen(false)}
                          >
                            Workspace
                          </Link>
                        ) : (
                          <button
                            role="menuitem"
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={async () => {
                              setDropdownOpen(false);
                              try {
                                const res = await fetch('/api/workspaces');
                                if (res.ok) {
                                  const data = await res.json();
                                  if (data?.id) {
                                    router.push(`/workspaces/${data.id}`);
                                  }
                                }
                              } catch (error) {
                                console.error('Failed to fetch workspace:', error);
                              }
                            }}
                          >
                            Workspace
                          </button>
                        )}
                        <button
                          role="menuitem"
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                pathname !== '/auth' && (
                  <Link
                    href="/auth"
                    className="focus:outline-none focus:ring-2 focus:ring-emerald-400/60 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:shadow-lg transition-all text-sm md:text-base whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                )
              )}
              
              {/* Feedback and BETA - Always visible on md+ */}
              <Link href="/feedback" className="focus:outline-none focus:ring-2 focus:ring-emerald-400/60 px-2 py-1 rounded transition hover:text-emerald-400 font-medium text-white text-sm whitespace-nowrap">
                Feedback
              </Link>
              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded border border-yellow-500/30 whitespace-nowrap shrink-0">
                BETA
              </span>
            </div>
          </div>
          {/* Hamburger for mobile - Show on screens smaller than md */}
          <button
            type="button"
            className="md:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400/60 hover:bg-white/10 text-white shrink-0"
            aria-label="Open menu"
            aria-controls="mobile-nav"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(v => !v)}
          >
            <span className="sr-only">Open menu</span>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
        {/* Mobile nav panel */}
        <div
          id="mobile-nav"
          ref={mobileNavRef}
          className={`md:hidden grid gap-2 p-4 glass-strong border-t glass-border transition-all duration-200 ${mobileOpen ? 'block' : 'hidden'}`}
          tabIndex={mobileOpen ? 0 : -1}
          aria-label="Main"
        >
          {BASE_NAV_LINKS.map(link => {
            const isActive = activeRoot === link.href;
            
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`block w-full text-lg px-3 py-3 rounded focus:outline-none transition active:scale-95 ${
                  isActive 
                    ? 'text-emerald-400 font-semibold bg-emerald-400/10 border border-emerald-400/20 shadow-md shadow-emerald-400/10' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10 active:bg-white/20 active:shadow-sm'
                }`}
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? 0 : -1}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/studio"
            className="w-full flex items-center justify-center gap-2 p-3 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400/60 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold hover:shadow-lg transition-all"
            onClick={() => setMobileOpen(false)}
            tabIndex={mobileOpen ? 0 : -1}
          >
            App Studio
          </Link>
          <div className="w-full flex flex-col gap-3 p-3">
            <div className="flex items-center justify-center gap-2">
              <Link
                href="/feedback"
                className="focus:outline-none focus:ring-2 focus:ring-emerald-400/60 rounded hover:text-emerald-400 text-white font-medium"
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? 0 : -1}
              >
                Feedback
              </Link>
              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded border border-yellow-500/30">
                BETA
              </span>
            </div>
          </div>
          {isAuthenticated ? (
            <>
              <Link
                href="/profile"
                className="w-full flex items-center justify-center gap-2 p-3 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400/60 hover:bg-white/10 text-white font-medium"
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? 0 : -1}
              >
                Profile
              </Link>
              {workspaceId ? (
                <Link
                  href={`/workspaces/${workspaceId}`}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400/60 hover:bg-white/10 text-white font-medium"
                  onClick={() => setMobileOpen(false)}
                  tabIndex={mobileOpen ? 0 : -1}
                >
                  Workspace
                </Link>
              ) : (
                <button
                  className="w-full flex items-center justify-center gap-2 p-3 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400/60 hover:bg-white/10 text-white font-medium"
                  onClick={async () => {
                    setMobileOpen(false);
                    try {
                      const res = await fetch('/api/workspaces');
                      if (res.ok) {
                        const data = await res.json();
                        if (data?.id) {
                          router.push(`/workspaces/${data.id}`);
                        }
                      }
                    } catch (error) {
                      console.error('Failed to fetch workspace:', error);
                    }
                  }}
                  tabIndex={mobileOpen ? 0 : -1}
                >
                  Workspace
                </button>
              )}
              <button
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400/60 hover:bg-white/10 text-white font-medium"
                tabIndex={mobileOpen ? 0 : -1}
              >
                Sign Out
              </button>
            </>
          ) : (
            !(pathname === '/auth' || (pathname === '/studio' && !isAuthenticated)) && (
              <Link
                href="/auth"
                className="w-full flex items-center justify-center gap-2 p-3 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400/60 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold"
                onClick={() => setMobileOpen(false)}
                tabIndex={mobileOpen ? 0 : -1}
              >
                Sign In
              </Link>
            )
          )}
        </div>
      </Container>
    </header>
  );
}

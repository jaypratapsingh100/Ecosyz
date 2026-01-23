'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

function AuthPageContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle error parameters from URL (e.g., OAuth errors)
  useEffect(() => {
    const error = searchParams?.get('error');
    const errorDescription = searchParams?.get('description') || searchParams?.get('message');
    
    if (error) {
      let errorMessage = 'Authentication failed';
      let description = 'Please try again.';
      
      // Map OAuth error codes to user-friendly messages
      switch (error) {
        case 'config_error':
          errorMessage = 'Configuration Error';
          description = 'Authentication service is not properly configured. Please contact support.';
          break;
        case 'code_exchange_failed':
          errorMessage = 'OAuth Error';
          description = errorDescription || 'Failed to complete authentication. Please try again.';
          break;
        case 'no_session':
          errorMessage = 'Session Error';
          description = 'Failed to create session. Please try signing in again.';
          break;
        case 'no_code_found':
          errorMessage = 'OAuth Callback Error';
          description = 'Invalid OAuth callback. Please try signing in again.';
          break;
        case 'callback_error':
          errorMessage = 'Authentication Error';
          description = errorDescription || 'An error occurred during authentication. Please try again.';
          break;
        case 'access_denied':
          errorMessage = 'Access Denied';
          description = 'You cancelled the authentication process. Please try again if you want to sign in.';
          break;
        default:
          errorMessage = errorDescription || errorMessage;
          description = 'Please try again or use email/password sign in.';
      }
      
      toast.error(errorMessage, {
        description,
        duration: 6000,
      });
      
      // Clean up URL parameters
      router.replace('/auth');
    }
  }, [searchParams, router]);

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleSignIn = async (data: SignInForm) => {
    setLoading(true);
    try {
      let response: Response;
      try {
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        // Handle network errors (fetch failed)
        console.error('Network error during sign in:', fetchError);
        
        let errorMessage = 'Unable to connect to the server.';
        if (fetchError.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('fetch failed')) {
          errorMessage = 'Unable to reach the server. Please ensure the server is running and check your internet connection.';
        } else if (fetchError.message) {
          errorMessage = `Connection error: ${fetchError.message}`;
        }
        
        throw new Error(errorMessage);
      }

      // Check if response exists
      if (!response) {
        throw new Error('No response received from server. Please try again.');
      }

      // Check if response is ok before trying to parse JSON
      let result: any;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(text);
      } catch (jsonError) {
        // If response is not JSON, it might be an HTML error page
        console.error('Failed to parse response:', jsonError);
        console.error('Response status:', response.status);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        
        throw new Error(
          `Server error (${response.status} ${response.statusText}). The server may be experiencing issues. Please try again later.`
        );
      }

      if (!response.ok) {
        // Use the error message from the API, or provide a default
        const errorMessage = result?.error || result?.message || `Sign in failed (${response.status})`;
        throw new Error(errorMessage);
      }

      toast.success('Welcome back!', {
        description: 'You have been successfully signed in.',
        duration: 4000,
      });
      
      // Small delay to ensure cookies are set before redirect
      // Use window.location for full page reload to ensure cookies are picked up
      setTimeout(() => {
        window.location.href = '/app-builder';
      }, 300);
    } catch (error) {
      // Extract error message without logging full stack trace
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      
      // Only log unexpected errors (not common auth failures)
      const isExpectedError = 
        errorMessage.includes('Invalid') || 
        errorMessage.includes('credentials') || 
        errorMessage.includes('email') && errorMessage.includes('not found') ||
        errorMessage.includes('Too many requests');
      
      if (!isExpectedError) {
        console.error('Sign in error:', errorMessage);
      }
      
      // Provide helpful suggestions based on error message
      let description = 'Please check your credentials and try again.';
      if (errorMessage.includes('connect') || errorMessage.includes('network') || errorMessage.includes('server')) {
        description = 'Unable to reach the server. Please check your internet connection and ensure the server is running.';
      } else if (errorMessage.includes('email') && errorMessage.includes('not found')) {
        description = 'Make sure you\'re using the correct email address. If you don\'t have an account, please sign up first.';
      } else if (errorMessage.includes('Invalid') || errorMessage.includes('credentials') || errorMessage.includes('password')) {
        description = 'The email or password you entered is incorrect. Please check and try again.';
      } else if (errorMessage.includes('verify') || errorMessage.includes('confirmation')) {
        description = 'Please check your email inbox and click the confirmation link before signing in.';
      } else if (errorMessage.includes('Too many requests')) {
        description = 'Too many login attempts. Please wait a few minutes before trying again.';
      }
      
      toast.error(errorMessage, {
        description,
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpForm) => {
    setLoading(true);
    try {
      let response: Response;
      try {
        response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      } catch (fetchError) {
        // Handle network errors (fetch failed)
        console.error('Network error during sign up:', fetchError);
        throw new Error(
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
      }

      // Check if response is ok before trying to parse JSON
      let result: any;
      try {
        result = await response.json();
      } catch (jsonError) {
        // If response is not JSON, it might be an HTML error page
        console.error('Failed to parse response:', jsonError);
        throw new Error(
          `Server error (${response.status}). Please try again later.`
        );
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Sign up failed');
      }

      toast.success('Account created successfully!', {
        description: 'Welcome! Redirecting to App Builder...',
        duration: 4000,
      });
      // Redirect to app builder after successful sign up
      // Use window.location for full page reload to ensure cookies are picked up
      setTimeout(() => {
        window.location.href = '/app-builder';
      }, 1000);
    } catch (error) {
      // Extract error message without logging full stack trace
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      
      // Only log unexpected errors (not common signup failures)
      const isExpectedError = 
        errorMessage.includes('already exists') || 
        errorMessage.includes('already registered') ||
        errorMessage.includes('Password') && errorMessage.includes('short') ||
        errorMessage.includes('email') && errorMessage.includes('invalid');
      
      if (!isExpectedError) {
        console.error('Sign up error:', errorMessage);
      }
      
      // Provide helpful suggestions based on error message
      let description = 'Please try again or contact support if the problem persists.';
      if (errorMessage.includes('connect') || errorMessage.includes('network') || errorMessage.includes('server')) {
        description = 'Unable to reach the server. Please check your internet connection and ensure the server is running.';
      } else if (errorMessage.includes('email') && (errorMessage.includes('already') || errorMessage.includes('already registered'))) {
        description = 'An account with this email already exists. Please sign in instead.';
      } else if (errorMessage.includes('password')) {
        description = 'Password must be at least 6 characters long.';
      } else if (errorMessage.includes('Invalid input')) {
        description = 'Please check all fields and try again.';
      }
      
      toast.error(errorMessage, {
        description,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    try {
      window.location.href = `/api/auth/${provider}`;
    } catch (error) {
      console.error('OAuth signin error:', error);
      toast.error(`Failed to sign in with ${provider}`, {
        description: 'Please try again or use email/password sign in.',
        duration: 4000,
      });
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordForm) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reset email');
      }

      // Check if we're in development mode and got a direct reset URL
      if (result.resetUrl) {
        toast.success('Password reset link generated!', {
          description: 'Since you\'re in development mode, you can click the button below to reset your password.',
          duration: 8000,
          action: {
            label: 'Reset Password',
            onClick: () => window.open(result.resetUrl, '_blank'),
          },
        });
      } else {
        toast.success('Password reset email sent!', {
          description: 'Please check your email for instructions to reset your password.',
          duration: 5000,
        });
      }

      setShowForgotPassword(false);
      forgotPasswordForm.reset();
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email', {
        description: 'Please try again or contact support.',
        duration: 5000,
        style: {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          border: 'none',
          fontWeight: '600',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen flex items-center">
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
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
          </div>

        <div className="relative z-10 w-full min-h-screen flex items-center py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-12 gap-16 items-center min-h-[70vh]">
            {/* Auth Form - Left Side */}
            <div className="lg:col-span-6 text-center lg:text-left">
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {isSignUp ? 'Join the Revolution' : 'Welcome Back'}
                  </h2>
                  <p className="text-teal-100/90">
                    {isSignUp
                      ? 'Create your account to start innovating'
                      : 'Sign in to continue your journey'
                    }
                  </p>
                </div>

                {/* OAuth Buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => handleOAuthSignIn('github')}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-600"
                  >
                    <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Continue with GitHub
                  </button>

                  <button
                    onClick={() => handleOAuthSignIn('google')}
                    className="w-full flex items-center justify-center px-4 py-3 bg-white hover:bg-gray-50 text-gray-900 rounded-lg transition-colors border border-gray-300"
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-gray-600"></div>
                  <span className="px-3 text-gray-400 text-sm">or</span>
                  <div className="flex-1 border-t border-gray-600"></div>
                </div>

                {/* Sign In Form */}
                {!isSignUp ? (
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <div>
                      <label htmlFor="signin-email" className="block text-sm font-medium text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        {...signInForm.register('email')}
                        type="email"
                        id="signin-email"
                        className="w-full px-3 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 backdrop-blur-sm"
                        placeholder="Enter your email"
                      />
                      {signInForm.formState.errors.email && (
                        <p className="mt-1 text-sm text-red-400">
                          {signInForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="signin-password" className="block text-sm font-medium text-gray-300 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          {...signInForm.register('password')}
                          type={showSignInPassword ? 'text' : 'password'}
                          id="signin-password"
                          className="w-full px-3 py-3 pr-10 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 backdrop-blur-sm"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                        >
                          {showSignInPassword ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {signInForm.formState.errors.password && (
                        <p className="mt-1 text-sm text-red-400">
                          {signInForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Sign Up Form */
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <div>
                      <label htmlFor="signup-name" className="block text-sm font-medium text-gray-300 mb-1">
                        Full Name
                      </label>
                      <input
                        {...signUpForm.register('name')}
                        type="text"
                        id="signup-name"
                        className="w-full px-3 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 backdrop-blur-sm"
                        placeholder="Enter your full name"
                      />
                      {signUpForm.formState.errors.name && (
                        <p className="mt-1 text-sm text-red-400">
                          {signUpForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        {...signUpForm.register('email')}
                        type="email"
                        id="signup-email"
                        className="w-full px-3 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 backdrop-blur-sm"
                        placeholder="Enter your email"
                      />
                      {signUpForm.formState.errors.email && (
                        <p className="mt-1 text-sm text-red-400">
                          {signUpForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          {...signUpForm.register('password')}
                          type={showSignUpPassword ? 'text' : 'password'}
                          id="signup-password"
                          className="w-full px-3 py-3 pr-10 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 backdrop-blur-sm"
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                        >
                          {showSignUpPassword ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {signUpForm.formState.errors.password && (
                        <p className="mt-1 text-sm text-red-400">
                          {signUpForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                    >
                      {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                  </form>
                )}

                {/* Toggle between sign in/up */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      signInForm.reset();
                      signUpForm.reset();
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    {isSignUp
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Sign up"
                    }
                  </button>
                </div>

                {/* Back to home */}
                <div className="mt-4 text-center">
                  <Link
                    href="/"
                    className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                  >
                    ← Back to home
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Side - Empty for globe background */}
            <div className="lg:col-span-6"></div>
          </div>
        </div>
        </div>
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60 absolute bottom-0 left-0" />
      </section>
      </main>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Reset Password</h3>
                <p className="text-teal-100/90 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    {...forgotPasswordForm.register('email')}
                    type="email"
                    id="forgot-email"
                    className="w-full px-3 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 backdrop-blur-sm"
                    placeholder="Enter your email"
                  />
                  {forgotPasswordForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-400">
                      {forgotPasswordForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      forgotPasswordForm.reset();
                    }}
                    className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
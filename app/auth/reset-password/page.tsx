'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

// Enhanced schema with email for direct reset
const resetPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  token: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

// Page component that wraps the content in Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

// Reset password component that handles both direct reset and token-based reset
function ResetPasswordContent() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract email and token from URL if available
  const emailFromUrl = searchParams?.get('email') || '';
  const tokenFromUrl = searchParams?.get('token') || '';
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromUrl,
      password: '',
      confirmPassword: '',
      token: tokenFromUrl,
    }
  });
  
  // Validate token if provided
  useEffect(() => {
    if (emailFromUrl && tokenFromUrl) {
      fetch(`/api/auth/reset-password?email=${encodeURIComponent(emailFromUrl)}&token=${encodeURIComponent(tokenFromUrl)}`)
        .then(res => res.json())
        .then(data => {
          setTokenValid(data.valid === true);
          if (!data.valid) {
            toast.error('Invalid or expired reset link', {
              description: 'Please request a new password reset email.',
              duration: 5000,
            });
          }
        })
        .catch(err => {
          console.error('Token validation error:', err);
          setTokenValid(false);
          toast.error('Could not validate reset link', {
            description: 'Please try again or request a new reset link.',
            duration: 5000,
          });
        });
    }
  }, [emailFromUrl, tokenFromUrl]);

  const onSubmit = async (data: ResetPasswordForm) => {
    setLoading(true);
    try {
      // Check if we have a token from URL
      const payload = {
        password: data.password,
        email: data.email,
        ...(tokenFromUrl ? { token: tokenFromUrl } : {})
      };
      
      // Password update request
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update password');
      }

      toast.success('Password update successful!', {
        description: 'You can now login with your new password.',
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          color: 'white',
          border: 'none',
          fontWeight: '600',
        },
      });

      router.push('/auth');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset password', {
        description: 'Please try again later.',
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
    <div className="min-h-screen bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      {/* Globe background image */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/hero-globe.png"
          alt="Digital Globe Background"
          fill
          className="object-cover object-right"
          quality={100}
          priority
        />
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-emerald-400/20 to-transparent opacity-80 blur-3xl"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
              {emailFromUrl && tokenFromUrl ? (
                <p className="text-teal-100/90">
                  {tokenValid === true ? 
                    "Create your new password below" : 
                    tokenValid === false ?
                    "This reset link is invalid or has expired" :
                    "Verifying your reset link..."}
                </p>
              ) : (
                <p className="text-teal-100/90">
                  Enter your email and new password below
                </p>
              )}
            </div>

            {/* Show form only if token is valid or no token provided */}
            {(tokenValid !== false || !tokenFromUrl) && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      {...register('email')}
                      type="email"
                      id="email"
                      className="w-full px-3 py-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 backdrop-blur-sm"
                      placeholder="Enter your email"
                      disabled={!!emailFromUrl && !!tokenFromUrl}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                  )}
                </div>
              
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      className="w-full px-3 py-3 pr-10 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 backdrop-blur-sm"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? (
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
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      className="w-full px-3 py-3 pr-10 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 backdrop-blur-sm"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                    >
                      {showConfirmPassword ? (
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
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (tokenValid === false && !!tokenFromUrl)}
                  className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                >
                  {loading ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            )}

            {/* Special message when token is invalid */}
            {tokenValid === false && tokenFromUrl && (
              <div className="p-4 my-4 bg-red-900/30 border border-red-500/30 rounded-lg text-center">
                <p className="text-red-200">This password reset link has expired or is invalid.</p>
                <p className="text-white mt-2">Please request a new reset link using the button below.</p>
              </div>
            )}

            <div className="mt-6 text-center">
              <div className="flex flex-col space-y-4">
                <Link
                  href="/auth"
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Back to Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    router.push('/auth');
                    setTimeout(() => {
                      // Open the forgot password dialog after navigation
                      // This is a workaround since we can't directly control auth page state
                      toast.info('Click "Forgot Password" to request a reset link', {
                        description: 'Enter your email to receive a password reset link',
                        duration: 8000,
                      });
                    }, 500);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Request a new reset link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
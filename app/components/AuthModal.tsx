'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export default function AuthModal({ isOpen, onClose, onSuccess, title = "Sign In Required", message = "Please sign in to save resources to your workspace." }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const router = useRouter();

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

  const handleSignIn = async (data: SignInForm) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // Parse response
      let result: any;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        toast.error('Server error. Please try again later.', {
          description: 'Unable to process server response.',
          duration: 5000,
        });
        return;
      }

      if (!response.ok) {
        // Extract error message with helpful descriptions
        const errorMessage = result?.error || result?.message || 'Sign in failed';
        let description = 'Please check your credentials and try again.';
        
        // Provide specific descriptions based on error type
        if (errorMessage.includes('Invalid') || errorMessage.includes('credentials')) {
          description = 'The email or password you entered is incorrect. Please check and try again.';
        } else if (errorMessage.includes('email') && errorMessage.includes('not found')) {
          description = 'No account found with this email. Please sign up first.';
        } else if (errorMessage.includes('verify') || errorMessage.includes('confirmation')) {
          description = 'Please check your email and verify your account before signing in.';
        } else if (errorMessage.includes('Too many requests')) {
          description = 'Too many login attempts. Please wait a few minutes before trying again.';
        }
        
        toast.error(errorMessage, {
          description,
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white',
            border: 'none',
            fontWeight: '600',
          },
        });
        return;
      }

      toast.success('Signed in successfully!', {
        description: 'Welcome back! Redirecting...',
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          color: 'white',
          border: 'none',
          fontWeight: '600',
        },
      });
      onSuccess();
      onClose();
      // Refresh the page to update auth state
      window.location.reload();
    } catch (error) {
      // Extract error message without logging full stack trace
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Only log to console in development or for unexpected errors
      if (process.env.NODE_ENV === 'development' || !errorMessage.includes('Invalid') && !errorMessage.includes('credentials')) {
        console.error('Sign in error:', errorMessage);
      }
      
      toast.error('Sign in failed', {
        description: errorMessage.includes('fetch') || errorMessage.includes('network') 
          ? 'Unable to connect to the server. Please check your internet connection.'
          : 'Please try again later.',
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

  const handleSignUp = async (data: SignUpForm) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // Parse response
      let result: any;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        toast.error('Server error. Please try again later.', {
          description: 'Unable to process server response.',
          duration: 5000,
        });
        return;
      }

      if (!response.ok) {
        // Extract error message with helpful descriptions
        const errorMessage = result?.error || result?.message || 'Sign up failed';
        let description = 'Please check your information and try again.';
        
        // Provide specific descriptions based on error type
        if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
          description = 'An account with this email already exists. Please sign in instead.';
        } else if (errorMessage.includes('password') && errorMessage.includes('short')) {
          description = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('email') && errorMessage.includes('invalid')) {
          description = 'Please enter a valid email address.';
        } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          description = 'Unable to connect to the server. Please check your internet connection.';
        }
        
        toast.error(errorMessage, {
          description,
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white',
            border: 'none',
            fontWeight: '600',
          },
        });
        return;
      }

      toast.success('Account created successfully!', {
        description: 'You can now sign in with your credentials.',
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          color: 'white',
          border: 'none',
          fontWeight: '600',
        },
      });
      // Switch to sign in form after successful signup
      setIsSignUp(false);
      signUpForm.reset();
    } catch (error) {
      // Extract error message without logging full stack trace
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Only log to console in development or for unexpected errors
      if (process.env.NODE_ENV === 'development' || !errorMessage.includes('already exists') && !errorMessage.includes('already registered')) {
        console.error('Sign up error:', errorMessage);
      }
      
      toast.error('Sign up failed', {
        description: errorMessage.includes('fetch') || errorMessage.includes('network')
          ? 'Unable to connect to the server. Please check your internet connection.'
          : 'Please try again later.',
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <p className="text-zinc-300 mb-6">{message}</p>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                !isSignUp
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                isSignUp
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {!isSignUp ? (
            // Sign In Form
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email
                </label>
                <input
                  {...signInForm.register('email')}
                  type="email"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter your email"
                />
                {signInForm.formState.errors.email && (
                  <p className="text-red-400 text-sm mt-1">
                    {signInForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...signInForm.register('password')}
                    type={showSignInPassword ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                  >
                    {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signInForm.formState.errors.password && (
                  <p className="text-red-400 text-sm mt-1">
                    {signInForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign In
              </button>
            </form>
          ) : (
            // Sign Up Form
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Name
                </label>
                <input
                  {...signUpForm.register('name')}
                  type="text"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter your name"
                />
                {signUpForm.formState.errors.name && (
                  <p className="text-red-400 text-sm mt-1">
                    {signUpForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email
                </label>
                <input
                  {...signUpForm.register('email')}
                  type="email"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter your email"
                />
                {signUpForm.formState.errors.email && (
                  <p className="text-red-400 text-sm mt-1">
                    {signUpForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...signUpForm.register('password')}
                    type={showSignUpPassword ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signUpForm.formState.errors.password && (
                  <p className="text-red-400 text-sm mt-1">
                    {signUpForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Account
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/auth"
              className="text-emerald-400 hover:text-emerald-300 text-sm"
              onClick={onClose}
            >
              Go to full auth page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
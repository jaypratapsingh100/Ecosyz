/**
 * Authentication Module
 * Centralized authentication utilities for the application
 * 
 * Usage:
 * - Server-side: import { getCurrentUser, getUid } from '@/lib/auth/server'
 * - Client-side: import { useAuth } from '@/lib/auth/client'
 * - Core utilities: import { ... } from '@/lib/auth/core'
 * - Utils: import { initiateOAuth } from '@/lib/auth/utils'
 */

// Re-export server utilities (most common use case)
export * from './server';

// Re-export core utilities
export * from './core';

// Re-export utility functions
export * from './utils';

/**
 * OpenIdea Design System
 * Minimalistic and systematic UI components
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/ui';

// Design System Constants
export const DESIGN_TOKENS = {
  colors: {
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    accent: {
      emerald: '#10b981',
      cyan: '#06b6d4',
      blue: '#3b82f6',
      purple: '#8b5cf6',
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }
};

// Animation Variants
export const ANIMATION_VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  },
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
};

// Base Components
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<BaseComponentProps> = ({ className, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6',
      'hover:bg-white/10 transition-all duration-200',
      className
    )}
  >
    {children}
  </motion.div>
);

export const Button: React.FC<BaseComponentProps & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}> = ({ 
  className, 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  onClick,
  type = 'button'
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 focus:ring-emerald-500',
    secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20 focus:ring-white/50',
    ghost: 'text-gray-300 hover:text-white hover:bg-white/10 focus:ring-white/50',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.button>
  );
};

export const Input: React.FC<BaseComponentProps & {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}> = ({ className, placeholder, value, onChange, type = 'text' }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={cn(
      'w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg',
      'text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
      'transition-all duration-200',
      className
    )}
  />
);

export const Badge: React.FC<BaseComponentProps & {
  variant?: 'default' | 'success' | 'warning' | 'error';
}> = ({ className, children, variant = 'default' }) => {
  const variantClasses = {
    default: 'bg-white/10 text-gray-300',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/20 text-red-400'
  };
  
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  );
};

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div className={cn('animate-spin rounded-full border-2 border-gray-600 border-t-emerald-400', sizeClasses[size])} />
  );
};

export const EmptyState: React.FC<BaseComponentProps & {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ className, icon, title, description, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn('text-center py-12', className)}
  >
    {icon && (
      <div className="mb-4 flex justify-center">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    {description && (
      <p className="text-gray-400 mb-6 max-w-md mx-auto">{description}</p>
    )}
    {action && action}
  </motion.div>
);

export const Grid: React.FC<BaseComponentProps & {
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
}> = ({ className, children, cols = 3, gap = 'md' }) => {
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  };
  
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-6',
    lg: 'gap-8'
  };
  
  return (
    <div className={cn('grid', colsClasses[cols], gapClasses[gap], className)}>
      {children}
    </div>
  );
};

export const Container: React.FC<BaseComponentProps & {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}> = ({ className, children, maxWidth = 'xl' }) => {
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-8xl',
    full: 'max-w-full'
  };
  
  return (
    <div className={cn('mx-auto px-4 sm:px-6 lg:px-8', maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
};

// Layout Components
export const PageHeader: React.FC<BaseComponentProps & {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ className, title, subtitle, action }) => (
  <div className={cn('mb-8', className)}>
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="text-gray-400 mt-2">{subtitle}</p>
        )}
      </div>
      {action && action}
    </div>
  </div>
);

export const Section: React.FC<BaseComponentProps & {
  title?: string;
  description?: string;
}> = ({ className, children, title, description }) => (
  <section className={cn('mb-12', className)}>
    {(title || description) && (
      <div className="mb-6">
        {title && <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>}
        {description && <p className="text-gray-400">{description}</p>}
      </div>
    )}
    {children}
  </section>
);

// Utility Components
export const Divider: React.FC<BaseComponentProps> = ({ className }) => (
  <hr className={cn('border-white/10', className)} />
);

export const Spacer: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16'
  };
  
  return <div className={sizeClasses[size]} />;
};

// Export all components
export const DesignSystem = {
  Card,
  Button,
  Input,
  Badge,
  LoadingSpinner,
  EmptyState,
  Grid,
  Container,
  PageHeader,
  Section,
  Divider,
  Spacer,
  DESIGN_TOKENS,
  ANIMATION_VARIANTS
};

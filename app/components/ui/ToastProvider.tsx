'use client'

import { Toaster } from 'sonner'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={true}
      richColors={false}
      closeButton={true}
      toastOptions={{
        style: {
          background: 'rgba(12, 35, 33, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px',
          padding: '20px',
          color: 'white',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.1)',
          minWidth: '340px',
          maxWidth: '420px',
          fontFamily: 'var(--font-space-grotesk)',
        },
        classNames: {
          toast: 'glass-toast',
          title: 'text-white font-semibold text-base mb-1',
          description: 'text-gray-100 text-sm leading-relaxed font-normal',
          closeButton: 'text-gray-300 hover:text-emerald-400 transition-colors bg-transparent hover:bg-white/5 rounded-md p-1',
          success: 'border-l-4 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
          error: 'border-l-4 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
          warning: 'border-l-4 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
          info: 'border-l-4 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
        },
      }}
    />
  )
}

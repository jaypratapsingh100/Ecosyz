'use client';

import { ThemeProvider } from './ThemeProvider';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Toaster 
        position="top-right" 
        richColors 
        theme="dark"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#fafafa',
            border: '1px solid #27272a',
          },
        }}
      />
      {children}
    </ThemeProvider>
  );
}
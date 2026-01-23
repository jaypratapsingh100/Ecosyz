import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Providers } from './components/Providers';
import AnalyticsTracker from './components/AnalyticsTracker';
import ToastProvider from './components/ui/ToastProvider';

// Font variable - using CSS fallback instead of Google Fonts to avoid build-time network issues
const spaceGrotesk = {
  variable: '--font-space-grotesk',
};

export const metadata: Metadata = {
  title: 'Open Idea',
  description: "The World&apos;s Open Innovation Infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={spaceGrotesk.variable}>
      <body
        className="antialiased bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] text-white font-sans"
        style={{ margin: 0 }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Providers>
            <ToastProvider />
            <AnalyticsTracker />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

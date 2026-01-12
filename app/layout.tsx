import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Providers } from './components/Providers';
import AnalyticsTracker from './components/AnalyticsTracker';

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
    <html lang="en" suppressHydrationWarning className={spaceGrotesk.variable} style={{ height: '100%', overflow: 'hidden' }}>
      <body
        className="antialiased bg-white text-slate-900 font-sans"
        style={{ height: '100%', overflow: 'hidden', margin: 0 }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Providers>
            <AnalyticsTracker />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Providers } from './components/Providers';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

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
        className="antialiased bg-white text-slate-900 min-h-screen font-sans"
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

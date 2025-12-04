import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Providers } from './components/Providers';

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
    <html lang="en" suppressHydrationWarning>
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

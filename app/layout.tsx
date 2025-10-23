import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './components/Providers';
import Script from 'next/script';

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
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* Force dark theme always */}
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            document.documentElement.classList.add('dark');
          `}
        </Script>
      </head>
      <body className="antialiased bg-[#0d0f11] text-gray-100 min-h-screen font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

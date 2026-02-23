import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Newsletter | Open Idea',
  description: 'Subscribe to the Open Idea newsletter for product updates, AI news, and open innovation.',
};

export default function NewsletterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

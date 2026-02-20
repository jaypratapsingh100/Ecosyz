import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Founder Contact | Open Idea',
  description:
    'Contact Sony Yadav, Founder of Open Idea — Innovation Platform. Phone, email, LinkedIn and downloadable vCard.',
  openGraph: {
    title: 'Founder Contact | Open Idea',
    description:
      'Contact Sony Yadav, Founder of Open Idea — Innovation Platform.',
  },
};

export default function FounderContactLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}

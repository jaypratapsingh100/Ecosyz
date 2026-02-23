import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Problems & Ideas | Open Idea',
  description:
    'Share problems and ideas with the community. Post and comment in our social feed.',
};

export default function ProblemsAndIdeasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

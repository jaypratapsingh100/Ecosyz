import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Developer Architecture | Ecosyz',
  description:
    'Developer architecture docs for Ecosyz have moved under the admin section.',
};

export default function DeveloperArchitectureRedirectPage() {
  redirect('/admin/architecture');
}



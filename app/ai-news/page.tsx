import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import AINewsFeed from './AINewsFeed';

export const metadata = {
  title: 'AI News | Open Idea',
  description: 'Curated AI & tech news with 200-word summaries. Browse by category.',
};

export default function AINewsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a1016]">
      <Header />
      <main className="flex-1">
        <section className="border-b border-[#38bdf8]/10 bg-gradient-to-b from-[#0c2321] to-[#0a1016] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-[#a78bfa] via-[#38bdf8] to-[#0ff0fc] bg-clip-text">
              AI News
            </h1>
            <p className="mt-1 text-teal-200/70 text-sm">
              Curated stories — AI, how to, quantum, India startup, biotech, science &amp; tech. 200-word summaries.
              <Link href="/ai-news/saved" className="ml-2 text-[#38bdf8] hover:underline">Saved</Link>
            </p>
          </div>
        </section>
        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <AINewsFeed />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

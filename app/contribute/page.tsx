'use client';

import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function ContributePage() {
  const contributionWays = [
    {
      icon: '💻',
      title: 'Code Contributions',
      description: 'Fix bugs, add features, improve performance, or refactor code.',
      link: 'https://github.com/Sony17/Ecosyz',
      linkText: 'View on GitHub'
    },
    {
      icon: '📝',
      title: 'Documentation',
      description: 'Improve docs, write tutorials, fix typos, or translate content.',
      link: 'https://github.com/Sony17/Ecosyz',
      linkText: 'Contribute Docs'
    },
    {
      icon: '🐛',
      title: 'Report Bugs',
      description: 'Found a bug? Help us fix it by reporting it with details.',
      link: 'https://github.com/Sony17/Ecosyz/issues/new',
      linkText: 'Report Issue'
    },
    {
      icon: '💡',
      title: 'Feature Ideas',
      description: 'Have an idea? Share it with the community and help shape the future.',
      link: 'https://github.com/Sony17/Ecosyz/issues/new',
      linkText: 'Suggest Feature'
    },
    {
      icon: '🎨',
      title: 'Design & UI',
      description: 'Improve the user experience, design components, or create assets.',
      link: 'https://github.com/Sony17/Ecosyz',
      linkText: 'Design Contributions'
    },
    {
      icon: '🧪',
      title: 'Testing',
      description: 'Write tests, improve test coverage, or help with QA.',
      link: 'https://github.com/Sony17/Ecosyz',
      linkText: 'Improve Tests'
    }
  ];

  const quickStartSteps = [
    {
      step: '1',
      title: 'Fork & Clone',
      description: 'Fork the repository and clone it to your local machine'
    },
    {
      step: '2',
      title: 'Set Up',
      description: 'Install dependencies and configure your environment'
    },
    {
      step: '3',
      title: 'Create Branch',
      description: 'Create a feature branch for your changes'
    },
    {
      step: '4',
      title: 'Make Changes',
      description: 'Write code, add tests, and update documentation'
    },
    {
      step: '5',
      title: 'Submit PR',
      description: 'Push your changes and open a pull request'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <main className="flex-grow relative">
        {/* Globe background image */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/hero-globe.png"
            alt="Digital Globe Background"
            fill
            className="object-cover object-right opacity-30"
            quality={100}
            priority
          />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
        </div>
        
        {/* Hero Section */}
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 z-10">
          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Contribute to Open Idea
              </span>
            </h1>
            <p className="text-xl text-teal-100/90 mb-8 max-w-2xl mx-auto">
              Help build the world&apos;s open innovation infrastructure. Every contribution, big or small, makes a difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/Sony17/Ecosyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg transition hover:scale-105"
              >
                <i className="fab fa-github mr-2" />
                View on GitHub
              </a>
              <Link
                href="/docs/contributing"
                className="inline-block px-8 py-3 bg-transparent border-2 border-indigo-400/50 text-indigo-400 font-semibold rounded-lg transition hover:scale-105 hover:bg-indigo-400/10"
              >
                Read Contributing Guide
              </Link>
            </div>
          </div>
        </section>

        {/* Ways to Contribute */}
        <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-12">
              Ways to Contribute
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contributionWays.map((way, idx) => (
                <div
                  key={idx}
                  className="glass glass-border rounded-xl p-6 hover:border-indigo-400/50 transition-all duration-300 hover:scale-105"
                >
                  <div className="text-4xl mb-4">{way.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{way.title}</h3>
                  <p className="text-teal-200/70 mb-4">{way.description}</p>
                  <a
                    href={way.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-2 transition"
                  >
                    {way.linkText}
                    <i className="fas fa-arrow-right text-sm" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-12">
              Quick Start Guide
            </h2>
            <div className="space-y-6">
              {quickStartSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex gap-6 items-start glass glass-border rounded-xl p-6 hover:border-indigo-400/50 transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {step.step}
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-teal-200/70">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <a
                href="https://github.com/Sony17/Ecosyz/blob/main/docs/contributing.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 bg-transparent border-2 border-indigo-400/50 text-indigo-400 font-semibold rounded-lg transition hover:scale-105 hover:bg-indigo-400/10"
              >
                Read Full Guide
              </a>
            </div>
          </div>
        </section>

        {/* Code of Conduct & License */}
        <section className="relative py-16 px-4 sm:px-6 lg:px-8 z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Open Source Values</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="glass glass-border rounded-xl p-6">
                <div className="text-3xl mb-4">🤝</div>
                <h3 className="text-xl font-semibold text-white mb-2">Collaborative</h3>
                <p className="text-teal-200/70">
                  We believe in working together to build something greater than the sum of its parts.
                </p>
              </div>
              <div className="glass glass-border rounded-xl p-6">
                <div className="text-3xl mb-4">🌍</div>
                <h3 className="text-xl font-semibold text-white mb-2">Open</h3>
                <p className="text-teal-200/70">
                  Licensed under AGPL-3.0, ensuring the code remains free and open for everyone.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/Sony17/Ecosyz/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition"
              >
                View License (AGPL-3.0)
              </a>
              <span className="text-teal-200/50">•</span>
              <a
                href="https://github.com/Sony17/Ecosyz/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition"
              >
                Browse Issues
              </a>
              <span className="text-teal-200/50">•</span>
              <a
                href="https://discord.gg/4weahHXQYY"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition"
              >
                Join Discord
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


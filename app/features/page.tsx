'use client';

import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function FeaturesPage() {
  const features = [
    {
      title: 'Resources',
      description: 'Access a vast collection of open-source resources including papers, datasets, code, models, hardware, and videos from multiple providers.',
      href: '/openresources',
      icon: '📚',
      color: 'from-emerald-400 to-cyan-400',
      borderColor: 'border-emerald-400/50',
      hoverColor: 'hover:bg-emerald-400/10 hover:border-emerald-400',
    },
    {
      title: 'Projects',
      description: 'Discover and explore innovative open-source projects built by the community. Share your own projects and collaborate with others.',
      href: '/projects',
      icon: '🚀',
      color: 'from-cyan-400 to-blue-400',
      borderColor: 'border-cyan-400/50',
      hoverColor: 'hover:bg-cyan-400/10 hover:border-cyan-400',
    },
    {
      title: 'Community',
      description: 'Join a vibrant community of innovators, developers, and creators. Connect, collaborate, and grow together.',
      href: '/community',
      icon: '👥',
      color: 'from-blue-400 to-indigo-400',
      borderColor: 'border-blue-400/50',
      hoverColor: 'hover:bg-blue-400/10 hover:border-blue-400',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
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

          <div className="relative z-10 text-white">
          {/* Hero Section */}
          <section className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
                Features
              </h1>
              <p className="text-xl sm:text-2xl text-teal-100/90 max-w-2xl mx-auto font-medium">
                Everything you need to innovate, collaborate, and build the future
              </p>
            </div>
          </section>

          {/* Features Grid */}
          <section className="relative py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                {features.map((feature, idx) => (
                  <Link
                    key={idx}
                    href={feature.href}
                    className={`group rounded-xl glass glass-border p-8 flex flex-col items-center text-center transition-all duration-300 ${feature.borderColor} ${feature.hoverColor} hover:scale-105`}
                  >
                    <div className={`text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">
                      {feature.title}
                    </h2>
                    <p className="text-teal-200/70 mb-6 flex-grow">
                      {feature.description}
                    </p>
                    <div className={`w-full px-6 py-3 rounded-lg bg-transparent border-2 ${feature.borderColor} text-cyan-400 font-semibold transition-all duration-300 group-hover:bg-gradient-to-r ${feature.color} group-hover:text-gray-900 group-hover:border-transparent`}>
                      Explore {feature.title}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Additional Info Section */}
          <section className="relative py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="glass glass-border rounded-xl p-8 bg-black/30 backdrop-blur-sm border-emerald-400/30">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  All Features, One Platform
                </h2>
                <p className="text-lg text-teal-100/80 mb-6">
                  Open Idea brings together resources, projects, and community in one unified platform. 
                  Whether you're searching for datasets, exploring projects, or connecting with innovators, 
                  everything you need is right here.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/chat"
                    className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold rounded-lg shadow-lg transition hover:scale-105"
                  >
                    Try Chat Search
                  </Link>
                  <Link
                    href="/about"
                    className="px-8 py-3 bg-transparent border-2 border-cyan-400/50 text-cyan-400 font-semibold rounded-lg transition hover:scale-105 hover:bg-cyan-400/10 hover:border-cyan-400"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


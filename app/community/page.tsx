'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Container } from '../components/ui/Container';
import Image from 'next/image';
import CommunityGroups from '../components/community/CommunityGroups';
import EventsList from '../components/community/EventsList';
import ChallengesList from '../components/community/ChallengesList';
import ActivityFeed from '../components/community/ActivityFeed';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'events' | 'challenges' | 'activity'>('groups');

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
          <Container>
            <div className="relative z-10 py-16 text-white">
              <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-2 tracking-tight text-center uppercase">
                    Join Our Community
                  </h2>
                  <p className="text-lg text-teal-100/80 font-medium max-w-2xl mx-auto">
                    Connect with open-source builders, researchers, and innovators from 100+ countries. Share ideas, get help, and grow together!
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap justify-center gap-4 mb-8 border-b border-teal-400/20">
                  <button
                    onClick={() => setActiveTab('groups')}
                    className={`px-6 py-3 font-semibold transition ${
                      activeTab === 'groups'
                        ? 'text-cyan-300 border-b-2 border-cyan-400'
                        : 'text-teal-100/60 hover:text-cyan-300'
                    }`}
                  >
                    Groups
                  </button>
                  <button
                    onClick={() => setActiveTab('events')}
                    className={`px-6 py-3 font-semibold transition ${
                      activeTab === 'events'
                        ? 'text-emerald-300 border-b-2 border-emerald-400'
                        : 'text-teal-100/60 hover:text-emerald-300'
                    }`}
                  >
                    Events
                  </button>
                  <button
                    onClick={() => setActiveTab('challenges')}
                    className={`px-6 py-3 font-semibold transition ${
                      activeTab === 'challenges'
                        ? 'text-purple-300 border-b-2 border-purple-400'
                        : 'text-teal-100/60 hover:text-purple-300'
                    }`}
                  >
                    Challenges
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`px-6 py-3 font-semibold transition ${
                      activeTab === 'activity'
                        ? 'text-blue-300 border-b-2 border-blue-400'
                        : 'text-teal-100/60 hover:text-blue-300'
                    }`}
                  >
                    Activity Feed
                  </button>
                </div>

                {/* Tab Content */}
                <div className="mt-8">
                  {activeTab === 'groups' && <CommunityGroups />}
                  {activeTab === 'events' && <EventsList />}
                  {activeTab === 'challenges' && <ChallengesList />}
                  {activeTab === 'activity' && <ActivityFeed />}
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

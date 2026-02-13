'use client';

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Container } from '../../components/ui/Container';
import Image from 'next/image';
import EventsList from '../../components/community/EventsList';

export default function EventsPage() {
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
                    Community Events
                  </h2>
                  <p className="text-lg text-teal-100/80 font-medium max-w-2xl mx-auto">
                    Discover workshops, webinars, hackathons, and meetups happening in the community
                  </p>
                </div>

                <div className="mt-8">
                  <EventsList />
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

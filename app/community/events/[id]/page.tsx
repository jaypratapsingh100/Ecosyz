'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { Container } from '../../../components/ui/Container';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  eventUrl?: string;
  category?: string;
  imageUrl?: string;
  maxAttendees?: number;
  isPublic: boolean;
  creator: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  registrations: Array<{
    id: string;
    status: string;
    registeredAt: string;
    user: {
      id: string;
      name?: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
  _count: {
    registrations: number;
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/community/events/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Event not found');
          router.push('/community/events');
          return;
        }
        throw new Error('Failed to fetch event');
      }
      const data = await res.json();
      setEvent(data);
      
      // Check if current user is registered
      checkRegistration(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const checkRegistration = async (eventData: Event) => {
    try {
      // Check if current user is in registrations list
      // Note: This is a simplified check - you might want to get current user ID from session
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const session = await res.json();
        if (session.user) {
          const userRegistered = eventData.registrations.some(
            (reg) => reg.user.email === session.user.email
          );
          setIsRegistered(userRegistered);
        }
      }
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  const handleRegister = async () => {
    if (!event) return;
    
    setIsRegistering(true);
    try {
      const res = await fetch(`/api/community/events/${event.id}/register`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register for event');
      }

      toast.success('Successfully registered for event!');
      setIsRegistered(true);
      fetchEvent(); // Refresh event data
    } catch (error: any) {
      toast.error(error.message || 'Failed to register for event');
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading event...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Event not found</h2>
            <Link href="/community/events" className="text-cyan-400 hover:text-cyan-300">
              Back to Events
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;
  const isUpcoming = startDate > new Date();
  const isPast = endDate ? endDate < new Date() : startDate < new Date();

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

          {/* Event Banner */}
          {event.imageUrl && (
            <div className="h-64 w-full relative z-10">
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <Container>
            <div className="relative z-10 py-8 text-white">
              {/* Back Button */}
              <Link
                href="/community/events"
                className="inline-flex items-center gap-2 text-teal-100/80 hover:text-cyan-400 transition mb-6"
              >
                <span>←</span>
                <span>Back to Events</span>
              </Link>

              {/* Event Header */}
              <div className="mb-8">
                <div className="flex items-start justify-between gap-6 mb-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      {event.category && (
                        <span className="px-3 py-1 text-sm bg-purple-400/20 text-purple-300 rounded-lg">
                          {event.category}
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="px-3 py-1 text-sm bg-emerald-400/20 text-emerald-300 rounded-lg">
                          Upcoming
                        </span>
                      )}
                      {isPast && (
                        <span className="px-3 py-1 text-sm bg-zinc-400/20 text-zinc-300 rounded-lg">
                          Past Event
                        </span>
                      )}
                    </div>
                    <h1 className="text-4xl font-bold text-cyan-300 mb-4">{event.title}</h1>
                    <p className="text-teal-100/80 text-lg mb-6">{event.description}</p>
                  </div>
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="glass-card glass-border p-6 rounded-xl">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">📅</span>
                        <div>
                          <div className="text-sm text-teal-100/60 mb-1">Date & Time</div>
                          <div className="text-teal-100 font-medium">
                            {startDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-sm text-teal-100/80">
                            {startDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                            {endDate && (
                              <>
                                {' - '}
                                {endDate.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </>
                            )}
                          </div>
                          {endDate && endDate.toDateString() !== startDate.toDateString() && (
                            <div className="text-sm text-teal-100/80 mt-1">
                              Ends: {endDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {event.location && (
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">📍</span>
                          <div>
                            <div className="text-sm text-teal-100/60 mb-1">Location</div>
                            <div className="text-teal-100 font-medium">{event.location}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <span className="text-2xl">👥</span>
                        <div>
                          <div className="text-sm text-teal-100/60 mb-1">Registrations</div>
                          <div className="text-teal-100 font-medium">
                            {event._count.registrations}
                            {event.maxAttendees && ` / ${event.maxAttendees}`} registered
                          </div>
                          {event.maxAttendees && (
                            <div className="text-xs text-teal-100/60 mt-1">
                              {event.maxAttendees - event._count.registrations} spots remaining
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="text-2xl">👤</span>
                        <div>
                          <div className="text-sm text-teal-100/60 mb-1">Organized by</div>
                          <div className="text-teal-100 font-medium">
                            {event.creator.name || event.creator.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Panel */}
                  <div className="glass-card glass-border p-6 rounded-xl">
                    <div className="space-y-4">
                      {isUpcoming && !isRegistered && (
                        <button
                          onClick={handleRegister}
                          disabled={isRegistering || (event.maxAttendees && event._count.registrations >= event.maxAttendees)}
                          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-400 to-emerald-400 text-gray-900 font-semibold rounded-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRegistering
                            ? 'Registering...'
                            : event.maxAttendees && event._count.registrations >= event.maxAttendees
                            ? 'Event Full'
                            : 'Register for Event'}
                        </button>
                      )}

                      {isRegistered && (
                        <div className="px-6 py-3 bg-emerald-400/20 border border-emerald-400/50 text-emerald-300 rounded-lg text-center font-medium">
                          ✓ You're registered for this event
                        </div>
                      )}

                      {event.eventUrl && (
                        <a
                          href={event.eventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full px-6 py-3 border border-teal-400/20 text-teal-100/80 font-medium rounded-lg hover:bg-teal-400/10 transition text-center"
                        >
                          Visit Event Page →
                        </a>
                      )}

                      <button
                        onClick={() => setShowRegistrations(!showRegistrations)}
                        className="w-full px-6 py-3 border border-teal-400/20 text-teal-100/80 font-medium rounded-lg hover:bg-teal-400/10 transition"
                      >
                        {showRegistrations ? 'Hide' : 'Show'} Registrations ({event._count.registrations})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Registrations List */}
                {showRegistrations && event.registrations.length > 0 && (
                  <div className="glass-card glass-border p-6 rounded-xl mb-6">
                    <h3 className="text-xl font-semibold text-cyan-300 mb-4">
                      Registered Participants ({event._count.registrations})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {event.registrations.map((registration) => (
                        <div
                          key={registration.id}
                          className="glass-card glass-border p-4 rounded-lg flex items-center gap-3"
                        >
                          {registration.user.avatarUrl ? (
                            <img
                              src={registration.user.avatarUrl}
                              alt={registration.user.name || registration.user.email}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-sm font-bold text-gray-900 flex-shrink-0">
                              {(registration.user.name || registration.user.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-cyan-300 truncate">
                              {registration.user.name || registration.user.email}
                            </p>
                            <p className="text-xs text-teal-100/60">
                              Registered {new Date(registration.registeredAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

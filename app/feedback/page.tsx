import Header from '../components/Header';
import Footer from '../components/Footer';
import FeedbackForm from '../components/FeedbackForm';
import Image from 'next/image';

export default function FeedbackPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <main className="flex-grow relative flex items-center justify-center p-6">
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

        <div className="relative z-10 w-full max-w-2xl">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">We value your feedback</h1>
          <FeedbackForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}

import Header from '../components/Header';
import Footer from '../components/Footer';
import Image from 'next/image';

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-[60vh]">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt=""
              fill
              className="object-cover object-right opacity-30"
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-[#38bdf8]/20 to-transparent opacity-80 blur-3xl" />
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-[#38bdf8] via-[#0ff0fc] to-[#a78bfa] bg-clip-text mb-2">
              Cookie Policy
            </h1>
            <p className="text-teal-200/60 text-sm mb-8">Last updated: February 2026</p>
            <div className="glass glass-border rounded-xl p-6 sm:p-8 space-y-6 border-[#38bdf8]/20">
              <section>
                <h2 className="text-lg font-semibold text-[#38bdf8] mb-2">1. What Are Cookies</h2>
                <p className="text-teal-100/80 text-sm leading-relaxed">Cookies are small text files stored on your device when you visit our site. They help us provide a better experience.</p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-[#38bdf8] mb-2">2. Cookies We Use</h2>
                <p className="text-teal-100/80 text-sm leading-relaxed">We use session cookies for authentication, preferences, and analytics. Essential cookies are required for the site to function. Optional cookies may be used with your consent.</p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-[#38bdf8] mb-2">3. Your Choices</h2>
                <p className="text-teal-100/80 text-sm leading-relaxed">You can disable cookies in your browser settings, though some features may not work correctly. Essential cookies cannot be disabled.</p>
              </section>
              <section>
                <h2 className="text-lg font-semibold text-[#38bdf8] mb-2">4. Contact</h2>
                <p className="text-teal-100/80 text-sm leading-relaxed">For cookie-related questions, contact us at <a href="mailto:info@openidea.world" className="text-[#38bdf8] hover:text-[#0ff0fc] transition-colors underline">info@openidea.world</a>.</p>
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

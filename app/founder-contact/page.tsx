'use client';

import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Linkedin, Download } from 'lucide-react';

const FOUNDER = {
  name: 'Sony Yadav',
  phone: '7838832332',
  email: 'sohni2012@gmail.com',
  linkedin: 'https://www.linkedin.com/in/sonyy',
  companyEmail: 'info@openidea.world',
};
const CONTACT_CARD_DOWNLOAD = '/founder/contact-card.png';
// LinkedIn first so WhatsApp shows profile preview (photo + card) when message is sent
const WHATSAPP_MESSAGE = [
  FOUNDER.linkedin,
  '',
  'Sony Yadav — Founder, Open Idea',
  `Phone: ${FOUNDER.phone}`,
  `Email: ${FOUNDER.email}`,
  `Company: ${FOUNDER.companyEmail}`,
  'Company: https://openidea.world',
  'Company LinkedIn: https://www.linkedin.com/company/110214398',
].join('\n');
const WHATSAPP_URL = `https://wa.me/91${FOUNDER.phone}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export default function FounderContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />

      <main className="flex-grow py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Page context — founder LinkedIn first */}
          <header className="text-center mb-10 sm:mb-14">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              Founder Contact
            </h1>
            <p className="text-teal-200/80 text-sm sm:text-base max-w-md mx-auto mb-3">
              <Link
                href={FOUNDER.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <Linkedin className="w-4 h-4" />
                {FOUNDER.name} — LinkedIn
              </Link>
            </p>
            <p className="text-teal-200/80 text-sm sm:text-base max-w-md mx-auto mb-2">
              Scan the QR code to message on WhatsApp, or use the card and links below to connect with Open Idea.
            </p>
            <p className="text-teal-200/70 text-sm">
              Company: <a href={`mailto:${FOUNDER.companyEmail}`} className="text-emerald-400 hover:text-emerald-300">{FOUNDER.companyEmail}</a>
            </p>
          </header>

          {/* Three cards: equal width, fully visible */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {/* 1. Green WhatsApp QR */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl glass glass-border border-emerald-500/20 min-h-[220px] sm:min-h-[260px]">
              <QRCodeSVG
                value={WHATSAPP_URL}
                size={140}
                level="H"
                includeMargin={false}
                bgColor="transparent"
                fgColor="#10b981"
              />
              <span className="mt-4 text-xs font-medium text-emerald-400/90 uppercase tracking-wider">
                Message on WhatsApp
              </span>
            </div>

            {/* 2. Contact card image - full visibility, downloadable */}
            <div className="flex flex-col rounded-2xl glass glass-border border-white/10 overflow-hidden">
              <div className="relative w-full aspect-[4/3] sm:aspect-auto sm:min-h-[220px] flex-1">
                <Image
                  src={CONTACT_CARD_DOWNLOAD}
                  alt="Sony Yadav — Founder contact card with details"
                  fill
                  className="object-contain p-1"
                  sizes="(max-width: 640px) 100vw, 280px"
                  priority
                />
              </div>
              <a
                href={CONTACT_CARD_DOWNLOAD}
                download={`${FOUNDER.name.replace(/\s+/g, '-')}-Open-Idea-Contact-Card.png`}
                className="inline-flex items-center justify-center gap-2 py-3 text-sm font-medium text-teal-200 hover:text-emerald-400 hover:bg-white/5 transition"
              >
                <Download className="w-4 h-4" />
                Download card
              </a>
            </div>

            {/* 3. Open Idea logo image - full visibility */}
            <div className="relative w-full aspect-[4/3] sm:aspect-auto sm:min-h-[260px] rounded-2xl overflow-hidden glass glass-border border-white/10">
              <Image
                src="/founder/open-idea-logo.png"
                alt="Open Idea — Innovation Platform"
                fill
                className="object-contain p-1"
                sizes="(max-width: 640px) 100vw, 280px"
                priority
              />
            </div>
          </div>

          {/* Optional short note */}
          <p className="text-center text-teal-300/60 text-sm mt-8 max-w-xl mx-auto">
            Open Idea is an innovation platform. Reach out for partnerships, press, or general inquiries.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

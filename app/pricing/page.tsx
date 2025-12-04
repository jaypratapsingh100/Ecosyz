
'use client'

import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'



function Tier({ title, price, description, features, ctaHref, isPopular }: {
  title: string;
  price: string;
  description: string;
  features: string[];
  ctaHref?: string;
  isPopular?: boolean;
}) {
  return (
    <div className={`p-8 rounded-xl flex flex-col border ${
      isPopular 
        ? 'border-emerald-500 bg-emerald-500/10' 
        : 'border-gray-700 hover:border-gray-600'
    } transition-all duration-300`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-emerald-500 text-xs font-medium px-3 py-1 rounded-full text-white">
            Most popular
          </span>
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-white">{price}</span>
          {price !== 'Custom' && <span className="text-gray-400 ml-1">/month</span>}
        </div>
      </div>
      <ul className="space-y-3 text-sm flex-1 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3 items-start text-gray-300">
            <svg className="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M7.75 12.75L10 15.25L16.25 8.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {price === 'Free' ? (
        <Link 
          href={ctaHref || '/auth?plan=free'}
          className={`w-full text-center px-4 py-3 rounded-md font-medium transition-all duration-300 ${
            isPopular
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-white text-gray-900 hover:bg-gray-100'
          }`}
        >
          Get Started
        </Link>
      ) : (
        <Link 
          href={ctaHref || '/auth'}
          className={`w-full text-center px-4 py-3 rounded-md font-medium transition-all duration-300 ${
            isPopular
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-white text-gray-900 hover:bg-gray-100'
          }`}
        >
          {ctaHref?.includes('contact') ? 'Contact Sales' : 'Get Started'}
        </Link>
      )}
    </div>
  );
}


export default function PricingPage() {
  const tiers = [
    {
      title: "Free",
      price: "₹0",
      description: "Basic access for individuals getting started",
      features: [
        "3 workspaces",
        "Basic AI search capabilities",
        "Public knowledge graph access",
        "Standard support",
        "Community features",
        "1GB storage per workspace"
      ],
      cta: "Get started",
      ctaHref: "/auth?plan=free"
    },
    {
      title: "Plus",
      price: "₹999",
      description: "Enhanced capabilities for power users",
      features: [
        "Everything in Free",
        "Unlimited workspaces",
        "Advanced AI research tools",
        "Full knowledge graph access",
        "Priority support",
        "5GB storage per workspace",
        "API access (100K requests/month)"
      ],
      cta: "Upgrade to Plus",
      ctaHref: "/auth?plan=plus",
      isPopular: true
    },
    {
      title: "Enterprise",
      price: "Custom",
      description: "Advanced features for organizations",
      features: [
        "Everything in Plus",
        "Custom workspace limits",
        "Dedicated support",
        "Custom AI model training",
        "Advanced security & compliance",
        "Unlimited storage",
        "Custom API limits",
        "SSO & team management"
      ],
      cta: "Contact sales",
      ctaHref: "/contact?enquiry=enterprise"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-white mb-3">
            Get Access to Open Idea
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Simple, transparent pricing that grows with you. Try any plan free for 14 days.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto relative">
          {tiers.map((tier) => (
            <Tier key={tier.title} {...tier} />
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <p className="text-sm text-gray-400">
            Have questions about pricing? <Link href="/contact" className="text-emerald-500 hover:text-emerald-400">Talk to us</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

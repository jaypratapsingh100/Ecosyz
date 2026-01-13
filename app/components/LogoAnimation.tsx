'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LogoAnimationProps {
  onComplete: () => void;
}

export default function LogoAnimation({ onComplete }: LogoAnimationProps) {
  const [scale, setScale] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [glow, setGlow] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate particles
    const particleArray = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 1000
    }));
    setParticles(particleArray);

    // Scale up animation with bounce
    const scaleTimer = setTimeout(() => {
      setScale(1);
    }, 100);

    // Fade in animation
    const opacityTimer = setTimeout(() => {
      setOpacity(1);
    }, 200);

    // Rotation animation
    let rotationValue = 0;
    const rotationInterval = setInterval(() => {
      rotationValue += 2;
      setRotation(rotationValue);
      if (rotationValue >= 360) {
        rotationValue = 0;
      }
    }, 50);

    // Glow pulse animation
    const glowInterval = setInterval(() => {
      setGlow((prev) => (prev === 1 ? 0.3 : 1));
    }, 800);

    // Complete animation after 2.5 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(scaleTimer);
      clearTimeout(opacityTimer);
      clearInterval(rotationInterval);
      clearInterval(glowInterval);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
      {/* Animated particles background */}
      <div className="absolute inset-0">
        {particles.map((particle) => {
          const duration = 2 + Math.random() * 2;
          return (
            <div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full bg-emerald-400/30"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationName: 'floatParticle',
                animationDuration: `${duration}s`,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDelay: `${particle.delay}ms`,
              }}
            />
          );
        })}
      </div>

      <div
        className="flex flex-col items-center justify-center transition-all duration-1000 ease-out"
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          opacity: opacity,
          width: '50vw',
          height: '50vh',
        }}
      >
        <div
          className="relative w-full h-full transition-all duration-1000"
          style={{
            filter: `
              drop-shadow(0 0 ${80 + glow * 60}px rgba(16, 185, 129, ${0.5 + glow * 0.3}))
              drop-shadow(0 0 ${120 + glow * 80}px rgba(6, 182, 212, ${0.3 + glow * 0.2}))
              drop-shadow(0 0 ${40 + glow * 30}px rgba(139, 92, 246, ${0.4 + glow * 0.2}))
            `,
            animationName: 'logoPulse',
            animationDuration: '2s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
        >
          <Image
            src="/logo.png"
            alt="Open Idea Logo"
            fill
            className="object-contain"
            priority
            style={{
              animationName: 'logoRotate',
              animationDuration: '3s',
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes floatParticle {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px) scale(1.2);
            opacity: 0.8;
          }
        }

        @keyframes logoPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes logoRotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-5deg);
          }
          75% {
            transform: rotate(5deg);
          }
        }

      `}</style>
    </div>
  );
}






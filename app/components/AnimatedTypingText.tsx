'use client';

import { useState, useEffect } from 'react';

interface AnimatedTypingTextProps {
  phrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseTime?: number;
  className?: string;
}

export default function AnimatedTypingText({
  phrases,
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseTime = 2000,
  className = '',
}: AnimatedTypingTextProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, pauseTime);
      return () => clearTimeout(pauseTimer);
    }

    const currentPhrase = phrases[currentPhraseIndex];
    const speed = isDeleting ? deletingSpeed : typingSpeed;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < currentPhrase.length) {
          setCurrentText(currentPhrase.substring(0, currentText.length + 1));
        } else {
          // Finished typing, pause before deleting
          setIsPaused(true);
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.substring(0, currentText.length - 1));
        } else {
          // Finished deleting, move to next phrase
          setIsDeleting(false);
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, isPaused, currentPhraseIndex, phrases, typingSpeed, deletingSpeed, pauseTime]);

  return (
    <div className={`${className}`}>
      <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent font-extrabold">
        {currentText}
        <span className="text-emerald-400 ml-1 inline-block animate-blink">
          |
        </span>
      </span>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Meddon, Eagle_Lake, Fredericka_the_Great } from 'next/font/google';
import AnimatedLogo from '@/components/AnimatedLogo';
import styles from './IntroScreen.module.css';

const meddon = Meddon({ weight: '400', subsets: ['latin'] });
const eagleLake = Eagle_Lake({ weight: '400', subsets: ['latin'] });
const fredericka = Fredericka_the_Great({ weight: '400', subsets: ['latin'] });

interface IntroScreenProps {
  onProceed?: () => void;
  proceedHref?: string;
  isDismissed?: boolean;
}

export default function IntroScreen({ onProceed, proceedHref, isDismissed = false }: IntroScreenProps) {
  const [stage, setStage] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // Skip mechanism triggered by clicking anywhere or pressing any key
  useEffect(() => {
    const handleInteraction = (e: MouseEvent | KeyboardEvent) => {
      // Don't skip if the user clicked the proceed link/button directly
      if (e.target && (e.target as HTMLElement).closest(`.${styles.proceedLink}`)) {
        return;
      }
      
      setIsSkipped(true);
      setStage(5);
      
      // Stop all timers
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Sequential animation triggers
  useEffect(() => {
    if (isSkipped || isDismissed) return;

    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 1300),
      setTimeout(() => setStage(3), 3600),
      setTimeout(() => setStage(4), 4800),
      setTimeout(() => setStage(5), 5800),
    ];

    timersRef.current = timers;

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [isSkipped, isDismissed]);

  const showHi = stage >= 1;
  const showIm = stage >= 2;
  const startDrawing = stage >= 2;
  const showICreate = stage >= 3;
  const isFlipped = stage >= 4;
  const showAmbigrams = stage >= 4;
  const showProceed = stage >= 5;

  const renderProceedButton = () => {
    const className = `${styles.proceedLink} ${showProceed ? styles.show : ''}`;
    
    const content = (
      <div className={styles.proceedCircle}>
        <svg 
          className={styles.arrowSvg} 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </div>
    );

    if (proceedHref) {
      return (
        <Link href={proceedHref} className={className}>
          {content}
        </Link>
      );
    }

    return (
      <button className={className} onClick={onProceed}>
        {content}
      </button>
    );
  };

  return (
    <div className={`${styles.introOverlay} ${isDismissed ? styles.dismissed : ''}`}>
      <div className={styles.contentWrapper}>
        <h1 className={styles.introText}>
          <span className={`${styles.scriptText} ${showHi ? styles.show : ''} ${fredericka.className} ${styles.hiGreeting}`}>
            Hi!
          </span>
          <span className={`${styles.scriptText} ${showIm ? styles.show : ''} ${meddon.className}`}>
            I&apos;m
          </span>
        </h1>
        
        <div className={styles.logoWrapper}>
          <AnimatedLogo 
            startDrawing={startDrawing}
            isFlipped={isFlipped}
          />
        </div>

        <p className={styles.subText}>
          <span className={`${styles.scriptText} ${showICreate ? styles.show : ''} ${meddon.className}`}>
            I like 
          </span>
          <span className={`${styles.ambigramsText} ${showAmbigrams ? styles.show : ''} ${eagleLake.className}`}>
            ambigrams
          </span>
        </p>
      </div>

      {renderProceedButton()}
    </div>
  );
}

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
  const [showHi, setShowHi] = useState(false);
  const [showIm, setShowIm] = useState(false);
  const [startDrawing, setStartDrawing] = useState(false);
  const [isDrawn, setIsDrawn] = useState(false);
  const [showICreate, setShowICreate] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAmbigrams, setShowAmbigrams] = useState(false);
  const [showProceed, setShowProceed] = useState(false);
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
      
      // Stop all timers
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      
      // Instantly reveal all states
      setShowHi(true);
      setShowIm(true);
      setStartDrawing(true);
      setIsDrawn(true);
      setShowICreate(true);
      setIsFlipped(true);
      setShowAmbigrams(true);
      setShowProceed(true);
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
      setTimeout(() => setShowHi(true), 300),
      setTimeout(() => setShowIm(true), 1300),
      setTimeout(() => setStartDrawing(true), 1300),
      setTimeout(() => setIsDrawn(true), 3300),
      setTimeout(() => setShowICreate(true), 3600),
      setTimeout(() => setIsFlipped(true), 4800),
      setTimeout(() => setShowAmbigrams(true), 4800),
      setTimeout(() => {
        setShowProceed(true);
      }, 5800),
    ];

    timersRef.current = timers;

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [isSkipped, isDismissed]);

  const renderProceedButton = () => {
    if (proceedHref) {
      return (
        <Link 
          href={proceedHref} 
          className={`${styles.proceedLink} ${showProceed ? styles.show : ''}`}
        >
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
        </Link>
      );
    }

    return (
      <button 
        className={`${styles.proceedLink} ${showProceed ? styles.show : ''}`} 
        onClick={onProceed}
      >
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
            isDrawn={isDrawn}
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

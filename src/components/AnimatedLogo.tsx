'use client';

import React from 'react';
import styles from './AnimatedLogo.module.css';

interface AnimatedLogoProps {
  className?: string;
  isFlipped?: boolean;
  startDrawing?: boolean;
  isDrawn?: boolean;
}

export default function AnimatedLogo({ 
  className, 
  isFlipped = false, 
  startDrawing = false, 
  isDrawn = false 
}: AnimatedLogoProps) {
  const flipClass = isFlipped ? styles.flipped : '';
  const drawClass = startDrawing ? styles.drawing : '';
  const drawnClass = isDrawn ? styles.drawn : '';

  return (
    <div className={`${styles.logoContainer} ${flipClass} ${drawClass} ${drawnClass} ${className || ''}`}>
      <div className={styles.logoImage} aria-label="Upayan Ambigram Logo" />
    </div>
  );
}

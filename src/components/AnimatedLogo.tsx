'use client';

import React from 'react';
import styles from './AnimatedLogo.module.css';

interface AnimatedLogoProps {
  className?: string;
  isFlipped?: boolean;
  startDrawing?: boolean;
}

export default function AnimatedLogo({ 
  className, 
  isFlipped = false, 
  startDrawing = false
}: AnimatedLogoProps) {
  const flipClass = isFlipped ? styles.flipped : '';
  const drawClass = startDrawing ? styles.drawing : '';

  return (
    <div className={`${styles.logoContainer} ${flipClass} ${drawClass} ${className || ''}`}>
      <div className={styles.logoImage} aria-label="Upayan Ambigram Logo" />
    </div>
  );
}

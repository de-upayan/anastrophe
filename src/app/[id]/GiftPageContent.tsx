'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Meddon, Eagle_Lake } from 'next/font/google';
import IntroScreen from '@/components/IntroScreen';
import { AmbigramItem } from '@/lib/types';
import styles from './page.module.css';

const meddon = Meddon({ weight: '400', subsets: ['latin'], adjustFontFallback: false });
const eagleLake = Eagle_Lake({ weight: '400', subsets: ['latin'], adjustFontFallback: false });

interface GiftPageContentProps {
  initialItem: AmbigramItem | null;
}

export default function GiftPageContent({ initialItem }: GiftPageContentProps) {
  const searchParams = useSearchParams();
  const recipientOverride = searchParams.get('recipient');

  // Gift Overlay State
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  // Ambigram interaction states
  const [isRotated, setIsRotated] = useState(false);
  const [isTimelapseOpen, setIsTimelapseOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const [password, setPassword] = useState('');
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to retrieve or initialize a persistent, unique device tracking ID
  const getOrCreateViewerId = (): string => {
    if (typeof window === 'undefined') return 'anonymous';
    let id = localStorage.getItem('visitor_id');
    if (!id) {
      id = 'visitor_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('visitor_id', id);
    }
    return id;
  };

  // Sync state and run analytics tracking on mount
  useEffect(() => {
    if (!initialItem) return;

    const viewerId = getOrCreateViewerId();
    // Increment views counter
    fetch(`/api/ambigrams/${initialItem.id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-viewer-id': viewerId
      },
      body: JSON.stringify({ action: 'view' })
    }).catch(err => console.error('Error logging view:', err));

    // Auto-reveal if query param matches
    const revealParam = searchParams.get('reveal');
    const timelapseParam = searchParams.get('timelapse');
    if (revealParam === 'true' || timelapseParam === 'true') {
      setIsGiftOpen(true);
      setIsRevealed(true);
    }
    if (timelapseParam === 'true') {
      setIsTimelapseOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 500);
    }
  }, [recipientOverride, initialItem, searchParams]);

  // Toggle modal-open class on document root to pause background animations during heavy backdrop-blurs
  useEffect(() => {
    const root = document.documentElement;
    if (isPasswordOpen) {
      root.classList.add('modal-open');
    } else {
      root.classList.remove('modal-open');
    }
    return () => {
      root.classList.remove('modal-open');
    };
  }, [isPasswordOpen]);

  const toggleRotation = () => {
    setIsRotated(!isRotated);
  };

  const toggleTimelapse = () => {
    if (isTimelapseOpen) {
      setIsTimelapseOpen(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      setIsTimelapseOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 600);
    }
  };

  const openDownload = () => {
    setPassword('');
    setIsPasswordError(false);
    setIsPasswordOpen(true);
    setTimeout(() => {
      setIsPasswordVisible(true);
    }, 50);
  };

  const closeDownload = () => {
    setIsPasswordVisible(false);
    setTimeout(() => {
      setIsPasswordOpen(false);
      setPassword('');
      setIsPasswordError(false);
      setShowPasswordText(false); // Reset visibility to hidden
      setIsShaking(false); // Reset shaking state
    }, 500);
  };

  const handleVerifyPassword = async () => {
    if (!initialItem) return;
    setIsPasswordError(false);

    try {
      // 1. Fetch the secure private SVG from download API
      const response = await fetch(`/api/ambigrams/${initialItem.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        setIsPasswordError(true);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 800); // Shake (400ms) + fade-out red tint
        return;
      }

      showToast('Packaging assets...');
      const svgContent = await response.text();

      const viewerId = getOrCreateViewerId();
      // Track download analytics
      fetch(`/api/ambigrams/${initialItem.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-viewer-id': viewerId
        },
        body: JSON.stringify({ action: 'download' })
      }).catch(err => console.error('Error logging download:', err));

      closeDownload();

      // 2. Fetch the timelapse MP4 video if available (usually cached in browser)
      let videoBlob = null;
      if (initialItem.timelapseSrc) {
        try {
          const videoResponse = await fetch(initialItem.timelapseSrc);
          videoBlob = await videoResponse.blob();
        } catch (vidErr) {
          console.warn('Could not fetch timelapse video for zip bundling:', vidErr);
        }
      }

      // 3. Dynamically load JSZip from CDN
      const JSZip = await new Promise<any>((resolve, reject) => {
        if ((window as any).JSZip) {
          resolve((window as any).JSZip);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve((window as any).JSZip);
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });

      // 4. Bundle SVG and Video into ZIP in memory
      const zip = new JSZip();
      const baseName = initialItem.id;
      zip.file(`${baseName}.svg`, svgContent);
      if (videoBlob) {
        zip.file(`${baseName}_timelapse.mp4`, videoBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);

      // 5. Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${baseName}_assets.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      showToast('Assets downloaded successfully!');
    } catch (err) {
      console.error('Download packaging error:', err);
      showToast('Error assembling download package.');
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);
  };

  const handleOpenGift = () => {
    setIsGiftOpen(true);
  };

  const handleRevealGift = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsRevealed(true);
  };

  // If not found, display the invalid link UI (keeping behavior identical)
  if (!initialItem) {
    return (
      <div className={styles.pageWrapper}>
        <div className="mandala-bg-container" style={{ position: 'absolute', zIndex: 1, pointerEvents: 'none' }}>
          <div className="mandala mandala-left"></div>
          <div className="mandala mandala-rt"></div>
          <div className="mandala mandala-rb"></div>
        </div>

        <main className={styles.artContainer} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', zIndex: 5 }}>
          <div style={{ 
            background: 'rgba(24, 29, 32, 0.9)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '28px', 
            padding: '3rem', 
            width: 'min(88vw, 72vh, 540px)', 
            height: 'min(88vw, 72vh, 540px)', 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxSizing: 'border-box',
            textAlign: 'center', 
            boxShadow: '0 30px 70px rgba(0, 0, 0, 0.35)', 
            backdropFilter: 'blur(12px)', 
            color: '#ffffff', 
            fontFamily: 'var(--font-family)' 
          }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '1.5rem', opacity: 0.85 }}>!</div>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>Link Invalid</h2>
            <p style={{ fontSize: '1.15rem', opacity: 0.65, lineHeight: 1.6, marginBottom: 0 }}>
              This personalized link is invalid or has expired. Please verify the URL and try again.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const recipientName = recipientOverride || initialItem.recipient || '';
  
  const cardStateClass = !isRevealed 
    ? styles.stateSealed 
    : (isTimelapseOpen ? styles.stateTimelapse : styles.stateArtwork);

  return (
    <>
      <div className={styles.pageWrapper}>
        <IntroScreen 
          onProceed={handleOpenGift} 
          isDismissed={isGiftOpen} 
        />

        <div className={styles.topSpacer} />

        <main className={styles.artContainer}>
          <h2 className={`${styles.giftHeader} ${isGiftOpen ? styles.show : ''}`}>
            <span className={`${styles.scriptTextPart} ${meddon.className}`}>
              Here&apos;s one for you{recipientName ? ', ' : ''}
            </span>
            {recipientName && (
              <span className={`${styles.headerRecipient} ${eagleLake.className}`}>
                {recipientName}
              </span>
            )}
          </h2>
          <div className={`${styles.flipContainer} ${isGiftOpen ? styles.show : ''} ${isRevealed ? styles.revealed : ''}`}>
            <div className={`${styles.flipCardInner} ${cardStateClass} ${isRotated ? styles.cardRotated : ''}`}>
              
              <div className={`${styles.cardFront} ${isTimelapseOpen ? styles.videoMode : ''}`}>
                {!isTimelapseOpen ? (
                  <div className={styles.mysteryState} onClick={() => handleRevealGift()}>
                    <div className={styles.mysteryIcon}>
                      <div className={styles.mysteryMandala}></div>
                      <div className={styles.mysteryLogo}>?</div>
                    </div>
                    <div className={styles.revealHint}>
                      <span className={styles.desktopOnly}>Click to reveal</span>
                      <span className={styles.mobileOnly}>Tap to reveal</span>
                    </div>
                  </div>
                ) : (
                  <video 
                    ref={videoRef}
                    className={styles.videoPlayer} 
                    loop 
                    playsInline 
                    muted
                  >
                    <source src={initialItem.timelapseSrc} type="video/mp4" />
                  </video>
                )}
              </div>

              <div className={styles.cardBack} onClick={toggleRotation} title="Click to rotate 180°">
                {isRevealed && (
                  <>
                    <div className={styles.rotateHintTop}>
                      <span className={styles.desktopOnly}>Click design to rotate 180°</span>
                      <span className={styles.mobileOnly}>Tap design to rotate 180°</span>
                    </div>
                    <img 
                      src={initialItem.imageSrc} 
                      alt="Ambigram Artwork" 
                      className={styles.ambigramImg}
                    />
                    <div className={styles.rotateHintBottom}>
                      <span className={styles.desktopOnly}>Click design to rotate 180°</span>
                      <span className={styles.mobileOnly}>Tap design to rotate 180°</span>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </main>

        <div className={`${styles.bottomSection} ${isRevealed ? styles.revealed : ''}`}>
          <footer className={styles.artControls}>
            {initialItem?.timelapseSrc && (
              <button className={`${styles.controlLink} ${styles.linkLeft}`} onClick={toggleTimelapse}>
                <span className={styles.linkText}>
                  {isTimelapseOpen ? 'Show Artwork' : 'Play Timelapse'}
                </span>
              </button>
            )}
            <button className={`${styles.controlLink} ${initialItem?.timelapseSrc ? styles.linkRight : ''}`} onClick={openDownload}>
              <span className={styles.linkText}>Download Assets</span>
            </button>
          </footer>
        </div>

        <div className={`${styles.toast} ${isToastVisible ? styles.show : ''}`}>
          <span>{toastMessage}</span>
        </div>
      </div>

      {isPasswordOpen && (
        <div className={`${styles.passwordOverlay} ${isPasswordVisible ? styles.show : ''}`}>
          <div className={styles.backdrop} />

          <div className={styles.passwordForm}>
            <label htmlFor="pwdInput">Enter Password</label>
            <div className={`${styles.passwordInputWrapper} ${isShaking ? styles.shake : ''}`}>
              <input 
                type={showPasswordText ? "text" : "password"} 
                id="pwdInput" 
                className={`${styles.passwordInput} ${isShaking ? styles.inputError : ''}`} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyPassword();
                }}
                autoFocus
              />
              <button 
                type="button"
                className={styles.passwordToggleBtn} 
                onClick={() => setShowPasswordText(!showPasswordText)}
                title={showPasswordText ? "Hide Password" : "Show Password"}
              >
                {showPasswordText ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.eyeIcon}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.eyeIcon}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            
            <div className={styles.passwordActions}>
              <button className={styles.controlLink} onClick={closeDownload}>
                <span className={styles.linkText}>Cancel</span>
              </button>
              <button className={styles.controlLink} onClick={handleVerifyPassword}>
                <span className={styles.linkText}>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

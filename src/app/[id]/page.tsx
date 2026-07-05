'use client';

import React, { useState, useEffect, useRef, Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { Meddon, Eagle_Lake, Fredericka_the_Great } from 'next/font/google';
import AnimatedLogo from '@/components/AnimatedLogo';
import IntroScreen from '@/components/IntroScreen';
import { AmbigramItem, DEFAULT_ITEMS } from '@/lib/types';
import styles from './page.module.css';

const meddon = Meddon({ weight: '400', subsets: ['latin'] });
const eagleLake = Eagle_Lake({ weight: '400', subsets: ['latin'] });
const fredericka = Fredericka_the_Great({ weight: '400', subsets: ['latin'] });

function GiftPageContent({ artId }: { artId: string }) {
  const searchParams = useSearchParams();
  const recipientOverride = searchParams.get('recipient');

  const [activeItem, setActiveItem] = useState<AmbigramItem | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  
  // Connect to global theme provider
  const { triggerGiftReveal } = useTheme();

  // Gift Overlay State
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [recipientText, setRecipientText] = useState('Specially Crafted for You');

  // Ambigram interaction states
  const [isRotated, setIsRotated] = useState(false);
  const [isTimelapseOpen, setIsTimelapseOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const [password, setPassword] = useState('');
  const [isPasswordError, setIsPasswordError] = useState(false);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync with API
  useEffect(() => {
    async function loadActiveGift() {
      let chosenItem: AmbigramItem | null = null;
      try {
        const res = await fetch(`/api/ambigrams/${artId}`);
        const data = await res.json();
        if (data.success && data.ambigram) {
          chosenItem = data.ambigram;
        } else {
          setIsNotFound(true);
          return;
        }
      } catch (e) {
        console.error('Error fetching active gift:', e);
        setIsNotFound(true);
        return;
      }

      setActiveItem(chosenItem);

      // Increment views counter
      if (chosenItem && chosenItem.id) {
        fetch(`/api/ambigrams/${chosenItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'view' })
        }).catch(err => console.error('Error logging view:', err));
      }

      // Customize recipient text
      const recipientName = recipientOverride || chosenItem.recipient || '';
      if (recipientName) {
        setRecipientText(`Specially Crafted for ${recipientName}`);
      } else {
        setRecipientText('Specially Crafted for You');
      }

      // Auto-reveal if query param matches
      const revealParam = searchParams.get('reveal');
      const timelapseParam = searchParams.get('timelapse');
      if (revealParam === 'true' || timelapseParam === 'true') {
        setIsGiftOpen(true);
        setIsRevealed(true);
        triggerGiftReveal();
      }
      if (timelapseParam === 'true') {
        setIsTimelapseOpen(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }, 500);
      }
    }
    loadActiveGift();
  }, [recipientOverride, artId, searchParams]);



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
    }, 500);
  };

  const handleVerifyPassword = () => {
    const expectedPassword = activeItem?.password || 'secret123';
    
    if (password === expectedPassword) {
      setIsPasswordError(false);
      closeDownload();
      showToast('Downloading archive...');

      if (activeItem && activeItem.id) {
        fetch(`/api/ambigrams/${activeItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'download' })
        }).catch(err => console.error('Error logging download:', err));
      }

      const link = document.createElement('a');
      link.href = activeItem.imageSrc;
      link.download = `${activeItem.title || 'ambigram'}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setIsPasswordError(true);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);
  };

  const handleOpenGift = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGiftOpen(true);
  };

  const handleRevealGift = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsRevealed(true);
    triggerGiftReveal();
  };

  if (isNotFound) {
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

  if (!activeItem) return null;

  const recipientName = recipientOverride || activeItem.recipient || '';
  
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
                    <div className={styles.revealHint}>Click to reveal</div>
                  </div>
                ) : (
                  <video 
                    ref={videoRef}
                    className={styles.videoPlayer} 
                    loop 
                    playsInline 
                    muted
                  >
                    <source src={activeItem.timelapseSrc} type="video/mp4" />
                  </video>
                )}
              </div>

              <div className={styles.cardBack} onClick={toggleRotation} title="Click to rotate 180°">
                {isRevealed && (
                  <>
                    <div className={styles.rotateHintTop}>Click design to rotate 180°</div>
                    <img 
                      src={activeItem.imageSrc} 
                      alt="Ambigram Artwork" 
                      className={styles.ambigramImg}
                    />
                    <div className={styles.rotateHintBottom}>Click design to rotate 180°</div>
                  </>
                )}
              </div>

            </div>
          </div>
        </main>

        <div className={`${styles.bottomSection} ${isRevealed ? styles.revealed : ''}`}>
          <footer className={styles.artControls}>
            <button className={`${styles.controlLink} ${styles.linkLeft}`} onClick={toggleTimelapse}>
              {isTimelapseOpen ? 'Show Artwork' : 'Play Timelapse'}
            </button>
            <>
              <span className={styles.controlDivider}>•</span>
              <button className={`${styles.controlLink} ${styles.linkRight}`} onClick={openDownload}>
                Download Assets
              </button>
            </>
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
            <input 
              type="password" 
              id="pwdInput" 
              className={styles.passwordInput} 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerifyPassword();
              }}
              autoFocus
            />
            <div className={styles.errorMsg} style={{ display: isPasswordError ? 'block' : 'none' }}>
              Incorrect password
            </div>
            
            <div className={styles.passwordActions}>
              <button className={styles.controlLink} onClick={closeDownload}>Cancel</button>
              <button className={styles.controlLink} style={{ opacity: 0.8 }} onClick={handleVerifyPassword}>Download</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function VisitorGiftPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <>
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', opacity: 0.3 }}>
          loading...
        </div>
      }>
        <GiftPageContent artId={resolvedParams.id} />
      </Suspense>
    </>
  );
}

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { Meddon, Eagle_Lake } from 'next/font/google';
import AnimatedLogo from '@/components/AnimatedLogo';
import styles from './page.module.css';

const meddon = Meddon({ weight: '400', subsets: ['latin'] });
const eagleLake = Eagle_Lake({ weight: '400', subsets: ['latin'] });

interface AmbigramItem {
  id: string;
  title: string;
  recipient?: string;
  description?: string;
  imageSrc: string;
  timelapseSrc: string;
  isPublic: boolean;
  isShareable: boolean;
}

const DEFAULT_ITEMS: AmbigramItem[] = [
  {
    id: 'ambivalence',
    title: 'ambivalence',
    imageSrc: '/images.svg',
    timelapseSrc: '/timelapse.mp4',
    isPublic: true,
    isShareable: true,
    description: 'a hand-drawn ambigram reflecting duality and fluid perception.'
  },
  {
    id: 'symmetry-art',
    title: 'symmetry & art',
    imageSrc: '/images.svg',
    timelapseSrc: '/timelapse.mp4',
    isPublic: true,
    isShareable: true,
    description: 'exploring mathematical symmetry through hand-lettered calligraphy.'
  },
  {
    id: 'illusionist',
    title: 'illusionist',
    imageSrc: '/images.svg',
    timelapseSrc: '/timelapse.mp4',
    isPublic: true,
    isShareable: true,
    description: 'a visual riddle that shifts identities when viewed from different angles.'
  }
];

function GiftPageContent() {
  const searchParams = useSearchParams();
  const recipientParam = searchParams.get('recipient');
  const artIdParam = searchParams.get('artId');

  const [items, setItems] = useState<AmbigramItem[]>([]);
  const [activeItem, setActiveItem] = useState<AmbigramItem | null>(null);
  
  // Connect to global theme provider
  const { activeTheme, triggerGiftReveal } = useTheme();

  // Gift Overlay State
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [recipientText, setRecipientText] = useState('Specially Crafted for You');

  // Ambigram interaction states
  const [isRotated, setIsRotated] = useState(false);
  const [isTimelapseOpen, setIsTimelapseOpen] = useState(false);
  const [isTimelapseVisible, setIsTimelapseVisible] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const [password, setPassword] = useState('');
  const [isPasswordError, setIsPasswordError] = useState(false);
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  // Landing Intro Animation States
  const [showHi, setShowHi] = useState(false);
  const [showIm, setShowIm] = useState(false);
  const [startDrawing, setStartDrawing] = useState(false);
  const [isDrawn, setIsDrawn] = useState(false);
  const [showICreate, setShowICreate] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAmbigrams, setShowAmbigrams] = useState(false);
  const [showProceed, setShowProceed] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const landingTimersRef = useRef<NodeJS.Timeout[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync with API
  useEffect(() => {
    async function loadActiveGift() {
      let list: AmbigramItem[] = [];
      try {
        const res = await fetch('/api/ambigrams');
        const data = await res.json();
        if (data.success && data.ambigrams) {
          list = data.ambigrams;
        } else {
          list = DEFAULT_ITEMS;
        }
      } catch (e) {
        list = DEFAULT_ITEMS;
      }

      // Read current art ID from search param
      const chosenItem = list.find((item) => item.id === artIdParam) || list[0];
      setActiveItem(chosenItem);

      // Customize recipient text
      if (recipientParam) {
        setRecipientText(`Specially Crafted for ${recipientParam}`);
      } else if (chosenItem && chosenItem.recipient) {
        setRecipientText(`Specially Crafted for ${chosenItem.recipient}`);
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
  }, [recipientParam, artIdParam, searchParams]);

  // Skip / Instant slide out function
  const handleSkipIntro = () => {
    setIsSkipped(true);
    landingTimersRef.current.forEach((t) => clearTimeout(t));
    setShowHi(true);
    setShowIm(true);
    setStartDrawing(true);
    setIsDrawn(true);
    setShowICreate(true);
    setIsFlipped(true);
    setShowAmbigrams(true);
    setShowProceed(true); // Don't slide out automatically, reveal the proceed button instead!
  };

  // Play landing intro animation sequentially
  useEffect(() => {
    if (isSkipped || isGiftOpen) return;

    const timers = [
      setTimeout(() => setShowHi(true), 300),
      setTimeout(() => setShowIm(true), 1300),
      setTimeout(() => setStartDrawing(true), 2300),
      setTimeout(() => setIsDrawn(true), 4300),
      setTimeout(() => setShowICreate(true), 4600),
      setTimeout(() => setIsFlipped(true), 5800),
      setTimeout(() => setShowAmbigrams(true), 8300),
      // Float in the proceed button after "ambigrams" fades in
      setTimeout(() => {
        setShowProceed(true);
      }, 9300),
    ];

    landingTimersRef.current = timers;

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [isSkipped, isGiftOpen]);

  // Listen for user click/keypress to skip the intro animation
  useEffect(() => {
    if (isGiftOpen || showProceed) return;

    const handleWindowInteraction = (e: MouseEvent | KeyboardEvent) => {
      // Don't skip if the user clicked the proceed link directly
      if (e.target && (e.target as HTMLElement).closest(`[class*="proceedLink"]`)) {
        return;
      }
      handleSkipIntro();
    };

    window.addEventListener('click', handleWindowInteraction);
    window.addEventListener('keydown', handleWindowInteraction);

    return () => {
      window.removeEventListener('click', handleWindowInteraction);
      window.removeEventListener('keydown', handleWindowInteraction);
    };
  }, [isGiftOpen, isSkipped, showProceed]);

  const toggleRotation = () => {
    setIsRotated(!isRotated);
  };

  // 3D Card Flip Timelapse toggle action
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

  // Password actions
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
    if (password === 'secret123') {
      setIsPasswordError(false);
      closeDownload();
      showToast('Downloading archive...');
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

  if (!activeItem) return null;

  const recipientName = recipientParam || (activeItem && activeItem.recipient) || '';
  
  // Explicit 3D rotation state classes
  const cardStateClass = !isRevealed 
    ? styles.stateSealed 
    : (isTimelapseOpen ? styles.stateTimelapse : styles.stateArtwork);

  return (
    <>
      <div className={styles.pageWrapper}>

        {/* Premium Gift Intro Overlay */}
        <div className={`${styles.giftOverlay} ${isGiftOpen ? styles.hidden : ''}`}>
          {/* Floating background mandalas inside overlay so they show behind the text! */}
          <div className="mandala-bg-container" style={{ position: 'absolute', zIndex: 1, pointerEvents: 'none' }}>
            <div className="mandala mandala-left"></div>
            <div className="mandala mandala-rt"></div>
            <div className="mandala mandala-rb"></div>
          </div>

          <div className={styles.contentWrapper} style={{ position: 'relative', zIndex: 2 }}>
            <h1 className={styles.introText}>
              <span className={`${styles.scriptText} ${showHi ? styles.show : ''} ${meddon.className}`}>
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

          {/* Vertical Proceed Arrow Button on the right to enter the gift page */}
          <button 
            className={`${styles.proceedLink} ${showProceed ? styles.show : ''}`} 
            onClick={handleOpenGift}
            title="Open Your Ambigram Gift"
          >
            <span className={styles.proceedText}>Open Gift</span>
            <div className={styles.proceedCircle}>
              <svg 
                className={styles.arrowSvg} 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </button>
        </div>

        {/* Top Spacer to balance vertical centering */}
        <div className={styles.topSpacer} />

        {/* The centerpiece 3D Flip Card */}
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
              
              {/* Front Side: Sealed Mystery State OR Video Player once timelapse is open */}
              <div className={`${styles.cardFront} ${isTimelapseOpen ? styles.videoMode : ''}`}>
                {!isTimelapseOpen ? (
                  <div className={styles.mysteryState} onClick={() => handleRevealGift()}>
                    <div className={styles.mysteryIcon}>
                      <div className={styles.mysteryMandala}></div>
                      <div className={styles.mysteryLogo}>?</div>
                    </div>
                    <button 
                      className={styles.revealButton} 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleRevealGift(); 
                      }}
                    >
                      Reveal
                    </button>
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

              {/* Back Side: SVG Ambigram Artwork */}
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

        {/* Bottom Section centering the footer controls in remaining space */}
        <div className={`${styles.bottomSection} ${isRevealed ? styles.revealed : ''}`}>
          <footer className={styles.artControls}>
            <button className={`${styles.controlLink} ${styles.linkLeft}`} onClick={toggleTimelapse}>
              {isTimelapseOpen ? 'Show Artwork' : 'Play Timelapse'}
            </button>
            {activeItem.isShareable && (
              <>
                <span className={styles.controlDivider}>•</span>
                <button className={`${styles.controlLink} ${styles.linkRight}`} onClick={openDownload}>
                  Download Assets
                </button>
              </>
            )}
          </footer>
        </div>

        {/* Toast notifications */}
        <div className={`${styles.toast} ${isToastVisible ? styles.show : ''}`}>
          <span>{toastMessage}</span>
        </div>
      </div>

      {/* Download Password Overlay - Rendered outside pageWrapper to bypass Chromium's overflow:hidden backdrop-filter bug! */}
      {isPasswordOpen && (
        <div className={`${styles.passwordOverlay} ${isPasswordVisible ? styles.show : ''}`}>
          {/* Isolated backdrop div for premium frosted glass effect */}
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

export default function VisitorGiftPage() {
  return (
    <>
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', opacity: 0.3 }}>
          loading...
        </div>
      }>
        <GiftPageContent />
      </Suspense>
    </>
  );
}

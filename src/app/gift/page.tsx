'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import styles from './page.module.css';

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

const THEMES = [
  {
    id: 'bronze',
    name: 'Earthy Bronze',
    accent: '#bca57a',
    bgDark: '#221914',
    cardBg: '#d2b584',
    mandalaFilter: 'invert(50%) sepia(25%) saturate(800%) hue-rotate(345deg) opacity(0.05)',
    textColor: '#e5dac9'
  },
  {
    id: 'emerald',
    name: 'Forest Jade',
    accent: '#5f7d65',
    bgDark: '#0e1711',
    cardBg: '#8aa691',
    mandalaFilter: 'invert(45%) sepia(20%) saturate(600%) hue-rotate(85deg) opacity(0.04)',
    textColor: '#c9dcd0'
  },
  {
    id: 'sapphire',
    name: 'Deep Ocean',
    accent: '#4e6d8a',
    bgDark: '#0b141d',
    cardBg: '#7ca2c4',
    mandalaFilter: 'invert(45%) sepia(25%) saturate(700%) hue-rotate(185deg) opacity(0.05)',
    textColor: '#cbdceb'
  },
  {
    id: 'terracotta',
    name: 'Earthen Clay',
    accent: '#a8654c',
    bgDark: '#20110c',
    cardBg: '#cfa291',
    mandalaFilter: 'invert(40%) sepia(30%) saturate(1000%) hue-rotate(350deg) opacity(0.04)',
    textColor: '#ebd8d0'
  },
  {
    id: 'plum',
    name: 'Royal Plum',
    accent: '#805d7a',
    bgDark: '#160c13',
    cardBg: '#b394ad',
    mandalaFilter: 'invert(40%) sepia(20%) saturate(600%) hue-rotate(275deg) opacity(0.04)',
    textColor: '#ecdbe9'
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
        console.error('Failed to load API ambigrams on gift page:', e);
        list = DEFAULT_ITEMS;
      }
      setItems(list);

      // Pick active art item:
      // 1. By direct query parameter artId
      // 2. By matching recipient name
      // 3. Fallback to first item
      let chosenItem = list[0];
      if (artIdParam) {
        const match = list.find(item => item.id === artIdParam);
        if (match) chosenItem = match;
      } else if (recipientParam) {
        const match = list.find(item => item.recipient?.toLowerCase() === recipientParam.toLowerCase());
        if (match) chosenItem = match;
      }
      setActiveItem(chosenItem);

      // Set recipient label
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

  const triggerReveal = () => {
    setIsGiftOpen(true);
    setTimeout(() => {
      setIsRevealed(true);
      triggerGiftReveal();
    }, 400);
  };

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
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
      }, 500); // Trigger play midway through the slower 1.3s 3D flip rotation
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

  if (!activeItem) return null;

  return (
    <div className={styles.pageWrapper}>

      {/* Premium Gift Intro Overlay */}
      <div className={`${styles.giftOverlay} ${isGiftOpen ? styles.hidden : ''}`}>
        <div className={styles.giftBox}>
          <div className={styles.giftSeal}></div>
          <h2 className={styles.giftTitle}>You Have Received a Custom Ambigram</h2>
          <p className={styles.giftSubtitle}>{recipientText}</p>
          <button className={styles.revealBtn} onClick={triggerReveal}>Reveal</button>
        </div>
      </div>

      {/* Top Spacer to balance vertical centering */}
      <div className={styles.topSpacer} />

      {/* The centerpiece 3D Flip Card */}
      <main className={styles.artContainer}>
        <div className={`${styles.flipContainer} ${isRevealed ? styles.revealed : ''}`}>
          <div className={`${styles.flipCardInner} ${isTimelapseOpen ? styles.flipped : ''}`}>
            
            {/* Front Side: SVG Ambigram Artwork */}
            <div className={styles.cardFront}>
              <img 
                src={activeItem.imageSrc} 
                alt="Ambigram Artwork" 
                className={`${styles.ambigramImg} ${isRotated ? styles.rotated : ''}`} 
                onClick={toggleRotation}
                title="Click design to rotate 180°"
              />
              <div className={styles.rotateHint}>Click design to rotate 180°</div>
            </div>

            {/* Back Side: Embedded MP4 Timelapse Video */}
            <div className={styles.cardBack}>
              <video 
                ref={videoRef}
                className={styles.videoPlayer} 
                loop 
                playsInline 
                controls
              >
                <source src={activeItem.timelapseSrc} type="video/mp4" />
              </video>
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



      {/* Download Password Overlay */}
      {isPasswordOpen && (
        <div className={`${styles.passwordOverlay} ${isPasswordVisible ? styles.show : ''}`}>
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

      {/* Toast notifications */}
      <div className={`${styles.toast} ${isToastVisible ? styles.show : ''}`}>
        <span>{toastMessage}</span>
      </div>
    </div>
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

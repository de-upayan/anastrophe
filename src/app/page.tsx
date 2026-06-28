'use client';

import { useState, useEffect, useRef } from 'react';
import Navigation from '@/components/Navigation';
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

export default function ShowcasePage() {
  const [items, setItems] = useState<AmbigramItem[]>([]);
  const [activeItem, setActiveItem] = useState<AmbigramItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'img' | 'video'>('img');
  const [isRotated, setIsRotated] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch public items from API
  useEffect(() => {
    async function loadShowcase() {
      try {
        const res = await fetch('/api/ambigrams?public=true');
        const data = await res.json();
        if (data.success && data.ambigrams) {
          setItems(data.ambigrams);
        } else {
          setItems(DEFAULT_ITEMS);
        }
      } catch (e) {
        console.error('Failed to load showcase ambigrams:', e);
        setItems(DEFAULT_ITEMS);
      }
    }
    loadShowcase();
  }, []);

  const openModal = (item: AmbigramItem) => {
    setActiveItem(item);
    setIsRotated(false);
    setActiveTab('img');
    setIsModalOpen(true);
    setTimeout(() => {
      setIsModalVisible(true);
    }, 50);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setTimeout(() => {
      setIsModalOpen(false);
      setActiveItem(null);
    }, 450);
  };

  const toggleRotation = () => {
    setIsRotated(!isRotated);
  };

  const switchViewerTab = (tab: 'img' | 'video') => {
    setActiveTab(tab);
    if (tab === 'img') {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <>
      <Navigation />

      <main className={styles.galleryContainer}>
        <div className={styles.galleryGrid}>
          {items.map((item) => (
            <div key={item.id} className={styles.artItem} onClick={() => openModal(item)}>
              <div className={styles.artImgWrapper}>
                <img src={item.imageSrc} alt={`${item.title} design`} className={styles.artImg} />
              </div>
              <span className={styles.artCaption}>{item.title}</span>
            </div>
          ))}
        </div>
      </main>

      {isModalOpen && activeItem && (
        <div 
          className={`${styles.modalOverlay} ${isModalVisible ? styles.show : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <button className={styles.closeBtn} onClick={closeModal}>Close</button>

          <div className={styles.modalViewer}>
            {/* Image viewer tab */}
            <div className={`${styles.viewerTabContent} ${activeTab === 'img' ? styles.active : ''}`}>
              <div className={styles.modalImgWrapper} onClick={toggleRotation}>
                <img 
                  src={activeItem.imageSrc} 
                  alt={`${activeItem.title} ambigram`} 
                  className={`${styles.modalImg} ${isRotated ? styles.rotated : ''}`} 
                />
                <div className={styles.spinHint}>
                  {isRotated ? 'Click to spin back to 0°' : 'Click design to rotate 180°'}
                </div>
              </div>
            </div>

            {/* Video timelapse tab */}
            <div className={`${styles.viewerTabContent} ${activeTab === 'video' ? styles.active : ''}`}>
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

          <div className={styles.modalControls}>
            <button 
              className={`${styles.controlLink} ${activeTab === 'img' ? styles.active : ''}`}
              onClick={() => switchViewerTab('img')}
            >
              Interactive Viewer
            </button>
            <button 
              className={`${styles.controlLink} ${activeTab === 'video' ? styles.active : ''}`}
              onClick={() => switchViewerTab('video')}
            >
              Timelapse Video
            </button>
          </div>
        </div>
      )}
    </>
  );
}

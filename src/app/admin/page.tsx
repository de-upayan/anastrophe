'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AmbigramItem, ActivityEvent } from '@/lib/types';
import styles from './page.module.css';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analytics' | 'create'>('analytics');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Form states
  const [recipient, setRecipient] = useState('');
  const [password, setPassword] = useState('');
  const [giftsList, setGiftsList] = useState<AmbigramItem[]>([]);
  const [selectedGiftFilter, setSelectedGiftFilter] = useState('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [passwordType, setPasswordType] = useState<'password' | 'passphrase'>('password');

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
      }
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  // File states
  const [vectorFile, setVectorFile] = useState<File | null>(null); // Raw SVG file
  const [previewFile, setPreviewFile] = useState<Blob | null>(null); // Rendered PNG preview
  const [timelapseFile, setTimelapseFile] = useState<File | null>(null);

  // Upload simulation states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // UI Toast states
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastText, setToastText] = useState('');

  // Refs for hidden inputs
  const vectorInputRef = useRef<HTMLInputElement>(null);
  const timelapseInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop trigger actions
  const triggerVectorFileSelect = () => {
    vectorInputRef.current?.click();
  };

  const triggerTimelapseFileSelect = () => {
    timelapseInputRef.current?.click();
  };

  const handleVectorChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVectorFile(file);
      showToast('Generating high-resolution PNG preview locally...');
      try {
        const pngBlob = await renderSVGToPNG(file);
        setPreviewFile(pngBlob);
        showToast('PNG preview generated successfully.');
      } catch (err) {
        console.error('Error generating PNG preview:', err);
        showToast('Failed to generate PNG preview.');
      }
    }
  };

  const handleTimelapseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimelapseFile(file);
    }
  };

  const fetchGifts = async () => {
    try {
      const res = await fetch('/api/ambigrams');
      const data = await res.json();
      if (data.success && data.ambigrams) {
        setGiftsList(data.ambigrams);
      }
    } catch (e) {
      console.error('Error fetching gifts:', e);
    }
  };

  useEffect(() => {
    fetchGifts();
  }, []);

  const handleDeleteGift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link? This will permanently delete the link and automatically clean up all associated asset files.')) {
      return;
    }
    try {
      const res = await fetch(`/api/ambigrams/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Link deleted successfully');
        fetchGifts();
      } else {
        showToast(data.error || 'Failed to delete link');
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error deleting link';
      showToast(errorMsg);
    }
  };

  const handleUploadSubmit = async () => {
    if (!vectorFile) {
      showToast('Please select a raw vector artwork file (.svg)');
      return;
    }
    if (!previewFile) {
      showToast('Please wait for the PNG preview to finish rendering...');
      return;
    }
    if (!password || !password.trim()) {
      showToast('Please enter a password to secure the downloadable assets.');
      return;
    }

    // Start upload progress animation
    setIsUploading(true);
    setUploadProgress(10);
    setShowResult(false);

    const linkTitle = recipient ? `Link for ${recipient}` : 'Ambigram Link';
    
    // Generate random 8-character ID for security and privacy
    const generateRandomId = (length: number = 8): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    const id = generateRandomId(8);

    // Prepare files
    const formData = new FormData();
    formData.append('id', id);
    formData.append('title', linkTitle);
    if (recipient) formData.append('recipient', recipient);
    if (password) formData.append('password', password);
    formData.append('vectorFile', vectorFile); // sends raw SVG file
    formData.append('previewFile', previewFile, `${id}.png`); // sends PNG preview blob
    if (timelapseFile) formData.append('timelapseFile', timelapseFile);

    // Increment progress bar to simulate uploading action
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 100);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();
      
      setTimeout(() => {
        setIsUploading(false);
        if (data.success) {
          setGeneratedLink(data.generatedLink);
          setShowResult(true);
          showToast('Link generated successfully');
          fetchGifts();
          
          // Clear form inputs
          setRecipient('');
          setPassword('');
          setVectorFile(null);
          setPreviewFile(null);
          setTimelapseFile(null);

          // Auto-switch to analytics tab to show the new item in the list
          setTimeout(() => {
            setShowResult(false);
            setActiveTab('analytics');
          }, 4000);
        } else {
          showToast(data.error || 'Upload failed');
        }
      }, 400);

    } catch (err) {
      clearInterval(progressInterval);
      setIsUploading(false);
      const errorMsg = err instanceof Error ? err.message : 'Connection error during upload';
      showToast(errorMsg);
    }
  };

  const handleGenerateRandomPassword = () => {
    if (passwordType === 'password') {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let pass = '';
      for (let i = 0; i < 8; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setPassword(pass);
      showToast('Random password generated');
    } else {
      const words = [
        'calligraphy', 'ink', 'paper', 'nib', 'canvas', 
        'symmetry', 'mirror', 'rotation', 'ambigram', 'design', 
        'classic', 'vintage', 'modern', 'fluid', 'brush', 
        'lettering', 'artist', 'creative', 'stroke', 'swash', 
        'flourish', 'geometric', 'curved', 'smooth', 'contrast'
      ];
      // Pick 3 random words
      const w1 = words[Math.floor(Math.random() * words.length)];
      const w2 = words[Math.floor(Math.random() * words.length)];
      const w3 = words[Math.floor(Math.random() * words.length)];
      setPassword(`${w1}-${w2}-${w3}`);
      showToast('Random passphrase generated');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    showToast('Link copied to clipboard');
  };

  const showToast = (message: string) => {
    setToastText(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);
  };

  // Generate calendar dates for last 7 days (ending today)
  const last7Days = mounted ? Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  }) : [];

  const points = last7Days.map((day) => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    
    let viewsCount = 0;
    let downloadsCount = 0;
    
    const targetGifts = selectedGiftFilter === 'all' 
      ? giftsList 
      : giftsList.filter(g => g.id === selectedGiftFilter);
      
    targetGifts.forEach((gift) => {
      if (gift.viewsLog) {
        gift.viewsLog.forEach((event: ActivityEvent) => {
          const t = new Date(event.timestamp).getTime();
          if (t >= dayStart && t < dayEnd) {
            viewsCount++;
          }
        });
      }
      if (gift.downloadsLog) {
        gift.downloadsLog.forEach((event: ActivityEvent) => {
          const t = new Date(event.timestamp).getTime();
          if (t >= dayStart && t < dayEnd) {
            downloadsCount++;
          }
        });
      }
    });
    
    return {
      label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      views: viewsCount,
      downloads: downloadsCount
    };
  });

  const pointsCount = points.length;
  const maxVal = pointsCount > 0 
    ? Math.max(...points.map(p => Math.max(p.views, p.downloads)), 1)
    : 1;

  const getX = (index: number) => {
    if (pointsCount <= 1) return 250;
    return 45 + (index / (pointsCount - 1)) * 410;
  };
  const getY = (val: number) => {
    return 160 - (val / maxVal) * 130;
  };

  // Generate smooth Bézier curves
  const getCoordinates = (type: 'views' | 'downloads') => {
    return points.map((p, idx) => ({
      x: getX(idx),
      y: getY(type === 'views' ? p.views : p.downloads)
    }));
  };

  const viewsPoints = getCoordinates('views');
  const downloadsPoints = getCoordinates('downloads');

  const getSmoothLinePath = (pts: {x: number, y: number}[]) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const getSmoothAreaPath = (pts: {x: number, y: number}[]) => {
    if (pts.length === 0) return '';
    const linePath = getSmoothLinePath(pts);
    return `${linePath} L ${pts[pts.length - 1].x} 160 L ${pts[0].x} 160 Z`;
  };

  const viewsLinePath = getSmoothLinePath(viewsPoints);
  const viewsAreaPath = getSmoothAreaPath(viewsPoints);
  const downloadsLinePath = getSmoothLinePath(downloadsPoints);
  const downloadsAreaPath = getSmoothAreaPath(downloadsPoints);

  const getUniqueViewersCount = () => {
    const targetGifts = selectedGiftFilter === 'all' 
      ? giftsList 
      : giftsList.filter(g => g.id === selectedGiftFilter);
      
    const uniqueIds = new Set<string>();
    targetGifts.forEach((gift) => {
      if (gift.viewsLog) {
        gift.viewsLog.forEach((event: ActivityEvent) => {
          if (event.viewerId) {
            uniqueIds.add(event.viewerId);
          }
        });
      }
    });
    return uniqueIds.size;
  };

  return (
    <>
      <main className={styles.adminContainer}>
        <div className={styles.dashboardHeader}>
          <h1 className={styles.adminTitle}>My Dashboard</h1>
          
          {/* Tab Navigation */}
          <div className={styles.tabNav}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Active Links & Stats
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'create' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create New Link
            </button>
            <button 
              className={styles.logoutBtn}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Content 1: Active Links & Stats */}
        {activeTab === 'analytics' && (
          <div className={styles.tabContent}>
            
            {/* Timeline Performance Chart */}
            <div className={styles.glassCard} style={{ padding: '2rem', marginBottom: '2.5rem' }}>
              <div className={styles.chartHeaderRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <h2 className={styles.chartCardTitle}>Activity Timeline</h2>
                  <select 
                    value={selectedGiftFilter} 
                    onChange={(e) => setSelectedGiftFilter(e.target.value)}
                    className={styles.filterDropdown}
                  >
                    <option value="all">All Links</option>
                    {giftsList.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.id} {g.recipient ? `(to ${g.recipient})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.chartLegend}>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.viewDot}`}></span>
                    <span>Views ({selectedGiftFilter === 'all' 
                      ? giftsList.reduce((acc, g) => acc + (g.views || 0), 0)
                      : giftsList.find(g => g.id === selectedGiftFilter)?.views || 0})</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.downloadDot}`}></span>
                    <span>Downloads ({selectedGiftFilter === 'all' 
                      ? giftsList.reduce((acc, g) => acc + (g.downloads || 0), 0)
                      : giftsList.find(g => g.id === selectedGiftFilter)?.downloads || 0})</span>
                  </div>
                  <div className={styles.legendItem} style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '1.5rem' }}>
                    <span className={styles.legendText}>Unique Viewers: <strong>{getUniqueViewersCount()}</strong></span>
                  </div>
                </div>
              </div>

              <div className={styles.svgContainer}>
                {!mounted || giftsList.length === 0 ? (
                  <p className={styles.emptyChartMessage}>
                    Create a link to begin tracking timeline metrics.
                  </p>
                ) : (
                  <svg viewBox="0 0 500 200" className={styles.chartSvg}>
                    <defs>
                      <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="downloadsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff4b72" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#ff4b72" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="45" y1="30" x2="455" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <line x1="45" y1="95" x2="455" y2="95" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <line x1="45" y1="160" x2="455" y2="160" stroke="rgba(255,255,255,0.15)" />

                    {/* Y-axis Labels */}
                    <text x="35" y="34" className={styles.chartText} textAnchor="end">{maxVal}</text>
                    <text x="35" y="99" className={styles.chartText} textAnchor="end">{Math.round(maxVal / 2)}</text>
                    <text x="35" y="164" className={styles.chartText} textAnchor="end">0</text>

                    {/* Fills */}
                    <path d={viewsAreaPath} fill="url(#viewsGrad)" />
                    <path d={downloadsAreaPath} fill="url(#downloadsGrad)" />

                    {/* Lines */}
                    <path d={viewsLinePath} fill="none" stroke="#00f2fe" strokeWidth="2.5" strokeLinecap="round" />
                    <path d={downloadsLinePath} fill="none" stroke="#ff4b72" strokeWidth="2" strokeLinecap="round" />

                    {/* Interactive hover guides and tooltip overlay */}
                    {hoveredIndex !== null && (() => {
                      const x = getX(hoveredIndex);
                      const targetY = Math.min(getY(points[hoveredIndex].views), getY(points[hoveredIndex].downloads));
                      
                      // If targetY is near top bounds (y < 75), render tooltip below the point
                      const showBelow = targetY < 75;
                      const rectY = showBelow ? (targetY + 12) : (targetY - 48);
                      const viewsTextY = rectY + 15;
                      const downloadsTextY = rectY + 27;

                      return (
                        <g>
                          <line 
                            x1={x} 
                            y1="30" 
                            x2={x} 
                            y2="160" 
                            stroke="rgba(255, 255, 255, 0.15)" 
                            strokeDasharray="2,2" 
                          />
                          <rect 
                            x={x - 60} 
                            y={rectY} 
                            width="120" 
                            height="40" 
                            rx="4" 
                            fill="rgba(24, 29, 32, 0.95)" 
                            stroke="rgba(255, 255, 255, 0.15)" 
                            strokeWidth="1"
                          />
                          <text 
                            x={x} 
                            y={viewsTextY} 
                            fill="rgba(255, 255, 255, 0.75)" 
                            fontSize="9" 
                            fontFamily="var(--font-family)"
                            fontWeight="normal"
                            textAnchor="middle"
                          >
                            Views: <tspan fill="#00f2fe" fontWeight="bold">{points[hoveredIndex].views}</tspan>
                          </text>
                          <text 
                            x={x} 
                            y={downloadsTextY} 
                            fill="rgba(255, 255, 255, 0.75)" 
                            fontSize="9" 
                            fontFamily="var(--font-family)"
                            fontWeight="normal"
                            textAnchor="middle"
                          >
                            Downloads: <tspan fill="#ff4b72" fontWeight="bold">{points[hoveredIndex].downloads}</tspan>
                          </text>
                        </g>
                      );
                    })()}

                    {/* Data nodes */}
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle cx={getX(idx)} cy={getY(p.views)} r="3.5" fill="#00f2fe" stroke="#181d20" strokeWidth="1.5" />
                        <circle cx={getX(idx)} cy={getY(p.downloads)} r="3.5" fill="#ff4b72" stroke="#181d20" strokeWidth="1.5" />
                      </g>
                    ))}

                    {/* X-axis Labels */}
                    {points.map((p, idx) => {
                      if (pointsCount > 6 && idx % Math.ceil(pointsCount / 6) !== 0) return null;
                      return (
                        <text key={idx} x={getX(idx)} y="182" className={styles.chartXText} textAnchor="middle">
                          {p.label}
                        </text>
                      );
                    })}

                    {/* Invisible hover slice detectors */}
                    {points.map((p, idx) => (
                      <rect
                        key={`detector-${idx}`}
                        x={getX(idx) - 20}
                        y="20"
                        width="40"
                        height="150"
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    ))}
                  </svg>
                )}
              </div>
            </div>

            {/* Gifts Table Card */}
            <div className={styles.glassCard} style={{ padding: '2.5rem 2rem' }}>
              <h2 className={styles.tableTitle}>Active Links</h2>
              
              <div className={styles.tableWrapper}>
                {giftsList.length === 0 ? (
                  <p className={styles.noGiftsText}>
                    No active links yet. Switch to the &quot;Create New Link&quot; tab to build one!
                  </p>
                ) : (
                  <table className={styles.giftsTable}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Recipient</th>
                        <th style={{ textAlign: 'center' }}>Views</th>
                        <th style={{ textAlign: 'center' }}>Downloads</th>
                        <th>Created</th>
                        <th>Password</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {giftsList.map((gift) => {
                        const link = typeof window !== 'undefined' 
                          ? `${window.location.origin}/${gift.id}`
                          : '';
                        return (
                          <tr key={gift.id}>
                            <td className={styles.codeCell}>
                              <a href={link} target="_blank" rel="noopener noreferrer" className={styles.giftLink}>
                                {gift.id}
                              </a>
                            </td>
                            <td>
                              {gift.recipient ? (
                                <span className={styles.recipientBadge}>{gift.recipient}</span>
                              ) : (
                                <span className={styles.mutedText}>—</span>
                              )}
                            </td>
                            <td className={styles.numberCell} style={{ textAlign: 'center' }}>
                              {gift.views ?? 0}
                            </td>
                            <td className={styles.numberCell} style={{ textAlign: 'center' }}>
                              {gift.downloads ?? 0}
                            </td>
                            <td className={styles.dateCell}>
                              {gift.createdAt ? new Date(gift.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td>
                              {gift.password ? (
                                <div className={styles.passwordContainer}>
                                  <code className={styles.passwordCode}>
                                    {visiblePasswords[gift.id] ? gift.password : '••••••••'}
                                  </code>
                                  <button 
                                    type="button"
                                    onClick={() => togglePasswordVisibility(gift.id)}
                                    className={styles.eyeBtn}
                                    title={visiblePasswords[gift.id] ? "Hide Password" : "Show Password"}
                                  >
                                    {visiblePasswords[gift.id] ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                      </svg>
                                    ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className={styles.mutedText}>none</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className={styles.actionButtons}>
                                <button 
                                  className={styles.iconActionBtn}
                                  onClick={() => {
                                    navigator.clipboard.writeText(link);
                                    showToast('Link copied!');
                                  }}
                                  title="Copy Link"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                </button>
                                <button 
                                  className={`${styles.iconActionBtn} ${styles.deleteActionBtn}`}
                                  onClick={() => handleDeleteGift(gift.id)}
                                  title="Delete Gift"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Create New Gift */}
        {activeTab === 'create' && (
          <div className={styles.tabContent}>
            <div className={styles.glassCard}>
              <div className={styles.uploadForm}>
                {/* General details */}

                <div className={styles.formGroup}>
                  <label htmlFor="recipient">Recipient</label>
                  <input 
                    type="text" 
                    id="recipient" 
                    placeholder="e.g. Sarah" 
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password">Download Password <span style={{ color: '#ff6b6b' }}>*</span></label>
                  <div className={styles.passwordInputWrapper}>
                    <input 
                      type="text" 
                      id="password" 
                      placeholder={passwordType === 'password' ? "e.g. secret123" : "e.g. nib-flourish-mirror"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className={styles.verticalToggle}>
                      <button 
                        type="button" 
                        className={`${styles.vertToggleBtn} ${passwordType === 'password' ? styles.vertToggleActive : ''}`}
                        onClick={() => setPasswordType('password')}
                        title="Characters"
                      >
                        Code
                      </button>
                      <button 
                        type="button" 
                        className={`${styles.vertToggleBtn} ${passwordType === 'passphrase' ? styles.vertToggleActive : ''}`}
                        onClick={() => setPasswordType('passphrase')}
                        title="Words"
                      >
                        Word
                      </button>
                    </div>
                    <button 
                      type="button" 
                      className={styles.diceBtn} 
                      onClick={handleGenerateRandomPassword}
                      title="Generate Random"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"></circle>
                        <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor"></circle>
                        <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
                        <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor"></circle>
                        <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"></circle>
                      </svg>
                    </button>
                  </div>
                </div>


                {/* Raw Vector SVG input dropzone */}
                <div className={styles.formGroup}>
                  <label>Raw Vector Artwork (.svg) <span style={{ color: '#ff6b6b' }}>*</span></label>
                  <input 
                    type="file" 
                    accept=".svg" 
                    style={{ display: 'none' }} 
                    ref={vectorInputRef}
                    onChange={handleVectorChange}
                  />
                  <div className={styles.fileInputBox} onClick={triggerVectorFileSelect}>
                    {vectorFile ? (
                      <span className={styles.fileSelectedText}>{vectorFile.name} Selected</span>
                    ) : (
                      'Select or drop raw .svg drawing file'
                    )}
                  </div>
                </div>

                {/* Video MP4 input dropzone */}
                <div className={styles.formGroup}>
                  <label>Timelapse Video (.mp4)</label>
                  <input 
                    type="file" 
                    accept=".mp4" 
                    style={{ display: 'none' }} 
                    ref={timelapseInputRef}
                    onChange={handleTimelapseChange}
                  />
                  <div className={styles.fileInputBox} onClick={triggerTimelapseFileSelect}>
                    {timelapseFile ? (
                      <span className={styles.fileSelectedText}>{timelapseFile.name} Selected</span>
                    ) : (
                      'Select or drop .mp4 timelapse recording'
                    )}
                  </div>
                </div>

                {/* Upload action button */}
                <button className={styles.btn} onClick={handleUploadSubmit}>
                  Create Link
                </button>

                {/* Upload progress indicator */}
                <div className={`${styles.progressContainer} ${isUploading ? styles.show : ''}`}>
                  <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }}></div>
                </div>

                {/* Generated share links results panel */}
                <div className={`${styles.resultBox} ${showResult ? styles.show : ''}`}>
                  <h3>Design Published Successfully</h3>
                  <p>Share this custom direct unwrap page link directly with your recipient:</p>
                  
                  <div className={styles.linkRow}>
                    <input 
                      type="text" 
                      className={styles.linkInput} 
                      readOnly 
                      value={generatedLink} 
                    />
                    <button className={styles.copyBtn} onClick={copyToClipboard}>
                      Copy Link
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating alert notification toast */}
      <div className={`${styles.toast} ${isToastVisible ? styles.show : ''}`}>
        <span>{toastText}</span>
      </div>
    </>
  );
}

// Client-Side Helper to Render SVG to PNG Blob via HTML5 Canvas
function renderSVGToPNG(file: File, width: number = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || 800;
      const h = img.naturalHeight || 600;
      const aspectRatio = w / h;
      
      canvas.width = width;
      canvas.height = width / aspectRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas exporting to PNG Blob failed'));
          }
        }, 'image/png');
      } else {
        reject(new Error('Canvas 2D Context failed to initialize'));
      }
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

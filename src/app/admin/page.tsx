'use client';

import { useState, useRef } from 'react';
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

export default function AdminPage() {
  // Form states
  const [isShareable, setIsShareable] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [title, setTitle] = useState('');
  const [recipient, setRecipient] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');

  // File states
  const [vectorFile, setVectorFile] = useState<File | null>(null);
  const [timelapseFile, setTimelapseFile] = useState<File | null>(null);
  const [vectorDataUrl, setVectorDataUrl] = useState<string>('');

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

  const handleVectorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVectorFile(file);
      // Read SVG as data URL to save in localStorage for local previewing
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setVectorDataUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTimelapseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimelapseFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!title.trim()) {
      showToast('Please enter a title');
      return;
    }
    if (!vectorFile) {
      showToast('Please select a vector artwork file (.svg)');
      return;
    }

    // Start upload progress animation
    setIsUploading(true);
    setUploadProgress(10);
    setShowResult(false);

    // Prepare files
    const formData = new FormData();
    formData.append('title', title);
    if (recipient) formData.append('recipient', recipient);
    if (description) formData.append('description', description);
    formData.append('isPublic', isPublic ? 'true' : 'false');
    formData.append('isShareable', isShareable ? 'true' : 'false');
    if (password) formData.append('password', password);
    formData.append('vectorFile', vectorFile);
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
          showToast('Upload Room updated');
        } else {
          showToast(data.error || 'Upload failed');
        }
      }, 400);

    } catch (err: any) {
      clearInterval(progressInterval);
      setIsUploading(false);
      showToast(err.message || 'Connection error during upload');
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

  return (
    <>
      <Navigation />

      <main className={styles.adminContainer}>
        <h1 className={styles.adminTitle}>Upload Room</h1>

        <div className={styles.glassCard}>
          <div className={styles.uploadForm}>
            {/* Toggle options checkboxes */}
            <div className={styles.settingsRow}>
              <label className={styles.checkboxGroup}>
                <input 
                  type="checkbox" 
                  checked={isShareable} 
                  onChange={(e) => setIsShareable(e.target.checked)} 
                />
                Enable direct link (mode a)
              </label>
              <label className={styles.checkboxGroup}>
                <input 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={(e) => setIsPublic(e.target.checked)} 
                />
                Publish to showcase
              </label>
            </div>

            {/* Collapsible share settings */}
            <div className={`${styles.collapsibleSection} ${!isShareable ? styles.collapsed : ''}`}>
              <div className={styles.formGroup}>
                <label htmlFor="recipient">Recipient (optional)</label>
                <input 
                  type="text" 
                  id="recipient" 
                  placeholder="e.g. Sarah" 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Download password (optional)</label>
                <input 
                  type="password" 
                  id="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* General details */}
            <div className={styles.formGroup}>
              <label htmlFor="artTitle">Title</label>
              <input 
                type="text" 
                id="artTitle" 
                placeholder="e.g. Ambivalence" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea 
                id="description" 
                rows={2} 
                placeholder="Artistic context..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Vector SVG input dropzone */}
            <div className={styles.formGroup}>
              <label>Vector Artwork (.svg)</label>
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
                  'Select or drop .svg design file'
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
              Upload Design
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
      </main>

      {/* Floating alert notification toast */}
      <div className={`${styles.toast} ${isToastVisible ? styles.show : ''}`}>
        <span>{toastText}</span>
      </div>
    </>
  );
}

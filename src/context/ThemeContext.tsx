'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export interface ThemePreset {
  id: string;
  name: string;
  accent: string;
  bgDark: string;
  cardBg: string;
  mandalaFilter: string;
  textColor: string;
}

export const THEMES: ThemePreset[] = [
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

interface ThemeContextType {
  activeTheme: ThemePreset;
  setTheme: (themeId: string) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  triggerGiftReveal: () => void;
  isGiftRevealed: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<ThemePreset>(THEMES[0]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isGiftRevealed, setIsGiftRevealed] = useState(false);
  const pathname = usePathname();

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('site-theme');
    if (saved) {
      const match = THEMES.find((t) => t.id === saved);
      if (match) setActiveTheme(match);
    }
  }, []);

  // Set CSS Variables on document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-bg-dark', activeTheme.bgDark);
    root.style.setProperty('--theme-card-bg', activeTheme.cardBg);
    root.style.setProperty('--theme-text-color', activeTheme.textColor);
    root.style.setProperty('--theme-accent', activeTheme.accent);
    root.style.setProperty('--theme-mandala-filter', activeTheme.mandalaFilter);
  }, [activeTheme]);

  const setTheme = (themeId: string) => {
    const match = THEMES.find((t) => t.id === themeId);
    if (match) {
      setActiveTheme(match);
      localStorage.setItem('site-theme', themeId);
    }
  };

  const triggerGiftReveal = () => {
    setIsGiftRevealed(true);
  };

  // Reset gift reveal state when leaving gift page
  useEffect(() => {
    if (pathname !== '/gift') {
      setIsGiftRevealed(false);
    }
  }, [pathname]);

  const isGiftPage = pathname === '/gift';
  const showToggle = !isGiftPage || isGiftRevealed;

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme, isPanelOpen, setIsPanelOpen, triggerGiftReveal, isGiftRevealed }}>
      {children}
      
      {/* Global Theme Customizer Button */}
      {showToggle && (
        <button 
          className="global-customize-toggle"
          onClick={() => setIsPanelOpen(true)}
          title="Customize Theme"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.32187 19.4633 5.32187 20.2152 4.85857 20.6785L4.41421 21.1228C3.80415 21.7329 3.97825 22.7663 4.78915 22.9515C7.14207 23.4907 9.54474 23.0135 11.5 22.0583" />
            <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
            <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
            <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
            <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" />
          </svg>
        </button>
      )}

      {/* Global Theme Customizer Drawer */}
      <div className={`global-customizer-panel ${isPanelOpen ? 'panel-open' : ''}`}>
        <div className="global-panel-header">
          <h3>Theme Accent</h3>
          <button className="global-close-panel-btn" onClick={() => setIsPanelOpen(false)}>✕</button>
        </div>
        <div className="global-theme-list">
          {THEMES.map((themeOption) => (
            <button 
              key={themeOption.id} 
              className={`global-theme-option ${activeTheme.id === themeOption.id ? 'theme-active' : ''}`}
              onClick={() => setTheme(themeOption.id)}
            >
              <span className="global-color-dot" style={{ background: themeOption.accent }} />
              <span className="global-theme-name">{themeOption.name}</span>
            </button>
          ))}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

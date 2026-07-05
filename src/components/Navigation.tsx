'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';

export default function Navigation() {
  const pathname = usePathname();

  // Hide navigation/header completely on gift pages
  if (pathname === '/gift') return null;

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logoLink} title="Symmetry Showcase">
        <div className={styles.logo} aria-label="Upayan Ambigram Logo" />
      </Link>
      
      {pathname === '/admin' && (
        <nav className={styles.adminNav}>
          <Link href="/showcase" className={styles.backBtn}>
            ← Back to Showcase
          </Link>
        </nav>
      )}
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.mockupNav}>
      <Link href="/" className={pathname === '/' ? styles.active : ''}>
        Showcase
      </Link>
      <Link href="/admin" className={pathname === '/admin' ? styles.active : ''}>
        Admin
      </Link>
    </nav>
  );
}

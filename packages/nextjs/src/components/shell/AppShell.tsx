'use client';

import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Breadcrumb } from './Breadcrumb';
import styles from './AppShell.module.css';

/**
 * App shell: single sticky header with horizontal nav tabs at the top,
 * then a centered main column. Mobile collapses the nav tabs into a
 * hamburger-triggered drawer (handled inside TopBar).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.root}>
      <a href="#main-content" className="skipLink">
        Skip to content
      </a>
      <TopBar />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <div className={styles.mainInner}>
          <Breadcrumb />
          {children}
        </div>
      </main>
      <footer className={styles.footer}>By EVVM with care</footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { NAV_GROUPS, isActive, type NavItem } from './navItems';
import { IconMenu, IconX } from './icons';
import styles from './TopBar.module.css';

/**
 * Flatten grouped nav into the order we want tabs to appear, but keep the
 * groups around for the mobile drawer (where section labels still help).
 */
const FLAT_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function TopBar() {
  const pathname = usePathname();
  const { deployment } = useEvvmDeployment();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.topRow}>
          <Button
            variant="ghost"
            size="md"
            iconOnly
            className={styles.menuBtn}
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <IconMenu />
          </Button>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandIcon} aria-hidden>E</span>
            <span className={styles.brandText}>Scaffold-EVVM</span>
          </Link>
          <span className={styles.spacer} />
          {deployment && (
            <span className={styles.network} title="Connected chain · EVVM ID">
              <span className={styles.networkDot} aria-hidden />
              Chain <span className={styles.networkNum}>{deployment.chainId}</span>
              <span style={{ opacity: 0.6 }}>·</span>
              EVVM <span className={styles.networkNum}>{deployment.evvmID}</span>
            </span>
          )}
          <div className={styles.actions}>
            <ThemeToggle />
            <WalletConnect />
          </div>
        </div>
        <nav className={styles.navRow} aria-label="Primary">
          {FLAT_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.tab} ${active ? styles.tabActive : ''}`.trim()}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.tabIcon}>
                  <Icon width={16} height={16} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {open && (
        <>
          <div
            className={styles.drawerBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className={styles.drawerHead}>
              <Link href="/" className={styles.brand}>
                <span className={styles.brandIcon} aria-hidden>E</span>
                <span className={styles.brandText}>Scaffold-EVVM</span>
              </Link>
              <Button
                variant="ghost"
                size="md"
                iconOnly
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <IconX />
              </Button>
            </div>
            <nav className={styles.drawerNav}>
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className={styles.drawerGroup}>
                  <span className={styles.drawerGroupLabel}>{group.label}</span>
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.drawerItem} ${active ? styles.drawerItemActive : ''}`.trim()}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

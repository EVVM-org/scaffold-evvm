'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui';
import { NAV_GROUPS, isActive } from './navItems';
import { IconMenu, IconX } from './icons';
import styles from './TopBar.module.css';

export function TopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock page scroll while drawer is open on mobile.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Close on Escape.
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
      <header className={styles.topbar}>
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
          Scaffold-EVVM
        </Link>
        <span className={styles.spacer} />
        <div className={styles.actions}>
          <ThemeToggle />
          <WalletConnect />
        </div>
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
                Scaffold-EVVM
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
                <div key={group.label} className={styles.group}>
                  <span className={styles.groupLabel}>{group.label}</span>
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.item} ${active ? styles.itemActive : ''}`.trim()}
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

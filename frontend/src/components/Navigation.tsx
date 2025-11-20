'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletConnect } from '@/components/WalletConnect';
import { ThemeToggle } from '@/components/ThemeToggle';
import styles from '@/styles/components/Navigation.module.css';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/faucet', label: 'Faucet' },
    { href: '/evvm/register', label: 'Register EVVM' },
    { href: '/evvm/status', label: 'Status' },
    { href: '/evvm/payments', label: 'Payments' },
    { href: '/evvm/treasury', label: 'Treasury' },
    { href: '/evvm/staking', label: 'Staking' },
    { href: '/evvm/nameservice', label: 'Names' },
    { href: '/evvm/p2pswap', label: 'P2P Swap' },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <span className={styles.logoText}>Scaffold-EVVM</span>
        </Link>

        <div className={styles.navLinks}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className={styles.navActions}>
          <ThemeToggle />
          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}

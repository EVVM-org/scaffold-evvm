/**
 * Canonical route config for the app shell. Both the desktop Sidebar and
 * mobile TopBar/drawer read from this list so there's a single place to
 * reorder or rename nav entries. Groups render as labeled sections in the
 * sidebar and collapse into one continuous list on mobile.
 */

import type { ComponentType, SVGProps } from 'react';
import {
  IconHome,
  IconCoins,
  IconUser,
  IconPulse,
  IconGift,
  IconBank,
  IconKey,
  IconTag,
  IconSwap,
  IconExplorer,
  IconSettings,
  IconBox,
} from './icons';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ href: '/', label: 'Home', icon: IconHome }],
  },
  {
    label: 'EVVM',
    items: [
      { href: '/evvm/register', label: 'Register', icon: IconUser },
      { href: '/evvm/status', label: 'Status', icon: IconPulse },
      { href: '/evvm/payments', label: 'Payments', icon: IconCoins },
      { href: '/evvm/staking', label: 'Staking', icon: IconBank },
      { href: '/evvm/nameservice', label: 'Names', icon: IconTag },
      { href: '/evvm/p2pswap', label: 'P2P Swap', icon: IconSwap },
      { href: '/evvm/treasury', label: 'Treasury', icon: IconKey },
    ],
  },
  {
    label: 'Explorer',
    items: [{ href: '/evvmscan', label: 'EVVMScan', icon: IconExplorer }],
  },
  {
    label: 'Custom',
    items: [{ href: '/services', label: 'Services', icon: IconBox }],
  },
  {
    label: 'Tools',
    items: [
      { href: '/faucet', label: 'Faucet', icon: IconGift },
      { href: '/config', label: 'Config', icon: IconSettings },
    ],
  },
];

export function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

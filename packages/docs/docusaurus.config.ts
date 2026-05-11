import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

/**
 * Docusaurus configuration for the in-app scaffold-evvm documentation site.
 *
 * The site is served under `/docs` so the Next.js shell can proxy to it
 * during development (via a `next.config.mjs` rewrite) and serve the static
 * build from `packages/nextjs/public/docs/` in production. Both modes share
 * the same URL surface, which is why `baseUrl` is `/docs/` rather than `/`.
 */
const config: Config = {
  title: 'Scaffold-EVVM Docs',
  tagline: 'The complete development environment for the EVVM ecosystem',
  favicon: 'img/favicon.ico',

  url: 'http://localhost:3000',
  baseUrl: '/docs/',

  /**
   * Emit flat `<page>.html` files instead of `<page>/index.html` so URLs
   * like `/docs/architecture/overview` resolve naturally against the
   * Next.js static file handler (which serves `public/foo.html` at
   * `/foo`). Without this, every doc URL would 404 because Next.js
   * with `trailingSlash: false` strips trailing slashes, and there's
   * no `architecture/overview.html` for the bare URL to land on.
   */
  trailingSlash: false,

  organizationName: 'EVVM-org',
  projectName: 'scaffold-evvm',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/EVVM-org/scaffold-evvm/edit/main/packages/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/scaffold-evvm-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Scaffold-EVVM',
      logo: {
        alt: 'Scaffold-EVVM',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: '/',
          label: '← Back to App',
          position: 'right',
        },
        {
          href: 'https://github.com/EVVM-org/scaffold-evvm',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/getting-started/quickstart' },
            { label: 'Concepts', to: '/concepts/meta-transactions' },
            { label: 'Custom Services', to: '/custom-services/overview' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'EVVM website', href: 'https://evvm.org' },
            { label: 'EVVM docs', href: 'https://www.evvm.info/docs/intro' },
          ],
        },
        {
          title: 'Repos',
          items: [
            { label: 'scaffold-evvm', href: 'https://github.com/EVVM-org/scaffold-evvm' },
            { label: 'evvm-js SDK', href: 'https://github.com/EVVM-org/evvm-js' },
          ],
        },
      ],
      copyright: `EVVM Noncommercial License v1.0 · Made with 🧉 for the EVVM ecosystem.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['solidity', 'bash', 'typescript', 'tsx', 'json', 'toml', 'diff'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

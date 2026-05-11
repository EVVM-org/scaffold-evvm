import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/wizard',
        'getting-started/two-terminal',
        'getting-started/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/monorepo',
        'architecture/contract-sources',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/meta-transactions',
        'concepts/eip-191-signatures',
        'concepts/dual-signature',
        'concepts/dual-executor',
        'concepts/nonces',
      ],
    },
    {
      type: 'category',
      label: 'Core Contracts',
      items: [
        'contracts/core',
        'contracts/staking',
        'contracts/estimator',
        'contracts/nameservice',
        'contracts/treasury',
        'contracts/p2pswap',
      ],
    },
    {
      type: 'category',
      label: 'Frontend Pages',
      items: [
        'frontend/overview',
        'frontend/payments',
        'frontend/staking',
        'frontend/nameservice',
        'frontend/p2pswap',
        'frontend/treasury',
        'frontend/register',
        'frontend/status',
        'frontend/faucet',
        'frontend/config',
      ],
    },
    {
      type: 'category',
      label: 'EVVMScan Explorer',
      items: [
        'explorer/overview',
        'explorer/transaction-details',
        'explorer/address-details',
        'explorer/block-details',
      ],
    },
    {
      type: 'category',
      label: 'Custom Services',
      items: [
        'custom-services/overview',
        'custom-services/folder-convention',
        'custom-services/manifest',
        'custom-services/auto-ui',
        'custom-services/examples',
      ],
    },
    {
      type: 'category',
      label: 'CLI Reference',
      items: ['cli/commands', 'cli/scripts'],
    },
    'faq',
  ],
};

export default sidebars;

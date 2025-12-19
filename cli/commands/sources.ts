/**
 * Contract Sources Command
 *
 * Manages EVVM contract source repositories:
 * - Check status of Testnet-Contracts and Playground-Contracts
 * - Clone missing repositories
 * - Update to latest versions
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import prompts from 'prompts';
import {
  checkContractSources,
  displayContractSourcesStatus,
  cloneRepo,
  pullLatest,
  initSubmodules,
  ensureContractSources,
} from '../utils/contractSources.js';
import { sectionHeader, success, warning, error, info, dim, divider, evvmGreen } from '../utils/display.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

/**
 * Main sources command
 */
export async function manageSources(): Promise<void> {
  console.log(evvmGreen(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    SCAFFOLD-EVVM                              ║
║                Contract Sources Manager                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

  // Check current status
  const status = await checkContractSources(PROJECT_ROOT);
  displayContractSourcesStatus(status);

  // Determine available actions
  const choices: prompts.Choice[] = [];

  // Clone options for missing repos
  if (!status.testnet.exists) {
    choices.push({
      title: chalk.green('Clone Testnet-Contracts'),
      value: 'clone-testnet',
      description: 'Clone production-ready contracts from GitHub',
    });
  }
  if (!status.playground.exists) {
    choices.push({
      title: chalk.green('Clone Playground-Contracts'),
      value: 'clone-playground',
      description: 'Clone experimental contracts from GitHub',
    });
  }

  // Update options for existing repos
  if (status.testnet.exists && status.testnet.behind > 0) {
    choices.push({
      title: chalk.yellow(`Update Testnet-Contracts (${status.testnet.behind} behind)`),
      value: 'update-testnet',
      description: 'Pull latest changes from remote',
    });
  }
  if (status.playground.exists && status.playground.behind > 0) {
    choices.push({
      title: chalk.yellow(`Update Playground-Contracts (${status.playground.behind} behind)`),
      value: 'update-playground',
      description: 'Pull latest changes from remote',
    });
  }

  // Clone both if neither exists
  if (!status.testnet.exists && !status.playground.exists) {
    choices.unshift({
      title: evvmGreen('Clone Both Repositories'),
      value: 'clone-both',
      description: 'Clone both Testnet and Playground contracts',
    });
  }

  // Update all if both need updates
  if (
    status.testnet.exists &&
    status.playground.exists &&
    (status.testnet.behind > 0 || status.playground.behind > 0)
  ) {
    choices.unshift({
      title: evvmGreen('Update All'),
      value: 'update-all',
      description: 'Pull latest changes for all repositories',
    });
  }

  // Refresh option
  choices.push({
    title: 'Refresh Status',
    value: 'refresh',
    description: 'Check status again',
  });

  // Exit
  choices.push({
    title: 'Exit',
    value: 'exit',
    description: 'Return to main menu',
  });

  // Show action menu
  const response = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices,
  });

  if (!response.action || response.action === 'exit') {
    return;
  }

  // Execute selected action
  switch (response.action) {
    case 'clone-both':
      await cloneRepo(PROJECT_ROOT, 'testnet');
      await initSubmodules(join(PROJECT_ROOT, '..', 'Testnet-Contracts'));
      await cloneRepo(PROJECT_ROOT, 'playground');
      await initSubmodules(join(PROJECT_ROOT, '..', 'Playground-Contracts'));
      break;

    case 'clone-testnet':
      await cloneRepo(PROJECT_ROOT, 'testnet');
      await initSubmodules(join(PROJECT_ROOT, '..', 'Testnet-Contracts'));
      break;

    case 'clone-playground':
      await cloneRepo(PROJECT_ROOT, 'playground');
      await initSubmodules(join(PROJECT_ROOT, '..', 'Playground-Contracts'));
      break;

    case 'update-all':
      if (status.testnet.exists && status.testnet.behind > 0) {
        if (status.testnet.hasUncommittedChanges) {
          warning('Testnet-Contracts has uncommitted changes. Skipping update.');
        } else {
          await pullLatest(status.testnet.path!);
        }
      }
      if (status.playground.exists && status.playground.behind > 0) {
        if (status.playground.hasUncommittedChanges) {
          warning('Playground-Contracts has uncommitted changes. Skipping update.');
        } else {
          await pullLatest(status.playground.path!);
        }
      }
      break;

    case 'update-testnet':
      if (status.testnet.hasUncommittedChanges) {
        warning('Testnet-Contracts has uncommitted changes. Please commit or stash first.');
      } else {
        await pullLatest(status.testnet.path!);
      }
      break;

    case 'update-playground':
      if (status.playground.hasUncommittedChanges) {
        warning('Playground-Contracts has uncommitted changes. Please commit or stash first.');
      } else {
        await pullLatest(status.playground.path!);
      }
      break;

    case 'refresh':
      await manageSources();
      return;
  }

  // Show updated status
  divider();
  console.log(chalk.cyan('\nUpdated Status:\n'));
  const newStatus = await checkContractSources(PROJECT_ROOT);
  displayContractSourcesStatus(newStatus);

  // Remind about syncing
  info('Remember to sync contracts after updating:');
  console.log(chalk.gray('  npm run sync-contracts'));
}

/**
 * Quick check command (non-interactive)
 */
export async function checkSources(): Promise<boolean> {
  sectionHeader('Contract Sources Check');

  const status = await checkContractSources(PROJECT_ROOT);
  displayContractSourcesStatus(status);

  const hasTestnet = status.testnet.exists;
  const hasPlayground = status.playground.exists;

  if (!hasTestnet && !hasPlayground) {
    error('No contract sources found!');
    info('Run "npm run cli sources" to clone repositories.');
    return false;
  }

  if (status.testnet.behind > 0 || status.playground.behind > 0) {
    warning('Some repositories are behind remote.');
    info('Run "npm run cli sources" to update.');
  }

  return true;
}

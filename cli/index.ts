#!/usr/bin/env node

/**
 * Scaffold-EVVM CLI
 *
 * The unified development environment for EVVM ecosystem.
 * Supports both Foundry and Hardhat frameworks with
 * Testnet-Contracts and Playground-Contracts sources.
 */

import chalk from 'chalk';
import prompts from 'prompts';
import { config } from 'dotenv';

import { showBanner, parseArgs } from './utils/display.js';
import { checkPrerequisites } from './utils/prerequisites.js';
import { initProject } from './commands/init.js';
import { deployContracts } from './commands/deploy.js';
import { startChain } from './commands/chain.js';
import { configureProject } from './commands/config.js';
import { fullStart } from './commands/start.js';

// Load environment variables
config();

// EVVM Brand Color (RGB: 1, 240, 148)
export const evvmGreen = chalk.rgb(1, 240, 148);

/**
 * Main interactive wizard flow
 */
async function interactiveWizard(): Promise<void> {
  console.log(chalk.blue('\nWelcome to Scaffold-EVVM!\n'));
  console.log(chalk.gray('This wizard will help you set up your EVVM development environment.\n'));

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      {
        title: evvmGreen('Full Setup & Launch'),
        value: 'start',
        description: 'Complete setup: framework → contracts → deploy → frontend (recommended)'
      },
      {
        title: 'Initialize project',
        value: 'init',
        description: 'Set up framework and contracts only'
      },
      {
        title: 'Deploy contracts',
        value: 'deploy',
        description: 'Deploy EVVM contracts to a network'
      },
      {
        title: 'Start local chain',
        value: 'chain',
        description: 'Start Anvil or Hardhat local blockchain'
      },
      {
        title: 'Configure project',
        value: 'config',
        description: 'Update EVVM configuration (addresses, metadata)'
      },
      {
        title: 'Exit',
        value: 'exit',
        description: 'Exit the wizard'
      }
    ]
  });

  if (!action || action === 'exit') {
    console.log(chalk.yellow('\nGoodbye! Happy building with EVVM.\n'));
    process.exit(0);
  }

  switch (action) {
    case 'start':
      await fullStart();
      break;
    case 'init':
      await initProject();
      break;
    case 'deploy':
      await deployContracts();
      break;
    case 'chain':
      await startChain();
      break;
    case 'config':
      await configureProject();
      break;
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Show banner
  showBanner();

  // Parse command line arguments
  const command = parseArgs();

  // Skip prereqs check for help
  if (command !== 'help') {
    // Check prerequisites
    const prereqsPassed = await checkPrerequisites();
    if (!prereqsPassed) {
      process.exit(1);
    }
  }

  // Execute command or show interactive wizard
  switch (command) {
    case 'start':
      await fullStart();
      break;
    case 'init':
      await initProject();
      break;
    case 'deploy':
      await deployContracts();
      break;
    case 'chain':
      await startChain();
      break;
    case 'config':
      await configureProject();
      break;
    case 'help':
      showHelp();
      break;
    default:
      // No command specified, run interactive wizard
      await interactiveWizard();
  }
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
${evvmGreen('Scaffold-EVVM CLI')} - The complete EVVM development environment

${chalk.yellow('Usage:')}
  npm run wizard              Interactive wizard (recommended)
  npm run start:full          Full setup: framework → contracts → deploy → frontend
  npm run cli <command>       Run a specific command

${chalk.yellow('Commands:')}
  start         ${chalk.green('Full setup & launch')} (framework → contracts → deploy → frontend)
  init          Initialize a new project (select framework & contracts)
  deploy        Deploy EVVM contracts to a network
  chain         Start a local blockchain (Anvil or Hardhat)
  config        Configure EVVM parameters (addresses, metadata)
  help          Show this help message

${chalk.yellow('Quick Start:')}
  ${chalk.cyan('npm run start:full')}     # One command to do everything!

${chalk.yellow('Framework Commands:')}
  npm run foundry:chain       Start Anvil local chain
  npm run foundry:compile     Compile contracts with Forge
  npm run foundry:test        Run Foundry tests
  npm run foundry:deploy      Deploy with Foundry

  npm run hardhat:chain       Start Hardhat local chain
  npm run hardhat:compile     Compile contracts with Hardhat
  npm run hardhat:test        Run Hardhat tests
  npm run hardhat:deploy      Deploy with Hardhat

${chalk.yellow('Frontend Commands:')}
  npm run dev                 Start Next.js development server
  npm run build               Build for production
  npm run start               Start production server

${chalk.yellow('Utility Commands:')}
  npm run sync-contracts      Sync contracts from Testnet/Playground
  npm run generate-abis       Generate ABIs for frontend

${chalk.yellow('Examples:')}
  npm run start:full          # Complete setup in one command
  npm run wizard              # Interactive setup wizard
  npm run cli init            # Initialize project only
  npm run cli deploy          # Deploy contracts only

${chalk.yellow('Documentation:')}
  EVVM Docs: https://www.evvm.info/docs
  Foundry: https://book.getfoundry.sh
  Hardhat: https://hardhat.org/docs
`);
}

// Run main function
main().catch((error) => {
  console.error(chalk.red('\nError:'), error.message || error);
  process.exit(1);
});

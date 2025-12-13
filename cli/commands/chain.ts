/**
 * Local blockchain management command
 *
 * Starts and manages local development blockchain
 * using Anvil (Foundry) or Hardhat Network.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import { execa } from 'execa';
import { sectionHeader, success, warning, error, info, dim, divider } from '../utils/display.js';
import { commandExists } from '../utils/prerequisites.js';

interface ScaffoldConfig {
  framework: 'foundry' | 'hardhat';
  contractSource: 'testnet' | 'playground';
  initialized: boolean;
}

/**
 * Main chain command
 */
export async function startChain(): Promise<void> {
  sectionHeader('Local Blockchain');

  const projectRoot = process.cwd();
  const config = loadProjectConfig(projectRoot);

  // Determine which chain to start
  let chainType: 'anvil' | 'hardhat';

  if (config) {
    chainType = config.framework === 'foundry' ? 'anvil' : 'hardhat';
    info(`Using ${chalk.green(config.framework.toUpperCase())} from project configuration.\n`);
  } else {
    // Ask user which chain to start
    const chainResponse = await prompts({
      type: 'select',
      name: 'chain',
      message: 'Select local blockchain:',
      choices: [
        {
          title: 'Anvil (Foundry)',
          value: 'anvil',
          description: 'Fast, Foundry-native local chain'
        },
        {
          title: 'Hardhat Network',
          value: 'hardhat',
          description: 'Hardhat local development network'
        }
      ]
    });

    if (!chainResponse.chain) {
      error('Cancelled.');
      return;
    }

    chainType = chainResponse.chain;
  }

  // Chain configuration options
  const optionsResponse = await prompts([
    {
      type: 'number',
      name: 'blockTime',
      message: `Block time in seconds ${chalk.gray('[10]')}:`,
      initial: 10,
      min: 1,
      max: 60
    },
    {
      type: 'number',
      name: 'port',
      message: `RPC port ${chalk.gray('[8545]')}:`,
      initial: 8545,
      min: 1024,
      max: 65535
    }
  ]);

  const blockTime = optionsResponse.blockTime || 10;
  const port = optionsResponse.port || 8545;

  // Start the chain
  if (chainType === 'anvil') {
    await startAnvil(blockTime, port);
  } else {
    await startHardhatNetwork(port, projectRoot);
  }
}

/**
 * Load project configuration
 */
function loadProjectConfig(projectRoot: string): ScaffoldConfig | null {
  const configPath = join(projectRoot, 'scaffold.config.json');

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Start Anvil local chain
 */
async function startAnvil(blockTime: number, port: number): Promise<void> {
  // Check if Anvil is installed
  const hasAnvil = await commandExists('anvil');

  if (!hasAnvil) {
    error('Anvil not found. Install Foundry from: https://getfoundry.sh/');
    return;
  }

  divider();
  console.log(chalk.cyan('                    ANVIL LOCAL CHAIN'));
  divider();

  info('Starting Anvil...\n');

  console.log(chalk.yellow('Configuration:'));
  console.log(`  Block time:  ${chalk.green(`${blockTime}s`)}`);
  console.log(`  RPC URL:     ${chalk.green(`http://localhost:${port}`)}`);
  console.log(`  Chain ID:    ${chalk.green('31337')}\n`);

  console.log(chalk.yellow('Test Accounts:'));
  dim('Anvil will display test accounts with 10000 ETH each.\n');

  console.log(chalk.gray('Press Ctrl+C to stop the chain.\n'));

  divider();

  try {
    await execa('anvil', [
      '--block-time', String(blockTime),
      '--port', String(port),
      '--accounts', '10',
      '--balance', '10000'
    ], {
      stdio: 'inherit'
    });
  } catch (err: any) {
    if (err.signal === 'SIGINT') {
      console.log(chalk.yellow('\n\nAnvil stopped.'));
    } else {
      error(`Anvil error: ${err.message}`);
    }
  }
}

/**
 * Start Hardhat Network
 */
async function startHardhatNetwork(port: number, projectRoot: string): Promise<void> {
  const hardhatDir = join(projectRoot, 'packages', 'hardhat');

  // Check if hardhat package exists
  if (!existsSync(hardhatDir)) {
    error('Hardhat package not found. Run "npm run wizard" to initialize.');
    return;
  }

  divider();
  console.log(chalk.cyan('                 HARDHAT LOCAL NETWORK'));
  divider();

  info('Starting Hardhat Network...\n');

  console.log(chalk.yellow('Configuration:'));
  console.log(`  RPC URL:     ${chalk.green(`http://localhost:${port}`)}`);
  console.log(`  Chain ID:    ${chalk.green('31337')}\n`);

  console.log(chalk.yellow('Test Accounts:'));
  dim('Hardhat will display test accounts with 10000 ETH each.\n');

  console.log(chalk.gray('Press Ctrl+C to stop the chain.\n'));

  divider();

  try {
    await execa('npx', [
      'hardhat', 'node',
      '--port', String(port),
      '--no-deploy'
    ], {
      cwd: hardhatDir,
      stdio: 'inherit'
    });
  } catch (err: any) {
    if (err.signal === 'SIGINT') {
      console.log(chalk.yellow('\n\nHardhat Network stopped.'));
    } else {
      error(`Hardhat error: ${err.message}`);
    }
  }
}

/**
 * Fork a mainnet or testnet
 */
export async function forkNetwork(): Promise<void> {
  sectionHeader('Fork Network');

  const forkResponse = await prompts({
    type: 'select',
    name: 'network',
    message: 'Select network to fork:',
    choices: [
      { title: 'Ethereum Mainnet', value: 'mainnet' },
      { title: 'Ethereum Sepolia', value: 'sepolia' },
      { title: 'Arbitrum One', value: 'arbitrum' },
      { title: 'Arbitrum Sepolia', value: 'arbitrum-sepolia' },
      { title: 'Custom RPC', value: 'custom' }
    ]
  });

  if (!forkResponse.network) {
    error('Cancelled.');
    return;
  }

  let forkUrl: string;

  switch (forkResponse.network) {
    case 'mainnet':
      forkUrl = process.env.RPC_URL_MAINNET || 'https://eth.llamarpc.com';
      break;
    case 'sepolia':
      forkUrl = process.env.RPC_URL_ETH_SEPOLIA || 'https://1rpc.io/sepolia';
      break;
    case 'arbitrum':
      forkUrl = 'https://arb1.arbitrum.io/rpc';
      break;
    case 'arbitrum-sepolia':
      forkUrl = process.env.RPC_URL_ARB_SEPOLIA || 'https://sepolia-rollup.arbitrum.io/rpc';
      break;
    case 'custom':
      const customResponse = await prompts({
        type: 'text',
        name: 'url',
        message: 'Enter RPC URL to fork:',
        validate: (v) => v.startsWith('http') ? true : 'Must be a valid URL'
      });
      if (!customResponse.url) return;
      forkUrl = customResponse.url;
      break;
    default:
      return;
  }

  info(`Forking ${forkResponse.network}...`);
  dim(`RPC: ${forkUrl}\n`);

  try {
    await execa('anvil', [
      '--fork-url', forkUrl,
      '--block-time', '10',
      '--accounts', '10',
      '--balance', '10000'
    ], {
      stdio: 'inherit'
    });
  } catch (err: any) {
    if (err.signal === 'SIGINT') {
      console.log(chalk.yellow('\n\nFork stopped.'));
    } else {
      error(`Fork error: ${err.message}`);
    }
  }
}

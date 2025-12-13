/**
 * Project configuration command
 *
 * Allows updating EVVM configuration after initial setup.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import { sectionHeader, success, warning, error, info, dim, divider } from '../utils/display.js';

interface AddressConfig {
  admin: string;
  goldenFisher: string;
  activator: string;
}

interface BasicMetadata {
  EvvmName: string;
  principalTokenName: string;
  principalTokenSymbol: string;
}

interface AdvancedMetadata {
  totalSupply: string;
  eraTokens: string;
  reward: string;
}

/**
 * Main config command
 */
export async function configureProject(): Promise<void> {
  sectionHeader('Project Configuration');

  const projectRoot = process.cwd();
  const inputDir = join(projectRoot, 'input');

  // Check if input directory exists
  if (!existsSync(inputDir)) {
    error('Project not initialized. Run "npm run wizard" first.');
    return;
  }

  // Select what to configure
  const configResponse = await prompts({
    type: 'select',
    name: 'section',
    message: 'What would you like to configure?',
    choices: [
      {
        title: 'Admin Addresses',
        value: 'addresses',
        description: 'Update admin, golden fisher, activator addresses'
      },
      {
        title: 'EVVM Metadata',
        value: 'basic',
        description: 'Update EVVM name and token information'
      },
      {
        title: 'Advanced Settings',
        value: 'advanced',
        description: 'Update supply, era tokens, rewards'
      },
      {
        title: 'Environment Variables',
        value: 'env',
        description: 'Update .env configuration'
      },
      {
        title: 'View Current Config',
        value: 'view',
        description: 'Display current configuration'
      }
    ]
  });

  if (!configResponse.section) {
    return;
  }

  switch (configResponse.section) {
    case 'addresses':
      await configureAddresses(inputDir);
      break;
    case 'basic':
      await configureBasicMetadata(inputDir);
      break;
    case 'advanced':
      await configureAdvancedMetadata(inputDir);
      break;
    case 'env':
      await configureEnv(projectRoot);
      break;
    case 'view':
      await viewConfig(inputDir, projectRoot);
      break;
  }
}

/**
 * Configure admin addresses
 */
async function configureAddresses(inputDir: string): Promise<void> {
  const addressPath = join(inputDir, 'address.json');
  let current: AddressConfig = {
    admin: '',
    goldenFisher: '',
    activator: ''
  };

  if (existsSync(addressPath)) {
    try {
      current = JSON.parse(readFileSync(addressPath, 'utf-8'));
    } catch {
      // Use defaults
    }
  }

  info('Update admin addresses (leave empty to keep current value)\n');

  const responses = await prompts([
    {
      type: 'text',
      name: 'admin',
      message: `Admin ${chalk.gray(`[${current.admin || 'not set'}]`)}:`,
      validate: (v) => !v || validateAddress(v) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'goldenFisher',
      message: `Golden Fisher ${chalk.gray(`[${current.goldenFisher || 'not set'}]`)}:`,
      validate: (v) => !v || validateAddress(v) ? true : 'Invalid address'
    },
    {
      type: 'text',
      name: 'activator',
      message: `Activator ${chalk.gray(`[${current.activator || 'not set'}]`)}:`,
      validate: (v) => !v || validateAddress(v) ? true : 'Invalid address'
    }
  ]);

  const updated: AddressConfig = {
    admin: responses.admin || current.admin,
    goldenFisher: responses.goldenFisher || current.goldenFisher,
    activator: responses.activator || current.activator
  };

  writeFileSync(addressPath, JSON.stringify(updated, null, 2) + '\n');
  success('Addresses updated!');
}

/**
 * Configure basic metadata
 */
async function configureBasicMetadata(inputDir: string): Promise<void> {
  const metadataPath = join(inputDir, 'evvmBasicMetadata.json');
  let current: BasicMetadata = {
    EvvmName: 'EVVM',
    principalTokenName: 'Mate token',
    principalTokenSymbol: 'MATE'
  };

  if (existsSync(metadataPath)) {
    try {
      current = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    } catch {
      // Use defaults
    }
  }

  info('Update EVVM metadata (leave empty to keep current value)\n');

  const responses = await prompts([
    {
      type: 'text',
      name: 'EvvmName',
      message: `EVVM Name ${chalk.gray(`[${current.EvvmName}]`)}:`
    },
    {
      type: 'text',
      name: 'principalTokenName',
      message: `Token Name ${chalk.gray(`[${current.principalTokenName}]`)}:`
    },
    {
      type: 'text',
      name: 'principalTokenSymbol',
      message: `Token Symbol ${chalk.gray(`[${current.principalTokenSymbol}]`)}:`
    }
  ]);

  const updated: BasicMetadata = {
    EvvmName: responses.EvvmName || current.EvvmName,
    principalTokenName: responses.principalTokenName || current.principalTokenName,
    principalTokenSymbol: responses.principalTokenSymbol || current.principalTokenSymbol
  };

  writeFileSync(metadataPath, JSON.stringify(updated, null, 2) + '\n');
  success('Metadata updated!');
}

/**
 * Configure advanced metadata
 */
async function configureAdvancedMetadata(inputDir: string): Promise<void> {
  const metadataPath = join(inputDir, 'evvmAdvancedMetadata.json');
  let current: AdvancedMetadata = {
    totalSupply: '2033333333000000000000000000',
    eraTokens: '1016666666500000000000000000',
    reward: '5000000000000000000'
  };

  if (existsSync(metadataPath)) {
    try {
      current = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    } catch {
      // Use defaults
    }
  }

  info('Update advanced settings (leave empty to keep current value)\n');
  warning('These values are in wei (18 decimals)\n');

  const responses = await prompts([
    {
      type: 'text',
      name: 'totalSupply',
      message: `Total Supply ${chalk.gray(`[${current.totalSupply}]`)}:`,
      validate: (v) => !v || validateNumber(v) ? true : 'Must be a number'
    },
    {
      type: 'text',
      name: 'eraTokens',
      message: `Era Tokens ${chalk.gray(`[${current.eraTokens}]`)}:`,
      validate: (v) => !v || validateNumber(v) ? true : 'Must be a number'
    },
    {
      type: 'text',
      name: 'reward',
      message: `Reward ${chalk.gray(`[${current.reward}]`)}:`,
      validate: (v) => !v || validateNumber(v) ? true : 'Must be a number'
    }
  ]);

  const updated: AdvancedMetadata = {
    totalSupply: responses.totalSupply || current.totalSupply,
    eraTokens: responses.eraTokens || current.eraTokens,
    reward: responses.reward || current.reward
  };

  // Write in alphabetical order for Foundry compatibility
  const content = `{
  "eraTokens": ${updated.eraTokens},
  "reward": ${updated.reward},
  "totalSupply": ${updated.totalSupply}
}
`;

  writeFileSync(metadataPath, content);
  success('Advanced settings updated!');
}

/**
 * Configure environment variables
 */
async function configureEnv(projectRoot: string): Promise<void> {
  const envPath = join(projectRoot, '.env');

  if (!existsSync(envPath)) {
    error('.env file not found. Run "npm run wizard" to create it.');
    return;
  }

  info('Update environment variables\n');
  dim('Leave empty to keep current value\n');

  const responses = await prompts([
    {
      type: 'text',
      name: 'projectId',
      message: 'WalletConnect Project ID:',
      hint: 'Get one at https://cloud.reown.com'
    },
    {
      type: 'text',
      name: 'evvmAddress',
      message: 'EVVM Contract Address:',
      validate: (v) => !v || validateAddress(v) ? true : 'Invalid address'
    },
    {
      type: 'select',
      name: 'chainId',
      message: 'Chain ID:',
      choices: [
        { title: 'Keep current', value: '' },
        { title: 'Ethereum Sepolia (11155111)', value: '11155111' },
        { title: 'Arbitrum Sepolia (421614)', value: '421614' },
        { title: 'Local (31337)', value: '31337' }
      ]
    },
    {
      type: 'text',
      name: 'rpcEth',
      message: 'Ethereum Sepolia RPC:',
      hint: 'e.g., https://1rpc.io/sepolia'
    },
    {
      type: 'text',
      name: 'rpcArb',
      message: 'Arbitrum Sepolia RPC:',
      hint: 'e.g., https://sepolia-rollup.arbitrum.io/rpc'
    },
    {
      type: 'text',
      name: 'etherscanApi',
      message: 'Etherscan API Key:',
      hint: 'For contract verification'
    }
  ]);

  // Read current .env
  let envContent = readFileSync(envPath, 'utf-8');

  // Update values
  if (responses.projectId) {
    envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_PROJECT_ID', responses.projectId);
  }
  if (responses.evvmAddress) {
    envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_EVVM_ADDRESS', responses.evvmAddress);
  }
  if (responses.chainId) {
    envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_CHAIN_ID', responses.chainId);
  }
  if (responses.rpcEth) {
    envContent = updateEnvVar(envContent, 'RPC_URL_ETH_SEPOLIA', responses.rpcEth);
  }
  if (responses.rpcArb) {
    envContent = updateEnvVar(envContent, 'RPC_URL_ARB_SEPOLIA', responses.rpcArb);
  }
  if (responses.etherscanApi) {
    envContent = updateEnvVar(envContent, 'ETHERSCAN_API', responses.etherscanApi);
  }

  writeFileSync(envPath, envContent);
  success('Environment variables updated!');
}

/**
 * View current configuration
 */
async function viewConfig(inputDir: string, projectRoot: string): Promise<void> {
  divider();
  console.log(chalk.cyan('                 CURRENT CONFIGURATION'));
  divider();

  // Scaffold config
  const scaffoldConfigPath = join(projectRoot, 'scaffold.config.json');
  if (existsSync(scaffoldConfigPath)) {
    try {
      const scaffoldConfig = JSON.parse(readFileSync(scaffoldConfigPath, 'utf-8'));
      console.log(chalk.yellow('Project Settings:'));
      console.log(`  Framework:  ${chalk.green(scaffoldConfig.framework || 'Not set')}`);
      console.log(`  Contracts:  ${chalk.green(scaffoldConfig.contractSource || 'Not set')}`);
      console.log('');
    } catch {
      // Skip
    }
  }

  // Addresses
  const addressPath = join(inputDir, 'address.json');
  if (existsSync(addressPath)) {
    try {
      const addresses = JSON.parse(readFileSync(addressPath, 'utf-8'));
      console.log(chalk.yellow('Admin Addresses:'));
      console.log(`  Admin:         ${chalk.green(addresses.admin || 'Not set')}`);
      console.log(`  Golden Fisher: ${chalk.green(addresses.goldenFisher || 'Not set')}`);
      console.log(`  Activator:     ${chalk.green(addresses.activator || 'Not set')}`);
      console.log('');
    } catch {
      // Skip
    }
  }

  // Basic metadata
  const basicPath = join(inputDir, 'evvmBasicMetadata.json');
  if (existsSync(basicPath)) {
    try {
      const basic = JSON.parse(readFileSync(basicPath, 'utf-8'));
      console.log(chalk.yellow('EVVM Metadata:'));
      console.log(`  Name:          ${chalk.green(basic.EvvmName || 'Not set')}`);
      console.log(`  Token Name:    ${chalk.green(basic.principalTokenName || 'Not set')}`);
      console.log(`  Token Symbol:  ${chalk.green(basic.principalTokenSymbol || 'Not set')}`);
      console.log('');
    } catch {
      // Skip
    }
  }

  // Advanced metadata
  const advancedPath = join(inputDir, 'evvmAdvancedMetadata.json');
  if (existsSync(advancedPath)) {
    try {
      const advanced = JSON.parse(readFileSync(advancedPath, 'utf-8'));
      console.log(chalk.yellow('Advanced Settings:'));
      console.log(`  Total Supply:  ${chalk.green(advanced.totalSupply || 'Not set')}`);
      console.log(`  Era Tokens:    ${chalk.green(advanced.eraTokens || 'Not set')}`);
      console.log(`  Reward:        ${chalk.green(advanced.reward || 'Not set')}`);
      console.log('');
    } catch {
      // Skip
    }
  }

  // Environment
  console.log(chalk.yellow('Environment:'));
  console.log(`  Project ID:    ${chalk.green(process.env.NEXT_PUBLIC_PROJECT_ID || 'Not set')}`);
  console.log(`  EVVM Address:  ${chalk.green(process.env.NEXT_PUBLIC_EVVM_ADDRESS || 'Not set')}`);
  console.log(`  Chain ID:      ${chalk.green(process.env.NEXT_PUBLIC_CHAIN_ID || 'Not set')}`);

  divider();
}

/**
 * Update a variable in .env content
 */
function updateEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content + `\n${key}=${value}`;
  }
}

/**
 * Validate Ethereum address
 */
function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate number string
 */
function validateNumber(value: string): boolean {
  return /^[0-9]+$/.test(value);
}

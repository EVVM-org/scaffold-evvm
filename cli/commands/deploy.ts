/**
 * Contract deployment command
 *
 * Handles deployment of EVVM contracts to various networks
 * using either Foundry or Hardhat based on project configuration.
 */

import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import { execa } from 'execa';
import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { sepolia, arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { sectionHeader, success, warning, error, info, dim, divider, evvmGreen } from '../utils/display.js';
import { getAvailableWallets } from '../utils/prerequisites.js';
import { checkContractSources, displayContractSourcesStatus, pullLatest, ensureContractSources } from '../utils/contractSources.js';

// Chain configurations
const CHAIN_CONFIGS = {
  'localhost': { id: 31337, name: 'Local Chain', rpc: 'http://localhost:8545' },
  'eth-sepolia': { id: 11155111, name: 'Ethereum Sepolia', chain: sepolia },
  'arb-sepolia': { id: 421614, name: 'Arbitrum Sepolia', chain: arbitrumSepolia }
};

const EXPLORER_URLS: Record<string, string> = {
  'eth-sepolia': 'https://sepolia.etherscan.io/address/',
  'arb-sepolia': 'https://sepolia.arbiscan.io/address/'
};

// RPC Fallback endpoints for Ethereum Sepolia (ordered by latency/reliability)
const ETH_SEPOLIA_RPC_FALLBACKS = [
  'https://eth-sepolia.api.onfinality.io/public',         // OnFinality (0.060s)
  'https://1rpc.io/sepolia',                              // 1RPC (0.109s)
  'https://ethereum-sepolia.rpc.subquery.network/public', // SubQuery (0.110s)
  'https://ethereum-sepolia-rpc.publicnode.com',          // PublicNode (0.172s)
  'https://sepolia.gateway.tenderly.co',                  // Tenderly (0.172s)
  'https://gateway.tenderly.co/public/sepolia',           // Tenderly Alt (0.172s)
  'https://sepolia.drpc.org',                             // dRPC (0.216s)
  'https://ethereum-sepolia-public.nodies.app',           // Nodies (0.229s)
  'https://0xrpc.io/sep',                                 // 0xRPC (0.250s)
];

// RPC Fallback endpoints for Arbitrum Sepolia (ordered by latency/reliability)
const ARB_SEPOLIA_RPC_FALLBACKS = [
  'https://sepolia-rollup.arbitrum.io/rpc',               // Official Arbitrum (0.134s)
  'https://arbitrum-sepolia.gateway.tenderly.co',         // Tenderly (0.161s)
  'https://arbitrum-sepolia-testnet.api.pocket.network',  // Pocket (0.174s)
  'https://arbitrum-sepolia-rpc.publicnode.com',          // PublicNode (0.236s)
  'https://endpoints.omniatech.io/v1/arbitrum/sepolia/public', // Omnia (0.243s)
  'https://api.zan.top/arb-sepolia',                      // ZAN (0.281s)
  'https://arbitrum-sepolia.drpc.org',                    // dRPC (0.382s)
];

// Registry for EVVM registration
const REGISTRY_ADDRESS = '0x389dC8fb09211bbDA841D59f4a51160dA2377832' as Address;

// Deployments directory for saving summaries
const DEPLOYMENTS_DIR = join(process.cwd(), 'deployments');

interface ScaffoldConfig {
  framework: 'foundry' | 'hardhat';
  contractSource: 'testnet' | 'playground';
  initialized: boolean;
}

interface DeploymentResult {
  evvmAddress: Address;
  stakingAddress: Address;
  estimatorAddress: Address;
  nameServiceAddress: Address;
  treasuryAddress: Address;
  p2pSwapAddress?: Address;
  chainId: number;
  network: string;
}

/**
 * Main deploy command
 */
export async function deployContracts(): Promise<void> {
  sectionHeader('Contract Deployment');

  const projectRoot = process.cwd();

  // Check contract sources (fetches from GitHub to check for updates)
  info('Checking contract source repositories...');
  const sourcesStatus = await checkContractSources(projectRoot);

  const hasTestnet = sourcesStatus.testnet.exists;
  const hasPlayground = sourcesStatus.playground.exists;
  const testnetOutdated = hasTestnet && sourcesStatus.testnet.behind > 0;
  const playgroundOutdated = hasPlayground && sourcesStatus.playground.behind > 0;

  // Display status
  displayContractSourcesStatus(sourcesStatus);

  // Handle missing repos
  if (!hasTestnet && !hasPlayground) {
    error('No contract sources found!');
    info('Run "npm run sources" to clone the repositories.');

    const cloneResponse = await prompts({
      type: 'confirm',
      name: 'clone',
      message: 'Would you like to clone contract repositories now?',
      initial: true
    });

    if (cloneResponse.clone) {
      const sourcesReady = await ensureContractSources(projectRoot, 'both');
      if (!sourcesReady) {
        error('Failed to clone repositories. Please try manually.');
        return;
      }
    } else {
      return;
    }
  }

  // Handle outdated repos - strongly encourage updating to latest
  if (testnetOutdated || playgroundOutdated) {
    console.log(chalk.yellow.bold('\n⚠️  CONTRACT SOURCES ARE OUTDATED!\n'));

    if (testnetOutdated) {
      console.log(chalk.yellow(`   Testnet-Contracts: ${sourcesStatus.testnet.behind} commit(s) behind remote`));
      console.log(chalk.gray(`   Local:  ${sourcesStatus.testnet.localCommit} → Remote: ${sourcesStatus.testnet.remoteCommit}`));
    }
    if (playgroundOutdated) {
      console.log(chalk.yellow(`   Playground-Contracts: ${sourcesStatus.playground.behind} commit(s) behind remote`));
      console.log(chalk.gray(`   Local:  ${sourcesStatus.playground.localCommit} → Remote: ${sourcesStatus.playground.remoteCommit}`));
    }

    console.log(chalk.cyan('\n   Updating ensures you deploy with the latest bug fixes and features.\n'));

    const updateResponse = await prompts({
      type: 'select',
      name: 'action',
      message: 'How would you like to proceed?',
      choices: [
        {
          title: chalk.green('Update to latest (recommended)'),
          value: 'update',
          description: 'Pull latest changes from GitHub'
        },
        {
          title: 'Continue with current version',
          value: 'skip',
          description: 'Use existing local contracts (not recommended)'
        },
        {
          title: 'Cancel',
          value: 'cancel',
          description: 'Exit deployment'
        }
      ]
    });

    if (updateResponse.action === 'cancel' || !updateResponse.action) {
      error('Deployment cancelled.');
      return;
    }

    if (updateResponse.action === 'update') {
      // Update outdated repos
      if (testnetOutdated && sourcesStatus.testnet.path) {
        if (sourcesStatus.testnet.hasUncommittedChanges) {
          warning('Testnet-Contracts has uncommitted changes. Skipping update.');
        } else {
          info('Updating Testnet-Contracts...');
          await pullLatest(sourcesStatus.testnet.path);
        }
      }
      if (playgroundOutdated && sourcesStatus.playground.path) {
        if (sourcesStatus.playground.hasUncommittedChanges) {
          warning('Playground-Contracts has uncommitted changes. Skipping update.');
        } else {
          info('Updating Playground-Contracts...');
          await pullLatest(sourcesStatus.playground.path);
        }
      }
      success('Contract sources updated to latest!');
    } else {
      warning('Continuing with outdated contracts. You may be missing important updates.');
    }
  } else if (hasTestnet || hasPlayground) {
    success('Contract sources are up to date!');
  }

  // Load existing config for pre-selection
  const existingConfig = loadProjectConfig(projectRoot);

  // Step 1: Framework Selection
  sectionHeader('Framework Selection');

  const frameworkResponse = await prompts({
    type: 'select',
    name: 'framework',
    message: 'Select your smart contract framework:',
    choices: [
      { title: 'Foundry', value: 'foundry', description: 'Fast, Solidity-native testing (recommended)' },
      { title: 'Hardhat', value: 'hardhat', description: 'JavaScript/TypeScript ecosystem' }
    ],
    initial: existingConfig?.framework === 'hardhat' ? 1 : 0
  });
  if (!frameworkResponse.framework) {
    error('Deployment cancelled.');
    return;
  }

  // Step 2: Contract Source Selection
  sectionHeader('Contract Source');

  const sourceChoices = [];
  if (hasTestnet) {
    sourceChoices.push({ title: 'Testnet Contracts', value: 'testnet', description: 'Production-ready for testnet' });
  }
  if (hasPlayground) {
    sourceChoices.push({ title: 'Playground Contracts', value: 'playground', description: 'Experimental for prototyping' });
  }

  const sourceResponse = await prompts({
    type: 'select',
    name: 'contractSource',
    message: 'Select contract source:',
    choices: sourceChoices,
    initial: existingConfig?.contractSource === 'playground' ? (hasTestnet ? 1 : 0) : 0
  });
  if (!sourceResponse.contractSource) {
    error('Deployment cancelled.');
    return;
  }

  const config: ScaffoldConfig = {
    framework: frameworkResponse.framework,
    contractSource: sourceResponse.contractSource,
    initialized: true
  };

  // Step 3: Network Selection
  sectionHeader('Network Selection');

  const networkResponse = await prompts({
    type: 'select',
    name: 'network',
    message: 'Select deployment network:',
    choices: [
      {
        title: 'Local (Anvil/Hardhat)',
        value: 'localhost',
        description: 'Deploy to local development chain'
      },
      {
        title: 'Ethereum Sepolia',
        value: 'eth-sepolia',
        description: 'Deploy to Ethereum testnet'
      },
      {
        title: 'Arbitrum Sepolia',
        value: 'arb-sepolia',
        description: 'Deploy to Arbitrum testnet'
      },
      {
        title: 'Custom RPC',
        value: 'custom',
        description: 'Deploy to custom network'
      }
    ]
  });

  if (!networkResponse.network) {
    error('Deployment cancelled.');
    return;
  }

  let customRpc: string | undefined;
  if (networkResponse.network === 'custom') {
    const rpcResponse = await prompts({
      type: 'text',
      name: 'rpc',
      message: 'Enter RPC URL:',
      validate: (value) => value.startsWith('http') ? true : 'Must be a valid URL'
    });
    if (!rpcResponse.rpc) return;
    customRpc = rpcResponse.rpc;
  }

  // Step 4: EVVM Configuration
  sectionHeader('EVVM Configuration');

  const inputDir = join(projectRoot, 'input');
  const existingAddressPath = join(inputDir, 'address.json');
  let useExistingConfig = false;

  if (existsSync(existingAddressPath)) {
    try {
      const existingAddresses = JSON.parse(readFileSync(existingAddressPath, 'utf-8'));
      const basicPath = join(inputDir, 'evvmBasicMetadata.json');
      const existingBasicMetadata = existsSync(basicPath)
        ? JSON.parse(readFileSync(basicPath, 'utf-8'))
        : { EvvmName: 'EVVM', principalTokenName: 'Mate token', principalTokenSymbol: 'MATE' };

      info('Found existing configuration:');
      dim(`  Admin:        ${existingAddresses.admin}`);
      dim(`  GoldenFisher: ${existingAddresses.goldenFisher}`);
      dim(`  Activator:    ${existingAddresses.activator}`);
      dim(`  EVVM Name:    ${existingBasicMetadata.EvvmName}`);
      dim(`  Token Name:   ${existingBasicMetadata.principalTokenName}`);
      dim(`  Token Symbol: ${existingBasicMetadata.principalTokenSymbol}`);
      console.log('');

      const reuseResponse = await prompts({
        type: 'confirm',
        name: 'reuse',
        message: 'Use existing EVVM configuration?',
        initial: true
      });

      useExistingConfig = reuseResponse.reuse;
    } catch {
      // Invalid config, will prompt for new one
    }
  }

  let evvmConfig: {
    addresses: { admin: string; goldenFisher: string; activator: string };
    basicMetadata: { EvvmName: string; principalTokenName: string; principalTokenSymbol: string };
    advancedMetadata: { totalSupply: string; eraTokens: string; reward: string };
  };

  if (useExistingConfig) {
    // Load existing config
    const addresses = JSON.parse(readFileSync(existingAddressPath, 'utf-8'));
    const basicPath = join(inputDir, 'evvmBasicMetadata.json');
    const basicMetadata = existsSync(basicPath)
      ? JSON.parse(readFileSync(basicPath, 'utf-8'))
      : { EvvmName: 'EVVM', principalTokenName: 'Mate token', principalTokenSymbol: 'MATE' };

    evvmConfig = {
      addresses,
      basicMetadata,
      advancedMetadata: {
        totalSupply: '2033333333000000000000000000',
        eraTokens: '1016666666500000000000000000',
        reward: '5000000000000000000'
      }
    };
    success('Using existing EVVM configuration');
  } else {
    // Prompt for new configuration
    info('Configure admin addresses for your EVVM instance.\n');

    const validateAddress = (v: string) =>
      /^0x[a-fA-F0-9]{40}$/.test(v) ? true : 'Invalid address format';

    const adminResponse = await prompts({
      type: 'text',
      name: 'value',
      message: 'Admin address (0x...):',
      validate: validateAddress
    });
    if (!adminResponse.value) { error('Deployment cancelled.'); return; }

    const goldenFisherResponse = await prompts({
      type: 'text',
      name: 'value',
      message: 'Golden Fisher address (0x...):',
      validate: validateAddress
    });
    if (!goldenFisherResponse.value) { error('Deployment cancelled.'); return; }

    const activatorResponse = await prompts({
      type: 'text',
      name: 'value',
      message: 'Activator address (0x...):',
      validate: validateAddress
    });
    if (!activatorResponse.value) { error('Deployment cancelled.'); return; }

    // Basic metadata
    console.log('');
    const basicResponse = await prompts([
      {
        type: 'text',
        name: 'EvvmName',
        message: `EVVM Name ${chalk.gray('[EVVM]')}:`,
        initial: 'EVVM'
      },
      {
        type: 'text',
        name: 'principalTokenName',
        message: `Token Name ${chalk.gray('[Mate token]')}:`,
        initial: 'Mate token'
      },
      {
        type: 'text',
        name: 'principalTokenSymbol',
        message: `Token Symbol ${chalk.gray('[MATE]')}:`,
        initial: 'MATE'
      }
    ]);
    if (!basicResponse.EvvmName) { error('Deployment cancelled.'); return; }

    evvmConfig = {
      addresses: {
        admin: adminResponse.value,
        goldenFisher: goldenFisherResponse.value,
        activator: activatorResponse.value
      },
      basicMetadata: basicResponse,
      advancedMetadata: {
        totalSupply: '2033333333000000000000000000',
        eraTokens: '1016666666500000000000000000',
        reward: '5000000000000000000'
      }
    };
    success('EVVM configuration saved');
  }

  // Display summary
  console.log('');
  info(`Framework: ${chalk.green(config.framework.toUpperCase())}`);
  info(`Contracts: ${chalk.green(config.contractSource === 'testnet' ? 'Testnet' : 'Playground')}`);
  info(`Network:   ${chalk.green(CHAIN_CONFIGS[networkResponse.network as keyof typeof CHAIN_CONFIGS]?.name || 'Custom')}`);
  console.log('');

  // Sync contracts and generate Inputs.sol
  sectionHeader('Syncing Contracts');

  const sourcePath = config.contractSource === 'testnet'
    ? resolve(projectRoot, '..', 'Testnet-Contracts')
    : resolve(projectRoot, '..', 'Playground-Contracts');

  await syncContractsAndGenerateInputs(sourcePath, config.framework, projectRoot, evvmConfig);
  success('Contracts synced and configuration generated');

  // Save scaffold config
  writeFileSync(
    join(projectRoot, 'scaffold.config.json'),
    JSON.stringify({
      framework: config.framework,
      contractSource: config.contractSource,
      initialized: true,
      timestamp: new Date().toISOString()
    }, null, 2)
  );

  // Select wallet - offer choice for localhost
  let wallet: string | null = null;
  let useDefaultAnvilKey = false;

  if (networkResponse.network === 'localhost') {
    const walletChoice = await prompts({
      type: 'select',
      name: 'choice',
      message: 'Select wallet for local deployment:',
      choices: [
        {
          title: 'Default Anvil Account',
          value: 'anvil-default',
          description: 'Use Anvil\'s pre-funded test account (0xf39F...)'
        },
        {
          title: 'Foundry Keystore',
          value: 'keystore',
          description: 'Use a wallet from your Foundry keystore'
        }
      ]
    });

    if (!walletChoice.choice) {
      error('Deployment cancelled.');
      return;
    }

    if (walletChoice.choice === 'anvil-default') {
      useDefaultAnvilKey = true;
      wallet = 'anvil-default';
      info('Using default Anvil account for local deployment');
    } else {
      wallet = await selectWallet(config.framework);
      if (!wallet) return;
    }
  } else {
    wallet = await selectWallet(config.framework);
    if (!wallet) return;
  }

  // Confirm deployment
  const confirmResponse = await prompts({
    type: 'confirm',
    name: 'value',
    message: `Deploy to ${CHAIN_CONFIGS[networkResponse.network as keyof typeof CHAIN_CONFIGS]?.name || 'Custom Network'}?`,
    initial: true
  });

  if (!confirmResponse.value) {
    error('Deployment cancelled.');
    return;
  }

  // Execute deployment
  const result = await executeDeployment(
    config,
    networkResponse.network,
    wallet,
    projectRoot,
    customRpc,
    useDefaultAnvilKey
  );

  if (result) {
    await displayDeploymentResult(result, networkResponse.network);

    // Offer registry registration for non-local deployments
    if (networkResponse.network !== 'localhost') {
      await offerRegistration(result, wallet, config.framework);
    }
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
 * Select wallet for deployment
 */
async function selectWallet(framework: 'foundry' | 'hardhat'): Promise<string | null> {
  sectionHeader('Wallet Selection');

  if (framework === 'foundry') {
    // Use Foundry keystore
    const wallets = await getAvailableWallets();

    if (wallets.length === 0) {
      warning('No Foundry wallets found.');
      info('Import a wallet using: cast wallet import <NAME> --interactive');

      const createNew = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Would you like to import a wallet now?',
        initial: true
      });

      if (createNew.value) {
        const nameResponse = await prompts({
          type: 'text',
          name: 'name',
          message: 'Wallet name:',
          initial: 'deployer'
        });

        if (nameResponse.name) {
          try {
            await execa('cast', ['wallet', 'import', nameResponse.name, '--interactive'], {
              stdio: 'inherit'
            });
            return nameResponse.name;
          } catch {
            error('Failed to import wallet.');
            return null;
          }
        }
      }
      return null;
    }

    const walletResponse = await prompts({
      type: 'select',
      name: 'wallet',
      message: 'Select wallet for deployment:',
      choices: wallets.map((w) => ({ title: w, value: w }))
    });

    return walletResponse.wallet || null;
  } else {
    // Hardhat uses private key from .env
    const hasKey = process.env.DEPLOYER_PRIVATE_KEY && process.env.DEPLOYER_PRIVATE_KEY.length > 0;

    if (!hasKey) {
      warning('DEPLOYER_PRIVATE_KEY not set in .env file.');
      info('Add your private key to the .env file to deploy.');
      return null;
    }

    success('Using private key from .env');
    return 'env';
  }
}

/**
 * Execute the deployment
 */
async function executeDeployment(
  config: ScaffoldConfig,
  network: string,
  wallet: string,
  projectRoot: string,
  customRpc?: string,
  useDefaultAnvilKey: boolean = false
): Promise<DeploymentResult | null> {
  console.log(chalk.blue('\n🚀 Starting deployment...\n'));

  const packageDir = join(projectRoot, 'packages', config.framework);

  // Check if package exists
  if (!existsSync(packageDir)) {
    error(`${config.framework} package not found. Run "npm run wizard" to initialize.`);
    return null;
  }

  try {
    if (config.framework === 'foundry') {
      return await deployWithFoundry(network, wallet, packageDir, customRpc, useDefaultAnvilKey);
    } else {
      return await deployWithHardhat(network, packageDir, customRpc);
    }
  } catch (err: any) {
    error(`Deployment failed: ${err.message}`);
    return null;
  }
}

// Default Anvil private key (well-known test key - DO NOT use in production)
const DEFAULT_ANVIL_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Deploy using Foundry
 */
async function deployWithFoundry(
  network: string,
  wallet: string,
  packageDir: string,
  customRpc?: string,
  useDefaultAnvilKey: boolean = false
): Promise<DeploymentResult | null> {
  const rpcUrl = customRpc || getRpcUrl(network);

  // Clean stale artifacts first
  console.log(chalk.gray('Cleaning stale artifacts...'));
  await execa('forge', ['clean'], { cwd: packageDir, stdio: 'pipe' }).catch(() => {});

  // Select the deployment script
  // New Testnet-Contracts uses unified Deploy.s.sol
  const scriptFile = 'script/Deploy.s.sol:DeployScript';

  const args = [
    'script',
    scriptFile,
    '--rpc-url', rpcUrl,
    '--broadcast',
    '--via-ir',
    '-vvvv'
  ];

  // For localhost with default Anvil key, use --private-key
  // For localhost with keystore or testnets, use --account
  if (network === 'localhost' && useDefaultAnvilKey) {
    args.push('--private-key', DEFAULT_ANVIL_KEY);
  } else {
    args.push('--account', wallet);
  }

  // Add verification for testnets
  if (network !== 'localhost' && !customRpc) {
    const etherscanKey = process.env.ETHERSCAN_API;
    if (etherscanKey) {
      args.push('--verify', '--etherscan-api-key', etherscanKey);
    }
  }

  await execa('forge', args, {
    cwd: packageDir,
    stdio: 'inherit'
  });

  // Parse deployment artifacts
  return parseFoundryArtifacts(packageDir, network);
}

/**
 * Deploy using Hardhat
 */
async function deployWithHardhat(
  network: string,
  packageDir: string,
  customRpc?: string
): Promise<DeploymentResult | null> {
  const networkName = network === 'localhost' ? 'localhost'
    : network === 'eth-sepolia' ? 'sepolia'
    : network === 'arb-sepolia' ? 'arbitrumSepolia'
    : 'localhost';

  await execa('npx', ['hardhat', 'deploy', '--network', networkName], {
    cwd: packageDir,
    stdio: 'inherit'
  });

  // Parse deployment artifacts
  return parseHardhatArtifacts(packageDir, networkName);
}

/**
 * Get RPC URL for network with fallback support
 */
function getRpcUrl(network: string): string {
  switch (network) {
    case 'localhost':
      return 'http://localhost:8545';
    case 'eth-sepolia':
      return process.env.RPC_URL_ETH_SEPOLIA || ETH_SEPOLIA_RPC_FALLBACKS[0];
    case 'arb-sepolia':
      return process.env.RPC_URL_ARB_SEPOLIA || ARB_SEPOLIA_RPC_FALLBACKS[0];
    default:
      return 'http://localhost:8545';
  }
}

/**
 * Get working RPC endpoint with fallback support
 */
async function getWorkingRpc(network: 'eth-sepolia' | 'arb-sepolia'): Promise<string> {
  const fallbacks = network === 'eth-sepolia' ? ETH_SEPOLIA_RPC_FALLBACKS : ARB_SEPOLIA_RPC_FALLBACKS;
  const envVar = network === 'eth-sepolia' ? 'RPC_URL_ETH_SEPOLIA' : 'RPC_URL_ARB_SEPOLIA';

  // Try env variable first
  const envRpc = process.env[envVar];
  if (envRpc) {
    try {
      const response = await fetch(envRpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        return envRpc;
      }
    } catch {
      dim(`   Primary RPC from .env failed, trying fallbacks...`);
    }
  }

  // Try fallback RPCs
  for (const rpc of fallbacks) {
    try {
      const response = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        dim(`   Using RPC: ${rpc}`);
        return rpc;
      }
    } catch {
      continue;
    }
  }

  // Return default if all fail
  warning(`No working RPC found, using default`);
  return fallbacks[0];
}

/**
 * Parse Foundry deployment artifacts
 */
function parseFoundryArtifacts(packageDir: string, network: string): DeploymentResult | null {
  const chainId = CHAIN_CONFIGS[network as keyof typeof CHAIN_CONFIGS]?.id || 31337;

  // Try different script names (Deploy.s.sol is the new unified script)
  const scriptNames = ['Deploy.s.sol', 'DeployTestnet.s.sol', 'DeployTestnetOnAnvil.s.sol'];

  let runLatestPath: string | null = null;

  for (const scriptName of scriptNames) {
    const candidatePath = join(packageDir, 'broadcast', scriptName, String(chainId), 'run-latest.json');
    if (existsSync(candidatePath)) {
      runLatestPath = candidatePath;
      break;
    }
  }

  if (!runLatestPath) {
    warning('Deployment artifacts not found. Contracts may still have deployed.');
    return null;
  }

  try {
    const artifact = JSON.parse(readFileSync(runLatestPath, 'utf-8'));

    const findContract = (name: string) =>
      artifact.transactions.find((tx: any) => tx.contractName === name)?.contractAddress;

    return {
      evvmAddress: findContract('Evvm') || '0x',
      stakingAddress: findContract('Staking') || '0x',
      estimatorAddress: findContract('Estimator') || '0x',
      nameServiceAddress: findContract('NameService') || '0x',
      treasuryAddress: findContract('Treasury') || '0x',
      p2pSwapAddress: findContract('P2PSwap'),
      chainId,
      network
    };
  } catch {
    return null;
  }
}

/**
 * Parse Hardhat deployment artifacts
 */
function parseHardhatArtifacts(packageDir: string, network: string): DeploymentResult | null {
  const deploymentsDir = join(packageDir, 'deployments', network);

  if (!existsSync(deploymentsDir)) {
    warning('Deployment artifacts not found.');
    return null;
  }

  const readDeployment = (name: string): Address | undefined => {
    const path = join(deploymentsDir, `${name}.json`);
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      return data.address;
    }
    return undefined;
  };

  const chainId = CHAIN_CONFIGS[network as keyof typeof CHAIN_CONFIGS]?.id || 31337;

  return {
    evvmAddress: readDeployment('Evvm') || '0x' as Address,
    stakingAddress: readDeployment('Staking') || '0x' as Address,
    estimatorAddress: readDeployment('Estimator') || '0x' as Address,
    nameServiceAddress: readDeployment('NameService') || '0x' as Address,
    treasuryAddress: readDeployment('Treasury') || '0x' as Address,
    p2pSwapAddress: readDeployment('P2PSwap'),
    chainId,
    network
  };
}

/**
 * Display deployment result and update .env
 */
async function displayDeploymentResult(result: DeploymentResult, network: string): Promise<void> {
  const networkName = CHAIN_CONFIGS[network as keyof typeof CHAIN_CONFIGS]?.name || 'Custom Network';
  const explorerUrl = EXPLORER_URLS[network] || '';

  console.log(evvmGreen('\n═══════════════════════════════════════════════════════════'));
  console.log(evvmGreen('                 DEPLOYED CONTRACTS SUMMARY'));
  console.log(evvmGreen('═══════════════════════════════════════════════════════════\n'));

  console.log(chalk.white(`Network: ${chalk.green(networkName)} (Chain ID: ${result.chainId})\n`));

  console.log(chalk.yellow('Core Contracts:'));
  console.log(chalk.white(`  EVVM:        ${chalk.green(result.evvmAddress)}`));
  if (explorerUrl) console.log(chalk.gray(`               ${explorerUrl}${result.evvmAddress}`));

  console.log(chalk.white(`  Treasury:    ${chalk.green(result.treasuryAddress)}`));
  if (explorerUrl) console.log(chalk.gray(`               ${explorerUrl}${result.treasuryAddress}`));

  console.log(chalk.yellow('\nSupporting Contracts:'));
  console.log(chalk.white(`  Staking:     ${chalk.green(result.stakingAddress)}`));
  if (explorerUrl) console.log(chalk.gray(`               ${explorerUrl}${result.stakingAddress}`));
  console.log(chalk.white(`  Estimator:   ${chalk.green(result.estimatorAddress)}`));
  if (explorerUrl) console.log(chalk.gray(`               ${explorerUrl}${result.estimatorAddress}`));
  console.log(chalk.white(`  NameService: ${chalk.green(result.nameServiceAddress)}`));
  if (explorerUrl) console.log(chalk.gray(`               ${explorerUrl}${result.nameServiceAddress}`));
  if (result.p2pSwapAddress) {
    console.log(chalk.white(`  P2PSwap:     ${chalk.green(result.p2pSwapAddress)}`));
    if (explorerUrl) console.log(chalk.gray(`               ${explorerUrl}${result.p2pSwapAddress}`));
  }

  console.log(evvmGreen('\n═══════════════════════════════════════════════════════════\n'));

  // Auto-update .env with deployed addresses
  const projectRoot = process.cwd();
  const envPath = join(projectRoot, '.env');
  let envContent = '';
  try {
    envContent = readFileSync(envPath, 'utf-8');
  } catch {
    // No existing .env
  }

  const updateEnvVar = (content: string, key: string, value: string): string => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    }
    return content.trim() + `\n${key}=${value}\n`;
  };

  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_EVVM_ADDRESS', result.evvmAddress);
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_CHAIN_ID', String(result.chainId));
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_CONFIG_VERSION', String(Date.now()));
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_STAKING_ADDRESS', result.stakingAddress);
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_ESTIMATOR_ADDRESS', result.estimatorAddress);
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_NAMESERVICE_ADDRESS', result.nameServiceAddress);
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_TREASURY_ADDRESS', result.treasuryAddress);
  if (result.p2pSwapAddress) {
    envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_P2PSWAP_ADDRESS', result.p2pSwapAddress);
  }

  writeFileSync(envPath, envContent);

  // Clear Next.js cache so new env vars are loaded on next dev server start
  // This is necessary because Next.js caches env vars at build/start time
  const nextCacheDir = join(projectRoot, 'packages', 'nextjs', '.next');
  if (existsSync(nextCacheDir)) {
    info('Clearing Next.js cache to load new configuration...');
    rmSync(nextCacheDir, { recursive: true, force: true });
  }

  success('Frontend .env updated with deployed addresses');

  // Save deployment summary to deployments/ folder
  await saveDeploymentSummary(result, network);

  info('Run "npm run frontend" to start the frontend');
  warning('If a dev server is already running, restart it for changes to take effect.');
}

/**
 * Offer EVVM registry registration
 */
async function offerRegistration(
  result: DeploymentResult,
  wallet: string,
  framework: 'foundry' | 'hardhat'
): Promise<void> {
  divider();
  console.log(chalk.cyan('                 REGISTRY REGISTRATION'));
  divider();

  info('Register your EVVM with the global registry to get an official EVVM ID.');
  console.log('');
  dim(`Registry: ${REGISTRY_ADDRESS} (Ethereum Sepolia)`);
  dim('The registry is on Ethereum Sepolia. You\'ll need Sepolia ETH for gas.\n');

  if (result.network !== 'eth-sepolia') {
    warning(`Your EVVM is deployed on ${result.network}, but registration happens on Ethereum Sepolia.`);
    console.log('');
  }

  const registerResponse = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Register with EVVM Registry now?',
    initial: true
  });

  if (!registerResponse.value) {
    info('Skipping registration. You can register later using:');
    dim('  npm run cli registry');
    console.log('');
    dim('Or register manually at https://www.evvm.info/registry');
    return;
  }

  // Registration process using cast
  const sepoliaRpc = process.env.RPC_URL_ETH_SEPOLIA || 'https://1rpc.io/sepolia';

  info('Registration requires 2 transactions:');
  console.log(chalk.gray('  1. Call registerEvvm() on Registry contract (Ethereum Sepolia)'));
  console.log(chalk.gray('  2. Call setEvvmID() on your EVVM contract'));
  console.log('');

  try {
    // Step 1: Register with Registry
    info('Step 1: Registering with EVVM Registry...');

    const registerArgs = [
      'send',
      REGISTRY_ADDRESS,
      'registerEvvm(uint256,address)',
      String(result.chainId),
      result.evvmAddress,
      '--rpc-url', sepoliaRpc,
      '--account', wallet
    ];

    console.log(chalk.gray(`Calling registerEvvm(${result.chainId}, ${result.evvmAddress})...`));

    const registerResult = await execa('cast', registerArgs, {
      stdio: 'inherit'
    }).catch((err) => {
      error(`Registry registration failed: ${err.message}`);
      return null;
    });

    if (!registerResult) {
      info('You can register manually at https://www.evvm.info/registry');
      return;
    }

    success('Registered with EVVM Registry!');

    // Step 2: Get the assigned EVVM ID
    info('Fetching assigned EVVM ID...');

    // Get all public EVVM IDs and find ours by matching chain ID and address
    const getIdsArgs = [
      'call',
      REGISTRY_ADDRESS,
      'getPublicEvvmIdActive()(uint256[])',
      '--rpc-url', sepoliaRpc
    ];

    const idsResult = await execa('cast', getIdsArgs, {
      stdio: 'pipe'
    });

    // Parse the array output: [1000, 1001, 1002, ...]
    const idsString = idsResult.stdout.trim();
    const idsMatch = idsString.match(/\[([^\]]+)\]/);
    if (!idsMatch) {
      error('Failed to parse EVVM IDs from registry');
      return;
    }

    const ids = idsMatch[1].split(',').map(s => s.trim());

    // Find our EVVM ID by checking metadata for each ID (start from end, most recent first)
    let evvmId: string | null = null;
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i];
      try {
        const metadataArgs = [
          'call',
          REGISTRY_ADDRESS,
          'getEvvmIdMetadata(uint256)((uint256,address))',
          id,
          '--rpc-url', sepoliaRpc
        ];

        const metadataResult = await execa('cast', metadataArgs, { stdio: 'pipe' });
        // Output format: (chainId, address)
        const output = metadataResult.stdout.trim();

        // Check if this matches our deployment
        if (output.toLowerCase().includes(result.evvmAddress.toLowerCase()) &&
            output.includes(String(result.chainId))) {
          evvmId = id;
          break;
        }
      } catch {
        // Skip if metadata fetch fails
        continue;
      }
    }

    if (!evvmId) {
      error('Could not find EVVM ID in registry');
      info('Registration may have succeeded. Check manually at https://www.evvm.info/registry');
      return;
    }
    success(`Assigned EVVM ID: ${chalk.green(evvmId)}`);

    // Step 3: Set the EVVM ID on the deployed contract
    info('Step 2: Setting EVVM ID on your contract...');

    const deployedRpc = getRpcUrl(result.network);

    const setIdArgs = [
      'send',
      result.evvmAddress,
      'setEvvmID(uint256)',
      evvmId,
      '--rpc-url', deployedRpc,
      '--account', wallet
    ];

    console.log(chalk.gray(`Calling setEvvmID(${evvmId}) on EVVM contract...`));

    const setIdResult = await execa('cast', setIdArgs, {
      stdio: 'inherit'
    }).catch((err) => {
      error(`Failed to set EVVM ID: ${err.message}`);
      info(`Set manually: cast send ${result.evvmAddress} "setEvvmID(uint256)" ${evvmId}`);
      return null;
    });

    if (setIdResult) {
      success('EVVM ID set successfully!');

      // Update .env
      const projectRoot = process.cwd();
      const envPath = join(projectRoot, '.env');
      let envContent = '';
      try {
        envContent = readFileSync(envPath, 'utf-8');
      } catch {
        // No existing .env
      }

      const updateEnvVar = (content: string, key: string, value: string): string => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${value}`);
        }
        return content.trim() + `\n${key}=${value}\n`;
      };

      envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_EVVM_ID', evvmId);
      envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_CONFIG_VERSION', String(Date.now()));
      writeFileSync(envPath, envContent);

      divider();
      console.log(chalk.green('Registration Complete!'));
      console.log('');
      console.log(chalk.yellow('Your EVVM Details:'));
      console.log(`  EVVM ID:      ${chalk.green(evvmId)}`);
      console.log(`  EVVM Address: ${chalk.green(result.evvmAddress)}`);
      console.log(`  Chain ID:     ${chalk.green(result.chainId)}`);
      const explorerUrl = EXPLORER_URLS[result.network];
      if (explorerUrl) {
        console.log(`  Explorer:     ${chalk.gray(explorerUrl + result.evvmAddress)}`);
      }
      divider();
    }
  } catch (err: any) {
    error(`Registration failed: ${err.message}`);
    info('You can register manually at https://www.evvm.info/registry');
  }
}

/**
 * Sync contracts from source and generate Inputs.sol
 */
async function syncContractsAndGenerateInputs(
  sourcePath: string,
  framework: 'foundry' | 'hardhat',
  projectRoot: string,
  evvmConfig: {
    addresses: { admin: string; goldenFisher: string; activator: string };
    basicMetadata: { EvvmName: string; principalTokenName: string; principalTokenSymbol: string };
    advancedMetadata: { totalSupply: string; eraTokens: string; reward: string };
  }
): Promise<void> {
  const sourceContractsPath = join(sourcePath, 'src');
  const targetDir = join(projectRoot, 'packages', framework, 'contracts');

  // Clear existing contracts
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }

  // Copy contracts
  if (existsSync(sourceContractsPath)) {
    cpSync(sourceContractsPath, targetDir, { recursive: true });
    info('Copied contracts');
  }

  // For Foundry, also sync lib and scripts
  if (framework === 'foundry') {
    const sourceLibPath = join(sourcePath, 'lib');
    const targetLibPath = join(projectRoot, 'packages', 'foundry', 'lib');

    if (existsSync(sourceLibPath)) {
      const libs = ['forge-std', 'openzeppelin-contracts', 'solady'];
      for (const lib of libs) {
        const srcLib = join(sourceLibPath, lib);
        const dstLib = join(targetLibPath, lib);
        if (existsSync(srcLib) && !existsSync(dstLib)) {
          cpSync(srcLib, dstLib, { recursive: true });
        }
      }
    }

    // Copy deployment scripts
    const sourceScriptPath = join(sourcePath, 'script');
    const targetScriptPath = join(projectRoot, 'packages', 'foundry', 'script');
    if (existsSync(sourceScriptPath)) {
      // Clear and recopy to get latest scripts
      if (existsSync(targetScriptPath)) {
        rmSync(targetScriptPath, { recursive: true, force: true });
      }
      cpSync(sourceScriptPath, targetScriptPath, { recursive: true });
      info('Copied deployment scripts');
    }
  }

  // Write configuration files
  const inputDir = join(projectRoot, 'input');
  if (!existsSync(inputDir)) {
    mkdirSync(inputDir, { recursive: true });
  }

  // Generate Inputs.sol
  const inputsSol = generateInputsSol(evvmConfig);
  writeFileSync(join(inputDir, 'Inputs.sol'), inputsSol);

  // Write legacy JSON files
  writeFileSync(
    join(inputDir, 'address.json'),
    JSON.stringify(evvmConfig.addresses, null, 2) + '\n'
  );
  writeFileSync(
    join(inputDir, 'evvmBasicMetadata.json'),
    JSON.stringify(evvmConfig.basicMetadata, null, 2) + '\n'
  );
  writeFileSync(
    join(inputDir, 'evvmAdvancedMetadata.json'),
    JSON.stringify({
      eraTokens: evvmConfig.advancedMetadata.eraTokens,
      reward: evvmConfig.advancedMetadata.reward,
      totalSupply: evvmConfig.advancedMetadata.totalSupply
    }, null, 2) + '\n'
  );

  // Copy to framework package
  const frameworkInputDir = join(projectRoot, 'packages', framework, 'input');
  if (!existsSync(frameworkInputDir)) {
    mkdirSync(frameworkInputDir, { recursive: true });
  }
  cpSync(inputDir, frameworkInputDir, { recursive: true });
  info('Generated Inputs.sol with your configuration');
}

/**
 * Generate Inputs.sol content from configuration
 */
function generateInputsSol(config: {
  addresses: { admin: string; goldenFisher: string; activator: string };
  basicMetadata: { EvvmName: string; principalTokenName: string; principalTokenSymbol: string };
  advancedMetadata: { totalSupply: string; eraTokens: string; reward: string };
}): string {
  return `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {EvvmStructs} from "@evvm/testnet-contracts/contracts/evvm/lib/EvvmStructs.sol";

abstract contract Inputs {
    address admin = ${config.addresses.admin};
    address goldenFisher = ${config.addresses.goldenFisher};
    address activator = ${config.addresses.activator};

    EvvmStructs.EvvmMetadata inputMetadata =
        EvvmStructs.EvvmMetadata({
            EvvmName: "${config.basicMetadata.EvvmName}",
            // evvmID will be set to 0, and it will be assigned when you register the evvm
            EvvmID: 0,
            principalTokenName: "${config.basicMetadata.principalTokenName}",
            principalTokenSymbol: "${config.basicMetadata.principalTokenSymbol}",
            principalTokenAddress: 0x0000000000000000000000000000000000000001,
            totalSupply: ${config.advancedMetadata.totalSupply},
            eraTokens: ${config.advancedMetadata.eraTokens},
            reward: ${config.advancedMetadata.reward}
        });
}
`;
}

/**
 * Save deployment summary to deployments/ folder
 */
async function saveDeploymentSummary(
  result: DeploymentResult,
  network: string,
  evvmId?: string
): Promise<void> {
  // Create deployments directory if it doesn't exist
  if (!existsSync(DEPLOYMENTS_DIR)) {
    mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }

  const networkName = CHAIN_CONFIGS[network as keyof typeof CHAIN_CONFIGS]?.name || 'Custom Network';
  const explorerUrl = EXPLORER_URLS[network] || null;

  const summary = {
    network: {
      name: networkName,
      chainId: result.chainId,
      network: network
    },
    evvm: {
      id: evvmId ? parseInt(evvmId) : null,
      address: result.evvmAddress,
      explorer: explorerUrl ? `${explorerUrl}${result.evvmAddress}` : null
    },
    contracts: {
      evvm: result.evvmAddress,
      staking: result.stakingAddress,
      estimator: result.estimatorAddress,
      nameService: result.nameServiceAddress,
      treasury: result.treasuryAddress,
      p2pSwap: result.p2pSwapAddress || null
    },
    deployment: {
      timestamp: new Date().toISOString(),
      timestampUnix: Date.now()
    }
  };

  // Save with network-specific filename
  const filename = `deployment-${network}-${result.chainId}.json`;
  const filepath = join(DEPLOYMENTS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(summary, null, 2));

  // Also save as latest
  const latestPath = join(DEPLOYMENTS_DIR, 'latest.json');
  writeFileSync(latestPath, JSON.stringify(summary, null, 2));

  info(`Deployment summary saved to ${filename}`);
}

/**
 * Contract deployment command
 *
 * Handles deployment of EVVM contracts to various networks
 * using either Foundry or Hardhat based on project configuration.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import prompts from 'prompts';
import chalk from 'chalk';
import { execa } from 'execa';
import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { sepolia, arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { sectionHeader, success, warning, error, info, dim, divider, evvmGreen } from '../utils/display.js';
import { getAvailableWallets } from '../utils/prerequisites.js';

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

// Registry for EVVM registration
const REGISTRY_ADDRESS = '0x389dC8fb09211bbDA841D59f4a51160dA2377832' as Address;

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

  // Check if project is initialized
  const config = loadProjectConfig(projectRoot);
  if (!config) {
    error('Project not initialized. Run "npm run wizard" first.');
    return;
  }

  info(`Framework: ${chalk.green(config.framework.toUpperCase())}`);
  info(`Contracts: ${chalk.green(config.contractSource === 'testnet' ? 'Testnet' : 'Playground')}\n`);

  // Select network
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

  // Select the appropriate deployment script based on network
  const scriptFile = network === 'localhost'
    ? 'script/DeployTestnetOnAnvil.s.sol:DeployTestnetOnAnvil'
    : 'script/DeployTestnet.s.sol:DeployTestnet';

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
 * Get RPC URL for network
 */
function getRpcUrl(network: string): string {
  switch (network) {
    case 'localhost':
      return 'http://localhost:8545';
    case 'eth-sepolia':
      return process.env.RPC_URL_ETH_SEPOLIA || 'https://1rpc.io/sepolia';
    case 'arb-sepolia':
      return process.env.RPC_URL_ARB_SEPOLIA || 'https://sepolia-rollup.arbitrum.io/rpc';
    default:
      return 'http://localhost:8545';
  }
}

/**
 * Parse Foundry deployment artifacts
 */
function parseFoundryArtifacts(packageDir: string, network: string): DeploymentResult | null {
  const chainId = CHAIN_CONFIGS[network as keyof typeof CHAIN_CONFIGS]?.id || 31337;

  // Try different script names based on network
  const scriptNames = network === 'localhost'
    ? ['DeployTestnetOnAnvil.s.sol', 'Deploy.s.sol']
    : ['DeployTestnet.s.sol', 'Deploy.s.sol'];

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
 * Display deployment result
 */
async function displayDeploymentResult(result: DeploymentResult, network: string): Promise<void> {
  divider();
  console.log(chalk.cyan('                 DEPLOYED CONTRACTS'));
  divider();

  const networkName = CHAIN_CONFIGS[network as keyof typeof CHAIN_CONFIGS]?.name || 'Custom Network';
  const explorerUrl = EXPLORER_URLS[network] || '';

  console.log(chalk.white(`Network: ${chalk.green(networkName)} (Chain ID: ${result.chainId})\n`));

  console.log(chalk.yellow('Core Contracts:'));
  console.log(`  EVVM:        ${chalk.green(result.evvmAddress)}`);
  if (explorerUrl) console.log(chalk.gray(`               ${explorerUrl}${result.evvmAddress}`));

  console.log(`  Treasury:    ${chalk.green(result.treasuryAddress)}`);
  if (explorerUrl) console.log(chalk.gray(`               ${explorerUrl}${result.treasuryAddress}`));

  console.log(chalk.yellow('\nSupporting Contracts:'));
  console.log(`  Staking:     ${chalk.green(result.stakingAddress)}`);
  console.log(`  Estimator:   ${chalk.green(result.estimatorAddress)}`);
  console.log(`  NameService: ${chalk.green(result.nameServiceAddress)}`);
  if (result.p2pSwapAddress) {
    console.log(`  P2PSwap:     ${chalk.green(result.p2pSwapAddress)}`);
  }

  divider();

  // Update .env with deployed addresses
  info('Update your .env file with:');
  console.log(chalk.gray(`  NEXT_PUBLIC_EVVM_ADDRESS=${result.evvmAddress}`));
  console.log(chalk.gray(`  NEXT_PUBLIC_CHAIN_ID=${result.chainId}\n`));
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

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
import type { Address } from 'viem';
import { sectionHeader, success, warning, error, info, dim, divider, evvmGreen } from '../utils/display.js';
import { getAvailableWallets, commandExists } from '../utils/prerequisites.js';

// Anvil configuration
const ANVIL_PORT = 8545;
const ANVIL_CHAIN_ID = 31337;
const ANVIL_STATE_DIR = 'anvil-state';

// Local chain configuration
const LOCAL_RPC_URL = 'http://localhost:8545';

// Deployments directory for saving summaries
const DEPLOYMENTS_DIR = join(process.cwd(), 'deployments');

// ============================================================================
// ANVIL MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Check if Anvil is running on the specified port
 */
async function isAnvilRunning(port: number = ANVIL_PORT): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      signal: AbortSignal.timeout(2000)
    });
    if (response.ok) {
      const data = await response.json() as { result?: string };
      // Check if it's chain ID 31337 (Anvil/local)
      const chainId = parseInt(data.result || '0', 16);
      return chainId === ANVIL_CHAIN_ID;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if a port is in use
 */
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const { stdout } = await execa('lsof', ['-t', `-i:${port}`], { stdio: 'pipe' });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Kill process on a port
 */
async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    const { stdout } = await execa('lsof', ['-t', `-i:${port}`], { stdio: 'pipe' });
    const pids = stdout.trim().split('\n').filter(Boolean);
    for (const pid of pids) {
      await execa('kill', ['-9', pid], { stdio: 'pipe' });
    }
    // Wait for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch {
    return false;
  }
}

/**
 * Start Anvil in background with optional state persistence
 * Uses nohup to ensure the process survives after CLI exits
 */
async function startAnvilBackground(
  port: number = ANVIL_PORT,
  statePath?: string
): Promise<{ success: boolean; pid?: number; error?: string }> {
  // Check if Anvil is installed
  const hasAnvil = await commandExists('anvil');
  if (!hasAnvil) {
    return { success: false, error: 'Anvil not found. Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup' };
  }

  // Check if port is already in use
  const portInUse = await isPortInUse(port);
  if (portInUse) {
    // Check if it's Anvil running
    const anvilRunning = await isAnvilRunning(port);
    if (anvilRunning) {
      return { success: true }; // Anvil is already running
    }
    return { success: false, error: `Port ${port} is in use by another process` };
  }

  // Build Anvil arguments
  const anvilArgs = [
    '--port', String(port),
    '--accounts', '10',
    '--balance', '10000',
    '--chain-id', String(ANVIL_CHAIN_ID),
    '--block-time', '1' // 1 second block time for faster local testing
  ];

  // Add state persistence if path provided
  if (statePath) {
    const fullStatePath = join(process.cwd(), statePath);
    if (existsSync(fullStatePath)) {
      anvilArgs.push('--load-state', fullStatePath);
    }
    anvilArgs.push('--dump-state', fullStatePath);
  }

  try {
    // Use nohup to start Anvil in a way that survives CLI exit
    // This is more robust than just detached: true
    const logFile = join(process.cwd(), 'anvil.log');
    const anvilCommand = `nohup anvil ${anvilArgs.join(' ')} > "${logFile}" 2>&1 &`;

    await execa('sh', ['-c', anvilCommand], {
      stdio: 'ignore',
      detached: true
    });

    // Wait for Anvil to be ready
    const ready = await waitForAnvil(port, 10000);
    if (!ready) {
      return { success: false, error: 'Anvil started but not responding. Check anvil.log for details.' };
    }

    // Get the PID of the running anvil process
    let pid: number | undefined;
    try {
      const { stdout } = await execa('lsof', ['-t', `-i:${port}`], { stdio: 'pipe' });
      pid = parseInt(stdout.trim().split('\n')[0], 10);
    } catch {
      // PID lookup failed, but Anvil is running
    }

    return { success: true, pid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Start Hardhat Network in background
 */
async function startHardhatBackground(
  projectRoot: string
): Promise<{ success: boolean; pid?: number; error?: string }> {
  const hardhatDir = join(projectRoot, 'packages', 'hardhat');

  // Check if hardhat package exists
  if (!existsSync(hardhatDir)) {
    return { success: false, error: 'Hardhat package not found. Run sync-contracts first.' };
  }

  // Check if port is already in use
  const portInUse = await isPortInUse(ANVIL_PORT);
  if (portInUse) {
    // Check if it's a local chain running
    const chainRunning = await isAnvilRunning(ANVIL_PORT);
    if (chainRunning) {
      return { success: true }; // Chain is already running
    }
    return { success: false, error: `Port ${ANVIL_PORT} is in use by another process` };
  }

  try {
    // Start Hardhat node in background using nohup
    const logFile = join(projectRoot, 'hardhat-node.log');
    const hardhatCommand = `cd "${hardhatDir}" && nohup npx hardhat node --no-deploy > "${logFile}" 2>&1 &`;

    await execa('sh', ['-c', hardhatCommand], {
      stdio: 'ignore',
      detached: true
    });

    // Wait for Hardhat to be ready
    const ready = await waitForAnvil(ANVIL_PORT, 15000);
    if (!ready) {
      return { success: false, error: 'Hardhat Network started but not responding. Check hardhat-node.log for details.' };
    }

    // Get the PID of the running hardhat process
    let pid: number | undefined;
    try {
      const { stdout } = await execa('lsof', ['-t', `-i:${ANVIL_PORT}`], { stdio: 'pipe' });
      pid = parseInt(stdout.trim().split('\n')[0], 10);
    } catch {
      // PID lookup failed, but Hardhat is running
    }

    return { success: true, pid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Wait for Anvil to be ready
 */
async function waitForAnvil(port: number = ANVIL_PORT, timeoutMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 500;

  while (Date.now() - startTime < timeoutMs) {
    const running = await isAnvilRunning(port);
    if (running) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  return false;
}

/**
 * Display test account information (same for Anvil and Hardhat Network)
 */
function displayTestAccounts(framework: 'foundry' | 'hardhat' = 'foundry'): void {
  const chainName = framework === 'foundry' ? 'Anvil' : 'Hardhat Network';
  console.log(chalk.yellow(`\n${chainName} Test Accounts:`));
  console.log(chalk.gray('  Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));
  console.log(chalk.gray('  Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'));
  console.log(chalk.gray('  Balance: 10,000 ETH\n'));
  console.log(chalk.gray('  (9 more accounts available with same mnemonic)'));
  console.log(chalk.gray('  Mnemonic: test test test test test test test test test test test junk\n'));
}

/**
 * Fund a keystore wallet from Anvil's default account
 */
async function fundWalletFromAnvil(walletName: string, port: number = ANVIL_PORT): Promise<{ success: boolean; address?: string }> {
  try {
    // Get the address of the keystore wallet
    const addressResult = await execa('cast', ['wallet', 'address', '--account', walletName], {
      stdio: 'pipe'
    });
    const walletAddress = addressResult.stdout.trim();

    if (!walletAddress || !walletAddress.startsWith('0x')) {
      error(`Could not get address for wallet: ${walletName}`);
      return { success: false };
    }

    dim(`  Wallet address: ${walletAddress}`);

    // Check if wallet already has sufficient balance
    try {
      const balanceResult = await execa('cast', [
        'balance',
        walletAddress,
        '--rpc-url', `http://localhost:${port}`
      ], { stdio: 'pipe' });

      const balance = BigInt(balanceResult.stdout.trim());
      const oneEth = BigInt('1000000000000000000'); // 1 ETH in wei

      if (balance >= oneEth) {
        success(`Wallet already has ${Number(balance / oneEth)} ETH`);
        return { success: true, address: walletAddress };
      }
    } catch {
      // Balance check failed, try funding anyway
    }

    // Send 100 ETH from Anvil's default account to the wallet
    // Use --gas-limit 21000 to skip gas estimation (avoids duplicate data/input field bug in cast)
    try {
      const sendResult = await execa('cast', [
        'send',
        walletAddress,
        '--value', '100ether',
        '--private-key', DEFAULT_ANVIL_KEY,
        '--rpc-url', `http://localhost:${port}`,
        '--gas-limit', '21000'
      ], {
        stdio: 'pipe'
      });

      if (sendResult.exitCode === 0 || sendResult.stdout.includes('transactionHash')) {
        return { success: true, address: walletAddress };
      }
    } catch (sendErr: any) {
      // First attempt failed, try with curl as fallback
      dim('  First funding method failed, trying alternative...');
    }

    // Fallback: Use eth_sendTransaction via curl (raw JSON-RPC)
    // This bypasses cast's buggy request formatting
    try {
      const txData = {
        jsonrpc: '2.0',
        method: 'eth_sendTransaction',
        params: [{
          from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          to: walletAddress,
          value: '0x56bc75e2d63100000', // 100 ETH in hex
          gas: '0x5208' // 21000 in hex
        }],
        id: 1
      };

      const curlResult = await execa('curl', [
        '-s',
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', JSON.stringify(txData),
        `http://localhost:${port}`
      ], { stdio: 'pipe' });

      const response = JSON.parse(curlResult.stdout);
      if (response.result && response.result.startsWith('0x')) {
        return { success: true, address: walletAddress };
      }
    } catch {
      // Curl fallback also failed
    }

    return { success: false, address: walletAddress };
  } catch (err: any) {
    error(`Fund transfer failed: ${err.message}`);
    return { success: false };
  }
}

// ============================================================================
// END ANVIL MANAGEMENT FUNCTIONS
// ============================================================================

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
  deployerAddress?: string;
  deployerWallet?: string;
}

/**
 * Get wallet address from Foundry keystore
 */
async function getWalletAddress(walletName: string): Promise<string | null> {
  try {
    const result = await execa('cast', ['wallet', 'address', '--account', walletName], {
      stdio: 'pipe'
    });
    const address = result.stdout.trim();
    if (address && address.startsWith('0x')) {
      return address;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get address from DEPLOYER_PRIVATE_KEY environment variable
 * Uses cast to derive the address from the private key
 */
async function getAddressFromPrivateKey(): Promise<string | null> {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }

  try {
    // Use cast to derive address from private key
    const result = await execa('cast', ['wallet', 'address', privateKey], {
      stdio: 'pipe'
    });
    const address = result.stdout.trim();
    if (address && address.startsWith('0x')) {
      return address;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Main deploy command
 */
export async function deployContracts(): Promise<void> {
  console.log(evvmGreen(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    SCAFFOLD-EVVM                              ║
║                  Contract Deployment                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

  const projectRoot = process.cwd();

  // Step 0: Check prerequisites
  const { checkAllPrerequisites, checkFrameworkAvailable } = await import('../utils/prerequisites.js');
  const prereqResult = await checkAllPrerequisites(projectRoot);

  if (!prereqResult.passed) {
    error('Cannot proceed with deployment due to missing prerequisites.');
    return;
  }

  // Check bundled contract sources
  sectionHeader('Contract Sources');
  info('Checking bundled EVVM contracts...');

  const foundryDir = join(projectRoot, 'packages', 'foundry');
  const hasTestnet = existsSync(join(foundryDir, 'testnet-contracts', 'contracts'));
  const hasPlayground = existsSync(join(foundryDir, 'playground-contracts', 'contracts'));

  if (hasTestnet) {
    success('Testnet-Contracts (bundled)');
  } else {
    warning('Testnet-Contracts not found');
  }

  if (hasPlayground) {
    success('Playground-Contracts (bundled)');
  } else {
    warning('Playground-Contracts not found');
  }

  // Handle missing bundled contracts
  if (!hasTestnet && !hasPlayground) {
    error('No bundled contracts found!');
    info('The contract sources should be included in packages/foundry/');
    info('Please reinstall scaffold-evvm or restore the bundled contracts.');
    return;
  }

  console.log(chalk.gray('\n   Contracts are bundled for offline deployment.'));
  console.log(chalk.gray('   No internet connection required.\n'));

  // Load existing config for pre-selection
  const existingConfig = loadProjectConfig(projectRoot);

  // Step 1: Framework Selection
  sectionHeader('Framework Selection');

  // Filter framework choices based on availability
  const frameworkChoices = [];
  if (prereqResult.hasFoundry) {
    frameworkChoices.push({ title: 'Foundry', value: 'foundry', description: 'Fast, Solidity-native testing (recommended)' });
  }
  if (prereqResult.hasHardhat) {
    frameworkChoices.push({ title: 'Hardhat', value: 'hardhat', description: 'JavaScript/TypeScript ecosystem' });
  }

  if (frameworkChoices.length === 0) {
    error('No smart contract framework available!');
    info('Please install Foundry or Hardhat:');
    console.log(chalk.gray('  Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup'));
    console.log(chalk.gray('  Hardhat: npm install --save-dev hardhat'));
    return;
  }

  const frameworkResponse = await prompts({
    type: 'select',
    name: 'framework',
    message: 'Select your smart contract framework:',
    choices: frameworkChoices,
    initial: existingConfig?.framework === 'hardhat' && prereqResult.hasHardhat ?
      (prereqResult.hasFoundry ? 1 : 0) : 0
  });
  if (!frameworkResponse.framework) {
    error('Deployment cancelled.');
    return;
  }

  // Verify selected framework is available
  const frameworkAvailable = await checkFrameworkAvailable(frameworkResponse.framework, projectRoot);
  if (!frameworkAvailable) {
    error(`${frameworkResponse.framework === 'foundry' ? 'Foundry' : 'Hardhat'} is not properly installed.`);
    if (frameworkResponse.framework === 'foundry') {
      info('Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup');
    } else {
      info('Install Hardhat: npm install --save-dev hardhat');
    }
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

  // Network is always local for this version
  sectionHeader('Network');
  const chainName = config.framework === 'foundry' ? 'Anvil' : 'Hardhat Network';
  info(`Deploying to local chain (${chainName})`);

  const networkResponse = { network: 'localhost' };

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
  info(`Network:   ${chalk.green(chainName)}`);
  console.log('');

  // Generate configuration files (contracts are now bundled - no sync needed)
  sectionHeader('Generating Configuration');

  await generateDeploymentConfig(config.framework, projectRoot, evvmConfig, config.contractSource);
  success('Configuration generated');

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

  // For localhost, check/start local chain before wallet selection
  let wallet: string | null = null;
  let useDefaultAnvilKey = false;
  let useStatePersistence = false;
  let useDefaultHardhatKey = false;

  if (networkResponse.network === 'localhost') {
    sectionHeader('Local Chain Setup');

    // Check if a local chain is already running
    const localChainRunning = await isAnvilRunning(ANVIL_PORT);

    if (localChainRunning) {
      success(`Local chain is running on port ${ANVIL_PORT}`);
      displayTestAccounts(config.framework);
    } else {
      // Local chain not running - offer to start it
      const chainType = config.framework === 'foundry' ? 'Anvil' : 'Hardhat Network';
      info(`${chainType} is not running on port 8545.`);
      console.log('');

      const startChainChoices = config.framework === 'foundry'
        ? [
            {
              title: chalk.green('Start Anvil automatically (recommended)'),
              value: 'start',
              description: 'Start Anvil in background on port 8545'
            },
            {
              title: 'Start Anvil with state persistence',
              value: 'start-persist',
              description: 'Persist blockchain state between restarts'
            },
            {
              title: 'I\'ll start Anvil manually',
              value: 'manual',
              description: 'Run "anvil" in another terminal first'
            },
            {
              title: 'Cancel',
              value: 'cancel',
              description: 'Exit deployment'
            }
          ]
        : [
            {
              title: chalk.green('Start Hardhat Network automatically (recommended)'),
              value: 'start',
              description: 'Start Hardhat Network in background on port 8545'
            },
            {
              title: 'I\'ll start Hardhat Network manually',
              value: 'manual',
              description: 'Run "npx hardhat node" in another terminal first'
            },
            {
              title: 'Cancel',
              value: 'cancel',
              description: 'Exit deployment'
            }
          ];

      const startAnvilResponse = await prompts({
        type: 'select',
        name: 'action',
        message: 'How would you like to proceed?',
        choices: startChainChoices
      });

      if (startAnvilResponse.action === 'cancel' || !startAnvilResponse.action) {
        error('Deployment cancelled.');
        return;
      }

      if (startAnvilResponse.action === 'manual') {
        if (config.framework === 'foundry') {
          warning('Please start Anvil in another terminal:');
          console.log(chalk.cyan('\n  anvil --port 8545 --chain-id 31337\n'));
        } else {
          warning('Please start Hardhat Network in another terminal:');
          console.log(chalk.cyan('\n  cd packages/hardhat && npx hardhat node\n'));
        }
        info('Waiting for local chain to be ready...');

        const ready = await waitForAnvil(ANVIL_PORT, 60000);
        if (!ready) {
          error('Local chain not detected. Please start it and try again.');
          return;
        }
        success('Local chain detected!');
      } else {
        // Auto-start local chain
        if (config.framework === 'foundry') {
          const statePath = startAnvilResponse.action === 'start-persist'
            ? join('anvil-state', `evvm-${config.contractSource}.json`)
            : undefined;

          if (statePath) {
            useStatePersistence = true;
            const stateDir = join(process.cwd(), 'anvil-state');
            if (!existsSync(stateDir)) {
              mkdirSync(stateDir, { recursive: true });
            }
            info(`State will be persisted to: ${statePath}`);
          }

          info('Starting Anvil in background...');

          const result = await startAnvilBackground(ANVIL_PORT, statePath);

          if (!result.success) {
            error(`Failed to start Anvil: ${result.error}`);

            const portInUse = await isPortInUse(ANVIL_PORT);
            if (portInUse) {
              const killResponse = await prompts({
                type: 'confirm',
                name: 'kill',
                message: `Port ${ANVIL_PORT} is in use. Kill the existing process?`,
                initial: false
              });

              if (killResponse.kill) {
                const killed = await killProcessOnPort(ANVIL_PORT);
                if (killed) {
                  info('Process killed. Retrying Anvil start...');
                  const retryResult = await startAnvilBackground(ANVIL_PORT, statePath);
                  if (!retryResult.success) {
                    error(`Still failed: ${retryResult.error}`);
                    return;
                  }
                  success('Anvil started successfully!');
                } else {
                  error('Failed to kill process. Please stop it manually.');
                  return;
                }
              } else {
                return;
              }
            } else {
              return;
            }
          } else {
            success('Anvil started successfully!');
            if (result.pid) {
              dim(`  PID: ${result.pid}`);
            }
          }
        } else {
          // Start Hardhat Network
          info('Starting Hardhat Network in background...');
          const result = await startHardhatBackground(projectRoot);
          if (!result.success) {
            error(`Failed to start Hardhat Network: ${result.error}`);
            return;
          }
          success('Hardhat Network started successfully!');
        }
      }

      displayTestAccounts(config.framework);
    }

    // Wallet selection for localhost based on framework
    const walletChoices = config.framework === 'foundry'
      ? [
          {
            title: 'Default Anvil Account (0xf39F...)',
            value: 'anvil-default',
            description: '10,000 ETH pre-funded test account'
          },
          {
            title: 'Foundry Keystore',
            value: 'keystore',
            description: 'Use a wallet from your Foundry keystore'
          }
        ]
      : [
          {
            title: 'Default Hardhat Account (0xf39F...)',
            value: 'hardhat-default',
            description: '10,000 ETH pre-funded test account'
          },
          {
            title: 'Private Key from .env',
            value: 'env',
            description: 'Use DEPLOYER_PRIVATE_KEY from .env'
          }
        ];

    const walletChoice = await prompts({
      type: 'select',
      name: 'choice',
      message: 'Select wallet for local deployment:',
      choices: walletChoices
    });

    if (!walletChoice.choice) {
      error('Deployment cancelled.');
      return;
    }

    if (walletChoice.choice === 'anvil-default') {
      useDefaultAnvilKey = true;
      wallet = 'anvil-default';
      info('Using default Anvil account for local deployment');
    } else if (walletChoice.choice === 'hardhat-default') {
      useDefaultHardhatKey = true;
      wallet = 'hardhat-default';
      info('Using default Hardhat account for local deployment');
    } else if (walletChoice.choice === 'keystore') {
      wallet = await selectWallet(config.framework);
      if (!wallet) return;

      // Fund the keystore wallet from Anvil's default account
      info('Funding your keystore wallet from Anvil test account...');
      const fundResult = await fundWalletFromAnvil(wallet, ANVIL_PORT);

      if (fundResult.success) {
        success('Wallet ready for deployment');
      } else {
        // Funding failed - give user options
        warning('Could not automatically fund wallet.');

        const fundingChoice = await prompts({
          type: 'select',
          name: 'action',
          message: 'How would you like to proceed?',
          choices: [
            {
              title: 'Use default Anvil account (recommended)',
              value: 'default',
              description: 'Deploy using the pre-funded Anvil test account'
            },
            {
              title: 'Continue with keystore wallet',
              value: 'continue',
              description: 'Proceed anyway (wallet may not have funds)'
            },
            {
              title: 'Cancel',
              value: 'cancel',
              description: 'Exit deployment'
            }
          ]
        });

        if (fundingChoice.action === 'cancel' || !fundingChoice.action) {
          error('Deployment cancelled.');
          return;
        }

        if (fundingChoice.action === 'default') {
          useDefaultAnvilKey = true;
          wallet = 'anvil-default';
          info('Using default Anvil account for deployment');
        } else {
          info('Continuing with keystore wallet');
        }
      }
    } else if (walletChoice.choice === 'env') {
      // Check for private key in .env
      const hasKey = process.env.DEPLOYER_PRIVATE_KEY && process.env.DEPLOYER_PRIVATE_KEY.length > 0;
      if (!hasKey) {
        warning('DEPLOYER_PRIVATE_KEY not set. Using default Hardhat account.');
        useDefaultHardhatKey = true;
        wallet = 'hardhat-default';
      } else {
        wallet = 'env';
        success('Using private key from .env');
      }
    }
  } else {
    wallet = await selectWallet(config.framework);
    if (!wallet) return;
  }

  // Confirm deployment
  const confirmResponse = await prompts({
    type: 'confirm',
    name: 'value',
    message: `Deploy to local ${chainName}?`,
    initial: true
  });

  if (!confirmResponse.value) {
    error('Deployment cancelled.');
    return;
  }

  // Ensure wallet is set
  if (!wallet) {
    error('No wallet selected for deployment.');
    return;
  }

  // Get deployer address for logging
  let deployerAddress: string | null = null;
  if (useDefaultAnvilKey || useDefaultHardhatKey) {
    deployerAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  } else if (config.framework === 'foundry' && wallet !== 'env') {
    deployerAddress = await getWalletAddress(wallet);
  } else if (config.framework === 'hardhat' && wallet === 'env') {
    // Get address from DEPLOYER_PRIVATE_KEY
    deployerAddress = await getAddressFromPrivateKey();
  }

  // Execute deployment
  const result = await executeDeployment(
    config,
    networkResponse.network,
    wallet,
    projectRoot,
    useDefaultAnvilKey,
    deployerAddress
  );

  if (result) {
    await displayDeploymentResult(result, config.framework);
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
  useDefaultAnvilKey: boolean = false,
  deployerAddress: string | null = null
): Promise<DeploymentResult | null> {
  // Display deployer info before starting
  if (deployerAddress) {
    info(`Deployer wallet: ${chalk.cyan(wallet)}`);
    info(`Deployer address: ${chalk.green(deployerAddress)}`);
  }

  console.log(chalk.blue('\n🚀 Starting deployment...\n'));

  const packageDir = join(projectRoot, 'packages', config.framework);

  // Check if package exists
  if (!existsSync(packageDir)) {
    error(`${config.framework} package not found. Run "npm run wizard" to initialize.`);
    return null;
  }

  try {
    let result: DeploymentResult | null;
    if (config.framework === 'foundry') {
      result = await deployWithFoundry(wallet, packageDir, useDefaultAnvilKey);
    } else {
      result = await deployWithHardhat(packageDir);
    }

    // Add deployer info to result
    if (result) {
      result.deployerAddress = deployerAddress || undefined;
      result.deployerWallet = wallet;
    }

    return result;
  } catch (err: any) {
    error(`Deployment failed: ${err.message}`);
    return null;
  }
}

// Default Anvil private key (well-known test key - DO NOT use in production)
const DEFAULT_ANVIL_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Deploy using Foundry (local chain only)
 */
async function deployWithFoundry(
  wallet: string,
  packageDir: string,
  useDefaultAnvilKey: boolean = false
): Promise<DeploymentResult | null> {
  const rpcUrl = LOCAL_RPC_URL;

  // Clean stale artifacts first
  console.log(chalk.gray('Cleaning stale artifacts...'));
  await execa('forge', ['clean'], { cwd: packageDir, stdio: 'pipe' }).catch(() => {});

  // Select the deployment script based on contract source
  // Read scaffold.config.json to determine which contracts to use
  const scaffoldConfigPath = join(packageDir, '..', '..', 'scaffold.config.json');
  let contractSource = 'testnet'; // default
  try {
    const scaffoldConfig = JSON.parse(readFileSync(scaffoldConfigPath, 'utf-8'));
    contractSource = scaffoldConfig.contractSource || 'testnet';
  } catch {
    // Use default
  }

  const scriptFile = contractSource === 'playground'
    ? 'script/Deploy.playground.s.sol:DeployScript'
    : 'script/Deploy.testnet.s.sol:DeployScript';

  const args = [
    'script',
    scriptFile,
    '--rpc-url', rpcUrl,
    '--broadcast',
    '--via-ir',
    '-vvvv'
  ];

  // For local deployment with default Anvil key, use --private-key
  // Otherwise use --account for keystore wallets
  if (useDefaultAnvilKey) {
    args.push('--private-key', DEFAULT_ANVIL_KEY);
  } else {
    args.push('--account', wallet);
  }

  await execa('forge', args, {
    cwd: packageDir,
    stdio: 'inherit'
  });

  // Parse deployment artifacts
  return parseFoundryArtifacts(packageDir);
}

/**
 * Deploy using Hardhat (local chain only)
 *
 * Uses hybrid approach: Foundry for compilation, Hardhat ts-node script for deployment
 * This avoids source name conflicts with self-referential imports
 */
async function deployWithHardhat(
  packageDir: string
): Promise<DeploymentResult | null> {
  const networkName = 'localhost';

  const projectRoot = join(packageDir, '..', '..');
  const foundryDir = join(projectRoot, 'packages', 'foundry');

  // Step 1: Compile with Foundry (handles complex import remappings)
  console.log(chalk.gray('Compiling contracts with Foundry...'));
  try {
    await execa('forge', ['build'], {
      cwd: foundryDir,
      stdio: 'inherit'
    });
  } catch (err: any) {
    error(`Foundry compilation failed: ${err.message}`);
    return null;
  }

  // Step 2: Deploy using ts-node script (reads Foundry artifacts)
  console.log(chalk.blue('\nDeploying contracts...\n'));
  try {
    await execa('npx', ['ts-node', 'scripts/deploy.ts', '--network', networkName], {
      cwd: packageDir,
      stdio: 'inherit'
    });
  } catch (err: any) {
    error(`Deployment script failed: ${err.message}`);
    return null;
  }

  // Parse deployment artifacts from the summary file
  return parseHardhatArtifacts(packageDir);
}


/**
 * Parse Foundry deployment artifacts (local chain only)
 */
function parseFoundryArtifacts(packageDir: string): DeploymentResult | null {
  const chainId = ANVIL_CHAIN_ID;

  // Try different script names (new bundled scripts and legacy)
  const scriptNames = [
    'Deploy.testnet.s.sol',      // Bundled testnet contracts
    'Deploy.playground.s.sol',   // Bundled playground contracts
    'Deploy.s.sol',              // Generic deploy script
    'DeployTestnet.s.sol',       // Legacy names
    'DeployTestnetOnAnvil.s.sol'
  ];

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
      network: 'localhost'
    };
  } catch {
    return null;
  }
}

/**
 * Parse Hardhat deployment artifacts (local chain only)
 * Reads from deployment-summary.json created by our ts-node deploy script
 */
function parseHardhatArtifacts(packageDir: string): DeploymentResult | null {
  const deploymentsDir = join(packageDir, 'deployments', 'localhost');
  const summaryPath = join(deploymentsDir, 'deployment-summary.json');

  const chainId = ANVIL_CHAIN_ID;

  // Try reading from deployment-summary.json (created by our ts-node script)
  if (existsSync(summaryPath)) {
    try {
      const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));
      return {
        evvmAddress: summary.contracts.evvm as Address,
        stakingAddress: summary.contracts.staking as Address,
        estimatorAddress: summary.contracts.estimator as Address,
        nameServiceAddress: summary.contracts.nameService as Address,
        treasuryAddress: summary.contracts.treasury as Address,
        p2pSwapAddress: summary.contracts.p2pSwap as Address | undefined,
        chainId: summary.chainId || chainId,
        network: 'localhost'
      };
    } catch {
      warning('Failed to parse deployment-summary.json');
    }
  }

  // Fallback to hardhat-deploy format (individual contract JSON files)
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

  return {
    evvmAddress: readDeployment('Evvm') || '0x' as Address,
    stakingAddress: readDeployment('Staking') || '0x' as Address,
    estimatorAddress: readDeployment('Estimator') || '0x' as Address,
    nameServiceAddress: readDeployment('NameService') || '0x' as Address,
    treasuryAddress: readDeployment('Treasury') || '0x' as Address,
    p2pSwapAddress: readDeployment('P2PSwap'),
    chainId,
    network: 'localhost'
  };
}

/**
 * Display deployment result and update .env
 */
async function displayDeploymentResult(result: DeploymentResult, framework: 'foundry' | 'hardhat' = 'foundry'): Promise<void> {
  const chainName = framework === 'foundry' ? 'Anvil' : 'Hardhat Network';

  console.log(evvmGreen('\n═══════════════════════════════════════════════════════════'));
  console.log(evvmGreen('                 DEPLOYED CONTRACTS SUMMARY'));
  console.log(evvmGreen('═══════════════════════════════════════════════════════════\n'));

  console.log(chalk.white(`Network: ${chalk.green(`Local (${chainName})`)} (Chain ID: ${result.chainId})\n`));

  // Display deployer info
  if (result.deployerWallet || result.deployerAddress) {
    console.log(chalk.yellow('Deployer:'));
    if (result.deployerWallet) {
      console.log(chalk.white(`  Wallet:      ${chalk.cyan(result.deployerWallet)}`));
    }
    if (result.deployerAddress) {
      console.log(chalk.white(`  Address:     ${chalk.green(result.deployerAddress)}`));
    }
    console.log('');
  }

  console.log(chalk.yellow('Core Contracts:'));
  console.log(chalk.white(`  EVVM:        ${chalk.green(result.evvmAddress)}`));
  console.log(chalk.white(`  Treasury:    ${chalk.green(result.treasuryAddress)}`));

  console.log(chalk.yellow('\nSupporting Contracts:'));
  console.log(chalk.white(`  Staking:     ${chalk.green(result.stakingAddress)}`));
  console.log(chalk.white(`  Estimator:   ${chalk.green(result.estimatorAddress)}`));
  console.log(chalk.white(`  NameService: ${chalk.green(result.nameServiceAddress)}`));
  if (result.p2pSwapAddress) {
    console.log(chalk.white(`  P2PSwap:     ${chalk.green(result.p2pSwapAddress)}`));
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
  await saveDeploymentSummary(result);

  // Verify local chain is still running after deployment
  const localChainRunning = await isAnvilRunning(ANVIL_PORT);

  console.log(chalk.cyan('\n┌─────────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan('│               LOCAL DEPLOYMENT INFO                      │'));
  console.log(chalk.cyan('└─────────────────────────────────────────────────────────┘\n'));

  if (localChainRunning) {
    console.log(chalk.green(`✓ ${chainName} is still running on port 8545\n`));
  } else {
    console.log(chalk.red(`⚠️  ${chainName} appears to have stopped!\n`));
    if (framework === 'foundry') {
      console.log(chalk.yellow('To restart Anvil, run in a separate terminal:'));
      console.log(chalk.cyan('  anvil --port 8545 --chain-id 31337\n'));
    } else {
      console.log(chalk.yellow('To restart Hardhat Network, run in a separate terminal:'));
      console.log(chalk.cyan('  cd packages/hardhat && npx hardhat node\n'));
    }
  }

  console.log(chalk.yellow(`${chainName} Local Chain:`));
  console.log(chalk.gray('  • Chain ID: 31337'));
  console.log(chalk.gray('  • RPC URL: http://127.0.0.1:8545'));
  console.log(chalk.gray('  • Block time: 1 second\n'));

  console.log(chalk.yellow.bold('Two Terminal Workflow:\n'));
  console.log(chalk.white('For local development, use TWO separate terminals:\n'));
  if (framework === 'foundry') {
    console.log(chalk.cyan('Terminal 1 (keep Anvil running):'));
    console.log(chalk.gray('  anvil --port 8545 --chain-id 31337\n'));
  } else {
    console.log(chalk.cyan('Terminal 1 (keep Hardhat Network running):'));
    console.log(chalk.gray('  cd packages/hardhat && npx hardhat node\n'));
  }
  console.log(chalk.cyan('Terminal 2 (run frontend):'));
  console.log(chalk.gray('  npm run frontend\n'));

  console.log(chalk.yellow('Wallet Setup (WalletConnect does NOT work with localhost):\n'));

  console.log(chalk.cyan('1. Add Local Network to your wallet (MetaMask/Rabby):'));
  console.log(chalk.gray(`   • Network Name: ${chainName} (Localhost)`));
  console.log(chalk.gray('   • RPC URL: http://127.0.0.1:8545'));
  console.log(chalk.gray('   • Chain ID: 31337'));
  console.log(chalk.gray('   • Currency Symbol: ETH\n'));

  console.log(chalk.cyan('2. Import a test account (use Account #0):'));
  console.log(chalk.gray('   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'));
  console.log(chalk.gray('   Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));
  console.log(chalk.gray('   Balance: 10,000 ETH\n'));

  console.log(chalk.yellow('To interact with contracts via CLI:'));
  console.log(chalk.gray(`  cast call ${result.evvmAddress} "getEvvmMetadata()" --rpc-url http://127.0.0.1:8545\n`));

  if (framework === 'foundry') {
    console.log(chalk.yellow('To stop Anvil:'));
    console.log(chalk.gray('  pkill anvil\n'));
  } else {
    console.log(chalk.yellow('To stop Hardhat Network:'));
    console.log(chalk.gray('  pkill -f "hardhat node"\n'));
  }

  info('Run "npm run frontend" to start the frontend');
  warning('If a dev server is already running, restart it for changes to take effect.');
}

/**
 * Generate deployment configuration files
 *
 * With the new bundled architecture, contracts are already in place:
 * - testnet-contracts/ - Bundled from EVVM-org/Testnet-Contracts
 * - playground-contracts/ - Bundled from EVVM-org/Playground-Contracts
 * - contracts/ - User's custom services
 *
 * This function only generates the Inputs/BaseInputs.sol with user configuration.
 */
async function generateDeploymentConfig(
  framework: 'foundry' | 'hardhat',
  projectRoot: string,
  evvmConfig: {
    addresses: { admin: string; goldenFisher: string; activator: string };
    basicMetadata: { EvvmName: string; principalTokenName: string; principalTokenSymbol: string };
    advancedMetadata: { totalSupply: string; eraTokens: string; reward: string };
  },
  contractSource: 'testnet' | 'playground' = 'testnet'
): Promise<void> {
  // Write configuration files
  const inputDir = join(projectRoot, 'input');
  if (!existsSync(inputDir)) {
    mkdirSync(inputDir, { recursive: true });
  }

  // Generate Inputs.sol with bundled contract imports
  // We need separate files for testnet and playground due to different struct imports
  const inputsSol = generateInputsSol(evvmConfig, contractSource);
  const inputFileName = contractSource === 'playground' ? 'Inputs.playground.sol' : 'Inputs.testnet.sol';
  writeFileSync(join(inputDir, inputFileName), inputsSol);

  // Write legacy JSON files for reference
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

  // Copy to framework package input directory
  const frameworkInputDir = join(projectRoot, 'packages', framework, 'input');
  if (!existsSync(frameworkInputDir)) {
    mkdirSync(frameworkInputDir, { recursive: true });
  }
  cpSync(inputDir, frameworkInputDir, { recursive: true });
  info(`Generated ${inputFileName} with your configuration`);
}

/**
 * Generate Inputs.sol content from configuration
 * Uses the appropriate import path based on contract source (testnet or playground)
 */
function generateInputsSol(
  config: {
    addresses: { admin: string; goldenFisher: string; activator: string };
    basicMetadata: { EvvmName: string; principalTokenName: string; principalTokenSymbol: string };
    advancedMetadata: { totalSupply: string; eraTokens: string; reward: string };
  },
  contractSource: 'testnet' | 'playground' = 'testnet'
): string {
  const importPath = contractSource === 'playground'
    ? '@scaffold-evvm/playground-contracts'
    : '@scaffold-evvm/testnet-contracts';

  return `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {EvvmStructs} from "${importPath}/contracts/evvm/lib/EvvmStructs.sol";

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
 * Save deployment summary to deployments/ folder (local chain only)
 */
async function saveDeploymentSummary(
  result: DeploymentResult
): Promise<void> {
  // Create deployments directory if it doesn't exist
  if (!existsSync(DEPLOYMENTS_DIR)) {
    mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }

  const summary = {
    network: {
      name: 'Local Chain',
      chainId: result.chainId,
      network: 'localhost'
    },
    evvm: {
      address: result.evvmAddress
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
  const filename = `deployment-localhost-${result.chainId}.json`;
  const filepath = join(DEPLOYMENTS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(summary, null, 2));

  // Also save as latest
  const latestPath = join(DEPLOYMENTS_DIR, 'latest.json');
  writeFileSync(latestPath, JSON.stringify(summary, null, 2));

  info(`Deployment summary saved to ${filename}`);
}

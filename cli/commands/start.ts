/**
 * Full Start Command
 *
 * One command to rule them all:
 * 1. Select framework (Foundry/Hardhat)
 * 2. Select contract source (Testnet/Playground)
 * 3. Configure EVVM (addresses, metadata)
 * 4. Sync contracts from source
 * 5. Compile contracts
 * 6. Start local chain
 * 7. Deploy contracts
 * 8. Update frontend .env
 * 9. Start frontend
 *
 * Usage: npm run start:full
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';
import chalk from 'chalk';
import { execa, ExecaChildProcess } from 'execa';
import { sectionHeader, success, warning, error, info, dim, divider, evvmGreen } from '../utils/display.js';
import { commandExists, checkSubmodules, initializeSubmodules, getAvailableWallets } from '../utils/prerequisites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const PROJECT_ROOT = join(__dirname, '..', '..');
const FOUNDRY_DIR = join(PROJECT_ROOT, 'packages', 'foundry');
const DEPLOYMENTS_DIR = join(PROJECT_ROOT, 'deployments');

// Local chain configuration
const LOCAL_RPC_URL = 'http://localhost:8545';
const LOCAL_CHAIN_ID = 31337;

interface FullStartConfig {
  framework: 'foundry' | 'hardhat';
  contractSource: 'testnet' | 'playground';
  addresses: {
    admin: string;
    goldenFisher: string;
    activator: string;
  };
  basicMetadata: {
    EvvmName: string;
    principalTokenName: string;
    principalTokenSymbol: string;
  };
  advancedMetadata: {
    totalSupply: string;
    eraTokens: string;
    reward: string;
  };
  wallet?: string;
  useDefaultAnvilKey?: boolean;
}

/**
 * Full start command - complete setup and launch
 */
export async function fullStart(): Promise<void> {
  console.log(evvmGreen(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    SCAFFOLD-EVVM                              ║
║              Full Setup & Launch Wizard                       ║
║                                                               ║
║   This wizard will guide you through the complete setup:      ║
║   Framework → Contracts → Config → Deploy → Frontend          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

  // Step 1: Framework Selection
  sectionHeader('Step 1: Framework Selection');

  const frameworkResponse = await prompts({
    type: 'select',
    name: 'framework',
    message: 'Select your smart contract framework:',
    choices: [
      {
        title: 'Foundry',
        value: 'foundry',
        description: 'Fast, Solidity-native testing (recommended)'
      },
      {
        title: 'Hardhat',
        value: 'hardhat',
        description: 'JavaScript/TypeScript ecosystem'
      }
    ]
  });

  if (!frameworkResponse.framework) {
    error('Setup cancelled.');
    return;
  }

  // Verify framework is installed
  if (frameworkResponse.framework === 'foundry') {
    const hasForge = await commandExists('forge');
    if (!hasForge) {
      error('Foundry not installed!');
      info('Install from: https://getfoundry.sh');
      console.log(chalk.gray('\n  curl -L https://foundry.paradigm.xyz | bash'));
      console.log(chalk.gray('  foundryup\n'));
      return;
    }
    success('Foundry detected');
  }

  // Step 2: Contract Source Selection
  sectionHeader('Step 2: Contract Sources');

  // Check bundled contract sources
  info('Checking bundled EVVM contracts...');

  const hasTestnet = existsSync(join(FOUNDRY_DIR, 'testnet-contracts', 'contracts'));
  const hasPlayground = existsSync(join(FOUNDRY_DIR, 'playground-contracts', 'contracts'));

  if (hasTestnet) {
    success('Testnet-Contracts (bundled)');
  } else {
    warning('Testnet-Contracts not bundled');
  }

  if (hasPlayground) {
    success('Playground-Contracts (bundled)');
  } else {
    warning('Playground-Contracts not bundled');
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

  // Build source choices based on available bundled contracts
  const sourceChoices = [];
  if (hasTestnet) {
    sourceChoices.push({
      title: 'Testnet Contracts (bundled)',
      value: 'testnet',
      description: 'Production-ready for local deployment'
    });
  }
  if (hasPlayground) {
    sourceChoices.push({
      title: 'Playground Contracts (bundled)',
      value: 'playground',
      description: 'Experimental for prototyping'
    });
  }

  const sourceResponse = await prompts({
    type: 'select',
    name: 'contractSource',
    message: 'Select contract source:',
    choices: sourceChoices
  });

  if (!sourceResponse.contractSource) {
    error('Setup cancelled.');
    return;
  }

  success(`Selected: ${sourceResponse.contractSource === 'testnet' ? 'Testnet-Contracts' : 'Playground-Contracts'}`);

  // Network is always local
  sectionHeader('Step 3: Network');
  const chainName = frameworkResponse.framework === 'foundry' ? 'Anvil' : 'Hardhat Network';
  info(`Deploying to local chain (${chainName})`);

  // Step 4: EVVM Configuration
  sectionHeader('Step 4: EVVM Configuration');

  info('Configure admin addresses for your EVVM instance.\n');

  // For local deployment, offer to use default test addresses
  let addresses: FullStartConfig['addresses'];

  const useDefaults = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Use default test addresses for local deployment?',
    initial: true
  });

  if (useDefaults.value) {
    // Anvil's default test accounts
    addresses = {
      admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      goldenFisher: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      activator: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
    };
    success('Using default test addresses');
  } else {
    addresses = await promptAddresses();
  }

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

  if (!basicResponse.EvvmName) {
    error('Setup cancelled.');
    return;
  }

  // Use default advanced metadata
  const advancedMetadata = {
    totalSupply: '2033333333000000000000000000',
    eraTokens: '1016666666500000000000000000',
    reward: '5000000000000000000'
  };

  // Wallet selection
  let wallet: string | undefined;
  let useDefaultAnvilKey = false;

  if (frameworkResponse.framework === 'foundry') {
    sectionHeader('Step 5: Wallet Selection');

    // Offer choice between default Anvil key or keystore wallet
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
      error('Setup cancelled.');
      return;
    }

    if (walletChoice.choice === 'anvil-default') {
      useDefaultAnvilKey = true;
      info('Using default Anvil account for local deployment');
    } else {
      // Select from keystore
      wallet = await selectKeystoreWallet();
      if (!wallet) return;
    }
  }

  /**
   * Helper to select a keystore wallet
   */
  async function selectKeystoreWallet(): Promise<string | undefined> {
    const wallets = await getAvailableWallets();

    if (wallets.length === 0) {
      warning('No Foundry wallets found.');
      info('Import a wallet: cast wallet import deployer --interactive');

      const importWallet = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Import a wallet now?',
        initial: true
      });

      if (importWallet.value) {
        try {
          await execa('cast', ['wallet', 'import', 'deployer', '--interactive'], {
            stdio: 'inherit'
          });
          return 'deployer';
        } catch {
          error('Failed to import wallet.');
          return undefined;
        }
      } else {
        return undefined;
      }
    } else {
      const walletResponse = await prompts({
        type: 'select',
        name: 'wallet',
        message: 'Select deployment wallet:',
        choices: wallets.map(w => ({ title: w, value: w }))
      });

      if (!walletResponse.wallet) {
        error('Setup cancelled.');
        return undefined;
      }
      return walletResponse.wallet;
    }
  }

  // Build config
  const config: FullStartConfig = {
    framework: frameworkResponse.framework,
    contractSource: sourceResponse.contractSource,
    addresses,
    basicMetadata: basicResponse,
    advancedMetadata,
    wallet,
    useDefaultAnvilKey
  };

  // Display summary
  displaySummary(config);

  const confirmResponse = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Start the full setup process?',
    initial: true
  });

  if (!confirmResponse.value) {
    error('Setup cancelled.');
    return;
  }

  // Execute the full setup
  await executeFullSetup(config);
}

/**
 * Prompt for addresses
 */
async function promptAddresses(): Promise<FullStartConfig['addresses']> {
  const validateAddress = (v: string) =>
    /^0x[a-fA-F0-9]{40}$/.test(v) ? true : 'Invalid address format';

  const admin = await prompts({
    type: 'text',
    name: 'value',
    message: 'Admin address (0x...):',
    validate: validateAddress
  });

  const goldenFisher = await prompts({
    type: 'text',
    name: 'value',
    message: 'Golden Fisher address (0x...):',
    validate: validateAddress
  });

  const activator = await prompts({
    type: 'text',
    name: 'value',
    message: 'Activator address (0x...):',
    validate: validateAddress
  });

  return {
    admin: admin.value,
    goldenFisher: goldenFisher.value,
    activator: activator.value
  };
}

/**
 * Display configuration summary
 */
function displaySummary(config: FullStartConfig): void {
  const chainName = config.framework === 'foundry' ? 'Anvil' : 'Hardhat Network';

  divider();
  console.log(chalk.cyan('                    SETUP SUMMARY'));
  divider();

  console.log(chalk.yellow('Framework:    ') + chalk.green(config.framework.toUpperCase()));
  console.log(chalk.yellow('Contracts:    ') + chalk.green(config.contractSource === 'testnet' ? 'Testnet-Contracts' : 'Playground-Contracts'));
  console.log(chalk.yellow('Network:      ') + chalk.green(`Local (${chainName})`));
  console.log('');
  console.log(chalk.yellow('EVVM Name:    ') + chalk.green(config.basicMetadata.EvvmName));
  console.log(chalk.yellow('Token:        ') + chalk.green(`${config.basicMetadata.principalTokenName} (${config.basicMetadata.principalTokenSymbol})`));
  console.log('');
  console.log(chalk.yellow('Admin:        ') + chalk.gray(config.addresses.admin));
  console.log(chalk.yellow('GoldenFisher: ') + chalk.gray(config.addresses.goldenFisher));
  console.log(chalk.yellow('Activator:    ') + chalk.gray(config.addresses.activator));

  divider();

  console.log(chalk.cyan('This will:'));
  console.log(chalk.gray('  1. Sync contracts from ' + (config.contractSource === 'testnet' ? 'Testnet-Contracts' : 'Playground-Contracts')));
  console.log(chalk.gray('  2. Write configuration files'));
  console.log(chalk.gray('  3. Compile contracts'));
  console.log(chalk.gray(`  4. Start local chain (${chainName})`));
  console.log(chalk.gray('  5. Deploy contracts'));
  console.log(chalk.gray('  6. Update frontend .env'));
  console.log(chalk.gray('  7. Start frontend development server'));

  divider();
}

/**
 * Execute the full setup process
 */
async function executeFullSetup(config: FullStartConfig): Promise<void> {
  let chainProcess: ExecaChildProcess | null = null;

  try {
    // Step 1: Write configuration files (contracts are bundled - no sync needed)
    sectionHeader('Generating Configuration');

    await writeConfigFiles(config);
    success('Configuration files written');

    // Step 2: Compile contracts
    sectionHeader('Compiling Contracts');

    if (config.framework === 'foundry') {
      info('Compiling with Forge...');
      await execa('forge', ['build', '--via-ir'], {
        cwd: FOUNDRY_DIR,
        stdio: 'inherit'
      });
    } else {
      const hardhatDir = join(PROJECT_ROOT, 'packages', 'hardhat');
      info('Installing npm dependencies...');
      await execa('npm', ['install'], { cwd: hardhatDir, stdio: 'inherit' });
      info('Compiling with Hardhat...');
      await execa('npx', ['hardhat', 'compile'], { cwd: hardhatDir, stdio: 'inherit' });
    }

    success('Contracts compiled');

    // Step 4: Start local chain
    sectionHeader('Starting Local Chain');

    if (config.framework === 'foundry') {
      info('Starting Anvil...');
      chainProcess = execa('anvil', ['--block-time', '10'], {
        stdio: 'pipe'
      });

      // Wait for chain to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      success('Anvil running on http://localhost:8545');

      // Fund keystore wallet if using one (not default Anvil key)
      if (config.wallet && !config.useDefaultAnvilKey) {
        sectionHeader('Funding Wallet');
        const fundResult = await fundWalletFromAnvil(config.wallet);
        if (!fundResult.success) {
          warning('Could not automatically fund wallet. You may need to fund it manually.');
          info('To fund manually, run:');
          console.log(chalk.gray(`  cast send ${fundResult.address || '<wallet-address>'} --value 100ether --private-key ${DEFAULT_ANVIL_KEY} --rpc-url ${LOCAL_RPC_URL}`));
        }
      }
    } else {
      info('Starting Hardhat Network...');
      const hardhatDir = join(PROJECT_ROOT, 'packages', 'hardhat');
      chainProcess = execa('npx', ['hardhat', 'node', '--no-deploy'], {
        cwd: hardhatDir,
        stdio: 'pipe'
      });

      await new Promise(resolve => setTimeout(resolve, 3000));
      success('Hardhat Network running on http://localhost:8545');
    }

    // Step 5: Deploy contracts
    sectionHeader('Deploying Contracts');

    const deployedAddresses = await deployContracts(config);

    if (deployedAddresses) {
      success('Contracts deployed!');

      // Display comprehensive deployment summary
      displayDeploymentSummary(deployedAddresses, config.framework);

      // Save deployment summary
      await saveDeploymentSummary(deployedAddresses);

      // Step 6: Update frontend .env
      sectionHeader('Updating Frontend Configuration');

      await updateFrontendEnv(deployedAddresses);
      success('Frontend .env updated');

      // Step 7: Start frontend
      sectionHeader('Starting Frontend');

      info('Starting Next.js development server...');

      // Kill any existing Next.js dev server on port 3000
      // This is necessary because Next.js bakes env vars into the bundle at server start time
      const frontendDir = join(PROJECT_ROOT, 'packages', 'nextjs');

      info('Checking for existing frontend server...');
      try {
        // Find and kill any process on port 3000
        const { stdout } = await execa('lsof', ['-t', '-i:3000'], { stdio: 'pipe' }).catch(() => ({ stdout: '' }));
        if (stdout.trim()) {
          const pids = stdout.trim().split('\n');
          for (const pid of pids) {
            if (pid) {
              info(`Killing existing process on port 3000 (PID: ${pid})...`);
              await execa('kill', ['-9', pid], { stdio: 'pipe' }).catch(() => {});
            }
          }
          success('Existing frontend server stopped');
          // Wait a moment for port to be released
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch {
        // No process on port 3000, continue
      }

      // Clear Next.js cache to ensure new env vars are loaded
      // This is necessary because Next.js caches env vars at build/start time
      const nextCacheDir = join(frontendDir, '.next');
      if (existsSync(nextCacheDir)) {
        info('Clearing Next.js cache to load new configuration...');
        rmSync(nextCacheDir, { recursive: true, force: true });
        success('Cache cleared');
      }

      console.log(chalk.gray('\nThe frontend will open at http://localhost:3000\n'));
      console.log(chalk.yellow('Note: Keep this terminal open to maintain the local chain.'));
      console.log(chalk.gray('Press Ctrl+C to stop everything.\n'));

      // Start frontend
      await execa('npm', ['run', 'dev'], {
        cwd: frontendDir,
        stdio: 'inherit'
      });
    }
  } catch (err: any) {
    error(`Setup failed: ${err.message}`);

    if (chainProcess) {
      chainProcess.kill();
    }
  }
}

/**
 * Sync contracts from source repository
 */
async function syncContractsFromSource(sourcePath: string, framework: 'foundry' | 'hardhat'): Promise<void> {
  const sourceContractsPath = join(sourcePath, 'src');
  const targetDir = join(PROJECT_ROOT, 'packages', framework, 'contracts');

  // Clear existing contracts
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }

  // Copy contracts
  if (existsSync(sourceContractsPath)) {
    cpSync(sourceContractsPath, targetDir, { recursive: true });
  }

  // For Foundry, also sync lib and scripts
  if (framework === 'foundry') {
    const sourceLibPath = join(sourcePath, 'lib');
    const targetLibPath = join(PROJECT_ROOT, 'packages', 'foundry', 'lib');

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
    const targetScriptPath = join(PROJECT_ROOT, 'packages', 'foundry', 'script');
    if (existsSync(sourceScriptPath)) {
      cpSync(sourceScriptPath, targetScriptPath, { recursive: true });
    }
  }
}

/**
 * Write EVVM configuration files
 */
async function writeConfigFiles(config: FullStartConfig): Promise<void> {
  const inputDir = join(PROJECT_ROOT, 'input');

  if (!existsSync(inputDir)) {
    mkdirSync(inputDir, { recursive: true });
  }

  // Generate Inputs.sol with correct filename based on contract source
  // Deploy scripts import from Inputs.testnet.sol or Inputs.playground.sol
  const inputsSol = generateInputsSol(config);
  const inputFileName = config.contractSource === 'playground'
    ? 'Inputs.playground.sol'
    : 'Inputs.testnet.sol';
  writeFileSync(join(inputDir, inputFileName), inputsSol);

  // Also write legacy JSON files for backwards compatibility
  // address.json
  writeFileSync(
    join(inputDir, 'address.json'),
    JSON.stringify(config.addresses, null, 2) + '\n'
  );

  // evvmBasicMetadata.json
  writeFileSync(
    join(inputDir, 'evvmBasicMetadata.json'),
    JSON.stringify(config.basicMetadata, null, 2) + '\n'
  );

  // evvmAdvancedMetadata.json (alphabetical order for Foundry)
  const advancedContent = `{
  "eraTokens": ${config.advancedMetadata.eraTokens},
  "reward": ${config.advancedMetadata.reward},
  "totalSupply": ${config.advancedMetadata.totalSupply}
}
`;
  writeFileSync(join(inputDir, 'evvmAdvancedMetadata.json'), advancedContent);

  // Also copy to framework package
  const frameworkInputDir = join(PROJECT_ROOT, 'packages', config.framework, 'input');
  if (!existsSync(frameworkInputDir)) {
    mkdirSync(frameworkInputDir, { recursive: true });
  }
  cpSync(inputDir, frameworkInputDir, { recursive: true });

  // Save scaffold config
  writeFileSync(
    join(PROJECT_ROOT, 'scaffold.config.json'),
    JSON.stringify({
      framework: config.framework,
      contractSource: config.contractSource,
      initialized: true,
      timestamp: new Date().toISOString()
    }, null, 2)
  );
}

/**
 * Generate Inputs.sol content from configuration
 * Uses @scaffold-evvm/ namespace for bundled contracts
 */
function generateInputsSol(config: FullStartConfig): string {
  // Select import path based on contract source
  const importPath = config.contractSource === 'playground'
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

interface DeployedAddresses {
  evvm: string;
  staking: string;
  estimator: string;
  nameService: string;
  treasury: string;
  p2pSwap?: string;
  chainId: number;
}

// Default Anvil private key (well-known test key - DO NOT use in production)
const DEFAULT_ANVIL_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Fund a keystore wallet from Anvil's default account
 * This is needed when using Foundry keystore wallets for local deployment
 */
async function fundWalletFromAnvil(walletName: string): Promise<{ success: boolean; address?: string }> {
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

    info(`Wallet address: ${walletAddress}`);

    // Check if wallet already has sufficient balance
    try {
      const balanceResult = await execa('cast', [
        'balance',
        walletAddress,
        '--rpc-url', LOCAL_RPC_URL
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

    info('Funding keystore wallet from Anvil test account...');

    // Send 100 ETH from Anvil's default account to the wallet
    try {
      const sendResult = await execa('cast', [
        'send',
        walletAddress,
        '--value', '100ether',
        '--private-key', DEFAULT_ANVIL_KEY,
        '--rpc-url', LOCAL_RPC_URL,
        '--gas-limit', '21000'
      ], {
        stdio: 'pipe'
      });

      if (sendResult.exitCode === 0 || sendResult.stdout.includes('transactionHash')) {
        success('Wallet funded with 100 ETH');
        return { success: true, address: walletAddress };
      }
    } catch (sendErr: any) {
      // First attempt failed, try with curl as fallback
      dim('  First funding method failed, trying alternative...');
    }

    // Fallback: Use eth_sendTransaction via curl (raw JSON-RPC)
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
        LOCAL_RPC_URL
      ], { stdio: 'pipe' });

      const response = JSON.parse(curlResult.stdout);
      if (response.result && response.result.startsWith('0x')) {
        success('Wallet funded with 100 ETH');
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

/**
 * Deploy contracts (local chain only)
 */
async function deployContracts(config: FullStartConfig): Promise<DeployedAddresses | null> {
  if (config.framework === 'foundry') {
    // Clean stale artifacts first
    info('Cleaning stale artifacts...');
    await execa('forge', ['clean'], { cwd: FOUNDRY_DIR, stdio: 'pipe' }).catch(() => {});

    // Select the deployment script based on contract source
    const scriptFile = config.contractSource === 'playground'
      ? 'script/Deploy.playground.s.sol:DeployScript'
      : 'script/Deploy.testnet.s.sol:DeployScript';

    const args = [
      'script',
      scriptFile,
      '--rpc-url', LOCAL_RPC_URL,
      '--broadcast',
      '--via-ir',
      '-vvvv'
    ];

    // For local deployment with default Anvil key, use --private-key
    // Otherwise use --account for keystore wallets
    if (config.useDefaultAnvilKey) {
      args.push('--private-key', DEFAULT_ANVIL_KEY);
    } else if (config.wallet) {
      args.push('--account', config.wallet);
    }

    try {
      await execa('forge', args, {
        cwd: FOUNDRY_DIR,
        stdio: 'inherit'
      });

      // Parse deployment artifacts
      return parseFoundryArtifacts(FOUNDRY_DIR);
    } catch (err) {
      error('Deployment failed');
      return null;
    }
  } else {
    const packageDir = join(PROJECT_ROOT, 'packages', 'hardhat');

    try {
      await execa('npx', ['hardhat', 'deploy', '--network', 'localhost'], {
        cwd: packageDir,
        stdio: 'inherit'
      });

      return parseHardhatArtifacts(packageDir);
    } catch {
      error('Deployment failed');
      return null;
    }
  }
}

/**
 * Parse Foundry deployment artifacts (local chain only)
 */
function parseFoundryArtifacts(packageDir: string): DeployedAddresses | null {
  const chainId = LOCAL_CHAIN_ID;

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
    warning('Deployment artifacts not found');
    return null;
  }

  try {
    const artifact = JSON.parse(readFileSync(runLatestPath, 'utf-8'));

    const findContract = (name: string) =>
      artifact.transactions?.find((tx: any) => tx.contractName === name)?.contractAddress || '0x';

    return {
      evvm: findContract('Evvm'),
      staking: findContract('Staking'),
      estimator: findContract('Estimator'),
      nameService: findContract('NameService'),
      treasury: findContract('Treasury'),
      p2pSwap: findContract('P2PSwap'),
      chainId
    };
  } catch {
    return null;
  }
}

/**
 * Parse Hardhat deployment artifacts (local chain only)
 */
function parseHardhatArtifacts(packageDir: string): DeployedAddresses | null {
  const deploymentsDir = join(packageDir, 'deployments', 'localhost');

  if (!existsSync(deploymentsDir)) {
    return null;
  }

  const readDeployment = (name: string): string => {
    const path = join(deploymentsDir, `${name}.json`);
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      return data.address || '0x';
    }
    return '0x';
  };

  return {
    evvm: readDeployment('Evvm'),
    staking: readDeployment('Staking'),
    estimator: readDeployment('Estimator'),
    nameService: readDeployment('NameService'),
    treasury: readDeployment('Treasury'),
    p2pSwap: readDeployment('P2PSwap'),
    chainId: LOCAL_CHAIN_ID
  };
}

/**
 * Save deployment summary to JSON file (local chain only)
 */
async function saveDeploymentSummary(addresses: DeployedAddresses): Promise<void> {
  // Create deployments directory if it doesn't exist
  if (!existsSync(DEPLOYMENTS_DIR)) {
    mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }

  const summary = {
    network: {
      name: 'Local Chain',
      chainId: addresses.chainId,
      network: 'localhost'
    },
    evvm: {
      address: addresses.evvm
    },
    contracts: {
      evvm: addresses.evvm,
      staking: addresses.staking,
      estimator: addresses.estimator,
      nameService: addresses.nameService,
      treasury: addresses.treasury,
      p2pSwap: addresses.p2pSwap || null
    },
    deployment: {
      timestamp: new Date().toISOString(),
      timestampUnix: Date.now()
    }
  };

  // Save with network-specific filename
  const filename = `deployment-localhost-${addresses.chainId}.json`;
  const filepath = join(DEPLOYMENTS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(summary, null, 2));

  // Also save as latest
  const latestPath = join(DEPLOYMENTS_DIR, 'latest.json');
  writeFileSync(latestPath, JSON.stringify(summary, null, 2));

  info(`Deployment summary saved to ${filename}`);
}

/**
 * Display comprehensive deployment summary (local chain only)
 */
function displayDeploymentSummary(addresses: DeployedAddresses, framework: 'foundry' | 'hardhat'): void {
  const chainName = framework === 'foundry' ? 'Anvil' : 'Hardhat Network';

  console.log(evvmGreen('\n═══════════════════════════════════════════════════════════'));
  console.log(evvmGreen('                 DEPLOYED CONTRACTS SUMMARY'));
  console.log(evvmGreen('═══════════════════════════════════════════════════════════\n'));

  console.log(chalk.white(`Network: ${chalk.green(`Local (${chainName})`)} (Chain ID: ${addresses.chainId})\n`));

  console.log(chalk.yellow('Core Contracts:'));
  console.log(chalk.white(`  EVVM:        ${chalk.green(addresses.evvm)}`));
  console.log(chalk.white(`  Treasury:    ${chalk.green(addresses.treasury)}`));
  console.log('');

  console.log(chalk.yellow('Supporting Contracts:'));
  console.log(chalk.white(`  Staking:     ${chalk.green(addresses.staking)}`));
  console.log(chalk.white(`  Estimator:   ${chalk.green(addresses.estimator)}`));
  console.log(chalk.white(`  NameService: ${chalk.green(addresses.nameService)}`));
  if (addresses.p2pSwap) {
    console.log(chalk.white(`  P2PSwap:     ${chalk.green(addresses.p2pSwap)}`));
  }

  console.log(evvmGreen('\n═══════════════════════════════════════════════════════════\n'));
}

/**
 * Update frontend .env with deployed addresses (local chain only)
 */
async function updateFrontendEnv(addresses: DeployedAddresses): Promise<void> {
  const envPath = join(PROJECT_ROOT, '.env');

  let envContent = '';

  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
  }

  // Update or add EVVM address
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_EVVM_ADDRESS', addresses.evvm);
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_CHAIN_ID', String(addresses.chainId));

  // Add config version timestamp to force frontend to reload from env
  // This invalidates any stale localStorage cache
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_CONFIG_VERSION', String(Date.now()));

  // Add all contract addresses for frontend discovery
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_STAKING_ADDRESS', addresses.staking);
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_ESTIMATOR_ADDRESS', addresses.estimator);
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_NAMESERVICE_ADDRESS', addresses.nameService);
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_TREASURY_ADDRESS', addresses.treasury);
  if (addresses.p2pSwap) {
    envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_P2PSWAP_ADDRESS', addresses.p2pSwap);
  }

  writeFileSync(envPath, envContent);
}

/**
 * Update environment variable in content
 */
function updateEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content.trim() + `\n${key}=${value}\n`;
  }
}


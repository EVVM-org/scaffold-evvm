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
import { ensureContractSources, checkContractSources, displayContractSourcesStatus, pullLatest, initSubmodules as initContractSubmodules } from '../utils/contractSources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const PROJECT_ROOT = join(__dirname, '..', '..');
const TESTNET_PATH = resolve(PROJECT_ROOT, '..', 'Testnet-Contracts');
const PLAYGROUND_PATH = resolve(PROJECT_ROOT, '..', 'Playground-Contracts');
const DEPLOYMENTS_DIR = join(PROJECT_ROOT, 'deployments');

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

// Explorer URLs
const EXPLORER_ADDRESS_URLS: Record<string, string> = {
  'eth-sepolia': 'https://sepolia.etherscan.io/address/',
  'arb-sepolia': 'https://sepolia.arbiscan.io/address/',
  'localhost': ''
};

const EXPLORER_TX_URLS: Record<string, string> = {
  'eth-sepolia': 'https://sepolia.etherscan.io/tx/',
  'arb-sepolia': 'https://sepolia.arbiscan.io/tx/',
  'localhost': ''
};

interface FullStartConfig {
  framework: 'foundry' | 'hardhat';
  contractSource: 'testnet' | 'playground';
  network: 'localhost' | 'eth-sepolia' | 'arb-sepolia';
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

  // Check contract sources status (fetches from remote to check for updates)
  info('Checking contract source repositories...');
  const sourcesStatus = await checkContractSources(PROJECT_ROOT);

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
      const sourcesReady = await ensureContractSources(PROJECT_ROOT, 'both');
      if (!sourcesReady) {
        error('Failed to clone repositories. Please try manually.');
        return;
      }
      // Re-check status after cloning
      const newStatus = await checkContractSources(PROJECT_ROOT);
      if (!newStatus.testnet.exists && !newStatus.playground.exists) {
        error('Still no contract sources found after cloning.');
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
          description: 'Exit setup'
        }
      ]
    });

    if (updateResponse.action === 'cancel' || !updateResponse.action) {
      error('Setup cancelled.');
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

  // Re-check after any updates
  const finalStatus = await checkContractSources(PROJECT_ROOT);
  const finalHasTestnet = finalStatus.testnet.exists;
  const finalHasPlayground = finalStatus.playground.exists;

  // Build source choices based on available repos
  const sourceChoices = [];
  if (finalHasTestnet) {
    const suffix = finalStatus.testnet.localCommit ? ` (${finalStatus.testnet.localCommit})` : '';
    sourceChoices.push({
      title: `Testnet Contracts${suffix}`,
      value: 'testnet',
      description: 'Production-ready for testnet deployment'
    });
  }
  if (finalHasPlayground) {
    const suffix = finalStatus.playground.localCommit ? ` (${finalStatus.playground.localCommit})` : '';
    sourceChoices.push({
      title: `Playground Contracts${suffix}`,
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

  // Step 3: Network Selection
  sectionHeader('Step 3: Network Selection');

  const networkResponse = await prompts({
    type: 'select',
    name: 'network',
    message: 'Select deployment network:',
    choices: [
      {
        title: 'Local (Anvil/Hardhat)',
        value: 'localhost',
        description: 'Start local chain and deploy (fastest for development)'
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
      }
    ]
  });

  if (!networkResponse.network) {
    error('Setup cancelled.');
    return;
  }

  // Step 4: EVVM Configuration
  sectionHeader('Step 4: EVVM Configuration');

  info('Configure admin addresses for your EVVM instance.\n');

  // For local deployment, offer to use default test addresses
  let addresses: FullStartConfig['addresses'];

  if (networkResponse.network === 'localhost') {
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
      success('Using Anvil default test addresses');
    } else {
      addresses = await promptAddresses();
    }
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

    if (networkResponse.network === 'localhost') {
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
    } else {
      // For testnets, always use keystore
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
    network: networkResponse.network,
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
  divider();
  console.log(chalk.cyan('                    SETUP SUMMARY'));
  divider();

  console.log(chalk.yellow('Framework:    ') + chalk.green(config.framework.toUpperCase()));
  console.log(chalk.yellow('Contracts:    ') + chalk.green(config.contractSource === 'testnet' ? 'Testnet-Contracts' : 'Playground-Contracts'));
  console.log(chalk.yellow('Network:      ') + chalk.green(config.network));
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
  if (config.network === 'localhost') {
    console.log(chalk.gray('  4. Start local chain (Anvil/Hardhat)'));
  }
  console.log(chalk.gray(`  ${config.network === 'localhost' ? '5' : '4'}. Deploy contracts`));
  console.log(chalk.gray(`  ${config.network === 'localhost' ? '6' : '5'}. Update frontend .env`));
  console.log(chalk.gray(`  ${config.network === 'localhost' ? '7' : '6'}. Start frontend development server`));

  divider();
}

/**
 * Execute the full setup process
 */
async function executeFullSetup(config: FullStartConfig): Promise<void> {
  let chainProcess: ExecaChildProcess | null = null;

  try {
    // Step 1: Sync contracts
    sectionHeader('Syncing Contracts');

    const sourcePath = config.contractSource === 'testnet' ? TESTNET_PATH : PLAYGROUND_PATH;
    await syncContractsFromSource(sourcePath, config.framework);
    success('Contracts synced');

    // Step 2: Write configuration files
    sectionHeader('Writing Configuration');

    await writeConfigFiles(config);
    success('Configuration files written');

    // Step 3: Install dependencies and compile
    sectionHeader('Compiling Contracts');

    if (config.framework === 'foundry') {
      const foundryDir = join(PROJECT_ROOT, 'packages', 'foundry');

      // Initialize submodules if needed
      if (!existsSync(join(foundryDir, 'lib', 'forge-std'))) {
        info('Installing Foundry dependencies...');
        await execa('forge', ['install', 'foundry-rs/forge-std', '--no-commit'], {
          cwd: foundryDir,
          stdio: 'inherit'
        });
      }

      info('Compiling with Forge...');
      await execa('forge', ['build', '--via-ir'], {
        cwd: foundryDir,
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

    // Step 4: Start local chain (if localhost)
    if (config.network === 'localhost') {
      sectionHeader('Starting Local Chain');

      if (config.framework === 'foundry') {
        info('Starting Anvil...');
        chainProcess = execa('anvil', ['--block-time', '10'], {
          stdio: 'pipe'
        });

        // Wait for chain to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        success('Anvil running on http://localhost:8545');
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
    }

    // Step 5: Deploy contracts
    sectionHeader('Deploying Contracts');

    const deployedAddresses = await deployContracts(config);

    if (deployedAddresses) {
      success('Contracts deployed!');

      // Display comprehensive deployment summary
      displayDeploymentSummary(deployedAddresses, config.network);

      // For localhost, save deployment summary immediately (no registry)
      let registeredEvvmId: string | undefined;
      if (config.network === 'localhost') {
        await saveDeploymentSummary(deployedAddresses, config.network);
      } else {
        // Offer EVVM Registry registration for testnet deployments
        const explorerUrl = EXPLORER_ADDRESS_URLS[config.network] || null;
        registeredEvvmId = await offerEvvmRegistration(deployedAddresses, config, explorerUrl);
      }

      // Step 6: Update frontend .env
      sectionHeader('Updating Frontend Configuration');

      await updateFrontendEnv(deployedAddresses, config.network, registeredEvvmId);
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

      if (config.network === 'localhost') {
        console.log(chalk.yellow('Note: Keep this terminal open to maintain the local chain.'));
        console.log(chalk.gray('Press Ctrl+C to stop everything.\n'));
      }

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

  // Generate Inputs.sol (new format used by Testnet-Contracts)
  const inputsSol = generateInputsSol(config);
  writeFileSync(join(inputDir, 'Inputs.sol'), inputsSol);

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
      network: config.network,
      initialized: true,
      timestamp: new Date().toISOString()
    }, null, 2)
  );
}

/**
 * Generate Inputs.sol content from configuration
 */
function generateInputsSol(config: FullStartConfig): string {
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
 * Deploy contracts
 */
async function deployContracts(config: FullStartConfig): Promise<DeployedAddresses | null> {
  const packageDir = join(PROJECT_ROOT, 'packages', config.framework);

  if (config.framework === 'foundry') {
    // Clean stale artifacts first
    info('Cleaning stale artifacts...');
    await execa('forge', ['clean'], { cwd: packageDir, stdio: 'pipe' }).catch(() => {});

    // Use forge script for deployment
    const rpcUrl = config.network === 'localhost' ? 'http://localhost:8545'
      : config.network === 'eth-sepolia' ? (process.env.RPC_URL_ETH_SEPOLIA || 'https://1rpc.io/sepolia')
      : (process.env.RPC_URL_ARB_SEPOLIA || 'https://sepolia-rollup.arbitrum.io/rpc');

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
    if (config.network === 'localhost' && config.useDefaultAnvilKey) {
      args.push('--private-key', DEFAULT_ANVIL_KEY);
    } else if (config.wallet) {
      args.push('--account', config.wallet);
    }

    // Add verification for testnet deployments
    if (config.network !== 'localhost') {
      const etherscanKey = process.env.ETHERSCAN_API;
      if (etherscanKey) {
        args.push('--verify', '--etherscan-api-key', etherscanKey);
        info('Contract verification enabled');
      } else {
        warning('ETHERSCAN_API not set - contracts will not be verified');
        dim('Add ETHERSCAN_API to your .env file for automatic verification');
      }
    }

    try {
      await execa('forge', args, {
        cwd: packageDir,
        stdio: 'inherit'
      });

      // Parse deployment artifacts
      return parseFoundryArtifacts(packageDir, config.network);
    } catch (err) {
      error('Deployment failed');
      return null;
    }
  } else {
    // Hardhat deployment
    const networkName = config.network === 'localhost' ? 'localhost'
      : config.network === 'eth-sepolia' ? 'sepolia'
      : 'arbitrumSepolia';

    try {
      await execa('npx', ['hardhat', 'deploy', '--network', networkName], {
        cwd: packageDir,
        stdio: 'inherit'
      });

      return parseHardhatArtifacts(packageDir, networkName);
    } catch {
      error('Deployment failed');
      return null;
    }
  }
}

/**
 * Parse Foundry deployment artifacts
 */
function parseFoundryArtifacts(packageDir: string, network: string): DeployedAddresses | null {
  const chainId = network === 'localhost' ? 31337
    : network === 'eth-sepolia' ? 11155111
    : 421614;

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
 * Parse Hardhat deployment artifacts
 */
function parseHardhatArtifacts(packageDir: string, network: string): DeployedAddresses | null {
  const deploymentsDir = join(packageDir, 'deployments', network);

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

  const chainId = network === 'localhost' ? 31337
    : network === 'sepolia' ? 11155111
    : 421614;

  return {
    evvm: readDeployment('Evvm'),
    staking: readDeployment('Staking'),
    estimator: readDeployment('Estimator'),
    nameService: readDeployment('NameService'),
    treasury: readDeployment('Treasury'),
    p2pSwap: readDeployment('P2PSwap'),
    chainId
  };
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
 * Save deployment summary to JSON file
 */
async function saveDeploymentSummary(
  addresses: DeployedAddresses,
  network: string,
  evvmId?: string
): Promise<void> {
  // Create deployments directory if it doesn't exist
  if (!existsSync(DEPLOYMENTS_DIR)) {
    mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }

  const networkName = network === 'eth-sepolia' ? 'Ethereum Sepolia'
    : network === 'arb-sepolia' ? 'Arbitrum Sepolia'
    : network === 'localhost' ? 'Local Chain'
    : 'Unknown';

  const summary = {
    network: {
      name: networkName,
      chainId: addresses.chainId,
      network: network
    },
    evvm: {
      id: evvmId ? parseInt(evvmId) : null,
      address: addresses.evvm,
      explorer: EXPLORER_ADDRESS_URLS[network] ? `${EXPLORER_ADDRESS_URLS[network]}${addresses.evvm}` : null
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
  const filename = `deployment-${network}-${addresses.chainId}.json`;
  const filepath = join(DEPLOYMENTS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(summary, null, 2));

  // Also save as latest
  const latestPath = join(DEPLOYMENTS_DIR, 'latest.json');
  writeFileSync(latestPath, JSON.stringify(summary, null, 2));

  info(`Deployment summary saved to ${filename}`);
}

/**
 * Display comprehensive deployment summary (like Testnet-Contracts)
 */
function displayDeploymentSummary(addresses: DeployedAddresses, network: string, evvmId?: string): void {
  const networkName = network === 'eth-sepolia' ? 'Ethereum Sepolia'
    : network === 'arb-sepolia' ? 'Arbitrum Sepolia'
    : network === 'localhost' ? 'Local Chain'
    : 'Unknown';

  const explorerBase = EXPLORER_ADDRESS_URLS[network] || '';

  console.log(evvmGreen('\n═══════════════════════════════════════════════════════════'));
  console.log(evvmGreen('                 DEPLOYED CONTRACTS SUMMARY'));
  console.log(evvmGreen('═══════════════════════════════════════════════════════════\n'));

  console.log(chalk.white(`Network: ${chalk.green(networkName)} (Chain ID: ${addresses.chainId})\n`));

  if (evvmId) {
    console.log(chalk.yellow('EVVM Instance:'));
    console.log(chalk.white(`  EVVM ID:     ${chalk.green(evvmId)}`));
    console.log('');
  }

  console.log(chalk.yellow('Core Contracts:'));
  console.log(chalk.white(`  EVVM:        ${chalk.green(addresses.evvm)}`));
  if (explorerBase) console.log(chalk.gray(`               ${explorerBase}${addresses.evvm}`));
  console.log(chalk.white(`  Treasury:    ${chalk.green(addresses.treasury)}`));
  if (explorerBase) console.log(chalk.gray(`               ${explorerBase}${addresses.treasury}`));
  console.log('');

  console.log(chalk.yellow('Supporting Contracts:'));
  console.log(chalk.white(`  Staking:     ${chalk.green(addresses.staking)}`));
  if (explorerBase) console.log(chalk.gray(`               ${explorerBase}${addresses.staking}`));
  console.log(chalk.white(`  Estimator:   ${chalk.green(addresses.estimator)}`));
  if (explorerBase) console.log(chalk.gray(`               ${explorerBase}${addresses.estimator}`));
  console.log(chalk.white(`  NameService: ${chalk.green(addresses.nameService)}`));
  if (explorerBase) console.log(chalk.gray(`               ${explorerBase}${addresses.nameService}`));
  if (addresses.p2pSwap) {
    console.log(chalk.white(`  P2PSwap:     ${chalk.green(addresses.p2pSwap)}`));
    if (explorerBase) console.log(chalk.gray(`               ${explorerBase}${addresses.p2pSwap}`));
  }

  console.log(evvmGreen('\n═══════════════════════════════════════════════════════════\n'));
}

/**
 * Update frontend .env with deployed addresses
 */
async function updateFrontendEnv(addresses: DeployedAddresses, network: string, evvmId?: string): Promise<void> {
  const envPath = join(PROJECT_ROOT, '.env');

  let envContent = '';

  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
  }

  // Update or add EVVM address
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_EVVM_ADDRESS', addresses.evvm);
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_CHAIN_ID', String(addresses.chainId));

  // Add EVVM ID if provided
  if (evvmId) {
    envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_EVVM_ID', evvmId);
  }

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

// EVVM Registry constants
const REGISTRY_ADDRESS = '0x389dC8fb09211bbDA841D59f4a51160dA2377832';
const REGISTRY_CHAIN = 'eth-sepolia';

/**
 * Offer EVVM Registry registration after testnet deployment
 * Returns the EVVM ID if registration succeeds, undefined otherwise
 */
async function offerEvvmRegistration(
  addresses: DeployedAddresses,
  config: FullStartConfig,
  explorerUrl: string | null
): Promise<string | undefined> {
  divider();
  console.log(chalk.cyan('                 EVVM REGISTRY REGISTRATION'));
  divider();

  info('Register your EVVM with the global registry to receive an official EVVM ID.');
  console.log('');
  dim('The EVVM Registry is deployed on Ethereum Sepolia.');
  dim(`Registry: ${REGISTRY_ADDRESS}`);
  console.log('');

  warning('Note: Registration requires ETH Sepolia for gas fees.');
  if (config.network !== 'eth-sepolia') {
    warning(`Your EVVM is deployed on ${config.network}, but registration always happens on Ethereum Sepolia.`);
  }
  console.log('');

  const registerResponse = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Register your EVVM with the registry now?',
    initial: true
  });

  if (!registerResponse.value) {
    info('Skipping registration. You can register later using:');
    dim('  npm run cli registry');
    console.log('');
    dim('Or register manually at https://www.evvm.info/registry');
    return undefined;
  }

  // Check if we have Sepolia RPC
  const sepoliaRpc = process.env.RPC_URL_ETH_SEPOLIA || 'https://1rpc.io/sepolia';

  // Registration process
  sectionHeader('Registering with EVVM Registry');

  info('Registration requires 2 transactions:');
  console.log(chalk.gray('  1. Call registerEvvm() on Registry contract'));
  console.log(chalk.gray('  2. Call setEvvmID() on your EVVM contract'));
  console.log('');

  try {
    // Step 1: Register with Registry using cast
    info('Step 1: Registering with EVVM Registry...');

    if (!config.wallet) {
      error('No wallet available for registration.');
      dim('Import a wallet: cast wallet import deployer --interactive');
      return undefined;
    }

    // Use cast to call registerEvvm(chainId, evvmAddress)
    const registerArgs = [
      'send',
      REGISTRY_ADDRESS,
      'registerEvvm(uint256,address)',
      String(addresses.chainId),
      addresses.evvm,
      '--rpc-url', sepoliaRpc,
      '--account', config.wallet
    ];

    console.log(chalk.gray(`Calling registerEvvm(${addresses.chainId}, ${addresses.evvm})...`));

    const registerResult = await execa('cast', registerArgs, {
      stdio: 'inherit'
    }).catch((err) => {
      error(`Registry registration failed: ${err.message}`);
      return null;
    });

    if (!registerResult) {
      info('You can register manually at https://www.evvm.info/registry');
      return undefined;
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
      return undefined;
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
        if (output.toLowerCase().includes(addresses.evvm.toLowerCase()) &&
            output.includes(String(addresses.chainId))) {
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
      return undefined;
    }
    success(`Assigned EVVM ID: ${chalk.green(evvmId)}`);

    // Step 3: Set the EVVM ID on the deployed contract
    info('Step 2: Setting EVVM ID on your contract...');

    // Determine RPC for the deployed chain
    const deployedRpc = config.network === 'eth-sepolia' ? sepoliaRpc
      : config.network === 'arb-sepolia' ? (process.env.RPC_URL_ARB_SEPOLIA || 'https://sepolia-rollup.arbitrum.io/rpc')
      : 'http://localhost:8545';

    const setIdArgs = [
      'send',
      addresses.evvm,
      'setEvvmID(uint256)',
      evvmId,
      '--rpc-url', deployedRpc,
      '--account', config.wallet
    ];

    console.log(chalk.gray(`Calling setEvvmID(${evvmId}) on EVVM contract...`));

    const setIdResult = await execa('cast', setIdArgs, {
      stdio: 'inherit'
    }).catch((err) => {
      error(`Failed to set EVVM ID: ${err.message}`);
      info(`You can set it manually: cast send ${addresses.evvm} "setEvvmID(uint256)" ${evvmId}`);
      return null;
    });

    if (setIdResult) {
      success('EVVM ID set successfully!');

      // Update .env with EVVM ID and config version to invalidate frontend cache
      const envPath = join(PROJECT_ROOT, '.env');
      let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
      envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_EVVM_ID', evvmId);
      envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_CONFIG_VERSION', String(Date.now()));
      writeFileSync(envPath, envContent);

      // Save deployment summary
      await saveDeploymentSummary(addresses, config.network, evvmId);

      divider();
      console.log(chalk.green('Registration Complete!'));
      console.log('');
      console.log(chalk.yellow('Your EVVM Details:'));
      console.log(`  EVVM ID:      ${chalk.green(evvmId)}`);
      console.log(`  EVVM Address: ${chalk.green(addresses.evvm)}`);
      console.log(`  Chain ID:     ${chalk.green(addresses.chainId)}`);
      if (explorerUrl) {
        console.log(`  Explorer:     ${chalk.gray(explorerUrl + addresses.evvm)}`);
      }
      divider();

      return evvmId;
    }

    // setEvvmID failed but registration succeeded
    return evvmId;
  } catch (err: any) {
    error(`Registration failed: ${err.message}`);
    info('You can register manually at https://www.evvm.info/registry');
    return undefined;
  }
}

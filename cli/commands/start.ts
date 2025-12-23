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
  useDefaultHardhatKey?: boolean;
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

  // Define hasTestnet and hasPlayground at the top of the function
  let hasTestnet: boolean;
  let hasPlayground: boolean;

  // Check bundled contract sources
  info('Checking bundled EVVM contracts...');
  hasTestnet = existsSync(join(FOUNDRY_DIR, 'testnet-contracts', 'contracts'));
  hasPlayground = existsSync(join(FOUNDRY_DIR, 'playground-contracts', 'contracts'));

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
      title: 'Testnet Contracts',
      value: 'testnet',
      description: 'Production-ready for local deployment'
    });
  }
  if (hasPlayground) {
    sourceChoices.push({
      title: 'Playground Contracts',
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

  info('Configure admin addresses for your EVVM instance.');
  info('These are the addresses that will control your EVVM deployment.\n');

  // Always prompt for addresses - no defaults
  const addresses = await promptAddresses();

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
  let useDefaultHardhatKey = false;

  sectionHeader('Step 5: Wallet Selection');

  if (frameworkResponse.framework === 'foundry') {
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
    // Hardhat wallet selection
    const walletChoice = await prompts({
      type: 'select',
      name: 'choice',
      message: 'Select wallet for local deployment:',
      choices: [
        {
          title: 'Default Hardhat Account',
          value: 'hardhat-default',
          description: 'Use Hardhat\'s pre-funded test account (0xf39F...)'
        },
        {
          title: 'Private Key from .env',
          value: 'env',
          description: 'Use DEPLOYER_PRIVATE_KEY from .env file'
        }
      ]
    });

    if (!walletChoice.choice) {
      error('Setup cancelled.');
      return;
    }

    if (walletChoice.choice === 'hardhat-default') {
      useDefaultHardhatKey = true;
      wallet = 'hardhat-default';
      info('Using default Hardhat account for local deployment');
    } else {
      // Check for private key in .env
      const envPath = join(PROJECT_ROOT, '.env');
      let hasKey = false;
      if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        const keyMatch = envContent.match(/^DEPLOYER_PRIVATE_KEY=(.+)$/m);
        hasKey = Boolean(keyMatch && keyMatch[1] && keyMatch[1].length > 10);
      }

      if (!hasKey) {
        warning('DEPLOYER_PRIVATE_KEY not set in .env file.');
        info('Falling back to default Hardhat account.');
        useDefaultHardhatKey = true;
        wallet = 'hardhat-default';
      } else {
        wallet = 'env';
        success('Using private key from .env');
      }
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
    useDefaultAnvilKey,
    useDefaultHardhatKey
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

  // Display deployer/wallet info
  if (config.framework === 'foundry') {
    if (config.useDefaultAnvilKey) {
      console.log(chalk.yellow('Deployer:     ') + chalk.green('Default Anvil Account #0'));
      console.log(chalk.yellow('Address:      ') + chalk.gray('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));
    } else if (config.wallet) {
      console.log(chalk.yellow('Deployer:     ') + chalk.green(`Keystore: ${config.wallet}`));
    }
  } else {
    if (config.useDefaultHardhatKey) {
      console.log(chalk.yellow('Deployer:     ') + chalk.green('Default Hardhat Account #0'));
      console.log(chalk.yellow('Address:      ') + chalk.gray('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'));
    } else if (config.wallet === 'env') {
      console.log(chalk.yellow('Deployer:     ') + chalk.green('Private Key from .env'));
    }
  }
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
      // For Hardhat, we use a hybrid approach:
      // 1. Compile with Foundry (handles complex import remappings)
      // 2. Deploy with ts-node script (reads Foundry artifacts)
      // This avoids source name conflicts with self-referential imports
      const hardhatDir = join(PROJECT_ROOT, 'packages', 'hardhat');
      info('Installing npm dependencies...');
      await execa('npm', ['install'], { cwd: hardhatDir, stdio: 'inherit' });
      info('Compiling with Foundry (handles complex imports)...');
      await execa('forge', ['build'], {
        cwd: FOUNDRY_DIR,
        stdio: 'inherit'
      });
    }

    success('Contracts compiled');

    // Step 3: Clone and setup contract source repositories
    sectionHeader('Cloning Contract Repositories');

    // Check and clone missing repositories
    const playgroundPath = join(PROJECT_ROOT, 'packages', 'Playground-Contracts');
    const testnetPath = join(PROJECT_ROOT, 'packages', 'Testnet-Contracts');

    if (!existsSync(playgroundPath)) {
      info('Playground-Contracts not found. Cloning repository...');
      await execa('git', ['clone', '--recursive', 'https://github.com/EVVM-org/Playground-Contracts', playgroundPath], { stdio: 'inherit' });
      info('Installing dependencies for Playground-Contracts...');
      await execa('npm', ['install'], { cwd: playgroundPath, stdio: 'inherit' });
    } else {
      info('Playground-Contracts already exists. Skipping clone.');
    }

    if (!existsSync(testnetPath)) {
      info('Testnet-Contracts not found. Cloning repository...');
      await execa('git', ['clone', '--recursive', 'https://github.com/EVVM-org/Testnet-Contracts', testnetPath], { stdio: 'inherit' });
      info('Installing dependencies for Testnet-Contracts...');
      await execa('npm', ['install'], { cwd: testnetPath, stdio: 'inherit' });
    } else {
      info('Testnet-Contracts already exists. Skipping clone.');
    }

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
        info(`Using keystore wallet: ${chalk.cyan(config.wallet)}`);
        info(chalk.yellow('You will be prompted to enter your wallet password.'));
        console.log('');

        const fundResult = await fundWalletFromAnvil(config.wallet);
        if (!fundResult.success) {
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
                description: 'Proceed anyway (you can fund manually later)'
              },
              {
                title: 'Cancel',
                value: 'cancel',
                description: 'Exit setup'
              }
            ]
          });

          if (fundingChoice.action === 'cancel' || !fundingChoice.action) {
            error('Setup cancelled.');
            if (chainProcess) chainProcess.kill();
            return;
          }

          if (fundingChoice.action === 'default') {
            config.useDefaultAnvilKey = true;
            config.wallet = undefined;
            info('Switched to default Anvil account for deployment');
          } else {
            // User wants to continue with keystore - try to get address and fund it
            info('Retrying wallet funding...');
            info(chalk.yellow('Please enter your wallet password correctly:'));
            console.log('');

            // Try again to get wallet address and fund it
            const retryResult = await fundWalletFromAnvil(config.wallet!);
            if (!retryResult.success) {
              // Still failed - offer to switch to default or fund manually
              warning('Funding still failed. The wallet needs ETH to deploy.');

              const finalChoice = await prompts({
                type: 'select',
                name: 'action',
                message: 'Deployment requires ETH. What would you like to do?',
                choices: [
                  {
                    title: 'Use default Anvil account (recommended)',
                    value: 'default',
                    description: 'Deploy using the pre-funded Anvil test account'
                  },
                  {
                    title: 'Cancel and fund manually',
                    value: 'cancel',
                    description: 'Exit and fund the wallet yourself'
                  }
                ]
              });

              if (finalChoice.action === 'cancel' || !finalChoice.action) {
                info('To fund your wallet manually, run:');
                console.log(chalk.gray(`  cast send ${retryResult.address || '<wallet-address>'} --value 100ether --private-key ${DEFAULT_ANVIL_KEY} --rpc-url ${LOCAL_RPC_URL}`));
                info('Then run: npm run start:full');
                if (chainProcess) chainProcess.kill();
                return;
              }

              // Switch to default Anvil account
              config.useDefaultAnvilKey = true;
              config.wallet = undefined;
              info('Switched to default Anvil account for deployment');
            } else {
              success('Wallet funded successfully on retry');
            }
          }
        } else {
          success('Wallet funded successfully');
          info(chalk.yellow('\nNote: You will be prompted for your password again during deployment.'));
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

    // Display deployer info
    if (config.framework === 'foundry') {
      if (config.wallet && !config.useDefaultAnvilKey) {
        try {
          const addressResult = await execa('cast', ['wallet', 'address', '--account', config.wallet], {
            stdio: 'pipe'
          });
          const deployerAddress = addressResult.stdout.trim();
          info(`Deployer wallet: ${chalk.cyan(config.wallet)}`);
          info(`Deployer address: ${chalk.green(deployerAddress)}`);
        } catch {
          info(`Deployer wallet: ${chalk.cyan(config.wallet)}`);
        }
      } else if (config.useDefaultAnvilKey) {
        info(`Deployer: ${chalk.cyan('Default Anvil Account #0')}`);
        info(`Address: ${chalk.green('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')}`);
      }
    } else {
      // Hardhat deployer info
      if (config.useDefaultHardhatKey) {
        info(`Deployer: ${chalk.cyan('Default Hardhat Account #0')}`);
        info(`Address: ${chalk.green('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')}`);
      } else if (config.wallet === 'env') {
        // Try to get address from DEPLOYER_PRIVATE_KEY
        try {
          const envPath = join(PROJECT_ROOT, '.env');
          if (existsSync(envPath)) {
            const envContent = readFileSync(envPath, 'utf-8');
            const keyMatch = envContent.match(/^DEPLOYER_PRIVATE_KEY=(.+)$/m);
            if (keyMatch && keyMatch[1]) {
              const privateKey = keyMatch[1].trim();
              const addressResult = await execa('cast', ['wallet', 'address', privateKey], {
                stdio: 'pipe'
              });
              const deployerAddress = addressResult.stdout.trim();
              info(`Deployer: ${chalk.cyan('Private Key from .env')}`);
              info(`Address: ${chalk.green(deployerAddress)}`);
            }
          }
        } catch {
          info(`Deployer: ${chalk.cyan('Private Key from .env')}`);
        }
      }
    }
    console.log('');

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

      // Wait a moment for the filesystem to sync the .env changes
      // This ensures Next.js reads the fresh environment variables
      info('Waiting for configuration to be written...');
      await new Promise(resolve => setTimeout(resolve, 1000));

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
    ? 'packages/Playground-Contracts/input/BaseInputs.sol'
    : 'packages/Testnet-Contracts/input/Inputs.sol';

  return `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import {EvvmStructs} from "${importPath}";

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
}`;
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
    // Use inherit for stdin to allow password input, pipe stdout to capture address
    const addressResult = await execa('cast', ['wallet', 'address', '--account', walletName], {
      stdio: ['inherit', 'pipe', 'inherit']
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
    const scriptDir = config.contractSource === 'playground'
      ? join(PROJECT_ROOT, 'packages', 'Playground-Contracts')
      : join(PROJECT_ROOT, 'packages', 'Testnet-Contracts');
    
    const scriptFile = 'script/Deploy.s.sol:DeployScript';

    console.log(`Deploying with Forge script... ${scriptFile}`);
    const args = [
      'script',
      scriptFile,
      '--rpc-url', 
      LOCAL_RPC_URL,
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
        cwd: scriptDir,
        stdio: 'inherit'
      });

      // Parse deployment artifacts from the script directory
      return parseFoundryArtifacts(scriptDir);
    } catch (err) {
      error('Deployment failed');
      return null;
    }
  } else {
    // Hardhat uses hybrid approach: Foundry compile + ts-node deploy script
    // The ts-node script reads Foundry artifacts from packages/foundry/out/
    const packageDir = join(PROJECT_ROOT, 'packages', 'hardhat');

    try {
      info('Deploying with ts-node script (using Foundry artifacts)...');
      await execa('npx', ['ts-node', 'scripts/deploy.ts', '--network', 'localhost'], {
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
 * Reads from deployment-summary.json created by ts-node deploy script
 */
function parseHardhatArtifacts(packageDir: string): DeployedAddresses | null {
  const deploymentsDir = join(packageDir, 'deployments', 'localhost');
  const summaryPath = join(deploymentsDir, 'deployment-summary.json');

  // Try reading from deployment-summary.json first (created by ts-node script)
  if (existsSync(summaryPath)) {
    try {
      const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));
      return {
        evvm: summary.contracts.evvm,
        staking: summary.contracts.staking,
        estimator: summary.contracts.estimator,
        nameService: summary.contracts.nameService,
        treasury: summary.contracts.treasury,
        p2pSwap: summary.contracts.p2pSwap,
        chainId: summary.chainId || LOCAL_CHAIN_ID
      };
    } catch {
      warning('Failed to parse deployment-summary.json');
    }
  }

  // Fallback to hardhat-deploy format (individual contract JSON files)
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

  console.log(chalk.gray('Note: You need to import this private key into your wallet to give the accounts some local test ETH.'));
  console.log(chalk.gray(`      Private Key: ${DEFAULT_ANVIL_KEY}`));
  console.log(chalk.gray(`      RPC URL:     ${LOCAL_RPC_URL}\n`));
  
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

  // For local deployments, EVVM ID is always 0 (not registered with EVVM Registry)
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_EVVM_ID', '0');

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

  // Ensure RPC URL is configured for Anvil/Localhost
  envContent = updateEnvVar(envContent, 'NEXT_PUBLIC_RPC_URL_LOCALHOST', LOCAL_RPC_URL);

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


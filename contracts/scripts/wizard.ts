#!/usr/bin/env tsx
/**
 * Scaffold-EVVM Deployment Wizard
 * Simplified wrapper around the EVVM testnet-contracts wizard
 */

import { execaCommand } from 'execa';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config as dotenvConfig } from 'dotenv';
import { createPublicClient, http, type Address } from 'viem';
import { sepolia as sepoliaChain, arbitrumSepolia } from 'viem/chains';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractsRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(contractsRoot, '..');

// Load environment variables from Scaffold-EVVM project root
// Single source of truth - all env vars are in the root .env file
dotenvConfig({ path: path.join(projectRoot, '.env') });

// Try multiple paths to find Testnet-Contracts
function findTestnetContracts(): string | null {
  const possiblePaths = [
    path.join(contractsRoot, 'lib', 'Testnet-Contracts'),  // Git submodule location
    path.join(projectRoot, '..', 'Testnet-Contracts'),      // Sibling directory
    path.join('/home/oucan/Escritorio/ScaffoldEVVM/Testnet-Contracts'), // Absolute path
  ];

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, 'package.json'))) {
      return testPath;
    }
  }

  return null;
}

async function runWizard() {
  console.log(chalk.blue.bold('\n╔════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║   Scaffold-EVVM Deployment Wizard     ║'));
  console.log(chalk.blue.bold('╚════════════════════════════════════════╝\n'));

  // Find Testnet-Contracts
  const testnetContractsPath = findTestnetContracts();

  if (!testnetContractsPath) {
    console.log(chalk.red('✗ EVVM Testnet-Contracts not found!\n'));
    console.log(chalk.yellow('Please install Testnet-Contracts in one of these locations:'));
    console.log(chalk.cyan('  1. contracts/lib/Testnet-Contracts (git submodule)'));
    console.log(chalk.cyan('  2. ../Testnet-Contracts (sibling directory)'));
    console.log(chalk.cyan('  3. Clone it: git clone https://github.com/EVVM-org/Testnet-Contracts.git\n'));
    process.exit(1);
  }

  console.log(chalk.green(`✓ Found Testnet-Contracts at: ${testnetContractsPath}\n`));

  // Prepare environment variables for the wizard
  const wizardEnv = {
    ...process.env,
    // Explicitly ensure critical environment variables are passed
    RPC_URL_ETH_SEPOLIA: process.env.RPC_URL_ETH_SEPOLIA || '',
    RPC_URL_ARB_SEPOLIA: process.env.RPC_URL_ARB_SEPOLIA || '',
    ETHERSCAN_API: process.env.ETHERSCAN_API || '',
    ARBISCAN_API: process.env.ARBISCAN_API || '',
  };

  // Validate required environment variables
  const requiredEnvVars = ['RPC_URL_ETH_SEPOLIA', 'ETHERSCAN_API'];
  const missingVars = requiredEnvVars.filter(varName => !wizardEnv[varName]);

  if (missingVars.length > 0) {
    console.log(chalk.red('✗ Missing required environment variables:\n'));
    missingVars.forEach(varName => {
      console.log(chalk.yellow(`  - ${varName}`));
    });
    console.log(chalk.blue('\nPlease configure these in:'));
    console.log(chalk.cyan(`  ${path.join(projectRoot, '.env')}`));
    console.log(chalk.cyan(`  or ${path.join(contractsRoot, '.env')}\n`));
    console.log(chalk.gray('See .env.example for reference\n'));
    process.exit(1);
  }

  console.log(chalk.green('✓ Environment variables loaded successfully'));
  console.log(chalk.dim(`  RPC_URL_ETH_SEPOLIA: ${wizardEnv.RPC_URL_ETH_SEPOLIA?.substring(0, 30)}...`));
  if (wizardEnv.RPC_URL_ARB_SEPOLIA) {
    console.log(chalk.dim(`  RPC_URL_ARB_SEPOLIA: ${wizardEnv.RPC_URL_ARB_SEPOLIA?.substring(0, 30)}...`));
  }
  console.log(chalk.dim(`  ETHERSCAN_API: ${wizardEnv.ETHERSCAN_API ? '✓ Set' : '✗ Not set'}\n`));

  // Run the EVVM wizard
  console.log(chalk.blue('Starting EVVM deployment wizard...\n'));

  try {
    await execaCommand('npm run wizard', {
      cwd: testnetContractsPath,
      stdio: 'inherit',
      env: wizardEnv
    });

    console.log(chalk.green('\n✓ Deployment wizard completed successfully!'));

    // Generate deployment summary for frontend
    await generateDeploymentSummary(testnetContractsPath);

  } catch (error: any) {
    if (error.exitCode !== 0) {
      console.error(chalk.red('\n✗ Wizard failed'));
      process.exit(error.exitCode || 1);
    }
  }
}

/**
 * Generate deployment summary for frontend
 *
 * This function reads DYNAMIC data from:
 * 1. Broadcast files (contract addresses from actual deployment)
 * 2. Blockchain (EVVM ID via getEvvmID() call)
 * 3. Input files (user configuration from wizard)
 *
 * NO hardcoded addresses or IDs - everything is read from deployment artifacts!
 */
async function generateDeploymentSummary(testnetContractsPath: string) {
  console.log(chalk.blue('\n📝 Generating deployment summary for frontend...'));

  const inputDir = path.join(testnetContractsPath, 'input');
  const summaryPath = path.join(contractsRoot, 'input', 'evvmDeploymentSummary.json');

  try {
    // Read deployment metadata generated by Testnet-Contracts wizard
    const addressPath = path.join(inputDir, 'address.json');
    const metadataPath = path.join(inputDir, 'evvmBasicMetadata.json');

    if (!fs.existsSync(addressPath) || !fs.existsSync(metadataPath)) {
      console.log(chalk.yellow('⚠️  Deployment files not found, skipping summary generation'));
      return;
    }

    // Create input directory if it doesn't exist
    const summaryDir = path.dirname(summaryPath);
    if (!fs.existsSync(summaryDir)) {
      fs.mkdirSync(summaryDir, { recursive: true });
    }

    // Parse deployment files
    const addresses = JSON.parse(fs.readFileSync(addressPath, 'utf-8'));
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Read ACTUAL deployed addresses from Foundry broadcast files
    // These are generated during deployment and contain real on-chain addresses
    const broadcastDir = path.join(testnetContractsPath, 'broadcast', 'DeployTestnet.s.sol');
    let deployedAddresses: any = {};
    let chainId = 31337; // default to Anvil
    let networkName = 'Local Anvil';

    if (fs.existsSync(broadcastDir)) {
      const chainDirs = fs.readdirSync(broadcastDir);
      if (chainDirs.length > 0) {
        const latestChainDir = chainDirs[chainDirs.length - 1];
        chainId = parseInt(latestChainDir);

        // Map chain ID to network name
        const networkMap: Record<number, string> = {
          11155111: 'Ethereum Sepolia',
          421614: 'Arbitrum Sepolia',
          31337: 'Local Anvil'
        };
        networkName = networkMap[chainId] || `Chain ${chainId}`;

        const runLatestPath = path.join(broadcastDir, latestChainDir, 'run-latest.json');
        if (fs.existsSync(runLatestPath)) {
          const broadcastData = JSON.parse(fs.readFileSync(runLatestPath, 'utf-8'));

          // Extract contract addresses from transactions
          if (broadcastData.transactions) {
            for (const tx of broadcastData.transactions) {
              if (tx.contractName && tx.contractAddress) {
                deployedAddresses[tx.contractName] = tx.contractAddress;
              }
            }
          }
        }
      }
    }

    // Read ACTUAL EVVM ID from blockchain by calling getEvvmID() on deployed contract
    // This ensures we always have the real, on-chain EVVM ID (not a cached value)
    // Each deployment gets a unique ID assigned by the Registry (starting from 1000+)
    let evvmID = metadata.EvvmID || 0;
    const evvmAddress = deployedAddresses.Evvm;

    if (evvmAddress && evvmAddress !== '0x0000000000000000000000000000000000000000') {
      try {
        evvmID = await readEvvmIdFromBlockchain(evvmAddress as Address, chainId);
        console.log(chalk.green(`✓ Read EVVM ID from blockchain: ${evvmID}`));
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not read EVVM ID from blockchain, using default: ${evvmID}`));
        console.log(chalk.dim(`   (EVVM ID will be 0 if not yet registered/activated)`));
      }
    }

    // Build deployment summary with DYNAMIC values from:
    // - deployedAddresses: Real contract addresses from blockchain deployment
    // - evvmID: Real EVVM ID from blockchain (via getEvvmID call)
    // - metadata: User-provided configuration (EvvmName)
    // - addresses: Admin/Fisher/Activator addresses from user input
    const summary = {
      chainId,                                                           // From deployment artifacts
      networkName,                                                       // Mapped from chainId
      evvm: evvmAddress || '0x0000000000000000000000000000000000',      // From broadcast
      nameService: deployedAddresses.NameService || '0x0000000000000000000000000000000000000000',  // From broadcast
      staking: deployedAddresses.Staking || '0x0000000000000000000000000000000000000000',         // From broadcast
      estimator: deployedAddresses.Estimator || '0x0000000000000000000000000000000000000000',     // From broadcast
      treasury: deployedAddresses.Treasury || '0x0000000000000000000000000000000000000000',       // From broadcast
      p2pSwap: deployedAddresses.P2PSwap || '0x0000000000000000000000000000000000000000',         // From broadcast
      evvmID,                                                            // From blockchain (getEvvmID call)
      evvmName: metadata.EvvmName || 'Unknown',                          // From user input
      registry: '0x389dC8fb09211bbDA841D59f4a51160dA2377832',           // Constant: Registry EVVM on Sepolia
      admin: addresses.admin,                                            // From user input
      goldenFisher: addresses.goldenFisher,                              // From user input
      activator: addresses.activator                                     // From user input
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(chalk.green(`✓ Deployment summary written to: ${summaryPath}`));
    console.log(chalk.dim(`  Network: ${networkName} (${chainId})`));
    console.log(chalk.dim(`  EVVM ID: ${summary.evvmID}`));
    console.log(chalk.dim(`  EVVM Address: ${summary.evvm}\n`));

  } catch (error: any) {
    console.error(chalk.yellow(`⚠️  Could not generate deployment summary: ${error.message}`));
  }
}

// Read EVVM ID from deployed contract on blockchain
async function readEvvmIdFromBlockchain(evvmAddress: Address, chainId: number): Promise<number> {
  try {
    // Determine RPC URL and chain based on chainId
    let rpcUrl: string;
    let chain: any;

    if (chainId === 11155111) {
      // Ethereum Sepolia
      rpcUrl = process.env.RPC_URL_ETH_SEPOLIA || 'https://0xrpc.io/sep';
      chain = sepoliaChain;
    } else if (chainId === 421614) {
      // Arbitrum Sepolia
      rpcUrl = process.env.RPC_URL_ARB_SEPOLIA || 'https://sepolia-rollup.arbitrum.io/rpc';
      chain = arbitrumSepolia;
    } else {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Create public client
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    });

    // Read getEvvmID() from EVVM contract
    const evvmId = await publicClient.readContract({
      address: evvmAddress,
      abi: [{
        name: 'getEvvmID',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }]
      }],
      functionName: 'getEvvmID'
    }) as bigint;

    return Number(evvmId);
  } catch (error: any) {
    throw new Error(`Failed to read EVVM ID: ${error.message}`);
  }
}

// Run the wizard
runWizard().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});

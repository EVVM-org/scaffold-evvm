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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractsRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(contractsRoot, '..');

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

  // Run the EVVM wizard
  console.log(chalk.blue('Starting EVVM deployment wizard...\n'));

  try {
    await execaCommand('npm run wizard', {
      cwd: testnetContractsPath,
      stdio: 'inherit',
      env: { ...process.env }
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

async function generateDeploymentSummary(testnetContractsPath: string) {
  console.log(chalk.blue('\n📝 Generating deployment summary for frontend...'));

  const inputDir = path.join(testnetContractsPath, 'input');
  const summaryPath = path.join(contractsRoot, 'input', 'evvmDeploymentSummary.json');

  try {
    // Read deployment metadata
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

    // Find the latest broadcast file to get actual deployed addresses
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

    const summary = {
      chainId,
      networkName,
      evvm: deployedAddresses.Evvm || '0x0000000000000000000000000000000000000000',
      nameService: deployedAddresses.NameService || '0x0000000000000000000000000000000000000000',
      staking: deployedAddresses.Staking || '0x0000000000000000000000000000000000000000',
      estimator: deployedAddresses.Estimator || '0x0000000000000000000000000000000000000000',
      treasury: deployedAddresses.Treasury || '0x0000000000000000000000000000000000000000',
      p2pSwap: deployedAddresses.P2PSwap || '0x0000000000000000000000000000000000000000',
      evvmID: metadata.EvvmID || 0,
      evvmName: metadata.EvvmName || 'Unknown',
      registry: '0x389dC8fb09211bbDA841D59f4a51160dA2377832', // Registry EVVM on Sepolia
      admin: addresses.admin,
      goldenFisher: addresses.goldenFisher,
      activator: addresses.activator
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

// Run the wizard
runWizard().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});

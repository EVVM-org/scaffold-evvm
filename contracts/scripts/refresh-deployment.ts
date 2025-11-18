#!/usr/bin/env tsx
/**
 * Refresh Deployment Summary
 * Re-reads deployment data from blockchain and updates the summary file
 */

import { createPublicClient, http, type Address } from 'viem';
import { sepolia as sepoliaChain, arbitrumSepolia } from 'viem/chains';
import { config as dotenvConfig } from 'dotenv';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractsRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(contractsRoot, '..');

// Load environment variables from Scaffold-EVVM project root
// Single source of truth - all env vars are in the root .env file
dotenvConfig({ path: path.join(projectRoot, '.env') });

async function refreshDeployment() {
  console.log(chalk.blue('\n📝 Refreshing deployment summary from blockchain...\n'));

  const summaryPath = path.join(contractsRoot, 'input', 'evvmDeploymentSummary.json');

  if (!fs.existsSync(summaryPath)) {
    console.log(chalk.red('✗ Deployment summary not found'));
    console.log(chalk.yellow('Please run deployment wizard first: npm run wizard\n'));
    process.exit(1);
  }

  try {
    // Read current summary
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    console.log(chalk.gray(`Current EVVM ID: ${summary.evvmID}`));
    console.log(chalk.gray(`EVVM Address: ${summary.evvm}`));
    console.log(chalk.gray(`Chain ID: ${summary.chainId}\n`));

    // Read EVVM ID from blockchain
    const evvmId = await readEvvmIdFromBlockchain(
      summary.evvm as Address,
      summary.chainId
    );

    if (evvmId !== summary.evvmID) {
      console.log(chalk.yellow(`⚠️  EVVM ID mismatch detected!`));
      console.log(chalk.gray(`   Current summary: ${summary.evvmID}`));
      console.log(chalk.gray(`   Blockchain value: ${evvmId}\n`));

      // Update summary
      summary.evvmID = evvmId;
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      console.log(chalk.green(`✓ Deployment summary updated!`));
      console.log(chalk.green(`  New EVVM ID: ${evvmId}\n`));
    } else {
      console.log(chalk.green(`✓ Deployment summary is up to date!`));
      console.log(chalk.gray(`  EVVM ID: ${evvmId}\n`));
    }

  } catch (error: any) {
    console.error(chalk.red(`\n✗ Failed to refresh deployment: ${error.message}\n`));
    process.exit(1);
  }
}

async function readEvvmIdFromBlockchain(evvmAddress: Address, chainId: number): Promise<number> {
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
}

// Run
refreshDeployment().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});

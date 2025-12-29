/**
 * Blockchain Monitor Command
 *
 * Real-time monitoring of local blockchain (Anvil/Hardhat)
 * Shows blocks, transactions, and contract deployments in the terminal.
 *
 * Usage: npm run monitor
 */

import chalk from 'chalk';
import { createPublicClient, http, formatEther, type Block } from 'viem';
import { hardhat } from 'viem/chains';
import { evvmGreen, sectionHeader, info, success, error, divider } from '../utils/display.js';

const LOCAL_RPC_URL = 'http://127.0.0.1:8545';
const LOCAL_CHAIN_ID = 31337;

interface MonitorState {
  lastBlockNumber: bigint | null;
  blockCount: number;
  txCount: number;
  isRunning: boolean;
}

/**
 * Format timestamp for display
 */
function timestamp(): string {
  return chalk.gray(new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }));
}

/**
 * Format address (truncated)
 */
function formatAddress(address: string | null): string {
  if (!address) return chalk.magenta('Contract Creation');
  return chalk.cyan(address.slice(0, 10) + '...' + address.slice(-6));
}

/**
 * Format ETH value
 */
function formatValue(value: bigint): string {
  const eth = formatEther(value);
  const num = parseFloat(eth);
  if (num === 0) return chalk.gray('0 ETH');
  return chalk.yellow(num.toFixed(4) + ' ETH');
}

/**
 * Display the monitor header
 */
function displayHeader(): void {
  console.clear();
  console.log(evvmGreen(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              SCAFFOLD-EVVM BLOCKCHAIN MONITOR                 ║
║                                                               ║
║         Real-time monitoring of local blockchain              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));
  console.log(chalk.gray(`  RPC: ${LOCAL_RPC_URL}  |  Chain ID: ${LOCAL_CHAIN_ID}`));
  console.log(chalk.gray(`  Press Ctrl+C to exit\n`));
  divider();
}

/**
 * Display stats bar
 */
function displayStats(state: MonitorState): void {
  const status = state.isRunning
    ? evvmGreen('● MONITORING')
    : chalk.red('○ DISCONNECTED');

  console.log(
    `\n${status}  |  ` +
    chalk.white(`Blocks: ${evvmGreen(state.blockCount.toString())}`) +
    `  |  ` +
    chalk.white(`Transactions: ${evvmGreen(state.txCount.toString())}`) +
    `  |  ` +
    chalk.gray(`Last: #${state.lastBlockNumber?.toString() || '---'}`)
  );
  divider();
}

/**
 * Log a new block
 */
function logBlock(block: Block): void {
  const txCount = block.transactions?.length || 0;
  const gasUsed = block.gasUsed?.toString() || '0';

  console.log(
    `${timestamp()} ` +
    chalk.blue('BLOCK') +
    chalk.white(` #${block.number}`) +
    chalk.gray(` | ${txCount} tx | ${gasUsed} gas | `) +
    chalk.gray(block.hash?.slice(0, 18) + '...')
  );
}

/**
 * Log a transaction
 */
function logTransaction(tx: any, index: number): void {
  const isContractDeploy = !tx.to;
  const type = isContractDeploy ? chalk.magenta('DEPLOY') : evvmGreen('TX    ');

  console.log(
    `${timestamp()} ` +
    type +
    ` ${formatAddress(tx.from)}` +
    chalk.gray(' → ') +
    formatAddress(tx.to) +
    ` ${formatValue(tx.value)}`
  );

  // Show more details for contract deployments
  if (isContractDeploy) {
    console.log(
      chalk.gray(`           `) +
      chalk.gray(`Hash: ${tx.hash}`)
    );
  }
}

/**
 * Main monitor loop
 */
async function monitorLoop(state: MonitorState): Promise<void> {
  const client = createPublicClient({
    chain: { ...hardhat, id: LOCAL_CHAIN_ID },
    transport: http(LOCAL_RPC_URL),
  });

  while (true) {
    try {
      const currentBlockNumber = await client.getBlockNumber();

      if (state.lastBlockNumber === null) {
        // First connection
        state.lastBlockNumber = currentBlockNumber;
        state.isRunning = true;
        console.log(
          `${timestamp()} ` +
          chalk.green('CONNECTED') +
          chalk.gray(` to local blockchain at block #${currentBlockNumber}`)
        );
        continue;
      }

      // Check for new blocks
      if (currentBlockNumber > state.lastBlockNumber) {
        for (let i = state.lastBlockNumber + 1n; i <= currentBlockNumber; i++) {
          const block = await client.getBlock({
            blockNumber: i,
            includeTransactions: true
          });

          state.blockCount++;
          logBlock(block);

          // Log transactions in the block
          if (block.transactions && block.transactions.length > 0) {
            for (let j = 0; j < block.transactions.length; j++) {
              const tx = block.transactions[j];
              if (typeof tx === 'object') {
                state.txCount++;
                logTransaction(tx, j);
              }
            }
          }
        }
        state.lastBlockNumber = currentBlockNumber;
      }

      state.isRunning = true;
    } catch (err: any) {
      if (state.isRunning) {
        // Was connected, now disconnected
        console.log(
          `${timestamp()} ` +
          chalk.red('DISCONNECTED') +
          chalk.gray(' - waiting for blockchain...')
        );
        state.isRunning = false;
      }
    }

    // Poll every 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Main entry point
 */
export async function monitor(): Promise<void> {
  displayHeader();

  const state: MonitorState = {
    lastBlockNumber: null,
    blockCount: 0,
    txCount: 0,
    isRunning: false
  };

  console.log(
    `${timestamp()} ` +
    chalk.yellow('WAITING') +
    chalk.gray(' - connecting to local blockchain...')
  );
  console.log(chalk.gray(`           Make sure Anvil or Hardhat is running on ${LOCAL_RPC_URL}\n`));

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n');
    divider();
    console.log(chalk.yellow('\nMonitor stopped.'));
    displayStats(state);
    process.exit(0);
  });

  // Start monitoring
  await monitorLoop(state);
}

// Allow direct execution
if (process.argv[1]?.includes('monitor')) {
  monitor().catch(console.error);
}

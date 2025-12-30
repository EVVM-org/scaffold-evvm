/**
 * Blockchain Monitor Command
 *
 * Real-time monitoring of local blockchain (Anvil/Hardhat)
 * Shows blocks, transactions, and contract deployments in the terminal.
 *
 * Usage: npm run monitor
 */

import chalk from 'chalk';
import { createPublicClient, http, formatEther, formatGwei, type Block, type Transaction, decodeFunctionData, type Hex } from 'viem';
import { hardhat } from 'viem/chains';
import { evvmGreen, sectionHeader, info, success, error, divider } from '../utils/display.js';

const LOCAL_RPC_URL = 'http://127.0.0.1:8545';
const LOCAL_CHAIN_ID = 31337;

interface MonitorState {
  lastBlockNumber: bigint | null;
  blockCount: number;
  txCount: number;
  contractDeployments: number;
  isRunning: boolean;
}

// Common function signatures for decoding
const KNOWN_SIGNATURES: { [key: string]: string } = {
  // EVVM functions
  '0x': 'Native Transfer',
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0x70a08231': 'balanceOf(address)',
  '0x18160ddd': 'totalSupply()',
  '0xdd62ed3e': 'allowance(address,address)',
  // EVVM specific
  '0x0b5b1870': 'pay(...)',
  '0x7e0cd9d0': 'dispersePay(...)',
  '0x1e83409a': 'claim(address)',
  '0xa694fc3a': 'stake(uint256)',
  '0x2e1a7d4d': 'unstake(uint256)',
  '0x3a4b66f1': 'stakePublic(...)',
  // NameService
  '0x3121db1c': 'registerIdentity(...)',
  '0x47e7ef24': 'deposit(address,uint256)',
  '0x2e17de78': 'withdraw(uint256)',
  // Faucet
  '0x2e1a7d4d': 'withdraw(uint256)',
  '0xd0e30db0': 'deposit()',
};

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
function formatAddress(address: string | null, full: boolean = false): string {
  if (!address) return chalk.magenta('Contract Creation');
  if (full) return chalk.cyan(address);
  return chalk.cyan(address.slice(0, 10) + '...' + address.slice(-6));
}

/**
 * Get function name from calldata
 */
function getFunctionName(data: string | undefined): string {
  if (!data || data === '0x' || data.length < 10) {
    return chalk.gray('Native Transfer');
  }
  const selector = data.slice(0, 10).toLowerCase();
  const known = KNOWN_SIGNATURES[selector];
  if (known) {
    return chalk.yellow(known);
  }
  return chalk.gray(`fn:${selector}`);
}

/**
 * Format gas info
 */
function formatGas(gas: bigint, gasPrice?: bigint): string {
  const gasStr = gas.toLocaleString();
  if (gasPrice) {
    const gweiPrice = formatGwei(gasPrice);
    return chalk.gray(`${gasStr} gas @ ${gweiPrice} gwei`);
  }
  return chalk.gray(`${gasStr} gas`);
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
    chalk.white(`TXs: ${evvmGreen(state.txCount.toString())}`) +
    `  |  ` +
    chalk.white(`Deploys: ${chalk.magenta(state.contractDeployments.toString())}`) +
    `  |  ` +
    chalk.gray(`Last: #${state.lastBlockNumber?.toString() || '---'}`)
  );
  divider();
}

/**
 * Log a new block (minimal for empty blocks, detailed for blocks with txs)
 */
function logBlock(block: Block, hasTransactions: boolean): void {
  const txCount = block.transactions?.length || 0;

  if (!hasTransactions || txCount === 0) {
    // Minimal output for empty blocks
    console.log(
      chalk.gray(`${timestamp()} `) +
      chalk.gray('BLOCK') +
      chalk.gray(` #${block.number}`) +
      chalk.gray(` (empty)`)
    );
    return;
  }

  // Detailed output for blocks with transactions
  const gasUsed = block.gasUsed?.toLocaleString() || '0';
  console.log('');
  console.log(
    `${timestamp()} ` +
    chalk.blue.bold('═══ BLOCK') +
    chalk.white.bold(` #${block.number} `) +
    chalk.blue.bold('═══')
  );
  console.log(
    chalk.gray(`           `) +
    chalk.gray(`${txCount} transaction${txCount > 1 ? 's' : ''} | `) +
    chalk.gray(`${gasUsed} gas used | `) +
    chalk.gray(block.hash?.slice(0, 22) + '...')
  );
}

/**
 * Log a transaction with detailed information
 */
function logTransaction(tx: any, index: number, state: MonitorState): void {
  const isContractDeploy = !tx.to;
  const type = isContractDeploy
    ? chalk.magenta.bold('DEPLOY')
    : evvmGreen.bold('TX    ');

  // Main transaction line
  console.log(
    `${timestamp()} ` +
    type +
    chalk.gray(` [${index + 1}] `) +
    formatAddress(tx.from) +
    chalk.gray(' → ') +
    formatAddress(tx.to) +
    ` ${formatValue(tx.value)}`
  );

  // Function call info (for non-deployments)
  if (!isContractDeploy && tx.input && tx.input !== '0x') {
    console.log(
      chalk.gray(`           `) +
      chalk.gray('Function: ') +
      getFunctionName(tx.input) +
      chalk.gray(` | Data: ${tx.input.length} bytes`)
    );
  }

  // Gas info
  console.log(
    chalk.gray(`           `) +
    formatGas(tx.gas, tx.gasPrice) +
    chalk.gray(` | Nonce: ${tx.nonce}`)
  );

  // Contract deployment details
  if (isContractDeploy) {
    state.contractDeployments++;
    console.log(
      chalk.gray(`           `) +
      chalk.magenta('Contract deployment') +
      chalk.gray(` | Bytecode: ${tx.input?.length || 0} bytes`)
    );
  }

  // Hash (truncated for regular txs, full for deploys)
  console.log(
    chalk.gray(`           `) +
    chalk.gray('Hash: ') +
    (isContractDeploy
      ? chalk.magenta(tx.hash)
      : chalk.gray(tx.hash.slice(0, 22) + '...' + tx.hash.slice(-8)))
  );
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
          chalk.green.bold('CONNECTED') +
          chalk.gray(` to local blockchain at block #${currentBlockNumber}`)
        );
        console.log(chalk.gray(`           Ready to monitor transactions...`));
        console.log('');
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
          const hasTxs = block.transactions && block.transactions.length > 0;
          logBlock(block, hasTxs);

          // Log transactions in the block
          if (hasTxs) {
            for (let j = 0; j < block.transactions.length; j++) {
              const tx = block.transactions[j];
              if (typeof tx === 'object') {
                state.txCount++;
                logTransaction(tx, j, state);
              }
            }
            console.log(''); // Space after block with transactions
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
          chalk.red.bold('DISCONNECTED') +
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
    contractDeployments: 0,
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

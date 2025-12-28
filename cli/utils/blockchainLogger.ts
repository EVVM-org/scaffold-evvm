/**
 * Blockchain Logger Utility
 *
 * Monitors local blockchain (Anvil/Hardhat) for transactions and logs them to terminal.
 * Can be used during deployment to show real-time blockchain activity.
 */

import chalk from 'chalk';
import { evvmGreen } from './display.js';

interface TransactionLog {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasUsed?: string;
  blockNumber?: number;
  contractName?: string;
}

interface BlockLog {
  number: number;
  hash: string;
  timestamp: number;
  transactionCount: number;
  gasUsed: string;
}

/**
 * Format an address for display (truncated)
 */
function formatAddress(address: string | null): string {
  if (!address) return chalk.gray('Contract Creation');
  return chalk.cyan(address.slice(0, 10) + '...' + address.slice(-6));
}

/**
 * Format ETH value
 */
function formatValue(value: string): string {
  const wei = BigInt(value || '0');
  const eth = Number(wei) / 1e18;
  if (eth === 0) return chalk.gray('0 ETH');
  return chalk.yellow(eth.toFixed(4) + ' ETH');
}

/**
 * Log a transaction to the terminal
 */
export function logTransaction(tx: TransactionLog): void {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  console.log(
    chalk.gray(`[${timestamp}]`) +
    evvmGreen(' TX ') +
    formatAddress(tx.from) +
    chalk.gray(' → ') +
    formatAddress(tx.to) +
    ' ' +
    formatValue(tx.value) +
    (tx.contractName ? chalk.magenta(` (${tx.contractName})`) : '')
  );
}

/**
 * Log a new block to the terminal
 */
export function logBlock(block: BlockLog): void {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  console.log(
    chalk.gray(`[${timestamp}]`) +
    chalk.blue(' BLOCK ') +
    chalk.white(`#${block.number}`) +
    chalk.gray(` (${block.transactionCount} txs, ${block.gasUsed} gas)`)
  );
}

/**
 * Log a contract deployment
 */
export function logDeployment(contractName: string, address: string, txHash?: string): void {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  console.log(
    chalk.gray(`[${timestamp}]`) +
    evvmGreen(' DEPLOY ') +
    chalk.magenta(contractName) +
    chalk.gray(' at ') +
    chalk.green(address)
  );
}

/**
 * Log an error
 */
export function logError(message: string, error?: Error): void {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  console.log(
    chalk.gray(`[${timestamp}]`) +
    chalk.red(' ERROR ') +
    chalk.white(message)
  );
  if (error) {
    console.log(chalk.gray('  ' + error.message));
  }
}

/**
 * Log general info
 */
export function logInfo(message: string): void {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  console.log(
    chalk.gray(`[${timestamp}]`) +
    chalk.cyan(' INFO ') +
    chalk.white(message)
  );
}

/**
 * Create a divider line
 */
export function logDivider(): void {
  console.log(evvmGreen('─'.repeat(60)));
}

/**
 * Log blockchain monitor status
 */
export function logMonitorStatus(status: 'connected' | 'disconnected' | 'monitoring'): void {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const statusColors = {
    connected: chalk.green('CONNECTED'),
    disconnected: chalk.red('DISCONNECTED'),
    monitoring: evvmGreen('MONITORING')
  };

  console.log(
    chalk.gray(`[${timestamp}]`) +
    ' ' +
    statusColors[status] +
    chalk.gray(' Local blockchain at http://localhost:8545')
  );
}

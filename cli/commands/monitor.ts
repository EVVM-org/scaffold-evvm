/**
 * Blockchain Monitor Command
 *
 * Real-time monitoring of local blockchain (Anvil/Hardhat)
 * Shows blocks, transactions, and contract deployments in the terminal.
 * Uses full ABI decoding for human-readable transaction display.
 *
 * Usage: npm run monitor
 */

import chalk from 'chalk';
import { createPublicClient, http, formatEther, formatGwei, decodeFunctionData, type Block, type Transaction, type Abi, type Hex } from 'viem';
import { hardhat } from 'viem/chains';
import { evvmGreen, sectionHeader, info, success, error, divider } from '../utils/display.js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCAL_RPC_URL = 'http://127.0.0.1:8545';
const LOCAL_CHAIN_ID = 31337;

interface MonitorState {
  lastBlockNumber: bigint | null;
  blockCount: number;
  txCount: number;
  contractDeployments: number;
  isRunning: boolean;
}

// Well-known token addresses
const TOKEN_NAMES: { [key: string]: string } = {
  '0x0000000000000000000000000000000000000000': 'ETH',
  '0x0000000000000000000000000000000000000001': 'MATE',
};

/**
 * Resolve a token address to its human-readable name
 */
function getTokenName(address: string): string {
  const name = TOKEN_NAMES[address.toLowerCase()];
  if (name) return chalk.yellow.bold(name);
  return chalk.cyan(address);
}

// Contract name mapping (loaded from .env at startup)
let CONTRACT_NAMES: { [key: string]: string } = {};

// ABI mapping: contract name → ABI (loaded at startup)
let CONTRACT_ABIS: { [key: string]: Abi } = {};

// Address → ABI mapping for fast lookup
let ADDRESS_ABIS: { [key: string]: Abi } = {};

/**
 * Load ABIs from available sources.
 * Tries evvm-js SDK first (always up-to-date), falls back to cli/abi/.
 */
function loadABIs(): void {
  const contractNames = ['Core', 'Staking', 'NameService', 'P2PSwap', 'Estimator'];

  // Try loading from evvm-js SDK (most up-to-date source)
  const sdkAbiPaths = [
    resolve(process.cwd(), 'node_modules', '@evvm', 'evvm-js', 'src', 'abi'),
    resolve(process.cwd(), 'packages', 'nextjs', 'node_modules', '@evvm', 'evvm-js', 'src', 'abi'),
    resolve(process.cwd(), '..', 'evvm-js', 'src', 'abi'),
  ];

  // Fallback: cli/abi/ directory
  const cliAbiDir = join(__dirname, '..', 'abi');

  for (const name of contractNames) {
    let loaded = false;

    // Try SDK paths first
    for (const sdkDir of sdkAbiPaths) {
      const filePath = join(sdkDir, `${name}.json`);
      if (existsSync(filePath)) {
        try {
          const data = JSON.parse(readFileSync(filePath, 'utf-8'));
          CONTRACT_ABIS[name] = (data.abi || data) as Abi;
          loaded = true;
          break;
        } catch {
          // Try next path
        }
      }
    }

    // Fallback to cli/abi/
    if (!loaded) {
      const filePath = join(cliAbiDir, `${name}.json`);
      if (existsSync(filePath)) {
        try {
          const data = JSON.parse(readFileSync(filePath, 'utf-8'));
          CONTRACT_ABIS[name] = (data.abi || data) as Abi;
        } catch {
          // Silently skip
        }
      }
    }
  }
}

/**
 * Load contract addresses from .env file and map to names
 */
function loadContractNames(): void {
  try {
    const envPath = resolve(process.cwd(), '.env');

    if (!existsSync(envPath)) return;

    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    const addressMap: { [key: string]: string } = {
      'NEXT_PUBLIC_EVVM_ADDRESS': 'Core',
      'NEXT_PUBLIC_STAKING_ADDRESS': 'Staking',
      'NEXT_PUBLIC_ESTIMATOR_ADDRESS': 'Estimator',
      'NEXT_PUBLIC_NAMESERVICE_ADDRESS': 'NameService',
      'NEXT_PUBLIC_TREASURY_ADDRESS': 'Treasury',
      'NEXT_PUBLIC_P2PSWAP_ADDRESS': 'P2PSwap',
      'NEXT_PUBLIC_ADMIN_ADDRESS': 'Admin',
      'NEXT_PUBLIC_GOLDEN_FISHER_ADDRESS': 'GoldenFisher',
      'NEXT_PUBLIC_ACTIVATOR_ADDRESS': 'Activator',
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, value] = trimmed.split('=');
      if (key && value && addressMap[key]) {
        const addr = value.trim().toLowerCase();
        const contractName = addressMap[key];
        CONTRACT_NAMES[addr] = contractName;

        // Map address → ABI for decoding
        if (CONTRACT_ABIS[contractName]) {
          ADDRESS_ABIS[addr] = CONTRACT_ABIS[contractName];
        }
      }
    }
  } catch (err) {
    // Silently fail - contract names are optional enhancement
  }
}

/**
 * Get contract name for an address
 */
function getContractName(address: string | null): string | null {
  if (!address) return null;
  return CONTRACT_NAMES[address.toLowerCase()] || null;
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
 * Format address with full display and optional contract name
 */
function formatAddress(address: string | null): string {
  if (!address) return chalk.magenta('Contract Creation');

  const contractName = getContractName(address);

  if (contractName) {
    return chalk.green.bold(contractName) + chalk.gray(` (${address})`);
  }

  return chalk.cyan(address);
}

/**
 * Format a decoded parameter value for display
 */
function formatParamValue(value: any, name?: string): string {
  if (value === undefined || value === null) return chalk.gray('null');

  // Address type
  if (typeof value === 'string' && value.startsWith('0x') && value.length === 42) {
    const contractName = getContractName(value);
    const tokenName = TOKEN_NAMES[value.toLowerCase()];
    if (contractName) return chalk.green.bold(contractName) + chalk.gray(` (${value})`);
    if (tokenName) return chalk.yellow.bold(tokenName) + chalk.gray(` (${value})`);
    return chalk.cyan(value);
  }

  // Bytes/hash type
  if (typeof value === 'string' && value.startsWith('0x') && value.length > 42) {
    return chalk.gray(value);
  }

  // BigInt amounts - try to format nicely
  if (typeof value === 'bigint') {
    if (value === 0n) return chalk.gray('0');
    // Check if it looks like a wei amount (>= 1e15)
    if (value >= 1000000000000000n && (name?.toLowerCase().includes('amount') || name?.toLowerCase().includes('fee') || name?.toLowerCase().includes('value') || name?.toLowerCase().includes('supply') || name?.toLowerCase().includes('reward'))) {
      const ethValue = formatEther(value);
      return chalk.yellow(ethValue) + chalk.gray(` (${value.toString()} wei)`);
    }
    return chalk.white(value.toString());
  }

  // Boolean
  if (typeof value === 'boolean') {
    return value ? chalk.green('true') : chalk.red('false');
  }

  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return chalk.gray('[]');
    return chalk.gray('[') + value.map(v => formatParamValue(v)).join(chalk.gray(', ')) + chalk.gray(']');
  }

  return chalk.white(String(value));
}

/**
 * Decode transaction calldata using ABIs
 */
function decodeCalldata(toAddress: string | null, data: string | undefined): { functionName: string; args: { name: string; value: any }[] } | null {
  if (!data || data === '0x' || data.length < 10 || !toAddress) return null;

  const abi = ADDRESS_ABIS[toAddress.toLowerCase()];
  if (!abi) return null;

  try {
    const decoded = decodeFunctionData({
      abi,
      data: data as Hex,
    });

    // Get parameter names from the ABI
    const funcAbi = (abi as any[]).find(
      (entry: any) => entry.type === 'function' && entry.name === decoded.functionName
    );

    const args: { name: string; value: any }[] = [];
    if (funcAbi?.inputs && decoded.args) {
      for (let i = 0; i < funcAbi.inputs.length; i++) {
        args.push({
          name: funcAbi.inputs[i].name || `arg${i}`,
          value: decoded.args[i],
        });
      }
    }

    return { functionName: decoded.functionName, args };
  } catch {
    return null;
  }
}

/**
 * Get function name from calldata (fallback when ABI decoding fails)
 */
function getFunctionSelector(data: string | undefined): string {
  if (!data || data === '0x' || data.length < 10) {
    return chalk.gray('Native Transfer');
  }
  const selector = data.slice(0, 10).toLowerCase();
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
    chalk.gray(block.hash)
  );
}

/**
 * Log a transaction with detailed information
 */
function logTransaction(tx: any, index: number, state: MonitorState, receipt?: any): void {
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
    const decoded = decodeCalldata(tx.to, tx.input);
    const dataBytes = (tx.input.length - 2) / 2;

    if (decoded) {
      // Full ABI-decoded display
      console.log(
        chalk.gray(`           `) +
        chalk.gray('Function: ') +
        chalk.yellow.bold(decoded.functionName) +
        chalk.gray(` | Data: ${dataBytes} bytes`)
      );

      // Display decoded parameters
      for (const arg of decoded.args) {
        console.log(
          chalk.gray(`             `) +
          chalk.gray(`${arg.name}: `) +
          formatParamValue(arg.value, arg.name)
        );
      }
    } else {
      // Fallback: just show selector
      console.log(
        chalk.gray(`           `) +
        chalk.gray('Function: ') +
        getFunctionSelector(tx.input) +
        chalk.gray(` | Data: ${dataBytes} bytes`)
      );
    }
  }

  // Status + gas usage (from receipt)
  if (receipt) {
    const statusStr = receipt.status === 'success'
      ? chalk.green('Success')
      : chalk.red('Reverted');
    const gasUsed = BigInt(receipt.gasUsed);
    const gasLimit = BigInt(tx.gas);
    const pct = gasLimit > 0n ? Number((gasUsed * 1000n) / gasLimit) / 10 : 0;
    console.log(
      chalk.gray(`           `) +
      chalk.gray('Status: ') + statusStr +
      chalk.gray(` | Gas: ${gasUsed.toLocaleString()} / ${gasLimit.toLocaleString()} (${pct.toFixed(1)}%)`)
    );
  } else {
    // Fallback: just gas info
    console.log(
      chalk.gray(`           `) +
      formatGas(tx.gas, tx.gasPrice) +
      chalk.gray(` | Nonce: ${tx.nonce}`)
    );
  }

  // Contract deployment details
  if (isContractDeploy) {
    state.contractDeployments++;
    const bytecodeBytes = tx.input ? (tx.input.length - 2) / 2 : 0;
    console.log(
      chalk.gray(`           `) +
      chalk.magenta('Contract deployment') +
      chalk.gray(` | Bytecode: ${bytecodeBytes.toLocaleString()} bytes`)
    );
    if (receipt?.contractAddress) {
      const deployedName = getContractName(receipt.contractAddress);
      console.log(
        chalk.gray(`           `) +
        chalk.gray('Deployed at: ') +
        (deployedName
          ? chalk.green.bold(deployedName) + chalk.gray(` (${receipt.contractAddress})`)
          : chalk.cyan(receipt.contractAddress))
      );
    }
  }

  // Full transaction hash
  console.log(
    chalk.gray(`           `) +
    chalk.gray('Hash: ') +
    chalk.gray(tx.hash)
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

        // Show loaded ABIs info
        const abiCount = Object.keys(CONTRACT_ABIS).length;
        const contractCount = Object.keys(CONTRACT_NAMES).length;
        if (abiCount > 0) {
          console.log(
            chalk.gray(`           `) +
            chalk.gray(`Loaded ${abiCount} contract ABIs, ${contractCount} known addresses`)
          );
        }

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
                let receipt;
                try {
                  receipt = await client.getTransactionReceipt({ hash: tx.hash });
                } catch {
                  // Receipt not available
                }
                logTransaction(tx, j, state, receipt);
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
  // Load ABIs first (before contract names, since loadContractNames maps addresses to ABIs)
  loadABIs();

  // Load contract names from .env for human-readable output
  loadContractNames();

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

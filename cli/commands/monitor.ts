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

// Common function signatures for decoding (generated from @evvm/evvm-js ABIs)
const KNOWN_SIGNATURES: { [key: string]: string } = {
  // ERC20 standard
  '0x': 'Native Transfer',
  '0xa9059cbb': 'transfer(to,amount)',
  '0x23b872dd': 'transferFrom(from,to,amount)',
  '0x095ea7b3': 'approve(spender,amount)',
  '0x70a08231': 'balanceOf(account)',
  '0x18160ddd': 'totalSupply()',
  '0xdd62ed3e': 'allowance(owner,spender)',

  // EVVM Core functions
  '0xd3bca884': 'addBalance(user,token,amount)',
  '0x2e9621cb': 'pay(to,token,amount,...)',
  '0xe9703878': 'dispersePay(...)',
  '0xc898a6e9': 'caPay(...)',
  '0x54c728be': 'disperseCaPay(...)',
  '0x1c2048cc': 'payMultiple(...)',
  '0x6c9fa638': 'addAmountToUser(...)',
  '0x76e6eb7e': 'removeAmountFromUser(...)',
  '0xd4fac45d': 'getBalance(user,token)',
  '0x17c85152': 'getEvvmID()',
  '0x6cd30148': 'getNextCurrentSyncNonce(user)',
  '0x3a8cd872': 'getNameServiceAddress()',
  '0x6afe5795': 'getStakingContractAddress()',
  '0x147bf6c4': 'proposeAdmin(addr)',
  '0x0e18b681': 'acceptAdmin()',
  '0xb38c950a': 'rejectProposalAdmin()',
  '0x9dd18c15': 'proposeImplementation(addr)',
  '0x15ba56e5': 'acceptImplementation()',

  // Staking functions
  '0x475c31ff': 'goldenStaking(isStaking,amount,sig)',
  '0xc769095c': 'publicStaking(user,isStaking,amount,...)',
  '0xc0f6e7d1': 'presaleStaking(user,isStaking,...)',
  '0x27be0557': 'prepareChangeAllowPublicStaking()',
  '0x681f02ac': 'confirmChangeAllowPublicStaking()',
  '0xb996b6c4': 'cancelChangeAllowPublicStaking()',
  '0xdfb2b3a4': 'prepareChangeAllowPresaleStaking()',
  '0x1e9c210f': 'confirmChangeAllowPresaleStaking()',
  '0x7068dc65': 'cancelChangeAllowPresaleStaking()',
  '0x6c58f77b': 'addPresaleStaker(addr)',
  '0xbe100345': 'addPresaleStakers(addrs)',
  '0x602c4fb4': 'gimmeYield()',
  '0x9cde1d3e': 'getUserAmountStaked(user)',
  '0xcb0900b8': 'priceOfStaking()',
  '0x489c5ad4': 'proposeGoldenFisher(addr)',
  '0x34dd90d6': 'acceptNewGoldenFisher()',
  '0x3900738a': 'proposeEstimator(addr)',
  '0x6fa7ff17': 'acceptNewEstimator()',

  // NameService functions
  '0x5d232a55': 'preRegistrationUsername(username,...)',
  '0xafabc8db': 'registrationUsername(username,...)',
  '0x35723e23': 'renewUsername(username,...)',
  '0x044695cb': 'flushUsername(username,...)',
  '0x4cfe021f': 'addCustomMetadata(identity,...)',
  '0x8adf3927': 'removeCustomMetadata(identity,...)',
  '0x3ca44e54': 'flushCustomMetadata(identity,...)',
  '0xd82e5d8b': 'makeOffer(username,amount,...)',
  '0x8e3bde43': 'acceptOffer(username,offerIndex,...)',
  '0x5761d8ed': 'withdrawOffer(username,offerIndex,...)',
  '0x0d3dcb9f': 'getOwnerOfIdentity(identity)',
  '0xf69c6dec': 'isUsernameAvailable(username)',

  // P2PSwap functions
  '0x4c2442bd': 'makeOrder(tokenA,tokenB,amountA,amountB,...)',
  '0x6b3de5ea': 'cancelOrder(orderId,...)',
  '0x8e371a72': 'dispatchOrder_fillFixedFee(...)',
  '0x3ceca3a5': 'dispatchOrder_fillPropotionalFee(...)',
  '0x21e5383a': 'addBalance(token,amount)',
  '0xa694fc3a': 'stake(amount)',
  '0x2e17de78': 'unstake(amount)',
  '0x5e1a3573': 'getOrder(orderId)',
  '0xdb7ccd63': 'findMarket(tokenA,tokenB)',
};

// Contract name mapping (loaded from .env at startup)
let CONTRACT_NAMES: { [key: string]: string } = {};

/**
 * Load contract addresses from .env file and map to names
 */
function loadContractNames(): void {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(process.cwd(), '.env');

    if (!fs.existsSync(envPath)) return;

    const envContent = fs.readFileSync(envPath, 'utf-8');
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
        CONTRACT_NAMES[addr] = addressMap[key];
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
 * Format address (truncated) with optional contract name
 */
function formatAddress(address: string | null, full: boolean = false): string {
  if (!address) return chalk.magenta('Contract Creation');

  const contractName = getContractName(address);
  const shortAddr = address.slice(0, 10) + '...' + address.slice(-4);

  if (contractName) {
    return chalk.green.bold(contractName) + chalk.gray(` (${shortAddr})`);
  }

  if (full) return chalk.cyan(address);
  return chalk.cyan(shortAddr);
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
    const dataBytes = (tx.input.length - 2) / 2;
    console.log(
      chalk.gray(`           `) +
      chalk.gray('Function: ') +
      getFunctionName(tx.input) +
      chalk.gray(` | Data: ${dataBytes} bytes`)
    );
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

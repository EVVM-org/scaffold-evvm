/**
 * Flush Command
 *
 * Clears all caches to ensure fresh configuration loading:
 * - Next.js .next cache
 * - Browser localStorage reminder
 *
 * Usage: npm run flush
 */

import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { execa } from 'execa';
import { sectionHeader, success, warning, info, dim, divider, evvmGreen } from '../utils/display.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..', '..');

/**
 * Flush all caches and stop local chains
 */
export async function flush(): Promise<void> {
  console.log(evvmGreen(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    SCAFFOLD-EVVM                              ║
║                   Cache Flush Utility                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

  let clearedSomething = false;

  // 1. Stop local blockchain nodes (Anvil and Hardhat)
  sectionHeader('Stopping Local Chains');

  // Kill Anvil
  info('Checking for running Anvil instance...');
  try {
    await execa('pkill', ['-9', 'anvil'], { stdio: 'pipe' });
    success('Anvil stopped');
    clearedSomething = true;
  } catch {
    dim('   No Anvil instance running');
  }

  // Kill Hardhat node
  info('Checking for running Hardhat node...');
  try {
    await execa('pkill', ['-9', '-f', 'hardhat node'], { stdio: 'pipe' });
    success('Hardhat node stopped');
    clearedSomething = true;
  } catch {
    dim('   No Hardhat node running');
  }

  // Kill any process on port 8545 (local chain port)
  info('Checking for processes on port 8545...');
  try {
    const { stdout } = await execa('lsof', ['-t', '-i:8545'], { stdio: 'pipe' }).catch(() => ({ stdout: '' }));
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n');
      for (const pid of pids) {
        if (pid) {
          info(`Killing process on port 8545 (PID: ${pid})...`);
          await execa('kill', ['-9', pid], { stdio: 'pipe' }).catch(() => {});
          clearedSomething = true;
        }
      }
      success('Port 8545 cleared');
    } else {
      dim('   Port 8545 is free');
    }
  } catch {
    dim('   Port 8545 is free');
  }

  // 2. Clear caches
  sectionHeader('Clearing Caches');

  // Clear Next.js cache
  const nextCacheDir = join(PROJECT_ROOT, 'packages', 'nextjs', '.next');
  if (existsSync(nextCacheDir)) {
    info('Clearing Next.js cache (.next directory)...');
    rmSync(nextCacheDir, { recursive: true, force: true });
    success('Next.js cache cleared');
    clearedSomething = true;
  } else {
    dim('   Next.js cache not found (already clean)');
  }

  // Kill any running Next.js dev server on port 3000
  info('Checking for running frontend server on port 3000...');
  try {
    const { stdout } = await execa('lsof', ['-t', '-i:3000'], { stdio: 'pipe' }).catch(() => ({ stdout: '' }));
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n');
      for (const pid of pids) {
        if (pid) {
          info(`Killing process on port 3000 (PID: ${pid})...`);
          await execa('kill', ['-9', pid], { stdio: 'pipe' }).catch(() => {});
          clearedSomething = true;
        }
      }
      success('Frontend server stopped');
    } else {
      dim('   No frontend server running');
    }
  } catch {
    dim('   No frontend server running');
  }

  // Clear node_modules/.cache if exists
  const nmCacheDir = join(PROJECT_ROOT, 'node_modules', '.cache');
  if (existsSync(nmCacheDir)) {
    info('Clearing node_modules/.cache...');
    rmSync(nmCacheDir, { recursive: true, force: true });
    success('Node modules cache cleared');
    clearedSomething = true;
  }

  const frontendNmCacheDir = join(PROJECT_ROOT, 'packages', 'nextjs', 'node_modules', '.cache');
  if (existsSync(frontendNmCacheDir)) {
    info('Clearing frontend node_modules/.cache...');
    rmSync(frontendNmCacheDir, { recursive: true, force: true });
    success('Frontend node modules cache cleared');
    clearedSomething = true;
  }

  // Clear Foundry cache
  const foundryCacheDir = join(PROJECT_ROOT, 'packages', 'foundry', 'cache');
  if (existsSync(foundryCacheDir)) {
    info('Clearing Foundry cache...');
    rmSync(foundryCacheDir, { recursive: true, force: true });
    success('Foundry cache cleared');
    clearedSomething = true;
  }

  const foundryOutDir = join(PROJECT_ROOT, 'packages', 'foundry', 'out');
  if (existsSync(foundryOutDir)) {
    info('Clearing Foundry build artifacts...');
    rmSync(foundryOutDir, { recursive: true, force: true });
    success('Foundry build artifacts cleared');
    clearedSomething = true;
  }

  // Clear Hardhat cache
  const hardhatCacheDir = join(PROJECT_ROOT, 'packages', 'hardhat', 'cache');
  if (existsSync(hardhatCacheDir)) {
    info('Clearing Hardhat cache...');
    rmSync(hardhatCacheDir, { recursive: true, force: true });
    success('Hardhat cache cleared');
    clearedSomething = true;
  }

  const hardhatArtifactsDir = join(PROJECT_ROOT, 'packages', 'hardhat', 'artifacts');
  if (existsSync(hardhatArtifactsDir)) {
    info('Clearing Hardhat artifacts...');
    rmSync(hardhatArtifactsDir, { recursive: true, force: true });
    success('Hardhat artifacts cleared');
    clearedSomething = true;
  }

  divider();

  if (clearedSomething) {
    success('Flush complete!');
  } else {
    info('Everything was already clean');
  }

  console.log('');
  info('What was cleared:');
  console.log(chalk.gray('  • Local chains (Anvil, Hardhat node)'));
  console.log(chalk.gray('  • Frontend server (port 3000)'));
  console.log(chalk.gray('  • Next.js cache'));
  console.log(chalk.gray('  • Foundry cache and build artifacts'));
  console.log(chalk.gray('  • Hardhat cache and artifacts'));
  console.log('');
  info('Next steps:');
  console.log(chalk.gray('  1. Run: npm run cli deploy'));
  console.log(chalk.gray('  2. Run: npm run frontend'));
  console.log('');
}

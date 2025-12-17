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
 * Flush all caches
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

  sectionHeader('Clearing Caches');

  let clearedSomething = false;

  // 1. Clear Next.js cache
  const nextCacheDir = join(PROJECT_ROOT, 'packages', 'nextjs', '.next');
  if (existsSync(nextCacheDir)) {
    info('Clearing Next.js cache (.next directory)...');
    rmSync(nextCacheDir, { recursive: true, force: true });
    success('Next.js cache cleared');
    clearedSomething = true;
  } else {
    dim('   Next.js cache not found (already clean)');
  }

  // 2. Kill any running Next.js dev server on port 3000
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

  // 3. Clear node_modules/.cache if exists
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

  divider();

  if (clearedSomething) {
    success('All caches cleared!');
  } else {
    info('All caches were already clean');
  }

  console.log('');
  info('To complete the refresh:');
  console.log(chalk.gray('  1. Clear browser localStorage: Open DevTools → Application → Local Storage → Clear'));
  console.log(chalk.gray('  2. Start the frontend: npm run dev'));
  console.log('');
  dim('Or run "npm run frontend" to start the frontend server');
  console.log('');
}

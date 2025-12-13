/**
 * Prerequisites checking for Scaffold-EVVM CLI
 */

import { execa } from 'execa';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { success, error, warning, dim } from './display.js';

/**
 * Check if a command exists in the system
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    await execa('which', [command]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get version of a command
 */
export async function getVersion(command: string, versionFlag = '--version'): Promise<string> {
  try {
    const { stdout } = await execa(command, [versionFlag]);
    // Extract first line and clean up
    return stdout.split('\n')[0].trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Check environment file configuration
 */
export function checkEnvConfig(): { configured: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const envPath = join(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return {
      configured: false,
      warnings: ['.env file not found. Run "npm run wizard" to configure.']
    };
  }

  // Check for common configuration
  const hasProjectId = process.env.NEXT_PUBLIC_PROJECT_ID && process.env.NEXT_PUBLIC_PROJECT_ID.length > 0;
  const hasEvvmAddress = process.env.NEXT_PUBLIC_EVVM_ADDRESS && process.env.NEXT_PUBLIC_EVVM_ADDRESS.length > 0;

  if (!hasProjectId) {
    warnings.push('NEXT_PUBLIC_PROJECT_ID not configured. WalletConnect may not work.');
  }
  if (!hasEvvmAddress) {
    warnings.push('NEXT_PUBLIC_EVVM_ADDRESS not configured. Deploy contracts first.');
  }

  return { configured: true, warnings };
}

/**
 * Check if required prerequisites are installed
 */
export async function checkPrerequisites(): Promise<boolean> {
  console.log(chalk.blue('\n🔍 Checking prerequisites...\n'));

  let allPassed = true;
  const checks = [
    { name: 'Node.js', command: 'node', required: true },
    { name: 'npm', command: 'npm', required: true },
    { name: 'Git', command: 'git', required: true },
    { name: 'Foundry (forge)', command: 'forge', required: false },
    { name: 'Hardhat', command: 'npx hardhat', required: false, checkMethod: 'npx' }
  ];

  let hasFoundry = false;
  let hasHardhat = false;

  for (const check of checks) {
    const exists = await commandExists(check.command.split(' ')[0]);

    if (exists) {
      const version = await getVersion(check.command.split(' ')[0]);
      success(`${check.name} ${chalk.gray(`(${version})`)}`);

      if (check.name === 'Foundry (forge)') hasFoundry = true;
    } else {
      if (check.required) {
        error(`${check.name} not found`);
        allPassed = false;
      } else {
        dim(`${check.name} not installed (optional)`);
      }
    }
  }

  // Check for at least one framework
  if (!hasFoundry) {
    // Try to detect Hardhat in node_modules
    const hardhatPath = join(process.cwd(), 'node_modules', 'hardhat');
    hasHardhat = existsSync(hardhatPath);
    if (hasHardhat) {
      success('Hardhat (installed in project)');
    }
  }

  // Check .env configuration
  const envCheck = checkEnvConfig();
  if (envCheck.configured) {
    if (envCheck.warnings.length === 0) {
      success('Environment (.env) configured');
    } else {
      warning('Environment (.env) - has warnings:');
      for (const w of envCheck.warnings) {
        dim(`  - ${w}`);
      }
    }
  } else {
    dim('Environment (.env) not configured yet');
    for (const w of envCheck.warnings) {
      dim(`  - ${w}`);
    }
  }

  // Final assessment
  if (!allPassed) {
    console.log(chalk.red('\n✖ Missing required dependencies.\n'));
    console.log(chalk.yellow('Please install:'));
    console.log(chalk.gray('  - Node.js: https://nodejs.org/'));
    console.log(chalk.gray('  - Git: https://git-scm.com/'));
    console.log(chalk.gray('  - (Optional) Foundry: https://getfoundry.sh/'));
    return false;
  }

  if (!hasFoundry && !hasHardhat) {
    console.log(chalk.yellow('\n⚠ No smart contract framework detected.'));
    console.log(chalk.gray('  Install Foundry: https://getfoundry.sh/'));
    console.log(chalk.gray('  Or the wizard will set up Hardhat for you.\n'));
  }

  console.log(chalk.green('\n✓ Prerequisites check passed!\n'));
  return true;
}

/**
 * Check if git submodules are initialized (for contract repos)
 */
export async function checkSubmodules(repoPath: string): Promise<boolean> {
  const libPath = join(repoPath, 'lib');

  if (!existsSync(libPath)) {
    return false;
  }

  // Check for critical Foundry submodule directories
  const criticalSubmodules = ['forge-std', 'openzeppelin-contracts'];

  for (const submodule of criticalSubmodules) {
    const submodulePath = join(libPath, submodule);
    if (!existsSync(submodulePath)) {
      return false;
    }

    // Check if directory has contents
    try {
      const files = readdirSync(submodulePath);
      if (files.length <= 1) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Initialize git submodules
 */
export async function initializeSubmodules(repoPath: string): Promise<boolean> {
  console.log(chalk.blue('\n📦 Initializing dependencies (git submodules)...'));
  console.log(chalk.gray('   This may take a few minutes on first run.\n'));

  try {
    await execa('git', ['submodule', 'update', '--init', '--recursive'], {
      cwd: repoPath,
      stdio: 'inherit'
    });
    console.log(chalk.green('\n✓ Dependencies initialized successfully!\n'));
    return true;
  } catch (err) {
    console.log(chalk.red('\n✖ Failed to initialize dependencies'));
    console.log(chalk.yellow('Please run manually: git submodule update --init --recursive'));
    return false;
  }
}

/**
 * Get available Foundry wallets
 */
export async function getAvailableWallets(): Promise<string[]> {
  try {
    const { stdout } = await execa('cast', ['wallet', 'list']);
    const wallets = stdout
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.replace(' (Local)', '').trim());
    return wallets;
  } catch {
    return [];
  }
}

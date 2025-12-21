/**
 * Prerequisites checking for Scaffold-EVVM CLI
 *
 * Validates that all required tools are installed before deployment:
 * - Node.js 18+
 * - npm
 * - Git
 * - Foundry (forge, anvil, cast) for Foundry framework
 * - Contract sources (Testnet-Contracts or Playground-Contracts)
 */

import { execa } from 'execa';
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { success, error, warning, dim, info, sectionHeader } from './display.js';

export interface PrerequisiteResult {
  passed: boolean;
  hasFoundry: boolean;
  hasHardhat: boolean;
  hasTestnetContracts: boolean;
  hasPlaygroundContracts: boolean;
  nodeVersion: string;
  errors: string[];
  warnings: string[];
}

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
 * Parse Node.js version string to major version number
 */
function parseNodeMajorVersion(versionString: string): number {
  const match = versionString.match(/v?(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Check if contract source repository exists and has required structure
 */
export function checkContractSourceExists(projectRoot: string, source: 'testnet' | 'playground'): boolean {
  const repoName = source === 'testnet' ? 'Testnet-Contracts' : 'Playground-Contracts';
  const repoPath = resolve(projectRoot, repoName);

  if (!existsSync(repoPath)) {
    return false;
  }

  // Check for essential files/directories
  const requiredPaths = [
    join(repoPath, 'contracts'),
    join(repoPath, 'foundry.toml'),
  ];

  return requiredPaths.every(p => existsSync(p));
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
  const result = await checkAllPrerequisites(process.cwd());
  return result.passed;
}

/**
 * Comprehensive prerequisite check with detailed results
 */
export async function checkAllPrerequisites(projectRoot: string): Promise<PrerequisiteResult> {
  sectionHeader('Checking Prerequisites');

  const result: PrerequisiteResult = {
    passed: true,
    hasFoundry: false,
    hasHardhat: false,
    hasTestnetContracts: false,
    hasPlaygroundContracts: false,
    nodeVersion: '',
    errors: [],
    warnings: [],
  };

  // Check Node.js
  const hasNode = await commandExists('node');
  if (hasNode) {
    const nodeVersion = await getVersion('node');
    result.nodeVersion = nodeVersion;
    const majorVersion = parseNodeMajorVersion(nodeVersion);

    if (majorVersion >= 18) {
      success(`Node.js ${chalk.gray(`(${nodeVersion})`)}`);
    } else {
      error(`Node.js ${nodeVersion} - requires v18+`);
      result.errors.push('Node.js 18+ is required');
      result.passed = false;
    }
  } else {
    error('Node.js not found');
    result.errors.push('Node.js is required');
    result.passed = false;
  }

  // Check npm
  const hasNpm = await commandExists('npm');
  if (hasNpm) {
    const npmVersion = await getVersion('npm');
    success(`npm ${chalk.gray(`(${npmVersion})`)}`);
  } else {
    error('npm not found');
    result.errors.push('npm is required');
    result.passed = false;
  }

  // Check Git
  const hasGit = await commandExists('git');
  if (hasGit) {
    const gitVersion = await getVersion('git');
    success(`Git ${chalk.gray(`(${gitVersion})`)}`);
  } else {
    error('Git not found');
    result.errors.push('Git is required');
    result.passed = false;
  }

  // Check Foundry tools
  const hasForge = await commandExists('forge');
  const hasAnvil = await commandExists('anvil');
  const hasCast = await commandExists('cast');

  if (hasForge && hasAnvil && hasCast) {
    const forgeVersion = await getVersion('forge');
    success(`Foundry ${chalk.gray(`(${forgeVersion})`)}`);
    dim('   forge, anvil, cast available');
    result.hasFoundry = true;
  } else if (hasForge || hasAnvil || hasCast) {
    warning('Foundry partially installed');
    if (!hasForge) dim('   Missing: forge');
    if (!hasAnvil) dim('   Missing: anvil');
    if (!hasCast) dim('   Missing: cast');
    result.warnings.push('Foundry is partially installed - run: foundryup');
  } else {
    dim('Foundry not installed');
    result.warnings.push('Foundry not installed - required for Foundry framework');
  }

  // Check Hardhat (in node_modules)
  const hardhatPath = join(projectRoot, 'node_modules', 'hardhat');
  if (existsSync(hardhatPath)) {
    success('Hardhat (installed in project)');
    result.hasHardhat = true;
  } else {
    dim('Hardhat not installed in project');
  }

  // Check contract sources
  console.log('');
  info('Contract Sources:');

  result.hasTestnetContracts = checkContractSourceExists(projectRoot, 'testnet');
  if (result.hasTestnetContracts) {
    success('Testnet-Contracts found');
  } else {
    dim('   Testnet-Contracts not found');
  }

  result.hasPlaygroundContracts = checkContractSourceExists(projectRoot, 'playground');
  if (result.hasPlaygroundContracts) {
    success('Playground-Contracts found');
  } else {
    dim('   Playground-Contracts not found');
  }

  // Check if at least one contract source exists
  if (!result.hasTestnetContracts && !result.hasPlaygroundContracts) {
    result.warnings.push('No contract sources found - will prompt to clone during deployment');
  }

  // Check if at least one framework is available
  if (!result.hasFoundry && !result.hasHardhat) {
    result.warnings.push('No smart contract framework available');
  }

  // Summary
  console.log('');
  if (result.passed) {
    if (result.errors.length === 0 && result.warnings.length === 0) {
      success('All prerequisites satisfied');
    } else if (result.warnings.length > 0) {
      warning('Prerequisites passed with warnings:');
      for (const w of result.warnings) {
        dim(`   - ${w}`);
      }
    }
  } else {
    error('Missing required prerequisites:');
    for (const e of result.errors) {
      dim(`   - ${e}`);
    }
    console.log('');
    info('Installation guides:');
    console.log(chalk.gray('   Node.js: https://nodejs.org/'));
    console.log(chalk.gray('   Git: https://git-scm.com/'));
    console.log(chalk.gray('   Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup'));
  }

  return result;
}

/**
 * Quick check for framework availability
 */
export async function checkFrameworkAvailable(framework: 'foundry' | 'hardhat', projectRoot: string): Promise<boolean> {
  if (framework === 'foundry') {
    const hasForge = await commandExists('forge');
    const hasAnvil = await commandExists('anvil');
    return hasForge && hasAnvil;
  } else {
    const hardhatPath = join(projectRoot, 'node_modules', 'hardhat');
    return existsSync(hardhatPath);
  }
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

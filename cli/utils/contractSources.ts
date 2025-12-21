/**
 * Contract Sources Utility
 *
 * Manages EVVM contract source repositories (Testnet-Contracts and Playground-Contracts).
 * Provides functionality to:
 * - Check if repos exist locally
 * - Clone repos if missing
 * - Check if repos are up-to-date with remote
 * - Pull latest changes
 */

import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execa } from 'execa';
import chalk from 'chalk';
import prompts from 'prompts';
import { success, warning, error, info, dim } from './display.js';

// GitHub repository URLs
const REPOS = {
  testnet: {
    name: 'Testnet-Contracts',
    url: 'git@github.com:EVVM-org/Testnet-Contracts.git',
    httpsUrl: 'https://github.com/EVVM-org/Testnet-Contracts.git',
    description: 'Production-ready contracts for testnet deployment',
  },
  playground: {
    name: 'Playground-Contracts',
    url: 'git@github.com:EVVM-org/Playground-Contracts.git',
    httpsUrl: 'https://github.com/EVVM-org/Playground-Contracts.git',
    description: 'Experimental contracts for prototyping',
  },
};

export interface RepoStatus {
  exists: boolean;
  path: string | null;
  branch: string | null;
  localCommit: string | null;
  remoteCommit: string | null;
  behind: number;
  ahead: number;
  isUpToDate: boolean;
  hasUncommittedChanges: boolean;
}

export interface ContractSourcesStatus {
  testnet: RepoStatus;
  playground: RepoStatus;
}

/**
 * Find existing path for a contract source
 */
function findContractPath(projectRoot: string, repoName: string): string | null {
  const searchPaths = [
    resolve(projectRoot, repoName), // Nueva ubicación dentro de scaffold-evvm
    resolve(projectRoot, '..', repoName),
    resolve(projectRoot, '..', '..', repoName),
    resolve(projectRoot, '..', repoName.replace('-', ''), repoName),
  ];

  for (const p of searchPaths) {
    if (existsSync(p) && existsSync(join(p, '.git'))) {
      return p;
    }
  }
  return null;
}

/**
 * Get the default clone path for a repo
 */
function getDefaultClonePath(projectRoot: string, repoName: string): string {
  return resolve(projectRoot, repoName); // Clona dentro de scaffold-evvm
}

/**
 * Check if a git repo has uncommitted changes
 */
async function hasUncommittedChanges(repoPath: string): Promise<boolean> {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain'], {
      cwd: repoPath,
      stdio: 'pipe',
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 */
async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: repoPath,
      stdio: 'pipe',
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Get commit hash (local or remote)
 */
async function getCommitHash(repoPath: string, ref: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['rev-parse', ref], {
      cwd: repoPath,
      stdio: 'pipe',
    });
    return stdout.trim().substring(0, 8);
  } catch {
    return null;
  }
}

/**
 * Fetch from remote
 */
async function fetchRemote(repoPath: string): Promise<boolean> {
  try {
    await execa('git', ['fetch', 'origin'], {
      cwd: repoPath,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get ahead/behind counts
 */
async function getAheadBehind(repoPath: string, branch: string): Promise<{ ahead: number; behind: number }> {
  try {
    const { stdout } = await execa(
      'git',
      ['rev-list', '--left-right', '--count', `${branch}...origin/${branch}`],
      {
        cwd: repoPath,
        stdio: 'pipe',
      }
    );
    const [ahead, behind] = stdout.trim().split('\t').map(Number);
    return { ahead: ahead || 0, behind: behind || 0 };
  } catch {
    return { ahead: 0, behind: 0 };
  }
}

/**
 * Get detailed status of a contract repository
 */
async function getRepoStatus(projectRoot: string, repoKey: 'testnet' | 'playground'): Promise<RepoStatus> {
  const repoInfo = REPOS[repoKey];
  const repoPath = findContractPath(projectRoot, repoInfo.name);

  if (!repoPath) {
    return {
      exists: false,
      path: null,
      branch: null,
      localCommit: null,
      remoteCommit: null,
      behind: 0,
      ahead: 0,
      isUpToDate: false,
      hasUncommittedChanges: false,
    };
  }

  // Fetch latest from remote
  await fetchRemote(repoPath);

  const branch = await getCurrentBranch(repoPath);
  const localCommit = await getCommitHash(repoPath, 'HEAD');
  const remoteCommit = branch ? await getCommitHash(repoPath, `origin/${branch}`) : null;
  const { ahead, behind } = branch ? await getAheadBehind(repoPath, branch) : { ahead: 0, behind: 0 };
  const uncommitted = await hasUncommittedChanges(repoPath);

  return {
    exists: true,
    path: repoPath,
    branch,
    localCommit,
    remoteCommit,
    behind,
    ahead,
    isUpToDate: behind === 0 && !uncommitted,
    hasUncommittedChanges: uncommitted,
  };
}

/**
 * Get status of both contract repositories
 */
export async function checkContractSources(projectRoot: string): Promise<ContractSourcesStatus> {
  const [testnet, playground] = await Promise.all([
    getRepoStatus(projectRoot, 'testnet'),
    getRepoStatus(projectRoot, 'playground'),
  ]);

  return { testnet, playground };
}

/**
 * Display status of contract sources
 */
export function displayContractSourcesStatus(status: ContractSourcesStatus): void {
  console.log(chalk.cyan('\n=== Contract Sources Status ===\n'));

  for (const [key, repoStatus] of Object.entries(status)) {
    const repoInfo = REPOS[key as keyof typeof REPOS];
    const name = repoInfo.name;

    if (!repoStatus.exists) {
      console.log(chalk.red(`✖ ${name}`));
      console.log(chalk.gray(`  Not found locally`));
      console.log(chalk.gray(`  Clone from: ${repoInfo.httpsUrl}`));
    } else {
      const statusIcon = repoStatus.isUpToDate ? chalk.green('✓') : chalk.yellow('⚠');
      console.log(`${statusIcon} ${chalk.white(name)}`);
      console.log(chalk.gray(`  Path: ${repoStatus.path}`));
      console.log(chalk.gray(`  Branch: ${repoStatus.branch} @ ${repoStatus.localCommit}`));

      if (repoStatus.behind > 0) {
        console.log(chalk.yellow(`  ⚠ ${repoStatus.behind} commit(s) behind remote`));
      }
      if (repoStatus.ahead > 0) {
        console.log(chalk.blue(`  ↑ ${repoStatus.ahead} commit(s) ahead of remote`));
      }
      if (repoStatus.hasUncommittedChanges) {
        console.log(chalk.yellow(`  ⚠ Has uncommitted changes`));
      }
      if (repoStatus.isUpToDate) {
        console.log(chalk.green(`  ✓ Up to date`));
      }
    }
    console.log('');
  }
}

/**
 * Clone a contract repository
 */
export async function cloneRepo(
  projectRoot: string,
  repoKey: 'testnet' | 'playground'
): Promise<boolean> {
  const repoInfo = REPOS[repoKey];
  const clonePath = getDefaultClonePath(projectRoot, repoInfo.name);
  const repoUrl = repoInfo.httpsUrl; // Always use HTTPS URL

  info(`Cloning ${repoInfo.name}...`);
  dim(`  From: ${repoUrl}`);
  dim(`  To: ${clonePath}`);

  try {
    // Execute git clone directly in bash
    await execa('bash', ['-c', `git clone --recursive ${repoUrl} ${clonePath}`], {
      stdio: 'inherit', // Show all operations in the terminal
    });
    success(`${repoInfo.name} cloned successfully!`);
    return true;
  } catch (err: any) {
    error(`Failed to clone ${repoInfo.name}: ${err.message}`);
    return false;
  }
}

/**
 * Pull latest changes for a repository
 */
export async function pullLatest(repoPath: string): Promise<boolean> {
  try {
    info(`Pulling latest changes...`);
    await execa('git', ['pull', '--rebase'], {
      cwd: repoPath,
      stdio: 'inherit',
    });
    success('Updated to latest!');
    return true;
  } catch (err: any) {
    error(`Failed to pull: ${err.message}`);
    return false;
  }
}

/**
 * Initialize git submodules in a repository
 */
export async function initSubmodules(repoPath: string): Promise<boolean> {
  try {
    info('Initializing git submodules...');
    await execa('git', ['submodule', 'update', '--init', '--recursive'], {
      cwd: repoPath,
      stdio: 'inherit',
    });
    success('Submodules initialized!');
    return true;
  } catch (err: any) {
    warning(`Submodule init warning: ${err.message}`);
    return false;
  }
}

/**
 * Show recent commits for a repository
 */
export async function showRecentCommits(repoPath: string, count: number = 5): Promise<void> {
  try {
    const { stdout } = await execa(
      'git',
      ['log', `--oneline`, `-${count}`, '--decorate'],
      {
        cwd: repoPath,
        stdio: 'pipe',
      }
    );
    console.log(chalk.gray(stdout));
  } catch {
    // Ignore errors
  }
}

/**
 * Interactive contract sources check and update
 * Returns true if sources are ready, false if user cancelled
 */
export async function ensureContractSources(
  projectRoot: string,
  requiredSource: 'testnet' | 'playground' | 'both' = 'both'
): Promise<boolean> {
  console.log(chalk.cyan('\n=== Checking Contract Sources ===\n'));

  const status = await checkContractSources(projectRoot);
  let allReady = true;

  // Check each required source
  const sourcesToCheck: ('testnet' | 'playground')[] =
    requiredSource === 'both' ? ['testnet', 'playground'] : [requiredSource];

  for (const sourceKey of sourcesToCheck) {
    const repoStatus = status[sourceKey];
    const repoInfo = REPOS[sourceKey];

    if (!repoStatus.exists) {
      warning(`${repoInfo.name} not found locally`);

      const response = await prompts({
        type: 'confirm',
        name: 'clone',
        message: `Clone ${repoInfo.name} from GitHub?`,
        initial: true,
      });

      if (response.clone) {
        const cloned = await cloneRepo(projectRoot, sourceKey);
        if (cloned) {
          // Initialize submodules
          const newPath = getDefaultClonePath(projectRoot, repoInfo.name);
          await initSubmodules(newPath);
        } else {
          allReady = false;
        }
      } else {
        allReady = false;
      }
    } else if (repoStatus.behind > 0) {
      warning(`${repoInfo.name} is ${repoStatus.behind} commit(s) behind remote`);

      console.log(chalk.gray('\nRecent remote commits:'));
      await showRecentCommits(repoStatus.path!, 3);

      const response = await prompts({
        type: 'confirm',
        name: 'pull',
        message: `Pull latest changes for ${repoInfo.name}?`,
        initial: true,
      });

      if (response.pull) {
        if (repoStatus.hasUncommittedChanges) {
          warning('You have uncommitted changes. Please commit or stash them first.');
          allReady = false;
        } else {
          await pullLatest(repoStatus.path!);
        }
      }
      // Not pulling is OK, just using current version
    } else if (repoStatus.hasUncommittedChanges) {
      warning(`${repoInfo.name} has uncommitted changes`);
      info('Your local changes will be used for deployment.');
    } else {
      success(`${repoInfo.name} is up to date (${repoStatus.localCommit})`);
    }
  }

  return allReady;
}

/**
 * Quick check without prompts - just returns status
 */
export async function quickCheckContractSources(
  projectRoot: string
): Promise<{ ready: boolean; missing: string[]; outdated: string[] }> {
  const status = await checkContractSources(projectRoot);
  const missing: string[] = [];
  const outdated: string[] = [];

  if (!status.testnet.exists) missing.push('Testnet-Contracts');
  else if (status.testnet.behind > 0) outdated.push('Testnet-Contracts');

  if (!status.playground.exists) missing.push('Playground-Contracts');
  else if (status.playground.behind > 0) outdated.push('Playground-Contracts');

  return {
    ready: missing.length === 0,
    missing,
    outdated,
  };
}

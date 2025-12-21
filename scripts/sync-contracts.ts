#!/usr/bin/env node

/**
 * Contract Sync Utility
 *
 * Synchronizes EVVM contracts from Testnet-Contracts or Playground-Contracts
 * into the scaffold-evvm packages (Foundry or Hardhat).
 *
 * This allows scaffold-evvm to deploy the actual EVVM contracts
 * from either the production-ready Testnet or experimental Playground sources.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, symlinkSync, lstatSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths relative to scaffold-evvm root
const PROJECT_ROOT = join(__dirname, '..');

// Search for Testnet-Contracts in multiple possible locations
const TESTNET_SEARCH_PATHS = [
  resolve(PROJECT_ROOT, '..', 'Testnet-Contracts'),
  resolve(PROJECT_ROOT, '..', 'TestnetContracts', 'Testnet-Contracts'),
  resolve(PROJECT_ROOT, '..', '..', 'Testnet-Contracts'),
  resolve(PROJECT_ROOT, '..', '..', 'TestnetContracts', 'Testnet-Contracts'),
];

const PLAYGROUND_SEARCH_PATHS = [
  resolve(PROJECT_ROOT, '..', 'Playground-Contracts'),
  resolve(PROJECT_ROOT, '..', 'PlaygroundContracts', 'Playground-Contracts'),
  resolve(PROJECT_ROOT, '..', '..', 'Playground-Contracts'),
  resolve(PROJECT_ROOT, '..', '..', 'PlaygroundContracts', 'Playground-Contracts'),
];

/**
 * Find the first existing path from a list of candidates
 */
function findExistingPath(paths: string[]): string | null {
  for (const p of paths) {
    if (existsSync(p)) {
      return p;
    }
  }
  return null;
}

const TESTNET_CONTRACTS_PATH = findExistingPath(TESTNET_SEARCH_PATHS);
const PLAYGROUND_CONTRACTS_PATH = findExistingPath(PLAYGROUND_SEARCH_PATHS);

// EVVM Brand Color
const evvmGreen = chalk.rgb(1, 240, 148);

interface SyncConfig {
  source: 'testnet' | 'playground';
  framework: 'foundry' | 'hardhat' | 'both';
}

/**
 * Main sync function
 */
async function main(): Promise<void> {
  console.log(evvmGreen('\n📦 EVVM Contract Sync Utility\n'));

  // Check if contract sources exist
  const hasTestnet = TESTNET_CONTRACTS_PATH !== null;
  const hasPlayground = PLAYGROUND_CONTRACTS_PATH !== null;

  if (!hasTestnet && !hasPlayground) {
    console.log(chalk.red('✖ No contract sources found.'));
    console.log(chalk.gray('  Searched for Testnet-Contracts in:'));
    for (const p of TESTNET_SEARCH_PATHS) {
      console.log(chalk.gray(`    - ${p}`));
    }
    console.log(chalk.gray('  Searched for Playground-Contracts in:'));
    for (const p of PLAYGROUND_SEARCH_PATHS) {
      console.log(chalk.gray(`    - ${p}`));
    }
    console.log(chalk.gray('\n  Make sure Testnet-Contracts or Playground-Contracts'));
    console.log(chalk.gray('  exists in one of the above locations.\n'));
    process.exit(1);
  }

  if (hasTestnet) {
    console.log(chalk.gray(`Found Testnet-Contracts at: ${TESTNET_CONTRACTS_PATH}`));
  }
  if (hasPlayground) {
    console.log(chalk.gray(`Found Playground-Contracts at: ${PLAYGROUND_CONTRACTS_PATH}`));
  }

  // Load existing config or prompt
  const config = await getOrPromptConfig(hasTestnet, hasPlayground);

  // Perform sync
  await syncContracts(config);
}

/**
 * Get existing config or prompt user
 */
async function getOrPromptConfig(hasTestnet: boolean, hasPlayground: boolean): Promise<SyncConfig> {
  const configPath = join(PROJECT_ROOT, 'scaffold.config.json');

  // Check for existing config
  if (existsSync(configPath)) {
    try {
      const existingConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (existingConfig.contractSource && existingConfig.framework) {
        console.log(chalk.gray(`Using existing config: ${existingConfig.contractSource} + ${existingConfig.framework}\n`));

        const useExisting = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'Use existing configuration?',
          initial: true
        });

        if (useExisting.value) {
          return {
            source: existingConfig.contractSource,
            framework: existingConfig.framework
          };
        }
      }
    } catch {
      // Config invalid, prompt user
    }
  }

  // Build source choices
  const sourceChoices = [];
  if (hasTestnet) {
    sourceChoices.push({
      title: 'Testnet Contracts',
      value: 'testnet',
      description: 'Production-ready contracts for testnet deployment'
    });
  }
  if (hasPlayground) {
    sourceChoices.push({
      title: 'Playground Contracts',
      value: 'playground',
      description: 'Experimental contracts for prototyping'
    });
  }

  // Prompt for source
  const sourceResponse = await prompts({
    type: 'select',
    name: 'source',
    message: 'Select contract source:',
    choices: sourceChoices
  });

  if (!sourceResponse.source) {
    process.exit(1);
  }

  // Prompt for framework
  const frameworkResponse = await prompts({
    type: 'select',
    name: 'framework',
    message: 'Select target framework:',
    choices: [
      { title: 'Foundry', value: 'foundry', description: 'Sync to packages/foundry' },
      { title: 'Hardhat', value: 'hardhat', description: 'Sync to packages/hardhat' },
      { title: 'Both', value: 'both', description: 'Sync to both frameworks' }
    ]
  });

  if (!frameworkResponse.framework) {
    process.exit(1);
  }

  return {
    source: sourceResponse.source,
    framework: frameworkResponse.framework
  };
}

/**
 * Sync contracts to target framework(s)
 */
async function syncContracts(config: SyncConfig): Promise<void> {
  const sourcePath = config.source === 'testnet'
    ? TESTNET_CONTRACTS_PATH
    : PLAYGROUND_CONTRACTS_PATH;

  if (!sourcePath) {
    console.log(chalk.red(`✖ Source path for ${config.source} contracts not found.`));
    process.exit(1);
  }

  const sourceContractsPath = join(sourcePath, 'src');
  const sourceLibPath = join(sourcePath, 'lib');
  const sourceInputPath = join(sourcePath, 'input');

  console.log(chalk.blue(`\nSyncing from: ${chalk.green(config.source === 'testnet' ? 'Testnet-Contracts' : 'Playground-Contracts')}\n`));

  // Sync to Foundry
  if (config.framework === 'foundry' || config.framework === 'both') {
    await syncToFoundry(sourceContractsPath, sourceLibPath, sourceInputPath);
  }

  // Sync to Hardhat
  if (config.framework === 'hardhat' || config.framework === 'both') {
    await syncToHardhat(sourceContractsPath);
  }

  // Update scaffold config
  const configPath = join(PROJECT_ROOT, 'scaffold.config.json');
  let existingConfig = {};
  if (existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      // Use empty
    }
  }

  writeFileSync(configPath, JSON.stringify({
    ...existingConfig,
    contractSource: config.source,
    syncedAt: new Date().toISOString()
  }, null, 2));

  console.log(chalk.green('\n✓ Contracts synced successfully!\n'));
  console.log(chalk.yellow('Next steps:'));

  if (config.framework === 'foundry' || config.framework === 'both') {
    console.log(chalk.gray('  Foundry: cd packages/foundry && forge build --via-ir'));
  }
  if (config.framework === 'hardhat' || config.framework === 'both') {
    console.log(chalk.gray('  Hardhat: cd packages/hardhat && npx hardhat compile'));
  }

  console.log('');
}

/**
 * Sync contracts to Foundry package
 */
async function syncToFoundry(sourceContracts: string, sourceLib: string, sourceInput: string): Promise<void> {
  const foundryDir = join(PROJECT_ROOT, 'packages', 'foundry');

  console.log(chalk.yellow('Syncing to Foundry package...'));

  // Create directories if needed
  if (!existsSync(foundryDir)) {
    mkdirSync(foundryDir, { recursive: true });
  }

  // Clear existing contracts
  const contractsDir = join(foundryDir, 'contracts');
  if (existsSync(contractsDir)) {
    rmSync(contractsDir, { recursive: true, force: true });
  }

  // Copy contracts
  if (existsSync(sourceContracts)) {
    cpSync(sourceContracts, contractsDir, { recursive: true });
    console.log(chalk.green('  ✓ Copied contracts/'));
  }

  // Sync lib directory (symlink or copy)
  const libDir = join(foundryDir, 'lib');
  if (!existsSync(libDir)) {
    mkdirSync(libDir, { recursive: true });
  }

  // Copy all essential lib folders if they exist in source
  // This includes forge dependencies and cross-chain libraries
  const essentialLibs = [
    'forge-std',
    'openzeppelin-contracts',
    'openzeppelin-contracts-upgradeable',  // Used by Playground-Contracts
    'solady',
    'solidity-bytes-utils',
    // Cross-chain dependencies
    'axelar-gmp-sdk-solidity',
    'devtools',           // LayerZero oapp-evm
    'LayerZero-v2',       // LayerZero protocol
    // Uniswap (if present)
    'v3-core',
    'v3-periphery'
  ];

  // Check if we need to use fallback lib (Testnet libs for Playground if submodules are empty)
  const fallbackLibPath = TESTNET_CONTRACTS_PATH ? join(TESTNET_CONTRACTS_PATH, 'lib') : null;

  for (const lib of essentialLibs) {
    const srcLib = join(sourceLib, lib);
    const dstLib = join(libDir, lib);

    // Check if source lib exists and is not empty (submodule might be uninitialized)
    const srcLibExists = existsSync(srcLib);
    const srcLibHasContent = srcLibExists && readdirSync(srcLib).length > 0;

    if (srcLibHasContent && !existsSync(dstLib)) {
      try {
        // Try symlink first for efficiency
        symlinkSync(srcLib, dstLib, 'dir');
        console.log(chalk.green(`  ✓ Linked lib/${lib}`));
      } catch {
        // Fall back to copy
        cpSync(srcLib, dstLib, { recursive: true });
        console.log(chalk.green(`  ✓ Copied lib/${lib}`));
      }
    } else if (!srcLibHasContent && fallbackLibPath && !existsSync(dstLib)) {
      // Source lib is empty (uninitialized submodule), try fallback
      const fallbackLib = join(fallbackLibPath, lib);
      if (existsSync(fallbackLib) && readdirSync(fallbackLib).length > 0) {
        try {
          symlinkSync(fallbackLib, dstLib, 'dir');
          console.log(chalk.yellow(`  ✓ Linked lib/${lib} (from Testnet fallback)`));
        } catch {
          cpSync(fallbackLib, dstLib, { recursive: true });
          console.log(chalk.yellow(`  ✓ Copied lib/${lib} (from Testnet fallback)`));
        }
      } else {
        console.log(chalk.red(`  ✖ lib/${lib} not found in source or fallback`));
      }
    } else if (existsSync(dstLib)) {
      console.log(chalk.gray(`  · lib/${lib} already exists`));
    }
  }

  // Copy node_modules for Hyperlane (requires npm packages)
  const sourceNodeModules = join(dirname(sourceContracts), 'node_modules');
  const targetNodeModules = join(foundryDir, 'node_modules');
  const fallbackNodeModules = TESTNET_CONTRACTS_PATH ? join(TESTNET_CONTRACTS_PATH, 'node_modules') : null;

  // Only copy specific packages we need
  const requiredNodeModules = ['@hyperlane-xyz'];

  for (const pkg of requiredNodeModules) {
    const srcPkg = join(sourceNodeModules, pkg);
    const dstPkg = join(targetNodeModules, pkg);
    const fallbackPkg = fallbackNodeModules ? join(fallbackNodeModules, pkg) : null;

    if (!existsSync(dstPkg)) {
      if (!existsSync(targetNodeModules)) {
        mkdirSync(targetNodeModules, { recursive: true });
      }

      // Try source first, then fallback
      let linkedFrom: string | null = null;
      if (existsSync(srcPkg)) {
        try {
          symlinkSync(srcPkg, dstPkg, 'dir');
          linkedFrom = 'source';
        } catch {
          cpSync(srcPkg, dstPkg, { recursive: true });
          linkedFrom = 'source (copied)';
        }
      } else if (fallbackPkg && existsSync(fallbackPkg)) {
        try {
          symlinkSync(fallbackPkg, dstPkg, 'dir');
          linkedFrom = 'Testnet fallback';
        } catch {
          cpSync(fallbackPkg, dstPkg, { recursive: true });
          linkedFrom = 'Testnet fallback (copied)';
        }
      }

      if (linkedFrom) {
        const color = linkedFrom.includes('fallback') ? chalk.yellow : chalk.green;
        console.log(color(`  ✓ Linked node_modules/${pkg} (from ${linkedFrom})`));
      } else {
        console.log(chalk.gray(`  · node_modules/${pkg} not found (cross-chain features may not work)`));
      }
    } else {
      console.log(chalk.gray(`  · node_modules/${pkg} already exists`));
    }
  }

  // Copy input directory if present (for deployment config)
  const inputDir = join(foundryDir, 'input');
  if (existsSync(sourceInput)) {
    if (!existsSync(inputDir)) {
      mkdirSync(inputDir, { recursive: true });
    }
    // Copy all config files (both .json and .sol)
    for (const file of readdirSync(sourceInput)) {
      if (file.endsWith('.json') || file.endsWith('.sol')) {
        cpSync(join(sourceInput, file), join(inputDir, file));
      }
    }
    console.log(chalk.green('  ✓ Copied input/ config files'));
  }

  // Copy deployment scripts
  const sourceScriptDir = join(dirname(sourceContracts), 'script');
  const targetScriptDir = join(foundryDir, 'script');
  if (existsSync(sourceScriptDir)) {
    if (!existsSync(targetScriptDir)) {
      mkdirSync(targetScriptDir, { recursive: true });
    }
    cpSync(sourceScriptDir, targetScriptDir, { recursive: true });
    console.log(chalk.green('  ✓ Copied script/'));
  }
}

/**
 * Sync contracts to Hardhat package
 */
async function syncToHardhat(sourceContracts: string): Promise<void> {
  const hardhatDir = join(PROJECT_ROOT, 'packages', 'hardhat');

  console.log(chalk.yellow('Syncing to Hardhat package...'));

  // Create directories if needed
  if (!existsSync(hardhatDir)) {
    mkdirSync(hardhatDir, { recursive: true });
  }

  // Clear existing contracts
  const contractsDir = join(hardhatDir, 'contracts');
  if (existsSync(contractsDir)) {
    rmSync(contractsDir, { recursive: true, force: true });
  }

  // Copy contracts
  if (existsSync(sourceContracts)) {
    cpSync(sourceContracts, contractsDir, { recursive: true });
    console.log(chalk.green('  ✓ Copied contracts/'));
  }

  // Note: Hardhat will use npm packages for OpenZeppelin, etc.
  console.log(chalk.gray('  Note: Hardhat uses npm for @openzeppelin/contracts'));
}

// Run main
main().catch((err) => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

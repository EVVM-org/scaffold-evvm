/**
 * Project initialization command
 *
 * Guides users through:
 * 1. Framework selection (Foundry vs Hardhat)
 * 2. Contract source selection (Testnet vs Playground)
 * 3. EVVM configuration (addresses, metadata)
 */

import { existsSync, mkdirSync, writeFileSync, cpSync, symlinkSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';
import chalk from 'chalk';
import { execa } from 'execa';
import { sectionHeader, success, warning, error, info, dim, divider, evvmGreen } from '../utils/display.js';
import { commandExists, checkSubmodules, initializeSubmodules } from '../utils/prerequisites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface ProjectConfig {
  framework: 'foundry' | 'hardhat';
  contractSource: 'testnet' | 'playground';
  addresses: {
    admin: string;
    goldenFisher: string;
    activator: string;
  };
  basicMetadata: {
    EvvmName: string;
    principalTokenName: string;
    principalTokenSymbol: string;
  };
  advancedMetadata: {
    totalSupply: string;
    eraTokens: string;
    reward: string;
  };
}

// Validation
function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function validateNumber(value: string): boolean {
  return /^[0-9]+$/.test(value);
}

/**
 * Main init command
 */
export async function initProject(): Promise<void> {
  sectionHeader('Project Initialization');

  const projectRoot = process.cwd();

  // Step 1: Select framework
  const frameworkResponse = await prompts({
    type: 'select',
    name: 'framework',
    message: 'Select your smart contract framework:',
    choices: [
      {
        title: 'Foundry',
        value: 'foundry',
        description: 'Fast, Solidity-native testing with Forge (recommended)'
      },
      {
        title: 'Hardhat',
        value: 'hardhat',
        description: 'JavaScript/TypeScript ecosystem with plugins'
      }
    ]
  });

  if (!frameworkResponse.framework) {
    error('Initialization cancelled.');
    return;
  }

  // Check framework availability
  if (frameworkResponse.framework === 'foundry') {
    const hasForge = await commandExists('forge');
    if (!hasForge) {
      warning('Foundry not installed. Install it from: https://getfoundry.sh/');
      const proceed = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Continue anyway? (You can install Foundry later)',
        initial: false
      });
      if (!proceed.value) return;
    }
  }

  // Step 2: Select contract source
  const contractResponse = await prompts({
    type: 'select',
    name: 'contractSource',
    message: 'Select contract source:',
    choices: [
      {
        title: 'Testnet Contracts',
        value: 'testnet',
        description: 'Production-ready contracts for testnet deployment'
      },
      {
        title: 'Playground Contracts',
        value: 'playground',
        description: 'Experimental contracts for prototyping and testing'
      }
    ]
  });

  if (!contractResponse.contractSource) {
    error('Initialization cancelled.');
    return;
  }

  // Step 3: Configure EVVM addresses
  sectionHeader('Administrator Configuration');

  info('Configure the admin addresses for your EVVM instance.');
  dim('These addresses will have special privileges in the system.\n');

  const admin = await promptAddress('Admin address (0x...):');
  const goldenFisher = await promptAddress('Golden Fisher address (0x...):');
  const activator = await promptAddress('Activator address (0x...):');

  // Step 4: Configure EVVM metadata
  sectionHeader('EVVM Metadata Configuration');

  const basicMetadataResponse = await prompts([
    {
      type: 'text',
      name: 'EvvmName',
      message: `EVVM Name ${chalk.gray('[EVVM]')}:`,
      initial: 'EVVM'
    },
    {
      type: 'text',
      name: 'principalTokenName',
      message: `Principal Token Name ${chalk.gray('[Mate token]')}:`,
      initial: 'Mate token'
    },
    {
      type: 'text',
      name: 'principalTokenSymbol',
      message: `Principal Token Symbol ${chalk.gray('[MATE]')}:`,
      initial: 'MATE'
    }
  ]);

  if (!basicMetadataResponse.EvvmName) {
    error('Initialization cancelled.');
    return;
  }

  // Step 5: Advanced configuration (optional)
  sectionHeader('Advanced Configuration (Optional)');

  const configAdvanced = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Configure advanced metadata (supply, rewards)?',
    initial: false
  });

  let advancedMetadata = {
    totalSupply: '2033333333000000000000000000',
    eraTokens: '1016666666500000000000000000',
    reward: '5000000000000000000'
  };

  if (configAdvanced.value) {
    const totalSupply = await promptNumber(
      `Total Supply ${chalk.gray('[2033333333000000000000000000]')}:`,
      '2033333333000000000000000000'
    );
    const eraTokens = await promptNumber(
      `Era Tokens ${chalk.gray('[1016666666500000000000000000]')}:`,
      '1016666666500000000000000000'
    );
    const reward = await promptNumber(
      `Reward per operation ${chalk.gray('[5000000000000000000]')}:`,
      '5000000000000000000'
    );
    advancedMetadata = { totalSupply, eraTokens, reward };
  } else {
    dim('Using default advanced values.');
  }

  // Build configuration object
  const config: ProjectConfig = {
    framework: frameworkResponse.framework,
    contractSource: contractResponse.contractSource,
    addresses: { admin, goldenFisher, activator },
    basicMetadata: basicMetadataResponse,
    advancedMetadata
  };

  // Display summary
  displayConfigSummary(config);

  const confirmResponse = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Proceed with this configuration?',
    initial: true
  });

  if (!confirmResponse.value) {
    error('Initialization cancelled.');
    return;
  }

  // Execute initialization
  await executeInit(config, projectRoot);
}

/**
 * Prompt for Ethereum address with validation
 */
async function promptAddress(message: string): Promise<string> {
  const response = await prompts({
    type: 'text',
    name: 'value',
    message,
    validate: (value) =>
      validateAddress(value)
        ? true
        : 'Invalid address. Must be 0x + 40 hex characters'
  });

  if (!response.value) {
    error('Configuration cancelled.');
    process.exit(1);
  }

  return response.value;
}

/**
 * Prompt for number with validation
 */
async function promptNumber(message: string, initial: string): Promise<string> {
  const response = await prompts({
    type: 'text',
    name: 'value',
    message,
    initial,
    validate: (value) => (validateNumber(value) ? true : 'Must be a valid number')
  });

  if (response.value === undefined) {
    error('Configuration cancelled.');
    process.exit(1);
  }

  return response.value;
}

/**
 * Display configuration summary
 */
function displayConfigSummary(config: ProjectConfig): void {
  divider();
  console.log(chalk.cyan('                    CONFIGURATION SUMMARY'));
  divider();

  console.log(chalk.yellow('Framework:'), chalk.green(config.framework.toUpperCase()));
  console.log(chalk.yellow('Contracts:'), chalk.green(config.contractSource === 'testnet' ? 'Testnet Contracts' : 'Playground Contracts'));

  console.log(chalk.yellow('\nAddresses:'));
  console.log(`  Admin:         ${chalk.green(config.addresses.admin)}`);
  console.log(`  Golden Fisher: ${chalk.green(config.addresses.goldenFisher)}`);
  console.log(`  Activator:     ${chalk.green(config.addresses.activator)}`);

  console.log(chalk.yellow('\nEVVM Metadata:'));
  console.log(`  Name:          ${chalk.green(config.basicMetadata.EvvmName)}`);
  console.log(`  Token Name:    ${chalk.green(config.basicMetadata.principalTokenName)}`);
  console.log(`  Token Symbol:  ${chalk.green(config.basicMetadata.principalTokenSymbol)}`);

  console.log(chalk.yellow('\nAdvanced:'));
  console.log(`  Total Supply:  ${chalk.green(config.advancedMetadata.totalSupply)}`);
  console.log(`  Era Tokens:    ${chalk.green(config.advancedMetadata.eraTokens)}`);
  console.log(`  Reward:        ${chalk.green(config.advancedMetadata.reward)}`);

  divider();
}

/**
 * Execute the initialization
 */
async function executeInit(config: ProjectConfig, projectRoot: string): Promise<void> {
  console.log(chalk.blue('\n🚀 Initializing project...\n'));

  // Create necessary directories
  const packagesDir = join(projectRoot, 'packages');
  const inputDir = join(projectRoot, 'input');

  if (!existsSync(packagesDir)) {
    mkdirSync(packagesDir, { recursive: true });
  }
  if (!existsSync(inputDir)) {
    mkdirSync(inputDir, { recursive: true });
  }

  // Write configuration files
  await writeConfigFiles(config, inputDir);

  // Set up framework package
  if (config.framework === 'foundry') {
    await setupFoundryPackage(config, projectRoot);
  } else {
    await setupHardhatPackage(config, projectRoot);
  }

  // Write project config
  const scaffoldConfigPath = join(projectRoot, 'scaffold.config.json');
  writeFileSync(scaffoldConfigPath, JSON.stringify({
    framework: config.framework,
    contractSource: config.contractSource,
    initialized: true,
    timestamp: new Date().toISOString()
  }, null, 2));

  // Create/update .env file
  await createEnvFile(projectRoot);

  divider();
  console.log(evvmGreen('✓ Project initialized successfully!\n'));

  console.log(chalk.yellow('Next steps:'));
  console.log(chalk.gray('  1. Review and update .env file with your configuration'));
  console.log(chalk.gray('  2. Run "npm install" to install dependencies'));
  console.log(chalk.gray(`  3. Run "npm run ${config.framework}:chain" to start local blockchain`));
  console.log(chalk.gray(`  4. Run "npm run ${config.framework}:deploy" to deploy contracts`));
  console.log(chalk.gray('  5. Run "npm run dev" to start the frontend'));

  divider();
}

/**
 * Write EVVM configuration files
 */
async function writeConfigFiles(config: ProjectConfig, inputDir: string): Promise<void> {
  info('Writing configuration files...');

  // address.json
  writeFileSync(
    join(inputDir, 'address.json'),
    JSON.stringify(config.addresses, null, 2) + '\n'
  );

  // evvmBasicMetadata.json
  writeFileSync(
    join(inputDir, 'evvmBasicMetadata.json'),
    JSON.stringify(config.basicMetadata, null, 2) + '\n'
  );

  // evvmAdvancedMetadata.json (alphabetical order for Foundry)
  const advancedContent = `{
  "eraTokens": ${config.advancedMetadata.eraTokens},
  "reward": ${config.advancedMetadata.reward},
  "totalSupply": ${config.advancedMetadata.totalSupply}
}
`;
  writeFileSync(join(inputDir, 'evvmAdvancedMetadata.json'), advancedContent);

  success('Configuration files written to input/');
}

/**
 * Set up Foundry package
 */
async function setupFoundryPackage(config: ProjectConfig, projectRoot: string): Promise<void> {
  info('Setting up Foundry package...');

  const foundryDir = join(projectRoot, 'packages', 'foundry');

  if (!existsSync(foundryDir)) {
    mkdirSync(foundryDir, { recursive: true });
  }

  // Create foundry package.json
  const foundryPackageJson = {
    name: '@scaffold-evvm/foundry',
    version: '1.0.0',
    type: 'module',
    scripts: {
      chain: 'anvil --block-time 10',
      compile: 'forge build --via-ir',
      test: 'forge test -vvv',
      deploy: 'node scripts/deploy.js',
      'deploy:local': 'forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --via-ir',
      format: 'forge fmt',
      clean: 'forge clean'
    },
    dependencies: {
      dotenv: '^16.4.5',
      viem: '^2.39.0'
    }
  };

  writeFileSync(
    join(foundryDir, 'package.json'),
    JSON.stringify(foundryPackageJson, null, 2) + '\n'
  );

  // Create foundry.toml
  const foundryToml = `[profile.default]
src = "contracts"
out = "out"
libs = ["lib"]
remappings = [
    '@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/',
    '@evvm/=contracts/',
]
optimizer_runs = 300
via_ir = true
fs_permissions = [{ access = "read", path = "./input" }, { access = "read", path = "../input" }]

[fmt]
line_length = 120
tab_width = 4
quote_style = "double"

# See more config options https://book.getfoundry.sh/reference/config/
`;

  writeFileSync(join(foundryDir, 'foundry.toml'), foundryToml);

  // Create directory structure
  mkdirSync(join(foundryDir, 'contracts'), { recursive: true });
  mkdirSync(join(foundryDir, 'script'), { recursive: true });
  mkdirSync(join(foundryDir, 'test'), { recursive: true });

  // Note about contract sync
  dim('  Contracts will be synced from ' + config.contractSource);

  success('Foundry package created');
}

/**
 * Set up Hardhat package
 */
async function setupHardhatPackage(config: ProjectConfig, projectRoot: string): Promise<void> {
  info('Setting up Hardhat package...');

  const hardhatDir = join(projectRoot, 'packages', 'hardhat');

  if (!existsSync(hardhatDir)) {
    mkdirSync(hardhatDir, { recursive: true });
  }

  // Create hardhat package.json
  const hardhatPackageJson = {
    name: '@scaffold-evvm/hardhat',
    version: '1.0.0',
    scripts: {
      chain: 'hardhat node --no-deploy',
      compile: 'hardhat compile',
      test: 'hardhat test',
      deploy: 'ts-node scripts/deploy.ts',
      'deploy:local': 'hardhat deploy --network localhost',
      clean: 'hardhat clean'
    },
    dependencies: {
      '@openzeppelin/contracts': '^5.0.0',
      dotenv: '^16.4.5'
    },
    devDependencies: {
      '@nomicfoundation/hardhat-toolbox': '^5.0.0',
      '@nomicfoundation/hardhat-foundry': '^1.1.0',
      hardhat: '^2.22.0',
      'hardhat-deploy': '^0.12.0',
      'ts-node': '^10.9.0',
      typescript: '^5.3.0'
    }
  };

  writeFileSync(
    join(hardhatDir, 'package.json'),
    JSON.stringify(hardhatPackageJson, null, 2) + '\n'
  );

  // Create hardhat.config.ts
  const hardhatConfig = `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 300,
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: process.env.RPC_URL_ETH_SEPOLIA || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
    arbitrumSepolia: {
      url: process.env.RPC_URL_ARB_SEPOLIA || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};

export default config;
`;

  writeFileSync(join(hardhatDir, 'hardhat.config.ts'), hardhatConfig);

  // Create directory structure
  mkdirSync(join(hardhatDir, 'contracts'), { recursive: true });
  mkdirSync(join(hardhatDir, 'deploy'), { recursive: true });
  mkdirSync(join(hardhatDir, 'scripts'), { recursive: true });
  mkdirSync(join(hardhatDir, 'test'), { recursive: true });

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'es2020',
      module: 'commonjs',
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      resolveJsonModule: true
    }
  };

  writeFileSync(
    join(hardhatDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2) + '\n'
  );

  success('Hardhat package created');
}

/**
 * Create or update .env file
 */
async function createEnvFile(projectRoot: string): Promise<void> {
  const envPath = join(projectRoot, '.env');
  const envExamplePath = join(projectRoot, '.env.example');

  const envContent = `# Scaffold-EVVM Environment Configuration
# Copy this file to .env and update with your values

# =============================================================================
# FRONTEND CONFIGURATION
# =============================================================================

# WalletConnect Project ID (get one at https://cloud.reown.com)
NEXT_PUBLIC_PROJECT_ID=

# EVVM Contract Address (set after deployment)
NEXT_PUBLIC_EVVM_ADDRESS=

# Chain ID: 11155111 (Ethereum Sepolia) or 421614 (Arbitrum Sepolia)
NEXT_PUBLIC_CHAIN_ID=11155111

# EVVM Instance ID (optional, set after registry registration)
NEXT_PUBLIC_EVVM_ID=

# =============================================================================
# DEPLOYMENT CONFIGURATION
# =============================================================================

# RPC URLs
RPC_URL_ETH_SEPOLIA=https://1rpc.io/sepolia
RPC_URL_ARB_SEPOLIA=https://sepolia-rollup.arbitrum.io/rpc

# Etherscan API Key (for contract verification)
ETHERSCAN_API=

# Deployer Private Key (for Hardhat - Foundry uses keystore)
# WARNING: Never commit this with a real key!
DEPLOYER_PRIVATE_KEY=
`;

  if (!existsSync(envPath)) {
    writeFileSync(envPath, envContent);
    success('.env file created');
  } else {
    dim('.env file already exists, skipping');
  }

  writeFileSync(envExamplePath, envContent);
  success('.env.example file updated');
}

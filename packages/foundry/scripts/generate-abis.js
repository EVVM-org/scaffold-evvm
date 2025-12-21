#!/usr/bin/env node

/**
 * Generate ABI files for frontend integration
 *
 * Extracts ABIs from Foundry's out/ directory and creates
 * TypeScript files for the frontend package.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Contract names to extract
const CONTRACTS = [
  'Evvm',
  'Staking',
  'Estimator',
  'NameService',
  'Treasury',
  'P2PSwap'
];

// Paths
const foundryOutDir = join(__dirname, '..', 'out');
const frontendContractsDir = join(__dirname, '..', '..', 'nextjs', 'src', 'contracts');

/**
 * Find ABI file for a contract
 */
function findContractAbi(contractName) {
  const contractDir = join(foundryOutDir, `${contractName}.sol`);

  if (!existsSync(contractDir)) {
    console.log(`  ⚠ Contract directory not found: ${contractName}.sol`);
    return null;
  }

  const abiFile = join(contractDir, `${contractName}.json`);

  if (!existsSync(abiFile)) {
    console.log(`  ⚠ ABI file not found: ${contractName}.json`);
    return null;
  }

  try {
    const content = JSON.parse(readFileSync(abiFile, 'utf-8'));
    return content.abi || null;
  } catch (err) {
    console.log(`  ⚠ Error reading ABI: ${err.message}`);
    return null;
  }
}

/**
 * Generate TypeScript ABI file
 */
function generateTypeScriptAbi(contractName, abi) {
  return `/**
 * ${contractName} Contract ABI
 * Auto-generated from Foundry build output
 */

export const ${contractName}Abi = ${JSON.stringify(abi, null, 2)} as const;
`;
}

/**
 * Generate index file
 */
function generateIndexFile(contracts) {
  const exports = contracts.map(c => `export { ${c}Abi } from './${c}Abi.js';`);

  return `/**
 * EVVM Contract ABIs
 * Auto-generated from Foundry build output
 */

${exports.join('\n')}

// Deployed contract addresses type
export interface DeployedContracts {
  evvm: \`0x\${string}\`;
  staking: \`0x\${string}\`;
  estimator: \`0x\${string}\`;
  nameService: \`0x\${string}\`;
  treasury: \`0x\${string}\`;
  p2pSwap?: \`0x\${string}\`;
  chainId: number;
}
`;
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Generating ABIs for frontend...\n');

  // Check if out directory exists
  if (!existsSync(foundryOutDir)) {
    console.log('⚠ Foundry out/ directory not found. Run "forge build" first.\n');
    process.exit(1);
  }

  // Create frontend contracts directory
  if (!existsSync(frontendContractsDir)) {
    mkdirSync(frontendContractsDir, { recursive: true });
  }

  const generatedContracts = [];

  // Extract ABIs
  for (const contractName of CONTRACTS) {
    const abi = findContractAbi(contractName);

    if (abi) {
      const tsContent = generateTypeScriptAbi(contractName, abi);
      const outputPath = join(frontendContractsDir, `${contractName}Abi.ts`);
      writeFileSync(outputPath, tsContent);
      console.log(`  ✓ ${contractName}Abi.ts`);
      generatedContracts.push(contractName);
    }
  }

  // Generate index file
  if (generatedContracts.length > 0) {
    const indexContent = generateIndexFile(generatedContracts);
    writeFileSync(join(frontendContractsDir, 'index.ts'), indexContent);
    console.log(`  ✓ index.ts`);
  }

  console.log(`\n✓ Generated ${generatedContracts.length} ABI files\n`);
}

main();

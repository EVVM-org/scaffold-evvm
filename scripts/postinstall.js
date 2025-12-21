#!/usr/bin/env node

/**
 * Post-install script
 * Creates necessary directories and copies example files
 */

import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Create directories
const directories = [
  'input',
  'packages/foundry/contracts',
  'packages/foundry/script',
  'packages/foundry/test',
  'packages/foundry/lib',
  'packages/hardhat/contracts',
  'packages/hardhat/deploy',
  'packages/hardhat/test',
];

for (const dir of directories) {
  const fullPath = join(projectRoot, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${dir}`);
  }
}

// Copy .env.example if .env doesn't exist
const envExample = join(projectRoot, '.env.example');
const envFile = join(projectRoot, '.env');

if (existsSync(envExample) && !existsSync(envFile)) {
  copyFileSync(envExample, envFile);
  console.log('Created .env from .env.example');
}

console.log('\nScaffold-EVVM installed successfully!');
console.log('Run "npm run wizard" to get started.\n');

#!/usr/bin/env node

/**
 * Validation Script for EVVM Configuration
 * 
 * This script runs during Next.js startup and validates that:
 * 1. The .env file exists and contains required variables
 * 2. EVVM is properly configured (or provides helpful guidance)
 * 
 * Usage: Automatically runs via postinstall or can be called manually
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the root project directory (scaffold-evvm)
const rootDir = path.resolve(__dirname, '..', '..', '..');
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

const REQUIRED_VARS = [
  'NEXT_PUBLIC_EVVM_ADDRESS',
  'NEXT_PUBLIC_CHAIN_ID',
];

const RECOMMENDED_VARS = [
  'NEXT_PUBLIC_PROJECT_ID',
  'NEXT_PUBLIC_STAKING_ADDRESS',
  'NEXT_PUBLIC_ESTIMATOR_ADDRESS',
];

function loadEnvFile(filePath: string): Map<string, string> {
  const vars = new Map<string, string>();

  if (!fs.existsSync(filePath)) {
    return vars;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) continue;

      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        vars.set(key.trim(), cleanValue);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error);
  }

  return vars;
}

function validateConfig() {
  console.log('\n📋 Validating EVVM Configuration...\n');

  const envVars = loadEnvFile(envPath);

  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  .env file not found at', envPath);
    console.log('   Create it by running: cp .env.example .env');
    console.log();
  }

  // Check required variables
  let missingRequired = false;
  const missing: string[] = [];

  for (const varName of REQUIRED_VARS) {
    const value = envVars.get(varName);
    if (!value) {
      missing.push(varName);
      missingRequired = true;
    } else {
      console.log(`✅ ${varName}=${value}`);
    }
  }

  if (missingRequired) {
    console.log();
    console.error('❌ Missing required configuration:');
    for (const varName of missing) {
      console.error(`   - ${varName}`);
    }
    console.log();
    console.log('📝 Configuration Instructions:');
    console.log('   1. Copy template: cp .env.example .env');
    console.log('   2. Edit .env with your EVVM deployment details');
    console.log('   3. Set NEXT_PUBLIC_EVVM_ADDRESS and NEXT_PUBLIC_CHAIN_ID');
    console.log();
    console.log('🔗 To deploy EVVM, run in the contracts directory:');
    console.log('   npm run wizard');
    console.log();
  }

  // Check recommended variables
  console.log();
  const missingRecommended = RECOMMENDED_VARS.filter((v) => !envVars.get(v));
  if (missingRecommended.length > 0) {
    console.log('ℹ️  Optional configuration (not set):');
    for (const varName of missingRecommended) {
      console.log(`   - ${varName}`);
    }
    console.log();
  }

  // Summary
  console.log('✨ Configuration validation complete!');
  if (!missingRequired) {
    console.log('✅ EVVM appears to be properly configured.');
  }
  console.log();

  return !missingRequired;
}

// Run validation
const isValid = validateConfig();
process.exit(isValid ? 0 : 1);

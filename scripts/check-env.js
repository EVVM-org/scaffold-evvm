#!/usr/bin/env node
/**
 * Environment Variables Validation Script
 *
 * This script checks that all required environment variables are set before running the dev server.
 * Run automatically by: npm run dev
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');

  if (!fs.existsSync(envPath)) {
    log('\n✗ ERROR: .env file not found!', 'red');
    log('\nPlease create a .env file in the project root:', 'yellow');
    log('  cp .env.example .env', 'cyan');
    log('\nThen configure the required variables.\n', 'yellow');
    process.exit(1);
  }

  // Read .env file
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  // Parse .env file
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  // Required variables
  const required = [
    {
      key: 'NEXT_PUBLIC_PROJECT_ID',
      name: 'Reown Project ID',
      help: 'Get from: https://cloud.reown.com',
    },
    {
      key: 'NEXT_PUBLIC_EVVM_ADDRESS',
      name: 'EVVM Contract Address',
      help: 'The address of your deployed EVVM contract',
    },
    {
      key: 'NEXT_PUBLIC_CHAIN_ID',
      name: 'Chain ID',
      help: '11155111 (Sepolia), 421614 (Arbitrum Sepolia), or custom',
    },
  ];

  let hasErrors = false;
  const missing = [];
  const empty = [];

  log('\n📋 Checking environment variables...', 'blue');

  for (const { key, name, help } of required) {
    if (!envVars[key]) {
      missing.push({ key, name, help });
      hasErrors = true;
    } else if (
      envVars[key] === '' ||
      envVars[key].includes('your_') ||
      envVars[key].includes('_here')
    ) {
      empty.push({ key, name, help });
      hasErrors = true;
    } else {
      // Mask sensitive values for display
      let displayValue = envVars[key];
      if (key.includes('PROJECT_ID')) {
        displayValue = envVars[key].substring(0, 10) + '...';
      } else if (key.includes('ADDRESS')) {
        displayValue =
          envVars[key].substring(0, 6) + '...' + envVars[key].substring(envVars[key].length - 4);
      }
      log(`  ✓ ${name}: ${displayValue}`, 'green');
    }
  }

  if (missing.length > 0) {
    log('\n✗ Missing required environment variables:', 'red');
    missing.forEach(({ key, name, help }) => {
      log(`\n  ${key}`, 'yellow');
      log(`    ${name}`, 'cyan');
      log(`    ${help}`, 'cyan');
    });
  }

  if (empty.length > 0) {
    log('\n✗ Environment variables are set but empty or have placeholder values:', 'red');
    empty.forEach(({ key, name, help }) => {
      log(`\n  ${key}`, 'yellow');
      log(`    ${name}`, 'cyan');
      log(`    ${help}`, 'cyan');
    });
  }

  if (hasErrors) {
    log('\n📝 Please update your .env file with the correct values.', 'yellow');
    log('See .env.example for reference.\n', 'yellow');
    process.exit(1);
  }

  log('\n✓ All required environment variables are set!', 'green');
  log('Starting development server...\n', 'cyan');
}

// Run check
try {
  checkEnvFile();
} catch (error) {
  log(`\n✗ Error checking environment: ${error.message}`, 'red');
  process.exit(1);
}

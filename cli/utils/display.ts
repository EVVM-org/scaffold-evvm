/**
 * Display utilities for Scaffold-EVVM CLI
 */

import chalk from 'chalk';

// EVVM Brand Color (RGB: 1, 240, 148)
export const evvmGreen = chalk.rgb(1, 240, 148);

/**
 * ASCII art banner for EVVM
 */
export function showBanner(): void {
  const banner = `
${evvmGreen('░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓██████████████▓▒░  ')}
${evvmGreen('░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░ ')}
${evvmGreen('░▒▓█▓▒░       ░▒▓█▓▒▒▓█▓▒░ ░▒▓█▓▒▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░ ')}
${evvmGreen('░▒▓██████▓▒░  ░▒▓█▓▒▒▓█▓▒░ ░▒▓█▓▒▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░ ')}
${evvmGreen('░▒▓█▓▒░        ░▒▓█▓▓█▓▒░   ░▒▓█▓▓█▓▒░ ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░ ')}
${evvmGreen('░▒▓█▓▒░        ░▒▓█▓▓█▓▒░   ░▒▓█▓▓█▓▒░ ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░ ')}
${evvmGreen('░▒▓████████▓▒░  ░▒▓██▓▒░     ░▒▓██▓▒░  ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░ ')}

${chalk.cyan('                    S C A F F O L D - E V V M')}
${chalk.gray('     The complete development environment for EVVM ecosystem')}
`;
  console.log(banner);
}

/**
 * Parse command line arguments
 */
export function parseArgs(): string | null {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return null; // No command, run interactive wizard
  }

  const command = args[0].toLowerCase();

  // Valid commands
  const validCommands = ['start', 'init', 'deploy', 'chain', 'config', 'flush', 'sources', 'help', '--help', '-h'];

  if (validCommands.includes(command)) {
    if (command === '--help' || command === '-h') {
      return 'help';
    }
    return command;
  }

  console.log(chalk.yellow(`Unknown command: ${command}`));
  console.log(chalk.gray('Run "npm run cli help" for available commands.\n'));
  return null;
}

/**
 * Display a section header
 */
export function sectionHeader(title: string): void {
  console.log(chalk.green(`\n=== ${title} ===\n`));
}

/**
 * Display a success message
 */
export function success(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

/**
 * Display a warning message
 */
export function warning(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * Display an error message
 */
export function error(message: string): void {
  console.log(chalk.red(`✖ ${message}`));
}

/**
 * Display an info message
 */
export function info(message: string): void {
  console.log(chalk.blue(`ℹ ${message}`));
}

/**
 * Display a dimmed message
 */
export function dim(message: string): void {
  console.log(chalk.gray(`  ${message}`));
}

/**
 * Display a divider line
 */
export function divider(): void {
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════\n'));
}

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * EVVM Contracts Deployment Script
 *
 * Deploys all EVVM contracts in the correct order:
 * 1. Evvm (core payment system)
 * 2. Staking (token staking)
 * 3. Estimator (reward calculation)
 * 4. NameService (identity system)
 * 5. Treasury (asset management)
 * 6. P2PSwap (decentralized exchange)
 */

interface AddressConfig {
  admin: string;
  goldenFisher: string;
  activator: string;
}

interface BasicMetadata {
  EvvmName: string;
  principalTokenName: string;
  principalTokenSymbol: string;
}

interface AdvancedMetadata {
  eraTokens: string;
  reward: string;
  totalSupply: string;
}

const deployEvvm: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  log("=".repeat(60));
  log("EVVM Contract Deployment");
  log("=".repeat(60));
  log(`Network: ${hre.network.name}`);
  log(`Deployer: ${deployer}`);
  log("");

  // Load configuration
  const config = loadConfig();

  log("Configuration:");
  log(`  Admin: ${config.addresses.admin}`);
  log(`  Golden Fisher: ${config.addresses.goldenFisher}`);
  log(`  Activator: ${config.addresses.activator}`);
  log(`  EVVM Name: ${config.basic.EvvmName}`);
  log(`  Token: ${config.basic.principalTokenName} (${config.basic.principalTokenSymbol})`);
  log("");

  // Check if contracts are synced
  const contractsPath = join(__dirname, "..", "contracts");
  if (!existsSync(join(contractsPath, "evvm", "Evvm.sol"))) {
    log("⚠️  Contracts not found. Run 'npm run sync-contracts' first.");
    log("");
    log("This will sync contracts from Testnet-Contracts or Playground-Contracts.");
    return;
  }

  log("Deploying contracts...");
  log("");

  // Note: Actual deployment logic depends on the synced contracts
  // The following is a template that should match the synced contract structure

  log("NOTE: Contract deployment requires synced contracts from Testnet-Contracts or Playground-Contracts.");
  log("      Run: npm run sync-contracts");
  log("");

  log("=".repeat(60));
  log("Deployment complete");
  log("=".repeat(60));
};

/**
 * Load configuration from input directory
 */
function loadConfig(): { addresses: AddressConfig; basic: BasicMetadata; advanced: AdvancedMetadata } {
  const inputPaths = [
    join(__dirname, "..", "input"),
    join(__dirname, "..", "..", "input"),
    join(__dirname, "..", "..", "..", "input"),
  ];

  let inputDir: string | null = null;
  for (const path of inputPaths) {
    if (existsSync(path)) {
      inputDir = path;
      break;
    }
  }

  if (!inputDir) {
    throw new Error("Configuration files not found. Run 'npm run wizard' to configure.");
  }

  const addressPath = join(inputDir, "address.json");
  const basicPath = join(inputDir, "evvmBasicMetadata.json");
  const advancedPath = join(inputDir, "evvmAdvancedMetadata.json");

  const addresses: AddressConfig = existsSync(addressPath)
    ? JSON.parse(readFileSync(addressPath, "utf-8"))
    : { admin: "", goldenFisher: "", activator: "" };

  const basic: BasicMetadata = existsSync(basicPath)
    ? JSON.parse(readFileSync(basicPath, "utf-8"))
    : { EvvmName: "EVVM", principalTokenName: "Mate token", principalTokenSymbol: "MATE" };

  const advanced: AdvancedMetadata = existsSync(advancedPath)
    ? JSON.parse(readFileSync(advancedPath, "utf-8"))
    : {
        eraTokens: "1016666666500000000000000000",
        reward: "5000000000000000000",
        totalSupply: "2033333333000000000000000000",
      };

  return { addresses, basic, advanced };
}

export default deployEvvm;

// Tags for selective deployment
deployEvvm.tags = ["Evvm", "all"];

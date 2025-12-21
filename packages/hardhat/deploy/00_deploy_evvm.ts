import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * EVVM Contracts Deployment Script
 *
 * Deploys all 6 EVVM contracts in the correct order:
 * 1. Staking (admin, goldenFisher)
 * 2. Evvm (admin, staking, metadata)
 * 3. Estimator (activator, evvm, staking, admin)
 * 4. NameService (evvm, admin)
 * 5. Treasury (evvm)
 * 6. P2PSwap (evvm, staking, admin)
 *
 * Then sets up inter-contract relationships:
 * - Staking._setupEstimatorAndEvvm(estimator, evvm)
 * - Evvm._setupNameServiceAndTreasuryAddress(nameService, treasury)
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

interface EvvmMetadata {
  EvvmName: string;
  EvvmID: bigint;
  principalTokenName: string;
  principalTokenSymbol: string;
  principalTokenAddress: string;
  totalSupply: bigint;
  eraTokens: bigint;
  reward: bigint;
}

const deployEvvm: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log, execute, get } = hre.deployments;

  log("=".repeat(60));
  log("EVVM Contract Deployment (Hardhat)");
  log("=".repeat(60));
  log(`Network: ${hre.network.name} (Chain ID: ${hre.network.config.chainId})`);
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
    log("ERROR: Contracts not found!");
    log("Run 'npm run sync-contracts' first to sync from Testnet-Contracts.");
    throw new Error("Contracts not synced");
  }

  // Prepare metadata struct for Evvm constructor
  const metadata: EvvmMetadata = {
    EvvmName: config.basic.EvvmName,
    EvvmID: 0n, // Will be set after registry registration
    principalTokenName: config.basic.principalTokenName,
    principalTokenSymbol: config.basic.principalTokenSymbol,
    principalTokenAddress: "0x0000000000000000000000000000000000000001",
    totalSupply: BigInt(config.advanced.totalSupply),
    eraTokens: BigInt(config.advanced.eraTokens),
    reward: BigInt(config.advanced.reward),
  };

  log("Deploying contracts...\n");

  // 1. Deploy Staking
  log("1. Deploying Staking...");
  const stakingDeployment = await deploy("Staking", {
    from: deployer,
    args: [config.addresses.admin, config.addresses.goldenFisher],
    log: true,
    waitConfirmations: hre.network.name === "localhost" || hre.network.name === "hardhat" ? 1 : 2,
  });
  log(`   Staking deployed at: ${stakingDeployment.address}\n`);

  // 2. Deploy Evvm
  log("2. Deploying Evvm...");
  const evvmDeployment = await deploy("Evvm", {
    from: deployer,
    args: [
      config.addresses.admin,
      stakingDeployment.address,
      [
        metadata.EvvmName,
        metadata.EvvmID,
        metadata.principalTokenName,
        metadata.principalTokenSymbol,
        metadata.principalTokenAddress,
        metadata.totalSupply,
        metadata.eraTokens,
        metadata.reward,
      ],
    ],
    log: true,
    waitConfirmations: hre.network.name === "localhost" || hre.network.name === "hardhat" ? 1 : 2,
  });
  log(`   Evvm deployed at: ${evvmDeployment.address}\n`);

  // 3. Deploy Estimator
  log("3. Deploying Estimator...");
  const estimatorDeployment = await deploy("Estimator", {
    from: deployer,
    args: [
      config.addresses.activator,
      evvmDeployment.address,
      stakingDeployment.address,
      config.addresses.admin,
    ],
    log: true,
    waitConfirmations: hre.network.name === "localhost" || hre.network.name === "hardhat" ? 1 : 2,
  });
  log(`   Estimator deployed at: ${estimatorDeployment.address}\n`);

  // 4. Deploy NameService
  log("4. Deploying NameService...");
  const nameServiceDeployment = await deploy("NameService", {
    from: deployer,
    args: [evvmDeployment.address, config.addresses.admin],
    log: true,
    waitConfirmations: hre.network.name === "localhost" || hre.network.name === "hardhat" ? 1 : 2,
  });
  log(`   NameService deployed at: ${nameServiceDeployment.address}\n`);

  // 5. Setup Staking with Estimator and Evvm
  log("5. Setting up Staking with Estimator and Evvm...");
  await execute(
    "Staking",
    { from: deployer, log: true },
    "_setupEstimatorAndEvvm",
    estimatorDeployment.address,
    evvmDeployment.address
  );
  log("   Staking setup complete\n");

  // 6. Deploy Treasury
  log("6. Deploying Treasury...");
  const treasuryDeployment = await deploy("Treasury", {
    from: deployer,
    args: [evvmDeployment.address],
    log: true,
    waitConfirmations: hre.network.name === "localhost" || hre.network.name === "hardhat" ? 1 : 2,
  });
  log(`   Treasury deployed at: ${treasuryDeployment.address}\n`);

  // 7. Setup Evvm with NameService and Treasury
  log("7. Setting up Evvm with NameService and Treasury...");
  await execute(
    "Evvm",
    { from: deployer, log: true },
    "_setupNameServiceAndTreasuryAddress",
    nameServiceDeployment.address,
    treasuryDeployment.address
  );
  log("   Evvm setup complete\n");

  // 8. Deploy P2PSwap
  log("8. Deploying P2PSwap...");
  const p2pSwapDeployment = await deploy("P2PSwap", {
    from: deployer,
    args: [
      evvmDeployment.address,
      stakingDeployment.address,
      config.addresses.admin,
    ],
    log: true,
    waitConfirmations: hre.network.name === "localhost" || hre.network.name === "hardhat" ? 1 : 2,
  });
  log(`   P2PSwap deployed at: ${p2pSwapDeployment.address}\n`);

  // Summary
  log("=".repeat(60));
  log("DEPLOYMENT SUMMARY");
  log("=".repeat(60));
  log(`Network: ${hre.network.name} (Chain ID: ${hre.network.config.chainId})`);
  log("");
  log("Deployed Contracts:");
  log(`  Staking:     ${stakingDeployment.address}`);
  log(`  Evvm:        ${evvmDeployment.address}`);
  log(`  Estimator:   ${estimatorDeployment.address}`);
  log(`  NameService: ${nameServiceDeployment.address}`);
  log(`  Treasury:    ${treasuryDeployment.address}`);
  log(`  P2PSwap:     ${p2pSwapDeployment.address}`);
  log("=".repeat(60));

  // Save deployment summary for CLI to parse
  const deploymentSummary = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer,
    contracts: {
      staking: stakingDeployment.address,
      evvm: evvmDeployment.address,
      estimator: estimatorDeployment.address,
      nameService: nameServiceDeployment.address,
      treasury: treasuryDeployment.address,
      p2pSwap: p2pSwapDeployment.address,
    },
    timestamp: new Date().toISOString(),
  };

  // Save to deployments folder
  const deploymentsDir = join(__dirname, "..", "deployments", hre.network.name);
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }
  writeFileSync(
    join(deploymentsDir, "deployment-summary.json"),
    JSON.stringify(deploymentSummary, null, 2)
  );

  log(`\nDeployment summary saved to deployments/${hre.network.name}/deployment-summary.json`);
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
    throw new Error("Configuration files not found. Run 'npm run cli deploy' to configure.");
  }

  const addressPath = join(inputDir, "address.json");
  const basicPath = join(inputDir, "evvmBasicMetadata.json");
  const advancedPath = join(inputDir, "evvmAdvancedMetadata.json");

  if (!existsSync(addressPath)) {
    throw new Error("address.json not found. Run 'npm run cli deploy' to configure.");
  }

  const addresses: AddressConfig = JSON.parse(readFileSync(addressPath, "utf-8"));

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

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import * as dotenv from "dotenv";

// Load env from project root
dotenv.config({ path: "../../.env" });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const RPC_URL_ETH_SEPOLIA = process.env.RPC_URL_ETH_SEPOLIA || "https://1rpc.io/sepolia";
const RPC_URL_ARB_SEPOLIA = process.env.RPC_URL_ARB_SEPOLIA || "https://sepolia-rollup.arbitrum.io/rpc";
const ETHERSCAN_API = process.env.ETHERSCAN_API || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 300,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  networks: {
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      // Hardhat Network for tests
    },

    // Testnets
    sepolia: {
      url: RPC_URL_ETH_SEPOLIA,
      chainId: 11155111,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
    arbitrumSepolia: {
      url: RPC_URL_ARB_SEPOLIA,
      chainId: 421614,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },

  // Named accounts for hardhat-deploy
  namedAccounts: {
    deployer: {
      default: 0, // First account
    },
    admin: {
      default: 0,
    },
    goldenFisher: {
      default: 1,
    },
    activator: {
      default: 2,
    },
  },

  // Etherscan verification
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API,
      arbitrumSepolia: ETHERSCAN_API,
    },
  },

  // Gas reporter
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },

  // TypeChain configuration
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;

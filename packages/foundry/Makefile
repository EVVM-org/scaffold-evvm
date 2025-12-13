# Scaffold-EVVM Foundry Makefile

-include .env

.PHONY: all install compile test clean chain deploy

# Default target
all: install compile

# Install dependencies
install:
	forge install foundry-rs/forge-std --no-commit
	forge install OpenZeppelin/openzeppelin-contracts --no-commit
	forge install Vectorized/solady --no-commit

# Compile contracts
compile:
	forge build --via-ir

# Run tests
test:
	forge test -vvv

# Run specific test
test-match:
	forge test --match-test $(TEST) -vvv

# Run fuzz tests
fuzz:
	forge test --match-test testFuzz -vvv

# Clean build artifacts
clean:
	forge clean

# Check contract sizes
sizes:
	forge build --via-ir --sizes

# Format code
format:
	forge fmt

# Start local chain
chain:
	anvil --block-time 10 --accounts 10 --balance 10000

# Start forked chain
fork:
	anvil --fork-url $(FORK_URL) --block-time 10

# Deploy to local
deploy-local:
	forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --via-ir

# Deploy to Ethereum Sepolia
deploy-sepolia:
	forge script script/Deploy.s.sol \
		--rpc-url $(RPC_URL_ETH_SEPOLIA) \
		--account $(WALLET) \
		--broadcast \
		--verify \
		--etherscan-api-key $(ETHERSCAN_API) \
		--via-ir \
		-vvvv

# Deploy to Arbitrum Sepolia
deploy-arb-sepolia:
	forge script script/Deploy.s.sol \
		--rpc-url $(RPC_URL_ARB_SEPOLIA) \
		--account $(WALLET) \
		--broadcast \
		--verify \
		--etherscan-api-key $(ETHERSCAN_API) \
		--via-ir \
		-vvvv

# Verify contract
verify:
	forge verify-contract $(CONTRACT) $(ADDRESS) \
		--chain-id $(CHAIN_ID) \
		--etherscan-api-key $(ETHERSCAN_API)

# List wallets
wallet-list:
	cast wallet list

# Import wallet
wallet-import:
	cast wallet import $(NAME) --interactive

# Generate ABIs for frontend
generate-abis:
	node scripts/generate-abis.js

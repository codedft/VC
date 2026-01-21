#!/bin/bash

# Solana Token Deployment Script
# This script helps deploy your token to different Solana networks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}  Crypto Token Deployment Script${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Check if network is provided
NETWORK=${1:-"localnet"}

echo -e "${YELLOW}Target Network: $NETWORK${NC}"
echo ""

# Configure Solana CLI
case $NETWORK in
  localnet)
    echo -e "${YELLOW}Configuring for localnet...${NC}"
    solana config set --url localhost
    echo ""
    echo -e "${YELLOW}Starting local validator (if not already running)...${NC}"
    # Check if validator is already running
    if ! pgrep -x "solana-test-validator" > /dev/null; then
      echo -e "${YELLOW}Starting solana-test-validator in background...${NC}"
      solana-test-validator > /dev/null 2>&1 &
      sleep 5
      echo -e "${GREEN}✓ Local validator started${NC}"
    else
      echo -e "${GREEN}✓ Local validator already running${NC}"
    fi
    ;;
  devnet)
    echo -e "${YELLOW}Configuring for devnet...${NC}"
    solana config set --url devnet
    echo ""
    echo -e "${YELLOW}Requesting airdrop...${NC}"
    solana airdrop 2 || echo -e "${YELLOW}Airdrop failed or already have enough SOL${NC}"
    ;;
  mainnet|mainnet-beta)
    echo -e "${RED}⚠️  WARNING: Deploying to MAINNET!${NC}"
    echo -e "${RED}This will use real SOL. Continue? (yes/no)${NC}"
    read -r confirm
    if [ "$confirm" != "yes" ]; then
      echo -e "${YELLOW}Deployment cancelled${NC}"
      exit 1
    fi
    solana config set --url mainnet-beta
    ;;
  *)
    echo -e "${RED}Invalid network: $NETWORK${NC}"
    echo -e "Usage: $0 [localnet|devnet|mainnet]"
    exit 1
    ;;
esac

echo ""
echo -e "${YELLOW}Checking Solana configuration...${NC}"
solana config get
echo ""

echo -e "${YELLOW}Checking wallet balance...${NC}"
BALANCE=$(solana balance | awk '{print $1}')
echo -e "${GREEN}Balance: $BALANCE SOL${NC}"
echo ""

if (( $(echo "$BALANCE < 1" | bc -l) )); then
  echo -e "${RED}⚠️  Warning: Low balance. You may need more SOL for deployment.${NC}"
  echo ""
fi

echo -e "${YELLOW}Building program...${NC}"
anchor build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

echo -e "${YELLOW}Deploying program...${NC}"
anchor deploy
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/crypto_token-keypair.json)
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Program deployed successfully!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${GREEN}Program ID: ${YELLOW}$PROGRAM_ID${NC}"
echo -e "${GREEN}Network: ${YELLOW}$NETWORK${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update your Anchor.toml with the deployed program ID"
echo -e "2. Run tests: ${GREEN}anchor test${NC}"
echo -e "3. Initialize your token using the client SDK"
echo ""
echo -e "${GREEN}Deployment complete! 🚀${NC}"

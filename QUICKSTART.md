# Quick Start Guide

Get your Solana token up and running in minutes!

## Prerequisites Check

```bash
# Check installations
anchor --version  # Should be 0.29.0+
solana --version  # Should be 1.18.0+
node --version    # Should be 18.0.0+
```

If any are missing, see the installation section in README.md.

## 5-Minute Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Build the Program

```bash
anchor build
```

### 3. Run Tests (Local)

```bash
# This will start a local validator and run all tests
anchor test
```

If tests pass, you're ready to deploy! ✅

## Deploy to Devnet (Recommended for Testing)

### 1. Configure Solana CLI

```bash
# Set to devnet
solana config set --url devnet

# Create a new wallet (if you don't have one)
solana-keygen new -o ~/.config/solana/id.json

# Get some test SOL
solana airdrop 2
```

### 2. Deploy

```bash
# Quick deploy
anchor deploy

# OR use the deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh devnet
```

### 3. Initialize Your Token

```bash
# Edit token details in scripts/initialize-token.ts first!
npx ts-node scripts/initialize-token.ts
```

Done! Your token is live on devnet 🎉

## Common Commands

```bash
# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy

# Check program ID
solana address -k target/deploy/crypto_token-keypair.json

# Check wallet balance
solana balance
```

## What You Get

Your token includes:

- ✅ **Mintable**: Create new tokens anytime
- ✅ **Burnable**: Destroy tokens permanently
- ✅ **Pausable**: Emergency stop for all operations
- ✅ **Access Control**: Owner-based permissions
- ✅ **Transfer**: Standard token transfers

## Next Steps

1. **Customize**: Edit token name/symbol in `scripts/initialize-token.ts`
2. **Test More**: Explore the test file in `tests/crypto-token.ts`
3. **Integrate**: Build a frontend using `@solana/web3.js` and `@coral-xyz/anchor`
4. **Deploy to Mainnet**: When ready, use `./scripts/deploy.sh mainnet`

## Example: Minting Tokens

After initialization, you can mint tokens like this:

```typescript
import * as anchor from "@coral-xyz/anchor";

// Mint 1000 tokens (with 9 decimals = 1000000000000 base units)
await program.methods
  .mintTokens(new anchor.BN(1000_000_000_000))
  .accounts({
    tokenConfig: tokenConfigAddress,
    mint: mintAddress,
    destination: recipientTokenAccount,
    authority: authorityPublicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

## Troubleshooting

**"Insufficient funds"**
- Get more SOL: `solana airdrop 2` (devnet) or buy SOL (mainnet)

**"Transaction simulation failed"**
- Check you're on the right network: `solana config get`
- Ensure program is deployed: `solana program show <PROGRAM_ID>`

**"Build failed"**
- Clean and rebuild: `anchor clean && anchor build`
- Update Anchor: `cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked`

## Resources

- [Full Documentation](./README.md)
- [Anchor Docs](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [SPL Token Guide](https://spl.solana.com/token)

Happy building! 🚀

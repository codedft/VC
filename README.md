# Crypto Token - Feature-Rich Solana SPL Token

A fully-featured Solana token built with Anchor framework, featuring mintable, burnable, pausable, and access control capabilities.

## Features

✨ **Mintable**: Authority can mint new tokens at any time
🔥 **Burnable**: Token holders can burn their own tokens
⏸️ **Pausable**: Authority can pause/unpause all token operations in emergencies
🔐 **Access Control**: Role-based permissions with transferable ownership
🛡️ **Security**: Built-in protection against unauthorized operations

## Program Features

### Core Functionality

1. **Initialize**: Create a new token with custom name, symbol, and decimals
2. **Mint Tokens**: Mint new tokens to any account (authority only)
3. **Burn Tokens**: Burn tokens from your own account
4. **Transfer Tokens**: Transfer tokens between accounts (respects pause state)
5. **Pause/Unpause**: Temporarily halt all token operations
6. **Transfer Authority**: Transfer ownership to a new address

### Security Features

- All administrative operations require authority signature
- Pausable transfers for emergency situations
- Clean role-based access control
- PDA-based program authority for secure mint control

## Prerequisites

Before you begin, ensure you have the following installed:

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18.0+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.29.0+)
- [Node.js](https://nodejs.org/) (v18.0.0+)
- [Yarn](https://yarnpkg.com/) or npm

## Installation

1. **Clone the repository**
```bash
cd /path/to/VC
```

2. **Install dependencies**
```bash
yarn install
# or
npm install
```

3. **Build the program**
```bash
anchor build
```

## Configuration

### Solana CLI Setup

1. **Configure Solana CLI for your target network**
```bash
# For local development
solana config set --url localhost

# For devnet
solana config set --url devnet

# For mainnet (production)
solana config set --url mainnet-beta
```

2. **Create or configure your wallet**
```bash
# Generate a new keypair
solana-keygen new -o ~/.config/solana/id.json

# Or use an existing one
solana config set --keypair /path/to/your/keypair.json
```

3. **Get some SOL for deployment**
```bash
# For localnet/devnet
solana airdrop 2

# For mainnet, you'll need to purchase SOL
```

## Usage

### Running Tests

```bash
# Start local validator (in a separate terminal)
solana-test-validator

# Run tests
anchor test --skip-local-validator

# Or run with local validator startup
anchor test
```

### Deployment

1. **Deploy to localnet**
```bash
# Start local validator
solana-test-validator

# Deploy
anchor deploy
```

2. **Deploy to devnet**
```bash
# Set cluster to devnet
solana config set --url devnet

# Airdrop some SOL if needed
solana airdrop 2

# Deploy
anchor deploy
```

3. **Deploy to mainnet**
```bash
# Set cluster to mainnet
solana config set --url mainnet-beta

# Deploy (requires SOL for deployment)
anchor deploy
```

### Interacting with the Token

After deployment, you can interact with your token using the Anchor client. Here's a basic example:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoToken } from "./target/types/crypto_token";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.CryptoToken as Program<CryptoToken>;

// Initialize token
await program.methods
  .initialize(9, "My Token", "MTK")
  .accounts({ /* ... */ })
  .rpc();

// Mint tokens
await program.methods
  .mintTokens(new anchor.BN(1000000000)) // 1 token with 9 decimals
  .accounts({ /* ... */ })
  .rpc();

// Burn tokens
await program.methods
  .burnTokens(new anchor.BN(100000000))
  .accounts({ /* ... */ })
  .rpc();

// Pause token
await program.methods
  .pause()
  .accounts({ /* ... */ })
  .rpc();
```

## Program Instructions

### initialize(decimals, name, symbol)
Creates a new token with specified parameters.

**Parameters:**
- `decimals`: Number of decimal places (typically 9 for Solana)
- `name`: Token name (max 32 characters)
- `symbol`: Token symbol (max 10 characters)

**Access:** Anyone (becomes the authority)

### mint_tokens(amount)
Mints new tokens to a specified account.

**Parameters:**
- `amount`: Number of tokens to mint (in smallest units)

**Access:** Authority only
**Conditions:** Token must not be paused

### burn_tokens(amount)
Burns tokens from the signer's account.

**Parameters:**
- `amount`: Number of tokens to burn

**Access:** Token holder
**Conditions:** Token must not be paused

### transfer_tokens(amount)
Transfers tokens between accounts.

**Parameters:**
- `amount`: Number of tokens to transfer

**Access:** Token holder
**Conditions:** Token must not be paused

### pause()
Pauses all token operations.

**Access:** Authority only
**Conditions:** Must not already be paused

### unpause()
Resumes token operations.

**Access:** Authority only
**Conditions:** Must be paused

### transfer_authority(new_authority)
Transfers program authority to a new address.

**Parameters:**
- `new_authority`: Public key of the new authority

**Access:** Current authority only

## Project Structure

```
.
├── Anchor.toml              # Anchor configuration
├── Cargo.toml               # Rust workspace configuration
├── package.json             # Node.js dependencies
├── tsconfig.json            # TypeScript configuration
├── programs/
│   └── crypto-token/
│       ├── Cargo.toml       # Program dependencies
│       ├── Xargo.toml       # Build configuration
│       └── src/
│           └── lib.rs       # Main program code
└── tests/
    └── crypto-token.ts      # Integration tests
```

## Security Considerations

1. **Authority Management**: The authority has significant power. Use a multisig or governance mechanism for production tokens.

2. **Pause Mechanism**: Only use pause in genuine emergencies, as it affects all users.

3. **Testing**: Always test thoroughly on devnet before mainnet deployment.

4. **Audit**: Consider getting a security audit for production deployments.

5. **Program Upgrades**: Anchor programs are upgradeable by default. Revoke upgrade authority for immutability.

## Development

### Building

```bash
# Build the program
anchor build

# Build in release mode
anchor build --release
```

### Testing

```bash
# Run all tests
anchor test

# Run specific test file
anchor test -- --grep "mints tokens"

# Run with verbose output
anchor test -- --verbose
```

### Linting

```bash
# Check Rust code
cargo clippy -- -D warnings

# Format Rust code
cargo fmt

# Check TypeScript
yarn lint
```

## Troubleshooting

### "Program failed to build"
- Ensure you have the latest Rust and Anchor versions
- Try `anchor clean` followed by `anchor build`

### "Transaction simulation failed"
- Check that you have enough SOL for the transaction
- Verify all account addresses are correct
- Ensure the program is deployed

### "Custom program error: 0x1771"
- This typically means "Token operations are currently paused"
- Unpause the token using the `unpause` instruction

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the [Anchor documentation](https://www.anchor-lang.com/)
- Visit the [Solana Stack Exchange](https://solana.stackexchange.com/)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## Acknowledgments

- Built with [Anchor Framework](https://www.anchor-lang.com/)
- Powered by [Solana](https://solana.com/)
- Uses [SPL Token](https://spl.solana.com/token) standard

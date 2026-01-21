/**
 * Token Initialization Script
 *
 * This script helps you initialize your token after deployment.
 * It creates the token mint and sets up the initial configuration.
 *
 * Usage:
 *   npx ts-node scripts/initialize-token.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoToken } from "../target/types/crypto_token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";

// Token configuration - CUSTOMIZE THESE
const TOKEN_CONFIG = {
  name: "My Crypto Token",
  symbol: "MCT",
  decimals: 9,
};

async function main() {
  console.log("🚀 Token Initialization Script");
  console.log("================================\n");

  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CryptoToken as Program<CryptoToken>;
  const authority = provider.wallet.publicKey;

  console.log("Configuration:");
  console.log(`  Program ID: ${program.programId.toString()}`);
  console.log(`  Authority: ${authority.toString()}`);
  console.log(`  Cluster: ${provider.connection.rpcEndpoint}`);
  console.log(`\nToken Details:`);
  console.log(`  Name: ${TOKEN_CONFIG.name}`);
  console.log(`  Symbol: ${TOKEN_CONFIG.symbol}`);
  console.log(`  Decimals: ${TOKEN_CONFIG.decimals}\n`);

  // Generate mint keypair
  const mint = Keypair.generate();
  console.log(`Generated Mint: ${mint.publicKey.toString()}\n`);

  // Derive token config PDA
  const [tokenConfig] = PublicKey.findProgramAddressSync(
    [Buffer.from("token-config"), mint.publicKey.toBuffer()],
    program.programId
  );

  console.log(`Token Config PDA: ${tokenConfig.toString()}\n`);

  // Check if already initialized
  try {
    const existingConfig = await program.account.tokenConfig.fetch(tokenConfig);
    console.log("⚠️  Token already initialized!");
    console.log(`  Existing Mint: ${existingConfig.mint.toString()}`);
    console.log(`  Authority: ${existingConfig.authority.toString()}`);
    process.exit(0);
  } catch (e) {
    // Not initialized yet, continue
  }

  console.log("Initializing token...");

  try {
    const tx = await program.methods
      .initialize(
        TOKEN_CONFIG.decimals,
        TOKEN_CONFIG.name,
        TOKEN_CONFIG.symbol
      )
      .accounts({
        tokenConfig,
        mint: mint.publicKey,
        authority: authority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mint])
      .rpc();

    console.log("\n✅ Token initialized successfully!");
    console.log(`\nTransaction signature: ${tx}`);

    // Save mint address for future use
    const config = {
      programId: program.programId.toString(),
      mintAddress: mint.publicKey.toString(),
      tokenConfig: tokenConfig.toString(),
      authority: authority.toString(),
      name: TOKEN_CONFIG.name,
      symbol: TOKEN_CONFIG.symbol,
      decimals: TOKEN_CONFIG.decimals,
      cluster: provider.connection.rpcEndpoint,
    };

    fs.writeFileSync(
      "token-config.json",
      JSON.stringify(config, null, 2)
    );

    console.log("\n📝 Configuration saved to token-config.json");
    console.log("\n=================================");
    console.log("Next steps:");
    console.log("1. Mint tokens: Use the mint_tokens instruction");
    console.log("2. Create token accounts for users");
    console.log("3. Distribute tokens as needed");
    console.log("\nYour token is ready to use! 🎉");

  } catch (error) {
    console.error("\n❌ Error initializing token:");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

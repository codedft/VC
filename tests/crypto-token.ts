import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CryptoToken } from "../target/types/crypto_token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAccount,
  getAccount,
  getMint,
} from "@solana/spl-token";
import { assert } from "chai";

describe("crypto-token", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CryptoToken as Program<CryptoToken>;
  const authority = provider.wallet as anchor.Wallet;

  let mint: Keypair;
  let tokenConfig: PublicKey;
  let tokenConfigBump: number;
  let userTokenAccount: PublicKey;
  let recipientTokenAccount: PublicKey;
  let recipient: Keypair;

  before(async () => {
    // Generate keypairs
    mint = Keypair.generate();
    recipient = Keypair.generate();

    // Airdrop SOL to recipient for testing
    const signature = await provider.connection.requestAirdrop(
      recipient.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Derive token config PDA
    [tokenConfig, tokenConfigBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("token-config"), mint.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes the token", async () => {
    await program.methods
      .initialize(9, "My Crypto Token", "MCT")
      .accounts({
        tokenConfig,
        mint: mint.publicKey,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mint])
      .rpc();

    // Verify token config
    const config = await program.account.tokenConfig.fetch(tokenConfig);
    assert.equal(config.authority.toString(), authority.publicKey.toString());
    assert.equal(config.mint.toString(), mint.publicKey.toString());
    assert.equal(config.paused, false);
    assert.equal(config.name, "My Crypto Token");
    assert.equal(config.symbol, "MCT");
    assert.equal(config.decimals, 9);

    // Verify mint
    const mintInfo = await getMint(provider.connection, mint.publicKey);
    assert.equal(mintInfo.decimals, 9);
    assert.equal(mintInfo.mintAuthority?.toString(), tokenConfig.toString());

    console.log("✅ Token initialized successfully");
  });

  it("Creates token accounts", async () => {
    // Create token account for authority
    userTokenAccount = await createAccount(
      provider.connection,
      authority.payer,
      mint.publicKey,
      authority.publicKey
    );

    // Create token account for recipient
    recipientTokenAccount = await createAccount(
      provider.connection,
      authority.payer,
      mint.publicKey,
      recipient.publicKey
    );

    console.log("✅ Token accounts created");
  });

  it("Mints tokens", async () => {
    const mintAmount = 1000 * 10 ** 9; // 1000 tokens with 9 decimals

    await program.methods
      .mintTokens(new anchor.BN(mintAmount))
      .accounts({
        tokenConfig,
        mint: mint.publicKey,
        destination: userTokenAccount,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Verify balance
    const accountInfo = await getAccount(provider.connection, userTokenAccount);
    assert.equal(accountInfo.amount.toString(), mintAmount.toString());

    console.log("✅ Minted 1000 tokens successfully");
  });

  it("Transfers tokens", async () => {
    const transferAmount = 250 * 10 ** 9; // 250 tokens

    await program.methods
      .transferTokens(new anchor.BN(transferAmount))
      .accounts({
        tokenConfig,
        from: userTokenAccount,
        to: recipientTokenAccount,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Verify balances
    const fromAccount = await getAccount(provider.connection, userTokenAccount);
    const toAccount = await getAccount(provider.connection, recipientTokenAccount);

    assert.equal(fromAccount.amount.toString(), (750 * 10 ** 9).toString());
    assert.equal(toAccount.amount.toString(), (250 * 10 ** 9).toString());

    console.log("✅ Transferred 250 tokens successfully");
  });

  it("Burns tokens", async () => {
    const burnAmount = 100 * 10 ** 9; // 100 tokens

    await program.methods
      .burnTokens(new anchor.BN(burnAmount))
      .accounts({
        tokenConfig,
        mint: mint.publicKey,
        from: userTokenAccount,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Verify balance
    const accountInfo = await getAccount(provider.connection, userTokenAccount);
    assert.equal(accountInfo.amount.toString(), (650 * 10 ** 9).toString());

    console.log("✅ Burned 100 tokens successfully");
  });

  it("Pauses the token", async () => {
    await program.methods
      .pause()
      .accounts({
        tokenConfig,
        authority: authority.publicKey,
      })
      .rpc();

    // Verify paused state
    const config = await program.account.tokenConfig.fetch(tokenConfig);
    assert.equal(config.paused, true);

    console.log("✅ Token paused successfully");
  });

  it("Prevents minting when paused", async () => {
    try {
      await program.methods
        .mintTokens(new anchor.BN(100 * 10 ** 9))
        .accounts({
          tokenConfig,
          mint: mint.publicKey,
          destination: userTokenAccount,
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.include(error.message, "Token operations are currently paused");
      console.log("✅ Minting correctly prevented when paused");
    }
  });

  it("Prevents transfers when paused", async () => {
    try {
      await program.methods
        .transferTokens(new anchor.BN(10 * 10 ** 9))
        .accounts({
          tokenConfig,
          from: userTokenAccount,
          to: recipientTokenAccount,
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.include(error.message, "Token operations are currently paused");
      console.log("✅ Transfers correctly prevented when paused");
    }
  });

  it("Unpauses the token", async () => {
    await program.methods
      .unpause()
      .accounts({
        tokenConfig,
        authority: authority.publicKey,
      })
      .rpc();

    // Verify unpaused state
    const config = await program.account.tokenConfig.fetch(tokenConfig);
    assert.equal(config.paused, false);

    console.log("✅ Token unpaused successfully");
  });

  it("Allows operations after unpause", async () => {
    const mintAmount = 50 * 10 ** 9;

    await program.methods
      .mintTokens(new anchor.BN(mintAmount))
      .accounts({
        tokenConfig,
        mint: mint.publicKey,
        destination: userTokenAccount,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const accountInfo = await getAccount(provider.connection, userTokenAccount);
    assert.equal(accountInfo.amount.toString(), (700 * 10 ** 9).toString());

    console.log("✅ Operations work correctly after unpause");
  });

  it("Transfers authority", async () => {
    const newAuthority = Keypair.generate();

    await program.methods
      .transferAuthority(newAuthority.publicKey)
      .accounts({
        tokenConfig,
        authority: authority.publicKey,
      })
      .rpc();

    // Verify new authority
    const config = await program.account.tokenConfig.fetch(tokenConfig);
    assert.equal(config.authority.toString(), newAuthority.publicKey.toString());

    console.log("✅ Authority transferred successfully");

    // Transfer back for cleanup
    await program.methods
      .transferAuthority(authority.publicKey)
      .accounts({
        tokenConfig,
        authority: newAuthority.publicKey,
      })
      .signers([newAuthority])
      .rpc();
  });

  it("Prevents unauthorized minting", async () => {
    const unauthorizedUser = Keypair.generate();

    // Airdrop SOL to unauthorized user
    const signature = await provider.connection.requestAirdrop(
      unauthorizedUser.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    try {
      await program.methods
        .mintTokens(new anchor.BN(100 * 10 ** 9))
        .accounts({
          tokenConfig,
          mint: mint.publicKey,
          destination: userTokenAccount,
          authority: unauthorizedUser.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([unauthorizedUser])
        .rpc();

      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.include(error.message, "UnauthorizedMinter");
      console.log("✅ Unauthorized minting correctly prevented");
    }
  });

  it("Prevents unauthorized pause", async () => {
    const unauthorizedUser = Keypair.generate();

    // Airdrop SOL
    const signature = await provider.connection.requestAirdrop(
      unauthorizedUser.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    try {
      await program.methods
        .pause()
        .accounts({
          tokenConfig,
          authority: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc();

      assert.fail("Should have thrown an error");
    } catch (error) {
      assert.include(error.message, "UnauthorizedAdmin");
      console.log("✅ Unauthorized pause correctly prevented");
    }
  });
});

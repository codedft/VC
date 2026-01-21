use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod crypto_token {
    use super::*;

    /// Initialize the token and configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        decimals: u8,
        name: String,
        symbol: String,
    ) -> Result<()> {
        let config = &mut ctx.accounts.token_config;
        config.authority = ctx.accounts.authority.key();
        config.mint = ctx.accounts.mint.key();
        config.paused = false;
        config.name = name;
        config.symbol = symbol;
        config.decimals = decimals;
        config.bump = ctx.bumps.token_config;

        msg!("Token initialized: {} ({})", config.name, config.symbol);
        Ok(())
    }

    /// Mint new tokens (requires authority or minter role)
    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.token_config;

        // Check if paused
        require!(!config.paused, ErrorCode::TokenPaused);

        // Check if caller has mint permission
        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::UnauthorizedMinter
        );

        // Mint tokens
        let seeds = &[
            b"token-config",
            config.mint.as_ref(),
            &[config.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.token_config.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::mint_to(cpi_ctx, amount)?;

        msg!("Minted {} tokens to {}", amount, ctx.accounts.destination.key());
        Ok(())
    }

    /// Burn tokens from user's account
    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.token_config;

        // Check if paused
        require!(!config.paused, ErrorCode::TokenPaused);

        // Burn tokens
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.from.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::burn(cpi_ctx, amount)?;

        msg!("Burned {} tokens from {}", amount, ctx.accounts.from.key());
        Ok(())
    }

    /// Pause all token operations
    pub fn pause(ctx: Context<PauseToken>) -> Result<()> {
        let config = &mut ctx.accounts.token_config;

        // Only authority can pause
        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::UnauthorizedAdmin
        );

        require!(!config.paused, ErrorCode::AlreadyPaused);

        config.paused = true;
        msg!("Token paused");
        Ok(())
    }

    /// Unpause all token operations
    pub fn unpause(ctx: Context<PauseToken>) -> Result<()> {
        let config = &mut ctx.accounts.token_config;

        // Only authority can unpause
        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::UnauthorizedAdmin
        );

        require!(config.paused, ErrorCode::NotPaused);

        config.paused = false;
        msg!("Token unpaused");
        Ok(())
    }

    /// Transfer authority to a new owner
    pub fn transfer_authority(ctx: Context<TransferAuthority>, new_authority: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.token_config;

        // Only current authority can transfer
        require!(
            ctx.accounts.authority.key() == config.authority,
            ErrorCode::UnauthorizedAdmin
        );

        let old_authority = config.authority;
        config.authority = new_authority;

        msg!("Authority transferred from {} to {}", old_authority, new_authority);
        Ok(())
    }

    /// Transfer tokens (demonstrates pausable transfers)
    pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
        let config = &ctx.accounts.token_config;

        // Check if paused
        require!(!config.paused, ErrorCode::TokenPaused);

        // Transfer tokens
        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        msg!("Transferred {} tokens", amount);
        Ok(())
    }
}

// ========================================
// Instruction Contexts
// ========================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + TokenConfig::INIT_SPACE,
        seeds = [b"token-config", mint.key().as_ref()],
        bump
    )]
    pub token_config: Account<'info, TokenConfig>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = token_config,
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(
        seeds = [b"token-config", mint.key().as_ref()],
        bump = token_config.bump,
    )]
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(
        seeds = [b"token-config", mint.key().as_ref()],
        bump = token_config.bump,
    )]
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PauseToken<'info> {
    #[account(
        mut,
        seeds = [b"token-config", token_config.mint.as_ref()],
        bump = token_config.bump,
    )]
    pub token_config: Account<'info, TokenConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(
        mut,
        seeds = [b"token-config", token_config.mint.as_ref()],
        bump = token_config.bump,
    )]
    pub token_config: Account<'info, TokenConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(
        seeds = [b"token-config", token_config.mint.as_ref()],
        bump = token_config.bump,
    )]
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

// ========================================
// State Accounts
// ========================================

#[account]
#[derive(InitSpace)]
pub struct TokenConfig {
    pub authority: Pubkey,      // Current owner/admin
    pub mint: Pubkey,            // Token mint address
    pub paused: bool,            // Pause state
    #[max_len(32)]
    pub name: String,            // Token name
    #[max_len(10)]
    pub symbol: String,          // Token symbol
    pub decimals: u8,            // Token decimals
    pub bump: u8,                // PDA bump
}

// ========================================
// Error Codes
// ========================================

#[error_code]
pub enum ErrorCode {
    #[msg("Token operations are currently paused")]
    TokenPaused,

    #[msg("Unauthorized: Only authority can mint tokens")]
    UnauthorizedMinter,

    #[msg("Unauthorized: Only authority can perform admin operations")]
    UnauthorizedAdmin,

    #[msg("Token is already paused")]
    AlreadyPaused,

    #[msg("Token is not paused")]
    NotPaused,
}

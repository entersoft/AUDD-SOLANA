use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, TokenAccount, Token};

use solana_program::{self, pubkey::Pubkey};
use spl_token::{self};

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut, signer)]
    pub fee_payer: Signer<'info>,

    #[account(mut)]
    pub token_a: Account<'info, Mint>,
    #[account(
        mut,
        mint::authority = token_b_multsig,
    )]
    pub token_b: Account<'info, Mint>,

    pub token_a_sender: Signer<'info>,
    #[account(
        mut,
        associated_token::mint = token_a,
        associated_token::authority = token_a_sender,
    )]
    pub token_a_sender_ata: Account<'info, TokenAccount>,
    pub token_b_receiver: SystemAccount<'info>,
    #[account(
        mut,
        associated_token::mint = token_b,
        associated_token::authority = token_b_receiver,
    )]
    pub token_b_receiver_ata: Account<'info, TokenAccount>,

    #[account(constraint = token_b_multsig.key() == token_b.mint_authority.unwrap())]
    /// CHECK: We are just passing this account to the mint_to instruction
    pub token_b_multsig: AccountInfo<'info>,
    #[account(signer)]
    pub app_wallet_signer: Signer<'info>,

    #[account(constraint = program_pda.key() == Pubkey::find_program_address(&[b"mint_authority"], __program_id).0)]
    /// CHECK: This account is not read or writen, we calculate pda in the function
    pub program_pda: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    #[account(constraint = spl_token_program.key() == spl_token::ID)]
    pub spl_token_program: Program<'info, Token>,
}

pub fn swap(ctx: Context<Swap>, amount: u64) -> Result<()> {
    require!(amount > 0, SwapErrors::ZeroSwapAmount);
    require!(ctx.accounts.token_a.key() != ctx.accounts.token_b.key(), SwapErrors::RepeatedMint);
    require!(ctx.accounts.token_a_sender_ata.amount >= amount, SwapErrors::NotEnoughTokens);
    require!(ctx.accounts.token_a.decimals == ctx.accounts.token_b.decimals, SwapErrors::NotEqualDecimals);
    
    let burn_ix = spl_token::instruction::burn(
        &spl_token::ID,
        &ctx.accounts.token_a_sender_ata.key(),
        &ctx.accounts.token_a.key(),
        &ctx.accounts.token_a_sender.key(),
        &[],
        amount,
    )?;

    let (pda, bump) = Pubkey::find_program_address(&[b"mint_authority"], ctx.program_id);
    let mint_ix = spl_token::instruction::mint_to(
        &spl_token::ID,
        &ctx.accounts.token_b.key(),
        &ctx.accounts.token_b_receiver_ata.key(),
        ctx.accounts.token_b_multsig.key,
        &[&ctx.accounts.app_wallet_signer.key(), &pda],
        amount,
    )?;

    solana_program::program::invoke(
        &burn_ix,
        &[
            ctx.accounts.token_a_sender_ata.to_account_info(),
            ctx.accounts.token_a.to_account_info(),
            ctx.accounts.token_a_sender.to_account_info(),
        ],
    )?;
    solana_program::program::invoke_signed(
        &mint_ix,
        &[
            ctx.accounts.token_b_receiver_ata.to_account_info(),
            ctx.accounts.token_b.to_account_info(),
            ctx.accounts.app_wallet_signer.to_account_info(),
            ctx.accounts.program_pda.to_account_info(),
            ctx.accounts.token_b_multsig.to_account_info(),
        ],
        &[&[b"mint_authority", &[bump]]],
    )?;

    Ok(())
}

#[error_code]
pub enum SwapErrors {
    #[msg("You don't have enough tokens for this swap")]
    NotEnoughTokens,
    #[msg("You are trying to swap the same token")]
    RepeatedMint,
    #[msg("Tokens must have the same decimals")]
    NotEqualDecimals,
    #[msg("Swap amount must be greater than zero")]
    ZeroSwapAmount,
}
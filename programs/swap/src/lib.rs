use anchor_lang::prelude::*;

pub mod instructions;
use instructions::*;

declare_id!("9vtrwv4Y7ZmLEDHmgxnGJqF5oAb35298u1e8VsDA2ZRi");

#[program]
pub mod swap {
    use super::*;

    pub fn swap(ctx: Context<Swap>, amount: u64) -> Result<()> {
        swap_instruction::swap(ctx, amount)
    }
}

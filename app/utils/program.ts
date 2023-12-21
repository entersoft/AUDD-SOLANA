import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Swap } from "../idl/swap";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const fetchProgramPDA = (connection: Connection, feePayerKeypair: Keypair) => {
  console.log("------------------", "fetchProgramPDA", "------------------");

  const wallet = new anchor.Wallet(feePayerKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });
  anchor.setProvider(provider);
  const program = anchor.workspace.Swap as Program<Swap>;
  const [pda, _bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    program.programId
  );

  console.log("------------------", "fetchProgramPDA", "------------------");

  return pda;
};

export { fetchProgramPDA };

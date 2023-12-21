import {
  fetchFeePayer,
  fetchAUDRHolderKeypair,
  fetchNovattiAppKeypair,
} from "../utils/keypairs";
import {
  PublicKey,
  sendAndConfirmRawTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Swap } from "../idl/swap";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getOrCreateAccountToHoldToken, getTokenInfo } from "../utils/token";
import { connection } from "../utils/connection";
import { withdrawNonce, createNonceAccount } from "../utils/nonce";
import { signOfflineTransaction } from "../utils/transaction";
import { fetchProgramPDA } from "../utils/program";

const swapTokenAToTokenBScenario = async (
  connection: any,
  feePayerKeypair: any,
  tokenAAddress: string,
  tokenBAddress: string,
  tokenAHolderKeypair: any,
  tokenBRecipientWalletAddress: string,
  tokenBMintAuthorityAccountAddress: string,
  programPDAAddress: string,
  novattiWalletKeypair: any,
  swapAmountInDollars: number
) => {
  const tokenA = await getTokenInfo(connection, tokenAAddress);
  const tokenB = await getTokenInfo(connection, tokenBAddress);
  const tokenBDecimals = tokenB.decimals;
  const tokenBRecipientWallet = new PublicKey(tokenBRecipientWalletAddress);
  const tokenAAccountToHold = await getOrCreateAccountToHoldToken(
    connection,
    feePayerKeypair,
    tokenA.address.toBase58(),
    tokenAHolderKeypair.publicKey.toBase58()
  );
  const tokenBRecipientAccountToHold = await getOrCreateAccountToHoldToken(
    connection,
    feePayerKeypair,
    tokenB.address.toBase58(),
    tokenBRecipientWallet.toBase58()
  );
  const tokenBMintAuthorityAccount = new PublicKey(
    tokenBMintAuthorityAccountAddress
  );

  // create nonce account
  // It's important to remember nonceAccountPublicKey and authorizedPubkey of the nonce(feePayerKeypair)
  // to be able to withdraw nonce balance after transaction execution
  const nonceAccountPublicKey = await createNonceAccount(
    connection,
    feePayerKeypair
  );
  const nonceAccountData = await connection.getNonce(
    nonceAccountPublicKey,
    "finalized"
  );

  const nonce = nonceAccountData.nonce;
  const nonceInstruction = SystemProgram.nonceAdvance({
    authorizedPubkey: feePayerKeypair.publicKey,
    noncePubkey: nonceAccountPublicKey,
  });

  const wallet = new anchor.Wallet(feePayerKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "finalized",
  });
  anchor.setProvider(provider);
  const program = anchor.workspace.Swap as Program<Swap>;

  const swapProgramInstruction = await program.methods
    .swap(new BN(swapAmountInDollars * Math.pow(10, tokenBDecimals)))
    .accounts({
      feePayer: feePayerKeypair.publicKey,
      tokenA: tokenA.address,
      tokenASender: tokenAHolderKeypair.publicKey,
      tokenASenderAta: tokenAAccountToHold.address,
      tokenB: tokenB.address,
      tokenBReceiver: tokenBRecipientWallet,
      tokenBReceiverAta: tokenBRecipientAccountToHold.address,
      tokenBMultsig: tokenBMintAuthorityAccount,
      appWalletSigner: novattiWalletKeypair.publicKey,
      programPda: programPDAAddress,
      splTokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const swapTransaction = new Transaction({
    feePayer: feePayerKeypair.publicKey,
    nonceInfo: { nonce, nonceInstruction },
  }).add(swapProgramInstruction);

  // Add payer's signature
  swapTransaction.partialSign(feePayerKeypair);

  let swapTransactionBufferString = bs58.encode(
    swapTransaction.serialize({
      requireAllSignatures: false,
    })
  );

  // Add signature of novatti wallet
  swapTransactionBufferString = signOfflineTransaction(
    swapTransactionBufferString,
    novattiWalletKeypair
  );
  // Add signature of tokenA holder. Necessary to sign token A burn instruction.
  swapTransactionBufferString = signOfflineTransaction(
    swapTransactionBufferString,
    tokenAHolderKeypair
  );

  const readyToExecuteTxBuffer = bs58.decode(
    swapTransactionBufferString
  ) as Buffer;

  const tx = await sendAndConfirmRawTransaction(
    connection,
    readyToExecuteTxBuffer
  );
  console.log("Transaction ID:", tx);

  // Withdraw nonce balance to fee payer
  await withdrawNonce(
    connection,
    nonceAccountPublicKey.toBase58(),
    feePayerKeypair,
    feePayerKeypair.publicKey.toBase58()
  );
};

// -------- EXAMPLES -------- //

// // devnet test data
const feePayerKeypair = fetchFeePayer();
// 5S7YvvaEHcM65Kptznm7rsWauLcQMAnmpUVNAyMsnFXV
const tokenAHolderKeypair = fetchAUDRHolderKeypair();
const novattiWalletKeypair = fetchNovattiAppKeypair();
const programPDAAddress = fetchProgramPDA(
  connection,
  feePayerKeypair
).toBase58();
console.log("programPDAAddress:", programPDAAddress);

// AUDR
const tokenAAddress = "9SGWV5EE8wZu71KQHfCtJAxyutNCN9oyEeWtKzQsugKW";
// AUDD
const tokenBAddress = "55hXBV5YqYzAN3H2hXE8bVZj7iaskpLPkdJr5Z3CmtDq";

const tokenBRecipientWalletAddress =
  "9gHCJSMWZAFvaLDa8aczr9NBH97gTaUf9czR7brXQ2y1";
// AUDD SPL Multisig
const tokenBMintAuthorityAccountAddress =
  "EPQU2kpt3cVNwZsAvNGKJ2FEpKz28QBEGPVrw4KxhsK8";

// Swap 0.01 AUDR to 0.01 AUDD
// from tokenAHolderKeypair("5S7YvvaEHcM65Kptznm7rsWauLcQMAnmpUVNAyMsnFXV")
// to tokenBRecipientWalletAddress("9gHCJSMWZAFvaLDa8aczr9NBH97gTaUf9czR7brXQ2y1")
swapTokenAToTokenBScenario(
  connection,
  feePayerKeypair,
  tokenAAddress,
  tokenBAddress,
  tokenAHolderKeypair,
  tokenBRecipientWalletAddress,
  tokenBMintAuthorityAccountAddress,
  programPDAAddress,
  novattiWalletKeypair,
  0.01
);

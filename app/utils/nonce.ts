import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  PublicKey,
  NONCE_ACCOUNT_LENGTH,
} from "@solana/web3.js";

/**
 * Creates a nonce account.
 * @param {Connection} connection - The connection object.
 * @param {Keypair} feePayerKeypair - The keypair of the fee payer. He will be the nonce authority.
 * @returns {Promise<PublicKey>} - The created nonce account data.
 */
const createNonceAccount = async (
  connection: Connection,
  feePayerKeypair: Keypair
): Promise<PublicKey> => {
  console.log("------------------", "createNonceAccount", "------------------");

  // Generate a new keypair for the nonce account
  const nonceAccount = Keypair.generate();

  console.log("Nonce Account Public Key:", nonceAccount.publicKey.toBase58());

  // Get the minimum required balance for the nonce account
  const minimumAmount = await connection.getMinimumBalanceForRentExemption(
    NONCE_ACCOUNT_LENGTH
  );

  // Form the CreateNonceAccount transaction
  const transaction = new Transaction().add(
    SystemProgram.createNonceAccount({
      fromPubkey: feePayerKeypair.publicKey,
      noncePubkey: nonceAccount.publicKey,
      authorizedPubkey: feePayerKeypair.publicKey,
      lamports: minimumAmount,
    })
  );

  // Send and confirm the transaction
  await sendAndConfirmTransaction(
    connection,
    transaction,
    [feePayerKeypair, nonceAccount],
    { commitment: "finalized" }
  );

  console.log("------------------", "createNonceAccount", "------------------");

  return nonceAccount.publicKey;
};

/**
 * Withdraws the nonce balance from a specified address to another address.
 *
 * @param {Connection} connection - The connection object for interacting with the Solana network.
 * @param {string} nonceAddress - The address of the nonce account.
 * @param {Keypair} authorizedKeypair - The authorized keypair for the nonce account.
 * @param {string} transferToAddress - The address to transfer the nonce balance to.
 * @returns {Promise<void>} - A promise that resolves when the transaction is confirmed.
 */
const withdrawNonce = async (
  connection: Connection,
  nonceAddress: string,
  authorizedKeypair: Keypair,
  transferToAddress: string
): Promise<void> => {
  console.log("------------------", "withdrawNonce", "------------------");
  const noncePubkey = new PublicKey(nonceAddress);
  const balance = await connection.getBalance(noncePubkey, "confirmed");
  const transferToPubkey = new PublicKey(transferToAddress);

  const transaction = new Transaction().add(
    SystemProgram.nonceWithdraw({
      noncePubkey: noncePubkey,
      authorizedPubkey: authorizedKeypair.publicKey,
      toPubkey: transferToPubkey,
      lamports: balance,
    })
  );

  // Send and confirm the transaction
  await sendAndConfirmTransaction(
    connection,
    transaction,
    [authorizedKeypair],
    { commitment: "finalized" }
  );

  console.log("------------------", "withdrawNonce", "------------------");
};

export { createNonceAccount, withdrawNonce };

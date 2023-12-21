import {
  Wallet,
  DEFAULT_MULTISIG_PROGRAM_ID,
  getAuthorityPDA,
  TransactionAccount,
} from "@sqds/sdk";
import Squads from "@sqds/sdk";
import BN from "bn.js";
import {
  PublicKey,
  sendAndConfirmRawTransaction,
  Keypair,
  Transaction,
  SystemProgram,
  Connection,
} from "@solana/web3.js";
import {
  createMintToInstruction,
  createBurnInstruction,
} from "@solana/spl-token";
import { getTokenInfo } from "./token";
import bs58 from "bs58";

/**
 * Creates a connection to the Squads endpoint using the provided connection and fee payer keypair.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {Keypair} feePayerKeypair - The fee payer keypair.
 * @returns {Squads} The Squads endpoint connection.
 */
const createSquadsConnection = (
  connection: Connection,
  feePayerKeypair: Keypair
): Squads =>
  Squads.endpoint(connection.rpcEndpoint, new Wallet(feePayerKeypair));

/**
 * Creates a new Squad multisig account.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {Keypair} squadMemberFeePayerKeypair - The keypair of the fee payer. He he will be automatically included to squad members. If you want to aviod this, select squadMemberFeePayer from members array
 * @param {string[]} members - An array of member public keys.
 * @param {number} threshold - The number of required signatures for a transaction.
 * @param {string} name - The name of the squad.
 * @param {string} description - The description of the squad.
 * @returns {Promise<Object>} - An object containing squad's multisig public key and vault public key.
 */
const createSquad = async (
  connection: Connection,
  squadMemberFeePayerKeypair: Keypair,
  members: string[],
  threshold: number,
  name: string,
  description: string
): Promise<{ multisigPublicKey: PublicKey; vaultPublicKey: PublicKey }> => {
  console.log("------------------", "createSquad", "------------------");
  // random key so no collision
  const createKey = new Keypair().publicKey;
  const member_public_keys = members.map((member) => new PublicKey(member));
  const squadsConnection = createSquadsConnection(
    connection,
    squadMemberFeePayerKeypair
  );

  const multisigAccount = await squadsConnection.createMultisig(
    threshold,
    createKey,
    member_public_keys,
    name,
    description
  );

  console.log(
    "Successfully created a new Squad multisig at",
    multisigAccount.publicKey.toBase58()
  );
  console.log(
    "Squad multisig account details:",
    JSON.stringify(multisigAccount)
  );

  const [vault] = getAuthorityPDA(
    multisigAccount.publicKey,
    new BN(1),
    DEFAULT_MULTISIG_PROGRAM_ID
  );

  console.log("Default Squad vault address:", vault.toBase58());
  console.log("------------------", "createSquad", "------------------");

  return {
    multisigPublicKey: multisigAccount.publicKey,
    vaultPublicKey: vault,
  };
};

/**
 * Creates and activates a mint token transaction using squads transaction builder.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {Keypair} squadMemberFeePayerKeypair - The keypair of the squad member who will pay the fee.
 * @param {string} tokenAddress - The address of the token to be minted.
 * @param {string} recipientAccountToHoldTokenAddress - The address of the recipient associated token account that will hold the minted token.
 * @param {string} splMultisigAccountAddress - The address of the SPL multisig account that holds mintAuthority of the token.
 * @param {string[]} splMultisigAccountSignersAddresses - The addresses of the signers for the mint transaction from SPL multisig account.
 * @param {string} squadMultisigAddress - The address of the squad multisig account. Not vault.
 * @param {number} amountInDollars - The amount of the token to be minted, in dollars.
 * @returns {Promise<TransactionAccount>} The activated transaction.
 */
const createAndActivateMintTransaction = async (
  connection: Connection,
  squadMemberFeePayerKeypair: Keypair,
  tokenAddress: string,
  recipientAccountToHoldTokenAddress: string,
  splMultisigAccountAddress: string,
  splMultisigAccountSignersAddresses: string[],
  squadMultisigAddress: string,
  amountInDollars: number
): Promise<TransactionAccount> => {
  console.log(
    "------------------",
    "createAndActivateMintTransaction",
    "------------------"
  );

  const squadsConnection = createSquadsConnection(
    connection,
    squadMemberFeePayerKeypair
  );
  const token = await getTokenInfo(connection, tokenAddress);
  const recipientAccountToHoldToken = new PublicKey(
    recipientAccountToHoldTokenAddress
  );
  const multisigAccount = new PublicKey(splMultisigAccountAddress);
  const multisigAccountSignersPublicKeys =
    splMultisigAccountSignersAddresses.map((signer) => new PublicKey(signer));
  const squadMultisigPublicKey = new PublicKey(squadMultisigAddress);
  const tokenDecimals = token.decimals;

  // Create a multisig instruction to mint a token and send it to the recipient wallet
  const mintTokenInstruction = createMintToInstruction(
    token.address,
    recipientAccountToHoldToken,
    multisigAccount,
    amountInDollars * Math.pow(10, tokenDecimals),
    multisigAccountSignersPublicKeys
  );

  // create the multisig transaction - use default authority Vault (1)
  // there is an option to create several vaults for one squad but we don't need it
  const multisigTransaction = await squadsConnection.createTransaction(
    squadMultisigPublicKey,
    1
  );

  // Add mint instruction to the transaction
  await squadsConnection.addInstruction(
    multisigTransaction.publicKey,
    mintTokenInstruction
  );

  // activate the transaction so all members can vote on it
  const transaction = await squadsConnection.activateTransaction(
    multisigTransaction.publicKey
  );
  console.log("Squad transaction publickey:", transaction.publicKey);

  console.log(
    "------------------",
    "createAndActivateMintTransaction",
    "------------------"
  );

  return transaction;
};

/**
 * Creates a blank transaction.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {PublicKey} feePayer - The keypair of the fee payer.
 * @returns {Promise<Transaction>} - The blank transaction.
 */
const createBlankTransaction = async (
  connection: Connection,
  feePayerPublicKey: PublicKey
) => {
  const { blockhash } = await connection.getLatestBlockhash();
  const lastValidBlockHeight = await connection.getBlockHeight();

  return new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: feePayerPublicKey,
  });
};

/**
 * Executes a squad transaction with SPL multisig.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {Keypair} squadMemberFeePayerKeypair - The keypair of the squad member who will pay the fee and will be transaction executor from Squads side.
 * @param {string} squadTransactionAddress - The address of the squad transaction.
 * @param {Keypair[]} splMultisigSigners - The signers for the SPL multisig besides squad vault.
 * @returns {Promise<TransactionAccount>} - The post execution state of the transaction.
 */
const executeSquadTransactionWithSplMultisig = async (
  connection: Connection,
  squadMemberFeePayerKeypair: Keypair,
  squadTransactionAddress: string,
  splMultisigSigners: Keypair[]
): Promise<TransactionAccount> => {
  console.log(
    "------------------",
    "executeSquadTransactionWithSplMultisig",
    "------------------"
  );
  const squadsConnection = createSquadsConnection(
    connection,
    squadMemberFeePayerKeypair
  );
  const multisigTransactionPublicKey = new PublicKey(squadTransactionAddress);

  const executeIx = await squadsConnection.buildExecuteTransaction(
    multisigTransactionPublicKey,
    squadMemberFeePayerKeypair.publicKey
  );
  const executeTx = await createBlankTransaction(
    connection,
    squadMemberFeePayerKeypair.publicKey
  );

  executeTx.add(executeIx);

  const signersPublicKeys = [
    squadMemberFeePayerKeypair,
    ...splMultisigSigners,
  ].map((signer) => signer.publicKey);

  executeTx.setSigners(...signersPublicKeys);
  executeTx.partialSign(squadMemberFeePayerKeypair);
  executeTx.partialSign(...splMultisigSigners);

  await sendAndConfirmRawTransaction(connection, executeTx.serialize(), {
    skipPreflight: true,
    commitment: "confirmed",
  });

  const postExecuteState = await squadsConnection.getTransaction(
    multisigTransactionPublicKey
  );
  console.log("Squad transaction state:", postExecuteState.status);

  console.log(
    "------------------",
    "executeSquadTransactionWithSplMultisig",
    "------------------"
  );
  return postExecuteState;
};

/**
 * Rejects a squad transaction.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {Keypair} squadMemberKeypair - The keypair of the squad member who will pay the fee.
 * @param {string} squadTransactionAddress - The address of the squad transaction.
 * @returns {Promise<TransactionAccount>} - The transaction state after rejection.
 */
const rejectTransaction = async (
  connection: Connection,
  squadMemberKeypair: Keypair,
  squadTransactionAddress: string
): Promise<TransactionAccount> => {
  console.log("------------------", "rejectTransaction", "------------------");
  const squadTransactionPublicKey = new PublicKey(squadTransactionAddress);
  const squadsConnection = createSquadsConnection(
    connection,
    squadMemberKeypair
  );

  await squadsConnection.rejectTransaction(squadTransactionPublicKey);
  const transactionState = await squadsConnection.getTransaction(
    squadTransactionPublicKey
  );
  console.log("Transaction state:", transactionState.status);

  console.log("------------------", "rejectTransaction", "------------------");
  return transactionState;
};

/**
 * Approves a transaction by squad member.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {Keypair} squadMemberKeypair - The squad member's keypair.
 * @param {string} squadTransactionAddress - The address of the squad transaction.
 * @returns {Promise<TransactionAccount>} - The state of the approved transaction.
 */
const approveTransaction = async (
  connection: Connection,
  squadMemberKeypair: Keypair,
  squadTransactionAddress: string
): Promise<TransactionAccount> => {
  console.log("------------------", "approveTransaction", "------------------");
  const squadTransactionPublicKey = new PublicKey(squadTransactionAddress);
  const squadsConnection = createSquadsConnection(
    connection,
    squadMemberKeypair
  );

  await squadsConnection.approveTransaction(squadTransactionPublicKey);
  const transactionState = await squadsConnection.getTransaction(
    squadTransactionPublicKey
  );
  console.log("Transaction state:", transactionState.status);

  console.log("------------------", "approveTransaction", "------------------");
  return transactionState;
};

/**
 * Checks the state of a transaction in a squad.
 * @param {Connection} connection - The Solana connection object.
 * @param {Keypair} squadMemberKeypair - The squad member's keypair.
 * @param {string} squadTransactionAddress - The address of the squad transaction.
 * @returns {Promise<TransactionAccount>} - The state of the transaction.
 */
const checkTransactionState = async (
  connection: Connection,
  squadMemberKeypair: Keypair,
  squadTransactionAddress: string
): Promise<TransactionAccount> => {
  console.log(
    "------------------",
    "checkTransactionState",
    "------------------"
  );
  const squadsConnection = createSquadsConnection(
    connection,
    squadMemberKeypair
  );
  const squadTransactionPublicKey = new PublicKey(squadTransactionAddress);

  const transactionState = await squadsConnection.getTransaction(
    squadTransactionPublicKey
  );
  console.log("Transaction state:", transactionState.status);

  console.log(
    "------------------",
    "checkTransactionState",
    "------------------"
  );
  return transactionState;
};

/**
 * Cancels squad transaction.
 *
 * @param {Connection} connection - The Solana connection object.
 * @param {Keypair} squadMemberKeypair - The keypair of the squad member.
 * @param {string} squadTransactionAddress - The address of the squad transaction.
 * @returns {Promise<TransactionAccount>} - The state of the cancelled transaction.
 */
const cancelTransaction = async (
  connection: Connection,
  squadMemberKeypair: Keypair,
  squadTransactionAddress: string
): Promise<TransactionAccount> => {
  console.log("------------------", "cancelTransaction", "------------------");
  const squadsConnection = createSquadsConnection(
    connection,
    squadMemberKeypair
  );
  const squadTransactionPublicKey = new PublicKey(squadTransactionAddress);

  const transactionState = await squadsConnection.cancelTransaction(
    squadTransactionPublicKey
  );
  console.log("Transaction state:", transactionState.status);

  console.log(
    "------------------",
    "checkTransactionState",
    "------------------"
  );
  return transactionState;
};

export {
  createSquad,
  createSquadsConnection,
  createAndActivateMintTransaction,
  executeSquadTransactionWithSplMultisig,
  approveTransaction,
  rejectTransaction,
  cancelTransaction,
  checkTransactionState,
};

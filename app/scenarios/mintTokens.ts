import { getOrCreateAccountToHoldToken } from "../utils/token";
import {
  createAndActivateMintTransaction,
  executeSquadTransactionWithSplMultisig,
  rejectTransaction,
  approveTransaction,
  checkTransactionState,
} from "../utils/squad";
import {
  fetchNovattiAppKeypair,
  fetchFeePayer,
  fetchSquadParticipantKeypair,
} from "../utils/keypairs";
import { PublicKey } from "@solana/web3.js";
import { connection } from "../utils/connection";

const mintTokenToAccountScenario = async (
  connection: any,
  feePayerKeypair: any,
  squadMemberKeypair: any,
  tokenAddress: string,
  recipientWalletAddress: string,
  tokenMintAuthorityAccountAddress: string,
  novattiWalletKeypair: any,
  squadVaultAddress: string,
  squadMultisigAddress: string,
  amountInDollars: number
) => {
  // feePayerKeypair is also squad member
  const squadMemberFeePayerKeypair = feePayerKeypair;
  const token = new PublicKey(tokenAddress);
  const recipientWalletPublicKey = new PublicKey(recipientWalletAddress);
  const tokenMintAuthorityPublicKey = new PublicKey(
    tokenMintAuthorityAccountAddress
  );
  const squadVaultPublicKey = new PublicKey(squadVaultAddress);
  const squadMultisigPublicKey = new PublicKey(squadMultisigAddress);

  // Create destination associated token account
  const accountToHoldToken = await getOrCreateAccountToHoldToken(
    connection,
    feePayerKeypair,
    token.toBase58(),
    recipientWalletPublicKey.toBase58()
  );

  // Create and activate mint transaction via squad transaction builder
  let transaction = await createAndActivateMintTransaction(
    connection,
    squadMemberFeePayerKeypair,
    tokenAddress,
    accountToHoldToken.address.toBase58(),
    tokenMintAuthorityPublicKey.toBase58(),
    [novattiWalletKeypair.publicKey.toBase58(), squadVaultPublicKey.toBase58()],
    squadMultisigPublicKey.toBase58(),
    amountInDollars
  );

  // After transaction is created and activated all squad members are able to see and vote(approve/reject) for it

  // Squad member rejects the transaction
  transaction = await rejectTransaction(
    connection,
    squadMemberKeypair,
    transaction.publicKey.toBase58()
  );

  // Another squad member approves the transaction and it will be enough to execute it
  transaction = await approveTransaction(
    connection,
    squadMemberFeePayerKeypair,
    transaction.publicKey.toBase58()
  );

  // After approval the transaction moved to executeReady state
  await checkTransactionState(
    connection,
    squadMemberFeePayerKeypair,
    transaction.publicKey.toBase58()
  );

  // In executeReady state the transaction can be executed by any squad member
  // and also we need to add novattiWalletKeypair to signers to meet spl multisig requirements
  await executeSquadTransactionWithSplMultisig(
    connection,
    feePayerKeypair,
    transaction.publicKey.toBase58(),
    [novattiWalletKeypair]
  );
};

// -------- EXAMPLES -------- //

// Common data
const feePayerKeypair = fetchFeePayer();
const novattiWalletKeypair = fetchNovattiAppKeypair();
const squadMemberKeypair = fetchSquadParticipantKeypair();

// AUDD devnet test data
const auddTokenAddress = "55hXBV5YqYzAN3H2hXE8bVZj7iaskpLPkdJr5Z3CmtDq";
const auddRecipientWalletAddress =
  "9gHCJSMWZAFvaLDa8aczr9NBH97gTaUf9czR7brXQ2y1";
const auddTokenMintAuthorityAccountAddress =
  "EPQU2kpt3cVNwZsAvNGKJ2FEpKz28QBEGPVrw4KxhsK8";
const auddSquadVaultAddress = "BTeTt6YdQ2NthGGwzh7hXXhmXDqUbKGKZR5pD6uK6iey";
const auddSquadMultisigAddress = "sqU4oXpRcomnYXzuipbkZZ6JYC6uPRTDHNq1ZLB6H9C";

// Mint 5 AUDD to recipientWalletAddress
mintTokenToAccountScenario(
  connection,
  feePayerKeypair,
  squadMemberKeypair,
  auddTokenAddress,
  auddRecipientWalletAddress,
  auddTokenMintAuthorityAccountAddress,
  novattiWalletKeypair,
  auddSquadVaultAddress,
  auddSquadMultisigAddress,
  5
);

// AUDR devnet test data
const audrTokenAddress = "9SGWV5EE8wZu71KQHfCtJAxyutNCN9oyEeWtKzQsugKW";
const audrRecipientWalletAddress =
  "5S7YvvaEHcM65Kptznm7rsWauLcQMAnmpUVNAyMsnFXV";
const audrTokenMintAuthorityAccountAddress =
  "GPDoCbVxGx4yCwrFuE4gwHwB1RknKF2LyW1vRXEF8qMn";
const audrSquadVaultAddress = "G1E5VhFdshjYCtHrBuDyDSsLANoELT8k23nqbyjENZPr";
const audrSquadMultisigAddress = "HAwVWnEn4BmhXVA3JePLmL2xLQWW6kvJzaGErpbGxRwD";

// Mint 5 AUDR to recipientWalletAddress
mintTokenToAccountScenario(
  connection,
  feePayerKeypair,
  squadMemberKeypair,
  audrTokenAddress,
  audrRecipientWalletAddress,
  audrTokenMintAuthorityAccountAddress,
  novattiWalletKeypair,
  audrSquadVaultAddress,
  audrSquadMultisigAddress,
  5
);

import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createMint,
  setAuthority,
  getMint,
  AuthorityType,
  Mint,
  Account,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  createUpdateMetadataAccountV2Instruction,
  DataV2,
} from "@metaplex-foundation/mpl-token-metadata";
import { findMetadataPda } from "@metaplex-foundation/js";

/**
 * Creates a token using the provided parameters.
 *
 * @param {Connection} connection - The connection object.
 * @param {Keypair} feePayerKeypair - The keypair of the fee payer.
 * @param {string} mintAuthorityAddress - The address of the mint authority.
 * @param {string} freezeAuthorityAddress - The address of the freeze authority.
 * @param {number} [tokenDecimals=6] - The number of decimal places for the token.
 * @returns {Promise<PublicKey>} - The created token mint.
 */
const createToken = async (
  connection: Connection,
  feePayerKeypair: Keypair,
  mintAuthorityAddress: string,
  freezeAuthorityAddress: string,
  tokenDecimals = 6
): Promise<PublicKey> => {
  console.log("------------------", "createToken", "------------------");

  const mintAuthority = new PublicKey(mintAuthorityAddress);
  const freezeAuthority = new PublicKey(freezeAuthorityAddress);

  const mint = await createMint(
    connection,
    feePayerKeypair,
    mintAuthority,
    freezeAuthority,
    tokenDecimals,
    undefined,
    { commitment: "finalized" }
  );
  console.log("Token Address:", mint.toBase58());

  console.log("------------------", "createToken", "------------------");

  return mint;
};

/**
 * Updates the mint authority of a token.
 *
 * @param {Connection} connection - The connection object.
 * @param {Keypair} feePayerKeypair - The keypair of the fee payer.
 * @param {string} tokenAddress - The address of the token.
 * @param {string} newMintAuthorityAddress - The address of the new mint authority.
 * @returns {Promise<PublicKey>} - The mint public key.
 */
const updateMintAuthority = async (
  connection: Connection,
  feePayerKeypair: Keypair,
  tokenAddress: string,
  newMintAuthorityAddress: string
): Promise<PublicKey> => {
  console.log(
    "------------------",
    "updateMintAuthority",
    "------------------"
  );

  const mint = new PublicKey(tokenAddress);
  const newMintAuthority = new PublicKey(newMintAuthorityAddress);

  await setAuthority(
    connection,
    feePayerKeypair,
    mint,
    feePayerKeypair,
    AuthorityType.MintTokens,
    newMintAuthority,
    undefined,
    { commitment: "finalized" }
  );

  console.log("Token mint authority updated to:", newMintAuthority.toBase58());

  console.log(
    "------------------",
    "updateMintAuthority",
    "------------------"
  );
  return mint;
};

/**
 * Retrieves information about a token.
 *
 * @param {Connection} connection - The connection object.
 * @param {string} tokenAddress - The address of the token.
 * @returns {Promise<Mint>} - The token information.
 */
const getTokenInfo = async (
  connection: Connection,
  tokenAddress: string
): Promise<Mint> => {
  console.log("------------------", "getTokenInfo", "------------------");
  const mint = new PublicKey(tokenAddress);

  // Get the Token object for the mint account
  const mintInfo = await getMint(connection, mint, "finalized");

  console.log("Token address:", mintInfo.address.toBase58());
  console.log("Mint decimals:", mintInfo.decimals.toString());
  console.log("Mint total supply:", mintInfo.supply.toString());
  console.log("Mint authority:", mintInfo.mintAuthority.toBase58());
  console.log("Freeze authority:", mintInfo.freezeAuthority.toBase58());

  console.log("------------------", "getTokenInfo", "------------------");
  return mintInfo;
};

/**
 * Creates or retrieves an account to hold tokens for mint(with tokenAddress).
 *
 * @param {Connection} connection - The connection object.
 * @param {Keypair} feePayerKeypair - The keypair of the fee payer.
 * @param {string} tokenAddress - The address of the unique token.
 * @param {string} ownerAddress - The address of the token owner.
 * @returns {Promise<Account>} The token account.
 */
const getOrCreateAccountToHoldToken = async (
  connection: Connection,
  feePayerKeypair: Keypair,
  tokenAddress: string,
  ownerAddress: string
): Promise<Account> => {
  console.log(
    "------------------",
    "getOrCreateAccountToHoldToken",
    "------------------"
  );

  // Address of your unique token. You received after running createToken
  const mint = new PublicKey(tokenAddress);
  const owner = new PublicKey(ownerAddress);

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    feePayerKeypair,
    mint,
    owner,
    undefined,
    "finalized",
    { commitment: "finalized" }
  );

  console.log(
    "Account to hold tokens for minting is:",
    tokenAccount.address.toBase58()
  );

  console.log(
    "------------------",
    "getOrCreateAccountToHoldToken",
    "------------------"
  );
  return tokenAccount;
};

/**
 * Sets the metaplex metadata for a token.
 *
 * @param {Connection} connection - The connection object.
 * @param {Keypair} feePayerKeypair - The keypair of the fee payer.
 * @param {string} tokenAddress - The address of the token.
 * @param {string} mintAuthorityAddress - The address of the mint authority.
 * @param {string} updateAuthorityAddress - The address of the update authority for metadata.
 * @param {DataV2} onChainMetadata - The metadata to be set on the token.
 * @returns {Promise<void>} - A promise that resolves when the metadata is set.
 */
const setTokenMetadata = async (
  connection: Connection,
  feePayerKeypair: Keypair,
  tokenAddress: string,
  mintAuthorityAddress: string,
  updateAuthorityAddress: string,
  onChainMetadata: DataV2
): Promise<void> => {
  console.log("------------------", "setTokenMetadata", "------------------");

  // Address of your unique token. You received after running createToken
  const mint = new PublicKey(tokenAddress);

  const mintAuthority = new PublicKey(mintAuthorityAddress);
  const updateAuthority = new PublicKey(updateAuthorityAddress);

  // Get metadata account associated with the token
  const metadataPDA = findMetadataPda(mint);
  console.log("Metadata PDA:", metadataPDA.toBase58());

  // Build metadata transaction
  const createMetadataTransaction = new Transaction().add(
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mint,
        mintAuthority: mintAuthority,
        payer: feePayerKeypair.publicKey,
        updateAuthority: updateAuthority,
      },
      {
        createMetadataAccountArgsV3: {
          data: onChainMetadata,
          isMutable: true,
          collectionDetails: null,
        },
      }
    )
  );

  // Invoke transaction
  await connection.sendTransaction(createMetadataTransaction, [
    feePayerKeypair,
  ]);

  console.log("------------------", "setTokenMetadata", "------------------");
};

/**
 * Updates the metaplex metadata of a token.
 *
 * @param {Connection} connection - The connection object.
 * @param {string} tokenAddress - The address of the token.
 * @param {Keypair} updateAuthorityKeypair - The keypair of the update authority for metadata.
 * @param {DataV2} newOnChainMetadata - The new metadata to be set.
 * @returns {Promise<void>} - A promise that resolves when the metadata is updated.
 */
const updateTokenMetadata = async (
  connection: Connection,
  tokenAddress: string,
  updateAuthorityKeypair: Keypair,
  newOnChainMetadata: DataV2
): Promise<void> => {
  console.log(
    "------------------",
    "updateTokenMetadata",
    "------------------"
  );

  // Address of your unique token. You received after running createToken
  const mint = new PublicKey(tokenAddress);

  // Get metadata account associated with the token
  const metadataPDA = findMetadataPda(mint);
  console.log("Metadata PDA:", metadataPDA.toBase58());

  // Build metadata transaction
  const updateMetadataTransaction = new Transaction().add(
    createUpdateMetadataAccountV2Instruction(
      {
        metadata: metadataPDA,
        updateAuthority: updateAuthorityKeypair.publicKey,
      },
      {
        updateMetadataAccountArgsV2: {
          data: newOnChainMetadata,
          updateAuthority: updateAuthorityKeypair.publicKey,
          primarySaleHappened: null,
          isMutable: true,
        },
      }
    )
  );

  // Invoke transaction
  await connection.sendTransaction(updateMetadataTransaction, [
    updateAuthorityKeypair,
  ]);

  console.log(
    "------------------",
    "updateTokenMetadata",
    "------------------"
  );
};

export {
  createToken,
  getOrCreateAccountToHoldToken,
  getTokenInfo,
  setTokenMetadata,
  updateMintAuthority,
  updateTokenMetadata,
};

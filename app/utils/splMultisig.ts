import { createMultisig } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

/**
 * Creates a multisig account.
 *
 * @param {Connection} connection - The connection object for interacting with the Solana network.
 * @param {Keypair} feePayerKeypair - The keypair of the fee payer.
 * @param {string[]} signers - An array of public key strings representing the signers.
 * @param {number} threshold - The threshold number of signers required to approve a transaction.
 * @returns {Promise<PublicKey>} - The public key of the created multisig account.
 */
const createMultisigAccount = async (
  connection: Connection,
  feePayerKeypair: Keypair,
  signers: string[],
  threshold: number
): Promise<PublicKey> => {
  console.log(
    "------------------",
    "createMultisigAccount",
    "------------------"
  );
  const signer_public_keys = signers.map((signer) => new PublicKey(signer));

  const multisigKey = await createMultisig(
    connection,
    feePayerKeypair,
    signer_public_keys,
    threshold
  );

  console.log(
    `Created ${threshold}/${signers.length} multisig ${multisigKey.toBase58()}`
  );
  console.log(
    "------------------",
    "createMultisigAccount",
    "------------------"
  );
  return multisigKey;
};

export { createMultisigAccount };

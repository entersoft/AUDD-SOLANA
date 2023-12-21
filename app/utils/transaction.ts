import { Transaction, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Signs an offline transaction with the provided keypair.
 *
 * @param {string} transactionBufferString - The serialized transaction buffer as a string.
 * @param {Keypair} keypair - The keypair used for signing the transaction.
 * @returns {string} - The serialized transaction buffer string after partial signing.
 */
const signOfflineTransaction = (
  transactionBufferString: string,
  keypair: Keypair
): string => {
  console.log(
    "------------------",
    "signOfflineTransaction",
    "------------------"
  );
  const deserializedTx = Transaction.from(bs58.decode(transactionBufferString));
  deserializedTx.partialSign(keypair);

  const deserializedTxBufferString = bs58.encode(
    deserializedTx.serialize({
      requireAllSignatures: false,
    })
  );

  console.log(
    "------------------",
    "signOfflineTransaction",
    "------------------"
  );
  return deserializedTxBufferString;
};

export { signOfflineTransaction };

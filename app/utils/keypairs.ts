import fs from "fs";
import { Keypair } from "@solana/web3.js";

const fetchKeypairFromPKFile = (path: string): Keypair => {
  const privateKeyBytesPayer = Uint8Array.from(
    JSON.parse(fs.readFileSync(path, "utf-8"))
  );
  // Create a new keypair from the loaded private key
  const payer = Keypair.fromSecretKey(privateKeyBytesPayer);

  return payer;
};

export const fetchFeePayer = (): Keypair => {
  const keypair = fetchKeypairFromPKFile(".keys/feePayerPrivateKey.json");

  return keypair;
};

export const fetchNovattiAppKeypair = (): Keypair => {
  const keypair = fetchKeypairFromPKFile(".keys/novattiAppPK.json");

  return keypair;
};

export const fetchSquadParticipantKeypair = (): Keypair => {
  const keypair = fetchKeypairFromPKFile(".keys/participantSquadMemberPK.json");

  return keypair;
};

export const fetchAUDRHolderKeypair = (): Keypair => {
  const keypair = fetchKeypairFromPKFile(".keys/audrHolderPK.json");

  return keypair;
};

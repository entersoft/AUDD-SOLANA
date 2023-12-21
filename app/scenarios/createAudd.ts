import {
  createToken,
  setTokenMetadata,
  getTokenInfo,
  updateMintAuthority,
} from "../utils/token";
import { createSquad } from "../utils/squad";
import { createMultisigAccount } from "../utils/splMultisig";
import { connection } from "../utils/connection";
import {
  fetchFeePayer,
  fetchSquadParticipantKeypair,
  fetchNovattiAppKeypair,
} from "../utils/keypairs";
import { fetchProgramPDA } from "../utils/program";

interface OnChainMetadata {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: any;
  collection: any;
  uses: any;
}

const createAuddTokenScenario = async (
  connection: any,
  feePayerKeypair: any,
  squadMembers: string[],
  novattiAppWalletPublicKey: any,
  tokenOnChainMetadata: OnChainMetadata
) => {
  // We will include feePayerKeypair to AUDD squad
  const squadMemberFeePayerKeypair = feePayerKeypair;
  const squadConfig = await createSquad(
    connection,
    squadMemberFeePayerKeypair,
    squadMembers,
    1,
    "AUDD Squad",
    "Squad description"
  );

  const programPDA = fetchProgramPDA(connection, feePayerKeypair);
  const multisigMembers = [
    programPDA.toBase58(),
    novattiAppWalletPublicKey.toBase58(),
    squadConfig.vaultPublicKey.toBase58(),
  ];

  const multisigPublicKey = await createMultisigAccount(
    connection,
    feePayerKeypair,
    multisigMembers,
    2
  );

  const auddToken = await createToken(
    connection,
    feePayerKeypair,
    feePayerKeypair.publicKey.toBase58(),
    squadConfig.vaultPublicKey.toBase58(),
    6
  );

  // TODO: Add comments on metadata mint and update authority scheme
  await setTokenMetadata(
    connection,
    feePayerKeypair,
    auddToken.toBase58(),
    feePayerKeypair.publicKey.toBase58(),
    squadConfig.vaultPublicKey.toBase58(),
    tokenOnChainMetadata
  );

  await updateMintAuthority(
    connection,
    feePayerKeypair,
    auddToken.toBase58(),
    multisigPublicKey.toBase58()
  );

  await getTokenInfo(connection, auddToken.toBase58());
};

// -------- EXAMPLES -------- //

const onChainMetadata: OnChainMetadata = {
  name: "AUDD",
  symbol: "AUDD",
  // Offchain metadata format described here https://docs.metaplex.com/programs/token-metadata/token-standard#the-fungible-standard
  uri: "https://google.com/metadata.json",
  sellerFeeBasisPoints: 0,
  creators: null,
  collection: null,
  uses: null,
};
const feePayerKeypair = fetchFeePayer();
const squadMember = fetchSquadParticipantKeypair();
// Payer would be automatically included in the squad as member
const AUDDSquadMembers: string[] = [
  squadMember.publicKey.toBase58(),
  // other squad member's addresses
  // ...
];
const novattiAppWalletKeypair = fetchNovattiAppKeypair();

createAuddTokenScenario(
  connection,
  feePayerKeypair,
  AUDDSquadMembers,
  novattiAppWalletKeypair.publicKey,
  onChainMetadata
);

// Console output devnet:
// ------------------ createSquad ------------------
// Successfully created a new Squad multisig at sqU4oXpRcomnYXzuipbkZZ6JYC6uPRTDHNq1ZLB6H9C
// Squad multisig account details: {"threshold":1,"authorityIndex":1,"transactionIndex":0,"msChangeIndex":0,"bump":254,"createKey":"CYnsNE9TUT7R83oTGQAXSVptFpoiYLs9mXtonMxUTyxj","allowExternalExecute":false,"keys":["9gHCJSMWZAFvaLDa8aczr9NBH97gTaUf9czR7brXQ2y1","GV2LMGSyTSXb8CUjSfbmmjEaDWuKDGGrB4wMcsu1Cax1"],"publicKey":"sqU4oXpRcomnYXzuipbkZZ6JYC6uPRTDHNq1ZLB6H9C"}
// Default Squad vault address: BTeTt6YdQ2NthGGwzh7hXXhmXDqUbKGKZR5pD6uK6iey
// ------------------ createSquad ------------------
// ------------------ createMultisigAccount ------------------
// Created 2/3 multisig EPQU2kpt3cVNwZsAvNGKJ2FEpKz28QBEGPVrw4KxhsK8
// ------------------ createMultisigAccount ------------------
// ------------------ createToken ------------------
// Token Address: 55hXBV5YqYzAN3H2hXE8bVZj7iaskpLPkdJr5Z3CmtDq
// ------------------ createToken ------------------
// ------------------ setTokenMetadata ------------------
// Metadata PDA: Pda [PublicKey(E3at9Xuk9r13xXXFmfN4aVSoAjofXzctFP3rYMmvmMVE)] {
//   _bn: <BN: c1d166e8a10eef5058e66a1f6786bc176bf0e1f7339f36f469ae569d4ff11765>,
//   bump: 252
// }
// ------------------ setTokenMetadata ------------------
// ------------------ updateMintAuthority ------------------
// Token mint authority updated to: EPQU2kpt3cVNwZsAvNGKJ2FEpKz28QBEGPVrw4KxhsK8
// ------------------ updateMintAuthority ------------------
// ------------------ getTokenInfo ------------------
// Token address: 55hXBV5YqYzAN3H2hXE8bVZj7iaskpLPkdJr5Z3CmtDq
// Mint decimals: 6
// Mint total supply: 0
// Mint authority: EPQU2kpt3cVNwZsAvNGKJ2FEpKz28QBEGPVrw4KxhsK8
// Freeze authority: BTeTt6YdQ2NthGGwzh7hXXhmXDqUbKGKZR5pD6uK6iey
// ------------------ getTokenInfo ------------------

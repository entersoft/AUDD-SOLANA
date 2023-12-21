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

interface OnChainMetadata {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: any;
  collection: any;
  uses: any;
}

const createAudrTokenScenario = async (
  connection: any,
  feePayerKeypair: any,
  squadMembers: string[],
  novattiAppWalletPublicKey: any,
  tokenOnChainMetadata: OnChainMetadata
) => {
  // We will include feePayerKeypair to AUDR squad
  const squadMemberFeePayerKeypair = feePayerKeypair;
  const squadConfig = await createSquad(
    connection,
    squadMemberFeePayerKeypair,
    squadMembers,
    1,
    "AUDR Squad",
    "Squad description"
  );

  const multisigMembers = [
    novattiAppWalletPublicKey.toBase58(),
    squadConfig.vaultPublicKey.toBase58(),
  ];

  const multisigPublicKey = await createMultisigAccount(
    connection,
    feePayerKeypair,
    multisigMembers,
    2
  );

  const audrToken = await createToken(
    connection,
    feePayerKeypair,
    feePayerKeypair.publicKey.toBase58(),
    multisigPublicKey.toBase58(),
    6
  );

  // TODO: Add comments on metadata mint and update authority scheme
  await setTokenMetadata(
    connection,
    feePayerKeypair,
    audrToken.toBase58(),
    feePayerKeypair.publicKey.toBase58(),
    squadConfig.vaultPublicKey.toBase58(),
    tokenOnChainMetadata
  );

  await updateMintAuthority(
    connection,
    feePayerKeypair,
    audrToken.toBase58(),
    multisigPublicKey.toBase58()
  );

  await getTokenInfo(connection, audrToken.toBase58());
};

// -------- EXAMPLES -------- //

const onChainMetadata: OnChainMetadata = {
  name: "AUDR",
  symbol: "AUDR",
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
const squadMembers: string[] = [
  squadMember.publicKey.toBase58(),
  // other squad member's addresses
];
const novattiAppWalletKeypair = fetchNovattiAppKeypair();

createAudrTokenScenario(
  connection,
  feePayerKeypair,
  squadMembers,
  novattiAppWalletKeypair.publicKey,
  onChainMetadata
);

// Console output devnet:
// ------------------ createSquad ------------------
// Successfully created a new Squad multisig at HAwVWnEn4BmhXVA3JePLmL2xLQWW6kvJzaGErpbGxRwD
// Squad multisig account details: {"threshold":1,"authorityIndex":1,"transactionIndex":0,"msChangeIndex":0,"bump":255,"createKey":"5sCXLS9FWq9j15BKKo3M1RMa8m5smhwcMx9PM136xpAS","allowExternalExecute":false,"keys":["9gHCJSMWZAFvaLDa8aczr9NBH97gTaUf9czR7brXQ2y1","GV2LMGSyTSXb8CUjSfbmmjEaDWuKDGGrB4wMcsu1Cax1"],"publicKey":"HAwVWnEn4BmhXVA3JePLmL2xLQWW6kvJzaGErpbGxRwD"}
// Default Squad vault address: G1E5VhFdshjYCtHrBuDyDSsLANoELT8k23nqbyjENZPr
// ------------------ createSquad ------------------
// ------------------ createMultisigAccount ------------------
// Created 2/2 multisig GPDoCbVxGx4yCwrFuE4gwHwB1RknKF2LyW1vRXEF8qMn
// ------------------ createMultisigAccount ------------------
// ------------------ createToken ------------------
// Token Address: 9SGWV5EE8wZu71KQHfCtJAxyutNCN9oyEeWtKzQsugKW
// ------------------ createToken ------------------
// ------------------ setTokenMetadata ------------------
// Metadata PDA: Pda [PublicKey(F4ofsUBu2AJv4Dc6eYQMKaw59EwuqLnFzrhJUxvsC2Xa)] {
//   _bn: <BN: d0fd2128f653d4f606fb3a34a4d4c820cf3408f615fb5a212b410fd30fc5bb49>,
//   bump: 255
// }
// ------------------ setTokenMetadata ------------------
// ------------------ updateMintAuthority ------------------
// Token mint authority updated to: GPDoCbVxGx4yCwrFuE4gwHwB1RknKF2LyW1vRXEF8qMn
// ------------------ updateMintAuthority ------------------
// ------------------ getTokenInfo ------------------
// Token address: 9SGWV5EE8wZu71KQHfCtJAxyutNCN9oyEeWtKzQsugKW
// Mint decimals: 6
// Mint total supply: 0
// Mint authority: GPDoCbVxGx4yCwrFuE4gwHwB1RknKF2LyW1vRXEF8qMn
// Freeze authority: GPDoCbVxGx4yCwrFuE4gwHwB1RknKF2LyW1vRXEF8qMn
// ------------------ getTokenInfo ------------------

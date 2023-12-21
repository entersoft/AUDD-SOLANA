import { PublicKey } from "@solana/web3.js";
import {
  createSquadsConnection,
  checkTransactionState,
  approveTransaction,
  rejectTransaction,
  cancelTransaction,
} from "../../utils/squad";
import { fetchFeePayer } from "../../utils/keypairs";
import { connection } from "../../utils/connection";

const addMemberScenario = async (
  connection: any,
  squadMemberKeypair: any,
  squadMultisigAddress: string,
  newMemberAddress: string
) => {
  const squadsConnection = createSquadsConnection(
    connection,
    squadMemberKeypair
  );
  const newMemberPublicKey = new PublicKey(newMemberAddress);
  const squadMultisigPublicKey = new PublicKey(squadMultisigAddress);
  let txBuilder = await squadsConnection.getTransactionBuilder(
    squadMultisigPublicKey,
    0
  );
  
  // withAddMemberAndChangeThreshold(member: PublicKey, threshold: number)
  txBuilder = await txBuilder.withAddMember(newMemberPublicKey);
  const [_txInstructions, txPDA] = await txBuilder.executeInstructions();

  await squadsConnection.activateTransaction(txPDA);

  await approveTransaction(connection, squadMemberKeypair, txPDA.toBase58());
  //   await rejectTransaction(connection, squadMemberKeypair, txPDA.toBase58());
  //   await cancelTransaction(connection, squadMemberKeypair, txPDA.toBase58());

  await squadsConnection.executeTransaction(txPDA);

  await checkTransactionState(connection, squadMemberKeypair, txPDA.toBase58());
};

// -------- EXAMPLES -------- //

const squadMemberKeypair = fetchFeePayer();
const squadMultisigAddress = "GqWabLB86YLLBSGmV8d1XHPUW2ruwFAfm6NoEcHbrbc3";
const newMemberAddress = "5S7YvvaEHcM65Kptznm7rsWauLcQMAnmpUVNAyMsnFXV";

addMemberScenario(
  connection,
  squadMemberKeypair,
  squadMultisigAddress,
  newMemberAddress
);

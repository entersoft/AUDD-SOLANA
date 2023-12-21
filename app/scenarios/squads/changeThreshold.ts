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

const changeThresholdScenario = async (
  connection: any,
  squadMemberKeypair: any,
  squadMultisigAddress: string,
  newThreshold: number
) => {
  const squadsConnection = createSquadsConnection(
    connection,
    squadMemberKeypair
  );
  const squadMultisigPublicKey = new PublicKey(squadMultisigAddress);
  let txBuilder = await squadsConnection.getTransactionBuilder(
    squadMultisigPublicKey,
    0
  );

  txBuilder = await txBuilder.withChangeThreshold(newThreshold);
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

changeThresholdScenario(
  connection,
  squadMemberKeypair,
  squadMultisigAddress,
  1
);

import * as anchor from "@coral-xyz/anchor";
import { Program, BN, AnchorError } from "@coral-xyz/anchor";
import { Swap } from "../target/types/swap";
import {
  createMultisig,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

describe("swap()", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Swap as Program<Swap>;
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;
  const appWallet = anchor.web3.Keypair.generate();

  describe("when context is correct", () => {
    it("swaps tokens", async () => {
      // Token A setup
      const tokenAMintAuthorityKeypair = anchor.web3.Keypair.generate();
      const tokenAKeypair = anchor.web3.Keypair.generate();
      const tokenAHolderKeypair = anchor.web3.Keypair.generate();

      const tokenA = await createMint(
        connection,
        wallet.payer,
        tokenAMintAuthorityKeypair.publicKey,
        tokenAMintAuthorityKeypair.publicKey,
        6,
        tokenAKeypair,
        { commitment: "finalized", skipPreflight: true }
      );

      const tokenAHolderATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenA,
        tokenAHolderKeypair.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );

      // Token B setup
      const [programPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        program.programId
      );
      const multisig = await createMultisig(
        connection,
        wallet.payer,
        [appWallet.publicKey, programPDA],
        2
      );
      console.log("Multisig address:", multisig.toBase58());
      const tokenBKeypair = anchor.web3.Keypair.generate();
      const tokenB = await createMint(
        connection,
        wallet.payer,
        multisig,
        multisig,
        6,
        tokenBKeypair,
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token B address:", tokenB.toBase58());

      const recipientTokenBATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenB,
        wallet.payer.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );
      console.log(
        "Recipient token B ATA:",
        recipientTokenBATA.address.toBase58()
      );

      // Mint token A to holder
      await mintTo(
        connection,
        wallet.payer,
        tokenA,
        tokenAHolderATA.address,
        tokenAMintAuthorityKeypair,
        100,
        [],
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token A minted to holder");

      // Call.
      const tx = await program.methods
        .swap(new BN(10))
        .accounts({
          feePayer: wallet.payer.publicKey,
          tokenA: tokenAKeypair.publicKey,
          tokenASender: tokenAHolderKeypair.publicKey,
          tokenASenderAta: tokenAHolderATA.address,
          tokenB: tokenBKeypair.publicKey,
          tokenBReceiver: wallet.payer.publicKey,
          tokenBReceiverAta: recipientTokenBATA.address,
          tokenBMultsig: multisig,
          appWalletSigner: appWallet.publicKey,
          programPda: programPDA,
          splTokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([appWallet, wallet.payer, tokenAHolderKeypair])
        .rpc({
          skipPreflight: true,
          commitment: "finalized",
        })
        .catch((e) => {
          console.log(e);
          throw e;
        });
      console.log("Your transaction signature", tx);

      // Check
      const tokenAHolderATAAfter = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenA,
        tokenAHolderKeypair.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );
      const recipientTokenBATAAfter = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenB,
        wallet.payer.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );

      expect(tokenAHolderATAAfter.amount).to.equal(BigInt(90));
      expect(recipientTokenBATAAfter.amount).to.equal(BigInt(10));
    });
  });

  describe("when it's not enough token A on a sender's wallet", () => {
    it("throws error", async () => {
      // Token A setup
      const tokenAMintAuthorityKeypair = anchor.web3.Keypair.generate();
      const tokenAKeypair = anchor.web3.Keypair.generate();
      const tokenAHolderKeypair = anchor.web3.Keypair.generate();

      const tokenA = await createMint(
        connection,
        wallet.payer,
        tokenAMintAuthorityKeypair.publicKey,
        tokenAMintAuthorityKeypair.publicKey,
        6,
        tokenAKeypair,
        { commitment: "finalized", skipPreflight: true }
      );

      const tokenAHolderATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenA,
        tokenAHolderKeypair.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );

      // Token B setup
      const [programPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        program.programId
      );
      const multisig = await createMultisig(
        connection,
        wallet.payer,
        [appWallet.publicKey, programPDA],
        2
      );
      console.log("Multisig address:", multisig.toBase58());
      const tokenBKeypair = anchor.web3.Keypair.generate();
      const tokenB = await createMint(
        connection,
        wallet.payer,
        multisig,
        multisig,
        6,
        tokenBKeypair,
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token B address:", tokenB.toBase58());

      const recipientTokenBATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenB,
        wallet.payer.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );
      console.log(
        "Recipient token B ATA:",
        recipientTokenBATA.address.toBase58()
      );

      // Mint token A to holder
      await mintTo(
        connection,
        wallet.payer,
        tokenA,
        tokenAHolderATA.address,
        tokenAMintAuthorityKeypair,
        1,
        [],
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token A minted to holder");

      // Call.
      try {
        expect(
          await program.methods
            .swap(new BN(10))
            .accounts({
              feePayer: wallet.payer.publicKey,
              tokenA: tokenAKeypair.publicKey,
              tokenASender: tokenAHolderKeypair.publicKey,
              tokenASenderAta: tokenAHolderATA.address,
              tokenB: tokenBKeypair.publicKey,
              tokenBReceiver: wallet.payer.publicKey,
              tokenBReceiverAta: recipientTokenBATA.address,
              tokenBMultsig: multisig,
              appWalletSigner: appWallet.publicKey,
              programPda: programPDA,
              splTokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([appWallet, wallet.payer, tokenAHolderKeypair])
            .rpc({
              skipPreflight: true,
              commitment: "finalized",
            })
        ).to.throw(AnchorError);
      } catch (e) {
        expect(e.error.errorCode.code).to.equal("NotEnoughTokens");
        expect(e.error.errorCode.number).to.equal(6000);
      }
    });
  });

  describe("when swap amount is zero", () => {
    it("throws error", async () => {
      // Token A setup
      const tokenAMintAuthorityKeypair = anchor.web3.Keypair.generate();
      const tokenAKeypair = anchor.web3.Keypair.generate();
      const tokenAHolderKeypair = anchor.web3.Keypair.generate();

      const tokenA = await createMint(
        connection,
        wallet.payer,
        tokenAMintAuthorityKeypair.publicKey,
        tokenAMintAuthorityKeypair.publicKey,
        6,
        tokenAKeypair,
        { commitment: "finalized", skipPreflight: true }
      );

      const tokenAHolderATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenA,
        tokenAHolderKeypair.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );

      // Token B setup
      const [programPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        program.programId
      );
      const multisig = await createMultisig(
        connection,
        wallet.payer,
        [appWallet.publicKey, programPDA],
        2
      );
      console.log("Multisig address:", multisig.toBase58());
      const tokenBKeypair = anchor.web3.Keypair.generate();
      const tokenB = await createMint(
        connection,
        wallet.payer,
        multisig,
        multisig,
        6,
        tokenBKeypair,
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token B address:", tokenB.toBase58());

      const recipientTokenBATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenB,
        wallet.payer.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );
      console.log(
        "Recipient token B ATA:",
        recipientTokenBATA.address.toBase58()
      );

      // Mint token A to holder
      await mintTo(
        connection,
        wallet.payer,
        tokenA,
        tokenAHolderATA.address,
        tokenAMintAuthorityKeypair,
        1,
        [],
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token A minted to holder");

      // Call.
      try {
        expect(
          await program.methods
            .swap(new BN(0))
            .accounts({
              feePayer: wallet.payer.publicKey,
              tokenA: tokenAKeypair.publicKey,
              tokenASender: tokenAHolderKeypair.publicKey,
              tokenASenderAta: tokenAHolderATA.address,
              tokenB: tokenBKeypair.publicKey,
              tokenBReceiver: wallet.payer.publicKey,
              tokenBReceiverAta: recipientTokenBATA.address,
              tokenBMultsig: multisig,
              appWalletSigner: appWallet.publicKey,
              programPda: programPDA,
              splTokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([appWallet, wallet.payer, tokenAHolderKeypair])
            .rpc({
              skipPreflight: true,
              commitment: "finalized",
            })
        ).to.throw(AnchorError);
      } catch (e) {
        expect(e.error.errorCode.code).to.equal("ZeroSwapAmount");
        expect(e.error.errorCode.number).to.equal(6003);
      }
    });
  });

  describe("when token A and token B decimals are not the same", () => {
    it("throws error", async () => {
      // Token A setup
      const tokenAMintAuthorityKeypair = anchor.web3.Keypair.generate();
      const tokenAKeypair = anchor.web3.Keypair.generate();
      const tokenAHolderKeypair = anchor.web3.Keypair.generate();

      const tokenA = await createMint(
        connection,
        wallet.payer,
        tokenAMintAuthorityKeypair.publicKey,
        tokenAMintAuthorityKeypair.publicKey,
        4,
        tokenAKeypair,
        { commitment: "finalized", skipPreflight: true }
      );

      const tokenAHolderATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenA,
        tokenAHolderKeypair.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );

      // Token B setup
      const [programPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        program.programId
      );
      const multisig = await createMultisig(
        connection,
        wallet.payer,
        [appWallet.publicKey, programPDA],
        2
      );
      console.log("Multisig address:", multisig.toBase58());
      const tokenBKeypair = anchor.web3.Keypair.generate();
      const tokenB = await createMint(
        connection,
        wallet.payer,
        multisig,
        multisig,
        6,
        tokenBKeypair,
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token B address:", tokenB.toBase58());

      const recipientTokenBATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenB,
        wallet.payer.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );
      console.log(
        "Recipient token B ATA:",
        recipientTokenBATA.address.toBase58()
      );

      // Mint token A to holder
      await mintTo(
        connection,
        wallet.payer,
        tokenA,
        tokenAHolderATA.address,
        tokenAMintAuthorityKeypair,
        100,
        [],
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token A minted to holder");

      // Call.
      try {
        expect(
          await program.methods
            .swap(new BN(10))
            .accounts({
              feePayer: wallet.payer.publicKey,
              tokenA: tokenAKeypair.publicKey,
              tokenASender: tokenAHolderKeypair.publicKey,
              tokenASenderAta: tokenAHolderATA.address,
              tokenB: tokenBKeypair.publicKey,
              tokenBReceiver: wallet.payer.publicKey,
              tokenBReceiverAta: recipientTokenBATA.address,
              tokenBMultsig: multisig,
              appWalletSigner: appWallet.publicKey,
              programPda: programPDA,
              splTokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([appWallet, wallet.payer, tokenAHolderKeypair])
            .rpc({
              skipPreflight: true,
              commitment: "finalized",
            })
        ).to.throw(AnchorError);
      } catch (e) {
        expect(e.error.errorCode.code).to.equal("NotEqualDecimals");
        expect(e.error.errorCode.number).to.equal(6002);
      }
    });
  });

  describe("when you are trying to swap token A to token A", () => {
    it("throws error", async () => {
      // Token B setup
      const [programPDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        program.programId
      );
      const multisig = await createMultisig(
        connection,
        wallet.payer,
        [appWallet.publicKey, programPDA],
        1
      );
      console.log("Multisig address:", multisig.toBase58());
      const tokenBKeypair = anchor.web3.Keypair.generate();
      const tokenB = await createMint(
        connection,
        wallet.payer,
        multisig,
        multisig,
        6,
        tokenBKeypair,
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token B address:", tokenB.toBase58());

      const recipientTokenBATA = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        tokenB,
        wallet.payer.publicKey,
        false,
        "finalized",
        { skipPreflight: true, commitment: "finalized" }
      );
      console.log(
        "Recipient token B ATA:",
        recipientTokenBATA.address.toBase58()
      );

      // Mint token B to holder
      await mintTo(
        connection,
        wallet.payer,
        tokenB,
        recipientTokenBATA.address,
        multisig,
        100,
        [appWallet],
        { commitment: "finalized", skipPreflight: true }
      );
      console.log("Token B minted to holder");

      // Call.
      try {
        expect(
          await program.methods
            .swap(new BN(10))
            .accounts({
              feePayer: wallet.payer.publicKey,
              tokenA: tokenBKeypair.publicKey,
              tokenASender: wallet.payer.publicKey,
              tokenASenderAta: recipientTokenBATA.address,
              tokenB: tokenBKeypair.publicKey,
              tokenBReceiver: wallet.payer.publicKey,
              tokenBReceiverAta: recipientTokenBATA.address,
              tokenBMultsig: multisig,
              appWalletSigner: appWallet.publicKey,
              programPda: programPDA,
              splTokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([appWallet, wallet.payer])
            .rpc({
              skipPreflight: true,
              commitment: "finalized",
            })
        ).to.throw(AnchorError);
      } catch (e) {
        expect(e.error.errorCode.code).to.equal("RepeatedMint");
        expect(e.error.errorCode.number).to.equal(6001);
      }
    });
  });
});

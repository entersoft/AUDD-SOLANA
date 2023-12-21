export type Swap = {
  "version": "0.1.0",
  "name": "swap",
  "instructions": [
    {
      "name": "swap",
      "accounts": [
        {
          "name": "feePayer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenASender",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "tokenASenderAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenBReceiver",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenBReceiverAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenBMultsig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "appWalletSigner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "programPda",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotEnoughTokens",
      "msg": "You don't have enough tokens for this swap"
    },
    {
      "code": 6001,
      "name": "RepeatedMint",
      "msg": "You are trying to swap the same token"
    },
    {
      "code": 6002,
      "name": "NotEqualDecimals",
      "msg": "Tokens must have the same decimals"
    },
    {
      "code": 6003,
      "name": "ZeroSwapAmount",
      "msg": "Swap amount must be greater than zero"
    }
  ]
};

export const IDL: Swap = {
  "version": "0.1.0",
  "name": "swap",
  "instructions": [
    {
      "name": "swap",
      "accounts": [
        {
          "name": "feePayer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenA",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenB",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenASender",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "tokenASenderAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenBReceiver",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenBReceiverAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenBMultsig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "appWalletSigner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "programPda",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "splTokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotEnoughTokens",
      "msg": "You don't have enough tokens for this swap"
    },
    {
      "code": 6001,
      "name": "RepeatedMint",
      "msg": "You are trying to swap the same token"
    },
    {
      "code": 6002,
      "name": "NotEqualDecimals",
      "msg": "Tokens must have the same decimals"
    },
    {
      "code": 6003,
      "name": "ZeroSwapAmount",
      "msg": "Swap amount must be greater than zero"
    }
  ]
};

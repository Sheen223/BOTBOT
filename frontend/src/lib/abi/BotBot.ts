export const botBotAbi = [
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "_oracleAddress",
                           "type":  "address"
                       }
                   ],
        "stateMutability":  "nonpayable",
        "type":  "constructor"
    },
    {
        "inputs":  [

                   ],
        "name":  "ECDSAInvalidSignature",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "length",
                           "type":  "uint256"
                       }
                   ],
        "name":  "ECDSAInvalidSignatureLength",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "bytes32",
                           "name":  "s",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "ECDSAInvalidSignatureS",
        "type":  "error"
    },
    {
        "inputs":  [

                   ],
        "name":  "InvalidShortString",
        "type":  "error"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "string",
                           "name":  "str",
                           "type":  "string"
                       }
                   ],
        "name":  "StringTooLong",
        "type":  "error"
    },
    {
        "anonymous":  false,
        "inputs":  [

                   ],
        "name":  "EIP712DomainChanged",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "roomId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       }
                   ],
        "name":  "PlayerJoined",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "roomId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "address[]",
                           "name":  "refundedPlayers",
                           "type":  "address[]"
                       }
                   ],
        "name":  "RoomCancelled",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "roomId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "enum BotBot.RoomType",
                           "name":  "roomType",
                           "type":  "uint8"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "stakeAmount",
                           "type":  "uint256"
                       }
                   ],
        "name":  "RoomCreated",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "roomId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "address[]",
                           "name":  "winners",
                           "type":  "address[]"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "uint256",
                           "name":  "payoutPerWinner",
                           "type":  "uint256"
                       }
                   ],
        "name":  "RoomResolved",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "roomId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "enum BotBot.RoomState",
                           "name":  "newState",
                           "type":  "uint8"
                       }
                   ],
        "name":  "RoomStateChanged",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "roomId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       }
                   ],
        "name":  "VoteCommitted",
        "type":  "event"
    },
    {
        "anonymous":  false,
        "inputs":  [
                       {
                           "indexed":  true,
                           "internalType":  "uint256",
                           "name":  "roomId",
                           "type":  "uint256"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "address",
                           "name":  "player",
                           "type":  "address"
                       },
                       {
                           "indexed":  false,
                           "internalType":  "address",
                           "name":  "votedFor",
                           "type":  "address"
                       }
                   ],
        "name":  "VoteRevealed",
        "type":  "event"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_roomId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "cancelRoom",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "claimRewards",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_roomId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "bytes32",
                           "name":  "_commitHash",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "commitVote",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "commits",
        "outputs":  [
                        {
                            "internalType":  "bytes32",
                            "name":  "",
                            "type":  "bytes32"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "enum BotBot.RoomType",
                           "name":  "_roomType",
                           "type":  "uint8"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_stakeAmount",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_chatDuration",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_voteDuration",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "uint256",
                           "name":  "_revealDuration",
                           "type":  "uint256"
                       }
                   ],
        "name":  "createRoom",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "eip712Domain",
        "outputs":  [
                        {
                            "internalType":  "bytes1",
                            "name":  "fields",
                            "type":  "bytes1"
                        },
                        {
                            "internalType":  "string",
                            "name":  "name",
                            "type":  "string"
                        },
                        {
                            "internalType":  "string",
                            "name":  "version",
                            "type":  "string"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "chainId",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "address",
                            "name":  "verifyingContract",
                            "type":  "address"
                        },
                        {
                            "internalType":  "bytes32",
                            "name":  "salt",
                            "type":  "bytes32"
                        },
                        {
                            "internalType":  "uint256[]",
                            "name":  "extensions",
                            "type":  "uint256[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_roomId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "getHumanPlayers",
        "outputs":  [
                        {
                            "internalType":  "address[]",
                            "name":  "",
                            "type":  "address[]"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "hasCommitted",
        "outputs":  [
                        {
                            "internalType":  "bool",
                            "name":  "",
                            "type":  "bool"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "hasRevealed",
        "outputs":  [
                        {
                            "internalType":  "bool",
                            "name":  "",
                            "type":  "bool"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_roomId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "joinRoom",
        "outputs":  [

                    ],
        "stateMutability":  "payable",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "nextRoomId",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "oracleAddress",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [

                   ],
        "name":  "owner",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "pendingWithdrawals",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_roomId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "_aiAddress",
                           "type":  "address"
                       },
                       {
                           "internalType":  "bytes32",
                           "name":  "_salt",
                           "type":  "bytes32"
                       },
                       {
                           "internalType":  "bytes",
                           "name":  "_oracleSignature",
                           "type":  "bytes"
                       }
                   ],
        "name":  "resolveRoom",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_roomId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "_votedFor",
                           "type":  "address"
                       },
                       {
                           "internalType":  "string",
                           "name":  "_salt",
                           "type":  "string"
                       }
                   ],
        "name":  "revealVote",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "address",
                           "name":  "",
                           "type":  "address"
                       }
                   ],
        "name":  "reveals",
        "outputs":  [
                        {
                            "internalType":  "address",
                            "name":  "",
                            "type":  "address"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "",
                           "type":  "uint256"
                       }
                   ],
        "name":  "rooms",
        "outputs":  [
                        {
                            "internalType":  "uint256",
                            "name":  "id",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "enum BotBot.RoomType",
                            "name":  "roomType",
                            "type":  "uint8"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "stakeAmount",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "chatDuration",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "voteDuration",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "revealDuration",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "bytes32",
                            "name":  "aiCommitment",
                            "type":  "bytes32"
                        },
                        {
                            "internalType":  "enum BotBot.RoomState",
                            "name":  "state",
                            "type":  "uint8"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "phaseEndTime",
                            "type":  "uint256"
                        },
                        {
                            "internalType":  "uint256",
                            "name":  "pot",
                            "type":  "uint256"
                        }
                    ],
        "stateMutability":  "view",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "address",
                           "name":  "_newOracle",
                           "type":  "address"
                       }
                   ],
        "name":  "setOracleAddress",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_roomId",
                           "type":  "uint256"
                       },
                       {
                           "internalType":  "bytes32",
                           "name":  "_aiCommitment",
                           "type":  "bytes32"
                       }
                   ],
        "name":  "startGame",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_roomId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "startRevealing",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    },
    {
        "inputs":  [
                       {
                           "internalType":  "uint256",
                           "name":  "_roomId",
                           "type":  "uint256"
                       }
                   ],
        "name":  "startVoting",
        "outputs":  [

                    ],
        "stateMutability":  "nonpayable",
        "type":  "function"
    }
] as const;

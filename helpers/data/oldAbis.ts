export const oldAbis = {
  oldRegistry: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "vault",
          type: "address",
        },
        {
          indexed: true,
          internalType: "bool",
          name: "allowWhitelistedState",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogAllowWhitelistedStateVault",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "pool",
          type: "address",
        },
        {
          indexed: true,
          internalType: "bool",
          name: "enabled",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogCreditPool",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "vault",
          type: "address",
        },
        {
          indexed: true,
          internalType: "bool",
          name: "discontinued",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogDiscontinueVault",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "vault",
          type: "address",
        },
        {
          indexed: true,
          internalType: "bool",
          name: "isLimitedState",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogLimitStateVault",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "pool",
          type: "address",
        },
        {
          indexed: true,
          internalType: "bool",
          name: "enabled",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogLiquidityPool",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "pool",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "adapter",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogLiquidityPoolToAdapter",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "vault",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "minimumDepositAmount",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogMinimumDepositAmountVault",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "vault",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "queueCap",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogQueueCapVault",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "uint8",
          name: "lowerLimit",
          type: "uint8",
        },
        {
          indexed: true,
          internalType: "uint8",
          name: "upperLimit",
          type: "uint8",
        },
        {
          indexed: false,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogRPPoolRatings",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "pool",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint8",
          name: "rate",
          type: "uint8",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogRateCreditPool",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "pool",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint8",
          name: "rate",
          type: "uint8",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogRateLiquidityPool",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "bool",
          name: "exists",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "bool",
          name: "canBorrow",
          type: "bool",
        },
        {
          indexed: false,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogRiskProfile",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "token",
          type: "address",
        },
        {
          indexed: true,
          internalType: "bool",
          name: "enabled",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogToken",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "tokensHash",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogTokensToTokensHash",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "vault",
          type: "address",
        },
        {
          indexed: true,
          internalType: "bool",
          name: "unpaused",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogUnpauseVault",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "vault",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "userDepositCap",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogUserDepositCapVault",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "vault",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "totalValueLockedLimitInUnderlying",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogVaultTotalValueLockedLimitInUnderlying",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "financeOperator",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "TransferFinanceOperator",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "optyDistributor",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "TransferOPTYDistributor",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "TransferOperator",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "riskOperator",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "TransferRiskOperator",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "strategyOperator",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "TransferStrategyOperator",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "treasury",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "TransferTreasury",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "_name",
          type: "string",
        },
        {
          internalType: "string",
          name: "_symbol",
          type: "string",
        },
        {
          internalType: "bool",
          name: "_canBorrow",
          type: "bool",
        },
        {
          components: [
            {
              internalType: "uint8",
              name: "lowerLimit",
              type: "uint8",
            },
            {
              internalType: "uint8",
              name: "upperLimit",
              type: "uint8",
            },
          ],
          internalType: "struct DataTypes.PoolRatingsRange",
          name: "_poolRatingRange",
          type: "tuple",
        },
      ],
      name: "addRiskProfile",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256[]",
          name: "_riskProfileCodes",
          type: "uint256[]",
        },
        {
          internalType: "string[]",
          name: "_names",
          type: "string[]",
        },
        {
          internalType: "string[]",
          name: "_symbols",
          type: "string[]",
        },
        {
          internalType: "bool[]",
          name: "_canBorrow",
          type: "bool[]",
        },
        {
          components: [
            {
              internalType: "uint8",
              name: "lowerLimit",
              type: "uint8",
            },
            {
              internalType: "uint8",
              name: "upperLimit",
              type: "uint8",
            },
          ],
          internalType: "struct DataTypes.PoolRatingsRange[]",
          name: "_poolRatingRanges",
          type: "tuple[]",
        },
      ],
      name: "addRiskProfile",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_pool",
          type: "address",
        },
      ],
      name: "approveCreditPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "_pools",
          type: "address[]",
        },
      ],
      name: "approveCreditPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_pool",
          type: "address",
        },
      ],
      name: "approveLiquidityPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "_pools",
          type: "address[]",
        },
      ],
      name: "approveLiquidityPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_token",
          type: "address",
        },
      ],
      name: "approveToken",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "_tokens",
          type: "address[]",
        },
      ],
      name: "approveToken",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "aprOracle",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "contract RegistryProxy",
          name: "_registryProxy",
          type: "address",
        },
      ],
      name: "become",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "creditPools",
      outputs: [
        {
          internalType: "uint8",
          name: "rating",
          type: "uint8",
        },
        {
          internalType: "bool",
          name: "isLiquidityPool",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
      ],
      name: "discontinue",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "financeOperator",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getAprOracle",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getFinanceOperator",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getGovernance",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getHarvestCodeProvider",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getInvestStrategyRegistry",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_pool",
          type: "address",
        },
      ],
      name: "getLiquidityPool",
      outputs: [
        {
          components: [
            {
              internalType: "uint8",
              name: "rating",
              type: "uint8",
            },
            {
              internalType: "bool",
              name: "isLiquidityPool",
              type: "bool",
            },
          ],
          internalType: "struct DataTypes.LiquidityPool",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_pool",
          type: "address",
        },
      ],
      name: "getLiquidityPoolToAdapter",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getODEFIVaultBooster",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getOPTYDistributor",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getOPTYStakingRateBalancer",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getOperator",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getRiskManager",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getRiskOperator",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
      ],
      name: "getRiskProfile",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "index",
              type: "uint256",
            },
            {
              internalType: "bool",
              name: "canBorrow",
              type: "bool",
            },
            {
              components: [
                {
                  internalType: "uint8",
                  name: "lowerLimit",
                  type: "uint8",
                },
                {
                  internalType: "uint8",
                  name: "upperLimit",
                  type: "uint8",
                },
              ],
              internalType: "struct DataTypes.PoolRatingsRange",
              name: "poolRatingsRange",
              type: "tuple",
            },
            {
              internalType: "bool",
              name: "exists",
              type: "bool",
            },
            {
              internalType: "string",
              name: "name",
              type: "string",
            },
            {
              internalType: "string",
              name: "symbol",
              type: "string",
            },
          ],
          internalType: "struct DataTypes.RiskProfile",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getRiskProfileList",
      outputs: [
        {
          internalType: "uint256[]",
          name: "",
          type: "uint256[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getStrategyConfiguration",
      outputs: [
        {
          components: [
            {
              internalType: "address",
              name: "investStrategyRegistry",
              type: "address",
            },
            {
              internalType: "address",
              name: "strategyProvider",
              type: "address",
            },
            {
              internalType: "address",
              name: "aprOracle",
              type: "address",
            },
          ],
          internalType: "struct DataTypes.StrategyConfiguration",
          name: "_strategyConfiguration",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getStrategyManager",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getStrategyOperator",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getStrategyProvider",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getTokenHashes",
      outputs: [
        {
          internalType: "bytes32[]",
          name: "",
          type: "bytes32[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_index",
          type: "uint256",
        },
      ],
      name: "getTokensHashByIndex",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tokensHash",
          type: "bytes32",
        },
      ],
      name: "getTokensHashIndexByHash",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tokensHash",
          type: "bytes32",
        },
      ],
      name: "getTokensHashToTokenList",
      outputs: [
        {
          internalType: "address[]",
          name: "",
          type: "address[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
      ],
      name: "getTreasuryShares",
      outputs: [
        {
          components: [
            {
              internalType: "address",
              name: "treasury",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "share",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.TreasuryShare[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
      ],
      name: "getVaultConfiguration",
      outputs: [
        {
          components: [
            {
              internalType: "bool",
              name: "discontinued",
              type: "bool",
            },
            {
              internalType: "bool",
              name: "unpaused",
              type: "bool",
            },
            {
              internalType: "bool",
              name: "isLimitedState",
              type: "bool",
            },
            {
              internalType: "bool",
              name: "allowWhitelistedState",
              type: "bool",
            },
            {
              components: [
                {
                  internalType: "address",
                  name: "treasury",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "share",
                  type: "uint256",
                },
              ],
              internalType: "struct DataTypes.TreasuryShare[]",
              name: "treasuryShares",
              type: "tuple[]",
            },
            {
              internalType: "uint256",
              name: "withdrawalFee",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "userDepositCap",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "minimumDepositAmount",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "totalValueLockedLimitInUnderlying",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "queueCap",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.VaultConfiguration",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getVaultStrategyConfiguration",
      outputs: [
        {
          components: [
            {
              internalType: "address",
              name: "strategyManager",
              type: "address",
            },
            {
              internalType: "address",
              name: "riskManager",
              type: "address",
            },
            {
              internalType: "address",
              name: "optyDistributor",
              type: "address",
            },
            {
              internalType: "address",
              name: "odefiVaultBooster",
              type: "address",
            },
            {
              internalType: "address",
              name: "operator",
              type: "address",
            },
          ],
          internalType: "struct DataTypes.VaultStrategyConfiguration",
          name: "_vaultStrategyConfiguration",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "governance",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "harvestCodeProvider",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "investStrategyRegistry",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_token",
          type: "address",
        },
      ],
      name: "isApprovedToken",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_user",
          type: "address",
        },
      ],
      name: "isUserWhitelisted",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "liquidityPoolToAdapter",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "liquidityPools",
      outputs: [
        {
          internalType: "uint8",
          name: "rating",
          type: "uint8",
        },
        {
          internalType: "bool",
          name: "isLiquidityPool",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "odefiVaultBooster",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "operator",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "opty",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "optyDistributor",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "optyStakingRateBalancer",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "pendingGovernance",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "pendingRegistryImplementation",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_pool",
          type: "address",
        },
        {
          internalType: "uint8",
          name: "_rate",
          type: "uint8",
        },
      ],
      name: "rateCreditPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "uint8",
              name: "rate",
              type: "uint8",
            },
          ],
          internalType: "struct DataTypes.PoolRate[]",
          name: "_poolRates",
          type: "tuple[]",
        },
      ],
      name: "rateCreditPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "uint8",
              name: "rate",
              type: "uint8",
            },
          ],
          internalType: "struct DataTypes.PoolRate[]",
          name: "_poolRates",
          type: "tuple[]",
        },
      ],
      name: "rateLiquidityPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_pool",
          type: "address",
        },
        {
          internalType: "uint8",
          name: "_rate",
          type: "uint8",
        },
      ],
      name: "rateLiquidityPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "registryImplementation",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_index",
          type: "uint256",
        },
      ],
      name: "removeRiskProfile",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "_pools",
          type: "address[]",
        },
      ],
      name: "revokeCreditPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_pool",
          type: "address",
        },
      ],
      name: "revokeCreditPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "_pools",
          type: "address[]",
        },
      ],
      name: "revokeLiquidityPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_pool",
          type: "address",
        },
      ],
      name: "revokeLiquidityPool",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_token",
          type: "address",
        },
      ],
      name: "revokeToken",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "_tokens",
          type: "address[]",
        },
      ],
      name: "revokeToken",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "riskManager",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "riskOperator",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "riskProfilesArray",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_aprOracle",
          type: "address",
        },
      ],
      name: "setAPROracle",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "bool",
          name: "_allowWhitelistedState",
          type: "bool",
        },
      ],
      name: "setAllowWhitelistedState",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_financeOperator",
          type: "address",
        },
      ],
      name: "setFinanceOperator",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_harvestCodeProvider",
          type: "address",
        },
      ],
      name: "setHarvestCodeProvider",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_investStrategyRegistry",
          type: "address",
        },
      ],
      name: "setInvestStrategyRegistry",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "bool",
          name: "_isLimitedState",
          type: "bool",
        },
      ],
      name: "setIsLimitedState",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_pool",
          type: "address",
        },
        {
          internalType: "address",
          name: "_adapter",
          type: "address",
        },
      ],
      name: "setLiquidityPoolToAdapter",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "address",
              name: "adapter",
              type: "address",
            },
          ],
          internalType: "struct DataTypes.PoolAdapter[]",
          name: "_poolAdapters",
          type: "tuple[]",
        },
      ],
      name: "setLiquidityPoolToAdapter",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_minimumDepositAmount",
          type: "uint256",
        },
      ],
      name: "setMinimumDepositAmount",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_odefiVaultBooster",
          type: "address",
        },
      ],
      name: "setODEFIVaultBooster",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_opty",
          type: "address",
        },
      ],
      name: "setOPTY",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_optyDistributor",
          type: "address",
        },
      ],
      name: "setOPTYDistributor",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_optyStakingRateBalancer",
          type: "address",
        },
      ],
      name: "setOPTYStakingRateBalancer",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_operator",
          type: "address",
        },
      ],
      name: "setOperator",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_queueCap",
          type: "uint256",
        },
      ],
      name: "setQueueCap",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_riskManager",
          type: "address",
        },
      ],
      name: "setRiskManager",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_riskOperator",
          type: "address",
        },
      ],
      name: "setRiskOperator",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_strategyManager",
          type: "address",
        },
      ],
      name: "setStrategyManager",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_strategyOperator",
          type: "address",
        },
      ],
      name: "setStrategyOperator",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_strategyProvider",
          type: "address",
        },
      ],
      name: "setStrategyProvider",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[][]",
          name: "_setOfTokens",
          type: "address[][]",
        },
      ],
      name: "setTokensHashToTokens",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "_tokens",
          type: "address[]",
        },
      ],
      name: "setTokensHashToTokens",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_totalValueLockedLimitInUnderlying",
          type: "uint256",
        },
      ],
      name: "setTotalValueLockedLimitInUnderlying",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_treasury",
          type: "address",
        },
      ],
      name: "setTreasury",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          components: [
            {
              internalType: "address",
              name: "treasury",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "share",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.TreasuryShare[]",
          name: "_treasuryShares",
          type: "tuple[]",
        },
      ],
      name: "setTreasuryShares",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_userDepositCap",
          type: "uint256",
        },
      ],
      name: "setUserDepositCap",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "bool",
          name: "_isLimitedState",
          type: "bool",
        },
        {
          internalType: "bool",
          name: "_allowWhitelistedState",
          type: "bool",
        },
        {
          components: [
            {
              internalType: "address",
              name: "treasury",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "share",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.TreasuryShare[]",
          name: "_treasuryShares",
          type: "tuple[]",
        },
        {
          internalType: "uint256",
          name: "_withdrawalFee",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_userDepositCap",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_minimumDepositAmount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_totalValueLockedLimitInUnderlying",
          type: "uint256",
        },
      ],
      name: "setVaultConfiguration",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_user",
          type: "address",
        },
        {
          internalType: "bool",
          name: "_whitelist",
          type: "bool",
        },
      ],
      name: "setWhitelistedUser",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address[]",
          name: "_users",
          type: "address[]",
        },
        {
          internalType: "bool",
          name: "_whitelist",
          type: "bool",
        },
      ],
      name: "setWhitelistedUsers",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_withdrawalFee",
          type: "uint256",
        },
      ],
      name: "setWithdrawalFee",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "lowerLimit",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "upperLimit",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.WithdrawalFeeRange",
          name: "_withdrawalFeeRange",
          type: "tuple",
        },
      ],
      name: "setWithdrawalFeeRange",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "strategyManager",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "strategyOperator",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "strategyProvider",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "tokens",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "tokensHashIndexes",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      name: "tokensHashToTokens",
      outputs: [
        {
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "treasury",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "bool",
          name: "_unpaused",
          type: "bool",
        },
      ],
      name: "unpauseVaultContract",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
        {
          components: [
            {
              internalType: "uint8",
              name: "lowerLimit",
              type: "uint8",
            },
            {
              internalType: "uint8",
              name: "upperLimit",
              type: "uint8",
            },
          ],
          internalType: "struct DataTypes.PoolRatingsRange",
          name: "_poolRatingRange",
          type: "tuple",
        },
      ],
      name: "updateRPPoolRatings",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
        {
          internalType: "bool",
          name: "_canBorrow",
          type: "bool",
        },
      ],
      name: "updateRiskProfileBorrow",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "vaultToVaultConfiguration",
      outputs: [
        {
          internalType: "bool",
          name: "discontinued",
          type: "bool",
        },
        {
          internalType: "bool",
          name: "unpaused",
          type: "bool",
        },
        {
          internalType: "bool",
          name: "isLimitedState",
          type: "bool",
        },
        {
          internalType: "bool",
          name: "allowWhitelistedState",
          type: "bool",
        },
        {
          internalType: "uint256",
          name: "withdrawalFee",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "userDepositCap",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "minimumDepositAmount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "totalValueLockedLimitInUnderlying",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "queueCap",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "whitelistedUsers",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "withdrawalFeeRange",
      outputs: [
        {
          internalType: "uint256",
          name: "lowerLimit",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "upperLimit",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
  oldInvestStrategyRegistry: [
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "tokensHash",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "bytes32",
          name: "strategyHash",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogSetVaultInvestStrategy",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_hash",
          type: "bytes32",
        },
      ],
      name: "getStrategy",
      outputs: [
        {
          internalType: "uint256",
          name: "_index",
          type: "uint256",
        },
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "address",
              name: "outputToken",
              type: "address",
            },
            {
              internalType: "bool",
              name: "isBorrow",
              type: "bool",
            },
          ],
          internalType: "struct DataTypes.StrategyStep[]",
          name: "_strategySteps",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tokensHash",
          type: "bytes32",
        },
      ],
      name: "getTokenToStrategies",
      outputs: [
        {
          internalType: "bytes32[]",
          name: "",
          type: "bytes32[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "registryContract",
      outputs: [
        {
          internalType: "contract IRegistry",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      name: "setRegistry",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tokensHash",
          type: "bytes32",
        },
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "address",
              name: "outputToken",
              type: "address",
            },
            {
              internalType: "bool",
              name: "isBorrow",
              type: "bool",
            },
          ],
          internalType: "struct DataTypes.StrategyStep[][]",
          name: "_strategySteps",
          type: "tuple[][]",
        },
      ],
      name: "setStrategy",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tokensHash",
          type: "bytes32",
        },
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "address",
              name: "outputToken",
              type: "address",
            },
            {
              internalType: "bool",
              name: "isBorrow",
              type: "bool",
            },
          ],
          internalType: "struct DataTypes.StrategyStep[]",
          name: "_strategySteps",
          type: "tuple[]",
        },
      ],
      name: "setStrategy",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32[]",
          name: "_tokensHash",
          type: "bytes32[]",
        },
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "address",
              name: "outputToken",
              type: "address",
            },
            {
              internalType: "bool",
              name: "isBorrow",
              type: "bool",
            },
          ],
          internalType: "struct DataTypes.StrategyStep[][]",
          name: "_strategySteps",
          type: "tuple[][]",
        },
      ],
      name: "setStrategy",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      name: "strategies",
      outputs: [
        {
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "strategyHashIndexes",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "tokenToStrategies",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
  oldStrategyProvider: [
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [],
      name: "defaultStrategyState",
      outputs: [
        {
          internalType: "enum DataTypes.DefaultStrategyState",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getDefaultStrategyState",
      outputs: [
        {
          internalType: "enum DataTypes.DefaultStrategyState",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tokensHash",
          type: "bytes32",
        },
      ],
      name: "getVaultRewardTokenHashToVaultRewardTokenStrategy",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "hold",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "convert",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.VaultRewardStrategy",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "registryContract",
      outputs: [
        {
          internalType: "contract IRegistry",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      name: "rpToTokenToBestStrategy",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      name: "rpToTokenToDefaultStrategy",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
        {
          internalType: "bytes32",
          name: "_tokenHash",
          type: "bytes32",
        },
        {
          internalType: "bytes32",
          name: "_strategyHash",
          type: "bytes32",
        },
      ],
      name: "setBestDefaultStrategy",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
        {
          internalType: "bytes32",
          name: "_tokenHash",
          type: "bytes32",
        },
        {
          internalType: "bytes32",
          name: "_strategyHash",
          type: "bytes32",
        },
      ],
      name: "setBestStrategy",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "enum DataTypes.DefaultStrategyState",
          name: "_defaultStrategyState",
          type: "uint8",
        },
      ],
      name: "setDefaultStrategyState",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      name: "setRegistry",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_vaultRewardTokenHash",
          type: "bytes32",
        },
        {
          components: [
            {
              internalType: "uint256",
              name: "hold",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "convert",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.VaultRewardStrategy",
          name: "_vaultRewardStrategy",
          type: "tuple",
        },
      ],
      name: "setVaultRewardStrategy",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "hold",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "convert",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.VaultRewardStrategy",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      name: "vaultRewardTokenHashToVaultRewardTokenStrategy",
      outputs: [
        {
          internalType: "uint256",
          name: "hold",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "convert",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
  oldRiskManager: [
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [
        {
          internalType: "contract RiskManagerProxy",
          name: "_riskManagerProxy",
          type: "address",
        },
      ],
      name: "become",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
        {
          internalType: "address[]",
          name: "_underlyingTokens",
          type: "address[]",
        },
      ],
      name: "getBestStrategy",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address[]",
          name: "_underlyingTokens",
          type: "address[]",
        },
      ],
      name: "getVaultRewardTokenStrategy",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "hold",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "convert",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.VaultRewardStrategy",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "pendingRiskManagerImplementation",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "registryContract",
      outputs: [
        {
          internalType: "contract IRegistry",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "riskManagerImplementation",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      name: "setRegistry",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
  oldStrategyManager: [
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_investStrategyHash",
          type: "bytes32",
        },
      ],
      name: "getAddLiquidityCodes",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_investStrategyhash",
          type: "bytes32",
        },
      ],
      name: "getBalanceInUnderlyingToken",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_investStrategyhash",
          type: "bytes32",
        },
      ],
      name: "getBalanceInUnderlyingTokenWrite",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_investStrategyhash",
          type: "bytes32",
        },
      ],
      name: "getClaimRewardStepsCount",
      outputs: [
        {
          internalType: "uint8",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_investStrategyhash",
          type: "bytes32",
        },
      ],
      name: "getDepositAllStepsCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_investStrategyhash",
          type: "bytes32",
        },
      ],
      name: "getPoolClaimAllRewardCodes",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_investStrategyhash",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "_stepIndex",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_stepCount",
          type: "uint256",
        },
      ],
      name: "getPoolDepositAllCodes",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_investStrategyHash",
          type: "bytes32",
        },
      ],
      name: "getPoolHarvestAllRewardCodes",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_investStrategyHash",
          type: "bytes32",
        },
        {
          components: [
            {
              internalType: "uint256",
              name: "hold",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "convert",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.VaultRewardStrategy",
          name: "_vaultRewardStrategy",
          type: "tuple",
        },
      ],
      name: "getPoolHarvestSomeRewardCodes",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address payable",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_investStrategyhash",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "_stepIndex",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_stepCount",
          type: "uint256",
        },
      ],
      name: "getPoolWithdrawAllCodes",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_investStrategyHash",
          type: "bytes32",
        },
      ],
      name: "getRewardToken",
      outputs: [
        {
          internalType: "address",
          name: "_rewardToken",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "treasury",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "share",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.TreasuryShare[]",
          name: "_treasuryShares",
          type: "tuple[]",
        },
        {
          internalType: "address",
          name: "_account",
          type: "address",
        },
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_redeemAmountInToken",
          type: "uint256",
        },
      ],
      name: "getSplitPaymentCode",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
      ],
      name: "getUpdateRewardVaultRateAndIndexCodes",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_from",
          type: "address",
        },
      ],
      name: "getUpdateUserRewardsCodes",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_vault",
          type: "address",
        },
        {
          internalType: "address",
          name: "_from",
          type: "address",
        },
      ],
      name: "getUpdateUserStateInVaultCodes",
      outputs: [
        {
          internalType: "bytes[]",
          name: "",
          type: "bytes[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_investStrategyhash",
          type: "bytes32",
        },
      ],
      name: "getWithdrawAllStepsCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "registryContract",
      outputs: [
        {
          internalType: "contract IRegistry",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      name: "setRegistry",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
  oldVault: [
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
        {
          internalType: "string",
          name: "_name",
          type: "string",
        },
        {
          internalType: "string",
          name: "_symbol",
          type: "string",
        },
        {
          internalType: "string",
          name: "_riskProfileName",
          type: "string",
        },
        {
          internalType: "string",
          name: "_riskProfileSymbol",
          type: "string",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Approval",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "DepositQueue",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "bytes[]",
          name: "_codes",
          type: "bytes[]",
        },
      ],
      name: "adminCall",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
      ],
      name: "allowance",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "approve",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "balance",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "blockToBlockVaultValues",
      outputs: [
        {
          internalType: "uint256",
          name: "actualVaultValue",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "blockMinVaultValue",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "blockMaxVaultValue",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "chi",
      outputs: [
        {
          internalType: "contract IFreeFromUpTo",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [
        {
          internalType: "uint8",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "subtractedValue",
          type: "uint256",
        },
      ],
      name: "decreaseAllowance",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "depositQueue",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "discontinue",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "gasOwedToOperator",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getDepositQueue",
      outputs: [
        {
          components: [
            {
              internalType: "address",
              name: "account",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "value",
              type: "uint256",
            },
          ],
          internalType: "struct DataTypes.UserDepositOperation[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getPricePerFullShare",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getPricePerFullShareWrite",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "gst",
      outputs: [
        {
          internalType: "contract IFreeFromUpTo",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_investStrategyHash",
          type: "bytes32",
        },
      ],
      name: "harvest",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "addedValue",
          type: "uint256",
        },
      ],
      name: "increaseAllowance",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
        {
          internalType: "string",
          name: "_name",
          type: "string",
        },
        {
          internalType: "string",
          name: "_symbol",
          type: "string",
        },
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
      ],
      name: "initialize",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "investStrategyHash",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_diff",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_currentVaultValue",
          type: "uint256",
        },
      ],
      name: "isMaxVaultValueJumpAllowed",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "maxVaultValueJump",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "opTOKEN_REVISION",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "pendingDeposits",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "pricePerShareWrite",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "queue",
      outputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "rebalance",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "registryContract",
      outputs: [
        {
          internalType: "contract IRegistry",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "riskProfileCode",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_maxVaultValueJump",
          type: "uint256",
        },
      ],
      name: "setMaxVaultValueJump",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      name: "setRegistry",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
      ],
      name: "setRiskProfileCode",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_underlyingToken",
          type: "address",
        },
      ],
      name: "setToken",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bool",
          name: "_unpaused",
          type: "bool",
        },
      ],
      name: "setUnpaused",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "totalDeposits",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalSupply",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "transfer",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "sender",
          type: "address",
        },
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "transferFrom",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "underlyingToken",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_amount",
          type: "uint256",
        },
      ],
      name: "userDeposit",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "userDepositAll",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "userDepositAllRebalance",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "userDepositAllRebalanceWithCHI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "userDepositAllWithCHI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_amount",
          type: "uint256",
        },
      ],
      name: "userDepositRebalance",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_amount",
          type: "uint256",
        },
      ],
      name: "userDepositRebalanceWithCHI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_amount",
          type: "uint256",
        },
      ],
      name: "userDepositWithCHI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "userWithdrawAllRebalance",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "userWithdrawAllRebalanceWithCHI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_redeemAmount",
          type: "uint256",
        },
      ],
      name: "userWithdrawRebalance",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_redeemAmount",
          type: "uint256",
        },
      ],
      name: "userWithdrawRebalanceWithCHI",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
  OldVaultV2: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousOwner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnershipTransferred",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousImplementation",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newImplementation",
          type: "address",
        },
      ],
      name: "ProxyImplementationUpdated",
      type: "event",
    },
    {
      stateMutability: "payable",
      type: "fallback",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes4",
          name: "id",
          type: "bytes4",
        },
      ],
      name: "supportsInterface",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "transferOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "newImplementation",
          type: "address",
        },
      ],
      name: "upgradeTo",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "newImplementation",
          type: "address",
        },
        {
          internalType: "bytes",
          name: "data",
          type: "bytes",
        },
      ],
      name: "upgradeToAndCall",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      stateMutability: "payable",
      type: "receive",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Approval",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bool",
          name: "emergencyShutdown",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogEmergencyShutdown",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "minimumDepositValueUT",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogMinimumDepositValueUT",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "totalValueLockedLimitUT",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogTotalValueLockedLimitUT",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bool",
          name: "unpaused",
          type: "bool",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogUnpause",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "userDepositCapUT",
          type: "uint256",
        },
        {
          indexed: true,
          internalType: "address",
          name: "caller",
          type: "address",
        },
      ],
      name: "LogUserDepositCapUT",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "bytes[]",
          name: "_codes",
          type: "bytes[]",
        },
      ],
      name: "adminCall",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
      ],
      name: "allowance",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "approve",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "balanceUT",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "blockToBlockVaultValues",
      outputs: [
        {
          internalType: "uint256",
          name: "actualVaultValue",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "blockMinVaultValue",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "blockMaxVaultValue",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_userDepositUT",
          type: "uint256",
        },
      ],
      name: "calcDepositFeeUT",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_userWithdrawUT",
          type: "uint256",
        },
      ],
      name: "calcWithdrawalFeeUT",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "address",
              name: "outputToken",
              type: "address",
            },
            {
              internalType: "bool",
              name: "isBorrow",
              type: "bool",
            },
          ],
          internalType: "struct DataTypes.StrategyStep[]",
          name: "_investStrategySteps",
          type: "tuple[]",
        },
      ],
      name: "computeInvestStrategyHash",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "decimals",
      outputs: [
        {
          internalType: "uint8",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "subtractedValue",
          type: "uint256",
        },
      ],
      name: "decreaseAllowance",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "getInvestStrategySteps",
      outputs: [
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "address",
              name: "outputToken",
              type: "address",
            },
            {
              internalType: "bool",
              name: "isBorrow",
              type: "bool",
            },
          ],
          internalType: "struct DataTypes.StrategyStep[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "address",
              name: "outputToken",
              type: "address",
            },
            {
              internalType: "bool",
              name: "isBorrow",
              type: "bool",
            },
          ],
          internalType: "struct DataTypes.StrategyStep[]",
          name: "_investStrategySteps",
          type: "tuple[]",
        },
      ],
      name: "getLastStrategyStepBalanceLP",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getNextBestInvestStrategy",
      outputs: [
        {
          components: [
            {
              internalType: "address",
              name: "pool",
              type: "address",
            },
            {
              internalType: "address",
              name: "outputToken",
              type: "address",
            },
            {
              internalType: "bool",
              name: "isBorrow",
              type: "bool",
            },
          ],
          internalType: "struct DataTypes.StrategyStep[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getPricePerFullShare",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "addedValue",
          type: "uint256",
        },
      ],
      name: "increaseAllowance",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "_underlyingTokensHash",
          type: "bytes32",
        },
        {
          internalType: "string",
          name: "_name",
          type: "string",
        },
        {
          internalType: "string",
          name: "_symbol",
          type: "string",
        },
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
      ],
      name: "initialize",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "investStrategyHash",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "investStrategySteps",
      outputs: [
        {
          internalType: "address",
          name: "pool",
          type: "address",
        },
        {
          internalType: "address",
          name: "outputToken",
          type: "address",
        },
        {
          internalType: "bool",
          name: "isBorrow",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_diff",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_currentVaultValue",
          type: "uint256",
        },
      ],
      name: "isMaxVaultValueJumpAllowed",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "minimumDepositValueUT",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "name",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "opTOKEN_REVISION",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "pendingDeposits",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "queue",
      outputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "rebalance",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "registryContract",
      outputs: [
        {
          internalType: "contract IRegistry",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bool",
          name: "_active",
          type: "bool",
        },
      ],
      name: "setEmergencyShutdown",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_minimumDepositValueUT",
          type: "uint256",
        },
      ],
      name: "setMinimumDepositValueUT",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_registry",
          type: "address",
        },
      ],
      name: "setRegistry",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_riskProfileCode",
          type: "uint256",
        },
      ],
      name: "setRiskProfileCode",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_totalValueLockedLimitUT",
          type: "uint256",
        },
      ],
      name: "setTotalValueLockedLimitUT",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_underlyingTokensHash",
          type: "bytes32",
        },
      ],
      name: "setUnderlyingTokensHash",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bool",
          name: "_unpaused",
          type: "bool",
        },
      ],
      name: "setUnpaused",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_userDepositCapUT",
          type: "uint256",
        },
      ],
      name: "setUserDepositCapUT",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_userDepositCapUT",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_minimumDepositValueUT",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_totalValueLockedLimitUT",
          type: "uint256",
        },
      ],
      name: "setValueControlParams",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_vaultConfiguration",
          type: "uint256",
        },
      ],
      name: "setVaultConfiguration",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_whitelistedAccountsRoot",
          type: "bytes32",
        },
      ],
      name: "setWhitelistedAccountsRoot",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_whitelistedCodesRoot",
          type: "bytes32",
        },
      ],
      name: "setWhitelistedCodesRoot",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "symbol",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "totalDeposits",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalSupply",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "totalValueLockedLimitUT",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "transfer",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "sender",
          type: "address",
        },
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "transferFrom",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "underlyingToken",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "underlyingTokensHash",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "userDepositCapUT",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_user",
          type: "address",
        },
        {
          internalType: "bool",
          name: "_addUserDepositUT",
          type: "bool",
        },
        {
          internalType: "uint256",
          name: "_userDepositUTWithDeductions",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_deductions",
          type: "uint256",
        },
        {
          internalType: "bytes32[]",
          name: "_accountsProof",
          type: "bytes32[]",
        },
        {
          internalType: "bytes32[]",
          name: "_codesProof",
          type: "bytes32[]",
        },
      ],
      name: "userDepositPermitted",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_userDepositUT",
          type: "uint256",
        },
        {
          internalType: "bytes32[]",
          name: "_accountsProof",
          type: "bytes32[]",
        },
        {
          internalType: "bytes32[]",
          name: "_codesProof",
          type: "bytes32[]",
        },
      ],
      name: "userDepositVault",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_user",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_userWithdrawVT",
          type: "uint256",
        },
        {
          internalType: "bytes32[]",
          name: "_accountsProof",
          type: "bytes32[]",
        },
        {
          internalType: "bytes32[]",
          name: "_codesProof",
          type: "bytes32[]",
        },
      ],
      name: "userWithdrawPermitted",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_userWithdrawVT",
          type: "uint256",
        },
        {
          internalType: "bytes32[]",
          name: "_accountsProof",
          type: "bytes32[]",
        },
        {
          internalType: "bytes32[]",
          name: "_codesProof",
          type: "bytes32[]",
        },
      ],
      name: "userWithdrawVault",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "vaultConfiguration",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "vaultDepositAllToStrategy",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "vaultDepositPermitted",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "vaultWithdrawPermitted",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "whitelistedAccountsRoot",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "whitelistedCodesRoot",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "implementationAddress",
          type: "address",
        },
        {
          internalType: "address",
          name: "ownerAddress",
          type: "address",
        },
        {
          internalType: "bytes",
          name: "data",
          type: "bytes",
        },
      ],
      stateMutability: "payable",
      type: "constructor",
    },
  ],
};

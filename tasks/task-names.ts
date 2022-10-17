export default {
  SETUP: {
    NAME: "setup",
    DESCRIPTION: "Deploy Registry, HarvestCodeProvider and Adapter contracts and setup all necessary actions",
  },
  DEPLOYMENT_TASKS: {
    DEPLOY_ERC20: {
      NAME: "deploy-erc20",
      DESCRIPTION: "Deploy ERC20",
    },
    DEPLOY_ADAPTER: {
      NAME: "deploy-adapter",
      DESCRIPTION: "Deploy Adapter contract",
    },
    DEPLOY_ADAPTERS: {
      NAME: "deploy-adapters",
      DESCRIPTION: "Deploy Adapter contracts",
    },
    DEPLOY_HARVEST_CODE_PROVIDER: {
      NAME: "deploy-harvest-code-provider",
      DESCRIPTION: "Deploy Harvest Code Provider",
    },
    DEPLOY_REGISTRY: {
      NAME: "deploy-registry",
      DESCRIPTION: "Deploy Registry",
    },
    DEPLOY_RISK_MANAGER: {
      NAME: "deploy-risk-manager",
      DESCRIPTION: "Deploy Risk Manager",
    },
    DEPLOY_STRATEGY_PROVIDER: {
      NAME: "deploy-strategy-provider",
      DESCRIPTION: "Deploy Strategy Provider",
    },
    DEPLOY_STRATEGY_MANAGER: {
      NAME: "deploy-strategy-manager",
      DESCRIPTION: "Deploy Strategy Manager library",
    },
    DEPLOY_VAULT: {
      NAME: "deploy-vault",
      DESCRIPTION: "Deploy Vault",
    },
  },
  ACTION_TASKS: {
    SET_MAX_DEPOSIT_MODE: {
      NAME: "set-max-deposit-mode",
      DESCRIPTION: "Set max deposit mode for adapter",
    },
    SET_MAX_DEPOSIT: {
      NAME: "set-max-deposit",
      DESCRIPTION: "Set max deposit amount for adapter",
    },
    APPROVE_ERC20: {
      NAME: "approve-erc20",
      DESCRIPTION: "Approve erc20 token",
    },
    BALANCE_OF: {
      NAME: "balance-of",
      DESCRIPTION: "Check token balance of address",
    },
    GET_ACTION: {
      NAME: "get-action",
      DESCRIPTION: "execute a get action in smart contract",
    },
    LIST_ACCOUNTS: {
      NAME: "list-accounts",
      DESCRIPTION: "Prints the list of accounts",
    },
    APPROVE_TOKEN: {
      NAME: "approve-token",
      DESCRIPTION: "Approve a token in Registry",
    },
    APPROVE_TOKENS: {
      NAME: "approve-tokens",
      DESCRIPTION: "Approve a list of tokens in Registry",
    },
    GET_BEST_STRATEGY: {
      NAME: "get-best-strategy",
      DESCRIPTION: "Get best strategy for a specific token",
    },
    MAP_LIQUIDITYPOOL_TO_ADAPTER: {
      NAME: "map-liquiditypool-to-adapter",
      DESCRIPTION: "Map a liquidity pool with a specific adapter",
    },
    MAP_LIQUIDITYPOOLS_TO_ADAPTER: {
      NAME: "map-liquiditypools-to-adapter",
      DESCRIPTION: "Map a list of liquidity pools with a specific adapter",
    },
    SET_BEST_STRATEGY: {
      NAME: "set-best-strategy",
      DESCRIPTION: "Set the best strategy for a specific token",
    },
    SET_BEST_STRATEGY_REBALANCE_MULTISIG: {
      NAME: "set-best-strategy-rebalance-multisig",
      DESCRIPTION: "set best strategy and rebalance using multisig",
    },
    SET_UNDERLYING_TOKENS_HASH: {
      NAME: "set-underlying-tokens-hash",
      DESCRIPTION: "set the address of the underlying asset and its keccak256 hash",
    },
    SET_RISK_PROFILE_CODE: {
      NAME: "set-risk-profile-code",
      DESCRIPTION: "set a risk profile code for a given vault",
    },
    SET_USER_DEPOSIT_CAP: {
      NAME: "set-user-deposit-cap",
      DESCRIPTION: "set the maximum amount a user could deposit in entire life cycle of this vault in underlying token",
    },
    SET_MINIMUM_DEPOSIT_VALUE: {
      NAME: "set-minimum-deposit-value",
      DESCRIPTION: "set the minimum amount in underlying token required to be deposited by the user",
    },
    SET_TOTAL_VALUE_LOCKED_LIMIT: {
      NAME: "set-total-value-locked-limit",
      DESCRIPTION: "set the total value locked limit in underlying token",
    },
    PRINT_STRATEGY_HASH: {
      NAME: "print-strategy-hash",
      DESCRIPTION: "print the strategy",
    },
    PRINT_TOKENS_HASH: {
      NAME: "print-tokens-hash",
      DESCRIPTION: "print tokens hash",
    },
    UNPAUSE_VAULT: {
      NAME: "unpause-vault",
      DESCRIPTION: "Set pause state for a specific vault",
    },
    VAULT_ACTIONS: {
      NAME: "vault-actions",
      DESCRIPTION: "Execute vault actions: (DEPOSIT || WITHDRAW || REBALANCE || VAULT-DEPOSIT-ALL-TO-STRATEGY)",
    },
    REWARD_HARVEST: {
      NAME: "reward-harvest",
      DESCRIPTION: "Execute harvestSome() or harvestAll(): (SOME || All)",
    },
    REWARD_CLAIM: {
      NAME: "reward-claim",
      DESCRIPTION: "Claim the whole balance of reward tokens",
    },
    ADD_RISK_PROFILE: {
      NAME: "add-risk-profile",
      DESCRIPTION: "Add a new risk profile",
    },
    GET_PRICE_PER_FULL_SHARE: {
      NAME: "get-price-per-full-share",
      DESCRIPTION: "Get price per full share of the vault",
    },
    GET_TOTAL_SUPPLY: {
      NAME: "get-total-supply",
      DESCRIPTION: "Get total supply of the vault",
    },
    TRANSFER_OPERATOR: {
      NAME: "transfer-operator",
      DESCRIPTION: "Transfer operator",
    },
    TRANSFER_FINANCE_OPERATOR: {
      NAME: "transfer-finance-operator",
      DESCRIPTION: "Transfer finance operator",
    },
    TRANSFER_RISK_OPERATOR: {
      NAME: "transfer-risk-operator",
      DESCRIPTION: "Transfer risk operator",
    },
    TRANSFER_STRATEGY_OPERATOR: {
      NAME: "transfer-strategy-operator",
      DESCRIPTION: "Transfer strategy operator",
    },
    TRANSFER_OPERATION_OWNERSHIP: {
      NAME: "transfer-operation-ownership",
      DESCRIPTION: "Transfer financeOperator, riskOperator, strategyOperator anf operator one by one",
    },
    ACCEPT_GOVERNANCE: {
      NAME: "accept-pending-governance",
      DESCRIPTION: "accept governance",
    },
    TRANSFER_OPTYFI_ORACLE_OWNER: {
      NAME: "transfer-optyfi-oracle-owner",
      DESCRIPTION: "Transfer the ownership of optyfi oracle",
    },
    SET_PENDING_GOVERNANCE: { NAME: "set-pending-governance", DESCRIPTION: "set pending governance" },
    CHANGE_POLYGON_OPUSDCEARN_PROXY_V2_ADMIN: {
      NAME: "change-polygon-opusdcearn-proxy-v2-admin",
      DESCRIPTION: "change polygon opUSDCearn vault proxy v2 admin",
    },
    SET_WHITELISTED_ACCOUNTS_ROOT: {
      NAME: "set-whitelisted-accounts-root",
      DESCRIPTION: "whitelisted accounts merkle root hash",
    },
    SET_WHITELISTED_CODES_ROOT: {
      NAME: "set-whitelisted-codes-root",
      DESCRIPTION: "whitelisted codes merkle root hash",
    },
    SET_EMERGENCY_SHUTDOWN: {
      NAME: "set-emergency-shutdown",
      DESCRIPTION: "activates or deactives vault mode where all strategies go into full withdrawal",
    },
    APPROVE_TOKEN_AND_MAP_TO_TOKENSHASH: {
      NAME: "approve-token-and-map-to-tokenshash",
      DESCRIPTION: "approve token and map token to tokenshash",
    },
    SET_VAULT_CONFIGURATION: {
      NAME: "set-vault-configuration",
      DESCRIPTION: "set vault configuration",
    },
    SET_VALUE_CONTROL_PARAMS: {
      NAME: "set-value-control-params",
      DESCRIPTION: "Set value control params",
    },
    SET_BEST_STRATEGY_MULTI_SIG: {
      NAME: "set-best-strategy-multisig",
      DESCRIPTION: "Set the best strategy for a specific token via multisig",
    },
    CHANGE_VAULT_PROXY_V2_ADMIN: {
      NAME: "change-vault-proxy-v2-admin",
      DESCRIPTION: "Change the vault proxy admin",
    },
    SIGN_EIP712_PERMIT: {
      NAME: "sign-eip712-permit",
      DESCRIPTION: "sign eip712 permit",
    },
    UPGRADE_TO_AND_CALL: {
      NAME: "upgrade-to-and-call",
      DESCRIPTION: "Upgrade proxy and call",
    },
  },
};

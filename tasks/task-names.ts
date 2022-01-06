export default {
  SETUP: {
    NAME: "setup",
    DESCRIPTION: "Deploy Registry, HarvestCodeProvider and Adapter contracts and setup all necessary actions",
  },
  SDK_TASKS: {
    OPTYFI_SDK: {
      NAME: "optyfi-sdk",
      DESCRIPTION: "Create ./optyfi-sdk",
    },
    FETCH_STRATEGIES: {
      NAME: "fetch-strategies",
      DESCRIPTION: "Fetch all strategies of a specific token from Moralis",
    },
    FETCH_DEFI_POOLS: {
      NAME: "fetch-defi-pools",
      DESCRIPTION: "Fetch all pools of a specific protocol from Moralis",
    },
  },
  DEPLOYMENT_TASKS: {
    DEPLOY_ERC20: { NAME: "deploy-erc20", DESCRIPTION: "Deploy ERC20" },
    DEPLOY_ADAPTER: { NAME: "deploy-adapter", DESCRIPTION: "Deploy Adapter contract" },
    DEPLOY_ADAPTERS: { NAME: "deploy-adapters", DESCRIPTION: "Deploy Adapter contracts" },
    DEPLOY_HARVEST_CODE_PROVIDER: { NAME: "deploy-harvest-code-provider", DESCRIPTION: "Deploy Harvest Code Provider" },
    DEPLOY_INFRA: { NAME: "deploy-infra", DESCRIPTION: "Deploy infrastructure contracts" },
    DEPLOY_REGISTRY: { NAME: "deploy-registry", DESCRIPTION: "Deploy Registry" },
    DEPLOY_OPTY: { NAME: "deploy-opty", DESCRIPTION: "Deploy Opty" },
    DEPLOY_RISK_MANAGER: { NAME: "deploy-risk-manager", DESCRIPTION: "Deploy Risk Manager" },
    DEPLOY_STRATEGY_MANAGER: { NAME: "deploy-strategy-manager", DESCRIPTION: "Deploy Strategy Manager" },
    DEPLOY_STRATEGY_PROVIDER: { NAME: "deploy-strategy-provider", DESCRIPTION: "Deploy Strategy Provider" },
    DEPLOY_INVEST_STRATEGY_REGISTRY: {
      NAME: "deploy-invest-strategy-registry",
      DESCRIPTION: "Deploy Invest Strategy Registry",
    },
    DEPLOY_VAULT: { NAME: "deploy-vault", DESCRIPTION: "Deploy Vault" },
    DEPLOY_VAULTS: { NAME: "deploy-vaults", DESCRIPTION: "Deploy all vault contracts" },
    DEPLOY_ODEFI_VAULT_BOOSTER: { NAME: "deploy-odefi-vault-booster", DESCRIPTION: "Deploy Odefi Vault Booster" },
    DEPLOY_OPTY_DISTRIBUTOR: { NAME: "deploy-opty-distributor", DESCRIPTION: "Deploy Opty Distributor" },
    DEPLOY_OPTY_STAKING_RATE_BALANCER: {
      NAME: "deploy-opty-staking-rate-balancer",
      DESCRIPTION: "Deploy Opty Staking Rate Balancer",
    },
    DEPLOY_OPTY_STAKING_VAULTS: { NAME: "deploy-opty-staking-vaults", DESCRIPTION: "Deploy Opty Staking Vaults" },
    DEPLOY_APR_ORACLE: { NAME: "deploy-apr-oracle", DESCRIPTION: "Deploy Apr Oracle" },
  },
  ACTION_TASKS: {
    SET_MAX_DEPOSIT_MODE: { NAME: "set-max-deposit-mode", DESCRIPTION: "Set max deposit mode for adapter" },
    SET_MAX_DEPOSIT: { NAME: "set-max-deposit", DESCRIPTION: "Set max deposit amount for adapter" },
    APPROVE_ERC20: { NAME: "approve-erc20", DESCRIPTION: "Approve erc20 token" },
    BALANCE_OF: { NAME: "balance-of", DESCRIPTION: "Check token balance of address" },
    GET_ACTION: { NAME: "get-action", DESCRIPTION: "execute a get action in smart contract" },
    LIST_ACCOUNTS: { NAME: "list-accounts", DESCRIPTION: "Prints the list of accounts" },
    APPROVE_TOKEN: { NAME: "approve-token", DESCRIPTION: "Approve a token in Registry" },
    APPROVE_TOKENS: { NAME: "approve-tokens", DESCRIPTION: "Approve a list of tokens in Registry" },
    GET_STRATEGIES: { NAME: "get-strategies", DESCRIPTION: "Get all available strategies for a specific token" },
    GET_BEST_STRATEGY: { NAME: "get-best-strategy", DESCRIPTION: "Get best strategy for a specific token" },
    MAP_LIQUIDITYPOOL_TO_ADAPTER: {
      NAME: "map-liquiditypool-to-adapter",
      DESCRIPTION: "Map a liquidity pool with a specific adapter",
    },
    MAP_LIQUIDITYPOOLS_TO_ADAPTER: {
      NAME: "map-liquiditypools-to-adapter",
      DESCRIPTION: "Map a list of liquidity pools with a specific adapter",
    },
    SET_BEST_STRATEGY: { NAME: "set-best-strategy", DESCRIPTION: "Set the best strategy for a specific token" },
    SET_STRATEGIES: { NAME: "set-strategies", DESCRIPTION: "Set a list of strategies in Registry" },
    SET_INVEST_STRATEGY_REGISTRY: {
      NAME: "set-invest-strategy-registry",
      DESCRIPTION: "Set invest strategy registry in Registry",
    },
    UNPAUSE_VAULT: { NAME: "unpause-vault", DESCRIPTION: "Set pause state for a specific vault" },
    VAULT_ACTIONS: {
      NAME: "vault-actions",
      DESCRIPTION: "Execute vault actions such as deposit, deposit with rebalance, etc",
    },
    ADD_RISK_PROFILE: { NAME: "add-risk-profile", DESCRIPTION: "Add a new risk profile" },
    GET_STRATEGY: { NAME: "get-strategy", DESCRIPTION: "Get the details of a specific strategy" },
  },
};

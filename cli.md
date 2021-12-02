# OptyFi CLI

Run `yarn hardhat` to check all available tasks.

Follow the below command to run a specific task :

```
yarn hardhat `taskName` --network `network` --optionName `optionValue`
```

## Deployment Tasks

To deploy OptyFi's contracts.

### deploy-adapter

```
Usage: deploy specific adapter contract

Options :
  --registry      required  <address> the address of registry
  --name          required  <string>  the name of adapter
  --deployedonce  optional  <bool>    allow checking whether contracts were deployed previously (default: true)
  --insertindb    optional  <bool>    insert the deployed contract addresses in DB  (default: false)
  --network       optional  <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-adapter \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --name AaveV1Adapter \
  --deployedonce false \
  --network localhost
```

### deploy-adapters

```
Usage: deploy all available adapter contracts

--registry     required  <address> the address of registry
--deployedonce optional  <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional  <bool>    insert the deployed contract addresses in DB (default: false)
--network      optional  <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-adapters \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --deployedonce false \
  --network localhost
```

### deploy-harvest-code-provider

```
Usage : deploy HarvestCodeProvider contract

Options:
--registry     required <address> the address of registry
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database (default: false)
--network      optional  <string> name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-harvest-code-provider \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --deployedonce false \
  --network localhost
```

### deploy-opty

```
Usage: deploy OPTY and OPTYDistributor contracts

Options :
--registry     required <address> the address of registry
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database (default: false)
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-opty \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --deployedonce false \
  --network hardhat
```

### deploy-registry

```
Usage: deploy Registry contract

Options:
--deployedonce optional <bool>   allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>   allow inserting to database(default: false)
--network      optional <string> name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-registry \
  --deployedonce false \
  --network localhost
```

### deploy-invest-strategy-registry

```
Usage: deploy InvestStrategyRegistry contract

Options:
--registry     required <address> the address of registry
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-invest-strategy-registry \
  --registry 0x0000000000000000000000000000000000000000 \
  --deployedonce false \
  --network hardhat
```

### deploy-risk-manager

```
Usage: deploy RiskManager contract

Options:
--registry     required <string>  the address of registry
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat) (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-risk-manager \
  --registry 0x0000000000000000000000000000000000000000 \
  --deployedonce false \
  --network localhost
```

### deploy-strategy-manager

```
Usage: deploy StrategyManager contract

Options:

Options:
--registry     required <address> the address of registry
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-strategy-manager \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
```

### deploy-strategy-provider

```
Usage: deploy StrategyProvider contract

Options:
--registry     required <address> the address of registry
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-strategy-provider \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000
```

### deploy-apr-oracle

```
Usage: deploy AprOracle contract

Options:
--registry     required <address> the address of registry
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-apr-oracle \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000
```

### deploy-odefi-vault-booster

```
Usage: deploy ODEFIVaultBooster contract

Options:
--registry     required <address> the address of registry
--odefi        required <address> the address of odefi
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-odefi-vault-booster \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --odefi 0x0000000000000000000000000000000000000000
```

### deploy-opty-distributor

```
Usage: deploy OptyDistributor contract

Options:
--registry     required <address> the address of registry
--opty         required <address> the address of opty
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-opty-distributor \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --opty 0x0000000000000000000000000000000000000000
```

### deploy-opty-staking-rate-balancer

```
Usage: deploy OptyStakingRateBalancer contract

Options:
--registry     required <address> the address of registry
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-opty-staking-rate-balancer \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000
```

### deploy-opty-staking-vaults

```
Usage: deploy OptyStakingVault contracts

Options:
--registry                  required <address> the address of registry
--opty                      required <address> the address of opty
--optydistributor           required <address> the address of opty distributor
--optystakingratebalancer   required <address> the address of opty staking rate balancer
--deployedonce              optional <bool>    allow checking whether contracts were deployed previously (default: true)
--insertindb                optional <bool>    allow inserting to database
--network                   optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-staking-vautls \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --opty 0x0000000000000000000000000000000000000000 \
  --optydistributor 0x0000000000000000000000000000000000000000 \
  --optystakingratebalancer 0x0000000000000000000000000000000000000000
```

### deploy-vault

```
Usage: deploy Vault contract

Options:
--registry     required <address> the address of registry
--token        required <address> the address of underlying token
--riskprofilecode       required <number>  the code of Vault's risk profile
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-vault \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --token 0x0000000000000000000000000000000000000000 \
  --riskprofilecode 1
```

### deploy-vaults

```
Usage: deploy all designated Vault contract

Options:
--registry     required <address> the address of registry
--insertindb   optional <bool>    allow inserting to database
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-vaults \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000
```

### deploy-erc20

```
Usage: deploy erc20 contract

Options:
--name         required <string> the name of token
--symbol       required <string> the symbol of token
--total        optional <number> the totalSupply of token (default: 0)
--decimal      required <number> the decimal of token(defaukt: 18)
--deployedonce optional <bool>   allow checking whether contracts were deployed previously (default: true)
--insertindb   optional <bool>   allow inserting to database
--network      optional <string> name of the network provider (default: hardhat)

```

- Example:

```
  yarn hardhat deploy-erc20 \
  --network localhost \
  --name ERC20 \
  --symbol ERC20 \
  --total 0 \
  --decimal 18
```

## Action Tasks

To execute functions in a OptyFi's contract.

### set-strategies

```
Usage: set all current available strategies with file or default.

Options:
--investstrategyregistry required <address> the address of investStrategyRegistry
--fromfile         required <string>  path to strategies json file
--network          optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat set-strategies \
  --network localhost \
  --investstrategyregistry 0x0000000000000000000000000000000000000000 \
  --fromfile /path/to/file.json
```

### add-risk-profile

```
Usage: add risk profile in Registry contract

Options:
--registry      required <address> the address of registry
--riskprofilecode          required <number>  the code of risk profile
--canborrow     required <boolean> whether risk profile can borrow or not
--lowestrating  required <number>     the lowest rating
--highestrating required <number>     the highest rating
--network       optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat add-risk-profile \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --riskprofilecode 1 \
  --canborrow true \
  --lowestrating 0 \
  --highestrating 10
```

### approve-erc20

```
Usage: approve spender to use specific amount of erc20 token

Options:
--spender   required <address> the address of spender
--token     required <address> the address of token
--amount    required <number>     the amount of token
--network   optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat approve-erc20 \
  --network localhost \
  --spender 0x0000000000000000000000000000000000000000 \
  --token 0x0000000000000000000000000000000000000000 \
  --amount 1000000000000000
```

### approve-tokens

```
Usage: approve all available tokens

Options:
--registry required <address> the address of registry
--network  optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat approve-tokens \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000
```

### approve-token

```
Usage: approve a specific token

Options:
--registry required <address> the address of registry
--token    required <address> the address of token
--network  optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat approve-token \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --token 0x0000000000000000000000000000000000000000
```

### get-strategy

```
Usage: get a specific strategy

Options:
--strategyhash     required <string>  the keccak256 hash of strategy
--investstrategyregistry required <address> the address of investStrategyRegistry
--token            required <address> the address of token
--network          optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat get-strategy \
  --network localhost \
  --strategyhash 0x0000000000000000000000000000000000000000 \
  --investstrategyregistry 0x0000000000000000000000000000000000000000 \
  --token 0x0000000000000000000000000000000000000000
```

### get-all-strategies

```
Usage: get all strategies for a specific token

Options:
--investstrategyregistry required <address> the address of investStrategyRegistry
--token            required <address> the address of token
--network          optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat get-all-strategies \
  --network localhost \
  --investstrategyregistry 0x0000000000000000000000000000000000000000 \
  --token 0x0000000000000000000000000000000000000000
```

### get-best-strategy

```
Usage: get best strategy or default best strategy for the token with risk profile

Options:
--token            required <address> the address of token
--riskprofilecode           required <number>  the code of risk profile
--strategyprovider required <address> the address of strategyProvider
--isdefault        required <bool>    get default strategy or not
--network          optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat get-best-strategy \
  --network localhost \
  --riskprofilecode 1 \
  --strategyprovider 0x0000000000000000000000000000000000000000 \
  --token 0x0000000000000000000000000000000000000000 \
  --isdefault true
```

### set-best-strategy

```
Usage: set best strategy or default best strategy

Options:
--token            required <address> the address of token
--riskprofilecode           required <number>  the code of risk profile
--strategyhash     required <string>  the keccak256 hash of strategy
--strategyprovider required <address> the address of strategyProvider
--isdefault        required <bool>    whether set best default strategy or not
--network          optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat set-best-strategy \
  --network localhost \
  --riskprofilecode 1 \
  --strategyprovider 0x0000000000000000000000000000000000000000 \
  --strategyhash 0x0000000000000000000000000000000000000000 \
  --token 0x0000000000000000000000000000000000000000 \
  --isdefault true
```

### set-invest-strategy-registry

```
Usage: set vault invest strategy registry in registry contract

Options:
--registry         required <address> the address of registry
--investstrategyregistry required <address> the address of investStrategyRegistry
--network          optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat set-invest-strategy-registry \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --investstrategyregistry 0x0000000000000000000000000000000000000000
```

### unpause-vault

```
Usage: unpause the vault

Options:
--registry required <address> the address of registry
--vault    required <address> the address of vault
--network  optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat unpause-vault \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --vault 0x0000000000000000000000000000000000000000
```

### vault-actions

```
Usage: perform actions in the vault contract

Options:
--vault         required <address> the address of vault
--user          required <address> account address of the user
--action        required <string>  "DEPOSIT" || "WITHDRAW" || "REBALANCE"
--withrebalance optional <bool>    do action with rebalance (default: true)
--useall        optional <bool>    use whole balance (default: false)
--amount        optional <number>  amount of token (default: 0)
--network       optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat vault-actions \
  --network localhost \
  --vault 0x0000000000000000000000000000000000000000 \
  --user 0x0000000000000000000000000000000000000000 \
  --action deposit \
  --withrebalance true \
  --useall false \
  --amount 500000
```

### map-liquiditypool-adapter

```
Usage: approve and map liquidity pool to adapter

Options:
--registry      required <address> the address of registry
--liquiditypool required <address> the address of liquidity
--adapter       required <address> the address of defi adapter
--network       optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat map-liquiditypool-adapter \
--network localhost \
--registry 0x09557807C515d758ECc5E1D1aCE7D09aA5842F51  \
--liquiditypool 0x71B9eC42bB3CB40F017D8AD8011BE8e384a95fa5 \
--adapter 0xbf78A1a02e34CF7aCDB8BD9D0f225cB6AA6B85C5
```

### map-liquiditypools-adapter

```
Usage: approve and map liquidity pools to a specific adapter

Options:
--registry      required <address> the address of registry
--adaptername   required <address> the name of adapter
--adapter       required <address> the address of defi adapter
--network       optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat map-liquiditypools-adapter \
--network localhost \
--registry 0x09557807C515d758ECc5E1D1aCE7D09aA5842F51  \
--adaptername CompoundAdapter \
--adapter 0xbf78A1a02e34CF7aCDB8BD9D0f225cB6AA6B85C5
```

### set-max-deposit

```
Usage: set max deposit for a specific adapter

Options:
--adapter         required <address> the address of adapter
--amount          required <number>  the max deposit amount
--mode            required <address> the max deposit mode (*)
--liquiditypool   required <address> the address of liquiditypool (*)
--underlyingtoken required <address> the address of underlying token (*)
--setprotocol     optional <boolean> set amount for Protocol or not (default: false)
--network         optional <string>  name of the network provider (default: hardhat)
```

- Notes:
  (\*) might be required depend on the Adapter's contract.

- Example:

```
yarn hardhat set-max-deposit
--adapter 0xA38FdF6d6D3E6dff80F416Fa6C1649b317A70595 \
--amount 1000000000000000000000000 \
--mode pct \
--liquiditypool 0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c \
--underlyingtoken 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490 \
--setprotocol false \
--network localhost
```

### set-max-deposit-mode

```
Usage: set max deposit mode for a specific adapter

Options:
--adapter      required <address> the address of adapter
--mode         required <address> the max deposit mode
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat set-max-deposit-mode
--adapter 0xA38FdF6d6D3E6dff80F416Fa6C1649b317A70595 \
--mode pct \
--network localhost
```

### balance-of

```
Usage: check token balance of specific address

Options:
--token   required <address> the address of token
--user    required <address> the address of user
--network optional <string>  name of the network provider (default: hardhat)
```

- Example

```
yarn hardhat balance-of \
--network localhost \
--token 0x6B175474E89094C44Da98b954EedeAC495271d0F  \
--user 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1
```

### get-action

```
Usage: execute a get action in smart contract

Options:
--name        required <address> the name of contract
--address     required <address> the address of smart contract
--functionabi required <string> a get function abi
--params      optional <array> the required params of the function (default: "")
--network     optional <string>  name of the network provider (default: hardhat)
```

- Notes:
  functionabi: needs to have quotation marks('') around the function abi.
  params: need to have comma(,) in order to differentiate each param (Ex : param1,param2).

- Example

```
yarn hardhat get-action \
--network localhost \
--name ERC20 \
--address 0x6B175474E89094C44Da98b954EedeAC495271d0F \
--functionabi 'balanceOf(address)' \
--params 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1
```

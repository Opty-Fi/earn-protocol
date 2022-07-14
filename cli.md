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

### deploy-registry

```
Usage: deploy Registry contract

Options:
--deployedonce optional <bool>   allow checking whether contracts were deployed previously (default: true)
--network      optional <string> name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-registry \
  --deployedonce false \
  --network localhost
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

### deploy-odefi-vault-booster

```
Usage: deploy ODEFIVaultBooster contract

Options:
--registry     required <address> the address of registry
--odefi        required <address> the address of odefi
--deployedonce optional <bool>    allow checking whether contracts were deployed previously (default: true)
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat deploy-odefi-vault-booster \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --odefi 0x0000000000000000000000000000000000000000
```

### deploy-vault

```
Usage: deploy Vault contract

Options:
--registry     required <address> the address of registry
--token        required <address> the address of underlying token
--riskprofilecode       required <number>  the code of Vault's risk profile
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

### add-risk-profile

```
Usage: add risk profile in Registry contract

Options:
--riskprofilecode required <number>   the code of risk profile
--canborrow       required <boolean>  whether risk profile can borrow or not
--lowestrating    required <number>   the lowest rating
--highestrating   required <number>   the highest rating
--network         optional <string>   name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat add-risk-profile \
  --network localhost \
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
--token              required <address> the address of token
--risk-profile-code  required <number>  the code of risk profile
--strategy-name      required <string>  the name of strategy
--strategy-provider  required <address> the address of strategyProvider
--is-default         required <bool>    whether set best default strategy or not
--network            optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat set-best-strategy \
  --network localhost \
  --riskprofilecode 1 \
  --strategy-provider 0x0000000000000000000000000000000000000000 \
  --strategy-name "wmatic-DEPOSIT-Aave-amWMATIC" \
  --token 0x0000000000000000000000000000000000000000 \
  --is-default true
```

### unpause-vault

```
Usage: unpause the vault

Options:
--vault-symbol  required <address> the vault symbol
--state         required <address> the vault unpause state
--network       optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat unpause-vault \
  --network localhost \
  --vault-symbol opUSDCgrow
  --state true
```

### vault-actions

```
Usage: perform actions in the vault contract

Options:
--vault-symbol  required <address> the vault symbol
--user          required <address> account address of the user
--action        required <string>  "DEPOSIT" || "WITHDRAW" || "REBALANCE" || "VAULT-DEPOSIT-ALL-TO-STRATEGY"
--merkle-proof  required <string>  merkle proofs in stringified form
--useall        optional <bool>    use whole balance (default: false)
--amount        optional <number>  amount of token (default: 0)
--network       optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat vault-actions \
  --network localhost \
  --vault-symbol opUSDCgrow \
  --user 0x0000000000000000000000000000000000000000 \
  --action deposit \
  --useall false \
  --amount 500000
```

### map-liquiditypool-to-adapter

```
Usage: approve and map liquidity pool to adapter

Options:
--liquidity-ypool required <address> the address of liquidity
--adapter-name       required <address> the address of defi adapter
--network       optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat map-liquiditypool-to-adapter \
--network localhost \
--liquidity-pool 0x71B9eC42bB3CB40F017D8AD8011BE8e384a95fa5 \
--adapter-name CompoundAdapter
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
--functionabi required <string>  a get function abi
--params      optional <array>   the required params of the function (default: "")
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

### get-price-per-full-share

```
Usage: get price per full share of the vault

Options:
--vault            required <address> the address of vault
--block-number     optional <number>  block number (default: current block number)
--network          optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat get-price-per-full-share \
  --network localhost \
  --vault 0x0000000000000000000000000000000000000000 \
  --block-number 1234567
```

### get-total-supply

```
Usage: get total supply of the vault

Options:
--vault            required <address> the address of vault
--block-number     optional <number>  block number (default: current block number)
--network          optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat get-price-per-full-share \
  --network localhost \
  --vault 0x0000000000000000000000000000000000000000 \
  --block-number 1234567
```

### change-vault-proxy-v2-admin

```
Usage: change vault proxy admin

Options:
--vault     required <address> the address of vault
--new-admin required <number>  the address of new admin
--network   optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat change-vault-proxy-v2-admin \
  --network localhost \
  --vault 0x0000000000000000000000000000000000000000 \
  --new-admin 0x0000000000000000000000000000000000000000
```

### set-pending-governance

```
Usage: set pending governance

Options:
--registry               required <address> the address of registry
--new-pending-governance required <number>  the address of pending governance
--network                optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat set-pending-governance \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --new-pending-governance 0x0000000000000000000000000000000000000000
```

### accept-pending-governance

```
Usage: accept pending governance

Options:
--registry required <address> the address of registry
--network  optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
  yarn hardhat accept-pending-governance \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
```

### transfer-operation-ownership

```
Usage: transfer all operator roles to same address

Options:
--registry     required <address> the address of registry
--new-operator required <address> the address of new operator
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat transfer-operation-ownership \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --new-operator 0x0000000000000000000000000000000000000000 \
```

### transfer-operator

```
Usage: transfer operator

Options:
--registry     required <address> the address of registry
--new-operator required <address> the address of new finance operator
--network      optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat transfer-operator \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --new-operator 0x0000000000000000000000000000000000000000 \
```

### transfer-finance-operator

```
Usage: transfer finance operator

Options:
--registry             required <address> the address of registry
--new-finance-operator required <address> the address of new finance operator
--network              optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat transfer-finance-operator \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --new-finance-operator 0x0000000000000000000000000000000000000000 \
```

### transfer-risk-operator

```
Usage: transfer risk operator

Options:
--registry          required <address> the address of registry
--new-risk-operator required <address> the address of new risk operator
--network           optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat transfer-risk-operator \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --new-risk-operator 0x0000000000000000000000000000000000000000 \
```

### transfer-strategy-operator

```
Usage: transfer strategy operator

Options:
--registry              required <address> the address of registry
--new-strategy-operator required <address> the address of new strategy operator
--network               optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat transfer-strategy-operator \
  --network localhost \
  --registry 0x0000000000000000000000000000000000000000 \
  --new-strategy-operator 0x0000000000000000000000000000000000000000 \
```

### set-whitelisted-accounts-root

```
Usage: whitelisted accounts merkle root hash

Options:
--vault                 required <address> the address of vault
--merkle-root-hash      required <string>  the merkle root hash
--network               optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat set-whitelisted-accounts-root \
  --network localhost \
  --vault 0x0000000000000000000000000000000000000000 \
  --merkle-root-hash 0x1212121212121212121212121212121212121212121212121212121212121212 \
```

### approve-token-and-map-to-tokenshash

```
Usage: approve token and map token to tokenshash

Options:
--token                 required <string>  the address of token
--network               optional <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat approve-token-and-map-to-tokenshash \
  --network localhost \
  --token 0x0000000000000000000000000000000000000000 \
```

### set-vault-configuration

```
Usage: set vault configuration

Options:
--vault-symbol        required <string> the vault symbol
--vault-configuration required <string> the vault symbol
--network             optional <string> name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat set-vault-configuration \
  --network localhost \
  --vault-symbol opUSDCgrow \
  --vault-configuration 2718155043500073612906634403139041842518004532954031278126931986324444413952
```

### change-polygon-opusdcgrow-proxy-v2-admin

```
Usage: change polygon opUSDCgrow vault proxy v2 admin

Options:
--new-admin required <string> address of the new admin
--network       optional  <string>  name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat change-polygon-opusdcgrow-proxy-v2-admin
  --network localhost \
  --new-admin 0x0000000000000000000000000000000000000000
```

### change-vault-proxy-v2-admin

```
Usage: change vault proxy v2 admin

Options:
--vault-symbol required <string> symbol of the vault
--new-admin    required <string> new admin address
--network      optional <string> name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat change-vault--proxy-v2-admin
  --network localhost \
  --vault-symbol opAAVEaggr \
  --new-admin 0x0000000000000000000000000000000000000000
```

### set-best-strategy-rebalance-multisig

```
Usage: set best strategy and rebalance using multisig

Options:
--token-symbol  required <string> symbol of the vault
--strategy-name required <string> name of strategy
--vault-symbol  required <string> symbol of vault
--network       optional <string> name of the network provider (default: hardhat)
```

- Example:

```
yarn hardhat set-best-strategy-rebalance-multisig
  --network localhost \
  --vault-symbol opAAVEaggr \
  --token-symbol AAVE
  --strategy-name aave-DEPOSIT-SushiswapPool-AAVE-WETH-SLP
```

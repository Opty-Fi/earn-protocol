# Earn protocol
Core smart contract of OptyFi's Earn protocol

# Setup optyfi's earn protocol.

## Installation

- <a href="https://nodejs.org/en/" target="_blank">Node.js</a> - >v8
- Install <a href="https://www.google.ca/chrome/" target="_blank">Google Chrome</a> or <a href="https://www.google.ca/chrome/" target="_blank">FireFox</a> or <a href="https://www.mozilla.org/en-CA/firefox/" target="_blank">Brave</a>
- Install <a href="https://brave.com/" target="_blank">MetaMask</a> in the browser
- API keys from Ethereum node Providers like <a href="https://chainstack.com" target="_blank">chainstack.com</a>
- Install remixd 
```bash
$ npm install -g @remix-project/remixd
```

## Getting Started

### Forked Mainnet

- Clone defi-faucet 

```bash
$ git clone https://github.com/Opty-Fi/defi-faucet.git
$ cd ./defi-faucet
```

- start forked mainnet

```bash
$ node ./ganache-server.js
```

###  Earn protocol

- Clone earn-protocol

```bash
$ git clone https://github.com/Opty-Fi/earn-protocol.git
```
#### Steps to deploy all the contracts correctly
Note: harvest.finance fDAI vault (HarvestAdapter) will be used in this example.
1. Deploy RegistryProxy()
2. Deploy Registry()
3. Call RegistryProxy.setPendingImplementation(address _registry)
4. Call Registry.become(address _registryProxy)
5. Deploy Registry at RegistryProxy address
6. Deploy StrategyProvider(address _registryProxy)
7. Deploy RiskManagerProxy Contract
8. Deploy RiskManager Contract
9. Call RiskManagerProxy.setPendingImplementation(address _riskManager)
10. Call RiskManager.become(address _riskManagerProxy)
11. Deploy RiskManager at RiskManagerProxy address
    - Note: Use this new RiskManager everywhere from here onwards
12. Call RiskManager.initialize(address __strategyProvider)
13. Deploy HarvestCodeProvider(address _registryProxy)
14. Deploy StrategyCodeProvider(address _registryProxy, address _gatherer)
15. Deploy OPTY(address _registryProxy, uint256(0)). Copy OPTY address and paste it in OPTYMinterStorage, where there is a constant called OPTYAddress
16. Deploy OPTYMinter(address _registryProxy)
17. Deploy HarvestAdapter(address _registryProxy, address _harvestCodeProvider)
18. Compile VaultProxy => Deploy InitializableImmutableAdminUpgradeabilityProxy(address _admin). Note: _admin should be a different account that the one from which you deployed the previous contract. This address will only be used for upgrading the implementations in VaultProxy
19. Deploy Vault(address _registryProxy, address DAI)
20. Switch to _admin account and call VaultProxy.upgradeTo(address _vault)
21. Switch back to your normal account
22. Deploy Vault at VaultProxy address
23. Call Vault.initialize(address _registryProxy, address _riskManager, address DAI, address _strategyCodeProvider, address _optyMinter)

After all these steps, if you want to test it, you need to approve token, approve liquidityPool, etc. in RegistryProxy as usual.

- Run `yarn run` to view all available tasks.

### Deployments
For deploying infrastructure contracts (including executing all essential actions and deploying core vaults) in Optyfi protocol.
```
# hardhat
    yarn deploy
# localhost
    yarn deploy:local
```
For deploying all Optyfi core vaults.
```
Prerequisite : Deployed all infrastructure contracts.
# hardhat
    yarn hardhat deploy-vaults --registry <address> --riskmanager <address> --strategymanager <address> --optyminter <address>
# localhost
    yarn hardhat --network localhost deploy-vaults --registry <address> --riskmanager <address> --strategymanager <address> --optyminter <address>
```
For deploying vault.
```
Prerequisite : Deployed all infrastructure contracts.
# hardhat
    yarn hardhat deploy-vault --token <address> --riskprofile <riskProfileName> --registry <address> --riskmanager <address> --strategymanager <address> --optyminter <address>
# localhost
    yarn hardhat --network localhost deploy-vaults --registry <address> --riskmanager <address> --strategymanager <address> --optyminter <address>
```
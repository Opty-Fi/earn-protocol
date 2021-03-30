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
Note: harvest.finance fDAI vault will be used in this example.
1. Deploy RegistryProxy()
2. Deploy Registry()
3. Call RegistryProxy.setPendingImplementation(address _registry)
4. Call Registry.become(address _registryProxy)
5. Deploy Registry at RegistryProxy address
6. Deploy StrategyProvider(address _registryProxy)
7. Deploy RiskManager(address _registryProxy, address _strategyProvider)
8. Deploy Gatherer(address _registryProxy)
9. Deploy StrategyCodeProvider(address _registryProxy, address _gatherer)
10. Deploy OPTY(address _registryProxy, uint256(0)). Copy OPTY address and paste it in OPTYMinterStorage, where there is a constant called OPTYAddress
11. Deploy OPTYMinter(address _registryProxy)
12. Deploy HarvestCodeProvider(address _registryProxy, address _gatherer)
13. Compile VaultProxy => Deploy InitializableImmutableAdminUpgradeabilityProxy(address _admin). Note: _admin should be a different account that the one from which you deployed the previous contract. This address will only be used for upgrading the implementations in VaultProxy
14. Deploy Vault(address _registryProxy, address DAI)
15. Switch to _admin account and call VaultProxy.upgradeTo(address _vault)
16. Switch back to your normal account
17. Deploy Vault at VaultProxy address
18. Call Vault.initialize(address _registryProxy, address _riskManager, address DAI, address _strategyCodeProvider, address _optyMinter)

After all these steps, if you want to test it, you need to approve token, approve liquidityPool, etc. in RegistryProxy as usual.
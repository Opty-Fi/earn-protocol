## dai-3Crv-f3Crv recipe

- Install Node JS
- Open a terminal and run following commands

```
# clone the repository
$ git clone github.com/opty-fi/earn-protocol.git
# cd inside earn-protocol
$ cd ./earn-protocol
# install all deps
$ yarn
```

- create `.env`. Refer `.env.example`
- Open another terminal

```
$ cd ./earn-protocol
# start a forked mainnet
$ yarn hardhat node
```

### Using the first terminal:

- run `yarn setup:local`. Following is sample output

```console
INVESTSTRATEGYREGISTRY address : 0xa0D61133044ACB8Fb72Bc5a0378Fe13786538Dd0
STRATEGYPROVIDER address : 0x04Ef8a8d3B198749582896F3Bb133ACCc989bD78
STRATEGYMANAGER address : 0xd16db0605d9050738A12698446c3310d4849A107
OPTYDISTRIBUTOR address : 0x4193258197BE2D8ff8d23B23596e5672A7d6AAf9
OPTY address : 0x50e052253D8326aC0e583DA997D547117e0Bffbf
RISKMANAGER address : 0x3b05CDd9Ae5E7bB51D66ee22180215677aDaC240
HARVESTCODEPROVIDER address : 0xa0F5deBF1FbE0a5d5861dD8D97C7326Ba7F57b4E
OPTYSTAKINGRATEBALANCER address : 0x81616d0547771f1065635baBEe8844edff1d8D89
OPTYSTAKINGVAULT1D address : 0x3D2A5fDEca0f20419547Ffb92B79074b48bfC821
OPTYSTAKINGVAULT30D address : 0x453C114563fE6C9c82172bd25F736C070e79513a
OPTYSTAKINGVAULT60D address : 0x766815FAC4929c98b105d9C83d1eb653fFd6494E
OPTYSTAKINGVAULT180D address : 0x1C86bd5f5655Fa82560f2a244D4Bc22C17eBb5bb
        Deploying Adapter contracts ...
AAVEV1ADAPTER address : 0x7Ac723C93c6B33D007DaA95fE0b739c1a7323382
AAVEV2ADAPTER address : 0x883834cbC7f0AC8889aF6Af53B0891921BE3a4F8
COMPOUNDADAPTER address : 0x8199B05AE66c2Fa833E79A0cabA902803EB37510
CREAMADAPTER address : 0x93e2CE316901D0a32a30A13DE7E99Cf0f14bb596
CURVEDEPOSITPOOLADAPTER address : 0x17a8aEcC232333CA9eCBBC215aEaA75974af2481
CURVESWAPPOOLADAPTER address : 0xbf78A1a02e34CF7aCDB8BD9D0f225cB6AA6B85C5
DYDXADAPTER address : 0xd9973620722385cA3972A6B7a6EB0957215270DE
DFORCEADAPTER address : 0xD92ae79a5caE07b4FF8ef5b0f80339157760EEbD
FULCRUMADAPTER address : 0x537aDE23f3c8aC52DB4845fcB213206672c219B5
HARVESTV1ADAPTER address : 0x1084641297453a0749865d0143E33F19Bf58D0f1
YVAULTADAPTER address : 0xfb66B3FCCc886E754a0002f1e84d85a6b2b7aC82
SUSHISWAPADAPTER address : 0xd70CF3AAB8C2DD7983474E3932f616D1D6ce7Fb2
Started setting strategies
-----------------
Invest strategy Name : DAI-deposit-COMPOUND-cDAI
Invest strategy Hash : 0xf14294bb238069facb3da995a8d6e805967558c99956a61ce7aa8b53954db845
-----------------
-----------------
Invest strategy Name : DAI-deposit-AAVE-aDAI
Invest strategy Hash : 0x96c4bb18025d9dc8a66aee1e9c88d3a896852ff155498bd92a62815c26aad9e6
-----------------
-----------------
Invest strategy Name : DAI-deposit-AAVE_V2-aDAI
Invest strategy Hash : 0x5c8dded359cb64005826fb1e79204e7e93ab2514a5a8ed888165413ec1ba3695
-----------------
-----------------
Invest strategy Name : USDT-deposit-CREAM-crUSDT
Invest strategy Hash : 0xcb61c52b021239e4103ddc1d729c72ae1b0fe87258ce407f1c5bc73d0fea6c21
-----------------
-----------------
Invest strategy Name : DAI-deposit-DFORCE-dDAI
Invest strategy Hash : 0xf9a1b96cc3cc8d7d5cd704e7c429a93a138a86bf323552599e56f97320e843f5
-----------------
-----------------
Invest strategy Name : DAI-deposit-DYDX-dyDAI
Invest strategy Hash : 0x72074c0428259c3c8f33f949bfae8389762be0d71d00b4bb4dccfbbc74998420
-----------------
-----------------
Invest strategy Name : DAI-deposit-HARVEST-fDAI
Invest strategy Hash : 0x2c365ec0925c4400f3c0ad18ddcdd76c24a997ec8f0c2b4d35b6092783b6ac6a
-----------------
-----------------
Invest strategy Name : DAI-deposit-YEARN-yDAI
Invest strategy Hash : 0x86c40601ee0b1a4fe5fe3a8360b49796a71f161cb964f4f71c64655ff93244bf
-----------------
-----------------
Invest strategy Name : WETH-USDC-deposit-SUSHISWAP-SLP
Invest strategy Hash : 0xc1b2246f219e1807b87105e63fa3038253a7acde41ac69bbbbbe6650259c6e40
-----------------
-----------------
Invest strategy Name : DAI-deposit-CURVE-cDAI+cUSDC
Invest strategy Hash : 0x3e076878da36b4a13cf8970e6908479b2125d0713952f1788554969a00dd75bb
-----------------
-----------------
Invest strategy Name : DAI-deposit-CURVE-cDAI+cUSDC-deposit-HARVEST-fcDAI+cUSDC
Invest strategy Hash : 0xef9bba228e1763706f889b9ee7c5775e6c12d009000b9c7a792bd0c2a7b2bed0
-----------------
-----------------
Invest strategy Name : DAI-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD-deposit-CREAM-crYCRV
Invest strategy Hash : 0xbf9e62ee808c64ccb25a96ad68fb722b60394ce11fe8388cc98e9e19c498fc77
-----------------
-----------------
Invest strategy Name : DAI-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD-deposit-HARVEST-fYCRV
Invest strategy Hash : 0xf203d1bd27d98f490126dd5ce1e8766e9d9678c33f7b97749000dcbf00557a25
-----------------
-----------------
Invest strategy Name : DAI-deposit-CURVE-yDAI+yUSDC+yUSDT+yBUSD-deposit-HARVEST-fyDAI+yUSDC+yUSDT+yBUSD
Invest strategy Hash : 0xc7f81a410e3d1424f792645cc6f35063775650d6b4ef09b72fd700c6ea36da30
-----------------
-----------------
Invest strategy Name : DAI-deposit-CURVE-3Crv-deposit-HARVEST-f3CRV
Invest strategy Hash : 0x680de03bc39b6b526671d7a0cbb083a37afbc0955a32582495326f8850baabcf
-----------------
-----------------
Invest strategy Name : USDC-deposit-CURVE-cDAI+cUSDC-deposit-HARVEST-fcDAI+cUSDC
Invest strategy Hash : 0x52c0e8c3c4d04530a324042d8d5986efded2f83959f702020077ebdcf975e705
-----------------
-----------------
Invest strategy Name : USDC-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD-deposit-CREAM-crYCRV
Invest strategy Hash : 0x90e92f4967378df6f1385581a043bb87c35098bb1e991c8a0aafcd2580a50d21
-----------------
-----------------
Invest strategy Name : USDC-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD-deposit-HARVEST-fYCRV
Invest strategy Hash : 0x5eae362a2ee7242bde96a30344833cfdf37906282a19a548504e38da7e7d08d5
-----------------
-----------------
Invest strategy Name : USDC-deposit-CURVE-yDAI+yUSDC+yUSDT+yBUSD-deposit-HARVEST-fyDAI+yUSDC+yUSDT+yBUSD
Invest strategy Hash : 0x26dfdad3b9f305efe3f609975be8c408cd069f094112f4ebbfa1061dc1a9744d
-----------------
-----------------
Invest strategy Name : USDC-deposit-CURVE-3Crv-deposit-HARVEST-f3CRV
Invest strategy Hash : 0xe6d475069b9db72eb4295971fd67e8853c5f2d3ecb4c42dacecf8959336fdcfb
-----------------
-----------------
Invest strategy Name : USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD-deposit-CREAM-crYCRV
Invest strategy Hash : 0x794f76bed4b22aed54b34e8d52a6b53d0d62167b3ded7a3def93e8d08c931418
-----------------
-----------------
Invest strategy Name : USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yBUSD-deposit-HARVEST-fyDAI+yUSDC+yUSDT+yBUSD
Invest strategy Hash : 0x1e8e0c7bc0216fbd009ec343c780e1d6fbbf0c036b18f2373bb968488084985e
-----------------
-----------------
Invest strategy Name : WBTC-deposit-CURVE-crvRenWBTC-deposit-HARVEST-fcrvRenWBTC
Invest strategy Hash : 0x262edd4c90a565cf0da5bcad6d1000e4163634c252c3c6e80374d90860e3d857
-----------------
-----------------
Invest strategy Name : TUSD-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD-deposit-CREAM-crYCRV
Invest strategy Hash : 0xb021b7fca169335937667eed08e789681bb405b78e1c088fa7af1209576843a2
-----------------
-----------------
Invest strategy Name : TUSD-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD-deposit-HARVEST-fYCRV
Invest strategy Hash : 0xb3ac00785dd825ff41e54595084e9b2bb693d47b9d2d572f3a2e15973899451a
-----------------
-----------------
Invest strategy Name : WETH-deposit-YEARN-yWETH-deposit-CREAM-crYETH
Invest strategy Hash : 0x76376b18722c4817a48e6ecd33fc472965b63fae441cd7ff98fdde31e87e2c70
-----------------
-----------------
Invest strategy Name : 3Crv-deposit-CURVE-usdn3CRV-deposit-HARVEST-fusdn3CRV
Invest strategy Hash : 0xdb06bef53973d8868f76b2fcf33ca467976b869832ad5aa639cdf2a84163c5e8
-----------------
Finished setting strategies
        Deploying Core Vault contracts ...
Contract DAI-RP0: 0xBf956abf20e4E0e22433b688BFAFA5eC22e5aEbe
Contract DAI-RP1: 0x6eBcb8E158cc127D5Ac9d94142989899F592b73F
Contract DAI-RP2: 0xB4fDF278d712d487Ea27B884b2eA76f578Fa0bfc
Contract DAI-RP3: 0xbd28183b4E3681946Ed1CF7A6071b57Bd2B21dfF
Contract USDC-RP0: 0xD4D33D4313a84671041841F3B4a3652e43Ec6204
Contract USDC-RP1: 0x7ffAdBA410DA71E07057D62b63F44dE1a8BD309c
Contract USDC-RP2: 0x3f3B97e5D96e37A58d586fCe02a6786F7AA293BE
Contract USDC-RP3: 0xe482887E046A4feE307b2b6b2d45DDaeA641ef30
Contract USDT-RP0: 0x9dC218e01eb1FD054d254CbB6E2B18B4ef93f2BE
Contract USDT-RP1: 0x54F4cc14A906975Bb5Aaa54F42751A862b94fCB7
Contract USDT-RP2: 0x72CD1D05ef74f631F92D7758ea47620a193DDeC5
Contract USDT-RP3: 0x851db2912DB797C86986DAF27651AC67D63A53E8
Contract WBTC-RP0: 0xC6D9B063caFBf967721a508E1d6a53F7999440DF
Contract WBTC-RP1: 0x227e70F185c5EB52744d0DA0FD77c3138327C146
Contract WBTC-RP2: 0xfb11dAA1C56bD677418953947c539373a014C939
Contract WBTC-RP3: 0x89151b11BB54c09aB715743d2e6c704C2F205145
Contract WETH-RP0: 0xCeaC877Be170196b0805346793dc222822A553Aa
Contract WETH-RP1: 0x4842275c08810eaCe7Ea8B69979E422CBc8966c2
Contract WETH-RP2: 0x9C955a4507428FcF85fF93da172a08BeFC31982B
Contract WETH-RP3: 0x8a1bF2d1052986CF248721D0cAa1d8f1788Cf3D2
Contract SLP-RP0: 0xC3B3ffF3fbc6C6cd6BAE992a88DA566d52123f88
Contract SLP-RP1: 0x565a48894e139DEbB97e2E1fddBC5f6a927a1758
Contract SLP-RP2: 0x8B8A9D663CFB01451133646cc94ace83cD752D62
Contract SLP-RP3: 0xBd33253CCecEa8322B75641908799821f62aeeab
Finished deploying vaults
BAL-ODEFI-USDC address : 0x0Ab3a795edE4f5e3E78936B1C04191e731B82723
Contract BAL-ODEFI-USDC-RP0: 0x6C6492204Ba23C9c3dAC86386EEaaa0d409EfDE7
Finished setup task
```

- approve and map Curve3Crv liquidity pool to CurveSwapPoolAdapter

```
 yarn hardhat map-liquiditypool-adapter \
 --network localhost \
 --registry 0x09557807C515d758ECc5E1D1aCE7D09aA5842F51  \
 --liquiditypool 0x71B9eC42bB3CB40F017D8AD8011BE8e384a95fa5 \
 --adapter 0x1084641297453a0749865d0143E33F19Bf58D0f1
```

- approve and map f3Crv liquidity pool to HarvestV1Adapter

```
yarn hardhat map-liquiditypool-adapter \
--network localhost \
--registry 0x09557807C515d758ECc5E1D1aCE7D09aA5842F51  \
--liquiditypool 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7 \
--adapter 0xbf78A1a02e34CF7aCDB8BD9D0f225cB6AA6B85C5
```

- approve f3Crv token

```
yarn hardhat approve-token \
--token 0x71B9eC42bB3CB40F017D8AD8011BE8e384a95fa5  \
--registry 0x09557807C515d758ECc5E1D1aCE7D09aA5842F51 \
--network localhost
```

- approve 3Crv token

```
yarn hardhat approve-token \
--token 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490 \
--registry 0x09557807C515d758ECc5E1D1aCE7D09aA5842F51 \
--network localhost
```

- set default strategy for DAI token

```
yarn hardhat set-best-strategy \
--token 0x6B175474E89094C44Da98b954EedeAC495271d0F \
--riskprofile RP1 \
--strategyhash 0x680de03bc39b6b526671d7a0cbb083a37afbc0955a32582495326f8850baabcf \
--strategyprovider 0x04Ef8a8d3B198749582896F3Bb133ACCc989bD78 \
--isdefault true \
--network localhost
```

- Verify that the above strategy is the default

```
yarn hardhat get-best-strategy \
--token 0x6B175474E89094C44Da98b954EedeAC495271d0F \
--riskprofile RP1 \
--strategyprovider 0x04Ef8a8d3B198749582896F3Bb133ACCc989bD78 \
--isdefault true \
--network localhost
```

- Invest 300 DAI to DAI Vault

```
yarn hardhat vault-actions \
--vault 0x6eBcb8E158cc127D5Ac9d94142989899F592b73F \
--action DEPOSIT \
--user 0x541dA4c3E9B46b813794239a04130345D8d74FB2 \
--withrebalance true \
--useall false \
--amount "300000000000000000000" \
--network localhost
```

Following is the sample output

```console
Funding user with underlying token...
Underlying token : 503.00000005 DAI
Allowance : 500.0 DAI
Invest strategy : 0x0000000000000000000000000000000000000000000000000000000000000000
depositing with rebalance..
Invest strategy : 0x680de03bc39b6b526671d7a0cbb083a37afbc0955a32582495326f8850baabcf
Vault Shares : 800.212844233211992691 opDAIRP1Vault
Underlying token : 3.00000005 DAI
Finished executing Vault actions
```

- Redeem 100 opDAIRP1Vault

```
yarn hardhat vault-actions \
--vault 0x6eBcb8E158cc127D5Ac9d94142989899F592b73F \
--action WITHDRAW \
--user 0x541dA4c3E9B46b813794239a04130345D8d74FB2 \
--withrebalance true \
--useall false \
--amount "100000000000000000000" \
--network localhost
```

Following is the sample output

```console
Invest strategy : 0x680de03bc39b6b526671d7a0cbb083a37afbc0955a32582495326f8850baabcf
withdrawing with rebalance..
Invest strategy : 0x680de03bc39b6b526671d7a0cbb083a37afbc0955a32582495326f8850baabcf
Vault Shares : 300.212844233211992691 opDAIRP1Vault
Underlying token : 502.575209381099187996 DAI
Finished executing Vault actions
```

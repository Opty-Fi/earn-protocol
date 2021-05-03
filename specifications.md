# Opty-Fi-Earn

## `OptyRegistry.sol`

### Libraries

- [Addresses.sol](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Address.sol)

### Variables

| Name                                                                                                       | Type      | Structure                                                                                                      | visibility                                       | purpose                                                                               |
| ---------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| LiquidityPool                                                                                              | `struct`  | `{uint8 rating, bool isLiquidityPool}`                                                                         | `public`                                         | attributes of liquidity pools.                                                        |
| StrategyStep                                                                                               | `struct`  | `{address creditPool; address creditPoolProxy; address borrowToken; address liquidityPool; address poolProxy;` | `public`                                         | store the strategy step                                                               |
| Strategy                                                                                                   | `struct`  | `{ uint8 score; bool isStrategy; uint256 index; uint256 blockNumber; StrategyStep[] strategySteps;}`           | `public`                                         | store the strategy steps in sequence with and its score                               |
| Token                                                                                                      | `struct`  | `{uint256 index; address[] tokens}`                                                                            | `public`                                         | store the list of underlying tokens along with their index                            |
| governance                                                                                                 | `address` | N/A                                                                                                            | `public`                                         | Stores the address of the governance                                                  |
| strategist                                                                                                 | `address` | N/A                                                                                                            | `public`                                         | Stores the address of the strategist                                                  |
| strategyHashIndexes                                                                                        | `bytes[]` | N/A                                                                                                            | `public`                                         | Stores the hash of the strategies                                                     |
| tokensHashIndexes                                                                                          | `bytes[]` | N/A                                                                                                            | `public`                                         | Stores the hashes for the underlying tokens like DAI, USDC etc.                       |
| tokens                                                                                                     | `mapping` | `mapping(address tokenContract => bool enabled)`                                                               | `public`                                         | stores the tokens supported by Opty.Fi's Earn platform                                |
| tokensHashToTokens                                                                                         | `mapping` | `mapping(bytes32 tokenHash => Token tokenStruct)`                                                              | `public`                                         | Stores the mapping of list the underlying tokens to their hashes                      |
| liquidityPools                                                                                             | `mapping` | `mapping(address liquidityPool => LiquidityPool liquidityPoolStruct)`                                          | `public`                                         | store the rating and status of the liquidity pool corresponding to the liquidity pool |
| creditPools                                                                                                | `mapping` | `mapping(address liquidityPool => LiquidityPool liquidityPoolStruct)`                                          | `public`                                         | store the rating and status of the credit pool corresponding to the credit pool       |
| strategies                                                                                                 | `mapping` | `mapping(bytes32 strategyHash => Strategy strategyStruct)`                                                     | Store the strategy linked with the strategy hash |
| tokenToStrategies                                                                                          | `mapping` | `mapping(address token => bytes32[])`                                                                          | `public`                                         | store the lookup for supported token and its corresponding strategy hashes.           |
| strategyIndexes                                                                                            | `bytes32` | `bytes32[] strategyIndexes`                                                                                    | `public`                                         | store list of unique strategy hashes.                                                 |
| liquidityPoolToLPTokens                                                                                    | `mapping` | `mapping(address liquidityPool => address[] lpTokens)`                                                         | `public`                                         | store the lp tokens per liquidity pool                                                |
| `[Note: Below variables have been removed from OptyRegistry and just kept in spec. for future reference ]` |
| liquidityPoolToUnderlyingTokens                                                                            | `mapping` | `mapping(address liquidityPool => address[] underlyingtokens)`                                                 | `public`                                         | store the underlying tokens per liquidity pool                                        |

### Functions

| Name                                                                                                       | Input Parameters                                              | visibility | Return Parameters                                                                                            | Called By  | Description                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------- |
| constructor                                                                                                | N?A                                                           | `public`   | N/A                                                                                                          | N/A        | approve => underlying tokens, liquidityPools; initiliaze owner, governance and strategist   |
| transferGovernance                                                                                         | `address _governance`                                         | `public`   | N/A                                                                                                          | Governance | change governance                                                                           |
| transferStrategist                                                                                         | `address _strategits`                                         | `public`   | N/A                                                                                                          | Governance | change strategist                                                                           |
| approveToken                                                                                               | `address _token`                                              | `public`   | `bool success`                                                                                               | Governance | enable token in `tokens` mapping.                                                           |
| revokeToken                                                                                                | `address _token`                                              | `public`   | `bool success`                                                                                               | Governance | disable token from `tokens` mapping.                                                        |
| approveLiquidityPool                                                                                       | `address _pool`                                               | `public`   | `bool success`                                                                                               | Governance | enable liquidity pool in `liquidityPool` mapping                                            |
| revokeLiquidityPool                                                                                        | `address _pool`                                               | `public`   | `bool success`                                                                                               | Governance | disable liquidity pool in `liquidityPool` mapping                                           |
| approveCreditPool                                                                                          | `address _pool`                                               | `public`   | `bool success`                                                                                               | Governance | enable credit pool in `creditPool` mapping                                                  |
| revokeCreditPool                                                                                           | `address _pool`                                               | `public`   | `bool success`                                                                                               | Governance | disable credit pool in `creditPool` mapping                                                 |
| rateLiquidityPool                                                                                          | `address _pool, uint8 _rate`                                  | `public`   | `bool success`                                                                                               | Governance | provide rating to liquidity pool                                                            |
| rateCreditPool                                                                                             | `address _pool, uint8 _rate`                                  | `public`   | `bool success`                                                                                               | Governance | provide rating to Credit pool                                                               |
| setStrategy                                                                                                | `address _token,StrategyStep[] memory _strategyStep`          | `public`   | `bytes32 hash`                                                                                               | Governance | Sets `_strategySteps` for `_pool` from the `liquidityPools` mapping.                        |
| getStrategy                                                                                                | `bytes32 _hash`                                               | `public`   | `uint8 _score, bool _isStrategy, uint256 _index, uint256 _blockNumber, StrategyStep[] memory _strategySteps` | N/A        | Returns the Strategy by `_hash`.                                                            |
| approveStrategy                                                                                            | `bytes32 _hash`                                               | `public`   | `bool success`                                                                                               | Governance | enables `_hash` Startegy from the `strategies` mapping.                                     |
| revokeStrategy                                                                                             | `bytes32 _hash`                                               | `public`   | `bool success`                                                                                               | Governance | disable `_hash` Startegy from the `strategies` mapping.                                     |
| scoreStrategy                                                                                              | `bytes32 _hash, uint8 _score`                                 | `public`   | `bool success`                                                                                               | Governance | dScores `_hash` Startegy from the `strategies` mapping.                                     |
| getTokenToStrategies                                                                                       | `bytes32 _tokenHash`                                          | `public`   | `bytes32[] memory tokenToStrategies[_tokenHash]`                                                             | N/A        | Returns the list of strategy hashes by `_tokenHash`                                         |
| setLiquidityPoolToLPTokens                                                                                 | `address _pool, address[] memory _tokens, address _poolToken` | `public`   | `bool success`                                                                                               | Governance | Assign liquidity pool tokens `_tokens` to `_pool` in the `liquidityPoolToLPTokens` mapping. |
| getLiquidityPoolToLPToken                                                                                  | `address _pool, address[] memory _tokens`                     | `public`   | `address`                                                                                                    | N/A        | Get the lpToken given the `_pool` and `_tokens`                                             |
| setTokensHashToTokens                                                                                      | `address[] memory _tokens`                                    | `public`   | N/A                                                                                                          | Governance | Sets `_poolToken` to the `_pool` from the {liquidityPoolToLPTokens} mapping                 |
| getTokensHashToTokens                                                                                      | `bytes32 _tokenHash`                                          | public     | `address[] memonry`                                                                                          | N/A        | Get the list of token given the `_tokensHash`                                               |
| \_isNewStrategy                                                                                            | `bytes32 _hash`                                               | `private`  | `bool isNewStrategy`                                                                                         | N/A        | returns whether a strategy hash exists or not.                                              |
| \_isNewTokensHash                                                                                          | `bytes32 _hash`                                               | `private`  | `bool`                                                                                                       | N/A        | Check duplicate `_hash` tokensHash from the {tokensHashIndexes} mapping                     |
| `[Note: Below functions have been removed from OptyRegistry and just kept in spec. for future reference ]` |
| setLiquidityPoolToUnderlyingTokens                                                                         | `address _pool, address[] memory _tokens`                     | `public`   | `bool success`                                                                                               | Governance | Assign `_tokens` to `_pool` in the `liquidityPoolToUnderlyingTokens` mapping.               |
| getUnderlyingTokens                                                                                        | `address _pool`                                               | `public`   | `address[] memory tokens`                                                                                    | N/A        | Returns the list of tokens by `_pool` from `liquidityPoolToUnderlyingTokens` mapping        |

### Events

| Event name                                                                                                 | Parameters                                                                                                           | Description                                                        |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| LogToken                                                                                                   | `address token, bool enabled`                                                                                        | Logs when token is enabled/disabled                                |
| LogLiquidityPool                                                                                           | `address liquidityPool, bool enabled`                                                                                | Logs when a liquidity pool is enabled/disabled                     |
| LogRateLiquidityPool                                                                                       | `address liquidityPool, uint rate`                                                                                   | Logs when a liquidity pool is rated                                |
| LogRateCreditPool                                                                                          | `address creditPool, uint rate`                                                                                      | Logs when a credit pool is rated                                   |
| LogSetStrategy                                                                                             | `address caller,bytes32 tokensHash, bytes32 hash`                                                                    | Logs when strategy is set                                          |
| LogStrategy                                                                                                | `address caller, bytes32 hash, bool enabled`                                                                         | Logs the strategy when `hash` strategy is approved or revoked      |
| LogScoreStrategy                                                                                           | `address token, uint strategyProfileId, uint strategyId, uint blockNumber, uint score, StrategyStep[] strategySteps` | Log when the strategy is scored                                    |
| LogSetLiquidityPoolToLPTokens                                                                              | `address indexed caller, address indexed pool, bytes32 indexed tokens`                                               | Log when a liquidity pool is assigned with corresponding lp tokens |
| `[Note: Following events are not being used as of now and just kept into over here for future reference ]` |
| LogStrategyProfile                                                                                         | `uint strategyProfileId, bool enabled`                                                                               | Logs when a strategy is enabled/disabled                           |
| LogSetLiquidityPoolToUnderlyingTokens                                                                      | `address indexed caller, address indexed pool, bytes32 indexed tokens`                                               | Log when a liquidity pool is assigned corresponding tokens         |

### Modifiers

| Name                         | Input Parameters | visibility | Return Parameters | Called By | Description                               |
| ---------------------------- | ---------------- | ---------- | ----------------- | --------- | ----------------------------------------- |
| onlyGovernance               | N/A              | N/A        | N/A               | N/A       | checks for the valid sender's address     |
| onlyValidAddress             | N/A              | N/A        | N/A               | N/A       | checks for the valid governance's address |
| eitherGovernanceOrStrategist | N/A              | N/A        | N/A               | N/A       | checks for the valid governance's address |

## `OptyStrategy.sol`

### Interfaces

- [IOptyLiquidityPoolProxy]()
- [IOptyRegistry]()

### Libraries

- [SafeERC20]()
- [Addresses]()

### Utils

- [ERC20.sol]()

### Variables

| Name         | Type      | Structure | visibility | purpose                                |
| ------------ | --------- | --------- | ---------- | -------------------------------------- |
| governance   | `address` | N/A       | `public`   | Stores the address of the governance   |
| optyRegistry | `address` | N/A       | `public`   | Stores the address of the OptyRegistry |

### Functions

| Name                            | Input Parameters                                                       | visibility | Return Parameters                                    | Called By  | Description                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------- | ---------- | ---------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| constructor                     | `address optyRegistry`                                                 | `public`   | N/A                                                  | N/A        | initialize the optyRegistry                                                                                  |
| setOptyRegistry                 | `address optyRegistry`                                                 | `public`   | N/A                                                  | Governance | sets the value of optyRegistry                                                                               |
| balance                         | `bytes32 _hash, address _account`                                      | `public`   | `uint amount`                                        | N/A        | returns the value of account balance of the underlying token specified by `hash`                             |
| singleStepBalance               | `IOptyRegistry.StrategyStep[] memory _strategySteps, address _account` | `public`   | `uint amount`                                        | N/A        | returns the value of account balance of the underlying token specified by single step strategy `hash`        |
| balanceInToken                  | `bytes32 _hash, address _account`                                      | `public`   | `uint amount`                                        | N/A        | returns the value of liquidity pool in underlying token specified by strategy `hash`                         |
| singleStepBalanceInToken        | `IOptyRegistry.StrategyStep[] memory _strategySteps, address _account` | `public`   | `uint amount`                                        | N/A        | returns the value of liquidity pool in underlying token specified by single step strategy `hash`             |
| poolDeposit                     | `uint _amount, bytes32 _hash`                                          | `public`   | `bool success`                                       | N/A        | deposit underlying token equal to `amount` to the pool specified by `hash`                                   |
| singleStepPoolDeposit           | `uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps`     | `public`   | N/A                                                  | N/A        | deposit underlying token equal to `amount` to the pool specified by single step strategy `hash`              |
| poolWithdraw                    | `uint _amount, bytes32 _has`                                           | `public`   | `bool success`                                       | N/A        | withdraw the underlying token equal to amount from the lending pool specified by strategy `hash`             |
| singleStepPoolWithdraw          | `uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps`     | `public`   | `bool success`                                       | N/A        | withdraw the underlying token equal to amount from the lending pool specified by single step strategy `hash` |
| getStrategySteps                | `bytes32 _hash`                                                        | `public`   | `IOptyRegistry.StrategyStep[] memory _strategySteps` | N/A        | returns the list of `StrategyStep[]`                                                                         |
| getLiquidityPoolToken           | `bytes32 _hash`                                                        | `public`   | `address _lendingPool`                               | N/A        | return the liquidity pool specified by strategy `hash`                                                       |
| getSingleStepLiquidityPoolToken | `IOptyRegistry.StrategyStep[] memory _strategySteps`                   | `public`   | `address _lendingPool`                               | N/A        | return the liquidity pool specified by single step strategy `hash`                                           |

### Modifiers

| Name             | Input Parameters | visibility | Return Parameters | Called By | Description                               |
| ---------------- | ---------------- | ---------- | ----------------- | --------- | ----------------------------------------- |
| onlyValidAddress | N/A              | N/A        | N/A               | N/A       | checks for the valid sender's address     |
| onlyGovernance   | N/A              | N/A        | N/A               | N/A       | checks for the valid governance's address |

## `RiskManager.sol`

### Interfaces

- [IOptyRegistry]();

### Libraries

- [Addresses]()

### Variables

| Name         | Type      | Structure | visibility | purpose                                |
| ------------ | --------- | --------- | ---------- | -------------------------------------- |
| governance   | `address` | N/A       | `public`   | Stores the address of the governance   |
| optyRegistry | `address` | N/A       | `public`   | Stores the address of the OptyRegistry |

### Functions

| Name                     | Input Parameters                                             | visibility | Return Parameters      | Called By | Description                                             |
| ------------------------ | ------------------------------------------------------------ | ---------- | ---------------------- | --------- | ------------------------------------------------------- |
| constructor              | `address optyRegistry`                                       | `public`   | N/A                    | N/A       | initialize the optyRegistry                             |
| setOptyStrategy          | `address _token`                                             | `public`   | N/A                    | Owner     | assigns token address to `token`                        |
| getBestStrategy          | `string memory _profile, address _underlyingToken`           | `public`   | `bytes32 hash`         | N/A       | returns best strategy hash of underlying token          |
| getBestStrategy          | `string memory _profile, address[] memory _underlyingTokens` | `public`   | `bytes32 strategyHash` | N/A       | Get the best strategy for the Basic/Advance Pool        |
| \_getBestBasicStrategy   | `bytes32 _tokenHash`                                         | `internal` | `bytes32 strategyHash` | N/A       | returns best basic strategy hash for underlying token   |
| \_getBestAdvanceStrategy | `bytes32 _tokenHash`                                         | `internal` | `bytes32 strategyHash` | N/A       | returns best advance strategy hash for underlying token |

### Modifiers

| Name           | Input Parameters | visibility | Return Parameters | Called By | Description                               |
| -------------- | ---------------- | ---------- | ----------------- | --------- | ----------------------------------------- |
| onlyGovernance | N/A              | N/A        | N/A               | N/A       | checks for the valid governance's address |

## `Opty<underlying-token-name><strategy-profile-name>Pool.sol`

### Interfaces

- [IOptyStrategy]()
- [IOptyLiquidityPoolProxy]()
- [IRiskManager]()

### Utils

- [ERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol)
- [ERC20Detailed.sol]()
- [ReentrancyGuard]()
- [Ownable]()

### libraries

- [SafeERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/SafeERC20.sol)

### Variables

| Name         | Type      | Structure | visibility | purpose                                       |
| ------------ | --------- | --------- | ---------- | --------------------------------------------- |
| strategyHash | `bytes32` | N/A       | `public`   | store keccak256 hash function of the startegy |
| token        | `address` | N/A       | `public`   | store address of the underlying token         |
| riskManager  | `address` | N/A       | `public`   | stores address of the risk manager            |
| optyStrategy | `address` | N/A       | `public`   | store address of the strategy contract        |
| poolValue    | `uint`    | N/A       | `public`   | store the total value of pool                 |
| riskProfile  | `string`  | N/A       | `public`   | store the profile name                        |

### Functions

| Name                               | Input Parameters                                                                                | visibility | Return Parameters | Called By                                                            | Description                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- | ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| constructor                        | `string memory _profile, address _riskManager, address _underlyingToken, address _optyStrategy` | `public`   | N/A               | initializes for `profile`, `riskManager`, `token` and `optyStrategy` |
| setRiskProfile                     | `string memory _profile`                                                                        | `public`   | N/A               | Owner                                                                | assigns name of the profile to `portfolio`                                                  |
| setRiskManager                     | `address _riskManager`                                                                          | `public`   | N/A               | Owner                                                                | assigns risk manager's contract address to `riskManager`                                    |
| setToken                           | `address _token`                                                                                | `public`   | N/A               | Owner                                                                | assigns token address to `token`                                                            |
| setOptyStrategy                    | `address _token`                                                                                | `public`   | N/A               | Owner                                                                | assigns token address to `token`                                                            |
| supplyToken                        | `uint amount`                                                                                   | `public`   | N/A               | User                                                                 | deposits the underlying tokens to the strategy specified by `strategyHash`                  |
| rebalance                          | N/A                                                                                             | `external` | N/A               | User                                                                 | allows user to deposit in most recent best strategy                                         |
| \_rebalance                        | N/A                                                                                             | `internal` | N/A               | N/A                                                                  | rebalances the pool during redeem action by the user                                        |
| userDepositRebalance               | `uint _amount`                                                                                  | `external` | `bool _success`   | User                                                                 | allows user to invest tokens                                                                |
| calcPoolValueInToken               | N/A                                                                                             | `public`   | `uint amount`     | User                                                                 | reads the total tokens invested in `Strategy`                                               |
| balance                            | N/A                                                                                             | `public`   | `uint amount`     | User                                                                 | returns the underlying token balance of the contract                                        |
| \_balance                          | N/A                                                                                             | `internal` | `uint amount`     | N/A                                                                  | returns the underlying token balance of the contract                                        |
| userWithdraw                       | `uint _shares`                                                                                  | `external` | `bool _success`   | User                                                                 | allows user to withdraw tokens from opty pool                                               |
| \_userWithdrawAll                  | N/A                                                                                             | `internal` | N/A               | N/A                                                                  | withdraw pool's deployment from the current strategy                                        |
| \_userWithdrawToken                | `uint amount`                                                                                   | `internal` | N/A               | N/A                                                                  | redeem the investments and receive underlying token                                         |
| \_userWithdrawSome                 | N/A                                                                                             | `internal` | N/A               | N/A                                                                  | withdraw investment proportional to inestor's amount                                        |
| \_userWithdrawToken(uint \_amount) | `uint256 amount`                                                                                | `internal` | N/A               | N/A                                                                  | withdraw underlying tokens and transfer it to the optystrategy and then withdraw from there |
| userWithdrawRebalance              | `uint _amount`                                                                                  | `external` | `bool _success`   | User                                                                 | allows user to withdraw investments from strategy                                           |

| `[Note: Following function is not used as of now and kept in specs for future reference and can be removed later if not needed]`
| userDeposit | `uint _shares` | `external` | `bool _success` | User | allows user to deposit tokens to opty pool|

### Modifiers

| Name             | Input Parameters | visibility | Return Parameters | Called By | Description                           |
| ---------------- | ---------------- | ---------- | ----------------- | --------- | ------------------------------------- |
| onlyValidAddress | N/A              | N/A        | N/A               | N/A       | checks for the valid sender's address |

## `IOptyLiquidityPoolProxy`

### Functions

| Name           | Input Parameters                                                                      | visibility | Return Parameters | Called By | Description                                                                                     |
| -------------- | ------------------------------------------------------------------------------------- | ---------- | ----------------- | --------- | ----------------------------------------------------------------------------------------------- |
| poolDeposit    | `address underlyingToken,address lendingPool,address lendingPoolToken,uint amount`    | `extenal`  | `bool success`    | N/A       | deploy the underlying token to liquidity pool                                                   |
| poolWithdraw   | `address underlyingToken,address lendingPoolToken,uint amount`                        | `extenal`  | `bool success`    | N/A       | redeem liquidity pool token for underlying token                                                |
| balance        | `address token,address account`                                                       | `extenal`  | `uint amount`     | N/A       | return the token balance holded by account                                                      |
| balanceInToken | `address lendingPoolToken, address account`                                           | `extenal`  | `uint amount`     | N/A       | return equivalent of liquidity token holding in underlying token                                |
| borrow         | `address _underlyingToken,address _lendingPoolAddressProvider, address _borrowToken`  | `external` | `bool success`    | N/A       | For borrowing the token from credit providers                                                   |
| repay          | `address _lendingPoolAddressProvider, address _borrowToken,address _lendingPoolToken` | `external` | `bool success`    | N/A       | Repay for the collateral                                                                        |
| balance        | `address token,address account`                                                       | `external` | `uint`            | N/A       | Returns the amount of {token} tokens owned by account                                           |
| balanceInToken | `address lendingPoolToken, address account`                                           | `external` | `uint`            | N/A       | Returns the equivalent value of {lendingPoolToken} tokens in underlying tokens owned by account |

## IAToken.sol

[Note: Names of functions and variables are as per Aave contract]

### Functions

| Name   | Input Parameters | visibility | Return Parameters | Called By | Description                             |
| ------ | ---------------- | ---------- | ----------------- | --------- | --------------------------------------- |
| redeem | `uint256 amount` | `external` | N/A               | N/A       | redeems aToken against underlying token |

## IAave.sol

[Note: Names of functions and variables are as per Aave contract]

### Functions

| Name    | Input Parameters                                        | visibility | Return Parameters | Called By | Description                                  |
| ------- | ------------------------------------------------------- | ---------- | ----------------- | --------- | -------------------------------------------- |
| deposit | `address reserve, address amount, address referralCode` | `external` | N/A               | N/A       | supply underlying token to aave lending pool |

## ILendingPoolAddressProvider

[Note: Names of functions and variables are as per Aave contract]

### Functions

| Name               | Input Parameters | visibility | Return Parameters                | Called By | Description                          |
| ------------------ | ---------------- | ---------- | -------------------------------- | --------- | ------------------------------------ |
| getLendingPool     | N/A              | `external` | `address lendingPoolAddress`     | N/A       | return aave lendingpool address      |
| getLendingPoolCore | N/A              | `external` | `address lendingPoolCoreAddress` | N/A       | return aave lendingpool core address |

## ICompound.sol

[Note: Names of functions and variables are as per Compound contract]

### Variables

| Name                   | Type     | Structure                                                       | visibility | purpose                                                                   |
| ---------------------- | -------- | --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| CompBalanceMetadata    | `struct` | `{uint balance; uint votes address delegate;}`                  | `public`   | Stores the balance of the COMP token                                      |
| CompBalanceMetadataExt | `struct` | `{uint balance; uint votes; address delegate; uint allocated;}` | `public`   | Stores the balance of COMP plus allocated availble to the user for voting |

### Functions

| Name                      | Input Parameters                                     | visibility | Return Parameters               | Called By                                           | Description                                       |
| ------------------------- | ---------------------------------------------------- | ---------- | ------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| getCompBalanceMetadata    | `address comp, address account`                      | `external` | `CompBalanceMetadata memory`    | Get the balance of the COMP tokens for the user     |
| getCompBalanceMetadataExt | `address comp, address comptroller, address account` | `external` | `CompBalanceMetadataExt memory` | Used to claim the COMP tokens for the user(account) |
| mint                      | `uint256 mintAmount`                                 | `external` | `uint256 result`                | N/A                                                 | mint cTokens on compound pool                     |
| redeem                    | `uint256 redeemTokens`                               | `external` | `uint256 result`                | N/A                                                 | redeem cTokens for underlying tokens              |
| exchangeRateStored        | N/A                                                  | `external` | `uint exchangeRate`             | N/A                                                 | return cToken exchange rate with underlying token |

## ICurve.sol

[Note: Names of functions and variables are as per Curve contract]

### Functions

| Name | Input Parameters | visibility | Return Parameters | Called By | Description |
| ---- | ---------------- | ---------- | ----------------- | --------- | ----------- |

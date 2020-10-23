# Opty-Fi-Earn

## `OptyRegistry.sol`

### Libraries

- [Addresses.sol](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Address.sol)

### Variables

| Name                     | Type          | Structure                                                                                                                                     | visibility   | purpose                                                                |
| ------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| governance | `address` | N/A | `public` | Stores the address of the governance |
| strategist | `address` | N/A | `public` | Stores the address of the strategist |
| tokens                   | `mapping`     | `mapping(address tokenContract => bool enabled)`                                                                                              | `public`     | stores the tokens supported by Opty.Fi's Earn platform                 |
| StrategyStep      | `struct`      | `{address token; address creditPool; address borrowToken; address liquidityPool; address strategyContract; address lendingPoolToken;address poolProxy;`                                  | `public`     | store the strategy step                                           |
| Strategy                 | `struct`      | `{StrategyStep[] strategySteps; uint8 score; uint256 blockNumber; bool enabled;}` | `public`     | store the strategy steps in sequence with and its score           |
| tokenToStrategies        | `mapping`     | `mapping(address token => bytes32[])`                                 | `public`     | store the lookup for supported token and its corresponding strategy hashes. |
| strategyIndexes         | `bytes32`     | `bytes32[] strategyIndexes`                                 | `public`     | store list of unique strategy hashes. |
| LiquidityPool         | `struct`     | `{uint8 rating, bool isLiquidityPool}`                                 | `public`     | attributes of liquidity pools. |
| liquidityPools         | `mapping`     | `mapping(address liquidityPool => bytes32[] strategies)`                                 | `public`     | store list of liquidity pools. |
| liquidityPoolToUnderlyingTokens         | `mapping`     | `mapping(address liquidityPool => address[] underlyingtokens)`                                 | `public`     | store the underlying tokens per liquidity pool |
| liquidityPoolToLPTokens         | `mapping`     | `mapping(address liquidityPool => address[] lpTokens)`                                 | `public`     | store the lp tokens per liquidity pool |

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| constructor           | N?A                                                                  | `public`   |    N/A            | N/A | approve => underlying tokens, liquidityPools; initiliaze owner, governance and strategist|
| transferGovernance | `address _governance`  | `public`  | N/A  | Governance  | change governance  |
| transferStrategist | `address _strategits`  | `public`  | N/A  | Governance  | change strategist  |
| approveToken           | `address _token`                                                                  | `public`   |    `bool success`            | Governance | enable token in `tokens` mapping.                       |
| revokeToken          | `address _token`                                                                  | `public`   | `bool success`               | Governance | disable token from `tokens` mapping.                    |
| approveLiquidityPool          | `address _pool`                                                                  | `public`   | `bool success`               | Governance | enable liquidity pool in `liquidityPool` mapping                     |
| revokeLiquidityPool          | `address _pool`                                                                  | `public`   | `bool success`               | Governance | disable liquidity pool in `liquidityPool` mapping                    |
| rateLiquidityPool          | `address _pool, uint8 _rate`                                                                  | `public`   | `bool success`               | Governance | provide rating to liquidity pool                    |
| setLiquidityPoolToUnderlyingTokens          | `address _pool, address[] memory _tokens`                                                                  | `public`   | `bool success`               | Governance | Assign `_tokens` to `_pool` in the `liquidityPoolToUnderlyingTokens` mapping.                    |
| getUnderlyingTokens          | `address _pool`                                                                  | `public`   | `address[] memory tokens`               | N/A | Returns the list of tokens by `_pool` from    `liquidityPoolToUnderlyingTokens` mapping                 |
| setLiquidityPoolToLPTokens          | `address _pool, address[] memory _tokens`                                                                  | `public`   | `bool success`               | Governance | Assign liquidity pool tokens `_tokens` to `_pool` in the `liquidityPoolToLPTokens` mapping.                    |
| setStrategy          | `address _token,StrategyStep[] memory _strategyStep`                                                                  | `public`   | `bytes32 hash`               | Governance | Sets `_strategySteps` for `_pool` from the `liquidityPools` mapping.                    |
| getStrategy          | `bytes32 _hash`                                                                  | `public`   | `uint8 _score, bool _isStrategy, uint256 _index, uint256 _blockNumber, StrategyStep[] memory _strategySteps`               | N/A | Returns the Strategy by `_hash`.                    |
| approveStrategy          | `bytes32 _hash`                                                                  | `public`   | `bool success`               | Governance |enables `_hash` Startegy from the `strategies` mapping.                    |
| revokeStrategy          | `bytes32 _hash`                                                                  | `public`   | `bool success`               | Governance | disable `_hash` Startegy from the `strategies` mapping.                    |
| scoreStrategy          | `bytes32 _hash, uint8 _score`                                                                  | `public`   | `bool success`               | Governance | dScores `_hash` Startegy from the `strategies` mapping.                    |
| getTokenStrategies          | `address _toke`                                                                  | `public`   | `bytes32[] memory strategies`               | N/A | Returns the list of strategy hashes by `_token`                   |
| _isNewStrategy          | `bytes32 _hash`                                                                  | `private`   | `bool isNewStrategy`               | N/A | returns whether a strategy hash exists or not.                    |

### Events

| Event name | Parameters | Description |
|------------|------------|-------------|
| LogToken | `address token, bool enabled` | Logs when token is enabled/disabled |
| LogStrategyProfile | `uint strategyProfileId, bool enabled` | Logs when a strategy is enabled/disabled |
| LogStrategy | `address token, uint strategyProfileId, StrategyStep[] strategySteps, uint steps, uint blockNumber, bool enabled` | Logs when a strategy is enabled/disabled |
| LogLiquidityPool | `address liquidityPool, bool enabled` | Logs when a liquidity pool is enabled/disabled |
| LogRateLiquidityPool | `address liquidityPool, uint rate` | Logs when a liquidity pool is rated |
| LogScoreStrategy | `address token, uint strategyProfileId, uint strategyId, uint blockNumber, uint score, StrategyStep[] strategySteps` | Log when the strategy is scored |
| LogSetLiquidityPoolToUnderlyingTokens | `address indexed caller, address indexed pool, bytes32 indexed tokens` | Log when a liquidity pool is assigned corresponding tokens |
| LogSetLiquidityPoolToLPTokens | `address indexed caller, address indexed pool, bytes32 indexed tokens` | Log when a liquidity pool is assigned with corresponding lp tokens |

### Modifiers

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| onlyGovernance | N/A | N/A | N/A | N/A | checks for the valid sender's address |
| onlyValidAddress | N/A | N/A | N/A | N/A | checks for the valid governance's address |
| eitherGovernanceOrStrategist | N/A | N/A | N/A | N/A | checks for the valid governance's address |

## `OptyStrategy.sol`

### Interfaces

- [SafeERC20]()
- [IOptyLiquidityPoolProxy]()
- [IOptyRegistry]()

### Libraries

- [Addresses]()

### Variables

| Name                     | Type          | Structure                                                                                                                                     | visibility   | purpose                                                                |
| ------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| governance | `address` | N/A | `public` | Stores the address of the governance |
| optyRegistry | `address` | N/A | `public` | Stores the address of the OptyRegistry |

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| constructor | `address optyRegistry` | `public` | N/A | N/A | initialize the optyRegistry |
| setOptyRegistry | `address optyRegistry` | `public` | N/A | Governance | sets the value of optyRegistry |
| balance | `bytes32 _hash, address _account` | `public` | `uint amount` | N/A | returns the value of account balance of the underlying token specified by `hash` |
| singleStepBalance | `IOptyRegistry.StrategyStep[] memory _strategySteps, address _account` | `public` | `uint amount` | N/A | returns the value of account balance of the underlying token specified by single step strategy `hash` |
| balanceInToken | `bytes32 _hash, address _account` | `public` | `uint amount` | N/A | returns the value of liquidity pool in underlying token specified by strategy `hash` |
| singleStepBalanceInToken | `IOptyRegistry.StrategyStep[] memory _strategySteps, address _account` | `public` | `uint amount` | N/A | returns the value of liquidity pool in underlying token specified by single step strategy `hash` |
| deploy | `uint _amount, bytes32 _hash` | `public` | `bool success` | N/A | deposit underlying token equal to `amount` to the pool specified by `hash` |
| singleStepDeploy | `uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps` | `public` | N/A | N/A | deposit underlying token equal to `amount` to the pool specified by single step strategy `hash` |
| recall | `uint _amount, bytes32 _has` | `public` | `bool success` | N/A | withdraw the underlying token equal to amount from the lending pool specified by strategy `hash` |
| singleStepRecall | `uint _amount, IOptyRegistry.StrategyStep[] memory _strategySteps` | `public` | `bool success` | N/A | withdraw the underlying token equal to amount from the lending pool specified by single step strategy `hash` |
| getStrategySteps | `bytes32 _hash` | `public` | `IOptyRegistry.StrategyStep[] memory _strategySteps` | N/A | returns the list of `StrategyStep[]` |
| getLiquidityPoolToken | `bytes32 _hash` | `public` | `address _lendingPool` | N/A | return the liquidity pool specified by strategy `hash` |
| getSingleStepLiquidityPoolToken | `IOptyRegistry.StrategyStep[] memory _strategySteps` | `public` | `address _lendingPool` | N/A | return the liquidity pool specified by single step strategy `hash` |

### Modifiers

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| onlyValidAddress | N/A | N/A | N/A | N/A | checks for the valid sender's address |
| onlyGovernance | N/A | N/A | N/A | N/A | checks for the valid governance's address |

## `RiskManager.sol`

### Interfaces

- [IOptyRegistry]();

### Variables

| Name                     | Type          | Structure                                                                                                                                     | visibility   | purpose                                                                |
| ------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| governance | `address` | N/A | `public` | Stores the address of the governance |
| optyRegistry | `address` | N/A | `public` | Stores the address of the OptyRegistry |

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| constructor | `address optyRegistry` | `public` | N/A | N/A | initialize the optyRegistry |
| setOptyStartegy | `address _token` | `public` | N/A | Owner | assigns token address to `token` |
| getBestStrategy | `string memory _profile, address _underlyingToken` | `public` | `bytes32 hash` | N/A | returns best strategy hash of underlying token |
| getBestBasicStrategy | `address _underlyingToken` | `public` | `bytes32 hash` | N/A | returns best basic strategy hash  for underlying token |

### Modifiers

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| onlyGovernance | N/A | N/A | N/A | N/A | checks for the valid governance's address |

## `IOptyLiquidityPool`

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| deploy | `uint _amount` | `external` | `bool success` | N/A | deploy in to liquidity pool |
| withdraw | `uint _amount` | `external` | `bool success` | N/A | withdraw from liquidity pool |
| claimReward | `address _liquidityPool` | `external`| `bool success` | N/A | claim rewards from liquidity pool |
| balance | `address _holder` | `external` | `uint balance` | N/A | get the balance of LP tokens |
| borrow | `uint _borrowAmount` | `extenral` | `uint _success` | N/A | borrow from the pool against collateral |
| repayBorrow | `uint _borrowAmount` | `external` | `uint _success` | N/A | give the borrowed token back to pool |

## `Opty<underlying-token-name><strategy-profile-name>Pool.sol`

### Interfaces

- [IERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol)
- [IOptyStrategy]()
- [IOptyLiquidityPoolProxy]()
- [IRiskManager]()

### Contracts
- [ERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol)
- [ReentrancyGuard]()
- [Ownable]()

### libraries

- [SafeERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/SafeERC20.sol)
- [SafeMath](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol)

### Variables

| Name                     | Type          | Structure                                                                                                                                     | visibility   | purpose                                                                |
| ------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| strategyHash | `bytes32` | N/A | `public` | store keccak256 hash function of the startegy |
| token | `address` | N/A | `public` | store address of the underlying token |
| riskManager | `address` | N/A | `public` | stores address of the risk manager |
| optyStrategy | `address` | N/A | `public` | store address of the strategy contract |
| poolValue | `uint` | N/A | `public` | store the total value of pool |
| profile | `string` | N/A | `public` | store the profile name |

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| constructor | `string memory _profile, address _riskManager, address _underlyingToken, address _optyStrategy` | `public` | N/A | initializes for `profile`, `riskManager`, `token` and `optyStrategy` |
| setProfile | `string memory _profile` | `public` | N/A | Owner | assigns name of the profile to `portfolio` |
| setRiskManager | `address _riskManager` | `public` | N/A | Owner | assigns risk manager's contract address to `riskManager` |
| setToken | `address _token` | `public` | N/A | Owner | assigns token address to `token` |
| setOptyStartegy | `address _token` | `public` | N/A | Owner | assigns token address to `token` |
| invest | `uint _amount` | `external` | `bool _success` | User | allows user to invest tokens |
| redeem | `uint _amount` | `external` | `bool _success` | User | allows user to withdraw investments from strategy |
| withdraw | `uint _shares` | `external` | `bool _success` | User | allows user to withdraw tokens from opty pool |
| deposit | `uint _shares` | `external` | `bool _success` | User | allows user to deposit tokens to opty pool|
| rebalance | N/A | `external` | N/A | User | allows user to deposit in most recent best strategy |
| _rebalance | N/A | `internal` | N/A | N/A | rebalances the pool during redeem action by the user  |
| calcPoolValueInToken | N/A | `public` | `uint amount` | User | reads the total tokens invested in `Strategy` | 
| supplyToken | `uint amount` | `public` | N/A | User | deposits the underlying tokens to the strategy specified by `strategyHash` |
| balance | N/A | `public` | `uint amount` | User | returns the underlying token balance of the contract |
| _balance | N/A | `internal` | `uint amount` | N/A | returns the underlying token balance of the contract |
| _withdrawAll | N/A | `internal` | N/A | N/A | withdraw pool's deployment from the current strategy |
| _withdrawToken | `uint amount` | `internal` | N/A | N/A | redeem the investments and receive underlying token  |
| _withdrawSome | N/A | `internal` | N/A | N/A | withdraw investment proportional to inestor's amount |

### Modifiers

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| onlyValidAddress | N/A | N/A | N/A | N/A | checks for the valid sender's address |

## `IOptyLiquidityPoolProxy`

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| deploy | `address underlyingToken,address lendingPool,address lendingPoolToken,uint amount` | `extenal` | `bool success` | N/A | deploy the underlying token to liquidity pool |
| recall | `address underlyingToken,address lendingPoolToken,uint amount` | `extenal` | `bool success` | N/A | redeem liquidity pool token for underlying token |
| balance | `address token,address account` | `extenal` | `uint amount` | N/A | return the token balance holded by account |
| balanceInToken | `address lendingPoolToken, address account` | `extenal` | `uint amount` | N/A | return equivalent of liquidity token holding in underlying token |

## IAToken.sol

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| redeem | `uint256 amount` | `external` | N/A | N/A | redeems aToken against underlying token |

## IAave.sol

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| deposit | `address reserve, address amount, address referralCode` | `external` | N/A | N/A | supply underlying token to aave lending pool |

## ILendingPoolAddressProvider

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| getLendingPool | N/A | `external` | `address lendingPoolAddress` | N/A | return aave lendingpool address |
| getLendingPoolCore | N/A | `external` | `address lendingPoolCoreAddress` | N/A | return aave lendingpool core address |

## ICompound.sol

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
| mint | `uint256 mintAmount` | `external` | `uint256 result` | N/A | mint cTokens on compound pool |
| redeem | `uint256 redeemTokens` | `external` | `uint256 result` | N/A | redeem cTokens for underlying tokens |
| exchangeRateStored | N/A | `external` | `uint exchangeRate` | N/A | return cToken exchange rate with underlying token |

## ICurve.sol

### Functions

| Name                   | Input Parameters                                                                  | visibility | Return Parameters | Called By                   | Description                                             |
| ---------------------- | --------------------------------------------------------------------------------- | ---------- | ----------------- | --------------------------- | ------------------------------------------------------- |
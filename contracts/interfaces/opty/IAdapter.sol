// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title Interface for all the defi adapters
 * @author Opty.fi
 * @notice Interface of the Defi protocol code provider/adapter
 * @dev Abstraction layer to different defi protocols like AaveV1, Compound etc.
 * It is used as an interface layer for any new defi protocol
 * Conventions used:
 *  - lp: liquidityPool
 *  - lpToken: liquidityPool token
 */
interface IAdapter {
    /**
     * @notice Returns pool value in underlying token (for all adapters except Curve for which the poolValue is
     * in US dollar) for the given lp and underlyingToken
     * @dev poolValue can be in US dollar (eg. Curve etc.) and in underlyingTokens (eg. Compound etc.)
     * @param _liquidityPool lp address from where to get the pool value
     * @param _underlyingToken address of underlying token for which to get the pool value
     * @return pool value in underlying token for the given lp and underlying token
     */
    function getPoolValue(address _liquidityPool, address _underlyingToken) external view returns (uint256);

    /**
     * @dev Get batch of function calls for depositing specified amount of underlying token in the lp provided
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying tokens supported by the given lp
     * @param _liquidityPool lp address where to depsoit
     * @param _amounts  List of underlying token amounts
     * @return _codes Returns a bytes value to be executed
     */
    function getDepositSomeCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get batch of function calls for depositing vault's full balance in underlying tokens in the specified lp
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying tokens supported by the given lp
     * @param _liquidityPool lp address where to deposit
     * @return _codes Returns a bytes value to be executed
     */
    function getDepositAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get batch of function calls for token amount that can be borrowed safely against the underlying token
     * when kept as collateral
     * @param _vault Address of vault contract
     * @param _underlyingTokens List of underlying tokens supported by the given lp
     * @param _liquidityPool lp address from where to borrow
     * @param _outputToken token address to borrow
     * @return _codes Returns a bytes value to be executed
     */
    function getBorrowAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _outputToken
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Return batch of function calls require to reapy debt, unlock collateral and redeem shares from the given lp
     * @param _vault Address of vault contract
     * @param _underlyingTokens List of underlying tokens supported by the given lp
     * @param _liquidityPoolAddressProvider address of lp address provider where to repay collateral
     * @param _outputToken token address to borrow
     * @return _codes Returns a bytes value to be executed
     */
    function getRepayAndWithdrawAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Get batch of function calls for redeeming specified amount of lpTokens held in the vault
     * @dev Redeem speicified `amount` of `liquidityPoolToken` and sends the `underlyingToken` to the caller`
     * @param _vault Address of vault contract
     * @param _underlyingTokens List of underlying tokens supported by the given lp
     * @param _liquidityPool lp address from where to withdraw
     * @param _amount amount of underlying token to redeem from the given lp
     * @return _codes Returns a bytes value to be executed
     */
    function getWithdrawSomeCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _amount
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Get batch of function calls for redeeming full balance of lpTokens held in the vault
     * @dev Redeem full `amount` of `liquidityPoolToken` and sends the `underlyingToken` to the caller`
     * @param _vault Address of vault contract
     * @param _underlyingTokens List of underlying tokens supported by the given lp
     * @param _liquidityPool lp address from where to withdraw
     * @return _codes Returns a bytes value to be executed
     */
    function getWithdrawAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Get the lp token address
     * @param _underlyingToken Underlying token address
     * @param _liquidityPool lp address from where to get the lpToken
     * @return Returns the lp token address
     */
    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPool) external view returns (address);

    /**
     * @notice Get the underlying token addresses given the lp
     * @param _liquidityPool lp address from where to get the lpToken
     * @param _liquidityPoolToken lp's token address
     * @return _underlyingTokens Returns the array of underlying token addresses
     */
    function getUnderlyingTokens(address _liquidityPool, address _liquidityPoolToken)
        external
        view
        returns (address[] memory _underlyingTokens);

    /**
     * @dev Returns the market price in underlying for all the shares held in a specified lp
     * @param _vault Address of vault contract
     * @param _underlyingToken Underlying token address for which to get the balance
     * @param _liquidityPool lp address which holds the given underlying token
     * @return Returns the amount of underlying token balance
     */
    function getAllAmountInToken(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view returns (uint256);

    /**
     * @notice Get the amount of shares in the specified lp
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address supported by given lp
     * @param _liquidityPool lp address from where to get the balance of lpToken
     * @return Returns the balance of lp token (lpToken)
     */
    function getLiquidityPoolTokenBalance(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view returns (uint256);

    /**
     * @notice Returns the equivalent value of underlying token for given liquidityPoolTokenAmount
     * @param _underlyingToken Underlying token address supported by given lp
     * @param _liquidityPool lp address from where to get the balance of lpToken
     * @param _liquidityPoolTokenAmount lpToken amount for which to get equivalent underlyingToken amount
     * @return Returns the equivalent amount of underlying token for given liquidityPoolTokenAmount
     */
    function getSomeAmountInToken(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) external view returns (uint256);

    /**
     * @notice Get the amount in underlying token that you'll receive if borrowed token is repaid
     * @dev Returns the amount in underlying token for _liquidityPoolTokenAmount collateral if
     * _borrowAmount in _borrowToken is repaid.
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPoolAddressProvider lp address from where to borrow the tokens
     * @param _borrowToken address of token to borrow
     * @param _borrowAmount amount of token to be borrowed
     * @return Returns the amount in underlying token that can be received if borrowed token is repaid
     */
    function getSomeAmountInTokenBorrow(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        uint256 _liquidityPoolTokenAmount,
        address _borrowToken,
        uint256 _borrowAmount
    ) external view returns (uint256);

    /**
     * @notice Get the amount in underlying token that you'll receive if whole balance of vault borrowed token is repaid
     * @dev Returns the amount in underlying token for whole collateral of _vault balance if
     * _borrowAmount in _borrowToken is repaid.
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPoolAddressProvider lp address from where to borrow the tokens
     * @param _borrowToken address of token to borrow
     * @param _borrowAmount amount of token to be borrowed
     * @return Returns the amount in underlying token that you'll receive if whole bal of vault borrowed token is repaid
     */
    function getAllAmountInTokenBorrow(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        address _borrowToken,
        uint256 _borrowAmount
    ) external view returns (uint256);

    /**
     * @dev Returns the equivalent value of liquidityPoolToken for given underlyingTokenAmount
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPool lp address from where to redeem the tokens
     * @param _underlyingTokenAmount amount of underlying token to be calculated w.r.t. lpToken
     * @return Returns the calculated amount lpToken equivalent to underlyingTokenAmount
     */
    function calculateAmountInLPToken(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _underlyingTokenAmount
    ) external view returns (uint256);

    /**
     * @dev Returns the market value in underlying token of the shares in the specified lp
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPool lp address from where to redeem the tokens
     * @param _redeemAmount amount of token to be redeemed
     * @return _amount Returns the market value in underlying token of the shares in the given lp
     */
    function calculateRedeemableLPTokenAmount(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view returns (uint256 _amount);

    /**
     * @notice Checks whether the vault has enough lp token (+ rewards) to redeem for the specified amount of shares
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPool lp address from where to redeem the tokens
     * @param _redeemAmount amount of lpToken (+ rewards) enough to redeem
     * @return Returns a boolean true if lpToken (+ rewards) to redeem for given amount is enough else it returns false
     */
    function isRedeemableAmountSufficient(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view returns (bool);

    /**
     * @notice Returns reward token address for the lp provided
     * @param _liquidityPool lp address for which to get the rewatf token address
     * @return Returns the reward token supported by given lp
     */
    function getRewardToken(address _liquidityPool) external view returns (address);

    /**
     * @notice Returns the amount of accrued reward tokens
     * @param _vault Vault contract address
     * @param _liquidityPool lp address from where to unclaim reward tokens
     * @return _codes Returns a bytes value to be executed
     */
    function getUnclaimedRewardTokenAmount(address payable _vault, address _liquidityPool)
        external
        view
        returns (uint256 _codes);

    /**
     * @notice Return batch of function calls for claiming the reward tokens (eg: COMP etc.)
     * @param _vault Vault contract address
     * @param _liquidityPool lp address from where to claim reward tokens
     * @return _codes Returns a bytes value to be executed
     */
    function getClaimRewardTokenCode(address payable _vault, address _liquidityPool)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @dev Return batch of function calls for swapping specified amount of rewards in vault to underlying tokens
     * via DEX like Uniswap
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPool lp address where to harvest some lp tokens
     * @param _rewardTokenAmount amount of reward token to be harvested to underlyingTokens via DEX
     * @return _codes Returns a bytes value to be executed
     */
    function getHarvestSomeCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _rewardTokenAmount
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Return batch of function calls for swapping full balance of rewards in vault to underlying tokens
     * via DEX like Uniswap
     * @param _vault Vault contract address
     * @param _underlyingToken List of underlying token addresses for the given lp
     * @param _liquidityPool lp address where to harvest all lp tokens
     * @return _codes Returns a bytes value to be executed
     */
    function getHarvestAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Returns whether the protocol can stake lp token
     * @param _liquidityPool lp address for which to check if staking is enabled or not
     * @return Returns a boolean true if lp token staking is allowed else false if it not enabled
     */
    function canStake(address _liquidityPool) external view returns (bool);

    /**
     * @notice Return batch of function calls for staking specified amount of lp token held in a vault
     * @param _liquidityPool lp address where to stake some lp tokens
     * @param _stakeAmount amount of lpToken (held in vault) to be staked
     * @return _codes Returns a bytes value to be executed
     */
    function getStakeSomeCodes(address _liquidityPool, uint256 _stakeAmount)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @notice Return batch of function calls for staking full balance of lp tokens held in a vault
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying token addresses for the given lp
     * @param _liquidityPool lp address where to stake all lp tokens
     * @return _codes Returns a bytes value to be executed
     */
    function getStakeAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Return batch of function calls for unstaking specified amount of lp tokens held in a vault
     * @param _liquidityPool lp address from where to unstake some lp tokens
     * @param _unstakeAmount amount of lpToken (held in a vault) to be unstaked
     * @return _codes Returns a bytes value to be executed
     */
    function getUnstakeSomeCodes(address _liquidityPool, uint256 _unstakeAmount)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @notice Returns the batch of function calls for unstaking whole balance of lp tokens held in a vault
     * @param _vault Vault contract address
     * @param _liquidityPool lp address from where to unstake all lp tokens
     * @return _codes Returns a bytes value to be executed
     */
    function getUnstakeAllCodes(address payable _vault, address _liquidityPool)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @notice Returns the balance in underlying for staked liquidityPoolToken balance of vault
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPool lp address from where to get the amount of staked lpToken
     * @return Returns the underlying token amount for the staked lpToken
     */
    function getAllAmountInTokenStake(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view returns (uint256);

    /**
     * @notice Returns amount of lp tokens staked by the vault
     * @param _vault Vault contract address
     * @param _liquidityPool lp address from where to get the lpToken balance
     * @return Returns the lpToken balance that is staked by the specified vault
     */
    function getLiquidityPoolTokenBalanceStake(address payable _vault, address _liquidityPool)
        external
        view
        returns (uint256);

    /**
     * @notice Returns the equivalent amount in underlying token if the given amount of lpToken is unstaked and redeemed
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPool lp address from where to get amount to redeem
     * @param _redeemAmount redeem amount of lp token for staking
     * @return _amount Returns the lpToken amount that can be redeemed
     */
    function calculateRedeemableLPTokenAmountStake(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view returns (uint256 _amount);

    /**
     * @notice Checks whether the amount specified underlying token can be received for full balance of staked lpToken
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPool lp address where to check the redeem amt is enough to stake
     * @param _redeemAmount amount specified underlying token that can be received for full balance of staking lpToken
     * @return Returns a boolean true if _redeemAmount is enough to stake and false if not enough
     */
    function isRedeemableAmountSufficientStake(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view returns (bool);

    /**
     * @notice Returns the batch of function calls for unstake and redeem specified amount of shares
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying token addresses for the given lp
     * @param _liquidityPool lp address from where to unstake and withdraw
     * @param _redeemAmount amount of lp token to unstake and redeem
     * @return _codes Returns a bytes value to be executed
     */
    function getUnstakeAndWithdrawSomeCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Returns the batch of function calls for unstake and redeem whole balance of shares held in a vault
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying token addresses for the given lp
     * @param _liquidityPool lp address from where to unstake and withdraw
     * @return _codes Returns a bytes value to be executed
     */
    function getUnstakeAndWithdrawAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);
}

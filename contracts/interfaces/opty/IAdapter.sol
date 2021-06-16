// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title Interface for all the DeFi adapters
 * @author Opty.fi
 * @notice Interface of the DeFi protocol code provider/adapter
 * @dev Abstraction layer to different DeFi protocols like AaveV1, Compound, etc.
 * It is used as an interface layer for any new DeFi protocol
 * Conventions used:
 *  - lpToken: liquidity pool token
 */
interface IAdapter {
    /**
     * @notice Returns pool value in underlying token (for all adapters except Curve for which the poolValue is
     * in US dollar) for the given liquidity pool and underlyingToken
     * @dev poolValue can be in US dollar for protocols like Curve if explicitly specified, underlyingToken otherwise
     * for protocols like Compound etc.
     * @param _liquidityPool Liquidity pool's contract address
     * @param _underlyingToken Contract address of the liquidity pool's underlying token
     * @return Pool value in underlying token for the given liquidity pool and underlying token
     */
    function getPoolValue(address _liquidityPool, address _underlyingToken) external view returns (uint256);

    /**
     * @dev Get batch of function calls for depositing specified amount of underlying token in given liquidity pool
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying tokens supported by the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address where to deposit
     * @param _amounts List of underlying token amounts
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getDepositSomeCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256[] memory _amounts
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get batch of function calls for depositing vault's full balance in underlying tokens in given liquidity pool
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying tokens supported by the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address where to deposit
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getDepositAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get batch of function calls for token amount that can be borrowed safely against the underlying token
     * when kept as collateral
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying tokens supported by the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to borrow
     * @param _outputToken Token address to borrow
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getBorrowAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _outputToken
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get batch of function calls require to repay debt, unlock collateral and redeem lpToken
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying tokens supported by the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address for all protocols except for Aave where it is
     * liquidity pool address provider's contract address
     * @param _outputToken Token address to borrow
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getRepayAndWithdrawAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _outputToken
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Get batch of function calls for redeeming specified amount of lpTokens held in the vault
     * @dev Redeem specified `amount` of `liquidityPoolToken` and send the `underlyingToken` to the caller`
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying tokens supported by the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to withdraw
     * @param _amount Amount of underlying token to redeem from the given liquidity pool
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getWithdrawSomeCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _amount
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Get batch of function calls for redeeming full balance of lpTokens held in the vault
     * @dev Redeem full `amount` of `liquidityPoolToken` and send the `underlyingToken` to the caller`
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying tokens supported by the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to withdraw
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getWithdrawAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Get the lpToken address
     * @param _underlyingToken Underlying token address
     * @param _liquidityPool Liquidity pool's contract address from where to get the lpToken
     * @return Returns the lpToken address
     */
    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPool) external view returns (address);

    /**
     * @notice Get the underlying token addresses given the liquidity pool and/or lpToken
     * @dev there are some defi pools which requires liqudiity pool and lpToken's address to return underlying token
     * @param _liquidityPool Liquidity pool's contract address from where to get the lpToken
     * @param _liquidityPoolToken LpToken's address
     * @return _underlyingTokens Returns the array of underlying token addresses
     */
    function getUnderlyingTokens(address _liquidityPool, address _liquidityPoolToken)
        external
        view
        returns (address[] memory _underlyingTokens);

    /**
     * @dev Returns the market value in underlying for all the lpTokens held in a specified liquidity pool
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for which to get the balance
     * @param _liquidityPool Liquidity pool's contract address which holds the given underlying token
     * @return Returns the amount of underlying token balance
     */
    function getAllAmountInToken(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view returns (uint256);

    /**
     * @notice Get the balance of vault in lpTokens in the specified liquidity pool
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address supported by given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to get the balance of lpToken
     * @return Returns the balance of lpToken (lpToken)
     */
    function getLiquidityPoolTokenBalance(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view returns (uint256);

    /**
     * @notice Returns the equivalent value of underlying token for given amount of lpToken
     * @param _underlyingToken Underlying token address supported by given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to get the balance of lpToken
     * @param _liquidityPoolTokenAmount LpToken amount for which to get equivalent underlyingToken amount
     * @return Returns the equivalent amount of underlying token for given lpToken amount
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
     * @param _underlyingToken Underlying token address for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to borrow the tokens
     * @param _borrowToken Token address to borrow
     * @param _borrowAmount Amount of token to borrow
     * @return Returns the amount in underlying token that can be received if borrowed token is repaid
     */
    function getSomeAmountInTokenBorrow(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount,
        address _borrowToken,
        uint256 _borrowAmount
    ) external view returns (uint256);

    /**
     * @notice Get the amount in underlying token that you'll receive if whole balance of vault borrowed token is repaid
     * @dev Returns the amount in underlying token for whole collateral of _vault balance if
     * _borrowAmount in _borrowToken is repaid.
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to borrow the tokens
     * @param _borrowToken Token address to borrow
     * @param _borrowAmount Amount of token to borrow
     * @return Returns amount in underlyingToken that you'll receive if whole balance of vault borrowed token is repaid
     */
    function getAllAmountInTokenBorrow(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        address _borrowToken,
        uint256 _borrowAmount
    ) external view returns (uint256);

    /**
     * @dev Returns the equivalent value of lpToken for given amount of underlying token
     * @param _underlyingToken Underlying token address for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to redeem the tokens
     * @param _underlyingTokenAmount Amount of underlying token to be calculated w.r.t. lpToken
     * @return Returns the calculated amount of lpToken equivalent to underlyingTokenAmount
     */
    function calculateAmountInLPToken(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _underlyingTokenAmount
    ) external view returns (uint256);

    /**
     * @dev Returns the market value in underlying token of the shares in the specified liquidity pool
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to redeem the tokens
     * @param _redeemAmount Amount of token to be redeemed
     * @return _amount Returns the market value in underlying token of the shares in the given liquidity pool
     */
    function calculateRedeemableLPTokenAmount(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view returns (uint256 _amount);

    /**
     * @notice Checks whether the vault has enough lpToken (+ rewards) to redeem for the specified amount of shares
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to redeem the tokens
     * @param _redeemAmount Amount of lpToken (+ rewards) enough to redeem
     * @return Returns a boolean true if lpToken (+ rewards) to redeem for given amount is enough else it returns false
     */
    function isRedeemableAmountSufficient(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view returns (bool);

    /**
     * @notice Returns reward token address for the liquidity pool provided
     * @param _liquidityPool Liquidity pool's contract address for which to get the reward token address
     * @return Returns the reward token supported by given liquidity pool
     */
    function getRewardToken(address _liquidityPool) external view returns (address);

    /**
     * @notice Returns the amount of accrued reward tokens
     * @param _vault Vault contract address
     * @param _liquidityPool Liquidity pool's contract address from where to claim reward tokens
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getUnclaimedRewardTokenAmount(address payable _vault, address _liquidityPool)
        external
        view
        returns (uint256 _codes);

    /**
     * @notice Get batch of function calls for claiming the reward tokens (eg: COMP etc.)
     * @param _vault Vault contract address
     * @param _liquidityPool Liquidity pool's contract address from where to claim reward tokens
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getClaimRewardTokenCode(address payable _vault, address _liquidityPool)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @dev Get batch of function calls for swapping specified amount of rewards in vault to underlying tokens
     * via DEX like Uniswap
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address where the vault's deposit is generating rewards
     * @param _rewardTokenAmount Amount of reward token to be harvested to underlyingTokens via DEX
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getHarvestSomeCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _rewardTokenAmount
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Get batch of function calls for swapping full balance of rewards in vault to underlying tokens
     * via DEX like Uniswap
     * @param _vault Vault contract address
     * @param _underlyingToken List of underlying token addresses for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address where the vault's deposit is generating rewards
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getHarvestAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Returns whether the protocol can stake lpToken
     * @param _liquidityPool Liquidity pool's contract address for which to check if staking is enabled or not
     * @return Returns a boolean true if lpToken staking is allowed else false if it not enabled
     */
    function canStake(address _liquidityPool) external view returns (bool);

    /**
     * @notice Get batch of function calls for staking specified amount of lpToken held in a vault
     * @param _liquidityPool Liquidity pool's contract address where the vault has deposited and which is associated
     * to a staking pool where to stake some lpTokens
     * @param _stakeAmount Amount of lpToken (held in vault) to be staked
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getStakeSomeCodes(address _liquidityPool, uint256 _stakeAmount)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @notice Get batch of function calls for staking full balance of lpTokens held in a vault
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying token addresses for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address where the vault has deposited and which is associated
     * to a staking pool where to stake all lpTokens
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getStakeAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Get batch of function calls for unstaking specified amount of lpTokens held in a vault
     * @param _liquidityPool Liquidity pool's contract address where the vault has deposited and which is associated
     * to a staking pool where to unstake some lpTokens
     * @param _unstakeAmount Amount of lpToken (held in a vault) to be unstaked
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getUnstakeSomeCodes(address _liquidityPool, uint256 _unstakeAmount)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @notice Get the batch of function calls for unstaking whole balance of lpTokens held in a vault
     * @param _vault Vault contract address
     * @param _liquidityPool Liquidity pool's contract address where the vault has deposited and which is associated
     * to a staking pool where to unstake all lpTokens
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getUnstakeAllCodes(address payable _vault, address _liquidityPool)
        external
        view
        returns (bytes[] memory _codes);

    /**
     * @notice Returns the balance in underlying for staked lpToken balance of vault
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address which is associated with staking pool from where to
     * get amount of staked lpToken
     * @return Returns the underlying token amount for the staked lpToken
     */
    function getAllAmountInTokenStake(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view returns (uint256);

    /**
     * @notice Returns amount of lpTokens staked by the vault
     * @param _vault Vault contract address
     * @param _liquidityPool Liquidity pool's contract address from where to get the lpToken balance
     * @return Returns the lpToken balance that is staked by the specified vault
     */
    function getLiquidityPoolTokenBalanceStake(address payable _vault, address _liquidityPool)
        external
        view
        returns (uint256);

    /**
     * @notice Returns the equivalent amount in underlying token if the given amount of lpToken is unstaked and redeemed
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address from where to get amount to redeem
     * @param _redeemAmount Amount of lpToken to redeem for staking
     * @return _amount Returns the lpToken amount that can be redeemed
     */
    function calculateRedeemableLPTokenAmountStake(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view returns (uint256 _amount);

    /**
     * @notice Checks whether the given amount of underlying token can be received for full balance of staked lpToken
     * @param _vault Vault contract address
     * @param _underlyingToken Underlying token address for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address where to check the redeem amt is enough to stake
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
     * @notice Get the batch of function calls for unstake and redeem specified amount of shares
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying token addresses for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address associated to a staking pool from where to unstake
     * and then withdraw
     * @param _redeemAmount Amount of lpToken to unstake and redeem
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getUnstakeAndWithdrawSomeCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Get the batch of function calls for unstake and redeem whole balance of shares held in a vault
     * @param _vault Vault contract address
     * @param _underlyingTokens List of underlying token addresses for the given liquidity pool
     * @param _liquidityPool Liquidity pool's contract address associated to a staking pool from where to unstake
     * and then withdraw
     * @return _codes Returns an array of bytes in sequence that can be executed by vault
     */
    function getUnstakeAndWithdrawAllCodes(
        address payable _vault,
        address[] memory _underlyingTokens,
        address _liquidityPool
    ) external view returns (bytes[] memory _codes);
}

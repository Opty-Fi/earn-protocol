// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title Interface for borrow feature for DeFi adapters
 * @author Opty.fi
 * @notice Interface of the DeFi protocol adapter for borrow functionality
 * @dev Abstraction layer to different DeFi protocols like AaveV1, AaveV2 etc. which has borrow feature
 * It is used as a layer for adding any new functions in DeFi adapters if they include borrow functionality
 * Conventions used:
 *  - lp: liquidityPool
 */
interface IAdapterBorrow {
    /**
     * @dev Get batch of function calls for token amount that can be borrowed safely against the underlying token
     * when kept as collateral
     * @param _optyVault Address of vault contract
     * @param _underlyingTokens List of underlying tokens supported by the given lp
     * @param _liquidityPool lp address from where to borrow
     * @param _outputToken token address to borrow
     * @return _codes Returns a bytes value to be executed
     */
    function getBorrowAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPool,
        address _outputToken
    ) external view returns (bytes[] memory _codes);

    /**
     * @dev Return batch of function calls require to repay debt, unlock collateral and redeem shares from the given lp
     * @param _optyVault Address of vault contract
     * @param _underlyingTokens List of underlying tokens supported by the given lp
     * @param _liquidityPoolAddressProvider address of lp address provider where to repay collateral
     * @param _outputToken token address to borrow
     * @return _codes Returns a bytes value to be executed
     */
    function getRepayAndWithdrawAllCodes(
        address payable _optyVault,
        address[] memory _underlyingTokens,
        address _liquidityPoolAddressProvider,
        address _outputToken
    ) external view returns (bytes[] memory _codes);

    /**
     * @notice Get the amount in underlying token that you'll receive if borrowed token is repaid
     * @dev Returns the amount in underlying token for _liquidityPoolTokenAmount collateral if
     * _borrowAmount in _borrowToken is repaid.
     * @param _optyVault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPoolAddressProvider lp address from where to borrow the tokens
     * @param _borrowToken address of token to borrow
     * @param _borrowAmount amount of token to borrow
     * @return Returns the amount in underlying token that can be received if borrowed token is repaid
     */
    function getSomeAmountInTokenBorrow(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        uint256 _liquidityPoolTokenAmount,
        address _borrowToken,
        uint256 _borrowAmount
    ) external view returns (uint256);

    /**
     * @notice Get the amount in underlying token that you'll receive if whole balance of vault borrowed token is repaid
     * @dev Returns the amount in underlying token for whole collateral of _optyVault balance if
     * _borrowAmount in _borrowToken is repaid.
     * @param _optyVault Vault contract address
     * @param _underlyingToken Underlying token address for the given lp
     * @param _liquidityPoolAddressProvider lp address from where to borrow the tokens
     * @param _borrowToken address of token to borrow
     * @param _borrowAmount amount of token to borrow
     * @return Returns amount in underlyingToken that you'll receive if whole balance of vault borrowed token is repaid
     */
    function getAllAmountInTokenBorrow(
        address payable _optyVault,
        address _underlyingToken,
        address _liquidityPoolAddressProvider,
        address _borrowToken,
        uint256 _borrowAmount
    ) external view returns (uint256);
}

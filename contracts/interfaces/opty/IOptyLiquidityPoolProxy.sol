// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

/**
 * @dev Interface of the OptyLiquidityPoolProxy.
 */
interface IOptyLiquidityPoolProxy {
    /**
     * @dev Supply `amount` of `underlyingToken` tokens to `lendingPool` and sends the `lendingPoolToken` to the caller`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function deploy(address[] memory underlyingTokens,address lendingPool,uint[] memory amounts) external returns(bool);
   
    /**
     * @dev Redeem `amount` of `lendingPoolToken` token and sends the `underlyingToken` to the caller`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function recall(address[] memory underlyingTokens,address lendingPool,uint amounts) external returns(bool);
    
    /**
     * @dev Borrow `amount` of `_borrowToken` token and sets the `underlyingToken` as collateral`.
     *
     * Returns a boolean value indicating whether the operation succeeded
     */
    function borrow(address[] memory _underlyingToken,address _lendingPoolAddressProvider, address _borrowToken, uint _amount) external returns(bool);
    
    /**
     * @dev Repay `borrowToken` token and free collateral.
     *
     * Returns a boolean value indicating whether the operation succeeded
     */
    function repay(address _lendingPoolAddressProvider, address _borrowToken,address _lendingPoolToken) external returns(bool);
    
    /**
     * @dev Returns the amount of {token} tokens owned by account.
     */
    function balance(address[] memory _underlyingTokens,address _lendingPoolAddressProvider,address _holder) external view returns(uint);

    /**
     * @dev Returns the equivalent value of {lendingPoolToken} tokens in underlying tokens owned by account.
     */
    function balanceInToken(address[] memory _underlyingTokens,address _underlyingToken, address _lendingPool, address account) external view returns(uint);

    // TODO : Dhruvin
    // repay
}
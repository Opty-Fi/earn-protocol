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
    function deploy(address underlyingToken,address lendingPool,address lendingPoolToken,uint amount) external returns(bool);
   
    /**
     * @dev Redeem `amount` of `lendingPoolToken` token and sends the `underlyingToken` to the caller`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function recall(address underlyingToken,address lendingPoolToken,uint amount) external returns(bool);
    
    /**
     * @dev Borrow `amount` of `reserve` token and sets the `underlyingToken` as collateral`.
     *
     * Returns amount of reserve borrowed.
     */
    function borrow(address _underlyingToken,address _lendingPoolAddressProvider, address reserve) external returns(uint);
    
    /**
     * @dev Returns the amount of {token} tokens owned by account.
     */
    function balance(address token,address account) external view returns(uint);

    /**
     * @dev Returns the equivalent value of {lendingPoolToken} tokens in underlying tokens owned by account.
     */
    function balanceInToken(address lendingPoolToken, address account) external view returns(uint);

    // TODO : Dhruvin
    // repay
}
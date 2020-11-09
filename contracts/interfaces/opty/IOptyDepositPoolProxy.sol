// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

/**
 * @dev Interface of the OptyDepositPoolProxy.
 */
interface IOptyDepositPoolProxy {
    /**
     * @dev Supply `amount` of `underlyingToken` tokens to `lendingPool` and sends the `lendingPoolToken` to the caller`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function deposit(address[] memory underlyingTokens,address lendingPool,uint[] memory amounts) external returns(bool);
   
    /**
     * @dev Redeem `amount` of `lendingPoolToken` token and sends the `underlyingToken` to the caller`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function withdraw(address[] memory underlyingTokens,address lendingPool,uint amounts) external returns(bool);

    /**
     * @dev Returns the equivalent value of {lendingPoolToken} tokens in underlying tokens owned by account.
     */
    function balanceInToken(address[] memory _underlyingTokens,address _underlyingToken, address _lendingPool, address account) external view returns(uint);
}
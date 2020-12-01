// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

/**
 * @dev Interface of the BorrowPoolProxy.
 */
interface IBorrowPoolProxy {
    /**
     * @dev Borrow `amount` of `_borrowToken` token and sets the `underlyingToken` as collateral`.
     *
     * Returns a boolean value indicating whether the operation succeeded
     */
    function borrow(address _underlyingToken,address _liquidityPool, address _borrowToken, uint _amount) external returns(bool);
    
    /**
     * @dev Repay `borrowToken` token and free collateral.
     *
     * Returns a boolean value indicating whether the operation succeeded
     */
    function repay(address underlyingToken, address _liquidityPool, address _borrowToken, uint _borrowAmount) external returns(bool);

    /**
     * @dev Returns the equivalent value of {lendingPoolToken} tokens in underlying tokens owned by account.
     */
    function balanceInToken(address _underlyingToken, address _liquidityPool, address _borrowToken, uint _borrowAmount) external view returns(uint);
}
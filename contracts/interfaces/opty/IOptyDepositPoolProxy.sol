// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

/**
 * @dev Interface of the OptyDepositPoolProxy.
 */
interface IOptyDepositPoolProxy {
    /**
     * @dev Supply `liquidityPool` for Curve,Compound `liquidityPoolAddressProvider` for Aave 
     * and returns liquidityPoolToken to the caller`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function deposit(address liquidityPool, address liquidityPoolToken, uint[] memory amounts) external returns(bool);
   
    /**
     * @dev Redeem `amount` of `liquidityPoolToken` token and sends the `underlyingToken` to the caller`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function withdraw(address[] memory _underlyingTokens, address liquidityPool, address liquidityPoolToken, uint amount) external returns(bool);

    /**
     * @dev Returns the equivalent value of {lendingPoolToken} tokens in underlying tokens owned by account.
     */
    function balanceInToken(address _token, address _lendingPool, address account) external view returns(uint);
    
    /**
     * @dev Returns the lending pool token given lending pool for Curve, lendingPoolToken for Aave,Compound.
     */
    function getLendingPoolToken(address _lendingPool) external view returns(address);
    
    /**
     * @dev Returns the underlying token given the lendingPoolToken for Aave,Compound & lending pool for Curve.
     */
    function getUnderlyingTokens(address liquidityPoolToken, address _lpToken) external view returns(address[] memory);
}
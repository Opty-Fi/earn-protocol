// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2; 

/**
 * @dev Interface of the Defi protocol code provider.
 */
interface ICodeProvider {
    /**
     * @dev Supply `liquidityPool` for Curve,Compound `liquidityPoolAddressProvider` for Aave 
     * and returns liquidityPoolToken to the caller`.
     *
     * Returns a bytes value to be executed.
     */
    function getDepositCodes(address _optyPool, address[] memory _underlyingTokens, address liquidityPool, address liquidityPoolToken, uint[] memory amounts) external view returns(bytes[] memory);
   
    /**
     * @dev Redeem `amount` of `liquidityPoolToken` token and sends the `underlyingToken` to the caller`.
     *
     * Returns a bytes value to be executed.
     */
    function getWithdrawCodes(address _optyPool, address[] memory _underlyingTokens, address liquidityPool, address liquidityPoolToken, uint amount) external view returns(bytes[] memory);

    /**
     * @dev Returns the equivalent value of underlying token for given {liquiidityPoolTokenAmount}.
     */
    function calculateAmountInToken(address _underlyingToken, address _liquidityPool, address _liquidityPoolToken, uint _liquidityPoolTokenAmount) external view returns(uint);
    
    /**
     * @dev Returns the equivalent value of _liquidityPoolToken got given {underlyingTokenAmount}
     */
    function calculateAmountInLPToken(address _underlyingToken, address _liquidityPool, address _liquidityPoolToken,uint _underlygingTokenAmount) external view returns(uint256);

    /**
     * @dev Returns the balance in underlying for liquidityPoolToken balance of holder
     */
    function balanceInToken(address _optyPool, address _underlyingToken,address _liquidityPool, address _liquidityPoolToken) external view returns(uint256);
    
    /**
     * @dev Returns the lending pool token given lending pool for Curve, lendingPoolToken for Aave,Compound.
     */
    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPool) external view returns(address);
    
    /**
     * @dev Returns the underlying token given the lendingPoolToken for Aave,Compound & lending pool for Curve.
     */
    function getUnderlyingTokens(address liquidityPool, address _liquidityPoolToken) external view returns(address[] memory);
    
    /**
     * @dev Returns whether the protocol can stake 
     */
    function canStake(address _optyPool, address _underlyingToken, address _liquidityPool, address _liquidityPoolToken, uint _stakingAmount) external view returns(bool);
     
     /**
      * @dev Returns reward token address
      */
    function getRewardToken(address _optyPool, address _underlyingToken, address _liquidityPool, address _liquidityPoolToken) external view returns(address);
    
     /**
      * @dev Returns the amount of accrued reward tokens
      */
    function getUnclaimedRewardTokenAmount(address _optyPool, address _underlyingToken, address _liquidityPool, address _liquidityPoolToken) external view returns(uint256);
    
     /**
      * @dev Returns code for claiming the tokens
      */
    function getClaimRewardTokenCode(address _optyPool, address _underlyingToken, address _liquidityPool, address _liquidityPoolToken) external view returns(bytes[] memory);
}
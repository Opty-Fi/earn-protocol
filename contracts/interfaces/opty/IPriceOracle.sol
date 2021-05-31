// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

/**
 * @dev Bridge to connect the chainlink's price oracle contract
 */

interface IPriceOracle {
    function setOracle(address _underlyingToken, address _oracle) external returns (bool);

    /**
     * Returns the latest price
     */
    function getUnderlyingTokenAmountInUSD(uint256 _amount, address _underlyingToken) external view returns (uint256);

    function getUSDAmountInUnderlyingToken(uint256 _amount, address _underlyingToken) external view returns (uint256);
}

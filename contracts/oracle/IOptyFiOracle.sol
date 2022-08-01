// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.12;

// DataTypes
import { OptyFiOracleDataTypes } from './OptyFiOracleDataTypes.sol';

/**
 * @title Interface for OptyFiOracle Contract
 * @author Opty.fi
 * @notice Contract used to fetch token prices from Chainlink and custom OptyFi prices
 */
interface IOptyFiOracle {
    /**
     * @notice Set the default mode for OptyFi's oracle
     * @param _defaultMode Boolean variable that indicates whether default mode is ON or OFF
     */
    function setDefaultMode(bool _defaultMode) external;

    /**
     * @notice Set the default main oracle
     * @param _defaultMainOracle default main oracle (Chainlink or OptyFi)
     */
    function setDefaultMainOracle(
        OptyFiOracleDataTypes.MainOracle _defaultMainOracle
    ) external;

    /**
     * @notice Set the default Chainlink time allowance
     * @param _defaultChainlinkTimeAllowance maximum amount of seconds that can be elapsed since Chainlink's price was
     * set to consider the returned price valid
     */
    function setDefaultChainlinkTimeAllowance(
        uint256 _defaultChainlinkTimeAllowance
    ) external;

    /**
     * @notice Set the default OptyFi time allowance
     * @param _defaultOptyFiTimeAllowance maximum amount of seconds that can be elapsed since OptyFi's price was
     * set to consider the returned price valid
     */
    function setDefaultOptyFiTimeAllowance(uint256 _defaultOptyFiTimeAllowance)
        external;

    /**
     * @notice Set Chainlink time allowance for _tokenA price in terms of _tokenB
     * @param _tokenPairTimeAllowances token pair price time allowance for chainlink feeds
     */
    function setChainlinkTimeAllowance(
        OptyFiOracleDataTypes.TokenPairTimeAllowance[]
            calldata _tokenPairTimeAllowances
    ) external;

    /**
     * @notice Set OptyFi time allowance for _tokenA price in terms of _tokenB
     * @param _tokenPairTimeAllowances token pair price time allowance for optyfi feeds
     */
    function setOptyFiTimeAllowance(
        OptyFiOracleDataTypes.TokenPairTimeAllowance[]
            calldata _tokenPairTimeAllowances
    ) external;

    /**
     * @notice Set the main oracle the conversion of _tokenA to _tokenB
     * @param _tokenPairPriceOracles exchange price oracle for given token pair
     */
    function setMainOracle(
        OptyFiOracleDataTypes.TokenPairPriceOracle[]
            calldata _tokenPairPriceOracles
    ) external;

    /**
     * @notice Set the Chainlink price feed for the conversion of _tokenA to _tokenB
     * @param _tokenPairPriceFeeds exchange price feed contract for given token pair
     */
    function setChainlinkPriceFeed(
        OptyFiOracleDataTypes.TokenPairPriceFeed[] calldata _tokenPairPriceFeeds
    ) external;

    /**
     * @notice Set the OptyFi's price for _tokenA in _tokenB units
     * @dev _price should always have 18 decimals
     * @param _tokenPairPrices exchange price for given token pair
     */
    function updateOptyFiTokenAToTokenBPrice(
        OptyFiOracleDataTypes.TokenPairPrice[] calldata _tokenPairPrices
    ) external;

    /**
     * @notice Set the OptyFi's price for _tokenA in _tokenB units
     * @dev The returned price will always have 18 decimals
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @return _tokenA price in _tokenB units
     */
    function getTokenPrice(address _tokenA, address _tokenB)
        external
        view
        returns (uint256);
}

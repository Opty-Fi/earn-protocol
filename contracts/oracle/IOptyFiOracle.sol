// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.15;

/**
 * @title Interface for OptyFiOracle Contract
 * @author Opty.fi
 * @notice Contract used to fetch token prices from Chainlink and custom OptyFi prices
 */
interface IOptyFiOracle {
    /** @notice Named constants for defining the main oracle of a tokens pair */
    enum MainOracle {
        Chainlink,
        OptyFi
    }

    /**
     * @notice Set the default mode for OptyFi's oracle
     * @param _defaultMode Boolean variable that indicates whether default mode is ON or OFF
     */
    function setDefaultMode(bool _defaultMode) external;

    /**
     * @notice Set the default main oracle
     * @param _defaultMainOracle default main oracle (Chainlink or OptyFi)
     */
    function setDefaultMainOracle(MainOracle _defaultMainOracle) external;

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
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @param _chainlinkTimeAllowance maximum amount of seconds that can be elapsed since Chainlink's price was
     * set to consider the returned price valid
     */
    function setChainlinkTimeAllowance(
        address _tokenA,
        address _tokenB,
        uint256 _chainlinkTimeAllowance
    ) external;

    /**
     * @notice Set OptyFi time allowance for _tokenA price in terms of _tokenB
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @param _optyFiTimeAllowance maximum amount of seconds that can be elapsed since OptyFi's price was
     * set to consider the returned price valid
     */
    function setOptyFiTimeAllowance(
        address _tokenA,
        address _tokenB,
        uint256 _optyFiTimeAllowance
    ) external;

    /**
     * @notice Set the main oracle the conversion of _tokenA to _tokenB
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @param _mainOracle main oracle (Chainlink or OptyFi) for the given token conversion
     */
    function setMainOracle(
        address _tokenA,
        address _tokenB,
        MainOracle _mainOracle
    ) external;

    /**
     * @notice Set the Chainlink price feed for the conversion of _tokenA to _tokenB
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @param _priceFeed address of the aggregator proxy contract
     */
    function setChainlinkPriceFeed(
        address _tokenA,
        address _tokenB,
        address _priceFeed
    ) external;

    /**
     * @notice Set the OptyFi's price for _tokenA in _tokenB units
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @param _price price of _tokenA in _tokenB units
     * @dev _price should always have 18 decimals
     */
    function updateOptyFiTokenAToTokenBPrice(
        address _tokenA,
        address _tokenB,
        uint256 _price
    ) external;

    /**
     * @notice Set the OptyFi's price for _tokenA in _tokenB units
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @return _tokenA price in _tokenB units
     * @dev The returned price will always have 18 decimals
     */
    function getTokenPrice(address _tokenA, address _tokenB)
        external
        view
        returns (uint256);
}

// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.15;

// dependencies
import { Ownable } from '@solidstate/contracts/access/ownable/Ownable.sol';
import { OwnableStorage } from '@solidstate/contracts/access/ownable/OwnableStorage.sol';

// interfaces
import { IOptyFiOracle } from './IOptyFiOracle.sol';
import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';

// storage
import { OptyFiOracleStorage } from './OptyFiOracleStorage.sol';

// DataTypes
import { OptyFiOracleDataTypes } from './OptyFiOracleDataTypes.sol';

contract OptyFiOracle is IOptyFiOracle, OptyFiOracleStorage, Ownable {
    address public constant USD =
        address(0x0000000000000000000000000000000000000348);

    constructor(
        uint256 _defaultChainlinkTimeAllowance,
        uint256 _defaultOptyFiTimeAllowance
    ) {
        defaultChainlinkTimeAllowance = _defaultChainlinkTimeAllowance;
        defaultOptyFiTimeAllowance = _defaultOptyFiTimeAllowance;
        defaultMode = true;
        defaultMainOracle = OptyFiOracleDataTypes.MainOracle.Chainlink;
        OwnableStorage.layout().owner = msg.sender;
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function setDefaultMode(bool _defaultMode) external onlyOwner {
        defaultMode = _defaultMode;
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function setDefaultMainOracle(
        OptyFiOracleDataTypes.MainOracle _defaultMainOracle
    ) external onlyOwner {
        defaultMainOracle = _defaultMainOracle;
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function setDefaultChainlinkTimeAllowance(
        uint256 _defaultChainlinkTimeAllowance
    ) external onlyOwner {
        defaultChainlinkTimeAllowance = _defaultChainlinkTimeAllowance;
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function setDefaultOptyFiTimeAllowance(uint256 _defaultOptyFiTimeAllowance)
        external
        onlyOwner
    {
        defaultOptyFiTimeAllowance = _defaultOptyFiTimeAllowance;
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function setChainlinkTimeAllowance(
        OptyFiOracleDataTypes.TokenPairTimeAllowance[]
            calldata _tokenPairTimeAllowances
    ) external onlyOwner {
        uint256 _len = _tokenPairTimeAllowances.length;
        for (uint256 _i; _i < _len; _i++) {
            chainlinkTimeAllowance[_tokenPairTimeAllowances[_i].tokenA][
                _tokenPairTimeAllowances[_i].tokenB
            ] = _tokenPairTimeAllowances[_i].timeAllowance;
        }
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function setOptyFiTimeAllowance(
        OptyFiOracleDataTypes.TokenPairTimeAllowance[]
            calldata _tokenPairTimeAllowances
    ) external onlyOwner {
        uint256 _len = _tokenPairTimeAllowances.length;
        for (uint256 _i; _i < _len; _i++) {
            optyFiTimeAllowance[_tokenPairTimeAllowances[_i].tokenA][
                _tokenPairTimeAllowances[_i].tokenB
            ] = _tokenPairTimeAllowances[_i].timeAllowance;
        }
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function setMainOracle(
        OptyFiOracleDataTypes.TokenPairPriceOracle[]
            calldata _tokenPairPriceOracles
    ) external onlyOwner {
        uint256 _len = _tokenPairPriceOracles.length;
        for (uint256 _i; _i < _len; _i++) {
            tokenAToTokenBMainOracle[_tokenPairPriceOracles[_i].tokenA][
                _tokenPairPriceOracles[_i].tokenB
            ] = _tokenPairPriceOracles[_i].mainOracle;
        }
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function setChainlinkPriceFeed(
        OptyFiOracleDataTypes.TokenPairPriceFeed[] calldata _tokenPairPriceFeeds
    ) external onlyOwner {
        uint256 _len = _tokenPairPriceFeeds.length;
        for (uint256 _i; _i < _len; _i++) {
            chainlinkPriceFeed[_tokenPairPriceFeeds[_i].tokenA][
                _tokenPairPriceFeeds[_i].tokenB
            ] = _tokenPairPriceFeeds[_i].priceFeed;
        }
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function updateOptyFiTokenAToTokenBPrice(
        OptyFiOracleDataTypes.TokenPairPrice[] calldata _tokenPairPrices
    ) external onlyOwner {
        uint256 _len = _tokenPairPrices.length;
        for (uint256 _i; _i < _len; _i++) {
            optyFiTokenAToTokenBToTimestampToPrice[_tokenPairPrices[_i].tokenA][
                _tokenPairPrices[_i].tokenB
            ][_getCurrentTimestamp()] = _tokenPairPrices[_i].price;
            optyFiTokenAToTokenBToLatestTimestamp[_tokenPairPrices[_i].tokenA][
                _tokenPairPrices[_i].tokenB
            ] = _getCurrentTimestamp();
        }
    }

    /**
     * @inheritdoc IOptyFiOracle
     */
    function getTokenPrice(address _tokenA, address _tokenB)
        external
        view
        returns (uint256 _price)
    {
        if (defaultMode == true) {
            if (defaultMainOracle == OptyFiOracleDataTypes.MainOracle.OptyFi) {
                _price = _getOptyFiPrice(_tokenA, _tokenB);
            } else if (
                defaultMainOracle == OptyFiOracleDataTypes.MainOracle.Chainlink
            ) {
                _price = _getChainlinkPrice(_tokenA, _tokenB);
            }
        } else {
            if (
                tokenAToTokenBMainOracle[_tokenA][_tokenB] ==
                OptyFiOracleDataTypes.MainOracle.OptyFi
            ) {
                _price = _getOptyFiPrice(_tokenA, _tokenB);
            } else if (
                tokenAToTokenBMainOracle[_tokenA][_tokenB] ==
                OptyFiOracleDataTypes.MainOracle.Chainlink
            ) {
                _price = _getChainlinkPrice(_tokenA, _tokenB);
            }
        }
        if (_price == uint256(0)) {
            _price = _getFallbackPrice(_tokenA, _tokenB);
        }
    }

    /**
     * @notice Get the price of _tokenA in _tokenB units using Chainlink price feeds
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @return _price price of _tokenA in _tokenB units
     * @dev The returned price will always have 18 decimals
     */
    function _getChainlinkPrice(address _tokenA, address _tokenB)
        internal
        view
        returns (uint256 _price)
    {
        AggregatorV3Interface _priceFeed = AggregatorV3Interface(
            chainlinkPriceFeed[_tokenA][_tokenB]
        );
        if (address(_priceFeed) != address(0)) {
            (, int256 _answer, , uint256 _updatedAt, ) = _priceFeed
                .latestRoundData();
            if (chainlinkTimeAllowance[_tokenA][_tokenB] > uint256(0)) {
                if (
                    (_getCurrentTimestamp() - _updatedAt) >
                    chainlinkTimeAllowance[_tokenA][_tokenB]
                ) {
                    _price = _getChainlinkPriceWithUSD(_tokenA, _tokenB);
                } else {
                    uint8 _decimals = _priceFeed.decimals();
                    _price = (uint256(_answer) * 10**(18 - _decimals));
                }
            } else {
                if (
                    (_getCurrentTimestamp() - _updatedAt) >
                    defaultChainlinkTimeAllowance
                ) {
                    _price = _getChainlinkPriceWithUSD(_tokenA, _tokenB);
                } else {
                    uint8 _decimals = _priceFeed.decimals();
                    _price = (uint256(_answer) * 10**(18 - _decimals));
                }
            }
        } else {
            _price = _getChainlinkPriceWithUSD(_tokenA, _tokenB);
        }
    }

    /**
     * @notice Get the price of _tokenA in _tokenB units by using prices set by owner
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @return _price price of _tokenA in _tokenB units
     * @dev The returned price will always have 18 decimals
     */
    function _getOptyFiPrice(address _tokenA, address _tokenB)
        internal
        view
        returns (uint256 _price)
    {
        uint256 latestTimestamp = optyFiTokenAToTokenBToLatestTimestamp[
            _tokenA
        ][_tokenB];
        if (optyFiTimeAllowance[_tokenA][_tokenB] > uint256(0)) {
            if (
                (_getCurrentTimestamp() -
                    optyFiTokenAToTokenBToLatestTimestamp[_tokenA][_tokenB]) <=
                optyFiTimeAllowance[_tokenA][_tokenB]
            ) {
                _price = optyFiTokenAToTokenBToTimestampToPrice[_tokenA][
                    _tokenB
                ][latestTimestamp];
            }
        } else {
            if (
                (_getCurrentTimestamp() -
                    optyFiTokenAToTokenBToLatestTimestamp[_tokenA][_tokenB]) <=
                defaultOptyFiTimeAllowance
            ) {
                _price = optyFiTokenAToTokenBToTimestampToPrice[_tokenA][
                    _tokenB
                ][latestTimestamp];
            }
        }
    }

    /**
     * @notice Get the price of _tokenA in _tokenB units by using Chainlink USD price feeds as an intermediate step
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @return _price price of _tokenA in _tokenB units
     * @dev The returned price will always have 18 decimals
     */
    function _getChainlinkPriceWithUSD(address _tokenA, address _tokenB)
        internal
        view
        returns (uint256 _price)
    {
        AggregatorV3Interface _priceFeedA = AggregatorV3Interface(
            chainlinkPriceFeed[_tokenA][USD]
        );
        if (address(_priceFeedA) != address(0)) {
            AggregatorV3Interface _priceFeedB = AggregatorV3Interface(
                chainlinkPriceFeed[_tokenB][USD]
            );
            if (address(_priceFeedB) != address(0)) {
                (, int256 _answerA, , uint256 _updatedAtA, ) = _priceFeedA
                    .latestRoundData();
                (, int256 _answerB, , uint256 _updatedAtB, ) = _priceFeedB
                    .latestRoundData();
                uint8 _decimalsA = _priceFeedA.decimals();
                uint8 _decimalsB = _priceFeedB.decimals();
                if (chainlinkTimeAllowance[_tokenA][_tokenB] > uint256(0)) {
                    if (
                        (_getCurrentTimestamp() - _updatedAtA) <=
                        chainlinkTimeAllowance[_tokenA][_tokenB] &&
                        (_getCurrentTimestamp() - _updatedAtB) <=
                        chainlinkTimeAllowance[_tokenA][_tokenB]
                    ) {
                        uint256 _priceA = (uint256(_answerA) *
                            10**(18 - _decimalsA));
                        uint256 _priceB = (uint256(_answerB) *
                            10**(18 - _decimalsB));
                        _price = (_priceA * 10**18) / _priceB;
                    }
                } else {
                    if (
                        (_getCurrentTimestamp() - _updatedAtA) <=
                        defaultChainlinkTimeAllowance &&
                        (_getCurrentTimestamp() - _updatedAtB) <=
                        defaultChainlinkTimeAllowance
                    ) {
                        uint256 _priceA = (uint256(_answerA) *
                            10**(18 - _decimalsA));
                        uint256 _priceB = (uint256(_answerB) *
                            10**(18 - _decimalsB));
                        _price = (_priceA * 10**18) / _priceB;
                    }
                }
            }
        }
    }

    /**
     * @notice Get the price of _tokenA in _tokenB units by using the fallback oracle
     * @param _tokenA address of the token whose price will be calculated in _tokenB units
     * @param _tokenB address of the token that will act as base unit for _tokenA conversion
     * @return _price price of _tokenA in _tokenB units
     * @dev The returned price will always have 18 decimals
     * @dev The fallback oracle will depend on which the main oracle is
     */
    function _getFallbackPrice(address _tokenA, address _tokenB)
        internal
        view
        returns (uint256 _price)
    {
        OptyFiOracleDataTypes.MainOracle _mainOracle = tokenAToTokenBMainOracle[
            _tokenA
        ][_tokenB];
        if (_mainOracle == OptyFiOracleDataTypes.MainOracle.OptyFi) {
            _price = _getChainlinkPrice(_tokenA, _tokenB);
        } else if (_mainOracle == OptyFiOracleDataTypes.MainOracle.Chainlink) {
            _price = _getOptyFiPrice(_tokenA, _tokenB);
        }
    }

    /**
     * @notice Get the current block timestamp
     * @return block timestamp in seconds since the epoch (UNIX)
     * @dev It is defined as virtual to ease mocking when testing
     */
    function _getCurrentTimestamp() internal view virtual returns (uint256) {
        return block.timestamp;
    }
}

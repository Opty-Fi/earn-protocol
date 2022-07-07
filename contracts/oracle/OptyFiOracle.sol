// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.15;

// helpers
import { AdapterModifiersBase } from './AdapterModifiersBase.sol';

// interfaces
import { IOptyFiOracle } from './IOptyFiOracle.sol';
import '@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol';

contract OptyFiOracle is IOptyFiOracle, AdapterModifiersBase {
    address public constant USD =
        address(0x0000000000000000000000000000000000000348);
    address public constant ETH =
        address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    mapping(address => mapping(address => uint256))
        public optyFiTokenAToTokenBToLatestTimestamp;
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        public optyFiTokenAToTokenBToTimestampToPrice;
    mapping(address => mapping(address => uint256)) public optyFiTimeAllowance;
    mapping(address => mapping(address => uint256))
        public chainlinkTimeAllowance;
    mapping(address => mapping(address => MainOracle))
        public tokenAToTokenBMainOracle;

    MainOracle public defaultMainOracle;
    uint256 public defaultChainlinkTimeAllowance;
    uint256 public defaultOptyFiTimeAllowance;

    bool public defaultMode;

    FeedRegistryInterface public chainlinkFeedRegistry;

    constructor(
        address _registry,
        uint256 _defaultChainlinkTimeAllowance,
        uint256 _defaultOptyFiTimeAllowance
    ) AdapterModifiersBase(_registry) {
        chainlinkFeedRegistry = FeedRegistryInterface(
            0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf
        );
        defaultChainlinkTimeAllowance = _defaultChainlinkTimeAllowance;
        defaultOptyFiTimeAllowance = _defaultOptyFiTimeAllowance;
        defaultMode = true;
        defaultMainOracle = MainOracle.Chainlink;
    }

    function setChainlinkFeedRegistry(address _chainlinkFeedRegistry)
        external
        onlyOperator
    {
        chainlinkFeedRegistry = FeedRegistryInterface(_chainlinkFeedRegistry);
    }

    function setDefaultMode(bool _defaultMode) external onlyOperator {
        defaultMode = _defaultMode;
    }

    function setDefaultMainOracle(MainOracle _defaultMainOracle)
        external
        onlyOperator
    {
        defaultMainOracle = _defaultMainOracle;
    }

    function setDefaultChainlinkTimeAllowance(
        uint256 _defaultChainlinkTimeAllowance
    ) external onlyOperator {
        defaultChainlinkTimeAllowance = _defaultChainlinkTimeAllowance;
    }

    function setDefaultOptyFiTimeAllowance(uint256 _defaultOptyFiTimeAllowance)
        external
        onlyOperator
    {
        defaultOptyFiTimeAllowance = _defaultOptyFiTimeAllowance;
    }

    function setChainlinkTimeAllowance(
        address _tokenA,
        address _tokenB,
        uint256 _chainlinkTimeAllowance
    ) external onlyOperator {
        _tokenA = _tokenA == address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
            ? ETH
            : _tokenA;
        _tokenB = _tokenB == address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
            ? ETH
            : _tokenB;
        chainlinkTimeAllowance[_tokenA][_tokenB] = _chainlinkTimeAllowance;
    }

    function setOptyFiTimeAllowance(
        address _tokenA,
        address _tokenB,
        uint256 _optyFiTimeAllowance
    ) external onlyOperator {
        optyFiTimeAllowance[_tokenA][_tokenB] = _optyFiTimeAllowance;
    }

    function setMainOracle(
        address _tokenA,
        address _tokenB,
        MainOracle _mainOracle
    ) external onlyOperator {
        tokenAToTokenBMainOracle[_tokenA][_tokenB] = _mainOracle;
    }

    function updateOptyFiTokenAToTokenBPrice(
        address _tokenA,
        address _tokenB,
        uint256 price
    ) external onlyOperator {
        optyFiTokenAToTokenBToTimestampToPrice[_tokenA][_tokenB][
            block.timestamp
        ] = price;
        optyFiTokenAToTokenBToLatestTimestamp[_tokenA][_tokenB] = block
            .timestamp;
    }

    function getTokenPrice(address _tokenA, address _tokenB)
        external
        view
        returns (uint256 _price)
    {
        if (defaultMode == true) {
            if (defaultMainOracle == MainOracle.OptyFi) {
                _price = _getOptyFiPrice(_tokenA, _tokenB);
            } else if (defaultMainOracle == MainOracle.Chainlink) {
                _price = _getChainlinkPrice(_tokenA, _tokenB);
            }
        } else {
            if (
                tokenAToTokenBMainOracle[_tokenA][_tokenB] == MainOracle.OptyFi
            ) {
                _price = _getOptyFiPrice(_tokenA, _tokenB);
                if (_price == uint256(0)) {
                    _price = _getFallbackPrice(
                        _tokenA,
                        _tokenB,
                        MainOracle.OptyFi
                    );
                }
            } else if (
                tokenAToTokenBMainOracle[_tokenA][_tokenB] ==
                MainOracle.Chainlink
            ) {
                _price = _getChainlinkPrice(_tokenA, _tokenB);
                if (_price == uint256(0)) {
                    _price = _getFallbackPrice(
                        _tokenA,
                        _tokenB,
                        MainOracle.Chainlink
                    );
                }
            }
        }
    }

    function _getChainlinkPrice(address _tokenA, address _tokenB)
        internal
        view
        returns (uint256 _price)
    {
        _tokenA = _tokenA == address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
            ? ETH
            : _tokenA;
        _tokenB = _tokenB == address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)
            ? ETH
            : _tokenB;
        try chainlinkFeedRegistry.getFeed(_tokenA, _tokenB) {
            (, int256 _answer, , uint256 _updatedAt, ) = chainlinkFeedRegistry
                .latestRoundData(_tokenA, _tokenB);
            if (chainlinkTimeAllowance[_tokenA][_tokenB] > uint256(0)) {
                if (
                    (block.timestamp - _updatedAt) >
                    chainlinkTimeAllowance[_tokenA][_tokenB]
                ) {
                    _price = _getChainlinkPriceWithUSD(_tokenA, _tokenB);
                } else {
                    uint8 _decimals = chainlinkFeedRegistry.decimals(
                        _tokenA,
                        _tokenB
                    );
                    _price = (uint256(_answer) * 10**(18 - _decimals));
                }
            } else {
                if (
                    (block.timestamp - _updatedAt) >
                    defaultChainlinkTimeAllowance
                ) {
                    _price = _getChainlinkPriceWithUSD(_tokenA, _tokenB);
                } else {
                    uint8 _decimals = chainlinkFeedRegistry.decimals(
                        _tokenA,
                        _tokenB
                    );
                    _price = (uint256(_answer) * 10**(18 - _decimals));
                }
            }
        } catch {
            _price = _getChainlinkPriceWithUSD(_tokenA, _tokenB);
        }
    }

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
                (block.timestamp -
                    optyFiTokenAToTokenBToLatestTimestamp[_tokenA][_tokenB]) <=
                optyFiTimeAllowance[_tokenA][_tokenB]
            ) {
                _price = optyFiTokenAToTokenBToTimestampToPrice[_tokenA][
                    _tokenB
                ][latestTimestamp];
            }
        } else {
            if (
                (block.timestamp -
                    optyFiTokenAToTokenBToLatestTimestamp[_tokenA][_tokenB]) <=
                defaultOptyFiTimeAllowance
            ) {
                _price = optyFiTokenAToTokenBToTimestampToPrice[_tokenA][
                    _tokenB
                ][latestTimestamp];
            }
        }
    }

    function _getChainlinkPriceWithUSD(address _tokenA, address _tokenB)
        internal
        view
        returns (uint256 _price)
    {
        try chainlinkFeedRegistry.getFeed(_tokenA, USD) {
            try chainlinkFeedRegistry.getFeed(_tokenB, USD) {
                (
                    ,
                    int256 _answerA,
                    ,
                    uint256 _updatedAtA,

                ) = chainlinkFeedRegistry.latestRoundData(_tokenA, USD);
                (
                    ,
                    int256 _answerB,
                    ,
                    uint256 _updatedAtB,

                ) = chainlinkFeedRegistry.latestRoundData(_tokenB, USD);
                uint8 _decimalsA = chainlinkFeedRegistry.decimals(_tokenA, USD);
                uint8 _decimalsB = chainlinkFeedRegistry.decimals(_tokenB, USD);
                if (chainlinkTimeAllowance[_tokenA][_tokenB] > uint256(0)) {
                    if (
                        (block.timestamp - _updatedAtA) <=
                        chainlinkTimeAllowance[_tokenA][_tokenB] &&
                        (block.timestamp - _updatedAtB) <=
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
                        (block.timestamp - _updatedAtA) <=
                        defaultChainlinkTimeAllowance &&
                        (block.timestamp - _updatedAtB) <=
                        defaultChainlinkTimeAllowance
                    ) {
                        uint256 _priceA = (uint256(_answerA) *
                            10**(18 - _decimalsA));
                        uint256 _priceB = (uint256(_answerB) *
                            10**(18 - _decimalsB));
                        _price = (_priceA * 10**18) / _priceB;
                    }
                }
            } catch {} // solhint-disable-line no-empty-blocks
        } catch {} // solhint-disable-line no-empty-blocks
    }

    function _getFallbackPrice(
        address _tokenA,
        address _tokenB,
        MainOracle _mainOracle
    ) internal view returns (uint256 _price) {
        if (_mainOracle == MainOracle.OptyFi) {
            _price = _getChainlinkPrice(_tokenA, _tokenB);
        } else if (_mainOracle == MainOracle.Chainlink) {
            _price = _getOptyFiPrice(_tokenA, _tokenB);
        }
    }
}

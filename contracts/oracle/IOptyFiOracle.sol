// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.15;

interface IOptyFiOracle {
    enum MainOracle {
        Chainlink,
        OptyFi
    }

    function setChainlinkFeedRegistry(address _chainlinkFeedRegistry) external;

    function setDefaultMode(bool _defaultMode) external;

    function setDefaultMainOracle(MainOracle _defaultMainOracle) external;

    function setDefaultChainlinkTimeAllowance(
        uint256 _defaultChainlinkTimeAllowance
    ) external;

    function setDefaultOptyFiTimeAllowance(uint256 _defaultOptyFiTimeAllowance)
        external;

    function setChainlinkTimeAllowance(
        address _tokenA,
        address _tokenB,
        uint256 _chainlinkTimeAllowance
    ) external;

    function setOptyFiTimeAllowance(
        address _tokenA,
        address _tokenB,
        uint256 _optyFiTimeAllowance
    ) external;

    function setMainOracle(
        address _tokenA,
        address _tokenB,
        MainOracle _mainOracle
    ) external;

    function updateOptyFiTokenAToTokenBPrice(
        address tokenA,
        address tokenB,
        uint256 price
    ) external;

    function getTokenPrice(address tokenA, address tokenB)
        external
        view
        returns (uint256);
}

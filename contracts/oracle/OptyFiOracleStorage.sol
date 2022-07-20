// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.15;

// interfaces
import { IOptyFiOracle } from './IOptyFiOracle.sol';

contract OptyFiOracleStorage {
    /**
     * @notice Default main oracle
     * @dev Oracle that will be used in case default mode is activated
     */
    IOptyFiOracle.MainOracle public defaultMainOracle;

    /**
     * @notice Mapping that stores the latest timestamp at which the price of tokenA in tokenB units has been updated
     */
    mapping(address => mapping(address => uint256))
        public optyFiTokenAToTokenBToLatestTimestamp;

    /**
     * @notice Mapping that stores the price of tokenA in tokenB units at a given timestamp
     */
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        public optyFiTokenAToTokenBToTimestampToPrice;

    /**
     * @notice Mapping that stores the price of tokenA in tokenB units at a given timestamp
     */
    mapping(address => mapping(address => address)) public chainlinkPriceFeed;

    /**
     * @notice Mapping that stores OptyFi time allowance for _tokenA price in terms of _tokenB
     */
    mapping(address => mapping(address => uint256)) public optyFiTimeAllowance;

    /**
     * @notice Mapping that stores Chainlink time allowance for _tokenA price in terms of _tokenB
     */
    mapping(address => mapping(address => uint256))
        public chainlinkTimeAllowance;

    /**
     * @notice Mapping that stores the main oracle for _tokenA price in terms of _tokenB
     */
    mapping(address => mapping(address => IOptyFiOracle.MainOracle))
        public tokenAToTokenBMainOracle;

    /**
     * @notice Default Chainlink time allowance
     * @dev stores the maximum amount of seconds that can be elapsed since Chainlink's price was
     * set to consider the returned price valid
     */
    uint256 public defaultChainlinkTimeAllowance;

    /**
     * @notice Default OptyFi time allowance
     * @dev stores the maximum amount of seconds that can be elapsed since OptyFi's price was
     * set to consider the returned price valid
     */
    uint256 public defaultOptyFiTimeAllowance;

    /**
     * @notice Boolean variable that indicates whether default mode is ON or OFF
     */
    bool public defaultMode;
}

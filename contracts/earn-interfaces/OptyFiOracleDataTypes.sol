// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

library OptyFiOracleDataTypes {
    /** @notice Named constants for defining the main oracle of a tokens pair */
    enum MainOracle { Chainlink, OptyFi }

    /**
     * @dev data structure for storing token pair exchange price time allowance
     * @param tokenA address of the token whose price will be calculated in _tokenB units
     * @param tokenB address of the token that will act as base unit for _tokenA conversion
     * @param timeAllowance maximum amount of seconds that can be elapsed since feed's price was
     *                       set to consider the returned price valid
     */
    struct TokenPairTimeAllowance {
        address tokenA;
        address tokenB;
        uint256 timeAllowance;
    }

    /**
     * @dev data structure for storing token pair price feed oracle contract
     * @param tokenA address of the token whose price will be calculated in _tokenB units
     * @param tokenB address of the token that will act as base unit for _tokenA conversion
     * @param priceFeed address of the aggregator proxy contract
     */
    struct TokenPairPriceFeed {
        address tokenA;
        address tokenB;
        address priceFeed;
    }

    /**
     * @dev data structure for storing token pair price feed oracle contract
     * @param tokenA address of the token whose price will be calculated in _tokenB units
     * @param tokenB address of the token that will act as base unit for _tokenA conversion
     * @param price exchange price of given token pair
     */
    struct TokenPairPrice {
        address tokenA;
        address tokenB;
        uint256 price;
    }

    /**
     * @dev data structure for storing token pair price feed main oracle
     * @param tokenA address of the token whose price will be calculated in _tokenB units
     * @param tokenB address of the token that will act as base unit for _tokenA conversion
     * @param mainOracle main oracle (Chainlink or OptyFi) for the given token conversion
     */
    struct TokenPairPriceOracle {
        address tokenA;
        address tokenB;
        MainOracle mainOracle;
    }
}

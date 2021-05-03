// SPDX-License-Identifier:MIT

pragma solidity ^0.6.10;

import { AggregatorV3Interface } from "./interfaces/chainlink/AggregatorV3Interface.sol";
import { Modifiers } from "./controller/Modifiers.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @dev Bridge to connect the chainlink's price oracle contract
 */

contract PriceOracle is Modifiers {
    using SafeMath for uint256;

    address public constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant USDT = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address public constant WBTC = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);

    address public constant DAI_USD = address(0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9);
    address public constant USDC_USD = address(0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6);
    address public constant USDT_USD = address(0x3E7d1eAB13ad0104d2750B8863b489D65364e32D);
    address public constant ETH_USD = address(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    address public constant BTC_USD = address(0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c);

    mapping(address => address) public underlyingTokenToPriceFeed;

    constructor(address _registry) public Modifiers(_registry) {
        setOracle(DAI, DAI_USD);
        setOracle(USDC, USDC_USD);
        setOracle(USDT, USDT_USD);
        setOracle(WETH, ETH_USD);
        setOracle(WBTC, BTC_USD);
    }

    function setOracle(address _underlyingToken, address _oracle) public onlyOperator returns (bool) {
        underlyingTokenToPriceFeed[_underlyingToken] = _oracle;
        return true;
    }

    /**
     * Returns the latest price
     */
    function getUnderlyingTokenAmountInUSD(uint256 _amount, address _underlyingToken) public view returns (uint256) {
        uint8 _decimals = AggregatorV3Interface(underlyingTokenToPriceFeed[_underlyingToken]).decimals();
        (, int256 price, , , ) = AggregatorV3Interface(underlyingTokenToPriceFeed[_underlyingToken]).latestRoundData();
        uint256 amount = (uint256(price).mul(_amount)).div(uint256(10**uint256(_decimals)));
        return amount;
    }

    function getUSDAmountInUnderlyingToken(uint256 _amount, address _underlyingToken) public view returns (uint256) {
        uint8 _decimals = AggregatorV3Interface(underlyingTokenToPriceFeed[_underlyingToken]).decimals();
        (, int256 price, , , ) = AggregatorV3Interface(underlyingTokenToPriceFeed[_underlyingToken]).latestRoundData();
        uint256 amount = (_amount.mul(uint256(10**uint256(_decimals)))).div(uint256(price));
        return amount;
    }
}

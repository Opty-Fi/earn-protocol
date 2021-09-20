// SPDX-License-Identifier:MIT

pragma solidity ^0.6.12;

//  libraries
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

//  helper contracts
import { Modifiers } from "./Modifiers.sol";

//  interfaces
import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import { IPriceOracle } from "../../interfaces/opty/IPriceOracle.sol";

/**
 * @title PriceOracle Contract
 * @author Opty.fi
 * @notice Bridge to connect the chainlink's price oracle contract
 * @dev Contract that converts token units to USD and vice versa
 */
contract PriceOracle is IPriceOracle, Modifiers {
    using SafeMath for uint256;
    using Address for address;

    /** @dev Underlying Token Addresses */
    address private constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    address private constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address private constant USDT = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    address private constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address private constant WBTC = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);

    /** @dev Price Feed (in USD) contract addresses for Underlying tokens */
    address private constant DAI_USD = address(0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9);
    address private constant USDC_USD = address(0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6);
    address private constant USDT_USD = address(0x3E7d1eAB13ad0104d2750B8863b489D65364e32D);
    address private constant ETH_USD = address(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    address private constant BTC_USD = address(0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c);

    /**
     * @notice Map underlying token with its respective price feed contract address
     */
    mapping(address => address) public underlyingTokenToPriceFeed;

    constructor(address _registry) public Modifiers(_registry) {
        setOracle(DAI, DAI_USD);
        setOracle(USDC, USDC_USD);
        setOracle(USDT, USDT_USD);
        setOracle(WETH, ETH_USD);
        setOracle(WBTC, BTC_USD);
    }

    /**
     * @inheritdoc IPriceOracle
     */
    function setOracle(address _underlyingToken, address _oracle) public override onlyOperator returns (bool) {
        require(_underlyingToken.isContract(), "!_underlyingToken.isContract()");
        require(_oracle.isContract(), "!_oracle.isContract()");
        underlyingTokenToPriceFeed[_underlyingToken] = _oracle;
        return true;
    }

    /**
     * @inheritdoc IPriceOracle
     */
    function getUnderlyingTokenAmountInUSD(uint256 _amount, address _underlyingToken)
        public
        view
        override
        returns (uint256)
    {
        uint8 _decimals = AggregatorV3Interface(underlyingTokenToPriceFeed[_underlyingToken]).decimals();
        (, int256 price, , , ) = AggregatorV3Interface(underlyingTokenToPriceFeed[_underlyingToken]).latestRoundData();
        uint256 amount = (uint256(price).mul(_amount)).div(uint256(10**uint256(_decimals)));
        return amount;
    }

    /**
     * @inheritdoc IPriceOracle
     */
    function getUSDAmountInUnderlyingToken(uint256 _amount, address _underlyingToken)
        public
        view
        override
        returns (uint256)
    {
        uint8 _decimals = AggregatorV3Interface(underlyingTokenToPriceFeed[_underlyingToken]).decimals();
        (, int256 price, , , ) = AggregatorV3Interface(underlyingTokenToPriceFeed[_underlyingToken]).latestRoundData();
        uint256 amount = (_amount.mul(uint256(10**uint256(_decimals)))).div(uint256(price));
        return amount;
    }
}

// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./interfaces/opty/IUniswap.sol";
import "./libraries/SafeERC20.sol";
import "./utils/Modifiers.sol";

contract Gatherer is Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    
    address router;

    // reward tokens    
    address public constant CRV = address(0xD533a949740bb3306d119CC777fa900bA034cd52);
    address public constant DF = address(0x431ad2ff6a9C365805eBaD47Ee021148d6f7DBe0);
    address public constant COMP = address(0xc00e94Cb662C3520282E6f5717214004A7f26888);
    address public constant FARM = address(0xa0246c9032bC3A600820415aE600c6388619A14D);
    
    // underlying tokens
    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    address public constant DAI = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant USDT = address(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    address public constant WBTC = address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    address public constant TUSD = address(0x0000000000085d4780B73119b644AE5ecd22b376);
    
    constructor(address _registry) public Modifiers(_registry) {
        setRouter(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D));
    }

    function harvest(address _rewardToken, address _underlyingToken) public returns(bool){
        IERC20(_rewardToken).safeTransferFrom(msg.sender,address(this),IERC20(_rewardToken).balanceOf(msg.sender));
        IERC20(_rewardToken).safeApprove(router, uint(0));
        IERC20(_rewardToken).safeApprove(router, IERC20(_rewardToken).balanceOf(address(this)));
        address[] memory path = new address[](3);
        path[0] = _rewardToken;
        path[1] = WETH;
        path[2] = _underlyingToken;
        IUniswap(router).swapExactTokensForTokens(IERC20(_rewardToken).balanceOf(address(this)), uint(0), path, msg.sender,uint(-1));
        return true;
    }

    function rewardBalanceInUnderlyingTokens(address _rewardToken, address _underlyingToken, uint _amount) public view returns(uint){
        uint[] memory amounts = new uint[](3);
        address[] memory path = new address[](3);
        path[0] = _rewardToken;
        path[1] = WETH;
        path[2] = _underlyingToken;
        amounts = IUniswap(router).getAmountsOut(_amount,path);
        return amounts[2];
    }
    
    function setRouter(address _router) public onlyOperator {
        router = _router;
    }
}

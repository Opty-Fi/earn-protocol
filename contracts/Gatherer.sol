// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./interfaces/uniswap/IUniswap.sol";
import "./libraries/SafeERC20.sol";
import "./utils/Modifiers.sol";

contract Gatherer is Modifiers {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    
    address public router;
    
    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    
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
    
    function getHarvestCodes(address _optyPool, address _rewardToken, address _underlyingToken, uint _rewardTokenAmount) public view returns(bytes[] memory _codes) {
        address[] memory path = new address[](3);
        path[0] = _rewardToken;
        path[1] = WETH;
        path[2] = _underlyingToken;
        _codes = new bytes[](3);
        _codes[0] = abi.encode(_rewardToken,abi.encodeWithSignature("approve(address,uint256)",router,uint(0)));
        _codes[1] = abi.encode(_rewardToken,abi.encodeWithSignature("approve(address,uint256)",router,_rewardTokenAmount));
        _codes[2] = abi.encode(router,abi.encodeWithSignature("swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",_rewardTokenAmount,uint(0),path,_optyPool,uint(-1)));
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

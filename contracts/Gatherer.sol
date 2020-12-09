// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;

import "./interfaces/opty/IUniswap.sol";
import "./libraries/SafeERC20.sol";
import "./utils/Modifiers.sol";

contract Gatherer is Modifiers{
    
    using SafeERC20 for IERC20;
    using SafeMath for uint;
    
    address router;
    
    mapping(address => mapping(address => address[])) public rewardToUnderlyingToPaths;
    
    constructor() public {
        router = address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        address[] memory path = new address[](3);
        path[0] = address(0xD533a949740bb3306d119CC777fa900bA034cd52);
        path[1] = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
        path[2] = address(0x6B175474E89094C44Da98b954EedeAC495271d0F);
        setPath(path);
        path[0] = address(0xa0246c9032bC3A600820415aE600c6388619A14D);
        setPath(path);
        path[0] = address(0x431ad2ff6a9C365805eBaD47Ee021148d6f7DBe0);
        setPath(path);
        path[0] = address(0xc00e94Cb662C3520282E6f5717214004A7f26888);
        setPath(path);
    }
    
    function harvest(address _rewardToken, address _underlyingToken) public returns(bool){
        IERC20(_rewardToken).safeTransferFrom(msg.sender,address(this),IERC20(_rewardToken).balanceOf(msg.sender));
        IERC20(_rewardToken).safeApprove(router, uint(0));
        IERC20(_rewardToken).safeApprove(router, IERC20(_rewardToken).balanceOf(address(this)));
        IUniswap(router).swapExactTokensForTokens(IERC20(_rewardToken).balanceOf(address(this)), uint(0), rewardToUnderlyingToPaths[_rewardToken][_underlyingToken], msg.sender,uint(2606938117));
        return true;
    }
    
    function setPath(address[] memory _path) public onlyGovernance {
        rewardToUnderlyingToPaths[_path[0]][_path[_path.length-1]] = _path;
    }
    
    function rewardBalanceInUnderlyingTokens(address _rewardToken, address _underlyingToken, address _holder) public view returns(uint[] memory amounts){
        return IUniswap(router).getAmountsOut(IERC20(_rewardToken).balanceOf(_holder),rewardToUnderlyingToPaths[_rewardToken][_underlyingToken]);
    }
    
    function setRouter(address _router) public onlyGovernance {
        router = _router;
    }
}
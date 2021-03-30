// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./interfaces/uniswap/IUniswap.sol";
import "./libraries/SafeERC20.sol";
import "./utils/Modifiers.sol";

contract Gatherer is Modifiers {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public router;

    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    constructor(address _registry) public {
        __Modifiers_init_unchained(_registry);
        setRouter(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D));
    }

    function harvest(address _rewardToken, address _underlyingToken) public returns (bool) {
        IERC20(_rewardToken).safeTransferFrom(msg.sender, address(this), IERC20(_rewardToken).balanceOf(msg.sender));
        IERC20(_rewardToken).safeApprove(router, uint256(0));
        IERC20(_rewardToken).safeApprove(router, IERC20(_rewardToken).balanceOf(address(this)));
        address[] memory path = new address[](3);
        path[0] = _rewardToken;
        path[1] = WETH;
        path[2] = _underlyingToken;
        IUniswap(router).swapExactTokensForTokens(IERC20(_rewardToken).balanceOf(address(this)), uint256(0), path, msg.sender, uint256(-1));
        return true;
    }

    function getHarvestCodes(
        address payable _optyPool,
        address _rewardToken,
        address _underlyingToken,
        uint256 _rewardTokenAmount
    ) public view returns (bytes[] memory _codes) {
        if (_rewardTokenAmount > 0) {
            address[] memory _path;
            uint256[] memory _amounts;
            if (_underlyingToken == WETH) {
                _path = new address[](2);
                _path[0] = _rewardToken;
                _path[1] = WETH;
                _amounts = IUniswap(router).getAmountsOut(_rewardTokenAmount, _path);
            } else {
                _path = new address[](3);
                _path[0] = _rewardToken;
                _path[1] = WETH;
                _path[2] = _underlyingToken;
                _amounts = IUniswap(router).getAmountsOut(_rewardTokenAmount, _path);
            }
            if (_amounts[_path.length - 1] > 0) {
                _codes = new bytes[](3);
                _codes[0] = abi.encode(_rewardToken, abi.encodeWithSignature("approve(address,uint256)", router, uint256(0)));
                _codes[1] = abi.encode(_rewardToken, abi.encodeWithSignature("approve(address,uint256)", router, _rewardTokenAmount));
                _codes[2] = abi.encode(
                    router,
                    abi.encodeWithSignature(
                        "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
                        _rewardTokenAmount,
                        uint256(0),
                        _path,
                        _optyPool,
                        uint256(-1)
                    )
                );
            }
        }
    }

    function getOptimalTokenAmount(
        address _borrowToken,
        address _underlyingToken,
        uint256 _borrowTokenAmount
    ) public view returns (uint256) {
        if (_borrowTokenAmount > 0) {
            address[] memory _path;
            uint256[] memory _amounts;
            if (_underlyingToken == WETH) {
                _path = new address[](2);
                _path[0] = _borrowToken;
                _path[1] = WETH;
                _amounts = IUniswap(router).getAmountsOut(_borrowTokenAmount, _path);
            } else if (_borrowToken == WETH) {
                _path = new address[](2);
                _path[0] = WETH;
                _path[1] = _underlyingToken;
                _amounts = IUniswap(router).getAmountsOut(_borrowTokenAmount, _path);
            } else {
                _path = new address[](3);
                _path[0] = _borrowToken;
                _path[1] = WETH;
                _path[2] = _underlyingToken;
                _amounts = IUniswap(router).getAmountsOut(_borrowTokenAmount, _path);
            }
            return _amounts[_path.length - 1];
        }
        return uint256(0);
    }

    function rewardBalanceInUnderlyingTokens(
        address _rewardToken,
        address _underlyingToken,
        uint256 _amount
    ) public view returns (uint256) {
        uint256[] memory amounts = new uint256[](3);
        address[] memory path = new address[](3);
        path[0] = _rewardToken;
        path[1] = WETH;
        path[2] = _underlyingToken;
        amounts = IUniswap(router).getAmountsOut(_amount, path);
        return amounts[2];
    }

    function setRouter(address _router) public onlyOperator {
        router = _router;
    }
}

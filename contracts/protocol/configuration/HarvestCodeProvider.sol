// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { SafeERC20, IERC20, SafeMath } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Modifiers } from "./Modifiers.sol";
import { IHarvestCodeProvider } from "../../interfaces/opty/IHarvestCodeProvider.sol";

/**
 * @dev Abstraction layer to DeFi exchanges like Uniswap
 */

contract HarvestCodeProvider is IHarvestCodeProvider, Modifiers {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    IUniswapV2Router02 public uniswapV2Router02 = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    /* solhint-disable no-empty-blocks */
    constructor(address _registry) public Modifiers(_registry) {}

    /* solhint-disable no-empty-blocks */

    function getHarvestCodes(
        address payable _optyPool,
        address _rewardToken,
        address _underlyingToken,
        uint256 _rewardTokenAmount
    ) external view override returns (bytes[] memory _codes) {
        address _weth = uniswapV2Router02.WETH();
        if (_rewardTokenAmount > 0) {
            address[] memory _path;
            uint256[] memory _amounts;
            if (_underlyingToken == _weth) {
                _path = new address[](2);
                _path[0] = _rewardToken;
                _path[1] = _weth;
                _amounts = uniswapV2Router02.getAmountsOut(_rewardTokenAmount, _path);
            } else {
                _path = new address[](3);
                _path[0] = _rewardToken;
                _path[1] = _weth;
                _path[2] = _underlyingToken;
                _amounts = uniswapV2Router02.getAmountsOut(_rewardTokenAmount, _path);
            }
            if (_amounts[_path.length - 1] > 0) {
                _codes = new bytes[](3);
                _codes[0] = abi.encode(
                    _rewardToken,
                    abi.encodeWithSignature("approve(address,uint256)", address(uniswapV2Router02), uint256(0))
                );
                _codes[1] = abi.encode(
                    _rewardToken,
                    abi.encodeWithSignature("approve(address,uint256)", address(uniswapV2Router02), _rewardTokenAmount)
                );
                _codes[2] = abi.encode(
                    address(uniswapV2Router02),
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
    ) external view override returns (uint256) {
        address _weth = uniswapV2Router02.WETH();
        if (_borrowTokenAmount > 0) {
            address[] memory _path;
            uint256[] memory _amounts;
            if (_underlyingToken == _weth) {
                _path = new address[](2);
                _path[0] = _borrowToken;
                _path[1] = _weth;
                _amounts = uniswapV2Router02.getAmountsOut(_borrowTokenAmount, _path);
            } else if (_borrowToken == _weth) {
                _path = new address[](2);
                _path[0] = _weth;
                _path[1] = _underlyingToken;
                _amounts = uniswapV2Router02.getAmountsOut(_borrowTokenAmount, _path);
            } else {
                _path = new address[](3);
                _path[0] = _borrowToken;
                _path[1] = _weth;
                _path[2] = _underlyingToken;
                _amounts = uniswapV2Router02.getAmountsOut(_borrowTokenAmount, _path);
            }
            return _amounts[_path.length - 1];
        }
        return uint256(0);
    }

    function rewardBalanceInUnderlyingTokens(
        address _rewardToken,
        address _underlyingToken,
        uint256 _amount
    ) external view override returns (uint256) {
        address _weth = uniswapV2Router02.WETH();
        uint256[] memory amounts = new uint256[](3);
        address[] memory path = new address[](3);
        path[0] = _rewardToken;
        path[1] = _weth;
        path[2] = _underlyingToken;
        amounts = uniswapV2Router02.getAmountsOut(_amount, path);
        return amounts[2];
    }
}
